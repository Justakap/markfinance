import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import GridBacktestDetail from "./GridBacktestDetail";
import * as professionalApi from "../api/professionalApi";

jest.mock("../api/professionalApi");

function completedBacktest(overrides = {}) {
  return {
    backtestId: "b1",
    instrumentKey: "NSE_EQ|GICRE",
    symbol: "GICRE",
    status: "COMPLETED",
    error: null,
    config: {
      timeframe: "1d",
      requestedStartDate: "2026-01-01",
      requestedEndDate: "2026-02-01",
      gridInterval: 3,
      quantityPerLevel: 100,
      startingCapital: 100000,
    },
    initialReference: { price: 320, timestamp: "2026-01-02T09:15:00.000Z" },
    dataQuality: {
      usedTimeframe: "1d",
      actualStartDate: "2026-01-02",
      actualEndDate: "2026-02-01",
      candleCount: 21,
      incomplete: false,
      retentionClamped: false,
      usedFinerGrainedCandles: false,
      intrabarAssumption: "open-low-high-close",
      costModelNote: "Does not include STT, exchange transaction charges, GST, SEBI turnover fees, or stamp duty.",
    },
    metrics: {
      endingEquity: 101200,
      netPnL: 1200,
      returnPct: 1.2,
      realizedPnL: 600,
      unrealizedPnL: 600,
      buyCount: 3,
      sellCount: 2,
      partialCount: 0,
      skippedCount: 0,
      totalCosts: 45.5,
      maxDrawdownPct: 2.1,
      maxCapitalDeployed: 31700,
    },
    equitySeries: [
      { timestamp: "2026-01-02T00:00:00.000Z", close: 320, equity: 100000 },
      { timestamp: "2026-01-05T00:00:00.000Z", close: 323, equity: 100600 },
      { timestamp: "2026-02-01T00:00:00.000Z", close: 326, equity: 101200 },
    ],
    createdAt: "2026-02-02T00:00:00.000Z",
    completedAt: "2026-02-02T00:00:05.000Z",
    ...overrides,
  };
}

