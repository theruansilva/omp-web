import { describe, expect, it } from "bun:test";
import "./OmpProjectsView";
import { OmpProjectsView } from "./OmpProjectsView";
import "./OmpProjectDetailView";
import { OmpProjectDetailView } from "./OmpProjectDetailView";
import "./OmpHomeView";
import { OmpHomeView } from "./OmpHomeView";
import "./OmpComposer";
import { OmpComposer } from "./OmpComposer";

function getAllTemplateText(rendered: unknown): string {
  if (rendered == null) return "";
  if (typeof rendered === "string") return rendered;
  if (typeof rendered === "number" || typeof rendered === "boolean") return String(rendered);
  if (Array.isArray(rendered)) {
    return rendered.map(getAllTemplateText).join(" ");
  }
  if (typeof rendered !== "object") return "";
  let text = "";
  if ("strings" in rendered) {
    const rawStrings = (rendered as Record<string, unknown>)["strings"];
    if (Array.isArray(rawStrings)) {
      text += rawStrings.join(" ");
    }
  }
  if ("values" in rendered) {
    const rawValues = (rendered as Record<string, unknown>)["values"];
    if (Array.isArray(rawValues)) {
      for (const val of rawValues) {
        text += " " + getAllTemplateText(val);
      }
    }
  }
  return text;
}

describe("OmpProjectsView", () => {
  it("registers custom element, renders 3-dots menu, and does NOT have 'Workspace Repositories'", () => {
    expect(customElements.get("omp-projects-view")).toBeDefined();
    const view = new OmpProjectsView();
    const rendered = view.render();
    expect(rendered).toBeDefined();
    const allText = getAllTemplateText(rendered);
    expect(allText).toContain("omp-composer");
    expect(allText).toContain("rounded-t-7xl");
    expect(allText).toContain("opacity-0 group-hover:opacity-100");
    expect(allText).not.toContain("Workspace Repositories");
  });

  it("handles custom projects list", () => {
    const view = new OmpProjectsView();
    view.projects = [
      { id: "my-p", name: "Custom Project", path: "~/custom", image: "/test.jpg" },
    ];
    view.selectedProjectId = "my-p";
    const rendered = view.render();
    expect(rendered).toBeDefined();
  });
});

describe("OmpProjectDetailView", () => {
  it("registers custom element, renders Workspaces & Branches, fixed composer dock and does NOT include 'Repositório Ativo'", () => {
    expect(customElements.get("omp-project-detail-view")).toBeDefined();
    const detailView = new OmpProjectDetailView();
    detailView.projectId = "proj-1";
    const rendered = detailView.render();
    expect(rendered).toBeDefined();
    const allText = getAllTemplateText(rendered);
    expect(allText).toContain("omp-composer");
    expect(allText).toContain("Workspaces & Branches");
    expect(allText).toContain("opacity-0 group-hover:opacity-100");
    expect(allText).not.toContain("Repositório Ativo");
  });

  it("filters and renders sessions for the project", () => {
    const detailView = new OmpProjectDetailView();
    detailView.projectId = "proj-2";
    detailView.sessions = [
      { id: "s1", title: "Session 1", projectId: "proj-1" },
      { id: "s2", title: "Session 2", projectId: "proj-2" },
    ];
    const rendered = detailView.render();
    expect(rendered).toBeDefined();
  });
});

describe("OmpHomeView", () => {
  it("registers custom element and renders fixed bottom composer dock", () => {
    expect(customElements.get("omp-home-view")).toBeDefined();
    const homeView = new OmpHomeView();
    const rendered = homeView.render();
    expect(rendered).toBeDefined();
    const allText = getAllTemplateText(rendered);
    expect(allText).toContain("omp-composer");
    expect(allText).toContain("absolute bottom-0");
  });
});

describe("OmpComposer Extensibility & Project Selector", () => {
  it("supports project selector mode and toggles open state", () => {
    const composer = new OmpComposer();
    expect(composer.isAskOpen).toBe(false);
    composer.toggleProjectSelector();
    expect(composer.isAskOpen).toBe(true);
    expect(composer.askMode).toBe("projects");
  });

  it("renders thumbnail images instead of numbers in project selector options", () => {
    const composer = new OmpComposer();
    composer.isAskOpen = true;
    composer.askMode = "projects";
    const rendered = composer.render();
    const allText = getAllTemplateText(rendered);
    expect(allText).toContain("img");
    expect(allText).toContain("omp-appearance-cover-image-small--2.jpg");
  });
});
