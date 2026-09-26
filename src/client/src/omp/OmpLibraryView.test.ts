import { describe, expect, it } from "bun:test";
import "./OmpLabsFeatureCard";
import { OmpLabsFeatureCard, type LabInitiative } from "./OmpLabsFeatureCard";
import "./OmpLabsExperimentCard";
import { OmpLabsExperimentCard } from "./OmpLabsExperimentCard";
import "./OmpLibraryView";
import { OmpLibraryView } from "./OmpLibraryView";

describe("OmpLabsFeatureCard", () => {
  it("registers custom element and renders initiative", () => {
    expect(customElements.get("omp-labs-feature-card")).toBeDefined();
    const card = new OmpLabsFeatureCard();
    const initiative: LabInitiative = {
      id: "audio-expression",
      title: "OMP Audio Expressions",
      description: "An experimental tool designed for effortless audio creation.",
      image: "/static/omplabs/audio-expression-cover-image-small.jpg",
      actionText: "Try now",
    };
    card.initiative = initiative;
    const rendered = card.render();
    expect(rendered).toBeDefined();
  });
});

describe("OmpLabsExperimentCard", () => {
  it("registers custom element and renders experiment", () => {
    expect(customElements.get("omp-labs-experiment-card")).toBeDefined();
    const card = new OmpLabsExperimentCard();
    const experiment: LabInitiative = {
      id: "omp-3d",
      title: "OMP 3D",
      description: "Turn images into 3D models with one click.",
      image: "/static/omplabs/omp-3d-cover-image-small.png",
      actionText: "Try now",
    };
    card.experiment = experiment;
    const rendered = card.render();
    expect(rendered).toBeDefined();
  });
});

describe("OmpLibraryView", () => {
  it("registers custom element and renders discovery and labs sections", () => {
    expect(customElements.get("omp-library-view")).toBeDefined();
    const view = new OmpLibraryView();
    const rendered = view.render();
    expect(rendered).toBeDefined();
  });
});
