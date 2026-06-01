import { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import { apiFetch } from "../utils/api";

const MetricCard = ({ label, value, hint }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
    <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
    <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
    {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
  </div>
);

export default function MetricsPage() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await apiFetch("/api/metrics");
        if (active) setMetrics(data);
      } catch (err) {
        if (active) setError(err.message || "Failed to load metrics");
      }
    };

    load();
    const interval = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <MainLayout
      title="Performance Metrics"
      subtitle="Yahoo usage, cache efficiency, and latency"
    >
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {!metrics ? (
          <p className="text-slate-500 text-sm">Loading metrics…</p>
        ) : (
          <>
            <div className="mb-4 text-sm text-slate-600">
              Market:{" "}
              <span className="font-medium">
                {metrics.marketStatus?.label || "Unknown"}
              </span>
              {" · "}
              Cache entries: {metrics.cacheSize ?? 0}
              {" · "}
              Uptime: {Math.floor((metrics.uptimeSeconds || 0) / 60)} min
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Yahoo Requests"
                value={metrics.yahooRequests ?? 0}
              />
              <MetricCard label="Cache Hits" value={metrics.cacheHits ?? 0} />
              <MetricCard label="Cache Misses" value={metrics.cacheMisses ?? 0} />
              <MetricCard
                label="Engine Refreshes"
                value={metrics.engineRefreshes ?? 0}
              />
              <MetricCard
                label="Socket Updates"
                value={metrics.socketUpdates ?? 0}
              />
              <MetricCard
                label="Avg Scan Time"
                value={`${metrics.avgScanTimeMs ?? 0} ms`}
              />
              <MetricCard
                label="Avg Market Data"
                value={`${metrics.avgMarketDataTimeMs ?? 0} ms`}
              />
              <MetricCard
                label="Avg Backtest Time"
                value={`${metrics.avgBacktestTimeMs ?? 0} ms`}
              />
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
