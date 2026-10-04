import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Minus, Plus } from "lucide-react";
import { apiFetch } from "../utils/api";
import { showError, showSuccess } from "../utils/toast";

const StockSearchDropdown = ({
  selectedWatchlist,
  watchlistStocks,
  refreshWatchlist,
  onRemoveStock,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const [addingSymbol, setAddingSymbol] = useState(null);
  const [removingSymbol, setRemovingSymbol] = useState(null);

  const dropdownRef = useRef(null);
  const searchAbortRef = useRef(null);

  const searchStocks = useCallback(async () => {
    if (query.trim().length < 2) {
      setResults([]);
      setSearchError("");
      return;
    }

    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }

    const controller = new AbortController();
    searchAbortRef.current = controller;

    setSearching(true);
    setSearchError("");

    try {
      const data = await apiFetch(
        `/api/search?q=${encodeURIComponent(query.trim())}`,
        { signal: controller.signal },
      );
      setResults(Array.isArray(data) ? data : []);
    } catch (error) {
      if (error.name === "AbortError") return;

      setResults([]);

      if (error.status === 429) {
        setSearchError(
          error.message ||
            "Too many searches. Pause for a few seconds and try again.",
        );
      } else {
        setSearchError(error.message || "Search failed");
      }
    } finally {
      if (!controller.signal.aborted) {
        setSearching(false);
      }
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchStocks();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchStocks]);

  useEffect(() => {
    return () => {
      searchAbortRef.current?.abort();
    };
  }, []);

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

  const isAdded = (stock) =>
    watchlistStocks?.some(
      (item) =>
        item.instrumentKey === stock.instrumentKey ||
        item.symbol?.toUpperCase() === stock.symbol?.toUpperCase(),
    );

  const addStock = async (stock) => {
    setAddingSymbol(stock.instrumentKey || stock.symbol);

    try {
      await apiFetch(`/api/watchlists/${selectedWatchlist}/stocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: stock.symbol,
          name: stock.name,
          instrumentKey: stock.instrumentKey,
          exchange: stock.exchange,
          instrumentType: stock.instrumentType || stock.type,
          market: stock.exchange,
          assetType: stock.instrumentType || stock.type,
        }),
      });

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
    setRemovingSymbol(stock.instrumentKey || stock.symbol);
    onRemoveStock?.(stock.instrumentKey || stock.symbol);

    try {
      await apiFetch(
        `/api/watchlists/${selectedWatchlist}/stocks/${encodeURIComponent(stock.instrumentKey || stock.symbol)}`,
        { method: "DELETE" },
      );
    } catch (error) {
      console.log(error);
      showError(error.message || "Failed to remove stock");
      await refreshWatchlist();
    } finally {
      setRemovingSymbol(null);
    }
  };

  const getTypeBadge = (type = "") => {
    const value = type.toUpperCase();

    if (value === "EQ") return "EQ";
    if (value === "INDEX") return "IDX";
    if (value.includes("FUT")) return "FUT";
    if (value.includes("OPT")) return "OPT";
    if (value === "ETF") return "ETF";
    if (value.includes("COM")) return "COM";
    return value || "INST";
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
        placeholder="Search stocks, futures, options, commodities..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full border border-gray-300 px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
      />

      {searching && query.trim().length >= 2 && (
        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
          <Loader2 size={12} className="animate-spin" />
          Searching…
        </p>
      )}

      {searchError && (
        <p className="text-xs text-red-600 mt-1">{searchError}</p>
      )}

      {results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-40 max-h-96 overflow-y-auto">
          {results.map((stock, index) => {
            const rowKey = stock.instrumentKey || `${stock.symbol}-${index}`;
            const added = isAdded(stock);
            const isAdding = addingSymbol === rowKey;
            const isRemoving = removingSymbol === rowKey;

            return (
              <div
                key={rowKey}
                className={`flex justify-between items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${added ? "bg-blue-50/40" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{stock.symbol}</p>
                  <p className="text-sm text-gray-600 truncate">{stock.name}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span
                      className={`text-[10px] px-2 py-1 rounded-full font-medium ${getMarketColor(stock.exchange)}`}
                    >
                      {stock.exchange}
                    </span>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                      {getTypeBadge(stock.instrumentType || stock.type)}
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
