# Design Document — IR-STM Completion (Phases 6–9)

## Overview

This document describes the technical design for completing the Indian Railways Traffic Management System. Phases 1–5 delivered a working REST API, PostgreSQL-backed data layer, JWT authentication, RBAC with station scoping, and a React frontend with server-side paginated train data. Phases 6–9 add:

- **Phase 6**: Real-time Socket.IO layer (trains, alerts, platforms, dashboard KPIs)
- **Phase 7**: Virtual scrolling for the 10,000-train list, debounced search, response cache headers
- **Phase 8**: Error boundaries, empty states, end-to-end page verification
- **Phase 9**: Production hardening (env validation, security headers, build optimisation)

The design preserves the existing dark futuristic UI (Indian Railways tricolor accents), the Zustand store shape, and the Express 5 + PostgreSQL backend. No new UI libraries are introduced; Socket.IO and socket.io-client are the only new runtime dependencies.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React 19 + Vite)                                      │
│                                                                 │
│  App.jsx                                                        │
│   └─ Layout.jsx  ──────────────────────────────────────────┐   │
│       ├─ ErrorBoundary (per page)                          │   │
│       ├─ TopNav  (reconnect indicator, toast portal)       │   │
│       ├─ Sidebar                                           │   │
│       └─ Pages (Dashboard, LiveTrains, Platforms, …)       │   │
│                                                            │   │
│  useStore (Zustand)  ◄──── socket events ──────────────────┘   │
│  useSocket (hook)    ──── socket.io-client ──────────────────┐  │
│  api.js (Axios)      ──── REST / polling ────────────────────┤  │
└──────────────────────────────────────────────────────────────┼──┘
                                                               │
                          WebSocket + HTTP                     │
                                                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Express 5 + Node.js (Render)                                   │
│                                                                 │
│  server.js                                                      │
│   ├─ http.createServer(app)                                     │
│   ├─ socket.io(httpServer)  ──── socketManager.js              │
│   │    ├─ JWT handshake auth                                    │
│   │    ├─ RBAC room join (station_<name> / zone_<name>)        │
│   │    └─ emit helpers: emitTrainUpdate, emitAlertNew, …       │
│   ├─ cacheMiddleware.js  (Cache-Control headers)               │
│   └─ Routes → Controllers → pg pool → PostgreSQL               │
└─────────────────────────────────────────────────────────────────┘
```

### Key architectural decisions

| Decision | Choice | Rationale |
|---|---|---|
| Socket.IO transport | WebSocket with HTTP long-poll fallback | Works through Render's proxy; socket.io handles reconnection |
| Emit point | Inside controller, after `pool.query` returns | Guarantees event only fires on successful DB write |
| RBAC scoping for sockets | Socket.IO rooms (`station_<name>`, `zone_<name>`, `national`) | Mirrors existing `stationScope` middleware; no extra DB queries per event |
| Virtual scrolling | Custom windowed list (no library) | Keeps bundle small; fixed 52px row height makes the math trivial |
| Debounce | `useRef` + `setTimeout` (already in LiveTrains.jsx) | Already implemented; just needs AbortController for cancellation |
| Error boundaries | Class component `ErrorBoundary` wrapping each lazy page | React 19 does not yet support function-component error boundaries |
| Toast system | Lightweight portal component in `main.jsx` | Avoids a toast library; renders outside the page tree |
| Cache headers | Express middleware `cacheMiddleware.js` | Centralised, easy to test, no per-route boilerplate |

---

## Components and Interfaces

### Backend: `socketManager.js`

Singleton module that owns the `io` instance and exposes emit helpers called by controllers.

```js
// backend/src/socket/socketManager.js
let io = null;

function init(httpServer) { /* attach socket.io, configure auth + rooms */ }
function getIO() { return io; }

// Emit helpers — called from controllers after DB writes
function emitTrainUpdate(trainRow) { /* io.emit('train:updated', payload) */ }
function emitAlertNew(alertRow)    { /* io.to(room).emit('alert:new', payload) */ }
function emitAlertResolved(id)     { /* io.emit('alert:resolved', { id }) */ }
function emitPlatformUpdate(row)   { /* io.emit('platform:updated', payload) */ }
function emitStatsRefresh()        { /* io.emit('stats:refresh') */ }

