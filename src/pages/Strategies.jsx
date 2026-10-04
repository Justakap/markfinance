import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Plus,
  Pencil,
  Trash2,
  Bell,
  BellOff,
  Loader2,
  Play,
  LineChart,
  ChevronDown,
} from "lucide-react";
import StrategyModal from "../components/StrategyModal";
import MainLayout from "../layout/MainLayout";
import StrategyResultsModal from "../components/StrategyResultsModal";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config/api";
import { apiFetch } from "../utils/api";
import {
  confirmAction,
  showError,
  showInfo,
  showSuccess,
} from "../utils/toast";

const ConditionPill = ({ condition, connector }) => (
  <>
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-medium shadow-sm">
      {condition.indicator} {condition.operator} {condition.value}
    </span>
    {connector && (
      <span className="text-[10px] font-bold text-slate-400 uppercase px-0.5">
        {connector}
      </span>
    )}
  </>
);

const scanModeBadge = (strategy) => {
  const hasExit =
    (strategy.exitConditions?.length || 0) > 0 ||
    Number(strategy.stopLoss) > 0 ||
    Number(strategy.target) > 0;

  return hasExit
    ? { label: "Active scan", className: "bg-violet-50 text-violet-700 border-violet-100" }
    : { label: "Entry scan", className: "bg-emerald-50 text-emerald-700 border-emerald-100" };
};

