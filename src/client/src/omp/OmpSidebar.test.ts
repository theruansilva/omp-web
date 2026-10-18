import { describe, expect, it } from "bun:test";
import "./OmpSidebar";
import { OmpSidebar } from "./OmpSidebar";

describe("OmpSidebar", () => {
  it("registers custom element and renders primary nav, projects and sessions", () => {
    expect(customElements.get("omp-sidebar")).toBeDefined();
    const sidebar = new OmpSidebar();
    const rendered = sidebar.render();
    expect(rendered).toBeDefined();
  });

  it("filters sessions by selected project", () => {
    const sidebar = new OmpSidebar();
    sidebar.projects = [
      { id: "p1", name: "Project One" },
      { id: "p2", name: "Project Two" },
    ];
    sidebar.selectedProjectId = "p1";
    sidebar.sessions = [
      { id: "s1", title: "Session P1", projectId: "p1" },
      { id: "s2", title: "Session P2", projectId: "p2" },
    ];
    const rendered = sidebar.render();
    expect(rendered).toBeDefined();
  });

  it("excludes archived sessions from the sidebar", () => {
    const sidebar = new OmpSidebar();
    sidebar.projects = [{ id: "p1", name: "Project One" }];
    sidebar.selectedProjectId = "p1";
    sidebar.sessions = [
      { id: "s1", title: "Active Session", projectId: "p1", updatedAt: "5m atrás" },
      { id: "s2", title: "Archived Session", projectId: "p1", archived: true },
    ];
    const rendered = sidebar.render();
    expect(rendered).toBeDefined();
    const templateStrings = JSON.stringify(rendered);
    expect(templateStrings).toContain("Active Session");
    expect(templateStrings).not.toContain("Archived Session");
  });

  it("limits sessions to 5 per project and sorts unread sessions to the top", () => {
    const sidebar = new OmpSidebar();
    sidebar.projects = [{ id: "p1", name: "Project One" }];
    sidebar.sessions = [
      { id: "s1", title: "Session 1", projectId: "p1" },
      { id: "s2", title: "Session 2", projectId: "p1" },
      { id: "s3", title: "Session 3", projectId: "p1" },
      { id: "s4", title: "Session 4", projectId: "p1" },
      { id: "s5", title: "Session 5", projectId: "p1" },
      { id: "s6", title: "Session 6 Unread", projectId: "p1", isUnread: true },
    ];
    const rendered = sidebar.render();
    expect(rendered).toBeDefined();
    const str = JSON.stringify(rendered);
    expect(str).toContain("Session 6 Unread");
    expect(str).toContain("Aguardando visualização");
    expect(str).toContain("Nova sessão");
  });

  it("does not render 3-dots button and opens archive menu via contextmenu / hold", () => {
    const sidebar = new OmpSidebar();
    sidebar.projects = [{ id: "p1", name: "Project One" }];
    sidebar.sessions = [{ id: "s1", title: "Active Session", projectId: "p1" }];
    
    // Initial render has NO 3-dots options button
    let str = JSON.stringify(sidebar.render());
    expect(str).not.toContain("Opções da sessão");

    // Context menu / hold opens archive button
    (sidebar as any).handleContextMenu("s1", { preventDefault: () => {}, stopPropagation: () => {} });
    str = JSON.stringify(sidebar.render());
    expect(str).toContain("Arquivar");

    // Clicking archive dispatches archive-session event
    let eventFired = false;
    sidebar.addEventListener("archive-session", ((e: CustomEvent) => {
      eventFired = true;
      expect(e.detail.sessionId).toBe("s1");
    }) as EventListener);
    (sidebar as any).handleArchiveSession("s1", "p1");
    expect(eventFired).toBe(true);
  });

  it("renders projects as adaptive height cards without white border or redundant metadata", () => {
    const sidebar = new OmpSidebar();
    sidebar.projects = [
      { id: "p1", name: "omp-web", path: "~/code/omp-web" },
      { id: "p2", name: "empty-proj", path: "~/code/empty-proj" },
    ];
    sidebar.sessions = [
      { id: "s1", title: "Active Working", projectId: "p1", isWorking: true, updatedAt: "10m atrás" },
      { id: "s2", title: "Unread Session", projectId: "p1", isUnread: true, updatedAt: "1h atrás" },
    ];
    sidebar.selectedProjectId = "p1";
    sidebar.selectedSessionId = "s1";

    const rendered = sidebar.render();
    const str = JSON.stringify(rendered);

    // Header & divider (no project count badge)
    expect(str).toContain("Projetos");
    expect(str).toContain("group/proj-card");

    // Project card header
    expect(str).toContain("omp-web");
    expect(str).toContain("empty-proj");
    expect(str).toContain("Nova sessão em ");

    // Sessions render when present
    expect(str).toContain("role=");
    expect(str).toContain("Active Working");
    expect(str).toContain("Trabalhando");
    expect(str).toContain("Unread Session");
    expect(str).toContain("Aguardando visualização");

    // Outer border preserved, no empty state message, no path description
    expect(str).toContain("border-black/8");
    expect(str).toContain("dark:border-white/8");
    expect(str).not.toContain("Sem sessões recentes");
    expect(str).not.toContain("~/code/omp-web");
    expect(str).not.toContain("10m atrás");
    expect(str).not.toContain("1h atrás");
  });

  it("limits primary nav to 4 items (Terminal, Arquivos, Projetos, Modelos) and expands with Ver mais", () => {
    const sidebar = new OmpSidebar();
    sidebar.sessions = [{ id: "dummy", title: "Custom Active Session", projectId: "proj-1" }];
    let rendered = sidebar.render();
    let str = JSON.stringify(rendered);

    // Initial render shows 4 items: Terminal, Arquivos, Projetos, Modelos and "Ver mais"
    expect(str).toContain("Ver mais");
    expect(str).toContain("+3");
    expect(str).toContain("Terminal");
    expect(str).toContain("Arquivos");
    expect(str).toContain("Projetos");
    expect(str).toContain("Modelos");
    // Uso & Métricas, Agendamentos, Configurações are in "Ver mais"
    expect(str).not.toContain("Uso & Métricas");
    expect(str).not.toContain("Agendamentos");
    expect(str).not.toContain("Configurações");
    // Library is hidden from sidebar
    expect(str).not.toContain("Library");

    // Toggling expand shows remaining items and "Ver menos"
    (sidebar as any).isNavExpanded = true;
    rendered = sidebar.render();
    str = JSON.stringify(rendered);
    expect(str).toContain("Ver menos");
    expect(str).toContain("Uso & Métricas");
    expect(str).toContain("Agendamentos");
    expect(str).toContain("Configurações");
    expect(str).not.toContain("Library");
  });
});
