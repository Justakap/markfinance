import { useState } from "react";
import { runBacktest } from "../api/professionalApi";
import { showError } from "../../utils/toast";
import InstrumentSearchInput from "./InstrumentSearchInput";

const DEFAULT_START = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
};
const DEFAULT_END = () => new Date().toISOString().slice(0, 10);

/**
 * Runs a backtest against a specific strategy version via
 * POST /api/v2/backtest/run (Phase F.5) and hands the result up —
 * the exact version used is always explicit (versionId), never implied.
 */
export default function BacktestRunner({ strategyId, versionId, onResult }) {
  const [instrument, setInstrument] = useState(null);
  const [startDate, setStartDate] = useState(DEFAULT_START());
  const [endDate, setEndDate] = useState(DEFAULT_END());
  const [initialCapital, setInitialCapital] = useState(10000);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const handleRun = async () => {
    setError("");
    if (!instrument) {
      setError("Choose a symbol first.");
      return;
    }
    if (!versionId) {
      setError("Save the strategy before running a backtest.");
      return;
    }

    setRunning(true);
    try {
      const result = await runBacktest({
        strategyId,
        versionId,
        symbol: instrument.symbol,
        instrumentKey: instrument.instrumentKey,
        startDate,
        endDate,
        initialCapital: Number(initialCapital),
      });
      onResult?.(result);
    } catch (err) {
      const message = err?.data?.message || err?.message || "Failed to run backtest";
      setError(message);
      showError(message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-800">RUN BACKTEST</h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-500">Symbol</label>
          <InstrumentSearchInput value={instrument} onSelect={setInstrument} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Initial Capital</label>
          <input
            type="number"
            min={1}
            value={initialCapital}
            onChange={(e) => setInitialCapital(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
          />
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <button
        type="button"
        onClick={handleRun}
        disabled={running}
        className="w-full rounded-xl bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {running ? "Running..." : "Run Backtest"}
      </button>
    </div>
  );
}
