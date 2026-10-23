import { useEffect, useRef, useState, lazy, Suspense } from "react";
import {
  getGridSession,
  listGridTrades,
  startGridSession,
  pauseGridSession,
  resumeGridSession,
  stopGridSession,
  updateGridSessionConfig,
  getGridSessionPreviewQuote,
} from "../api/professionalApi";
import { showError, showSuccess, confirmAction } from "../../utils/toast";
import { joinGridSession, onGridSimulatorUpdate, onSocketConnectionChange, forceReconnectMarketSocket } from "../../utils/socket";
import { formatINR, formatQuantity } from "../../utils/indianFormat";
import GridLevelsChart from "./GridLevelsChart";

const TableExportMenu = lazy(() => import("../../components/TableExportMenu"));

// Backstop reconciliation only — the real update path is Socket.IO
// (onGridSimulatorUpdate). This exists purely to recover from an event
// silently missed without a detectable disconnect; it is deliberately
// infrequent, not the primary mechanism.
const RECONCILE_POLL_MS = 30000;
// The main page only ever shows the most recent DISPLAY_TRADE_LIMIT trades
// — the full history is always in the DB and reachable via the Orderbook
// modal (fetchAllTrades), never lost or capped at the storage layer.
const DISPLAY_TRADE_LIMIT = 20;
// Largest page size the backend's pagination allows per request (see
// routes/gridSimulatorRoutes.js's MAX_PAGE_SIZE) — the Orderbook modal
// loops pages at this size to assemble the full ledger.
const ORDERBOOK_PAGE_SIZE = 200;
// How long the price flashes green/red on a move before settling back to
// neutral — a blink, not a sticky color held until the next move.
const PRICE_BLINK_MS = 900;
// A CREATED (not-yet-started) session has no live tick feed of its own
// (nothing pins its instrument until Start) — poll a lightweight read-only
// quote preview instead, same provenance Start itself will use.
const PREVIEW_QUOTE_POLL_MS = 5000;

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
  const [refreshing, setRefreshing] = useState(false);
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [editQuantityPerLevel, setEditQuantityPerLevel] = useState("");
  const [editUseSeparateSellQuantity, setEditUseSeparateSellQuantity] = useState(false);
  const [editSellQuantityPerLevel, setEditSellQuantityPerLevel] = useState("");
  const [editGridInterval, setEditGridInterval] = useState("");
  const [editUseSeparateSellVariance, setEditUseSeparateSellVariance] = useState(false);
  const [editSellVariance, setEditSellVariance] = useState("");
  const [editAddCash, setEditAddCash] = useState("");
  const [configSubmitting, setConfigSubmitting] = useState(false);
  const mountedRef = useRef(true);
  const skippedOnlyRef = useRef(skippedOnly);
  skippedOnlyRef.current = skippedOnly;
  const prevPriceRef = useRef(null);
  const [priceTone, setPriceTone] = useState("neutral");
  const blinkTimerRef = useRef(null);
  const [previewPrice, setPreviewPrice] = useState(null);
  const [showOrderbook, setShowOrderbook] = useState(false);
  const [orderbookTrades, setOrderbookTrades] = useState([]);
  const [orderbookLoading, setOrderbookLoading] = useState(false);
  const [orderbookError, setOrderbookError] = useState("");
  const [orderbookSkippedOnly, setOrderbookSkippedOnly] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function load() {
    return Promise.all([
      getGridSession(sessionId),
      listGridTrades(sessionId, { page: 1, limit: DISPLAY_TRADE_LIMIT, skippedOnly }),
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
            return [...newOnes].reverse().concat(prev).slice(0, DISPLAY_TRADE_LIMIT);
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

  // Blinks the live price green/red on its own last move (not a fixed
  // reference) — ticks upward flash green, downward flash red, then settle
  // back to neutral after PRICE_BLINK_MS, rather than holding the color
  // until the next move.
  useEffect(() => {
    const currentPrice = session?.lastFeedPrice ?? session?.state?.lastPrice ?? previewPrice;
    if (!Number.isFinite(currentPrice)) return;
    if (prevPriceRef.current != null && currentPrice !== prevPriceRef.current) {
      setPriceTone(currentPrice > prevPriceRef.current ? "pos" : "neg");
      clearTimeout(blinkTimerRef.current);
      blinkTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setPriceTone("neutral");
      }, PRICE_BLINK_MS);
    }
    prevPriceRef.current = currentPrice;
  }, [session?.lastFeedPrice, session?.state?.lastPrice, previewPrice]);

  useEffect(() => () => clearTimeout(blinkTimerRef.current), []);

  // CREATED sessions have no live tick feed yet (nothing pins the
  // instrument until Start) — poll a lightweight read-only quote preview
  // instead, so the price is visibly live even before clicking Start.
  useEffect(() => {
    if (!session || session.status !== "CREATED") return;
    let cancelled = false;
    function poll() {
      getGridSessionPreviewQuote(sessionId)
        .then((res) => {
          if (!cancelled && mountedRef.current) setPreviewPrice(res.price);
        })
        .catch(() => {});
    }
    poll();
    const timer = setInterval(poll, PREVIEW_QUOTE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, session?.status]);

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

  // Manual escape hatch for a stale/stuck feed — cycles the Socket.IO
  // transport (it already auto-reconnects on its own, this just skips the
  // backoff wait) and immediately re-fetches the session over REST so the
  // user isn't stuck waiting for the next tick/30s reconciliation poll.
  async function handleRefresh() {
    setRefreshing(true);
    try {
      forceReconnectMarketSocket();
      await load();
      showSuccess("Reconnected and refreshed");
    } catch (err) {
      showError(err?.data?.message || "Failed to refresh");
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  }

  // Orderbook modal: the main page only ever shows the most recent
  // DISPLAY_TRADE_LIMIT trades, but every attempt (filled, partial, or
  // fully skipped) is already persisted in full — this loops the backend's
  // paginated listTrades() at its max page size until the whole ledger is
  // assembled, so "view all trades" is never capped at what the main page
  // happens to be showing.
  async function fetchAllTrades(skippedOnlyFilter) {
    setOrderbookLoading(true);
    setOrderbookError("");
    try {
      let page = 1;
      let all = [];
      for (;;) {
        const res = await listGridTrades(sessionId, { page, limit: ORDERBOOK_PAGE_SIZE, skippedOnly: skippedOnlyFilter });
        all = all.concat(res.items || []);
        if (all.length >= (res.total || 0) || !res.items?.length) break;
        page += 1;
      }
      if (mountedRef.current) setOrderbookTrades(all);
    } catch (err) {
      if (mountedRef.current) setOrderbookError(err?.data?.message || "Failed to load the full order book");
    } finally {
      if (mountedRef.current) setOrderbookLoading(false);
    }
  }

  function openOrderbook() {
    setShowOrderbook(true);
    setOrderbookSkippedOnly(skippedOnly);
    fetchAllTrades(skippedOnly);
  }

  // Live-editable config (ADR-034) — only reachable while PAUSED, both here
  // and server-side, so a crossing can never be processed concurrently
  // with a half-applied edit.
  function openConfigEditor() {
    setEditQuantityPerLevel(String(session.config.quantityPerLevel));
    setEditUseSeparateSellQuantity(session.config.sellQuantityPerLevel != null);
    setEditSellQuantityPerLevel(session.config.sellQuantityPerLevel != null ? String(session.config.sellQuantityPerLevel) : "");
    setEditGridInterval(String(session.config.gridInterval));
    setEditUseSeparateSellVariance(session.config.sellVariance != null);
    setEditSellVariance(session.config.sellVariance != null ? String(session.config.sellVariance) : "");
    setEditAddCash("");
    setShowConfigEditor(true);
  }

  async function handleConfigSubmit(e) {
    e.preventDefault();
    if (!Number.isInteger(Number(editQuantityPerLevel)) || Number(editQuantityPerLevel) < 1) {
      showError("Quantity per level must be a positive integer");
      return;
    }
    if (editUseSeparateSellQuantity && !(Number.isInteger(Number(editSellQuantityPerLevel)) && Number(editSellQuantityPerLevel) > 0)) {
      showError("Sell quantity must be a positive integer");
      return;
    }
    if (!Number.isFinite(Number(editGridInterval)) || Number(editGridInterval) <= 0) {
      showError("Grid/Buy variance must be a positive number");
      return;
    }
    if (editUseSeparateSellVariance && !(Number.isFinite(Number(editSellVariance)) && Number(editSellVariance) > 0)) {
      showError("Sell variance must be a positive number");
      return;
    }
    if (editAddCash !== "" && !(Number.isFinite(Number(editAddCash)) && Number(editAddCash) > 0)) {
      showError("Cash to add must be a positive number");
      return;
    }

    setConfigSubmitting(true);
    try {
      await updateGridSessionConfig(sessionId, {
        quantityPerLevel: Number(editQuantityPerLevel),
        useSeparateSellQuantity: editUseSeparateSellQuantity,
        sellQuantityPerLevel: editUseSeparateSellQuantity ? Number(editSellQuantityPerLevel) : undefined,
        gridInterval: Number(editGridInterval),
        useSeparateSellVariance: editUseSeparateSellVariance,
        sellVariance: editUseSeparateSellVariance ? Number(editSellVariance) : undefined,
        addCash: editAddCash !== "" ? Number(editAddCash) : undefined,
      });
      showSuccess("Session configuration updated");
      setShowConfigEditor(false);
      await load();
    } catch (err) {
      showError(err?.data?.message || "Failed to update session configuration");
    } finally {
      if (mountedRef.current) setConfigSubmitting(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-400">Loading grid simulator session…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!session) return <p className="text-sm text-gray-400">Session not found.</p>;

  const { config, state, portfolio, charges, lastFeedStatus, lastFeedCheckAt, lastFeedPrice } = session;

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm text-blue-600 hover:underline">
        &larr; Back to sessions
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {session.symbol}:{" "}
            <span className={priceTone === "pos" ? "text-green-600" : priceTone === "neg" ? "text-red-600" : "text-gray-900"}>
              {formatINR(lastFeedPrice ?? state?.lastPrice ?? previewPrice)}
            </span>
          </h2>
          <p className="text-xs text-gray-500">
            Initial reference {formatINR(config.referencePrice)} (captured {config.referenceCapturedAt ? new Date(config.referenceCapturedAt).toLocaleString() : "--"}) ·
            Grid {formatINR(config.gridInterval)} · Qty/level {formatQuantity(config.quantityPerLevel)}
          </p>
          <p className="text-xs text-gray-500">
            Next buy <span className="font-medium text-green-700">{Number.isFinite(state?.nextBuyLevel) ? formatINR(state.nextBuyLevel) : "--"}</span>
            {state?.pendingBuyLevels?.length > 1 && <span className="text-gray-400"> (+{state.pendingBuyLevels.length - 1} more armed)</span>} · Next sell{" "}
            <span className="font-medium text-red-700">{Number.isFinite(state?.nextSellLevel) ? formatINR(state.nextSellLevel) : "--"}</span>
            {state?.pendingSellLevels?.length > 1 && <span className="text-gray-400"> (+{state.pendingSellLevels.length - 1} more armed)</span>}
          </p>
          {(config.lowerLimit != null || config.upperLimit != null) && (
            <p className="text-xs text-gray-500">
              Price limits: <span className="font-medium text-gray-700">{formatINR(config.lowerLimit)} – {formatINR(config.upperLimit)}</span> — buys pause at/below the lower limit, sells pause at/above the upper limit
            </p>
          )}
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
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Reconnect the live feed and refresh this session"
            className="rounded-full border border-gray-300 px-2 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "↻ Refresh"}
          </button>
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

      {session.status === "PAUSED" && (
        <div className="rounded-xl border border-gray-200 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Edit Configuration</h3>
            {!showConfigEditor && (
              <button type="button" onClick={openConfigEditor} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                Edit
              </button>
            )}
          </div>
          {showConfigEditor && (
            <form onSubmit={handleConfigSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Add Cash (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editAddCash}
                    onChange={(e) => setEditAddCash(e.target.value)}
                    placeholder="0"
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Quantity per Level / Buy Qty</label>
                  <input
                    type="number"
                    value={editQuantityPerLevel}
                    onChange={(e) => setEditQuantityPerLevel(e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                    <input type="checkbox" checked={editUseSeparateSellQuantity} onChange={(e) => setEditUseSeparateSellQuantity(e.target.checked)} />
                    Use a different Sell Qty
                  </label>
                  <input
                    type="number"
                    value={editSellQuantityPerLevel}
                    onChange={(e) => setEditSellQuantityPerLevel(e.target.value)}
                    disabled={!editUseSeparateSellQuantity}
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                    placeholder={editUseSeparateSellQuantity ? "e.g. 50" : "Mirrors Buy Qty"}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Grid Variance / Buy Variance (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editGridInterval}
                    onChange={(e) => setEditGridInterval(e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                    <input type="checkbox" checked={editUseSeparateSellVariance} onChange={(e) => setEditUseSeparateSellVariance(e.target.checked)} />
                    Use a different Sell Variance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editSellVariance}
                    onChange={(e) => setEditSellVariance(e.target.value)}
                    disabled={!editUseSeparateSellVariance}
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                    placeholder={editUseSeparateSellVariance ? "e.g. 5" : "Mirrors Buy Variance"}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={configSubmitting} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
                  {configSubmitting ? "Saving…" : "Save"}
                </button>
                <button type="button" onClick={() => setShowConfigEditor(false)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Cash" value={formatINR(portfolio?.cash)} />
        <Stat label="Holdings" value={formatQuantity(portfolio?.holdings ?? 0)} />
        <Stat label="Avg Cost" value={formatINR(portfolio?.avgCost)} />
        <Stat
          label="Stock Value"
          value={formatINR(portfolio?.marketValue)}
          sub={portfolio?.unrealizedPnL != null ? `${portfolio.unrealizedPnL >= 0 ? "+" : ""}${formatINR(portfolio.unrealizedPnL)} vs. purchase price` : undefined}
          subTone={portfolio?.unrealizedPnL >= 0 ? "pos" : "neg"}
        />
        <Stat
          label="Realized P&L"
          value={formatINR(portfolio?.realizedPnL)}
          tone={portfolio?.realizedPnL >= 0 ? "pos" : "neg"}
          sub={
            portfolio?.realizedPnL != null && charges?.total != null
              ? `Net after charges: ${formatINR(portfolio.realizedPnL - charges.total)}`
              : undefined
          }
          subTone={portfolio?.realizedPnL != null && charges?.total != null && portfolio.realizedPnL - charges.total >= 0 ? "pos" : "neg"}
        />
        <Stat
          label="Trade Events"
          value={`Total Trade : ${formatQuantity(session?.tradeCounts ? session.tradeCounts.buyCount + session.tradeCounts.sellCount : tradesTotal)}`}
          sub={session?.tradeCounts ? `Buy : ${formatQuantity(session.tradeCounts.buyCount)}   Sell : ${formatQuantity(session.tradeCounts.sellCount)}` : undefined}
        />
        <ChargesStat charges={charges} />
      </div>

      <div className="rounded-xl border border-gray-200 p-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Grid Levels &amp; Simulated Fills</h3>
        <GridLevelsChart
          config={config}
          trades={trades}
          currentPrice={lastFeedPrice ?? state?.lastPrice}
          nextBuyLevel={state?.nextBuyLevel}
          nextSellLevel={state?.nextSellLevel}
          pendingBuyLevels={state?.pendingBuyLevels}
          pendingSellLevels={state?.pendingSellLevels}
        />
      </div>

      <div className="rounded-xl border border-gray-200 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">
            Trade Ledger <span className="font-normal text-gray-400">(last {DISPLAY_TRADE_LIMIT})</span>
          </h3>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-xs text-gray-500">
              <input type="checkbox" checked={skippedOnly} onChange={(e) => setSkippedOnly(e.target.checked)} />
              Skipped/partial only
            </label>
            <button
              type="button"
              onClick={openOrderbook}
              className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Orderbook
            </button>
          </div>
        </div>
        {trades.length === 0 ? (
          <p className="text-sm text-gray-400">No {skippedOnly ? "skipped/partial" : "simulated"} fills yet.</p>
        ) : (
          <TradeLedgerTable trades={trades} />
        )}
      </div>

      {showOrderbook && (
        <OrderbookModal
          trades={orderbookTrades}
          loading={orderbookLoading}
          error={orderbookError}
          skippedOnly={orderbookSkippedOnly}
          onToggleSkippedOnly={(checked) => {
            setOrderbookSkippedOnly(checked);
            fetchAllTrades(checked);
          }}
          onClose={() => setShowOrderbook(false)}
          symbol={session.symbol}
        />
      )}
    </div>
  );
}

function TradeLedgerTable({ trades }) {
  return (
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
  );
}

const ORDERBOOK_EXPORT_COLUMNS = [
  { label: "Sequence", value: "sequence" },
  { label: "Type", value: "type" },
  { label: "Level Price", value: (t) => t.levelPrice },
  { label: "Fill Price", value: (t) => t.fillPrice },
  { label: "Qty Requested", value: (t) => t.qtyRequested },
  { label: "Qty Filled", value: (t) => t.qtyFilled },
  { label: "Qty Skipped", value: (t) => t.qtySkipped },
  { label: "Reason", value: (t) => t.reason || "" },
  { label: "Cash After", value: (t) => t.cashAfter },
  { label: "Holdings After", value: (t) => t.holdingsAfter },
  { label: "Avg Cost After", value: (t) => t.avgCostAfter },
  { label: "Realized P&L Delta", value: (t) => t.realizedPnLDelta },
  { label: "Gap Fill", value: (t) => (t.gapFill ? "Yes" : "No") },
  { label: "When", value: (t) => new Date(t.eventTimestamp).toLocaleString() },
];

// Full order book — every trade attempt ever persisted for this session
// (filled, partial, or fully skipped), not just the last DISPLAY_TRADE_LIMIT
// shown on the main page. Fetched on open via fetchAllTrades(), which loops
// the backend's paginated listTrades() until the whole ledger is assembled.
function OrderbookModal({ trades, loading, error, skippedOnly, onToggleSkippedOnly, onClose, symbol }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700">Order Book — {symbol}</h3>
          <button type="button" onClick={onClose} className="rounded-full px-2 py-1 text-sm text-gray-500 hover:bg-gray-100">
            ✕
          </button>
        </div>
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
          <label className="flex items-center gap-1 text-xs text-gray-500">
            <input type="checkbox" checked={skippedOnly} onChange={(e) => onToggleSkippedOnly(e.target.checked)} />
            Skipped/partial only
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{trades.length} trade{trades.length === 1 ? "" : "s"}</span>
            <Suspense fallback={<span className="text-xs text-gray-400">Export…</span>}>
              <TableExportMenu
                compact
                rows={trades}
                columns={ORDERBOOK_EXPORT_COLUMNS}
                filePrefix={`GridOrderbook_${symbol}`}
                disabled={loading || trades.length === 0}
              />
            </Suspense>
          </div>
        </div>
        <div className="overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-gray-400">Loading full order book…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : trades.length === 0 ? (
            <p className="text-sm text-gray-400">No {skippedOnly ? "skipped/partial" : "simulated"} fills yet.</p>
          ) : (
            <TradeLedgerTable trades={trades} />
          )}
        </div>
      </div>
    </div>
  );
}

// ADR-035: DISPLAY-ONLY statutory/brokerage charges estimate — never
// affects cash/holdings/realizedPnL (see the backend's
// gridChargesCalculator.js doc comment for the exact rates/sources). The
// "i" button reveals the breakdown on hover/focus; the card itself just
// shows the running total.
function ChargesStat({ charges }) {
  const rows = charges
    ? [
        ["Brokerage", charges.brokerage],
        ["STT", charges.stt],
        ["Exchange Txn Charges", charges.exchangeTxnCharges],
        ["SEBI Charges", charges.sebiFee],
        ["Stamp Duty", charges.stampDuty],
        ["GST", charges.gst],
      ]
    : [];

  return (
    <div className="group relative rounded-xl border border-gray-200 p-3">
      <div className="flex items-center gap-1">
        <p className="text-xs text-gray-500">Total Charges</p>
        <button
          type="button"
          tabIndex={0}
          aria-label="Charges breakdown"
          className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-gray-300 text-[9px] font-semibold leading-none text-gray-500 hover:bg-gray-100 focus:outline-none"
        >
          i
        </button>
      </div>
      <p className="text-lg font-semibold text-gray-900">{formatINR(charges?.total ?? 0)}</p>
      {charges?.approximate && <p className="text-xs font-medium text-amber-600">Approximate (segment not exactly modeled)</p>}

      <div className="pointer-events-none absolute left-0 top-full z-10 mt-1 w-56 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <p className="mb-1.5 font-semibold text-gray-700">Charges breakdown</p>
        {rows.map(([label, amount]) => (
          <div key={label} className="flex items-center justify-between py-0.5">
            <span>{label}</span>
            <span className="font-medium text-gray-800">{formatINR(amount)}</span>
          </div>
        ))}
        <div className="mt-1 flex items-center justify-between border-t border-gray-100 pt-1 font-semibold text-gray-800">
          <span>Total</span>
          <span>{formatINR(charges?.total ?? 0)}</span>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone, sub, subTone }) {
  const toneClass = tone === "pos" ? "text-green-700" : tone === "neg" ? "text-red-700" : "text-gray-900";
  const subToneClass = subTone === "pos" ? "text-green-700" : subTone === "neg" ? "text-red-700" : "text-gray-500";
  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-semibold ${toneClass}`}>{value}</p>
      {sub != null && <p className={`text-xs font-medium ${subToneClass}`}>{sub}</p>}
    </div>
  );
}