module.exports = { init, getIO, emitTrainUpdate, emitAlertNew, emitAlertResolved, emitPlatformUpdate, emitStatsRefresh };
```

**Socket.IO connection lifecycle:**

1. Client connects with `{ auth: { token } }` in handshake.
2. Server middleware verifies JWT, attaches `socket.user`.
3. Server joins socket to rooms based on role:
   - `station_master` / `dispatcher` → `station_<assigned_station>`
   - `zone_admin` → `zone_<assigned_zone>`
   - All others → `national`
4. On disconnect, Socket.IO handles room cleanup automatically.

**RBAC-aware emit for alerts:**

```
alert:new  →  io.to('national').emit(...)
           +  io.to('station_<alert.station_name>').emit(...)
           +  io.to('zone_<alert.zone>').emit(...)   // if zone present
```

Train and platform updates are broadcast to all rooms (national scope) because controllers already filter data by scope at the REST layer; the client-side store update is idempotent for trains the user cannot see.

### Backend: `cacheMiddleware.js`

```js
// backend/src/middlewares/cacheMiddleware.js
const CACHE_RULES = [
  { test: (m, p) => m === 'GET' && p === '/api/trains/stats',
    header: 'public, max-age=15, stale-while-revalidate=30' },
  { test: (m, p) => m === 'GET' && p === '/api/analytics/overview',
    header: 'public, max-age=30, stale-while-revalidate=60' },
  { test: (m, p) => m === 'GET' && p.startsWith('/api/trains'),
    header: 'private, max-age=10' },
  { test: (m, _) => ['POST','PUT','DELETE'].includes(m),
    header: 'no-store' },
];

module.exports = function cacheMiddleware(req, res, next) {
  const rule = CACHE_RULES.find(r => r.test(req.method, req.path));
  if (rule) res.set('Cache-Control', rule.header);
  next();
};
```

Registered globally in `server.js` before route handlers.

### Frontend: `useSocket.js`

Custom hook that owns the socket.io-client lifecycle. Mounted once in `Layout.jsx`.

```js
// frontend/src/hooks/useSocket.js
export function useSocket() {
  const socketRef = useRef(null);
  const { user, updateTrainFromSocket, prependAlert, resolveAlertFromSocket,
          updatePlatformFromSocket, fetchTrains, fetchTrainStats,
          setReconnecting } = useStore();

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 16000,  // 1s * 2^4
      randomizationFactor: 0,
    });
    socketRef.current = socket;

    socket.on('connect',            () => { setReconnecting(false); fetchTrains(); });
    socket.on('disconnect',         () => setReconnecting(true));
    socket.on('reconnect_failed',   () => setReconnecting(false)); // give up
    socket.on('train:updated',      (data) => updateTrainFromSocket(data));
    socket.on('alert:new',          (data) => prependAlert(data, user));
    socket.on('alert:resolved',     (data) => resolveAlertFromSocket(data.id));
    socket.on('platform:updated',   (data) => updatePlatformFromSocket(data));
    socket.on('stats:refresh',      ()     => fetchTrainStats());

    return () => socket.disconnect();
  }, [user?.id]);

  return socketRef;
}
```

Socket.IO's built-in `reconnectionDelayMax` and `reconnectionAttempts` handle exponential back-off natively — no manual implementation needed.

### Frontend: `ErrorBoundary.jsx`

```jsx
// frontend/src/components/ErrorBoundary.jsx
export class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error}
               onReset={() => this.setState({ hasError: false, error: null })} />;
    }
    return this.props.children;
  }
}
```

`ErrorFallback` renders inside the existing layout (Sidebar and TopNav remain mounted) with a "Reload Page" button that calls `window.location.reload()`.

Each lazy page in `App.jsx` is wrapped:

```jsx
<Route path="/dashboard" element={
  <ErrorBoundary key="dashboard">
    <Dashboard />
  </ErrorBoundary>
} />
```

### Frontend: `ToastProvider.jsx`

Lightweight portal-based toast system. A `ToastContext` exposes `showToast(message, duration)`. The `ToastContainer` renders via `ReactDOM.createPortal` into `document.body`, positioned `top-right`.

Critical alerts trigger: `showToast({ title, message, severity: 'critical' }, 6000)`.

### Frontend: `VirtualList.jsx`

Custom windowed list with fixed row height. No external library.

```
containerHeight  = measured via ResizeObserver on the scroll container
ROW_HEIGHT       = 52 (px, constant)
overscan         = 5 (rows)

