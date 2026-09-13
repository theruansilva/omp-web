import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "bun:test";
import { SessionEventHub, type RealtimeSocket } from "./sessionEventHub.js";

class FakeSocket extends EventEmitter implements RealtimeSocket {
  readonly OPEN = 1;
  readyState = this.OPEN;
  send = vi.fn();
}

describe("SessionEventHub", () => {
  it("publishes session events only to sockets for that session", () => {
    const hub = new SessionEventHub();
    const sessionSocket = new FakeSocket();
    const otherSocket = new FakeSocket();
    hub.add("s1", sessionSocket);
    hub.add("s2", otherSocket);

    hub.publish("s1", { type: "assistant.delta", text: "hello" });

    expect(sessionSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: "assistant.delta", text: "hello" }));
    expect(otherSocket.send).not.toHaveBeenCalled();
  });

  it("removes session sockets on close and skips non-open sockets", () => {
    const hub = new SessionEventHub();
    const closed = new FakeSocket();
    const removed = new FakeSocket();
    closed.readyState = 3;
    hub.add("s1", closed);
    hub.add("s1", removed);
    removed.emit("close");

    hub.publish("s1", { type: "session.error", message: "boom" });

    expect(closed.send).not.toHaveBeenCalled();
    expect(removed.send).not.toHaveBeenCalled();
  });

  it("publishes global events only to global sockets", () => {
    const hub = new SessionEventHub();
    const globalSocket = new FakeSocket();
    const sessionSocket = new FakeSocket();
    hub.addGlobal(globalSocket);
    hub.add("s1", sessionSocket);

    const status = {
      sessionId: "s1",
      isStreaming: false,
      isCompacting: false,
      isBashRunning: false,
      pendingMessageCount: 0,
      queuedMessages: [],
      tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      cost: 0,
    };

    hub.publishGlobal({ type: "status.update", status });

    expect(globalSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: "status.update", status }));
    expect(sessionSocket.send).not.toHaveBeenCalled();
  });
});
