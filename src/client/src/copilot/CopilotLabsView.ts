import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";

interface LabInitiative {
  id: string;
  title: string;
  description: string;
  image: string;
  actionText: string;
  badge?: string;
}

@customElement("copilot-labs-view")
export class CopilotLabsView extends LitElement {
  protected override createRenderRoot() {
    return this;
  }

  private readonly featuredInitiative: LabInitiative = {
    id: "audio-expression",
    title: "Copilot Audio Expressions",
    description:
      "An experimental tool designed for effortless audio creation using Copilot's latest voice generation models.",
    image: "/static/copilotlabs/audio-expression-cover-image-small.jpg",
    actionText: "Try now",
    badge: "FEATURED",
  };

  private readonly gridInitiatives: LabInitiative[] = [
    {
      id: "copilot-3d",
      title: "Copilot 3D",
      description: "Turn images into 3D models with one click.",
      image: "/static/copilotlabs/copilot-3d-cover-image-small.png",
      actionText: "Try now",
    },
    {
      id: "portraits",
      title: "Portraits",
      description: "Talk through big moments with AI that responds with voice and visuals tailored to your identity.",
      image: "/static/copilotlabs/portrait-cover-image-small--2.jpg",
      actionText: "Try now",
    },
    {
      id: "vision",
      title: "Copilot Vision",
      description: "Vision available on Edge, Windows, Mac, mobile and Xbox. Understand anything on your screen in real time.",
      image: "/static/copilotlabs/copilot-vision-cover-image-small.jpg",
      actionText: "Try now",
    },
    {
      id: "gaming",
      title: "Copilot Gaming Experiences",
      description: "A research demo at the intersection of gaming and artificial intelligence.",
      image: "/static/copilotlabs/copilot-gaming-cover-image-small.jpg",
      actionText: "Try now",
    },
  ];

