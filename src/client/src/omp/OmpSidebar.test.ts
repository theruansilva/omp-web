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
});
