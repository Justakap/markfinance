# MARKFINANCE BLOCKERS

Reconciled against repository reality on 2026-10-08 before starting the
A→F milestone. These are tracked items, not active stops — none of them
require a user decision right now; they're recorded so Phase C/I don't
get started blind.

---

## BLOCKER-001

### Title

MACD and VWAP have no series (per-bar) implementations

### Context

`backend/services/indicatorService.js` has `calculateMACD()` and
`calculateVWAP()`, both single-latest-value only — confirmed by reading
the file. `calculateRSISeries`/`calculateEMASeries` exist; their MACD/VWAP
equivalents do not. Bollinger/ATR/ADX/Supertrend don't exist at all.

### Problem

Phase C's Indicator Engine needs causal, per-bar series for any indicator
the DSL allows referencing. Phase B's validator must not allow selecting
an indicator Phase C can't actually compute (ADR carried from the earlier
audit — the legacy system's "Future Indicators" bug is the cautionary
example: selectable in the UI, silently always-false at evaluation time).

### Why Autonomous Decision Is Unsafe

Not unsafe — this is routine implementation work, not a product-direction
question. Resolved autonomously during Phase C by writing the missing
series functions before the registry exposes those indicators.

### Options

A: Write `calculateMACDSeries`/`calculateVWAPSeries` in Phase C before
   registering MACD/VWAP in the indicator registry. (Recommended.)
B: Ship Phase B/C with only RSI/EMA/SMA registered, defer MACD/VWAP/others
   to a later pass.

### Master Recommendation

Resolved during Phase C: RSI/EMA/SMA/MACD/MACD_SIGNAL/VWAP all got real
causal series functions (`calculateSMASeries`/`calculateMACDSeries`/
`calculateVWAPSeries` added to indicatorService.js) and are registered in
indicatorRegistry.js. Bollinger/ATR/ADX/Supertrend remain deliberately
unregistered and unimplemented — not needed yet, not faked.

### Risk

None remaining for the six registered indicators.

### User Decision Required

No.

### Status

RESOLVED (partially — six indicators done, four deferred) — Phase C,
commit pending. Remaining unimplemented indicators (Bollinger/ATR/ADX/
Supertrend) are not blocking; register them in a later pass if/when a
strategy actually needs them.

---

## BLOCKER-002

### Title

No candlestick-capable charting library chosen

### Context

Frontend has only `recharts` (confirmed in `package.json`), which has no
native candlestick chart type.

### Problem

Phase I (chart/signal visualization) needs either a new frontend
dependency or substantial custom SVG work.

### Why Autonomous Decision Is Unsafe

Adding a new frontend dependency is a reasonable autonomous engineering
decision, but doing it this far in advance of Phase I (which is several
milestones away, outside A→F) is premature. Recorded here so it isn't
forgotten, not because it needs a decision now.

### Options

A: Decide during Phase I planning, not now.

### Master Recommendation

Resolved during G-I: evaluated lightweight-charts (TradingView's own
OPEN SOURCE charting library, MIT-licensed, ~45kb gzip — not proprietary
code/branding) as the right choice WHENEVER real candle data exists to
feed it. Did NOT install it this milestone: no v2 endpoint returns the
raw OHLC candle series for a backtested instrument/date range (confirmed
by reading routes/professionalBacktestRoutes.js directly — the response
has equitySeries + trades + summary only). Installing a charting library
with nothing real to render would violate "do not fabricate historical
candles"/"do not invent API support". Built `CandlestickChart.jsx` as an
isolated, clearly-labeled placeholder instead (src/pro/components/) so
the rest of the results page doesn't need to change shape once a real
candle-series endpoint exists.

### Risk

None — correctly deferred with a concrete, documented reason, not an
oversight.

### User Decision Required

