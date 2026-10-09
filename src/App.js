import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";
import { lazy, Suspense } from "react";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";

// Everything behind login is lazy-loaded — logged-out visitors (landing/login)
// never need to download the dashboard/analysis/backtesting bundles.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const StockAnalysis = lazy(() => import("./pages/StockAnalysis"));
const GreekPage = lazy(() => import("./pages/GreekPage"));
const Strategies = lazy(() => import("./pages/Strategies"));
const BacktestPage = lazy(() => import("./pages/BacktestPage"));
const BacktestsPage = lazy(() => import("./pages/BacktestsPage"));
const StrategyWorkspace = lazy(() => import("./pro/pages/StrategyWorkspace"));
const StrategyEditorPage = lazy(() => import("./pro/pages/StrategyEditorPage"));
const BacktestResultsPage = lazy(() => import("./pro/pages/BacktestResultsPage"));
const BacktestHistoryPage = lazy(() => import("./pro/pages/BacktestHistoryPage"));
const NotificationsPage = lazy(() => import("./pro/pages/NotificationsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ValidationPage = lazy(() => import("./pages/ValidationPage"));
const MetricsPage = lazy(() => import("./pages/MetricsPage"));

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen text-sm text-gray-500">
      Loading…
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen pb-12">
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route
            path="/"
            element={<LandingPage />}
          />

          <Route
            path="/login"
            element={<LoginPage />}
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analysis"
            element={
              <ProtectedRoute>
                <StockAnalysis />
              </ProtectedRoute>
            }
          />
          <Route
            path="/greek"
            element={
              <ProtectedRoute>
                <GreekPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/strategies"
            element={
              <ProtectedRoute>
                <Strategies />
              </ProtectedRoute>
            }
          />


          <Route
            path="/backtest/:strategyId"
            element={
              <ProtectedRoute>
                <BacktestPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/backtests"
            element={
              <ProtectedRoute>
                <BacktestsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/workspace"
            element={
              <ProtectedRoute>
                <StrategyWorkspace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspace/strategies/:id"
            element={
              <ProtectedRoute>
                <StrategyEditorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspace/backtests"
            element={
              <ProtectedRoute>
                <BacktestHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspace/backtests/:id"
            element={
              <ProtectedRoute>
                <BacktestResultsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspace/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {(process.env.REACT_APP_VALIDATION_MODE === "true" ||
            process.env.NODE_ENV === "development") && (
            <>
              <Route
                path="/validation"
                element={
                  <ProtectedRoute>
                    <ValidationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/metrics"
                element={
                  <ProtectedRoute>
                    <MetricsPage />
                  </ProtectedRoute>
                }
              />
            </>
          )}
        </Routes>
        </Suspense>

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur px-4 py-1 text-center text-[10px] text-gray-500">
          design and developed by Anant Khandelwal
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
