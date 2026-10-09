import { useEffect, useState } from "react";
import {
  listStrategies,
  listStrategyVersions,
  getStrategyVersion,
  activateLiveStrategy,
} from "../api/professionalApi";
import { showError, showSuccess } from "../../utils/toast";
import InstrumentSearchInput from "./InstrumentSearchInput";

const DEFAULT_COMMISSION_PCT = 0.03;
const DEFAULT_SLIPPAGE_PCT = 0.05;

/**
 * Workstream L — activates a professional strategy for live evaluation,
 * via POST /api/v2/live/activate (Workstream J). Router-free (callback
 * prop `onActivated`, no `Link`/`useNavigate`) so this is directly
 * testable despite BLOCKER-004 — same pattern as LiveStrategyList.jsx.
 *
 * The chosen strategy VERSION's own `universe.timeframe` is read from the
 * server (getStrategyVersion) and the timeframe field is locked to it —
 * this is not a UI restriction invented here, it mirrors
 * liveStrategyService.js's own hard rejection of a timeframe mismatch
 * (confirmed by reading that file directly), so the form simply never
 * offers an input the backend would reject anyway.
 */
export default function LiveActivationForm({ onActivated }) {
  const [strategies, setStrategies] = useState([]);
  const [loadingStrategies, setLoadingStrategies] = useState(true);

  const [strategyId, setStrategyId] = useState("");
  const [versions, setVersions] = useState([]);
  const [versionId, setVersionId] = useState("");
  const [versionTimeframe, setVersionTimeframe] = useState(null);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const [instrument, setInstrument] = useState(null);
  const [initialCapital, setInitialCapital] = useState(10000);
  const [commissionPct, setCommissionPct] = useState(DEFAULT_COMMISSION_PCT);
  const [slippagePct, setSlippagePct] = useState(DEFAULT_SLIPPAGE_PCT);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listStrategies({ page: 1, limit: 100 })
      .then((res) => {
        if (cancelled) return;
        setStrategies((res.items || []).filter((s) => s.status === "ACTIVE"));
      })
      .catch((err) => {
        if (!cancelled) showError(err?.data?.message || "Failed to load strategies");
      })
      .finally(() => {
        if (!cancelled) setLoadingStrategies(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!strategyId) {
      setVersions([]);
      setVersionId("");
      setVersionTimeframe(null);
      return undefined;
    }

    let cancelled = false;
    setLoadingVersions(true);
    listStrategyVersions(strategyId, { page: 1, limit: 50 })
      .then((res) => {
        if (cancelled) return;
        const items = res.items || [];
        setVersions(items);
        const strategy = strategies.find((s) => s.strategyId === strategyId);
        const defaultVersionId = strategy?.currentVersionId && items.some((v) => v.versionId === strategy.currentVersionId)
          ? strategy.currentVersionId
          : items[0]?.versionId || "";
        setVersionId(defaultVersionId);
      })
      .catch((err) => {
        if (!cancelled) showError(err?.data?.message || "Failed to load strategy versions");
      })
      .finally(() => {
        if (!cancelled) setLoadingVersions(false);
      });
    return () => {
      cancelled = true;
    };
    // `strategies` is only read for its current snapshot when strategyId
    // changes, not a dependency we want to re-trigger this fetch on its
    // own updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategyId]);

  useEffect(() => {
    if (!strategyId || !versionId) {
      setVersionTimeframe(null);
      return undefined;
    }
    let cancelled = false;
    getStrategyVersion(strategyId, versionId)
      .then((version) => {
        if (!cancelled) setVersionTimeframe(version.definition?.universe?.timeframe || null);
      })
      .catch(() => {
        if (!cancelled) setVersionTimeframe(null);
      });
    return () => {
      cancelled = true;
    };
  }, [strategyId, versionId]);

  async function handleSubmit() {
    setError("");

    if (!strategyId || !versionId) {
      setError("Choose a strategy and version first.");
      return;
    }
    if (!instrument) {
      setError("Choose an instrument first.");
      return;
    }
    if (!versionTimeframe) {
      setError("Could not determine this version's timeframe. Try a different version.");
      return;
    }
    if (!Number.isFinite(Number(initialCapital)) || Number(initialCapital) <= 0) {
      setError("Initial capital must be a positive number.");
      return;
    }

    setSubmitting(true);
    try {
      const { runtime } = await activateLiveStrategy({
        strategyId,
        versionId,
        symbol: instrument.symbol,
        instrumentKey: instrument.instrumentKey,
        timeframe: versionTimeframe,
        initialCapital: Number(initialCapital),
        commissionPct: Number(commissionPct),
        slippagePct: Number(slippagePct),
      });
      showSuccess("Live strategy activated.");
      onActivated?.(runtime);
    } catch (err) {
      // The backend's own message already distinguishes timeframe
      // mismatch (400), not-found (404), and duplicate activation (409)
      // clearly — surfaced verbatim rather than re-worded, so its
      // specific guidance (e.g. "deactivate it first") isn't lost.
      const message = err?.data?.message || "Failed to activate live strategy";
      setError(message);
      showError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 p-4">
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
        Activating evaluates this strategy on a recurring basis against newly completed candles (the same
        polling-based candle workflow backtesting uses) — it does not execute tick by tick, and it never places a
        real broker order. Positions and fills recorded here are simulated only. Simulated P&amp;L reflects only the
        commission/slippage percentages below — it does not include STT, exchange transaction charges, GST, SEBI
        turnover fees, or stamp duty.
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Strategy</label>
        <select
          value={strategyId}
          onChange={(e) => setStrategyId(e.target.value)}
          disabled={loadingStrategies}
          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
        >
          <option value="">{loadingStrategies ? "Loading…" : "Select a strategy"}</option>
          {strategies.map((s) => (
            <option key={s.strategyId} value={s.strategyId}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {strategyId && (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Version</label>
          <select
            value={versionId}
            onChange={(e) => setVersionId(e.target.value)}
            disabled={loadingVersions}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
          >
            {versions.map((v) => (
              <option key={v.versionId} value={v.versionId}>
                v{v.versionNumber}
              </option>
            ))}
          </select>
          {versionTimeframe && (
            <p className="mt-1 text-xs text-gray-400">
              This version was authored for the <span className="font-medium">{versionTimeframe}</span> timeframe —
              activation will use it automatically.
            </p>
          )}
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Instrument</label>
        <InstrumentSearchInput value={instrument} onSelect={setInstrument} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Commission %</label>
          <input
            type="number"
            min={0}
            max={5}
            step={0.01}
            value={commissionPct}
            onChange={(e) => setCommissionPct(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Slippage %</label>
          <input
            type="number"
            min={0}
            max={5}
            step={0.01}
            value={slippagePct}
            onChange={(e) => setSlippagePct(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
          />
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full rounded-xl bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? "Activating…" : "Activate Live Strategy"}
      </button>
    </div>
  );
}
