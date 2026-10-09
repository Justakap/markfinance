/**
 * Pure, testable mapping from persisted BacktestTrade records to
 * lightweight-charts markers. No React, no chart library import — keeps
 * the actual placement logic unit-testable against deterministic
 * fixtures, per the milestone's explicit requirement.
 *
 * Hard rule (milestone instruction #9): never invent a timestamp or
 * price. A marker is only ever placed at the EXACT candle bar whose time
 * matches the trade's persisted entryDate/exitDate — if no such candle
 * exists in the currently-displayed series (e.g. the trade falls outside
 * the fetched range, or the timeframe's bar boundaries don't align for
 * some other reason), that marker is skipped and counted as unmapped
 * rather than approximated.
 */

const EXIT_REASON_STYLE = {
  SIGNAL: { color: "#64748b", text: "Exit" },
  STOP_LOSS: { color: "#dc2626", text: "SL" },
  TAKE_PROFIT: { color: "#16a34a", text: "TP" },
  TRAILING_STOP: { color: "#dc2626", text: "Trail" },
  END_OF_DATA: { color: "#64748b", text: "EOD" },
};

function toUnixSeconds(dateLike) {
  const ms = new Date(dateLike).getTime();
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

/** Builds a `time -> true` lookup once per call so each trade's lookup is
 *  O(1) rather than O(candles) — matters once a backtest has many trades
 *  against a long candle series. */
function buildCandleTimeIndex(candles) {
  const index = new Set();
  (candles?.timestamps || []).forEach((ts) => {
    const t = toUnixSeconds(ts);
    if (t !== null) index.add(t);
  });
  return index;
}

/**
 * `candles`: { timestamps: [...] } (the response shape from
 * GET /api/v2/backtests/:id/candles).
 * `trades`: BacktestTrade[] (entryDate, exitDate, exitReason, side).
 *
 * Returns `{ markers, unmappedCount }` — `markers` is ready to pass to
 * lightweight-charts' createSeriesMarkers().setMarkers().
 */
export function buildTradeMarkers(candles, trades) {
  const candleTimes = buildCandleTimeIndex(candles);
  const markers = [];
  let unmappedCount = 0;

  (trades || []).forEach((trade) => {
    const entryTime = toUnixSeconds(trade.entryDate);
    const exitTime = toUnixSeconds(trade.exitDate);

    if (entryTime !== null && candleTimes.has(entryTime)) {
      markers.push({
        time: entryTime,
        position: "belowBar",
        color: "#2563eb",
        shape: "arrowUp",
        text: "Entry",
        id: `${trade._id || `${entryTime}`}-entry`,
      });
    } else {
      unmappedCount += 1;
    }

    if (exitTime !== null && candleTimes.has(exitTime)) {
      const style = EXIT_REASON_STYLE[trade.exitReason] || EXIT_REASON_STYLE.SIGNAL;
      markers.push({
        time: exitTime,
        position: "aboveBar",
        color: style.color,
        shape: "arrowDown",
        text: style.text,
        id: `${trade._id || `${exitTime}`}-exit`,
      });
    } else {
      unmappedCount += 1;
    }
  });

  markers.sort((a, b) => a.time - b.time);

  return { markers, unmappedCount };
}

export { toUnixSeconds };
