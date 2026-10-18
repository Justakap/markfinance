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
      { type: "BUY", level: -1, fillPrice: 337, qtyFilled: 100, sequence: 1 },
      { type: "SELL", level: 1, fillPrice: 345, qtyFilled: 50, sequence: 2 },
      { type: "BUY", level: -2, fillPrice: 334, qtyFilled: 0, sequence: 3 }, // skipped, excluded from markers
    ];
    const { container } = render(<GridLevelsChart config={CONFIG} trades={trades} currentPrice={340} />);
    // jsdom gives ResponsiveContainer zero layout dimensions, so recharts
    // never mounts its inner <svg> — asserting the container itself (not
    // the chart library's internals) is enough to prove no crash occurred.
    expect(container.querySelector(".recharts-responsive-container")).toBeTruthy();
  });
});
