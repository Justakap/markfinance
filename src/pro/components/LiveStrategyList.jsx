import { useEffect, useState } from "react";
import { listLiveStrategies, deactivateLiveStrategy, listStrategies, getStrategyVersion } from "../api/professionalApi";
import { showError, showSuccess, confirmAction } from "../../utils/toast";

const PAGE_SIZE = 20;

/**
 * Workstream L — the live-strategy dashboard list, via GET /api/v2/live
 * (Workstream J). Takes `onOpenRuntime`/`onActivateClick` as callback
 * props rather than using react-router-dom directly (no `Link`/
 * `useNavigate` import anywhere in this file) — this is what makes the
 * component reachable by Jest despite the pre-existing, unrelated
 * react-router-dom/Jest module-resolution bug (BLOCKER-004) that blocks
 * every page-level file that imports react-router-dom itself. The parent
 * page supplies real navigation; tests supply a spy.
 *
 * Strategy name resolution: GET /api/v2/live doesn't return a strategy
 * name (only `strategyId`), so this component fetches the user's
 * strategies once (bounded to 100 — acceptable for this dashboard; a
 * user with more strategies than that would see "Strategy <id>" for the
 * excess ones, a documented, non-corrupting fallback, not a crash).
 */
export default function LiveStrategyList({ onOpenRuntime, onActivateClick, refreshKey = 0 }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [strategyNames, setStrategyNames] = useState({});
  const [versionNumbers, setVersionNumbers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDeactivateId, setPendingDeactivateId] = useState(null);

  function load() {
    let cancelled = false;
    setLoading(true);
    const status = statusFilter === "ALL" ? undefined : statusFilter;

    listLiveStrategies({ page, limit: PAGE_SIZE, status })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items || []);
        setTotal(res.total || 0);
        setError("");
        return res.items || [];
      })
      .then((runtimeItems) => {
        if (cancelled || !runtimeItems?.length) return;
        // Bounded, parallel, per-page-only version lookups (no batch
        // endpoint exists for this) — see file doc comment.
        const uniquePairs = [...new Map(runtimeItems.map((r) => [`${r.strategyId}:${r.strategyVersionId}`, r])).values()];
        Promise.allSettled(
          uniquePairs.map((r) => getStrategyVersion(r.strategyId, r.strategyVersionId).then((v) => [`${r.strategyId}:${r.strategyVersionId}`, v.versionNumber])),
        ).then((results) => {
          if (cancelled) return;
          const map = {};
          results.forEach((r) => {
            if (r.status === "fulfilled") map[r.value[0]] = r.value[1];
          });
          setVersionNumbers((prev) => ({ ...prev, ...map }));
        });
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err?.data?.message || "Failed to load live strategies";
        setError(message);
        showError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }

  useEffect(load, [page, statusFilter, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    listStrategies({ page: 1, limit: 100 })
      .then((res) => {
        if (cancelled) return;
        const map = {};
        (res.items || []).forEach((s) => {
          map[s.strategyId] = s.name;
        });
        setStrategyNames(map);
      })
      .catch(() => {
        // Non-fatal — falls back to showing the raw strategyId.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDeactivate(runtime) {
    const confirmed = await confirmAction({
      title: "Deactivate live strategy",
      message: `Stop live evaluation of "${strategyNames[runtime.strategyId] || runtime.symbol}" on ${runtime.symbol} (${runtime.timeframe})? Its simulated position and signal history are preserved.`,
      confirmText: "Deactivate",
    });
    if (!confirmed) return;

    setPendingDeactivateId(runtime.runtimeId);
    try {
      await deactivateLiveStrategy(runtime.runtimeId);
      showSuccess("Live strategy deactivated.");
      load();
    } catch (err) {
      showError(err?.data?.message || "Failed to deactivate live strategy");
    } finally {
      setPendingDeactivateId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-gray-200 p-1 text-sm">
          {["ALL", "ACTIVE", "INACTIVE"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setStatusFilter(f);
                setPage(1);
              }}
              className={`rounded-md px-3 py-1 capitalize transition ${
                statusFilter === f ? "bg-blue-50 font-semibold text-blue-700" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {f.toLowerCase()}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onActivateClick}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Activate a strategy
        </button>
      </div>

      {loading && <p className="text-sm text-gray-400">Loading live strategies…</p>}

      {!loading && error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-400">
          No live strategies{statusFilter !== "ALL" ? ` (${statusFilter.toLowerCase()})` : ""} yet.
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Strategy</th>
                <th className="px-3 py-2 text-left">Instrument</th>
                <th className="px-3 py-2 text-left">Timeframe</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Activated</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const pairKey = `${r.strategyId}:${r.strategyVersionId}`;
                return (
                  <tr key={r.runtimeId} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => onOpenRuntime(r.runtimeId)} className="font-medium text-blue-600 hover:underline">
                        {strategyNames[r.strategyId] || `Strategy ${r.strategyId}`}
                      </button>
                      <span className="ml-1 text-xs text-gray-400">{versionNumbers[pairKey] ? `v${versionNumbers[pairKey]}` : ""}</span>
                    </td>
                    <td className="px-3 py-2">{r.symbol}</td>
                    <td className="px-3 py-2">{r.timeframe}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          r.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-400">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">
                      {r.status === "ACTIVE" && (
                        <button
                          type="button"
                          onClick={() => handleDeactivate(r)}
                          disabled={pendingDeactivateId === r.runtimeId}
                          className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                          {pendingDeactivateId === r.runtimeId ? "Deactivating…" : "Deactivate"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && total > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-center gap-3 text-xs">
          <button type="button" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-40">
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
