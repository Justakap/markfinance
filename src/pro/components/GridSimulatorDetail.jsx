import { useEffect, useRef, useState } from "react";
import {
  getGridSession,
  listGridTrades,
  startGridSession,
  pauseGridSession,
  resumeGridSession,
  stopGridSession,
} from "../api/professionalApi";
import { showError, showSuccess, confirmAction } from "../../utils/toast";
import { joinGridSession, onGridSimulatorUpdate, onSocketConnectionChange } from "../../utils/socket";
import { formatINR, formatQuantity } from "../../utils/indianFormat";
import GridLevelsChart from "./GridLevelsChart";

// Backstop reconciliation only — the real update path is Socket.IO
// (onGridSimulatorUpdate). This exists purely to recover from an event
// silently missed without a detectable disconnect; it is deliberately
// infrequent, not the primary mechanism.
const RECONCILE_POLL_MS = 30000;
const TRADE_PAGE_SIZE = 25;

const FEED_BADGE = {
  LIVE: "bg-green-100 text-green-700",
  LIVE_REST_FALLBACK: "bg-amber-100 text-amber-700",
  STALE: "bg-amber-100 text-amber-700",
  NO_DATA: "bg-red-100 text-red-700",
  UNKNOWN: "bg-gray-100 text-gray-500",
};

const FEED_LABEL = {
  LIVE: "Live (WebSocket)",
  LIVE_REST_FALLBACK: "Live (REST fallback)",
  STALE: "Stale",
  NO_DATA: "No data",
  UNKNOWN: "Unknown",
};

const CONNECTION_BADGE = {
  connected: "bg-green-100 text-green-700",
  reconnecting: "bg-amber-100 text-amber-700",
  disconnected: "bg-red-100 text-red-700",
};

// Stable per-trade identity across both sources: REST's tradeSummary()
// includes a real Mongo tradeId, but a Socket.IO-pushed trade currently
// does not (gridSimulatorService.processTick() returns the pre-insert
// trade objects, never re-reads the inserted _id). `sequence` is a
// monotonically-increasing, unique-per-session counter assigned BEFORE
// insert either way, so it is always present and stable on both sources —
// prefer tradeId when available, fall back to sequence otherwise.
function tradeIdentity(trade) {
  return trade.tradeId != null ? `id:${trade.tradeId}` : `seq:${trade.sequence}`;
}

/**
 * Grid Trading Simulator (PAPER TRADING ONLY) — session detail: portfolio
 * summary, grid chart, trade ledger, skipped/partial fills, lifecycle
 * controls. Router-free (no `Link`/`useNavigate`) — ADR-017 convention.
 *
 * Live updates arrive over the authenticated `grid-session:<sessionId>`
 * Socket.IO room (joinGridSession/onGridSimulatorUpdate) — the backend's
 * event-driven real-time processor (services/gridSimulatorRealtime.js)
 * pushes a state/trade update the moment it processes a genuine Upstox
 * WebSocket tick, never a global broadcast of this session's private
 * data. The server-side real-time processor keeps working with zero
 * browser tabs open at all.
 *
 * This component does NOT also push its own observed `marketTick` prices
 * to the backend (it used to, as a "low-latency accelerant" into
 * POST .../tick). That was removed (ADR-028, backend) after it was found
 * to cause repeated/duplicate skipped trades: a browser-relayed price can
 * be stale or out of true order relative to what the backend's own WS
 * processor already processed, and the engine's dedup watermark only
 * rejects an exact-or-earlier TIMESTAMP, not a stale PRICE value — so a
 * late, lower-than-current price could re-arm an already-disarmed grid
 * level, causing the next genuine tick to re-fire the same signal.
 *
 * A 30s reconciliation poll and a REST reload on every socket reconnect
 * are the backstop against a silently-missed event — Socket.IO is the
 * primary path, not the only one state can ever come from.
 */
