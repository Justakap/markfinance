import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

/** Strategy equity vs. buy-and-hold benchmark, from the real
 *  BacktestResult.equitySeries (Phase F.5/F) — never fabricated. */
export default function EquityCurveChart({ equitySeries }) {
  if (!equitySeries?.timestamps?.length) {
    return <p className="text-sm text-gray-400">No equity data for this backtest.</p>;
  }

  const data = equitySeries.timestamps.map((ts, i) => ({
    date: new Date(ts).toLocaleDateString(),
    equity: equitySeries.equity[i],
    benchmark: equitySeries.benchmarkEquity?.[i],
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={30} />
          <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="equity" name="Strategy" stroke="#2563eb" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="benchmark" name="Buy & Hold" stroke="#9ca3af" dot={false} strokeWidth={1.5} strokeDasharray="4 4" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
