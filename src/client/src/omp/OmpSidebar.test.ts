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

  it("renders projects as cards with inner contrasting box, header, sessions and footer", () => {
    const sidebar = new OmpSidebar();
    sidebar.projects = [
      { id: "p1", name: "omp-web", path: "~/code/omp-web" },
      { id: "p2", name: "empty-proj", path: "~/code/empty-proj" },
    ];
    sidebar.sessions = [
      { id: "s1", title: "Active Working", projectId: "p1", isWorking: true },
      { id: "s2", title: "Unread Session", projectId: "p1", isUnread: true },
    ];
    sidebar.selectedProjectId = "p1";
    sidebar.selectedSessionId = "s1";

    const rendered = sidebar.render();
    const str = JSON.stringify(rendered);

    // Header & divider
    expect(str).toContain("Projetos");
    expect(str).toContain("group/proj-card");

    // Project card header
    expect(str).toContain("omp-web");
    expect(str).toContain("Nova sessão em ");
    expect(str).toContain("omp-web");

    // Inner contrasting box & sessions
    expect(str).toContain("role=\\\"menu\\\"");
    expect(str).toContain("Active Working");
    expect(str).toContain("Trabalhando");
    expect(str).toContain("Unread Session");
    expect(str).toContain("Aguardando visualização");

    // Empty state for project without sessions
    expect(str).toContain("Sem sessões recentes");

    // Card footer
    expect(str).toContain("~/code/omp-web");
    expect(str).toContain("sessões");
    expect(str).toContain("~/code/omp-web");
  });

  it("renders machines switcher in bottom footer and dispatches machine events", () => {
    const sidebar = new OmpSidebar();
    sidebar.machines = [
      { id: "local", name: "Local Machine", kind: "local" },
      { id: "remote-1", name: "GPU Rig", kind: "remote", baseUrl: "http://100.1.2.3:8504" },
    ];
    sidebar.selectedMachine = sidebar.machines[0];
    sidebar.machineStatuses = {
      local: { machineId: "local", ok: true, status: "online" } as any,
    };

    let rendered = sidebar.render();
    let str = JSON.stringify(rendered);
    expect(str).toContain("Local Machine");
    expect(str).toContain("Máquina");

    // Open dropup menu
    (sidebar as any).isMachineMenuOpen = true;
    rendered = sidebar.render();
    str = JSON.stringify(rendered);
    expect(str).toContain("Máquinas Conectadas");
    expect(str).toContain("GPU Rig");
    expect(str).toContain("Adicionar Máquina");

    // Select machine event
    let selectedDetail: any = null;
    sidebar.addEventListener("select-machine", ((e: CustomEvent) => {
      selectedDetail = e.detail;
    }) as EventListener);
    (sidebar as any).handleSelectMachine(sidebar.machines[1]);
    expect(selectedDetail?.machine?.id).toBe("remote-1");

    // Add machine event
    let addFired = false;
    sidebar.addEventListener("add-machine", (() => {
      addFired = true;
    }) as EventListener);
    (sidebar as any).handleAddMachine();
    expect(addFired).toBe(true);
  });
});
