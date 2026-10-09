function Metric({ label, value, tone }) {
  const toneClass = tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-red-600" : "text-gray-800";
  return (
    <div className="rounded-lg border border-gray-200 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`text-base font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function pct(value) {
  return value === null || value === undefined ? "—" : `${value}%`;
}

function num(value, digits = 2) {
  return value === null || value === undefined ? "—" : Number(value).toFixed(digits);
}

/** Renders the real, persisted BacktestResult.summary (Phase F analytics)
 *  — nothing here is computed client-side; every figure is exactly what
 *  the backend returned. */
export default function BacktestSummary({ summary, dataQuality }) {
  if (!summary) return null;

  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Return</h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Metric label="Final Equity" value={num(summary.finalEquity)} />
          <Metric label="Total Return" value={pct(summary.totalReturnPct)} tone={summary.totalReturnPct >= 0 ? "positive" : "negative"} />
          <Metric label="CAGR" value={pct(summary.cagrPct)} />
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Risk</h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Max Drawdown" value={pct(summary.maxDrawdownPct)} tone="negative" />
          <Metric label="DD Duration (bars)" value={summary.maxDrawdownDurationBars ?? "—"} />
          <Metric label="Ann. Volatility" value={pct(summary.annualizedVolatilityPct)} />
          <Metric label="Sharpe" value={num(summary.sharpeRatio)} />
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Trade</h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Total Trades" value={summary.totalTrades} />
          <Metric label="Win Rate" value={pct(summary.winRatePct)} />
          <Metric label="Profit Factor" value={num(summary.profitFactor)} />
          <Metric label="Expectancy" value={num(summary.expectancy)} />
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Exposure &amp; Benchmark</h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Metric label="Exposure" value={pct(summary.exposurePct)} />
          <Metric label="Buy &amp; Hold Return" value={pct(summary.buyAndHoldReturnPct)} />
          <Metric
            label="Outperformance"
            value={pct(summary.outperformancePct)}
            tone={summary.outperformancePct >= 0 ? "positive" : "negative"}
          />
        </div>
      </div>

      {dataQuality && (
        <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <p className="font-medium text-slate-700">Data quality</p>
          <p>{dataQuality.corporateActionsNote}</p>
          <p>{dataQuality.slTpAmbiguityPolicy}</p>
          {!dataQuality.historicalPeSupported && <p>PE-based conditions are not available in this strategy system.</p>}
          {dataQuality.isDerivativeInstrument && <p>This instrument is a derivative — F&amp;O-specific modeling is not yet implemented.</p>}
          {dataQuality.cappedTimeframes?.length > 0 && (
            <p>
              Some timeframes were capped to Upstox&apos;s available history:{" "}
              {dataQuality.cappedTimeframes.map((c) => `${c.timeframe} (${c.effectiveDays}/${c.requestedDays}d)`).join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
