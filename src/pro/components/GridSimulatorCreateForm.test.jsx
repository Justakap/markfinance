import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import GridSimulatorCreateForm from "./GridSimulatorCreateForm";
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

describe("GridSimulatorCreateForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiFetch.mockResolvedValue([]);
  });

  test("discloses zero-friction fills and a separate display-only charges estimate, with no PAPER TRADING ONLY warning banner", () => {
    render(<GridSimulatorCreateForm onCreated={jest.fn()} />);
    expect(screen.queryByText(/PAPER TRADING ONLY/)).not.toBeInTheDocument();
    expect(screen.getByText(/zero friction, no synthetic commission or slippage/)).toBeInTheDocument();
    expect(screen.queryByText(/Commission %/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Slippage %/)).not.toBeInTheDocument();
  });

  test("discloses that the reference price is auto-captured, with no manual reference-price input", () => {
    render(<GridSimulatorCreateForm onCreated={jest.fn()} />);
    expect(screen.getByText(/captured automatically from a fresh live market quote/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("e.g. 340")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Reference Price/)).not.toBeInTheDocument();
  });

  test("rejects submission with no instrument selected", async () => {
    render(<GridSimulatorCreateForm onCreated={jest.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. 3"), { target: { value: "3" } });
    fireEvent.click(screen.getByText("Create Grid Session"));
    expect(await screen.findByText("Select an instrument to simulate")).toBeInTheDocument();
    expect(professionalApi.createGridSession).not.toHaveBeenCalled();
  });

  test("Starting Virtual Capital shows Indian comma grouping as the default value and while typing", async () => {
    render(<GridSimulatorCreateForm onCreated={jest.fn()} />);
    const capitalInput = screen.getByDisplayValue("1,00,000"); // default 100000, Indian-grouped

    fireEvent.change(capitalInput, { target: { value: "1500000" } });
    expect(capitalInput.value).toBe("15,00,000");

    fireEvent.change(capitalInput, { target: { value: "15,00,000" + "0" } }); // typing another digit after the formatted value
    expect(capitalInput.value).toBe("1,50,00,000");
  });

  test("submits the numeric startingCapital value, not the comma-formatted display string", async () => {
    professionalApi.createGridSession.mockResolvedValue({ session: { sessionId: "s1" } });
    render(<GridSimulatorCreateForm onCreated={jest.fn()} />);
    await selectInstrument();
    fireEvent.change(screen.getByPlaceholderText("e.g. 3"), { target: { value: "3" } });

    const capitalInput = screen.getByDisplayValue("1,00,000");
    fireEvent.change(capitalInput, { target: { value: "250000" } });
    fireEvent.click(screen.getByText("Create Grid Session"));

    await waitFor(() => expect(professionalApi.createGridSession).toHaveBeenCalledWith(
      expect.objectContaining({ startingCapital: 250000 }),
    ));
  });

  test("rejects a non-positive grid interval", async () => {
    render(<GridSimulatorCreateForm onCreated={jest.fn()} />);
    await selectInstrument();
    fireEvent.change(screen.getByPlaceholderText("e.g. 3"), { target: { value: "-3" } });
    fireEvent.click(screen.getByText("Create Grid Session"));
    expect(await screen.findByText("Grid interval must be a positive number")).toBeInTheDocument();
  });

  test("submits a valid configuration (no reference price) and calls onCreated with the new session id", async () => {
    professionalApi.createGridSession.mockResolvedValue({ session: { sessionId: "s1" } });
    const onCreated = jest.fn();
    render(<GridSimulatorCreateForm onCreated={onCreated} />);

    await selectInstrument();
    fireEvent.change(screen.getByPlaceholderText("e.g. 3"), { target: { value: "3" } });
    fireEvent.click(screen.getByText("Create Grid Session"));

    await waitFor(() => expect(professionalApi.createGridSession).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: "GICRE", gridInterval: 3, startingHoldings: 0, startingAvgCost: 0 }),
    ));
    expect(professionalApi.createGridSession.mock.calls[0][0]).not.toHaveProperty("referencePrice");
    expect(onCreated).toHaveBeenCalledWith("s1");
  });

  test("the average-purchase-price field is disabled until starting holdings are entered", async () => {
    render(<GridSimulatorCreateForm onCreated={jest.fn()} />);
    const avgCostInput = screen.getByPlaceholderText(/no starting holdings/);
    expect(avgCostInput).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "200" } });
    expect(screen.getByPlaceholderText("e.g. 315")).not.toBeDisabled();
  });

  test("rejects submission when starting holdings are provided without an average purchase price", async () => {
    render(<GridSimulatorCreateForm onCreated={jest.fn()} />);
    await selectInstrument();
    fireEvent.change(screen.getByPlaceholderText("e.g. 3"), { target: { value: "3" } });
    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "200" } });
    fireEvent.click(screen.getByText("Create Grid Session"));
    expect(await screen.findByText(/Average purchase price is required/)).toBeInTheDocument();
    expect(professionalApi.createGridSession).not.toHaveBeenCalled();
  });

  test("submits starting holdings and average purchase price together", async () => {
    professionalApi.createGridSession.mockResolvedValue({ session: { sessionId: "s2" } });
    render(<GridSimulatorCreateForm onCreated={jest.fn()} />);
    await selectInstrument();
    fireEvent.change(screen.getByPlaceholderText("e.g. 3"), { target: { value: "3" } });
    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "200" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. 315"), { target: { value: "315" } });
    fireEvent.click(screen.getByText("Create Grid Session"));

    await waitFor(() => expect(professionalApi.createGridSession).toHaveBeenCalledWith(
      expect.objectContaining({ startingHoldings: 200, startingAvgCost: 315 }),
    ));
  });

  test("Upper Limit/Lower Limit inputs are hidden until 'Use price limits' is checked", async () => {
    render(<GridSimulatorCreateForm onCreated={jest.fn()} />);
    expect(screen.queryByText("Upper Limit (₹)")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Use price limits"));
    expect(screen.getByText("Upper Limit (₹)")).toBeInTheDocument();
    expect(screen.getByText("Lower Limit (₹)")).toBeInTheDocument();
  });

  test("rejects submission when price limits are enabled without both bounds", async () => {
    render(<GridSimulatorCreateForm onCreated={jest.fn()} />);
    await selectInstrument();
    fireEvent.change(screen.getByPlaceholderText("e.g. 3"), { target: { value: "3" } });
    fireEvent.click(screen.getByText("Use price limits"));
    fireEvent.change(screen.getByPlaceholderText("e.g. 400"), { target: { value: "400" } });
    fireEvent.click(screen.getByText("Create Grid Session"));
    expect(await screen.findByText(/Both an Upper Limit and a Lower Limit are required/)).toBeInTheDocument();
    expect(professionalApi.createGridSession).not.toHaveBeenCalled();
  });

  test("rejects submission when Upper Limit is not greater than Lower Limit", async () => {
    render(<GridSimulatorCreateForm onCreated={jest.fn()} />);
    await selectInstrument();
    fireEvent.change(screen.getByPlaceholderText("e.g. 3"), { target: { value: "3" } });
    fireEvent.click(screen.getByText("Use price limits"));
    fireEvent.change(screen.getByPlaceholderText("e.g. 400"), { target: { value: "300" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. 300"), { target: { value: "400" } });
    fireEvent.click(screen.getByText("Create Grid Session"));
    expect(await screen.findByText(/Upper Limit must be greater than Lower Limit/)).toBeInTheDocument();
    expect(professionalApi.createGridSession).not.toHaveBeenCalled();
  });

  test("submits usePriceLimits/lowerLimit/upperLimit when enabled, and null when not", async () => {
    professionalApi.createGridSession.mockResolvedValue({ session: { sessionId: "s3" } });
    render(<GridSimulatorCreateForm onCreated={jest.fn()} />);
    await selectInstrument();
    fireEvent.change(screen.getByPlaceholderText("e.g. 3"), { target: { value: "3" } });
    fireEvent.click(screen.getByText("Use price limits"));
    fireEvent.change(screen.getByPlaceholderText("e.g. 400"), { target: { value: "400" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. 300"), { target: { value: "300" } });
    fireEvent.click(screen.getByText("Create Grid Session"));

    await waitFor(() => expect(professionalApi.createGridSession).toHaveBeenCalledWith(
      expect.objectContaining({ usePriceLimits: true, lowerLimit: 300, upperLimit: 400 }),
    ));
  });

  test("surfaces the backend's error message on failure (e.g. no fresh quote available)", async () => {
    professionalApi.createGridSession.mockRejectedValue({ data: { message: "No sufficiently fresh market quote is available for this instrument right now. Try again in a moment." } });
    render(<GridSimulatorCreateForm onCreated={jest.fn()} />);

    await selectInstrument();
    fireEvent.change(screen.getByPlaceholderText("e.g. 3"), { target: { value: "3" } });
    fireEvent.click(screen.getByText("Create Grid Session"));

    expect(await screen.findByText(/No sufficiently fresh market quote/)).toBeInTheDocument();
  });

  test("sellVariance defaults to null (mirrors buy variance) when 'Use a different Sell Variance' is left unchecked", async () => {
    professionalApi.createGridSession.mockResolvedValue({ session: { sessionId: "s3" } });
    render(<GridSimulatorCreateForm onCreated={jest.fn()} />);
    await selectInstrument();
    fireEvent.change(screen.getByPlaceholderText("e.g. 3"), { target: { value: "3" } });
    fireEvent.click(screen.getByText("Create Grid Session"));

    await waitFor(() => expect(professionalApi.createGridSession).toHaveBeenCalledWith(
      expect.objectContaining({ gridInterval: 3, sellVariance: null }),
    ));
  });

  test("checking 'Use a different Sell Variance' requires and submits a positive sellVariance", async () => {
    professionalApi.createGridSession.mockResolvedValue({ session: { sessionId: "s4" } });
    render(<GridSimulatorCreateForm onCreated={jest.fn()} />);
    await selectInstrument();
    fireEvent.change(screen.getByPlaceholderText("e.g. 3"), { target: { value: "3" } });
    fireEvent.click(screen.getByText("Use a different Sell Variance"));

    // No sellVariance entered yet -> rejected client-side.
    fireEvent.click(screen.getByText("Create Grid Session"));
    expect(await screen.findByText(/Sell variance must be a positive number/)).toBeInTheDocument();
    expect(professionalApi.createGridSession).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText("e.g. 5"), { target: { value: "5" } });
    fireEvent.click(screen.getByText("Create Grid Session"));
    await waitFor(() => expect(professionalApi.createGridSession).toHaveBeenCalledWith(
      expect.objectContaining({ gridInterval: 3, sellVariance: 5 }),
    ));
  });

  test("sellQuantityPerLevel defaults to null (mirrors buy qty) when 'Use a different Sell Qty' is left unchecked", async () => {
    professionalApi.createGridSession.mockResolvedValue({ session: { sessionId: "s5" } });
    render(<GridSimulatorCreateForm onCreated={jest.fn()} />);
    await selectInstrument();
    fireEvent.change(screen.getByPlaceholderText("e.g. 3"), { target: { value: "3" } });
    fireEvent.click(screen.getByText("Create Grid Session"));

    await waitFor(() => expect(professionalApi.createGridSession).toHaveBeenCalledWith(
      expect.objectContaining({ quantityPerLevel: 100, sellQuantityPerLevel: null }),
    ));
  });

  test("checking 'Use a different Sell Qty' requires and submits a positive sellQuantityPerLevel", async () => {
    professionalApi.createGridSession.mockResolvedValue({ session: { sessionId: "s6" } });
    render(<GridSimulatorCreateForm onCreated={jest.fn()} />);
    await selectInstrument();
    fireEvent.change(screen.getByPlaceholderText("e.g. 3"), { target: { value: "3" } });
    fireEvent.click(screen.getByText("Use a different Sell Qty"));

    fireEvent.click(screen.getByText("Create Grid Session"));
    expect(await screen.findByText(/Sell quantity must be a positive integer/)).toBeInTheDocument();
    expect(professionalApi.createGridSession).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText("e.g. 50"), { target: { value: "50" } });
    fireEvent.click(screen.getByText("Create Grid Session"));
    await waitFor(() => expect(professionalApi.createGridSession).toHaveBeenCalledWith(
      expect.objectContaining({ quantityPerLevel: 100, sellQuantityPerLevel: 50 }),
    ));
  });
});
