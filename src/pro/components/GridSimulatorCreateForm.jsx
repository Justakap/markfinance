import { useState } from "react";
import { createGridSession } from "../api/professionalApi";
import { showError, showSuccess } from "../../utils/toast";
import InstrumentSearchInput from "./InstrumentSearchInput";

const DEFAULT_COMMISSION_PCT = 0.03;
const DEFAULT_SLIPPAGE_PCT = 0.05;

/**
 * Grid Trading Simulator (PAPER TRADING ONLY) — session configuration
 * form, via POST /api/v2/grid-simulator/sessions. Router-free (callback
 * prop `onCreated`, no `Link`/`useNavigate`) — same ADR-017 testability
 * convention as LiveActivationForm.jsx.
 *
 * Dynamic-reference strategy: there is no "Reference Price" input — the
 * backend captures a fresh, validated live quote as the immutable initial
 * anchor at the moment of creation and rejects the request outright if no
 * sufficiently fresh quote is available (never silently uses a stale
 * price). Starting holdings are optional; an average purchase price is
 * required only when starting holdings are greater than zero.
 */
export default function GridSimulatorCreateForm({ onCreated }) {
  const [instrument, setInstrument] = useState(null);
  const [gridInterval, setGridInterval] = useState("");
  const [quantityPerLevel, setQuantityPerLevel] = useState(100);
  const [startingCapital, setStartingCapital] = useState(100000);
  const [maxPositionSize, setMaxPositionSize] = useState("");
  const [commissionPct, setCommissionPct] = useState(DEFAULT_COMMISSION_PCT);
  const [slippagePct, setSlippagePct] = useState(DEFAULT_SLIPPAGE_PCT);
  const [startingHoldings, setStartingHoldings] = useState("");
  const [startingAvgCost, setStartingAvgCost] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const hasStartingHoldings = Number(startingHoldings) > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!instrument) {
      setError("Select an instrument to simulate");
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
      const { session } = await createGridSession({
        symbol: instrument.symbol,
        instrumentKey: instrument.instrumentKey || instrument.instrument_key,
        gridInterval: Number(gridInterval),
        quantityPerLevel: Number(quantityPerLevel),
        startingCapital: Number(startingCapital),
        maxPositionSize: maxPositionSize === "" ? null : Number(maxPositionSize),
        commissionPct: Number(commissionPct),
        slippagePct: Number(slippagePct),
        startingHoldings: hasStartingHoldings ? Number(startingHoldings) : 0,
        startingAvgCost: hasStartingHoldings ? Number(startingAvgCost) : 0,
      });
      showSuccess("Grid simulator session created");
      onCreated(session.sessionId);
    } catch (err) {
      const message = err?.data?.message || "Failed to create grid simulator session";
      setError(message);
      showError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 p-4">
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
        <strong>PAPER TRADING ONLY.</strong> This simulates a fixed-grid strategy against live/polled prices —
        it never places a real broker order. Simulated fills use a two-knob commission/slippage model (see below);
        it does not include STT, exchange transaction charges, GST, SEBI turnover fees, or stamp duty.
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
        The grid's initial reference price is captured automatically from a fresh live market quote the moment
        you create this session — it is not something you type in, and it never changes afterward.
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Instrument</label>
        <InstrumentSearchInput value={instrument} onSelect={setInstrument} />
      </div>

      <div className="grid grid-cols-2 gap-3">
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
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Commission %</label>
          <input
            type="number"
            step="0.01"
            value={commissionPct}
            onChange={(e) => setCommissionPct(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Slippage %</label>
          <input
            type="number"
            step="0.01"
            value={slippagePct}
            onChange={(e) => setSlippagePct(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="h-10 w-full rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create Grid Session"}
      </button>
    </form>
  );
}
