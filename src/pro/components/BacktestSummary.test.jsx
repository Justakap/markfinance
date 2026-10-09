import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import BacktestSummary from "./BacktestSummary";

const SAMPLE_SUMMARY = {
  finalEquity: 10523.45,
  totalReturnPct: 5.23,
  cagrPct: 11.2,
  maxDrawdownPct: -3.5,
  maxDrawdownDurationBars: 12,
  annualizedVolatilityPct: 14.1,
  sharpeRatio: 1.25,
  totalTrades: 8,
  winningTrades: 5,
  losingTrades: 3,
  winRatePct: 62.5,
  profitFactor: 2.1,
  expectancy: 45.3,
  exposurePct: 34.2,
  buyAndHoldReturnPct: 3.1,
  outperformancePct: 2.13,
};

const SAMPLE_DATA_QUALITY = {
  corporateActionsNote: "Historical prices may not be fully adjusted for stock splits.",
  slTpAmbiguityPolicy: "When one bar touches both stop-loss and take-profit, the stop is always assumed to have triggered first.",
  historicalPeSupported: false,
  isDerivativeInstrument: false,
  cappedTimeframes: [],
};

describe("BacktestSummary", () => {
  test("renders every category from the real persisted summary shape", () => {
    render(<BacktestSummary summary={SAMPLE_SUMMARY} dataQuality={SAMPLE_DATA_QUALITY} />);

    expect(screen.getByText("5.23%")).toBeInTheDocument(); // total return
    expect(screen.getByText("-3.5%")).toBeInTheDocument(); // max drawdown
    expect(screen.getByText("8")).toBeInTheDocument(); // total trades
    expect(screen.getByText("62.5%")).toBeInTheDocument(); // win rate
    expect(screen.getByText("34.2%")).toBeInTheDocument(); // exposure
  });

  test("always surfaces the corporate-action disclosure and SL/TP ambiguity policy", () => {
    render(<BacktestSummary summary={SAMPLE_SUMMARY} dataQuality={SAMPLE_DATA_QUALITY} />);
    expect(screen.getByText(SAMPLE_DATA_QUALITY.corporateActionsNote)).toBeInTheDocument();
    expect(screen.getByText(SAMPLE_DATA_QUALITY.slTpAmbiguityPolicy)).toBeInTheDocument();
  });

  test("missing/null metrics render as an em dash, never as NaN/undefined text", () => {
    const incomplete = { ...SAMPLE_SUMMARY, cagrPct: null, profitFactor: null };
    render(<BacktestSummary summary={incomplete} dataQuality={SAMPLE_DATA_QUALITY} />);
    expect(screen.queryByText("NaN%")).not.toBeInTheDocument();
    expect(screen.queryByText("undefined")).not.toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  test("renders nothing when summary is absent (e.g. a failed backtest)", () => {
    const { container } = render(<BacktestSummary summary={null} dataQuality={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
