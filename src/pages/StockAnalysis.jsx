import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MainLayout from "../layout/MainLayout";
import StockTable from "../components/StockTable";
import { apiFetch } from "../utils/api";
import { onMarketTick } from "../utils/socket";
import { normalizeIndicatorQuote } from "../utils/indicators";

const RSI_FIELDS = [
  "ema20",
  "ema75",
  "volAvg",
  "pe",
  "rsi",
  "prevRsi",
  "rsiChange",
  "rsi5m",
  "prevRsi5m",
  "rsi5mChange",
  "rsi15m",
  "prevRsi15m",
  "rsi15mChange",
  "hourlyRsi",
  "prevHourlyRsi",
  "hourlyRsiChange",
  "prevPrice5m",
  "prevPrice15m",
  "prevPrice1h",
  "prevPrice",
];

const mergeMarketTick = (rows, tick) => {
  if (!tick?.instrumentKey && !tick?.symbol) return rows;

  let changed = false;
  const next = rows.map((row) => {
    const sameInstrument =
      tick.instrumentKey && row.instrumentKey === tick.instrumentKey;
    const sameSymbol = tick.symbol && row.symbol === tick.symbol;

    if (!sameInstrument && !sameSymbol) return row;

    const normalizedTick = normalizeIndicatorQuote(tick);
    const merged = { ...row };
    const ltp = tick.ltp ?? tick.price;

    if (ltp != null && Number(ltp) > 0) {
      merged.ltp = Number(ltp);
      merged.price = Number(ltp);
      if (tick.changeAmount != null) merged.changeAmount = tick.changeAmount;
      if (tick.changePercent != null) {
        merged.changePercent = tick.changePercent;
        merged.change = tick.changePercent;
      }
    }

    if (tick.volume != null && Number(tick.volume) > 0) {
      merged.volume = tick.volume;
    }

    RSI_FIELDS.forEach((field) => {
      if (normalizedTick[field] != null) merged[field] = normalizedTick[field];
    });

    changed = true;
    return merged;
  });

  return changed ? next : rows;
};

const StockAnalysis = () => {
  const [selectedWatchlist, setSelectedWatchlist] = useState(() => {
    return localStorage.getItem("selectedWatchlist") || "";
  });

  const [lastUpdated, setLastUpdated] = useState(null);
  const [watchlists, setWatchlists] = useState([]);
  const [marketData, setMarketData] = useState([]);
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [marketError, setMarketError] = useState("");
  const [, setMarketStatus] = useState(null);
  const watchlistRef = useRef(selectedWatchlist);
  const fetchInProgressRef = useRef(false);

  const [rsiTimeframe, setRsiTimeframe] = useState(() => {
    const saved = localStorage.getItem("rsiTimeframe");
    if (!saved || saved === "1m") return "1d";
    return saved;
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

  // The list endpoint already returns full watchlist documents (same shape as
  // the single-watchlist endpoint, no field projection on either route), so
  // the selected watchlist is derived from the already-fetched list instead
  // of making a second /api/watchlists/:id request for the same data.
  const watchlist = useMemo(
    () => watchlists.find((w) => w._id === selectedWatchlist) || null,
    [watchlists, selectedWatchlist],
  );

  const fetchWatchlists = useCallback(async () => {
    try {
      const data = await apiFetch("/api/watchlists");
      const list = Array.isArray(data) ? data : [];
      setWatchlists(list);

      const saved = localStorage.getItem("selectedWatchlist");
      if (saved && list.some((w) => w._id === saved)) {
        setSelectedWatchlist(saved);
      } else if (list.length > 0) {
        setSelectedWatchlist(list[0]._id);
        localStorage.setItem("selectedWatchlist", list[0]._id);
      } else {
        setSelectedWatchlist("");
      }
    } catch (error) {
      console.log(error);
      setMarketError("Could not load watchlist. Try logging in again.");
    }
  }, []);

  const fetchMarketData = useCallback(async () => {
    if (!selectedWatchlist) {
      setMarketData([]);
      return;
    }

    if (fetchInProgressRef.current) {
      return;
    }

    fetchInProgressRef.current = true;
    setLoadingMarket(true);
    setMarketError("");

    try {
      const res = await apiFetch(`/api/market-data/${selectedWatchlist}`);

      let data = [];
      if (Array.isArray(res)) {
        data = res;
      } else {
        data = Array.isArray(res?.data) ? res.data : [];
        setMarketStatus(res.marketStatus || null);
      }

      setMarketData(data.map((quote) => normalizeIndicatorQuote(quote)));
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
      } else if (error.status === 429) {
        setMarketError(
          "Too many requests. Wait a few seconds and refresh the page.",
        );
      } else {
        setMarketError(
          error.message || "Market data failed. Please try again shortly.",
        );
      }
    } finally {
      fetchInProgressRef.current = false;
      setLoadingMarket(false);
    }
  }, [selectedWatchlist]);

  const removeStocksLocally = useCallback(
    (symbols) => {
      const symbolSet = new Set(
        (Array.isArray(symbols) ? symbols : [symbols]).map(String),
      );

      setWatchlists((prev) =>
        prev.map((w) =>
          w._id === selectedWatchlist
            ? {
                ...w,
                stocks: w.stocks.filter(
                  (s) =>
                    !symbolSet.has(s.instrumentKey) && !symbolSet.has(s.symbol),
                ),
              }
            : w,
        ),
      );

      setMarketData((prev) =>
        prev.filter(
          (q) => !symbolSet.has(q.instrumentKey) && !symbolSet.has(q.symbol),
        ),
      );
    },
    [selectedWatchlist],
  );

  const refreshWatchlist = useCallback(async () => {
    await Promise.all([fetchWatchlists(), fetchMarketData()]);
  }, [fetchWatchlists, fetchMarketData]);

  useEffect(() => {
    fetchWatchlists();
  }, [fetchWatchlists]);

  // Market data only needs the watchlist ID (already known synchronously from
  // localStorage on mount), not the full watchlist document — fetch it in
  // parallel with the watchlist list instead of waiting for that to resolve.
  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  useEffect(() => {
    const unsubscribe = onMarketTick((tick) => {
      if (!watchlistRef.current) return;

      setMarketData((prev) => mergeMarketTick(prev, tick));
      setLastUpdated(new Date());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <MainLayout lastUpdated={lastUpdated} showLive hideHeader>
      <div className="min-h-screen bg-gray-50">
        <StockTable
          selectedWatchlist={selectedWatchlist}
          setSelectedWatchlist={setSelectedWatchlist}
          watchlists={watchlists}
          onWatchlistsChange={setWatchlists}
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
