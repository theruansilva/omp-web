/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/consistent-type-assertions */
import { describe, expect, it, vi } from "vitest";
import { BtwPanel } from "./BtwPanel";

describe("BtwPanel", () => {
  it("renders running state with question", () => {
    const panel = new BtwPanel();
    panel.state = {
      status: "running",
      question: "How does caching work?",
      answer: "",
    };

    const template = panel.render();
    expect(template).not.toBeNull();
  });

  it("renders complete state with answer and canBranch", () => {
    const onBranch = vi.fn();
    const panel = new BtwPanel();
    panel.state = {
      status: "complete",
      question: "How does caching work?",
      answer: "It stores data in memory.",
      canBranch: true,
    };
    panel.onBranch = onBranch;

    const template = panel.render();
    expect(template).not.toBeNull();

    Reflect.get(panel, "handleBranch").call(panel);
    expect(onBranch).toHaveBeenCalledTimes(1);
  });

  it("handles close on Escape key", () => {
    const onClose = vi.fn();
    const panel = new BtwPanel();
    panel.state = {
      status: "complete",
      question: "What is X?",
      answer: "X is Y.",
    };
    panel.onClose = onClose;

    const event = { key: "Escape", preventDefault: vi.fn() } as unknown as KeyboardEvent;
    Reflect.get(panel, "handleGlobalKeyDown").call(panel, event);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
