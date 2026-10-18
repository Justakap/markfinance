import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import GridSimulatorDetail from "./GridSimulatorDetail";
import * as professionalApi from "../api/professionalApi";

jest.mock("../api/professionalApi");
jest.mock("../../utils/toast", () => ({
  showError: jest.fn(),
  showSuccess: jest.fn(),
  confirmAction: jest.fn(),
}));
jest.mock("../../utils/socket", () => ({ onMarketTick: jest.fn(() => jest.fn()) }));

const { confirmAction } = require("../../utils/toast");

function sessionDetail(overrides = {}) {
  return {
    sessionId: "s1",
    instrumentKey: "NSE_EQ|GICRE",
    symbol: "GICRE",
    status: "ACTIVE",
    config: { referencePrice: 340, gridInterval: 3, quantityPerLevel: 100 },
    state: { lastPrice: 336, lastEventTimestamp: "2026-01-01T09:15:00.000Z", sequence: 1 },
    portfolio: { cash: 66400, holdings: 100, avgCost: 336, realizedPnL: 0, unrealizedPnL: 400, equity: 100400 },
    lastFeedStatus: "LIVE",
    lastFeedCheckAt: "2026-01-01T09:15:05.000Z",
    lastFeedPrice: 340,
    ...overrides,
  };
}

describe("GridSimulatorDetail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    professionalApi.listGridTrades.mockResolvedValue({ items: [], total: 0 });
  });

  test("loading state renders before the first response resolves", () => {
    professionalApi.getGridSession.mockReturnValue(new Promise(() => {}));
    const { unmount } = render(<GridSimulatorDetail sessionId="s1" onBack={jest.fn()} />);
    expect(screen.getByText(/Loading grid simulator session/)).toBeInTheDocument();
    unmount();
  });

  test("error state renders the backend's message", async () => {
    professionalApi.getGridSession.mockRejectedValue({ data: { message: "Grid simulator session not found" } });
    const { unmount } = render(<GridSimulatorDetail sessionId="s1" onBack={jest.fn()} />);
    await waitFor(() => expect(screen.getByText("Grid simulator session not found")).toBeInTheDocument());
    unmount();
  });

  test("renders PAPER TRADING disclosure, portfolio stats, and feed health", async () => {
    professionalApi.getGridSession.mockResolvedValue(sessionDetail());
    const { unmount } = render(<GridSimulatorDetail sessionId="s1" onBack={jest.fn()} />);

    await waitFor(() => expect(screen.getByText("GICRE")).toBeInTheDocument());
    expect(screen.getByText(/PAPER TRADING ONLY/)).toBeInTheDocument();
    expect(screen.getByText("Feed: LIVE")).toBeInTheDocument();
    expect(screen.getByText("₹336.00")).toBeInTheDocument(); // avgCost
    unmount();
  });

  test("empty trade ledger shows an explanatory message, not a blank table", async () => {
    professionalApi.getGridSession.mockResolvedValue(sessionDetail());
    const { unmount } = render(<GridSimulatorDetail sessionId="s1" onBack={jest.fn()} />);
    await waitFor(() => expect(screen.getByText(/No simulated fills yet/)).toBeInTheDocument());
    unmount();
  });

  test("an ACTIVE session shows Pause and Stop, not Start", async () => {
    professionalApi.getGridSession.mockResolvedValue(sessionDetail({ status: "ACTIVE" }));
    const { unmount } = render(<GridSimulatorDetail sessionId="s1" onBack={jest.fn()} />);
    await waitFor(() => expect(screen.getByText("Pause")).toBeInTheDocument());
    expect(screen.getByText("Stop")).toBeInTheDocument();
    expect(screen.queryByText("Start")).not.toBeInTheDocument();
    unmount();
  });

  test("a CREATED session shows Start only", async () => {
    professionalApi.getGridSession.mockResolvedValue(sessionDetail({ status: "CREATED" }));
    const { unmount } = render(<GridSimulatorDetail sessionId="s1" onBack={jest.fn()} />);
    await waitFor(() => expect(screen.getByText("Start")).toBeInTheDocument());
    expect(screen.queryByText("Pause")).not.toBeInTheDocument();
    unmount();
  });

  test("Stop requires confirmation before calling the API", async () => {
    professionalApi.getGridSession.mockResolvedValue(sessionDetail({ status: "ACTIVE" }));
    confirmAction.mockResolvedValue(false);
    const { unmount } = render(<GridSimulatorDetail sessionId="s1" onBack={jest.fn()} />);
    await waitFor(() => screen.getByText("Stop"));
    fireEvent.click(screen.getByText("Stop"));
    await waitFor(() => expect(confirmAction).toHaveBeenCalled());
    expect(professionalApi.stopGridSession).not.toHaveBeenCalled();
    unmount();
  });

  test("confirming Stop calls stopGridSession and reloads", async () => {
    professionalApi.getGridSession.mockResolvedValue(sessionDetail({ status: "ACTIVE" }));
    professionalApi.stopGridSession.mockResolvedValue({ session: {} });
    confirmAction.mockResolvedValue(true);
    const { unmount } = render(<GridSimulatorDetail sessionId="s1" onBack={jest.fn()} />);
    await waitFor(() => screen.getByText("Stop"));
    fireEvent.click(screen.getByText("Stop"));
    await waitFor(() => expect(professionalApi.stopGridSession).toHaveBeenCalledWith("s1"));
    unmount();
  });

  test("clicking back calls onBack", async () => {
    professionalApi.getGridSession.mockResolvedValue(sessionDetail());
    const onBack = jest.fn();
    const { unmount } = render(<GridSimulatorDetail sessionId="s1" onBack={onBack} />);
    await waitFor(() => screen.getByText(/Back to sessions/));
    fireEvent.click(screen.getByText(/Back to sessions/));
    expect(onBack).toHaveBeenCalled();
    unmount();
  });
});
