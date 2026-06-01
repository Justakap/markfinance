import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import StockAnalysis from "./pages/StockAnalysis";
import Strategies from "./pages/Strategies";
import BacktestPage from "./pages/BacktestPage";
import BacktestsPage from "./pages/BacktestsPage";
import SettingsPage from "./pages/SettingsPage";
import ValidationPage from "./pages/ValidationPage";
import MetricsPage from "./pages/MetricsPage";

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;
