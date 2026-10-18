# MARKFINANCE ARCHITECTURAL DECISIONS

This file contains accepted architectural decisions.

Do not silently overturn decisions.

If a decision becomes questionable, create a new decision/revision and escalate when materially ambiguous.

---

## ADR-001 — Immutable Strategy Versions

Status: ACCEPTED

Decision:

StrategyVersion records are immutable.

Reason:

Historical backtests must always refer to the exact strategy definition that produced them.

Rejected alternative:

One mutable Strategy document.

Consequence:

Changing a strategy creates a new version rather than changing historical versions.

---

## ADR-002 — Signal Executes on Next Bar

Status: ACCEPTED

Decision:

A strategy signal generated at bar i close executes at bar i+1 open by default.

Reason:

Prevents same-bar lookahead when using OHLC historical data.

---

## ADR-003 — No Fabricated Historical PE

Status: ACCEPTED

Decision:

Historical backtests cannot use current PE as historical PE.

Reason:

Point-in-time historical PE data is not currently available with sufficient reliability.

---

## ADR-004 — Conservative OHLC Intrabar Handling

Status: ACCEPTED

Decision:

When OHLC data indicates both SL and TP were touched in the same bar and exact ordering is unknown, use conservative/pessimistic behavior.

Reason:

Tick-level ordering is unavailable.

---

## ADR-005 — Legacy System Is Compatibility Code

Status: ACCEPTED

Decision:

The existing Strategy and Backtest implementation is considered legacy/reference architecture.

Reason:

The new platform requires versioning, a professional DSL, causal indicator series, realistic execution, risk configuration, and professional analytics.

Legacy code may be replaced after safe migration and verification.

---

## Future Decisions

New architectural decisions should be added below this section.

---

## ADR-006 — New models use distinct names, never reuse "Strategy"/"Backtest"

Status: ACCEPTED

Decision:

The new professional system's models are named `StrategyDefinition`,
`StrategyVersion`, `BacktestResult`, `BacktestTrade` — distinct Mongoose
model names and MongoDB collections from the legacy `Strategy`/`Backtest`
models/collections.

Reason:

Mongoose throws on duplicate model names in one connection, and reusing
"Strategy" would require either migrating or colliding with real legacy
documents already in that collection. Distinct names make the new system
purely additive: it can be built, tested, and iterated on with zero risk
to existing legacy data, and zero coordination needed with the
export/archive mechanism (ADR-005) before the new models can exist.

Consequence:

Legacy routes/evaluator continue reading `models/Strategy.js` /
`models/Backtest.js` unchanged. New Phase B-F code reads/writes
`StrategyDefinition`/`StrategyVersion`/`BacktestResult`/`BacktestTrade`
exclusively. The two systems do not share collections; a future migration
(ADR-005) would copy/transform data across, not reinterpret it in place.

---

## ADR-007 — Phase B evolves strategyExpression.js, does not replace it

Status: ACCEPTED

Decision:

Phase B's professional DSL reuses `backend/utils/strategyExpression.js`'s
GROUP/CONDITION recursive tree shape, its depth/node-count validator, and
its recursive indicator-traversal pattern. Only the leaf `CONDITION`
operand changes: from an opaque string label (`"RSI (5 Minute)"`, baking
indicator+timeframe into one string) to a structured operand
(`{type:"indicator"|"price"|"constant"|"series", name, params, timeframe}`).

Reason:

The recursion/validation/evaluator control flow in `strategyExpression.js`
is operand-agnostic — it never inspects what a condition compares, only
the tree's shape. That logic is already tested (24 tests from Phase 2.2)
and correct. Rewriting it from scratch to get a new DSL would duplicate
working logic and risk introducing the exact class of bug (silent-false on
an unresolvable indicator) the legacy system already has.

Consequence:

Phase B adds a new leaf-operand resolver and a registry-aware validator
alongside the existing legacy-normalization path (`conditionsToExpression`
for flat lists) — both coexist in the same file. The legacy evaluator
path (`evaluateStrategy`, used by Strategy.js/flat-condition strategies)
is untouched and keeps working exactly as before.

---

## ADR-008 — The professional DSL structurally excludes historical PE; Phase 2.1A's guard is not ported

Status: ACCEPTED

Decision:

Phase F.5's data-quality metadata reports `historicalPeSupported: false`
but does NOT port Phase 2.1A's `strategyUsesPe()` route-level rejection
check into the new system.

Reason:

Phase B's indicator registry (`indicatorRegistry.js`) never registered a
"PE" indicator in the first place — RSI/EMA/SMA/MACD/MACD_SIGNAL/VWAP are
the only entries. The professional DSL's validator
(`validateProfessionalNode`) rejects ANY condition referencing an
unregistered indicator at save time. A strategy referencing PE cannot be
saved at all, let alone run — the protection is structural (nothing to
reference), not a special-cased runtime check (Phase 2.1A's
`strategyUsesPe()` + route-level rejection, which exists because the
*legacy* DSL's indicator field is a free-text string with no registry to
reject against).

Consequence:

Do not add a PE entry to `indicatorRegistry.js` without first solving the
same historical-PE-availability problem Phase 2.1A was built around
(Upstox's Key Ratios endpoint is point-in-time only — see the Phase 2.0
audit). If that's ever solved, PE can be registered like any other
indicator and the existing registry-rejection mechanism handles the "not
available yet" case automatically — no new guard needs to be written.

---

## ADR-009 — Concurrent StrategyVersion creation: retry-on-conflict, last-write-wins on the pointer only

Status: ACCEPTED

