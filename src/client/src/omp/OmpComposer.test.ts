import { describe, expect, it } from "bun:test";
import "./OmpComposer";
import { OmpComposer } from "./OmpComposer";

describe("OmpComposer Auto-Resize", () => {
  it("renders composer with omp-composer-textarea class and field-sizing style", () => {
    const composer = new OmpComposer();
    const rendered = composer.render();
    expect(rendered).toBeDefined();

    const template = JSON.stringify(rendered);
    expect(template).toContain("omp-composer-textarea");
    expect(template).toContain("field-sizing: content");
    expect(template).toContain("max-height: 280px");
  });

  it("adjustTextareaHeight resets height and hides scrollbar when empty", () => {
    const composer = new OmpComposer();
    const mockTextarea = {
      value: "",
      scrollHeight: 48,
      style: {
        height: "120px",
        overflowY: "auto",
      },
    };

    composer.querySelector = ((selector: string) => {
      if (selector === "textarea") return mockTextarea as unknown as HTMLTextAreaElement;
      return null;
    }) as unknown as typeof composer.querySelector;

    composer.adjustTextareaHeight();
    expect(mockTextarea.style.height).toBe("");
    expect(mockTextarea.style.overflowY).toBe("hidden");
  });

  it("adjustTextareaHeight expands height based on scrollHeight for multiline code", () => {
    const composer = new OmpComposer();
    const mockTextarea = {
      value: "const a = 1;\nconst b = 2;\nconst c = 3;\nconsole.log(a + b + c);",
      scrollHeight: 110,
      style: {
        height: "",
        overflowY: "hidden",
      },
    };

    composer.querySelector = ((selector: string) => {
      if (selector === "textarea") return mockTextarea as unknown as HTMLTextAreaElement;
      return null;
    }) as unknown as typeof composer.querySelector;

    composer.adjustTextareaHeight();
    expect(mockTextarea.style.height).toBe("110px");
    expect(mockTextarea.style.overflowY).toBe("hidden");
  });

  it("adjustTextareaHeight caps at 280px and enables scrolling for long code blocks", () => {
    const composer = new OmpComposer();
    const mockTextarea = {
      value: "line\n".repeat(40),
      scrollHeight: 650,
      style: {
        height: "",
        overflowY: "hidden",
      },
    };

    composer.querySelector = ((selector: string) => {
      if (selector === "textarea") return mockTextarea as unknown as HTMLTextAreaElement;
      return null;
    }) as unknown as typeof composer.querySelector;

    composer.adjustTextareaHeight();
    expect(mockTextarea.style.height).toBe("280px");
    expect(mockTextarea.style.overflowY).toBe("auto");
  });
});

describe("OmpComposer Enter Key Behavior (Mobile & PC)", () => {
  it("on PC (non-mobile): Enter submits the prompt", () => {
    const composer = new OmpComposer();
    composer.promptEnterMedia = { matches: false };
    composer.value = "Hello world";

    let submitted = false;
    composer.addEventListener("submit-prompt", () => {
      submitted = true;
    });

    let prevented = false;
    const event = {
      key: "Enter",
      shiftKey: false,
      preventDefault: () => {
        prevented = true;
      },
    } as unknown as KeyboardEvent;

    (composer as any).handleKeyDown(event);

    expect(submitted).toBe(true);
    expect(prevented).toBe(true);
  });

  it("on PC (non-mobile): Shift+Enter does NOT submit (allows newline)", () => {
    const composer = new OmpComposer();
    composer.promptEnterMedia = { matches: false };
    composer.value = "Hello world";

    let submitted = false;
    composer.addEventListener("submit-prompt", () => {
      submitted = true;
    });

    let prevented = false;
    // User presses Shift
    (composer as any).handleKeyDown({
      key: "Shift",
      shiftKey: true,
      preventDefault: () => {},
    } as unknown as KeyboardEvent);

    // User presses Enter while Shift is active
    const event = {
      key: "Enter",
      shiftKey: true,
      preventDefault: () => {
        prevented = true;
      },
    } as unknown as KeyboardEvent;

    (composer as any).handleKeyDown(event);

    expect(submitted).toBe(false);
    expect(prevented).toBe(false);
  });

  it("on Mobile: Enter does NOT submit (allows newline)", () => {
    const composer = new OmpComposer();
    composer.promptEnterMedia = { matches: true };
    composer.value = "Hello mobile";

    let submitted = false;
    composer.addEventListener("submit-prompt", () => {
      submitted = true;
    });

    let prevented = false;
    const event = {
      key: "Enter",
      shiftKey: false,
      preventDefault: () => {
        prevented = true;
      },
    } as unknown as KeyboardEvent;

    (composer as any).handleKeyDown(event);

    expect(submitted).toBe(false);
    expect(prevented).toBe(false);
  });

  it("on Mobile: Shift+Enter with explicit Shift keydown submits", () => {
    const composer = new OmpComposer();
    composer.promptEnterMedia = { matches: true };
    composer.value = "Hello mobile hardware keyboard";

    let submitted = false;
    composer.addEventListener("submit-prompt", () => {
      submitted = true;
    });

    let prevented = false;
    // Explicit shift keydown (e.g. bluetooth keyboard)
    (composer as any).handleKeyDown({
      key: "Shift",
      shiftKey: true,
      preventDefault: () => {},
    } as unknown as KeyboardEvent);

    const event = {
      key: "Enter",
      shiftKey: true,
      preventDefault: () => {
        prevented = true;
      },
    } as unknown as KeyboardEvent;

    (composer as any).handleKeyDown(event);

    expect(submitted).toBe(true);
    expect(prevented).toBe(true);
  });

  it("on Mobile: virtual keyboard autocapitalize Shift on Enter does NOT submit", () => {
    const composer = new OmpComposer();
    composer.promptEnterMedia = { matches: true };
    composer.value = "Hello mobile virtual keyboard";

    let submitted = false;
    composer.addEventListener("submit-prompt", () => {
      submitted = true;
    });

    let prevented = false;
    // No prior explicit Shift keydown, but event has shiftKey: true (touch keyboard autocapitalize)
    const event = {
      key: "Enter",
      shiftKey: true,
      preventDefault: () => {
        prevented = true;
      },
    } as unknown as KeyboardEvent;

    (composer as any).handleKeyDown(event);

    expect(submitted).toBe(false);
    expect(prevented).toBe(false);
  });
});

