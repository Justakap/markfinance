import { useNavigate } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import GridBacktestCreateForm from "../components/GridBacktestCreateForm";
import GridWorkspaceTabs from "../components/GridWorkspaceTabs";

/** Grid Backtest (PAPER TRADING / HISTORICAL SIMULATION ONLY) —
 *  /workspace/grid/backtest/new. Thin composition only — see
 *  GridBacktestCreateForm.jsx. */
export default function GridBacktestCreatePage() {
  const navigate = useNavigate();

  return (
    <MainLayout title="New Grid Backtest" subtitle="Historical simulation only — no real broker order is ever placed">
      <div className="mx-auto max-w-2xl px-6 py-4">
        <GridWorkspaceTabs active="backtest" onNavigate={navigate} />
        <GridBacktestCreateForm onCreated={(backtestId) => navigate(`/workspace/grid/backtest/${backtestId}`)} />
      </div>
    </MainLayout>
  );
}
