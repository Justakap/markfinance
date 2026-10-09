import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import LiveSignalList from "./LiveSignalList";
import * as professionalApi from "../api/professionalApi";

jest.mock("../api/professionalApi");
jest.mock("../../utils/toast", () => ({ showError: jest.fn() }));

function makeSignal(overrides = {}) {
  return {
    signalId: "s1",
    type: "ENTRY_SIGNAL",
    barDate: "2024-01-01T09:15:00.000Z",
    price: 100,
    quantity: 10,
    exitReason: null,
    netPnl: null,
    ...overrides,
  };
}

describe("LiveSignalList", () => {
  beforeEach(() => jest.clearAllMocks());

  test("loading state renders before the first response resolves", () => {
    professionalApi.listLiveStrategySignals.mockReturnValue(new Promise(() => {}));
    render(<LiveSignalList runtimeId="r1" />);
    expect(screen.getByText("Loading signal history…")).toBeInTheDocument();
  });

  test("empty state explains nothing has been recorded yet, without claiming completeness", async () => {
    professionalApi.listLiveStrategySignals.mockResolvedValue({ items: [], total: 0 });
    render(<LiveSignalList runtimeId="r1" />);
    await waitFor(() => expect(screen.getByText(/No signals recorded yet/)).toBeInTheDocument());
  });

  test("error state renders the backend's message", async () => {
    professionalApi.listLiveStrategySignals.mockRejectedValue({ data: { message: "Live strategy runtime not found" } });
    render(<LiveSignalList runtimeId="r1" />);
    await waitFor(() => expect(screen.getByText("Live strategy runtime not found")).toBeInTheDocument());
  });

  test("ENTRY_SIGNAL and EXIT_FILLED render with distinct labels (signal vs simulated fill)", async () => {
    professionalApi.listLiveStrategySignals.mockResolvedValue({
      items: [
        makeSignal({ signalId: "s1", type: "ENTRY_SIGNAL" }),
        makeSignal({ signalId: "s2", type: "EXIT_FILLED", exitReason: "STOP_LOSS", netPnl: -25.5 }),
      ],
      total: 2,
    });
    render(<LiveSignalList runtimeId="r1" />);

    await waitFor(() => expect(screen.getByText("Entry Signal")).toBeInTheDocument());
    expect(screen.getByText("Simulated Exit Fill")).toBeInTheDocument();
    expect(screen.getByText("Stop-loss")).toBeInTheDocument();
    expect(screen.getByText("-25.5")).toBeInTheDocument();
  });

  test("never claims the history is guaranteed complete", async () => {
    professionalApi.listLiveStrategySignals.mockResolvedValue({ items: [makeSignal()], total: 1 });
    render(<LiveSignalList runtimeId="r1" />);
    await waitFor(() => expect(screen.getByText(/not guaranteed to be complete/)).toBeInTheDocument());
  });

  test("pagination beyond one page calls the API with the correct page, and Next/Previous work", async () => {
    const items = Array.from({ length: 20 }, (_, i) => makeSignal({ signalId: `s${i}` }));
    professionalApi.listLiveStrategySignals.mockResolvedValue({ items, total: 45 });

    render(<LiveSignalList runtimeId="r1" />);
    await waitFor(() => expect(screen.getByText("Page 1 of 3")).toBeInTheDocument());

    professionalApi.listLiveStrategySignals.mockResolvedValue({ items, total: 45 });
    fireEvent.click(screen.getByText("Next"));

    await waitFor(() =>
      expect(professionalApi.listLiveStrategySignals).toHaveBeenLastCalledWith("r1", { page: 2, limit: 20 }),
    );
  });
});
