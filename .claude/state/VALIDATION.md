# MARKFINANCE VALIDATION LOG

This file records verified implementation state.

Do not claim tests/builds that were not actually run.

---

## Current Validation

Phase:

"Workstream L" (Live Strategy Workspace UI) complete (2026-10-09, same
session as the Historical Candle Chart + Live-Feed Audit milestone,
Workstream J, and Workstream K it followed). Note: this user-assigned
"L" is the frontend UI catch-up milestone for J/K, not the roadmap's
original "L" (options/F&O + real order execution), which remains
entirely unstarted — see PROGRESS.md's naming note.

Backend Tests:

All 35 backend test files passing, 292/292 tests, 0 failures (`npm test`,
full suite, re-run this session) — includes the Historical Candle Chart
milestone's 6, Workstream J's 36 across 5 files, Workstream K's 34
across 4 files, and this session's 1 new test (the alert-configurations
`runtimeId` filter).

Frontend Tests:

77/77 real tests passing (14 suites) — includes this session's 34 new
tests across 5 new files (`liveSignalLabels`, `LiveSignalList`,
`AlertConfigurationPanel`, `LiveActivationForm`, `LiveStrategyList`), on
top of Workstream K's 43/8. The pre-existing, unrelated `src/App.test.js`
failure (BLOCKER-004) was re-checked this session and confirmed still
isolated — it fails for the identical reason (`Cannot find module
'react-router/dom'`) and affects no other suite; not hidden, not
"fixed," not a regression introduced by this work.

Frontend Tests:

All suites pass except the pre-existing, unrelated `src/App.test.js`
failure (BLOCKER-004, confirmed unrelated again this session). New
`src/pro/utils/candleMarkers.test.js` (7 tests, all passing) covers
exact-match marker placement, all four exit-reason stylings, the
never-fabricate-on-no-match path (both fully and partially unmapped
trades), empty-trade-list safety, marker sort order, and
`toUnixSeconds`'s null-on-unparseable behavior.

Frontend Build:

PASS (`CI=true npx react-scripts build`, re-run this session with the new
`CandlestickChart.jsx`/`candleMarkers.js`/`professionalApi.js` changes —
compiles clean, no new warnings).

Integration Tests:

`tests/professionalPlatformIntegration.test.js` — a full strategy
definition (Phase B) runs through the indicator engine (Phase C), the
execution engine (Phase D/E), and analytics (Phase F), then the output
is shaped into `StrategyVersion`/`BacktestResult`/`BacktestTrade`
documents and validated against the real Mongoose schemas (Phase A)
in-memory, no live DB connection. This is the test that confirms all
six phases genuinely compose, not just pass in isolation.

No-Lookahead Tests:

