import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { createSecurityMiddleware, getOrGenerateAuthToken, hashPassword, parseCookie, safeTokenCompare, verifyUserPassword } from "./security.js";
import { createBunWebSocket } from "hono/bun";
import { serveStatic } from "hono/bun";
import { ProjectStore } from "./storage/projectStore.js";
import { ProjectService } from "./projects/projectService.js";
import { WorkspaceService } from "./workspaces/workspaceService.js";
import { isAbsoluteishFileSuggestionQuery, listFileSuggestions, listPathSuggestions } from "./workspaces/fileSuggestions.js";
import { pathAccessForCwd } from "./workspaces/effectivePathAccess.js";
import { loadEffectiveProjectUploadsConfig } from "./workspaces/projectOmpWebConfig.js";
import { normalizeRequestCwd } from "./workingDirectory.js";
import { listDirectorySuggestions } from "./projects/directorySuggestions.js";
import { SessionDaemonClient } from "../sessiond/sessionDaemonClient.js";
import { registerSessionProxyRoutes, type SessionProxyDaemon } from "./sessiond/sessionProxyRoutes.js";
import { registerWorkspaceExplorerRoutes } from "./workspaceExplorerRoutes.js";
import { registerGitRoutes } from "./gitRoutes.js";
import { registerTerminalProxyRoutes } from "./terminalProxyRoutes.js";
import { registerWorkspaceDeletionRoutes } from "./workspaces/workspaceDeletionRoutes.js";
import { createFileOmpWebConfigService, registerConfigRoutes, registerLocalMachineConfigRoutes, type OmpWebConfigService } from "./configRoutes.js";
import { OmpWebPluginService } from "./ompWebPluginService.js";
import { createDefaultPiPackageService, type PiPackageService } from "./piPackageService.js";
import { registerPiPackageRoutes } from "./piPackageRoutes.js";
import { createOmpWebStatusCache } from "./ompWebStatusCache.js";
import { getOmpWebRuntime, getOmpWebStatus, getOmpWebVersionStatus } from "./ompWebStatus.js";
import { MachineService } from "./machines/machineService.js";
import { registerMachineRoutes } from "./machines/machineRoutes.js";
import { registerMachineProxyRoutes } from "./machines/machineProxyRoutes.js";
import { proxyMachinePluginAsset, registerMachinePluginProxyRoutes } from "./machines/machinePluginProxyRoutes.js";
import { PushNotificationService } from "./push/PushNotificationService.js";
import { registerPushRoutes } from "./push/pushRoutes.js";
import { registerMcpRoutes } from "./mcpRoutes.js";
import { registerUsageRoutes } from "./usageRoutes.js";
import type { Project, Workspace } from "./types.js";

export interface AppDependencies {
  projects?: ProjectService;
  workspaces?: WorkspaceService;
  machines?: MachineService;
  sessionDaemon?: SessionProxyDaemon;
  ompWebPlugins?: Pick<OmpWebPluginService, "manifest" | "plugins" | "readAsset">;
  piPackages?: PiPackageService;
  config?: OmpWebConfigService;
  clientDist?: string | false;
  logger?: unknown;
  /** Maximum accepted HTTP request body size in bytes. */
  bodyLimit?: number;
  authRequired?: boolean;
  authToken?: string;
  authUsername?: string;
  authPasswordHash?: string;
}

export interface BuiltApp {
  readonly hono: Hono;
  readonly websocket: ReturnType<typeof createBunWebSocket>["websocket"];
  close(): Promise<void>;
  ready(): Promise<void>;
  inject(options: { method: string; url: string; payload?: unknown; headers?: Record<string, string> }): Promise<{
    statusCode: number;
    headers: Record<string, string>;
    body: string;
    json<T = unknown>(): T;
  }>;
}

interface LocalProjectRouteOptions {
  config?: Pick<OmpWebConfigService, "read">;
}

function registerLocalProjectRoutes(app: Hono, projects: ProjectService, workspaces: WorkspaceService, prefix: string, options: LocalProjectRouteOptions = {}): void {
  app.get(`${prefix}/projects`, async (c) => c.json(await projects.list()));

  app.post(`${prefix}/projects`, async (c) => {
    try {
      const body = await c.req.json<{ name?: string; path: string; create?: boolean }>();
      return c.json(await projects.add(body));
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
  });

  app.delete(`${prefix}/projects/:projectId`, async (c) => {
    try {
      const projectId = c.req.param("projectId");
      await projects.close(projectId);
      return c.json({ closed: true });
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : String(error) }, 404);
    }
  });

  app.get(`${prefix}/project-directories`, async (c) => {
    try {
      const q = c.req.query("q") ?? "";
      return c.json(await listDirectorySuggestions(q));
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
  });

  app.get(`${prefix}/projects/:projectId/workspaces`, async (c) => {
    try {
      const projectId = c.req.param("projectId");
      const project = await projects.requireProject(projectId);
      return c.json(await listWorkspacesWithEffectiveConfig(project, workspaces, options.config));
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : String(error) }, 404);
    }
  });
}

