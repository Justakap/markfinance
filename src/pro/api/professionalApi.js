/**
 * Phase G/H/I — centralized client for the professional (v2) strategy and
 * backtest APIs (Phase F.5/F.6). All components talk to the backend only
 * through this file — no scattered raw fetch/axios calls, so the real
 * response shapes (confirmed by reading routes/professionalStrategyRoutes.js
 * and routes/professionalBacktestRoutes.js directly, not assumed) live in
 * exactly one place.
 *
 * Uses apiFetch (src/utils/api.js) — the project's preferred pattern for
 * new authenticated calls: attaches the bearer token automatically and
 * triggers the existing global handleUnauthorized() redirect-to-login on
 * any 401, so session expiry is handled identically to every other page.
 */
import { apiFetch } from "../../utils/api";

// --- Strategies ---

export function createStrategy({ name, description, definition }) {
  return apiFetch("/api/v2/strategies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description, definition }),
  });
}

export function listStrategies({ page = 1, limit = 20 } = {}) {
  return apiFetch(`/api/v2/strategies?page=${page}&limit=${limit}`);
}

export function getStrategy(strategyId) {
  return apiFetch(`/api/v2/strategies/${strategyId}`);
}

/** `updates` may include any of {name, description, status, definition}.
 *  Supplying `definition` creates a new immutable version server-side;
 *  omitting it is a metadata-only update — see
 *  routes/professionalStrategyRoutes.js's PUT handler. */
export function updateStrategy(strategyId, updates) {
  return apiFetch(`/api/v2/strategies/${strategyId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
}

export function listStrategyVersions(strategyId, { page = 1, limit = 20 } = {}) {
  return apiFetch(`/api/v2/strategies/${strategyId}/versions?page=${page}&limit=${limit}`);
}

export function getStrategyVersion(strategyId, versionId) {
  return apiFetch(`/api/v2/strategies/${strategyId}/versions/${versionId}`);
}

// --- Backtests ---

export function runBacktest({
  strategyId,
  versionId,
  symbol,
  instrumentKey,
  startDate,
  endDate,
  initialCapital,
  commissionPct,
  slippagePct,
}) {
  return apiFetch("/api/v2/backtest/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      strategyId,
      versionId,
      symbol,
      instrumentKey,
      startDate,
      endDate,
      initialCapital,
      commissionPct,
      slippagePct,
    }),
  });
}

export function listBacktests() {
  return apiFetch("/api/v2/backtests");
}

export function getBacktest(backtestResultId) {
  return apiFetch(`/api/v2/backtests/${backtestResultId}`);
}

export function listBacktestTrades(backtestResultId, { skip = 0, limit = 200 } = {}) {
  return apiFetch(`/api/v2/backtests/${backtestResultId}/trades?skip=${skip}&limit=${limit}`);
}

/** Historical Candle Chart milestone — the OHLCV series for exactly the
 *  instrument/timeframe/date-range this backtest ran against (not "today"
 *  relative), so entry/exit markers always land inside the returned range. */
export function getBacktestCandles(backtestResultId) {
  return apiFetch(`/api/v2/backtests/${backtestResultId}/candles`);
}