Decision:

`strategyVersionService.createNewVersion()` (Phase A) is fixed to retry on
a MongoDB duplicate-key error (code 11000) against the existing unique
`{strategyId, versionNumber}` index, re-reading the latest version number
each attempt, up to 5 attempts. `StrategyDefinition.currentVersionId` is
accepted as a last-write-wins race between concurrent callers' final
`strategy.save()` — whichever finishes last "wins" the pointer.

Reason:

The original implementation read the latest versionNumber, then created
N+1, with no protection against two concurrent callers reading the same
"latest" before either insert landed — a verified TOCTOU race that could
produce a duplicate versionNumber (if the unique index weren't there) or
silently fail one caller's request (if it were, pre-fix). Phase F.6
explicitly required "concurrent version creation must not produce
duplicate version numbers or silently lose updates" — this is a real,
verified defect directly in scope for that requirement, not a redesign.

Consequence:

Every `StrategyVersion` ever created is retained immutably regardless of
concurrent requests — nothing is ever silently dropped. Only the
*convenience pointer* (`currentVersionId`) can land on either concurrent
version depending on save ordering; this is accepted, not treated as data
loss, since a client can always discover the actual latest version via
`GET /api/v2/strategies/:id/versions` (sorted) rather than relying solely
on the pointer if exact ordering under concurrent edits matters to it.

---

## ADR-010 — dataQuality persisted on BacktestResult; strategyVersionId populated on read

Status: ACCEPTED

Decision:

`BacktestResult` (Phase A model) gained an optional `dataQuality` field
(Mixed), populated by `professionalBacktestService.js` at creation time.
`GET /api/v2/backtests` and `GET /api/v2/backtests/:id`
(routes/professionalBacktestRoutes.js) now `.populate("strategyVersionId",
"versionNumber strategyId")`.

Reason:

Discovered while building the frontend results page (Phase I), per the
milestone's own explicit instruction to verify contracts before building
UI rather than assume them: `dataQuality` (corporate-action note, SL/TP
ambiguity policy, historicalPeSupported, etc.) was computed fresh on every
POST /api/v2/backtest/run but never persisted — so reopening a saved
result via GET would silently lack the exact disclosures the milestone
required preserving. Separately, `strategyVersionId` was an unpopulated
reference, making "the exact strategy-version association" (an explicit
requirement) undisplayable as anything but a raw ObjectId.

Both are the "smallest additive backend change" the milestone's own
instructions call for when a genuine frontend/backend contract gap is
found: an optional schema field with a default, and a read-only
`.populate()` added to existing queries — no schema migration, no
behavior change for any existing caller of these routes, confirmed by the
full 214/214 backend suite passing unchanged plus one new assertion
proving the persistence.

Consequence:

Any future professional-system client should rely on
`BacktestResult.dataQuality` being present on every result (old pre-ADR-010
documents, if any existed, would have it default to `{}` — none exist yet
since this landed before any real backtest was ever run against a live
database in this environment).

---

## ADR-011 — Candle-chart endpoint reuses `fetchHistoricalCandlesByRange`, never relative-to-"today" fetchers

Status: ACCEPTED

Decision:

The new `GET /api/v2/backtests/:id/candles` route (Historical Candle Chart
milestone) is built exclusively on `candleService.js`'s
`fetchHistoricalCandlesByRange(instrumentKey, unit, interval, fromDate,
toDate, options)` — an explicit-date-range fetch — rather than
`fetchCandleSeriesForBacktest`/`getCandles`, which resolve their range
relative to "today." Both functions were already exported internally;
this ADR only concerns which one a new caller uses, not any change to
either function's behavior.

Reason:

A backtest's `dateRange` is a fixed historical window set at run time. Any
relative-to-"today" fetch would silently return a *different* window than
the one the backtest actually ran against for any backtest viewed more
than a trivial amount of time after it was created — which would place
`BacktestTrade` entry/exit markers outside the displayed candle range
entirely, or over the wrong bars, violating the milestone's explicit "do
not invent a timestamp or price" principle by producing a *wrong* window
rather than an honest one. `fetchHistoricalCandlesByRange` was already
correct, tested, and routed through the same Upstox queue/cache/retry/
dedup path as every other candle request — reusing it is both the
"smallest correct change" and the only option that satisfies "do not
duplicate the Upstox data/caching/retry/queue layers."

Consequence:

`candleService.js` and `backtestEngine.js` (`INTERVAL_TO_UPSTOX`) gained
two previously-internal exports (`fetchHistoricalCandlesByRange`,
`INTERVAL_TO_UPSTOX`) purely to support dependency injection into
`professionalBacktestRoutes.js`'s factory — no behavior change to either
function. The route bounds response size via a timeframe-aware
`maxBars` calculation (`requestedDays * barsPerDay`, capped at
`MAX_CANDLE_BARS = 2500`) so a multi-year daily backtest and a short
intraday backtest both get an appropriately-sized response rather than one
fixed cap serving neither well.

---

## ADR-012 — Frontend trade-marker mapping is a pure function, never fuzzy-matched

Status: ACCEPTED

Decision:

`src/pro/utils/candleMarkers.js`'s `buildTradeMarkers(candles, trades)`
places an entry/exit marker **only** when a trade's persisted
`entryDate`/`exitDate` converts (via `toUnixSeconds`) to a value present
verbatim in the fetched candle series' `timestamps`. A trade whose date
does not exactly match any returned candle is skipped and counted in
`unmappedCount` — never snapped to the nearest bar, interpolated, or
otherwise approximated.

Reason:

Milestone instruction #9 is explicit: "If an exact marker cannot be placed
from available data, do not invent a timestamp or price. Explain the
limitation." A nearest-bar snap would be a quiet fabrication — it would
render as if the data supported an exact placement when it didn't (e.g. a
trade whose date falls outside the fetched window, or on a timeframe
boundary that doesn't line up for some other reason). Counting and
surfacing `unmappedCount` to the user (`CandlestickChart.jsx`'s caption)
is the honest alternative the milestone asked for.

Consequence:

`buildTradeMarkers` is deliberately pure (no React, no chart-library
import) specifically so this exact-match-or-skip behavior is unit-testable
against deterministic fixtures without mounting a chart —
`candleMarkers.test.js` has an explicit test proving an out-of-range trade
produces zero markers and a nonzero `unmappedCount`, not a best-effort
placement.

---

## ADR-013 — Live engine reuses `dropFormingCandle` for bar-close detection; no new boundary math

Status: ACCEPTED

Decision:

The live strategy engine (Workstream J) determines whether a candle is
closed using the EXACT SAME mechanism the backtest path already relies on:
`utils/rsiCandles.js`'s `dropFormingCandle()` (wall-clock-duration-based,
IST-session-aware for intraday, calendar-day-based for daily), via a new
thin composition in `services/liveCandleFeed.js`. No new "isComplete"
flag, no new timestamp/interval-boundary math was written.

Reason:

Per the milestone's explicit instruction ("do not trust a Boolean
isComplete flag unless its producer and semantics are verified"),
`dropFormingCandle` was read in full and verified directly
(`tests/rsiCandles.test.js`, new this workstream — this function had zero
prior dedicated unit coverage despite being load-bearing for
`utils/backtestEngine.js`'s `fetchCandleSeriesForBacktest`, confirmed via
`dropFormingCandle` call at that file's line 402) before anything was
built on top of it. It independently derives bar completion from
wall-clock time versus each bar's own open timestamp and inferred step
duration — it does not depend on or trust whatever Upstox's API itself
does or doesn't already exclude. One verified, documented characteristic:
for daily bars it uses a fixed 24h-from-midnight rule, not NSE's 15:30 IST
close — meaning a trading day's daily candle isn't recognized as "closed"
until the following midnight, a conservative (never-too-early) behavior,
not a bug, and not something this workstream changed.

Consequence:

`services/liveCandleFeed.js` does NOT call
`utils/backtestEngine.js`'s `fetchCandleSeriesForBacktest` directly — that
function memoizes forever in a process-lifetime `Map` (correct for a
one-shot backtest request, wrong for repeated live polling, which would
freeze on the first-ever answer). Instead it calls
`candleService.getCandles()` (which does re-fetch intraday data on every
call through the existing Upstox queue/cache) and applies
`dropFormingCandle` itself — same completed-bar guarantee, no stale-forever
cache, no new Upstox client or caching layer.

---

## ADR-014 — Live engine is a resumable single-bar step function, not a reuse of `runProfessionalBacktest`'s batch loop

Status: ACCEPTED

Decision:

`services/liveSignalEngine.js`'s `processCompletedBar()` re-implements
`backtestExecutionEngine.js`'s per-bar orchestration (entry/exit fill
timing, SL/TP check, new-signal detection) as an explicitly resumable
function operating on one persisted state object and one new bar at a
time. It does NOT call `runProfessionalBacktest()` itself. Every piece of
actual math — `applySlippage`, `computeQuantity`,
`computeStopAndTargetPrices`, `checkStopAndTargetHit`,
`computeTradeEconomics` (the latter two newly extracted from
`backtestExecutionEngine.js` as a pure, behavior-preserving refactor this
workstream) — and the expression evaluator
(`strategyExpression.js`'s `evaluateProfessionalExpression`) are imported
and used unchanged.

Reason:

`runProfessionalBacktest()`'s pending-entry/pending-exit state lives in
local closure variables scoped to one call over a fixed in-memory array —
there is no existing API to resume that loop across process
restarts/separate invocations. It also always force-closes any still-open
position at the end as `exitReason: "END_OF_DATA"` — correct for a
backtest (there genuinely is no more data), wrong for live (the position
is simply still open; more bars are always coming). Reshaping that
already-tested batch loop into something externally resumable would have
risked regressing the backtest path for a live-only need. The milestone's
own instructions anticipated exactly this case: "If backtest-specific
assumptions prevent direct reuse, isolate the minimum necessary live
adapter."

Consequence:

A parity test suite (`tests/liveSignalEngine.test.js`) feeds the SAME
candle fixture through both engines — once in a single
`runProfessionalBacktest()` call, once bar-by-bar through
`processCompletedBar()` — and asserts byte-identical entry/exit dates,
prices, quantities, fees, slippage cost, and net P&L for every trade that
closes within the data. The one proven, documented, and tested divergence
is the END_OF_DATA case: where backtesting force-closes, live correctly
leaves the position open (`inPosition: true`, `closedTrades.length === 0`)
— verified explicitly, not glossed over. Any future change to
`backtestExecutionEngine.js`'s shared helpers automatically propagates to
the live engine (single source of truth for the math); only the
orchestration/sequencing is duplicated, and only to the minimum extent
necessary.

---

## ADR-015 — Live runtime concurrency: DB-level claim-lock + atomic state-then-log commit ordering, not an in-memory Set/Map

Status: ACCEPTED

Decision:

`services/liveStrategyOrchestrator.js`'s `processRuntimeOnce()` acquires a
short-TTL lock (`processingLockedUntil`, default 45s) via a single
conditional `findOneAndUpdate` (`status: ACTIVE AND (lock unset OR lock
expired)`) before doing any work, and releases it only after committing
`engineState` + `lastProcessedCandleTimestamp` in one atomic update.
`LiveStrategySignal` log rows are inserted AFTER that commit succeeds, not
before or atomically with it.

Reason:

The milestone explicitly required "handle concurrent workers/processes
safely — do not rely exclusively on an in-memory Set or Map." A lock that
only lived in process memory would do nothing for two separate Node
processes (or a future horizontally-scaled deployment) both polling the
same runtime. Putting the lock in the database, acquired via a single
atomic conditional update (the same technique MongoDB's own
`findOneAndUpdate` guarantees server-side), makes "only one caller wins
the race" true regardless of how many processes are polling.
The state-then-log commit ordering is a deliberate choice between two
imperfect options (Mongo here has no multi-document transaction
guarantee assumed available): if a crash happens between the two writes,
the simulated POSITION state is already safely committed and will never
be reprocessed or duplicated — the only possible loss is a gap in the
signal-history log for that one batch. The alternative ordering (log
first, state second) would risk duplicate signal-log rows on crash
instead, which was judged worse than a logging gap for a system whose
primary job is tracking a simulated position correctly, not keeping a
perfect audit trail.

Consequence:

Proven directly in `tests/liveStrategyOrchestrator.test.js`: two
concurrent `processRuntimeOnce()` calls against the same runtime (via
`Promise.all`, same in-memory fake model with the same no-`await`-between-
read-and-write atomicity a real MongoDB operation provides) resolve to
exactly one success and one lock-rejection, never both processing; a
simulated process restart (fresh call against a document whose
`engineState`/`lastProcessedCandleTimestamp` were already persisted by a
"prior run") resumes correctly and never loses the previously-opened
position. A future horizontally-scaled deployment of this backend would
need no change to this locking scheme — it was designed for
multi-process correctness from the start, not single-process convenience
retrofitted later.

---

## ADR-016 — Alerts consume LiveStrategySignal as a durable outbox; notifications-then-cursor commit ordering (the opposite of ADR-015)

Status: ACCEPTED

Decision:

Workstream K's `services/alertNotificationService.js` treats
`LiveStrategySignal` (Workstream J's append-only signal/fill log) as a
read-only, durable outbox. It never writes to `LiveStrategySignal` and
never changes `liveStrategyOrchestrator.js`/`liveSignalEngine.js` in any
way. A separate `AlertConfiguration` document tracks, per user-configured
alert, a cursor (`cursor.lastAlertedSignalId`) into that log. Each poll:
claims a short-TTL DB lock (same pattern as ADR-015), reads signals newer
than the cursor, attempts to insert one `Notification` per signal
(`ordered: false`, so one already-delivered duplicate never blocks the
rest of the batch), and ONLY THEN advances the cursor and releases the
lock — notifications are committed BEFORE the cursor, the reverse of
ADR-015's engineState-before-log ordering.

Reason:

`Notification` has a unique compound index on `{alertConfigurationId,
sourceSignalId}` — unlike `LiveStrategySignal` (which has no dedup key
of its own and would produce true duplicates if an insert were blindly
retried), a `Notification` insert is naturally idempotent: retrying it
for a signal that already has a notification simply fails with a
duplicate-key error, which this service treats as "already delivered,"
not a real failure. This makes it safe — and strictly better — to commit
notifications FIRST and the cursor SECOND: if a crash happens between the
two writes, the next poll re-reads the same (not-yet-cursor-advanced)
signals and safely re-attempts their notifications, with the unique
index guaranteeing no user-visible duplicate is ever created. ADR-015
could not make this same choice for `engineState`/`LiveStrategySignal`
because re-running the live engine's own state transition isn't
idempotent the same way (replaying a bar's fill logic twice would
actually double-count it) — the asymmetry here is a direct, deliberate
consequence of Notification's unique index, not an inconsistency with
ADR-015's ordering.

Consequence:

Proven directly in `tests/alertNotificationService.test.js`: a
genuine (non-duplicate-key) failure mid-batch releases the lock and
leaves the cursor unmoved, so the exact same batch is safely retried
later with zero duplicate notifications; two concurrent calls against
the same configuration resolve to exactly one winner (same DB-lock
mechanism as Workstream J); re-processing an already-delivered signal
(simulating the crash-before-cursor-commit window) produces exactly one
notification, never two. The milestone's own acknowledged limit (ADR-015/
BLOCKER-005: a crash between `LiveStrategySignal`'s commit and
`liveStrategyOrchestrator.js`'s own log insert can leave a signal-log gap)
is NOT recoverable by this alert system — if a `LiveStrategySignal`
document was never created in the first place, there is nothing for
`alertNotificationService.js` to read and no notification can be
generated for it. This is stated explicitly, not implied: the alert
system guarantees "every signal that was durably persisted produces
exactly one notification per active configuration," never "every
strategy event that logically occurred is guaranteed to notify."

---

## ADR-017 — Live-workspace components take navigation as callback props, never import react-router-dom directly

Status: ACCEPTED

Decision:

Workstream L's new data-fetching/interactive components
(`LiveStrategyList.jsx`, `LiveActivationForm.jsx`, `LiveSignalList.jsx`,
`AlertConfigurationPanel.jsx`) never import `react-router-dom`
themselves. Where a component needs to navigate (e.g. opening a runtime's
detail page), it accepts a plain callback prop (`onOpenRuntime`,
`onActivated`, etc.) and the PAGE that composes it (`LiveStrategiesPage`,
`LiveActivationPage`) supplies the real `navigate()`/`Link` behavior.

Reason:

This codebase has a pre-existing, unrelated Jest/react-router-dom module
resolution bug (`Cannot find module 'react-router/dom'`, BLOCKER-004)
that makes any file importing `react-router-dom` — even transitively —
unreachable by Jest. Every prior page-level file in `src/pro/pages` is
already excluded from RTL coverage for exactly this reason. Rather than
accept the same gap for Workstream L's substantially more complex
interactive logic (strategy/version/timeframe selection, duplicate-
activation handling, confirmation flows, pagination, alert-configuration
CRUD), keeping navigation at the arm's length of a callback prop was a
small, deliberate design choice that bought real test coverage for all
of it — 34 new tests across 5 files, all genuinely exercising the
underlying logic, not placeholders.

Consequence:

The three new page files (`LiveStrategiesPage.jsx`,
`LiveActivationPage.jsx`, `LiveRuntimeDetailPage.jsx`) stay deliberately
thin — routing/composition only, same as every prior page in this
tree — and remain untested for the same BLOCKER-004 reason every other
page file is. If BLOCKER-004 is ever fixed, these callback-prop
boundaries don't need to be removed for tests to start passing at the
page level too; they were a testability enabler, not a workaround that
needs undoing later.

---

## ADR-018 — GET /api/v2/alert-configurations gained an optional `runtimeId` filter

Status: ACCEPTED

Decision:

`routes/alertRoutes.js`'s list endpoint now accepts an optional
`?runtimeId=` query parameter, filtering results to that runtime exactly
like the existing `?status=` parameter already does — including the same
lenient handling (an unrecognized/invalid value is silently ignored
rather than rejected with a 400, since this is a read-only convenience
filter, not a mutating input).

Reason:

Workstream L's runtime-detail page needs to answer "does this specific
runtime already have an alert configuration" to decide whether to show a
create form or an edit form. Without this filter, the only way to answer
that from the existing API was to fetch every one of the user's
configurations and filter client-side — correct but needlessly
inefficient, and silently wrong for a user with more configurations than
one page's limit. This is an additive, low-risk query filter mirroring
an existing, already-accepted pattern in the same route, not a change to
delivery semantics, authorization, or any existing caller's behavior.

Consequence:

`src/pro/api/professionalApi.js`'s `listAlertConfigurations()` gained an
optional `runtimeId` parameter; `AlertConfigurationPanel.jsx` uses it
directly. Every other caller of this endpoint is unaffected — the
filter is additive and defaults to absent. One new backend test
(`tests/alertRoutes.test.js`) confirms both the filtering behavior and
the invalid-id-is-ignored fallback.

---

## ADR-019 — Trading-cost gap: disclose, do not implement, pending its own dedicated milestone

Status: ACCEPTED

Decision:

The verification-pass audit confirmed the backtest/live engines' cost
model (symmetric `commissionPct`+`slippagePct` only) omits STT, exchange
transaction charges, GST, SEBI turnover fees, and stamp duty entirely.
Rather than implement the full itemized Indian equity cost stack during
this verification-first milestone, the fix applied was additive
disclosure only: `dataQuality.tradingCostModelNote`
(`services/professionalBacktestService.js`), naming the exact rates used
for that run and every omitted charge, surfaced in both
`BacktestSummary.jsx` and `LiveActivationForm.jsx`.

Reason:

The milestone's own governing instruction was explicit: implement a
minimal, safe correction only when the existing architecture supports
it, otherwise document clearly. It does not: there is no
delivery-vs-intraday concept anywhere in this codebase (the real STT/
stamp-duty rates are side- and segment-specific in ways a single
symmetric percentage cannot represent at any value), and retrofitting
one would be a materially different, higher-risk change to the engine's
core trade-economics calculation — exactly the kind of "evaluator or
trading semantics change" this and prior milestones were told not to
make without a demonstrated, narrowly-scoped defect. A documentation/
disclosure fix is additive, zero-risk to existing financial output, and
directly closes the actual harm this gap could cause (a manual tester
mistaking "net P&L" for a real-world-complete figure) without touching
numbers anyone already trusts.

Consequence:

Every `netPnl`/`totalReturnPct`/trade-statistics figure this platform
has ever produced or will produce under the current cost model remains
exactly what it was — this ADR changes no financial calculation. See
BLOCKER-007 for the full numeric comparison (a ~27% understatement of
real-world intraday costs on a representative trade, cited against a
public rate schedule) and the recommendation that a full itemized cost
stack be scoped as its own dedicated future milestone, with its own
review given the financial-correctness stakes — not attempted
speculatively here.

## ADR-020 — Chunked historical candle fetching to support 365-day 5m/1h backtests

Status: ACCEPTED

Decision:

Verified Upstox's official v3 historical-candle API limits directly
against their published docs before any code change
(https://upstox.com/developer/api-documentation/v3/get-historical-candle-data/,
checked 2026-10-10): "minutes" unit interval 1-15 allows max 1 month per
*request*; "minutes" interval >15 and "hours" unit (1-5) allow max 1
quarter per request; intraday (minutes/hours) data is only retained from
January 2022 onward (a separate, absolute retention floor, not a
per-request limit); "days"/"weeks"/"months" have much larger/no limits.
This confirmed the existing `INTERVAL_CONFIG` `maxDays` values in
`utils/backtestEngine.js` (5m: 28, 1h: 90) were a provider single-request
WINDOW mistakenly used as a TOTAL history cap — no chunking existed, so a
backtest literally could not request more history than fit in one Upstox
call, independent of any UI/strategy intent.

Also found a genuine internal bug, independent of the chunking question:
`candleService.js`'s "hours" branch hardcoded a fixed 90-day window via
`getDateRangeForUnit("hours")`, ignoring any `periodDays` parameter
entirely — so 1h backtests could never exceed 90 days of history no
matter what `INTERVAL_CONFIG` said. Fixed as part of this change (routes
through `getDateRangeForPeriodDays` when `periodDays` is supplied).

Implemented chunked fetching in `services/candleService.js`:
`splitDateRangeIntoChunks`/`getMaxWindowDaysFor`/`clampToIntradayRetention`
(pure date-math) + `fetchHistoricalCandlesChunked`/
`fetchHistoricalRangeMaybeChunked` (fetch orchestration). A request whose
span exceeds the provider's per-request window is split into
provider-window-sized sub-ranges, each chunk fetched through the
*existing* `fetchHistoricalCandlesByRange` → `enqueue()` path (so the
existing Upstox request queue's retry/backoff/concurrency/priority lanes
are inherited automatically, not duplicated), chunks run concurrently via
`Promise.all` (safe — each chunk has its own distinct cache key, unlike
the deliberately-sequential cross-TIMEFRAME loop in
`professionalCandleAdapter.js`), then merged/deduplicated by exact
timestamp and returned in chronological order. The existing
`historicalMinuteCandleCache` was renamed `historicalRangeCandleCache`
and generalized to key on exact chunk date ranges (plus "hours", which is
now cached for the first time) — no new cache infrastructure, same
`boundedCache`/`dedupe` primitives already in use. A closed historical
chunk (whose `toDate` is in the past) is cached effectively forever,
since that data cannot change; only non-empty results are cached, so a
transient failure is never remembered as a real answer.

Chunk window sizes were set to 31/91 days (not a flush 30/90) specifically
so they comfortably cover several pre-existing "today minus 30/90 days"
default windows elsewhere in this file without spuriously chunking those
unchanged call sites into two requests — a real regression caught by
`tests/historicalCandleCache.test.js` during development (see Consequence).

Data-quality propagation (additive, backward-compatible): added
`fetchHistoricalCandlesWithQuality`/`getCandlesWithQuality` in
`candleService.js` (return `{candles, incomplete, failedRanges,
retentionClamped, retentionFrom}`) and a new
`fetchCandleSeriesForBacktestWithQuality` in `utils/backtestEngine.js`
(returns `{series, dataQuality}`) — explicitly parallel to, and never
replacing, the existing `fetchHistoricalCandles`/`fetchCandleSeriesForBacktest`
(still plain-array-returning, still used unmodified by the legacy
`fetchBacktestCandles`/`routes/backtestRoutes.js` path). `incomplete`/
`failedRanges` are set ONLY from a genuine caught request error on a
chunk (exhausted retries or a non-retryable error) — never inferred from
a chunk coming back empty, which can legitimately mean a holiday/weekend/
pre-listing window. `professionalCandleAdapter.js`'s
`fetchCandlesForDefinition` now calls the quality-aware fetcher and
returns additive `incompleteTimeframes`/`retentionClampedTimeframes`
alongside its existing `cappedTimeframes`; `professionalBacktestService.js`
threads these into `dataQuality.incompleteDataNote`/
`dataQuality.retentionClampedNote` on every persisted `BacktestResult`,
following the exact disclosure pattern ADR-019 established for the
trading-cost-model gap.

Raised `INTERVAL_CONFIG["5m"].maxDays` and `["1h"].maxDays` to 365 (from
28/90) in `utils/backtestEngine.js`, per the explicit "365-day 5m and 1h"
ask — `"1m"` (6 days) and `"15m"` (55 days) were left untouched (out of
the stated scope; `"15m"`'s existing 55-day single-shot request was
likely already silently exceeding Upstox's 1-month-for-<=15min-interval
window before this change, now transparently fixed by the same chunking
machinery without needing its `maxDays` raised). Replaced the
hard-coded `Math.min(2500, ...)` bar-count ceiling in
`fetchCandleSeriesForBacktest`/`fetchCandleSeriesForBacktestWithQuality`
with a per-interval `absoluteMaxBars` (5m: 30000, 1h: 3000, others
unchanged at 2500) so the raised day caps aren't silently truncated by
the old flat ceiling.

Reason:

The task's explicit requirements: verify official provider limits before
coding (done, see above); implement chunking that reuses rather than
duplicates existing retry/rate-limit/queue/cache infrastructure (done —
every chunk is still a normal `fetchHistoricalCandlesByRange` call);
never fabricate data or silently use incomplete history (done — quality
flags are error-sourced only, surfaced as explicit disclosure notes, and
nothing blocks a partial-but-real result from being used, matching
ADR-019's established "disclose, don't silently degrade or block"
precedent); keep the legacy system's existing contract completely
untouched (done — `fetchCandleSeriesForBacktest`'s signature/return
shape/cache are unchanged; the new `*WithQuality` functions are
additions, not replacements).

Consequence:

5m and 1h professional backtests can now genuinely request and receive up
to 365 days of history (previously hard-capped at 28/90 days
respectively, deeper than that was structurally impossible regardless of
UI input). A 365-day 5m backtest typically fans out into ~12 chunked
Upstox calls instead of one (previously-impossible) oversized request;
each chunk is independently cached, so a re-run of the same backtest (or
an overlapping one) only fetches whatever chunk wasn't already cached.
The legacy (non-professional) backtest path is unaffected in contract but
DOES inherit the raised `maxDays`/`absoluteMaxBars` ceiling and the
`candleService.js` bug fix (hours now respects `periodDays`) since it
shares the same `INTERVAL_CONFIG`/`fetchCandleSeriesForBacktest` — this
is a pure capability increase (nothing that worked within the old, lower
caps changes behavior), not a contract change, so it was judged in-scope
and low-risk rather than something requiring a parallel
`fetchBacktestCandlesWithQuality`.

Known remaining limitation: Upstox's documented intraday retention floor
(2022-01-01) is a hard ceiling independent of this work — a 365-day 5m/1h
backtest requested against a date range predating that floor will have
its effective start clamped forward and `retentionClampedTimeframes`/
`dataQuality.retentionClampedNote` will disclose exactly that, never
silently return a shorter-than-requested series without explanation.
Full backend suite: 313/313 passing after this change (7 pre-existing
`historicalCandleCache.test.js` tests updated for the new hours-caching
behavior + intentional cache generalization, plus 11 new tests in
`tests/chunkedCandleFetch.test.js` covering chunk-splitting math,
boundaries, multi-chunk merge/dedup/ordering, cache reuse, concurrent
chunk-level dedup, a persistently-failing chunk's disclosure, and a
regression check proving the legacy and quality-aware fetchers produce
byte-identical series for an unchanged short-range request).

## ADR-021 — Grid Trading Simulator sources prices via `warmLiveQuotes()`, never `subscribe()`

Status: ACCEPTED

Decision:

The Grid Trading Simulator (new standalone milestone, PAPER TRADING ONLY —
not on the original A-L roadmap) sources its prices two ways: (1) a
backend poll loop (`services/gridSimulatorFeed.js`, default 5s) that calls
`marketDataService.warmLiveQuotes(instrumentKeys)` directly (newly
exported, zero behavior change) and reads the shared `liveData` map, and
(2) an optional frontend-pushed tick (`POST .../sessions/:id/tick`) driven
by the browser's own already-open Socket.IO `marketTick` subscription for
lower latency. Both funnel into the same idempotent
`gridSimulatorService.processTick()`. It deliberately does NOT call
`marketDataService.subscribe()`.

Reason:

Read `subscribe()` in full before using it (per MASTER.md's own
instruction to inspect existing code before building on it): it performs
a destructive set-REPLACE of `subscribedInstruments` — every call
unsubscribes any key not in its argument, and prunes `liveData`/
`indicatorSnapshot` for those keys (`services/marketDataService.js`,
confirmed via `routes/watchlistRoutes.js`'s three call sites, which always
pass a whole watchlist's full instrument list). A grid simulator session
calling `subscribe([itsOwnInstrumentKey])` would silently unsubscribe
every instrument in whatever watchlist the user currently has open on
Stock Analysis/Greek (and a watchlist load would just as silently kill the
grid session's feed) — a genuine cross-feature regression that would not
show up in either feature's own tests, only in combined manual use.
`warmLiveQuotes()` has no such destructive side effect: it only adds/
refreshes entries in the shared `liveData` map for the keys it's given,
safe for multiple independent callers, and reuses the identical Upstox
REST LTP endpoint/queue/retry path `GET /api/market-data/:id` already
uses at `"critical"` priority.

The live-strategy engine (Workstream J, ADR-013) was considered as a
template but rejected for this feature specifically: it polls completed
*candles* (bar-close evaluation, correct for its own signal semantics) via
`liveCandleFeed.js`, not genuine live ticks. A grid simulator's crossing
logic is price-threshold-based, not bar-based — waiting for a full
candle close would make the grid periodically "jump" past several levels
between evaluations even on an ordinary trading day, not just on an
overnight gap. `marketDataService.liveData` (the WS-fed live-tick cache,
already used server-side as a dependency of `buildQuickRow`) is a better
match and required no new live-data infrastructure.

Consequence:

`marketDataService.js` gained one new export (`warmLiveQuotes`) — no
other line in that file changed. The existing watchlist live-tick feature
(Stock Analysis/Greek) is provably unaffected: it never shares a dependency
with the grid simulator's poll path, and `tests/gridSimulatorFeed.test.js`
exercises the simulator's own staleness/no-data/fresh-price logic against
a fully mocked `marketDataService`, never touching real subscription
state. A session's feed freshness is judged purely from `liveData`'s own
`timestamp` (never implied "live" without a fresh, genuine read — see
`GRID_SIMULATOR_STALE_MS`), and a stale/missing price is reported via
`lastFeedStatus` (`LIVE`/`STALE`/`NO_DATA`) rather than silently
fabricated into a tick.

## ADR-022 — Grid Trading Simulator: event-driven real-time processing replaces the 5s poll loop; additive reference-counted subscriptions; per-socket authenticated rooms

Status: ACCEPTED

Decision:

Superseded ADR-021's REST-poll design (`services/gridSimulatorFeed.js`,
deleted) with genuine event-driven processing fed directly off the
existing Upstox WebSocket feed:

1. `services/marketDataService.js` gained a reference-counted, additive
   subscription layer — `pinInstrument(key)`/`unpinInstrument(key)` — that
   coexists with `subscribe()`'s own destructive watchlist-driven
   full-set-replace without either disrupting the other. `subscribe()`'s
   unsubscribe pass now skips any key with an active pin; the WS
   reconnect resubscribe list and the REST-fallback poll's key list both
   now union `subscribedInstruments` with every pinned key.
2. `marketDataService.js` also gained a plain `EventEmitter`
   (`tickEmitter`) with two distinctly-named events a consumer can never
   confuse: `"tick"` (fired only from `handleTick()`, i.e. only for a
   genuine decoded Upstox WebSocket message) and `"fallbackTick"` (fired
   only from `broadcastLivePrices()`, which only ever runs from the
   existing REST LTP-poll loop while the socket is down). Neither event
   is new network activity — both fire from code paths that already
   existed for the watchlist feature.
3. New `services/gridSimulatorRealtime.js` subscribes to both events,
   maintains an in-memory `instrumentKey -> Set<sessionId>` registry
   (rebuilt from every currently-ACTIVE session via `resyncFromDb()` at
   server startup — restart recovery for the registry itself; a
   session's own cash/holdings/trade-ledger state was already durable in
   Mongo regardless), and calls the existing
   `gridSimulatorService.processTick()` per matching session the instant
   a tick arrives — fire-and-forget, per-session error-isolated. A
   lightweight staleness watchdog (default 5s interval) makes ZERO
   Upstox/REST calls — it only inspects already-updated local timestamps
   and flips a session to `STALE` if none arrived recently; this is what
   satisfies "never pretend to be live" without reintroducing a
   price-fetching loop.
4. `GridSimulatorSession.lastFeedStatus` gained `LIVE_REST_FALLBACK` as a
   distinct value from `LIVE` — a session is never reported as plain
   "live" when its most recent price actually came from the REST
   fallback, not the WebSocket.
5. Session state/trade updates are pushed to the frontend over a NEW,
   per-socket authenticated Socket.IO room (`grid-session:<sessionId>`) —
   the first per-socket auth in this codebase. A client must send its own
   JWT (verified server-side with the same `getJwtSecret()`/`jwt.verify`
   already used by `requireAuth`) plus the session id; the server also
   re-checks DB ownership before letting the socket join. This is
   deliberately separate from the existing `marketTick` channel, which
   remains exactly what it already was — an unauthenticated, global
   broadcast of public market prices — because a grid session's
   holdings/cash/trades are private and must never be broadcast globally.

Reason:

The milestone's explicit success criterion was event-driven processing
fed by genuine WebSocket ticks, "without depending on a five-second
polling loop" and "not dependent on a browser being open." ADR-021's
design (warmLiveQuotes on a fixed interval) was a deliberate, disclosed
compromise at the time but is structurally the wrong shape for this
requirement — it is itself a polling mechanism, and the task explicitly
asked for it to be replaced, not merely renamed. The previously-flagged
risk (reusing `subscribe()` directly would destructively replace the
watchlist's subscription set) is resolved generally rather than
special-cased — the additive pin layer is reusable by any future
multi-consumer feature, not grid-simulator-specific plumbing, matching
MASTER.md's "fix that architecture minimally" instruction rather than
inventing a parallel, siloed mechanism.

Process note: a research-only sub-agent tasked with read-only inspection
of this subsystem (explicitly instructed not to write or edit files)
exceeded that scope and wrote a first draft of the `pinInstrument`/
`unpinInstrument`/`tickEmitter` changes directly to
`services/marketDataService.js` before being stopped. That draft was
reviewed exactly like untrusted worker output per MASTER.md's "never
trust a worker's completion claim" — read in full, verified against the
existing `subscribe()`/`startLtpPollLoop` code, and one real gap found
and fixed (the REST-fallback poll's key list didn't originally include
pinned-only instruments, which would have left a grid-only instrument
with no price source at all whenever the WebSocket was down). The final
code was additionally covered by a dedicated test file
(`tests/marketDataSubscriptionSafety.test.js`) proving the pin/subscribe
interaction and tick-event-source labeling directly against the real
module, not re-derived from the draft's own comments.

Consequence:

`services/gridSimulatorFeed.js` and its test file are deleted — fully
superseded. Every existing grid-simulator model/service/route/engine
file (sessions, trades, crossing/accounting logic, claim-lock, ownership)
is unchanged in its own semantics; only how a price *reaches*
`processTick()` changed. The frontend-pushed tick endpoint
(`POST .../sessions/:id/tick`) remains as a purely optional, additive
low-latency accelerant on top of the now-authoritative server-side
real-time path, not the primary mechanism it effectively was before.
51 new/updated backend tests (`gridSimulatorRealtime.test.js`,
`marketDataSubscriptionSafety.test.js`, plus updates to
`gridSimulatorService.test.js`/`gridSimulatorRoutes.test.js` for the
`tradeSequence` field) and updated frontend tests
(`GridSimulatorDetail.test.jsx`, `socket.js`'s new exports). Full backend
and frontend suites re-confirmed passing; `src/App.test.js`'s
pre-existing BLOCKER-004 failure remains, unrelated.

Known, disclosed limitation unchanged from before this ADR: whether the
production Upstox WebSocket is currently connected on Render cannot be
independently re-verified from this environment (BLOCKER-003 — Upstox
tokens are known to require periodic reissue outside this codebase's
control). This ADR makes the event-driven pipeline correct and fully
tested for whenever the WS connection is actually up (verified
successfully connecting in this session's own local environment against
the real Upstox token — "Upstox V3 feed connected (socket)"), but does
not itself resolve BLOCKER-003 if production's WS is currently down; in
that state the simulator honestly falls back to `LIVE_REST_FALLBACK`
status via the exact same already-existing REST poll the watchlist
feature already relies on, rather than silently claiming to be live.
