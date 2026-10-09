import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import MainLayout from "../../layout/MainLayout";
import { listBacktests } from "../api/professionalApi";
import { showError } from "../../utils/toast";

/** Phase I — recent backtest history across all of the user's strategies,
 *  via GET /api/v2/backtests (Phase F.5, now populating strategyVersionId
 *  -> {versionNumber} so the exact version association is visible here,
 *  not just on the detail page). */
export default function BacktestHistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listBacktests()
      .then((res) => {
        if (!cancelled) setItems(Array.isArray(res) ? res : []);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err?.data?.message || "Failed to load backtest history";
        setError(message);
        showError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <MainLayout title="Backtest History" subtitle="Every professional backtest you've run">
      <div className="px-6 py-4">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" />
            Loading…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-400">
            No backtests yet.
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">Symbol</th>
                  <th className="px-3 py-2 text-left">Timeframe</th>
                  <th className="px-3 py-2 text-left">Date Range</th>
                  <th className="px-3 py-2 text-left">Version</th>
                  <th className="px-3 py-2 text-right">Return %</th>
                  <th className="px-3 py-2 text-right">Trades</th>
                  <th className="px-3 py-2 text-left">Run At</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r._id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium">{r.symbol}</td>
                    <td className="px-3 py-2">{r.timeframe}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {new Date(r.dateRange.from).toLocaleDateString()} – {new Date(r.dateRange.to).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {r.strategyVersionId?.versionNumber ? `v${r.strategyVersionId.versionNumber}` : "—"}
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums ${r.summary?.totalReturnPct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {r.summary?.totalReturnPct ?? "—"}%
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.tradeCount}</td>
                    <td className="px-3 py-2 text-xs text-gray-400">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">
                      <Link to={`/workspace/backtests/${r._id}`} className="text-blue-600 hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
