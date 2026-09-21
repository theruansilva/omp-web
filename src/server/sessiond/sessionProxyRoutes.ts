import type { Hono } from "hono";
import type { UpgradeWebSocket } from "hono/ws";
import type { WebSocket } from "ws";
import { SessionDaemonClient } from "../../sessiond/sessionDaemonClient.js";
import { bridgeHonoSocketToUpstream } from "../webSocketBridge.js";

export type SessionProxyDaemon = Pick<SessionDaemonClient, "request" | "connectWebSocket">;

export function registerSessionProxyRoutes(
  app: Hono,
  daemon: SessionProxyDaemon = new SessionDaemonClient(),
  prefix = "/api",
  upgradeWebSocket?: UpgradeWebSocket,
): void {
  const proxy = async (c: { req: { method: string; url: string; raw: Request } }, explicitPath?: string): Promise<Response> => {
    try {
      let strippedPath: string;
      if (explicitPath !== undefined) {
        strippedPath = explicitPath;
      } else {
        const url = new URL(c.req.url);
        strippedPath = stripPrefix(url.pathname + url.search, prefix);
      }
      const method = c.req.method;
      const body = method === "GET" || method === "HEAD" ? undefined : await c.req.raw.json().catch(() => undefined);
      const upstream = await daemon.request(method, strippedPath, body);

      const headers = new Headers();
      const contentType = upstream.headers["content-type"];
      if (contentType !== undefined && contentType !== "") {
        headers.set("content-type", contentType);
      }
      return new Response(upstream.body, { status: upstream.statusCode, headers });
    } catch (error) {
      return Response.json({ error: `Session daemon unavailable: ${error instanceof Error ? error.message : String(error)}` }, { status: 502 });
    }
  };

  app.get(`${prefix}/sessiond/health`, (c) => proxy(c, "/health"));
  app.get(`${prefix}/sessiond/runtime`, (c) => proxy(c, "/runtime"));

  if (upgradeWebSocket !== undefined) {
    app.get(`${prefix}/sessions/:sessionId/events`, upgradeWebSocket((c) => {
      const url = new URL(c.req.url);
      const strippedPath = stripPrefix(url.pathname + url.search, prefix);
      let upstream: WebSocket | undefined;

      return {
        onOpen(_evt, ws) {
          upstream = daemon.connectWebSocket(strippedPath);
          bridgeHonoSocketToUpstream(ws, upstream);
        },
        onClose() {
          upstream?.close();
        },
        onError() {
          upstream?.close();
        },
      };
    }));

    app.get(`${prefix}/sessions/events`, upgradeWebSocket(() => {
      let upstream: WebSocket | undefined;
      return {
        onOpen(_evt, ws) {
          upstream = daemon.connectWebSocket("/sessions/events");
          bridgeHonoSocketToUpstream(ws, upstream);
        },
        onClose() {
          upstream?.close();
        },
        onError() {
          upstream?.close();
        },
      };
    }));

    app.get(`${prefix}/events`, upgradeWebSocket(() => {
      let upstream: WebSocket | undefined;
      return {
        onOpen(_evt, ws) {
          upstream = daemon.connectWebSocket("/events");
          bridgeHonoSocketToUpstream(ws, upstream);
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

  app.all(`${prefix}/activity`, (c) => proxy(c));
  app.all(`${prefix}/auth`, (c) => proxy(c));
  app.all(`${prefix}/auth/*`, (c) => proxy(c));
  app.all(`${prefix}/sessions`, (c) => proxy(c));
  app.all(`${prefix}/sessions/*`, (c) => proxy(c));
  app.all(`${prefix}/schedule-prompts`, (c) => proxy(c));
  app.all(`${prefix}/schedule-prompts/*`, (c) => proxy(c));
}

function stripPrefix(url: string, prefix: string): string {
  const path = url.split("?", 1)[0] ?? url;
  const query = url.slice(path.length);
  const stripped = path.startsWith(prefix) ? `${path.slice(prefix.length)}${query}` : url;
  return stripped === "" ? "/" : stripped;
}
