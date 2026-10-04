import { useCallback, useEffect, useRef, useState } from "react";
import MainLayout from "../layout/MainLayout";
import WatchlistSelector from "../components/WatchlistSelector";
import GreekTable from "../components/GreekTable";
import { apiFetch } from "../utils/api";
import { onMarketTick } from "../utils/socket";

const GREEK_FIELDS = [
  "delta",
  "gamma",
  "theta",
  "vega",
  "iv",
  "oi",
  "oiChange",
  "rsi",
  "vwap",
];

const mergeGreekTick = (rows, tick) => {
  if (!tick?.instrumentKey && !tick?.symbol) return rows;

  let changed = false;
  const next = rows.map((row) => {
    const sameInstrument =
      tick.instrumentKey && row.instrumentKey === tick.instrumentKey;
    const sameSymbol = tick.symbol && row.symbol === tick.symbol;

    if (!sameInstrument && !sameSymbol) return row;

    const merged = { ...row };
    const premium = tick.ltp ?? tick.price;

    if (premium != null && Number(premium) > 0) {
      merged.ltp = Number(premium);
      merged.price = Number(premium);
      merged.optionPremium = Number(premium);
      if (tick.changeAmount != null) merged.changeAmount = tick.changeAmount;
      if (tick.changePercent != null) {
        merged.changePercent = tick.changePercent;
        merged.change = tick.changePercent;
      }
    }

    if (tick.volume != null && Number(tick.volume) > 0) {
      merged.volume = tick.volume;
    }

    GREEK_FIELDS.forEach((field) => {
      if (tick[field] != null) merged[field] = tick[field];
    });

    changed = true;
    return merged;
  });

  return changed ? next : rows;
};

const GreekPage = () => {
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

      setMarketData(data);
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

  const removeStocksLocally = useCallback((symbols) => {
    const symbolSet = new Set(
      (Array.isArray(symbols) ? symbols : [symbols]).map(String),
    );

    setWatchlist((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        stocks: prev.stocks.filter(
          (s) => !symbolSet.has(s.instrumentKey) && !symbolSet.has(s.symbol),
        ),
      };
    });

    setMarketData((prev) =>
      prev.filter(
        (q) => !symbolSet.has(q.instrumentKey) && !symbolSet.has(q.symbol),
      ),
    );
  }, []);

  const refreshWatchlist = useCallback(async () => {
    await fetchWatchlist();
    await fetchMarketData();
  }, [fetchWatchlist, fetchMarketData]);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  useEffect(() => {
    if (watchlist) {
      fetchMarketData();
    }
  }, [watchlist, fetchMarketData]);

  useEffect(() => {
    const unsubscribe = onMarketTick((tick) => {
      if (!watchlistRef.current) return;

      setMarketData((prev) => mergeGreekTick(prev, tick));
      setLastUpdated(new Date());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleRemoveStock = useCallback(
    (symbols) => {
      removeStocksLocally(Array.isArray(symbols) ? symbols : [symbols]);
    },
    [removeStocksLocally],
  );

  return (
    <MainLayout
      title="Greek"
      subtitle={
        marketStatus?.label
          ? `Real-time · ${marketStatus.label}`
          : "Real Time Greek Analysis"
      }
      lastUpdated={lastUpdated}
      showLive
    >
      <div className="min-h-screen bg-gray-50">
        <WatchlistSelector
          selectedWatchlist={selectedWatchlist}
          setSelectedWatchlist={setSelectedWatchlist}
        />

        <GreekTable
          selectedWatchlist={selectedWatchlist}
          watchlist={watchlist}
          marketData={marketData}
          refreshWatchlist={refreshWatchlist}
          onRemoveStock={handleRemoveStock}
          loadingMarket={loadingMarket}
          marketError={marketError}
        />
      </div>
    </MainLayout>
  );
};

export default GreekPage;
