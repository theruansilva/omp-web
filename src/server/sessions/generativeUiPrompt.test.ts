import { describe, expect, it } from "bun:test";
import { OMP_WEB_GENERATIVE_UI_PROMPT } from "./generativeUiPrompt.js";

describe("OMP_WEB_GENERATIVE_UI_PROMPT", () => {
  it("instructs agent to use ask tool as default and Generative UI for structured data", () => {
    expect(OMP_WEB_GENERATIVE_UI_PROMPT).toBeDefined();
    expect(typeof OMP_WEB_GENERATIVE_UI_PROMPT).toBe("string");
    expect(OMP_WEB_GENERATIVE_UI_PROMPT.length).toBeGreaterThan(50);

    // Verify ask tool in composer is the default standard for choices
    expect(OMP_WEB_GENERATIVE_UI_PROMPT).toContain("`ask` tool");
    expect(OMP_WEB_GENERATIVE_UI_PROMPT).toContain("OmpComposer");
    expect(OMP_WEB_GENERATIVE_UI_PROMPT).toContain("NEVER use the `<options>` markdown component");

    // Verify Generative UI components for structured data
    expect(OMP_WEB_GENERATIVE_UI_PROMPT).toContain("<checklist");
    expect(OMP_WEB_GENERATIVE_UI_PROMPT).toContain("<item");
    expect(OMP_WEB_GENERATIVE_UI_PROMPT).toContain("<card");
    expect(OMP_WEB_GENERATIVE_UI_PROMPT).toContain("<kpi-grid");
    expect(OMP_WEB_GENERATIVE_UI_PROMPT).toContain("<kpi");
    expect(OMP_WEB_GENERATIVE_UI_PROMPT).toContain("<callout");

    // Verify completed/non-interactive checklist instructions
    expect(OMP_WEB_GENERATIVE_UI_PROMPT).toContain('interactive="false"');
    expect(OMP_WEB_GENERATIVE_UI_PROMPT).toContain('checked="true"');

    // Verify execution safeguards against loops and deadlocks
    expect(OMP_WEB_GENERATIVE_UI_PROMPT).toContain("Execution & Subagent Safeguards");
    expect(OMP_WEB_GENERATIVE_UI_PROMPT).toContain("`wait` tool");
  });
});
