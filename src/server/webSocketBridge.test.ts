import { afterEach, describe, expect, it } from "bun:test";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import { createBufferedSender } from "./webSocketBridge.js";

let server: WebSocketServer | undefined;

afterEach(async () => {
  const socketServer = server;
  if (socketServer === undefined) return;
  await new Promise<void>((resolve) => {
    socketServer.close(() => { resolve(); });
    setTimeout(resolve, 50);
  });
  server = undefined;
});

describe("createBufferedSender", () => {
  it("queues messages while a WebSocket is still connecting", async () => {
    const socketServer = new WebSocketServer({ host: "127.0.0.1", port: 0 });
    server = socketServer;
    const connected = new Promise<WebSocket>((resolve) => {
      socketServer.once("connection", resolve);
    });
    await waitForListening(socketServer);

    const client = new WebSocket(serverUrl(socketServer));
    const send = createBufferedSender(client);
    send("queued-before-open");

    const serverSocket = await connected;
    await expect(nextMessage(serverSocket)).resolves.toBe("queued-before-open");
    client.close();
    serverSocket.close();
  });
});

function waitForListening(socketServer: WebSocketServer): Promise<void> {
  if (socketServer.address() !== null) return Promise.resolve();
  return new Promise((resolve, reject) => {
    socketServer.once("error", reject);
    socketServer.once("listening", () => {
      socketServer.off("error", reject);
      resolve();
    });
  });
}

function serverUrl(socketServer: WebSocketServer): string {
  const address = socketServer.address();
  if (address === null || typeof address === "string") throw new Error("Expected TCP server address");
  return `ws://127.0.0.1:${String(address.port)}`;
}

function nextMessage(socket: WebSocket): Promise<string> {
  return new Promise((resolve) => {
    socket.once("message", (data) => {
      resolve(rawDataToString(data));
    });
  });
}

function rawDataToString(data: RawData): string {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf8");
  if (Array.isArray(data)) return Buffer.concat(data).toString("utf8");
  return data.toString("utf8");
}
