import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Trash2, Eye } from "lucide-react";
import MainLayout from "../layout/MainLayout";
import { API_URL } from "../config/api";
import { confirmAction, showSuccess } from "../utils/toast";

const BacktestsPage = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [backtests, setBacktests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [compareIds, setCompareIds] = useState([]);

  const fetchBacktests = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/backtests/${user.mongoId}`);
      setBacktests(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBacktests();
  }, []);

  const deleteBacktest = async (id) => {
    const confirmed = await confirmAction({
      title: "Delete backtest",
      message: "Delete this backtest result?",
      confirmText: "Delete",
    });

    if (!confirmed) return;

    await axios.delete(`${API_URL}/api/backtests/${id}`);
    setCompareIds((prev) => prev.filter((item) => item !== id));
    fetchBacktests();
    showSuccess("Backtest deleted");
  };

  const toggleCompare = (id) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const compared = backtests.filter((item) => compareIds.includes(item._id));

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <MainLayout
      title="Backtest History"
      subtitle="Review and compare your strategy backtests"
    >
      <div className="p-8 bg-[#FAFBFC] min-h-screen">
        {compareIds.length === 2 && compared.length === 2 && (
          <div className="mb-6 grid md:grid-cols-2 gap-4">
            {compared.map((item) => (
              <div
                key={item._id}
                className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm"
              >
                <h3 className="font-bold text-lg">
                  {item.strategyId?.name || "Strategy"} — {item.symbol}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {formatDate(item.createdAt)} · {item.period}
                </p>
                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <div>
                    <p className="text-gray-500">Net Profit</p>
                    <p className="font-semibold">
                      ₹{item.metrics?.netProfit?.toLocaleString?.() ?? item.metrics?.netProfit}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Win Rate</p>
                    <p className="font-semibold">{item.metrics?.winRate}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Profit Factor</p>
                    <p className="font-semibold">{item.metrics?.profitFactor}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Max Drawdown</p>
                    <p className="font-semibold">{item.metrics?.maxDrawdown}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <p className="p-8 text-gray-500">Loading backtests...</p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-sm text-gray-600">
                  <th className="p-4">Name</th>
                  <th className="p-4">Strategy</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Profit</th>
                  <th className="p-4">Win Rate</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {backtests.map((item) => (
                  <tr key={item._id} className="border-b border-gray-100">
                    <td className="p-4 font-medium">{item.symbol}</td>
                    <td className="p-4">
                      {item.strategyId?.name || "—"}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {formatDate(item.createdAt)}
                    </td>
                    <td
                      className={`p-4 font-semibold ${
                        (item.metrics?.netProfit || 0) >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      ₹{Number(item.metrics?.netProfit || 0).toLocaleString()}
                    </td>
                    <td className="p-4">{item.metrics?.winRate ?? "—"}%</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/backtest/${item.strategyId?._id || item.strategyId}`}
                          className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                          title="View strategy backtest"
                        >
                          <Eye size={18} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleCompare(item._id)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium ${
                            compareIds.includes(item._id)
                              ? "bg-purple-100 text-purple-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          Compare
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteBacktest(item._id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {backtests.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-500">
                      No backtests saved yet. Run a backtest from Strategies.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default BacktestsPage;
