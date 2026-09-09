import { describe, expect, it } from "vitest";
import { DEFAULT_CHAT_PREFERENCES } from "../chatPreferences";
import { ChatView, chatQueuedMessageSections } from "./ChatView";

describe("chatQueuedMessageSections", () => {
  it("labels client-side pending-start sends separately from server queued messages", () => {
    const sections = chatQueuedMessageSections(
      [{ kind: "followUp", text: "queued before start" }],
      [{ kind: "steer", text: "server queued" }],
    );

    expect(sections).toEqual([
      {
        heading: "Queued until session starts",
        detail: "Will send once the backend session is ready",
        messages: [{ kind: "followUp", text: "queued before start" }],
      },
      {
        heading: "Queued messages",
        detail: "1 pending · Stop clears the queue",
        messages: [{ kind: "steer", text: "server queued" }],
      },
    ]);
  });
});

interface TestableChatView {
  renderPart(part: unknown): unknown;
  renderActivityDock(): unknown;
  renderMessageHeader(message: unknown, key: string): unknown;
  renderMessageGroup(messages: unknown[], startIndex: number, endIndex: number, defaultOpen: boolean): unknown;
  chatPreferences: {
    showThinking: boolean;
    showEvents: boolean;
    showToolExecutions: boolean;
    showAgentStatus: boolean;
    showStatusBar: boolean;
  };
  isSendingPrompt: boolean;
}

function createTestChatView(): TestableChatView {
  const view = new ChatView();
  return view as unknown as TestableChatView;
}

describe("ChatView display preferences", () => {
  it("filters out thinking parts when showThinking is false", () => {
    const view = createTestChatView();
    view.chatPreferences = {
      ...DEFAULT_CHAT_PREFERENCES,
      showThinking: false,
    };

    const rendered = view.renderPart({ type: "thinking", text: "internal thoughts" });
    expect(rendered).toBeNull();

    view.chatPreferences.showThinking = true;
    const renderedVisible = view.renderPart({ type: "thinking", text: "internal thoughts" });
    expect(renderedVisible).not.toBeNull();
  });

  it("filters out tool execution parts when showToolExecutions is false", () => {
    const view = createTestChatView();
    view.chatPreferences = {
      ...DEFAULT_CHAT_PREFERENCES,
      showToolExecutions: false,
    };

    expect(view.renderPart({ type: "toolCall", toolName: "read", summary: "read file" })).toBeNull();
    expect(view.renderPart({ type: "toolResult", toolName: "read", text: "file content", isError: false })).toBeNull();

    view.chatPreferences.showToolExecutions = true;
    expect(view.renderPart({ type: "toolCall", toolName: "read", summary: "read file" })).not.toBeNull();
  });

  it("filters out activity dock when showAgentStatus is false", () => {
    const view = createTestChatView();
    view.isSendingPrompt = true;
    view.chatPreferences = {
      ...DEFAULT_CHAT_PREFERENCES,
      showAgentStatus: false,
    };

    expect(view.renderActivityDock()).toBeNull();

    view.chatPreferences.showAgentStatus = true;
    expect(view.renderActivityDock()).not.toBeNull();
  });

  it("does not render activity dock when agent is idle", () => {
    const view = createTestChatView();
    view.isSendingPrompt = false;
    view.chatPreferences = {
      ...DEFAULT_CHAT_PREFERENCES,
    };

    expect(view.renderActivityDock()).toBeNull();
  });
});

describe("ChatView message header and timeline", () => {
  it("omits timestamp for user messages", () => {
    const view = createTestChatView();
    const userMessage = { role: "user", parts: [{ type: "text", text: "hello" }] };
    const header = view.renderMessageHeader(userMessage, "0");
    const headerJson = JSON.stringify(header);
    expect(headerJson).not.toContain("msg-meta");
  });

  it("renders faded meta and copy action on assistant message header without bold model indicator", () => {
    const view = createTestChatView();
    const assistantMessage = {
      role: "assistant",
      parts: [{ type: "text", text: "world" }],
      meta: {
        model: { id: "claude-3.7-sonnet", provider: "anthropic" },
      },
    };
    const header = view.renderMessageHeader(assistantMessage, "1");
    const headerJson = JSON.stringify(header);
    expect(headerJson).toContain("msg-meta");
    expect(headerJson).toContain("anthropic/claude-3.7-sonnet");
    expect(headerJson).toContain("msg-actions");
    expect(headerJson).not.toContain("assistant-model-indicator");
  });

  it("renders event group as timeline summary", () => {
    const view = createTestChatView();
    const messages = [
      { role: "tool", parts: [{ type: "toolCall", toolName: "read", summary: "foo" }] },
    ];
    const group = view.renderMessageGroup(messages, 0, 1, false);
    const groupJson = JSON.stringify(group);
    expect(groupJson).toContain("timeline-toggle-icon");
    expect(groupJson).toContain("timeline-summary-text");
    expect(groupJson).toContain("group-body");
  });
});
