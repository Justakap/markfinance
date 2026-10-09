import { useState } from "react";
import ExpressionGroupEditor from "./ExpressionGroupEditor";
import RiskConfiguration from "./RiskConfiguration";
import ExecutionConfiguration from "./ExecutionConfiguration";
import { groupWithOneCondition, pruneTree } from "../utils/dslTree";
import { TIMEFRAMES, DSL_SCHEMA_VERSION } from "../constants/dsl";
import { createStrategy, updateStrategy } from "../api/professionalApi";
import { showError, showSuccess } from "../../utils/toast";

/**
 * The backend DSL allows entry/exit to be EITHER a bare condition OR a
 * group at the root (validateProfessionalExpression accepts both) — but
 * ExpressionGroupEditor always needs a group-shaped node to render
 * (it reads node.children). Loading a strategy whose entry/exit happens
 * to be a single bare condition must wrap it in a one-child group for
 * editing, exactly like the legacy StrategyModal.jsx wrapped a flat
 * condition list — this is purely an editing-representation choice, not
 * a DSL change: a one-child group is semantically identical to a bare
 * condition, and the backend accepts both.
 */
function toEditableTree(node) {
  if (!node) return groupWithOneCondition("AND");
  if (node.type === "group") return node;
  return { type: "group", operator: "AND", children: [node] };
}

function buildDefinition({ timeframe, entryTree, exitTree, risk, execution }) {
  const entry = pruneTree(entryTree);
  const exit = pruneTree(exitTree);

  return {
    version: DSL_SCHEMA_VERSION,
    universe: { timeframe },
    entry,
    ...(exit ? { exit } : {}),
    ...(Object.keys(risk || {}).length ? { risk } : {}),
    execution,
  };
}

/**
 * The visual strategy builder (Phase H). Faithfully represents the actual
 * backend DSL — every operand/operator/indicator control is drawn from
 * src/pro/constants/dsl.js, which mirrors the backend's registry exactly.
 * Backend validation (validateStrategyDefinition) remains authoritative;
 * this component's own checks exist only to give immediate UX feedback
 * before a round trip, not to replace server-side validation.
 */
export default function StrategyEditor({
  mode = "create",
  strategyId = null,
  initialName = "",
  initialDescription = "",
  initialDefinition = null,
  onSaved,
}) {
  const initialTimeframe = initialDefinition?.universe?.timeframe || "1d";
  const initialEntryTree = toEditableTree(initialDefinition?.entry);
  const initialExitTree = toEditableTree(initialDefinition?.exit);
  const initialRisk = initialDefinition?.risk || {};
  const initialExecution = initialDefinition?.execution || { side: "LONG", positionSizing: { type: "percentOfEquity", value: 100 } };

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [entryTree, setEntryTree] = useState(initialEntryTree);
  const [exitTree, setExitTree] = useState(initialExitTree);
  const [risk, setRisk] = useState(initialRisk);
  const [execution, setExecution] = useState(initialExecution);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState("");

  // Both sides of the "did the definition actually change" check must go
  // through the EXACT SAME build/prune pipeline, computed once from the
  // initial props (not live state) — comparing raw initialDefinition
  // against a freshly-rebuilt one would false-positive on incidental
  // representation differences (e.g. a bare condition vs. a one-child
  // group), even when nothing the user could see or edit actually changed.
  const [initialSnapshotJson] = useState(() =>
    JSON.stringify(
      buildDefinition({
        timeframe: initialTimeframe,
        entryTree: initialEntryTree,
        exitTree: initialExitTree,
        risk: initialRisk,
        execution: initialExecution,
      }),
    ),
  );

  const handleSave = async () => {
    setValidationError("");

    if (!name.trim()) {
      setValidationError("Strategy name is required.");
      return;
    }

    const definition = buildDefinition({ timeframe, entryTree, exitTree, risk, execution });

    if (!definition.entry) {
      setValidationError("At least one entry condition is required.");
      return;
    }

    setSaving(true);
    try {
      if (mode === "create") {
        const result = await createStrategy({ name: name.trim(), description, definition });
        showSuccess("Strategy created");
        onSaved?.(result);
        return;
      }

      const definitionChanged = JSON.stringify(definition) !== initialSnapshotJson;
      const payload = { name: name.trim(), description };
      if (definitionChanged) payload.definition = definition;

      const result = await updateStrategy(strategyId, payload);
      showSuccess(definitionChanged ? "New strategy version saved" : "Strategy updated");
      onSaved?.(result);
    } catch (error) {
      const message = error?.data?.message || error?.message || "Failed to save strategy";
      setValidationError(message);
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
        <div>
          <label className="mb-1 block text-sm font-medium">Strategy Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
            placeholder="Momentum Hunter"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Primary Timeframe</label>
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
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm"
          placeholder="Strong momentum setup"
        />
      </div>

      <section className="rounded-xl border border-gray-200 bg-slate-50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">ENTRY CONDITIONS</h3>
        <ExpressionGroupEditor node={entryTree} path={[]} onChange={(updater) => setEntryTree(updater)} primaryTimeframe={timeframe} accent="blue" />
      </section>

      <section className="rounded-xl border border-gray-200 bg-slate-50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">EXIT CONDITIONS</h3>
        <ExpressionGroupEditor node={exitTree} path={[]} onChange={(updater) => setExitTree(updater)} primaryTimeframe={timeframe} accent="amber" />
      </section>

      <section className="rounded-xl border border-gray-200 p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">RISK</h3>
        <RiskConfiguration risk={risk} onChange={setRisk} />
      </section>

      <section className="rounded-xl border border-gray-200 p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">EXECUTION</h3>
        <ExecutionConfiguration execution={execution} onChange={setExecution} riskHasStopLoss={Boolean(risk.stopLoss)} />
      </section>

      {validationError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{validationError}</div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : mode === "create" ? "Create Strategy" : "Save Strategy"}
      </button>
    </div>
  );
}
