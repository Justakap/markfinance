import { getSignalLabel, getExitReasonLabel } from "./liveSignalLabels";

describe("liveSignalLabels", () => {
  test("ENTRY_SIGNAL and EXIT_SIGNAL are labeled as signals, not fills", () => {
    expect(getSignalLabel("ENTRY_SIGNAL").isFill).toBe(false);
    expect(getSignalLabel("EXIT_SIGNAL").isFill).toBe(false);
  });

  test("ENTRY_FILLED and EXIT_FILLED are labeled as simulated fills", () => {
    expect(getSignalLabel("ENTRY_FILLED").isFill).toBe(true);
    expect(getSignalLabel("EXIT_FILLED").isFill).toBe(true);
    expect(getSignalLabel("ENTRY_FILLED").label).toMatch(/simulated/i);
  });

  test("an unknown type never crashes and is clearly labeled unknown", () => {
    expect(getSignalLabel("SOMETHING_ELSE").label).toBe("SOMETHING_ELSE");
    expect(getSignalLabel(undefined).label).toBe("Unknown event");
  });

  test("exit reasons map to plain language", () => {
    expect(getExitReasonLabel("STOP_LOSS")).toBe("Stop-loss");
    expect(getExitReasonLabel("TAKE_PROFIT")).toBe("Take-profit");
    expect(getExitReasonLabel(null)).toBe("—");
  });
});
