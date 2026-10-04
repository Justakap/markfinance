# CLAUDE.md — MarkFinance Frontend

This file is persistent context for any Claude Code session working in this
repository. Read it fully before making changes, especially before touching
authentication, routing, or the API/Socket.IO layers.

## Project Overview

MarkFinance is a stock-market analysis, strategy-building, and backtesting
web application. Users track watchlists of NSE/BSE (and some F&O) instruments,
build rule-based strategies, scan watchlists against those strategies, and
run historical backtests — all backed by live and historical data from
Upstox via the backend API.

## Repository

This repository (`markfinance`) is the **frontend only**: a React 19 / Create
React App single-page app. The backend lives in a separate repository,
`markfinancebackend` (see Repository URLs below). There is a `backend/`
directory inside this working tree in some local checkouts — that is its own
independent git repository (separate remote, separate history), not part of
this one. Do not assume changes here are reflected there or vice versa.

## Architecture

- **Framework:** React 19, Create React App (`react-scripts`), no TypeScript.
- **Routing:** `react-router-dom`, all routes defined in `src/App.js`. Public
  routes: `/` (landing), `/login`. Everything else is wrapped in
  `<ProtectedRoute>` (`src/components/ProtectedRoute.jsx`, redirects to
  `/login` if `localStorage` lacks both `user` and `token`).
- **Code splitting:** every route behind `ProtectedRoute` (`Dashboard`,
  `StockAnalysis`, `GreekPage`, `Strategies`, `BacktestPage`,
  `BacktestsPage`, `SettingsPage`, `ValidationPage`, `MetricsPage`) is
  `React.lazy()`-loaded inside a single `<Suspense>` boundary in `App.js`.
  `LandingPage` and `LoginPage` stay eager since logged-out visitors need
  them immediately. This cut the initial JS bundle from ~525 kB gzip to
  ~146 kB gzip — don't revert it without re-measuring
  (`CI=true npx react-scripts build`, compare `File sizes after gzip`).
- **Auth:** Firebase Google OAuth. No backend-side Firebase integration — the
  backend only ever receives `{uid, name, email, photoURL}` after the
  frontend has already completed the Firebase sign-in.
- **API layer:** `src/config/api.js` exports `API_URL` from
  `REACT_APP_API_URL` (throws if unset — fails fast rather than silently
  defaulting). `src/utils/api.js` exports `apiFetch(path, options)` (fetch
  wrapper, attaches `Authorization: Bearer <token>`, throws on non-2xx with
  `.status`/`.data`) and `setupAxiosAuth()` (sets
  `axios.defaults.headers.common.Authorization` + installs a 401
  interceptor). Both `apiFetch` and the axios interceptor call the same
  `handleUnauthorized()` on any 401: clears session, redirects to `/login`.
  **Use `apiFetch` for new authenticated calls** — some older call sites use
  raw `axios.get/post/put/delete` with `${API_URL}` directly and rely on
  `setupAxiosAuth()` having been called at app startup (`src/index.js`) and
  again after login (`LoginPage.jsx`); that still works but isn't the
  preferred pattern going forward.
- **Socket.IO:** `src/utils/socket.js` — a module-level singleton client
  (`getMarketSocket()`), auto-reconnecting, pointed at `API_URL`. Components
  subscribe via `onMarketTick(callback)` (returns an unsubscribe function —
  always call it in a `useEffect` cleanup). `onBatchedStockUpdates`/
  `onStockUpdate` also exist but the backend does not currently emit that
  event — see the backend's `CLAUDE.md` "Important API Rules". Don't assume
  they're live.
- **Major pages:** `LandingPage`, `LoginPage`, `Dashboard`, `StockAnalysis`
  (main live watchlist table), `GreekPage` (options Greeks table),
  `Strategies` (strategy builder/list), `BacktestPage` (run a backtest),
  `BacktestsPage` (backtest history), `SettingsPage` (profile/logout),
  `ValidationPage`/`MetricsPage` (dev-only, gated by
  `REACT_APP_VALIDATION_MODE`/`NODE_ENV`).
- **Major components:** `StockTable`/`StockTableRow` (live watchlist grid),
  `GreekTable`/`GreekTableRow`, `WatchlistSelector` (watchlist CRUD UI),
  `StockSearchDropdown` (Upstox instrument search), `StrategyModal`/
  `StrategyResultsModal`, `TableExportMenu` (xlsx/PDF export), `MainLayout`/
  `Sidebar` (app shell).

