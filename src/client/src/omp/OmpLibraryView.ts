import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./OmpDiscoverCard";
import type { DiscoverCardData } from "./OmpDiscoverCard";
import "./OmpLabsFeatureCard";
import type { LabInitiative } from "./OmpLabsFeatureCard";
import "./OmpLabsExperimentCard";
import "./OmpGraduatedCard";
import type { GraduatedExperiment } from "./OmpGraduatedCard";

@customElement("omp-library-view")
export class OmpLibraryView extends LitElement {
  @property({ type: Boolean }) isWorking = false;

  protected override createRenderRoot() {
    return this;
  }

  // --- Discovery Cards (Preserving Discovery Layout & Tokens) ---
  private readonly discoverCards: DiscoverCardData[] = [
    {
      id: "disc-1",
      title: "Breakthroughs in Deep Reasoning & Agentic Workflows",
      prompt: "Explain the major breakthroughs in deep reasoning models and autonomous agentic workflows.",
      layout: "large",
      image: "/static/cmc/images/gallery-1-thumb.jpg",
    },
    {
      id: "disc-2",
      title: "Bioluminescence: How Organisms Produce Natural Light",
      prompt: "Describe the chemical and biological mechanisms of bioluminescence in marine life.",
      layout: "small",
      image: "/static/cmc/images/gallery-2-thumb.jpg",
    },
    {
      id: "disc-3",
      title: "Designing with Squircle Geometry & Token Scales",
      prompt: "How does squircle geometry improve visual ergonomics and concentric interface design?",
      layout: "small",
      image: "/static/cmc/images/gallery-3-thumb.jpg",
    },
  ];

  // --- Labs Initiatives (Preserving Labs Layout & Tokens) ---
  private readonly featuredInitiative: LabInitiative = {
    id: "audio-expression",
    title: "OMP Audio Expressions",
    description:
      "An experimental tool designed for effortless audio creation using OMP's latest voice generation models.",
    image: "/static/omplabs/audio-expression-cover-image-small.jpg",
    actionText: "Try now",
    badge: "FEATURED",
  };

  private readonly gridInitiatives: LabInitiative[] = [
    {
      id: "omp-3d",
      title: "OMP 3D",
      description: "Turn images into 3D models with one click.",
      image: "/static/omplabs/omp-3d-cover-image-small.png",
      actionText: "Try now",
    },
    {
      id: "portraits",
      title: "Portraits",
      description:
        "Talk through big moments with AI that responds with voice and visuals tailored to your identity.",
      image: "/static/omplabs/portrait-cover-image-small--2.jpg",
      actionText: "Try now",
    },
    {
      id: "gaming",
      title: "OMP Gaming Experiences",
      description:
        "A research demo at the intersection of gaming and artificial intelligence.",
      image: "/static/omplabs/omp-gaming-cover-image-small.jpg",
      actionText: "Try now",
    },
  ];

  private readonly graduatedExperiments: GraduatedExperiment[] = [
    {
      id: "mico",
      title: "Mico",
      description: "Now available in Voice mode on desktop and mobile",
      image: "/static/omplabs/omp-appearance-cover-image-small--2.jpg",
      showButton: false,
    },
    {
      id: "omp-vision",
      title: "OMP Vision",
      description: "Vision available on Edge, Windows, Mac, mobile and Xbox.",
      image: "/static/omplabs/omp-vision-cover-image-small.jpg",
      actionText: "Try in OMP",
      showButton: true,
    },
  ];

