import { useEffect, useRef, useState } from "react";
import { Loader2, Minus, Plus } from "lucide-react";
import { API_URL } from "../config/api";
import { showError, showSuccess } from "../utils/toast";

const StockSearchDropdown = ({
  selectedWatchlist,
  watchlistStocks,
  refreshWatchlist,
  onRemoveStock,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [addingSymbol, setAddingSymbol] = useState(null);
  const [removingSymbol, setRemovingSymbol] = useState(null);

  const dropdownRef = useRef(null);

  const searchStocks = async () => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/search-stock?q=${query}`);
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

  const isAdded = (symbol) =>
    watchlistStocks?.some(
      (stock) => stock.symbol?.toUpperCase() === symbol?.toUpperCase(),
    );

  const addStock = async (stock) => {
    setAddingSymbol(stock.symbol);

    try {
      const res = await fetch(
        `${API_URL}/api/watchlists/${selectedWatchlist}/stocks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: stock.symbol,
            name: stock.name,
            exchange: stock.exchange,
            market: stock.market,
            assetType: stock.assetType,
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to add stock");
      }

      await refreshWatchlist();
      showSuccess(`${stock.symbol} added to watchlist`);
    } catch (error) {
      console.log(error);
      showError(error.message || "Failed to add stock");
    } finally {
      setAddingSymbol(null);
    }
  };

  const removeStock = async (stock) => {
    setRemovingSymbol(stock.symbol);
    onRemoveStock?.(stock.symbol);

    try {
      const res = await fetch(
        `${API_URL}/api/watchlists/${selectedWatchlist}/stocks/${encodeURIComponent(stock.symbol)}`,
        { method: "DELETE" },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to remove stock");
      }
    } catch (error) {
      console.log(error);
      showError(error.message || "Failed to remove stock");
      await refreshWatchlist();
    } finally {
      setRemovingSymbol(null);
    }
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
      case "CCC":
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
            const isAdding = addingSymbol === stock.symbol;
            const isRemoving = removingSymbol === stock.symbol;

            return (
              <div
                key={`${stock.symbol}-${index}`}
                className={`flex justify-between items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${added ? "bg-blue-50/40" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{stock.symbol}</p>
                  <p className="text-sm text-gray-600 truncate">{stock.name}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span
                      className={`text-[10px] px-2 py-1 rounded-full font-medium ${getMarketColor(stock.market)}`}
                    >
                      {stock.market}
                    </span>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                      {stock.assetType}
                    </span>
                    {added && (
                      <span className="text-[10px] px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                        In watchlist
                      </span>
                    )}
                  </div>
                </div>

                {added ? (
                  <button
                    type="button"
                    disabled={isRemoving}
                    onClick={() => removeStock(stock)}
                    title="Remove from watchlist"
                    className="ml-3 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white w-9 h-9 rounded-full font-bold transition flex items-center justify-center"
                  >
                    {isRemoving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Minus size={16} />
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isAdding}
                    onClick={() => addStock(stock)}
                    title="Add to watchlist"
                    className="ml-3 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white w-9 h-9 rounded-full font-bold transition flex items-center justify-center"
                  >
                    {isAdding ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Plus size={16} />
                    )}
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
