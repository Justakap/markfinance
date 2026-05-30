const SummaryCards = ({ watchlist, marketData = [], rsiTimeframe = "1d" }) => {
  const getRsiData = (stock, timeframe) => {
    switch (timeframe) {
      case "1m":
        return {
          rsi: stock.rsi1m,
          change: stock.rsi1mChange,
        };

      case "5m":
        return {
          rsi: stock.rsi5m,
          change: stock.rsi5mChange,
        };

      case "15m":
        return {
          rsi: stock.rsi15m,
          change: stock.rsi15mChange,
        };

      case "1h":
        return {
          rsi: stock.hourlyRsi,
          change: stock.hourlyRsiChange,
        };

      default:
        return {
          rsi: stock.rsi,
          change: stock.rsiChange,
        };
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
    const rsiData = getRsiData(stock, rsiTimeframe);
    const activeRsi = rsiData.rsi;

    if (stock.change > 0) {
      positiveStocks++;
      positiveStockList.push(stock.symbol);
    }

    if (stock.change < 0) {
      negativeStocks++;
      negativeStockList.push(stock.symbol);
    }

    if (activeRsi !== null && activeRsi !== undefined) {
      rsiValues.push(activeRsi);
    }
  });

  const avgRsi =
    rsiValues.length > 0
      ? (rsiValues.reduce((a, b) => a + b, 0) / rsiValues.length).toFixed(2)
      : "--";

  const summary = {
    stocks: watchlist?.stocks?.length || 0,
    positiveStocks,
    negativeStocks,
    avgRsi,
    positiveStockList,
    negativeStockList,
  };


  const cards = [
    {
      title: "Stocks",
      value: summary.stocks,
    },
    {
      title: "Positive",
      value: summary.positiveStocks,

      tooltip: {
        logic: "Stocks with positive % change",

        stocks: summary.positiveStockList,
      },
    },
    {
      title: "Negative",
      value: summary.negativeStocks,

      tooltip: {
        logic: "Stocks with negative % change",

        stocks: summary.negativeStockList,
      },
    },
    {
      title: `Avg ${getTimeframeLabel()} RSI`,

      value: summary.avgRsi,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 mt-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center gap-2">
              <p className="text-gray-500 text-[11px] uppercase font-medium tracking-wide">
                {card.title}
              </p>

              {card.tooltip && (
                <div className="relative group">
                  <span className="cursor-pointer text-blue-500 text-xs font-bold">
                    ⓘ
                  </span>

                  <div className="absolute left-0 top-5 hidden group-hover:block w-72 bg-white border border-gray-200 rounded-lg shadow-xl p-3 z-50">
                    <p className="font-semibold text-sm mb-2">Logic</p>

                    <p className="text-xs text-gray-600 mb-3">
                      {card.tooltip.logic}
                    </p>

                    {card.tooltip.stocks?.length > 0 && (
                      <>
                        <p className="font-semibold text-sm mb-2">Stocks</p>

                        <div className="max-h-32 overflow-y-auto">
                          {card.tooltip.stocks.map((stock) => (
                            <div
                              key={stock}
                              className="text-xs text-gray-700 py-1"
                            >
                              {stock.replace(".NS", "").replace(".BO", "")}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <h2
              className={`text-lg font-bold mt-1 ${
                card.title === "Positive"
                  ? "text-green-600"
                  : card.title === "Negative"
                    ? "text-red-600"
                    : card.title.includes("RSI") && summary.avgRsi !== "--"
                      ? Number(summary.avgRsi) > 60
                        ? "text-green-600"
                        : Number(summary.avgRsi) < 40
                          ? "text-red-600"
                          : "text-gray-900"
                      : "text-gray-900"
              }`}
            >
              {card.value}
            </h2>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SummaryCards;
