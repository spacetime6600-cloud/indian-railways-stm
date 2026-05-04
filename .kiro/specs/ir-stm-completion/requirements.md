# Requirements Document

## Introduction

This document covers the completion of the Indian Railways Traffic Management System (IR-STM) — a production-grade, full-stack web application for monitoring and managing 10,000+ trains across 15 Indian Railway zones. Phases 1–5 are complete (backend APIs, frontend integration, JWT auth, RBAC, seeded data). This spec covers Phases 6–9: real-time features, performance optimisation for large datasets, end-to-end correctness, and deployment readiness.

The system uses React 19 + Vite + Tailwind CSS 4 on the frontend, Node.js + Express 5 + PostgreSQL on the backend, Zustand for state management, and Framer Motion for animations. The UI follows a dark futuristic theme with Indian Railways tricolor accents (#FF9933 saffron, white, #138808 green).

---

## Glossary

- **System**: The complete IR-STM web application (frontend + backend).
- **Frontend**: The React 19 + Vite single-page application served via Vercel.
- **Backend**: The Node.js + Express 5 REST API server deployed on Render.
- **Socket_Server**: The Socket.IO server integrated into the Express backend that emits real-time events.
- **Socket_Client**: The Socket.IO client integrated into the React frontend that receives real-time events.
- **Polling_Fallback**: The interval-based HTTP polling mechanism used when WebSocket connections are unavailable.
- **Store**: The Zustand global state store (`useStore`) managing all client-side application state.
- **Train**: A record in the `trains` PostgreSQL table representing a single Indian Railways train service.
- **Platform**: A record in the `platforms` PostgreSQL table representing a physical station platform.
- **Alert**: A record in the `alerts` PostgreSQL table representing an operational notification.
- **Virtual_Scroller**: A windowed list component that renders only the DOM nodes visible in the viewport.
- **Cache_Header**: An HTTP `Cache-Control` response header that instructs clients and CDNs to cache responses.
- **Debounce**: A technique that delays invoking a function until a specified quiet period has elapsed after the last call.
- **Error_Boundary**: A React component that catches JavaScript errors in its child tree and renders a fallback UI.
- **Empty_State**: A UI component rendered when a data list has zero items.
- **RBAC**: Role-Based Access Control — the permission system restricting actions by user role.
- **JWT**: JSON Web Token used for stateless authentication between Frontend and Backend.
- **Production_Build**: The optimised, minified output of `vite build` ready for deployment.
- **Environment_Variable**: A runtime configuration value injected via `.env` files or hosting platform settings.
- **Rate_Limiter**: The `express-rate-limit` middleware protecting Backend API endpoints from abuse.
- **Health_Endpoint**: The `GET /health` route on the Backend that returns service status.
- **CSP**: Content Security Policy HTTP header restricting resource origins.

---

## Requirements

### Requirement 1: Real-Time Train Status Updates

**User Story:** As a traffic controller, I want train statuses, speeds, and delays to update automatically on screen, so that I can monitor the live network without manually refreshing the page.

#### Acceptance Criteria

1. WHEN the Backend starts, THE Socket_Server SHALL initialise a Socket.IO server on the same HTTP port as the Express application.
2. WHEN a Train record's `status`, `speed`, `delay_minutes`, or `current_location` field is updated via the REST API, THE Socket_Server SHALL emit a `train:updated` event containing the updated Train fields within 500ms of the database write.
3. WHEN the Frontend mounts an authenticated session, THE Socket_Client SHALL establish a WebSocket connection to the Socket_Server and attach the JWT in the connection handshake.
4. WHEN the Socket_Client receives a `train:updated` event, THE Store SHALL update the matching Train entry in the `trains` array without triggering a full list re-fetch.
5. WHILE a WebSocket connection is unavailable, THE Frontend SHALL fall back to polling the `/api/trains/stats` endpoint at a 30-second interval to refresh dashboard KPI metrics.
6. WHEN the Socket_Client connection is lost, THE Frontend SHALL display a non-blocking "Reconnecting…" indicator in the TopNav and attempt automatic reconnection with exponential back-off up to 5 retries.
7. WHEN the Socket_Client successfully reconnects, THE Frontend SHALL remove the reconnection indicator and re-sync the Store by fetching the current page of trains.

---

### Requirement 2: Real-Time Alert Notifications

**User Story:** As a station master, I want to receive instant on-screen notifications when new alerts are created, so that I can respond to incidents without delay.

#### Acceptance Criteria

1. WHEN a new Alert record is inserted into the database via the REST API, THE Socket_Server SHALL emit an `alert:new` event containing the full Alert payload within 500ms of the database write.
2. WHEN the Socket_Client receives an `alert:new` event, THE Store SHALL prepend the new Alert to the `alerts` array.
3. WHEN the Socket_Client receives an `alert:new` event for an Alert with `severity` equal to `critical`, THE Frontend SHALL display a toast notification in the top-right corner containing the alert title and message for 6 seconds.
4. WHEN an Alert is resolved via the REST API, THE Socket_Server SHALL emit an `alert:resolved` event containing the Alert `id`.
5. WHEN the Socket_Client receives an `alert:resolved` event, THE Store SHALL set the matching Alert's `active` field to `false` without a full re-fetch.
6. WHERE the user's role is `station_master` or `dispatcher`, THE Socket_Client SHALL filter incoming `alert:new` events and only display notifications for Alerts whose `station` field matches the user's `assignedStation`.

---

### Requirement 3: Real-Time Platform Change Broadcasts

**User Story:** As a dispatcher, I want platform assignments to update live on the Platforms page, so that I always see the current occupancy without refreshing.

#### Acceptance Criteria

1. WHEN a Platform record's `occupied`, `train_number`, or `status` field is updated via the REST API, THE Socket_Server SHALL emit a `platform:updated` event containing the updated Platform fields within 500ms of the database write.
2. WHEN the Socket_Client receives a `platform:updated` event, THE Store SHALL update the matching Platform entry in the `platforms` array without triggering a full list re-fetch.
3. WHEN the Socket_Client receives a `platform:updated` event while the user is on the `/platforms` route, THE Frontend SHALL animate the updated platform card with a brief highlight transition lasting 800ms.

---

### Requirement 4: Live Dashboard Metrics Refresh

**User Story:** As a national controller, I want the dashboard KPI cards (running trains, delayed trains, punctuality rate) to reflect the current network state at all times, so that I can make informed decisions.

#### Acceptance Criteria

1. WHEN the Socket_Client receives a `train:updated` event, THE Store SHALL recompute the `analytics.activeTrains`, `analytics.delayedTrains`, and `analytics.onTimeRate` values from the updated `trains` array.
2. WHILE the user is on the `/dashboard` route and no WebSocket connection is active, THE Frontend SHALL poll the `/api/trains/stats` endpoint every 30 seconds and update the Store analytics fields.
3. WHEN the Backend emits a `stats:refresh` event, THE Socket_Client SHALL call `fetchTrainStats()` to update all dashboard KPI values.
4. THE Dashboard SHALL display a "Last updated" timestamp that updates each time the analytics data is refreshed.

---

### Requirement 5: Virtual Scrolling for Large Train Lists

**User Story:** As a traffic controller viewing 10,000+ trains, I want the Live Trains page to remain smooth and responsive, so that I can scroll through large datasets without browser lag.

#### Acceptance Criteria

1. THE Virtual_Scroller SHALL render only the Train rows currently visible in the viewport plus a configurable overscan buffer of 5 rows above and below.
2. WHEN the user scrolls the train list, THE Virtual_Scroller SHALL update the rendered rows within one animation frame (≤16ms) to maintain 60fps scrolling.
3. THE Virtual_Scroller SHALL preserve the existing sort, filter, and pagination controls so that server-side pagination continues to function alongside virtual rendering.
4. WHEN the train list contains zero items, THE Virtual_Scroller SHALL render the Empty_State component displaying a train icon and the message "No trains found".
5. THE Virtual_Scroller SHALL maintain a fixed row height of 52px to enable accurate scroll position calculation.

---

### Requirement 6: Response Caching Headers

**User Story:** As a system operator, I want API responses to include appropriate cache headers, so that repeated identical requests are served faster and backend load is reduced.

#### Acceptance Criteria

1. WHEN the Backend responds to `GET /api/trains/stats`, THE Backend SHALL include a `Cache-Control: public, max-age=15, stale-while-revalidate=30` header.
2. WHEN the Backend responds to `GET /api/analytics/overview`, THE Backend SHALL include a `Cache-Control: public, max-age=30, stale-while-revalidate=60` header.
3. WHEN the Backend responds to `GET /api/trains` with any query parameters, THE Backend SHALL include a `Cache-Control: private, max-age=10` header.
4. WHEN the Backend responds to any `POST`, `PUT`, or `DELETE` request, THE Backend SHALL include a `Cache-Control: no-store` header.
5. THE Frontend `api.js` Axios instance SHALL set a default `Accept: application/json` header on all requests.

---

### Requirement 7: Debounced API Calls

**User Story:** As a traffic controller typing in the search box on the Live Trains page, I want the search to wait until I stop typing before sending a request, so that the backend is not flooded with partial-query requests.

#### Acceptance Criteria

1. WHEN the user types in the Live Trains search input, THE Frontend SHALL delay the API call by 400ms after the last keystroke before dispatching the request.
2. WHEN the user changes a dropdown filter (zone, type, status) on the Live Trains page, THE Frontend SHALL dispatch the API call immediately without debounce delay.
3. WHEN a debounced search request is in-flight and the user types again, THE Frontend SHALL cancel the in-flight request and issue a new one with the latest search term.
4. WHEN the user clears the search input, THE Frontend SHALL immediately fetch the unfiltered train list without waiting for the debounce timer.

---

### Requirement 8: End-to-End Page Verification

**User Story:** As a developer, I want all application pages to render without console errors and display correct data, so that the system is reliable for production use.

#### Acceptance Criteria

1. WHEN an authenticated user navigates to `/dashboard`, THE Frontend SHALL render all five KPI cards, the zone activity bars, and the live alert feed without JavaScript console errors.
2. WHEN an authenticated user navigates to `/live-trains`, THE Frontend SHALL render the filter bar, the train table with at least one row, and the pagination controls without JavaScript console errors.
3. WHEN an authenticated user navigates to `/platforms`, THE Frontend SHALL render the platform grid with status indicators without JavaScript console errors.
4. WHEN an authenticated user navigates to `/alerts`, THE Frontend SHALL render the filter tabs and alert cards without JavaScript console errors.
5. WHEN an authenticated user navigates to `/analytics`, THE Frontend SHALL render the analytics charts and summary statistics without JavaScript console errors.
6. WHEN an authenticated user navigates to `/maintenance`, THE Frontend SHALL render the maintenance records table without JavaScript console errors.
7. WHEN an unauthenticated user navigates to any protected route, THE Frontend SHALL redirect the user to `/login`.
8. WHEN a user with the `viewer` role navigates to `/maintenance`, THE Frontend SHALL redirect the user to `/dashboard`.

---

### Requirement 9: Error Boundaries and Empty States

**User Story:** As a user, I want the application to handle errors and empty data gracefully, so that a single failure does not crash the entire interface.

#### Acceptance Criteria

1. THE Frontend SHALL wrap each page-level component in an Error_Boundary that catches render errors and displays a fallback panel with an error message and a "Reload Page" button.
2. WHEN an API call fails with a network error or a 5xx status, THE Frontend SHALL display an inline error message within the affected component rather than crashing the page.
3. WHEN the `trains` array in the Store is empty and no filters are active, THE Frontend SHALL render the Empty_State component on the Live Trains page with the message "No trains found. Check your connection or filters."
4. WHEN the `alerts` array in the Store is empty, THE Frontend SHALL render the Empty_State component on the Alerts page with the message "No active alerts. All systems nominal."
5. WHEN the `platforms` array in the Store is empty, THE Frontend SHALL render the Empty_State component on the Platforms page with the message "No platform data available."
6. WHEN the `maintenance` array in the Store is empty, THE Frontend SHALL render the Empty_State component on the Maintenance page with the message "No maintenance records found."
7. IF a page component throws an unhandled error, THEN THE Error_Boundary SHALL log the error details to the browser console and render the fallback panel without unmounting the Sidebar or TopNav.

---

### Requirement 10: API Endpoint Validation

**User Story:** As a developer, I want all backend API endpoints to return correct HTTP status codes and response shapes, so that the frontend can rely on a consistent contract.

#### Acceptance Criteria

1. WHEN `GET /api/trains` is called with valid query parameters, THE Backend SHALL return HTTP 200 with a JSON body containing `data` (array) and `pagination` (object with `page`, `limit`, `total`, `totalPages`).
2. WHEN `GET /api/trains/:id` is called with a non-existent ID, THE Backend SHALL return HTTP 404 with a JSON body containing a `message` field.
3. WHEN `POST /api/trains` is called without required fields (`trainNumber`, `trainName`, `route`, `source`, `destination`), THE Backend SHALL return HTTP 400 with a JSON body containing a `message` field.
4. WHEN `POST /api/auth/login` is called with invalid credentials, THE Backend SHALL return HTTP 401 with a JSON body containing a `message` field.
5. WHEN any protected route is called without a valid JWT, THE Backend SHALL return HTTP 401 with a JSON body containing a `message` field.
6. WHEN any protected route is called with a JWT belonging to a role that lacks permission, THE Backend SHALL return HTTP 403 with a JSON body containing a `message` field.
7. WHEN `GET /health` is called, THE Backend SHALL return HTTP 200 with a JSON body containing `status: "ok"`, `service`, and `timestamp` fields.

---

### Requirement 11: Responsive Layout

**User Story:** As a station master using a tablet, I want the application to be usable on screens as small as 768px wide, so that I can monitor trains from a station control room tablet.

#### Acceptance Criteria

1. WHEN the viewport width is less than 768px, THE Sidebar SHALL collapse to a hidden off-canvas drawer toggled by the hamburger button in the TopNav.
2. WHEN the viewport width is less than 768px, THE Dashboard KPI grid SHALL reflow from a 5-column layout to a 2-column layout.
3. WHEN the viewport width is less than 768px, THE Live Trains table SHALL enable horizontal scrolling with a minimum table width of 900px preserved.
4. WHEN the viewport width is less than 768px, THE Alerts grid SHALL reflow from a 2-column layout to a single-column layout.
5. WHEN the viewport width is less than 1024px, THE Dashboard central row (map + AI panel) SHALL stack vertically.

---

### Requirement 12: Frontend Production Build

**User Story:** As a DevOps engineer, I want the frontend to produce an optimised production build, so that the application loads quickly for end users.

#### Acceptance Criteria

1. WHEN `vite build` is executed in the `frontend` directory, THE Frontend SHALL complete the build without errors and output artefacts to `frontend/dist`.
2. THE Production_Build SHALL split vendor dependencies (React, Framer Motion, Zustand, React Router) into a separate chunk from application code.
3. THE Production_Build SHALL produce a total initial JavaScript bundle size of less than 500KB (gzipped).
4. THE `frontend/vercel.json` SHALL include SPA rewrite rules so that all routes resolve to `index.html`.
5. THE `frontend/vercel.json` SHALL include `Cache-Control: public, max-age=31536000, immutable` headers for all files under `/assets/`.

---

### Requirement 13: Backend Production Hardening

**User Story:** As a DevOps engineer, I want the backend to be secure and stable in production, so that the system can handle real traffic without vulnerabilities or crashes.

#### Acceptance Criteria

1. THE Backend SHALL use the `helmet` middleware to set secure HTTP response headers on all routes, including `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy`.
2. THE Backend SHALL enforce a rate limit of 300 requests per 15-minute window per IP on all `/api/` routes.
3. THE Backend SHALL enforce a stricter rate limit of 50 requests per 15-minute window per IP on `/api/auth/` routes.
4. WHEN `NODE_ENV` is set to `production`, THE Backend SHALL disable the `morgan` HTTP request logger.
5. THE `backend/render.yaml` SHALL declare all required environment variable keys (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL`, `NODE_ENV`) so that Render can validate configuration at deploy time.
6. WHEN the Backend receives a request body larger than 10KB, THE Backend SHALL reject the request with HTTP 413.
7. THE Backend SHALL respond to `GET /health` within 200ms under normal load to satisfy Render's health check.

---

### Requirement 14: Production Environment Variables

**User Story:** As a DevOps engineer, I want all environment-specific configuration to be managed through environment variables, so that the same codebase can run in development and production without code changes.

#### Acceptance Criteria

1. THE Frontend SHALL read the backend API base URL exclusively from the `VITE_API_URL` environment variable and never hardcode `localhost` URLs in production code.
2. THE Backend SHALL read the database connection string exclusively from the `DATABASE_URL` environment variable.
3. THE Backend SHALL read the JWT signing secret exclusively from the `JWT_SECRET` environment variable and never use a hardcoded fallback in production.
4. THE `frontend/.env.example` and `backend/.env.example` files SHALL document every required environment variable with a placeholder value and a one-line comment describing its purpose.
5. IF `JWT_SECRET` is not set when `NODE_ENV` is `production`, THEN THE Backend SHALL log a fatal error message and exit the process with code 1.

---

### Requirement 15: Security Hardening

**User Story:** As a security engineer, I want the application to follow security best practices, so that user credentials and operational data are protected.

#### Acceptance Criteria

1. THE Backend SHALL store all user passwords as bcrypt hashes with a cost factor of at least 10 and never store or log plaintext passwords.
2. THE Backend JWT tokens SHALL expire after the duration specified in `JWT_EXPIRES_IN` (default 7 days) and THE Backend SHALL reject expired tokens with HTTP 401.
3. THE Backend SHALL validate and sanitise all user-supplied query parameters and request body fields before using them in SQL queries, using parameterised queries exclusively.
4. THE Frontend SHALL store the JWT exclusively in `localStorage` and never expose it in URL parameters or log it to the console.
5. THE `frontend/vercel.json` SHALL include `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `X-XSS-Protection: 1; mode=block` headers on all routes.
6. WHERE a user's role is `viewer` or `analyst`, THE Backend SHALL return HTTP 403 for any `POST`, `PUT`, or `DELETE` request to train, platform, alert, or maintenance endpoints.
