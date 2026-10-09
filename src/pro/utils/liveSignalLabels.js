/**
 * Workstream L — pure label/styling lookup for LiveStrategySignal event
 * types, shared by LiveSignalList.jsx and NotificationsPage.jsx's own
 * styling. Kept router-free specifically so it's unit-testable (the two
 * consumer components import react-router-dom transitively via other
 * pieces of the page tree in one case, so the lookup itself living here
 * guarantees it's reachable by Jest regardless).
 *
 * The four event types are STRATEGY-EVALUATION / SIMULATED-POSITION
 * events only — never a real broker fill. `isFill` mirrors the backend's
 * own explicit field (alertContentBuilder.js), never re-derived from a
 * substring match on `type`.
 */
const SIGNAL_LABELS = {
  ENTRY_SIGNAL: { label: "Entry Signal", isFill: false, tone: "amber" },
  EXIT_SIGNAL: { label: "Exit Signal", isFill: false, tone: "amber" },
  ENTRY_FILLED: { label: "Simulated Entry Fill", isFill: true, tone: "emerald" },
  EXIT_FILLED: { label: "Simulated Exit Fill", isFill: true, tone: "emerald" },
};

export function getSignalLabel(type) {
  return SIGNAL_LABELS[type] || { label: type || "Unknown event", isFill: false, tone: "gray" };
}

const EXIT_REASON_LABELS = {
  SIGNAL: "Strategy exit signal",
  STOP_LOSS: "Stop-loss",
  TAKE_PROFIT: "Take-profit",
  TRAILING_STOP: "Trailing stop",
  END_OF_DATA: "End of data",
};

export function getExitReasonLabel(exitReason) {
  return EXIT_REASON_LABELS[exitReason] || exitReason || "—";
}
