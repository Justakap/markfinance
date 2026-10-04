const firstDefined = (...values) => values.find((value) => value != null);

const toNumberOrNull = (value) => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getTickerValue = (quote, keys) => {
  for (const key of keys) {
    const parsed = toNumberOrNull(quote?.[key]);
    if (parsed != null) return parsed;
  }
  return null;
};

const applyTriplet = (target, currentKeys, prevKeys, changeKeys, fallbackChange) => {
  const current = getTickerValue(target, currentKeys);
  const prev = getTickerValue(target, prevKeys);
  const explicitChange = getTickerValue(target, changeKeys);

  target[currentKeys[0]] = firstDefined(current, target[currentKeys[0]]);
  target[prevKeys[0]] = firstDefined(prev, target[prevKeys[0]]);

  if (explicitChange != null) {
    target[changeKeys[0]] = explicitChange;
    return;
  }

  if (current != null && prev != null) {
    target[changeKeys[0]] = current - prev;
    return;
  }

  if (fallbackChange != null) {
    target[changeKeys[0]] = fallbackChange;
  }
};

export const normalizeIndicatorQuote = (quote = {}) => {
  if (!quote || typeof quote !== "object") return quote;

  const normalized = { ...quote };

  const dailyCurrent = toNumberOrNull(normalized.rsi ?? normalized.dailyRsi);
  const dailyPrev = toNumberOrNull(normalized.prevRsi ?? normalized.prevDailyRsi);
  const dailyFallbackChange =
    dailyCurrent != null && dailyPrev != null ? dailyCurrent - dailyPrev : null;

  applyTriplet(
    normalized,
    ["rsi", "dailyRsi", "rsi1d", "rsiDaily", "rsi_1d", "rsi_daily"],
    ["prevRsi", "prevDailyRsi", "prevRsi1d", "prevRsiDaily", "prev_rsi_1d"],
    ["rsiChange", "dailyRsiChange", "rsi1dChange", "rsi_daily_change"],
    dailyFallbackChange,
  );

  applyTriplet(
    normalized,
    ["rsi5m", "rsi_5m", "rsi5min"],
    ["prevRsi5m", "prev_rsi_5m", "prevRsi5min"],
    ["rsi5mChange", "rsi_5m_change", "rsi5minChange"],
    null,
  );

  applyTriplet(
    normalized,
    ["rsi15m", "rsi_15m", "rsi15min"],
    ["prevRsi15m", "prev_rsi_15m", "prevRsi15min"],
    ["rsi15mChange", "rsi_15m_change", "rsi15minChange"],
    null,
  );

  applyTriplet(
    normalized,
    ["hourlyRsi", "rsi1h", "rsi_1h", "rsi60m"],
    ["prevHourlyRsi", "prevRsi1h", "prev_rsi_1h", "prevRsi60m"],
    ["hourlyRsiChange", "rsi1hChange", "rsi_1h_change", "rsi60mChange"],
    null,
  );

  const ema20 = getTickerValue(normalized, ["ema20", "ema_20"]);
  if (ema20 != null) normalized.ema20 = ema20;

  const ema75 = getTickerValue(normalized, ["ema75", "ema_75"]);
  if (ema75 != null) normalized.ema75 = ema75;

  const prevPrice5m = getTickerValue(normalized, ["prevPrice5m", "prev_price_5m"]);
  if (prevPrice5m != null) normalized.prevPrice5m = prevPrice5m;

  const prevPrice15m = getTickerValue(normalized, ["prevPrice15m", "prev_price_15m"]);
  if (prevPrice15m != null) normalized.prevPrice15m = prevPrice15m;

  const prevPrice1h = getTickerValue(normalized, [
    "prevPrice1h",
    "prev_price_1h",
    "prevHourlyPrice",
  ]);
  if (prevPrice1h != null) normalized.prevPrice1h = prevPrice1h;

  const prevPrice = getTickerValue(normalized, [
    "prevPrice",
    "prevDailyPrice",
    "prev_price",
  ]);
  if (prevPrice != null) normalized.prevPrice = prevPrice;

  return normalized;
};

export const getRsiDataForTimeframe = (quote, rsiTimeframe) => {
  const normalized = normalizeIndicatorQuote(quote);

  switch (rsiTimeframe) {
    case "5m":
      return {
        rsi: normalized?.rsi5m ?? null,
        prev: normalized?.prevRsi5m ?? null,
        change: normalized?.rsi5mChange ?? null,
      };
    case "15m":
      return {
        rsi: normalized?.rsi15m ?? null,
        prev: normalized?.prevRsi15m ?? null,
        change: normalized?.rsi15mChange ?? null,
      };
    case "1h":
      return {
        rsi: normalized?.hourlyRsi ?? null,
        prev: normalized?.prevHourlyRsi ?? null,
        change: normalized?.hourlyRsiChange ?? null,
      };
    default:
      return {
        rsi: normalized?.rsi ?? null,
        prev: normalized?.prevRsi ?? null,
        change: normalized?.rsiChange ?? null,
      };
  }
};
