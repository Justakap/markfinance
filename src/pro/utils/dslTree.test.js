import "@testing-library/jest-dom";
import {
  defaultOperand,
  defaultCondition,
  emptyGroup,
  groupWithOneCondition,
  updateAtPath,
  removeAtPath,
  addChildAtPath,
  isConditionComplete,
  pruneTree,
  collectIndicatorNames,
} from "./dslTree";

function cond(left, operator, right) {
  return { type: "condition", left, operator, right };
}

describe("dslTree", () => {
  test("defaultOperand produces a valid operand for each type", () => {
    expect(defaultOperand("indicator")).toEqual({ type: "indicator", name: "RSI", params: { period: 14 } });
    expect(defaultOperand("price")).toEqual({ type: "price", field: "close" });
    expect(defaultOperand("constant")).toEqual({ type: "constant", value: 0 });
  });

  test("add/remove/update a single condition at the root (path [])", () => {
    let tree = groupWithOneCondition("AND");
    tree = addChildAtPath(tree, [], defaultCondition());
    expect(tree.children).toHaveLength(2);

    tree = updateAtPath(tree, [1], () => cond(defaultOperand("price"), "GT", { type: "constant", value: 50 }));
    expect(tree.children[1].right.value).toBe(50);

    tree = removeAtPath(tree, [0]);
    expect(tree.children).toHaveLength(1);
  });

  test("add/remove a nested group (mixed AND/OR editing)", () => {
    let tree = groupWithOneCondition("AND");
    tree = addChildAtPath(tree, [], groupWithOneCondition("OR"));
    expect(tree.children).toHaveLength(2);
    expect(tree.children[1].type).toBe("group");
    expect(tree.children[1].operator).toBe("OR");

    // Add a condition inside the nested OR group (path [1]).
    tree = addChildAtPath(tree, [1], defaultCondition());
    expect(tree.children[1].children).toHaveLength(2);

    // Toggling the nested group's operator doesn't affect the root.
    tree = updateAtPath(tree, [1], (g) => ({ ...g, operator: "AND" }));
    expect(tree.operator).toBe("AND");
    expect(tree.children[1].operator).toBe("AND");

    // Remove the nested group entirely.
    tree = removeAtPath(tree, [1]);
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].type).toBe("condition");
  });

  test("three-level nesting: AND( cond, OR( cond, AND( cond, cond ) ) )", () => {
    let tree = groupWithOneCondition("AND");
    tree = addChildAtPath(tree, [], emptyGroup("OR"));
    tree = addChildAtPath(tree, [1], defaultCondition());
    tree = addChildAtPath(tree, [1], emptyGroup("AND"));
    tree = addChildAtPath(tree, [1, 1], defaultCondition());
    tree = addChildAtPath(tree, [1, 1], defaultCondition());

    expect(tree.children[1].children[1].type).toBe("group");
    expect(tree.children[1].children[1].children).toHaveLength(2);
  });

  test("isConditionComplete rejects a condition with an incomplete operand", () => {
    expect(isConditionComplete(defaultCondition())).toBe(true);
    expect(isConditionComplete(cond({ type: "indicator" }, "LT", { type: "constant", value: 1 }))).toBe(false);
    expect(isConditionComplete(cond({ type: "price" }, "LT", { type: "constant", value: 1 }))).toBe(false);
    expect(isConditionComplete(cond({ type: "constant" }, "LT", { type: "constant", value: 1 }))).toBe(false);
  });

  test("pruneTree drops incomplete conditions and now-empty groups, returns null if nothing remains", () => {
    const incompleteOnly = { type: "group", operator: "AND", children: [{ type: "condition", left: { type: "price" }, operator: "GT", right: { type: "constant", value: 1 } }] };
    expect(pruneTree(incompleteOnly)).toBeNull();

    const mixed = {
      type: "group",
      operator: "AND",
      children: [defaultCondition(), { type: "condition", left: { type: "price" }, operator: "GT", right: { type: "constant", value: 1 } }],
    };
    const pruned = pruneTree(mixed);
    expect(pruned.children).toHaveLength(1);
  });

  test("pruneTree round-trips a valid nested tree without losing structure (UI -> DSL -> UI equivalence)", () => {
    let tree = groupWithOneCondition("AND");
    tree = addChildAtPath(tree, [], groupWithOneCondition("OR"));
    const pruned = pruneTree(tree);

    expect(pruned.operator).toBe("AND");
    expect(pruned.children).toHaveLength(2);
    expect(pruned.children[1].operator).toBe("OR");
    expect(pruned.children[1].children).toHaveLength(1);
    // Round-tripping again (DSL -> UI -> DSL) produces an identical structure.
    expect(pruneTree(pruned)).toEqual(pruned);
  });

  test("collectIndicatorNames finds indicators recursively on both sides of comparisons", () => {
    const tree = {
      type: "group",
      operator: "AND",
      children: [
        cond({ type: "indicator", name: "RSI", params: { period: 14 } }, "LT", { type: "constant", value: 30 }),
        {
          type: "group",
          operator: "OR",
          children: [cond({ type: "indicator", name: "EMA", params: { period: 20 } }, "GT", { type: "indicator", name: "EMA", params: { period: 50 } })],
        },
      ],
    };
    const names = collectIndicatorNames(tree);
    expect([...names].sort()).toEqual(["EMA", "RSI"]);
  });
});
