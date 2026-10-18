# LIVE-FEED READINESS AUDIT (Workstream B, Historical Candle Chart milestone)

Read-only audit performed 2026-10-09 against `backend/services/marketDataService.js`
(1481 lines, re-read in full this session — not assumed from the Phase 2.0
audit's conclusions, per this milestone's explicit "treat actual code as
authoritative" instruction) and `backend/services/strategyScanService.js`.
**No code in this file's subject area was changed.** No Render/MongoDB/Upstox
production credentials are available in this environment — nothing below
claims to confirm production status; every claim is scoped to what the
current source code does, with "unconfirmed in this environment" stated
explicitly wherever that's the honest answer.

Per the milestone's explicit instruction: the user has reported the
production feed delivered LTP/OI/OI-change continuously for ~60 days. This
audit does not assume the feed is broken, and does not contradict that
report — it only documents what the code *would do* in various scenarios,
since that's all that's verifiable from here.

## 1. Source of each live field

| Field | Primary source | Fallback | Notes |
|---|---|---|---|
| `ltp` (last traded price) | Upstox WebSocket feed (`decodeFeed` → `extractLtpcFromFeedItem`) | REST `GET /v3/market-quote/ltp` poll (`warmLiveQuotes`), only while the socket is disconnected | `isValidLtp()` gates every assignment — never silently accepts 0/negative/non-finite as real |
| `changeAmount`/`changePercent` | Derived from WS `ltp`/`cp` (close price) in `decodeFeed` | Derived from REST poll's `ltp`/`cp` in `warmLiveQuotes` | Same derivation formula in both places |
| `volume` | WS `marketFF.vtt` (total-day volume, explicitly not `ltq`) | REST poll's `quote.volume`; falls further back to the last daily candle's volume in `buildRow` | |
| `vwap` | WS `ltpc.atp`/`marketFF.atp` | `computeIndicatorsFromBundle`'s own candle-derived VWAP (`instrumentIndicatorBundle.js`), used preferentially in `buildRow` when available | `buildRow` actually prefers the indicator-bundle VWAP over the live WS value — the live value is a secondary fallback, not primary, for this one field |
| `delta`/`gamma`/`theta`/`vega`/`iv` (option Greeks) | **WS feed only** (`extractGreeksFromFeedItem`) | **None** — no REST source anywhere in this codebase | These five fields hard-depend on the WS socket being connected; they stay `null` indefinitely if the socket never connects, regardless of REST fallback activity |
| `oi` (open interest) | Live WS tick (`greeks.oi` from `marketFF.oi`) | Last daily candle's `oi` field (candle data, via `candleService`) | Confirmed independent of the WS feed for its fallback path — this matches the already-documented frontend change history note that OI/OI-change are "sourced from candle data, independent of the Upstox WS feed" |
| `oiChange` | **Corrected 2026-10-09 (verification-pass audit)**: computed as `openInterest - prevOpenInterest`, where `prevOpenInterest` IS always candle-derived (`previousOiCandle.oi`, strictly from `candleService`), but `openInterest` (the current-period term) prefers `live.oi` — a genuine WS-tick field — before falling back to `lastCandle.oi` (`services/marketDataService.js`, `buildRow`). | The previous-period term is candle-only; the current-period term can be WS-tick-sourced. | The original claim here ("oiChange is never a live-tick field... always derived from two daily candles") was **inaccurate** and has been corrected following direct code re-verification. `oiChange` is a hybrid: a live-tick-sourced current OI minus a candle-sourced prior-day OI, whenever a live OI tick is present. This does not change any behavior — the fix was to the documentation, not the code — but any future reasoning about this field's trustworthiness should treat it as "mostly live, prior-day term always candle-derived," not "always candle-derived." |
| `rsi`, EMA/SMA/MACD/etc. | Indicator-bundle computation over cached candle series (`computeIndicatorsFromBundle`), re-primed with the current live `ltp` as a synthetic latest bar | N/A | Not a WS field at all — these are always computed server-side from candles, with the live LTP merged in as the (possibly in-progress) latest bar |

## 2. WebSocket connection lifecycle

- **Protocol:** Upstox V3 feed, protobuf-encoded (`proto/MarketDataFeedV3.proto`), authorized via `GET https://api.upstox.com/v3/feed/market-data-feed/authorize` (Bearer token), which returns a one-time signed WebSocket URL (`authorizedRedirectUri`). The code explicitly does **not** attach the Bearer header to the WS connection itself — the comment at `connectFeed()` states doing so causes a 403, i.e., the WS URL's own embedded credentials are the only auth the socket connection uses.
- **Reconnect:** `ws.on("close", ...)` and the catch block around `connectFeed()` both call `scheduleFeedReconnect()`, which retries unconditionally after a **fixed** `UPSTOX_WS_RECONNECT_MS` (default 5000ms) — there is no exponential backoff, no jitter, and no maximum retry count. If Upstox is down or rejecting connections, this reconnect loop runs forever at a flat 5s cadence. This is a real design gap worth knowing about but is not touched this milestone (explicitly out of scope — "do not rewrite the WebSocket service").
- **Resubscription on reconnect:** `ws.on("open", ...)` calls `sendGroupedSubscriptions([...subscribedInstruments], "sub")` — every currently-subscribed instrument (module-level `Set`, survives across reconnects since it's not reset on close) is automatically resubscribed. Subscriptions are not persisted across a process restart (in-memory `Set`), only across a single process's socket reconnects.
- **REST fallback:** `startLtpPollLoop()` runs every `UPSTOX_LTP_POLL_MS` (default 2000ms) and explicitly no-ops (`return`) whenever `socketConnected && ws?.readyState === WebSocket.OPEN` — i.e., REST polling is strictly a fallback for LTP/change/volume only while the socket is down, never a redundant parallel path. Confirmed by reading the function directly, not assumed.
- **Status reporting:** `getRowsForWatchlist()` reports one of three labels to the frontend: `"Upstox Live (WebSocket)"` (socket connected), `"Upstox Live (REST)"` (socket down but instruments are subscribed, REST poll active), or `"Waiting for instruments"` (nothing subscribed yet). This is the only live signal of socket health exposed to the frontend; there is no separate "last successful tick timestamp" or staleness indicator surfaced anywhere in the API response.

## 3. Authentication / token-expiry handling

- `getAccessToken()` reads `process.env.UPSTOX_ACCESS_TOKEN` (or legacy `UPSTOX_TOKEN`) fresh on every call — there is **no in-process token refresh, no refresh-token flow, and no expiry-aware retry logic anywhere in this codebase** (confirmed via a full-repo grep for `refresh_token`/`refreshToken`/token-expiry handling — zero matches outside this audit). The token is a static value the backend process never attempts to renew.
- A token rejected by Upstox (401/403 on the authorize call, or an abrupt socket close after a stale token) is handled only generically: `connectFeed()`'s catch block logs the error and schedules a flat 5s reconnect, which will retry with the **same** (still-invalid) token indefinitely until the env var is manually rotated and the process restarted/env reloaded. There is no alerting, backoff escalation, or distinct handling for "token is invalid" versus "network blip" — both look identical to this code.
- This matches the already-tracked `BLOCKER-003` conclusion (Upstox tokens are known to require periodic reissue outside this codebase's control) — nothing new was found here that changes that blocker's status, but this audit independently re-confirms the absence of any refresh mechanism by reading the current code rather than relying on the prior audit's memory of it.

## 4. What is / is not verifiable in this environment

**Verifiable from source code alone (done in this audit):**
- Exact field-sourcing precedence for every live/derived value (table above).
- Exact reconnect/fallback control flow and its parameters.
- Absence of any token-refresh mechanism.
- That `strategyScanService.js` (the existing live-strategy-scan feature) does **not** read `liveData`/WS ticks directly — it evaluates against `candleService`/`instrumentIndicatorBundle`-derived indicator rows (via `backtestEngine.js`'s shared indicator-resolution helpers), meaning today's live scanning is already architected around candle-cadence data, not raw tick-by-tick WS pushes. The WS feed's practical contribution to the *existing* scan feature is limited to keeping `ltp`/`oi` reasonably fresh as an input to that candle-based evaluation, not driving evaluation timing itself.

**Not verifiable in this environment (no production credentials/log access):**
- Whether the production Upstox WebSocket is currently connected, has ever successfully connected on Render, or is the one actually serving the ~60-day LTP/OI continuity the user reported. The user's report is taken at face value and not contradicted — but this code audit alone cannot independently confirm it, since confirming it would require live production logs or a live token to test with, neither of which exist here.
- Whether `UPSTOX_ACCESS_TOKEN` as currently configured in Render is fresh, near expiry, or was rotated recently.
- Actual observed latency/tick-rate of the production feed, or how often it has silently fallen back to REST polling in practice (the status label exists but nothing persists its history).

## 5. Which fields are trustworthy for live strategy evaluation today

- **Trustworthy regardless of WS state:** `rsi`/EMA/SMA/MACD/VWAP-from-indicator-bundle, `oiChange` — all candle-derived, refreshed on a ~15s cadence (`INDICATOR_BUNDLE_MAX_AGE_MS`/`startIndicatorRefreshLoop`) independent of the WS connection.
- **Trustworthy with either WS or REST fallback active:** `ltp`, `changeAmount`/`changePercent`, `volume`, `oi` (falls back to the last daily candle if the WS tick is stale/absent).
- **Trustworthy only if the WS socket is actually connected, with no fallback at all:** `delta`/`gamma`/`theta`/`vega`/`iv`. A live strategy engine (Workstream C) that wants to evaluate a condition against any option Greek must treat a disconnected socket as "this field is unavailable," not substitute a stale or candle-derived value — none exists to substitute.
- **Never a true "live tick" field despite its name:** `oiChange` — it's a once-per-day-boundary candle delta, not a running intraday change. A live engine should not expect it to update faster than once per trading day.

## 6. How a future live strategy engine should consume normalized live updates

See `LIVE_ENGINE_DESIGN.md` (Workstream C) for the full proposal. In short:
a normalization layer should sit between `marketDataService`'s raw
tick/REST/candle sources and any new evaluation logic, producing one
`MarketSnapshot` per instrument per update with an explicit
`source: "websocket" | "rest" | "candle"` tag per field (not just per
snapshot) — because, per the table above, different fields on the *same*
snapshot can legitimately come from different sources simultaneously (e.g.
`ltp` from REST while `rsi` is candle-derived and `delta` is stale-`null`
because the socket is down). Collapsing that into one coarse status label
(as `getRowsForWatchlist()` does today) would hide exactly the
per-field trust distinctions this audit found.
