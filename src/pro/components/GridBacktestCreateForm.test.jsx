import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import GridBacktestCreateForm from "./GridBacktestCreateForm";
import * as professionalApi from "../api/professionalApi";
import { apiFetch } from "../../utils/api";

jest.mock("../api/professionalApi");
jest.mock("../../utils/toast", () => ({ showError: jest.fn(), showSuccess: jest.fn() }));
// InstrumentSearchInput hits GET /api/search via apiFetch directly.
jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));

async function selectInstrument() {
  apiFetch.mockResolvedValue([{ symbol: "GICRE", instrumentKey: "NSE_EQ|GICRE", name: "General Insurance Corp" }]);
  fireEvent.change(screen.getByPlaceholderText(/Search symbol/), { target: { value: "GICRE" } });
  await waitFor(() => expect(screen.getByText("GICRE")).toBeInTheDocument(), { timeout: 2000 });
  fireEvent.click(screen.getByText("GICRE"));
}

function fillDates(start = "2026-01-01", end = "2026-02-01") {
  fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: start } });
  fireEvent.change(screen.getByLabelText("End Date"), { target: { value: end } });
}

describe("GridBacktestCreateForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiFetch.mockResolvedValue([]);
  });

  test("discloses PAPER TRADING / HISTORICAL SIMULATION ONLY and zero-friction fills", () => {
    render(<GridBacktestCreateForm onCreated={jest.fn()} />);
    expect(screen.getByText(/PAPER TRADING \/ HISTORICAL SIMULATION ONLY/)).toBeInTheDocument();
    expect(screen.getByText(/never places a real broker order/)).toBeInTheDocument();
    expect(screen.getByText(/zero friction, no synthetic commission or slippage/)).toBeInTheDocument();
    expect(screen.queryByText(/Commission %/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Slippage %/)).not.toBeInTheDocument();
  });

  test("discloses that the initial reference is the first historical candle's close, not the live price", () => {
    render(<GridBacktestCreateForm onCreated={jest.fn()} />);
    expect(screen.getByText(/close of the first available historical candle/)).toBeInTheDocument();
  });

  test("rejects submission with no instrument selected", async () => {
    render(<GridBacktestCreateForm onCreated={jest.fn()} />);
    fillDates();
    fireEvent.change(screen.getByPlaceholderText("e.g. 3"), { target: { value: "3" } });
    fireEvent.click(screen.getByText("Run Backtest"));
    expect(await screen.findByText("Select an instrument to backtest")).toBeInTheDocument();
    expect(professionalApi.createGridBacktest).not.toHaveBeenCalled();
  });

  test("rejects submission with missing dates", async () => {
    render(<GridBacktestCreateForm onCreated={jest.fn()} />);
    await selectInstrument();
    fireEvent.change(screen.getByPlaceholderText("e.g. 3"), { target: { value: "3" } });
    fireEvent.click(screen.getByText("Run Backtest"));
    expect(await screen.findByText("Select both a start and end date")).toBeInTheDocument();
    expect(professionalApi.createGridBacktest).not.toHaveBeenCalled();
  });

  test("rejects a start date on or after the end date", async () => {
    render(<GridBacktestCreateForm onCreated={jest.fn()} />);
    await selectInstrument();
    fillDates("2026-02-01", "2026-01-01");
    fireEvent.change(screen.getByPlaceholderText("e.g. 3"), { target: { value: "3" } });
    fireEvent.click(screen.getByText("Run Backtest"));
    expect(await screen.findByText("Start date must be before the end date")).toBeInTheDocument();
  });

  test("rejects a non-positive grid interval", async () => {
    render(<GridBacktestCreateForm onCreated={jest.fn()} />);
    await selectInstrument();
    fillDates();
    fireEvent.change(screen.getByPlaceholderText("e.g. 3"), { target: { value: "-3" } });
    fireEvent.click(screen.getByText("Run Backtest"));
    expect(await screen.findByText("Grid interval must be a positive number")).toBeInTheDocument();
  });

  test("rejects submission when starting holdings are provided without an average purchase price", async () => {
    render(<GridBacktestCreateForm onCreated={jest.fn()} />);
    await selectInstrument();
    fillDates();
    fireEvent.change(screen.getByPlaceholderText("e.g. 3"), { target: { value: "3" } });
    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "200" } });
    fireEvent.click(screen.getByText("Run Backtest"));
    expect(await screen.findByText(/Average purchase price is required/)).toBeInTheDocument();
    expect(professionalApi.createGridBacktest).not.toHaveBeenCalled();
  });

  test("the average-purchase-price field is disabled until starting holdings are entered", async () => {
    render(<GridBacktestCreateForm onCreated={jest.fn()} />);
    const avgCostInput = screen.getByPlaceholderText(/no starting holdings/);
    expect(avgCostInput).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "200" } });
    expect(screen.getByPlaceholderText("e.g. 315")).not.toBeDisabled();
  });

  test("submits a valid configuration and calls onCreated with the new backtest id", async () => {
    professionalApi.createGridBacktest.mockResolvedValue({ backtest: { backtestId: "b1" } });
    const onCreated = jest.fn();
    render(<GridBacktestCreateForm onCreated={onCreated} />);

    await selectInstrument();
    fillDates();
    fireEvent.change(screen.getByPlaceholderText("e.g. 3"), { target: { value: "3" } });
    fireEvent.click(screen.getByText("Run Backtest"));

    await waitFor(() => expect(professionalApi.createGridBacktest).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: "GICRE",
        requestedStartDate: "2026-01-01",
        requestedEndDate: "2026-02-01",
        gridInterval: 3,
        startingHoldings: 0,
        startingAvgCost: 0,
      }),
    ));
    expect(onCreated).toHaveBeenCalledWith("b1");
  });

  test("submits starting holdings and average purchase price together", async () => {
    professionalApi.createGridBacktest.mockResolvedValue({ backtest: { backtestId: "b2" } });
    render(<GridBacktestCreateForm onCreated={jest.fn()} />);
    await selectInstrument();
    fillDates();
    fireEvent.change(screen.getByPlaceholderText("e.g. 3"), { target: { value: "3" } });
    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "200" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. 315"), { target: { value: "315" } });
    fireEvent.click(screen.getByText("Run Backtest"));

    await waitFor(() => expect(professionalApi.createGridBacktest).toHaveBeenCalledWith(
      expect.objectContaining({ startingHoldings: 200, startingAvgCost: 315 }),
    ));
  });

  test("surfaces the backend's error message on failure", async () => {
    professionalApi.createGridBacktest.mockRejectedValue({ data: { message: "No valid historical candle is available in the requested range." } });
    render(<GridBacktestCreateForm onCreated={jest.fn()} />);

    await selectInstrument();
    fillDates();
    fireEvent.change(screen.getByPlaceholderText("e.g. 3"), { target: { value: "3" } });
    fireEvent.click(screen.getByText("Run Backtest"));

    expect(await screen.findByText(/No valid historical candle is available/)).toBeInTheDocument();
  });
});
