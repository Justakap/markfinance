import { useState } from "react";
import { createGridBacktest } from "../api/professionalApi";
import { showError, showSuccess } from "../../utils/toast";
import InstrumentSearchInput from "./InstrumentSearchInput";

const TIMEFRAMES = [
  { value: "1m", label: "1 Minute" },
  { value: "5m", label: "5 Minutes" },
  { value: "15m", label: "15 Minutes" },
  { value: "1h", label: "1 Hour" },
  { value: "1d", label: "1 Day" },
];

/**
 * Grid Backtest (PAPER TRADING / HISTORICAL SIMULATION ONLY) — session
 * configuration form, via POST /api/v2/grid-backtest/backtests. Router-free
 * (callback prop `onCreated`) — ADR-017 testability convention.
 *
 * The initial reference is NEVER the current live quote — it is always
 * the close of the first available historical candle in the requested
 * range, captured server-side. There is no reference-price input here at
 * all, matching the live simulator's own dynamic-reference creation form.
 */
export default function GridBacktestCreateForm({ onCreated }) {
  const [instrument, setInstrument] = useState(null);
  const [timeframe, setTimeframe] = useState("1d");
  const [requestedStartDate, setRequestedStartDate] = useState("");
  const [requestedEndDate, setRequestedEndDate] = useState("");
  const [gridInterval, setGridInterval] = useState("");
  const [quantityPerLevel, setQuantityPerLevel] = useState(100);
  const [startingCapital, setStartingCapital] = useState(100000);
  const [maxPositionSize, setMaxPositionSize] = useState("");
  const [startingHoldings, setStartingHoldings] = useState("");
  const [startingAvgCost, setStartingAvgCost] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const hasStartingHoldings = Number(startingHoldings) > 0;

  function buildSummary() {
    if (!instrument || !requestedStartDate || !requestedEndDate || !gridInterval) return null;
    return `${instrument.symbol} · ${TIMEFRAMES.find((t) => t.value === timeframe)?.label} · ${requestedStartDate} → ${requestedEndDate} · Grid ₹${gridInterval} · Qty ${quantityPerLevel || 100}/level · Starting cash ₹${startingCapital}${hasStartingHoldings ? ` · ${startingHoldings} starting shares @ ₹${startingAvgCost || "?"}` : ""}`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!instrument) {
      setError("Select an instrument to backtest");
      return;
    }
    if (!requestedStartDate || !requestedEndDate) {
      setError("Select both a start and end date");
      return;
    }
    if (requestedStartDate >= requestedEndDate) {
      setError("Start date must be before the end date");
      return;
    }
    if (!Number.isFinite(Number(gridInterval)) || Number(gridInterval) <= 0) {
      setError("Grid interval must be a positive number");
      return;
    }
    if (hasStartingHoldings && !(Number.isFinite(Number(startingAvgCost)) && Number(startingAvgCost) > 0)) {
      setError("Average purchase price is required when starting holdings are greater than zero");
      return;
    }

    setSubmitting(true);
    try {
      const { backtest } = await createGridBacktest({
        symbol: instrument.symbol,
        instrumentKey: instrument.instrumentKey || instrument.instrument_key,
        timeframe,
        requestedStartDate,
        requestedEndDate,
        gridInterval: Number(gridInterval),
        quantityPerLevel: Number(quantityPerLevel),
        startingCapital: Number(startingCapital),
        maxPositionSize: maxPositionSize === "" ? null : Number(maxPositionSize),
        startingHoldings: hasStartingHoldings ? Number(startingHoldings) : 0,
        startingAvgCost: hasStartingHoldings ? Number(startingAvgCost) : 0,
      });
      showSuccess("Grid backtest completed");
      onCreated(backtest.backtestId);
    } catch (err) {
      const message = err?.data?.message || "Failed to run grid backtest";
      setError(message);
      showError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const summary = buildSummary();

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 p-4">
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
        <strong>PAPER TRADING / HISTORICAL SIMULATION ONLY.</strong> This replays the dynamic-reference grid
        strategy against historical candles — it never places a real broker order. The initial reference is the
        close of the first available historical candle in your selected range, not the current live price.
        Simulated fills execute at the exact candle price — zero friction, no synthetic commission or slippage
        modeled, same as the live simulator.
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Instrument</label>
        <InstrumentSearchInput value={instrument} onSelect={setInstrument} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Timeframe</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
          >
            {TIMEFRAMES.map((tf) => (
              <option key={tf.value} value={tf.value}>
                {tf.label}
              </option>
            ))}
          </select>
        </div>
        <div />
        <div>
          <label htmlFor="grid-backtest-start-date" className="mb-1 block text-xs font-medium text-gray-500">
            Start Date
          </label>
          <input
            id="grid-backtest-start-date"
            type="date"
            value={requestedStartDate}
            onChange={(e) => setRequestedStartDate(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
          />
        </div>
        <div>
          <label htmlFor="grid-backtest-end-date" className="mb-1 block text-xs font-medium text-gray-500">
            End Date
          </label>
          <input
            id="grid-backtest-end-date"
            type="date"
            value={requestedEndDate}
            onChange={(e) => setRequestedEndDate(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Grid Interval (₹)</label>
          <input
            type="number"
            step="0.01"
            value={gridInterval}
            onChange={(e) => setGridInterval(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
            placeholder="e.g. 3"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Quantity per Level</label>
          <input
            type="number"
            value={quantityPerLevel}
            onChange={(e) => setQuantityPerLevel(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Starting Virtual Capital (₹)</label>
          <input
            type="number"
            value={startingCapital}
            onChange={(e) => setStartingCapital(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Max Position Size (optional)</label>
          <input
            type="number"
            value={maxPositionSize}
            onChange={(e) => setMaxPositionSize(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
            placeholder="Unlimited"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Starting Holdings (shares, optional)</label>
          <input
            type="number"
            value={startingHoldings}
            onChange={(e) => setStartingHoldings(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
            placeholder="0"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Average Purchase Price (₹){hasStartingHoldings ? " — required" : ""}
          </label>
          <input
            type="number"
            step="0.01"
            value={startingAvgCost}
            onChange={(e) => setStartingAvgCost(e.target.value)}
            disabled={!hasStartingHoldings}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm disabled:bg-gray-100 disabled:text-gray-400"
            placeholder={hasStartingHoldings ? "e.g. 315" : "N/A — no starting holdings"}
          />
        </div>
      </div>

      {summary && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
          <strong>Summary:</strong> {summary}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="h-10 w-full rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? "Running backtest…" : "Run Backtest"}
      </button>
    </form>
  );
}
