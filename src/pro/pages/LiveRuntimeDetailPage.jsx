import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import MainLayout from "../../layout/MainLayout";
import {
  getLiveStrategyStatus,
  getStrategy,
  getStrategyVersion,
  deactivateLiveStrategy,
} from "../api/professionalApi";
import { showError, showSuccess, confirmAction } from "../../utils/toast";
import LiveSignalList from "../components/LiveSignalList";
import AlertConfigurationPanel from "../components/AlertConfigurationPanel";

/**
 * Workstream L — /workspace/live/:runtimeId. Runtime status detail,
 * frozen strategy version, current simulated position, paginated signal
 * history, and alert-configuration management for this one runtime.
 *
 * `strategyVersionId` is frozen at activation (ADR-001 extended to live,
 * see liveStrategyService.js) — this page always shows the version that
 * was actually frozen, via GET /api/v2/strategies/:id/versions/:versionId,
 * never the strategy's current version (which may have changed since).
 */
export default function LiveRuntimeDetailPage() {
  const { runtimeId } = useParams();

  const [runtime, setRuntime] = useState(null);
  const [strategyName, setStrategyName] = useState("");
  const [versionNumber, setVersionNumber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deactivating, setDeactivating] = useState(false);

  function load() {
    let cancelled = false;
    setLoading(true);
    getLiveStrategyStatus(runtimeId)
      .then((res) => {
        if (cancelled) return;
        setRuntime(res);
        setError("");
        return res;
      })
      .then((res) => {
        if (cancelled || !res) return;
        getStrategy(res.strategyId)
          .then((s) => !cancelled && setStrategyName(s.strategy?.name || ""))
          .catch(() => {});
        getStrategyVersion(res.strategyId, res.strategyVersionId)
          .then((v) => !cancelled && setVersionNumber(v.versionNumber))
          .catch(() => {});
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err?.data?.message || "Failed to load live strategy status";
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

  useEffect(load, [runtimeId]);

  async function handleDeactivate() {
    const confirmed = await confirmAction({
      title: "Deactivate live strategy",
      message: "Live evaluation stops immediately. The simulated position and signal history are preserved.",
      confirmText: "Deactivate",
    });
    if (!confirmed) return;

    setDeactivating(true);
    try {
      await deactivateLiveStrategy(runtimeId);
      showSuccess("Live strategy deactivated.");
      load();
    } catch (err) {
      showError(err?.data?.message || "Failed to deactivate live strategy");
    } finally {
      setDeactivating(false);
    }
  }

  if (loading) {
    return (
      <MainLayout title="Live Strategy">
        <div className="flex items-center gap-2 px-6 py-6 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin" />
          Loading…
        </div>
      </MainLayout>
    );
  }

  if (error || !runtime) {
    return (
      <MainLayout title="Live Strategy">
        <div className="mx-6 my-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || "Live strategy runtime not found"}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={`Live — ${runtime.symbol}`} subtitle={`${runtime.timeframe} · ${strategyName || "Strategy"}${versionNumber ? ` v${versionNumber}` : ""}`}>
      <div className="space-y-6 px-6 py-4">
        <div className="flex items-center justify-between text-sm">
          <Link to="/workspace/live" className="text-blue-600 hover:underline">
            ← Back to live strategies
          </Link>
          {runtime.status === "ACTIVE" && (
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={deactivating}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              {deactivating ? "Deactivating…" : "Deactivate"}
            </button>
          )}
        </div>

        <section className="rounded-xl border border-gray-200 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-800">STATUS</h3>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-gray-400">Status</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  runtime.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {runtime.status}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-400">Instrument</p>
              <p className="font-medium">{runtime.symbol}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Timeframe</p>
              <p className="font-medium">{runtime.timeframe}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Activated</p>
              <p className="font-medium">{new Date(runtime.createdAt).toLocaleString()}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-gray-400">Simulated Position</p>
              {runtime.position ? (
                <p className="font-medium">
                  {runtime.position.quantity} @ {runtime.position.entryPrice}
                </p>
              ) : (
                <p className="text-gray-400">Flat (no open position)</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400">Equity</p>
              <p className="font-medium">{runtime.equity}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Bars Processed</p>
              <p className="font-medium">{runtime.barsProcessed}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Last Evaluation</p>
              <p className="font-medium">{runtime.lastEvaluationAt ? new Date(runtime.lastEvaluationAt).toLocaleString() : "—"}</p>
              <p className="text-xs text-gray-400">{runtime.lastEvaluationStatus}</p>
            </div>
          </div>

          <p className="mt-4 text-xs text-gray-400">
            Evaluation runs on a recurring poll against newly completed candles — this is simulated evaluation only;
            no real broker order has ever been placed for this runtime.
          </p>
        </section>

        <section className="rounded-xl border border-gray-200 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-800">SIGNAL &amp; FILL HISTORY</h3>
          <LiveSignalList runtimeId={runtimeId} />
        </section>

        <section className="rounded-xl border border-gray-200 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-800">ALERT CONFIGURATION</h3>
          <AlertConfigurationPanel runtimeId={runtimeId} />
        </section>
      </div>
    </MainLayout>
  );
}
