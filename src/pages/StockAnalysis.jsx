import { useCallback, useEffect, useRef, useState } from "react";
import MainLayout from "../layout/MainLayout";
import WatchlistSelector from "../components/WatchlistSelector";
import SummaryCards from "../components/SummaryCards";
import StockTable from "../components/StockTable";
import { apiFetch } from "../utils/api";
import { getMarketSocket } from "../utils/socket";
import { normalizeSymbol } from "../utils/symbols";

const mergeQuote = (rows, delta) => {
  if (!delta?.symbol) return rows;

  const index = rows.findIndex(
    (row) => normalizeSymbol(row.symbol) === normalizeSymbol(delta.symbol),
  );
  if (index === -1) return rows;

  const next = [...rows];
  next[index] = { ...next[index], ...delta };
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
      setWatchlist(
        await apiFetch(`/api/watchlists/${selectedWatchlist}`),
      );
    } catch (error) {
      console.log(error);
      setMarketError("Could not load watchlist. Try logging in again.");
    }
  }, [selectedWatchlist]);

  const fetchMarketData = useCallback(async () => {
    if (!selectedWatchlist) {
      setMarketData([]);
      return;
    }

    setLoadingMarket(true);
    setMarketError("");

    try {
      const stockCount = watchlist?.stocks?.length || 100;
      const res = await apiFetch(
        `/api/market-data/${selectedWatchlist}?offset=0&limit=${Math.max(stockCount, 50)}`,
      );

      if (Array.isArray(res)) {
        setMarketData(res);
        setLastUpdated(new Date());
        return;
      }

      setMarketData(res.data || []);
      setMarketStatus(res.marketStatus || null);
      setLastUpdated(
        res.updatedAt ? new Date(res.updatedAt) : new Date(),
      );
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
      setLoadingMarket(false);
    }
  }, [selectedWatchlist, watchlist?.stocks?.length]);

  const removeStocksLocally = useCallback((symbols) => {
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
  }, []);

  const refreshWatchlist = async () => {
    await fetchWatchlist();
    await fetchMarketData();
  };

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  useEffect(() => {
    if (watchlist) {
      fetchMarketData();
    }
  }, [watchlist, fetchMarketData]);

  useEffect(() => {
    const socket = getMarketSocket();

    const onUpdate = (delta) => {
      if (!watchlistRef.current) return;
      setMarketData((prev) => mergeQuote(prev, delta));
      setLastUpdated(new Date());
    };

    socket.on("stockUpdate", onUpdate);
    return () => {
      socket.off("stockUpdate", onUpdate);
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
