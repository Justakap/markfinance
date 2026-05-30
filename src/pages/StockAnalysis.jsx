import { useCallback, useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";

import WatchlistSelector from "../components/WatchlistSelector";
import SummaryCards from "../components/SummaryCards";
import StockTable from "../components/StockTable";
import { API_URL } from "../config/api";

const Dashboard = () => {
  const [selectedWatchlist, setSelectedWatchlist] = useState(() => {
    return localStorage.getItem("selectedWatchlist") || "";
  });

  const [lastUpdated, setLastUpdated] = useState(null);
  const [watchlist, setWatchlist] = useState(null);
  const [marketData, setMarketData] = useState([]);

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
  }, [selectedWatchlist]);

  const fetchWatchlist = useCallback(async () => {
    if (!selectedWatchlist) {
      setWatchlist(null);
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/api/watchlists/${selectedWatchlist}`,
      );

      const data = await res.json();

      setWatchlist(data);
    } catch (error) {
      console.log(error);
    }
  }, [selectedWatchlist]);

  const fetchMarketData = useCallback(async () => {
    if (!selectedWatchlist) {
      setMarketData([]);
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/api/market-data/${selectedWatchlist}`,
      );

      const data = await res.json();

      setMarketData(Array.isArray(data) ? data : []);
      setLastUpdated(new Date());
    } catch (error) {
      console.log(error);
    }
  }, [selectedWatchlist]);

  const refreshWatchlist = async () => {
    await fetchWatchlist();
    await fetchMarketData();
  };

  useEffect(() => {
    fetchWatchlist();
    fetchMarketData();

    const interval = setInterval(fetchMarketData, 10000);

    return () => clearInterval(interval);
  }, [fetchMarketData, fetchWatchlist]);

  return (
    <MainLayout
      title="Stock Analysis"
      subtitle="Real Time Market Analysis"
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
        />
      </div>
    </MainLayout>
  );
};

export default Dashboard;
