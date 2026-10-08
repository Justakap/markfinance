import { useCallback, useEffect, useState } from "react";
import { X, Plus, FolderPlus, Trash2 } from "lucide-react";

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

const DEFAULT_CONDITION = () => ({
  type: "condition",
  indicator: "RSI (Daily)",
  operator: ">",
  compareType: "value",
  value: "",
});

const emptyGroup = (operator = "AND") => ({
  type: "group",
  operator,
  children: [],
});

const groupWithOneCondition = (operator = "AND") => ({
  type: "group",
  operator,
  children: [DEFAULT_CONDITION()],
});

// --- Pure tree helpers (immutable; operate on plain {type,...} nodes) ---

function updateAtPath(root, path, updater) {
  if (path.length === 0) return updater(root);
  const [head, ...rest] = path;
  return {
    ...root,
    children: root.children.map((child, i) =>
      i === head ? updateAtPath(child, rest, updater) : child,
    ),
  };
}

function removeAtPath(root, path) {
  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  return updateAtPath(root, parentPath, (group) => ({
    ...group,
    children: group.children.filter((_, i) => i !== index),
  }));
}

function addChildAtPath(root, path, child) {
  return updateAtPath(root, path, (group) => ({
    ...group,
    children: [...group.children, child],
  }));
}

/** Drops incomplete leaves and now-empty groups; returns null if nothing
 *  usable remains (meaning "no expression" to the backend). */
function pruneTree(node) {
  if (!node) return null;

  if (node.type === "condition") {
    if (!node.indicator || !node.operator || node.value === "" || node.value == null) {
      return null;
    }
    return {
      type: "condition",
      indicator: node.indicator,
      operator: node.operator,
      compareType: node.compareType || "value",
      value: node.value,
    };
  }

  if (node.type === "group") {
    const children = (node.children || []).map(pruneTree).filter(Boolean);
    if (!children.length) return null;
    return { type: "group", operator: node.operator === "OR" ? "OR" : "AND", children };
  }

  return null;
}