describe("OmpComposer Stop & Queue Buttons", () => {
  it("when isWorking is true and empty input: renders stop-button and not queue-button", () => {
    const composer = new OmpComposer();
    composer.isWorking = true;
    composer.value = "";

    const rendered = composer.render();
    const template = JSON.stringify(rendered);

    expect(template).toContain("stop-button");
    expect(template).not.toContain("queue-button");
    expect(template).not.toContain("submit-button");
  });

  it("when isWorking is true and has text: renders both stop-button and queue-button", () => {
    const composer = new OmpComposer();
    composer.isWorking = true;
    composer.value = "Follow up question";

    const rendered = composer.render();
    const template = JSON.stringify(rendered);

    expect(template).toContain("stop-button");
    expect(template).toContain("queue-button");
    expect(template).not.toContain("submit-button");
  });

  it("submitting when isWorking is true dispatches submit-prompt with streamingBehavior: 'followUp'", () => {
    const composer = new OmpComposer();
    composer.isWorking = true;
    composer.value = "Queued message";

    let detail: any;
    composer.addEventListener("submit-prompt", (e: any) => {
      detail = e.detail;
    });

    (composer as any).submit();

    expect(detail).toBeDefined();
    expect(detail.prompt).toBe("Queued message");
    expect(detail.streamingBehavior).toBe("followUp");
    expect(composer.value).toBe("");
  });

  it("explicit submit('followUp') dispatches submit-prompt with streamingBehavior: 'followUp'", () => {
    const composer = new OmpComposer();
    composer.isWorking = true;
    composer.value = "Explicit follow up";

    let detail: any;
    composer.addEventListener("submit-prompt", (e: any) => {
      detail = e.detail;
    });

    (composer as any).submit("followUp");

    expect(detail).toBeDefined();
    expect(detail.prompt).toBe("Explicit follow up");
    expect(detail.streamingBehavior).toBe("followUp");
  });
});

describe("OmpComposer Status Badges", () => {
  it("renders planMode and extensionStatuses badges when enabled", () => {
    const composer = new OmpComposer();
    composer.planMode = { enabled: true, planFilePath: "/repo/plan.md" };
    composer.extensionStatuses = { ponytail: "● 🐴 ponytail: ⚡ FULL" };

    const rendered = composer.render();
    const template = JSON.stringify(rendered);

    expect(template).toContain("plan-mode-chip");
    expect(template).toContain("Plan Mode");
    expect(template).toContain("ponytail: ⚡ FULL");
  });

  it("renders Review Plan when planMode has proposedPlan", () => {
    const composer = new OmpComposer();
    composer.planMode = {
      enabled: true,
      proposedPlan: {
        planFilePath: "/repo/plan.md",
        title: "Test Plan",
        planContent: "Do things",
      },
    };

    const rendered = composer.render();
    const template = JSON.stringify(rendered);

    expect(template).toContain("Review Plan");
  });

  it("does not render planMode badge when planMode is undefined or not enabled", () => {
    const composer = new OmpComposer();
    composer.planMode = undefined;
    composer.extensionStatuses = undefined;

    const rendered = composer.render();
    const template = JSON.stringify(rendered);

    expect(template).not.toContain("plan-mode-chip");
    expect(template).not.toContain("Plan Mode");
  });
});