visibleStart = Math.floor(scrollTop / ROW_HEIGHT)
visibleEnd   = Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT)
renderStart  = Math.max(0, visibleStart - overscan)
renderEnd    = Math.min(items.length - 1, visibleEnd + overscan)

totalHeight  = items.length * ROW_HEIGHT   // spacer div height
offsetTop    = renderStart * ROW_HEIGHT    // absolute position of first rendered row
```

The component renders a single outer `div` with `height = totalHeight` and an inner `div` with `transform: translateY(offsetTop)` containing only the `renderEnd - renderStart + 1` rows. This avoids layout thrashing.

### Frontend: `EmptyState.jsx`

Reusable component accepting `icon`, `message`, and optional `action` props. Renders the train/alert/platform/maintenance empty states with consistent styling matching the existing dark UI.

### Frontend: Reconnection indicator in `TopNav.jsx`

A new `isReconnecting` boolean is added to the Zustand store. `TopNav` reads it and conditionally renders a small amber pill: `"⚡ Reconnecting…"` with a spinner, positioned between the search bar and the "System Live" badge.

### Frontend: Polling fallback in `Layout.jsx`

```js
useEffect(() => {
  if (!isAuthenticated) return;
  // Socket hook handles real-time; polling is the fallback
  const id = setInterval(() => {
    if (!socketConnected) fetchTrainStats();
  }, 30_000);
  return () => clearInterval(id);
}, [isAuthenticated, socketConnected]);
```

`socketConnected` is a derived boolean in the store set by `useSocket`.

---

## Data Models

### New Zustand store fields

```js
// Additions to useStore.js
{
  isReconnecting:   false,   // drives TopNav indicator
  socketConnected:  false,   // drives polling fallback
  lastUpdatedAt:    null,    // ISO string, drives Dashboard "Last updated"
  highlightedPlatformIds: [], // set of platform IDs currently animating

  // New actions
  setReconnecting:           (v) => set({ isReconnecting: v }),
  setSocketConnected:        (v) => set({ socketConnected: v }),
  touchLastUpdated:          ()  => set({ lastUpdatedAt: new Date().toISOString() }),

  updateTrainFromSocket: (payload) => set(state => ({
    trains: state.trains.map(t =>
      t.rawId === payload.id ? { ...t, ...mapTrainPayload(payload) } : t
    ),
    // recompute analytics inline
    analytics: recomputeAnalytics(state.trains, payload),
    lastUpdatedAt: new Date().toISOString(),
  })),

  prependAlert: (payload, user) => {
    if (!shouldShowAlert(payload, user)) return;
    set(state => ({ alerts: [mapAlertPayload(payload), ...state.alerts] }));
  },

  resolveAlertFromSocket: (id) => set(state => ({
    alerts: state.alerts.map(a => a.id === id ? { ...a, active: false } : a),
  })),

  updatePlatformFromSocket: (payload) => set(state => ({
    platforms: state.platforms.map(p =>
      p.rawId === payload.id ? { ...p, ...mapPlatformPayload(payload) } : p
    ),
    highlightedPlatformIds: [...state.highlightedPlatformIds, payload.id],
  })),
}
```

### `shouldShowAlert(alert, user)` — pure filter function

```js
export function shouldShowAlert(alert, user) {
  if (!user) return false;
  const STATION_SCOPED = new Set(['station_master', 'dispatcher']);
  if (!STATION_SCOPED.has(user.role)) return true;  // national/zone roles see all
  if (!alert.station_name) return true;              // unscoped alert — show to all
  return alert.station_name
    .toLowerCase()
    .includes((user.assigned_station || '').toLowerCase());
}
```

### `recomputeAnalytics(trains, updatedPayload)` — pure function

```js
function recomputeAnalytics(currentTrains, updatedPayload) {
  const updated = currentTrains.map(t =>
    t.rawId === updatedPayload.id ? { ...t, ...mapTrainPayload(updatedPayload) } : t
  );
  const total    = updated.length;
  const active   = updated.filter(t => t.status?.toLowerCase() === 'running').length;
  const delayed  = updated.filter(t => t.status?.toLowerCase() === 'delayed').length;
  const onTime   = total > 0 ? Math.round(((total - delayed) / total) * 100 * 10) / 10 : 0;
  return { activeTrains: active, delayedTrains: delayed, onTimeRate: onTime, onTimePerformance: onTime };
}
```

### Socket event payload shapes

```
train:updated  →  { id, status, speed, delay_minutes, current_location, updated_at }
alert:new      →  { id, type, severity, title, message, station_name, created_at }
alert:resolved →  { id }
platform:updated → { id, platform_number, station_name, occupied, status, train_number }
stats:refresh  →  (no payload)
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Store train update is surgical

