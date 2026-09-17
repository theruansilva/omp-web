import { WebSocket, type Data } from "ws";
import type { WSContext } from "hono/ws";

export function bridgeSockets(client: WebSocket, upstream: WebSocket): void {
  const sendToClient = createBufferedSender(client);
  const sendToUpstream = createBufferedSender(upstream);
  client.on("message", (data) => { sendToUpstream(data); });
  upstream.on("message", (data) => { sendToClient(data); });
  client.on("close", () => { upstream.close(); });
  upstream.on("close", () => { client.close(); });
  upstream.on("error", () => { client.close(); });
  client.on("error", () => { upstream.close(); });
}

export function bridgeHonoSocketToUpstream(ws: WSContext, upstream: WebSocket): {
  sendToUpstream: (data: unknown) => void;
} {
  const sendToUpstream = createBufferedSender(upstream);

  upstream.on("message", (data) => {
    if (typeof data === "string") {
      ws.send(data);
    } else if (data instanceof ArrayBuffer) {
      ws.send(data);
    } else if (Array.isArray(data)) {
      ws.send(Buffer.concat(data).toString("utf8"));
    } else {
      ws.send(data.toString("utf8"));
    }
  });

  upstream.on("close", () => {
    ws.close();
  });

  upstream.on("error", () => {
    ws.close();
  });

  return {
    sendToUpstream: (data: unknown) => {
      if (typeof data === "string" || data instanceof ArrayBuffer || Buffer.isBuffer(data) || Array.isArray(data)) {
        sendToUpstream(data as Data);
      } else if (data instanceof Blob) {
        void data.arrayBuffer().then((buf) => {
          sendToUpstream(buf);
        });
      } else if (data !== undefined && data !== null) {
        sendToUpstream(String(data));
      }
    },
  };
}

export function createBufferedSender(socket: WebSocket): (data: Data) => void {
  const queue: Data[] = [];
  const flush = () => {
    while (socket.readyState === WebSocket.OPEN) {
      const data = queue.shift();
      if (data === undefined) return;
      socket.send(data);
    }
  };
  socket.on("open", flush);
  return (data) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(data);
      return;
    }
    if (socket.readyState === WebSocket.CONNECTING) queue.push(data);
  };
}