export default function StrategyModal({
  isOpen,
  onClose,
  onSave,
  editingStrategy,
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [entryTree, setEntryTree] = useState(groupWithOneCondition("AND"));
  const [exitTree, setExitTree] = useState(groupWithOneCondition("AND"));
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

  const normalizeTreeNode = useCallback(
    (node) => {
      if (!node) return emptyGroup("AND");

      if (node.type === "group") {
        return {
          type: "group",
          operator: node.operator === "OR" ? "OR" : "AND",
          children: (node.children || []).map(normalizeTreeNode),
        };
      }

      return {
        type: "condition",
        indicator: normalizeIndicator(node.indicator),
        operator: node.operator || ">",
        compareType:
          node.compareType || (Number.isNaN(Number(node.value)) ? "indicator" : "value"),
        value: node.value ?? "",
      };
    },
    [normalizeIndicator],
  );

  /** Legacy flat conditions -> a single-level group, exactly reproducing
   *  the strategy's declared top-level `logic` (per-condition `nextLogic`
   *  overrides aren't representable in the new uniform-operator-per-group
   *  UI, so editing and re-saving a legacy strategy that mixed AND/OR
   *  between individual pairs will collapse it to one operator — the
   *  common case, a single uniform connector, round-trips exactly). */
  const legacyConditionsToTree = useCallback((conditions = [], logic = "AND") => {
    const children = (conditions || []).map((c) => ({
      type: "condition",
      indicator: c.indicator,
      operator: c.operator,
      compareType: c.compareType,
      value: c.value,
    }));
    return { type: "group", operator: logic === "OR" ? "OR" : "AND", children };
  }, []);

  useEffect(() => {
    if (editingStrategy) {
      setName(editingStrategy.name || "");
      setDescription(editingStrategy.description || "");
      setAlertEnabled(editingStrategy.alertEnabled || false);

      const entrySource =
        editingStrategy.entryExpression ||
        legacyConditionsToTree(
          editingStrategy.entryConditions?.length
            ? editingStrategy.entryConditions
            : editingStrategy.conditions || [],
          editingStrategy.logic || "AND",
        );
      setEntryTree(normalizeTreeNode(entrySource));

      const exitSource =
        editingStrategy.exitExpression ||
        legacyConditionsToTree(editingStrategy.exitConditions || [], editingStrategy.logic || "AND");
      setExitTree(normalizeTreeNode(exitSource));

      setStopLoss(editingStrategy.stopLoss || "");
      setTarget(editingStrategy.target || "");
    } else {
      setName("");
      setDescription("");
      setAlertEnabled(false);
      setEntryTree(groupWithOneCondition("AND"));
      setExitTree(groupWithOneCondition("AND"));
      setStopLoss("");
      setTarget("");
    }
  }, [editingStrategy, isOpen, normalizeTreeNode, legacyConditionsToTree]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!name.trim()) return;

    const prunedEntry = pruneTree(entryTree);
    const prunedExit = pruneTree(exitTree);

    onSave({
      name,
      description,
      // Explicitly clear any legacy flat-list fields on every save made
      // through this UI (rather than omitting them), so an older strategy
      // edited here doesn't keep a stale legacy array alongside its new
      // tree once entryExpression/exitExpression take over — see
      // backend strategyExpression.js's getEntryExpression()/
      // getExitExpression() precedence.
      conditions: [],
      entryConditions: [],
      exitConditions: [],
      entryExpression: prunedEntry,
      exitExpression: prunedExit,
      stopLoss: Number(stopLoss) || 0,
      target: Number(target) || 0,
      logic: prunedEntry?.operator || "AND",
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
            <ExpressionGroup
              node={entryTree}
              path={[]}
              onChange={(updater) => setEntryTree((prev) => updater(prev))}
              accent="blue"
              depth={0}
            />
          </div>

          <div className="border border-gray-200 rounded-xl p-4 bg-slate-50 mt-5">
            <h3 className="font-semibold text-gray-800 mb-4">EXIT CONDITIONS</h3>
            <ExpressionGroup
              node={exitTree}
              path={[]}
              onChange={(updater) => setExitTree((prev) => updater(prev))}
              accent="amber"
              depth={0}
            />
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

/** Two-way AND/OR segmented toggle for a group's operator. */
function AndOrToggle({ value, onChange, accent }) {
  const activeClass =
    accent === "amber" ? "bg-amber-600 text-white" : "bg-blue-600 text-white";

  return (
    <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
      <button
        type="button"
        onClick={() => onChange("AND")}
        className={`px-2.5 py-1 ${value !== "OR" ? activeClass : "bg-white text-gray-500"}`}
      >
        ALL (AND)
      </button>
      <button
        type="button"
        onClick={() => onChange("OR")}
        className={`px-2.5 py-1 ${value === "OR" ? activeClass : "bg-white text-gray-500"}`}
      >
        ANY (OR)
      </button>
    </div>
  );
}

function ConditionRow({ node, onUpdate, onRemove }) {
  const update = (field, value) => onUpdate({ ...node, [field]: value });

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(8rem,10rem)_minmax(8rem,9rem)_minmax(0,1.2fr)_2rem] gap-2 items-center">
      <select
        value={node.indicator}
        onChange={(e) => update("indicator", e.target.value)}
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
        value={node.operator}
        onChange={(e) => update("operator", e.target.value)}
        className="w-full min-w-0 h-11 bg-white border border-gray-200 rounded-lg px-2 text-sm font-semibold"
      >
        {OPERATORS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      <select
        value={node.compareType || "value"}
        onChange={(e) => update("compareType", e.target.value)}
        className="w-full min-w-0 h-11 bg-white border border-gray-200 rounded-lg px-2 text-sm"
      >
        <option value="value">Value</option>
        <option value="indicator">Indicator</option>
      </select>

      {node.compareType === "indicator" ? (
        <select
          value={node.value}
          onChange={(e) => update("value", e.target.value)}
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
          value={node.value}
          onChange={(e) => update("value", e.target.value)}
          placeholder="Value"
          className="w-full min-w-0 h-11 bg-white border border-gray-200 rounded-lg px-3 text-sm"
        />
      )}

      <button
        type="button"
        onClick={onRemove}
        className="h-11 text-red-500 text-lg font-bold"
        title="Remove condition"
      >
        ×
      </button>
    </div>
  );
}

/**
 * Recursive group editor. `path` is this group's location within the root
 * tree (an array of child indices); `onChange(updater)` applies an
 * immutable update to the ROOT tree via updateAtPath/removeAtPath/
 * addChildAtPath, so every nesting level shares the same single source of
 * truth without each level needing its own state.
 */
function ExpressionGroup({ node, path, onChange, accent, depth, onRemoveSelf }) {
  const setOperator = (operator) => onChange((root) => updateAtPath(root, path, (g) => ({ ...g, operator })));

  const updateChild = (index, updatedNode) =>
    onChange((root) => updateAtPath(root, [...path, index], () => updatedNode));

  const removeChild = (index) => onChange((root) => removeAtPath(root, [...path, index]));

  const addCondition = () => onChange((root) => addChildAtPath(root, path, DEFAULT_CONDITION()));

  const addGroup = () =>
    onChange((root) =>
      addChildAtPath(root, path, groupWithOneCondition(node.operator === "AND" ? "OR" : "AND")),
    );

  return (
    <div className={depth > 0 ? "rounded-lg border border-gray-300 bg-white p-3" : ""}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <AndOrToggle value={node.operator} onChange={setOperator} accent={accent} />
          <span className="text-xs text-gray-500">must be true</span>
        </div>
        {depth > 0 && onRemoveSelf && (
          <button
            type="button"
            onClick={onRemoveSelf}
            className="text-red-500 hover:text-red-600"
            title="Remove group"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {node.children.length === 0 && (
        <p className="text-xs text-gray-400 italic mb-3">No conditions yet.</p>
      )}

      <div className="space-y-3">
        {node.children.map((child, index) =>
          child.type === "group" ? (
            <ExpressionGroup
              key={index}
              node={child}
              path={[...path, index]}
              onChange={onChange}
              accent={accent}
              depth={depth + 1}
              onRemoveSelf={() => removeChild(index)}
            />
          ) : (
            <ConditionRow
              key={index}
              node={child}
              onUpdate={(updated) => updateChild(index, updated)}
              onRemove={() => removeChild(index)}
            />
          ),
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addCondition}
          className="border-2 border-dashed border-gray-300 rounded-lg px-3 py-2 flex items-center gap-2 text-gray-500 hover:border-blue-500 hover:text-blue-600 text-sm"
        >
          <Plus size={14} />
          Add condition
        </button>
        <button
          type="button"
          onClick={addGroup}
          className="border-2 border-dashed border-gray-300 rounded-lg px-3 py-2 flex items-center gap-2 text-gray-500 hover:border-blue-500 hover:text-blue-600 text-sm"
        >
          <FolderPlus size={14} />
          Add group
        </button>
      </div>
    </div>
  );
}
