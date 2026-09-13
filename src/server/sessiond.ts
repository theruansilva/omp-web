#!/usr/bin/env bun
import { mkdir, rm } from "node:fs/promises";
import { dirname } from "node:path";
import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import { WorkspaceActivityService } from "./activity/workspaceActivityService.js";
import { registerWorkspaceActivityRoutes } from "./activity/workspaceActivityRoutes.js";
import { SessionEventHub } from "./realtime/sessionEventHub.js";
import { AuthService } from "./sessions/authService.js";
import { registerAuthRoutes } from "./sessions/authRoutes.js";
import { PiSessionService } from "./sessions/piSessionService.js";
import { registerSessionRoutes } from "./sessions/sessionRoutes.js";
import { ProjectScopedSpawnTargetResolver } from "./sessions/spawnTargetResolver.js";
import { ProjectService } from "./projects/projectService.js";
import { ProjectStore } from "./storage/projectStore.js";
import { WorkspaceService } from "./workspaces/workspaceService.js";
import { sessiondSocketPath } from "../sessiond/config.js";
import { TerminalService } from "./terminals/terminalService.js";
import { registerTerminalRoutes } from "./terminals/terminalRoutes.js";
import { getOmpWebRuntimeComponent } from "./ompWebStatus.js";
import { SESSIOND_RUNTIME_CAPABILITIES } from "../shared/capabilities.js";
import { effectiveOmpWebConfig, maxUploadBytes, spawnSessionsEnabled, subsessionsEnabled } from "../config.js";
import { PushNotificationService } from "./push/PushNotificationService.js";
import { registerPushRoutes } from "./push/pushRoutes.js";

const { config } = effectiveOmpWebConfig();
const app = Fastify({ logger: true, bodyLimit: maxUploadBytes(process.env, config) });
await app.register(fastifyWebsocket);

const eventHub = new SessionEventHub();
const workspaceActivity = new WorkspaceActivityService(eventHub);
const auth = await AuthService.create();
const spawnTargets = spawnSessionsEnabled(process.env, config)
  ? new ProjectScopedSpawnTargetResolver({ projects: new ProjectService(new ProjectStore()), workspaces: new WorkspaceService() })
  : undefined;
const pushService = new PushNotificationService((msg) => { app.log.warn({ service: "push" }, msg); });
const sessions = new PiSessionService(eventHub, {
  modelRegistry: auth.modelRegistry,
  workspaceActivity,
  logger: app.log,
  pushService,
  ...(spawnTargets === undefined ? {} : { spawnTargets }),
  subsessionsEnabled: spawnTargets !== undefined && subsessionsEnabled(process.env, config),
});
auth.subscribe((change) => { sessions.applyAuthChange(change); });
const terminals = new TerminalService(eventHub, workspaceActivity);
registerWorkspaceActivityRoutes(app, workspaceActivity);
registerAuthRoutes(app, auth);
registerSessionRoutes(app, sessions, eventHub);
registerTerminalRoutes(app, terminals);
registerPushRoutes(app, pushService);

app.get("/health", () => {
  const runtime = getOmpWebRuntimeComponent("sessiond", SESSIOND_RUNTIME_CAPABILITIES);
  return {
    ok: true,
    activeSessions: sessions.activeCount(),
    checkedAt: new Date().toISOString(),
    version: {
      component: runtime.component,
      label: runtime.label,
      ...(runtime.runtimeVersion === undefined ? {} : { runtimeVersion: runtime.runtimeVersion }),
      stale: false,
      available: runtime.available,
    },
  };
});

app.get("/runtime", () => getOmpWebRuntimeComponent("sessiond", SESSIOND_RUNTIME_CAPABILITIES));

let shuttingDown = false;
async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info({ signal }, "shutting down session daemon");
  terminals.dispose();
  auth.dispose();
  await sessions.dispose();
  await app.close();
}

process.once("SIGINT", (signal) => { void shutdown(signal); });
process.once("SIGTERM", (signal) => { void shutdown(signal); });

const portValue = process.env["OMP_WEB_SESSIOND_PORT"];
const port = portValue !== undefined && portValue !== "" ? Number(portValue) : undefined;
const host = process.env["OMP_WEB_SESSIOND_HOST"] ?? "127.0.0.1";

if (port !== undefined) {
  await app.listen({ port, host });
} else {
  const path = sessiondSocketPath();
  await mkdir(dirname(path), { recursive: true });
  await rm(path, { force: true });
  await app.listen({ path });
  process.on("exit", () => void rm(path, { force: true }));
}
