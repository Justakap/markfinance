import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import OperandEditor from "./OperandEditor";
import { INDICATOR_NAMES } from "../constants/dsl";

describe("OperandEditor", () => {
  test("only offers indicators the backend has actually registered — never an unsupported one", () => {
    render(<OperandEditor operand={{ type: "indicator", name: "RSI", params: { period: 14 } }} onChange={() => {}} primaryTimeframe="1d" />);

    const indicatorSelect = screen.getByLabelText("Indicator");
    const options = Array.from(indicatorSelect.querySelectorAll("option")).map((o) => o.value);

    expect(options).toEqual(INDICATOR_NAMES);
    expect(options).not.toContain("BOLLINGER");
    expect(options).not.toContain("ATR");
    expect(options).not.toContain("ADX");
    expect(options).not.toContain("SUPERTREND");
  });

  test("switching operand type to 'price' replaces the whole operand with a valid price operand", () => {
    const onChange = jest.fn();
    render(<OperandEditor operand={{ type: "indicator", name: "RSI", params: { period: 14 } }} onChange={onChange} primaryTimeframe="1d" />);

    fireEvent.change(screen.getByLabelText("Operand type"), { target: { value: "price" } });

    expect(onChange).toHaveBeenCalledWith({ type: "price", field: "close" });
  });

  test("switching indicator name resets params to that indicator's defaults", () => {
    const onChange = jest.fn();
    render(<OperandEditor operand={{ type: "indicator", name: "RSI", params: { period: 14 } }} onChange={onChange} primaryTimeframe="1d" />);

    fireEvent.change(screen.getByLabelText("Indicator"), { target: { value: "EMA" } });

    expect(onChange).toHaveBeenCalledWith({ type: "indicator", name: "EMA", params: { period: 20 } });
  });

  test("constant operand renders a plain numeric input", () => {
    const onChange = jest.fn();
    render(<OperandEditor operand={{ type: "constant", value: 30 }} onChange={onChange} primaryTimeframe="1d" />);

    const input = screen.getByLabelText("Constant value");
    fireEvent.change(input, { target: { value: "45" } });

    expect(onChange).toHaveBeenCalledWith({ type: "constant", value: 45 });
  });
});
