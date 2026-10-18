# MARKFINANCE STRATEGY PLATFORM ARCHITECTURE

## Goal

Build a professional strategy research and backtesting platform.

## Core Pipeline

Market Data
↓
Normalized OHLCV
↓
Indicator Engine
↓
StrategyContext
↓
Strategy DSL
↓
Signal
↓
Execution Engine
↓
Position
↓
Trade
↓
Risk + Cost
↓
Analytics
↓
BacktestResult
↓
Professional UI

## Core Principles

1. No lookahead.
2. Strategy versions are immutable.
3. Strategy definition is data-first.
4. Indicator calculations are series-first.
5. Signal generation is separate from execution.
6. Risk/cost configuration is explicit.
7. Backtests are reproducible.
8. Live and backtest strategy semantics should converge.
9. Existing user data must remain safe.
10. Legacy code can be replaced after safe migration.

## Strategy Versioning

Strategy identity is separate from StrategyVersion.

StrategyVersion is immutable.

Historical backtests reference the exact version used.

## Backtest Execution

Default:

Signal at bar i close.

Execution at bar i+1 open.

## Future Modes

- Backtest
- Live scanner
- Paper trading
- Alerts

All should eventually use the same strategy definition.

## Current Milestone

A → F, complete. F.5 (backtest integration layer) complete. F.6
(strategy management API) complete.

## F.6 Strategy Management API (implemented)

`routes/professionalStrategyRoutes.js`, mounted under `/api` in `app.js`
alongside F.5's routes — same `/v2` prefix convention, same separation
from the legacy `/api/strategies`.

```
POST   /api/v2/strategies                          create + initial version (always v1)
GET    /api/v2/strategies                          list (paginated, own strategies only)
GET    /api/v2/strategies/:id                       strategy + its current version
PUT    /api/v2/strategies/:id                        metadata-only update, OR (if `definition`
                                                     is supplied) a new immutable version
GET    /api/v2/strategies/:id/versions               list versions (paginated)
GET    /api/v2/strategies/:id/versions/:versionId     one specific version, in full
```

All version creation/advancement still goes through
`strategyVersionService.js` (Phase A) exclusively — this route never calls
`StrategyVersion.create()`/`.save()` directly. Metadata updates
(`name`/`description`/`status`) use a field allowlist
(`STRATEGY_METADATA_WRITABLE_FIELDS`) into `findOneAndUpdate`, never raw
`req.body` — same discipline as the legacy system's Phase 2.0 fix.
Ownership is enforced in every query's filter (`{_id, userId}`), not just
checked in controller logic — a malformed or foreign id reaches no
document, ever.

Fixed as part of this phase (ADR-009): `strategyVersionService.
createNewVersion()` had a read-then-write race on `versionNumber` under
concurrent calls. Now retries on the existing unique
`{strategyId, versionNumber}` index's duplicate-key error, re-reading the
latest version each attempt — no version is ever silently dropped;
`currentVersionId` is accepted as last-write-wins under concurrency, since
every version is retrievable regardless via `GET .../versions`.

## F.5 Integration Flow (implemented)

