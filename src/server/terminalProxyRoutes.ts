import type { Hono } from "hono";
import type { UpgradeWebSocket } from "hono/ws";
import type { WebSocket } from "ws";
import type { ProjectService } from "./projects/projectService.js";
import { SessionDaemonClient } from "../sessiond/sessionDaemonClient.js";
import type { SessionProxyDaemon } from "./sessiond/sessionProxyRoutes.js";
import { resolveWorkspaceContext } from "./workspaces/workspaceContext.js";
import type { WorkspaceService } from "./workspaces/workspaceService.js";
import { terminalSizeQuery } from "./terminals/terminalSize.js";
import { bridgeHonoSocketToUpstream } from "./webSocketBridge.js";

export function registerTerminalProxyRoutes(
  app: Hono,
  projects: ProjectService,
  workspaces: WorkspaceService,
  daemon: SessionProxyDaemon = new SessionDaemonClient(),
  prefix = "/api",
  upgradeWebSocket?: UpgradeWebSocket,
): void {
  app.get(`${prefix}/projects/:projectId/workspaces/:workspaceId/terminals`, async (c) => {
    try {
      const projectId = c.req.param("projectId") ?? "";
      const workspaceId = c.req.param("workspaceId") ?? "";
      const context = await resolveWorkspaceContext(projects, workspaces, projectId, workspaceId);
      return await proxyJson(daemon, "GET", `/terminals?cwd=${encodeURIComponent(context.root)}`, undefined);
    } catch (error) {
      return requestFailed(error);
    }
  });

  app.delete(`${prefix}/projects/:projectId/workspaces/:workspaceId/terminals`, async (c) => {
    try {
      const projectId = c.req.param("projectId") ?? "";
      const workspaceId = c.req.param("workspaceId") ?? "";
      const context = await resolveWorkspaceContext(projects, workspaces, projectId, workspaceId);
      return await proxyJson(daemon, "DELETE", `/terminals?cwd=${encodeURIComponent(context.root)}`, undefined);
    } catch (error) {
      return requestFailed(error);
    }
  });

  app.post(`${prefix}/projects/:projectId/workspaces/:workspaceId/terminals`, async (c) => {
    try {
      const projectId = c.req.param("projectId") ?? "";
      const workspaceId = c.req.param("workspaceId") ?? "";
      const body = await c.req.json<{ name?: string; cols?: number; rows?: number }>().catch(() => ({}));
      const context = await resolveWorkspaceContext(projects, workspaces, projectId, workspaceId);
      return await proxyJson(daemon, "POST", "/terminals", { ...body, cwd: context.root });
    } catch (error) {
      return requestFailed(error);
    }
  });

  app.post(`${prefix}/projects/:projectId/workspaces/:workspaceId/terminals/:terminalId/continue`, async (c) => {
    try {
      const projectId = c.req.param("projectId") ?? "";
      const workspaceId = c.req.param("workspaceId") ?? "";
      const terminalId = c.req.param("terminalId") ?? "";
      await resolveWorkspaceContext(projects, workspaces, projectId, workspaceId);
      return await proxyJson(daemon, "POST", `/terminals/${encodeURIComponent(terminalId)}/continue`, undefined);
    } catch (error) {
      return requestFailed(error);
    }
  });

  app.delete(`${prefix}/projects/:projectId/workspaces/:workspaceId/terminals/:terminalId`, async (c) => {
    try {
      const projectId = c.req.param("projectId") ?? "";
      const workspaceId = c.req.param("workspaceId") ?? "";
      const terminalId = c.req.param("terminalId") ?? "";
      await resolveWorkspaceContext(projects, workspaces, projectId, workspaceId);
      return await proxyJson(daemon, "DELETE", `/terminals/${encodeURIComponent(terminalId)}`, undefined);
    } catch (error) {
      return requestFailed(error);
    }
  });

  app.post(`${prefix}/projects/:projectId/workspaces/:workspaceId/terminal-command-runs`, async (c) => {
    try {
      const projectId = c.req.param("projectId") ?? "";
      const workspaceId = c.req.param("workspaceId") ?? "";
      const body = await c.req.json<TerminalCommandRunRequest>();
      const context = await resolveWorkspaceContext(projects, workspaces, projectId, workspaceId);
      return await proxyJson(daemon, "POST", "/terminal-command-runs", {
        origin: body.origin,
        projectId,
        workspaceId,
        cwd: context.root,
        title: body.title,
        command: body.command,
        metadata: body.metadata ?? {},
      });
    } catch (error) {
      return requestFailed(error);
    }
  });

  app.get(`${prefix}/terminal-command-runs`, async (c) => {
    try {
      return await proxyJson(daemon, "GET", `/terminal-command-runs${terminalCommandRunQuery(c.req.query())}`, undefined);
    } catch (error) {
      return requestFailed(error);
    }
  });

  app.post(`${prefix}/terminal-command-runs/:runId/cancel`, async (c) => {
    try {
      const runId = c.req.param("runId") ?? "";
      return await proxyJson(daemon, "POST", `/terminal-command-runs/${encodeURIComponent(runId)}/cancel`, undefined);
    } catch (error) {
      return requestFailed(error);
    }
  });

  app.get(`${prefix}/terminal-command-runs/:runId`, async (c) => {
    try {
      const runId = c.req.param("runId") ?? "";
      return await proxyJson(daemon, "GET", `/terminal-command-runs/${encodeURIComponent(runId)}`, undefined);
    } catch (error) {
      return requestFailed(error);
    }
  });

  if (upgradeWebSocket !== undefined) {
    app.get(`${prefix}/projects/:projectId/workspaces/:workspaceId/terminals/:terminalId/socket`, upgradeWebSocket((c) => {
      const projectId = c.req.param("projectId") ?? "";
      const workspaceId = c.req.param("workspaceId") ?? "";
      const terminalId = c.req.param("terminalId") ?? "";
      const cols = c.req.query("cols");
      const rows = c.req.query("rows");
      let upstream: WebSocket | undefined;
      let bridge: { sendToUpstream: (data: unknown) => void } | undefined;
      const clientMessageQueue: unknown[] = [];

      return {
        async onOpen(_evt, ws) {
          try {
            await resolveWorkspaceContext(projects, workspaces, projectId, workspaceId);
            const sizeQuery = terminalSizeQuery(cols, rows);
            upstream = daemon.connectWebSocket(`/terminals/${terminalId}/socket${sizeQuery}`);
            bridge = bridgeHonoSocketToUpstream(ws, upstream);
            while (clientMessageQueue.length > 0) {
              const queued = clientMessageQueue.shift();
              if (queued !== undefined) bridge.sendToUpstream(queued);
            }
          } catch (error) {
            ws.send(JSON.stringify({ type: "error", message: error instanceof Error ? error.message : String(error) }));
            ws.close();
          }
        },
        onMessage(evt) {
          if (bridge !== undefined) {
            bridge.sendToUpstream(evt.data);
          } else {
            clientMessageQueue.push(evt.data);
          }
        },
        onClose() {
          upstream?.close();
        },
        onError() {
          upstream?.close();
        },
      };
    }));
  }
}

