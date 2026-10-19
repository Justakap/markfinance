import { useEffect, useState } from "react";
import { listGridBacktests } from "../api/professionalApi";
import { showError } from "../../utils/toast";

const PAGE_SIZE = 20;

const STATUS_BADGE = {
  RUNNING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

function fmt(value, digits = 2) {
  return Number.isFinite(value) ? Number(value).toFixed(digits) : "--";
}

/**
 * Grid Backtest (PAPER TRADING / HISTORICAL SIMULATION ONLY) — backtest
 * history list, via GET /api/v2/grid-backtest/backtests. Router-free
 * (callback props) — ADR-017 testability convention.
 */
export default function GridBacktestList({ onOpenBacktest, onCreateClick, refreshKey = 0 }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listGridBacktests({ page, limit: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items || []);
        setTotal(res.total || 0);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err?.data?.message || "Failed to load grid backtests";
        setError(message);
        showError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
        <strong>PAPER TRADING / HISTORICAL SIMULATION ONLY.</strong> No real broker order is ever placed by a
        grid backtest.
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onCreateClick}
          className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
        >
          + New Backtest
        </button>
      </div>

      {loading && <p className="text-sm text-gray-400">Loading backtests…</p>}
      {!loading && error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-gray-400">No grid backtests yet. Run one to get started.</p>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left font-medium text-gray-500">Symbol</th>
                <th className="p-2 text-left font-medium text-gray-500">Range</th>
                <th className="p-2 text-left font-medium text-gray-500">Timeframe</th>
                <th className="p-2 text-left font-medium text-gray-500">Status</th>
                <th className="p-2 text-left font-medium text-gray-500">Net P&amp;L</th>
                <th className="p-2 text-left font-medium text-gray-500">Return %</th>
                <th className="p-2 text-left font-medium text-gray-500">Run</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.backtestId}
                  onClick={() => onOpenBacktest(item.backtestId)}
                  className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className="p-2 font-medium text-blue-700">{item.symbol}</td>
                  <td className="p-2 text-xs text-gray-500">
                    {item.config?.requestedStartDate} → {item.config?.requestedEndDate}
                  </td>
                  <td className="p-2">{item.config?.timeframe}</td>
                  <td className="p-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[item.status] || ""}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className={`p-2 ${item.metrics?.netPnL >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {item.metrics?.netPnL != null ? `₹${fmt(item.metrics.netPnL)}` : "--"}
                  </td>
                  <td className="p-2">{item.metrics?.returnPct != null ? `${fmt(item.metrics.returnPct)}%` : "--"}</td>
                  <td className="p-2 text-xs text-gray-400">{item.createdAt ? new Date(item.createdAt).toLocaleString() : "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="disabled:opacity-40">
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
