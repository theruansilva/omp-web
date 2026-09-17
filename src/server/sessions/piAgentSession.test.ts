import { describe, expect, it, vi } from "bun:test";
import { DefaultPiAgentSession, DefaultPiSessionRuntime } from "./piAgentSession.js";

describe("DefaultPiAgentSession & DefaultPiSessionRuntime /btw support", () => {
  it("runs ephemeral turns and exposes last btw context", async () => {
    const mockOmpSession = {
      runEphemeralTurn: vi.fn(async ({ onTextDelta }: { onTextDelta?: (delta: string) => void }) => {
        onTextDelta?.("delta 1");
        return {
          replyText: "ephemeral response",
          assistantMessage: { role: "assistant", content: [{ type: "text", text: "ephemeral response" }] },
        };
      }),
      configuredThinkingLevel: () => "off",
      queuedMessageCount: 0,
      skills: [],
      promptTemplates: [],
      sessionId: "session-123",
      sessionFile: "/path/to/session.jsonl",
    };

    const mockSessionManager = {
      getCwd: () => "/test/cwd",
      getBranch: () => [],
      getLeafId: () => "leaf-abc",
      getSessionId: () => "session-123",
    };

    const session = new DefaultPiAgentSession(mockOmpSession as never, mockSessionManager as never);

    let streamChunk = "";
    const result = await session.runEphemeralTurn({
      promptText: "<btw>\nQuestion:\nWhat is the meaning of life?\n</btw>",
      onTextDelta: (delta) => { streamChunk += delta; },
    });

    expect(result.replyText).toBe("ephemeral response");
    expect(streamChunk).toBe("delta 1");
    expect(mockOmpSession.runEphemeralTurn).toHaveBeenCalledTimes(1);

    const lastBtw = session.getLastBtw();
    expect(lastBtw).toEqual({
      question: "What is the meaning of life?",
      answer: "ephemeral response",
      assistantMessage: { role: "assistant", content: [{ type: "text", text: "ephemeral response" }] },
      leafId: "leaf-abc",
      sessionId: "session-123",
    });
  });

  it("branches from btw using DefaultPiSessionRuntime and triggers rebind", async () => {
    const mockOmpSession = {
      runEphemeralTurn: vi.fn(async () => ({
        replyText: "branch answer",
        assistantMessage: { role: "assistant", content: [{ type: "text", text: "branch answer" }] },
      })),
      branchFromBtw: vi.fn(async () => ({
        cancelled: false,
        sessionFile: "/path/to/branched-session.jsonl",
      })),
      configuredThinkingLevel: () => "off",
      queuedMessageCount: 0,
      skills: [],
      promptTemplates: [],
      sessionId: "session-123",
      sessionFile: "/path/to/session.jsonl",
    };

    const mockSessionManager = {
      getCwd: () => "/test/cwd",
      getBranch: () => [],
      getLeafId: () => "leaf-1",
      getSessionId: () => "session-123",
    };

    const session = new DefaultPiAgentSession(mockOmpSession as never, mockSessionManager as never);
    await session.runEphemeralTurn({
      promptText: "<btw>\nQuestion:\nBranch question\n</btw>",
      question: "Branch question",
    });

    const runtime = new DefaultPiSessionRuntime(session, "/test/cwd", { session: mockOmpSession as never });
    const rebindCallback = vi.fn(async () => { });
    runtime.setRebindSession(rebindCallback);

    const branchResult = await runtime.branchBtw();
    expect(branchResult).toEqual({ cancelled: false });
    expect(mockOmpSession.branchFromBtw).toHaveBeenCalledWith(
      "Branch question",
      { role: "assistant", content: [{ type: "text", text: "branch answer" }] },
      "leaf-1",
      "session-123",
    );
    expect(rebindCallback).toHaveBeenCalledWith(session);
  });

  it("throws when branching if no btw answer exists", async () => {
    const mockOmpSession = {
      configuredThinkingLevel: () => "off",
      queuedMessageCount: 0,
      skills: [],
      promptTemplates: [],
      sessionId: "session-123",
    };

    const mockSessionManager = {
      getCwd: () => "/test/cwd",
      getBranch: () => [],
      getLeafId: () => "leaf-1",
    };

    const session = new DefaultPiAgentSession(mockOmpSession as never, mockSessionManager as never);
    const runtime = new DefaultPiSessionRuntime(session, "/test/cwd", { session: mockOmpSession as never });

    await expect(runtime.branchBtw()).rejects.toThrow("Cannot branch /btw");
  });
});