async function listWorkspacesWithEffectiveConfig(project: Project, workspaces: WorkspaceService, config?: Pick<OmpWebConfigService, "read">): Promise<Workspace[]> {
  const [workspaceList, effectiveConfig] = await Promise.all([
    workspaces.list(project),
    workspaceEffectiveConfig(project.path, config),
  ]);
  return workspaceList.map((workspace) => ({ ...workspace, effectiveConfig }));
}

async function workspaceEffectiveConfig(projectPath: string, config?: Pick<OmpWebConfigService, "read">): Promise<NonNullable<Workspace["effectiveConfig"]>> {
  const globalConfig = config === undefined ? {} : (await config.read()).effectiveConfig;
  return { uploads: await loadEffectiveProjectUploadsConfig(projectPath, globalConfig) };
}

interface LocalFileSuggestionRouteOptions {
  config?: Pick<OmpWebConfigService, "read">;
}

function registerLocalFileSuggestionRoutes(app: Hono, projects: ProjectService, workspaces: WorkspaceService, prefix: string, options: LocalFileSuggestionRouteOptions = {}): void {
  app.get(`${prefix}/files`, async (c) => {
    const cwd = c.req.query("cwd");
    if (cwd === undefined || cwd === "") return c.json({ error: "cwd query parameter is required" }, 400);
    try {
      const normalized = normalizeRequestCwd(cwd);
      const query = c.req.query("q") ?? "";
      const pathAccess = isAbsoluteishFileSuggestionQuery(query) ? await pathAccessForCwd(normalized, projects, workspaces, options.config) : undefined;
      const mode = c.req.query("mode");
      const kind = c.req.query("kind") as "tracked" | "untracked" | "other" | undefined;
      const scope = c.req.query("scope") as "tracked" | "all" | undefined;
      if (mode === "path") return c.json(await listPathSuggestions(normalized, query, pathAccess));
      return c.json(await listFileSuggestions(normalized, query, { kind, scope, pathAccess }));
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
  });
}

export async function buildApp(deps: AppDependencies = {}): Promise<BuiltApp> {
  const app = new Hono();
  const configService = deps.config ?? createFileOmpWebConfigService();
  const effectiveConfig = (await configService.read()).effectiveConfig;

  let cachedAllowedHosts = effectiveConfig.allowedHosts;
  let lastCheck = 0;

  const getAllowedHosts = async (): Promise<string[] | true | undefined> => {
    const now = Date.now();
    if (now - lastCheck < 1000) return cachedAllowedHosts;
    lastCheck = now;
    try {
      cachedAllowedHosts = (await configService.read()).effectiveConfig.allowedHosts;
    } catch {
      // keep cached
    }
    return cachedAllowedHosts;
  };

  let currentAuthUsername = deps.authUsername ?? effectiveConfig.authUsername;
  let currentAuthPasswordHash = deps.authPasswordHash ?? effectiveConfig.authPasswordHash;
  const authRequired = deps.authRequired ?? (effectiveConfig.authRequired ?? (process.env["OMP_WEB_AUTH_REQUIRED"] === "1" || process.env["OMP_WEB_AUTH_REQUIRED"] === "true"));
  const authToken = deps.authToken ?? effectiveConfig.authToken ?? getOrGenerateAuthToken();

  app.use("*", createSecurityMiddleware({
    allowedHosts: getAllowedHosts,
    authRequired,
    authToken,
    authUsername: () => currentAuthUsername,
    authPasswordHash: () => currentAuthPasswordHash,
  }));
  const { upgradeWebSocket, websocket } = createBunWebSocket();

  const projects = deps.projects ?? new ProjectService(new ProjectStore());
  const workspaces = deps.workspaces ?? new WorkspaceService();
  const ompWebPlugins = deps.ompWebPlugins ?? new OmpWebPluginService();
  const piPackages = deps.piPackages ?? createDefaultPiPackageService();
  const sessionDaemon = deps.sessionDaemon ?? new SessionDaemonClient();
  const ompWebStatusCache = createOmpWebStatusCache(() => getOmpWebStatus(sessionDaemon), {
    onError: (error) => { console.warn("failed to refresh PI WEB status cache", error); },
  });
  const machines = deps.machines ?? new MachineService(undefined, {
    localRuntime: () => getOmpWebRuntime(sessionDaemon),
    allowPrivateMachines: () => effectiveConfig.allowPrivateMachines ?? (process.env["OMP_WEB_ALLOW_PRIVATE_MACHINES"] === "1" || process.env["OMP_WEB_ALLOW_PRIVATE_MACHINES"] === "true"),
  });

  app.get("/omp-web-plugins/manifest.json", async (c) => c.json(await ompWebPlugins.manifest()));

  app.get("/omp-web-plugins/:pluginId/*", async (c) => {
    const pluginId = c.req.param("pluginId");
    const wildcard = c.req.path.slice(`/omp-web-plugins/${encodeURIComponent(pluginId)}/`.length);
    const proxyRes = await proxyMachinePluginAsset(machines, pluginId, wildcard, c.req.url);
    if (proxyRes !== null) return proxyRes;

    const asset = await ompWebPlugins.readAsset(pluginId, wildcard);
    if (asset === undefined) return c.json({ error: "Plugin asset not found" }, 404);
    return new Response(asset.content as unknown as BodyInit, {
      headers: { "Content-Type": asset.contentType },
    });
  });

  app.post("/api/omp-web/setup", async (c) => {
    try {
      if (!authRequired) {
        return c.json({ error: "Authentication is not enabled on this instance" }, 400);
      }
      if (currentAuthUsername && currentAuthPasswordHash) {
        return c.json({ error: "Setup has already been completed" }, 400);
      }

      const body = await c.req.json<{ username?: string; password?: string; token?: string }>().catch(() => ({} as { username?: string; password?: string; token?: string }));
      const username = body.username?.trim();
      const password = body.password;
      const token = body.token?.trim();

      // Token is optional on first-time setup (makes it seamless like AionUi)
      if (token && !safeTokenCompare(token, authToken)) {
        return c.json({ error: "Invalid activation token" }, 401);
      }
      if (!username || username.length < 2) {
        return c.json({ error: "Username must be at least 2 characters" }, 400);
      }
      if (!password || password.length < 6) {
        return c.json({ error: "Password must be at least 6 characters" }, 400);
      }

      const passwordHash = await hashPassword(password);
      await configService.write({
        authUsername: username,
        authPasswordHash: passwordHash,
      });

      currentAuthUsername = username;
      currentAuthPasswordHash = passwordHash;

      c.header("Set-Cookie", `omp_web_token=${encodeURIComponent(authToken)}; Path=/; HttpOnly; SameSite=Lax`);
      return c.json({ ok: true });
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
  });

  app.post("/api/omp-web/auth", async (c) => {
    try {
      const body = await c.req.json<{ username?: string; password?: string; token?: string }>().catch(() => ({} as { username?: string; password?: string; token?: string }));

      // 1. Username + Password login
      if (body.username !== undefined || body.password !== undefined) {
        const setupRequired = authRequired && (!currentAuthUsername || !currentAuthPasswordHash);
        if (setupRequired) {
          return c.json({ error: "Setup required: administrator account has not been created", setupRequired: true }, 400);
        }

        const username = body.username?.trim();
        const password = body.password;
        if (!username || !password) {
          return c.json({ error: "Username and password are required" }, 400);
        }

        const userMatch = currentAuthUsername && username.toLowerCase() === currentAuthUsername.toLowerCase();
        const passwordMatch = userMatch && currentAuthPasswordHash && await verifyUserPassword(password, currentAuthPasswordHash);

        if (!passwordMatch) {
          return c.json({ error: "Invalid username or password" }, 401);
        }

        c.header("Set-Cookie", `omp_web_token=${encodeURIComponent(authToken)}; Path=/; HttpOnly; SameSite=Lax`);
        return c.json({ ok: true });
      }

      // 2. Direct Token login
      const candidate = body.token?.trim();
      if (!candidate || !safeTokenCompare(candidate, authToken)) {
        return c.json({ error: "Invalid auth token" }, 401);
      }
      c.header("Set-Cookie", `omp_web_token=${encodeURIComponent(candidate)}; Path=/; HttpOnly; SameSite=Lax`);
      return c.json({ ok: true });
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
  });

  app.delete("/api/omp-web/auth", async (c) => {
    c.header("Set-Cookie", "omp_web_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax");
    return c.json({ ok: true });
  });

  app.get("/api/omp-web/auth", async (c) => {
    const authHeader = c.req.header("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;
    const cookieToken = parseCookie(c.req.header("cookie"), "omp_web_token");
    const queryToken = c.req.query("token");
    const token = bearerToken ?? cookieToken ?? queryToken;
    const authenticated = !authRequired || safeTokenCompare(token, authToken);
    const setupRequired = authRequired && (!currentAuthUsername || !currentAuthPasswordHash);
    return c.json({
      authenticated,
      authRequired,
      setupRequired,
      username: authenticated && currentAuthUsername ? currentAuthUsername : undefined,
    });
  });

  app.get("/api/omp-web/status", async (c) => c.json(await ompWebStatusCache.get()));
  app.get("/api/omp-web/version", async (c) => c.json(await getOmpWebVersionStatus(sessionDaemon)));
  app.get("/api/omp-web/runtime", async (c) => c.json(await getOmpWebRuntime(sessionDaemon)));
  app.get("/api/plugins", async (c) => c.json(await ompWebPlugins.plugins()));
  app.get("/api/machines/local/plugins", async (c) => c.json(await ompWebPlugins.plugins()));
  registerPiPackageRoutes(app, piPackages);
  registerPiPackageRoutes(app, piPackages, "/api/machines/local");
  registerConfigRoutes(app, configService);
  registerLocalMachineConfigRoutes(app, configService);

  registerMachineRoutes(app, machines);
  registerMachinePluginProxyRoutes(app, machines);

  registerLocalProjectRoutes(app, projects, workspaces, "/api", { config: configService });
  registerLocalProjectRoutes(app, projects, workspaces, "/api/machines/local", { config: configService });

  registerSessionProxyRoutes(app, sessionDaemon, "/api", upgradeWebSocket);
  registerSessionProxyRoutes(app, sessionDaemon, "/api/machines/local", upgradeWebSocket);
  registerWorkspaceExplorerRoutes(app, projects, workspaces, "/api", { config: configService });
  registerWorkspaceExplorerRoutes(app, projects, workspaces, "/api/machines/local", { config: configService });
  registerGitRoutes(app, projects, workspaces);
  registerGitRoutes(app, projects, workspaces, "/api/machines/local");
  registerTerminalProxyRoutes(app, projects, workspaces, sessionDaemon, "/api", upgradeWebSocket);
  registerTerminalProxyRoutes(app, projects, workspaces, sessionDaemon, "/api/machines/local", upgradeWebSocket);
  registerWorkspaceDeletionRoutes(app, projects, workspaces, sessionDaemon);
  registerWorkspaceDeletionRoutes(app, projects, workspaces, sessionDaemon, "/api/machines/local");

  registerLocalFileSuggestionRoutes(app, projects, workspaces, "/api", { config: configService });
  registerLocalFileSuggestionRoutes(app, projects, workspaces, "/api/machines/local", { config: configService });

  registerMcpRoutes(app, "/api");
  registerMcpRoutes(app, "/api/machines/local");

  registerUsageRoutes(app, "/api");
  registerUsageRoutes(app, "/api/machines/local");

  registerMachineProxyRoutes(app, machines, upgradeWebSocket);

  const pushService = new PushNotificationService((msg) => { console.warn("[push]", msg); });
  registerPushRoutes(app, pushService);

  const packagedClientDist = join(dirname(fileURLToPath(import.meta.url)), "..", "client");
  const localDistClient = join(process.cwd(), "dist", "client");
  const clientDist = deps.clientDist ?? (existsSync(join(packagedClientDist, "assets")) ? packagedClientDist : existsSync(localDistClient) ? localDistClient : packagedClientDist);
  if (clientDist !== false && existsSync(clientDist)) {
    app.get("/omp", (c) => {
      const ompHtmlPath = join(clientDist, "omp.html");
      if (existsSync(ompHtmlPath)) {
        return c.html(readFileSync(ompHtmlPath, "utf8"));
      }
      return c.text("OMP Web UI not found", 404);
    });
    app.use("/*", serveStatic({ root: clientDist }));
    app.notFound((c) => {
      const indexHtmlPath = join(clientDist, "index.html");
      if (existsSync(indexHtmlPath)) {
        return c.html(readFileSync(indexHtmlPath, "utf8"));
      }
      return c.text("Not found", 404);
    });
  }

  return {
    hono: app,
    websocket,
    async ready() { },
    async close() { },
    async inject(options: { method: string; url: string; payload?: unknown; headers?: Record<string, string> }) {
      const isBuffer = Buffer.isBuffer(options.payload) || options.payload instanceof Uint8Array;
      const isJson = options.payload !== undefined && !isBuffer && typeof options.payload !== "string";
      const headers: Record<string, string> = {
        host: "localhost",
        ...(isJson ? { "content-type": "application/json" } : {}),
        ...options.headers,
      };
      const body = (isJson ? JSON.stringify(options.payload) : options.payload) as BodyInit | undefined;
      const init: RequestInit = { method: options.method, headers };
      if (body !== undefined) init.body = body;
      const response = await app.request(options.url, init);
      const text = await response.text();
      return {
        statusCode: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: text,
        json: <T = unknown>() => JSON.parse(text) as T,
      };
    },
  };
}
