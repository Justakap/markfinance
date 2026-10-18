# LIVE STRATEGY ENGINE — PROPOSED DESIGN (Workstream C)

Design-only. **No implementation in this milestone** — per the explicit
instruction not to build live order execution or start Workstream K
(alerts/positions). This proposes how a future live engine would reuse the
professional backtest system's evaluation code (ADR-001/ADR-006/ADR-007)
rather than duplicating it, grounded in the actual functions that exist
today (see Section 2) and the field-trust findings in `LIVE_FEED_AUDIT.md`.

## 1. Pipeline stages (strictly separated, per the milestone's instruction)

```
Upstox WS/REST ──▶ [1] Ingestion ──▶ [2] Normalized Snapshot ──▶ [3] Strategy
                                                                    Evaluation
                                                                       │
                                                                       ▼
                                                            [4] Signal Generation
                                                                       │
                                                                       ▼
                                                      [5] Simulated Position Mgmt
                                                                       │
                                                                       ▼
                                                            [6] Alert Generation
```

### [1] Market-data ingestion
Unchanged: `marketDataService.js`'s existing WS client, REST LTP fallback,
and candle-bundle refresh loop (`startIndicatorRefreshLoop`,
`instrumentIndicatorBundle.js`). This milestone's audit confirmed this
layer already does the right thing (tick → `liveData`, periodic candle
bundle refresh → `indicatorSnapshot`); no proposed change touches it.

### [2] Normalized market snapshot
**New, thin layer.** A `buildMarketSnapshot(instrumentKey)` function
(proposed location: `services/liveSnapshotService.js`, new file) that reads
`liveData`/`indicatorSnapshot`/the cached candle bundle (all already
exposed or exposable from `marketDataService.js`) and produces one object:

```js
{
  instrumentKey,
  asOf: <ms epoch>,
  bar: { timeframe, isComplete: boolean, candle: {open,high,low,close,volume} | null },
  fields: {
    ltp:   { value, source: "websocket" | "rest" | null },
    oi:    { value, source: "websocket" | "candle" | null },
    oiChange: { value, source: "websocket" | "candle" },  // corrected 2026-10-09: the
                                                           // current-period OI term can be
                                                           // WS-sourced; only the prior-period
                                                           // term is always candle-derived —
                                                           // see LIVE_FEED_AUDIT.md's corrected entry
    delta: { value, source: "websocket" | null }, // null + no source if socket down — never fabricated
    rsi:   { value, source: "candle" },
    // ...one entry per field currently in buildRow()
  },
}
```

Per-field `source` tagging (not one coarse snapshot-level status) is the
direct consequence of the audit's finding that different fields on the
same instrument can legitimately come from different sources
simultaneously. A strategy evaluating a Greek-based condition against a
`null`-with-no-source field must treat it as **not evaluable this tick**,
never substitute a stale/candle value that doesn't exist for that field
(mirrors milestone instruction #9's "never invent" principle, applied to
live data instead of chart markers).

### [3] Strategy evaluation (reused, not duplicated)
This is the core reuse point. The backtest path already separates
"build an indicator-bearing row" from "evaluate a condition tree against
two rows" — exactly the shape live evaluation needs:

- `services/indicatorEngine.js`'s `buildRows(candles, seriesByKey)` produces
  `{indicators, ...}` rows per bar from a candle series — this is what
  turns a live snapshot's candle bundle into the same row shape the
  backtest engine evaluates against. The live engine would call the same
  function on its own maintained candle buffer (same `candleService`
  output), not a reimplementation.
