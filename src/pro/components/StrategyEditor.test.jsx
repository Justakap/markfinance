import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StrategyEditor from "./StrategyEditor";
import * as professionalApi from "../api/professionalApi";

jest.mock("../api/professionalApi");
jest.mock("../../utils/toast", () => ({ showError: jest.fn(), showSuccess: jest.fn() }));

const SAMPLE_DEFINITION = {
  version: 2,
  universe: { timeframe: "1d" },
  entry: {
    type: "condition",
    left: { type: "indicator", name: "RSI", params: { period: 14 } },
    operator: "LT",
    right: { type: "constant", value: 30 },
  },
  execution: { side: "LONG", positionSizing: { type: "percentOfEquity", value: 100 } },
};

describe("StrategyEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("create mode: Save calls createStrategy with a well-formed version:2 definition", async () => {
    professionalApi.createStrategy.mockResolvedValue({
      strategy: { strategyId: "s1" },
      currentVersion: { versionId: "v1", versionNumber: 1 },
    });
    const onSaved = jest.fn();

    render(<StrategyEditor mode="create" onSaved={onSaved} />);

    fireEvent.change(screen.getByPlaceholderText("Momentum Hunter"), { target: { value: "My Strategy" } });
    fireEvent.click(screen.getByText("Create Strategy"));

    await waitFor(() => expect(professionalApi.createStrategy).toHaveBeenCalled());

    const call = professionalApi.createStrategy.mock.calls[0][0];
    expect(call.name).toBe("My Strategy");
    expect(call.definition.version).toBe(2);
    expect(call.definition.universe.timeframe).toBe("1d");
    // The editor always keeps a group-shaped root internally (a one-child
    // group is semantically identical to a bare condition and the
    // backend accepts both) — see StrategyEditor.jsx's toEditableTree.
    expect(call.definition.entry.type).toBe("group");
    expect(call.definition.entry.children[0].type).toBe("condition");
    expect(onSaved).toHaveBeenCalled();
  });

  test("create mode: an empty name is rejected client-side without calling the API", () => {
    render(<StrategyEditor mode="create" onSaved={() => {}} />);
    fireEvent.click(screen.getByText("Create Strategy"));

    expect(screen.getByText("Strategy name is required.")).toBeInTheDocument();
    expect(professionalApi.createStrategy).not.toHaveBeenCalled();
  });

  test("edit mode: changing only the name is a metadata-only update (no `definition` sent)", async () => {
    professionalApi.updateStrategy.mockResolvedValue({ strategy: { strategyId: "s1" }, newVersion: null });

    render(
      <StrategyEditor
        mode="edit"
        strategyId="s1"
        initialName="Old Name"
        initialDefinition={SAMPLE_DEFINITION}
        onSaved={() => {}}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("Old Name"), { target: { value: "New Name" } });
    fireEvent.click(screen.getByText("Save Strategy"));

    await waitFor(() => expect(professionalApi.updateStrategy).toHaveBeenCalled());

    const [, payload] = professionalApi.updateStrategy.mock.calls[0];
    expect(payload.name).toBe("New Name");
    expect(payload.definition).toBeUndefined();
  });

  test("edit mode: changing the entry condition creates a new version (`definition` is sent)", async () => {
    professionalApi.updateStrategy.mockResolvedValue({
      strategy: { strategyId: "s1" },
      newVersion: { versionId: "v2", versionNumber: 2 },
    });

    render(
      <StrategyEditor
        mode="edit"
        strategyId="s1"
        initialName="Strategy"
        initialDefinition={SAMPLE_DEFINITION}
        onSaved={() => {}}
      />,
    );

    // Change the entry condition's constant value (30 -> 45). The entry
    // section renders before the exit section, so its "Constant value"
    // input is the first match; the exit section's own default condition
    // also has a (different) constant input, hence getAllByLabelText.
    fireEvent.change(screen.getAllByLabelText("Constant value")[0], { target: { value: "45" } });
    fireEvent.click(screen.getByText("Save Strategy"));

    await waitFor(() => expect(professionalApi.updateStrategy).toHaveBeenCalled());

    const [, payload] = professionalApi.updateStrategy.mock.calls[0];
    expect(payload.definition).toBeDefined();
    expect(payload.definition.entry.children[0].right.value).toBe(45);
  });

  test("a server-side validation failure is surfaced to the user", async () => {
    professionalApi.createStrategy.mockRejectedValue({ data: { message: "Invalid condition operator: ???" } });

    render(<StrategyEditor mode="create" onSaved={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("Momentum Hunter"), { target: { value: "Bad Strategy" } });
    fireEvent.click(screen.getByText("Create Strategy"));

    await waitFor(() => expect(screen.getByText("Invalid condition operator: ???")).toBeInTheDocument());
  });
});
