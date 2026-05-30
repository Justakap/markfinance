import { useEffect, useRef, useState } from "react";
import { API_URL } from "../config/api";

const StockSearchDropdown = ({
  selectedWatchlist,
  watchlistStocks,
  refreshWatchlist,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const dropdownRef = useRef(null);

  const searchStocks = async () => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/api/search-stock?q=${query}`,
      );

      const data = await res.json();

      setResults(data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      searchStocks();
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setResults([]);
      }
    };

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setResults([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);

      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const addStock = async (stock) => {
    try {
      await fetch(
        `${API_URL}/api/watchlists/${selectedWatchlist}/stocks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            symbol: stock.symbol,
            name: stock.name,
            exchange: stock.exchange,
            market: stock.market,
            assetType: stock.assetType,
          }),
        },
      );

      await refreshWatchlist();
    } catch (error) {
      console.log(error);
    }
  };

  const removeStock = async (stock) => {
    try {
      await fetch(
        `${API_URL}/api/watchlists/${selectedWatchlist}/stocks/${stock.symbol}`,
        {
          method: "DELETE",
        },
      );

      await refreshWatchlist();
    } catch (error) {
      console.log(error);
    }
  };

  const isAdded = (symbol) => {
    return watchlistStocks?.some((stock) => stock.symbol === symbol);
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

  return (
    <div ref={dropdownRef} className="relative w-96">
      <input
        type="text"
        placeholder="Search Stocks, Crypto, ETF..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full border border-gray-300 px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
      />

      {results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-40 max-h-96 overflow-y-auto">
          {results.map((stock, index) => {
            const added = isAdded(stock.symbol);

            return (
              <div
                key={`${stock.symbol}-${index}`}
                className="flex justify-between items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{stock.symbol}</p>

                  <p className="text-sm text-gray-600 truncate">{stock.name}</p>

                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span
                      className={`text-[10px] px-2 py-1 rounded-full font-medium ${getMarketColor(
                        stock.market,
                      )}`}
                    >
                      {stock.market}
                    </span>

                    <span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                      {stock.assetType}
                    </span>
                  </div>
                </div>

                {added ? (
                  <button
                    onClick={() => removeStock(stock)}
                    className="ml-3 bg-blue-600 hover:bg-blue-700 text-white w-9 h-9 rounded-full font-bold transition"
                  >
                    ✓
                  </button>
                ) : (
                  <button
                    onClick={() => addStock(stock)}
                    className="ml-3 bg-green-600 hover:bg-green-700 text-white w-9 h-9 rounded-full font-bold transition"
                  >
                    +
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StockSearchDropdown;
