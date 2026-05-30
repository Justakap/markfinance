import { X } from "lucide-react";

export default function StrategyResultsModal({
  isOpen,
  onClose,
  strategyName,
  stocks = [],
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center border-b p-5">
          <div>
            <h2 className="text-xl font-bold">{strategyName}</h2>

            <p className="text-gray-500">Matches Found: {stocks.length}</p>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-auto max-h-[75vh]">
          {stocks.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No stocks matched this strategy.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-3 text-left">Symbol</th>
                  <th className="p-3 text-left">Price</th>
                  <th className="p-3 text-left">Change</th>
                  <th className="p-3 text-left">Volume</th>
                  <th className="p-3 text-left">EMA20</th>
                  <th className="p-3 text-left">EMA50</th>
                  <th className="p-3 text-left">RSI</th>
                  <th className="p-3 text-left">PE</th>
                </tr>
              </thead>

              <tbody>
                {stocks.map((stock) => (
                  <tr key={stock.symbol} className="border-t hover:bg-blue-50">
                    <td className="p-3 font-medium text-blue-700">
                      {stock.symbol?.replace(".NS", "")}
                    </td>

                    <td className="p-3">₹{stock.price?.toFixed(2)}</td>

                    <td
                      className={`p-3 font-semibold ${
                        stock.change > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {stock.change?.toFixed(2)}%
                    </td>

                    <td className="p-3">{stock.volume?.toLocaleString()}</td>

                    <td className="p-3">{stock.ema20 ?? "--"}</td>

                    <td className="p-3">{stock.ema50 ?? "--"}</td>

                    <td className="p-3">{stock.rsi ?? "--"}</td>

                    <td className="p-3">{stock.pe?.toFixed(2) ?? "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
