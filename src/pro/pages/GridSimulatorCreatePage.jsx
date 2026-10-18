import { useNavigate } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import GridSimulatorCreateForm from "../components/GridSimulatorCreateForm";

/** Grid Trading Simulator (PAPER TRADING ONLY) — /workspace/grid/new. Thin
 *  composition only — see GridSimulatorCreateForm.jsx. */
export default function GridSimulatorCreatePage() {
  const navigate = useNavigate();

  return (
    <MainLayout title="New Grid Session" subtitle="Paper trading only — no real broker order is ever placed">
      <div className="mx-auto max-w-2xl px-6 py-4">
        <GridSimulatorCreateForm onCreated={(sessionId) => navigate(`/workspace/grid/${sessionId}`)} />
      </div>
    </MainLayout>
  );
}
