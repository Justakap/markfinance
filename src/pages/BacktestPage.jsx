import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Play, Loader2, Search } from "lucide-react";
import { API_URL } from "../config/api";
import { showError, showInfo } from "../utils/toast";

const returnColor = (value) =>
  (value ?? 0) >= 0 ? "text-green-700" : "text-red-700";

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
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const ConditionPill = ({ condition, variant = "entry" }) => (
  <span
    className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
      variant === "exit"
        ? "bg-amber-50 text-amber-800 border border-amber-100"
        : "bg-blue-50 text-blue-800 border border-blue-100"
    }`}
  >
    {condition.indicator} {condition.operator} {condition.value}
  </span>
);

const formatRisk = (value) => {
  const n = Number(value);
  return n > 0 ? `${n}%` : "—";
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const BacktestPage = () => {
  const { strategyId } = useParams();
  const validationMode =
    process.env.REACT_APP_VALIDATION_MODE === "true" ||
    process.env.NODE_ENV === "development";

  const [strategy, setStrategy] = useState(null);
  const [symbol, setSymbol] = useState("");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [period, setPeriod] = useState("1y");
  const [capital, setCapital] = useState(10000);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);

  const getEntryConditions = () =>
    strategy?.entryConditions?.length
      ? strategy.entryConditions
      : strategy?.conditions || [];

  const getExitConditions = () => strategy?.exitConditions || [];

  const getConditionConnector = (condition) =>
    condition.nextLogic || strategy?.logic || "AND";

  useEffect(() => {
    const fetchStrategy = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/api/strategy-details/${strategyId}`,
        );
        setStrategy(res.data);

        const interval = res.data.backtestInterval || "1d";
        const maxDays = res.data.intervalLimits?.[interval]?.maxDays || 1825;
        const periodDays = {
          "1mo": 30,
          "3mo": 90,
          "6mo": 180,
          "1y": 365,
          "2y": 730,
          "5y": 1825,
        };
        const bestPeriod =
          Object.entries(periodDays)
            .filter(([, days]) => days <= maxDays)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || "1mo";
        setPeriod(bestPeriod);
      } catch (err) {
        showError(err?.response?.data?.message || "Failed to load strategy");
      }
    };
    fetchStrategy();
  }, [strategyId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchStocks = async (value) => {
    if (value.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    setSearchOpen(true);
    try {
      const res = await axios.get(`${API_URL}/api/search-stock?q=${value}`);
      setSearchResults(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  const runBacktest = async () => {
    if (!symbol) {
      showInfo("Please enter a stock symbol");
      return;
    }

    try {
      setLoading(true);
      let runSymbol = symbol.trim().toUpperCase();
      if (!runSymbol.includes(".") && /^[A-Z]{2,12}$/.test(runSymbol)) {
        runSymbol = `${runSymbol}.NS`;
      }

      const res = await axios.post(`${API_URL}/api/backtest/run`, {
        strategyId,
        symbol: runSymbol,
        period,
        capital,
        validationMode,
      });
      setResults(res.data);
    } catch (err) {
      if (err?.response?.status === 401) {
        showError("Session expired. Log out and sign in again.");
        return;
      }
      showError(err?.response?.data?.message || "Backtest failed");
    } finally {
      setLoading(false);
    }
  };

  const summary = results?.summary;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Strategy Backtesting</h1>
          <p className="text-gray-500 mt-2">
            Test your strategy against historical data
          </p>
        </div>

        {strategy?.backtestInterval && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            {strategy.backtestInterval !== "1d" && (
              <p>
                Primary candle timeframe:{" "}
                <strong>
                  {strategy.intervalLimits?.[strategy.backtestInterval]?.label ||
                    strategy.backtestInterval}
                </strong>
                . Yahoo limits intraday history (max ~
                {strategy.intervalLimits?.[strategy.backtestInterval]?.maxDays}{" "}
                days).
              </p>
            )}
            {strategy.backtestPreview?.requiredIntervals?.length > 1 && (
              <p className="mt-1">
                Multi-timeframe strategy — RSI values are aligned onto the same
                candles for backtesting.
              </p>
            )}
            <p className="mt-1 text-amber-800">
              Trades execute on the next candle open after a signal (no
              look-ahead bias).
            </p>
          </div>
        )}

        {strategy && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-slate-900">
                  {strategy.name}
                </h2>
                {strategy.description && (
                  <p className="text-sm text-slate-500 mt-1">
                    {strategy.description}
                  </p>
                )}

                <div className="mt-4">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1.5">
                    Entry
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {getEntryConditions().map((condition, index) => (
                      <div key={index} className="flex items-center gap-1.5">
                        <ConditionPill condition={condition} />
                        {index !== getEntryConditions().length - 1 && (
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {getConditionConnector(condition)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1.5">
                    Exit
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {getExitConditions().length ? (
                      getExitConditions().map((condition, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                          <ConditionPill
                            condition={condition}
                            variant="exit"
                          />
                          {index !== getExitConditions().length - 1 && (
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              {getConditionConnector(condition)}
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">
                        Stop loss / target only
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 shrink-0">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 min-w-[100px] text-center">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">
                    Stop Loss
                  </p>
                  <p className="text-base font-bold text-slate-700 mt-0.5">
                    {formatRisk(strategy.stopLoss)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 min-w-[100px] text-center">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">
                    Target
                  </p>
                  <p className="text-base font-bold text-slate-700 mt-0.5">
                    {formatRisk(strategy.target)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Backtest Configuration
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="relative md:col-span-1" ref={searchRef}>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1.5">
                Stock
              </label>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search symbol or company…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    searchStocks(e.target.value);
                  }}
                  onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                  className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                  {searchResults.map((stock) => (
                    <button
                      key={stock.symbol}
                      type="button"
                      onClick={() => {
                        setSymbol(stock.symbol);
                        setQuery(`${stock.symbol} — ${stock.name}`);
                        setSearchResults([]);
                        setSearchOpen(false);
                      }}
                      className="w-full text-left px-3 py-3 hover:bg-blue-50 border-b border-slate-100 last:border-0 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-sm text-slate-900">
                            {stock.symbol}
                          </div>
                          <div className="text-xs text-slate-500 truncate mt-0.5">
                            {stock.name}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getMarketColor(stock.market)}`}
                          >
                            {stock.market}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {symbol && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-3 py-1">
                  <span className="text-xs font-semibold text-blue-700">
                    {symbol}
                  </span>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1.5">
                Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1mo">1 Month</option>
                <option value="3mo">3 Months</option>
                <option value="6mo">6 Months</option>
                <option value="1y">1 Year</option>
                <option value="2y">2 Years</option>
                <option value="5y">5 Years</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1.5">
                Capital (INR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">
                  ₹
                </span>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={capital}
                  onChange={(e) => setCapital(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          <button
            onClick={runBacktest}
            disabled={loading}
            className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Play size={16} />
            )}
            {loading ? "Running…" : "Run Backtest"}
          </button>
        </div>

        {loading && (
          <div className="bg-white shadow-sm border rounded-xl p-6 mb-8">
            <h3 className="font-semibold mb-2">Running Backtest</h3>
            <p className="text-gray-500">Fetching historical candles…</p>
            <p className="text-gray-500">Calculating indicators…</p>
            <p className="text-gray-500">Evaluating strategy…</p>
          </div>
        )}

        {results && (
          <>
            {results.backtestMeta?.message && (
              <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-900">
                {results.backtestMeta.message}
                {results.backtestMeta.candleCount != null && (
                  <span className="block mt-1 text-blue-700">
                    Evaluated {results.backtestMeta.candleCount} candles on{" "}
                    {results.backtestMeta.intervalLabel} timeframe.
                  </span>
                )}
              </div>
            )}

            {results.summary?.totalTrades === 0 && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
                No trades were generated for this symbol and period.
              </div>
            )}

            {results.signalStats && (
              <div className="mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  ["Entry Signals", results.signalStats.entrySignalsFound],
                  ["Entries Executed", results.signalStats.entriesExecuted],
                  ["Exit Signals", results.signalStats.exitSignalsFound],
                  ["Exits Executed", results.signalStats.exitsExecuted],
                  ["Skipped Entries", results.signalStats.skippedEntryNoNextBar],
                  ["Skipped Exits", results.signalStats.skippedExitNoNextBar],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="bg-white border border-gray-200 rounded-lg p-3 text-center"
                  >
                    <p className="text-xs text-gray-500 uppercase">{label}</p>
                    <p className="text-xl font-bold text-gray-900">{value ?? 0}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              {[
                {
                  label: "Net Profit",
                  value: `₹${Number(summary?.netProfit ?? 0).toLocaleString()}`,
                  positive: (summary?.netProfit ?? 0) >= 0,
                },
                { label: "Win Rate", value: `${summary?.winRate}%`, positive: summary?.winRate >= 50 },
                { label: "Profit Factor", value: summary?.profitFactor, positive: summary?.profitFactor >= 1 },
                { label: "Max Drawdown", value: `${summary?.maxDrawdown}%`, positive: false, amber: true },
                { label: "Total Trades", value: summary?.totalTrades, positive: true },
                { label: "Winning Trades", value: summary?.winningTrades, positive: true },
                { label: "Losing Trades", value: summary?.losingTrades, positive: false },
                { label: "Avg Holding Days", value: summary?.averageHoldingDays, positive: true },
                { label: "Best Trade", value: `${summary?.bestTrade}%`, positive: true },
                { label: "Worst Trade", value: `${summary?.worstTrade}%`, positive: false },
              ].map((card) => (
                <div key={card.label} className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-xs font-bold tracking-wide text-gray-500 uppercase mb-2">
                    {card.label}
                  </p>
                  <div
                    className={`text-2xl font-bold ${
                      card.amber
                        ? "text-amber-600"
                        : card.positive
                          ? "text-green-600"
                          : "text-red-600"
                    }`}
                  >
                    {card.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-100 rounded-xl p-5 mb-8">
              <h3 className="font-semibold text-gray-900 mb-3">
                Strategy vs Buy & Hold
              </h3>
              <div className="grid md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Strategy Return</p>
                  <p
                    className={`text-xl font-bold ${returnColor(summary?.totalReturn)}`}
                  >
                    {summary?.totalReturn}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Buy & Hold Return</p>
                  <p
                    className={`text-xl font-bold ${returnColor(summary?.buyAndHoldReturn)}`}
                  >
                    {summary?.buyAndHoldReturn}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Difference</p>
                  <p
                    className={`text-xl font-bold ${returnColor(summary?.outperformance)}`}
                  >
                    {summary?.outperformance >= 0 ? "+" : ""}
                    {summary?.outperformance}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Outperformance</p>
                  <p
                    className={`text-xl font-bold ${returnColor(summary?.outperformancePct)}`}
                  >
                    {summary?.outperformancePct}%
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-600">
                Longest win streak: {summary?.longestWinningStreak} · Longest
                loss streak: {summary?.longestLosingStreak}
              </p>
            </div>

            <div className="bg-white shadow-sm border rounded-xl border-slate-800 p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Trade History</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-gray-200 text-gray-500">
                      <th className="pb-3">#</th>
                      <th className="pb-3">Entry</th>
                      <th className="pb-3">Exit</th>
                      <th className="pb-3">Buy</th>
                      <th className="pb-3">Sell</th>
                      <th className="pb-3">Return</th>
                      <th className="pb-3">Days</th>
                      <th className="pb-3">Reason</th>
                      {validationMode && <th className="pb-3">Verified</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {results.trades?.map((trade, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-3">{idx + 1}</td>
                        <td className="py-3">{formatDate(trade.entryDate)}</td>
                        <td className="py-3">{formatDate(trade.exitDate)}</td>
                        <td className="py-3">₹{trade.entryPrice}</td>
                        <td className="py-3">₹{trade.exitPrice}</td>
                        <td
                          className={`py-3 font-medium ${
                            trade.returnPct > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {trade.returnPct}%
                        </td>
                        <td className="py-3">{trade.holdingDays}</td>
                        <td className="py-3">{trade.reason}</td>
                        {validationMode && (
                          <td className="py-3">
                            {trade.entryConfirmed && trade.exitConfirmed ? (
                              <span className="text-green-600 font-medium">
                                TRUE
                              </span>
                            ) : (
                              <span className="text-red-600 font-medium">
                                FALSE
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {validationMode && results.auditLog?.length > 0 && (
              <div className="bg-gray-900 text-gray-100 rounded-xl p-6 mb-8 font-mono text-xs overflow-x-auto">
                <h2 className="text-lg font-semibold mb-4 text-white">
                  Validation Audit Log
                </h2>
                {results.auditLog.map((entry) => (
                  <div key={entry.tradeNumber} className="mb-6 border-b border-gray-700 pb-4">
                    <p className="text-yellow-400 font-bold">
                      Trade #{entry.tradeNumber}
                    </p>
                    <p>
                      Entry: {formatDate(entry.entry.date)} @ ₹
                      {entry.entry.price}
                    </p>
                    <p className="text-gray-400">{entry.entry.reason}</p>
                    <p>
                      Exit: {formatDate(entry.exit.date)} @ ₹
                      {entry.exit.price} — {entry.exit.reason}
                    </p>
                    <p>PnL: ₹{entry.pnl} ({entry.returnPct}%)</p>
                    <p
                      className={
                        entry.confirmed ? "text-green-400" : "text-red-400"
                      }
                    >
                      Confirmed: {entry.confirmed ? "TRUE" : "FALSE"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BacktestPage;
