import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2 } from "lucide-react";
import MainLayout from "../../layout/MainLayout";
import StrategyList from "../components/StrategyList";
import { listStrategies } from "../api/professionalApi";
import { showError } from "../../utils/toast";

/**
 * Phase G — the professional strategy workspace landing page. Lists the
 * authenticated user's StrategyDefinitions via the real
 * GET /api/v2/strategies (Phase F.6), paginated. Separate route/page from
 * the legacy /strategies (src/pages/Strategies.jsx, untouched) — the two
 * systems are kept apart per the backend's own ADR-006 separation.
 */
export default function StrategyWorkspace() {
  const navigate = useNavigate();
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    listStrategies({ page, limit })
      .then((res) => {
        if (cancelled) return;
        setStrategies(res.items || []);
        setTotal(res.total || 0);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err?.data?.message || err?.message || "Failed to load strategies";
        setError(message);
        showError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <MainLayout title="Strategy Workspace" subtitle="Professional strategy research and backtesting">
      <div className="px-6 py-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Your Strategies</h2>
          <button
            type="button"
            onClick={() => navigate("/workspace/strategies/new")}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            New Strategy
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" />
            Loading strategies…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {!loading && !error && strategies.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-400">
            No strategies yet. Create your first one to get started.
          </div>
        )}

        {!loading && !error && strategies.length > 0 && (
          <>
            <StrategyList strategies={strategies} onOpen={(id) => navigate(`/workspace/strategies/${id}`)} />

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3 text-sm">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
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
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
