import { useNavigate } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import LiveStrategyList from "../components/LiveStrategyList";

/** Workstream L — /workspace/live, the live-strategy dashboard. Thin
 *  composition only: routing/navigation lives here, the actual list
 *  rendering/data-fetching lives in LiveStrategyList.jsx (kept
 *  router-free so it's unit-testable — see that file's doc comment). */
export default function LiveStrategiesPage() {
  const navigate = useNavigate();

  return (
    <MainLayout title="Live Strategies" subtitle="Strategies currently evaluated against live candle data">
      <div className="px-6 py-4">
        <LiveStrategyList
          onOpenRuntime={(runtimeId) => navigate(`/workspace/live/${runtimeId}`)}
          onActivateClick={() => navigate("/workspace/live/activate")}
        />
      </div>
    </MainLayout>
  );
}
