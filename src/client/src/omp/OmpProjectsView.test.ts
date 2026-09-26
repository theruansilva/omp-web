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

describe("OmpComposer /btw Side Question Support", () => {
  it("renders /btw toggle button in the toolbar", () => {
    const composer = new OmpComposer();
    const rendered = composer.render();
    const text = getAllTemplateText(rendered);
    expect(text).toContain("composer-btw-toggle-button");
    expect(text).toContain("/btw");
  });

  it("toggles /btw mode on button click", () => {
    const composer = new OmpComposer();
    expect(composer.isBtwMode).toBe(false);
    expect(composer.isBtwActive).toBe(false);

    composer.toggleBtwMode();
    expect(composer.isBtwMode).toBe(true);
    expect(composer.isBtwActive).toBe(true);

    composer.toggleBtwMode();
    expect(composer.isBtwMode).toBe(false);
  });

  it("opens slash commands menu and includes /btw command", () => {
    const composer = new OmpComposer();
    composer.openSlashMenu("");
    expect(composer.filteredSlashCommands.some((c) => c.name === "btw")).toBe(true);

    const rendered = composer.render();
    const text = getAllTemplateText(rendered);
    expect(text).toContain("composer-slash-menu");
    expect(text).toContain("/btw");
    expect(text).toContain("Side Question");
  });

  it("selecting /btw slash command populates input and enables isBtwMode", () => {
    const composer = new OmpComposer();
    composer.selectSlashCommand("btw");
    expect(composer.value).toBe("/btw ");
    expect(composer.isBtwMode).toBe(true);
    expect(composer.isBtwActive).toBe(true);
  });

  it("renders btw expander when btwState is active", () => {
    const composer = new OmpComposer();
    composer.btwState = {
      status: "complete",
      question: "Qual é o token de cor do acrylic?",
      answer: "O token é --omp-acrylic-bg com backdrop-blur.",
      canBranch: true,
    };
    expect(composer.hasActiveBtw).toBe(true);

    const rendered = composer.render();
    const text = getAllTemplateText(rendered);
    expect(text).toContain("composer-btw-card");
    expect(text).toContain("Qual é o token de cor do acrylic?");
    expect(text).toContain("O token é --omp-acrylic-bg com backdrop-blur.");
    expect(text).toContain("Branch para Sessão");
    expect(text).not.toContain("Respondido");
    expect(text).not.toContain("Esc para fechar");
  });

  it("dispatches submit-btw and submit-prompt when submitting /btw query", () => {
    const composer = new OmpComposer();
    composer.value = "/btw O que este comando faz?";
    let btwDetail: unknown = null;
    let promptDetail: unknown = null;

    composer.addEventListener("submit-btw", (e: Event) => {
      btwDetail = (e as CustomEvent).detail;
    });
    composer.addEventListener("submit-prompt", (e: Event) => {
      promptDetail = (e as CustomEvent).detail;
    });

    // Call submit directly
    (composer as unknown as { submit: () => void }).submit();

    expect(btwDetail).toEqual({
      question: "O que este comando faz?",
      prompt: "/btw O que este comando faz?",
    });
    expect(promptDetail).toMatchObject({
      prompt: "/btw O que este comando faz?",
    });
    expect(composer.value).toBe("");
  });


  it("closes active btw panel when Escape key is pressed", () => {
    const composer = new OmpComposer();
    composer.btwState = {
      status: "complete",
      question: "Dúvida teste",
      answer: "Resposta teste",
    };
    expect(composer.hasActiveBtw).toBe(true);

    let closeEventDispatched = false;
    composer.addEventListener("close-btw", () => {
      closeEventDispatched = true;
    });

    // Simulate Escape keydown on document handler
    let prevented = false;
    let stopped = false;
    const fakeEsc = {
      key: "Escape",
      preventDefault() { prevented = true; },
      stopPropagation() { stopped = true; },
    } as KeyboardEvent;

    (composer as unknown as { handleDocumentKeyDown: (e: KeyboardEvent) => void }).handleDocumentKeyDown(fakeEsc);

    expect(prevented).toBe(true);
    expect(stopped).toBe(true);
    expect(closeEventDispatched).toBe(true);
    expect(composer.hasActiveBtw).toBe(false);
    expect(composer.btwState).toBeUndefined();
  });


  it("preserves cached content during closing animation while removing open state", () => {
    const composer = new OmpComposer();
    composer.btwState = {
      status: "complete",
      question: "Questão para fechar",
      answer: "Resposta para animar",
    };
    expect(composer.hasActiveBtw).toBe(true);

    composer.closeBtw();
    expect(composer.btwState).toBeUndefined();

    const rendered = composer.render();
    const text = getAllTemplateText(rendered);
    expect(text).toContain("composer-btw-card");
    expect(text).toContain("Questão para fechar");
    expect(text).toContain("Resposta para animar");
  });

  it("dispatches close-btw when closing", () => {
    const composer = new OmpComposer();
    composer.btwState = {
      status: "running",
      question: "Side query",
      answer: "",
    };
    let closed = false;
    composer.addEventListener("close-btw", () => {
      closed = true;
    });

    composer.closeBtw();
    expect(closed).toBe(true);
    expect(composer.btwState).toBeUndefined();
  });
});
