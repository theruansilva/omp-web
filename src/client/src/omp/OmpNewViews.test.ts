import { describe, expect, it } from "bun:test";
import "./OmpTerminalView";
import { OmpTerminalView } from "./OmpTerminalView";
import "./OmpFilesView";
import { OmpFilesView } from "./OmpFilesView";
import "./OmpUsageView";
import { OmpUsageView } from "./OmpUsageView";

describe("OmpTerminalView", () => {
  it("renders empty state when no workspace is active", () => {
    const view = new OmpTerminalView();
    const template = JSON.stringify(view.render());
    expect(template).toContain("Nenhum Workspace Ativo");
  });

  it("renders terminal panel and workspace branch when workspace is provided", () => {
    const view = new OmpTerminalView();
    view.workspace = {
      id: "w1",
      name: "feat/terminal",
      branch: "feat/terminal",
      path: "/code/omp-web",
      isPrimary: true,
      projectId: "proj-1",
    };
    view.machineId = "local";
    const template = JSON.stringify(view.render());
    expect(template).toContain("terminal-panel");
    expect(template).toContain("feat/terminal");
    expect(template).toContain("/code/omp-web");
  });
});

describe("OmpFilesView", () => {
  it("renders empty state when no workspace is active", () => {
    const view = new OmpFilesView();
    const template = JSON.stringify(view.render());
    expect(template).toContain("Nenhum Workspace Ativo");
  });

  it("renders files header and search input when workspace is provided", () => {
    const view = new OmpFilesView();
    view.workspace = {
      id: "w1",
      name: "main",
      branch: "main",
      path: "/code/omp-web",
      isPrimary: true,
      projectId: "proj-1",
    };
    const template = JSON.stringify(view.render());
    expect(template).toContain("Arquivos");
    expect(template).toContain("Filtrar arquivos...");
    expect(template).toContain("Nenhum arquivo selecionado");
  });
});

describe("OmpUsageView", () => {
  it("renders usage metrics header and KPI cards", () => {
    const view = new OmpUsageView();
    const template = JSON.stringify(view.render());
    expect(template).toContain("Uso & Métricas");
    expect(template).toContain("Provedores Conectados");
    expect(template).toContain("Cotas Rastreadas");
  });
});
