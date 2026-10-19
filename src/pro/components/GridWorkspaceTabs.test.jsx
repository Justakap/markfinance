import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import GridWorkspaceTabs from "./GridWorkspaceTabs";

describe("GridWorkspaceTabs", () => {
  test("renders both Live Simulator and Backtest destinations", () => {
    render(<GridWorkspaceTabs active="live" onNavigate={jest.fn()} />);
    expect(screen.getByText("Live Simulator")).toBeInTheDocument();
    expect(screen.getByText("Backtest")).toBeInTheDocument();
  });

  test("clicking Live Simulator navigates to /workspace/grid", () => {
    const onNavigate = jest.fn();
    render(<GridWorkspaceTabs active="backtest" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText("Live Simulator"));
    expect(onNavigate).toHaveBeenCalledWith("/workspace/grid");
  });

  test("clicking Backtest navigates to /workspace/grid/backtest", () => {
    const onNavigate = jest.fn();
    render(<GridWorkspaceTabs active="live" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText("Backtest"));
    expect(onNavigate).toHaveBeenCalledWith("/workspace/grid/backtest");
  });
});
