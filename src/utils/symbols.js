export function normalizeSymbol(symbol = "") {
  return String(symbol).toUpperCase().replace(/\.(NS|BO|AX)$/i, "");
}

export function findQuoteForSymbol(marketData, symbol) {
  if (!Array.isArray(marketData) || !symbol) return null;

  const target = normalizeSymbol(symbol);

  return (
    marketData.find((item) => normalizeSymbol(item.symbol) === target) ||
    marketData.find((item) => item.symbol === symbol) ||
    null
  );
}
