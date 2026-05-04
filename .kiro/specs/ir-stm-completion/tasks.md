# Implementation Plan: IR-STM Completion (Phases 6–9)

## Overview

Implement real-time Socket.IO layer, virtual scrolling, toast notifications, error boundaries, empty states, cache middleware, and production hardening on top of the existing Express 5 + PostgreSQL backend and React 19 + Zustand frontend.

## Tasks

- [x] 1. Install new runtime dependencies
  - Run `npm install socket.io` in `backend/`
  - Run `npm install socket.io-client` in `frontend/`
  - Run `npm install --save-dev fast-check vitest @testing-library/react @testing-library/jest-dom` in `frontend/`
  - _Requirements: 1.1, 1.3_

- [x] 2. Backend — Socket.IO server setup
  - [x] 2.1 Create `backend/src/socket/socketManager.js`
    - Implement `init(httpServer)`: attach `socket.io` with CORS matching `FRONTEND_URL`, configure JWT handshake middleware that verifies the token and attaches `socket.user`, join socket to rooms (`station_<name>`, `zone_<name>`, or `national`) based on role
    - Implement `getIO()` singleton getter
    - Implement emit helpers: `emitTrainUpdate(trainRow)`, `emitAlertNew(alertRow)`, `emitAlertResolved(id)`, `emitPlatformUpdate(row)`, `emitStatsRefresh()`
    - `emitAlertNew` must emit to `national`, `station_<alert.station_name>`, and `zone_<alert.zone>` rooms
    - _Requirements: 1.1, 1.2, 2.1, 2.6, 3.1_

  - [x] 2.2 Refactor `backend/src/server.js` to use `http.createServer`
    - Replace `app.listen(PORT, …)` with `const httpServer = http.createServer(app)` then `httpServer.listen(PORT, …)`
    - Call `socketManager.init(httpServer)` immediately after creating `httpServer`
    - Add `JWT_SECRET` production guard at the top of the file: if `NODE_ENV === 'production'` and `!process.env.JWT_SECRET`, log a fatal error and call `process.exit(1)`
    - _Requirements: 1.1, 14.3, 14.5_

- [x] 3. Backend — Emit after DB writes
  - [x] 3.1 Add socket emits to `trainController.js`
    - In `updateTrain`: after the successful `pool.query` RETURNING row, call `emitTrainUpdate(result.rows[0])` and `emitStatsRefresh()`
    - In `createTrain`: after successful insert, call `emitStatsRefresh()`
    - _Requirements: 1.2, 4.3_

  - [x] 3.2 Add socket emits to `alertController.js`
    - In `createAlert`: after successful insert, call `emitAlertNew(result.rows[0])`
    - In `resolveAlert`: after successful update, call `emitAlertResolved(result.rows[0].id)`
    - _Requirements: 2.1, 2.4_

  - [x] 3.3 Add socket emits to `platformController.js`
    - In `updatePlatform`: after successful update, call `emitPlatformUpdate(result.rows[0])`
    - _Requirements: 3.1_

- [x] 4. Backend — Cache middleware
  - [x] 4.1 Create `backend/src/middlewares/cacheMiddleware.js`
    - Implement `CACHE_RULES` array and `cacheMiddleware(req, res, next)` exactly as specified in the design
    - Rules: `GET /api/trains/stats` → `public, max-age=15, stale-while-revalidate=30`; `GET /api/analytics/overview` → `public, max-age=30, stale-while-revalidate=60`; `GET /api/trains*` → `private, max-age=10`; POST/PUT/DELETE → `no-store`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 4.2 Register `cacheMiddleware` in `server.js`
    - Import and register `cacheMiddleware` globally before route handlers
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 4.3 Write property test for cache middleware (Property 8)
    - **Property 8: Cache-Control no-store on all mutating responses**
    - **Validates: Requirements 6.4**
    - Use `fc.constantFrom('POST','PUT','DELETE')` × route strings; assert response `Cache-Control` contains `no-store`

