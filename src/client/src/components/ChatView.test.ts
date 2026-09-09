import { describe, expect, it } from "vitest";
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
  chatPreferences: {
    showThinking: boolean;
    showEvents: boolean;
    showToolExecutions: boolean;
    showAgentStatus: boolean;
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
      showThinking: false,
      showEvents: true,
      showToolExecutions: true,
      showAgentStatus: true,
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
      showThinking: true,
      showEvents: true,
      showToolExecutions: false,
      showAgentStatus: true,
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
      showThinking: true,
      showEvents: true,
      showToolExecutions: true,
      showAgentStatus: false,
    };

    expect(view.renderActivityDock()).toBeNull();

    view.chatPreferences.showAgentStatus = true;
    expect(view.renderActivityDock()).not.toBeNull();
  });
});
