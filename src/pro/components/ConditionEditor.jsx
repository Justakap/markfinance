import { X } from "lucide-react";
import OperandEditor from "./OperandEditor";
import { OPERATORS } from "../constants/dsl";

export default function ConditionEditor({ condition, onUpdate, onRemove, primaryTimeframe }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-2">
      <OperandEditor
        operand={condition.left}
        onChange={(left) => onUpdate({ ...condition, left })}
        primaryTimeframe={primaryTimeframe}
      />

      <select
        value={condition.operator}
        onChange={(e) => onUpdate({ ...condition, operator: e.target.value })}
        className="h-9 min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-2 text-xs font-semibold"
        aria-label="Comparison operator"
      >
        {OPERATORS.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>

      <OperandEditor
        operand={condition.right}
        onChange={(right) => onUpdate({ ...condition, right })}
        primaryTimeframe={primaryTimeframe}
      />

      <button
        type="button"
        onClick={onRemove}
        className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
        title="Remove condition"
        aria-label="Remove condition"
      >
        <X size={15} />
      </button>
    </div>
  );
}
