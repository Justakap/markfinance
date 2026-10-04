import { useCallback, useEffect, useState } from "react";
import { X, Plus } from "lucide-react";

const INDICATOR_GROUPS = [
  {
    label: "Price",
    items: [
      "Price",
      "Price Change %",
      "Volume",
      "Volume Change %",
      "PE Ratio",
    ],
  },
  {
    label: "RSI",
    items: [
      "RSI (1 Minute)",
      "RSI (5 Minute)",
      "RSI (15 Minute)",
      "RSI (1 Hour)",
      "RSI (Daily)",
    ],
  },
  {
    label: "EMA",
    items: ["EMA20", "EMA50", "EMA200"],
  },
  {
    label: "Future Indicators",
    items: [
      "MACD",
      "VWAP",
      "Bollinger Bands",
      "ATR",
      "ADX",
      "Supertrend",
    ],
    disabled: true,
  },
];

const OPERATORS = [
  { value: ">", label: "Greater Than" },
  { value: "<", label: "Less Than" },
  { value: "=", label: "Equals" },
  { value: "Crosses Above", label: "Crosses Above" },
  { value: "Crosses Below", label: "Crosses Below" },
];

const ALL_SELECTABLE_INDICATORS = INDICATOR_GROUPS.filter((g) => !g.disabled).flatMap(
  (g) => g.items,
);

const DEFAULT_ENTRY = {
  indicator: "RSI (Daily)",
  operator: ">",
  compareType: "value",
  value: "",
};

