import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import "./OmpLabsFeatureCard";
import type { LabInitiative } from "./OmpLabsFeatureCard";
import "./OmpLabsExperimentCard";
import "./OmpGraduatedCard";
import type { GraduatedExperiment } from "./OmpGraduatedCard";

export type { LabInitiative };

@customElement("omp-labs-view")
export class OmpLabsView extends LitElement {
  protected override createRenderRoot() {
    return this;
  }

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

  private handleAction(init: LabInitiative | GraduatedExperiment) {
    this.dispatchEvent(
      new CustomEvent("submit-prompt", {
        detail: {
          prompt: `Tell me more about the experimental ${init.title} feature in OMP Labs and how I can try it.`,
          model: "Smart",
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  override render() {
    return html`
      <!-- OMP Web Exact Labs View Hierarchy from labs_rendered_main.html -->
      <div class="scrollbar-stable t-custom-scrollbar relative flex size-full flex-col items-center overflow-y-auto overflow-x-hidden overscroll-contain">
        <div class="w-full max-w-labs px-6 pt-16 pb-28 flex flex-col items-center mx-auto">
          <!-- Page Titles -->
          <div class="flex w-full flex-col items-center">
            <h1 class="text-center text-foreground-800 text-3xl font-ginto" data-testid="labs-title">
              <span class="text-[38px] font-semibold">OMP Labs</span>
            </h1>
            <h2 class="mt-4 text-center text-foreground-800 text-xl font-ginto [font-variation-settings:'opsz'_40,_'wght'_400]" data-testid="labs-slogan">
              Discover experimental AI initiatives
            </h2>
          </div>

          <!-- Section: Featured Hero Card -->
          <section class="mt-12 w-full">
            <omp-labs-feature-card
              .initiative=${this.featuredInitiative}
              @card-click=${() => this.handleAction(this.featuredInitiative)}
            ></omp-labs-feature-card>
          </section>

          <!-- Section: Preview Experiments (2-Column Grid) -->
          <section class="mt-14 w-full">
            <h2 class="text-center text-foreground-800 text-2xl font-ginto [font-variation-settings:'opsz'_40,_'wght'_400] mb-8">
              Preview experiments
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              ${this.gridInitiatives.map(
      (item) => html`
                  <omp-labs-experiment-card
                    .experiment=${item}
                    @card-click=${() => this.handleAction(item)}
                  ></omp-labs-experiment-card>
                `,
    )}
            </div>
          </section>

          <!-- Section: Previous Experiments (Graduated Cards) -->
          <section class="mt-20 w-full" aria-labelledby="labs-previous-experiments-title">
            <h2
              id="labs-previous-experiments-title"
              class=" text-center text-foreground-800 text-2xl [font-variation-settings:'opsz'_40,_'wght'_400]"
            >
              Previous experiments
            </h2>
            <ul class="mt-4 flex list-none flex-col gap-4" role="list">
              ${this.graduatedExperiments.map(
      (exp) => html`
                  <li>
                    <omp-graduated-card
                      .experiment=${exp}
                      @card-click=${() => this.handleAction(exp)}
                    ></omp-graduated-card>
                  </li>
                `,
    )}
            </ul>
          </section>

          <!-- Section: Community Callout -->
          <section class="mt-14 w-full text-center">
            <h2 class="w-full space-y-2 pt-8 text-center text-foreground-800 text-xl font-ginto">
              Play, discuss and build together! Join us on your favorite community to discover the future of AI.
            </h2>
            <div class="mt-6 flex flex-wrap items-center justify-center gap-4">
              <div class="relative isolate bg-white/45 dark:bg-background-650/10 px-6 py-4 rounded-2xl flex items-center gap-3 border border-black/10 dark:border-white/10 shadow-xs cursor-pointer hover:scale-105 transition-transform">
                <span class="text-sm font-semibold text-foreground-800 font-ginto">Join on Discord</span>
              </div>
              <div class="relative isolate bg-white/45 dark:bg-background-650/10 px-6 py-4 rounded-2xl flex items-center gap-3 border border-black/10 dark:border-white/10 shadow-xs cursor-pointer hover:scale-105 transition-transform">
                <span class="text-sm font-semibold text-foreground-800 font-ginto">Follow on X</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "omp-labs-view": OmpLabsView;
  }
}
