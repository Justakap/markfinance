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

// --- Workstream J / L — Live Strategies ---

export function activateLiveStrategy({
  strategyId,
  versionId,
  symbol,
  instrumentKey,
  timeframe,
  initialCapital,
  commissionPct,
  slippagePct,
}) {
  return apiFetch("/api/v2/live/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      strategyId,
      versionId,
      symbol,
      instrumentKey,
      timeframe,
      initialCapital,
      commissionPct,
      slippagePct,
    }),
  });
}

export function deactivateLiveStrategy(runtimeId) {
  return apiFetch(`/api/v2/live/${runtimeId}/deactivate`, { method: "POST" });
}

export function listLiveStrategies({ page = 1, limit = 20, status } = {}) {
  const statusParam = status ? `&status=${status}` : "";
  return apiFetch(`/api/v2/live?page=${page}&limit=${limit}${statusParam}`);
}

export function getLiveStrategyStatus(runtimeId) {
  return apiFetch(`/api/v2/live/${runtimeId}`);
}

export function listLiveStrategySignals(runtimeId, { page = 1, limit = 20 } = {}) {
  return apiFetch(`/api/v2/live/${runtimeId}/signals?page=${page}&limit=${limit}`);
}

// --- Workstream K — Alerts / Notifications ---

export function listAlertConfigurations({ page = 1, limit = 20, runtimeId } = {}) {
  const runtimeParam = runtimeId ? `&runtimeId=${runtimeId}` : "";
  return apiFetch(`/api/v2/alert-configurations?page=${page}&limit=${limit}${runtimeParam}`);
}

export function createAlertConfiguration({ runtimeId, eventTypes, enabled }) {
  return apiFetch("/api/v2/alert-configurations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ runtimeId, eventTypes, enabled }),
  });
}

/** `updates` may include `enabled` and/or `eventTypes` only — see
 *  routes/alertRoutes.js's field allowlist. */
export function updateAlertConfiguration(configId, updates) {
  return apiFetch(`/api/v2/alert-configurations/${configId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
}

/** Archives (soft-deletes) a configuration — see alertConfigurationService.js. */
export function archiveAlertConfiguration(configId) {
  return apiFetch(`/api/v2/alert-configurations/${configId}`, { method: "DELETE" });
}

export function listNotifications({ page = 1, limit = 20, read } = {}) {
  const readParam = read === undefined ? "" : `&read=${read}`;
  return apiFetch(`/api/v2/notifications?page=${page}&limit=${limit}${readParam}`);
}

export function getUnreadNotificationCount() {
  return apiFetch("/api/v2/notifications/unread-count");
}

export function markNotificationRead(notificationId) {
  return apiFetch(`/api/v2/notifications/${notificationId}/read`, { method: "PUT" });
}

export function markAllNotificationsRead() {
  return apiFetch("/api/v2/notifications/mark-all-read", { method: "POST" });
}

/**
 * Grid Trading Simulator — PAPER TRADING ONLY. /api/v2/grid-simulator/*.
 * Nothing here ever places a real broker order.
 */
/** The initial reference is always captured server-side from a fresh live
 *  quote at creation time — never passed from here. Any `referencePrice`
 *  sent in the body is ignored by the backend (dynamic-reference strategy,
 *  ADR-023's companion session-creation change). */
export function createGridSession({
  symbol,
  instrumentKey,
  gridInterval,
  sellVariance,
  quantityPerLevel,
  startingCapital,
  maxPositionSize,
  commissionPct,
  slippagePct,
  startingHoldings,
  startingAvgCost,
}) {
  return apiFetch("/api/v2/grid-simulator/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      symbol,
      instrumentKey,
      gridInterval,
      sellVariance,
      quantityPerLevel,
      startingCapital,
      maxPositionSize,
      commissionPct,
      slippagePct,
      startingHoldings,
      startingAvgCost,
    }),
  });
}

export function listGridSessions({ page = 1, limit = 20, status } = {}) {
  const statusParam = status ? `&status=${status}` : "";
  return apiFetch(`/api/v2/grid-simulator/sessions?page=${page}&limit=${limit}${statusParam}`);
}

export function getGridSession(sessionId) {
  return apiFetch(`/api/v2/grid-simulator/sessions/${sessionId}`);
}

export function startGridSession(sessionId) {
  return apiFetch(`/api/v2/grid-simulator/sessions/${sessionId}/start`, { method: "POST" });
}

export function pauseGridSession(sessionId) {
  return apiFetch(`/api/v2/grid-simulator/sessions/${sessionId}/pause`, { method: "POST" });
}

export function resumeGridSession(sessionId) {
  return apiFetch(`/api/v2/grid-simulator/sessions/${sessionId}/resume`, { method: "POST" });
}

export function stopGridSession(sessionId) {
  return apiFetch(`/api/v2/grid-simulator/sessions/${sessionId}/stop`, { method: "POST" });
}

export function listGridTrades(sessionId, { page = 1, limit = 50, skippedOnly = false } = {}) {
  const skippedParam = skippedOnly ? "&skippedOnly=true" : "";
  return apiFetch(`/api/v2/grid-simulator/sessions/${sessionId}/trades?page=${page}&limit=${limit}${skippedParam}`);
}

// ADR-034: live-editable config — only allowed while the session is PAUSED
// (enforced server-side). `useSeparateSellVariance: false` clears a
// previously-set sellVariance so it mirrors gridInterval again.
export function updateGridSessionConfig(sessionId, { quantityPerLevel, gridInterval, useSeparateSellVariance, sellVariance, addCash } = {}) {
  return apiFetch(`/api/v2/grid-simulator/sessions/${sessionId}/config`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantityPerLevel, gridInterval, useSeparateSellVariance, sellVariance, addCash }),
  });
}

export function deleteGridSession(sessionId) {
  return apiFetch(`/api/v2/grid-simulator/sessions/${sessionId}`, { method: "DELETE" });
}

/**
 * Grid Backtest — PAPER TRADING / HISTORICAL SIMULATION ONLY.
 * /api/v2/grid-backtest/*. Shares the dynamic-reference grid engine with
 * the live simulator but never places a real broker order and never
 * touches a live session.
 */
export function createGridBacktest({
  symbol,
  instrumentKey,
  timeframe,
  requestedStartDate,
  requestedEndDate,
  gridInterval,
  quantityPerLevel,
  startingCapital,
  maxPositionSize,
  commissionPct,
  slippagePct,
  startingHoldings,
  startingAvgCost,
}) {
  return apiFetch("/api/v2/grid-backtest/backtests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      symbol,
      instrumentKey,
      timeframe,
      requestedStartDate,
      requestedEndDate,
      gridInterval,
      quantityPerLevel,
      startingCapital,
      maxPositionSize,
      commissionPct,
      slippagePct,
      startingHoldings,
      startingAvgCost,
    }),
  });
}

export function listGridBacktests({ page = 1, limit = 20 } = {}) {
  return apiFetch(`/api/v2/grid-backtest/backtests?page=${page}&limit=${limit}`);
}

export function getGridBacktest(backtestId) {
  return apiFetch(`/api/v2/grid-backtest/backtests/${backtestId}`);
}

export function listGridBacktestTrades(backtestId, { page = 1, limit = 100 } = {}) {
  return apiFetch(`/api/v2/grid-backtest/backtests/${backtestId}/trades?page=${page}&limit=${limit}`);
}
