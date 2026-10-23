import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ReferenceLine, Legend } from "recharts";

/**
 * Grid Trading Simulator (PAPER TRADING ONLY) — grid levels + simulated
 * fill markers. Deliberately plots only real data: the reference lines are
 * derived from the session's own config/state, and the markers are the
 * actual persisted trade ledger (fillPrice vs. event time) — there is no
 * continuous tick-by-tick price history persisted for this session, so
 * this chart does NOT draw a fabricated continuous price line (same
 * "never invent a data point" discipline as
 * src/pro/utils/candleMarkers.js, ADR-012).
 *
 * ADR-037: the session no longer has a single fixed lattice or one "Active
 * Reference" — every fill arms its own independent pending buy/sell level
 * (see gridSimulatorEngine.js's file doc comment), so the full set can grow
 * over a long session. The two NEAREST levels — `nextBuyLevel`/
 * `nextSellLevel` — get a labeled, solid reference line each (the prices
 * that would actually trigger the very next trade); the rest of the full
 * ladder (`pendingBuyLevels`/`pendingSellLevels`, optional) is drawn as
 * faint, unlabeled lines so the ladder's actual depth/commitment is
 * visible, not just the nearest rung.
 */
export default function GridLevelsChart({ config, trades, currentPrice, nextBuyLevel, nextSellLevel, pendingBuyLevels = [], pendingSellLevels = [] }) {
  if (!config) return null;

  const filled = trades.filter((t) => t.qtyFilled > 0);
  const otherBuyLevels = pendingBuyLevels.filter((p) => p !== nextBuyLevel);
  const otherSellLevels = pendingSellLevels.filter((p) => p !== nextSellLevel);
  const prices = [
    ...(Number.isFinite(config.referencePrice) ? [config.referencePrice] : []),
    ...(Number.isFinite(nextBuyLevel) ? [nextBuyLevel] : []),
    ...(Number.isFinite(nextSellLevel) ? [nextSellLevel] : []),
    ...otherBuyLevels,
    ...otherSellLevels,
    ...filled.map((t) => t.fillPrice),
    ...(Number.isFinite(currentPrice) ? [currentPrice] : []),
  ];
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = Math.max(config.gridInterval * 2, (maxPrice - minPrice) * 0.1 || config.gridInterval);
  const lowBound = minPrice - padding;
  const highBound = maxPrice + padding;

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

          {Number.isFinite(config.referencePrice) && (
            <ReferenceLine y={config.referencePrice} stroke="#6366f1" strokeDasharray="4 4" label={{ value: "Initial Reference", fontSize: 10, position: "insideTopRight" }} />
          )}
          {Number.isFinite(nextBuyLevel) && (
            <ReferenceLine y={nextBuyLevel} stroke="#16a34a" strokeDasharray="2 2" label={{ value: "Next Buy", fontSize: 10, position: "insideBottomLeft" }} />
          )}
          {Number.isFinite(nextSellLevel) && (
            <ReferenceLine y={nextSellLevel} stroke="#dc2626" strokeDasharray="2 2" label={{ value: "Next Sell", fontSize: 10, position: "insideTopLeft" }} />
          )}
          {otherBuyLevels.map((level) => (
            <ReferenceLine key={`buy-${level}`} y={level} stroke="#16a34a" strokeOpacity={0.25} strokeDasharray="1 3" />
          ))}
          {otherSellLevels.map((level) => (
            <ReferenceLine key={`sell-${level}`} y={level} stroke="#dc2626" strokeOpacity={0.25} strokeDasharray="1 3" />
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
