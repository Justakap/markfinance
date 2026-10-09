import { useEffect, useState } from "react";
import { listLiveStrategySignals } from "../api/professionalApi";
import { showError } from "../../utils/toast";
import { getSignalLabel, getExitReasonLabel } from "../utils/liveSignalLabels";

const PAGE_SIZE = 20;

const TONE_CLASSES = {
  amber: "bg-amber-100 text-amber-700",
  emerald: "bg-emerald-100 text-emerald-700",
  gray: "bg-gray-100 text-gray-600",
};

/**
 * Workstream L — paginated signal/fill history for one LiveStrategyRuntime,
 * via GET /api/v2/live/:runtimeId/signals (Workstream J). Every row is
 * labeled ENTRY_SIGNAL/EXIT_SIGNAL/ENTRY_FILLED/EXIT_FILLED explicitly as a
 * strategy-evaluation or SIMULATED-fill event — never implies a real
 * broker execution, matching the backend's own notification wording
 * guarantee (alertContentBuilder.js).
 *
 * Deliberately never claims this list is a complete record: a signal that
 * was never persisted due to the engine's own documented crash window
 * (ADR-015/BLOCKER-005) simply would not appear here, and the empty/
 * partial states below say so rather than implying completeness.
 */
export default function LiveSignalList({ runtimeId }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listLiveStrategySignals(runtimeId, { page, limit: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items || []);
        setTotal(res.total || 0);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err?.data?.message || "Failed to load signal history";
        setError(message);
        showError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [runtimeId, page]);

  if (loading && items.length === 0) return <p className="text-sm text-gray-400">Loading signal history…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!loading && total === 0) {
    return (
      <p className="text-sm text-gray-400">
        No signals recorded yet for this runtime. New entries appear here once the strategy evaluates against a
        completed candle.
      </p>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <p className="mb-2 text-xs text-gray-400">
        This history reflects only signals the engine actually persisted — it is not guaranteed to be complete (see
        the engine's documented crash-window limitation).
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">Event</th>
              <th className="px-3 py-2 text-left">Bar Date</th>
              <th className="px-3 py-2 text-right">Price</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-left">Reason</th>
              <th className="px-3 py-2 text-right">Net P&amp;L</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => {
              const { label, tone } = getSignalLabel(s.type);
              return (
                <tr key={s.signalId} className="border-t border-gray-100">
                  <td className="px-3 py-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONE_CLASSES[tone]}`}>
                      {label}
                    </span>
                  </td>
                  <td className="px-3 py-1.5">{new Date(s.barDate).toLocaleString()}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{s.price ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{s.quantity ?? "—"}</td>
                  <td className="px-3 py-1.5">{s.exitReason ? getExitReasonLabel(s.exitReason) : "—"}</td>
                  <td
                    className={`px-3 py-1.5 text-right tabular-nums ${
                      s.netPnl == null ? "text-gray-400" : s.netPnl >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {s.netPnl == null ? "—" : s.netPnl}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {total > PAGE_SIZE && (
        <div className="mt-2 flex items-center justify-center gap-3 text-xs">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
