import { useEffect, useState } from "react";
import { listBacktestTrades } from "../api/professionalApi";
import { showError } from "../../utils/toast";

const PAGE_SIZE = 25;

const EXIT_REASON_LABEL = {
  SIGNAL: "Signal",
  STOP_LOSS: "Stop Loss",
  TAKE_PROFIT: "Take Profit",
  TRAILING_STOP: "Trailing Stop",
  END_OF_DATA: "End of Data",
};

/** Always fetches from GET /api/v2/backtests/:id/trades (server-side
 *  paginated) rather than relying on the run response's inline trades —
 *  trades live in their own collection (BacktestTrade, Phase A) precisely
 *  so this can be an indexed query instead of an in-memory array scan,
 *  and this component is used identically whether viewing a backtest
 *  just run or one loaded from history. */
export default function TradeExplorer({ backtestResultId }) {
  const [trades, setTrades] = useState([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listBacktestTrades(backtestResultId, { skip, limit: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setTrades(res.trades || []);
        setTotal(res.total || 0);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err?.data?.message || "Failed to load trades";
        setError(message);
        showError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [backtestResultId, skip]);

  if (loading && trades.length === 0) return <p className="text-sm text-gray-400">Loading trades…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!loading && total === 0) return <p className="text-sm text-gray-400">No trades were generated for this backtest.</p>;

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">Entry</th>
              <th className="px-3 py-2 text-left">Exit</th>
              <th className="px-3 py-2 text-right">Entry Price</th>
              <th className="px-3 py-2 text-right">Exit Price</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Net P&amp;L</th>
              <th className="px-3 py-2 text-right">Return %</th>
              <th className="px-3 py-2 text-left">Exit Reason</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <tr key={t._id} className="border-t border-gray-100">
                <td className="px-3 py-1.5">{new Date(t.entryDate).toLocaleDateString()}</td>
                <td className="px-3 py-1.5">{new Date(t.exitDate).toLocaleDateString()}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{t.entryPrice}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{t.exitPrice}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{t.quantity}</td>
                <td className={`px-3 py-1.5 text-right tabular-nums font-medium ${t.netPnl >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {t.netPnl}
                </td>
                <td className={`px-3 py-1.5 text-right tabular-nums ${t.returnPct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {t.returnPct}%
                </td>
                <td className="px-3 py-1.5">{EXIT_REASON_LABEL[t.exitReason] || t.exitReason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > PAGE_SIZE && (
        <div className="mt-2 flex items-center justify-center gap-3 text-xs">
          <button
            type="button"
            disabled={skip === 0}
            onClick={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
            className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-gray-500">
            {skip + 1}-{Math.min(skip + PAGE_SIZE, total)} of {total}
          </span>
          <button
            type="button"
            disabled={skip + PAGE_SIZE >= total}
            onClick={() => setSkip((s) => s + PAGE_SIZE)}
            className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
