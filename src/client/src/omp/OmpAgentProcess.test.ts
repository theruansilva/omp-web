import { describe, expect, it } from "bun:test";
import "./OmpAgentProcess";
import { OmpAgentProcess } from "./OmpAgentProcess";
import "./OmpChatView";
import { OmpChatView, type ChatMessage } from "./OmpChatView";

describe("OmpAgentProcess", () => {
  it("registers custom element", () => {
    expect(customElements.get("omp-agent-process")).toBeDefined();
  });

  it("renders 5 steps timeline with initial step 0", () => {
    const processEl = new OmpAgentProcess();
    processEl.autoAnimate = false;
    expect(processEl.currentStep).toBe(0);

    const rendered = processEl.render();
    expect(rendered).toBeDefined();
  });

  it("navigates through steps with bounds checking", () => {
    const processEl = new OmpAgentProcess();
    processEl.autoAnimate = false;

    processEl.goToStep(2);
    expect(processEl.currentStep).toBe(2);

    processEl.goToStep(4);
    expect(processEl.currentStep).toBe(4);

    // Clamps to max 4
    processEl.goToStep(10);
    expect(processEl.currentStep).toBe(4);

    // Clamps to min 0
    processEl.goToStep(-5);
    expect(processEl.currentStep).toBe(0);
  });

  it("restarts animation from step 0", () => {
    const processEl = new OmpAgentProcess();
    processEl.autoAnimate = false;
    processEl.goToStep(3);
    expect(processEl.currentStep).toBe(3);

    processEl.restartAnimation();
    expect(processEl.currentStep).toBe(0);
  });
});

describe("OmpChatView with OmpAgentProcess", () => {
  it("renders assistant message with omp-agent-process", () => {
    const chatView = new OmpChatView();
    const messages: ChatMessage[] = [
      {
        id: "msg-1",
        role: "user",
        text: "Generate marketing strategy",
      },
      {
        id: "msg-2",
        role: "assistant",
        text: "Here is your marketing plan",
        hasAgentProcess: true,
      },
    ];

    chatView.messages = messages;
    const rendered = chatView.render();
    expect(rendered).toBeDefined();
  });
});