- `utils/strategyExpression.js`'s `evaluateProfessionalExpression(current,
  previous, node, defaultTimeframe)` is the exact function that both
  backtesting (via `backtestExecutionEngine.js`) and legacy scanning (via
  `strategyScanService.js`'s `matchesScan`) already call to decide
  true/false for a condition tree against a `{current, previous}` row
  pair. The live engine reuses this identical function, with `current`
  being the live-merged latest row and `previous` the prior committed row
  — it never reimplements condition comparison logic.
- `validateStrategyDefinition` (same file) continues to be the single
  source of truth for "is this StrategyDefinition even valid" — a
  `StrategyDefinition`/`StrategyVersion` created via
  `routes/professionalStrategyRoutes.js` today is directly runnable live
  with zero translation step, by construction.

**Consequence:** the live engine introduces no new condition-evaluation or
indicator-computation code. Its only new code is the ingestion→snapshot
adapter (stage 2) and the stateful signal/position/alert bookkeeping
(stages 4-6, below) — all of which are live-specific concerns that have no
backtest equivalent to reuse.

### [4] Signal generation
A new `LiveSignalEvaluator` (proposed, stateful per
`{strategyVersionId, instrumentKey}` pair) that:
1. Maintains a rolling candle buffer per `(instrumentKey, timeframe)` via
   the existing `candleService`/`instrumentIndicatorBundle` cache — not a
   new candle store.
2. On each new **completed** bar (see §3 "bar completion" below), calls
   `buildRows`/`evaluateProfessionalExpression` exactly as backtesting
   does, comparing the strategy's entry/exit expressions against the new
   `{current, previous}` pair.
3. Emits a `Signal` (`{strategyVersionId, instrumentKey, side, timestamp,
   triggerPrice, conditionSnapshot}`) when the expression flips from false
   to true — never re-fires on every tick while already true (edge-
   triggered, matching backtesting's own bar-by-bar iteration semantics,
   which only acts once per qualifying bar).

### [5] Simulated position management
Explicitly **simulated only** this milestone (no real order execution, per
the hard instruction). A `LiveSimulatedPosition` record per
`(strategyVersionId, instrumentKey)` tracks entry price/quantity/
stop-loss/take-profit exactly like `BacktestTrade`, computed via the
*same* sizing/cost functions already in `backtestExecutionEngine.js`
(`computeQuantity`, `applySlippage`, `roundTripCommission`) — reused, not
reimplemented, for the same reason as stage 3: these are pure functions of
price/equity/config, agnostic to whether the price came from a historical
candle or a live bar.

### [6] Alert generation
Out of scope to implement (Workstream K), but the design anticipates it:
a `Signal` (stage 4) or a simulated position's SL/TP touch (stage 5) is
the natural trigger point for a future alert — this design doesn't
preclude it, it just doesn't build the delivery mechanism now.

## 2. Reused vs. new code (explicit inventory)

| Component | Reused unchanged | New |
|---|---|---|
| Market data ingestion (WS/REST/candles) | `marketDataService.js` (all of it) | — |
| Candle→indicator row computation | `services/indicatorEngine.js`'s `buildRows`/`computeSeriesForCandles`/`alignRowsToPrimary` | — |
| Condition/expression evaluation | `utils/strategyExpression.js`'s `evaluateProfessionalExpression`, `validateStrategyDefinition` | — |
| Position sizing/cost math | `services/backtestExecutionEngine.js`'s `computeQuantity`/`applySlippage`/`roundTripCommission` | — |
| Strategy/version storage | `StrategyDefinition`/`StrategyVersion` models (ADR-001/ADR-006) | — |
| Live snapshot normalization | — | `liveSnapshotService.js` (proposed) |
| Signal evaluation (stateful, edge-triggered) | — | `LiveSignalEvaluator` (proposed) |
| Simulated position tracking | — | `LiveSimulatedPosition` model (proposed, analogous to `BacktestTrade` but for an open-ended live position, not a closed historical trade) |
| Alerts | — | Out of scope (Workstream K) |

This inventory is itself the concrete evidence for the milestone's "do not
create an independent copy of strategy evaluation logic" requirement: the
only genuinely new logic is live-specific state (what hasn't happened yet,
which backtesting never needs to track), not re-derived evaluation
semantics.

## 3. Timing: historical-bar evaluation vs. live updates

This is the most important semantic difference and the one most likely to
introduce a correctness bug if glossed over:

- **Backtesting** iterates one **fully-closed** historical bar at a time,
  in order, by construction — `candleService`'s historical-range fetch
  only ever returns closed bars (confirmed in this milestone's Workstream
  A work: the historical-range endpoint never returns today's candles at
  all). There is no concept of "a bar in progress" in the backtest path.
- **Live data** has no such guarantee. A live tick updates the *current,
  still-forming* bar continuously (this is exactly what
  `mergeLivePriceIntoLatestCandle`/`appendLivePriceAsCurrentCandle` in
  `marketDataService.js` already do for display purposes — merging the
  live LTP into what is explicitly an in-progress candle). Evaluating a
  strategy condition against an in-progress bar's partial OHLC would be
  evaluating against data that can still change before the bar closes —
  not the same situation backtesting's conditions were validated against.

**Proposed rule:** `buildMarketSnapshot()`'s `bar.isComplete` flag (§2
above) is the authority on this distinction, derived the same way the
existing display merge functions already determine "is this a real closed
candle or a synthesized in-progress one." The `LiveSignalEvaluator` (stage
4) **only evaluates strategy expressions on a bar transition to
`isComplete: true`** — i.e., it waits for the bar to actually close before
running the same evaluation backtesting would have run on that closed bar,
rather than evaluating continuously on every tick against a moving target.
This keeps live evaluation semantically identical to backtest evaluation
(same closed-bar-in, boolean-out contract for
`evaluateProfessionalExpression`), at the cost of only reacting once per
bar close rather than instantly on every tick — an explicit, named
tradeoff, not an oversight. A future "intrabar early-signal" mode could
relax this later, but that would be evaluating against materially
different (partial) data than backtesting does, and should be a
deliberate, separately-labeled feature, not the default.

## 4. Open questions for whoever starts implementation (not blockers now)

1. Where does the rolling live candle buffer live — reuse
   `instrumentIndicatorBundle`'s existing cache directly, or a new
   per-strategy-subscription buffer? (Leaning toward reusing the existing
   cache, since multiple strategies watching the same instrument shouldn't
   each maintain a duplicate candle history — but not decided here.)
2. How does `LiveSignalEvaluator` get told which `(strategyVersionId,
   instrumentKey)` pairs to watch — a new subscription API, or derived
   from existing watchlists? Out of scope for this design doc; depends on
   product decisions (Workstream K) not yet made.
3. Multi-instrument/portfolio-level strategies are explicitly out of
   scope here (matches the existing backtest engine's single-instrument
   scope, per `PROGRESS.md`'s "Known Limitations").
