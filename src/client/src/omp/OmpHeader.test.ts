import { describe, expect, it } from "bun:test";
import "./OmpHeader";
import { OmpHeader } from "./OmpHeader";

function getAllTemplateText(rendered: unknown): string {
  if (!rendered) return "";
  if (typeof rendered === "string") return rendered;
  if (typeof rendered === "number") return String(rendered);
  if (Array.isArray(rendered)) {
    return rendered.map(getAllTemplateText).join(" ");
  }
  if (typeof rendered === "object" && rendered !== null) {
    const obj = rendered as Record<string, unknown>;
    if (Array.isArray(obj.strings)) {
      const parts = [...obj.strings];
      if (Array.isArray(obj.values)) {
        for (let i = 0; i < obj.values.length; i++) {
          parts.splice(2 * i + 1, 0, getAllTemplateText(obj.values[i]));
        }
      }
      return parts.join(" ");
    }
    return Object.values(obj).map(getAllTemplateText).join(" ");
  }
  return "";
}

describe("OmpHeader", () => {
  it("renders sign-in button when user is not logged in", () => {
    const header = new OmpHeader();
    header.currentUser = null;
    const rendered = header.render();
    const text = getAllTemplateText(rendered);
    expect(text).toContain("Entrar");
    expect(text).not.toContain("Sair");
  });

  it("does not render theme toggle or sign-out button in header when logged in", () => {
    const header = new OmpHeader();
    header.currentUser = "admin";
    const rendered = header.render();
    const text = getAllTemplateText(rendered);
    expect(text).not.toContain("Entrar");
    expect(text).not.toContain("Sair");
    expect(text).not.toContain("Toggle theme");
  });
});
