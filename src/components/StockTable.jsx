import { useEffect, useRef, useState } from "react";
import StockModal from "./StockModal";
import StockSearchDropdown from "./StockSearchDropdown";

const StockTable = ({
  selectedWatchlist,
  watchlist,
  marketData = [],
  rsiTimeframe,
  setRsiTimeframe,
  refreshWatchlist,
}) => {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const categoryRef = useRef(null);
  const [sortField, setSortField] = useState("symbol");
  const [sortDirection, setSortDirection] = useState("asc");

  const [selectedCategories, setSelectedCategories] = useState([]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setShowCategoryFilter(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const allStocks = watchlist?.stocks || [];

  const categories = [
    ...new Set(allStocks.map((stock) => stock.sector).filter(Boolean)),
  ];

  const toggleCategory = (category) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((item) => item !== category);
      }

      return [...prev, category];
    });
  };

  const getQuote = (symbol) => {
    if (!Array.isArray(marketData)) {
      console.log("marketData is not an array:", marketData);
      return null;
    }

    return marketData.find((item) => item.symbol === symbol);
  };

  const getRsiData = (quote) => {
    switch (rsiTimeframe) {
      case "1m":
        return {
          rsi: quote?.rsi1m,
          prev: quote?.prevRsi1m,
          change: quote?.rsi1mChange,
        };

      case "5m":
        return {
          rsi: quote?.rsi5m,
          prev: quote?.prevRsi5m,
          change: quote?.rsi5mChange,
        };

      case "15m":
        return {
          rsi: quote?.rsi15m,
          prev: quote?.prevRsi15m,
          change: quote?.rsi15mChange,
        };

      case "1h":
        return {
          rsi: quote?.hourlyRsi,
          prev: quote?.prevHourlyRsi,
          change: quote?.hourlyRsiChange,
        };

      default:
        return {
          rsi: quote?.rsi,
          prev: quote?.prevRsi,
          change: quote?.rsiChange,
        };
    }
  };
  let stocks =
    selectedCategories.length === 0
      ? [...allStocks]
      : allStocks.filter((stock) => selectedCategories.includes(stock.sector));

  stocks.sort((a, b) => {
    const quoteA = getQuote(a.symbol);
    const quoteB = getQuote(b.symbol);

    let valueA;
    let valueB;

    switch (sortField) {
      case "symbol":
        valueA = a.symbol;
        valueB = b.symbol;
        break;

      case "company":
        valueA = a.name;
        valueB = b.name;
        break;

      case "rate":
        valueA = quoteA?.price || 0;
        valueB = quoteB?.price || 0;
        break;

      case "change":
        valueA = quoteA?.change || 0;
        valueB = quoteB?.change || 0;
        break;

      case "volume":
        valueA = quoteA?.volume || 0;
        valueB = quoteB?.volume || 0;
        break;

      case "ema":
        valueA = quoteA?.ema20 || 0;
        valueB = quoteB?.ema20 || 0;
        break;

      case "rsi":
        valueA = getRsiData(quoteA)?.rsi || 0;
        valueB = getRsiData(quoteB)?.rsi || 0;
        break;

      case "prevRsi":
        valueA = getRsiData(quoteA)?.prev || 0;
        valueB = getRsiData(quoteB)?.prev || 0;
        break;

      case "rsiChange":
        valueA = getRsiData(quoteA)?.change || 0;
        valueB = getRsiData(quoteB)?.change || 0;
        break;

      case "pe":
        valueA = quoteA?.pe || 0;
        valueB = quoteB?.pe || 0;
        break;

      default:
        valueA = 0;
        valueB = 0;
    }

    if (typeof valueA === "string") {
      return sortDirection === "asc"
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    }

    return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
  });

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return "↕";
    }

    return sortDirection === "asc" ? "↑" : "↓";
  };

  const getMarketColor = (market) => {
    switch (market) {
      case "NSE":
        return "bg-blue-100 text-blue-700";

      case "BSE":
        return "bg-indigo-100 text-indigo-700";

      case "NASDAQ":
        return "bg-green-100 text-green-700";

      case "NYSE":
        return "bg-purple-100 text-purple-700";

      case "CRYPTO":
        return "bg-orange-100 text-orange-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const displaySymbol = (symbol) => {
    return symbol.replace(".NS", "").replace(".BO", "");
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  if (!selectedWatchlist || !watchlist) {
    return (
      <div className="max-w-7xl mx-auto px-6 mt-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm min-h-[650px] flex items-center justify-center">
          <div className="text-center max-w-lg px-8">
            <div className="text-6xl mb-6">📊</div>

            <h2 className="text-3xl font-bold text-gray-800">
              Welcome to Mark Finance
            </h2>

            <p className="text-gray-500 mt-4 text-lg">
              Start by creating your first watchlist to track stocks, monitor
              RSI signals, analyze volume breakouts and build custom trading
              strategies.
            </p>

            <div className="mt-8 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-3 rounded-lg border border-blue-100">
              <span className="font-medium">
                Click the "+ New" button above to create a watchlist
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-10 text-sm">
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="text-2xl mb-2">📈</div>
                <div className="font-medium">RSI Analysis</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="text-2xl mb-2">📊</div>
                <div className="font-medium">Volume Tracking</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="text-2xl mb-2">⚡</div>
                <div className="font-medium">Buy/Sell Signals</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 mt-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[650px]">
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <StockSearchDropdown
              selectedWatchlist={selectedWatchlist}
              watchlistStocks={stocks}
              refreshWatchlist={refreshWatchlist}
            />

            <div className="flex items-center gap-4">
              <div ref={categoryRef} className="relative">
                {" "}
                <button
                  onClick={() => setShowCategoryFilter(!showCategoryFilter)}
                  className="border border-gray-300 px-4 py-2 rounded-lg bg-white text-sm"
                >
                  Categories
                  {selectedCategories.length > 0 &&
                    ` (${selectedCategories.length})`}
                  ▼
                </button>
                {showCategoryFilter && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-3 max-h-80 overflow-y-auto">
                    {categories.length > 0 ? (
                      categories.map((category) => (
                        <label
                          key={category}
                          className="flex items-center gap-2 py-1 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category)}
                            onChange={() => toggleCategory(category)}
                          />

                          <span className="text-sm">{category}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">
                        No categories found
                      </p>
                    )}
                  </div>
                )}
              </div>
              <select
                value={rsiTimeframe}
                onChange={(e) => setRsiTimeframe(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="1m">1 Min RSI</option>
                <option value="5m">5 Min RSI</option>
                <option value="15m">15 Min RSI</option>
                <option value="1h">1 Hour RSI</option>
                <option value="1d">Daily RSI</option>
              </select>

              <button
                onClick={() => setShowAnalysis(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition"
              >
                Analysis
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th
                    onClick={() => handleSort("symbol")}
                    className="p-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:text-blue-600 select-none"
                  >
                    Symbol {getSortIcon("symbol")}
                  </th>

                  <th
                    onClick={() => handleSort("company")}
                    className="p-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:text-blue-600 select-none"
                  >
                    Company {getSortIcon("company")}
                  </th>

                  <th
                    onClick={() => handleSort("rate")}
                    className="p-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:text-blue-600 select-none"
                  >
                    Rate {getSortIcon("rate")}
                  </th>

                  <th
                    onClick={() => handleSort("change")}
                    className="p-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:text-blue-600 select-none"
                  >
                    Change {getSortIcon("change")}
                  </th>

                  <th
                    onClick={() => handleSort("volume")}
                    className="p-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:text-blue-600 select-none"
                  >
                    Volume {getSortIcon("volume")}
                  </th>

                  <th
                    onClick={() => handleSort("ema")}
                    className="p-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:text-blue-600 select-none"
                  >
                    20 D EMA {getSortIcon("ema")}
                  </th>

                  <th
                    onClick={() => handleSort("rsi")}
                    className="p-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:text-blue-600 select-none"
                  >
                    RSI {getSortIcon("rsi")}
                  </th>

                  <th
                    onClick={() => handleSort("prevRsi")}
                    className="p-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:text-blue-600 select-none"
                  >
                    Prev RSI {getSortIcon("prevRsi")}
                  </th>

                  <th
                    onClick={() => handleSort("rsiChange")}
                    className="p-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:text-blue-600 select-none"
                  >
                    Chng RSI {getSortIcon("rsiChange")}
                  </th>

                  <th
                    onClick={() => handleSort("pe")}
                    className="p-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:text-blue-600 select-none"
                  >
                    PE {getSortIcon("pe")}
                  </th>
                </tr>
              </thead>

              <tbody>
                {stocks.length > 0 ? (
                  stocks.map((stock) => {
                    const quote = getQuote(stock.symbol);
                    const rsiData = getRsiData(quote);

                    const currentRsi = rsiData.rsi;
                    const currentPrevRsi = rsiData.prev;
                    const currentRsiChange = rsiData.change;

                    return (
                      <tr
                        key={stock._id}
                        className="border-t border-gray-200 hover:bg-blue-50 transition"
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-blue-700">
                              {displaySymbol(stock.symbol)}
                            </span>

                            <span
                              className={`text-[10px] px-2 py-1 rounded-full font-medium ${getMarketColor(
                                stock.market,
                              )}`}
                            >
                              {stock.market}
                            </span>
                          </div>
                        </td>

                        <td className="p-3 text-gray-800">{stock.name}</td>
                        <td className="p-3 text-gray-800">
                          ₹{quote?.price?.toFixed(2) || "--"}
                        </td>

                        <td
                          className={`p-3 font-semibold ${
                            quote?.change > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {quote?.change?.toFixed(2) || "--"}%
                        </td>

                        <td className="p-3 text-gray-800">
                          {quote?.volume?.toLocaleString() || "--"}
                        </td>

                        <td className="p-3 text-gray-800">
                          {quote?.ema20 || "--"}
                        </td>

                        <td className="p-3 text-gray-800">
                          {currentRsi || "--"}
                        </td>
                        <td className="p-3 text-gray-800">
                          {currentPrevRsi || "--"}
                        </td>

                        <td
                          className={`p-3 font-semibold ${
                            currentRsiChange > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {currentRsiChange > 0 ? "+" : ""}
                          {currentRsiChange?.toFixed(2) || "--"}%
                        </td>

                        <td className="p-3 text-gray-800">
                          {quote?.pe?.toFixed(2) || "--"}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9" className="text-center p-8 text-gray-500">
                      No stocks added to this watchlist
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {showAnalysis && (
        <StockModal
          closeModal={() => setShowAnalysis(false)}
          marketData={marketData}
          rsiTimeframe={rsiTimeframe}
        />
      )}{" "}
    </>
  );
};

export default StockTable;
