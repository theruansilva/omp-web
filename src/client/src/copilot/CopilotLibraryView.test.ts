import { describe, expect, it } from "bun:test";
import "./CopilotLabsFeatureCard";
import { CopilotLabsFeatureCard, type LabInitiative } from "./CopilotLabsFeatureCard";
import "./CopilotLabsExperimentCard";
import { CopilotLabsExperimentCard } from "./CopilotLabsExperimentCard";
import "./CopilotLibraryView";
import { CopilotLibraryView } from "./CopilotLibraryView";

describe("CopilotLabsFeatureCard", () => {
  it("registers custom element and renders initiative", () => {
    expect(customElements.get("copilot-labs-feature-card")).toBeDefined();
    const card = new CopilotLabsFeatureCard();
    const initiative: LabInitiative = {
      id: "audio-expression",
      title: "Copilot Audio Expressions",
      description: "An experimental tool designed for effortless audio creation.",
      image: "/static/copilotlabs/audio-expression-cover-image-small.jpg",
      actionText: "Try now",
    };
    card.initiative = initiative;
    const rendered = card.render();
    expect(rendered).toBeDefined();
  });
});

describe("CopilotLabsExperimentCard", () => {
  it("registers custom element and renders experiment", () => {
    expect(customElements.get("copilot-labs-experiment-card")).toBeDefined();
    const card = new CopilotLabsExperimentCard();
    const experiment: LabInitiative = {
      id: "copilot-3d",
      title: "Copilot 3D",
      description: "Turn images into 3D models with one click.",
      image: "/static/copilotlabs/copilot-3d-cover-image-small.png",
      actionText: "Try now",
    };
    card.experiment = experiment;
    const rendered = card.render();
    expect(rendered).toBeDefined();
  });
});

describe("CopilotLibraryView", () => {
  it("registers custom element and renders discovery and labs sections", () => {
    expect(customElements.get("copilot-library-view")).toBeDefined();
    const view = new CopilotLibraryView();
    const rendered = view.render();
    expect(rendered).toBeDefined();
  });
});
