import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import GridSimulatorList from "./GridSimulatorList";
import * as professionalApi from "../api/professionalApi";

jest.mock("../api/professionalApi");
jest.mock("../../utils/toast", () => ({
  showError: jest.fn(),
  showSuccess: jest.fn(),
  confirmAction: jest.fn(),
}));

function session(overrides = {}) {
  return {
    sessionId: "s1",
    instrumentKey: "NSE_EQ|GICRE",
    symbol: "GICRE",
    status: "ACTIVE",
    config: { referencePrice: 340, gridInterval: 3, quantityPerLevel: 100 },
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("GridSimulatorList", () => {
  beforeEach(() => jest.clearAllMocks());

  test("loading state renders before the first response resolves", () => {
    professionalApi.listGridSessions.mockReturnValue(new Promise(() => {}));
    render(<GridSimulatorList onOpenSession={jest.fn()} onCreateClick={jest.fn()} />);
    expect(screen.getByText("Loading sessions…")).toBeInTheDocument();
  });

  test("empty state renders when there are zero sessions", async () => {
    professionalApi.listGridSessions.mockResolvedValue({ items: [], total: 0 });
    render(<GridSimulatorList onOpenSession={jest.fn()} onCreateClick={jest.fn()} />);
    await waitFor(() => expect(screen.getByText(/No grid simulator sessions yet/)).toBeInTheDocument());
  });

  test("error state renders the backend's message", async () => {
    professionalApi.listGridSessions.mockRejectedValue({ data: { message: "Failed to list grid simulator sessions" } });
    render(<GridSimulatorList onOpenSession={jest.fn()} onCreateClick={jest.fn()} />);
    await waitFor(() => expect(screen.getByText("Failed to list grid simulator sessions")).toBeInTheDocument());
  });

  test("renders a PAPER TRADING disclosure and the session row", async () => {
    professionalApi.listGridSessions.mockResolvedValue({ items: [session()], total: 1 });
    render(<GridSimulatorList onOpenSession={jest.fn()} onCreateClick={jest.fn()} />);

    expect(screen.getByText(/PAPER TRADING ONLY/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("GICRE")).toBeInTheDocument());
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
  });

  test("clicking a session row calls onOpenSession with its id", async () => {
    professionalApi.listGridSessions.mockResolvedValue({ items: [session()], total: 1 });
    const onOpenSession = jest.fn();
    render(<GridSimulatorList onOpenSession={onOpenSession} onCreateClick={jest.fn()} />);

    await waitFor(() => screen.getByText("GICRE"));
    fireEvent.click(screen.getByText("GICRE"));
    expect(onOpenSession).toHaveBeenCalledWith("s1");
  });

  test("clicking '+ New Grid Session' calls onCreateClick", async () => {
    professionalApi.listGridSessions.mockResolvedValue({ items: [], total: 0 });
    const onCreateClick = jest.fn();
    render(<GridSimulatorList onOpenSession={jest.fn()} onCreateClick={onCreateClick} />);
    fireEvent.click(screen.getByText("+ New Grid Session"));
    expect(onCreateClick).toHaveBeenCalled();
  });
});
