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
