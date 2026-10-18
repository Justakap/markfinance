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

  test("discloses PAPER TRADING ONLY and the incomplete cost model", () => {
    render(<GridSimulatorCreateForm onCreated={jest.fn()} />);
    expect(screen.getByText(/PAPER TRADING ONLY/)).toBeInTheDocument();
    expect(screen.getByText(/never places a real broker order/)).toBeInTheDocument();
    expect(screen.getByText(/does not include STT, exchange transaction charges, GST, SEBI/)).toBeInTheDocument();
  });

  test("rejects submission with no instrument selected", async () => {
    render(<GridSimulatorCreateForm onCreated={jest.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. 340"), { target: { value: "340" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. 3"), { target: { value: "3" } });
    fireEvent.click(screen.getByText("Create Grid Session"));
    expect(await screen.findByText("Select an instrument to simulate")).toBeInTheDocument();
    expect(professionalApi.createGridSession).not.toHaveBeenCalled();
  });

  test("rejects a non-positive grid interval", async () => {
    render(<GridSimulatorCreateForm onCreated={jest.fn()} />);
    await selectInstrument();
    fireEvent.change(screen.getByPlaceholderText("e.g. 340"), { target: { value: "340" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. 3"), { target: { value: "-3" } });
    fireEvent.click(screen.getByText("Create Grid Session"));
    expect(await screen.findByText("Grid interval must be a positive number")).toBeInTheDocument();
  });

  test("submits a valid configuration and calls onCreated with the new session id", async () => {
    professionalApi.createGridSession.mockResolvedValue({ session: { sessionId: "s1" } });
    const onCreated = jest.fn();
    render(<GridSimulatorCreateForm onCreated={onCreated} />);

    await selectInstrument();
    fireEvent.change(screen.getByPlaceholderText("e.g. 340"), { target: { value: "340" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. 3"), { target: { value: "3" } });
    fireEvent.click(screen.getByText("Create Grid Session"));

    await waitFor(() => expect(professionalApi.createGridSession).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: "GICRE", referencePrice: 340, gridInterval: 3 }),
    ));
    expect(onCreated).toHaveBeenCalledWith("s1");
  });

  test("surfaces the backend's error message on failure", async () => {
    professionalApi.createGridSession.mockRejectedValue({ data: { message: "A grid simulator session for this instrument is already running or paused." } });
    render(<GridSimulatorCreateForm onCreated={jest.fn()} />);

    await selectInstrument();
    fireEvent.change(screen.getByPlaceholderText("e.g. 340"), { target: { value: "340" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. 3"), { target: { value: "3" } });
    fireEvent.click(screen.getByText("Create Grid Session"));

    expect(await screen.findByText(/already running or paused/)).toBeInTheDocument();
  });
});
