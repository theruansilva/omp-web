# Session Daemon Architecture (`sessiond`)

## 1. Entry Point and Process Model
The session daemon is an isolated background service built with **Hono** and native **Bun** WebSockets (`hono/bun` with `createBunWebSocket`).
- **Entry Point:** The primary file is `src/server/sessiond.ts`.
- **Startup:** Invoked via Bun (`bun src/server/sessiond.ts`) or as a systemd user service (`omp-web-sessiond.service`).
- **Isolation Rationale:** Keeps AI agent execution runtimes decoupled from the frontend HTTP server (`omp-web.service` / Vite UI). Browser reloads, network reconnects, or UI updates never disrupt background agent execution.

## 2. IPC Communication Mechanism
Because the web interface and `sessiond` run in separate processes:
- The Web/API process proxies requests for `/api/activity`, `/api/auth`, `/api/sessions`, `/api/terminals`, and `/api/schedule-prompt` (plus WebSocket streams) via router in `src/server/sessiond/sessionProxyRoutes.ts`.
- Forwarding is handled by `SessionDaemonClient` (`src/sessiond/sessionDaemonClient.ts`).
- Standard local communication uses a **Unix Domain Socket** (`~/.omp-web/sessiond.sock`) or TCP if `OMP_WEB_SESSIOND_PORT` is set.

## 3. Lifecycle and Shutdown
In `src/server/sessiond.ts`, the daemon listens for `SIGINT` and `SIGTERM` system signals:
- Invokes orderly asynchronous shutdown for all subsystems (`terminals`, `auth`, `sessions`, `workspaceActivity`, sockets).
- **Process Reaper (`src/server/sessions/processReaper.ts`):** On startup and during execution, sessiond reaps orphan processes (`reapOrphanProcesses`), ensuring child tool processes do not linger or leak host resources.

## 4. Scheduled Tasks & Periodic Jobs
- **Schedule Prompt Service (`src/server/sessions/schedulePrompt/`):** Routes and execution engine for prompt scheduling powered by `croner`.
- **Heartbeats:** `publishHeartbeats()` loop in `PiSessionService` notifying active session statuses.
- **OAuth TTL:** Expiration timers in `oauthLoginFlowService.ts` for stale authentication attempts.
- **Compaction & Prompt Draining:** Dedicated FIFO queues prevent concurrent prompt collisions.

## 5. Key File Paths
* `src/server/sessiond.ts` (Core daemon runtime and Hono initializer)
* `src/server/sessiond/sessionProxyRoutes.ts` (Web API proxy routes to sessiond)
* `src/sessiond/sessionDaemonClient.ts` (Local RPC client via Unix socket / HTTP)
* `src/server/sessions/piSessionService.ts` (Agent runtime and session orchestrator)
* `src/server/sessions/schedulePrompt/` (Cron scheduling service and routes)
* `src/server/sessions/processReaper.ts` (Process reaper for orphan cleanup)
* `src/cli.ts` (CLI service management)
