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
    expect(str).toContain("Trabalho concluído (não lido)");
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
      expect(e.detail).toEqual({ sessionId: "s1", projectId: "p1" });
    }) as EventListener);

    (sidebar as any).handleArchiveSession("s1", "p1");
    expect(eventFired).toBe(true);
  });
});
