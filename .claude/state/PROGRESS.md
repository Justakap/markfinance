# MARKFINANCE STRATEGY PLATFORM PROGRESS

## Current Milestone

A → F — **COMPLETE** (2026-10-08). F.5 (backtest integration) — **COMPLETE**
(2026-10-08). F.6 (strategy management API) — **COMPLETE** (2026-10-09).
G–I (professional strategy workstation UI) — **COMPLETE** (2026-10-09).
**Historical Candle Chart + Live-Feed Audit — Workstreams A/B/C/D
COMPLETE (2026-10-09).** **Workstream J (Live Strategy Engine) —
COMPLETE (2026-10-09).** **Workstream K (Alerts) — COMPLETE (2026-10-09).**
**"Workstream L — Live Strategy Workspace UI" — COMPLETE (2026-10-09).**
**Full-platform verification, stabilization & deployment pass — COMPLETE
(2026-10-09, same day).** **Grid Trading Simulator (PAPER TRADING ONLY,
standalone feature, not on the original A-L roadmap) — COMPLETE, final
integration audit done, one real defect fixed, verified live against
production data (2026-10-18). See the dated audit entry near the end of
this file for push/deploy status.**

**Naming note**: the user's own instruction for this UI milestone was
titled "Workstream L," reusing the letter the original MASTER.md roadmap
had reserved for "Options/F&O + advanced functionality + real order
execution." These are two different things — this entry is the UI
catch-up milestone for J/K (dashboard, activation, runtime detail,
alert-config management), NOT the roadmap's options/F&O item, which
remains entirely unstarted. To avoid ambiguity in this file going
forward, the roadmap's original options/F&O/real-order-execution item is
referred to below as **"the options/F&O milestone"** rather than "L."

## Current Phase

None in progress — Grid Trading Simulator (PAPER TRADING ONLY) shipped
this session, full regression/diff review/state-file updates/local
commits done. Awaiting direction on the options/F&O milestone or another
feature. See the dated entry near the end of this file for full detail.

## Milestone — Historical Candle Chart + Live-Feed Audit

**Status: A/B/C DONE, D (this pass) in progress.**

