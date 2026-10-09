import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

/** Drawdown % over time, from the real BacktestResult.equitySeries.drawdownPct. */
export default function DrawdownChart({ equitySeries }) {
  if (!equitySeries?.timestamps?.length) {
    return <p className="text-sm text-gray-400">No drawdown data for this backtest.</p>;
  }

  const data = equitySeries.timestamps.map((ts, i) => ({
    date: new Date(ts).toLocaleDateString(),
    drawdown: equitySeries.drawdownPct[i],
  }));

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={30} />
          <YAxis tick={{ fontSize: 10 }} domain={["auto", 0]} />
          <Tooltip formatter={(v) => `${v}%`} />
          <Area type="monotone" dataKey="drawdown" stroke="#dc2626" fill="#fecaca" strokeWidth={1.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
