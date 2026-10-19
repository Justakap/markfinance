import { useNavigate } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import GridSimulatorList from "../components/GridSimulatorList";
import GridWorkspaceTabs from "../components/GridWorkspaceTabs";

/** Grid Trading Simulator (PAPER TRADING ONLY) — /workspace/grid, the
 *  session dashboard. Thin composition only — see GridSimulatorList.jsx. */
export default function GridSimulatorListPage() {
  const navigate = useNavigate();

  return (
    <MainLayout title="Grid Trading Simulator" subtitle="Paper trading only — no real broker order is ever placed">
      <div className="px-6 py-4">
        <GridWorkspaceTabs active="live" onNavigate={navigate} />
        <GridSimulatorList
          onOpenSession={(sessionId) => navigate(`/workspace/grid/${sessionId}`)}
          onCreateClick={() => navigate("/workspace/grid/new")}
        />
      </div>
    </MainLayout>
  );
}
