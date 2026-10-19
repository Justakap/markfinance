import { useNavigate } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import GridBacktestList from "../components/GridBacktestList";
import GridWorkspaceTabs from "../components/GridWorkspaceTabs";

/** Grid Backtest (PAPER TRADING / HISTORICAL SIMULATION ONLY) —
 *  /workspace/grid/backtest, the backtest history dashboard. Thin
 *  composition only — see GridBacktestList.jsx. */
export default function GridBacktestListPage() {
  const navigate = useNavigate();

  return (
    <MainLayout title="Grid Backtest" subtitle="Historical simulation only — no real broker order is ever placed">
      <div className="px-6 py-4">
        <GridWorkspaceTabs active="backtest" onNavigate={navigate} />
        <GridBacktestList
          onOpenBacktest={(backtestId) => navigate(`/workspace/grid/backtest/${backtestId}`)}
          onCreateClick={() => navigate("/workspace/grid/backtest/new")}
        />
      </div>
    </MainLayout>
  );
}