Two dedicated structural tests in `tests/indicatorEngine.test.js`: the
full indicator-series pipeline and a full strategy-signal evaluation are
each run against a complete candle series and an artificially truncated
one, asserting every bar they both cover produces byte-identical
indicator values and signals. This verifies causality structurally
(every bar's computation only ever reads `candles[0..i]`), not just by
inspecting that the underlying math "happens to be" causal.

Last Verified Commit:

Backend `b270086` (phaseF). Frontend `27e4ce8` (Phase 2.2, predates this
milestone, unchanged by it).

---

## Validation History

### 2026-10-08 — Phase A (data model + versioning)
- Tests: 18 new (127/127 full suite at the time)
- Build: not applicable (backend schema/service only)
- Verified: schema validation/defaults/indexes for all 4 new models
  in-memory (no DB connection); `strategyVersionService`'s version-
  numbering, ownership-scoping, and non-mutation-of-prior-versions
  behavior via injected fakes; export script's payload-shaping logic
  (pure function, no DB).
- Commit: `c28af12`

### 2026-10-08 — Phase B (professional strategy DSL)
- Tests: 22 new (149/149 full suite at the time)
- Verified: operand resolution (indicator/price/constant, both sides of
  a comparison), nested AND/OR, multi-timeframe operand resolution,
  recursive indicator-requirement collection, warmup calculation,
  validation rejection for every invalid-input class the spec called
  for (unregistered indicator, invalid operator/operand type/price
  field/timeframe, empty group, each invalid definition field).
- Commit: `b9e1cc6`

### 2026-10-08 — Phase C (indicator engine + StrategyContext)
- Tests: 10 new (159/159 full suite at the time)
- Verified: RSI/EMA/SMA/MACD+MACD_SIGNAL/VWAP series computation
  (MACD computed once even when both its outputs are requested;
  unregistered indicators fail loudly, never silent-false); causal
  cross-timeframe alignment (never selects a future auxiliary bar);
  **no-look-ahead verified structurally** via full-vs-truncated-series
  comparison at both the raw-series level and the full-evaluation level.
- Commit: `e58cad1`

### 2026-10-08 — Phase D (event-driven execution engine)
- Tests: 9 new (168/168 full suite at the time)
- Verified: signal timing (close-detect, next-open-fill), SL/TP fill at
  the threshold price (not the bar's high/low), the ADR-004 ambiguity
  policy (stop wins when one bar touches both thresholds — dedicated
  test with a bar crafted to hit both), position sizing + commission +
  slippage arithmetic by hand-computed expected values, end-of-data
  forced close (no slippage), equity/drawdown shape, exact
  reproducibility (identical input → `assert.deepStrictEqual` output),
  and **regression parity against the legacy engine** — an equivalent
  RSI mean-reversion strategy run through both engines produces
  identical trade count and entry/exit dates.
- Commit: `3683c0b`

### 2026-10-08 — Phase E (risk/sizing/cost model)
- Tests: 11 new (179/179 full suite at the time)
- Verified: all four position-sizing formulas by hand-computed expected
  quantities; riskPercent's safe zero-output with no stop distance;
  the new validator rule (riskPercent requires `risk.stopLoss`,
  fixed-quantity/fixed-cash don't); `execution.costs` range validation.
- Commit: `39eed80`

### 2026-10-08 — Phase F (professional analytics)
- Tests: 8 new (187/187 full suite at the time — final milestone count)
- Verified: trade metrics (win rate/profit factor/expectancy) against a
  hand-computed fixture; profit factor and CAGR return `null` rather
  than `Infinity`/`NaN` in their respective edge cases (no losses,
  degenerate date range); exposure % reconstructed correctly from trade
  date ranges; the full Return/Risk/Trade/Exposure/Benchmark pipeline on
  a deterministic equity curve; Sharpe/Sortino methodology constants
  (`SHARPE_RISK_FREE_RATE`, `BARS_PER_YEAR`) are real, inspectable,
  tested values, not undocumented magic numbers; the full A→F
  integration test (see above).
- Commit: `b270086`

### 2026-10-08 — Phase F.5 (backtest integration / data adapter)
- Tests: 13 new across 2 files (200/200 full suite at the time)
- Build: frontend confirmed clean (unmodified)
- Verified: the real candle-service interface (fetchCandleSeriesForBacktest
  -> candleService.js -> Upstox) exercised with the network mocked only at
  the axios boundary, not the interface itself — proving genuine
  integration, not a stubbed-out shortcut; BacktestResult/BacktestTrade
  persistence schema-validated against the real Phase A Mongoose models
  (no live DB connection, same technique as the A→F integration test);
  ownership scoping (strategy not owned by caller -> 404, version not
  belonging to the given strategy -> 404, both before any candle fetch
  or engine run); invalid instrument/date-range/insufficient-data
  rejection with clear messages; Upstox/service failures mapped to safe
  status codes that never leak raw error text and never return a
  401/403 that would wrongly trigger the frontend's session-clearing
  interceptor; requireAuth confirmed wired on the run route.
- Commit: `7489855`

### 2026-10-09 — Phase F.6 (strategy management API)
- Tests: 13 new in professionalStrategyRoutes.test.js + 1 new in
  strategyVersioning.test.js (214/214 full suite at the time)
- Build: frontend confirmed clean (unmodified)
- Verified: strategy creation + initial version (v1); list scoped to the
  authenticated user only (confirmed a second user's strategies are
  excluded, not just unordered); get-one returns the correct current
  version; PUT without a definition updates metadata only and creates
  zero new versions; PUT with a definition creates exactly one new
  version and leaves the prior version's stored definition byte-for-byte
  unchanged; an older version is explicitly retrievable by id after a
  newer one exists; invalid DSL rejected on both create and update before
  any persistence occurs; a malformed id is rejected by validateObjectId
  before any DB query (verified by running the actual middleware chain,
  not just the final handler, with a spy confirming the model's findOne
  was never called); requireAuth confirmed wired on every one of the six
  routes; cross-user read AND update both rejected with 404, with the
  attacker's update confirmed to have had zero effect; a simulated
  concurrent double-PUT (Promise.all of two version-creating updates)
  lands on two distinct, correctly-incrementing version numbers;
  pagination page/limit bounds and the 100-item max-clamp; a
  BacktestResult's `strategyVersionId` reference is confirmed to still
  point at the original version's unchanged content after a newer version
  is created for the same strategy.
- Separately, in strategyVersioning.test.js: a dedicated test simulates a
  real MongoDB duplicate-key error (code 11000) on the first create
  attempt and confirms `createNewVersion()` retries and lands on the next
  free version number rather than throwing or silently dropping the
  caller's definition (ADR-009).
- Confirmed via `git diff --stat`: zero changes to
  `routes/strategyRoutes.js`, `models/Strategy.js`,
  `routes/backtestRoutes.js` (the legacy system).
- Commit: `f5ae2be`

### 2026-10-09 — Milestone G-I (professional strategy workstation UI)
- Backend tests: 214/214 passing (1 new assertion added for
  dataQuality persistence; the rest unchanged from F.6)
- Frontend tests: 31/31 passing across 6 new test suites
  (dslTree, ExpressionGroupEditor, OperandEditor, StrategyEditor,
  BacktestSummary, TradeExplorer). Pre-existing CRA scaffold test
  (src/App.test.js) still fails for a confirmed, unrelated reason
  (Jest/react-router-dom module resolution — present before this
  milestone, documented in BLOCKER-004) — not a regression caused by
  this work.
- Frontend build: PASS (`CI=true npx react-scripts build`)
- Verified: DSL round-trip (UI -> tree -> pruned DSL -> re-pruned DSL is
  idempotent/identical); nested AND/OR editing at 3 levels of depth;
  only backend-registered indicators (RSI/EMA/SMA/MACD/MACD_SIGNAL/VWAP)
  are ever offered, never Bollinger/ATR/ADX/Supertrend; a real bug found
  and fixed where a bare-condition entry/exit (valid per the backend DSL)
  broke the editor, which assumed a group-rooted tree; metadata-only vs.
  definition-creates-new-version save behavior, both directions,
  confirmed by inspecting the exact payload sent to the (mocked) API;
  server-side validation errors surfaced to the user; results rendering
  (return/risk/trade/exposure/benchmark metrics, missing-metric handling
  as "—" never "NaN"/"undefined", corporate-action + SL/TP-ambiguity
  disclosures always shown, empty-result handling); trade-explorer
  loading/empty/error states and server-side pagination with correct
  skip/limit on Next/Previous.
- Full end-to-end live browser verification (create -> edit -> version
  -> backtest -> view -> navigate away/back) was NOT performed — this
  environment has no live MongoDB connection or Upstox credentials
  (same constraint documented since the Phase 2.0 audit). Verified
  instead via: backend integration tests exercising the real candle-
  service interface with Upstox mocked at the network boundary down
  through schema-validated persistence (Phase F.5/F.6 test suites,
  unchanged and still passing), and frontend component tests exercising
  the real API client contract against a mocked `professionalApi`
  module.
- Commits: backend `fa9963c`, frontend `36d9579`.

### 2026-10-09 — Historical Candle Chart + Live-Feed Audit (Workstreams A & B)

**Workstream A (chart):**
- Backend: new `GET /api/v2/backtests/:id/candles` route
  (`professionalBacktestRoutes.js`), reusing `candleService.js`'s
  `fetchHistoricalCandlesByRange` (ADR-011) — no new Upstox data path.
  6 new tests in `professionalBacktestCandles.test.js`: exact date-range
  verification (asserts the request URL contains the backtest's own
  `/{toDate}/{fromDate}`, not "today"-relative), finite-value
  normalization, response-size capping, cross-user 404, persistent-
  Upstox-failure → safe 503 mapping (verified the failure actually
  exhausts the retry budget, not just fails once), requireAuth wiring.
  Full backend suite: 21/21 files passing, 0 failures.
- Frontend: `lightweight-charts` v5.2.1 installed (confirmed Apache-2.0
  license via `npm view`, confirmed zero sub-dependencies via `npm ls`).
  Real candlestick rendering in `CandlestickChart.jsx` via the v5
  `addSeries(CandlestickSeries, ...)` + `createSeriesMarkers` plugin API
  (confirmed directly from `node_modules/lightweight-charts/dist/
  typings.d.ts`, not assumed from older v3/v4 API knowledge). Entry/exit
  markers built by the new pure function `candleMarkers.js`'s
  `buildTradeMarkers` (ADR-012) — exact-timestamp-match-or-skip, with a
  user-visible count of any trade whose marker could not be precisely
  placed. 7 new tests in `candleMarkers.test.js`, all passing (see above).
  Build confirmed clean.
- Verified end-to-end data flow by code inspection (not live browser,
  same no-live-credentials constraint as every prior milestone): the
  route's response shape (`{timestamps, open, high, low, close, volume}`)
  matches exactly what `CandlestickChart.jsx` consumes, and
  `BacktestTrade`'s `entryDate`/`exitDate`/`exitReason` fields (confirmed
  present on the real model and already rendered by `TradeExplorer.jsx`)
  are exactly what `buildTradeMarkers` consumes — no assumed field names.

**Workstream B (live-feed audit, read-only):**
- Re-read `services/marketDataService.js` in full this session (not
  relying on the Phase 2.0 audit's memory of it) and
  `services/strategyScanService.js`'s dependency on it. Findings recorded
  in `LIVE_FEED_AUDIT.md`: per-field live/candle/REST source table,
  WS reconnect/fallback control flow (flat 5s reconnect, no backoff cap —
  a real, newly-documented gap, not fixed per the explicit "do not
  rewrite the WebSocket service" instruction), confirmed absence of any
  token-refresh mechanism, and an explicit list of what is/is not
  verifiable without production credentials. The user's ~60-day
  production-uptime report was taken at face value throughout, per
  instruction, and nothing found contradicts it — this audit only
  documents code behavior, not production status, which remains
  unconfirmed in this environment (BLOCKER-003, updated not resolved).
- No code changed in this workstream (read-only, as instructed).

**Workstream C (live-engine design, documentation only):**
- `LIVE_ENGINE_DESIGN.md` proposes a 6-stage pipeline (ingestion →
  normalized snapshot → evaluation → signal generation → simulated
  position management → alerts), with an explicit inventory of which
  existing functions are reused verbatim (`indicatorEngine.js`'s
  `buildRows`, `strategyExpression.js`'s
  `evaluateProfessionalExpression`/`validateStrategyDefinition`,
  `backtestExecutionEngine.js`'s sizing/cost functions) versus what's
  genuinely new (a snapshot-normalization layer and live-specific
  stateful bookkeeping). Documents the historical-vs-live timing
  distinction explicitly: live evaluation only runs on a bar's transition
  to `isComplete: true`, never against an in-progress bar, to keep live
  evaluation semantically identical to backtest evaluation's closed-bar
  contract. No implementation — design only, per instruction.

Commits: see `PROGRESS.md`/final milestone report for exact hashes
(recorded immediately after this validation entry, same session).

### 2026-10-09 (later, same session) — Workstream J: Live Strategy Engine

Approved by the user immediately following the Historical Candle Chart +
Live-Feed Audit report. Full inspection pass done first, per instruction:
re-read `.claude/MASTER.md`, `.claude/WORKER_PROTOCOL.md`, every
`.claude/state/*.md` file, `strategyExpression.js`, `indicatorEngine.js`,
`backtestExecutionEngine.js`, `candleService.js`, `marketDataService.js`
(relevant sections), `professionalBacktestService.js`,
`professionalCandleAdapter.js`, auth/ownership middleware, and — critically
— `utils/rsiCandles.js`'s `dropFormingCandle`, which turned out to
already be the exact trustworthy bar-completion mechanism the milestone
asked for (verified directly, not assumed from its name/doc comment).

- **Refactor (behavior-preserving, verified zero regression):**
  `backtestExecutionEngine.js` gained three extracted pure helpers
  (`computeStopAndTargetPrices`, `checkStopAndTargetHit`,
  `computeTradeEconomics`) — `runProfessionalBacktest`'s loop body now
  calls them instead of inline-duplicated math. Verified via the full
  pre-existing `backtestExecutionEngine.test.js` (9/9),
  `professionalPlatformIntegration.test.js` (1/1), and
  `professionalBacktestService.test.js` (4/4) suites passing unchanged
  immediately after the refactor, before any new code was written on top
  of it.
- **New `tests/rsiCandles.test.js`** (10 tests, all passing) — the first
  dedicated unit coverage for `dropFormingCandle`/`isBarForming`/
  `inferStepMs` despite this function already being load-bearing for the
  existing backtest candle path. Verifies: forming-bar stripping and
  closed-bar retention for minute/hour/day timeframes, the (documented,
  pre-existing, not-a-bug) daily 24h-from-midnight rule rather than
  NSE's 15:30 IST close, empty/single-candle edge cases, defensive
  cloning.
- **New `services/liveCandleFeed.js`** + `tests/liveCandleFeed.test.js`
  (3 tests, axios-mocked at the network boundary, same convention as
  `historicalCandleCache.test.js`) — proves the real
  `candleService.getCandles` → `dropFormingCandle` → `toBacktestQuote`
  path is exercised end to end, not a stand-in for it, and that it does
  NOT call `fetchCandleSeriesForBacktest` (which would have returned a
  stale-forever cached answer on repeated live polls — a real correctness
  bug that was caught and avoided before being written, by tracing
  `backtestSeriesCache`'s actual caching semantics first).
- **New `services/liveSignalEngine.js`** + `tests/liveSignalEngine.test.js`
  (6 tests, all passing) — the explicit parity proof the milestone
  required: three tests assert byte-identical entry/exit dates, prices,
  quantities, fees, slippage cost, and net P&L between
  `runProfessionalBacktest()` (run once, whole fixture) and
  `processCompletedBar()` (run once per bar, same fixture, persisted
  state threaded through) for a fully-closed trade, a stop-loss exit, and
  a commission+slippage scenario. A fourth test proves the one
  deliberate, documented divergence: where backtesting force-closes a
  still-open position as `END_OF_DATA`, the live engine correctly leaves
  it open (`inPosition: true`, zero fabricated closed trades) — this is
  asserted directly, not glossed over as "equivalent enough."
- **New `services/liveStrategyOrchestrator.js`** +
  `tests/liveStrategyOrchestrator.test.js` (7 tests, all passing,
  including a genuine concurrency test — two `processRuntimeOnce()` calls
  launched via `Promise.all` against one shared in-memory fake model
  whose `findOneAndUpdate` has no `await` between its read-check and its
  write, the same atomicity guarantee a real MongoDB operation provides,
  so this is a real race condition being resolved, not merely asserted).
  Verifies: new-bar processing + atomic commit, duplicate-poll no-op,
  out-of-order/already-seen bars never reprocessed (strict monotonic
  watermark), stale/empty candle data handled safely, exactly one winner
  under concurrent access, restart recovery against a pre-persisted
  mid-position `engineState` (simulating a fresh process reading the same
  document after a crash), and per-runtime failure isolation within
  `pollAllActiveRuntimes`.
- **New `models/LiveStrategyRuntime.js`/`models/LiveStrategySignal.js`,
  `services/liveStrategyService.js`,
  `routes/liveStrategyRoutes.js`** + `tests/liveStrategyRoutes.test.js`
  (11 tests, all passing) — ownership-scoped activate/deactivate/list/
  status/signals endpoints, invoked via the real Express handlers (same
  `finalHandlerFor` technique as `professionalBacktestRoute.test.js`)
  against the real `activateLiveStrategy`/`deactivateLiveStrategy`
  service functions and in-memory fake models. Verifies: owned-strategy
  activation freezes the current `strategyVersionId`; cross-user
  activation/deactivation both rejected (404, no leak, no side effect);
  duplicate-active-runtime activation rejected (409, not a silent second
  runtime — confirmed by asserting the fake model's size stays 1);
  timeframe-mismatch-against-the-version's-own-`universe.timeframe`
  rejected (400); a persisted version whose definition no longer passes
  `validateStrategyDefinition` is rejected (400) rather than silently
  activated; malformed/invalid input rejected before any DB query;
  listing scoped to the caller only; `requireAuth` wired on every route.
- **Full regression:** 257/257 backend tests passing across all 26 test
  files (`npm test`), re-run after every structural change, not only at
  the end. Frontend: zero files touched this workstream (confirmed via
  `git status` before starting), production build re-confirmed clean
  anyway per the checkpoint protocol.
- **Self-review against MASTER.md's checklist:** no lookahead (contexts
  built from closed candles only, signal-then-next-bar-open fill timing
  preserved exactly); ownership enforced in every query, not just
  controller logic; no in-memory-only concurrency guard (DB-level
  claim-lock, proven under real concurrent calls); no unbounded
  growth (rolling buffer capped at 1500 bars, lock TTL capped at 45s,
  poll interval fixed at 20s); legacy Strategy/Backtest system and the
  WebSocket feed both fully untouched (confirmed via `git diff --stat`
  touching no file outside the list above plus the three additive
  `app.js`/`rateLimiters.js`/`package.json` wiring edits).

Commits: backend `2265b79` (Workstream J). No frontend changes this
workstream.

### 2026-10-09 (later, same session) — Workstream K: Alerts

Approved immediately following Workstream J's acceptance. Full inspection
pass done first: re-read every `.claude/state/*.md` file,
`LIVE_FEED_AUDIT.md`, `LIVE_ENGINE_DESIGN.md`, the actual
`LiveStrategyRuntime`/`LiveStrategySignal` schemas and
activation/deactivation routes, `src/firebase.js` (confirmed Auth-only —
no Firebase Cloud Messaging or any other push-provider infrastructure
exists to build on), and `TopNavbar.jsx`/`App.js` for frontend
conventions — before writing any code.

- **New `models/AlertConfiguration.js`/`models/Notification.js`** —
  `Notification`'s unique compound index on `{alertConfigurationId,
  sourceSignalId}` is the entire duplicate-prevention mechanism (ADR-016);
  `AlertConfiguration`'s unique partial index on `{userId, runtimeId}`
  where `status: ACTIVE` prevents duplicate configurations the same way
  `LiveStrategyRuntime` already prevents duplicate activations.
- **New `services/alertContentBuilder.js`** +
  `tests/alertContentBuilder.test.js` (7 tests, all passing) — the
  explicit signal-vs-simulated-fill wording proof the milestone required:
  verifies `isFill` is correctly `false` for `*_SIGNAL`/`true` for
  `*_FILLED`, that every fill message contains the literal words
  "SIMULATED" and "no real order", that exit reasons render in plain
  language, that a missing `netPnl` never produces a `"NaN"` string, and
  that every message includes the instrument symbol.
- **New `services/alertNotificationService.js`** +
  `tests/alertNotificationService.test.js` (9 tests, all passing,
  including two genuine concurrency/failure tests using the same
  no-`await`-between-read-and-write atomic fake-model technique as
  `liveStrategyOrchestrator.test.js`) — verifies: new-signal processing +
  cursor advancement; a disabled configuration is never processed;
  event-type filtering (only the configured subset produces
  notifications); a no-new-signals poll is a safe no-op; re-processing
  the same signals (simulating the crash-before-cursor-commit window)
  produces exactly one notification per signal, never two — the core
  dedup proof; two concurrent calls against the same configuration
  resolve to exactly one winner; a genuine (non-duplicate-key) failure
  releases the lock and leaves the cursor unmoved so the batch is safely
  retried later, verified by actually retrying it in the same test and
  confirming success with no duplicate; a missing `LiveStrategyRuntime`
  is handled safely; and `pollAllActiveAlertConfigurations` isolates one
  configuration's failure from the rest of the fleet.
- **New `services/alertConfigurationService.js`** +
  `tests/alertConfigurationService.test.js` (8 tests, all passing) —
  ownership (a runtime not owned by the caller is rejected, 404, before
  any configuration can reference it); unsupported `eventTypes` values
  rejected (400); a second active configuration for the same runtime
  rejected (409, confirmed no silent duplicate via the fake model's own
  size); update is allowlist-only (confirmed `status` cannot be set via
  the update path even when supplied); archiving frees the runtime for a
  fresh configuration later; no-updatable-fields rejected (400).
- **New `routes/alertRoutes.js`** +
  `tests/alertRoutes.test.js` (10 tests, all passing, same
  `finalHandlerFor` direct-Express-handler technique as
  `professionalBacktestRoute.test.js`/`liveStrategyRoutes.test.js`) —
  ownership enforced on every create/update/archive/read-single path;
  listing scoped to the caller; read/unread filtering; unread-count
  scoped per user; mark-read and mark-all-read both verified to touch
  only the caller's own notifications; `requireAuth` confirmed wired on
  every route including both path-param and non-path-param ones.
- **Full backend regression:** 291/291 tests passing across all 34 test
  files (`npm test`), re-run after every structural change. Confirmed via
  `git diff --stat` that `liveStrategyOrchestrator.js`,
  `liveSignalEngine.js`, every legacy file, and the WebSocket feed code
  are all untouched by this workstream — only additive new files plus
  the same three wiring files (`app.js`/`package.json`, no
  `rateLimiters.js` change needed this time since the new routes rely on
  the existing global `writeLimiter` for their mutating endpoints, not a
  dedicated limiter, per the low-frequency nature of alert-configuration
  CRUD).
- **Frontend:** `src/pro/api/professionalApi.js` gained 8 new functions
  (no new API client files, keeping the "ONLY place that calls v2
  endpoints" convention intact). New `NotificationsPage.jsx`
  (`/workspace/notifications`) and `NotificationBell.jsx` (wired into
  `TopNavbar.jsx`, replacing nothing — purely additive alongside the
  existing Settings link). Both hit the pre-existing BLOCKER-004 Jest/
  react-router-dom issue for direct RTL testing, consistent with every
  other page-level file in `src/pro/pages`; the one piece of non-trivial
  client-only logic (`readBrowserNotificationPref`'s permission/opt-in
  state derivation) was extracted into a react-router-free
  `browserNotificationPref.js` specifically so it's reachable by Jest —
  `browserNotificationPref.test.js` (5 tests, all passing) verifies all
  four permission/opt-in state combinations, including that the browser
  notification path is never auto-enabled even when permission happens
  to already be "granted" (requires the explicit stored opt-in flag too).
  Full frontend suite: 43/43 real tests passing (8 suites); production
  build (`CI=true npx react-scripts build`) compiles clean with no new
  warnings.
- **Self-review against MASTER.md's checklist:** ownership enforced in
  every query; ADR-016's dedup guarantee is a DB constraint, not
  in-memory code discipline; no unbounded growth introduced beyond what
  Workstream J already accepted for `LiveStrategySignal` (`Notification`
  is paginated the same way); browser-notification permission is never
  requested without an explicit user click (verified by the extracted
  pure function's tests, which assert the "granted but never opted in"
  case stays `"disabled"`); no fill notification wording could be
  mistaken for a real broker execution (asserted directly in
  `alertContentBuilder.test.js`); zero changes to strategy evaluation,
  the historical backtest engine, live signal generation, the WebSocket
  feed, or the legacy system.

Commits: backend `ac633af` (Workstream K), frontend `67b1c34`
(Workstream K notifications UI).

### 2026-10-09 (later, same session) — "Workstream L": Live Strategy Workspace UI

Approved immediately following Workstream K's acceptance. Full inspection
pass done first, per instruction: re-read `CLAUDE.md`,
`.claude/MASTER.md`, `.claude/WORKER_PROTOCOL.md`, every
`.claude/state/*.md` file, and the ACTUAL current contents of
`routes/liveStrategyRoutes.js`, `routes/alertRoutes.js`, and
`src/pro/api/professionalApi.js` (not assumed from memory of writing
them in prior turns this session) before writing any new frontend code —
confirmed the exact response shapes (`runtimeSummary`/
`runtimeStatusDetail`/`signalSummary`/`configSummary`/
`notificationSummary`) directly from source.

- **One small, additive backend change (ADR-018):** `routes/alertRoutes.js`'s
  `GET /v2/alert-configurations` gained an optional `?runtimeId=` filter,
  mirroring the existing `?status=` filter's shape and lenient
  invalid-value handling. 1 new test
  (`tests/alertRoutes.test.js`) verifies both the filtering behavior and
  that an invalid id is silently ignored rather than rejected or
  crashing. Full backend suite re-run after this change: 292/292 passing
  (35 files) — zero regressions, confirmed via `git diff --stat` that no
  other backend file changed.
- **New `src/pro/components/InstrumentSearchInput.jsx`** — extracted
  verbatim from `BacktestRunner.jsx` (diffed to confirm byte-for-byte
  behavior preservation, not a rewrite) so the live-activation form
  reuses the exact same instrument-search behavior instead of a second,
  drifting copy.
- **New `src/pro/components/LiveStrategyList.jsx`** +
  `LiveStrategyList.test.jsx` (10 tests, all passing) — the dashboard
  list, deliberately written to take navigation as callback props
  (`onOpenRuntime`/`onActivateClick`) rather than importing
  `react-router-dom` itself (ADR-017), which is what makes it reachable
  by Jest despite BLOCKER-004. Verifies: loading/empty/error states;
  strategy name resolved via a bounded client-side lookup; version
  number resolved via bounded per-page-only parallel lookups; clicking a
  runtime navigates via the callback; the Activate button navigates via
  its own callback; the status filter re-fetches with the correct query
  param; deactivation requires confirmation (via the existing
  `toast.jsx`'s `confirmAction`, mocked) and only calls the API when
  confirmed; an INACTIVE runtime never shows a Deactivate control;
  pagination calls the API with the correct page.
- **New `src/pro/components/LiveActivationForm.jsx`** +
  `LiveActivationForm.test.jsx` (8 tests, all passing, including real
  instrument selection driven through the actual search UI — typing into
  the field, waiting for a mocked search result, and clicking it, not a
  shortcut around that flow) — verifies: the polling-based-evaluation and
  no-real-broker-order disclosures are present verbatim; ARCHIVED
  strategies are excluded from the picker; selecting a strategy loads its
  versions and the version's own `universe.timeframe` is read from the
  server and displayed as locked; submitting without an instrument is
  rejected client-side before any API call; a successful activation
  submits the version-locked timeframe and calls `onActivated`; a 409
  duplicate-activation conflict surfaces the backend's exact message
  (including its "deactivate it first" guidance) rather than a
  generic one; a generic server error is surfaced without crashing the
  form; the submit button disables while in flight and a second click
  during that window never fires a second API call.
- **New `src/pro/components/LiveSignalList.jsx`** +
  `LiveSignalList.test.jsx` (6 tests, all passing) — verifies
  ENTRY_SIGNAL/EXIT_FILLED render with visually distinct labels (signal
  vs. simulated fill), the empty state never implies completeness, the
  component's own copy states the history "is not guaranteed to be
  complete" (directly preserving the ADR-015/BLOCKER-005 limitation in
  the UI, not just in backend docs), and pagination calls the API with
  the correct page.
- **New `src/pro/components/AlertConfigurationPanel.jsx`** +
  `AlertConfigurationPanel.test.jsx` (6 tests, all passing) — verifies:
  offers "create" when no configuration exists yet for the runtime;
  creating calls the API with the exact selected event types; an
  existing ACTIVE configuration loads with its real checkbox state
  (confirmed by counting exactly 2 checked boxes — one event type +
  "Enabled" — not assumed); unchecking every event type blocks
  submission client-side with no API call; a 409 duplicate-configuration
  conflict (simulating a second tab racing this one) surfaces the
  backend's message and reloads to reflect reality; archiving requires
  confirmation and only calls the API when confirmed.
- **New `src/pro/utils/liveSignalLabels.js`** + test (4 tests, all
  passing) — pure signal-type → label/tone lookup; verifies the
  signal/fill distinction, graceful handling of an unknown type, and
  exit-reason plain-language mapping.
- **New pages** (`LiveStrategiesPage.jsx`, `LiveActivationPage.jsx`,
  `LiveRuntimeDetailPage.jsx`) — deliberately thin composition only
  (routing + prop-wiring), consistent with every prior page in
  `src/pro/pages`; not independently tested, for the same pre-existing
  BLOCKER-004 reason every other page in this tree isn't. `App.js`
  gained 3 new lazy routes; `TopNavbar.jsx` gained a "Live" nav item
  (additive, no existing item removed or reordered beyond the one new
  insertion); `NotificationsPage.jsx` now links to the runtime detail
  page in addition to the strategy page.
- **Full frontend regression:** 77/77 real tests passing across 14
  suites (`CI=true npx react-scripts test --watchAll=false`), re-run
  after every structural change. `src/App.test.js`'s failure re-verified
  to be the identical pre-existing `Cannot find module 'react-router/dom'`
  error, isolated to that one file. Production build
  (`CI=true npx react-scripts build`) initially failed on a
  `react-hooks/exhaustive-deps` lint-as-error in
  `LiveActivationForm.jsx` — root-caused to the `-- description` suffix
  on an `eslint-disable-next-line` comment not being honored by this
  project's ESLint version, fixed by moving the explanation to a
  preceding plain comment and keeping the disable comment itself bare;
  rebuilt clean afterward, confirmed via a second consecutive clean
  build.
- **Self-review against MASTER.md's checklist:** ownership/security
  enforcement unchanged (frontend adds zero new authorization logic —
  every check is still server-side, exactly as before); no new mock data
  anywhere in the production UI (every page/component fetches from the
  real API client, `professionalApi.js`); no broad unrelated refactor
  (the one extraction, `InstrumentSearchInput`, is behavior-preserving
  and reviewed as a diff, not a rewrite); `liveStrategyOrchestrator.js`,
  `liveSignalEngine.js`, the backtest evaluator, and notification
  delivery semantics (`alertNotificationService.js`) are all confirmed
  untouched via `git diff --stat`; stale-response protection present
  (every data-fetching component uses a `cancelled` flag in its effect
  cleanup, same convention as every pre-existing component in this
  tree); duplicate-toast protection present (the bell's browser
  notification only fires on a genuine unread-count increase since the
  last poll, never on every poll tick).

Commits: backend `d41ccfe` ("Workstream L" UI support), frontend
`0284daf` ("Workstream L" UI).

### 2026-10-09 (later, same session) — Full-Platform Verification, Stabilization & Deployment

Six parallel, independent, read-only audit agents (via the Agent tool,
general-purpose subagent type, each with zero prior context — self-
contained prompts naming exact files to read and tests to run) covered
every area the milestone's instructions specified. Full matrix:

| Area | Scope | Tests run | Result | Notes |
|---|---|---|---|---|
| A — Strategy builder/DSL/versioning | CRUD, immutability, concurrent version creation, DSL validation, ownership, indicator registry | 78/78 | **PASS** | 5 independently-constructed invalid definitions all correctly rejected (unregistered indicator, missing timeframe, invalid operator, SHORT side, riskPercent-without-stopLoss); malformed-id-before-DB-query proven via a spy, not assumed |
| B — Backtest engine & financial calc | Entry/exit timing, SL/TP fill price + ambiguity policy, sizing, commission/slippage, no-lookahead, warm-up, end-of-data, version immutability after edit, analytics | 42/42 | **PASS** | 3 scenarios hand-computed independently and matched the engine's actual output to the penny; no-lookahead verified as a real structural proof (truncated-series bit-identical comparison), not a name-trust |
| C — Trading costs | STT/exchange/GST/SEBI/stamp-duty coverage | N/A (code audit + external research) | **PARTIAL → FIXED (disclosure)** | None of the 5 statutory charges implemented; ~27% real-cost understatement on a cited example; fixed via `dataQuality.tradingCostModelNote`, not a cost-model rewrite (ADR-019/BLOCKER-007) |
| D — Market data/indicators | Forming-candle exclusion, dedup, retry/rate-limit, live-field null handling, cache TTL | 44/44 | **PASS/PARTIAL → FIXED** | Found + fixed: `volume` coerced to 0 instead of null in 3 places; corrected an inaccurate `oiChange` doc claim. Live-provider data-accuracy comparison explicitly NOT VERIFIABLE (no live Upstox credentials) |
| E — Charts/backtest visualization | Candle loading, markers, cleanup, equity/drawdown/benchmark | covered by frontend's 79/79 | **PASS** | `CandlestickChart.jsx`'s cleanup unconditionally calls `chart.remove()`; effect dependency array (`[backtestResultId]`) doesn't cause unnecessary remounts. One low-severity/unconfirmed note on `candleMarkers.js`'s `unmappedCount` for a hypothetically-still-open trade — confirmed moot: `BacktestTrade.exitDate` is schema `required: true` |
| F — Live strategy engine | Activation/deactivation, ownership, timeframe constraints, candle polling, restart recovery, concurrency, BLOCKER-005 | 65/65 | **PASS** | Restart recovery and concurrency both verified via genuine (not simulated) tests — the latter a real race proven by a no-`await`-between-read-write fake model. BLOCKER-005 investigated in depth: recommendation is to leave as a documented limitation (Mongo transactions plausible on Atlas but unconfirmed in production; a reconciliation/backfill job would violate "never invent a signal") |
| G — Alerts/notifications | Config CRUD, dedup, concurrency, read/unread, browser-permission opt-in | covered within F's 65 + frontend's 79 | **PASS** | Alert dedup (unique index) and event-type filtering both verified with real test assertions, not just counts |
| H — Frontend/API integration | Routes, contracts, stale-response guards, pagination, loading/empty/error, no-mock-data, no-broker-order-language | 79/79 + build | **PASS** | Single-API-client convention confirmed (zero stray fetch/axios calls outside `professionalApi.js`); every `useEffect`-driven API call uses a `cancelled` guard; zero mock/fake/dummy/TODO/FIXME in production paths; broker-order disclaimer confirmed present and prominent in 2 places |
| I — Security/reliability | Auth, ownership, CORS, secrets, `.env` history | code read, no live DB | **PASS** | No secret/token ever logged; CORS never wildcards; every new route (J/K/L) has `requireAuth` + ownership-scoped queries at both the route AND service-internal level (self-verified directly after the audit flagged it as unconfirmed); zero `.env` in git history in either repo |

**Concrete defects found and fixed (backend commit `06ef911`, frontend
commit `096ff4e`):**
1. **Medium** — `services/marketDataService.js`'s `buildRow`/`buildQuickRow`
   fabricated `volume: 0` for a genuinely-missing value in 3 places.
   Fixed to stay `null`. 4 new regression tests
   (`tests/marketDataVolumeNull.test.js`), including one proving a real
   zero volume is still correctly preserved as `0` (the fix is
   null-vs-zero, not "always null").
2. **Documentation accuracy** — `LIVE_FEED_AUDIT.md`/`LIVE_ENGINE_DESIGN.md`
   claimed `oiChange` is "always candle-derived, never a live-tick
   field." Independently re-verified against current code and found
   inaccurate (the current-period OI term can be WS-tick-sourced).
   Corrected in both files — a documentation fix, zero behavior change.
3. **Significant disclosure gap** — no field anywhere stated that
   backtest/live "net P&L" excludes STT/exchange charges/GST/SEBI fees/
   stamp duty. Fixed via `dataQuality.tradingCostModelNote`
   (`services/professionalBacktestService.js`), surfaced in
   `BacktestSummary.jsx`'s existing disclosure panel and appended to
   `LiveActivationForm.jsx`'s pre-activation banner. 1 new backend
   assertion + 2 new frontend tests.

**New integration test** (`backend/tests/fullPlatformIntegration.test.js`,
6 steps, all passing): the single test chaining strategy creation →
backtest → persisted result → strategy edit (proves the original
result's `strategyVersionId` is unchanged and v1's definition is
byte-identical after v2 is created) → live activation of that exact
version → live signal generation from the same entry rule the backtest
used → alert-configuration creation and processing → a de-duplicated
`Notification`, with a second processing pass proving no duplicate is
ever created. Uses in-memory fakes throughout (no live MongoDB), axios
mocked at the network boundary for candle data (no live Upstox) — same
conventions as every other integration test in this codebase.

**Full regression:** Backend 302/302 passing (37 files, `npm test`).
Frontend 79/79 real tests passing (14 suites; `src/App.test.js`'s
pre-existing `Cannot find module 'react-router/dom'` failure,
BLOCKER-004, re-confirmed identical and isolated — not hidden, not
"fixed," not a regression). Production build compiles clean, zero
warnings.

**What was explicitly NOT independently verifiable in this environment**
(stated honestly per the milestone's own instruction, not glossed over):
comparing live/historical candles or indicator values against an
authoritative external data provider (no live Upstox API credentials
anywhere in this environment — this has been a constant, repeatedly-
reaffirmed constraint since the Phase 2.0 audit); real production
behavior of the Upstox WebSocket feed (BLOCKER-003, unchanged); whether
MongoDB Atlas transactions are actually available/configured in the
production deployment (relevant to BLOCKER-005's long-term resolution,
not this session's scope).

**Pre-deployment gate (Phase 3) — assessed as PASS:**
- Critical security/data-integrity defects: none found; the two defects
  found (volume fabrication, cost-model disclosure gap) were fixed with
  regression tests and verified via full-suite reruns.
- All automated tests rerun and accurately reported: yes (above).
- Critical financial-calculation tests pass: yes — hand-verified to the
  penny, not just "tests green."
- Production builds complete successfully: yes, both before and after
  every fix.
- Frontend/backend API contracts compatible: yes — no contract changes
  this session beyond the additive `runtimeId` filter (ADR-018, already
  shipped in "Workstream L") and the additive `tradingCostModelNote`
  field (never a breaking change to any existing field).
- Environment variables/hosting configuration understood: yes — see
  deployment section below.
- No credentials/secrets exposed: confirmed (security spot-check above).
- Database schema/index changes: none this session (all models from
  prior workstreams unchanged; the two code fixes touch computation
  logic, not schemas).
- Remaining limitations clearly documented and won't mislead manual
  testers: yes — this was the central fix of this pass (BLOCKER-007's
  disclosure), plus every other known limitation (BLOCKER-001/003/005)
  remains accurately described in `BLOCKERS.md`/`PROGRESS.md` and, where
  user-facing, in the UI itself (signal-vs-fill wording, no-real-broker-
  order banners, cost-model disclosure, "not guaranteed complete" signal
  history).

Gate passed — proceeding to deployment (Phase 4).

Commits: backend `06ef911`, frontend `096ff4e` (both verification-pass
fixes, stacked on every prior commit).

**Phase 4 — Deployment.** Pushed (fast-forward, no force) to the
existing configured production branches:
- Backend: `git push origin main` on `github.com/Justakap/
  markfinancebackend` → `34b4ff5..06ef911` (15 commits spanning the
  entire A→F/J/K/"L"/verification-pass arc, all previously reviewed and
  committed across this engagement — nothing new beyond what's recorded
  above).
- Frontend: `git push origin main` on `github.com/Justakap/markfinance`
  → `94d83de..096ff4e` (6 commits).
- Both repos' production branch (`main`) is connected to auto-deploy
  (Render for the backend, Netlify for the frontend) per `CLAUDE.md` —
  no manual trigger exists or was needed beyond the push itself. No CLI/
  API credentials for either platform were available in this
  environment, so build-log-level confirmation was not possible; deploy
  success was instead verified directly against the hosted endpoints
  (Phase 5, below) after an appropriate wait.

**Phase 5 — Hosted verification.** Everything checked here is
unauthenticated (no live Google/Firebase test account was available in
this environment) — this section proves the deploy itself landed
correctly; it does NOT substitute for a human manually exercising the
logged-in workflows, which is the actual stated purpose of this
deployment.

| Check | Result |
|---|---|
| Backend health (`GET /api/health`) | `{"ok":true,"database":"connected"}`, HTTP 200 |
| New backend routes exist in production (`GET /api/v2/live`, `GET /api/v2/alert-configurations`) | HTTP 401 ("Unauthorized"), **not** 404 — proves the just-pushed route code (not a stale prior deploy) is what's actually running |
| Frontend root loads | HTTP 200 |
| Frontend SPA deep-link/refresh fallback (`/workspace/live` loaded directly, not via in-app navigation) | HTTP 200 — Netlify's `_redirects` SPA fallback confirmed working for the new route |
| Login page loads | HTTP 200 |
| **Deployed bundle genuinely contains this session's new code** (not a cached/stale build) | Confirmed by downloading the live JS chunks and grepping for strings that only exist in code written this session: `"Activate Live Strategy"` (LiveActivationForm.jsx) and `"Enable browser notifications"` (NotificationsPage.jsx) — both found in the live, hosted bundle |
| Frontend calls the correct, non-obsolete backend URL | Every embedded backend-URL reference across every deployed JS chunk is `markfinancebackend1.onrender.com` — the obsolete `markfinancebackend.onrender.com` (no "1") string does not appear anywhere in the deployed bundle |
| CORS — real origin allowed | `Origin: https://markfinance.netlify.app` → `access-control-allow-origin: https://markfinance.netlify.app` echoed back |
| CORS — untrusted origin rejected | `Origin: https://evil-example.com` → no `access-control-allow-origin` header at all (correctly not allowed) |
| No real broker orders placed | Trivially true — zero write/mutating requests were made against production during this verification (only GETs/health/CORS-preflight-style checks); no code path in this platform places real orders regardless |
| No production data mutated | Confirmed — no POST/PUT/DELETE requests were issued against the production backend during this session's hosted verification |

**NOT verified against the hosted deployment** (requires a real
authenticated user session this environment cannot provide — stated
honestly, not assumed to work): the actual login flow through Firebase;
strategy list/create/edit/version-history; backtest submission, result
retrieval, chart rendering, trade pagination; the live-strategy
dashboard, activation/deactivation against a real instrument; alert-
configuration CRUD; notification read/unread/pagination; browser
console/network inspection during an authenticated session. **These are
exactly the areas the user should manually test first** — see the final
report's manual-testing steps.

---

## 2026-10-18 — Grid Trading Simulator: final audit, push, deploy verification

**Phase 1 — Independent adversarial audit** (separate sub-agent review,
not the same pass that wrote the code). Found and fixed one real bug
(trade-ledger `sequence` collision across multi-trade gap events — see
PROGRESS.md's dated entry for full detail) plus two lower-severity
issues (client-timestamp trust on the tick endpoint; a missing try/catch
around the feed poll's bulk price-warm call). Three non-issues confirmed
by the same review: `marketDataService.subscribe()` is never called
anywhere in the new code (grep-confirmed); holdings can never go
negative; `annotateRunningState` correctly replays mixed BUY/SELL
sequences.

**Phase 2 — Live verification against the real local backend + the
real (shared, production) Atlas MongoDB**, per `backend/CLAUDE.md`'s own
stated pattern for this repo (disposable test user/data, cleaned up
after). Used a real minted JWT (not a mocked request) against the real
locally-running server, including a genuine process kill-and-restart
between the two test halves (not simulated):

| Check | Result |
|---|---|
| Full lifecycle via real HTTP API (create → start → tick → pause → resume → stop) | All correct |
| Genuine backend process restart mid-session | State (holdings/cash/avgCost/lock/trade history) survived intact, confirmed by direct Mongo read and by the API after restart |
| Real concurrent `Promise.all` double-tick at the same crossing | At most one fill landed (MongoDB's own atomic `findOneAndUpdate`, not an in-process assumption) |
| Repeated identical price (no crossing) | Zero trades, no duplicate fill |
| Cannot restart a STOPPED session | 409, correctly terminal |
| Duplicate active-session rejection, lifted once STOPPED | 409 then 201, correctly |
| Ownership isolation (second user) | 404 on both GET and tick |
| Invalid config / unauthenticated request | 400 / 401, not 500/404 |
| Financial figures | Independently hand-recomputed from the raw fill log (cash/holdings/avgCost at every step) — matched the server's output exactly |
| Cleanup | All test artifacts (2 users, 2 sessions, their trades) deleted; confirmed zero leftover documents afterward |

Unplanned but valuable: the test session's own 5s poll loop kept
evaluating it against REAL live Upstox GICRE quotes throughout the test
window (including across the literal restart), producing a genuine
`gapFill: true` multi-trade event from real market data — this
incidentally proved the gap-fill path, the sequence-collision fix (no
collisions across that real event), and restart recovery all work
against production data, not just mocks.

**Phase 3 — Final test/build re-run after fixes.** Backend: full suite
passing (`npm test`, exit 0, includes 4 new regression tests this
audit). Frontend: 102/102 real tests passing (`src/App.test.js`'s
pre-existing BLOCKER-004 failure confirmed still isolated, unrelated).
Both production builds (`CI=true npx react-scripts build` / backend
`node -c app.js`) confirmed clean.

**Phase 4 — Push.** Both repos reviewed for diff scope (no secrets, no
unrelated files) before pushing — ordinary fast-forward, no force:
- Backend: `bc4d577..681cab1` on `github.com/Justakap/markfinancebackend`.
- Frontend: `c310114..6e31be2` on `github.com/Justakap/markfinance`
  (includes two earlier same-session commits already reported: the
  Stock Analysis table virtualization fix and the Grid Simulator feature
  itself/Validation-Metrics nav removal).

**Phase 5 — Hosted verification** (unauthenticated — no live Google/
Firebase test account available in this environment):

| Check | Result |
|---|---|
| Backend health (`GET /api/health`) | `{"ok":true,"database":"connected"}`, HTTP 200 |
| New route exists in production (`GET /api/v2/grid-simulator/sessions`) | HTTP 401 ("Unauthorized"), **not** 404 — the just-pushed route code is what's running |
| Frontend root loads | HTTP 200 |
| Frontend SPA deep-link (`/workspace/grid` loaded directly) | HTTP 200 — Netlify's `_redirects` SPA fallback works for the new route |
| Deployed bundle genuinely contains this audit's code | Downloaded every chunk listed in the live `asset-manifest.json` (32 files) and grepped: `"PAPER TRADING ONLY"` found in 3 chunks, grid-simulator markers (`"never places a real broker order"`, `"Grid Trading Simulator"`, `"grid-simulator"`) found across 14 chunks |
| Frontend calls the correct backend URL | `markfinancebackend1.onrender.com` present in the main bundle; the obsolete no-"1" URL does not appear anywhere |
| CORS — real origin allowed | `Origin: https://markfinance.netlify.app` → echoed back correctly |
| CORS — untrusted origin rejected | `Origin: https://evil-example.com` → no `access-control-allow-origin` header |
| No real broker orders placed | Trivially true — zero mutating requests against production during hosted verification (only GET/health/CORS checks); the disposable-test-user lifecycle test in Phase 2 ran against the LOCAL server, not production, and was fully cleaned up |
| No production data mutated by this hosted check | Confirmed — GET-only against the live deployment |

**NOT verified against the hosted deployment**: the actual logged-in
browser workflow (create/start/pause/resume/stop a session through the
real UI, watch the chart/ledger update, see stale-feed warnings) — no
Firebase/Google OAuth test credentials in this environment. This is
exactly what the user should manually test first; see the final report.
