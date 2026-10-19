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
jest.mock("../../utils/socket", () => ({
  onMarketTick: jest.fn(),
  joinGridSession: jest.fn(),
  onGridSimulatorUpdate: jest.fn(),
  onSocketConnectionChange: jest.fn(),
  forceReconnectMarketSocket: jest.fn(),
}));

const { confirmAction } = require("../../utils/toast");
const { onMarketTick, joinGridSession, onGridSimulatorUpdate, onSocketConnectionChange, forceReconnectMarketSocket } = require("../../utils/socket");

function sessionDetail(overrides = {}) {
  return {
    sessionId: "s1",
    instrumentKey: "NSE_EQ|GICRE",
    symbol: "GICRE",
    status: "ACTIVE",
    config: { referencePrice: 340, referenceCapturedAt: "2026-01-01T09:00:00.000Z", gridInterval: 3, quantityPerLevel: 100 },
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
    onMarketTick.mockReturnValue(jest.fn());
    joinGridSession.mockReturnValue(jest.fn());
    onGridSimulatorUpdate.mockReturnValue(jest.fn());
    onSocketConnectionChange.mockImplementation((callback) => {
      callback("connected");
      return jest.fn();
    });
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

  test("renders portfolio stats and feed health, with no PAPER TRADING disclosure banner", async () => {
    professionalApi.getGridSession.mockResolvedValue(sessionDetail());
    const { unmount } = render(<GridSimulatorDetail sessionId="s1" onBack={jest.fn()} />);

    await waitFor(() => expect(screen.getByText("GICRE")).toBeInTheDocument());
    expect(screen.queryByText(/PAPER TRADING ONLY/)).not.toBeInTheDocument();
    expect(screen.getByText("Live (WebSocket)")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("₹336.00")).toBeInTheDocument(); // avgCost
    unmount();
  });

  test("empty trade ledger shows an explanatory message, not a blank table", async () => {
    professionalApi.getGridSession.mockResolvedValue(sessionDetail());
    const { unmount } = render(<GridSimulatorDetail sessionId="s1" onBack={jest.fn()} />);
    await waitFor(() => expect(screen.getByText(/No simulated fills yet/)).toBeInTheDocument());
    unmount();
  });

  test("Trade Events stat shows Total Trade plus a Buy/Sell breakdown from tradeCounts", async () => {
    professionalApi.getGridSession.mockResolvedValue(
      sessionDetail({ tradeCounts: { buyCount: 7, sellCount: 4, skippedCount: 2, partialCount: 1 } }),
    );
    const { unmount } = render(<GridSimulatorDetail sessionId="s1" onBack={jest.fn()} />);
    await waitFor(() => expect(screen.getByText("Total Trade : 11")).toBeInTheDocument());
    expect(screen.getByText("Buy : 7 Sell : 4")).toBeInTheDocument();
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

  test("clicking Refresh forces a socket reconnect and re-fetches the session over REST", async () => {
    professionalApi.getGridSession.mockResolvedValue(sessionDetail());
    const { unmount } = render(<GridSimulatorDetail sessionId="s1" onBack={jest.fn()} />);
    await waitFor(() => screen.getByText("GICRE"));
    const callsBefore = professionalApi.getGridSession.mock.calls.length;

    fireEvent.click(screen.getByText(/Refresh/));

    expect(forceReconnectMarketSocket).toHaveBeenCalled();
    await waitFor(() => expect(professionalApi.getGridSession.mock.calls.length).toBeGreaterThan(callsBefore));
    unmount();
  });

  test("a gridSimulatorUpdate push merges directly into state without a REST round trip", async () => {
    professionalApi.getGridSession.mockResolvedValue(sessionDetail());
    let pushUpdate;
    onGridSimulatorUpdate.mockImplementation((callback) => {
      pushUpdate = callback;
      return jest.fn();
    });

    const { unmount } = render(<GridSimulatorDetail sessionId="s1" onBack={jest.fn()} />);
    await waitFor(() => screen.getByText("GICRE"));
    const callsBefore = professionalApi.getGridSession.mock.calls.length;

    pushUpdate({
      sessionId: "s1",
      status: "ACTIVE",
      lastFeedStatus: "LIVE",
      lastFeedCheckAt: new Date().toISOString(),
      lastFeedPrice: 345,
      state: { lastPrice: 345, lastEventTimestamp: new Date().toISOString(), sequence: 2 },
      portfolio: { cash: 60000, holdings: 200, avgCost: 340, realizedPnL: 0 },
      trades: [{ type: "BUY", level: -2, levelPrice: 334, fillPrice: 333, qtyFilled: 100, qtySkipped: 0, sequence: 2, eventTimestamp: new Date().toISOString() }],
    });

    await waitFor(() => expect(screen.getByText("200")).toBeInTheDocument()); // holdings
    expect(professionalApi.getGridSession.mock.calls.length).toBe(callsBefore); // no extra REST fetch for this push
    unmount();
  });

  test("a duplicate/replayed gridSimulatorUpdate push (same trade sequence) never renders or counts the trade twice", async () => {
    professionalApi.getGridSession.mockResolvedValue(sessionDetail());
    let pushUpdate;
    onGridSimulatorUpdate.mockImplementation((callback) => {
      pushUpdate = callback;
      return jest.fn();
    });

    const { unmount } = render(<GridSimulatorDetail sessionId="s1" onBack={jest.fn()} />);
    await waitFor(() => screen.getByText("GICRE"));

    const update = {
      sessionId: "s1",
      status: "ACTIVE",
      state: { lastPrice: 333, lastEventTimestamp: new Date().toISOString(), sequence: 2 },
      portfolio: { cash: 66400, holdings: 200, avgCost: 335, realizedPnL: 0, unrealizedPnL: 0, equity: 66400 },
      trades: [{ tradeId: "t1", type: "BUY", level: -2, levelPrice: 334, fillPrice: 333, qtyFilled: 100, qtySkipped: 0, sequence: 2, eventTimestamp: "2026-01-01T09:16:00.000Z" }],
    };

    function tradeEventsValue() {
      return screen.getByText("Trade Events").closest("div").querySelectorAll("p")[1].textContent;
    }

    pushUpdate(update);
    await waitFor(() => expect(screen.getAllByText("₹333.00").length).toBe(1));
    expect(tradeEventsValue()).toBe("Total Trade : 1");

    // The identical trade is pushed again (e.g. a reconnect replaying a
    // buffered event, or an overlapping listener firing twice).
    pushUpdate(update);

    // Still exactly one ledger row for this trade, and the Trade Events
    // count did not increment a second time for the duplicate.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(screen.getAllByText("₹333.00").length).toBe(1);
    expect(tradeEventsValue()).toBe("Total Trade : 1");
    unmount();
  });

  test("ignores a gridSimulatorUpdate for a different session id", async () => {
    professionalApi.getGridSession.mockResolvedValue(sessionDetail());
    let pushUpdate;
    onGridSimulatorUpdate.mockImplementation((callback) => {
      pushUpdate = callback;
      return jest.fn();
    });

    const { unmount } = render(<GridSimulatorDetail sessionId="s1" onBack={jest.fn()} />);
    await waitFor(() => screen.getByText("GICRE"));

    pushUpdate({ sessionId: "some-other-session", portfolio: { holdings: 999 } });
    expect(screen.queryByText("999")).not.toBeInTheDocument();
    unmount();
  });

  test("reconnecting triggers a reconciliation reload", async () => {
    professionalApi.getGridSession.mockResolvedValue(sessionDetail());
    let pushConnectionState;
    onSocketConnectionChange.mockImplementation((callback) => {
      pushConnectionState = callback;
      callback("disconnected");
      return jest.fn();
    });

    const { unmount } = render(<GridSimulatorDetail sessionId="s1" onBack={jest.fn()} />);
    await waitFor(() => screen.getByText("GICRE"));
    const callsBefore = professionalApi.getGridSession.mock.calls.length;

    pushConnectionState("connected");
    await waitFor(() => expect(professionalApi.getGridSession.mock.calls.length).toBeGreaterThan(callsBefore));
    unmount();
  });

  test("unmounting cleans up the socket room join and listeners", async () => {
    professionalApi.getGridSession.mockResolvedValue(sessionDetail());
    const leaveSpy = jest.fn();
    const unsubUpdateSpy = jest.fn();
    const unsubConnectionSpy = jest.fn();
    joinGridSession.mockReturnValue(leaveSpy);
    onGridSimulatorUpdate.mockReturnValue(unsubUpdateSpy);
    onSocketConnectionChange.mockImplementation((callback) => {
      callback("connected");
      return unsubConnectionSpy;
    });

    const { unmount } = render(<GridSimulatorDetail sessionId="s1" onBack={jest.fn()} />);
    await waitFor(() => screen.getByText("GICRE"));
    unmount();

    expect(leaveSpy).toHaveBeenCalled();
    expect(unsubUpdateSpy).toHaveBeenCalled();
    expect(unsubConnectionSpy).toHaveBeenCalled();
  });

  test("displays the immutable initial reference and its capture time (dynamic-reference strategy)", async () => {
    professionalApi.getGridSession.mockResolvedValue(sessionDetail());
    const { unmount } = render(<GridSimulatorDetail sessionId="s1" onBack={jest.fn()} />);
    await waitFor(() => screen.getByText("GICRE"));
    expect(screen.getByText(/Initial reference ₹340\.00/)).toBeInTheDocument();
    expect(screen.getByText(/captured/)).toBeInTheDocument();
    unmount();
  });

  test("the config editor (ADR-034) is not shown while ACTIVE", async () => {
    professionalApi.getGridSession.mockResolvedValue(sessionDetail({ status: "ACTIVE" }));
    const { unmount } = render(<GridSimulatorDetail sessionId="s1" onBack={jest.fn()} />);
    await waitFor(() => screen.getByText("GICRE"));
    expect(screen.queryByText("Edit Configuration")).not.toBeInTheDocument();
    unmount();
  });

  test("the config editor appears while PAUSED, pre-filled from the current config, and submits a patch", async () => {
    professionalApi.getGridSession.mockResolvedValue(sessionDetail({
      status: "PAUSED",
      config: { referencePrice: 340, referenceCapturedAt: "2026-01-01T09:00:00.000Z", gridInterval: 3, sellVariance: 6, quantityPerLevel: 100, sellQuantityPerLevel: 40 },
    }));
    professionalApi.updateGridSessionConfig.mockResolvedValue({ session: {} });
    const { unmount } = render(<GridSimulatorDetail sessionId="s1" onBack={jest.fn()} />);
    await waitFor(() => screen.getByText("GICRE"));

    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByDisplayValue("100")).toBeInTheDocument(); // quantityPerLevel pre-filled
    expect(screen.getByDisplayValue("40")).toBeInTheDocument(); // sellQuantityPerLevel pre-filled
    expect(screen.getByLabelText("Use a different Sell Qty")).toBeChecked(); // sellQuantityPerLevel was already set -> checkbox pre-checked
    expect(screen.getByDisplayValue("3")).toBeInTheDocument(); // gridInterval pre-filled
    expect(screen.getByDisplayValue("6")).toBeInTheDocument(); // sellVariance pre-filled
    expect(screen.getByLabelText("Use a different Sell Variance")).toBeChecked(); // sellVariance was already set -> checkbox pre-checked

    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => expect(professionalApi.updateGridSessionConfig).toHaveBeenCalledWith(
      "s1",
      expect.objectContaining({
        quantityPerLevel: 100,
        useSeparateSellQuantity: true,
        sellQuantityPerLevel: 40,
        gridInterval: 3,
        useSeparateSellVariance: true,
        sellVariance: 6,
      }),
    ));
    unmount();
  });

  test("the config editor rejects editing when a session goes not-PAUSED mid-flight (backend 409)", async () => {
    professionalApi.getGridSession.mockResolvedValue(sessionDetail({ status: "PAUSED" }));
    professionalApi.updateGridSessionConfig.mockRejectedValue({ data: { message: "Pause the session before editing its configuration" } });
    const { unmount } = render(<GridSimulatorDetail sessionId="s1" onBack={jest.fn()} />);
    await waitFor(() => screen.getByText("GICRE"));

    fireEvent.click(screen.getByText("Edit"));
    fireEvent.click(screen.getByText("Save"));

    const { showError } = require("../../utils/toast");
    await waitFor(() => expect(showError).toHaveBeenCalledWith("Pause the session before editing its configuration"));
    unmount();
  });

  test("Total Charges card (ADR-035) shows the running total and a hover breakdown, with an approximate-segment disclosure when flagged", async () => {
    professionalApi.getGridSession.mockResolvedValue(sessionDetail({
      charges: { brokerage: 20, stt: 5.5, exchangeTxnCharges: 1.2, sebiFee: 0.1, stampDuty: 0.6, total: 27.4, segmentClass: "FUTURES", approximate: true },
    }));
    const { unmount } = render(<GridSimulatorDetail sessionId="s1" onBack={jest.fn()} />);
    await waitFor(() => screen.getByText("GICRE"));

    expect(screen.getByText("Total Charges")).toBeInTheDocument();
    expect(screen.getAllByText("₹27.40").length).toBeGreaterThan(0); // appears in both the card and the hover breakdown's total row
    expect(screen.getByText(/Approximate \(segment not exactly modeled\)/)).toBeInTheDocument();
    expect(screen.getByText("Brokerage")).toBeInTheDocument();
    expect(screen.getByText("STT")).toBeInTheDocument();
    expect(screen.getByText("Exchange Txn Charges")).toBeInTheDocument();
    expect(screen.getByText("SEBI Charges")).toBeInTheDocument();
    expect(screen.getByText("Stamp Duty")).toBeInTheDocument();
    unmount();
  });
});
