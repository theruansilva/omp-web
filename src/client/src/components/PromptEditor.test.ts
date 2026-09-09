import { describe, expect, it } from "vitest";
import type { TemplateResult } from "lit";
import { PromptEditor } from "./PromptEditor";
import type { SessionStatus } from "../api";

interface TemplateStringsNode {
  strings: string[];
}
interface TemplateValuesNode {
  values: unknown[];
}

function hasStrings(node: object): node is TemplateStringsNode {
  return "strings" in node && Array.isArray(node.strings);
}

function hasValues(node: object): node is TemplateValuesNode {
  return "values" in node && Array.isArray(node.values);
}

function collectTemplateStrings(template: TemplateResult): string[] {
  const strings: string[] = [];
  function walk(node: unknown): void {
    if (typeof node !== "object" || node === null) return;
    if (hasStrings(node)) {
      strings.push(...node.strings);
    }
    if (hasValues(node)) {
      for (const val of node.values) {
        walk(val);
      }
    }
  }
  walk(template);
  return strings;
}

function dummyStatus(isStreaming = false): SessionStatus {
  return {
    model: { id: "gemini-2.5-flash", provider: "google" },
    thinkingLevel: "medium",
    isStreaming,
    isCompacting: false,
    isBashRunning: false,
    pendingMessageCount: 0,
    queuedMessages: [],
    tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    cost: 0,
  };
}

describe("PromptEditor action button states and layout", () => {
  it("renders model selector inside the input card toolbar", () => {
    const editor = new PromptEditor();
    editor.status = dummyStatus();
    const template = editor.render();
    const text = collectTemplateStrings(template).join("");

    expect(text).toContain("input-card");
    expect(text).toContain("input-toolbar");
    expect(text).toContain("compact-status");
    expect(text).toContain("select-model");
  });

  it("renders disabled send button when agent is idle and input is empty", () => {
    const editor = new PromptEditor();
    editor.status = dummyStatus(false);
    // draft is empty, attachments empty -> hasContent is false
    const template = editor.render();
    const text = collectTemplateStrings(template).join("");

    expect(text).toContain("action-button send-button");
    expect(text).toContain("disabled");
    expect(text).toContain("Type a message to send");
  });

  it("renders stop button when agent is working and input is empty", () => {
    const editor = new PromptEditor();
    editor.status = dummyStatus(true);
    editor.canStop = true;
    const template = editor.render();
    const text = collectTemplateStrings(template).join("");

    expect(text).toContain("action-button stop-button");
    expect(text).toContain("Stop current work");
  });

  it("renders enqueue button when agent is working and input has content", () => {
    const editor = new PromptEditor();
    editor.status = dummyStatus(true);
    editor.canStop = true;
    // Set private hasContent to true
    Object.defineProperty(editor, "hasContent", { value: true, writable: true });

    const template = editor.render();
    const text = collectTemplateStrings(template).join("");

    expect(text).toContain("action-button enqueue-button");
    expect(text).toContain("Queue message");
  });

  it("renders active send button when agent is idle and input has content", () => {
    const editor = new PromptEditor();
    editor.status = dummyStatus(false);
    Object.defineProperty(editor, "hasContent", { value: true, writable: true });

    const template = editor.render();
    const text = collectTemplateStrings(template).join("");

    expect(text).toContain("action-button send-button");
    expect(text).toContain("Send message");
    expect(text).not.toContain("Type a message to send");
  });
});
