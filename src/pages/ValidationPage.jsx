import { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import { API_URL } from "../config/api";

const VALIDATION_SYMBOLS = [
  "INFY.NS",
  "RELIANCE.NS",
  "TCS.NS",
  "HDFCBANK.NS",
  "ICICIBANK.NS",
  "NIACL.NS",
];

const ValidationPage = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("NIACL.NS");
  const [rawData, setRawData] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/validation/indicators`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Validation failed");
      }
      setReport(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRaw = async (symbol) => {
    try {
      const res = await fetch(`${API_URL}/api/validation/debug/${symbol}`);
      if (res.ok) setRawData(await res.json());
    } catch {
      setRawData(null);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  useEffect(() => {
    if (selectedSymbol) fetchRaw(selectedSymbol);
  }, [selectedSymbol]);

  return (
    <MainLayout title="Validation Mode" subtitle="Developer indicator verification">
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <p className="text-gray-600 text-sm">
            Compares Mark Finance values against Wilder RSI / standard EMA
            (TradingView-compatible formulas).
          </p>
          <button
            type="button"
            onClick={fetchReport}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60"
          >
            {loading ? "Running…" : "Re-run Validation"}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        {report && (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              <div
                className={`rounded-xl p-5 border ${
                  report.rsi.allPassed
                    ? "bg-green-50 border-green-200"
                    : "bg-amber-50 border-amber-200"
                }`}
              >
                <h3 className="font-bold text-lg">RSI Validation</h3>
                <p className="text-sm mt-1">
                  {report.rsi.passed}/{report.rsi.total} passed (target ≤ 1
                  point)
                </p>
                <p className="font-semibold mt-2">
                  {report.rsi.allPassed ? "PASSED" : "NEEDS REVIEW"}
                </p>
              </div>
              <div
                className={`rounded-xl p-5 border ${
                  report.ema.allPassed
                    ? "bg-green-50 border-green-200"
                    : "bg-amber-50 border-amber-200"
                }`}
              >
                <h3 className="font-bold text-lg">EMA Validation</h3>
                <p className="text-sm mt-1">
                  {report.ema.passed}/{report.ema.total} passed (target &lt;
                  0.5%)
                </p>
                <p className="font-semibold mt-2">
                  {report.ema.allPassed ? "PASSED" : "NEEDS REVIEW"}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border overflow-x-auto">
              <h3 className="font-semibold p-4 border-b">RSI Comparison</h3>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left p-3">Symbol</th>
                    <th className="text-left p-3">Indicator</th>
                    <th className="text-right p-3">Mark Finance</th>
                    <th className="text-right p-3">Reference (TV)</th>
                    <th className="text-right p-3">Diff</th>
                    <th className="text-center p-3">Pass</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rsi.results.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-3">{row.symbol}</td>
                      <td className="p-3">{row.indicator}</td>
                      <td className="p-3 text-right">{row.markFinanceValue ?? "—"}</td>
                      <td className="p-3 text-right">{row.tradingViewValue ?? "—"}</td>
                      <td className="p-3 text-right">{row.difference ?? "—"}</td>
                      <td className="p-3 text-center">
                        {row.passed ? "✓" : "✗"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-xl border overflow-x-auto">
              <h3 className="font-semibold p-4 border-b">EMA Comparison</h3>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left p-3">Symbol</th>
                    <th className="text-left p-3">Indicator</th>
                    <th className="text-right p-3">Mark Finance</th>
                    <th className="text-right p-3">Reference (TV)</th>
                    <th className="text-right p-3">Diff %</th>
                    <th className="text-center p-3">Pass</th>
                  </tr>
                </thead>
                <tbody>
                  {report.ema.results.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-3">{row.symbol}</td>
                      <td className="p-3">{row.indicator}</td>
                      <td className="p-3 text-right">{row.markFinanceValue ?? "—"}</td>
                      <td className="p-3 text-right">{row.tradingViewValue ?? "—"}</td>
                      <td className="p-3 text-right">{row.differencePct ?? "—"}</td>
                      <td className="p-3 text-center">
                        {row.passed ? "✓" : "✗"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold mb-3">Raw Indicator Values</h3>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="border rounded-lg px-3 py-2 mb-4"
          >
            {VALIDATION_SYMBOLS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {rawData && (
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
              {JSON.stringify(rawData.rawData, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default ValidationPage;
