/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/consistent-type-assertions */
import { describe, expect, it, vi } from "vitest";
import { AskDialog } from "./AskDialog";

describe("AskDialog", () => {
  it("renders questions and options", () => {
    const dialog = new AskDialog();
    dialog.requestId = "req-1";
    dialog.questions = [
      {
        id: "q1",
        question: "Which database?",
        options: [{ label: "SQLite", description: "Local embedded" }, { label: "Postgres", description: "Production" }],
        recommended: 0,
      },
    ];

    const changes = new Map<string, unknown>([["questions", undefined]]);
    dialog.willUpdate(changes);

    const template = dialog.render();
    expect(template).not.toBeNull();
  });

  it("submits with default recommended option", () => {
    const onSubmit = vi.fn();
    const dialog = new AskDialog();
    dialog.requestId = "req-1";
    dialog.questions = [
      {
        id: "q1",
        question: "Which database?",
        options: [{ label: "SQLite" }, { label: "Postgres" }],
        recommended: 1,
      },
    ];
    dialog.onSubmit = onSubmit;

    const changes = new Map<string, unknown>([["questions", undefined]]);
    dialog.willUpdate(changes);

    Reflect.get(dialog, "handleSubmit").call(dialog);
    expect(onSubmit).toHaveBeenCalledWith({
      kind: "submit",
      results: [
        {
          id: "q1",
          question: "Which database?",
          options: ["SQLite", "Postgres"],
          multi: false,
          selectedOptions: ["Postgres"],
        },
      ],
    });
  });

  it("handles multi-select toggle and custom input", () => {
    const onSubmit = vi.fn();
    const dialog = new AskDialog();
    dialog.requestId = "req-2";
    dialog.questions = [
      {
        id: "q2",
        question: "Which features?",
        options: [{ label: "Auth" }, { label: "Logging" }],
        multi: true,
      },
    ];
    dialog.onSubmit = onSubmit;

    const changes = new Map<string, unknown>([["questions", undefined]]);
    dialog.willUpdate(changes);

    Reflect.get(dialog, "handleOptionToggle").call(dialog, dialog.questions[0], "Auth", true);
    Reflect.get(dialog, "handleOptionToggle").call(dialog, dialog.questions[0], "Logging", true);
    Reflect.get(dialog, "handleCustomInputChange").call(dialog, "q2", "Extra feature");

    Reflect.get(dialog, "handleSubmit").call(dialog);
    expect(onSubmit).toHaveBeenCalledWith({
      kind: "submit",
      results: [
        {
          id: "q2",
          question: "Which features?",
          options: ["Auth", "Logging"],
          multi: true,
          selectedOptions: ["Auth", "Logging"],
          customInput: "Extra feature",
        },
      ],
    });
  });

  it("handles chat redirect action", () => {
    const onChat = vi.fn();
    const dialog = new AskDialog();
    dialog.requestId = "req-3";
    dialog.questions = [
      {
        id: "q3",
        question: "Need clarification?",
        options: [{ label: "Yes" }, { label: "No" }],
      },
    ];
    dialog.onChat = onChat;

    Reflect.get(dialog, "handleChat").call(dialog);
    expect(onChat).toHaveBeenCalledTimes(1);
  });

  it("handles cancel action on Escape key", () => {
    const onCancel = vi.fn();
    const dialog = new AskDialog();
    dialog.requestId = "req-4";
    dialog.questions = [{ id: "q4", question: "Exit?", options: [] }];
    dialog.onCancel = onCancel;

    const event = { key: "Escape", preventDefault: vi.fn() } as unknown as KeyboardEvent;
    Reflect.get(dialog, "handleGlobalKeyDown").call(dialog, event);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
