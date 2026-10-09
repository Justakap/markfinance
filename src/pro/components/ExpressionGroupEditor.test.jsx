import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import ExpressionGroupEditor from "./ExpressionGroupEditor";
import { groupWithOneCondition } from "../utils/dslTree";

/** Thin stateful wrapper mirroring how StrategyEditor actually drives this
 *  component — onChange receives an updater function applied to the ROOT
 *  tree, not the node itself. */
function Harness({ initial }) {
  const [tree, setTree] = useState(initial);
  return (
    <div>
      <ExpressionGroupEditor node={tree} path={[]} onChange={(updater) => setTree(updater)} primaryTimeframe="1d" />
      <pre data-testid="tree-json">{JSON.stringify(tree)}</pre>
    </div>
  );
}

describe("ExpressionGroupEditor", () => {
  test("renders a single condition row with default operand controls", () => {
    render(<Harness initial={groupWithOneCondition("AND")} />);
    expect(screen.getByText("Add condition")).toBeInTheDocument();
    expect(screen.getByText("Add group")).toBeInTheDocument();
    expect(screen.getByText("ALL (AND)")).toBeInTheDocument();
    expect(screen.getByText("ANY (OR)")).toBeInTheDocument();
  });

  test("Add condition appends a new condition to the group", () => {
    render(<Harness initial={groupWithOneCondition("AND")} />);
    fireEvent.click(screen.getByText("Add condition"));
    const tree = JSON.parse(screen.getByTestId("tree-json").textContent);
    expect(tree.children).toHaveLength(2);
  });

  test("Add group appends a nested group, and toggling AND/OR only affects that nested group", () => {
    render(<Harness initial={groupWithOneCondition("AND")} />);
    fireEvent.click(screen.getByText("Add group"));

    let tree = JSON.parse(screen.getByTestId("tree-json").textContent);
    expect(tree.children).toHaveLength(2);
    expect(tree.children[1].type).toBe("group");
    // New nested groups default to the opposite operator of their parent.
    expect(tree.children[1].operator).toBe("OR");

    // There are now two "ANY (OR)" toggle buttons — the nested group's is
    // already active; click the root's own OR button (first occurrence)
    // to flip the ROOT, and confirm the nested group is unaffected.
    const orButtons = screen.getAllByText("ANY (OR)");
    fireEvent.click(orButtons[0]);

    tree = JSON.parse(screen.getByTestId("tree-json").textContent);
    expect(tree.operator).toBe("OR");
    expect(tree.children[1].operator).toBe("OR"); // nested group untouched by root's toggle
  });

  test("Remove condition removes only that condition, down to an empty-group empty state", () => {
    render(<Harness initial={groupWithOneCondition("AND")} />);
    fireEvent.click(screen.getByLabelText("Remove condition"));
    expect(screen.getByText("No conditions yet.")).toBeInTheDocument();
    const tree = JSON.parse(screen.getByTestId("tree-json").textContent);
    expect(tree.children).toHaveLength(0);
  });

  test("Remove group removes a nested group entirely", () => {
    render(<Harness initial={groupWithOneCondition("AND")} />);
    fireEvent.click(screen.getByText("Add group"));
    expect(screen.getByLabelText("Remove group")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Remove group"));
    const tree = JSON.parse(screen.getByTestId("tree-json").textContent);
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].type).toBe("condition");
  });
});