## Production

- Frontend: https://markfinance.netlify.app
- Backend: https://markfinancebackend1.onrender.com (Render free tier — expect
  a ~20-30s cold start after idle on the first request; this is a platform
  characteristic, not a frontend bug)

## Repository URLs

- Frontend: https://github.com/Justakap/markfinance
- Backend: https://github.com/Justakap/markfinancebackend

## Authentication

Flow: **Firebase Google OAuth → backend verification/JWT → frontend
session.**

1. `LoginPage.jsx` calls `signInWithPopup(auth, googleProvider)` (Firebase).
2. On success, it POSTs `{uid, name, email, photoURL}` to
   `${API_URL}/api/auth/google` (raw `fetch`, not `apiFetch`, since there's no
   token yet).
3. Backend upserts the user and returns `{success, user, token}`. The
   frontend stores `token` and a `user` object (`{uid, mongoId, name, email,
   photoURL}`) in `localStorage`, then calls `setupAxiosAuth()`.
4. Every subsequent protected request attaches `Authorization: Bearer
   <token>` — automatically via `apiFetch`, or via the axios default header
   set in step 3/at app startup for older call sites.
5. **Where auth lives:** `localStorage` keys `user` and `token`. Checked by
   `isLoggedIn()` (`src/utils/auth.js`) and `ProtectedRoute`.
6. **401 handling:** any 401 from either `apiFetch` or axios triggers
   `handleUnauthorized()` (`src/utils/api.js`) — clears `user`/`token`/
   `selectedWatchlist` from `localStorage`, deletes the axios auth header,
   and redirects to `/login` (unless already there). This is global — don't
   add a second, competing 401 handler per page; per-page `error.status ===
   401` messages (e.g. in `StockAnalysis.jsx`) are just a friendlier message
   shown in the brief moment before the redirect fires, not the primary
   handling mechanism.
7. **Logout:** `SettingsPage.jsx`'s `handleLogout` — calls Firebase
   `signOut(auth)`, then `clearSession()` (`src/utils/auth.js`, clears the
   same three `localStorage` keys), then clears the axios header and
   navigates to `/login`. If you add another logout entry point, reuse
   `clearSession()` rather than duplicating the `localStorage.removeItem`
   calls.

## Market Data

- Historical/initial data for a watchlist comes from `GET
  /api/market-data/:watchlistId` (`apiFetch`).
- Live updates come from Socket.IO's `marketTick` event
  (`onMarketTick(callback)` in `src/utils/socket.js`) — merge incoming ticks
  into existing state by `instrumentKey`/`symbol` (see `mergeMarketTick`
  usage in `StockAnalysis.jsx`), don't replace the whole array.
- The backend has its own request queue, deduplication, caching, and 429
  retry/backoff for Upstox calls — the frontend doesn't need to (and
  shouldn't) implement its own retry logic for market-data calls; a 429 from
  the backend means the backend's own retry budget was already exhausted,
  so just surface the message and let the user retry manually (this is the
  existing pattern in `StockAnalysis.jsx`/`GreekPage.jsx`).

## Security Rules

1. Always use `apiFetch` (or axios with `setupAxiosAuth()` already called)
   for authenticated requests — never a bare `fetch()` against a protected
   endpoint, since it won't carry a token (this was a real bug fixed in this
   hardening pass: `Dashboard.jsx` and `WatchlistSelector.jsx` were both
   calling `requireAuth`-protected routes with no Authorization header at
   all).
2. Never hardcode the backend URL — always go through `API_URL`
   (`src/config/api.js`), which reads `REACT_APP_API_URL`. Production
   (Netlify) sets this to `https://markfinancebackend1.onrender.com` via
   `netlify.toml`; local dev uses `.env.local` (see `.env.example`).
   Hardcoded `localhost:5001` strings were previously used in a couple of
   user-facing error messages — removed; don't reintroduce them.
3. Never hardcode Firebase credentials as a fallback in source —
   `src/firebase.js` fails fast (throws) if any `REACT_APP_FIREBASE_*` env
   var is missing at build time, rather than silently falling back to a
   checked-in value. Firebase web API keys aren't secret in the traditional
   sense (they're restricted by Firebase Auth domain allowlisting, not
   confidentiality), but don't go back to embedding them as a source-level
   fallback — fail loud instead.
4. Don't swallow errors silently in new code — at minimum
   `console.error` them; prefer surfacing a user-facing message via the
   existing toast helpers (`src/utils/toast.js`) or page-level error state.
