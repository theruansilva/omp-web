import { describe, expect, it } from "bun:test";
import { OMP_WEB_GENERATIVE_UI_PROMPT } from "./generativeUiPrompt.js";

describe("OMP_WEB_GENERATIVE_UI_PROMPT", () => {
  it("defines the Generative UI instructions with all supported components", () => {
    expect(OMP_WEB_GENERATIVE_UI_PROMPT).toBeDefined();
    expect(typeof OMP_WEB_GENERATIVE_UI_PROMPT).toBe("string");
    expect(OMP_WEB_GENERATIVE_UI_PROMPT.length).toBeGreaterThan(50);

    // Verify key component instructions are present
    expect(OMP_WEB_GENERATIVE_UI_PROMPT).toContain("<options");
    expect(OMP_WEB_GENERATIVE_UI_PROMPT).toContain("<option");
    expect(OMP_WEB_GENERATIVE_UI_PROMPT).toContain("<checklist");
    expect(OMP_WEB_GENERATIVE_UI_PROMPT).toContain("<item");
    expect(OMP_WEB_GENERATIVE_UI_PROMPT).toContain("<card");
    expect(OMP_WEB_GENERATIVE_UI_PROMPT).toContain("<kpi-grid");
    expect(OMP_WEB_GENERATIVE_UI_PROMPT).toContain("<kpi");
    expect(OMP_WEB_GENERATIVE_UI_PROMPT).toContain("<callout");
  });
});