describe("GridBacktestDetail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    professionalApi.listGridBacktestTrades.mockResolvedValue({ items: [], total: 0 });
  });

  test("loading state renders before the first response resolves", () => {
    professionalApi.getGridBacktest.mockReturnValue(new Promise(() => {}));
    render(<GridBacktestDetail backtestId="b1" onBack={jest.fn()} />);
    expect(screen.getByText(/Loading grid backtest/)).toBeInTheDocument();
  });

  test("error state renders the backend's message", async () => {
    professionalApi.getGridBacktest.mockRejectedValue({ data: { message: "Grid backtest not found" } });
    render(<GridBacktestDetail backtestId="b1" onBack={jest.fn()} />);
    await waitFor(() => expect(screen.getByText("Grid backtest not found")).toBeInTheDocument());
  });

  test("a FAILED backtest shows the error message, not metrics", async () => {
    professionalApi.getGridBacktest.mockResolvedValue(
      completedBacktest({ status: "FAILED", error: "No valid historical candle is available in the requested range.", metrics: null }),
    );
    render(<GridBacktestDetail backtestId="b1" onBack={jest.fn()} />);
    await waitFor(() => expect(screen.getByText(/No valid historical candle is available/)).toBeInTheDocument());
    expect(screen.queryByText("Ending Equity")).not.toBeInTheDocument();
  });

  test("a RUNNING backtest shows a running message, not metrics", async () => {
    professionalApi.getGridBacktest.mockResolvedValue(completedBacktest({ status: "RUNNING", metrics: null }));
    render(<GridBacktestDetail backtestId="b1" onBack={jest.fn()} />);
    await waitFor(() => expect(screen.getByText(/still running/)).toBeInTheDocument());
    expect(screen.queryByText("Ending Equity")).not.toBeInTheDocument();
  });

  test("renders PAPER TRADING disclosure, initial reference, and key metrics for a COMPLETED backtest", async () => {
    professionalApi.getGridBacktest.mockResolvedValue(completedBacktest());
    render(<GridBacktestDetail backtestId="b1" onBack={jest.fn()} />);

    await waitFor(() => expect(screen.getByText("GICRE")).toBeInTheDocument());
    expect(screen.getByText(/PAPER TRADING \/ HISTORICAL SIMULATION ONLY/)).toBeInTheDocument();
    expect(screen.getByText(/Initial reference: ₹320\.00/)).toBeInTheDocument();
    expect(screen.getByText("Ending Equity")).toBeInTheDocument();
    expect(screen.getByText("₹101200.00")).toBeInTheDocument();
  });

  test("discloses the conservative intrabar assumption when no finer-grained candles were used", async () => {
    professionalApi.getGridBacktest.mockResolvedValue(completedBacktest());
    render(<GridBacktestDetail backtestId="b1" onBack={jest.fn()} />);
    await waitFor(() => expect(screen.getByText(/Intrabar assumption/)).toBeInTheDocument());
    expect(screen.getByText(/open-low-high-close/)).toBeInTheDocument();
  });

  test("does not show the intrabar-assumption disclosure when finer-grained candles were used", async () => {
    professionalApi.getGridBacktest.mockResolvedValue(
      completedBacktest({ dataQuality: { ...completedBacktest().dataQuality, usedFinerGrainedCandles: true } }),
    );
    render(<GridBacktestDetail backtestId="b1" onBack={jest.fn()} />);
    await waitFor(() => expect(screen.getByText(/finer-grained candle series was available/)).toBeInTheDocument());
    expect(screen.queryByText(/Intrabar assumption:/)).not.toBeInTheDocument();
  });

  test("discloses incomplete data and retention clamping when flagged", async () => {
    professionalApi.getGridBacktest.mockResolvedValue(
      completedBacktest({ dataQuality: { ...completedBacktest().dataQuality, incomplete: true, retentionClamped: true, retentionFrom: "2025-06-01" } }),
    );
    render(<GridBacktestDetail backtestId="b1" onBack={jest.fn()} />);
    await waitFor(() => expect(screen.getByText(/historical data for this range was incomplete/)).toBeInTheDocument());
    expect(screen.getByText(/clamped to 2025-06-01/)).toBeInTheDocument();
  });

  test("empty trade ledger shows an explanatory message, not a blank table", async () => {
    professionalApi.getGridBacktest.mockResolvedValue(completedBacktest());
    render(<GridBacktestDetail backtestId="b1" onBack={jest.fn()} />);
    await waitFor(() => expect(screen.getByText(/No simulated fills in this backtest/)).toBeInTheDocument());
  });

  test("renders trade ledger rows with an ASSUMED badge for assumed-intrabar fills", async () => {
    professionalApi.listGridBacktestTrades.mockResolvedValue({
      items: [
        {
          tradeId: "t1",
          sequence: 1,
          type: "BUY",
          level: -1,
          levelPrice: 317,
          fillPrice: 316,
          qtyRequested: 100,
          qtyFilled: 100,
          qtySkipped: 0,
          cashAfter: 68400,
          holdingsAfter: 100,
          assumedIntrabar: true,
          candleTimestamp: "2026-01-05T00:00:00.000Z",
          eventTimestamp: "2026-01-05T00:00:00.002Z",
        },
      ],
      total: 1,
    });
    professionalApi.getGridBacktest.mockResolvedValue(completedBacktest());
    render(<GridBacktestDetail backtestId="b1" onBack={jest.fn()} />);
    await waitFor(() => expect(screen.getByText("BUY")).toBeInTheDocument());
    expect(screen.getByText("ASSUMED")).toBeInTheDocument();
  });

  test("clicking back calls onBack", async () => {
    professionalApi.getGridBacktest.mockResolvedValue(completedBacktest());
    const onBack = jest.fn();
    render(<GridBacktestDetail backtestId="b1" onBack={onBack} />);
    await waitFor(() => screen.getByText(/Back to backtests/));
    fireEvent.click(screen.getByText(/Back to backtests/));
    expect(onBack).toHaveBeenCalled();
  });
});