export default function Strategies() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [strategies, setStrategies] = useState([]);
  const [scanningStrategy, setScanningStrategy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState(null);
  const [watchlists, setWatchlists] = useState([]);
  const [selectedWatchlists, setSelectedWatchlists] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [matchedStocks, setMatchedStocks] = useState([]);
  const [strategyName, setStrategyName] = useState("");
  const [lastScanMs, setLastScanMs] = useState(null);
  const [scanMode, setScanMode] = useState("entry");
  const [scanSkipped, setScanSkipped] = useState([]);

  const getEntryConditions = (strategy) =>
    strategy.entryConditions?.length
      ? strategy.entryConditions
      : strategy.conditions || [];

  const getConditionConnector = (condition, strategy) =>
    condition.nextLogic || strategy.logic || "AND";

  const applyDefaultWatchlists = useCallback((list, wls) => {
    if (!wls.length || !list.length) return;

    const saved =
      localStorage.getItem("selectedWatchlist") || wls[0]?._id || "";

    setSelectedWatchlists((prev) => {
      const next = { ...prev };

      list.forEach((strategy) => {
        if (!next[strategy._id]) {
          next[strategy._id] = saved;
        }
      });

      return next;
    });
  }, []);

  const fetchWatchlists = useCallback(async () => {
    if (!user.mongoId) return;

    try {
      const data = await apiFetch(`/api/watchlists?userId=${user.mongoId}`);
      setWatchlists(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log(error);
    }
  }, [user.mongoId]);

  const fetchStrategies = useCallback(async () => {
    if (!user.mongoId) {
      setLoading(false);
      return;
    }

    try {
      const data = await apiFetch(`/api/strategies/${user.mongoId}`);
      setStrategies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showError(
        err?.message || "Could not load strategies. Log out and sign in again.",
      );
    } finally {
      setLoading(false);
    }
  }, [user.mongoId]);

  useEffect(() => {
    fetchStrategies();
    fetchWatchlists();
  }, [fetchStrategies, fetchWatchlists]);

  useEffect(() => {
    applyDefaultWatchlists(strategies, watchlists);
  }, [applyDefaultWatchlists, strategies, watchlists]);

  const createStrategy = async (data) => {
    await axios.post(`${API_URL}/api/strategies`, {
      ...data,
      userId: user.mongoId,
    });
    fetchStrategies();
  };

  const updateStrategy = async (data) => {
    await axios.put(`${API_URL}/api/strategies/${editingStrategy._id}`, data);
    fetchStrategies();
    setEditingStrategy(null);
  };

  const seedSampleStrategies = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/strategies/seed-samples`);
      showSuccess(res.data?.message || "Sample strategies added");
      fetchStrategies();
    } catch (error) {
      showError(
        error?.response?.data?.message || "Could not add sample strategies",
      );
    }
  };

  const deleteStrategy = async (id) => {
    const confirmed = await confirmAction({
      title: "Delete strategy",
      message: "Delete this strategy? This cannot be undone.",
      confirmText: "Delete",
    });

    if (!confirmed) return;

    await axios.delete(`${API_URL}/api/strategies/${id}`);
    fetchStrategies();
    showSuccess("Strategy deleted");
  };

  const runScan = async (strategyId, name) => {
    const watchlistId = selectedWatchlists[strategyId];

    if (!watchlistId) {
      showInfo("Please select a watchlist");
      return;
    }

    try {
      setScanningStrategy(strategyId);

      const res = await axios.post(`${API_URL}/api/strategies/run`, {
        strategyId,
        watchlistId,
      });

      setMatchedStocks(res.data.matches || []);
      setStrategyName(name);
      setLastScanMs(res.data.scanTimeMs ?? null);
      setScanMode(res.data.scanMode || "entry");
      setScanSkipped(res.data.skipped || []);
      setShowResults(true);

      if (res.data.skipped?.length) {
        showInfo(
          `${res.data.skipped.length} symbol(s) skipped (expired or invalid Upstox keys). Re-add from search.`,
        );
      }
    } catch (error) {
      const skipped = error?.response?.data?.skipped;
      if (skipped?.length) {
        setScanSkipped(skipped);
      }

      showError(
        error?.response?.data?.message ||
          "Strategy scan failed. Check backend is running and you are logged in.",
      );
    } finally {
      setScanningStrategy(null);
    }
  };

  return (
    <MainLayout
      title="Strategies"
      subtitle="Build rules, scan your watchlist live, and backtest"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={seedSampleStrategies}
            className="inline-flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2.5 rounded-xl text-sm font-medium"
          >
            Add samples
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingStrategy(null);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm"
          >
            <Plus size={16} />
            New Strategy
          </button>
        </div>
      }
    >
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen max-w-6xl">
        {!user.mongoId ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-amber-900 text-sm">
            Session missing user id. Log out from Settings and sign in again to
            use strategies.
          </div>
        ) : loading ? (
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Loader2 size={16} className="animate-spin" />
            Loading strategies…
          </div>
        ) : strategies.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              No strategies yet
            </h3>
            <p className="text-slate-500 mt-2 text-sm max-w-md mx-auto">
              Create scanners with RSI, EMA, volume or price rules. Run a live
              scan on any watchlist using Upstox data.
            </p>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="mt-6 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Plus size={16} />
              Create Strategy
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {strategies.map((strategy) => {
              const badge = scanModeBadge(strategy);
              const watchlistId = selectedWatchlists[strategy._id] || "";
              const watchlistName =
                watchlists.find((wl) => wl._id === watchlistId)?.name || "";

              return (
                <article
                  key={strategy._id}
                  className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden"
                >
                  <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-semibold text-base text-slate-900 truncate">
                            {strategy.name}
                          </h2>
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                          {strategy.alertEnabled ? (
                            <Bell size={14} className="text-emerald-600 shrink-0" />
                          ) : (
                            <BellOff size={14} className="text-slate-300 shrink-0" />
                          )}
                        </div>
                        {strategy.description && (
                          <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">
                            {strategy.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative">
                        <select
                          value={watchlistId}
                          onChange={(e) =>
                            setSelectedWatchlists({
                              ...selectedWatchlists,
                              [strategy._id]: e.target.value,
                            })
                          }
                          className="appearance-none w-full min-w-[140px] border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        >
                          {watchlists.map((wl) => (
                            <option key={wl._id} value={wl._id}>
                              {wl.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={14}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={scanningStrategy === strategy._id}
                        onClick={() => runScan(strategy._id, strategy.name)}
                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3.5 py-2 rounded-lg text-sm font-medium"
                      >
                        {scanningStrategy === strategy._id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Play size={14} />
                        )}
                        Scan
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/backtest/${strategy._id}`)}
                        className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-3.5 py-2 rounded-lg text-sm font-medium"
                      >
                        <LineChart size={14} />
                        Backtest
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingStrategy(strategy);
                          setShowModal(true);
                        }}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                        aria-label="Edit"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteStrategy(strategy._id)}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-red-50 text-red-500"
                        aria-label="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="px-5 py-4 grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Entry
                      </p>
                      <div className="flex flex-wrap items-center gap-1">
                        {getEntryConditions(strategy).map((condition, idx) => (
                          <ConditionPill
                            key={`${strategy._id}-entry-${idx}`}
                            condition={condition}
                            connector={
                              idx !== getEntryConditions(strategy).length - 1
                                ? getConditionConnector(condition, strategy)
                                : null
                            }
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Exit
                      </p>
                      {strategy.exitConditions?.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {strategy.exitConditions.map((condition, idx) => (
                            <ConditionPill
                              key={`${strategy._id}-exit-${idx}`}
                              condition={condition}
                              connector={
                                idx !== strategy.exitConditions.length - 1
                                  ? getConditionConnector(condition, strategy)
                                  : null
                              }
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">
                          {Number(strategy.stopLoss) > 0 ||
                          Number(strategy.target) > 0
                            ? `SL ${strategy.stopLoss || 0}% · Target ${strategy.target || 0}%`
                            : "No exit rules — entry scan only"}
                        </p>
                      )}
                    </div>
                  </div>

                  {watchlistName && (
                    <div className="px-5 pb-3">
                      <p className="text-[11px] text-slate-400">
                        Watchlist:{" "}
                        <span className="text-slate-600 font-medium">
                          {watchlistName}
                        </span>
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {scanningStrategy && (
          <div className="fixed inset-0 bg-slate-900/40 z-[999] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center gap-3 min-w-[280px]">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="font-medium text-slate-800">Running live scan…</p>
              <p className="text-xs text-slate-500">Upstox market data</p>
            </div>
          </div>
        )}

        <StrategyModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingStrategy(null);
          }}
          onSave={(data) =>
            editingStrategy ? updateStrategy(data) : createStrategy(data)
          }
          editingStrategy={editingStrategy}
        />
      </div>

      <StrategyResultsModal
        isOpen={showResults}
        onClose={() => setShowResults(false)}
        strategyName={strategyName}
        stocks={matchedStocks}
        scanTimeMs={lastScanMs}
        scanMode={scanMode}
        skipped={scanSkipped}
      />
    </MainLayout>
  );
}
