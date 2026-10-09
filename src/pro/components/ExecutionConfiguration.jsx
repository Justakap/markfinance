import { POSITION_SIZING_TYPES } from "../constants/dsl";

/**
 * Edits definition.execution = { side: "LONG", positionSizing: {type,value}, costs?: {...} }.
 * `side` is rendered as a disabled "LONG" control, not a toggle — the
 * backend explicitly rejects anything but "LONG" (shorting is a deferred
 * phase, per strategyExpression.js's validateStrategyDefinition). Per the
 * milestone's instruction not to invent API support, SHORT is shown as
 * disabled with a note rather than offered as if it worked.
 */
export default function ExecutionConfiguration({ execution, onChange, riskHasStopLoss }) {
  const sizing = execution?.positionSizing || { type: "percentOfEquity", value: 100 };

  const setSizingType = (type) => {
    onChange({ ...execution, positionSizing: { type, value: sizing.value } });
  };

  const setSizingValue = (value) => {
    onChange({ ...execution, positionSizing: { ...sizing, value: Number(value) } });
  };

  const riskPercentBlocked = sizing.type === "riskPercent" && !riskHasStopLoss;

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Direction</label>
        <select value="LONG" disabled className="h-9 w-40 rounded-lg border border-gray-200 bg-gray-100 px-3 text-sm text-gray-500">
          <option value="LONG">Long only</option>
        </select>
        <p className="mt-1 text-[11px] text-gray-400">
          Short positions are not supported by the backend yet — this control is intentionally disabled rather than offered as a working option.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Position Sizing</label>
          <select
            value={sizing.type}
            onChange={(e) => setSizingType(e.target.value)}
            className="h-9 min-w-[11rem] rounded-lg border border-gray-200 px-2 text-sm"
          >
            {POSITION_SIZING_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Value</label>
          <input
            type="number"
            min={0.01}
            value={sizing.value}
            onChange={(e) => setSizingValue(e.target.value)}
            className="h-9 w-28 rounded-lg border border-gray-200 px-3 text-sm"
          />
        </div>
      </div>

      {riskPercentBlocked && (
        <p className="text-xs text-amber-600">
          Risk % sizing requires a Stop Loss to be enabled above — the backend will reject this definition until one is set.
        </p>
      )}
    </div>
  );
}
