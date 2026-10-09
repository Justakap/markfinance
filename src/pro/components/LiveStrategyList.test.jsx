import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import LiveStrategyList from "./LiveStrategyList";
import * as professionalApi from "../api/professionalApi";

jest.mock("../api/professionalApi");
jest.mock("../../utils/toast", () => ({
  showError: jest.fn(),
  showSuccess: jest.fn(),
  confirmAction: jest.fn(),
}));

const { confirmAction } = require("../../utils/toast");

function runtime(overrides = {}) {
  return {
    runtimeId: "rt1",
    strategyId: "strat1",
    strategyVersionId: "v1",
    instrumentKey: "NSE_EQ|TEST",
    symbol: "TESTSTOCK",
    timeframe: "1d",
    status: "ACTIVE",
    createdAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("LiveStrategyList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    professionalApi.listStrategies.mockResolvedValue({ items: [{ strategyId: "strat1", name: "RSI Mean Reversion" }] });
    professionalApi.getStrategyVersion.mockResolvedValue({ versionNumber: 3 });
  });

  test("loading state renders before the first response resolves", () => {
    professionalApi.listLiveStrategies.mockReturnValue(new Promise(() => {}));
    render(<LiveStrategyList onOpenRuntime={jest.fn()} onActivateClick={jest.fn()} />);
    expect(screen.getByText("Loading live strategies…")).toBeInTheDocument();
  });

  test("empty state renders when there are zero runtimes", async () => {
    professionalApi.listLiveStrategies.mockResolvedValue({ items: [], total: 0 });
    render(<LiveStrategyList onOpenRuntime={jest.fn()} onActivateClick={jest.fn()} />);
    await waitFor(() => expect(screen.getByText("No live strategies yet.")).toBeInTheDocument());
  });

  test("error state renders the backend's message", async () => {
    professionalApi.listLiveStrategies.mockRejectedValue({ data: { message: "Failed to list live strategies" } });
    render(<LiveStrategyList onOpenRuntime={jest.fn()} onActivateClick={jest.fn()} />);
    await waitFor(() => expect(screen.getByText("Failed to list live strategies")).toBeInTheDocument());
  });

  test("renders strategy name (resolved client-side), instrument, timeframe, and status", async () => {
    professionalApi.listLiveStrategies.mockResolvedValue({ items: [runtime()], total: 1 });
    render(<LiveStrategyList onOpenRuntime={jest.fn()} onActivateClick={jest.fn()} />);

    await waitFor(() => expect(screen.getByText("RSI Mean Reversion")).toBeInTheDocument());
    expect(screen.getByText("TESTSTOCK")).toBeInTheDocument();
    expect(screen.getByText("1d")).toBeInTheDocument();
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("v3")).toBeInTheDocument());
  });

  test("clicking a runtime's strategy name calls onOpenRuntime with its id", async () => {
    professionalApi.listLiveStrategies.mockResolvedValue({ items: [runtime()], total: 1 });
    const onOpenRuntime = jest.fn();
    render(<LiveStrategyList onOpenRuntime={onOpenRuntime} onActivateClick={jest.fn()} />);

    await waitFor(() => expect(screen.getByText("RSI Mean Reversion")).toBeInTheDocument());
    fireEvent.click(screen.getByText("RSI Mean Reversion"));
    expect(onOpenRuntime).toHaveBeenCalledWith("rt1");
  });

  test("the Activate button calls onActivateClick", async () => {
    professionalApi.listLiveStrategies.mockResolvedValue({ items: [], total: 0 });
    const onActivateClick = jest.fn();
    render(<LiveStrategyList onOpenRuntime={jest.fn()} onActivateClick={onActivateClick} />);
    await waitFor(() => expect(screen.getByText("No live strategies yet.")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Activate a strategy"));
    expect(onActivateClick).toHaveBeenCalled();
  });

  test("status filter re-fetches with the selected status", async () => {
    professionalApi.listLiveStrategies.mockResolvedValue({ items: [runtime()], total: 1 });
    render(<LiveStrategyList onOpenRuntime={jest.fn()} onActivateClick={jest.fn()} />);
    await waitFor(() => expect(screen.getByText("RSI Mean Reversion")).toBeInTheDocument());

    fireEvent.click(screen.getByText("active"));
    await waitFor(() =>
      expect(professionalApi.listLiveStrategies).toHaveBeenLastCalledWith({ page: 1, limit: 20, status: "ACTIVE" }),
    );
  });

  test("deactivating requires confirmation, and only calls the API when confirmed", async () => {
    professionalApi.listLiveStrategies.mockResolvedValue({ items: [runtime()], total: 1 });
    professionalApi.deactivateLiveStrategy.mockResolvedValue({ runtime: runtime({ status: "INACTIVE" }) });
    confirmAction.mockResolvedValue(false);

    render(<LiveStrategyList onOpenRuntime={jest.fn()} onActivateClick={jest.fn()} />);
    await waitFor(() => expect(screen.getByText("Deactivate")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Deactivate"));
    await waitFor(() => expect(confirmAction).toHaveBeenCalled());
    expect(professionalApi.deactivateLiveStrategy).not.toHaveBeenCalled();

    confirmAction.mockResolvedValue(true);
    fireEvent.click(screen.getByText("Deactivate"));
    await waitFor(() => expect(professionalApi.deactivateLiveStrategy).toHaveBeenCalledWith("rt1"));
  });

  test("an INACTIVE runtime has no Deactivate button", async () => {
    professionalApi.listLiveStrategies.mockResolvedValue({ items: [runtime({ status: "INACTIVE" })], total: 1 });
    render(<LiveStrategyList onOpenRuntime={jest.fn()} onActivateClick={jest.fn()} />);
    await waitFor(() => expect(screen.getByText("RSI Mean Reversion")).toBeInTheDocument());
    expect(screen.queryByText("Deactivate")).not.toBeInTheDocument();
  });

  test("pagination beyond one page calls the API with the correct page", async () => {
    const items = Array.from({ length: 20 }, (_, i) => runtime({ runtimeId: `rt${i}` }));
    professionalApi.listLiveStrategies.mockResolvedValue({ items, total: 45 });

    render(<LiveStrategyList onOpenRuntime={jest.fn()} onActivateClick={jest.fn()} />);
    await waitFor(() => expect(screen.getByText("Page 1 of 3")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Next"));
    await waitFor(() =>
      expect(professionalApi.listLiveStrategies).toHaveBeenLastCalledWith({ page: 2, limit: 20, status: undefined }),
    );
  });
});
