import { describe, expect, it } from "vitest";
import { PanelCollapseController } from "./panelCollapseController";

describe("PanelCollapseController", () => {
  it("includes bottom-mobile-nav in shellClass when enabled", () => {
    const host = {
      addController: () => undefined,
      removeController: () => undefined,
      requestUpdate: () => undefined,
      updateComplete: Promise.resolve(true),
    };
    const controller = new PanelCollapseController(host);
    expect(controller.shellClass("chat", false)).not.toContain("bottom-mobile-nav");
    expect(controller.shellClass("chat", true)).toContain("bottom-mobile-nav");
    expect(controller.shellClass("core:workspace.files", true)).toContain("bottom-mobile-nav");
  });
});
