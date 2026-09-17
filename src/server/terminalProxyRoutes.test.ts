import type { Server } from "bun";
import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { registerTerminalProxyRoutes } from "./terminalProxyRoutes.js";
import type { ProjectService } from "./projects/projectService.js";
import type { WorkspaceService } from "./workspaces/workspaceService.js";
import type { Project, Workspace } from "./types.js";

let app: Hono;
let server: Server<unknown> | undefined;
let daemon: FakeTerminalDaemon;
let projects: ProjectService;
let workspaces: WorkspaceService;

const testProject: Project = { id: "p1", name: "Test Project" };
const testWorkspace: Workspace = { id: "w1", projectId: "p1", name: "default", path: "/test/workspace" };

class FakeTerminalDaemon {
  readonly requests: { method: string; path: string; body: unknown }[] = [];
  readonly websocketPaths: string[] = [];
  readonly connectedSockets: WebSocket[] = [];
  private readonly sockets = new Set<WebSocket>();
  private readonly connectionResolvers: ((socket: WebSocket) => void)[] = [];

  private constructor(private readonly upstream: WebSocketServer) {
    this.upstream.on("connection", (socket) => {
      this.sockets.add(socket);
      this.connectedSockets.push(socket);
      socket.on("close", () => { this.sockets.delete(socket); });
      const resolver = this.connectionResolvers.shift();
      if (resolver !== undefined) resolver(socket);
    });
  }

  static async create(): Promise<FakeTerminalDaemon> {
    const upstream = new WebSocketServer({ host: "127.0.0.1", port: 0 });
    await waitForListening(upstream);
    return new FakeTerminalDaemon(upstream);
  }

  waitForConnection(): Promise<WebSocket> {
    const existing = this.connectedSockets[0];
    if (existing !== undefined) return Promise.resolve(existing);
    const { promise, resolve } = Promise.withResolvers<WebSocket>();
    this.connectionResolvers.push(resolve);
    return promise;
  }

  request(method: string, path: string, body?: unknown): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
    this.requests.push({ method, path, body });
    return Promise.resolve({
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true }),
    });
  }

  connectWebSocket(path: string): WebSocket {
    this.websocketPaths.push(path);
    const ws = new WebSocket(`${webSocketServerUrl(this.upstream)}${path}`);
    this.sockets.add(ws);
    ws.on("close", () => { this.sockets.delete(ws); });
    return ws;
  }

  async close(): Promise<void> {
    for (const socket of this.sockets) socket.terminate();
    await closeWebSocketServer(this.upstream);
  }
}

beforeEach(async () => {
  app = new Hono();
  const { upgradeWebSocket, websocket } = createBunWebSocket();
  daemon = await FakeTerminalDaemon.create();

  projects = {
    requireProject: (id: string) => id === "p1" ? Promise.resolve(testProject) : Promise.reject(new Error("Project not found")),
  } as unknown as ProjectService;

  workspaces = {
    list: () => Promise.resolve([testWorkspace]),
  } as unknown as WorkspaceService;

  registerTerminalProxyRoutes(app, projects, workspaces, daemon, "/api", upgradeWebSocket);
  server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    fetch: app.fetch,
    websocket,
  });
});

afterEach(async () => {
  server?.stop(true);
  await daemon.close();
});

describe("terminal proxy routes", () => {
  it("bridges terminal WebSocket bidirectionally between client and upstream daemon", async () => {
    const client = new WebSocket(`ws://127.0.0.1:${server?.port}/api/projects/p1/workspaces/w1/terminals/t1/socket?cols=100&rows=30`);

    try {
      await waitForOpen(client);
      const upstreamSocket = await daemon.waitForConnection();
      expect(daemon.websocketPaths).toEqual(["/terminals/t1/socket?cols=100&rows=30"]);

      // 1. Client sends input message -> upstream receives it
      const upstreamMessagePromise = nextMessage(upstreamSocket);
      client.send(JSON.stringify({ type: "input", data: "echo hello\r" }));
      await expect(upstreamMessagePromise).resolves.toBe(JSON.stringify({ type: "input", data: "echo hello\r" }));

      // 2. Upstream sends output message -> client receives it
      const clientMessagePromise = nextMessage(client);
      upstreamSocket.send(JSON.stringify({ type: "output", data: "echo hello\r\n" }));
      await expect(clientMessagePromise).resolves.toBe(JSON.stringify({ type: "output", data: "echo hello\r\n" }));

      // 3. Client sends resize message -> upstream receives it
      const resizeMessagePromise = nextMessage(upstreamSocket);
      client.send(JSON.stringify({ type: "resize", cols: 120, rows: 40 }));
      await expect(resizeMessagePromise).resolves.toBe(JSON.stringify({ type: "resize", cols: 120, rows: 40 }));
    } finally {
      client.close();
    }
  });

  it("buffers messages sent by client before upstream connection is open", async () => {
    const client = new WebSocket(`ws://127.0.0.1:${server?.port}/api/projects/p1/workspaces/w1/terminals/t1/socket`);

    try {
      await waitForOpen(client);
      // Immediately send before upstream connection is fully established
      client.send(JSON.stringify({ type: "input", data: "early input" }));

      const upstreamSocket = await daemon.waitForConnection();
      await expect(nextMessage(upstreamSocket)).resolves.toBe(JSON.stringify({ type: "input", data: "early input" }));
    } finally {
      client.close();
    }
  });
});

function webSocketServerUrl(wsServer: WebSocketServer): string {
  const address = wsServer.address();
  if (address === null || typeof address === "string") throw new Error("Expected TCP server address");
  return `ws://127.0.0.1:${String(address.port)}`;
}

function waitForListening(wsServer: WebSocketServer): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  wsServer.once("listening", () => { resolve(); });
  return promise;
}

function closeWebSocketServer(wsServer: WebSocketServer): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    resolve();
  };
  wsServer.close(finish);
  // Fallback if sockets linger
  setTimeout(finish, 50);
  return promise;
}

function waitForOpen(socket: WebSocket): Promise<void> {
  if (socket.readyState === WebSocket.OPEN) return Promise.resolve();
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  socket.once("open", () => { resolve(); });
  socket.once("error", reject);
  socket.once("close", () => { reject(new Error("WebSocket closed before opening")); });
  return promise;
}

function nextMessage(socket: WebSocket): Promise<string> {
  const { promise, resolve } = Promise.withResolvers<string>();
  socket.once("message", (data) => {
    resolve(rawDataToString(data));
  });
  return promise;
}

function rawDataToString(data: RawData): string {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf8");
  if (Array.isArray(data)) return Buffer.concat(data).toString("utf8");
  return data.toString("utf8");
}
