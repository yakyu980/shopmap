# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SuperNav AI ("the Waze of the supermarket") — a React/Vite PWA demonstrating a logical
store map, shopping list, and Nearest-Neighbor route optimization between departments,
backed by a local Express demo server. README.md (Hebrew) is the source of truth for
feature scope and what is real vs. mocked — read it before making claims about what's
implemented.

## Commands

Frontend (run from repo root):
```bash
npm install
npm run dev      # vite dev server
npm run build    # production build
npm run lint     # oxlint
npm run preview  # serve the production build (required to test offline/PWA — the service worker is inactive under `npm run dev`)
```

Server (separate package, run from `server/`):
```bash
cd server && npm install && node index.js   # listens on :8787
```

Both must run concurrently during development: `vite.config.js` proxies `/api` (dev and
preview) to `http://localhost:8787`. There is no test suite and no server lint script.
There is no single-test command — verify changes via `npm run lint` and manual exercise
of the affected feature.

## Architecture

### Client/server split and the offline guarantee

The app must keep working fully offline/local for an unauthenticated user, exactly as it
did before the server existed. The core shopping list (`useShoppingList.js`) is NOT
server-dependent. Every client call to the server is wrapped in a fallback to the
existing local/mock behavior if the server is unreachable (see `src/lib/apiClient.js` and
the `use*Sync`/`use*` hooks in `src/lib`). When adding a server-backed feature, preserve
this: local-first, server as an optional enhancement, never a hard dependency for core
flows.

The server (`server/`) is Express + a synchronous file-backed JSON "database"
(`server/db.js`, writes via `fs.writeFileSync` after every mutation) — deliberately not
SQLite/Postgres to avoid native-module build risk. It's a real shared HTTP server (not
`localStorage` in disguise) but is local-only/demo-scoped, not deployed. Routes live in
`server/routes/*.js`, one file per resource, mounted in `server/index.js` under `/api/*`.

Server-backed capabilities: auth (username/password, `crypto.scrypt`, opaque session
token — not JWT), household/family list sync across devices (shared family code, ~8s
polling, not realtime push), shelf-location updates with full change history, and shared
community verification ("found"/"not found"). Image recognition remains a declared mock
even server-side — only relocated, not replaced with real vision.

### External-store pattern for shared client state

Cross-cutting client state that many components must react to (store layout/departments,
family members, favorites) uses a consistent pattern: a plain module holding state +
pub/sub in `src/lib/*.js` (e.g. `storeConfig.js`, `familyMembers.js`, `favorites.js`),
paired with a `useSyncExternalStore`-based hook (e.g. `useStoreConfig.js`) so every
consumer (search, cart, navigation, AR, location check-in) reads from one source of
truth and updates immediately when it changes. Follow this pattern rather than lifting
such state into `App.jsx` or prop-drilling it.

### Tabs, not routes

`App.jsx` switches between 5 top-level views with plain `useState` — there is no router.
Views: Home (default — cart stats, family status, purchase predictions, shortcuts),
Store Map, Shopping List (search/voice-add/barcode+image scan/cart), Price Comparison
(today's deals + full catalog, opens the shared `ProductDetail` modal), Navigation. A
settings gear in the header opens a separate settings screen (account/auth, GPS
permission status, map reset, local data clear, and an in-app "what's real vs. demo"
disclosure) — keep that disclosure honest when adding/removing mocked features.

### Route optimization and navigation

`src/lib/route.js` computes the Nearest-Neighbor walking route across departments that
have list items, starting from the entrance; `reorderRemainingStops` re-routes the
remaining stops when a location report doesn't match the expected next stop. Location can
update three ways, all surfaced through one non-blocking `locationCard` UI (used in both
normal navigation and the AR camera screen): manual check-in
(`LocationCheckin.jsx`), an experimental step-counter distance estimate
(`useStepCounter.js`, `DeviceMotionEvent`), and real GPS
(`useGeolocationWatch.js` + `geoMatch.js`) matched against per-department coordinates
calibrated in the Store Map editor. Any of the three can trigger a re-route.

### Mock vs. real, and where the seams are

Several features are intentionally mocked with a deterministic seeded RNG
(`src/lib/seededRandom.js`) shared across price history (`priceHistory.js`) and image
recognition (`imageRecognitionMock.js`) — camera frames are sampled to bytes and used as
a seed to pick catalog "candidates," mirroring how a real vision API would return
candidates, but explicitly surfaced as mock in the UI. AR navigation (`CameraNav.jsx` +
`direction.js`) is a live camera feed with a directional arrow computed from logical
department geometry, not real shelf/object detection. Camera access for image search and
AR both go through a shared `useCameraStream.js` hook — do not add another camera-stream
implementation. When extending or replacing a mock, keep the seam explicit (the code
comments and the in-app settings disclosure both call out exactly which pieces are mock
vs. real) rather than quietly blurring it.

### PWA build shape

`vite-plugin-pwa` precaches the app shell, but large optional assets are deliberately
excluded from precache and instead cached on first real use (`CacheFirst` runtime
caching, see `vite.config.js`): Tesseract OCR assets (`public/tesseract`), the MobileNet
model (`public/mobilenet`), and the `tfjs-vendor` chunk (TensorFlow.js, split out via
`manualChunks`). Follow the same pattern for any future heavy/optional dependency —
don't add it to the default precache glob.