5. If you add a new raw `fetch()`/`axios` call to a protected endpoint,
   either use `apiFetch` or confirm the axios default auth header is already
   installed for that code path — don't assume.

## Important API Rules

See the backend's `CLAUDE.md` "Important API Rules" for the authoritative
list of endpoints/shapes. Key things to remember on this side:

- `GET /api/watchlists?userId=...` — the `userId` query param is accepted by
  the backend but ignored (response is always scoped server-side to the
  authenticated user); keep sending it for now since some call sites still
  do, but don't rely on it for anything.
- Socket.IO: only listen for `marketTick`. `onBatchedStockUpdates`/
  `onStockUpdate` exist in `socket.js` but nothing is currently emitted on
  that event name from the backend — don't build new features on them
  without first adding the corresponding backend emit and confirming the
  payload shape.
- `POST /api/backtest/run` is rate-limited server-side (10/min) — a 429 here
  is expected under rapid repeated clicks, not a bug; the existing error
  handling in `BacktestPage.jsx` already surfaces the backend's message.

## Environment Variables

Names only — see `.env.example` for the full list, never commit real values:

- `REACT_APP_API_URL` — backend base URL (production:
  `https://markfinancebackend1.onrender.com`, local dev:
  `http://localhost:5001`)
- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`
- `REACT_APP_VALIDATION_MODE` — `"true"` enables the dev-only
  `/validation` and `/metrics` routes outside of `NODE_ENV=development`

Production values for the `REACT_APP_FIREBASE_*` vars and `REACT_APP_API_URL`
are set in `netlify.toml`'s `[build.environment]` block — Firebase web config
is not secret (it's restricted by Firebase Auth domain allowlisting, not
confidentiality), but still shouldn't be duplicated as a source-level
fallback (see Security Rules above).

## Development

```bash
npm install            # install dependencies
npm start               # CRA dev server (http://localhost:3000)
npm test                 # CRA test runner (react-scripts test)
npm run build             # production build to build/
```

Requires a `.env.local` with at least `REACT_APP_API_URL` and the Firebase
vars (see `.env.example`) — the app throws at import time if any are
missing.

## Testing

- CRA's default `src/App.test.js`/`src/setupTests.js` scaffolding exists but
  this project does not have meaningful component/unit test coverage beyond
  that. The primary verification method used in this hardening pass was:
  production build success (`CI=true npx react-scripts build`, checking for
  compile errors/warnings) plus manual integration testing against a live
  local backend. If you add frontend tests, `react-scripts test` is already
  wired up.

## Deployment

- **Frontend → Netlify**, auto-deploys from this repository's `main` branch
  (`netlify.toml` defines the build command/publish dir and injects build-time
  env vars). This repository does not control the backend's Render
  deployment.
- Netlify's `_redirects` (in `public/` and `build/`) handles SPA routing
  fallback (`/* → /index.html`).

## Git Workflow

1. Always inspect `git status`, `git branch`, and `git log` first.
2. Never discard existing uncommitted changes without understanding them —
   they may be another session's or the user's in-progress work. (At time of
   writing, several pages/components had substantial uncommitted changes
   from a prior session/refactor — e.g. `BacktestPage.jsx`, `StockTable.jsx`,
   `LandingPage.jsx` — that predate and are unrelated to the security
   hardening work. Don't assume everything in `git diff` is yours.)
3. Never force-push.
4. Never `git reset --hard` unless explicitly requested.
5. Never commit secrets (there generally shouldn't be any in this repo —
   Firebase web config isn't secret, but double-check `.env*` files are
   still gitignored before committing).
6. Review `git diff` (and `git diff --staged`) before committing.
7. Run `npm run build` before committing anything that touches routing,
   imports, or the API layer.
8. Make focused commits — don't bundle unrelated changes.
9. Use descriptive commit messages.
10. Push only after the build passes and the diff has been reviewed.
11. Never modify the backend repository from here, or vice versa — even
    though a `backend/` directory may exist locally as a separate checkout.
12. Check the current branch before committing (`main` is the deploy branch
    here).
13. Keep frontend and backend commits in their own repositories — never mix
    them into one commit.

## Current Technical Debt

- **`xlsx@0.18.5`** (used only in `src/components/TableExportMenu.jsx` for
  *writing* `.xlsx` exports) has known prototype-pollution/ReDoS advisories
  with no fixed version available. The known attack vectors require
  *parsing* untrusted spreadsheet input, which this app never does (it only
  writes its own already-trusted data) — left in place rather than removing
  a working export feature, but don't add any code path that parses
  user-uploaded `.xlsx` files with this library without re-evaluating.
- **No meaningful automated test coverage** beyond CRA scaffolding (see
  Testing above).
- **Netlify free-tier builds**/Render free-tier cold starts are platform
  characteristics, not bugs — don't "fix" cold start latency by adding
  frontend retry loops; it resolves itself within ~30s.
