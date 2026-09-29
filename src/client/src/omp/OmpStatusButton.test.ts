import { describe, expect, it } from "bun:test";
import "./OmpStatusButton";
import { OmpStatusButton } from "./OmpStatusButton";

describe("OmpStatusButton", () => {
  it("registers custom element 'omp-status-button'", () => {
    expect(customElements.get("omp-status-button")).toBeDefined();
    const btn = new OmpStatusButton();
    expect(btn).toBeDefined();
    expect(btn.status).toBe("neutral");
    expect(btn.size).toBe("md");
    expect(btn.variant).toBe("pill");
    expect(btn.showIcon).toBe(true);
    expect(btn.showNeutralIcon).toBe(false);
  });

  it("renders button template with correct status classes", () => {
    const btn = new OmpStatusButton();
    btn.status = "success";
    btn.label = "Conectado";
    const rendered = btn.render();
    expect(rendered).toBeDefined();
    const str = JSON.stringify(rendered);
    expect(str).toContain("omp-status-");
    expect(str).toContain("success");
    expect(str).toContain("Conectado");
  });

  it("renders loading state with spin icon and disables button", () => {
    const btn = new OmpStatusButton();
    btn.status = "loading";
    btn.label = "Carregando...";
    const rendered = btn.render();
    const str = JSON.stringify(rendered);
    expect(str).toContain("loading");
    expect(str).toContain("omp-spin");
    expect(str).toContain("omp-status-pulse");
  });

  it("omits icon when showIcon is false", () => {
    const btn = new OmpStatusButton();
    btn.status = "loading";
    btn.label = "Entrando...";
    btn.showIcon = false;
    const rendered = btn.render();
    const str = JSON.stringify(rendered);
    expect(str).not.toContain("omp-roll-stack-icon");
    expect(str).not.toContain("omp-spin");
    expect(str).toContain("Entrando...");
  });

  it("does not render circle icon for neutral status by default", () => {
    const btn = new OmpStatusButton();
    btn.status = "neutral";
    btn.label = "Entrar";
    const rendered = btn.render();
    const str = JSON.stringify(rendered);
    expect(str).not.toContain("omp-roll-stack-icon");
  });

  it("handles status and label transitions in willUpdate", () => {
    const btn = new OmpStatusButton();
    btn.status = "neutral";
    btn.label = "Entrar";

    const changed = new Map<PropertyKey, unknown>();
    changed.set("status", "neutral");
    changed.set("label", "Entrar");

    btn.status = "loading";
    btn.label = "Entrando...";

    btn.willUpdate(changed);

    const rendered = btn.render();
    const str = JSON.stringify(rendered);
    expect(str).toContain("omp-roll-enter");
    expect(str).toContain("omp-text-roll-exit");
    expect(str).toContain("omp-text-roll-enter");
    expect(str).toContain("Entrar");
    expect(str).toContain("Entrando...");
  });
});
