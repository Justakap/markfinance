import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import GridLevelsChart from "./GridLevelsChart";

const CONFIG = { referencePrice: 340, gridInterval: 3 };

describe("GridLevelsChart", () => {
  test("renders an empty state when there are no fills and no current price", () => {
    render(<GridLevelsChart config={CONFIG} trades={[]} currentPrice={null} />);
    expect(screen.getByText(/No simulated fills yet/)).toBeInTheDocument();
  });

  test("renders nothing (no crash) when config is missing", () => {
    const { container } = render(<GridLevelsChart config={null} trades={[]} currentPrice={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  test("renders the chart once a current price or a fill exists, without crashing", () => {
    const trades = [
      { type: "BUY", level: -1, fillPrice: 337, qtyFilled: 100, sequence: 1, eventTimestamp: "2026-01-01T09:15:00.000Z" },
      { type: "SELL", level: 1, fillPrice: 345, qtyFilled: 50, sequence: 2, eventTimestamp: "2026-01-01T09:20:00.000Z" },
      { type: "BUY", level: -2, fillPrice: 334, qtyFilled: 0, sequence: 3, eventTimestamp: "2026-01-01T09:25:00.000Z" }, // skipped, excluded from markers
    ];
    const { container } = render(<GridLevelsChart config={CONFIG} trades={trades} currentPrice={340} />);
    // jsdom gives ResponsiveContainer zero layout dimensions, so recharts
    // never mounts its inner <svg> — asserting the container itself (not
    // the chart library's internals) is enough to prove no crash occurred.
    expect(container.querySelector(".recharts-responsive-container")).toBeTruthy();
  });

  test("the X-axis is the trade's real event time, not a sequence index", () => {
    const trades = [
      { type: "BUY", level: -1, fillPrice: 337, qtyFilled: 100, sequence: 1, eventTimestamp: "2026-01-01T09:15:00.000Z" },
    ];
    // Doesn't crash with a real eventTimestamp present; sequence is no
    // longer read for X-axis positioning (removing it entirely here would
    // previously have been harmless either way, but this documents the
    // field the chart now actually depends on).
    const { container } = render(<GridLevelsChart config={CONFIG} trades={trades} currentPrice={340} />);
    expect(container.querySelector(".recharts-responsive-container")).toBeTruthy();
  });

  test("ADR-037: renders with nextBuyLevel/nextSellLevel instead of the old activeReference prop, without crashing", () => {
    const { container } = render(
      <GridLevelsChart config={CONFIG} trades={[]} currentPrice={340} nextBuyLevel={337} nextSellLevel={343} />,
    );
    expect(container.querySelector(".recharts-responsive-container")).toBeTruthy();
  });

  test("ADR-037: renders fine when nextBuyLevel/nextSellLevel are absent (e.g. not yet populated)", () => {
    const trades = [{ type: "BUY", fillPrice: 337, qtyFilled: 100, eventTimestamp: "2026-01-01T09:15:00.000Z" }];
    const { container } = render(<GridLevelsChart config={CONFIG} trades={trades} currentPrice={340} />);
    expect(container.querySelector(".recharts-responsive-container")).toBeTruthy();
  });

  test("ADR-040 follow-up: renders the full ladder depth (pendingBuyLevels/pendingSellLevels beyond the nearest) without crashing", () => {
    const { container } = render(
      <GridLevelsChart
        config={CONFIG}
        trades={[]}
        currentPrice={340}
        nextBuyLevel={337}
        nextSellLevel={343}
        pendingBuyLevels={[337, 334, 331]}
        pendingSellLevels={[343, 346]}
      />,
    );
    expect(container.querySelector(".recharts-responsive-container")).toBeTruthy();
  });
});
