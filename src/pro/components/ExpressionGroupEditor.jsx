import { Plus, FolderPlus, Trash2 } from "lucide-react";
import ConditionEditor from "./ConditionEditor";
import { defaultCondition, groupWithOneCondition, updateAtPath, removeAtPath, addChildAtPath } from "../utils/dslTree";

/**
 * Recursive AND/OR group editor for the professional DSL — supports
 * arbitrary nesting depth (the backend's own limit is 8, enforced
 * server-side; this component doesn't need its own hard cap, since the
 * backend validator is authoritative and will reject anything excessive
 * at save time with a clear message).
 *
 * `path` is this group's location within the root tree (array of child
 * indices); `onChange(updater)` applies an immutable update to the ROOT
 * tree, so every nesting level shares one source of truth.
 */
export default function ExpressionGroupEditor({ node, path, onChange, depth = 0, onRemoveSelf, primaryTimeframe, accent = "blue" }) {
  const setOperator = (operator) => onChange((root) => updateAtPath(root, path, (g) => ({ ...g, operator })));
  const updateChild = (index, updatedNode) => onChange((root) => updateAtPath(root, [...path, index], () => updatedNode));
  const removeChild = (index) => onChange((root) => removeAtPath(root, [...path, index]));
  const addCondition = () => onChange((root) => addChildAtPath(root, path, defaultCondition()));
  const addGroup = () => onChange((root) => addChildAtPath(root, path, groupWithOneCondition(node.operator === "AND" ? "OR" : "AND")));

  const activeClass = accent === "amber" ? "bg-amber-600 text-white" : "bg-blue-600 text-white";

  return (
    <div className={depth > 0 ? "rounded-lg border border-gray-300 bg-gray-50 p-3" : ""}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setOperator("AND")}
              className={`px-2.5 py-1 ${node.operator !== "OR" ? activeClass : "bg-white text-gray-500"}`}
            >
              ALL (AND)
            </button>
            <button
              type="button"
              onClick={() => setOperator("OR")}
              className={`px-2.5 py-1 ${node.operator === "OR" ? activeClass : "bg-white text-gray-500"}`}
            >
              ANY (OR)
            </button>
          </div>
          <span className="text-xs text-gray-500">must be true</span>
        </div>

        {depth > 0 && onRemoveSelf && (
          <button
            type="button"
            onClick={onRemoveSelf}
            className="text-red-500 hover:text-red-600"
            title="Remove group"
            aria-label="Remove group"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {(!node.children || node.children.length === 0) && (
        <p className="mb-3 text-xs italic text-gray-400">No conditions yet.</p>
      )}

      <div className="space-y-2">
        {(node.children || []).map((child, index) =>
          child.type === "group" ? (
            <ExpressionGroupEditor
              key={index}
              node={child}
              path={[...path, index]}
              onChange={onChange}
              depth={depth + 1}
              onRemoveSelf={() => removeChild(index)}
              primaryTimeframe={primaryTimeframe}
              accent={accent}
            />
          ) : (
            <ConditionEditor
              key={index}
              condition={child}
              onUpdate={(updated) => updateChild(index, updated)}
              onRemove={() => removeChild(index)}
              primaryTimeframe={primaryTimeframe}
            />
          ),
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addCondition}
          className="flex items-center gap-1.5 rounded-lg border-2 border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:border-blue-500 hover:text-blue-600"
        >
          <Plus size={13} />
          Add condition
        </button>
        <button
          type="button"
          onClick={addGroup}
          className="flex items-center gap-1.5 rounded-lg border-2 border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:border-blue-500 hover:text-blue-600"
        >
          <FolderPlus size={13} />
          Add group
        </button>
      </div>
    </div>
  );
}
