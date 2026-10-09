/**
 * Mirrors backend/utils/indicatorRegistry.js and
 * backend/utils/strategyExpression.js's PROFESSIONAL_OPERATORS/
 * VALID_TIMEFRAMES/positionSizing-type list EXACTLY — confirmed by reading
 * those files directly, not assumed. If the backend registry changes,
 * this file must change with it; nothing here should ever let the UI
 * offer a control the backend will reject.
 *
 * Deliberately does NOT include Bollinger/ATR/ADX/Supertrend — they have
 * no series implementation yet (see .claude/state/BLOCKERS.md,
 * BLOCKER-001) and are not registered on the backend. Do not add them
 * here speculatively; the backend's registry is the single source of
 * truth and this file must only ever be a faithful mirror of it.
 */

export const INDICATORS = [
  { name: "RSI", label: "RSI", params: [{ key: "period", label: "Period", default: 14, min: 2, max: 200 }] },
  { name: "EMA", label: "EMA", params: [{ key: "period", label: "Period", default: 20, min: 1, max: 500 }] },
  { name: "SMA", label: "SMA", params: [{ key: "period", label: "Period", default: 20, min: 1, max: 500 }] },
  { name: "MACD", label: "MACD Line", params: [] },
  { name: "MACD_SIGNAL", label: "MACD Signal", params: [] },
  { name: "VWAP", label: "VWAP", params: [] },
];

export const INDICATOR_NAMES = INDICATORS.map((i) => i.name);

export const PRICE_FIELDS = [
  { value: "open", label: "Open" },
  { value: "high", label: "High" },
  { value: "low", label: "Low" },
  { value: "close", label: "Close" },
  { value: "volume", label: "Volume" },
];

export const TIMEFRAMES = [
  { value: "1m", label: "1 Minute" },
  { value: "5m", label: "5 Minute" },
  { value: "15m", label: "15 Minute" },
  { value: "1h", label: "1 Hour" },
  { value: "1d", label: "Daily" },
];

export const OPERATORS = [
  { value: "GT", label: "Greater Than (>)" },
  { value: "LT", label: "Less Than (<)" },
  { value: "GTE", label: "Greater Or Equal (>=)" },
  { value: "LTE", label: "Less Or Equal (<=)" },
  { value: "EQ", label: "Equals (=)" },
  { value: "CROSSES_ABOVE", label: "Crosses Above" },
  { value: "CROSSES_BELOW", label: "Crosses Below" },
];

export const OPERAND_TYPES = [
  { value: "indicator", label: "Indicator" },
  { value: "price", label: "Price / Volume" },
  { value: "constant", label: "Fixed Value" },
];

export const POSITION_SIZING_TYPES = [
  { value: "percentOfEquity", label: "% of Equity" },
  { value: "fixedQuantity", label: "Fixed Quantity" },
  { value: "fixedCash", label: "Fixed Cash Amount" },
  { value: "riskPercent", label: "Risk % (requires Stop Loss)" },
];

export const DSL_SCHEMA_VERSION = 2;

export function getIndicatorDefinition(name) {
  return INDICATORS.find((i) => i.name === name) || null;
}

export function defaultParamsForIndicator(name) {
  const def = getIndicatorDefinition(name);
  if (!def) return {};
  const params = {};
  def.params.forEach((p) => {
    params[p.key] = p.default;
  });
  return params;
}
