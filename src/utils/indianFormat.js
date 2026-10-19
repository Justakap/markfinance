/**
 * Shared Indian-numbering-system formatters (comma grouping by
 * thousand/lakh/crore, e.g. 99,96,512.60), built on Intl.NumberFormat's
 * 'en-IN' locale rather than a hand-rolled comma-insertion routine. Used
 * wherever a financial/quantity value is displayed — never for arithmetic;
 * keep raw numbers in state/calculations and format only at render time.
 */

const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NUMBER_2DP_FORMATTER = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const INTEGER_FORMATTER = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

function isDisplayable(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

/** ₹23,077.10 / ₹99,96,512.60 / -₹3,327.00. Returns "--" for missing/invalid. */
export function formatINR(value) {
  if (!isDisplayable(value)) return "--";
  return INR_FORMATTER.format(Number(value));
}

/** Indian-grouped number with 2 decimals, no currency symbol (e.g. for
 *  non-currency monetary-shaped values like grid levels). */
export function formatIndianNumber(value) {
  if (!isDisplayable(value)) return "--";
  return NUMBER_2DP_FORMATTER.format(Number(value));
}

/** Indian-grouped integer quantity, no decimals (shares, counts). */
export function formatQuantity(value) {
  if (!isDisplayable(value)) return "--";
  return INTEGER_FORMATTER.format(Number(value));
}

/** Percentage with a fixed, consistent precision (default 2dp), e.g. "1.20%". */
export function formatPercent(value, digits = 2) {
  if (!isDisplayable(value)) return "--";
  return `${Number(value).toFixed(digits)}%`;
}