- Several pages (`BacktestPage.jsx`, `StockTable.jsx`, etc.) are large,
  pre-dating this hardening pass; no structural refactor was done on them
  here (out of scope for a security/reliability pass, and they had
  unrelated in-progress changes already).

## Change History / Context

### 2026-10-05 — Security & reliability hardening pass (frontend side)

- Fixed two real auth bugs: `Dashboard.jsx` and `WatchlistSelector.jsx` were
  calling `requireAuth`-protected backend routes with raw, unauthenticated
  `fetch()` — converted both to `apiFetch`.
- Added global 401 handling (`handleUnauthorized()` in `src/utils/api.js`,
  wired into both `apiFetch` and an axios response interceptor) — any 401
  now clears session and redirects to `/login` from anywhere in the app.
- Added `clearSession()` (`src/utils/auth.js`) and pointed `SettingsPage.jsx`
  logout at it instead of duplicating `localStorage.removeItem` calls.
- Removed the hardcoded Firebase credential fallback in `src/firebase.js` —
  now fails fast on missing env vars, matching `src/config/api.js`'s
  existing pattern.
- Removed hardcoded `localhost:5001` strings from user-facing error messages
  in `StockAnalysis.jsx` and `GreekPage.jsx`.
- Added `AbortController`-based cleanup to `Dashboard.jsx`'s fetch effect.
- Deleted confirmed-dead files: `src/pages/StockDetails.jsx`,
  `src/components/WatchlistDropdown.jsx` (both empty/unused),
  `src/components/Navbar.jsx` (fully superseded by `MainLayout`, unused).
- Implemented route-based code splitting (`React.lazy`/`Suspense` in
  `App.js`) for every page behind `ProtectedRoute` — initial gzip bundle
  dropped from ~525 kB to ~146 kB, verified via a production build
  before/after comparison.
- Ran `npm audit fix` (non-breaking) — resolved what could be resolved
  without forcing a breaking `react-scripts`/CRA tooling downgrade; remaining
  advisories are either dev-only CRA tooling dependencies or `xlsx` (see
  Technical Debt above).

### 2026-10-05 (later) — Corrected production backend URL

`netlify.toml`'s `REACT_APP_API_URL` was pointed at
`https://markfinancebackend.onrender.com`; the actual intended production
backend is `https://markfinancebackend1.onrender.com`. Both were found to
serve identical code/data at the time of this fix, so it wasn't
user-visible, but corrected so the deployed frontend points at the right
service going forward. If you ever see `markfinancebackend.onrender.com`
referenced anywhere (old notes, bookmarks), treat the `1` URL as
authoritative unless told otherwise.

### 2026-10-05 (later) — Fixed null-coerced-to-zero display bugs

`Number(null) === 0` but `Number(undefined) === NaN` — several places did
`Number.isFinite(Number(quote?.x ?? quote?.y))` to decide "do we have real
data," which silently treated genuinely-missing quote data as a real zero.
Confirmed live on production: the Greek page showed "0.00" for an
untraded option's Rate instead of "--". Same pattern affected
`StockTable`/`StockTableRow`'s 20-DMA Above/Below status and the RSI/price
"velocity" trend indicators (could show a wrong status instead of "--"
when price/EMA data was genuinely absent), plus both tables' export rows.

Added `toFiniteNumber()` (`src/utils/indicators.js` — returns `NaN` for
null/undefined instead of coercing to `0`) and used it everywhere this
isFinite-as-presence-check pattern appeared, in `StockTable.jsx`,
`StockTableRow.jsx`, `GreekTable.jsx`, `GreekTableRow.jsx`. If you add a
new quote-derived numeric field anywhere, use `toFiniteNumber()` for the
presence check rather than a bare `Number(...)` — don't reintroduce this.
Sort-value fallbacks (`?? 0` for tie-breaking) are a different, intentional
pattern and were left alone.

**Update this section whenever a future session makes a major
architectural or security change — don't let it go stale.**
