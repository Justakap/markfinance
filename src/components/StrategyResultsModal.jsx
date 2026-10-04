import { X, TrendingDown, TrendingUp } from "lucide-react";

const SCAN_MODE_COPY = {
  entry:
    "Entry-only: symbols matching entry rules right now (Upstox live data, same logic as backtest).",
  active:
    "Active setups: entry met and exit / stop / target not triggered.",
};

function formatSymbol(stock) {
  const raw =
    stock.symbol ||
    stock.name ||
    (stock.instrumentKey ? String(stock.instrumentKey).split("|").pop() : "");
  return String(raw).replace(/\.(NS|BO)$/i, "").trim() || "—";
}

function rowKey(stock, index) {
  return stock.instrumentKey || stock.symbol || `match-${index}`;
}

export default function StrategyResultsModal({
  isOpen,
  onClose,
  strategyName,
  stocks = [],
  scanTimeMs,
  scanMode = "entry",
  skipped = [],
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden border border-slate-200">
        <div className="flex justify-between items-start gap-4 border-b border-slate-100 px-6 py-5 bg-slate-50/80">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">
              Scan results
            </p>
            <h2 className="text-xl font-bold text-slate-900 truncate">
              {strategyName}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              <span className="font-semibold text-slate-900">
                {stocks.length}
              </span>{" "}
              match{stocks.length === 1 ? "" : "es"}
              {scanTimeMs != null && (
                <span className="text-emerald-600 font-medium">
                  {" "}
                  · {scanTimeMs} ms
                </span>
              )}
              <span className="text-slate-400"> · Upstox</span>
            </p>
            <p className="text-xs text-slate-500 mt-2 max-w-lg leading-relaxed">
              {SCAN_MODE_COPY[scanMode] || SCAN_MODE_COPY.entry}
            </p>
            {skipped.length > 0 && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3 max-w-lg">
                Skipped {skipped.length} invalid/expired key
                {skipped.length === 1 ? "" : "s"}:{" "}
                {skipped
                  .map((row) => row.symbol || row.instrumentKey)
                  .join(", ")}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 shrink-0"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-auto max-h-[calc(90vh-140px)]">
          {stocks.length === 0 ? (
            <div className="p-16 text-center">
              <p className="text-slate-600 font-medium">No matches</p>
              <p className="text-sm text-slate-400 mt-1">
                No symbols in this watchlist passed the strategy rules.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-white sticky top-0 z-10">
                  <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Symbol
                  </th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    LTP
                  </th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Change
                  </th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Volume
                  </th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    EMA20
                  </th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    EMA50
                  </th>
                  <th className="text-right px-6 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    RSI
                  </th>
                  <th className="text-right px-6 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    PE
                  </th>
                </tr>
              </thead>

              <tbody>
                {stocks.map((stock, index) => {
                  const symbol = formatSymbol(stock);
                  const change = Number(stock.change) || 0;
                  const isUp = change >= 0;

                  return (
                    <tr
                      key={rowKey(stock, index)}
                      className="border-b border-slate-50 hover:bg-blue-50/40 transition-colors"
                    >
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-slate-900">
                          {symbol}
                        </div>
                        {stock.name && stock.name !== symbol && (
                          <div className="text-xs text-slate-500 truncate max-w-[180px]">
                            {stock.name}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right font-medium text-slate-800 tabular-nums">
                        ₹{Number(stock.price || 0).toFixed(2)}
                      </td>

                      <td className="px-4 py-3.5 text-right tabular-nums">
                        <span
                          className={`inline-flex items-center gap-0.5 font-semibold ${
                            isUp ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {isUp ? (
                            <TrendingUp size={14} />
                          ) : (
                            <TrendingDown size={14} />
                          )}
                          {change.toFixed(2)}%
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right text-slate-600 tabular-nums">
                        {Number(stock.volume || 0).toLocaleString("en-IN")}
                      </td>

                      <td className="px-4 py-3.5 text-right text-slate-700 tabular-nums">
                        {stock.ema20 != null
                          ? Number(stock.ema20).toFixed(2)
                          : "—"}
                      </td>

                      <td className="px-4 py-3.5 text-right text-slate-700 tabular-nums">
                        {stock.ema50 != null
                          ? Number(stock.ema50).toFixed(2)
                          : "—"}
                      </td>

                      <td className="px-6 py-3.5 text-right text-slate-700 tabular-nums">
                        {stock.rsi != null ? Number(stock.rsi).toFixed(1) : "—"}
                      </td>

                      <td className="px-6 py-3.5 text-right text-slate-700 tabular-nums">
                        {stock.pe != null
                          ? Number(stock.pe).toFixed(2)
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
