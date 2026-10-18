import { useEffect, useState } from "react";
import { listGridSessions } from "../api/professionalApi";
import { showError } from "../../utils/toast";

const PAGE_SIZE = 20;

const STATUS_BADGE = {
  CREATED: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-green-100 text-green-700",
  PAUSED: "bg-amber-100 text-amber-700",
  STOPPED: "bg-gray-100 text-gray-500",
};

/**
 * Grid Trading Simulator (PAPER TRADING ONLY) — the session dashboard, via
 * GET /api/v2/grid-simulator/sessions. Router-free (callback props, no
 * `Link`/`useNavigate`) — same testability convention as LiveStrategyList.jsx
 * (ADR-017).
 */
export default function GridSimulatorList({ onOpenSession, onCreateClick, refreshKey = 0 }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const status = statusFilter === "ALL" ? undefined : statusFilter;

    listGridSessions({ page, limit: PAGE_SIZE, status })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items || []);
        setTotal(res.total || 0);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err?.data?.message || "Failed to load grid simulator sessions";
        setError(message);
        showError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, statusFilter, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
        <strong>PAPER TRADING ONLY.</strong> The Grid Trading Simulator never places a real broker order — every
        fill shown here is a simulated bookkeeping entry against virtual cash and holdings.
      </div>

      <div className="flex items-center justify-between gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-lg border border-gray-200 px-2 text-sm"
        >
          <option value="ALL">All statuses</option>
          <option value="CREATED">Created</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="STOPPED">Stopped</option>
        </select>
        <button
          type="button"
          onClick={onCreateClick}
          className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
        >
          + New Grid Session
        </button>
      </div>

      {loading && <p className="text-sm text-gray-400">Loading sessions…</p>}
      {!loading && error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-gray-400">No grid simulator sessions yet. Create one to get started.</p>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left font-medium text-gray-500">Symbol</th>
                <th className="p-2 text-left font-medium text-gray-500">Reference</th>
                <th className="p-2 text-left font-medium text-gray-500">Grid Interval</th>
                <th className="p-2 text-left font-medium text-gray-500">Qty/Level</th>
                <th className="p-2 text-left font-medium text-gray-500">Status</th>
                <th className="p-2 text-left font-medium text-gray-500">Created</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.sessionId}
                  onClick={() => onOpenSession(item.sessionId)}
                  className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className="p-2 font-medium text-blue-700">{item.symbol}</td>
                  <td className="p-2">{item.config?.referencePrice}</td>
                  <td className="p-2">{item.config?.gridInterval}</td>
                  <td className="p-2">{item.config?.quantityPerLevel}</td>
                  <td className="p-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[item.status] || ""}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-2 text-gray-500">{item.createdAt ? new Date(item.createdAt).toLocaleString() : "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
