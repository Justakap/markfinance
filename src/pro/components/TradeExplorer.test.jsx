import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import TradeExplorer from "./TradeExplorer";
import * as professionalApi from "../api/professionalApi";

jest.mock("../api/professionalApi");
jest.mock("../../utils/toast", () => ({ showError: jest.fn() }));

function makeTrade(i) {
  return {
    _id: `t${i}`,
    entryDate: "2024-01-01T00:00:00.000Z",
    exitDate: "2024-01-02T00:00:00.000Z",
    entryPrice: 100,
    exitPrice: 105,
    quantity: 10,
    netPnl: 50,
    returnPct: 5,
    exitReason: "SIGNAL",
  };
}

describe("TradeExplorer", () => {
  beforeEach(() => jest.clearAllMocks());

  test("loading state renders before the first response resolves", () => {
    professionalApi.listBacktestTrades.mockReturnValue(new Promise(() => {}));
    render(<TradeExplorer backtestResultId="bt1" />);
    expect(screen.getByText("Loading trades…")).toBeInTheDocument();
  });

  test("empty state renders when there are zero trades", async () => {
    professionalApi.listBacktestTrades.mockResolvedValue({ trades: [], total: 0, skip: 0, limit: 25 });
    render(<TradeExplorer backtestResultId="bt1" />);
    await waitFor(() => expect(screen.getByText("No trades were generated for this backtest.")).toBeInTheDocument());
  });

  test("error state renders on a failed fetch", async () => {
    professionalApi.listBacktestTrades.mockRejectedValue({ data: { message: "Backtest result not found" } });
    render(<TradeExplorer backtestResultId="bt1" />);
    await waitFor(() => expect(screen.getByText("Backtest result not found")).toBeInTheDocument());
  });

  test("renders real trade fields (entry/exit price, P&L, exit reason)", async () => {
    professionalApi.listBacktestTrades.mockResolvedValue({ trades: [makeTrade(1)], total: 1, skip: 0, limit: 25 });
    render(<TradeExplorer backtestResultId="bt1" />);

    await waitFor(() => expect(screen.getByText("Signal")).toBeInTheDocument());
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("105")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText("5%")).toBeInTheDocument();
  });

  test("pagination beyond one page calls the API with the correct skip/limit, and Next/Previous work", async () => {
    const trades = Array.from({ length: 25 }, (_, i) => makeTrade(i));
    professionalApi.listBacktestTrades.mockResolvedValue({ trades, total: 60, skip: 0, limit: 25 });

    render(<TradeExplorer backtestResultId="bt1" />);
    await waitFor(() => expect(screen.getByText("1-25 of 60")).toBeInTheDocument());

    professionalApi.listBacktestTrades.mockResolvedValue({ trades, total: 60, skip: 25, limit: 25 });
    fireEvent.click(screen.getByText("Next"));

    await waitFor(() =>
      expect(professionalApi.listBacktestTrades).toHaveBeenLastCalledWith("bt1", { skip: 25, limit: 25 }),
    );
  });
});