*For any* Zustand store state containing N trains and any valid `train:updated` socket payload, after calling `updateTrainFromSocket(payload)`, exactly one train (the one matching `payload.id`) has its fields updated to match the payload, and all other N-1 trains are byte-for-byte identical to their pre-update state.

**Validates: Requirements 1.4**

---

### Property 2: Alert prepend and RBAC filter are consistent

*For any* alerts array, any `alert:new` payload, and any user object, after calling `prependAlert(payload, user)`:
- If `shouldShowAlert(payload, user)` returns `true`, then `alerts[0]` equals the mapped payload and `alerts.length` increases by exactly 1.
- If `shouldShowAlert(payload, user)` returns `false`, then the alerts array is unchanged.

**Validates: Requirements 2.2, 2.6**

---

### Property 3: Alert resolve is surgical

*For any* alerts array and any alert `id` present in that array, after calling `resolveAlertFromSocket(id)`, the matching alert has `active === false` and all other alerts are unchanged.

**Validates: Requirements 2.5**

---

### Property 4: Platform update is surgical

*For any* platforms array and any valid `platform:updated` socket payload, after calling `updatePlatformFromSocket(payload)`, exactly one platform (matching `payload.id`) has its fields updated, and all other platforms are unchanged.

**Validates: Requirements 3.2**

---

### Property 5: Analytics are consistent with the trains array

*For any* trains array (after any sequence of `updateTrainFromSocket` calls), the store's `analytics.activeTrains` equals `trains.filter(t => t.status === 'Running').length`, `analytics.delayedTrains` equals `trains.filter(t => t.status === 'Delayed').length`, and `analytics.onTimeRate` equals `((total - delayed) / total) * 100` (or 0 when total is 0).

**Validates: Requirements 4.1**

---

### Property 6: shouldShowAlert station-scope filter

*For any* alert payload and any user with role `station_master` or `dispatcher` and a non-empty `assigned_station`, `shouldShowAlert(alert, user)` returns `true` if and only if `alert.station_name` contains `user.assigned_station` (case-insensitive), or `alert.station_name` is null/empty.

**Validates: Requirements 2.6**

---

### Property 7: Virtual scroller renders exactly the windowed range

*For any* list of N items, container height H, scroll position S, and overscan O=5, the set of rendered item indices produced by the windowing calculation equals `[max(0, floor(S/52) - O, min(N-1, ceil((S+H)/52) + O)]` — no more, no fewer.

**Validates: Requirements 5.1**

---

### Property 8: Cache-Control no-store on all mutating responses

*For any* POST, PUT, or DELETE request to any `/api/` route, the response `Cache-Control` header contains `no-store`.

**Validates: Requirements 6.4**

---

### Property 9: Debounce coalesces rapid keystrokes into a single request

*For any* sequence of search input changes where each change occurs within 400ms of the previous one, exactly one `fetchTrains` call is dispatched, and it is dispatched no earlier than 400ms after the final keystroke.

**Validates: Requirements 7.1**

---

### Property 10: In-flight request cancellation

*For any* sequence of rapid search inputs that each trigger a new debounce timer, at most one HTTP request is in-flight at any given time (previous requests are aborted via `AbortController` before the new one is issued).

**Validates: Requirements 7.3**

---

### Property 11: ErrorBoundary catches all page-level errors without unmounting layout

*For any* error thrown synchronously during the render of a page component wrapped in `ErrorBoundary`, the `ErrorBoundary` renders its fallback UI, the `Sidebar` and `TopNav` components remain mounted, and the error is logged to the console.

**Validates: Requirements 9.7**

---

### Property 12: API errors render inline, not crashes

*For any* simulated network error or HTTP 5xx response from any API call within a page component, the component renders an inline error message and does not throw an unhandled exception.

**Validates: Requirements 9.2**

---

### Property 13: lastUpdatedAt is monotonically non-decreasing

