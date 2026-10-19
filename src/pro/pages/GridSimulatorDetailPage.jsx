import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import GridSimulatorDetail from "../components/GridSimulatorDetail";

/** Grid Trading Simulator (PAPER TRADING ONLY) — /workspace/grid/:sessionId.
 *  Thin composition only — see GridSimulatorDetail.jsx. */
export default function GridSimulatorDetailPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  return (
    <MainLayout hideHeader>
      <div className="px-6 py-4">
        <GridSimulatorDetail sessionId={sessionId} onBack={() => navigate("/workspace/grid")} />
      </div>
    </MainLayout>
  );
}
