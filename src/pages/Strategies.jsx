import { useEffect, useState } from "react";
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
} from "lucide-react";
import StrategyModal from "../components/StrategyModal";
import MainLayout from "../layout/MainLayout";
import StrategyResultsModal from "../components/StrategyResultsModal";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config/api";
import {
  confirmAction,
  showError,
  showInfo,
  showSuccess,
} from "../utils/toast";

const ConditionPill = ({ condition, connector }) => (
  <>
    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
      {condition.indicator} {condition.operator} {condition.value}
    </span>
    {connector && (
      <span className="text-[10px] font-bold text-slate-400 uppercase">
        {connector}
      </span>
    )}
  </>
);

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

  const getEntryConditions = (strategy) =>
    strategy.entryConditions?.length
      ? strategy.entryConditions
      : strategy.conditions || [];

  const getConditionConnector = (condition, strategy) =>
    condition.nextLogic || strategy.logic || "AND";

  const applyDefaultWatchlists = (list, wls) => {
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
  };

  const fetchWatchlists = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/api/watchlists?userId=${user.mongoId}`,
      );
      setWatchlists(res.data);
      applyDefaultWatchlists(strategies, res.data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchStrategies = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/strategies/${user.mongoId}`);
      setStrategies(res.data);
      applyDefaultWatchlists(res.data, watchlists);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
    fetchWatchlists();
  }, []);

  useEffect(() => {
    applyDefaultWatchlists(strategies, watchlists);
  }, [strategies, watchlists]);

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
      setShowResults(true);
    } catch (error) {
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
      subtitle="Build, scan and backtest your rules"
      actions={
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
      }
    >
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
        {loading ? (
          <p className="text-slate-500 text-sm">Loading strategies…</p>
        ) : strategies.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <h3 className="text-lg font-semibold text-slate-900">
              No strategies yet
            </h3>
            <p className="text-slate-500 mt-2 text-sm">
              Create your first scanner with RSI, EMA, volume or price rules.
            </p>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="mt-6 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
            >
              <Plus size={16} />
              Create Strategy
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {strategies.map((strategy) => (
              <article
                key={strategy._id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-lg text-slate-900">
                        {strategy.name}
                      </h2>
                      {strategy.alertEnabled ? (
                        <Bell size={14} className="text-green-600" />
                      ) : (
                        <BellOff size={14} className="text-slate-300" />
                      )}
                    </div>

                    {strategy.description && (
                      <p className="text-sm text-slate-500 mt-1">
                        {strategy.description}
                      </p>
                    )}

                    <div className="mt-3">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1.5">
                        Entry
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {getEntryConditions(strategy).map((condition, idx) => (
                          <ConditionPill
                            key={idx}
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

                    {strategy.exitConditions?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1.5">
                          Exit
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {strategy.exitConditions.map((condition, idx) => (
                            <ConditionPill
                              key={idx}
                              condition={condition}
                              connector={
                                idx !== strategy.exitConditions.length - 1
                                  ? getConditionConnector(condition, strategy)
                                  : null
                              }
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 mt-3 text-xs text-slate-500">
                      {strategy.stopLoss > 0 && (
                        <span>SL {strategy.stopLoss}%</span>
                      )}
                      {strategy.target > 0 && (
                        <span>Target {strategy.target}%</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:min-w-[220px]">
                    <select
                      value={selectedWatchlists[strategy._id] || ""}
                      onChange={(e) =>
                        setSelectedWatchlists({
                          ...selectedWatchlists,
                          [strategy._id]: e.target.value,
                        })
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                      {watchlists.map((wl) => (
                        <option key={wl._id} value={wl._id}>
                          {wl.name}
                        </option>
                      ))}
                    </select>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={scanningStrategy === strategy._id}
                        onClick={() => runScan(strategy._id, strategy.name)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-3 py-2 rounded-lg text-sm font-medium"
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
                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
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
                        className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteStrategy(strategy._id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {scanningStrategy && (
          <div className="fixed inset-0 bg-black/40 z-[999] flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center gap-3 min-w-[300px]">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="font-medium">Running scan…</p>
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
      />
    </MainLayout>
  );
}
