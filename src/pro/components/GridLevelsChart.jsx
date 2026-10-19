import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ReferenceLine, Legend } from "recharts";

/**
 * Grid Trading Simulator (PAPER TRADING ONLY) — grid levels + simulated
 * fill markers. Deliberately plots only real data: the grid lines are
 * derived from the session's own config, and the markers are the actual
 * persisted trade ledger (fillPrice vs. sequence) — there is no continuous
 * tick-by-tick price history persisted for this session, so this chart
 * does NOT draw a fabricated continuous price line (same "never invent a
 * data point" discipline as src/pro/utils/candleMarkers.js, ADR-012).
 */
export default function GridLevelsChart({ config, trades, currentPrice, activeReference }) {
  if (!config) return null;

  const filled = trades.filter((t) => t.qtyFilled > 0);
  const prices = [
    config.referencePrice,
    ...(Number.isFinite(activeReference) ? [activeReference] : []),
    ...filled.map((t) => t.fillPrice),
    ...(Number.isFinite(currentPrice) ? [currentPrice] : []),
  ];
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = Math.max(config.gridInterval * 2, (maxPrice - minPrice) * 0.1 || config.gridInterval);
  const lowBound = minPrice - padding;
  const highBound = maxPrice + padding;

  // Lattice points never shift phase (ADR-031) — every point is still
  // `config.referencePrice + n*gridInterval` for some integer n — but
  // whether a given point is currently a BUY or SELL level depends on the
  // CURRENT active reference, not the immutable initial one, since the
  // grid trails the price after every crossing.
  const currentAnchor = Number.isFinite(activeReference) ? activeReference : config.referencePrice;
  const gridLines = [];
  for (let n = Math.floor((lowBound - config.referencePrice) / config.gridInterval); n * config.gridInterval + config.referencePrice <= highBound; n += 1) {
    const price = config.referencePrice + n * config.gridInterval;
    if (price === currentAnchor) continue; // the active reference itself is never a tradeable level
    if (price >= lowBound && price <= highBound) {
      gridLines.push({ n, price, type: price < currentAnchor ? "BUY" : "SELL" });
    }
  }

  // X-axis is the actual event time (not a sequence index) — each point's
  // own real eventTimestamp from the persisted trade, never interpolated.
  const buyPoints = filled.filter((t) => t.type === "BUY").map((t) => ({ x: new Date(t.eventTimestamp).getTime(), y: t.fillPrice, qty: t.qtyFilled }));
  const sellPoints = filled.filter((t) => t.type === "SELL").map((t) => ({ x: new Date(t.eventTimestamp).getTime(), y: t.fillPrice, qty: t.qtyFilled }));
  const times = filled.map((t) => new Date(t.eventTimestamp).getTime()).filter(Number.isFinite);
  const timeDomain = times.length ? [Math.min(...times), Math.max(...times)] : ["auto", "auto"];
  const formatTime = (ms) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  if (!filled.length && !Number.isFinite(currentPrice)) {
    return <p className="text-sm text-gray-400">No simulated fills yet — grid levels will appear here once the session is active.</p>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis
            type="number"
            dataKey="x"
            name="Time"
            domain={timeDomain}
            tickFormatter={formatTime}
            tick={{ fontSize: 10 }}
          />
          <YAxis type="number" dataKey="y" name="Price" tick={{ fontSize: 10 }} domain={[lowBound, highBound]} />
          <ZAxis type="number" dataKey="qty" range={[40, 160]} name="Qty" />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            formatter={(value, name) => (name === "Time" ? [formatTime(value), name] : [value, name])}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />

          <ReferenceLine y={config.referencePrice} stroke="#6366f1" strokeDasharray="4 4" label={{ value: "Initial Reference", fontSize: 10, position: "insideTopRight" }} />
          {Number.isFinite(activeReference) && activeReference !== config.referencePrice && (
            <ReferenceLine y={activeReference} stroke="#d97706" strokeDasharray="4 4" label={{ value: "Active Reference", fontSize: 10, position: "insideTopLeft" }} />
          )}
          {gridLines.map((line) => (
            <ReferenceLine
              key={line.n}
              y={line.price}
              stroke={line.type === "BUY" ? "#86efac" : "#fca5a5"}
              strokeDasharray="2 2"
            />
          ))}
          {Number.isFinite(currentPrice) && (
            <ReferenceLine y={currentPrice} stroke="#111827" label={{ value: "Current", fontSize: 10, position: "insideBottomRight" }} />
          )}

          <Scatter name="Buy fills" data={buyPoints} fill="#16a34a" />
          <Scatter name="Sell fills" data={sellPoints} fill="#dc2626" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
