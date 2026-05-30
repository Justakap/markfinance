import { useEffect, useState } from "react";
import axios from "axios";
import { Plus, Pencil, Trash2, Bell, BellOff, Loader2 } from "lucide-react";
import StrategyModal from "../components/StrategyModal";
import MainLayout from "../layout/MainLayout";
import StrategyResultsModal from "../components/StrategyResultsModal";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config/api";

export default function Strategies() {
  const navigate = useNavigate();

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

  const user = JSON.parse(localStorage.getItem("user"));

  const getEntryConditions = (strategy) =>
    strategy.entryConditions?.length
      ? strategy.entryConditions
      : strategy.conditions || [];

  const getConditionConnector = (condition, strategy) =>
    condition.nextLogic || strategy.logic || "AND";

  const fetchWatchlists = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/api/watchlists?userId=${user.mongoId}`,
      );

      console.log("WATCHLISTS:", res.data);

      setWatchlists(res.data);
    } catch (error) {
      console.log(error);
    }
  };
  const fetchStrategies = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/strategies/${user.mongoId}`);

      setStrategies(res.data);
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
    if (!window.confirm("Delete strategy?")) return;

    await axios.delete(`${API_URL}/api/strategies/${id}`);

    fetchStrategies();
  };
  const runScan = async (strategyId, strategyName) => {
    console.log("RUN CLICKED");
    console.log(strategyId);
    console.log(strategyName);

    try {
      const watchlistId = selectedWatchlists[strategyId];

      console.log("WATCHLIST:", watchlistId);

      if (!watchlistId) {
        alert("Please select a watchlist");
        return;
      }

      setScanningStrategy(strategyId);

      const res = await axios.post(`${API_URL}/api/strategies/run`, {
        strategyId,
        watchlistId,
      });

      console.log("SCAN RESULT", res.data);

      setMatchedStocks(res.data.matches);
      setStrategyName(strategyName);
      setShowResults(true);
    } catch (error) {
      console.log("SCAN ERROR");
      console.log(error);
    } finally {
      setScanningStrategy(null);
    }
  };

  return (
    <MainLayout
      title="Strategy Builder"
      subtitle="Create custom scanners and alerts"
      actions={
        <button
          onClick={() => {
            setEditingStrategy(null);
            setShowModal(true);
          }}
          className="
            bg-[#2563EB]
            hover:bg-blue-700
            text-white
            px-5
            py-3
            rounded-xl
            flex
            items-center
            gap-2
            shadow-sm
          "
        >
          <Plus size={18} />
          New Strategy
        </button>
      }
    >
      <div className="p-8 bg-[#FAFBFC] min-h-screen">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="grid gap-4">
            {strategies.map((strategy) => (
              <div
                key={strategy._id}
                className="
    bg-white
    border
    border-gray-200
    rounded-2xl
    p-6
    shadow-sm
    hover:shadow-md
    transition
  "
              >
                <div className="flex items-center justify-between gap-8">
                  {/* LEFT */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h2 className="font-bold text-xl text-slate-900">
                        {strategy.name}
                      </h2>

                      <span
                        className="
        px-3
        py-1
        rounded-full
        bg-green-100
        text-green-700
        text-xs
        font-medium
      "
                      >
                        ACTIVE
                      </span>

                    </div>

                    <p className="text-slate-500 mb-4">
                      {strategy.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      {getEntryConditions(strategy).map((condition, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div
                            className="
            px-3
            py-1
            bg-slate-100
            rounded-lg
            text-sm
          "
                          >
                            {condition.indicator} {condition.operator}{" "}
                            {condition.value}
                          </div>

                          {idx !== getEntryConditions(strategy).length - 1 && (
                            <span className="text-xs font-bold text-slate-500">
                              {getConditionConnector(condition, strategy)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* RIGHT */}
                  <div className="flex items-center gap-3">
                    {strategy.alertEnabled ? (
                      <Bell size={18} className="text-green-600" />
                    ) : (
                      <BellOff size={18} className="text-gray-400" />
                    )}

                    <select
                      value={selectedWatchlists[strategy._id] || ""}
                      onChange={(e) =>
                        setSelectedWatchlists({
                          ...selectedWatchlists,
                          [strategy._id]: e.target.value,
                        })
                      }
                      className="
        w-52
        border
        border-gray-300
        rounded-xl
        px-3
        py-2
        bg-white
      "
                    >
                      <option value="">Select Watchlist</option>

                      {watchlists.map((watchlist) => (
                        <option key={watchlist._id} value={watchlist._id}>
                          {watchlist.name}
                        </option>
                      ))}
                    </select>

                    <button
                      disabled={scanningStrategy === strategy._id}
                      onClick={() => runScan(strategy._id, strategy.name)}
                      className={`
        min-w-[120px]
        px-4
        py-2
        rounded-xl
        text-white
        font-medium
        transition

     ${
       scanningStrategy === strategy._id
         ? "bg-gray-400 cursor-not-allowed"
         : "bg-green-600 hover:bg-green-700"
     }
      `}
                    >
                      {scanningStrategy === strategy._id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </>
                      ) : (
                        "Run Scan"
                      )}
                    </button>

                    <button
                      onClick={() => navigate(`/backtest/${strategy._id}`)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
                    >
                      Run Backtest
                    </button>

                    <button
                      onClick={() => {
                        setEditingStrategy(strategy);
                        setShowModal(true);
                      }}
                      className="
        p-2
        hover:bg-blue-50
        rounded-lg
      "
                    >
                      <Pencil size={18} className="text-blue-600" />
                    </button>

                    <button
                      onClick={() => deleteStrategy(strategy._id)}
                      className="
        p-2
        hover:bg-red-50
        rounded-lg
      "
                    >
                      <Trash2 size={18} className="text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {scanningStrategy && (
          <div
            className="
    fixed inset-0
    bg-black/40
    z-[999]
    flex items-center justify-center
  "
          >
            <div
              className="
      bg-white
      rounded-2xl
      shadow-xl
      p-10
      flex flex-col
      items-center
      gap-4
      min-w-[350px]
    "
            >
              <div
                className="
          w-12 h-12
          border-4
          border-blue-600
          border-t-transparent
          rounded-full
          animate-spin
        "
              />

              <h3 className="font-semibold text-lg">Running Strategy Scan</h3>

              <p className="text-gray-500 text-center">
                Fetching market data, calculating indicators and evaluating
                stocks...
              </p>
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
      />
    </MainLayout>
  );
}
