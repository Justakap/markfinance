import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import GridBacktestDetail from "../components/GridBacktestDetail";
import GridWorkspaceTabs from "../components/GridWorkspaceTabs";

/** Grid Backtest (PAPER TRADING / HISTORICAL SIMULATION ONLY) —
 *  /workspace/grid/backtest/:backtestId. Thin composition only — see
 *  GridBacktestDetail.jsx. */
export default function GridBacktestDetailPage() {
  const { backtestId } = useParams();
  const navigate = useNavigate();

  return (
    <MainLayout title="Grid Backtest Result" subtitle="Historical simulation only — no real broker order is ever placed">
      <div className="px-6 py-4">
        <GridWorkspaceTabs active="backtest" onNavigate={navigate} />
        <GridBacktestDetail backtestId={backtestId} onBack={() => navigate("/workspace/grid/backtest")} />
      </div>
    </MainLayout>
  );
}
