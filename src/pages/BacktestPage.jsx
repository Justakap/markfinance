import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Play,
} from "lucide-react";
import { API_URL } from "../config/api";

const BacktestPage = () => {
  const { strategyId } = useParams();

  const [strategy, setStrategy] = useState(null);

  const [symbol, setSymbol] = useState("");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [period, setPeriod] = useState("1y");
  const [capital, setCapital] = useState(10000);

  const [loading, setLoading] = useState(false);

  const [results, setResults] = useState(null);

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const getEntryConditions = () =>
    strategy?.entryConditions?.length
      ? strategy.entryConditions
      : strategy?.conditions || [];

  const getExitConditions = () => strategy?.exitConditions || [];

  const formatCondition = (condition) =>
    `${condition.indicator} ${condition.operator} ${condition.value}`;

  const getConditionConnector = (condition) =>
    condition.nextLogic || strategy?.logic || "AND";

  useEffect(() => {
    const fetchStrategy = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/api/strategy-details/${strategyId}`,
        );

        setStrategy(res.data);
      } catch (err) {
        console.error("Fetch Strategy Error:", err);

        alert(err?.response?.data?.message || "Failed to load strategy");
      }
    };

    fetchStrategy();
  }, [strategyId]);

  const searchStocks = async (value) => {
    if (value.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await axios.get(
        `${API_URL}/api/search-stock?q=${value}`,
      );

      setSearchResults(res.data);
    } catch (error) {
      console.log(error);
    }
  };
  const runBacktest = async () => {
    if (!symbol) {
      alert("Please enter a stock symbol");
      return;
    }

    try {
      setLoading(true);

      const res = await axios.post(`${API_URL}/api/backtest/run`, {
        strategyId,
        symbol,
        period,
        capital,
      });

      setResults(res.data);
    } catch (err) {
      console.error("Backtest Error:", err);

      alert(err?.response?.data?.message || "Backtest failed");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Strategy Backtesting</h1>

          <p className="text-gray-500 mt-2">
            Test your strategy against historical data
          </p>
        </div>

        {/* STRATEGY CARD */}

        {strategy && (
          <div className="bg-white shadow-sm border rounded-xl border-slate-800 p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-semibold">{strategy.name}</h2>

                {strategy.description && (
                  <p className="text-gray-500 mt-2">{strategy.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 min-w-56">
                <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-red-500">
                    Stop Loss
                  </p>
                  <p className="text-lg font-bold text-red-700">
                    {Number(strategy.stopLoss || 0)}%
                  </p>
                </div>

                <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-green-600">
                    Target
                  </p>
                  <p className="text-lg font-bold text-green-700">
                    {Number(strategy.target || 0)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
                  Entry Conditions
                </h3>

                <div className="space-y-2">
                  {getEntryConditions().map((condition, index) => (
                    <div key={index}>
                      <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-2 text-sm font-medium">
                        {formatCondition(condition)}
                      </div>

                      {index !== getEntryConditions().length - 1 && (
                        <div className="flex justify-center my-2">
                          <span className="rounded-md border border-blue-100 bg-white px-3 py-1 text-[11px] font-bold text-blue-600">
                            {getConditionConnector(condition)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
                  Exit Conditions
                </h3>

                <div className="space-y-2">
                  {getExitConditions().length ? (
                    getExitConditions().map((condition, index) => (
                      <div key={index}>
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-2 text-sm font-medium">
                          {formatCondition(condition)}
                        </div>

                        {index !== getExitConditions().length - 1 && (
                          <div className="flex justify-center my-2">
                            <span className="rounded-md border border-amber-100 bg-white px-3 py-1 text-[11px] font-bold text-amber-700">
                              {getConditionConnector(condition)}
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 text-gray-600 rounded-lg px-4 py-2 text-sm font-medium">
                      Exit by stop loss / target only
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONFIGURATION */}

        <div className="bg-white shadow-sm border rounded-xl border border-slate-800 p-6 mb-8">
          <h2 className="text-xl font-semibold mb-5">Backtest Configuration</h2>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="relative">
              <label className="text-sm text-gray-600 block mb-2">Stock</label>

              <input
                type="text"
                placeholder="Search Stock..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  searchStocks(e.target.value);
                }}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3"
              />

              {searchResults.length > 0 && (
                <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                  {searchResults.map((stock) => (
                    <button
                      key={stock.symbol}
                      type="button"
                      onClick={() => {
                        setSymbol(stock.symbol);
                        setQuery(`${stock.symbol} - ${stock.name}`);
                        setSearchResults([]);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100"
                    >
                      <div className="font-semibold text-gray-900">
                        {stock.symbol}
                      </div>

                      <div className="text-sm text-gray-500">{stock.name}</div>
                    </button>
                  ))}
                </div>
              )}

              {symbol && (
                <div className="mt-2 text-sm text-blue-600 font-medium">
                  Selected: {symbol}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-500 block mb-2">Period</label>

              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3"
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
              <label className="text-sm text-gray-500 block mb-2">
                Capital
              </label>

              <input
                type="number"
                value={capital}
                onChange={(e) => setCapital(Number(e.target.value))}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3"
              />
            </div>
          </div>

          <button
            onClick={runBacktest}
            disabled={loading}
            className="mt-6 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition"
          >
            <Play size={18} />

            {loading ? "Running Backtest..." : "Run Backtest"}
          </button>
        </div>

        {/* LOADER */}

        {loading && (
          <div className="bg-white shadow-sm border border border-slate-800 rounded-xl p-6 mb-8">
            <h3 className="font-semibold mb-2">Running Backtest</h3>

            <p className="text-gray-500">Fetching historical candles...</p>

            <p className="text-gray-500">Calculating indicators...</p>

            <p className="text-gray-500">Evaluating strategy...</p>

            <p className="text-gray-500">Generating trades...</p>
          </div>
        )}

        {/* RESULTS */}

        {results && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {/* Trades */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <p className="text-xs font-bold tracking-wide text-gray-500 uppercase mb-3">
                  Total Trades
                </p>

                <div className="text-4xl font-bold text-blue-600">
                  {results.summary?.totalTrades}
                </div>

                <p className="text-sm text-gray-500 mt-3">
                  Generated by strategy
                </p>
              </div>

              {/* Win Rate */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <p className="text-xs font-bold tracking-wide text-gray-500 uppercase mb-3">
                  Win Rate
                </p>

                <div
                  className={`text-4xl font-bold ${
                    results.summary?.winRate >= 50
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {results.summary?.winRate}%
                </div>

                <p className="text-sm text-gray-500 mt-3">Successful trades</p>
              </div>

              {/* Capital */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <p className="text-xs font-bold tracking-wide text-gray-500 uppercase mb-3">
                  Final Capital
                </p>

                <div className="text-3xl font-bold text-gray-900">
                  ₹{results.summary?.finalCapital?.toLocaleString()}
                </div>

                <p className="text-sm text-gray-500 mt-3">Portfolio value</p>
              </div>

              {/* Avg Return */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <p className="text-xs font-bold tracking-wide text-gray-500 uppercase mb-3">
                  Avg Return
                </p>

                <div
                  className={`text-4xl font-bold ${
                    results.summary?.avgReturn >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {results.summary?.avgReturn}%
                </div>

                <p className="text-sm text-gray-500 mt-3">Per trade average</p>
              </div>

              {/* Total Return */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <p className="text-xs font-bold tracking-wide text-gray-500 uppercase mb-3">
                  Total Return
                </p>

                <div
                  className={`text-4xl font-bold ${
                    results.summary?.totalReturn >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {results.summary?.totalReturn > 0 ? "+" : ""}
                  {results.summary?.totalReturn}%
                </div>

                <p className="text-sm text-gray-500 mt-3">
                  Overall performance
                </p>
              </div>

              {/* Profit */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <p className="text-xs font-bold tracking-wide text-gray-500 uppercase mb-3">
                  Net Profit
                </p>

                <div
                  className={`text-3xl font-bold ${
                    results.summary?.finalCapital - capital >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  ₹{(results.summary?.finalCapital - capital).toLocaleString()}
                </div>

                <p className="text-sm text-gray-500 mt-3">Profit / Loss</p>
              </div>
            </div>

            {/* EQUITY CURVE PLACEHOLDER */}

            <div className="bg-white shadow-sm border rounded-xl border border-slate-800 p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Equity Curve</h2>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={results.equityCurve}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) =>
                        new Date(date).toLocaleDateString("en-IN", {
                          month: "short",
                          year: "2-digit",
                        })
                      }
                    />{" "}
                    <YAxis />
                    <Tooltip labelFormatter={(date) => formatDate(date)} />{" "}
                    <Line
                      type="monotone"
                      dataKey="equity"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* TRADE TABLE */}

            <div className="bg-white shadow-sm border rounded-xl border border-slate-800 p-6">
              <h2 className="text-xl font-semibold mb-4">Trade History</h2>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-slate-700">
                      <th className="pb-3">Entry</th>
                      <th className="pb-3">Exit</th>
                      <th className="pb-3">Buy</th>
                      <th className="pb-3">Sell</th>
                      <th className="pb-3">Return</th>
                      <th className="pb-3">Reason</th>
                    </tr>
                  </thead>

                  <tbody>
                    {results.trades?.map((trade, idx) => (
                      <tr key={idx} className="border-b border-slate-800">
                        <td className="py-3">{formatDate(trade.entryDate)}</td>

                        <td className="py-3">{formatDate(trade.exitDate)}</td>

                        <td className="py-3">₹{trade.entryPrice}</td>

                        <td className="py-3">₹{trade.exitPrice}</td>

                        <td
                          className={`py-3 ${
                            trade.returnPct > 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {trade.returnPct}%
                        </td>

                        <td className="py-3">{trade.reason || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BacktestPage;