export default function GridSimulatorDetail({ sessionId, onBack }) {
  const [session, setSession] = useState(null);
  const [trades, setTrades] = useState([]);
  const [tradesTotal, setTradesTotal] = useState(0);
  const [skippedOnly, setSkippedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionPending, setActionPending] = useState(false);
  const [connectionState, setConnectionState] = useState("disconnected");
  const mountedRef = useRef(true);
  const skippedOnlyRef = useRef(skippedOnly);
  skippedOnlyRef.current = skippedOnly;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function load() {
    return Promise.all([
      getGridSession(sessionId),
      listGridTrades(sessionId, { page: 1, limit: TRADE_PAGE_SIZE, skippedOnly }),
    ])
      .then(([sessionRes, tradesRes]) => {
        if (!mountedRef.current) return;
        setSession(sessionRes);
        setTrades(tradesRes.items || []);
        setTradesTotal(tradesRes.total || 0);
        setError("");
      })
      .catch((err) => {
        if (!mountedRef.current) return;
        setError(err?.data?.message || "Failed to load grid simulator session");
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }

  useEffect(() => {
    setLoading(true);
    load();
    const timer = setInterval(load, RECONCILE_POLL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, skippedOnly]);

  // Primary live-update path: the authenticated Socket.IO room for this
  // session. Merges each push directly into state — no REST round trip
  // needed per update.
  useEffect(() => {
    const leave = joinGridSession(sessionId);

    const unsubscribeUpdate = onGridSimulatorUpdate((payload) => {
      if (!mountedRef.current || payload?.sessionId !== sessionId) return;
      setSession((prev) =>
        prev
          ? {
              ...prev,
              status: payload.status ?? prev.status,
              lastFeedStatus: payload.lastFeedStatus ?? prev.lastFeedStatus,
              lastFeedCheckAt: payload.lastFeedCheckAt ?? prev.lastFeedCheckAt,
              lastFeedPrice: payload.lastFeedPrice ?? prev.lastFeedPrice,
              state: { ...prev.state, ...payload.state },
              // Full replace, not a field-by-field merge: the backend
              // always computes portfolio (cash/holdings/avgCost/equity/
              // unrealizedPnL/marketValue) from one single persisted
              // snapshot, so every push already carries the complete,
              // internally-consistent set. Merging previously let a
              // partial payload silently keep a stale equity/
              // unrealizedPnL alongside freshly-updated cash/holdings —
              // the root cause of a reported dashboard discrepancy.
              portfolio: payload.portfolio ?? prev.portfolio,
            }
          : prev,
      );
      if (payload.trades?.length) {
        const relevant = payload.trades.filter((t) => !skippedOnlyRef.current || t.qtySkipped > 0);
        if (relevant.length) {
          // Dedup by stable identity: a reconnect's full REST reload
          // (load()) and a late-buffered/replayed Socket.IO push can both
          // deliver the same already-known trade — never render (or count)
          // it twice, while still allowing genuinely distinct trades.
          const newCountRef = { current: 0 };
          setTrades((prev) => {
            const known = new Set(prev.map(tradeIdentity));
            const newOnes = relevant.filter((t) => !known.has(tradeIdentity(t)));
            newCountRef.current = newOnes.length;
            if (!newOnes.length) return prev;
            return [...newOnes].reverse().concat(prev).slice(0, TRADE_PAGE_SIZE);
          });
          setTradesTotal((prev) => prev + newCountRef.current);
        }
      }
    });

    // Reconnecting loses no state on its own, but anything that happened
    // while disconnected needs a REST catch-up — never left silently
    // inconsistent.
    const unsubscribeConnection = onSocketConnectionChange((state) => {
      if (!mountedRef.current) return;
      setConnectionState((prev) => {
        if (prev !== "connected" && state === "connected") load();
        return state;
      });
    });

    return () => {
      leave();
      unsubscribeUpdate();
      unsubscribeConnection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function handleTransition(action, label) {
    setActionPending(true);
    try {
      await action(sessionId);
      showSuccess(`Session ${label}`);
      await load();
    } catch (err) {
      showError(err?.data?.message || `Failed to ${label.toLowerCase()} session`);
    } finally {
      setActionPending(false);
    }
  }

  async function handleStop() {
    const confirmed = await confirmAction({
      title: "Stop grid simulator session?",
      message: "This is terminal — a stopped session cannot be restarted. You can review its history afterward.",
      confirmText: "Stop session",
      variant: "danger",
    });
    if (confirmed) handleTransition(stopGridSession, "stopped");
  }

  if (loading) return <p className="text-sm text-gray-400">Loading grid simulator session…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!session) return <p className="text-sm text-gray-400">Session not found.</p>;

  const { config, state, portfolio, lastFeedStatus, lastFeedCheckAt, lastFeedPrice } = session;

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm text-blue-600 hover:underline">
        &larr; Back to sessions
      </button>

      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
        <strong>PAPER TRADING ONLY.</strong> No real broker order is ever placed by this session.
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{session.symbol}</h2>
          <p className="text-xs text-gray-500">
            Initial reference {formatINR(config.referencePrice)} (immutable, captured {config.referenceCapturedAt ? new Date(config.referenceCapturedAt).toLocaleString() : "--"}) ·
            Grid {formatINR(config.gridInterval)} · Qty/level {formatQuantity(config.quantityPerLevel)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CONNECTION_BADGE[connectionState] || CONNECTION_BADGE.disconnected}`}>
            {connectionState === "connected" ? "Connected" : connectionState === "reconnecting" ? "Reconnecting…" : "Disconnected"}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${FEED_BADGE[lastFeedStatus] || FEED_BADGE.UNKNOWN}`}>
            {FEED_LABEL[lastFeedStatus] || "Unknown"}
          </span>
          <span className="text-xs text-gray-400">
            {lastFeedCheckAt ? `updated ${new Date(lastFeedCheckAt).toLocaleTimeString()}` : "no update yet"}
          </span>
        </div>
        <div className="flex gap-2">
          {session.status === "CREATED" && (
            <button type="button" disabled={actionPending} onClick={() => handleTransition(startGridSession, "started")} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
              Start
            </button>
          )}
          {session.status === "ACTIVE" && (
            <button type="button" disabled={actionPending} onClick={() => handleTransition(pauseGridSession, "paused")} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:opacity-50">
              Pause
            </button>
          )}
          {session.status === "PAUSED" && (
            <button type="button" disabled={actionPending} onClick={() => handleTransition(resumeGridSession, "resumed")} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
              Resume
            </button>
          )}
          {session.status !== "STOPPED" && (
            <button type="button" disabled={actionPending} onClick={handleStop} className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 disabled:opacity-50">
              Stop
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Cash" value={formatINR(portfolio?.cash)} />
        <Stat label="Holdings" value={formatQuantity(portfolio?.holdings ?? 0)} />
        <Stat label="Avg Cost" value={formatINR(portfolio?.avgCost)} />
        <Stat label="Equity" value={formatINR(portfolio?.equity)} />
        <Stat label="Realized P&L" value={formatINR(portfolio?.realizedPnL)} tone={portfolio?.realizedPnL >= 0 ? "pos" : "neg"} />
        <Stat label="Unrealized P&L" value={formatINR(portfolio?.unrealizedPnL)} tone={portfolio?.unrealizedPnL >= 0 ? "pos" : "neg"} />
        <Stat label="Last Price" value={formatINR(lastFeedPrice ?? state?.lastPrice)} />
        <Stat label="Trade Events" value={formatQuantity(tradesTotal)} />
      </div>

      <div className="rounded-xl border border-gray-200 p-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Grid Levels &amp; Simulated Fills</h3>
        <GridLevelsChart config={config} trades={trades} currentPrice={lastFeedPrice ?? state?.lastPrice} />
      </div>

      <div className="rounded-xl border border-gray-200 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Trade Ledger</h3>
          <label className="flex items-center gap-1 text-xs text-gray-500">
            <input type="checkbox" checked={skippedOnly} onChange={(e) => setSkippedOnly(e.target.checked)} />
            Skipped/partial only
          </label>
        </div>
        {trades.length === 0 ? (
          <p className="text-sm text-gray-400">No {skippedOnly ? "skipped/partial" : "simulated"} fills yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left font-medium text-gray-500">Type</th>
                  <th className="p-2 text-left font-medium text-gray-500">Level</th>
                  <th className="p-2 text-left font-medium text-gray-500">Fill Price</th>
                  <th className="p-2 text-left font-medium text-gray-500">Qty Filled</th>
                  <th className="p-2 text-left font-medium text-gray-500">Qty Skipped</th>
                  <th className="p-2 text-left font-medium text-gray-500">Reason</th>
                  <th className="p-2 text-left font-medium text-gray-500">When</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.tradeId || `seq-${trade.sequence}`} className="border-t border-gray-100">
                    <td className={`p-2 font-medium ${trade.type === "BUY" ? "text-green-700" : "text-red-700"}`}>{trade.type}</td>
                    <td className="p-2">
                      {formatINR(trade.levelPrice)}
                      {trade.gapFill && <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-700">GAP</span>}
                    </td>
                    <td className="p-2">{formatINR(trade.fillPrice)}</td>
                    <td className="p-2">{formatQuantity(trade.qtyFilled)}</td>
                    <td className="p-2">{trade.qtySkipped > 0 ? formatQuantity(trade.qtySkipped) : "--"}</td>
                    <td className="p-2 text-xs text-gray-500">{trade.reason || "--"}</td>
                    <td className="p-2 text-xs text-gray-400">{new Date(trade.eventTimestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const toneClass = tone === "pos" ? "text-green-700" : tone === "neg" ? "text-red-700" : "text-gray-900";
  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
