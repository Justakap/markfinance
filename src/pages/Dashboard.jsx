import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { apiFetch } from "../utils/api";

const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const result = await apiFetch("/api/dashboard", { signal: controller.signal });
        setData(result);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error(err);
        setError(err.message || "Failed to load dashboard");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => controller.abort();
  }, []);

  const cards = [
    { label: "Watchlists", value: data?.watchlists ?? 0 },
    { label: "Tracked Stocks", value: data?.stocksTracked ?? 0 },
    { label: "Strategies", value: data?.strategies ?? 0 },
    { label: "Backtests", value: data?.backtests ?? 0 },
    {
      label: "Active Alerts",
      value: data?.signalsToday ?? 0,
      hint: "Strategies with alerts enabled",
    },
  ];

  return (
    <MainLayout
      title="Overview"
      subtitle={`Welcome back, ${user?.name?.split(" ")[0] || "there"}`}
    >
      <div className="bg-slate-50 min-h-screen p-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"
            >
              <p className="text-sm text-slate-500">{card.label}</p>
              <h2 className="text-2xl font-semibold mt-2 text-slate-900">
                {loading ? "—" : card.value}
              </h2>
              {card.hint && (
                <p className="text-xs text-slate-400 mt-1">{card.hint}</p>
              )}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-4 mt-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-slate-900">Recent Activity</h2>
              <span className="text-xs text-slate-400">Latest</span>
            </div>
            <div className="mt-4 space-y-3">
              {loading && (
                <p className="text-sm text-slate-500">Loading activity...</p>
              )}
              {!loading && data?.recentActivity?.length === 0 && (
                <p className="text-sm text-slate-500">
                  Run a backtest or strategy scan to see activity here.
                </p>
              )}
              {data?.recentActivity?.map((item, index) => (
                <div key={index} className="bg-slate-50 rounded-lg p-3">
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{item.subtitle}</p>
                  {item.meta?.winRate !== undefined && (
                    <p className="text-xs text-blue-600 mt-1">
                      Win rate: {item.meta.winRate}%
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Link
                to="/analysis"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-3 font-medium transition text-center"
              >
                Open Analysis
              </Link>
              <Link
                to="/analysis"
                className="border border-slate-200 hover:bg-slate-50 rounded-lg p-3 transition text-center"
              >
                Watchlists
              </Link>
              <Link
                to="/strategies"
                className="border border-slate-200 hover:bg-slate-50 rounded-lg p-3 transition text-center"
              >
                Strategies
              </Link>
              <Link
                to="/backtests"
                className="border border-slate-200 hover:bg-slate-50 rounded-lg p-3 transition text-center"
              >
                Backtests
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
