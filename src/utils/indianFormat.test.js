import { formatINR, formatIndianNumber, formatQuantity, formatPercent, formatIndianInputValue, parseIndianInputValue } from "./indianFormat";

describe("indianFormat", () => {
  describe("formatINR", () => {
    test("formats a mid-size value with Indian grouping", () => {
      expect(formatINR(23077.1)).toBe("₹23,077.10");
    });

    test("formats a lakh-range equity value", () => {
      expect(formatINR(9997744.5)).toBe("₹99,97,744.50");
    });

    test("reconciled equity example", () => {
      expect(formatINR(9996512.6)).toBe("₹99,96,512.60");
    });

    test("formats a crore-range value", () => {
      expect(formatINR(10000000)).toBe("₹1,00,00,000.00");
    });

    test("formats negative P&L with the minus before the currency symbol", () => {
      expect(formatINR(-3327)).toBe("-₹3,327.00");
    });

    test("formats zero", () => {
      expect(formatINR(0)).toBe("₹0.00");
    });

    test("returns '--' for null/undefined/NaN", () => {
      expect(formatINR(null)).toBe("--");
      expect(formatINR(undefined)).toBe("--");
      expect(formatINR(NaN)).toBe("--");
      expect(formatINR("not a number")).toBe("--");
    });
  });

  describe("formatIndianNumber", () => {
    test("formats a grid reference price without a currency symbol", () => {
      expect(formatIndianNumber(23067.95)).toBe("23,067.95");
    });

    test("returns '--' for invalid input", () => {
      expect(formatIndianNumber(undefined)).toBe("--");
    });
  });

  describe("formatQuantity", () => {
    test("formats a share quantity with no decimals", () => {
      expect(formatQuantity(70)).toBe("70");
    });

    test("formats a large quantity with Indian grouping", () => {
      expect(formatQuantity(150000)).toBe("1,50,000");
    });

    test("returns '--' for invalid input", () => {
      expect(formatQuantity(null)).toBe("--");
    });
  });

  describe("formatIndianInputValue / parseIndianInputValue (live-typing helpers)", () => {
    test("formats a raw number as a grouped string for display", () => {
      expect(formatIndianInputValue(1000000)).toBe("10,00,000");
      expect(formatIndianInputValue(100000)).toBe("1,00,000");
    });

    test("formats a partially-typed digit string as the user types", () => {
      expect(formatIndianInputValue("1")).toBe("1");
      expect(formatIndianInputValue("10")).toBe("10");
      expect(formatIndianInputValue("100")).toBe("100");
      expect(formatIndianInputValue("1000")).toBe("1,000");
    });

    test("returns an empty string for empty input", () => {
      expect(formatIndianInputValue("")).toBe("");
      expect(formatIndianInputValue(null)).toBe("");
      expect(formatIndianInputValue(undefined)).toBe("");
    });

    test("parseIndianInputValue strips commas back to plain digits", () => {
      expect(parseIndianInputValue("10,00,000")).toBe("1000000");
      expect(parseIndianInputValue("1,000")).toBe("1000");
    });

    test("round-trips: format then parse recovers the original digits", () => {
      const raw = "1500000";
      expect(parseIndianInputValue(formatIndianInputValue(raw))).toBe(raw);
    });

    test("parseIndianInputValue strips non-digit characters entirely", () => {
      expect(parseIndianInputValue("₹10,00,000.00")).toBe("100000000"); // decimal point stripped like any other non-digit
    });
  });

  describe("formatPercent", () => {
    test("formats a positive percentage with 2 decimals by default", () => {
      expect(formatPercent(1.2)).toBe("1.20%");
    });

    test("formats a negative percentage", () => {
      expect(formatPercent(-2.1)).toBe("-2.10%");
    });

    test("returns '--' for invalid input", () => {
      expect(formatPercent(undefined)).toBe("--");
    });
  });
});
