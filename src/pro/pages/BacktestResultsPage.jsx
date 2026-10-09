import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import MainLayout from "../../layout/MainLayout";
import BacktestSummary from "../components/BacktestSummary";
import EquityCurveChart from "../components/EquityCurveChart";
import DrawdownChart from "../components/DrawdownChart";
import TradeExplorer from "../components/TradeExplorer";
import CandlestickChart from "../components/CandlestickChart";
import { getBacktest } from "../api/professionalApi";
import { showError } from "../../utils/toast";

/**
 * Phase I — renders a persisted BacktestResult (GET /api/v2/backtests/:id,
 * Phase F.5) in full: summary metrics, equity curve, drawdown, trade
 * explorer, and the exact strategy version that produced it. Works
 * identically whether navigated to right after running a backtest or
 * reopened later from history — both read the same persisted document.
 */
export default function BacktestResultsPage() {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getBacktest(id)
      .then((res) => {
        if (!cancelled) setResult(res);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err?.data?.message || "Failed to load backtest result";
        setError(message);
        showError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <MainLayout title="Backtest Result">
        <div className="flex items-center gap-2 px-6 py-6 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin" />
          Loading result…
        </div>
      </MainLayout>
    );
  }

  if (error || !result) {
    return (
      <MainLayout title="Backtest Result">
        <div className="mx-6 my-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || "Backtest result not found"}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={`Backtest — ${result.symbol}`} subtitle={`${result.timeframe} · ${new Date(result.dateRange.from).toLocaleDateString()} to ${new Date(result.dateRange.to).toLocaleDateString()}`}>
      <div className="space-y-6 px-6 py-4">
        <div className="flex items-center justify-between text-sm">
          <Link to="/workspace/backtests" className="text-blue-600 hover:underline">
            ← Back to backtest history
          </Link>
          <span className="text-xs text-gray-400">
            Initial capital: {result.initialCapital} · Data source: {result.dataSource}
          </span>
        </div>

        <section className="rounded-xl border border-gray-200 p-4">
          <BacktestSummary summary={result.summary} dataQuality={result.dataQuality} />
        </section>

        <section className="rounded-xl border border-gray-200 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-800">EQUITY CURVE</h3>
          <EquityCurveChart equitySeries={result.equitySeries} />
        </section>

        <section className="rounded-xl border border-gray-200 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-800">DRAWDOWN</h3>
          <DrawdownChart equitySeries={result.equitySeries} />
        </section>

        <section className="rounded-xl border border-gray-200 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-800">PRICE CHART</h3>
          <CandlestickChart backtestResultId={result._id} />
        </section>

        <section className="rounded-xl border border-gray-200 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-800">TRADES ({result.tradeCount})</h3>
          <TradeExplorer backtestResultId={result._id} />
        </section>
      </div>
    </MainLayout>
  );
}
