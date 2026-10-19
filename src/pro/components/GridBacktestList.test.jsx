import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import GridBacktestList from "./GridBacktestList";
import * as professionalApi from "../api/professionalApi";

jest.mock("../api/professionalApi");
jest.mock("../../utils/toast", () => ({
  showError: jest.fn(),
  showSuccess: jest.fn(),
  confirmAction: jest.fn(),
}));

function backtest(overrides = {}) {
  return {
    backtestId: "b1",
    instrumentKey: "NSE_EQ|GICRE",
    symbol: "GICRE",
    status: "COMPLETED",
    config: { timeframe: "1d", requestedStartDate: "2026-01-01", requestedEndDate: "2026-02-01" },
    metrics: { netPnL: 1200.5, returnPct: 1.2 },
    createdAt: "2026-02-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("GridBacktestList", () => {
  beforeEach(() => jest.clearAllMocks());

  test("loading state renders before the first response resolves", () => {
    professionalApi.listGridBacktests.mockReturnValue(new Promise(() => {}));
    render(<GridBacktestList onOpenBacktest={jest.fn()} onCreateClick={jest.fn()} />);
    expect(screen.getByText("Loading backtests…")).toBeInTheDocument();
  });

  test("empty state renders when there are zero backtests", async () => {
    professionalApi.listGridBacktests.mockResolvedValue({ items: [], total: 0 });
    render(<GridBacktestList onOpenBacktest={jest.fn()} onCreateClick={jest.fn()} />);
    await waitFor(() => expect(screen.getByText(/No grid backtests yet/)).toBeInTheDocument());
  });

  test("error state renders the backend's message", async () => {
    professionalApi.listGridBacktests.mockRejectedValue({ data: { message: "Failed to load grid backtests" } });
    render(<GridBacktestList onOpenBacktest={jest.fn()} onCreateClick={jest.fn()} />);
    await waitFor(() => expect(screen.getByText("Failed to load grid backtests")).toBeInTheDocument());
  });

  test("renders a PAPER TRADING disclosure and the backtest row", async () => {
    professionalApi.listGridBacktests.mockResolvedValue({ items: [backtest()], total: 1 });
    render(<GridBacktestList onOpenBacktest={jest.fn()} onCreateClick={jest.fn()} />);

    expect(screen.getByText(/PAPER TRADING \/ HISTORICAL SIMULATION ONLY/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("GICRE")).toBeInTheDocument());
    expect(screen.getByText("COMPLETED")).toBeInTheDocument();
  });

  test("clicking a backtest row calls onOpenBacktest with its id", async () => {
    professionalApi.listGridBacktests.mockResolvedValue({ items: [backtest()], total: 1 });
    const onOpenBacktest = jest.fn();
    render(<GridBacktestList onOpenBacktest={onOpenBacktest} onCreateClick={jest.fn()} />);

    await waitFor(() => screen.getByText("GICRE"));
    fireEvent.click(screen.getByText("GICRE"));
    expect(onOpenBacktest).toHaveBeenCalledWith("b1");
  });

  test("clicking '+ New Backtest' calls onCreateClick", async () => {
    professionalApi.listGridBacktests.mockResolvedValue({ items: [], total: 0 });
    const onCreateClick = jest.fn();
    render(<GridBacktestList onOpenBacktest={jest.fn()} onCreateClick={onCreateClick} />);
    fireEvent.click(screen.getByText("+ New Backtest"));
    expect(onCreateClick).toHaveBeenCalled();
  });
});
