import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import StockModal from "./StockModal";
import StockSearchDropdown from "./StockSearchDropdown";
import StockTableRow from "./StockTableRow";
import { findQuoteForSymbol } from "../utils/symbols";
import { apiFetch } from "../utils/api";
import { confirmAction, showError, showSuccess } from "../utils/toast";

const RSI_TIMEFRAMES = [
  { value: "1m", label: "1 Min" },
  { value: "5m", label: "5 Min" },
  { value: "15m", label: "15 Min" },
  { value: "1h", label: "1 Hour" },
  { value: "1d", label: "Daily" },
];

const ROW_HEIGHT = 56;
const VIRTUAL_THRESHOLD = 30;
const VIEWPORT_HEIGHT = 520;

const getRsiData = (quote, rsiTimeframe) => {
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

const StockTable = ({
  selectedWatchlist,
  watchlist,
  marketData = [],
  rsiTimeframe,
  setRsiTimeframe,
  refreshWatchlist,
  onRemoveStocks,
  loadingMarket = false,
  loadingMore = false,
  marketError = "",
}) => {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const categoryRef = useRef(null);
  const [sortField, setSortField] = useState("symbol");
  const [sortDirection, setSortDirection] = useState("asc");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSymbols, setSelectedSymbols] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setShowCategoryFilter(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allStocks = useMemo(() => watchlist?.stocks || [], [watchlist?.stocks]);
  const categories = [
    ...new Set(allStocks.map((stock) => stock.sector).filter(Boolean)),
  ];

  const toggleCategory = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category],
    );
  };

  const getQuote = useCallback(
    (symbol) => findQuoteForSymbol(marketData, symbol),
    [marketData],
  );

  const stocks = useMemo(() => {
    let list =
      selectedCategories.length === 0
        ? [...allStocks]
        : allStocks.filter((stock) =>
            selectedCategories.includes(stock.sector),
          );

    list.sort((a, b) => {
      const quoteA = findQuoteForSymbol(marketData, a.symbol);
      const quoteB = findQuoteForSymbol(marketData, b.symbol);
      const rsiA = getRsiData(quoteA, rsiTimeframe);
      const rsiB = getRsiData(quoteB, rsiTimeframe);

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
          valueA = rsiA?.rsi || 0;
          valueB = rsiB?.rsi || 0;
          break;
        case "prevRsi":
          valueA = rsiA?.prev || 0;
          valueB = rsiB?.prev || 0;
          break;
        case "rsiChange":
          valueA = rsiA?.change || 0;
          valueB = rsiB?.change || 0;
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

    return list;
  }, [
    allStocks,
    selectedCategories,
    marketData,
    sortField,
    sortDirection,
    rsiTimeframe,
  ]);

  const getSortIcon = (field) => {
    if (sortField !== field) return "↕";
    return sortDirection === "asc" ? "↑" : "↓";
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const useVirtual = stocks.length > VIRTUAL_THRESHOLD;
  const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + 4;
  const startIndex = useVirtual
    ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 2)
    : 0;
  const endIndex = useVirtual
    ? Math.min(stocks.length, startIndex + visibleCount)
    : stocks.length;
  const visibleStocks = stocks.slice(startIndex, endIndex);
  const paddingTop = useVirtual ? startIndex * ROW_HEIGHT : 0;
  const paddingBottom = useVirtual
    ? Math.max(0, (stocks.length - endIndex) * ROW_HEIGHT)
    : 0;

  const handleScroll = (event) => {
    setScrollTop(event.currentTarget.scrollTop);
  };

  const toggleSelect = (symbol) => {
    setSelectionMode(true);
    setSelectedSymbols((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      if (next.size === 0) {
        setSelectionMode(false);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedSymbols.size === stocks.length) {
      setSelectedSymbols(new Set());
      setSelectionMode(false);
      return;
    }

    setSelectionMode(true);
    setSelectedSymbols(new Set(stocks.map((s) => s.symbol)));
  };

  const clearSelection = () => {
    setSelectedSymbols(new Set());
    setSelectionMode(false);
  };

  const deleteSelected = async () => {
    if (!selectedSymbols.size || !selectedWatchlist) return;

    const count = selectedSymbols.size;
    const symbols = [...selectedSymbols];

    const confirmed = await confirmAction({
      title: "Remove stocks",
      message: `Remove ${count} stock${count > 1 ? "s" : ""} from this watchlist?`,
      confirmText: "Remove",
    });

    if (!confirmed) return;

    setDeleting(true);
    onRemoveStocks?.(symbols);
    clearSelection();

    try {
      await apiFetch(
        `/api/watchlists/${selectedWatchlist}/stocks/bulk-remove`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbols }),
        },
      );

      showSuccess(
        `Removed ${count} stock${count > 1 ? "s" : ""} from watchlist`,
      );
    } catch (error) {
      showError(error.message || "Failed to remove stocks");
      await refreshWatchlist();
    } finally {
      setDeleting(false);
    }
  };

  const handleRemoveFromDropdown = (symbol) => {
    setSelectedSymbols((prev) => {
      const next = new Set(prev);
      next.delete(symbol);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
    onRemoveStocks?.([symbol]);
  };

  useEffect(() => {
    setSelectedSymbols(new Set());
    setSelectionMode(false);
  }, [selectedWatchlist]);

  const colSpan = selectionMode ? 11 : 10;

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
              Create a watchlist to start tracking stocks.
            </p>
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
              watchlistStocks={allStocks}
              refreshWatchlist={refreshWatchlist}
              onRemoveStock={handleRemoveFromDropdown}
            />
            <div className="flex items-center gap-3">
              {selectionMode && selectedSymbols.size > 0 && (
                <>
                  <button
                    type="button"
                    onClick={deleteSelected}
                    disabled={deleting}
                    className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    {deleting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    Delete ({selectedSymbols.size})
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="border border-gray-300 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </>
              )}
              <div ref={categoryRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowCategoryFilter(!showCategoryFilter)}
                  className="border border-gray-300 px-4 py-2 rounded-lg bg-white text-sm"
                >
                  Categories
                  {selectedCategories.length > 0 &&
                    ` (${selectedCategories.length})`}{" "}
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
                      <p className="text-sm text-gray-500">No categories</p>
                    )}
                  </div>
                )}
              </div>

              <select
                value={rsiTimeframe}
                onChange={(e) => setRsiTimeframe(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[110px]"
              >
                {RSI_TIMEFRAMES.map((tf) => (
                  <option key={tf.value} value={tf.value}>
                    {tf.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowAnalysis(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition"
              >
                Analysis
              </button>
            </div>
          </div>

          {marketError && (
            <div className="mx-4 mt-3 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
              {marketError}
            </div>
          )}

          {loadingMarket && (
            <div className="mx-4 mt-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2 text-sm text-blue-700">
              Loading market data from cache…
            </div>
          )}

          {loadingMore && !loadingMarket && (
            <div className="mx-4 mt-3 rounded-lg bg-slate-50 border border-slate-200 px-4 py-2 text-sm text-slate-600">
              Loading more stocks…
            </div>
          )}

          <div
            ref={scrollRef}
            className="overflow-x-auto"
            style={
              useVirtual
                ? { maxHeight: VIEWPORT_HEIGHT, overflowY: "auto" }
                : undefined
            }
            onScroll={useVirtual ? handleScroll : undefined}
          >
            <table className="w-full">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  {selectionMode && (
                    <th className="p-3 w-10">
                      <input
                        type="checkbox"
                        checked={
                          stocks.length > 0 &&
                          selectedSymbols.size === stocks.length
                        }
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                  )}
                  {[
                    ["symbol", "Symbol"],
                    ["company", "Company"],
                    ["rate", "Rate"],
                    ["change", "Change"],
                    ["volume", "Volume"],
                    ["ema", "20 D EMA"],
                    ["rsi", "RSI"],
                    ["prevRsi", "Prev RSI"],
                    ["rsiChange", "Chng RSI"],
                    ["pe", "PE"],
                  ].map(([field, label]) => (
                    <th
                      key={field}
                      onClick={() => handleSort(field)}
                      className="p-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:text-blue-600 select-none whitespace-nowrap"
                    >
                      {label} {getSortIcon(field)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paddingTop > 0 && (
                  <tr aria-hidden="true">
                    <td
                      colSpan={colSpan}
                      style={{ height: paddingTop, padding: 0, border: 0 }}
                    />
                  </tr>
                )}
                {stocks.length > 0 ? (
                  visibleStocks.map((stock) => {
                    const quote = getQuote(stock.symbol);
                    const rsiData = getRsiData(quote, rsiTimeframe);

                    return (
                      <StockTableRow
                        key={stock._id || stock.symbol}
                        stock={stock}
                        quote={quote}
                        rsiData={rsiData}
                        selectionMode={selectionMode}
                        isSelected={selectedSymbols.has(stock.symbol)}
                        onToggleSelect={toggleSelect}
                      />
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={colSpan}
                      className="text-center p-8 text-gray-500"
                    >
                      No stocks in this watchlist
                    </td>
                  </tr>
                )}
                {paddingBottom > 0 && (
                  <tr aria-hidden="true">
                    <td
                      colSpan={colSpan}
                      style={{ height: paddingBottom, padding: 0, border: 0 }}
                    />
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
      )}
    </>
  );
};

export default StockTable;
