import { useEffect, useState } from "react";
import { getGridBacktest, listGridBacktestTrades } from "../api/professionalApi";

const TRADE_PAGE_SIZE = 50;

const STATUS_BADGE = {
  RUNNING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

function fmt(value, digits = 2) {
  return Number.isFinite(value) ? Number(value).toFixed(digits) : "--";
}

function fmtDate(value) {
  return value ? new Date(value).toLocaleString() : "--";
}

/**
 * Grid Backtest (PAPER TRADING / HISTORICAL SIMULATION ONLY) — results
 * detail: initial reference, requested vs. actual date range, data-quality
 * and intrabar-assumption disclosures, portfolio/accounting metrics, equity
 * curve, trade ledger. Router-free (callback prop `onBack`) — ADR-017
 * testability convention.
 *
 * Never shares authoritative state with the live Grid Simulator — this
 * reads only GridBacktestResult/GridBacktestTrade via /api/v2/grid-backtest,
 * a completely separate persistence/engine path (ADR-027).
 */
export default function GridBacktestDetail({ backtestId, onBack }) {
  const [backtest, setBacktest] = useState(null);
  const [trades, setTrades] = useState([]);
  const [tradesTotal, setTradesTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getGridBacktest(backtestId), listGridBacktestTrades(backtestId, { page: 1, limit: TRADE_PAGE_SIZE })])
      .then(([backtestRes, tradesRes]) => {
        if (cancelled) return;
        setBacktest(backtestRes);
        setTrades(tradesRes.items || []);
        setTradesTotal(tradesRes.total || 0);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.data?.message || "Failed to load grid backtest");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [backtestId]);

  if (loading) return <p className="text-sm text-gray-400">Loading grid backtest…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!backtest) return <p className="text-sm text-gray-400">Backtest not found.</p>;

  const { config, initialReference, dataQuality, metrics, equitySeries, status, symbol } = backtest;

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm text-blue-600 hover:underline">
        &larr; Back to backtests
      </button>

      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
        <strong>PAPER TRADING / HISTORICAL SIMULATION ONLY.</strong> No real broker order was ever placed by this
        backtest.
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{symbol}</h2>
          <p className="text-xs text-gray-500">
            Requested {config?.requestedStartDate} → {config?.requestedEndDate} ({config?.timeframe}) · Grid ₹
            {config?.gridInterval} · Qty/level {config?.quantityPerLevel}
          </p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status] || ""}`}>{status}</span>
      </div>

      {status === "FAILED" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {backtest.error || "This backtest failed. See server logs for details."}
        </div>
      )}

      {status === "RUNNING" && <p className="text-sm text-gray-400">This backtest is still running…</p>}

      {status === "COMPLETED" && (
        <>
          <div className="rounded-xl border border-gray-200 p-4 text-sm">
            <h3 className="mb-2 font-semibold text-gray-700">Initial Reference &amp; Data Quality</h3>
            <p className="text-gray-600">
              Initial reference: ₹{fmt(initialReference?.price)} at {fmtDate(initialReference?.timestamp)} (the close
              of the first available historical candle in the requested range — never the current live quote).
            </p>
            <p className="mt-1 text-gray-600">
              Actual data range used: {dataQuality?.actualStartDate} → {dataQuality?.actualEndDate} ·{" "}
              {dataQuality?.candleCount} candles ({dataQuality?.usedTimeframe})
            </p>
            {dataQuality?.incomplete && (
              <p className="mt-1 text-amber-700">
                ⚠ The historical data for this range was incomplete — some candles could not be retrieved.
              </p>
            )}
            {dataQuality?.retentionClamped && (
              <p className="mt-1 text-amber-700">
                ⚠ The requested start date was clamped to {dataQuality?.retentionFrom} due to Upstox's historical
                retention window for this timeframe.
              </p>
            )}
            {dataQuality?.usedFinerGrainedCandles ? (
              <p className="mt-1 text-gray-600">
                A finer-grained candle series was available and used for more precise intrabar replay.
              </p>
            ) : (
              <p className="mt-1 text-gray-600">
                Intrabar assumption: <strong>{dataQuality?.intrabarAssumption || "open-low-high-close"}</strong> — no
                finer-grained candle data was available, so each candle's path was conservatively assumed to move
                Open → Low → High → Close. This is a deterministic, documented assumption, not an observed price
                path.
              </p>
            )}
            {dataQuality?.costModelNote && <p className="mt-1 text-gray-500">{dataQuality.costModelNote}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Starting Cash" value={`₹${fmt(config?.startingCapital)}`} />
            <Stat label="Ending Equity" value={`₹${fmt(metrics?.endingEquity)}`} />
            <Stat label="Net P&amp;L" value={`₹${fmt(metrics?.netPnL)}`} tone={metrics?.netPnL >= 0 ? "pos" : "neg"} />
            <Stat label="Return %" value={metrics?.returnPct != null ? `${fmt(metrics.returnPct)}%` : "--"} tone={metrics?.returnPct >= 0 ? "pos" : "neg"} />
            <Stat label="Realized P&amp;L" value={`₹${fmt(metrics?.realizedPnL)}`} tone={metrics?.realizedPnL >= 0 ? "pos" : "neg"} />
            <Stat label="Unrealized P&amp;L" value={`₹${fmt(metrics?.unrealizedPnL)}`} tone={metrics?.unrealizedPnL >= 0 ? "pos" : "neg"} />
            <Stat label="Buys / Sells" value={`${metrics?.buyCount ?? 0} / ${metrics?.sellCount ?? 0}`} />
            <Stat label="Partial / Skipped" value={`${metrics?.partialCount ?? 0} / ${metrics?.skippedCount ?? 0}`} />
            <Stat label="Total Costs" value={`₹${fmt(metrics?.totalCosts)}`} />
            <Stat label="Max Drawdown" value={metrics?.maxDrawdownPct != null ? `${fmt(metrics.maxDrawdownPct)}%` : "--"} />
            <Stat label="Max Capital Deployed" value={`₹${fmt(metrics?.maxCapitalDeployed)}`} />
            <Stat label="Fills" value={tradesTotal} />
          </div>

          {Array.isArray(equitySeries) && equitySeries.length > 0 && (
            <div className="rounded-xl border border-gray-200 p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Equity Curve</h3>
              <EquitySparkline equitySeries={equitySeries} />
            </div>
          )}

          <div className="rounded-xl border border-gray-200 p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Trade Ledger</h3>
            {trades.length === 0 ? (
              <p className="text-sm text-gray-400">No simulated fills in this backtest.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left font-medium text-gray-500">Type</th>
                      <th className="p-2 text-left font-medium text-gray-500">Level</th>
                      <th className="p-2 text-left font-medium text-gray-500">Observed Fill</th>
                      <th className="p-2 text-left font-medium text-gray-500">Qty Req/Filled/Skipped</th>
                      <th className="p-2 text-left font-medium text-gray-500">Cash After</th>
                      <th className="p-2 text-left font-medium text-gray-500">Holdings After</th>
                      <th className="p-2 text-left font-medium text-gray-500">Reason</th>
                      <th className="p-2 text-left font-medium text-gray-500">Candle / Event Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade) => (
                      <tr key={trade.tradeId || `seq-${trade.sequence}`} className="border-t border-gray-100">
                        <td className={`p-2 font-medium ${trade.type === "BUY" ? "text-green-700" : "text-red-700"}`}>{trade.type}</td>
                        <td className="p-2">
                          {trade.levelPrice}
                          {trade.gapFill && <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-700">GAP</span>}
                        </td>
                        <td className="p-2">
                          ₹{fmt(trade.fillPrice)}
                          {trade.assumedIntrabar && (
                            <span className="ml-1 rounded bg-gray-100 px-1 text-[10px] text-gray-500" title="Assumed intrabar path, not an observed tick">
                              ASSUMED
                            </span>
                          )}
                        </td>
                        <td className="p-2">
                          {trade.qtyRequested} / {trade.qtyFilled} / {trade.qtySkipped > 0 ? trade.qtySkipped : "--"}
                        </td>
                        <td className="p-2">₹{fmt(trade.cashAfter)}</td>
                        <td className="p-2">{trade.holdingsAfter}</td>
                        <td className="p-2 text-xs text-gray-500">{trade.reason || "--"}</td>
                        <td className="p-2 text-xs text-gray-400">
                          {fmtDate(trade.candleTimestamp)}
                          {trade.eventTimestamp && trade.eventTimestamp !== trade.candleTimestamp ? ` (${fmtDate(trade.eventTimestamp)})` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
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

function EquitySparkline({ equitySeries }) {
  const values = equitySeries.map((p) => p.equity).filter((v) => Number.isFinite(v));
  if (values.length < 2) return <p className="text-xs text-gray-400">Not enough equity points to chart.</p>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 600;
  const height = 80;
  const points = equitySeries
    .map((p, i) => {
      const x = (i / (equitySeries.length - 1)) * width;
      const y = height - ((p.equity - min) / range) * height;
      return `${x.toFixed(1)},${Number.isFinite(y) ? y.toFixed(1) : height}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-20 w-full" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="1.5" />
    </svg>
  );
}