```
HTTP POST /api/v2/backtest/run
    ↓
requireAuth + backtestLimiter (existing middleware, reused)
    ↓
request validation (strategyId/versionId format, symbol/instrumentKey,
    startDate<endDate, initialCapital) — routes/professionalBacktestRoutes.js
    ↓
StrategyDefinition ownership check ({_id, userId}), then StrategyVersion
    scoped to that strategyId — never resolve a version by id alone
    ↓
resolveInstrumentKey() (existing, reused — utils/instrumentKeyResolver.js)
    ↓
services/professionalCandleAdapter.js: resolves every timeframe the
    strategy's entry/exit trees reference (via Phase B's
    collectIndicatorRequirements), then calls the EXISTING
    fetchCandleSeriesForBacktest() (utils/backtestEngine.js) per timeframe
    — same Upstox queue/cache/retry path the legacy engine already uses,
    no new candle-fetching implementation
    ↓
services/professionalBacktestService.js (runAndPersistBacktest):
    re-validates the definition defensively, builds the StrategyContext
    (indicatorEngine.js, Phase C), runs the engine
    (backtestExecutionEngine.js, Phase D/E), computes analytics
    (backtestAnalyticsService.js, Phase F)
    ↓
persists BacktestResult (one doc) + BacktestTrade (one doc per trade) —
    Phase A models, unmodified
    ↓
stable JSON response: backtestResultId, strategy/version identity,
    instrument/timeframe/dateRange, configuration snapshot, summary,
    equityCurve, up to 200 inline trades (+ tradesTruncated flag and a
    GET .../trades pagination endpoint beyond that), dataQuality block
    (corporate-action note reused from the legacy engine's
    CORPORATE_ACTIONS_NOTE, historicalPeSupported:false, the SL/TP
    ambiguity policy stated in plain language, any interval day-caps hit)
```

Companion routes: `GET /api/v2/backtests` (list, scoped to the caller,
equity series excluded for payload size), `GET /api/v2/backtests/:id`
(single result), `GET /api/v2/backtests/:id/trades` (paginated,
skip/limit).

Deliberately separate from the legacy `/api/backtest/run` — different
data model entirely, not a shared/branching endpoint.

## G-I Frontend Workstation (implemented)

New, isolated frontend tree `src/pro/` — kept entirely separate from the
legacy pages (`src/pages/Strategies.jsx`, `BacktestPage.jsx`,
`src/components/StrategyModal.jsx`, all untouched), consistent with the
backend's own ADR-006 separation.

```
src/pro/api/professionalApi.js        - the ONLY place that calls the v2 endpoints
src/pro/constants/dsl.js              - mirrors backend/utils/indicatorRegistry.js exactly
src/pro/utils/dslTree.js              - pure tree ops (add/remove/update/prune), no React
src/pro/components/
  OperandEditor / ConditionEditor / ExpressionGroupEditor  - the DSL builder (recursive)
  RiskConfiguration / ExecutionConfiguration
  StrategyEditor          - ties the above together, owns save/version semantics
  StrategyList / StrategyVersionHistory
  BacktestRunner
  BacktestSummary / EquityCurveChart / DrawdownChart / TradeExplorer
  CandlestickChart        - isolated placeholder, see BLOCKERS.md
src/pro/pages/
  StrategyWorkspace        - /workspace (list + create)
  StrategyEditorPage       - /workspace/strategies/:id (and "new")
  BacktestHistoryPage      - /workspace/backtests
  BacktestResultsPage      - /workspace/backtests/:id
```

Routed in `src/App.js` (additive only), linked from `TopNavbar.jsx`'s new
"Workspace" entry. Pages use the existing `MainLayout`, `apiFetch`
(global 401 handling inherited for free), and `utils/toast.jsx` — no new
layout/auth/error conventions invented.