- **A (chart):** New `GET /api/v2/backtests/:id/candles` route, reusing
  `candleService.js`'s existing `fetchHistoricalCandlesByRange` (explicit
  date-range fetch, not "today"-relative — ADR-011). `lightweight-charts`
  v5.2.1 installed (confirmed Apache-2.0, confirmed zero sub-deps) and
  wired into a real `CandlestickChart.jsx`, replacing the BLOCKER-002
  placeholder. Entry/exit markers built by a new pure, separately-tested
  function (`candleMarkers.js`'s `buildTradeMarkers`, ADR-012) that only
  places a marker on an exact candle-timestamp match — any trade that
  can't be exactly placed is skipped and counted, surfaced to the user,
  never approximated. 6 new backend tests + 7 new frontend tests, all
  passing. Full backend suite (21 files) and frontend build both clean.
- **B (live-feed audit, read-only):** Fresh re-read of
  `marketDataService.js` this session. Documented per-field live data
  sourcing (WS vs. REST vs. candle-derived), confirmed WS reconnect has
  no backoff cap and no token-refresh mechanism exists, and explicitly
  separated what's verifiable from source alone vs. what requires
  production access this environment doesn't have. Did not touch the
  WebSocket service itself, per instruction. See `LIVE_FEED_AUDIT.md`.
- **C (live-engine design, docs only):** `LIVE_ENGINE_DESIGN.md` proposes
  reusing `indicatorEngine.js`/`strategyExpression.js`/
  `backtestExecutionEngine.js`'s existing evaluation functions unchanged
  for a future live engine, with only a snapshot-normalization layer and
  live-specific stateful bookkeeping as new code. No implementation.

## Milestone — Workstream J: Live Strategy Engine

**Status: DONE.** Backend commit: see Last Verified Commit below.

Implements exactly the design `LIVE_ENGINE_DESIGN.md` proposed, following
up directly on the prior milestone's own recommendation. New: candle
completion adapter (`liveCandleFeed.js`, ADR-013 — reuses
`dropFormingCandle`, no new boundary math, no second Upstox client),
single-bar resumable state machine (`liveSignalEngine.js`, ADR-014 —
proven byte-identical-trade parity with `runProfessionalBacktest` via a
dedicated test suite, one explicit documented divergence for
end-of-data), DB-level claim-lock + atomic-commit orchestrator
(`liveStrategyOrchestrator.js`, ADR-015 — proven safe under genuine
concurrent-call and simulated-restart tests, not just in-memory
Set/Map-based), activation/deactivation service with ownership scoping +
frozen strategy version + defensive re-validation
(`liveStrategyService.js`), and authenticated REST API
(`routes/liveStrategyRoutes.js`, `/api/v2/live/*`). Two new persistence
models (`LiveStrategyRuntime`, `LiveStrategySignal`) with a unique
partial index preventing duplicate concurrent activation.

A small, behavior-preserving extraction in
`backtestExecutionEngine.js` (three pure helper functions pulled out of
`runProfessionalBacktest`'s loop body, zero logic change — verified by
the full pre-existing backtest test suite passing unchanged) is what
makes the live engine's math identical to the backtest's, rather than a
re-derivation.

No real order execution, no alert delivery, no options/F&O — exactly as
scoped. The legacy Strategy/Backtest system and the WebSocket feed are
both completely untouched.

36 new backend tests across 5 new files (`rsiCandles.test.js`,
`liveCandleFeed.test.js`, `liveSignalEngine.test.js`,
`liveStrategyOrchestrator.test.js`, `liveStrategyRoutes.test.js`). Full
suite: see Tests below. Frontend unmodified this workstream (no UI was
requested); build re-confirmed clean anyway per the checkpoint protocol.

## Phase F.5 — Backtest Integration / Data Adapter

**Status: DONE (local, not pushed).** Backend commit: `7489855`.

Connects the completed A→F pipeline to the real Upstox historical candle
layer via a new, dedicated route — `POST /api/v2/backtest/run` (plus
`GET /api/v2/backtests`, `GET /api/v2/backtests/:id`,
`GET /api/v2/backtests/:id/trades`) — completely separate from the legacy
`/api/backtest/run`. New files only:
`services/professionalCandleAdapter.js` (timeframe resolution ->
`fetchCandleSeriesForBacktest`, zero new Upstox calls),
`services/professionalBacktestService.js` (the only orchestrator: B→C→D/E→F,
then persists BacktestResult/BacktestTrade), `routes/professionalBacktestRoutes.js`.
`app.js` wiring is purely additive (new requires + one new `app.use`).

13 new tests across two files (`professionalBacktestService.test.js`,
`professionalBacktestRoute.test.js`) — real candle-service interface
exercised with the Upstox network mocked at the axios boundary (not the
candleService interface itself), schema-validated persistence via the
real Phase A Mongoose models (no live DB needed), ownership/version-
scoping rejection, invalid-instrument/date-range/insufficient-data
rejection, safe upstream-error mapping (never leaks raw error text, never
surfaces a 401/403 that would wrongly trigger the frontend's session-
clearing interceptor), and `requireAuth` wiring confirmation.

ADR-008 recorded: the professional DSL structurally excludes PE (never
registered in `indicatorRegistry.js`), so Phase 2.1A's `strategyUsesPe()`
guard was deliberately NOT ported — there's nothing to guard against.

Full suite: 200/200 passing. Frontend build confirmed clean (untouched).

## Phase F.6 — Strategy Management API

**Status: DONE (local, not pushed).** Backend commit: `f5ae2be`.

Closes the gap F.5 left open: `routes/professionalStrategyRoutes.js`
adds authenticated CRUD for `StrategyDefinition`/`StrategyVersion` under
`/api/v2/strategies` (create+initial version, list paginated, get-one
with current version, metadata-only-or-new-version update, list versions
paginated, get one specific version). All version creation still routes
through `strategyVersionService.js` exclusively.

Fixed along the way (ADR-009): `createNewVersion()` had a real,
verified concurrent-write race on `versionNumber` (read-latest-then-
create, no protection against two simultaneous callers). Now retries on
the existing unique index's duplicate-key error — no version is ever
silently dropped under concurrency.

13 new route-level tests (ownership enforced in the query — cross-user
read/update both rejected with 404; metadata-only vs. definition-creates-
version distinguished; an older version remains byte-identical after a
newer one is created; pagination bounds; a simulated concurrent double-
PUT lands on two distinct version numbers; a BacktestResult's
`strategyVersionId` reference is confirmed unaffected by later versions)
plus 1 new test in `strategyVersioning.test.js` proving the concurrency
fix itself under a simulated real duplicate-key conflict.

Full suite: 214/214 passing. Legacy `/api/strategies`,
`models/Strategy.js`, `routes/backtestRoutes.js` confirmed untouched
(zero diff). Frontend build confirmed clean (untouched).

## Milestone G-I — Professional Strategy Workstation

**Status: DONE (local, not pushed).** Backend commit:
`fa9963c`. Frontend commit: `36d9579`.

New isolated frontend tree `src/pro/` (list/create/edit strategies,
recursive nested-AND/OR DSL builder faithful to the backend's registered
indicators/operators, version history, run-backtest, full results view
with equity/drawdown/benchmark/trade-explorer/data-quality disclosures,
backtest history). Routed under `/workspace`, linked from TopNavbar.
Legacy `/strategies`/`/backtest`/`/backtests` pages completely untouched.

Two small, justified backend additions discovered via contract
verification (ADR-010): `BacktestResult.dataQuality` is now persisted
(was previously computed fresh per-run and never saved, so reopening a
saved result would have silently lost the corporate-action/SL-TP-
ambiguity disclosures), and `strategyVersionId` is now `.populate()`-d on
the list/detail backtest routes so the UI can show "v3" instead of a raw
ObjectId. Both are additive, non-breaking, covered by tests, and the full
214/214 backend suite still passes.

Chart-library decision: no new dependency installed. Recharts (existing)
covers equity/drawdown/benchmark. A candlestick/OHLC chart was evaluated
(lightweight-charts, MIT, ~45kb) but deliberately deferred — no v2
endpoint returns raw candle series for a backtest yet, so there's nothing
real to render; built as an isolated, honestly-labeled placeholder
component instead (BLOCKERS.md).

31 new frontend tests (6 suites, all passing) covering DSL round-trip,
nested AND/OR editing, unsupported-indicator exclusion, metadata-only vs.
new-version save semantics (caught and fixed a real bug in the process —
see ADR in ARCHITECTURE.md), results rendering from the real response
shape, and trade pagination/loading/empty/error states. 4 page-level
files are untested at the RTL level due to a confirmed pre-existing,
unrelated Jest/react-router-dom bug (BLOCKER-004) — covered instead by
thorough tests of every component they compose. Full live browser
click-through was not possible in this environment (no live MongoDB/
Upstox credentials available here, same constraint documented since
Phase 2.0).

## Completed

- Phase 2.0 (read-only audit), 2.1A (`b2c6710`), 2.1B (`3254dd3`), 2.1C
  (`34b4ff5` backend / `94d83de` frontend), 2.2 (`66d5ac3` backend /
  `27e4ce8` frontend) — predate this milestone. 2.1A/B/C were pushed in
  an earlier session; 2.2 is local-only. Confirm with
  `git log origin/main..HEAD` each session rather than trusting this text.
- **Phase A — Data model + strategy versioning.** `c28af12`.
  `StrategyDefinition`/`StrategyVersion`(immutable)/`BacktestResult`/
  `BacktestTrade` models, `strategyVersionService.js`,
  `scripts/exportLegacyStrategies.js` (not run against any real DB).
  Legacy `Strategy`/`Backtest` untouched (ADR-006). 18 tests.
- **Phase B — Professional Strategy DSL.** `b9e1cc6`. Evolves
  `strategyExpression.js` (ADR-007): structured operand leaves
  (indicator/price/constant), professional operator set, new
  `indicatorRegistry.js`, full `validateStrategyDefinition`. 22 tests.
- **Phase C — Series-first Indicator Engine + StrategyContext.**
  `e58cad1`. `calculateSMASeries`/`calculateMACDSeries`/
  `calculateVWAPSeries` added (BLOCKER-001 resolved for 6/10 planned
  indicators). New `indicatorEngine.js`: multi-timeframe context builder,
  causal cross-timeframe alignment, 2 structural no-look-ahead tests.
  10 tests.
- **Phase D — Event-driven Backtest Execution Engine.** `3683c0b`. New
  `backtestExecutionEngine.js`, separate from the legacy engine. Signal-
  close/execute-next-open (ADR-002), intrabar SL/TP at threshold price,
  conservative-pessimistic ambiguity policy (ADR-004, dedicated test).
  Includes a regression-parity test against the legacy engine on an
  equivalent RSI strategy — identical trade count and entry/exit dates.
  9 tests.
- **Phase E — Risk / Position Sizing / Cost Model.** `39eed80`. All four
  sizing modes (percentOfEquity/fixedQuantity/fixedCash/riskPercent).
  riskPercent requires `risk.stopLoss` (validator-enforced). Optional
  `execution.costs` metadata, deliberately not read by the engine
  internally (engine stays decoupled from cost-config source). 11 tests.
- **Phase F — Professional Analytics.** `b270086`. New
  `backtestAnalyticsService.js`: Return/Risk/Trade/Exposure/Benchmark
  metrics, documented Sharpe/Sortino methodology (0% risk-free rate,
  `BARS_PER_YEAR` per timeframe, both surfaced in the summary itself).
  Plus an end-to-end A→F integration test: a full strategy definition
  runs through validation → context → execution → analytics, and the
  result is schema-validated (in-memory, no DB) against every Phase A
  model. 8 tests.

**Milestone total: 187/187 backend tests passing. Frontend build
confirmed clean (untouched this milestone). Nothing wired into HTTP
routes yet — no new/changed endpoints exist for any of this.**

## Milestone — Workstream K: Alerts

**Status: DONE.** Backend+frontend commits: see Last Verified Commit below.

Delivers notifications from Workstream J's existing
`ENTRY_SIGNAL`/`EXIT_SIGNAL`/`ENTRY_FILLED`/`EXIT_FILLED` events without
touching strategy evaluation at all. New:
`AlertConfiguration`/`Notification` models (unique indexes are the entire
duplicate-prevention mechanism — see ADR-016), `alertContentBuilder.js`
(pure, explicit signal-vs-simulated-fill wording, never implies a real
broker order), `alertNotificationService.js` (reads
`LiveStrategySignal` as a read-only durable outbox; DB-level claim-lock +
notifications-then-cursor commit ordering, proven safe under genuine
concurrent-call and failure/retry tests), `alertConfigurationService.js`
(ownership-scoped CRUD, archive instead of hard-delete), and
`routes/alertRoutes.js` (`/api/v2/alert-configurations/*`,
`/api/v2/notifications/*`).

Frontend: `NotificationsPage.jsx` (`/workspace/notifications` — list,
read/unread/all filter, pagination, mark-read/mark-all-read, loading/
error/empty states, explicit signal-vs-fill badge) and
`NotificationBell.jsx` (unread-count badge in `TopNavbar.jsx`). Browser
notifications are strictly opt-in (`browserNotificationPref.js` —
permission requested only from an explicit button, never on page load).
No email/SMS/Telegram delivery — no existing low-risk provider
infrastructure was found (Firebase is Auth-only in this project), so none
was invented, per instruction.

34 new backend tests across 4 new files, plus 5 new frontend tests (1
suite). No changes to `liveStrategyOrchestrator.js`, `liveSignalEngine.js`,
the legacy Strategy/Backtest system, or the WebSocket feed. No real order
execution, no options/F&O — explicitly out of scope.

## Milestone — "Workstream L": Live Strategy Workspace UI

**Status: DONE.** Backend `d41ccfe`, frontend `0284daf`.

Builds the frontend workflow J and K were missing — activating/
deactivating a live strategy, inspecting its runtime status and signal
history, and managing its alert configuration — entirely on top of the
existing, unmodified `/api/v2/live/*` and `/api/v2/alert-configurations`/
`/api/v2/notifications` APIs. One small, additive backend change
(ADR-018: an optional `?runtimeId=` filter on the alert-configurations
list endpoint, mirroring the existing `?status=` filter's shape) — no
change to strategy evaluation, the backtest evaluator, or notification
delivery semantics.

New pages: `LiveStrategiesPage` (`/workspace/live`, dashboard with
status filter + pagination), `LiveActivationPage`
(`/workspace/live/activate`, strategy → version → instrument →
capital/cost), `LiveRuntimeDetailPage` (`/workspace/live/:runtimeId`,
status + frozen version + position + signal history + alert config).
New reusable components: `LiveStrategyList`, `LiveActivationForm`,
`LiveSignalList`, `AlertConfigurationPanel`, plus `InstrumentSearchInput`
extracted from `BacktestRunner.jsx` (behavior unchanged, now shared).

Design choice (ADR-017): the four interactive components take
navigation as callback props rather than importing `react-router-dom`
themselves — this is what makes them reachable by Jest despite
BLOCKER-004 (every page-level file in this tree is otherwise excluded
from RTL coverage). The three page files stay thin and untested for the
same pre-existing reason every other page file is.

Activation explicitly discloses polling-based (not tick-by-tick)
evaluation and that no real broker order is ever placed. The signal
history explicitly preserves the ADR-015/BLOCKER-005 crash-window
limitation in its own empty-state copy rather than implying completeness.
Alert configuration respects the one-active-per-runtime constraint and
surfaces 409 conflicts without inventing a workaround. Browser-
notification opt-in behavior (Workstream K) is unchanged.

34 new frontend tests across 5 new files (liveSignalLabels, LiveSignalList,
AlertConfigurationPanel, LiveActivationForm, LiveStrategyList), plus 1 new
backend test for the `runtimeId` filter. Full frontend suite: 77/77 real
tests passing (14 suites; `src/App.test.js`'s pre-existing, unrelated
failure, BLOCKER-004, confirmed still isolated — not hidden, not
"fixed," not a regression). Full backend suite: 292/292 passing (35
files). Production build compiles clean.

## Milestone — Full-Platform Verification, Stabilization & Deployment

**Status: DONE.** Backend `06ef911`, frontend `096ff4e` (both stacked on
every prior commit this engagement). See `VALIDATION.md` for the full,
area-by-area verification matrix (PASS/FAIL/PARTIAL/NOT VERIFIED) — this
entry is a summary.

Six parallel read-only audit agents covered: (A) strategy builder/DSL/
versioning, (B) backtest engine + financial calculations, (C) trading-
cost model (with cited external rate research), (D) market data/
indicators, (F/G) live strategy engine + alerts (including a dedicated
BLOCKER-005 investigation), (H/I) frontend/charts/security. Findings:

- **A, B, F/G: PASS, zero defects.** Notably: the backtest engine's
  financial math was hand-verified to the penny against 3 independently
  computed scenarios (percentOfEquity sizing + commission + slippage,
  exact stop-loss threshold fill, same-bar stop-vs-target ambiguity
  policy) — not just "tests pass," genuinely recomputed by hand and
  compared. The live engine's concurrency claim-lock was confirmed via a
  real race (two `Promise.all`'d calls against a fake model with no
  `await` between its read-check and write), not a simulated one.
- **D: PASS/PARTIAL.** Found and fixed: `marketDataService.js` coerced a
  genuinely-missing `volume` to `0` in three places — the same
  "null-coerced-to-zero" bug class the frontend already fixed elsewhere,
  just never applied here. Also corrected an inaccurate documentation
  claim (`oiChange`'s current-period term can be WS-tick-sourced, not
  "always candle-derived" as previously stated in `LIVE_FEED_AUDIT.md`).
- **C: the significant finding.** The two-knob (`commissionPct`+
  `slippagePct`) cost model has no STT, exchange transaction charges,
  GST, SEBI turnover fees, or stamp duty at all — confirmed against a
  cited public rate schedule to understate real Indian intraday trading
  costs by ~27% on a representative trade, with no disclosure anywhere
  that "net P&L" excludes them. Per the milestone's own instruction
  ("implement a minimal correction only when the architecture supports
  it, otherwise document clearly"), and because this architecture has no
  delivery-vs-intraday concept to build the real asymmetric rules on,
  this was fixed as a disclosure (ADR-019/BLOCKER-007), not a cost-model
  rewrite: a new `dataQuality.tradingCostModelNote` field, surfaced in
  both `BacktestSummary.jsx` and `LiveActivationForm.jsx`.
- **H/I: PASS**, one low-severity/unconfirmed edge case noted (candle
  marker overcounting for a hypothetically-still-open trade — confirmed
  moot: `BacktestTrade.exitDate` is schema-`required: true`, so no
  backtest trade can ever lack one).

Also added, per the milestone's explicit Phase 2 request: one true
end-to-end integration test
(`backend/tests/fullPlatformIntegration.test.js`) chaining strategy
creation → backtest → persisted result → strategy edit (proving the
original result's frozen version is unchanged) → live activation of that
exact version → live signal generation → alert-configuration processing →
de-duplicated notification — closing a coverage gap the backtest-engine
audit flagged (this chain was previously only provable by composing
several separately-tested facts).

10 new backend tests (4 volume-null regression + 6 integration-chain
steps) plus 2 new assertions in an existing test; 4 new/updated frontend
tests. Full backend suite: 302/302 passing (37 files). Full frontend
suite: 79/79 real tests passing (14 suites; `src/App.test.js`'s
pre-existing BLOCKER-004 failure re-confirmed isolated, not hidden, not
"fixed"). Production build compiles clean.

Deployment: see `VALIDATION.md`'s deployment section for exact pushed
commits, hosted URLs, and smoke-test results.

## In Progress

Nothing — milestone complete, awaiting the next instruction.

## Pending

The options/F&O milestone (the roadmap's original "L" — options/F&O +
advanced functionality + real order execution).

(G through "Workstream L"/UI are now all complete — see above and the
Completed list below.)

## Active Workers

None — every phase through this UI milestone was implemented directly by
the Master Agent. Its pieces (dashboard, activation form, runtime
detail, alert-config panel) have tight sequential dependencies on
Workstream J/K's already-shipped APIs and on each other (the activation
form's version-timeframe lookup feeds the dashboard's display logic, the
runtime detail page composes the signal list and alert panel) and were
not safely splittable into independent worker tasks per MASTER.md's own
parallelization guidance.

## Last Verified Commit

Backend `06ef911` (verification-pass fixes), stacked on `d41ccfe`
("Workstream L" UI support), `ac633af` (Workstream K), `2265b79`
(Workstream J), and `021339c` (Historical Candle Chart's candle
endpoint). Frontend `096ff4e` (verification-pass UI disclosure), stacked
on `0284daf` ("Workstream L" UI), `67b1c34` (Workstream K notifications
UI), and `2ecadf9` (Historical Candle Chart's chart UI). See
`VALIDATION.md`'s deployment section for which of these were pushed/
deployed.

## Tests

Backend: 302/302 passing (`npm test`, full suite, 37 files) — includes
10 new tests this session (4 volume-null regression +
6 full-platform-integration steps) plus 2 new assertions in an existing
test, on top of "Workstream L"'s 292/35. Frontend: 79/79 real tests
passing (14 suites; the pre-existing, unrelated `src/App.test.js`
failure, BLOCKER-004, confirmed still isolated and unaffected) — includes
4 new/updated tests this session, on top of "Workstream L"'s 77/14.

## Frontend Build

Confirmed clean (`CI=true npx react-scripts build`) — compiles with no
new warnings.

## Known Limitations

- Indicator registry covers RSI/EMA/SMA/MACD/MACD_SIGNAL/VWAP only.
  Bollinger/ATR/ADX/Supertrend remain unregistered (BLOCKER-001,
  partially resolved).
- WebSocket production status unconfirmed (BLOCKER-003) — explicitly does
  NOT block the live engine or alerts, both of which deliberately read
  only REST-backed candle data / the persisted signal log (see
  BLOCKER-003's 2026-10-09 update and `LIVE_FEED_AUDIT.md`).
- Live engine signal-log can gap (not duplicate, not lose position state)
  on a crash between its two commit writes (BLOCKER-005, accepted
  tradeoff — see ADR-015/ADR-016). The frontend's signal-history view
  states this limitation directly in its own empty-state copy rather
  than implying completeness.
- Live engine polls on a fixed interval (`LIVE_ENGINE_POLL_MS`, default
  20s); the alert processor likewise polls (`ALERT_ENGINE_POLL_MS`,
  default 10s) rather than reacting to a push event — both deliberate
  choices reusing existing infrastructure over a new push path, with a
  bounded latency cost. The activation form explicitly discloses this
  (never describes evaluation as tick-by-tick).
- No delivery channel beyond persistent in-app notifications + optional
  opt-in browser notifications — no email/SMS/Telegram/push-provider
  integration exists in this project to build on.
- **BLOCKER-006 resolved**: a frontend UI to activate a live strategy and
  manage alert configurations now exists (`/workspace/live`,
  `/workspace/live/activate`, `/workspace/live/:runtimeId`).
- **BLOCKER-007 (new this session, disclosed not eliminated)**: the
  trading-cost model is a two-symmetric-percentage approximation with no
  STT/exchange charges/GST/SEBI fees/stamp duty — now explicitly
  disclosed in both the backtest summary and the live-activation form
  (see ADR-019), but not implemented as a full itemized stack.
- Strategy name/version on the live-strategy dashboard are resolved via
  bounded client-side lookups (no batch endpoint exists for either) — a
  user with more than 100 strategies would see a raw strategy id for the
  excess ones; documented, non-corrupting fallback, not a crash.
- Shorting, trailing stops, and portfolio/multi-symbol backtesting (and,
  by extension, live evaluation) are architecturally anticipated but not
  implemented (explicitly deferred per the roadmap).
- Legacy strategies have not been exported yet — `exportLegacyStrategies.js`
  exists and is tested (`buildExportPayload`) but has not been run
  against any real database.
- Real order execution and options/F&O remain explicitly out of scope —
  not started by any milestone to date.
- Market-data/indicator accuracy against a live, authoritative external
  provider remains NOT VERIFIABLE in this environment (no live Upstox
  credentials) — stated honestly in every audit this engagement, not
  claimed either way.
- **Grid Trading Simulator (2026-10-18, see the dated entry near the end
  of this file)**: full logged-in browser click-through was not performed
  (no Firebase/Google OAuth test credentials in this environment) —
  verified instead via full test suites, a clean production build, and a
  server-level smoke check. Its poll loop reads prices on a fixed 5s
  interval (`GRID_SIMULATOR_POLL_MS`) plus an optional frontend-pushed
  tick for lower latency — not true continuous tick-by-tick execution,
  disclosed as such in the UI. Its commission/slippage model has the same
  disclosed two-knob limitation as ADR-019 (no STT/exchange/GST/SEBI/
  stamp duty).

## Blockers

See `BLOCKERS.md`. BLOCKER-006 is resolved. BLOCKER-007 is new (disclosed,
not blocking). BLOCKER-003 and BLOCKER-005 remain tracked, accepted,
non-blocking limitations. None block deployment for manual testing.

## Next Action

The full verification/stabilization pass is done: every implemented
feature area was audited (6 parallel agents), 2 concrete defects were
fixed with regression tests, 1 significant disclosure gap was closed,
and one true end-to-end integration test now chains the entire platform.
See `VALIDATION.md` for deployment status and hosted smoke-test results.
The only remaining item on the original roadmap is the options/F&O
milestone (including real order execution), which every prior
milestone's instructions explicitly said not to start yet — it would
need its own dedicated milestone and explicit user authorization.

### 2026-10-10 — Candle retrieval optimization for longer backtests

Verified Upstox's official v3 historical-candle limits before coding (see
ADR-020): the existing `INTERVAL_CONFIG` `maxDays` for 5m (28)/1h (90)
were a provider single-REQUEST window mistakenly used as a total history
cap, with no chunking. Implemented chunked fetching in
`services/candleService.js` (`splitDateRangeIntoChunks`,
`fetchHistoricalCandlesChunked`, `fetchHistoricalRangeMaybeChunked`) that
reuses the existing Upstox request queue/retry/cache/dedupe infrastructure
per chunk rather than duplicating it, merges/dedupes by timestamp, and
preserves chronological order. Fixed a real bug found along the way: the
"hours" branch ignored `periodDays` entirely (hardcoded a 90-day window).
Raised `5m`/`1h` `maxDays` to 365 and added a per-interval
`absoluteMaxBars` to stop the old flat 2500-bar ceiling from silently
truncating the new longer ranges. Added quality-aware sibling functions
(`fetchHistoricalCandlesWithQuality`/`getCandlesWithQuality`/
`fetchCandleSeriesForBacktestWithQuality`) that surface
`incomplete`/`failedRanges`/`retentionClamped`/`retentionFrom` — set only
from genuine caught fetch errors, never inferred from an empty result —
threaded through `professionalCandleAdapter.js` into
`professionalBacktestService.js`'s persisted `dataQuality` as
`incompleteDataNote`/`retentionClampedNote`, following ADR-019's existing
disclosure pattern. The legacy `fetchCandleSeriesForBacktest`/
`fetchBacktestCandles` contract is completely untouched (same signature,
same plain-array return) — only its shared `INTERVAL_CONFIG` caps were
raised, a pure capability increase.

Added `tests/chunkedCandleFetch.test.js` (11 new tests: chunk-splitting
math/boundaries, multi-chunk merge/dedup/chronological-order, cache reuse
across repeat long-range fetches, concurrent-caller chunk-level dedup, a
persistently-failing chunk's disclosure without blanking the rest of the
result, and a regression proving the legacy and quality-aware fetchers
produce identical series for an unchanged short-range request). Updated
`tests/historicalCandleCache.test.js`'s test 7 to reflect that hours is
now intentionally cached (previously asserted the opposite). Full backend
suite: 313/313 passing. No frontend changes (backend-only task). Commits
are local-only per explicit instruction — not pushed/deployed. See
ADR-020 for full detail including the exact chunk-window sizing rationale
(31/91 days, not a flush 30/90) and the remaining intraday-retention-floor
limitation (2022-01-01, disclosed not silently truncated).

### 2026-10-18 — Grid Trading Simulator (PAPER TRADING ONLY)

**Status: DONE (local-only, not pushed/deployed).** Standalone feature,
not part of the original A-L roadmap (does not touch StrategyDefinition/
BacktestResult/LiveStrategyRuntime or any existing evaluator). Implemented
directly by the Master Agent (no workers spawned — the pieces have tight
sequential dependencies: models before service, service before feed/
routes, backend contracts before frontend).

**Core engine** (`backend/services/gridSimulatorEngine.js`, pure, no DB/
network): a fixed grid anchored to `config.referencePrice`, levels every
`config.gridInterval` (negative index = BUY level below reference,
positive = SELL level above). A level triggers only on a crossing in its
own direction while "armed"; the opposite-direction crossing re-arms it
without trading — this is what lets a level participate in later
oscillations without a duplicate fill from the same one-way move.
Multi-level single-event crossings (overnight gaps) fill every crossed
level at the SAME actual event price, never at a skipped level's own
grid price; `levelPrice` (triggering level) and `fillPrice` (actual
simulated fill) are always recorded separately. An unfilled/partial
buy or sell (insufficient virtual cash/holdings) fills what's affordable/
available (if ≥1 share) or fully skips, and the level disarms either way
— it does not retry the remainder on every subsequent tick, only after a
genuine re-arming crossing (deterministic, tested, no surprise duplicate
purchases). Cost basis is weighted-average on buys; realized P&L on
sells against that average; average cost resets to 0 only when holdings
return to exactly 0. Optional `commissionPct`/`slippagePct` (same naming/
two-knob-percentage convention as the existing backtest/live engines —
ADR-019) default to 0; this model has the identical disclosed limitation
(no STT/exchange/GST/SEBI/stamp-duty). Found and fixed two real bugs via
the test suite before shipping: (1) a floating-point rounding trap where
`97*1.005` evaluates to `97.48499999999999` in IEEE754 and would
round down instead of to the mathematically correct value — fixed with a
tiny epsilon in the engine's cents-rounding helper; (2) a level that was
disarmed exactly at a price boundary could never re-arm on the very next
tick because the original crossing-detection was exclusive at that
boundary — fixed by making level-crossing detection inclusive at both
ends (the armed-state check, not the crossing-detection boundary, is what
prevents any resulting duplicate trade).

**Price sourcing** (ADR-021): does NOT call `marketDataService.subscribe()`
— read in full before use and found to perform a destructive set-REPLACE
of the shared subscription set, which would have silently killed whatever
watchlist a user currently has open (and vice versa). Instead: a 5s
backend poll loop (`services/gridSimulatorFeed.js`) calls the newly
(additively) exported `warmLiveQuotes()` directly and reads the shared
`liveData` map judged by its own `timestamp` for freshness (never implies
"live" from a stale or missing read — `lastFeedStatus`:
`LIVE`/`STALE`/`NO_DATA`), plus an optional lower-latency frontend-pushed
tick (`POST .../sessions/:id/tick`) riding the browser's own already-open
`marketTick` Socket.IO subscription. Both paths funnel into the same
idempotent `gridSimulatorService.processTick()`.

**Persistence/concurrency**: `GridSimulatorSession`/`GridSimulatorTrade`
models, same claim-lock + atomic-commit-then-log idiom as
`liveStrategyOrchestrator.js` (ADR-015) — a short-TTL `processingLockedUntil`
claimed via a single conditional `findOneAndUpdate`, state committed in one
atomic update, THEN ledger rows inserted (a crash between the two can only
gap the ledger, never duplicate/corrupt the simulated position). A
monotonic `state.lastEventTimestamp` watermark rejects duplicate/
out-of-order price events. A partial unique index
(`{userId, instrumentKey}`, filtered to non-terminal status) blocks a
second concurrent session for the same instrument, mirroring
`LiveStrategyRuntime`'s own duplicate-activation guard.

**API** (`routes/gridSimulatorRoutes.js`, `/api/v2/grid-simulator/*`):
create/start/pause/resume/stop a session, get detail (includes computed
portfolio metrics + feed health), list sessions (paginated, ownership-
scoped), list trades (paginated, `?skippedOnly=true` filter), and the
frontend-tick endpoint. Every route scopes by `req.user.mongoId`, same
security convention as every other route in this codebase.

**Frontend** (`src/pro/pages/GridSimulatorListPage|CreatePage|DetailPage.jsx`
+ `src/pro/components/GridSimulatorList|CreateForm|Detail.jsx`,
`GridLevelsChart.jsx`): routed under `/workspace/grid`,
`/workspace/grid/new`, `/workspace/grid/:sessionId`, linked from
TopNavbar ("Grid Sim"). Interactive components are router-free (callback
props only) per ADR-017's existing testability convention. Explicit
"PAPER TRADING ONLY" / "never places a real broker order" disclosure on
every page, plus the same commission/slippage-model-is-incomplete
disclosure LiveActivationForm already uses. The levels chart
(`GridLevelsChart.jsx`, Recharts, same library as EquityCurveChart/
DrawdownChart) deliberately plots only real data — grid lines derived
from config, fill markers from the persisted trade ledger — and does NOT
draw a fabricated continuous price line, since no continuous tick history
is persisted for a session (same "never invent a data point" discipline
as `candleMarkers.js`, ADR-012).

**Tests**: 51 new backend tests across 4 files — `gridSimulatorEngine.test.js`
(28: crossings, re-arming/oscillations, overnight gap fills at the actual
price, insufficient-cash partial/full-skip + no-retry-without-rearm,
insufficient-holdings partial/full-skip, maxPositionSize cap, duplicate/
out-of-order/invalid-price rejection, hand-verified commission/slippage
accounting, portfolio metrics), `gridSimulatorService.test.js` (9:
validation, duplicate-session 409, ownership 404, full lifecycle,
invalid-transition 409, claim-lock concurrency via two genuinely
concurrent calls against the same in-memory fake, idempotent restart
recovery), `gridSimulatorFeed.test.js` (4: fresh/stale/missing price
handling, per-session failure isolation), `gridSimulatorRoutes.test.js`
(10: creation, validation, ownership isolation, duplicate 409, full
lifecycle via real route handlers, tick ownership/validation) — the
route tests exercise the REAL service functions, not re-faked logic, same
convention as `professionalStrategyRoutes.test.js`. Full backend suite:
all pre-existing tests plus these 51 passing (`npm test`, exit 0). 23 new
frontend tests (4 files: list/create-form/chart/detail), covering
loading/empty/error states, lifecycle button visibility per status, the
Stop confirmation flow, and the PAPER TRADING disclosures. Full frontend
suite: all pre-existing tests (102 real tests) plus these 23 passing;
`src/App.test.js`'s pre-existing BLOCKER-004 failure confirmed still
isolated, not caused by this work. `CI=true npx react-scripts build`
compiles clean with no new warnings. Backend boots clean locally against
the real local MongoDB/Upstox connection with the new poll loop active
("Grid trading simulator polling enabled (paper trading only)"), and a
live `curl` against the real running server confirmed `requireAuth` is
correctly enforced (401 without a token).

**Known limitation, stated honestly**: full logged-in browser click-
through (create a session, watch it fill against real live prices) was
NOT performed — this environment has no Firebase/Google OAuth test
credentials, and automating a real Google sign-in was out of scope for
an agent to attempt. Verification stopped at: full test suites, clean
production build, and server-level smoke confirmation (auth correctly
enforced, polling loop boots). This is a real gap versus a full manual
QA pass, not glossed over.

Commits are local-only, not pushed/deployed, per the task's explicit
instruction. No real broker order was placed by any test (the test suite
uses only in-memory fakes/mocked models — the one live-server `curl` call
was unauthenticated and rejected with 401 before touching any grid logic).

### 2026-10-18 (later) — Grid Trading Simulator final integration audit, one real defect fixed, pushed

**Status: DONE.** Independent adversarial review (a forked sub-agent, not
the same pass that wrote the code) read all engine/service/feed/route/
frontend files looking specifically for duplicate-trade and concurrency
defects. Found one real, confirmed bug and three low-severity items; all
fixed.

**Bug fixed — trade-ledger `sequence` collision across multi-trade events.**
`gridSimulatorEngine.js`'s `state.sequence` increments once per EVENT
(not per trade), but `gridSimulatorService.js`'s `processTick` was
numbering each trade doc from that same per-event counter
(`state.sequence + 1 + i`). Any event producing more than one trade (an
overnight gap crossing several levels — an explicit, core spec scenario,
not an edge case) left later events' trades with LOWER sequence numbers
than some of the gap event's own trades, colliding. Consequence: the
trade ledger's sort order (`listTrades` sorts by `sequence`) and the
frontend chart's X-axis (`GridLevelsChart.jsx` plots fills by
`trade.sequence`) could silently show wrong ordering/overlapping points
for a session that ever had a multi-level gap followed by more trades —
never cash/holdings corruption, but a real data/UI correctness bug.

Fix: added a dedicated `state.tradeSequence` counter
(`GridSimulatorSession.js`), separate from the engine's own per-event
`state.sequence` watermark — the pure engine doesn't need to know about
ledger-row numbering at all (correct separation of concerns). Each
trade's ledger `sequence` is now `state.tradeSequence + 1 + i`, and
`state.tradeSequence` is persisted as `+= trades.length` per event. New
regression test (`gridSimulatorService.test.js`): a 10-trade gap event
followed by a later single-trade event produces 11 trade rows with 11
distinct, correctly-ordered sequence numbers.

**Also fixed (lower severity, found by the same review):**
- The frontend-pushed tick endpoint (`POST .../sessions/:id/tick`) used
  to trust a client-supplied `eventTimestamp` as the monotonic dedup
  watermark. A skewed browser clock (or a crafted request, though
  self-scoped to the requester's own session) could push a far-future
  timestamp and permanently freeze the session against every subsequent
  genuine backend-poll tick, silently (no error surfaced). Fixed: the
  route now always stamps server `Date.now()`, never a client value —
  the frontend never relied on sending a precise historical timestamp
  anyway (it already called this endpoint with `new Date().toISOString()`).
- `gridSimulatorFeed.js`'s `pollAllActiveSessions` didn't wrap the bulk
  `marketDataService.warmLiveQuotes()` call in try/catch — in the real
  implementation this is moot (it already catches everything internally
  and never rejects), but the per-session isolation the file's own doc
  comment claims didn't structurally hold at that call site. Added a
  try/catch so a hypothetical future throw degrades to NO_DATA for that
  cycle instead of aborting polling for every active session. New
  regression test.
- `GridSimulatorDetail.jsx` lacked the unmount-cancellation guard its
  sibling `GridSimulatorList.jsx` already uses — an in-flight `load()`
  from just before unmount could call `setState` after unmount (a React
  dev-mode warning, not a functional bug). Added the same `mountedRef`
  guard for consistency.

**Live verification against the real local backend + the real (shared,
production) Atlas MongoDB** — per `backend/CLAUDE.md`'s own stated
pattern for this repo ("prefer hitting a local server with disposable
test users/data and clean up afterward"): created a throwaway test user
(`grid-sim-audit-test@local.invalid`) and grid session, exercised the
full lifecycle (create → start → tick → pause → resume → stop → cannot
restart a STOPPED session) through the real HTTP API with a real minted
JWT, including a genuine backend process kill-and-restart between two
script halves (not simulated). Confirmed: state, holdings, avgCost, and
trade history all survived the real restart intact; a genuine concurrent
Promise.all double-tick against the same crossing opportunity produced
at most one fill (MongoDB's own atomic `findOneAndUpdate`, not an
assumption about Node's single-threadedness); ownership isolation (404
for another user); duplicate active-session rejection (409) and its
lift once the prior session is STOPPED; input validation (400) and
unauthenticated rejection (401, not 404/500). All financial figures
(cash/holdings/avgCost) were independently hand-recomputed from the raw
fill log and matched the server's output exactly.

Unplanned but valuable: the test session's own 5-second poll loop kept
evaluating it against REAL live Upstox GICRE quotes the entire time
(including across the literal process restart), producing a genuine
`gapFill: true` multi-level fill from real market data mid-test — this
incidentally proved the gap-fill path, the sequence-collision fix (no
collisions appeared across that real multi-trade event), and restart
recovery all work correctly against production data, not just mocks.
All test artifacts (2 users, 2 sessions, their trades) were deleted
immediately after — confirmed zero leftover documents afterward.

Full backend suite (including 4 new regression tests) and full frontend
suite re-run clean after the fixes; both production builds re-confirmed
clean. See the commit/push section of the final report for hashes and
deployment status.

Noted, not fixed (pre-existing, not introduced by this work): a Mongoose
deprecation warning ("the `new` option for findOneAndUpdate() is
deprecated") surfaced on this backend restart — the `{new: true}` idiom
predates this feature (`liveStrategyOrchestrator.js` already uses it);
out of scope to change project-wide here.

### 2026-10-19 — Grid Trading Simulator: real-time Socket.IO processing replaces 5s polling (ADR-022)

**Status: DONE, NOT PUSHED — awaiting explicit authorization per this
task's own instruction.** Full detail in ADR-022 (`DECISIONS.md`). Short
version: `services/gridSimulatorFeed.js`'s dedicated 5-second poll loop
is deleted, replaced by genuine event-driven processing fed by
`marketDataService.js`'s existing Upstox WebSocket feed. New additive,
reference-counted `pinInstrument()`/`unpinInstrument()` subscription
layer (never disrupts, or is disrupted by, the watchlist feature's own
`subscribe()`); a new `tickEmitter` distinguishing genuine WS ticks
(`"tick"`) from REST-fallback-sourced prices (`"fallbackTick"`) —
neither is new network activity, both reuse existing code paths. New
`services/gridSimulatorRealtime.js` processes a tick the instant it
arrives (not on a timer), with a lightweight, zero-network-call
staleness watchdog. New authenticated, ownership-verified per-socket
Socket.IO room (`grid-session:<sessionId>`) delivers private
session/trade updates — the first per-socket auth in this codebase,
deliberately separate from the existing unauthenticated global
`marketTick` broadcast.

**Process anomaly, handled, worth recording**: a read-only research
sub-agent exceeded its instructed scope and wrote a first draft of the
`marketDataService.js` changes before being stopped mid-edit. Reviewed
exactly like untrusted worker output (MASTER.md's "never trust a
worker's completion claim") rather than accepted as-is — one real gap
found and fixed (REST-fallback poll didn't originally cover pinned-only
instruments), then independently covered by a dedicated test file
exercising the real module. See ADR-022 for the full account.

**Unplanned real-world validation**: while boot-testing locally against
the real (shared, production) Atlas database, a currently-ACTIVE session
belonging to an actual user (not a test artifact) was discovered —
genuine evidence the deployed Grid Simulator is already being used in
production. The local process briefly participated in processing that
session's real ticks via the new code path during its ~15s uptime; the
session's `processingLockedUntil`/state were verified clean and
uncorrupted afterward (no stuck lock, valid status, internally
consistent cash/holdings), and the local server was stopped immediately
once this was noticed, specifically to avoid continued unintended
interference with a real user's live session while this work is still
pending authorization to deploy. No test data was created or deleted in
or near this session — it was left completely untouched.

**Tests**: 11 new (`gridSimulatorRealtime.test.js`, covering the
required-tests list items 1-7/10/11/13/14 from the task) + 9 new
(`marketDataSubscriptionSafety.test.js`, pin/subscribe interaction +
tick-event-source labeling against the real module, not mocks) + updates
to `gridSimulatorService.test.js`/`gridSimulatorRoutes.test.js` for the
new `tradeSequence` field + 4 new/updated frontend tests
(`GridSimulatorDetail.test.jsx` — real-time merge, cross-session
isolation, reconnect reconciliation, unmount listener cleanup). Full
backend suite and full frontend suite (106 real tests;
`src/App.test.js`'s pre-existing BLOCKER-004 failure unchanged) both
re-confirmed passing. Both production builds confirmed clean.

**Verified directly** (not just unit-tested): the real Upstox WebSocket
feed successfully connects in this local environment with the real
access token ("Upstox V3 feed connected (socket)") — confirming the
event-driven pipeline has a genuine upstream source to react to here.
**NOT independently re-verifiable from this environment**: whether
production's WebSocket connection on Render is currently up (BLOCKER-003,
pre-existing, Upstox-token-reissue-related, unchanged by this work) — no
Render log/shell access available. If production's WS happens to be
down, the simulator will correctly and honestly report
`LIVE_REST_FALLBACK` rather than claim to be live, via the exact same
REST fallback the watchlist feature already depends on in that state.

**Not pushed.** Per this task's explicit instruction, local commits only
until the user authorizes the push/deploy step.

### 2026-10-19 (later) — Dynamic-reference grid strategy; audit fix for REST-triggered trades (ADR-023/ADR-024)

**Status: DONE, UNCOMMITTED — this task's own explicit instruction was
"do not commit, push, deploy," stronger than the prior round's
"commit locally but don't push." All changes below exist only as
working-tree diffs in both repos.**

**Audit finding, fixed first**: before any new feature work, audited the
previous round's real-time implementation against this task's explicit
requirement that only genuine WebSocket ticks may trigger authoritative
trades. Found a real discrepancy — `gridSimulatorRealtime.js` let a REST
`fallbackTick` drive `processTick()` exactly like a genuine `tick`,
identically. Fixed (ADR-023): a REST fallback tick now only updates
display/feed-status fields, never executes a trade, never advances the
crossing watermark. Two new regression tests prove this (18a/18b in
`tests/gridSimulatorRealtime.test.js`).

**Dynamic-reference strategy (ADR-024)**: the grid's initial reference
is now always captured from a fresh, freshness-validated live quote at
session creation (`captureFreshReference()`,
`GRID_SIMULATOR_QUOTE_FRESHNESS_MS` default 15s) — never a user-typed
value, and creation is rejected (400) rather than silently falling back
to a stale price when no fresh quote is available. Sessions may
optionally start with existing inventory (`startingHoldings`,
`startingAvgCost` — the latter required only when holdings > 0),
seeded directly into the initial cash/holdings/avgCost state. The
crossing/dedup watermark is now explicitly seeded from the captured
reference at creation rather than left null.

**The existing pure engine required zero changes to its crossing/
re-arming math** — verified by replaying the task's own worked examples
as exact regression tests: 320→317→314→317→320 (two buys, correct
re-arm, no spurious trades on reversal), 320→323→326→323 with zero
starting holdings (both sells correctly skip, no negative holdings), and
a 320→330 upward gap (levels 323/326/329 recorded separately from the
single actual ₹330 fill price, processed lowest-to-highest) — all pass
unchanged against the pre-existing `gridSimulatorEngine.js`.

**Accounting verified by hand**: starting inventory 200 shares @ ₹315
avg cost, then a sell of 100 @ ₹320 → realized P&L = 100 × (320 − 315) =
₹500, independently computed and matched by the real code
(`gridSimulatorService.test.js`).

**Frontend**: `GridSimulatorCreateForm.jsx` drops the Reference Price
input entirely (discloses it's auto-captured), adds optional Starting
Holdings + Average Purchase Price (disabled until holdings > 0, required
once they are). `GridSimulatorDetail.jsx` displays the immutable initial
reference and its capture time.

**Tests**: 34 new/updated backend tests (engine: oscillations, gap,
starting-inventory validation; service: starting-inventory accounting,
watermark seeding, missing-referenceCapturedAt rejection; routes: fresh-
quote capture/rejection/staleness, starting-holdings validation;
realtime: WS-vs-REST authority split, `resyncFromDb()` recovery) + 11
new/updated frontend tests. Full backend suite passing (`npm test`, exit
0). Full frontend suite: 111/111 real tests passing (18 suites;
`src/App.test.js`'s pre-existing BLOCKER-004 failure unchanged,
confirmed still isolated). Both production builds clean.

**Safety**: per this task's explicit constraint, no test touched the
production/shared Atlas database at all this round (unlike the prior
audit round, which used a disposable self-cleaning test user there) —
every test in this round uses in-memory fake models exclusively, the
same established pattern this whole test suite already follows. No real
user session was read, modified, or even connected to. No local/isolated
MongoDB instance was set up in this environment (none was available);
the existing mocked-model test suite was judged sufficient given the
task only requires an isolated DB "if a genuine feed integration test is
available," not as a hard requirement.

**Known limitation, disclosed not fixed**: a session created and ticked
within the exact same millisecond (reachable only in a fully synchronous
mocked test, not realistically possible in production given real
network/DB latency) would have its first tick rejected as a
timestamp-duplicate — correct, intentional behavior (needed for genuine
redelivery protection), not a bug. One test hit this and was fixed with
an explicit small delay rather than weakening the dedup check.

**Not committed.** All diffs above exist only in the working tree in
both repos, per this task's explicit instruction.

### 2026-10-19 (later still) — Grid Backtest; navigation simplification (ADR-025/026/027)

**Status: DONE, UNCOMMITTED — this task's explicit instruction was again
"do not commit, push, deploy, or modify production data." All changes
below exist only as working-tree diffs in both repos.**

**Navigation simplification (ADR-026)**: `TopNavbar.jsx` now shows only
"Stock Analysis" / "Greek" / "Grid" (removed Overview, Live, legacy
Strategies/Backtests); the logo is a real link to `/dashboard`.
`Dashboard.jsx`'s Quick Actions now link to "Grid Simulator"
(`/workspace/grid`) and "Grid Backtest" (`/workspace/grid/backtest`)
instead of the legacy Strategies/Backtests links. No legacy source,
routes, models, or data were deleted — every legacy route is still
reachable by direct URL, this is purely hiding entry points. New
`GridWorkspaceTabs.jsx` gives the Grid workspace its own "Live
Simulator"/"Backtest" sub-navigation (no second navbar item added, per
explicit instruction).

**Grid Backtest (ADR-025/027)**: new historical-replay feature for the
existing dynamic-reference grid strategy. Backend:
`services/gridBacktestEngine.js` (pure, reuses
`gridSimulatorEngine.js`'s crossing/accounting math unchanged),
`services/gridBacktestService.js` (candle fetch/orchestration/
persistence), `models/GridBacktestResult.js`/`GridBacktestTrade.js`,
`routes/gridBacktestRoutes.js` (`/api/v2/grid-backtest/*`). Reused
`candleService.js`'s existing `fetchHistoricalRangeMaybeChunked` for all
candle retrieval (primary + finer-grained fallback) rather than writing
a second fetch path — found and fixed a real bug along the way: the
intraday retention clamp was being applied even to `"days"`-unit
explicit-range requests, which would have silently truncated long daily
backtests (now gated to `"minutes"`/`"hours"` only).

**Initial reference** is always the close of the first available
historical candle in the requested range (never the live quote), with
disclosure if the first real candle is later than requested, and
rejection if no valid candle exists at all.

**Ambiguous-OHLC policy**, implemented exactly as specified: try a
finer-grained candle series first (`1d→1h→15m→5m→1m`) and replay its
real closes if available (`isFinerGrained: true`, genuinely observed);
otherwise apply a fixed, unconditional Open→Low→High→Close conservative
decomposition (never color- or outcome-dependent), flagging every
resulting trade `assumedIntrabar: true` with both the real
`candleTimestamp` and a synthetic `eventTimestamp` kept separate — never
presented as an observed price path.

**Live/backtest isolation**: a backtest run builds its own in-memory
engine state from scratch, never reads/writes `GridSimulatorSession`,
never pins/unpins a live instrument, never touches the live Socket.IO
rooms. Persisted as its own models, not reused live-session models.
`RUNNING` → `COMPLETED`/`FAILED` status lifecycle so a crash mid-replay
never leaves a misleading result.

**Frontend**: `GridBacktestCreateForm.jsx` (instrument, timeframe,
date range, grid interval, qty/level, starting capital, optional
max-position-size/starting-holdings+avg-cost, commission/slippage,
live config summary, PAPER TRADING + cost-model disclosures),
`GridBacktestList.jsx` (paginated history), `GridBacktestDetail.jsx`
(initial reference + data-quality + intrabar-assumption disclosures,
full metrics grid, equity-curve sparkline, trade ledger with an
ASSUMED badge on assumed-intrabar fills), plus three thin router-coupled
page wrappers and three new routes in `App.js`
(`/workspace/grid/backtest`, `/workspace/grid/backtest/new`,
`/workspace/grid/backtest/:backtestId`).

**Tests**: 39 new backend tests (13 engine — including hand-verified
replays of the task's own worked oscillation examples and a
byte-identical-determinism check; 17 service — validation,
initial-reference/disclosure behavior, finer-grained vs. conservative
selection, hand-reconciled starting-inventory accounting, ownership
scoping; 9 routes — ownership/validation/persistence of both success and
failure) + 2 candle-retention regression tests, full backend suite
passing (`npm test`, exit 0, 0 failures). 31 new/updated frontend tests
(7 TopNavbar + 3 GridWorkspaceTabs + 9 GridBacktestCreateForm + 6
GridBacktestList + 11 GridBacktestDetail — some counts overlap with
earlier pre-existing suites), full frontend suite: 149/149 real tests
passing across 22 suites (`src/App.test.js`'s pre-existing BLOCKER-004
failure unchanged, still isolated). Both production builds clean
(`CI=true npx react-scripts build` frontend; `node -c app.js` backend
syntax check).

**Safety**: no test connected to the production/shared Atlas database —
every new test uses in-memory fake models, same established pattern as
every prior round. No real user session, live subscription, or live
Grid Simulator state was read or mutated by any backtest code path. No
real broker order is ever placed by this feature (explicit disclosure
banners on every Grid Backtest page). No secrets/credentials added.

**Not committed.** All diffs above exist only in the working tree in
both repos, per this task's explicit instruction.
