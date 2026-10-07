import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import StockModal from "./StockModal";
import StockSearchDropdown from "./StockSearchDropdown";
import StockTableRow from "./StockTableRow";
import { apiFetch } from "../utils/api";
import {
  getRsiDataForTimeframe,
  normalizeIndicatorQuote,
  toFiniteNumber,
} from "../utils/indicators";
import { confirmAction, showError, showSuccess } from "../utils/toast";

// xlsx/jsPDF are large and only needed once the export menu is actually used —
// split them into their own chunk instead of loading them with the table.
const TableExportMenu = lazy(() => import("./TableExportMenu"));

const RSI_TIMEFRAMES = [
  { value: "5m", label: "5 Min" },
  { value: "15m", label: "15 Min" },
  { value: "1h", label: "1 Hour" },
  { value: "1d", label: "Daily" },
];

const ROW_HEIGHT = 56;
const VIRTUAL_THRESHOLD = 20;
const VIEWPORT_HEIGHT = 520;

const getRsiData = (quote, rsiTimeframe) =>
  getRsiDataForTimeframe(quote, rsiTimeframe);

const getVelocityValue = (quote) => {
  const normalized = normalizeIndicatorQuote(quote);
  const pairs = [
    [normalized?.rsi5m, normalized?.prevRsi5m],
    [normalized?.rsi15m, normalized?.prevRsi15m],
    [normalized?.hourlyRsi, normalized?.prevHourlyRsi],
    [normalized?.rsi, normalized?.prevRsi],
  ];

  const allValid = pairs.every(
    ([current, prev]) =>
      Number.isFinite(toFiniteNumber(current)) &&
      Number.isFinite(toFiniteNumber(prev)),
  );

  if (!allValid) return 0;

  const allAbove = pairs.every(
    ([current, prev]) => Number(current) > Number(prev),
  );
  const allBelow = pairs.every(
    ([current, prev]) => Number(current) < Number(prev),
  );

  if (allAbove) return 1;
  if (allBelow) return -1;
  return 0;
};

const getPriceVelocityValue = (quote) => {
  const normalized = normalizeIndicatorQuote(quote);
  const current = toFiniteNumber(normalized?.price ?? normalized?.ltp);
  const pairs = [
    [current, normalized?.prevPrice5m],
    [current, normalized?.prevPrice15m],
    [current, normalized?.prevPrice1h],
    [current, normalized?.prevPrice],
  ];

  const allValid = pairs.every(
    ([price, prev]) =>
      Number.isFinite(toFiniteNumber(price)) &&
      Number.isFinite(toFiniteNumber(prev)),
  );

  if (!allValid) return 0;

  const allAbove = pairs.every(([price, prev]) => Number(price) > Number(prev));
  const allBelow = pairs.every(([price, prev]) => Number(price) < Number(prev));

  if (allAbove) return 1;
  if (allBelow) return -1;
  return 0;
};

const formatTrendLabel = (value) => {
  if (value > 0) return "+ve";
  if (value < 0) return "-ve";
  return "-";
};