- [x] 5. Frontend — Zustand store additions
  - [x] 5.1 Add new state fields and socket actions to `useStore.js`
    - Add fields: `isReconnecting: false`, `socketConnected: false`, `lastUpdatedAt: null`, `highlightedPlatformIds: []`
    - Add actions: `setReconnecting(v)`, `setSocketConnected(v)`, `touchLastUpdated()`
    - Add `updateTrainFromSocket(payload)`: map payload fields onto matching train by `rawId`, call `recomputeAnalytics`, update `lastUpdatedAt`
    - Add `prependAlert(payload, user)`: call `shouldShowAlert`; if true, prepend mapped alert to `alerts`
    - Add `resolveAlertFromSocket(id)`: set matching alert's `active` to `false`
    - Add `updatePlatformFromSocket(payload)`: map payload onto matching platform by `rawId`, append `payload.id` to `highlightedPlatformIds`
    - Implement pure helpers `shouldShowAlert(alert, user)` and `recomputeAnalytics(trains, updatedPayload)` as module-level functions (exported for testing)
    - _Requirements: 1.4, 1.5, 1.6, 2.2, 2.5, 2.6, 3.2, 4.1, 4.4_

  - [ ]* 5.2 Write property test for `updateTrainFromSocket` (Property 1)
    - **Property 1: Store train update is surgical**
    - **Validates: Requirements 1.4**

  - [ ]* 5.3 Write property test for `prependAlert` + `shouldShowAlert` (Property 2)
    - **Property 2: Alert prepend and RBAC filter are consistent**
    - **Validates: Requirements 2.2, 2.6**

  - [ ]* 5.4 Write property test for `resolveAlertFromSocket` (Property 3)
    - **Property 3: Alert resolve is surgical**
    - **Validates: Requirements 2.5**

  - [ ]* 5.5 Write property test for `updatePlatformFromSocket` (Property 4)
    - **Property 4: Platform update is surgical**
    - **Validates: Requirements 3.2**

  - [ ]* 5.6 Write property test for analytics consistency (Property 5)
    - **Property 5: Analytics are consistent with the trains array**
    - **Validates: Requirements 4.1**

  - [ ]* 5.7 Write property test for `shouldShowAlert` station-scope filter (Property 6)
    - **Property 6: shouldShowAlert station-scope filter**
    - **Validates: Requirements 2.6**

- [x] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Frontend — `useSocket` hook
  - [x] 7.1 Create `frontend/src/hooks/useSocket.js`
    - Derive `SOCKET_URL` from `import.meta.env.VITE_API_URL` (strip `/api` suffix)
    - On mount (when `user` is truthy): create `io(SOCKET_URL, { auth: { token }, reconnection: true, reconnectionAttempts: 5, reconnectionDelayMax: 16000, randomizationFactor: 0 })`
    - Wire events: `connect` → `setSocketConnected(true)`, `setReconnecting(false)`, `fetchTrains()`; `disconnect` → `setSocketConnected(false)`, `setReconnecting(true)`; `reconnect_failed` → `setReconnecting(false)`; `train:updated` → `updateTrainFromSocket`; `alert:new` → `prependAlert(data, user)` + show critical toast; `alert:resolved` → `resolveAlertFromSocket`; `platform:updated` → `updatePlatformFromSocket`; `stats:refresh` → `fetchTrainStats()`
    - Return `socketRef`; disconnect on cleanup
    - _Requirements: 1.3, 1.4, 1.6, 1.7, 2.2, 2.3, 2.5, 3.2, 4.3_

  - [x] 7.2 Mount `useSocket` in `Layout.jsx`
    - Import and call `useSocket()` inside the `Layout` component body (runs once per authenticated session)
    - Update the polling `setInterval` in `Layout.jsx` to check `socketConnected` from the store: only call `fetchTrainStats()` when `!socketConnected`
    - _Requirements: 1.5, 4.2_

- [x] 8. Frontend — Toast notification system
  - [x] 8.1 Create `frontend/src/components/ToastProvider.jsx`
    - Implement `ToastContext` with `showToast({ title, message, severity }, duration)` function
    - `ToastContainer` renders via `ReactDOM.createPortal` into `document.body`, positioned fixed top-right
    - Each toast auto-dismisses after `duration` ms (default 6000 for critical alerts)
    - Style critical toasts with red/saffron accent matching the existing dark UI
    - Export `useToast()` hook for consuming the context
    - _Requirements: 2.3_

  - [x] 8.2 Wrap `App.jsx` with `ToastProvider`
    - Import `ToastProvider` and wrap the `BrowserRouter` (or root) so all pages can call `useToast()`
    - _Requirements: 2.3_

  - [x] 8.3 Trigger critical alert toasts from `useSocket.js`
    - In the `alert:new` handler, after calling `prependAlert`, check `data.severity === 'critical'` and call `showToast({ title: data.title, message: data.message, severity: 'critical' }, 6000)`
    - _Requirements: 2.3_

- [x] 9. Frontend — Reconnection indicator in `TopNav.jsx`
  - Read `isReconnecting` from `useStore` in `TopNav`
  - Conditionally render an amber pill between the search bar and the "System Live" badge: icon `sync`, text "Reconnecting…" with a spinner, using `AnimatePresence` for enter/exit
  - When `isReconnecting` is false, render the existing "System Live" badge; when true, replace it with the reconnecting pill
  - _Requirements: 1.6, 1.7_

