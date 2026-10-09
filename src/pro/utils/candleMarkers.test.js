import { buildTradeMarkers, toUnixSeconds } from "./candleMarkers";

function candlesFromDates(dates) {
  return { timestamps: dates };
}

describe("candleMarkers", () => {
  test("maps an entry and exit to markers when both dates exactly match a candle", () => {
    const candles = candlesFromDates(["2024-01-01T00:00:00.000Z", "2024-01-02T00:00:00.000Z", "2024-01-03T00:00:00.000Z"]);
    const trades = [
      {
        _id: "t1",
        entryDate: "2024-01-01T00:00:00.000Z",
        exitDate: "2024-01-03T00:00:00.000Z",
        exitReason: "TAKE_PROFIT",
      },
    ];

    const { markers, unmappedCount } = buildTradeMarkers(candles, trades);

    expect(unmappedCount).toBe(0);
    expect(markers).toHaveLength(2);
    expect(markers[0]).toMatchObject({ time: toUnixSeconds("2024-01-01T00:00:00.000Z"), shape: "arrowUp", text: "Entry" });
    expect(markers[1]).toMatchObject({ time: toUnixSeconds("2024-01-03T00:00:00.000Z"), shape: "arrowDown", text: "TP", color: "#16a34a" });
  });

  test("distinguishes exit reasons (SIGNAL, STOP_LOSS, TAKE_PROFIT, END_OF_DATA) with different colors/labels", () => {
    const candles = candlesFromDates(["2024-01-01T00:00:00.000Z", "2024-01-02T00:00:00.000Z"]);
    const reasons = ["SIGNAL", "STOP_LOSS", "TAKE_PROFIT", "END_OF_DATA"];
    const seen = new Set();

    reasons.forEach((exitReason) => {
      const trades = [{ _id: exitReason, entryDate: "2024-01-01T00:00:00.000Z", exitDate: "2024-01-02T00:00:00.000Z", exitReason }];
      const { markers } = buildTradeMarkers(candles, trades);
      const exitMarker = markers.find((m) => m.id.endsWith("-exit"));
      expect(exitMarker).toBeDefined();
      seen.add(`${exitMarker.color}:${exitMarker.text}`);
    });

    // Every reason must render visually distinctly from the others.
    expect(seen.size).toBe(reasons.length);
  });

  test("never fabricates a marker: a trade date with no matching candle is skipped and counted, not approximated", () => {
    const candles = candlesFromDates(["2024-01-05T00:00:00.000Z", "2024-01-06T00:00:00.000Z"]);
    const trades = [
      {
        _id: "out-of-range",
        entryDate: "2023-12-01T00:00:00.000Z", // well before the displayed range
        exitDate: "2023-12-02T00:00:00.000Z",
        exitReason: "SIGNAL",
      },
    ];

    const { markers, unmappedCount } = buildTradeMarkers(candles, trades);

    expect(markers).toHaveLength(0);
    expect(unmappedCount).toBe(2); // entry + exit both unmapped
  });

  test("partially maps a trade: entry matches a candle but exit falls outside the range", () => {
    const candles = candlesFromDates(["2024-01-01T00:00:00.000Z", "2024-01-02T00:00:00.000Z"]);
    const trades = [
      {
        _id: "partial",
        entryDate: "2024-01-01T00:00:00.000Z",
        exitDate: "2024-06-01T00:00:00.000Z",
        exitReason: "SIGNAL",
      },
    ];

    const { markers, unmappedCount } = buildTradeMarkers(candles, trades);

    expect(markers).toHaveLength(1);
    expect(markers[0].text).toBe("Entry");
    expect(unmappedCount).toBe(1);
  });

  test("handles an empty trade list without error", () => {
    const candles = candlesFromDates(["2024-01-01T00:00:00.000Z"]);
    const { markers, unmappedCount } = buildTradeMarkers(candles, []);
    expect(markers).toHaveLength(0);
    expect(unmappedCount).toBe(0);
  });

  test("markers are sorted by time regardless of trade input order", () => {
    const candles = candlesFromDates(["2024-01-01T00:00:00.000Z", "2024-01-02T00:00:00.000Z", "2024-01-03T00:00:00.000Z", "2024-01-04T00:00:00.000Z"]);
    const trades = [
      { _id: "late", entryDate: "2024-01-03T00:00:00.000Z", exitDate: "2024-01-04T00:00:00.000Z", exitReason: "SIGNAL" },
      { _id: "early", entryDate: "2024-01-01T00:00:00.000Z", exitDate: "2024-01-02T00:00:00.000Z", exitReason: "SIGNAL" },
    ];

    const { markers } = buildTradeMarkers(candles, trades);
    const times = markers.map((m) => m.time);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  test("toUnixSeconds returns null for an unparseable date rather than NaN leaking through", () => {
    expect(toUnixSeconds("not-a-date")).toBeNull();
    expect(toUnixSeconds("2024-01-01T00:00:00.000Z")).toBe(1704067200);
  });
});
