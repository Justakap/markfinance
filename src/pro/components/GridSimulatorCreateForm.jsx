import { useState } from "react";
import { createGridSession } from "../api/professionalApi";
import { showError, showSuccess } from "../../utils/toast";
import { formatIndianInputValue, parseIndianInputValue } from "../../utils/indianFormat";
import InstrumentSearchInput from "./InstrumentSearchInput";

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
  const [useSeparateSellVariance, setUseSeparateSellVariance] = useState(false);
  const [sellVariance, setSellVariance] = useState("");
  const [quantityPerLevel, setQuantityPerLevel] = useState(100);
  const [useSeparateSellQuantity, setUseSeparateSellQuantity] = useState(false);
  const [sellQuantityPerLevel, setSellQuantityPerLevel] = useState("");
  const [startingCapital, setStartingCapital] = useState(100000);
  const [maxPositionSize, setMaxPositionSize] = useState("");
  const [startingHoldings, setStartingHoldings] = useState("");
  const [startingAvgCost, setStartingAvgCost] = useState("");
  const [usePriceLimits, setUsePriceLimits] = useState(false);
  const [lowerLimit, setLowerLimit] = useState("");
  const [upperLimit, setUpperLimit] = useState("");

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
    if (useSeparateSellVariance && !(Number.isFinite(Number(sellVariance)) && Number(sellVariance) > 0)) {
      setError("Sell variance must be a positive number");
      return;
    }
    if (useSeparateSellQuantity && !(Number.isInteger(Number(sellQuantityPerLevel)) && Number(sellQuantityPerLevel) > 0)) {
      setError("Sell quantity must be a positive integer");
      return;
    }
    if (hasStartingHoldings && !(Number.isFinite(Number(startingAvgCost)) && Number(startingAvgCost) > 0)) {
      setError("Average purchase price is required when starting holdings are greater than zero");
      return;
    }
    if (usePriceLimits) {
      if (!(Number.isFinite(Number(lowerLimit)) && Number(lowerLimit) > 0) || !(Number.isFinite(Number(upperLimit)) && Number(upperLimit) > 0)) {
        setError("Both an Upper Limit and a Lower Limit are required and must be positive numbers");
        return;
      }
      if (Number(upperLimit) <= Number(lowerLimit)) {
        setError("Upper Limit must be greater than Lower Limit");
        return;
      }
    }

    setSubmitting(true);
    try {
      const { session } = await createGridSession({
        symbol: instrument.symbol,
        instrumentKey: instrument.instrumentKey || instrument.instrument_key,
        gridInterval: Number(gridInterval),
        sellVariance: useSeparateSellVariance ? Number(sellVariance) : null,
        quantityPerLevel: Number(quantityPerLevel),
        sellQuantityPerLevel: useSeparateSellQuantity ? Number(sellQuantityPerLevel) : null,
        startingCapital: Number(startingCapital),
        maxPositionSize: maxPositionSize === "" ? null : Number(maxPositionSize),
        startingHoldings: hasStartingHoldings ? Number(startingHoldings) : 0,
        startingAvgCost: hasStartingHoldings ? Number(startingAvgCost) : 0,
        usePriceLimits,
        lowerLimit: usePriceLimits ? Number(lowerLimit) : null,
        upperLimit: usePriceLimits ? Number(upperLimit) : null,
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
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
        Simulated fills execute at the exact observed price — zero friction, no synthetic commission or slippage
        modeled. A separate, display-only <strong>Charges</strong> estimate (STT, exchange transaction charges, GST,
        SEBI turnover fees, brokerage, stamp duty — the same costs a real broker like Zerodha would charge) is shown
        on the session page, but it never adjusts the fill price or your cash/P&amp;L.
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
        The grid's <strong>Initial Reference</strong> price isn't captured now — it's captured automatically from a
        fresh live market quote the moment you click <strong>Start</strong> on the next screen, and that specific
        captured value never changes afterward (shown on the session page for audit purposes). Clicking Start also
        immediately executes one real BUY fill at that exact price, establishing your starting position right away.
        From then on, every individual BUY/SELL arms its own next buy/sell target — shown on the session page as
        Next Buy / Next Sell — rather than a single shared reference.
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Instrument</label>
        <InstrumentSearchInput value={instrument} onSelect={setInstrument} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Grid Variance / Buy Variance (₹)</label>
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
          <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <input
              type="checkbox"
              checked={useSeparateSellVariance}
              onChange={(e) => setUseSeparateSellVariance(e.target.checked)}
            />
            Use a different Sell Variance
          </label>
          <input
            type="number"
            step="0.01"
            value={sellVariance}
            onChange={(e) => setSellVariance(e.target.value)}
            disabled={!useSeparateSellVariance}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm disabled:bg-gray-100 disabled:text-gray-400"
            placeholder={useSeparateSellVariance ? "e.g. 5" : "Mirrors Buy Variance"}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Quantity per Level / Buy Qty</label>
          <input
            type="number"
            value={quantityPerLevel}
            onChange={(e) => setQuantityPerLevel(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <input
              type="checkbox"
              checked={useSeparateSellQuantity}
              onChange={(e) => setUseSeparateSellQuantity(e.target.checked)}
            />
            Use a different Sell Qty
          </label>
          <input
            type="number"
            value={sellQuantityPerLevel}
            onChange={(e) => setSellQuantityPerLevel(e.target.value)}
            disabled={!useSeparateSellQuantity}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm disabled:bg-gray-100 disabled:text-gray-400"
            placeholder={useSeparateSellQuantity ? "e.g. 50" : "Mirrors Buy Qty"}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Starting Virtual Capital (₹)</label>
          <input
            type="text"
            inputMode="numeric"
            value={formatIndianInputValue(startingCapital)}
            onChange={(e) => setStartingCapital(parseIndianInputValue(e.target.value))}
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

      <div>
        <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <input type="checkbox" checked={usePriceLimits} onChange={(e) => setUsePriceLimits(e.target.checked)} />
          Use price limits
        </label>
        {usePriceLimits && (
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Upper Limit (₹)</label>
              <input
                type="number"
                step="0.01"
                value={upperLimit}
                onChange={(e) => setUpperLimit(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                placeholder="e.g. 400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Lower Limit (₹)</label>
              <input
                type="number"
                step="0.01"
                value={lowerLimit}
                onChange={(e) => setLowerLimit(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                placeholder="e.g. 300"
              />
            </div>
            <p className="col-span-2 text-xs text-gray-500">
              BUYs pause once price falls to or below the Lower Limit, and SELLs pause once price rises to or above
              the Upper Limit — both resume automatically if price moves back within the band.
            </p>
          </div>
        )}
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
