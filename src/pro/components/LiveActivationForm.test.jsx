import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import LiveActivationForm from "./LiveActivationForm";
import * as professionalApi from "../api/professionalApi";
import { apiFetch } from "../../utils/api";

jest.mock("../api/professionalApi");
jest.mock("../../utils/toast", () => ({ showError: jest.fn(), showSuccess: jest.fn() }));
// InstrumentSearchInput hits GET /api/search via apiFetch directly (not
// professionalApi) — mocked here so the suite drives real instrument
// selection through the actual UI rather than skipping that flow.
jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));

function strategy(overrides = {}) {
  return { strategyId: "strat1", name: "RSI Mean Reversion", status: "ACTIVE", currentVersionId: "v1", ...overrides };
}

async function selectStrategyAndVersion() {
  await waitFor(() => expect(screen.getByText("RSI Mean Reversion")).toBeInTheDocument());
  fireEvent.change(screen.getByDisplayValue("Select a strategy"), { target: { value: "strat1" } });
  await waitFor(() => expect(screen.getByText(/authored for the/)).toBeInTheDocument());
}

async function selectInstrument() {
  apiFetch.mockResolvedValue([{ symbol: "RELIANCE", instrumentKey: "NSE_EQ|RELIANCE", name: "Reliance Industries" }]);
  fireEvent.change(screen.getByPlaceholderText(/Search symbol/), { target: { value: "RELIANCE" } });
  await waitFor(() => expect(screen.getByText("RELIANCE")).toBeInTheDocument(), { timeout: 2000 });
  fireEvent.click(screen.getByText("RELIANCE"));
}

describe("LiveActivationForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiFetch.mockResolvedValue([]);
    professionalApi.listStrategies.mockResolvedValue({ items: [strategy()] });
    professionalApi.listStrategyVersions.mockResolvedValue({ items: [{ versionId: "v1", versionNumber: 1, createdAt: "2024-01-01T00:00:00.000Z" }] });
    professionalApi.getStrategyVersion.mockResolvedValue({ definition: { universe: { timeframe: "1d" } } });
  });

  test("explicitly discloses polling-based evaluation and no real broker orders", async () => {
    render(<LiveActivationForm onActivated={jest.fn()} />);
    expect(screen.getByText(/polling-based candle workflow/)).toBeInTheDocument();
    expect(screen.getByText(/never places a real broker order/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("RSI Mean Reversion")).toBeInTheDocument());
  });

  test("ARCHIVED strategies are never offered in the picker", async () => {
    professionalApi.listStrategies.mockResolvedValue({
      items: [strategy({ strategyId: "a", name: "Active One", status: "ACTIVE" }), strategy({ strategyId: "b", name: "Archived One", status: "ARCHIVED" })],
    });
    render(<LiveActivationForm onActivated={jest.fn()} />);
    await waitFor(() => expect(screen.getByText("Active One")).toBeInTheDocument());
    expect(screen.queryByText("Archived One")).not.toBeInTheDocument();
  });

  test("selecting a strategy loads its versions and defaults to the current version, showing its locked timeframe", async () => {
    render(<LiveActivationForm onActivated={jest.fn()} />);
    await selectStrategyAndVersion();
    expect(screen.getByText("1d")).toBeInTheDocument();
  });

  test("submitting without an instrument is rejected client-side before any API call", async () => {
    render(<LiveActivationForm onActivated={jest.fn()} />);
    await selectStrategyAndVersion();

    fireEvent.click(screen.getByText("Activate Live Strategy"));

    expect(screen.getByText("Choose an instrument first.")).toBeInTheDocument();
    expect(professionalApi.activateLiveStrategy).not.toHaveBeenCalled();
  });

  test("a successful activation submits the version-locked timeframe and calls onActivated with the returned runtime", async () => {
    professionalApi.activateLiveStrategy.mockResolvedValue({ runtime: { runtimeId: "rt1" } });
    const onActivated = jest.fn();

    render(<LiveActivationForm onActivated={onActivated} />);
    await selectStrategyAndVersion();
    await selectInstrument();

    fireEvent.click(screen.getByText("Activate Live Strategy"));

    await waitFor(() =>
      expect(professionalApi.activateLiveStrategy).toHaveBeenCalledWith(
        expect.objectContaining({
          strategyId: "strat1",
          versionId: "v1",
          symbol: "RELIANCE",
          instrumentKey: "NSE_EQ|RELIANCE",
          timeframe: "1d",
        }),
      ),
    );
    await waitFor(() => expect(onActivated).toHaveBeenCalledWith({ runtimeId: "rt1" }));
  });

  test("a duplicate-activation 409 conflict surfaces the backend's own message verbatim", async () => {
    professionalApi.activateLiveStrategy.mockRejectedValue({
      data: { message: "This strategy is already active for this instrument and timeframe. Deactivate it first." },
    });

    render(<LiveActivationForm onActivated={jest.fn()} />);
    await selectStrategyAndVersion();
    await selectInstrument();

    fireEvent.click(screen.getByText("Activate Live Strategy"));

    await waitFor(() =>
      expect(screen.getByText("This strategy is already active for this instrument and timeframe. Deactivate it first.")).toBeInTheDocument(),
    );
  });

  test("a generic server error (500) is surfaced without crashing the form", async () => {
    professionalApi.activateLiveStrategy.mockRejectedValue(new Error("network down"));

    render(<LiveActivationForm onActivated={jest.fn()} />);
    await selectStrategyAndVersion();
    await selectInstrument();

    fireEvent.click(screen.getByText("Activate Live Strategy"));

    await waitFor(() => expect(screen.getByText("Failed to activate live strategy")).toBeInTheDocument());
  });

  test("the submit button disables while a submission is in flight, preventing duplicate submissions", async () => {
    let resolveActivate;
    professionalApi.activateLiveStrategy.mockReturnValue(
      new Promise((resolve) => {
        resolveActivate = resolve;
      }),
    );

    render(<LiveActivationForm onActivated={jest.fn()} />);
    await selectStrategyAndVersion();
    await selectInstrument();

    const button = screen.getByText("Activate Live Strategy");
    fireEvent.click(button);

    await waitFor(() => expect(screen.getByText("Activating…")).toBeInTheDocument());
    expect(screen.getByText("Activating…")).toBeDisabled();

    // A second click while pending must not fire a second API call.
    fireEvent.click(screen.getByText("Activating…"));
    expect(professionalApi.activateLiveStrategy).toHaveBeenCalledTimes(1);

    resolveActivate({ runtime: { runtimeId: "rt1" } });
    await waitFor(() => expect(screen.getByText("Activate Live Strategy")).toBeInTheDocument());
  });
});
