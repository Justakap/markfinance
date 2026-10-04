import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import {
  BadgeInfo,
  BarChart3,
  Clock3,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Table2,
  FileText,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { API_URL } from "../config/api";
import MainLayout from "../layout/MainLayout";
import { showError, showInfo } from "../utils/toast";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatDateTime = (date) =>
  new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatMoney = (value) =>
  `₹${currencyFormatter.format(Number(value || 0))}`;

const formatPercent = (value, digits = 2) => {
  const n = Number(value || 0);

  if (!Number.isFinite(n)) return "—";

  const prefix = n > 0 ? "+" : "";
  return `${prefix}${n.toFixed(digits)}%`;
};

const formatMetric = (value, digits = 2) => {
  if (value === Infinity) return "∞";

  const n = Number(value);

  if (!Number.isFinite(n)) return "—";

  return n.toFixed(digits);
};

const toneClass = (value, invert = false) => {
  const n = Number(value || 0);
  const positive = invert ? n <= 0 : n >= 0;
  return positive ? "text-emerald-600" : "text-rose-600";
};

const getExchangeClass = (exchange) => {
  switch (String(exchange || "").toUpperCase()) {
    case "NSE":
      return "bg-blue-50 text-blue-700 border-blue-100";
    case "BSE":
      return "bg-indigo-50 text-indigo-700 border-indigo-100";
    case "MCX":
      return "bg-amber-50 text-amber-700 border-amber-100";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

const getTypeBadgeClass = (type) => {
  switch (String(type || "").toUpperCase()) {
    case "EQ":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "FUT":
      return "bg-violet-50 text-violet-700 border-violet-100";
    case "OPT":
      return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100";
    case "COM":
      return "bg-amber-50 text-amber-700 border-amber-100";
    case "IDX":
      return "bg-cyan-50 text-cyan-700 border-cyan-100";
    case "ETF":
      return "bg-sky-50 text-sky-700 border-sky-100";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

const ConditionPill = ({ condition, variant = "entry" }) => (
  <span
    className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
      variant === "exit"
        ? "bg-amber-50 text-amber-800 border-amber-100"
        : "bg-blue-50 text-blue-800 border-blue-100"
    }`}
  >
    {condition.indicator} {condition.operator} {condition.value}
  </span>
);

const TabButton = ({ active, children, onClick, icon: Icon }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
      active
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
    }`}
  >
    {Icon && <Icon size={16} />}
    {children}
  </button>
);

const StatCard = ({ label, value, hint, tone = "neutral" }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
      {label}
    </div>
    <div
      className={`mt-2 text-2xl font-bold ${
        tone === "positive"
          ? "text-emerald-600"
          : tone === "negative"
            ? "text-rose-600"
            : tone === "amber"
              ? "text-amber-600"
              : "text-slate-900"
      }`}
    >
      {value}
    </div>
    {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
  </div>
);

const ResultBanner = ({ tone = "blue", children }) => {
  const styles = {
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    slate: "border-slate-200 bg-slate-50 text-slate-900",
  };

  return (
    <div className={`rounded-2xl border px-5 py-4 text-sm ${styles[tone]}`}>
      {children}
    </div>
  );
};

const BacktestPage = () => {
  const { strategyId } = useParams();
  const validationMode =
    process.env.REACT_APP_VALIDATION_MODE === "true" ||
    process.env.NODE_ENV === "development";

  const [strategy, setStrategy] = useState(null);
  const [symbol, setSymbol] = useState("");
  const [instrumentKey, setInstrumentKey] = useState("");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [period, setPeriod] = useState("1y");
  const [capital, setCapital] = useState(10000);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const searchRef = useRef(null);
  const searchCacheRef = useRef(new Map());
  const searchSeqRef = useRef(0);
  const suppressSearchRef = useRef(false);

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

  useEffect(() => {
    const term = query.trim();

    if (suppressSearchRef.current) {
      return undefined;
    }

    if (term.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      const cacheKey = term.toUpperCase();
      const cached = searchCacheRef.current.get(cacheKey);

      if (cached) {
        setSearchResults(cached);
        setSearchOpen(true);
        return;
      }

      const requestId = ++searchSeqRef.current;

      try {
        const res = await axios.get(
          `${API_URL}/api/search?q=${encodeURIComponent(term)}`,
        );

        if (requestId !== searchSeqRef.current) return;

        const rows = Array.isArray(res.data) ? res.data : [];
        searchCacheRef.current.set(cacheKey, rows);
        setSearchResults(rows);
        setSearchOpen(true);
      } catch (error) {
        if (requestId === searchSeqRef.current) {
          setSearchResults([]);
          setSearchOpen(false);
        }
        if (error?.response?.status !== 429) {
          console.log(error);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (results) {
      setActiveTab("overview");
    }
  }, [results]);

  const runBacktest = async () => {
    if (!symbol) {
      showInfo("Please choose a symbol from search");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/api/backtest/run`, {
        strategyId,
        symbol: symbol.trim().toUpperCase(),
        instrumentKey,
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
  const equityData = useMemo(() => {
    const points = results?.fullEquityCurve?.length
      ? results.fullEquityCurve
      : results?.equityCurve || [];

    return points.map((point) => ({
      ...point,
      label: formatDate(point.date),
      shortLabel: new Date(point.date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      }),
    }));
  }, [results]);

  const summaryCards = useMemo(() => {
    if (!summary) return [];

    return [
      {
        label: "Net Profit",
        value: formatMoney(summary.netProfit),
        tone: Number(summary.netProfit || 0) >= 0 ? "positive" : "negative",
        hint: `Final capital ${formatMoney(summary.finalCapital)}`,
      },
      {
        label: "Total Trades",
        value: compactFormatter.format(summary.totalTrades || 0),
        hint: `${summary.winningTrades || 0} wins / ${summary.losingTrades || 0} losses`,
      },
      {
        label: "Win Rate",
        value: formatPercent(summary.winRate),
        tone: Number(summary.winRate || 0) >= 50 ? "positive" : "negative",
        hint: `Avg trade ${formatPercent(summary.avgReturn)}`,
      },
      {
        label: "Profit Factor",
        value: formatMetric(summary.profitFactor),
        tone: Number(summary.profitFactor || 0) >= 1 ? "positive" : "negative",
        hint: `Best ${formatPercent(summary.bestTrade)} · Worst ${formatPercent(summary.worstTrade)}`,
      },
      {
        label: "Max Drawdown",
        value: formatPercent(summary.maxDrawdown),
        tone: "negative",
        hint: "Peak-to-trough decline",
      },
      {
        label: "Outperformance",
        value: formatPercent(summary.outperformance),
        tone: Number(summary.outperformance || 0) >= 0 ? "positive" : "negative",
        hint: `vs buy & hold ${formatPercent(summary.outperformancePct)}`,
      },
    ];
  }, [summary]);

  const signalCards = useMemo(() => {
    const stats = results?.signalStats || {};

    return [
      ["Entry Signals", stats.entrySignalsFound],
      ["Entries Executed", stats.entriesExecuted],
      ["Exit Signals", stats.exitSignalsFound],
      ["Exits Executed", stats.exitsExecuted],
      ["Skipped Entries", stats.skippedEntryNoNextBar],
      ["Skipped Exits", stats.skippedExitNoNextBar],
    ];
  }, [results]);

  const tradeRows = useMemo(() => results?.trades || [], [results]);
  const auditRows = useMemo(() => results?.auditLog || [], [results]);

  const searchSubtitle = useMemo(() => {
    if (!symbol) return "Search Upstox instruments and choose a symbol";

    return instrumentKey
      ? `${symbol} · ${instrumentKey}`
      : `${symbol} · resolved by symbol search`;
  }, [instrumentKey, symbol]);

  const backtestMeta = results?.backtestMeta;

  return (
    <MainLayout
      title="Backtest"
      subtitle={
        strategy?.name ||
        "AlgoRooms-style historical simulation powered by Upstox candles"
      }
    >
      <div className="px-6 py-6 pb-20 space-y-6">
        {strategy && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-slate-900">
                    {strategy.name}
                  </h2>
                  {strategy.backtestInterval && (
                    <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                      {strategy.intervalLimits?.[strategy.backtestInterval]?.label ||
                        strategy.backtestInterval}
                    </span>
                  )}
                </div>

                {strategy.description && (
                  <p className="mt-1 text-sm text-slate-500">
                    {strategy.description}
                  </p>
                )}

                <div className="mt-4 space-y-3">
                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Entry Rules
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {getEntryConditions().map((condition, index) => (
                        <div key={`${condition.indicator}-${index}`} className="flex items-center gap-1.5">
                          <ConditionPill condition={condition} />
                          {index !== getEntryConditions().length - 1 && (
                            <span className="text-[10px] font-bold uppercase text-slate-400">
                              {getConditionConnector(condition)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Exit Rules
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {getExitConditions().length ? (
                        getExitConditions().map((condition, index) => (
                          <div key={`${condition.indicator}-${index}`} className="flex items-center gap-1.5">
                            <ConditionPill condition={condition} variant="exit" />
                            {index !== getExitConditions().length - 1 && (
                              <span className="text-[10px] font-bold uppercase text-slate-400">
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
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[360px]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                  <div className="text-[10px] font-semibold uppercase text-slate-400">
                    Stop Loss
                  </div>
                  <div className="mt-1 text-base font-bold text-slate-700">
                    {Number(strategy.stopLoss) ? `${strategy.stopLoss}%` : "—"}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                  <div className="text-[10px] font-semibold uppercase text-slate-400">
                    Target
                  </div>
                  <div className="mt-1 text-base font-bold text-slate-700">
                    {Number(strategy.target) ? `${strategy.target}%` : "—"}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                  <div className="text-[10px] font-semibold uppercase text-slate-400">
                    Logic
                  </div>
                  <div className="mt-1 text-base font-bold text-slate-700">
                    {strategy.logic || "AND"}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Backtest Configuration
              </h2>
              <p className="text-sm text-slate-500">{searchSubtitle}</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
              <BadgeInfo size={14} />
              Closed candles, next-bar execution, slippage and commission
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-4">
            <div className="relative xl:col-span-2" ref={searchRef}>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Symbol
              </label>
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search stocks, futures, options, commodities..."
                  value={query}
                  onChange={(e) => {
                    suppressSearchRef.current = false;
                    setQuery(e.target.value);
                  }}
                  onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                  className="w-full rounded-xl border border-slate-200 py-3 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      suppressSearchRef.current = false;
                      setQuery("");
                      setSearchResults([]);
                      setSearchOpen(false);
                      setSymbol("");
                      setInstrumentKey("");
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 hover:text-slate-700"
                  >
                    Clear
                  </button>
                )}
              </div>

              {searchOpen && searchResults.length > 0 && (
                <div className="absolute z-40 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                  {searchResults.map((stock) => {
                    const exchange = stock.exchange || stock.market || "NSE";
                    const type = stock.type || stock.instrumentType || "";

                    return (
                      <button
                        key={stock.instrumentKey || `${stock.symbol}-${stock.name}`}
                        type="button"
                        onClick={() => {
                          suppressSearchRef.current = true;
                          setTimeout(() => {
                            suppressSearchRef.current = false;
                          }, 400);

                          setSymbol(stock.symbol);
                          setInstrumentKey(stock.instrumentKey || "");
                          setQuery(stock.symbol);
                          setSearchResults([]);
                          setSearchOpen(false);
                        }}
                        className="w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-blue-50 last:border-0"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-semibold text-slate-900">
                                {stock.symbol}
                              </div>
                              {exchange && (
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getExchangeClass(exchange)}`}
                                >
                                  {exchange}
                                </span>
                              )}
                              {type && (
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getTypeBadgeClass(type)}`}
                                >
                                  {type}
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 truncate text-xs text-slate-500">
                              {stock.name}
                            </div>
                          </div>
                          {stock.instrumentKey && (
                            <span className="shrink-0 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                              {stock.instrumentKey}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {symbol && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {symbol}
                  </span>
                  {instrumentKey && (
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
                      {instrumentKey}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Capital (INR)
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                  ₹
                </span>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={capital}
                  onChange={(e) => setCapital(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 py-3 pl-7 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={runBacktest}
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Play size={16} />
                )}
                {loading ? "Running..." : "Run Backtest"}
              </button>
            </div>
          </div>
        </section>

        {strategy?.backtestInterval && (
          <ResultBanner tone="amber">
            {strategy.backtestInterval !== "1d" && (
              <p>
                Primary candle timeframe is{" "}
                <strong>
                  {strategy.intervalLimits?.[strategy.backtestInterval]?.label ||
                    strategy.backtestInterval}
                </strong>
                . Intraday history is capped by Upstox limits.
              </p>
            )}
            {strategy.backtestPreview?.requiredIntervals?.length > 1 && (
              <p className="mt-1">
                Multi-timeframe strategy detected. Auxiliary RSI frames are
                aligned onto the primary bars during simulation.
              </p>
            )}
            <p className="mt-1">
              Trades execute on the next candle open after a signal, with
              slippage and commission applied.
            </p>
          </ResultBanner>
        )}

        {loading && (
          <ResultBanner tone="blue">
            <div className="space-y-1">
              <p className="font-medium">Running backtest</p>
              <p>Fetching closed candles from Upstox...</p>
              <p>Building indicators and evaluating signals...</p>
              <p>Preparing trade list and equity curve...</p>
            </div>
          </ResultBanner>
        )}

        {results && (
          <>
            {results.backtestMeta?.message && (
              <ResultBanner tone="blue">
                {results.backtestMeta.message}
                {results.backtestMeta.candleCount != null && (
                  <span className="mt-1 block text-blue-700">
                    Evaluated {results.backtestMeta.candleCount} candles on{" "}
                    {results.backtestMeta.intervalLabel} timeframe.
                  </span>
                )}
              </ResultBanner>
            )}

            {(results.summary?.totalTrades === 0 ||
              results.summary?.backtestHint) && (
              <ResultBanner tone="amber">
                {results.summary?.totalTrades === 0 && (
                  <p className="font-medium">
                    No trades were generated for this symbol and period.
                  </p>
                )}
                {results.summary?.backtestHint && (
                  <p className={results.summary?.totalTrades === 0 ? "mt-2" : ""}>
                    {results.summary.backtestHint}
                  </p>
                )}
              </ResultBanner>
            )}

            <div className="grid gap-4 lg:grid-cols-3">
              {summaryCards.map((card) => (
                <StatCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  hint={card.hint}
                  tone={card.tone}
                />
              ))}
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Equity Curve
                  </h3>
                  <p className="text-sm text-slate-500">
                    Strategy equity vs buy and hold over the evaluated window
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                    {backtestMeta?.intervalLabel || "Interval"}
                  </div>
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                    {compactFormatter.format(backtestMeta?.candleCount || 0)} candles
                  </div>
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                    {backtestMeta?.effectiveDays || "—"} days
                  </div>
                  {backtestMeta?.capped && (
                    <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                      capped
                    </div>
                  )}
                </div>
              </div>

              <div className="h-[360px] w-full">
                {equityData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={equityData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="shortLabel"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        minTickGap={24}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        tickFormatter={(value) => formatMoney(value)}
                        width={72}
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          formatMoney(value),
                          name === "equity" ? "Strategy" : "Buy & Hold",
                        ]}
                        labelFormatter={(label) => label}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 14px 30px rgba(15, 23, 42, 0.08)",
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="equity"
                        stroke="#2563eb"
                        strokeWidth={2.4}
                        dot={false}
                        name="Strategy"
                      />
                      <Line
                        type="monotone"
                        dataKey="buyHoldEquity"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                        name="Buy & Hold"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                    Run a backtest to view the equity curve.
                  </div>
                )}
              </div>
            </section>

            <div className="flex flex-wrap gap-2">
              <TabButton
                active={activeTab === "overview"}
                onClick={() => setActiveTab("overview")}
                icon={BarChart3}
              >
                Overview
              </TabButton>
              <TabButton
                active={activeTab === "trades"}
                onClick={() => setActiveTab("trades")}
                icon={Table2}
              >
                Trades
              </TabButton>
              <TabButton
                active={activeTab === "audit"}
                onClick={() => setActiveTab("audit")}
                icon={FileText}
              >
                Audit
              </TabButton>
            </div>

            {activeTab === "overview" && (
              <div className="grid gap-4 xl:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        Signal Flow
                      </h3>
                      <p className="text-sm text-slate-500">
                        Entry and exit confirmation counts
                      </p>
                    </div>
                    <Clock3 size={16} className="text-slate-400" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {signalCards.map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          {label}
                        </div>
                        <div className="mt-1 text-2xl font-bold text-slate-900">
                          {compactFormatter.format(value || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-base font-semibold text-slate-900">
                      Backtest Summary
                    </h3>
                    <p className="text-sm text-slate-500">
                      Core run metadata and simulation posture
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Data Source
                      </div>
                      <div className="mt-1 font-semibold text-slate-900">
                        Upstox
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Candle Count
                      </div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {compactFormatter.format(backtestMeta?.candleCount || 0)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Requested Period
                      </div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {backtestMeta?.requestedPeriod || period}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Run Time
                      </div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {results?.backtestTimeMs != null
                          ? `${Number(results.backtestTimeMs).toLocaleString()} ms`
                          : "—"}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "trades" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Trade History
                    </h3>
                    <p className="text-sm text-slate-500">
                      Next-bar executions with slippage and costs applied
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                    <RefreshCw size={14} />
                    {tradeRows.length} trades
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400">
                        <th className="pb-3 pr-4">#</th>
                        <th className="pb-3 pr-4">Entry</th>
                        <th className="pb-3 pr-4">Exit</th>
                        <th className="pb-3 pr-4">Entry Price</th>
                        <th className="pb-3 pr-4">Exit Price</th>
                        <th className="pb-3 pr-4">Return</th>
                        <th className="pb-3 pr-4">PnL</th>
                        <th className="pb-3 pr-4">Days</th>
                        <th className="pb-3 pr-4">Reason</th>
                        {validationMode && <th className="pb-3 pr-4">Verified</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {tradeRows.length ? (
                        tradeRows.map((trade, idx) => (
                          <tr
                            key={`${trade.entryDate}-${trade.exitDate}-${idx}`}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <td className="py-3 pr-4 font-medium text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="py-3 pr-4">
                              <div className="font-medium text-slate-900">
                                {formatDate(trade.entryDate)}
                              </div>
                              <div className="text-xs text-slate-500">
                                Signal {formatDateTime(trade.signalEntryDate || trade.entryDate)}
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="font-medium text-slate-900">
                                {formatDate(trade.exitDate)}
                              </div>
                              <div className="text-xs text-slate-500">
                                Signal {formatDateTime(trade.signalExitDate || trade.exitDate)}
                              </div>
                            </td>
                            <td className="py-3 pr-4 font-medium text-slate-900">
                              {formatMoney(trade.entryPrice)}
                            </td>
                            <td className="py-3 pr-4 font-medium text-slate-900">
                              {formatMoney(trade.exitPrice)}
                            </td>
                            <td
                              className={`py-3 pr-4 font-semibold ${toneClass(
                                trade.returnPct,
                              )}`}
                            >
                              {formatPercent(trade.returnPct)}
                            </td>
                            <td
                              className={`py-3 pr-4 font-semibold ${toneClass(
                                trade.pnl,
                              )}`}
                            >
                              {formatMoney(trade.pnl)}
                            </td>
                            <td className="py-3 pr-4 text-slate-700">
                              {trade.holdingDays || 0}
                            </td>
                            <td className="py-3 pr-4 text-slate-700">
                              {trade.reason}
                            </td>
                            {validationMode && (
                              <td className="py-3 pr-4">
                                {trade.entryConfirmed && trade.exitConfirmed ? (
                                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                    TRUE
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                                    FALSE
                                  </span>
                                )}
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={validationMode ? 10 : 9}
                            className="py-8 text-center text-sm text-slate-500"
                          >
                            No trades to display yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === "audit" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Validation Audit
                    </h3>
                    <p className="text-sm text-slate-500">
                      Confirmation trail for signal generation and execution
                    </p>
                  </div>
                  {!validationMode && (
                    <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
                      Validation mode off
                    </div>
                  )}
                </div>

                {validationMode ? (
                  auditRows.length ? (
                    <div className="space-y-3">
                      {auditRows.map((entry) => (
                        <div
                          key={entry.tradeNumber}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-semibold text-slate-900">
                              Trade #{entry.tradeNumber}
                            </div>
                            <div
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                entry.confirmed
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {entry.confirmed ? "CONFIRMED" : "NOT CONFIRMED"}
                            </div>
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                Entry
                              </div>
                              <div className="mt-1 text-sm text-slate-700">
                                {formatDateTime(entry.entry.date)} @ {formatMoney(entry.entry.price)}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {entry.entry.reason}
                              </div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                Exit
                              </div>
                              <div className="mt-1 text-sm text-slate-700">
                                {formatDateTime(entry.exit.date)} @ {formatMoney(entry.exit.price)}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {entry.exit.reason}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-3 text-sm">
                            <span className="rounded-full bg-white px-3 py-1 text-slate-700">
                              PnL {formatMoney(entry.pnl)}
                            </span>
                            <span className="rounded-full bg-white px-3 py-1 text-slate-700">
                              Return {formatPercent(entry.returnPct)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                      No audit entries were generated for this run.
                    </div>
                  )
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                    Audit logging is only available when validation mode is
                    enabled.
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default BacktestPage;
