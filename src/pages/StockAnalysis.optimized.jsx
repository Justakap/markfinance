import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import MainLayout from "../layout/MainLayout";
import WatchlistSelector from "../components/WatchlistSelector";
import SummaryCards from "../components/SummaryCards";
import StockTable from "../components/StockTable";
import { apiFetch } from "../utils/api";
import { onBatchedStockUpdates } from "../utils/socketOptimized";
import { normalizeSymbol } from "../utils/symbols";
import { marketDataCache } from "../utils/requestCache";
import { marketDataDebouncer } from "../utils/requestOptimizer";

/**
 * Optimized merge for batch updates instead of individual updates
 * Much more efficient than merging one-by-one
 */
const mergeBatchedQuotes = (rows, deltas) => {
  if (!Array.isArray(deltas) || deltas.length === 0) return rows;

  // Create a map for O(1) lookups
  const deltaMap = new Map();
  deltas.forEach((delta) => {
    if (delta?.symbol) {
      deltaMap.set(normalizeSymbol(delta.symbol), delta);
    }
  });

  // Single pass update
  const updatedIndices = new Set();
  const next = rows.map((row) => {
    const normalized = normalizeSymbol(row.symbol);
    const delta = deltaMap.get(normalized);

    if (delta) {
      updatedIndices.add(row.symbol);
      return { ...row, ...delta };
    }
    return row;
  });

  // Only update if changes were made
  if (updatedIndices.size === 0) return rows;

  return next;
};

const StockAnalysis = () => {
  const [selectedWatchlist, setSelectedWatchlist] = useState(() => {
    return localStorage.getItem("selectedWatchlist") || "";
  });

  const [lastUpdated, setLastUpdated] = useState(null);
  const [watchlist, setWatchlist] = useState(null);
  const [marketData, setMarketData] = useState([]);
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [marketError, setMarketError] = useState("");
  const [marketStatus, setMarketStatus] = useState(null);
  const watchlistRef = useRef(selectedWatchlist);
  const fetchInProgressRef = useRef(false);

  const [rsiTimeframe, setRsiTimeframe] = useState(() => {
    return localStorage.getItem("rsiTimeframe") || "1d";
  });

  useEffect(() => {
    localStorage.setItem("rsiTimeframe", rsiTimeframe);
  }, [rsiTimeframe]);

  useEffect(() => {
    if (selectedWatchlist) {
      localStorage.setItem("selectedWatchlist", selectedWatchlist);
    }
    watchlistRef.current = selectedWatchlist;
  }, [selectedWatchlist]);

  const fetchWatchlist = useCallback(async () => {
    if (!selectedWatchlist) {
      setWatchlist(null);
      return;
    }

    try {
      setWatchlist(await apiFetch(`/api/watchlists/${selectedWatchlist}`));
    } catch (error) {
      console.log(error);
      setMarketError("Could not load watchlist. Try logging in again.");
    }
  }, [selectedWatchlist]);

  const fetchMarketData = useCallback(async () => {
    if (!selectedWatchlist || fetchInProgressRef.current) {
      setMarketData([]);
      return;
    }

    // Check cache first
    const cacheKey = `market-data-${selectedWatchlist}`;
    const cached = marketDataCache.get(cacheKey);
    if (cached) {
      setMarketData(cached);
      setLoadingMarket(false);
      return;
    }

    fetchInProgressRef.current = true;
    setLoadingMarket(true);
    setMarketError("");

    try {
      const stockCount = watchlist?.stocks?.length || 100;
      const res = await apiFetch(
        `/api/market-data/${selectedWatchlist}?offset=0&limit=${Math.max(stockCount, 50)}`,
      );

      let data = [];
      if (Array.isArray(res)) {
        data = res;
        setMarketData(res);
      } else {
        data = res.data || [];
        setMarketData(data);
        setMarketStatus(res.marketStatus || null);
      }

      // Cache the result
      marketDataCache.set(cacheKey, data, 45000); // Cache for 45 seconds
      setLastUpdated(res.updatedAt ? new Date(res.updatedAt) : new Date());
    } catch (error) {
      console.log(error);
      setMarketData([]);

      if (error.status === 401) {
        setMarketError(
          "Session expired. Log out from Settings and sign in again.",
        );
      } else if (error.status === 403) {
        setMarketError(
          "Access denied for this watchlist. Log out and sign in again.",
        );
      } else {
        setMarketError(
          error.message ||
            "Market data failed. Ensure backend is running on http://localhost:5001.",
        );
      }
    } finally {
      fetchInProgressRef.current = false;
      setLoadingMarket(false);
    }
  }, [selectedWatchlist, watchlist?.stocks?.length]);

  const removeStocksLocally = useCallback(
    (symbols) => {
      const symbolSet = new Set(
        (Array.isArray(symbols) ? symbols : [symbols]).map((s) =>
          normalizeSymbol(s),
        ),
      );

      setWatchlist((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          stocks: prev.stocks.filter(
            (s) => !symbolSet.has(normalizeSymbol(s.symbol)),
          ),
        };
      });

      setMarketData((prev) =>
        prev.filter((q) => !symbolSet.has(normalizeSymbol(q.symbol))),
      );

      // Invalidate cache
      marketDataCache.delete(`market-data-${selectedWatchlist}`);
    },
    [selectedWatchlist],
  );

  const refreshWatchlist = useCallback(async () => {
    // Invalidate caches
    marketDataCache.delete(`market-data-${selectedWatchlist}`);
    await fetchWatchlist();
    await fetchMarketData();
  }, [selectedWatchlist, fetchWatchlist, fetchMarketData]);

  // Initial load
  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  useEffect(() => {
    if (watchlist) {
      fetchMarketData();
    }
  }, [watchlist, fetchMarketData]);

  // Socket updates - now batched every 2 seconds
  useEffect(() => {
    const unsubscribe = onBatchedStockUpdates((deltas) => {
      if (!watchlistRef.current) return;

      // Use batched merge instead of individual updates
      setMarketData((prev) => mergeBatchedQuotes(prev, deltas));
      setLastUpdated(new Date());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <MainLayout
      title="Stock Analysis"
      subtitle={
        marketStatus?.label
          ? `Real-time · ${marketStatus.label}`
          : "Real Time Market Analysis"
      }
      lastUpdated={lastUpdated}
      showLive
    >
      <div className="min-h-screen bg-gray-50">
        <WatchlistSelector
          selectedWatchlist={selectedWatchlist}
          setSelectedWatchlist={setSelectedWatchlist}
        />

        <SummaryCards
          watchlist={watchlist}
          marketData={marketData}
          rsiTimeframe={rsiTimeframe}
        />

        <StockTable
          selectedWatchlist={selectedWatchlist}
          watchlist={watchlist}
          marketData={marketData}
          rsiTimeframe={rsiTimeframe}
          setRsiTimeframe={setRsiTimeframe}
          refreshWatchlist={refreshWatchlist}
          onRemoveStocks={removeStocksLocally}
          loadingMarket={loadingMarket}
          marketError={marketError}
        />
      </div>
    </MainLayout>
  );
};

export default StockAnalysis;
