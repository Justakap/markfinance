import { useNavigate, Link } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import LiveActivationForm from "../components/LiveActivationForm";

/** Workstream L — /workspace/live/activate. Thin composition only; the
 *  actual form/validation/submission lives in LiveActivationForm.jsx
 *  (router-free, unit-testable). */
export default function LiveActivationPage() {
  const navigate = useNavigate();

  return (
    <MainLayout title="Activate Live Strategy" subtitle="Start evaluating a strategy against live candle data">
      <div className="space-y-4 px-6 py-4">
        <Link to="/workspace/live" className="text-sm text-blue-600 hover:underline">
          ← Back to live strategies
        </Link>

        <LiveActivationForm onActivated={(runtime) => navigate(`/workspace/live/${runtime.runtimeId}`)} />
      </div>
    </MainLayout>
  );
}
