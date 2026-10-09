/**
 * Edits definition.risk = { stopLoss?: {type:"percent",value}, takeProfit?: {...} }
 * — matches backend validateStrategyDefinition's exact shape (both
 * optional; when present, `type` must be "percent" and `value` a positive
 * number). A disabled toggle, not a text field, keeps an "off" state from
 * ever producing an invalid partial object.
 */
export default function RiskConfiguration({ risk, onChange }) {
  const stopLossEnabled = Boolean(risk?.stopLoss);
  const takeProfitEnabled = Boolean(risk?.takeProfit);

  const setStopLoss = (enabled, value) => {
    const next = { ...risk };
    if (!enabled) delete next.stopLoss;
    else next.stopLoss = { type: "percent", value: Number(value) || 1 };
    onChange(next);
  };

  const setTakeProfit = (enabled, value) => {
    const next = { ...risk };
    if (!enabled) delete next.takeProfit;
    else next.takeProfit = { type: "percent", value: Number(value) || 1 };
    onChange(next);
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="rounded-lg border border-gray-200 p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={stopLossEnabled}
            onChange={(e) => setStopLoss(e.target.checked, risk?.stopLoss?.value || 2)}
          />
          Stop Loss (%)
        </label>
        {stopLossEnabled && (
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={risk.stopLoss.value}
            onChange={(e) => setStopLoss(true, e.target.value)}
            className="mt-2 h-9 w-full rounded-lg border border-gray-200 px-3 text-sm"
          />
        )}
      </div>

      <div className="rounded-lg border border-gray-200 p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={takeProfitEnabled}
            onChange={(e) => setTakeProfit(e.target.checked, risk?.takeProfit?.value || 5)}
          />
          Take Profit (%)
        </label>
        {takeProfitEnabled && (
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={risk.takeProfit.value}
            onChange={(e) => setTakeProfit(true, e.target.value)}
            className="mt-2 h-9 w-full rounded-lg border border-gray-200 px-3 text-sm"
          />
        )}
      </div>
    </div>
  );
}