const getDmaStatusValue = (quote) => {
  const price = toFiniteNumber(quote?.price ?? quote?.ltp);
  const ema20 = toFiniteNumber(quote?.ema20);
  if (!Number.isFinite(price) || !Number.isFinite(ema20)) return 0;
  return price > ema20 ? 1 : -1;
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
  const [sortField, setSortField] = useState("symbol");
  const [sortDirection, setSortDirection] = useState("asc");
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSymbols, setSelectedSymbols] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
      // Now using Map lookups - O(1) instead of O(n) per comparison!
      const quoteA = getQuote(a);
      const quoteB = getQuote(b);
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
          valueA = a.name || "";
          valueB = b.name || "";
          break;
        case "rate":
          valueA = quoteA?.price ?? quoteA?.ltp ?? 0;
          valueB = quoteB?.price ?? quoteB?.ltp ?? 0;
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
        case "ema75":
          valueA = quoteA?.ema75 || 0;
          valueB = quoteB?.ema75 || 0;
          break;
        case "volAvg":
          valueA = quoteA?.volAvg || 0;
          valueB = quoteB?.volAvg || 0;
          break;
        case "acc":
          valueA =
            quoteA?.volume && quoteA?.volAvg
              ? Number(quoteA.volume) / Number(quoteA.volAvg)
              : 0;
          valueB =
            quoteB?.volume && quoteB?.volAvg
              ? Number(quoteB.volume) / Number(quoteB.volAvg)
              : 0;
          break;
        case "dmaStatus":
          valueA = getDmaStatusValue(quoteA);
          valueB = getDmaStatusValue(quoteB);
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
        case "vel":
          valueA = getVelocityValue(quoteA);
          valueB = getVelocityValue(quoteB);
          break;
        case "priceVel":
          valueA = getPriceVelocityValue(quoteA);
          valueB = getPriceVelocityValue(quoteB);
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
  }, [allStocks, getQuote, sortField, sortDirection, rsiTimeframe]);

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
        const rsiData = getRsiData(quote, rsiTimeframe);
        const price = toFiniteNumber(quote?.price ?? quote?.ltp);
        const ema20 = toFiniteNumber(quote?.ema20);
        const volume = toFiniteNumber(quote?.volume);
        const volAvg = toFiniteNumber(quote?.volAvg);

        return {
          symbol: stock.symbol,
          company: stock.name || "",
          ltp: Number.isFinite(price) ? price.toFixed(2) : "--",
          changePercent:
            quote?.changePercent != null || quote?.change != null
              ? `${Number(quote?.changePercent ?? quote?.change).toFixed(2)}%`
              : "--",
          volume: quote?.volume != null ? Number(quote.volume).toLocaleString("en-IN") : "--",
          volAvg: quote?.volAvg != null ? Number(quote.volAvg).toLocaleString("en-IN") : "--",
          vf:
            Number.isFinite(volume) && Number.isFinite(volAvg) && volAvg > 0
              ? (volume / volAvg).toFixed(2)
              : "--",
          ema20: Number.isFinite(ema20) ? ema20.toFixed(2) : "--",
          ema75: quote?.ema75 != null ? Number(quote.ema75).toFixed(2) : "--",
          dmaStatus:
            Number.isFinite(price) && Number.isFinite(ema20)
              ? price > ema20
                ? "Above"
                : "Below"
              : "--",
          rsi: rsiData.rsi != null ? Number(rsiData.rsi).toFixed(2) : "--",
          prevRsi: rsiData.prev != null ? Number(rsiData.prev).toFixed(2) : "--",
          rsiChange:
            rsiData.change != null ? Number(rsiData.change).toFixed(2) : "--",
          vel: formatTrendLabel(getVelocityValue(quote)),
          priceVel: formatTrendLabel(getPriceVelocityValue(quote)),
          pe: quote?.pe != null ? Number(quote.pe).toFixed(2) : "--",
        };
      }),
    [getQuote, rsiTimeframe, stocks],
  );

  const exportColumns = useMemo(
    () => [
      { label: "Symbol", value: "symbol" },
      { label: "Company", value: "company" },
      { label: "LTP", value: "ltp" },
      { label: "Change %", value: "changePercent" },
      { label: "Volume", value: "volume" },
      { label: "Vol Avg", value: "volAvg" },
      { label: "VF", value: "vf" },
      { label: "20 EMA", value: "ema20" },
      { label: "75 EMA", value: "ema75" },
      { label: "20 DMA", value: "dmaStatus" },
      { label: "RSI", value: "rsi" },
      { label: "Prev RSI", value: "prevRsi" },
      { label: "RSI Chng", value: "rsiChange" },
      { label: "Vel", value: "vel" },
      { label: "Price Vel", value: "priceVel" },
      { label: "PE", value: "pe" },
    ],
    [],
  );

  const handleScroll = (event) => {
    setScrollTop(event.currentTarget.scrollTop);
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

  const handleManualRefresh = async () => {
    if (!refreshWatchlist || refreshing) return;
    setRefreshing(true);
    try {
      await refreshWatchlist();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setSelectedSymbols(new Set());
    setSelectionMode(false);
  }, [selectedWatchlist]);

  const colSpan = selectionMode ? 16 : 15;

  if (!selectedWatchlist || !watchlist) {
    return (
      <div className="w-full px-6 mt-4">
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
      <div className="w-full px-6 mt-4">
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
                onClick={handleManualRefresh}
                disabled={refreshing || loadingMarket}
                className="inline-flex items-center gap-2 border border-gray-300 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {refreshing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : null}
                Refresh
              </button>
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
              Loading live prices… indicators stream in via WebSocket
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
                    ["rate", "LTP"],
                    ["change", "Change %"],
                    ["volume", "Volume"],
                    ["volAvg", "Vol Avg"],
                    ["acc", "VF"],
                    ["ema", "20 EMA"],
                    ["ema75", "75 EMA"],
                    ["dmaStatus", "20 DMA"],
                    ["rsi", "RSI"],
                    ["prevRsi", "Prev RSI"],
                    ["rsiChange", "RSI Chng"],
                    ["vel", "Vel"],
                    ["priceVel", "Price Vel"],
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
                    const quote = getQuote(stock);
                    const rsiData = getRsiData(quote, rsiTimeframe);

                    return (
                      <StockTableRow
                        key={stock.instrumentKey || stock._id || stock.symbol}
                        stock={stock}
                        quote={quote}
                        rsiData={rsiData}
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
