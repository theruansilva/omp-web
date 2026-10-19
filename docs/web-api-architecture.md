# Web/API and Frontend Architecture (`omp-web`)

## 1. Server Entry Point
The primary web server entry point is `src/server/index.ts`. It runs on the **Bun** runtime and executes `buildApp()` (`src/server/app.ts`), which initializes project managers, machines, configuration, and proxy routes.

## 2. Web Framework & Routing Pattern
- **Framework:** Built with **Hono** (`hono` and `hono/bun` with `createBunWebSocket`) powered natively by `Bun.serve`.
- **Routing Organization:** Modular routers registered on Hono:
  - `registerLocalProjectRoutes(app, ...)`
  - `registerMachineRoutes(app, machines)`
  - `registerMachineProxyRoutes(app, machines)`
  - `registerSessionProxyRoutes(app, sessionClient)`

## 3. Communication Architecture (REST + WebSockets)
- **REST (HTTP):** JSON endpoints for asynchronous state control, CRUD operations, configuration, machines, git state, and usage metrics.
- **WebSockets (WS/WSS):** Managed via Hono's `createBunWebSocket()` for real-time telemetry, event streaming (`/api/events`), interactive terminals, and bidirectional message multiplexing.

## 4. Frontend Client Patterns
The web frontend is a modular, reactive Single Page Application (SPA):
- **Framework:** **Lit** (Web Components) bundled via Vite.
- **Rendering & Styling:**
  - Light DOM (`createRenderRoot() { return this; }`) enabling Tailwind CSS utilities, OKLCH theme variables, and dynamic tokens.
  - Squircle containers (`clip-path: var(--clip-path-squircle-28, none)`) with adaptive light/dark palettes.
- **State Organization:** State orchestration in `OmpWebApp.ts` and `OmpApp.ts`, coordinating session controllers, terminals, file trees, and configuration drawers.

## 5. Security & Authentication Middleware
Security is centralized in `src/server/security.ts` (`createSecurityMiddleware`):
1. **Automatic Token Generation**:
   - Token is loaded from `OMP_WEB_AUTH_TOKEN`, config `authToken`, or generated at `~/.omp-web/auth-token` (`0600` permissions).
2. **Browser Authentication Flow**:
   - Access via `http://127.0.0.1:8504?token=<token>` sets an `HttpOnly; SameSite=Lax` cookie (`omp_web_token`).
   - Direct access without token renders an Unlock screen with login API (`POST /api/omp-web/auth`).
3. **API & WebSocket Guards**:
   - Requests require `Authorization: Bearer <token>`, `omp_web_token` cookie, or `?token=<token>`.
   - Timing-attack safe comparisons via `crypto.timingSafeEqual`.
   - Public exceptions: `/health`, `/runtime`, `/api/omp-web/status`, `/api/omp-web/version`, `/api/omp-web/runtime`, `/api/omp-web/auth`, and `/omp-web-plugins/*`.