  private handleAction(init: LabInitiative) {
    this.dispatchEvent(
      new CustomEvent("submit-prompt", {
        detail: {
          prompt: `Tell me more about the experimental ${init.title} feature in Copilot Labs and how I can try it.`,
          model: "Smart",
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  override render() {
    return html`
      <!-- Microsoft Copilot Exact Labs View Hierarchy from labs_rendered_main.html -->
      <div class="scrollbar-stable t-custom-scrollbar relative flex size-full flex-col items-center overflow-y-auto overflow-x-hidden overscroll-contain">
        <div class="w-full max-w-labs px-6 pt-16 pb-28 flex flex-col items-center mx-auto">
          <!-- Page Titles -->
          <div class="flex w-full flex-col items-center">
            <h1 class="text-center text-foreground-800 text-3xl font-ginto" data-testid="labs-title">
              <span class="text-[38px] font-semibold">Copilot Labs</span>
            </h1>
            <h2 class="mt-4 text-center text-foreground-800 text-xl font-ginto [font-variation-settings:'opsz'_40,_'wght'_400]" data-testid="labs-slogan">
              Discover experimental AI initiatives
            </h2>
          </div>

          <!-- Section: Featured Hero Card -->
          <section class="mt-12 w-full">
            <div
              class="relative isolate bg-white/45 dark:bg-background-650/10 flex h-full cursor-pointer flex-col gap-3 p-3 text-foreground-800 transition-transform duration-200 ease-in hover:scale-[1.025] bp-960:flex-row bp-960:gap-4 shadow-sm w-full"
              data-experiment-alias="audio-expression"
              data-testid="labs-feature-card"
              style="clip-path: var(--clip-path-squircle-60);"
              @click=${() => this.handleAction(this.featuredInitiative)}
            >
              <div class="items-stretch overflow-hidden rounded-b-6xl rounded-t-7xl aspect-[97/74] bp-960:basis-[calc(50%-12px)] bp-960:rounded-l-7xl bp-960:rounded-r-6xl">
                <div class="relative size-full">
                  <img
                    alt=""
                    class="absolute size-full object-cover block"
                    src="${this.featuredInitiative.image}"
                  />
                </div>
              </div>
              <div class="flex flex-col items-start justify-center space-y-6 text-foreground-800 pb-5 pe-4 ps-5 pt-1.5 bp-960:basis-[calc(50%+12px)] bp-960:pb-8 bp-960:pe-4 bp-960:ps-2 bp-960:pt-2">
                <div class="flex flex-col items-start space-y-2">
                  <p class="line-clamp-2 text-2xl font-semibold font-ginto text-foreground-800" data-testid="labs-card-title">
                    ${this.featuredInitiative.title}
                  </p>
                  <p class="line-clamp-3 text-sm text-foreground-600 leading-relaxed font-sans" data-testid="labs-card-description">
                    ${this.featuredInitiative.description}
                  </p>
                </div>
                <button
                  class="relative flex items-center text-foreground-800 fill-foreground-800 active:text-foreground-600 active:fill-foreground-600 dark:active:text-foreground-650 dark:active:fill-foreground-650 bg-transparent safe-hover:bg-black/5 active:bg-black/3 dark:safe-hover:bg-black/30 dark:active:bg-black/20 text-sm justify-center min-h-10 min-w-10 px-4 py-2 gap-x-2 rounded-xl after:rounded-xl after:absolute after:inset-0 after:pointer-events-none after:contrast-more:border-2 outline-2 outline-offset-1 focus-visible:z-[1] focus-visible:outline focus-visible:outline-stroke-900 after:border after:border-black/30 dark:after:border-white/30 border-black/8 font-medium"
                  type="button"
                >
                  Try now
                </button>
              </div>
              <div
                class="before:border-black/10 dark:before:border-white/10 before:border-[20px] will-change-transform pointer-events-none absolute inset-0 before:absolute before:inset-0 before:rounded-inherit"
                style="clip-path: var(--clip-path-squircle-stroke-60);"
              ></div>
            </div>
          </section>

          <!-- Section: Previous Experiments (2-Column Grid) -->
          <section class="mt-14 w-full">
            <h2 class="text-center text-foreground-800 text-2xl font-ginto [font-variation-settings:'opsz'_40,_'wght'_400] mb-8">
              Previous experiments
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              ${this.gridInitiatives.map(
      (item) => html`
                  <div
                    class="relative isolate bg-white/45 dark:bg-background-650/10 flex h-full cursor-pointer flex-col gap-3 p-3 text-foreground-800 transition-transform duration-200 ease-in hover:scale-[1.025] shadow-sm w-full"
                    data-experiment-alias="${item.id}"
                    data-testid="labs-experiment-card"
                    style="clip-path: var(--clip-path-squircle-60);"
                    @click=${() => this.handleAction(item)}
                  >
                    <div class="items-stretch overflow-hidden rounded-b-6xl rounded-t-7xl aspect-[16/10]">
                      <div class="relative size-full">
                        <img
                          alt=""
                          class="absolute size-full object-cover block"
                          src="${item.image}"
                        />
                      </div>
                    </div>
                    <div class="flex flex-col items-start space-y-4 text-foreground-800 pb-4 pe-3 ps-3 pt-1 flex-1 justify-between">
                      <div class="flex flex-col items-start space-y-1.5">
                        <p class="line-clamp-2 text-xl font-semibold font-ginto text-foreground-800" data-testid="labs-card-title">
                          ${item.title}
                        </p>
                        <p class="line-clamp-3 text-xs text-foreground-600 leading-relaxed" data-testid="labs-card-description">
                          ${item.description}
                        </p>
                      </div>
                      <button
                        class="relative flex items-center text-foreground-800 fill-foreground-800 bg-transparent safe-hover:bg-black/5 active:bg-black/3 dark:safe-hover:bg-black/30 text-xs justify-center min-h-8 min-w-8 px-3.5 py-1.5 rounded-xl border border-black/20 dark:border-white/20 font-medium"
                        type="button"
                      >
                        ${item.actionText}
                      </button>
                    </div>
                    <div
                      class="before:border-black/10 dark:before:border-white/10 before:border-[20px] will-change-transform pointer-events-none absolute inset-0 before:absolute before:inset-0 before:rounded-inherit"
                      style="clip-path: var(--clip-path-squircle-stroke-60);"
                    ></div>
                  </div>
                `
    )}
            </div>
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
    "copilot-labs-view": CopilotLabsView;
  }
}
