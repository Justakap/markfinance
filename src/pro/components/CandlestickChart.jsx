import { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries, createSeriesMarkers } from "lightweight-charts";
import { getBacktestCandles, listBacktestTrades } from "../api/professionalApi";
import { buildTradeMarkers, toUnixSeconds } from "../utils/candleMarkers";
import { showError } from "../../utils/toast";

const TRADE_FETCH_LIMIT = 500;

/**
 * Historical Candle Chart milestone — real OHLC candlestick chart for a
 * persisted backtest, via GET /api/v2/backtests/:id/candles (the backtest's
 * own instrument/timeframe/exact date range, never "today"-relative) and
 * entry/exit markers built from BacktestTrade's own persisted dates/prices
 * (src/pro/utils/candleMarkers.js — a pure, separately-tested function).
 *
 * This chart does NOT imply intrabar execution accuracy — markers sit on
 * the exact daily/intraday bar the trade's persisted date falls on, which
 * is the finest granularity the stored data supports.
 */
export default function CandlestickChart({ backtestResultId }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unmappedCount, setUnmappedCount] = useState(0);
  const [candleCount, setCandleCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([getBacktestCandles(backtestResultId), listBacktestTrades(backtestResultId, { skip: 0, limit: TRADE_FETCH_LIMIT })])
      .then(([candlesRes, tradesRes]) => {
        if (cancelled || !containerRef.current) return;

        const { candles } = candlesRes;
        setCandleCount(candlesRes.candleCount || 0);

        if (!candles || candles.timestamps.length === 0) {
          setError("No historical candle data is available for this backtest's instrument/date range.");
          return;
        }

        const chart = createChart(containerRef.current, {
          height: 360,
          layout: { background: { color: "transparent" }, textColor: "#374151" },
          grid: {
            vertLines: { color: "#f3f4f6" },
            horzLines: { color: "#f3f4f6" },
          },
          timeScale: { timeVisible: true, secondsVisible: false },
        });
        chartRef.current = chart;

        const series = chart.addSeries(CandlestickSeries, {
          upColor: "#16a34a",
          downColor: "#dc2626",
          borderVisible: false,
          wickUpColor: "#16a34a",
          wickDownColor: "#dc2626",
        });

        const seriesData = candles.timestamps.map((ts, i) => ({
          time: toUnixSeconds(ts),
          open: candles.open[i],
          high: candles.high[i],
          low: candles.low[i],
          close: candles.close[i],
        }));
        series.setData(seriesData);

        const { markers, unmappedCount: unmapped } = buildTradeMarkers(candles, tradesRes.trades || []);
        setUnmappedCount(unmapped);
        if (markers.length > 0) {
          createSeriesMarkers(series, markers);
        }

        chart.timeScale().fitContent();
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err?.data?.message || "Failed to load candle chart data";
        setError(message);
        showError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [backtestResultId]);

  if (loading) {
    return <div className="flex h-48 items-center justify-center text-xs text-gray-400">Loading candle chart…</div>;
  }

  if (error) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 text-center text-xs text-gray-400">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div ref={containerRef} />
      <p className="mt-2 text-xs text-gray-400">
        {candleCount} candles shown. Markers mark the exact bar matching each trade's persisted entry/exit date — not a
        claim about intrabar execution timing.
        {unmappedCount > 0 && (
          <>
            {" "}
            {unmappedCount} trade marker{unmappedCount === 1 ? "" : "s"} could not be precisely placed on this chart
            (outside the displayed candle range).
          </>
        )}
      </p>
    </div>
  );
}