- [x] 10. Frontend — Error boundaries
  - [x] 10.1 Create `frontend/src/components/ErrorBoundary.jsx`
    - Implement class component `ErrorBoundary` with `getDerivedStateFromError` and `componentDidCatch` (logs to console)
    - Render `ErrorFallback` on error: shows error message, a "Reload Page" button (`window.location.reload()`), and keeps Sidebar/TopNav mounted (fallback renders inside the page content area only)
    - _Requirements: 9.1, 9.7_

  - [x] 10.2 Wrap all lazy pages in `App.jsx` with `ErrorBoundary`
    - Import `ErrorBoundary` and wrap each `<Route element={…}>` page component: Dashboard, LiveTrains, Platforms, Alerts, Analytics, Maintenance, Settings
    - Use a unique `key` prop per boundary (e.g. `key="dashboard"`) so boundaries are independent
    - _Requirements: 9.1, 9.7_

  - [ ]* 10.3 Write property test for ErrorBoundary (Property 11)
    - **Property 11: ErrorBoundary catches all page-level errors without unmounting layout**
    - **Validates: Requirements 9.7**

- [x] 11. Frontend — Empty state component
  - [x] 11.1 Create `frontend/src/components/EmptyState.jsx`
    - Accept props: `icon` (material symbol name), `message` (string), optional `action` ({ label, onClick })
    - Style consistently with the dark UI: centered, muted icon, zinc-500 message text, optional saffron action button
    - _Requirements: 9.3, 9.4, 9.5, 9.6_

  - [x] 11.2 Use `EmptyState` in `LiveTrains.jsx`
    - Replace the existing inline empty-row `<td>` with `<EmptyState icon="train" message="No trains found. Check your connection or filters." />`
    - _Requirements: 9.3_

  - [x] 11.3 Use `EmptyState` in `Alerts.jsx`
    - When `alerts` array is empty, render `<EmptyState icon="notifications_off" message="No active alerts. All systems nominal." />`
    - _Requirements: 9.4_

  - [x] 11.4 Use `EmptyState` in `Platforms.jsx`
    - When `platforms` array is empty, render `<EmptyState icon="platform" message="No platform data available." />`
    - _Requirements: 9.5_

  - [x] 11.5 Use `EmptyState` in `Maintenance.jsx`
    - When `maintenance` array is empty, render `<EmptyState icon="build" message="No maintenance records found." />`
    - _Requirements: 9.6_

- [x] 12. Frontend — Virtual scrolling for LiveTrains
  - [x] 12.1 Create `frontend/src/components/VirtualList.jsx`
    - Accept props: `items` (array), `rowHeight` (default 52), `overscan` (default 5), `renderRow` (function)
    - Measure container height via `ResizeObserver` on the scroll container ref
    - On scroll, compute `visibleStart`, `visibleEnd`, `renderStart`, `renderEnd` using the formula from the design
    - Render a single outer `div` with `height = items.length * rowHeight` (spacer) and an inner `div` with `transform: translateY(renderStart * rowHeight)` containing only the windowed rows
    - When `items.length === 0`, render `EmptyState` instead
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

  - [x] 12.2 Integrate `VirtualList` into `LiveTrains.jsx`
    - Replace the `<tbody>` map with `<VirtualList items={trains} rowHeight={52} renderRow={(train, idx) => <TrainRow … />} />`
    - Extract the existing `<motion.tr>` content into a `TrainRow` sub-component within the file
    - Preserve all existing sort, filter, and pagination controls unchanged
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 12.3 Write property test for VirtualList windowing (Property 7)
    - **Property 7: Virtual scroller renders exactly the windowed range**
    - **Validates: Requirements 5.1**

- [x] 13. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Frontend — `api.js` Accept header
  - Add `Accept: 'application/json'` to the default headers of the Axios instance in `frontend/src/utils/api.js`
  - _Requirements: 6.5_

- [x] 15. Frontend — `lastUpdatedAt` display on Dashboard
  - In `Dashboard.jsx`, read `lastUpdatedAt` from the store and render a "Last updated: HH:MM:SS" line beneath the KPI cards, updating whenever the value changes
  - _Requirements: 4.4_

- [x] 16. Re-seed and final build verification
  - [x] 16.1 Re-run the seed script
    - Run `node src/utils/seed.js` in `backend/` to ensure the database has fresh data for all pages
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 16.2 Verify production build
    - Run `npm run build` in `frontend/` and confirm it completes without errors and outputs to `frontend/dist`
    - Confirm no TypeScript/ESLint errors block the build
    - _Requirements: 12.1, 12.2, 12.3_

- [x] 17. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check`; tag each test with `// Feature: ir-stm-completion, Property N: <text>`
- Socket emits must only fire after a successful DB write — never in catch blocks
- `shouldShowAlert` and `recomputeAnalytics` must be exported pure functions so property tests can import them directly without the Zustand store