**Key design decision**: the DSL editor's internal tree representation is
always group-rooted, even though the backend's `entry`/`exit` fields
legally accept either a bare condition or a group at the root
(`strategyExpression.js`'s `validateProfessionalExpression` accepts
both). Loading an existing definition wraps a bare condition in a
one-child group (`StrategyEditor.jsx`'s `toEditableTree`) purely for
editing uniformity — a one-child group is semantically identical and the
backend accepts it. This was a real bug caught by testing (see
`StrategyEditor.test.jsx`), not a hypothetical.

**Metadata-only vs. new-version save**: determined automatically, not by
a manual toggle — the initial definition is run through the exact same
build/prune pipeline used at save time (once, from props, not re-derived
from live state) and compared by value against the freshly-built one;
only a genuine difference sends `definition` in the PUT body.

**Chart-library decision**: no new dependency installed. `recharts`
(already a dependency) covers equity/drawdown/benchmark fully. A
candlestick chart with trade markers was evaluated but deliberately not
built this milestone — no v2 endpoint returns the underlying OHLC candle
series for a backtest, so there is nothing real to render yet (see
BLOCKERS.md, resolved-not-installed).

**Known constraint**: a pre-existing, unrelated Jest/react-router-dom
module resolution bug (`Cannot find module 'react-router/dom'`, already
present in `src/App.test.js` before this milestone) blocks RTL rendering
of the 4 page-level files that call `useNavigate`/`useParams`/`Link`.
Covered instead by thorough component-level tests of everything those
pages compose (see BLOCKERS.md, BLOCKER-004).

## Historical Candle Chart (implemented, 2026-10-09)

`GET /api/v2/backtests/:id/candles` — reuses `candleService.js`'s
`fetchHistoricalCandlesByRange` (explicit date range, ADR-011). Frontend:
`lightweight-charts` v5.2.1 + `src/pro/components/CandlestickChart.jsx` +
`src/pro/utils/candleMarkers.js` (pure, exact-match-or-skip marker
mapping, ADR-012). See `.claude/state/LIVE_FEED_AUDIT.md` for the
companion read-only live-feed audit this same milestone produced.

## Chunked historical candle fetching for longer backtests (implemented, 2026-10-10)

`services/candleService.js` now splits a historical-range request
exceeding Upstox's documented per-request window (1 month for
minutes<=15, 1 quarter for minutes>15/hours — verified against official
docs, see ADR-020) into provider-window-sized chunks
(`splitDateRangeIntoChunks`), fetches each chunk through the SAME
`fetchHistoricalCandlesByRange` → `enqueue()` path used everywhere else
(no new Upstox client, no new retry/backoff), runs chunks concurrently
(safe — each has a distinct cache key), then merges/dedupes by timestamp
(`mergeCandlesByTimestamp`) and returns them in chronological order.
`historicalRangeCandleCache` (renamed from `historicalMinuteCandleCache`)
now covers hours and arbitrary chunk sub-ranges too, same
`boundedCache`/`dedupe` primitives. Requests reaching before Upstox's
intraday retention floor (2022-01-01) are clamped forward
(`clampToIntradayRetention`), never fabricated.

Quality-aware siblings — `fetchHistoricalCandlesWithQuality`/
`getCandlesWithQuality` (`candleService.js`) and
`fetchCandleSeriesForBacktestWithQuality` (`utils/backtestEngine.js`) —
return `{..., incomplete, failedRanges, retentionClamped, retentionFrom}`
alongside the candles, set only from genuine caught fetch errors. These
are additive: the legacy `fetchHistoricalCandles`/
`fetchCandleSeriesForBacktest`/`fetchBacktestCandles` path (used by the
non-professional backtest system) is completely untouched in
signature/return shape. `services/professionalCandleAdapter.js` calls the
quality-aware fetcher and returns `incompleteTimeframes`/
`retentionClampedTimeframes` alongside its existing `cappedTimeframes`;
`services/professionalBacktestService.js` surfaces these as
`dataQuality.incompleteDataNote`/`dataQuality.retentionClampedNote` on
every persisted `BacktestResult`, following ADR-019's disclosure pattern.
`utils/backtestEngine.js`'s `INTERVAL_CONFIG` raised `5m`/`1h` `maxDays`
to 365 (from 28/90) with new per-interval `absoluteMaxBars` replacing the
old flat 2500-bar ceiling. See ADR-020 for full rationale, verified
provider limits, and the bug fix found along the way (the "hours" branch
previously ignored `periodDays` entirely).

## Workstream J — Live Strategy Engine (implemented, 2026-10-09)

