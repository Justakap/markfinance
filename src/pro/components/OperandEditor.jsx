import { INDICATORS, PRICE_FIELDS, TIMEFRAMES, OPERAND_TYPES, getIndicatorDefinition, defaultParamsForIndicator } from "../constants/dsl";

/**
 * Edits a single DSL operand ({type:"indicator"|"price"|"constant", ...}).
 * Only ever offers indicators from src/pro/constants/dsl.js's INDICATORS
 * list — the exact set the backend has registered (see that file's header
 * comment) — so this can never present a control the backend will reject.
 */
export default function OperandEditor({ operand, onChange, primaryTimeframe }) {
  const setType = (type) => {
    if (type === "indicator") onChange({ type: "indicator", name: "RSI", params: defaultParamsForIndicator("RSI") });
    else if (type === "price") onChange({ type: "price", field: "close" });
    else onChange({ type: "constant", value: 0 });
  };

  const setIndicatorName = (name) => {
    onChange({ ...operand, name, params: defaultParamsForIndicator(name) });
  };

  const setParam = (key, value) => {
    onChange({ ...operand, params: { ...operand.params, [key]: Number(value) } });
  };

  const setTimeframe = (timeframe) => {
    if (!timeframe) {
      const { timeframe: _drop, ...rest } = operand;
      onChange(rest);
      return;
    }
    onChange({ ...operand, timeframe });
  };

  const indicatorDef = operand.type === "indicator" ? getIndicatorDefinition(operand.name) : null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        value={operand.type}
        onChange={(e) => setType(e.target.value)}
        className="h-9 min-w-0 rounded-lg border border-gray-200 bg-white px-2 text-xs"
        aria-label="Operand type"
      >
        {OPERAND_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      {operand.type === "indicator" && (
        <>
          <select
            value={operand.name}
            onChange={(e) => setIndicatorName(e.target.value)}
            className="h-9 min-w-0 rounded-lg border border-gray-200 bg-white px-2 text-xs"
            aria-label="Indicator"
          >
            {INDICATORS.map((i) => (
              <option key={i.name} value={i.name}>
                {i.label}
              </option>
            ))}
          </select>

          {indicatorDef?.params.map((p) => (
            <input
              key={p.key}
              type="number"
              value={operand.params?.[p.key] ?? p.default}
              min={p.min}
              max={p.max}
              onChange={(e) => setParam(p.key, e.target.value)}
              title={p.label}
              className="h-9 w-16 rounded-lg border border-gray-200 bg-white px-2 text-xs"
              aria-label={`${indicatorDef.label} ${p.label}`}
            />
          ))}

          <select
            value={operand.timeframe || ""}
            onChange={(e) => setTimeframe(e.target.value)}
            className="h-9 min-w-0 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-500"
            title="Timeframe (defaults to the strategy's primary timeframe)"
            aria-label="Operand timeframe"
          >
            <option value="">{`Default (${primaryTimeframe || "primary"})`}</option>
            {TIMEFRAMES.map((tf) => (
              <option key={tf.value} value={tf.value}>
                {tf.label}
              </option>
            ))}
          </select>
        </>
      )}

      {operand.type === "price" && (
        <select
          value={operand.field}
          onChange={(e) => onChange({ ...operand, field: e.target.value })}
          className="h-9 min-w-0 rounded-lg border border-gray-200 bg-white px-2 text-xs"
          aria-label="Price field"
        >
          {PRICE_FIELDS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      )}

      {operand.type === "constant" && (
        <input
          type="number"
          value={operand.value}
          onChange={(e) => onChange({ ...operand, value: Number(e.target.value) })}
          className="h-9 w-20 rounded-lg border border-gray-200 bg-white px-2 text-xs"
          aria-label="Constant value"
        />
      )}
    </div>
  );
}