No, unless there's a reason to prioritize adding a candle-series endpoint
sooner than later (that would be its own small backend addition, not
attempted here since it wasn't asked for).

### Status

FULLY RESOLVED (2026-10-09, Historical Candle Chart milestone). The
previously-missing candle-series endpoint now exists
(`GET /api/v2/backtests/:id/candles`, ADR-011) and `lightweight-charts`
v5.2.1 (confirmed Apache-2.0, not MIT as this blocker originally assumed —
corrected here, still permissive) is installed and wired into
`CandlestickChart.jsx` with real entry/exit markers (ADR-012). The
placeholder component is gone.

---

## BLOCKER-003

### Title

Upstox WebSocket production status unconfirmed

### Context

Carried forward from Phase 2.0. The earlier "production 403" diagnosis was
only ever reproduced locally, never confirmed from real production
logs/token state. The user has since stated the WS has been working in
production for ~60 days and told us to treat the earlier diagnosis as
unconfirmed/deferred.

### Problem

Phase J (live strategy engine, outside A→F) will need to know whether
live push data (Greeks/OI/true push prices) is actually reliable in
production, or whether it should design around REST-polling as the
realistic baseline.

### Why Autonomous Decision Is Unsafe

Requires Render dashboard/log access this environment doesn't have.

### Options

A: Design Phase J to degrade gracefully to REST-polled data regardless.

### Master Recommendation

Option A, when Phase J starts. No action now — A→F does not touch the
WebSocket at all, per the explicit instruction not to.

### Risk

None during A→F (WebSocket code is untouched).

### User Decision Required

Not during A→F.

**2026-10-09 update (Workstream J, live strategy engine implemented):**
Option A was followed exactly as recommended — the live engine
(`services/liveCandleFeed.js`) deliberately does NOT read the WebSocket
feed or `liveData`/`indicatorSnapshot` at all; it reads only
`candleService.getCandles()` (REST-backed, Upstox-queue-routed) and
strips any forming bar via `dropFormingCandle`. This means live strategy
*evaluation* correctness does not depend on this blocker's resolution
either way — it degrades gracefully to REST-polled candle data
regardless of WS status, exactly as this blocker's recommendation
anticipated. The WebSocket itself remains untouched and its production
status remains unconfirmed in this environment, per instruction (see
`.claude/state/LIVE_FEED_AUDIT.md`, produced the same session as this
entry's prior update).

### Status

OPEN — deferred, not blocking, explicitly out of scope for this milestone.

**2026-10-09 update (Historical Candle Chart milestone, Workstream B):** a
fresh read-only code audit was performed (see `LIVE_FEED_AUDIT.md`),
re-confirming from current source — not from memory of the earlier
audit — that no token-refresh mechanism exists and the WS reconnect loop
has no backoff/retry cap. Per the user's explicit instruction, the ~60-day
production uptime report was taken at face value and not treated as
contradicted by anything found; this audit could not independently verify
production status either way (no Render/Upstox credentials available
here). Status and recommended next action are unchanged — still deferred
to whenever Workstream J (live strategy engine) actually starts, at which
point `LIVE_ENGINE_DESIGN.md`'s snapshot-level per-field source tagging is
the proposed way to make a live engine degrade gracefully regardless of
how this blocker eventually resolves.

---

## BLOCKER-004

### Title

Pre-existing frontend test runner bug blocks 4 page-level component tests

### Context

`CI=true npx react-scripts test` fails to even load any test file that
imports `react-router-dom` with `Cannot find module 'react-router/dom'`
from `node_modules/react-router-dom/dist/index.js`. Confirmed pre-existing
and unrelated to any change in this project (the 2026-10-08 change
history entry for the Stock Analysis compacting pass already documented
this exact failure via `git stash` — identical failure with that change
removed). `src/App.test.js` (CRA's own default scaffold test) already
fails this way before any Phase G-I code existed.

### Problem

The four new page-level components that use `useNavigate`/`useParams`/
`Link` (`StrategyWorkspace.jsx`, `StrategyEditorPage.jsx`,
`BacktestResultsPage.jsx`, `BacktestHistoryPage.jsx`) cannot be rendered
in this Jest environment — any test file importing them (directly or
transitively via react-router-dom) hits the same failure.

### Why Autonomous Decision Is Unsafe

Not unsafe to work around at the test-scope level (and that's what was
done - component-level tests cover everything these pages are composed
of instead). Actually fixing the react-router-dom/Jest resolution issue
itself would mean changing CRA/Jest/react-router-dom version pinning or
config - a cross-cutting environment change outside this milestone's
scope, and risky to attempt blind.

### Options

A: Leave page-level flows covered by manual verification only (what was
   done this milestone) until someone deliberately fixes the test-runner
   environment issue.
B: Downgrade/reconfigure react-router-dom or Jest's module resolution to
   work around it.

### Master Recommendation

Option A for now. The 31 passing component-level tests cover the actual
logic (DSL editing, strategy save semantics, results rendering, trade
pagination) that matters; the 4 page files are thin composition/routing
wrappers around tested components.

### Risk

Low — the page wrappers are intentionally thin per the component
architecture used throughout G-I.

### User Decision Required

Only if/when fixing the test runner itself becomes a priority.

### Status

OPEN — tracked, not blocking.

---

## BLOCKER-005

### Title

Live engine signal-log can gap (not duplicate, not lose position state) on a crash between its two commit writes

### Context

`services/liveStrategyOrchestrator.js`'s `processRuntimeOnce()` commits
`engineState`/`lastProcessedCandleTimestamp` first, then inserts
`LiveStrategySignal` log rows second (ADR-015). MongoDB multi-document
transactions were not assumed available/configured in this environment,
so these are two separate writes, not one atomic one.

### Problem

If the process crashes in the narrow window between those two writes, the
simulated position/equity state is correctly committed and will never be
reprocessed or duplicated — but the signal-log rows for that one batch
are lost, leaving a gap in the audit trail for that batch (not a
corrupted position, not a wrong equity figure — only a logging gap).

### Why Autonomous Decision Is Unsafe

Not unsafe — a reasonable, explicitly-chosen tradeoff (state correctness
over log completeness), documented in ADR-015. Flagged here as a tracked,
known limitation rather than a silent gap, per the milestone's "document
any unavoidable uncertainty" instruction.

### Options

A: Leave as-is — the gap is narrow (one in-memory-to-DB write), rare, and
   never affects position/equity correctness, only historical signal
   visibility for that one batch. (Recommended — consistent with this
   codebase's existing "no distributed transactions" constraint elsewhere,
   e.g. BacktestResult + BacktestTrade are also two separate writes.)
B: Use a real multi-document Mongo transaction (requires a replica-set
   connection, not confirmed configured in this environment) to make both
   writes atomic.

### Master Recommendation

Option A for now — same two-write pattern this codebase already accepts
elsewhere (BacktestResult.create then BacktestTrade.insertMany, with no
transaction). Revisit if replica-set transactions become available and
signal-log completeness becomes a real product requirement.

### Risk

Low — bounded to a logging gap, never a position/equity error.

### User Decision Required

No.

### Status

OPEN — tracked, accepted, documented. Not blocking.

**2026-10-09 update (Workstream K, Alerts implemented):** this gap now
has a concrete, acknowledged downstream consequence — if a
`LiveStrategySignal` document was never created because of this crash
window, `services/alertNotificationService.js` has nothing to read and
cannot notify about that event either (see ADR-016). This was stated
explicitly as a limit in Workstream K's design rather than treated as
newly discovered — the alert system's guarantee is "every signal that
was durably persisted produces exactly one notification," never "every
strategy event that logically occurred is guaranteed to notify." No
change to this blocker's resolution/status as a result.

---

## BLOCKER-006

### Title

No frontend UI exists yet to activate a live strategy or manage alert configurations

### Context

Workstream J shipped the live-strategy-engine backend only (no UI was
requested or built — `PROGRESS.md`'s J entry states this explicitly).
Workstream K's own frontend scope (per its milestone instructions) was
specifically "a cohesive notifications experience" — list, unread badge,
read state, navigation, signal-vs-fill distinction, empty/loading/error,
pagination — not alert-configuration management or live-runtime
activation UI, so neither was built.

### Problem

A user cannot currently create a `LiveStrategyRuntime` or an
`AlertConfiguration` from the frontend at all — both are fully
implemented and tested at the API layer
(`/api/v2/live/activate`, `/api/v2/alert-configurations`) but have no
corresponding page. `NotificationsPage.jsx`'s "View strategy" link
necessarily points at the strategy editor page
(`/workspace/strategies/:strategyId`), not a live-runtime detail page,
since no such page exists either.

### Why Autonomous Decision Is Unsafe

Not unsafe — this is a scope boundary explicitly set by the milestone
instructions for both J and K, not an oversight discovered after the
fact. Recorded here so a future milestone building this UI isn't
surprised that zero frontend scaffolding for it currently exists.

### Options

A: A future milestone adds a "Live Strategies" workspace page (list/
   activate/deactivate LiveStrategyRuntimes) and an alert-configuration
   management UI on top of the now-complete backend API surface.

### Master Recommendation

Option A, whenever live-strategy UI is actually requested. Not urgent —
both backends are already fully usable via direct API calls for anyone
testing or operating this system today.

### Risk

None currently — purely a missing convenience UI, not a correctness gap.

### User Decision Required

No, unless/until this UI becomes a priority.

### Status

RESOLVED (2026-10-09, "Workstream L — Live Strategy Workspace UI"
milestone, same day). `LiveStrategiesPage`/`LiveActivationPage`/
`LiveRuntimeDetailPage` now implement exactly Option A — a live-strategy
dashboard, an activation flow, and alert-configuration management, all
on top of the backend API surface that was already complete. One small
additive backend change was needed alongside the UI (ADR-018: an
optional `runtimeId` filter on the alert-configurations list endpoint) —
no change to activation/deactivation/evaluation/delivery semantics.
`NotificationsPage.jsx`'s notifications now link to the runtime detail
page (`/workspace/live/:runtimeId`) in addition to the strategy page.

---

## BLOCKER-007

### Title

Trading-cost model is a two-knob approximation — no STT, exchange transaction charges, GST, SEBI turnover fees, or stamp duty

### Context

Discovered during the 2026-10-09 full-platform verification pass (a
dedicated audit of the trading-cost model, backed by a cited public rate
schedule). The backtest/live execution engines (`backtestExecutionEngine.js`/
`liveSignalEngine.js`) model trading costs with exactly two symmetric,
user-configurable percentages: `commissionPct` (default 0.03%) and
`slippagePct` (default 0.05%), applied identically to both the entry and
exit leg of every trade.

### Problem

Real Indian equity trading costs include several statutory charges this
model has never implemented: STT (sell-side-only for intraday, both
sides for delivery), exchange transaction charges, GST (18% on
brokerage+exchange+SEBI charges — a charge-on-a-charge, not a flat % of
turnover), SEBI turnover fees, and stamp duty (buy-side-only). These are
asymmetric and bracket/formula-based in ways a single symmetric
percentage cannot reproduce at any chosen value. On a representative
₹205,000-turnover intraday trade (100 shares, ₹1000→₹1050), the audit
computed a real-world cost of ₹84.12 against the model's ₹61.50 "fees"
figure at its default rate — a ~27% understatement, before even
accounting for the shape mismatch (asymmetric real charges vs. one
symmetric knob).

### Why Autonomous Decision Is Unsafe

Implementing the full itemized stack would require a genuinely new
architectural concept this platform doesn't currently have at all:
distinguishing "delivery" from "intraday" trades for cost purposes (the
real STT/stamp-duty rates differ by this distinction, and by which side
— buy or sell — a leg is), plus segment-specific bracket/percentage
formulas and a charge computed on top of another charge (GST). This
would materially change every trade's `netPnl`/`grossPnl`/`fees` output
for every future backtest and live run — a change to core financial
calculation semantics, which the governing instructions for this
verification-first milestone explicitly reserve for a decision the
Master should not make unilaterally mid-audit, and which goes well
beyond "a minimal, safe correction."

### Options

A: Implement the full itemized Indian equity cost stack (STT/exchange/
   GST/SEBI/stamp duty, segment- and side-aware) as its own dedicated
   future milestone, with its own review and test plan given the
   financial-correctness stakes.
B: Leave the two-knob model as the supported cost mechanism indefinitely,
   relying on the disclosure (see Master Recommendation) to keep users
   from misreading its output as real-world-complete.

### Master Recommendation

Option B for now, per the verification-pass milestone's own instruction:
"If the current cost model is incomplete, implement a minimal, safe
correction only when the correct rates and rules are available from
reliable sources and the existing architecture supports it. Otherwise,
document the limitation clearly and ensure the UI does not misleadingly
describe the result as net profit after all charges." The architecture
does not currently support segment/side-aware itemized charges (no
delivery-vs-intraday concept exists anywhere), so this is the documented
"otherwise" branch, not a judgment that the gap doesn't matter.

Implemented as part of this same pass: `dataQuality.tradingCostModelNote`
(backend, additive field, persisted on every `BacktestResult`) states
the exact commission/slippage rates used for that specific run and
explicitly names every omitted statutory charge. Surfaced in
`BacktestSummary.jsx`'s existing "Data quality" panel and appended to
`LiveActivationForm.jsx`'s pre-activation disclosure banner — a manual
tester sees this before and after using either the backtest or live
features, not buried in a changelog.

### Risk

Medium if left completely undisclosed (a tester could reasonably
mistake "net P&L" for a real-world-complete figure — now mitigated by
the disclosure above). Low/none for the two-knob model's own internal
correctness — it was penny-exact-verified against its own documented
formula during this same audit; the gap is in scope, not in arithmetic.

### User Decision Required

Only if/when implementing the full itemized stack (Option A) becomes a
priority — that would be its own dedicated future milestone, not
something to start unilaterally.

### Status

OPEN — tracked, disclosed, not blocking. The disclosure fix (not a
cost-model rewrite) is DONE as of this pass.
