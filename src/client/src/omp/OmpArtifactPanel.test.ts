import { describe, expect, it } from "bun:test";
import "./OmpArtifactPanel";
import { OmpArtifactPanel, type ArtifactData } from "./OmpArtifactPanel";

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
      const strings = obj.strings as string[];
      const values = Array.isArray(obj.values) ? obj.values : [];
      let result = "";
      for (let i = 0; i < strings.length; i++) {
        result += strings[i] + " ";
        if (i < values.length) {
          result += getAllTemplateText(values[i]) + " ";
        }
      }
      return result;
    }
  }
  return "";
}

describe("OmpArtifactPanel component", () => {
  it("renders plan title, file path and markdown content", () => {
    const panel = new OmpArtifactPanel();
    const artifact: ArtifactData = {
      type: "plan",
      title: "Refatorar Autenticação e Modelos",
      planFilePath: "local://plans/auth-refactor.md",
      planContent: "# Plano de Execução\n\n1. Passo um\n2. Passo dois",
      status: "proposed",
    };
    panel.artifact = artifact;

    const rendered = panel.render();
    expect(rendered).toBeDefined();

    const text = getAllTemplateText(rendered);
    expect(text).toContain("Refatorar Autenticação e Modelos");
    expect(text).toContain("local://plans/auth-refactor.md");
    expect(text).toContain("Em Revisão");
    expect(text).toContain("Aprovar & Iniciar Execução");
  });

  it("dispatches approve event when approve button is triggered", () => {
    const panel = new OmpArtifactPanel();
    panel.artifact = {
      type: "plan",
      title: "Plano Teste",
      planContent: "Detalhes do plano",
      status: "proposed",
    };

    let approved = false;
    panel.addEventListener("approve", () => {
      approved = true;
    });

    (panel as unknown as Record<string, () => void>).handleApprove();
    expect(approved).toBe(true);
  });

  it("dispatches reject event with feedback when requested", () => {
    const panel = new OmpArtifactPanel();
    panel.artifact = {
      type: "plan",
      title: "Plano Teste",
      planContent: "Detalhes do plano",
      status: "proposed",
    };

    let rejectDetail: { feedback?: string } | undefined = undefined;
    panel.addEventListener("reject", (e: Event) => {
      const custom = e as CustomEvent<{ feedback?: string }>;
      rejectDetail = custom.detail;
    });

    (panel as unknown as Record<string, string>).feedbackText = "Ajustar passo 3 para Bun";
    (panel as unknown as Record<string, () => void>).handleReject();

    expect(rejectDetail).toBeDefined();
    expect(rejectDetail?.feedback).toBe("Ajustar passo 3 para Bun");
  });

  it("dispatches close event when closed", () => {
    const panel = new OmpArtifactPanel();
    panel.artifact = {
      type: "plan",
      title: "Plano Teste",
      planContent: "Detalhes",
    };

    let closed = false;
    panel.addEventListener("close", () => {
      closed = true;
    });

    (panel as unknown as Record<string, () => void>).handleClose();
    expect(closed).toBe(true);
  });
});
