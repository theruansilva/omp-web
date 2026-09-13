import { describe, expect, it } from "bun:test";
import { isSessionActive, sessionActivityLabel, isWorkspaceActivityActive } from "./activity";
import type { SessionStatus, WorkspaceActivity } from "./apiTypes";

const idleStatus: SessionStatus = {
  sessionId: "s1",
  isStreaming: false,
  isCompacting: false,
  isBashRunning: false,
  pendingMessageCount: 0,
  queuedMessages: [],
  tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  cost: 0,
};

describe("activity helpers", () => {
  it("detects and labels active session states consistently", () => {
    expect(isSessionActive(idleStatus)).toBe(false);
    expect(sessionActivityLabel(idleStatus)).toBeUndefined();

    expect(isSessionActive({ ...idleStatus, isStreaming: true })).toBe(true);
    expect(sessionActivityLabel({ ...idleStatus, isStreaming: true })).toBe("streaming");

    expect(isSessionActive({ ...idleStatus, pendingMessageCount: 2 })).toBe(true);
    expect(sessionActivityLabel({ ...idleStatus, pendingMessageCount: 2 })).toBe("2 pending");

    expect(sessionActivityLabel(idleStatus, { sessionId: "s1", phase: "active", label: "running tool", detail: "read", at: "now" })).toBe("running tool: read");
  });

  it("detects workspace activity presence without exposing details", () => {
    const idle: WorkspaceActivity = { cwd: "/repo", hasSessionActivity: false, hasTerminalActivity: false, updatedAt: "now" };
    expect(isWorkspaceActivityActive(idle)).toBe(false);
    expect(isWorkspaceActivityActive({ ...idle, hasSessionActivity: true })).toBe(true);
    expect(isWorkspaceActivityActive({ ...idle, hasTerminalActivity: true })).toBe(true);
  });
});
