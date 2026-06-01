const CURRENCY_SYMBOLS = {
  USD: "$",
  INR: "₹",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  AUD: "A$",
  CAD: "C$",
};

export function inferCurrency(symbol = "", market = "", currency = "") {
  if (currency) return currency.toUpperCase();

  const upper = symbol.toUpperCase();

  if (
    market === "CRYPTO" ||
    market === "CCC" ||
    market === "CCY" ||
    market === "NASDAQ" ||
    market === "NYSE" ||
    upper.includes("-USD") ||
    upper.endsWith("-USD")
  ) {
    return "USD";
  }

  if (upper.endsWith(".NS") || upper.endsWith(".BO")) {
    return "INR";
  }

  if (upper.endsWith(".AX")) {
    return "AUD";
  }

  return "INR";
}

export function formatPrice(price, currency = "INR") {
  if (price === null || price === undefined || Number.isNaN(Number(price))) {
    return "--";
  }

  const code = inferCurrency("", "", currency);
  const symbol = CURRENCY_SYMBOLS[code] || `${code} `;

  return `${symbol}${Number(price).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPriceFromQuote(quote, stock = {}) {
  if (quote?.price == null) return "--";

  const currency = inferCurrency(
    quote.symbol || stock.symbol,
    stock.market,
    quote.currency,
  );

  return formatPrice(quote.price, currency);
}

function getChangeCurrency(quote, stock = {}) {
  return inferCurrency(
    quote?.symbol || stock.symbol,
    stock.market,
    quote?.currency,
  );
}

export function formatChangeAmount(quote, stock = {}) {
  const amount = quote?.changeAmount;

  if (amount == null || Number.isNaN(Number(amount))) return "--";

  const currency = getChangeCurrency(quote, stock);
  const currencySymbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  const num = Number(amount);
  const sign = num > 0 ? "+" : num < 0 ? "-" : "";

  return `${sign}${currencySymbol}${Math.abs(num).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatChangePercent(quote) {
  const pct = quote?.change;

  if (pct == null || Number.isNaN(Number(pct))) return "--";

  const pctNum = Number(pct);
  const pctSign = pctNum > 0 ? "+" : "";

  return `${pctSign}${pctNum.toFixed(2)}%`;
}

export function formatDailyChange(quote, stock = {}) {
  const amount = formatChangeAmount(quote, stock);
  const percent = formatChangePercent(quote);

  if (amount === "--" && percent === "--") return "--";
  if (percent === "--") return amount;

  return `${amount} (${percent})`;
}
