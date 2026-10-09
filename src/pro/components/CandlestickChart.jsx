/**
 * Isolated placeholder for a future OHLC candlestick chart with entry/exit
 * trade markers.
 *
 * NOT implemented in this milestone — deliberately, not as an oversight.
 * POST /api/v2/backtest/run's response (and GET /api/v2/backtests/:id)
 * contain equitySeries + trades + summary only; no v2 endpoint currently
 * returns the raw OHLC candle series for the backtested instrument/date
 * range (confirmed by reading routes/professionalBacktestRoutes.js
 * directly). Rendering a candlestick chart without that data would mean
 * either fabricating candles or silently reusing a legacy endpoint not
 * designed for this purpose — both explicitly disallowed by this
 * milestone's instructions ("do not fabricate historical candles",
 * "do not invent API support").
 *
 * Kept as its own component (rather than omitted entirely) specifically
 * so the rest of the results page doesn't change shape once a real
 * candle-series endpoint exists — only this file's internals would need
 * to change. See .claude/state/DECISIONS.md for the chart-library
 * evaluation (lightweight-charts, ~45kb gzip, MIT-licensed — the
 * recommended choice whenever real candle data is available) and
 * .claude/state/BLOCKERS.md for the tracked gap.
 */
export default function CandlestickChart() {
  return (
    <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-center text-xs text-gray-400">
      Candlestick price chart with entry/exit markers isn&apos;t available yet —
      <br />
      no backend endpoint currently returns the underlying OHLC candle series for a backtest.
    </div>
  );
}