```
services/liveCandleFeed.js       - completed-candle source (candleService.getCandles
                                    + rsiCandles.dropFormingCandle, ADR-013 — no new
                                    boundary math, no second Upstox client)
services/liveSignalEngine.js     - single-completed-bar state machine (ADR-014):
                                    reuses backtestExecutionEngine.js's
                                    applySlippage/computeQuantity/
                                    computeStopAndTargetPrices/checkStopAndTargetHit/
                                    computeTradeEconomics and
                                    strategyExpression.js's
                                    evaluateProfessionalExpression UNCHANGED;
                                    only the resumable step orchestration is new
services/liveStrategyOrchestrator.js
                                  - polls ACTIVE LiveStrategyRuntime docs, fetches
                                    candles per required timeframe, rebuilds
                                    StrategyContext via indicatorEngine.js's
                                    buildStrategyContextSeries (UNCHANGED, same
                                    function the backtest path uses) over a
                                    bounded rolling buffer (maxBars 1500), and
                                    processes every new completed bar through
                                    liveSignalEngine.js. DB-level claim-lock +
                                    atomic state-then-log commit ordering for
                                    concurrency/restart safety (ADR-015).
services/liveStrategyService.js  - activate/deactivate: ownership-scoped,
                                    freezes strategyVersionId at activation
                                    (ADR-001 extended to live), defensively
                                    re-validates the definition
                                    (validateStrategyDefinition), rejects a
                                    timeframe mismatch against the version's
                                    own universe.timeframe
models/LiveStrategyRuntime.js    - one doc per active (user, strategy,
                                    instrument, timeframe); unique partial
                                    index prevents duplicate concurrent
                                    activation; embeds engineState
                                    (equity/position/pending-signal fields)
                                    and the dedup watermark
                                    (lastProcessedCandleTimestamp)
models/LiveStrategySignal.js     - append-only signal/fill log, paginated,
                                    doubles as the live system's BacktestTrade
                                    equivalent for EXIT_FILLED rows
routes/liveStrategyRoutes.js     - POST /v2/live/activate, POST
                                    /v2/live/:id/deactivate, GET /v2/live,
                                    GET /v2/live/:id, GET /v2/live/:id/signals
                                    — all requireAuth + ownership-scoped
                                    queries; activate/deactivate rate-limited
                                    (liveStrategyLimiter)
```