interface TerminalCommandRunRequest {
  origin: string;
  title: string;
  command: string;
  metadata?: Record<string, string>;
}

interface TerminalCommandRunQuery {
  projectId?: string;
  workspaceId?: string;
  terminalId?: string;
  statuses?: string;
  metadata?: string;
}

function terminalCommandRunQuery(filter: TerminalCommandRunQuery): string {
  const params = new URLSearchParams();
  if (filter.projectId !== undefined) params.set("projectId", filter.projectId);
  if (filter.workspaceId !== undefined) params.set("workspaceId", filter.workspaceId);
  if (filter.terminalId !== undefined) params.set("terminalId", filter.terminalId);
  if (filter.statuses !== undefined) params.set("statuses", filter.statuses);
  if (filter.metadata !== undefined) params.set("metadata", filter.metadata);
  const query = params.toString();
  return query === "" ? "" : `?${query}`;
}

async function proxyJson(daemon: SessionProxyDaemon, method: string, path: string, body: unknown): Promise<Response> {
  const upstream = await daemon.request(method, path, body);
  const headers = new Headers();
  const contentType = upstream.headers["content-type"];
  if (contentType !== undefined && contentType !== "") {
    headers.set("content-type", contentType);
  }
  return new Response(upstream.body, { status: upstream.statusCode, headers });
}

function requestFailed(error: unknown): Response {
  return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
}