export default function StrategyModal({
  isOpen,
  onClose,
  onSave,
  editingStrategy,
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [entryConditions, setEntryConditions] = useState([{ ...DEFAULT_ENTRY }]);
  const [exitConditions, setExitConditions] = useState([
    {
      indicator: "RSI (Daily)",
      operator: "<",
      compareType: "value",
      value: "",
    },
  ]);
  const [stopLoss, setStopLoss] = useState("");
  const [target, setTarget] = useState("");

  const normalizeIndicator = useCallback((indicator) => {
    const legacyMap = {
      RSI14: "RSI (Daily)",
      "Hourly RSI": "RSI (1 Hour)",
      "15 Min RSI": "RSI (15 Minute)",
      "5 Min RSI": "RSI (5 Minute)",
      "1 Min RSI": "RSI (1 Minute)",
    };

    if (legacyMap[indicator]) return legacyMap[indicator];
    if (ALL_SELECTABLE_INDICATORS.includes(indicator)) return indicator;

    return "RSI (Daily)";
  }, []);

  const normalizeConditions = useCallback((conditions = [], fallbackLogic = "AND") =>
    conditions.map((condition, index) => ({
      ...condition,
      indicator: normalizeIndicator(condition.indicator),
      compareType:
        condition.compareType || (Number.isNaN(Number(condition.value)) ? "indicator" : "value"),
      nextLogic:
        index === conditions.length - 1
          ? undefined
          : condition.nextLogic || fallbackLogic,
    })), [normalizeIndicator]);

  useEffect(() => {
    if (editingStrategy) {
      setName(editingStrategy.name || "");
      setDescription(editingStrategy.description || "");
      setAlertEnabled(editingStrategy.alertEnabled || false);

      setEntryConditions(
        normalizeConditions(
          editingStrategy.entryConditions ||
            editingStrategy.conditions || [{ ...DEFAULT_ENTRY }],
          editingStrategy.logic || "AND",
        ),
      );

      setExitConditions(
        normalizeConditions(
          Array.isArray(editingStrategy.exitConditions)
            ? editingStrategy.exitConditions
            : [],
          editingStrategy.logic || "AND",
        ),
      );

      setStopLoss(editingStrategy.stopLoss || "");
      setTarget(editingStrategy.target || "");
    } else {
      setName("");
      setDescription("");
      setAlertEnabled(false);
      setEntryConditions([{ ...DEFAULT_ENTRY }]);
      setExitConditions([
        {
          indicator: "RSI (Daily)",
          operator: "<",
          compareType: "value",
          value: "",
        },
      ]);
      setStopLoss("");
      setTarget("");
    }
  }, [editingStrategy, isOpen, normalizeConditions]);

  if (!isOpen) return null;

  const addCondition = (setter, conditions) => {
    setter([
      ...conditions.map((condition, index) =>
        index === conditions.length - 1
          ? { ...condition, nextLogic: condition.nextLogic || "AND" }
          : condition,
      ),
      { ...DEFAULT_ENTRY },
    ]);
  };

  const removeCondition = (index, conditions, setter) => {
    if (conditions.length === 1) return;
    setter(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index, field, value, conditions, setter) => {
    const updated = [...conditions];
    updated[index][field] = value;
    setter(updated);
  };

  const renderConditionRows = (
    conditions,
    setConditions,
    removeHandler,
    accent = "blue",
  ) =>
    conditions.map((condition, index) => (
      <div key={index}>
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(8rem,10rem)_minmax(8rem,9rem)_minmax(0,1.2fr)_2rem] gap-2 items-center">
          <select
            value={condition.indicator}
            onChange={(e) =>
              updateCondition(
                index,
                "indicator",
                e.target.value,
                conditions,
                setConditions,
              )
            }
            className="w-full min-w-0 h-11 bg-white border border-gray-200 rounded-lg px-3 text-sm"
          >
            {INDICATOR_GROUPS.filter((g) => !g.disabled).map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.items.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <select
            value={condition.operator}
            onChange={(e) =>
              updateCondition(
                index,
                "operator",
                e.target.value,
                conditions,
                setConditions,
              )
            }
            className="w-full min-w-0 h-11 bg-white border border-gray-200 rounded-lg px-2 text-sm font-semibold"
          >
            {OPERATORS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            value={condition.compareType || "value"}
            onChange={(e) =>
              updateCondition(
                index,
                "compareType",
                e.target.value,
                conditions,
                setConditions,
              )
            }
            className="w-full min-w-0 h-11 bg-white border border-gray-200 rounded-lg px-2 text-sm"
          >
            <option value="value">Value</option>
            <option value="indicator">Indicator</option>
          </select>

          {condition.compareType === "indicator" ? (
            <select
              value={condition.value}
              onChange={(e) =>
                updateCondition(
                  index,
                  "value",
                  e.target.value,
                  conditions,
                  setConditions,
                )
              }
              className="w-full min-w-0 h-11 bg-white border border-gray-200 rounded-lg px-3 text-sm"
            >
              <option value="">Select Indicator</option>
              {ALL_SELECTABLE_INDICATORS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="number"
              value={condition.value}
              onChange={(e) =>
                updateCondition(
                  index,
                  "value",
                  e.target.value,
                  conditions,
                  setConditions,
                )
              }
              placeholder="Value"
              className="w-full min-w-0 h-11 bg-white border border-gray-200 rounded-lg px-3 text-sm"
            />
          )}

          {conditions.length > 1 && (
            <button
              type="button"
              onClick={() => removeHandler(index)}
              className="h-11 text-red-500 text-lg font-bold"
            >
              ×
            </button>
          )}
        </div>

        {index !== conditions.length - 1 && (
          <div className="flex justify-center my-3">
            <select
              value={condition.nextLogic || "AND"}
              onChange={(e) =>
                updateCondition(
                  index,
                  "nextLogic",
                  e.target.value,
                  conditions,
                  setConditions,
                )
              }
              className={`bg-white border border-gray-200 px-3 py-1 rounded-md text-xs font-semibold ${
                accent === "amber" ? "text-amber-700" : "text-blue-600"
              }`}
            >
              <option value="AND">AND</option>
              <option value="OR">OR</option>
            </select>
          </div>
        )}
      </div>
    ));

  const handleSubmit = () => {
    const cleanConditions = (conditions) =>
      conditions
        .filter((c) => c.indicator && c.operator && c.value !== "")
        .map((condition, index, validConditions) => ({
          ...condition,
          nextLogic:
            index === validConditions.length - 1
              ? undefined
              : condition.nextLogic || "AND",
        }));

    const validEntryConditions = cleanConditions(entryConditions);
    const validExitConditions = cleanConditions(exitConditions);

    if (!name.trim()) return;

    onSave({
      name,
      description,
      entryConditions: validEntryConditions,
      exitConditions: validExitConditions,
      stopLoss: Number(stopLoss) || 0,
      target: Number(target) || 0,
      logic: "AND",
      alertEnabled,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white w-full max-w-2xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden">
        <div className="border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">
              {editingStrategy ? "Edit Strategy" : "Create Strategy"}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Build custom scanner logic
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto overflow-x-hidden h-[calc(85vh-70px)]">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Strategy Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 border border-gray-200 rounded-lg px-3"
              placeholder="Momentum Hunter"
            />
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              rows={1}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-3 resize-none"
              placeholder="Strong momentum setup"
            />
          </div>

          <div className="border border-gray-200 rounded-xl p-4 bg-slate-50">
            <h3 className="font-semibold text-gray-800 mb-4">ENTRY CONDITIONS</h3>
            {renderConditionRows(
              entryConditions,
              setEntryConditions,
              (index) => removeCondition(index, entryConditions, setEntryConditions),
            )}
            <div
              onClick={() => addCondition(setEntryConditions, entryConditions)}
              className="mt-4 border-2 border-dashed border-gray-300 rounded-lg py-3 flex items-center justify-center gap-2 text-gray-500 hover:border-blue-500 hover:text-blue-600 cursor-pointer"
            >
              <Plus size={16} />
              <span className="font-medium">Add Condition</span>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl p-4 bg-slate-50 mt-5">
            <h3 className="font-semibold text-gray-800 mb-4">EXIT CONDITIONS</h3>
            {renderConditionRows(
              exitConditions,
              setExitConditions,
              (index) =>
                setExitConditions(exitConditions.filter((_, i) => i !== index)),
              "amber",
            )}
            <div
              onClick={() => addCondition(setExitConditions, exitConditions)}
              className="mt-4 border-2 border-dashed border-gray-300 rounded-lg py-3 flex items-center justify-center gap-2 text-gray-500 hover:border-blue-500 hover:text-blue-600 cursor-pointer"
            >
              <Plus size={16} />
              <span className="font-medium">Add Exit Condition</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-5">
            <div>
              <label className="block text-sm font-medium mb-2">Stop Loss %</label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="w-full h-11 border border-gray-200 rounded-lg px-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Target %</label>
              <input
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full h-11 border border-gray-200 rounded-lg px-3"
              />
            </div>
          </div>

          <div className="mt-5 border-t pt-5 flex justify-between items-center">
            <div>
              <h4 className="font-medium">Execution Alert</h4>
              <p className="text-xs text-gray-500">Notify when matched</p>
            </div>
            <button
              type="button"
              onClick={() => setAlertEnabled(!alertEnabled)}
              className={`w-12 h-7 rounded-full relative transition ${
                alertEnabled ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition ${
                  alertEnabled ? "right-1" : "left-1"
                }`}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            className="w-full mt-5 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold"
          >
            {editingStrategy ? "Update Strategy" : "Save Strategy"}
          </button>
        </div>
      </div>
    </div>
  );
}