No real order execution anywhere — "activate" only ever starts simulated
evaluation. No alert delivery (Workstream K, not started). No second
WebSocket connection or Upstox client — the polling loop
(`startLiveEnginePolling`, started in `app.js`'s `startServer()`) reuses
`liveCandleFeed.js`'s composition of the existing `candleService`/Upstox
queue path on a `LIVE_ENGINE_POLL_MS` (default 20s) interval.

Bar-close semantics: never evaluates an in-progress candle (verified via
`tests/rsiCandles.test.js`, which exercises `dropFormingCandle` directly
before anything was built on it — see ADR-013). A strict monotonic
`lastProcessedCandleTimestamp` watermark, combined with the DB-level
claim-lock (ADR-015), guarantees no completed candle is ever evaluated
twice for the same runtime, including under concurrent workers or a
process restart — proven in `tests/liveStrategyOrchestrator.test.js`
(genuine concurrency test via `Promise.all` against a shared fake model,
not simulated).

Parity with historical evaluation: proven, not assumed, in
`tests/liveSignalEngine.test.js` — the live engine reaches byte-identical
entry/exit dates/prices/quantities/fees/net-P&L to
`runProfessionalBacktest()` for the same fixture processed bar-by-bar,
with one explicit, tested, documented divergence (end-of-data forced
close doesn't apply live; the position is correctly left open instead —
see ADR-014).

See `.claude/state/LIVE_ENGINE_DESIGN.md` for the design document this
implementation follows, and `.claude/state/VALIDATION.md` for the full
test/verification record.

## Workstream K — Alerts (implemented, 2026-10-09)

```
models/AlertConfiguration.js     - one per (user, runtime): eventTypes subset,
                                    enabled flag, cursor (lastAlertedSignalId)
                                    into LiveStrategySignal, unique partial
                                    index {userId, runtimeId} where
                                    status:ACTIVE (one active config per
                                    runtime, mirrors LiveStrategyRuntime's
                                    own uniqueness pattern)
models/Notification.js           - one per (alertConfigurationId,
                                    sourceSignalId) — UNIQUE compound index,
                                    the entire duplicate-prevention
                                    guarantee. isFill distinguishes a
                                    signal from a simulated fill as an
                                    explicit queryable field, not inferred
                                    from `type` by every consumer.
services/alertContentBuilder.js  - pure signal-vs-fill notification text
                                    (never implies a real broker order —
                                    every *_FILLED message says
                                    "SIMULATED"/"no real order was placed"
                                    explicitly)
services/alertNotificationService.js
                                  - consumes LiveStrategySignal as a
                                    read-only durable outbox (ADR-016);
                                    zero changes to liveStrategyOrchestrator.js/
                                    liveSignalEngine.js. DB-level claim-lock
                                    (same pattern as ADR-015) +
                                    notifications-then-cursor commit
                                    ordering (the deliberate inverse of
                                    ADR-015, safe here because Notification's
                                    unique index makes retries idempotent)
services/alertConfigurationService.js
                                  - CRUD: ownership-scoped (runtime must
                                    belong to the same user), eventTypes
                                    validated against the registered set,
                                    archive (soft-delete) frees the unique
                                    slot for a fresh configuration later
routes/alertRoutes.js            - POST/GET/PUT/DELETE
                                    /v2/alert-configurations, GET
                                    /v2/notifications (paginated,
                                    read/unread filter), GET
                                    /v2/notifications/unread-count, PUT
                                    /v2/notifications/:id/read, POST
                                    /v2/notifications/mark-all-read — all
                                    requireAuth + ownership-scoped
```

Delivery channel: persistent in-app notifications only (`Notification`
documents, listed/paginated via the API above). No email/SMS/Telegram/
push-provider integration — no existing low-risk infrastructure for one
was found (`src/firebase.js` only configures Firebase Auth, no Firebase
Cloud Messaging), so none was added, per instruction. Browser
notifications are an optional, strictly opt-in presentation layer
(`src/pro/utils/browserNotificationPref.js` + `NotificationBell.jsx`) —
permission is only ever requested from an explicit button on
`NotificationsPage.jsx`, never automatically on page load.

Frontend: `src/pro/pages/NotificationsPage.jsx` (`/workspace/notifications`
— list, unread/read/all filter, pagination, mark-one-read, mark-all-read,
loading/error/empty states, signal-vs-fill badge) and
`src/pro/components/NotificationBell.jsx` (unread-count badge in
`TopNavbar.jsx`, polls the cheap unread-count endpoint every 30s). Both
files hit the pre-existing BLOCKER-004 Jest/react-router-dom issue for RTL
testing — the one piece of non-trivial client-only logic
(`readBrowserNotificationPref`'s three-way state derivation) was extracted
into `browserNotificationPref.js` (no react-router import) specifically so
it's unit-testable, same pattern as `candleMarkers.js`.

Reliability/dedup guarantee (see ADR-016 for the full reasoning): at most
one `Notification` document can ever exist per (alert configuration,
source signal) pair, regardless of retries, crashes, or concurrent
workers. The one acknowledged, non-recoverable gap: if
`LiveStrategySignal` itself was never persisted (the existing,
pre-acknowledged ADR-015/BLOCKER-005 crash window), there is nothing for
the alert system to read — it cannot notify about an event that was
never durably recorded in the first place. This is a stated limit, not a
silent one.

## Workstream L — Live Strategy Workspace UI (implemented, 2026-10-09)

The frontend workflow that was missing after J (backend-only) and K
(notifications only). Built entirely on the existing, unmodified
`/api/v2/live/*` and `/api/v2/alert-configurations`/`/api/v2/notifications`
APIs — zero backend evaluation/delivery changes, one small additive query
filter (ADR-018).

```
src/pro/pages/
  LiveStrategiesPage       - /workspace/live (dashboard: list + filter + pagination)
  LiveActivationPage       - /workspace/live/activate (strategy -> version ->
                              instrument -> capital/cost -> activate)
  LiveRuntimeDetailPage    - /workspace/live/:runtimeId (status, frozen version,
                              position, signal history, alert configuration)
src/pro/components/
  LiveStrategyList         - dashboard list; strategy name/version resolved
                              client-side (no batch lookup endpoint exists)
  LiveActivationForm       - reads the chosen VERSION's own universe.timeframe
                              from the server and locks the timeframe field to
                              it, matching liveStrategyService.js's own
                              rejection rule rather than inventing a UI-side
                              guess; explicitly discloses polling-based (not
                              tick-by-tick) evaluation and "no real broker
                              order is ever placed"
  LiveSignalList           - paginated ENTRY_SIGNAL/EXIT_SIGNAL/ENTRY_FILLED/
                              EXIT_FILLED history; never claims completeness
                              (preserves the documented ADR-015/BLOCKER-005
                              crash-window limitation in its own empty-state
                              copy)
  AlertConfigurationPanel  - per-runtime alert-config CRUD; respects the
                              one-active-configuration-per-runtime constraint,
                              surfaces 409 conflicts, archive requires
                              confirmation (toast.jsx's existing confirmAction)
  InstrumentSearchInput    - extracted from BacktestRunner.jsx (behavior
                              unchanged), now shared by both the backtest and
                              live-activation forms
src/pro/utils/
  liveSignalLabels.js      - pure signal-type -> label/tone lookup, shared by
                              LiveSignalList
```

**Testability design (ADR-017)**: the four components above take
navigation as callback props and never import `react-router-dom`
themselves — this is what makes them reachable by Jest despite
BLOCKER-004 (the pre-existing react-router-dom/Jest module-resolution
bug that excludes every page-level file in this tree from RTL coverage).
The three page files stay deliberately thin (routing/composition only,
same convention as every prior page) and are untested for the same
BLOCKER-004 reason as every other page file — not a new gap, the same
one, scoped down as far as possible.

Wired into `TopNavbar.jsx` as a new "Live" nav item and into
`NotificationsPage.jsx` (notifications now link to the runtime detail
page in addition to the strategy page). No UI redesign — reuses
`MainLayout`, `confirmAction`/`showError`/`showSuccess` (`toast.jsx`),
and the existing table/card/badge visual language throughout.

## Full-Platform Verification Pass (implemented, 2026-10-09)

`BacktestResult.dataQuality` (see ADR-010) gained one more additive
field: `tradingCostModelNote` — a per-run string naming the exact
commission/slippage rates used and explicitly listing every statutory
charge NOT modeled (STT, exchange transaction charges, GST, SEBI
turnover fees, stamp duty). See ADR-019/BLOCKER-007 for why this is a
disclosure fix rather than a cost-model rewrite. Surfaced in
`BacktestSummary.jsx`'s existing disclosure panel and in
`LiveActivationForm.jsx`'s pre-activation banner.

`services/marketDataService.js`'s `buildRow`/`buildQuickRow` are now
additionally exported (`module.exports`) purely for direct unit testing
— no behavior change, see `tests/marketDataVolumeNull.test.js`.

`tests/fullPlatformIntegration.test.js` is the one test that exercises
the entire pipeline in sequence end to end: `strategyVersionService` →
`professionalBacktestService` → `strategyVersionService` (edit) →
`liveStrategyService` → `liveStrategyOrchestrator` →
`alertConfigurationService` → `alertNotificationService` — all through
real service functions against in-memory fakes, proving the whole chain
composes correctly rather than relying on separately-tested pieces.
