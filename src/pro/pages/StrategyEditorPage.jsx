import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import MainLayout from "../../layout/MainLayout";
import StrategyEditor from "../components/StrategyEditor";
import StrategyVersionHistory from "../components/StrategyVersionHistory";
import BacktestRunner from "../components/BacktestRunner";
import { getStrategy } from "../api/professionalApi";
import { showError } from "../../utils/toast";

export default function StrategyEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState("");
  const [strategy, setStrategy] = useState(null);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    setLoading(true);
    getStrategy(id)
      .then((res) => {
        if (cancelled) return;
        setStrategy(res.strategy);
        setCurrentVersion(res.currentVersion);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err?.data?.message || err?.message || "Failed to load strategy";
        setError(message);
        showError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const handleSaved = (result) => {
    if (isNew) {
      navigate(`/workspace/strategies/${result.strategy.strategyId}`, { replace: true });
      return;
    }
    setStrategy(result.strategy);
    if (result.newVersion) {
      setCurrentVersion(result.newVersion);
      setHistoryRefreshKey((k) => k + 1);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Strategy" hideHeader={false}>
        <div className="flex items-center gap-2 px-6 py-6 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin" />
          Loading strategy…
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="Strategy">
        <div className="mx-6 my-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={isNew ? "New Strategy" : strategy?.name || "Strategy"} subtitle="Professional strategy editor">
      <div className="grid grid-cols-1 gap-6 px-6 py-4 lg:grid-cols-[2fr_1fr]">
        <div>
          <StrategyEditor
            mode={isNew ? "create" : "edit"}
            strategyId={isNew ? null : id}
            initialName={strategy?.name || ""}
            initialDescription={strategy?.description || ""}
            initialDefinition={currentVersion?.definition || null}
            onSaved={handleSaved}
          />
        </div>

        {!isNew && (
          <div className="space-y-6">
            <section className="rounded-xl border border-gray-200 p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">VERSION HISTORY</h3>
              <StrategyVersionHistory
                strategyId={id}
                currentVersionId={strategy?.currentVersionId}
                refreshKey={historyRefreshKey}
              />
            </section>

            <BacktestRunner
              strategyId={id}
              versionId={strategy?.currentVersionId}
              onResult={(result) => navigate(`/workspace/backtests/${result.backtestResultId}`)}
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
}
