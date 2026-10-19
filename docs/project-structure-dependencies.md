# Project Structure & Dependencies

## 1. Dependencies (`package.json`)
The project operates with **Bun** as its primary runtime and package manager, coupling a high-performance backend with a modern Lit Web Components frontend:
- **Server:** `hono` and `hono/bun` (HTTP & WebSockets via `createBunWebSocket`).
- **Frontend / UI:** `lit` (Web Components), `@codemirror/*` (Code editor and syntax highlighting), `@xterm/xterm` (Interactive web terminal), `@progmruansilva/squircles` (Squircle geometry).
- **Terminals / PTY:** `bun-pty`, `node-pty`.
- **Scheduling & Cron:** `croner` (Standard cron engine for scheduled prompts and automated workspace tasks).
- **Utilities & Formatting:** `marked` (Markdown parsing), `diff`, `@sinclair/typebox`.
- **Build, Lint & Test:** `vite`, `typescript`, `vitest`, `eslint`.

## 2. Build Configuration (`tsconfig.json`)
Modern TypeScript environment configured for strict type-safety:
- `target`: `ES2022`
- `module`: `ESNext`
- `moduleResolution`: `bundler`
- `strict`: `true`

## 3. Directory Layout
- `/src/client/`: Frontend SPA (Lit Web Components, Cockpit v3, dynamic UI Colors, terminal, file explorer, AskTool drawer, and Generative UI).
- `/src/server/`: Backend Hono services (Main web API, `sessiond`, session orchestration, terminals, and proxies).
- `/src/shared/`: Shared TypeScript interfaces and contracts (`src/shared/apiTypes.ts`).
- `/omp-web-plugins/`: Catalog and implementations for OMP Web plugins.
- `/extensions/`: CLI commands and extensions.
- `/docs/`: Technical architecture, configuration, deployment, and feature guides.

## 4. Scheduling & Recurring Executions
- **`croner`**: Used in `src/server/sessions/schedulePrompt/` for prompt scheduling supporting standard 6-field cron expressions (`0 * * * * *`) and intervals.
- **Heartbeats:** `setInterval` every 2000ms publishing active session telemetry (`piSessionService.ts`).
- **TTLs & Timeouts:** Lifecycle guards for OAuth sessions, graceful child process termination, and loop prevention.

## 5. Shared Types & Contracts
The `/src/shared/` directory represents the canonical interface between server and client:
- `src/shared/apiTypes.ts`: Defines contracts such as `ClientSession`, `SessionInfo`, `MachineStatus`, `AskDialogResult`, `SchedulePromptRequest`, etc.
- `src/shared/capabilities.ts`: Runtime capability declarations for API and session daemon.