  private handleDiscoverCardClick(prompt: string) {
    this.dispatchEvent(
      new CustomEvent("submit-prompt", {
        detail: { prompt, model: "Quick response" },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleLabsAction(init: LabInitiative | GraduatedExperiment) {
    this.dispatchEvent(
      new CustomEvent("submit-prompt", {
        detail: {
          prompt: `Tell me more about the experimental ${init.title} feature in OMP Labs and how I can try it.`,
          model: "Smart",
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  override render() {
    return html`
      <div class="scrollbar-stable t-custom-scrollbar relative flex size-full flex-col items-center overflow-y-auto overflow-x-hidden overscroll-contain">
        <div class="w-full max-w-labs px-6 pt-16 pb-28 flex flex-col items-center mx-auto">
          <!-- Page Header -->
          <div class="flex w-full flex-col items-center mb-12 text-center select-none">
            <h1 class="text-foreground-800 text-3xl font-ginto" data-testid="library-title">
              <span class="text-[38px] font-semibold">Your Library</span>
            </h1>
            <h2 class="mt-3 text-foreground-800 text-lg font-ginto [font-variation-settings:'opsz'_40,_'wght'_400]" data-testid="library-slogan">
              Saved components, trending topics, and experimental initiatives
            </h2>
          </div>

          <!-- Section 1: Discovery Components (Authentic 2x2 + 2x1 Grid) -->
          <section class="w-full mb-16" aria-label="Trending in AI & Science">
            <div class="flex w-full flex-col items-center mb-8">
              <h2 class="text-center text-foreground-800 text-2xl font-semibold tracking-tight font-ginto select-none">
                Trending in AI & Science
              </h2>
              <span class="mt-1 text-xs text-foreground-500 font-sans tracking-wide uppercase">Discovery Components</span>
            </div>

            <div class="@container/card-section w-full max-w-discover mx-auto">
              <div class="grid grid-cols-2 gap-4 @xl/card-section:grid-cols-4">
                ${this.discoverCards.map(
      (card) => html`
                    <omp-discover-card
                      .card=${card}
                      .layout=${card.layout ?? "vertical"}
                      @card-click=${() => this.handleDiscoverCardClick(card.prompt)}
                    ></omp-discover-card>
                  `
    )}
              </div>
            </div>
          </section>

          <!-- Divider between Discovery and Labs -->
          <div class="w-full h-px bg-black/10 dark:bg-white/10 mb-16 max-w-discover"></div>

          <!-- Section 2: Labs Initiatives & Experiments -->
          <div class="flex w-full flex-col items-center mb-8">
            <h2 class="text-center text-foreground-800 text-2xl font-semibold tracking-tight font-ginto select-none">
              OMP Labs
            </h2>
            <span class="mt-1 text-xs text-foreground-500 font-sans tracking-wide uppercase">Experimental AI Initiatives</span>
          </div>

          <!-- Labs: Featured Hero Card -->
          <section class="w-full mb-14" aria-label="Featured Initiative">
            <omp-labs-feature-card
              .initiative=${this.featuredInitiative}
              @card-click=${() => this.handleLabsAction(this.featuredInitiative)}
            ></omp-labs-feature-card>
          </section>

          <!-- Labs: Preview Experiments (2-Column Grid) -->
          <section class="w-full mb-16" aria-label="Preview Experiments">
            <h3 class="text-center text-foreground-800 text-xl font-ginto [font-variation-settings:'opsz'_40,_'wght'_400] mb-8">
              Preview experiments
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              ${this.gridInitiatives.map(
      (item) => html`
                  <omp-labs-experiment-card
                    .experiment=${item}
                    @card-click=${() => this.handleLabsAction(item)}
                  ></omp-labs-experiment-card>
                `
    )}
            </div>
          </section>

          <!-- Labs: Previous Experiments (Graduated Cards) -->
          <section class="w-full" aria-labelledby="library-labs-previous-experiments-title">
            <h3
              id="library-labs-previous-experiments-title"
              class="text-center text-foreground-800 text-xl [font-variation-settings:'opsz'_40,_'wght'_400] mb-6"
            >
              Previous experiments
            </h3>
            <ul class="flex list-none flex-col gap-4" role="list">
              ${this.graduatedExperiments.map(
      (exp) => html`
                  <li>
                    <omp-graduated-card
                      .experiment=${exp}
                      @card-click=${() => this.handleLabsAction(exp)}
                    ></omp-graduated-card>
                  </li>
                `
    )}
            </ul>
          </section>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "omp-library-view": OmpLibraryView;
  }
}
