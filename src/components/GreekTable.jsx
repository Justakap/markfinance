import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import StockSearchDropdown from "./StockSearchDropdown";
import GreekTableRow from "./GreekTableRow";
import { apiFetch } from "../utils/api";
import { toFiniteNumber } from "../utils/indicators";
import { confirmAction, showError, showSuccess } from "../utils/toast";

// xlsx/jsPDF are large and only needed once the export menu is actually used —
// split them into their own chunk instead of loading them with the table.
const TableExportMenu = lazy(() => import("./TableExportMenu"));

const ROW_HEIGHT = 56;
const VIRTUAL_THRESHOLD = 20;
const VIEWPORT_HEIGHT = 520;

const formatSignedLabel = (value) => {
  if (value == null || Number.isNaN(Number(value))) return "--";
  const numeric = Number(value);
  return `${numeric > 0 ? "+" : ""}${numeric.toFixed(2)}`;
};

const GreekTable = ({
  selectedWatchlist,
  watchlist,
  marketData = [],
  refreshWatchlist,
  onRemoveStock,
  loadingMarket = false,
  loadingMore = false,
  marketError = "",
}) => {
  const [sortField, setSortField] = useState("symbol");
  const [sortDirection, setSortDirection] = useState("asc");
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSymbols, setSelectedSymbols] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  const allStocks = useMemo(() => watchlist?.stocks || [], [watchlist?.stocks]);

  const quoteMap = useMemo(() => {
    const map = new Map();
    marketData.forEach((quote) => {
      if (quote.instrumentKey) map.set(quote.instrumentKey, quote);
      if (quote.symbol) map.set(quote.symbol, quote);
    });
    return map;
  }, [marketData]);

  const getQuote = useCallback(
    (stock) =>
      quoteMap.get(stock.instrumentKey) || quoteMap.get(stock.symbol) || null,
    [quoteMap],
  );

  const stocks = useMemo(() => {
    const list = [...allStocks];

    list.sort((a, b) => {
      const quoteA = getQuote(a);
      const quoteB = getQuote(b);

      let valueA;
      let valueB;

      switch (sortField) {
        case "symbol":
          valueA = a.symbol || "";
          valueB = b.symbol || "";
          break;
        case "company":
          valueA = a.name || "";
          valueB = b.name || "";
          break;
        case "rate":
          valueA = quoteA?.ltp ?? quoteA?.price ?? 0;
          valueB = quoteB?.ltp ?? quoteB?.price ?? 0;
          break;
        case "oi":
          valueA = quoteA?.oi ?? 0;
          valueB = quoteB?.oi ?? 0;
          break;
        case "rsi":
          valueA = quoteA?.rsi ?? 0;
          valueB = quoteB?.rsi ?? 0;
          break;
        case "oiChange":
          valueA = quoteA?.oiChange ?? 0;
          valueB = quoteB?.oiChange ?? 0;
          break;
        case "vwap":
          valueA = quoteA?.vwap ?? 0;
          valueB = quoteB?.vwap ?? 0;
          break;
        case "iv":
          valueA = quoteA?.iv ?? 0;
          valueB = quoteB?.iv ?? 0;
          break;
        case "delta":
          valueA = quoteA?.delta ?? 0;
          valueB = quoteB?.delta ?? 0;
          break;
        case "gamma":
          valueA = quoteA?.gamma ?? 0;
          valueB = quoteB?.gamma ?? 0;
          break;
        case "theta":
          valueA = quoteA?.theta ?? 0;
          valueB = quoteB?.theta ?? 0;
          break;
        case "vega":
          valueA = quoteA?.vega ?? 0;
          valueB = quoteB?.vega ?? 0;
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
  }, [allStocks, getQuote, sortField, sortDirection]);

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

  const exportRows = useMemo(
    () =>
      stocks.map((stock) => {
        const quote = getQuote(stock);

        return {
          symbol: stock.symbol,
          company: stock.name || "",
          rate: Number.isFinite(
            toFiniteNumber(quote?.ltp ?? quote?.price ?? quote?.optionPremium),
          )
            ? toFiniteNumber(
                quote?.ltp ?? quote?.price ?? quote?.optionPremium,
              ).toFixed(2)
            : "--",
          oi:
            quote?.oi != null
              ? Number(quote.oi).toLocaleString("en-IN")
              : "--",
          rsi: quote?.rsi != null ? Number(quote.rsi).toFixed(2) : "--",
          oiChange:
            quote?.oiChange != null
              ? formatSignedLabel(quote.oiChange)
              : "--",
          vwap:
            quote?.vwap != null ? Number(quote.vwap).toFixed(2) : "--",
          iv:
            quote?.iv != null
              ? (Math.abs(Number(quote.iv)) <= 1
                  ? Number(quote.iv) * 100
                  : Number(quote.iv)
                ).toFixed(2)
              : "--",
          delta: quote?.delta != null ? Number(quote.delta).toFixed(2) : "--",
          theta: quote?.theta != null ? Number(quote.theta).toFixed(2) : "--",
          gamma: quote?.gamma != null ? Number(quote.gamma).toFixed(4) : "--",
          vega: quote?.vega != null ? Number(quote.vega).toFixed(2) : "--",
        };
      }),
    [getQuote, stocks],
  );

  const exportColumns = useMemo(
    () => [
      { label: "Symbol", value: "symbol" },
      { label: "Company", value: "company" },
      { label: "Rate", value: "rate" },
      { label: "OI", value: "oi" },
      { label: "RSI", value: "rsi" },
      { label: "Oi Chng", value: "oiChange" },
      { label: "IV", value: "iv" },
      { label: "Delta", value: "delta" },
      { label: "Theta", value: "theta" },
      { label: "Gamma", value: "gamma" },
      { label: "Vega", value: "vega" },
      { label: "VWAP", value: "vwap" },
    ],
    [],
  );

  const handleScroll = (event) => {
    setScrollTop(event.currentTarget.scrollTop);
  };

  const handleManualRefresh = async () => {
    if (!refreshWatchlist || refreshing) return;
    setRefreshing(true);
    try {
      await refreshWatchlist();
    } finally {
      setRefreshing(false);
    }
  };

  const toggleSelect = (stockId) => {
    setSelectionMode(true);
    setSelectedSymbols((prev) => {
      const next = new Set(prev);
      if (next.has(stockId)) {
        next.delete(stockId);
      } else {
        next.add(stockId);
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
    setSelectedSymbols(new Set(stocks.map((s) => s.instrumentKey || s.symbol)));
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
      title: "Remove instruments",
      message: `Remove ${count} instrument${count > 1 ? "s" : ""} from this watchlist?`,
      confirmText: "Remove",
    });

    if (!confirmed) return;

    setDeleting(true);
    onRemoveStock?.(symbols);
    clearSelection();

    try {
      await apiFetch(`/api/watchlists/${selectedWatchlist}/stocks/bulk-remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols }),
      });

      showSuccess(
        `Removed ${count} instrument${count > 1 ? "s" : ""} from watchlist`,
      );
    } catch (error) {
      showError(error.message || "Failed to remove instruments");
      await refreshWatchlist?.();
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    setSelectedSymbols(new Set());
    setSelectionMode(false);
  }, [selectedWatchlist]);

  if (!selectedWatchlist || !watchlist) {
    return (
      <div className="w-full px-6 mt-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm min-h-[650px] flex items-center justify-center">
          <div className="text-center max-w-lg px-8">
            <div className="text-6xl mb-6">∑</div>
            <h2 className="text-3xl font-bold text-gray-800">Greek View</h2>
            <p className="text-gray-500 mt-4 text-lg">
              Select a watchlist to see option greeks.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const colSpan = selectionMode ? 12 : 11;

  return (
    <div className="w-full px-6 mt-4">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[650px]">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 gap-4">
          <StockSearchDropdown
            selectedWatchlist={selectedWatchlist}
            watchlistStocks={allStocks}
            refreshWatchlist={refreshWatchlist}
            onRemoveStock={onRemoveStock}
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
            <Suspense
              fallback={
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-2 border border-gray-300 px-3 py-2 rounded-lg text-sm text-gray-700 opacity-60"
                >
                  Export
                </button>
              }
            >
              <TableExportMenu
                rows={exportRows}
                columns={exportColumns}
                filePrefix="Report"
                disabled={refreshing || loadingMarket || exportRows.length === 0}
              />
            </Suspense>
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing || loadingMarket}
              className="inline-flex items-center gap-2 border border-gray-300 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {refreshing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : null}
              Refresh
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
            Loading greek data from cache…
          </div>
        )}

        {loadingMore && !loadingMarket && (
          <div className="mx-4 mt-3 rounded-lg bg-slate-50 border border-slate-200 px-4 py-2 text-sm text-slate-600">
            Loading more instruments…
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
                        stocks.length > 0 && selectedSymbols.size === stocks.length
                      }
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                )}
                {[
                  ["symbol", "Symbol"],
                  ["rate", "Rate"],
                  ["oi", "OI"],
                  ["rsi", "RSI"],
                  ["oiChange", "Oi Chng"],
                  ["iv", "IV"],
                  ["delta", "Delta"],
                  ["theta", "Theta"],
                  ["gamma", "Gamma"],
                  ["vega", "Vega"],
                  ["vwap", "VWAP"],
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
                  const quote = getQuote(stock);

                  return (
                    <GreekTableRow
                      key={stock.instrumentKey || stock._id || stock.symbol}
                      stock={stock}
                      quote={quote}
                      selectionMode={selectionMode}
                      isSelected={selectedSymbols.has(stock.instrumentKey || stock.symbol)}
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
                    No instruments in this watchlist
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
  );
};

export default GreekTable;