*For any* sequence of analytics refresh events (socket or polling), each successive value of `lastUpdatedAt` in the store is greater than or equal to the previous value.

**Validates: Requirements 4.4**

---

## Error Handling

### Backend

| Scenario | Behaviour |
|---|---|
| Socket.IO JWT invalid on connect | `socket.disconnect()` with error event; client falls back to polling |
| Controller throws after DB write but before emit | Error caught by Express error handler; emit is skipped (no partial state) |
| `pool.query` throws | Controller returns 500; no socket emit |
| `JWT_SECRET` missing in production | `server.js` startup check: `process.exit(1)` with fatal log |
| Request body > 10KB | Express `json({ limit: '10kb' })` returns 413 automatically |

### Frontend

| Scenario | Behaviour |
|---|---|
| Socket connection fails on mount | `useSocket` catches error; `isReconnecting` set to true; polling fallback activates |
| `train:updated` payload missing `id` | `updateTrainFromSocket` no-ops (no matching train found) |
| `alert:new` payload malformed | `prependAlert` maps defensively with fallback values |
| Page component throws during render | `ErrorBoundary` catches; fallback panel shown; layout intact |
| API call returns 401 | Axios interceptor clears token and redirects to `/login` |
| API call returns 5xx | Component sets local `error` state; inline error message rendered |
| `VirtualList` receives empty array | Renders `EmptyState` component |

---

## Testing Strategy

### Unit tests (Vitest + React Testing Library)

Focus on pure functions and component behaviour with concrete examples:

- `shouldShowAlert` — example-based tests for each role type
- `recomputeAnalytics` — example-based tests with known train arrays
- `cacheMiddleware` — example-based tests for each route pattern
- `ErrorBoundary` — render a throwing child, assert fallback is shown
- `EmptyState` — render with each page's message string, assert text present
- `VirtualList` — render with 0 items (empty state), render with known list and assert row count
- `ToastProvider` — show critical alert, assert toast appears and disappears after 6s

### Property-based tests (fast-check)

Each property test runs a minimum of 100 iterations. Tests are tagged with the property they validate.

**Feature: ir-stm-completion**

- **Property 1** — `fc.array(trainArb)` × `trainPayloadArb` → assert surgical update
- **Property 2** — `fc.array(alertArb)` × `alertPayloadArb` × `userArb` → assert prepend + filter consistency
- **Property 3** — `fc.array(alertArb)` × `fc.integer` (id from array) → assert surgical resolve
- **Property 4** — `fc.array(platformArb)` × `platformPayloadArb` → assert surgical update
- **Property 5** — `fc.array(trainArb)` → assert analytics consistency invariant
- **Property 6** — `alertPayloadArb` × `stationScopedUserArb` → assert filter correctness
- **Property 7** — `fc.integer({min:0})` (N) × `fc.integer({min:100})` (H) × `fc.integer({min:0})` (S) → assert windowed range
- **Property 8** — `fc.constantFrom('POST','PUT','DELETE')` × `routeArb` → assert no-store header
- **Property 9** — `fc.array(fc.string(), {minLength:2})` (keystroke sequence with <400ms gaps) → assert single fetch call
- **Property 10** — rapid input sequence → assert at most one in-flight request
- **Property 11** — `fc.anything()` (thrown error) → assert ErrorBoundary catches and layout intact
- **Property 12** — `fc.constantFrom(500,502,503,504)` (status) + network error → assert inline error, no throw
- **Property 13** — `fc.array(fc.date())` (refresh sequence) → assert monotonically non-decreasing timestamps

### Integration tests

- Socket.IO emit after REST write (train update, alert create, alert resolve, platform update) — verify event received within 500ms
- Full auth flow: login → protected route → JWT expiry → redirect to login
- RBAC: station_master cannot access national routes; viewer gets 403 on POST

### End-to-end verification (manual / Playwright smoke)

- All 6 authenticated pages render without console errors
- Unauthenticated redirect to `/login`
- `viewer` role redirected from `/maintenance` to `/dashboard`
- `vite build` completes without errors; bundle < 500KB gzipped
- `GET /health` responds within 200ms

### PBT library

**fast-check** (`npm install --save-dev fast-check`) — chosen for its TypeScript-friendly API, built-in arbitraries for arrays/objects/strings, and compatibility with Vitest.

Tag format for each property test:
```js
// Feature: ir-stm-completion, Property N: <property_text>
```
 