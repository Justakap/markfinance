const SummaryCards = ({ watchlist, marketData = [], rsiTimeframe = "1d" }) => {
  const getRsiData = (stock) => {
    switch (rsiTimeframe) {
      case "1m":
        return stock.rsi1m;
      case "5m":
        return stock.rsi5m;
      case "15m":
        return stock.rsi15m;
      case "1h":
        return stock.hourlyRsi;
      default:
        return stock.rsi;
    }
  };

  const getTimeframeLabel = () => {
    switch (rsiTimeframe) {
      case "1m":
        return "1 Min";
      case "5m":
        return "5 Min";
      case "15m":
        return "15 Min";
      case "1h":
        return "1 Hour";
      default:
        return "Daily";
    }
  };

  let positiveStocks = 0;
  let negativeStocks = 0;
  const positiveStockList = [];
  const negativeStockList = [];
  const rsiValues = [];

  marketData.forEach((stock) => {
    if (stock.change > 0) {
      positiveStocks += 1;
      positiveStockList.push(stock.symbol);
    }
    if (stock.change < 0) {
      negativeStocks += 1;
      negativeStockList.push(stock.symbol);
    }

    const activeRsi = getRsiData(stock);
    if (activeRsi !== null && activeRsi !== undefined) {
      rsiValues.push(activeRsi);
    }
  });

  const avgRsi =
    rsiValues.length > 0
      ? (rsiValues.reduce((a, b) => a + b, 0) / rsiValues.length).toFixed(2)
      : "--";

  const cards = [
    { title: "Stocks", value: watchlist?.stocks?.length || 0 },
    {
      title: "Positive",
      value: positiveStocks,
      tooltip: {
        logic: "Stocks with positive % change",
        stocks: positiveStockList,
      },
    },
    {
      title: "Negative",
      value: negativeStocks,
      tooltip: {
        logic: "Stocks with negative % change",
        stocks: negativeStockList,
      },
    },
    { title: `Avg ${getTimeframeLabel()} RSI`, value: avgRsi },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 mt-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div
            key={card.title}
            className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm"
          >
            <p className="text-gray-500 text-[11px] uppercase font-medium tracking-wide">
              {card.title}
            </p>
            <h2 className="text-lg font-bold mt-1 text-gray-900">{card.value}</h2>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SummaryCards;
