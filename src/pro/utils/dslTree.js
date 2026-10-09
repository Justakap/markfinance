/**
 * Pure, immutable tree helpers for the professional DSL's GROUP/CONDITION
 * expression tree — the frontend analog of
 * backend/utils/strategyExpression.js's evaluator/validator (frontend
 * validation here is for UX only; the backend remains authoritative, per
 * the milestone's explicit instruction not to duplicate backend business
 * logic).
 *
 * Node shapes (must match the backend exactly — see
 * src/pro/constants/dsl.js's header comment):
 *   GROUP:     { type: "group", operator: "AND"|"OR", children: [...] }
 *   CONDITION: { type: "condition", left: <operand>, operator, right: <operand> }
 *   operand:   { type: "indicator", name, params, timeframe? }
 *            | { type: "price", field }
 *            | { type: "constant", value }
 */
import { defaultParamsForIndicator } from "../constants/dsl";

export function defaultOperand(type = "indicator") {
  if (type === "price") return { type: "price", field: "close" };
  if (type === "constant") return { type: "constant", value: 0 };
  return { type: "indicator", name: "RSI", params: defaultParamsForIndicator("RSI") };
}

export function defaultCondition() {
  return {
    type: "condition",
    left: defaultOperand("indicator"),
    operator: "LT",
    right: defaultOperand("constant"),
  };
}

export function emptyGroup(operator = "AND") {
  return { type: "group", operator, children: [] };
}

export function groupWithOneCondition(operator = "AND") {
  return { type: "group", operator, children: [defaultCondition()] };
}

export function updateAtPath(root, path, updater) {
  if (path.length === 0) return updater(root);
  const [head, ...rest] = path;
  return {
    ...root,
    children: root.children.map((child, i) => (i === head ? updateAtPath(child, rest, updater) : child)),
  };
}

export function removeAtPath(root, path) {
  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  return updateAtPath(root, parentPath, (group) => ({
    ...group,
    children: group.children.filter((_, i) => i !== index),
  }));
}

export function addChildAtPath(root, path, child) {
  return updateAtPath(root, path, (group) => ({ ...group, children: [...group.children, child] }));
}

function isOperandComplete(operand) {
  if (!operand) return false;
  if (operand.type === "indicator") return Boolean(operand.name);
  if (operand.type === "price") return Boolean(operand.field);
  if (operand.type === "constant") return Number.isFinite(Number(operand.value));
  return false;
}

export function isConditionComplete(condition) {
  return (
    condition?.type === "condition" &&
    Boolean(condition.operator) &&
    isOperandComplete(condition.left) &&
    isOperandComplete(condition.right)
  );
}

/** Drops incomplete leaves and now-empty groups; returns null if nothing
 *  usable remains — mirrors the legacy StrategyModal.jsx's pruneTree, but
 *  for the new operand-based condition shape. */
export function pruneTree(node) {
  if (!node) return null;

  if (node.type === "condition") {
    if (!isConditionComplete(node)) return null;
    return {
      type: "condition",
      left: { ...node.left },
      operator: node.operator,
      right: { ...node.right },
    };
  }

  if (node.type === "group") {
    const children = (node.children || []).map(pruneTree).filter(Boolean);
    if (!children.length) return null;
    return { type: "group", operator: node.operator === "OR" ? "OR" : "AND", children };
  }

  return null;
}

/** Recursively collects every indicator name referenced in a tree — used
 *  by the UI to show a quick "uses: RSI, EMA" summary, and to warn before
 *  save if an indicator isn't in the registered set (src/pro/constants/dsl.js). */
export function collectIndicatorNames(node, acc = new Set()) {
  if (!node) return acc;
  if (node.type === "condition") {
    [node.left, node.right].forEach((operand) => {
      if (operand?.type === "indicator" && operand.name) acc.add(operand.name);
    });
    return acc;
  }
  if (node.type === "group") {
    (node.children || []).forEach((child) => collectIndicatorNames(child, acc));
  }
  return acc;
}
