import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./CopilotComposer";

export interface DiscoverCard {
  id: string;
  title: string;
  prompt: string;
  thumbnail: string;
}

@customElement("copilot-discover-view")
export class CopilotDiscoverView extends LitElement {
  @property({ type: Boolean }) isWorking = false;

  protected override createRenderRoot() {
    return this;
  }

  private readonly trendingCards: DiscoverCard[] = [
    {
      id: "disc-1",
      title: "Breakthroughs in Deep Reasoning & Agentic Workflows",
      prompt: "Explain how modern reasoning models and autonomous agents coordinate complex engineering workflows.",
      thumbnail: "/static/cmc/images/gallery-1-thumb.jpg",
    },
    {
      id: "disc-2",
      title: "Bioluminescence: How Organisms Produce Natural Light",
      prompt: "Describe the chemical mechanisms behind luciferin-luciferase reactions in deep sea creatures.",
      thumbnail: "/static/cmc/images/gallery-2-thumb.jpg",
    },
  ];

  private readonly creativeCards: DiscoverCard[] = [
    {
      id: "disc-3",
      title: "Architectural Harmony in Biophilic Design",
      prompt: "What are the core design principles of integrating natural light and organic materials into living spaces?",
      thumbnail: "/static/cmc/images/gallery-4-thumb.jpg",
    },
    {
      id: "disc-4",
      title: "Retro Futurism: The Cultural Legacy of Synthwave",
      prompt: "Explore the aesthetic roots and musical instruments that shaped the 1980s neon synthwave movement.",
      thumbnail: "/static/cmc/images/gallery-8-thumb.jpg",
    },
  ];

  private handleCardClick(prompt: string) {
    this.dispatchEvent(
      new CustomEvent("submit-prompt", {
        detail: { prompt, model: "Smart" },
        bubbles: true,
        composed: true,
      })
    );
  }

  override render() {
    return html`
      <!-- Microsoft Copilot Exact Discover View Hierarchy from templates/discover.html -->
      <div class="scrollbar-stable t-custom-scrollbar relative flex size-full flex-col items-center overflow-y-auto overflow-x-hidden overscroll-contain">
        <div class="w-full max-w-labs px-6 pt-16 pb-48 flex flex-col items-center mx-auto">
          <!-- Page Titles -->
          <div class="flex w-full flex-col items-center">
            <h1 class="text-center text-foreground-800 text-3xl font-ginto" data-testid="labs-title">
              <span class="text-[38px] font-semibold">Copilot Discover</span>
            </h1>
            <h2 class="mt-4 text-center text-foreground-800 text-xl font-ginto [font-variation-settings:'opsz'_40,_'wght'_400]" data-testid="labs-slogan">
              Discover stories, insights, and trending ideas
            </h2>
          </div>

          <!-- Section 1: Trending in AI & Science with Squircle-60 -->
          <section class="mt-12 w-full">
            <h3 class="text-xs font-bold uppercase tracking-wider text-foreground-500 font-ginto mb-5">
              Trending in AI & Science
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              ${this.trendingCards.map(
      (card) => html`
                  <div
                    class="relative isolate bg-white/45 dark:bg-background-650/10 flex h-full cursor-pointer flex-col gap-3 p-3 text-foreground-800 transition-transform duration-200 ease-in hover:scale-[1.025] shadow-sm w-full"
                    data-testid="labs-feature-card"
                    style="clip-path: var(--clip-path-squircle-60);"
                    @click=${() => this.handleCardClick(card.prompt)}
                  >
                    <div class="items-stretch overflow-hidden rounded-b-6xl rounded-t-7xl aspect-[97/74] bp-960:rounded-l-7xl bp-960:rounded-r-6xl">
                      <div class="relative size-full">
                        <img
                          alt="${card.title}"
                          class="absolute size-full object-cover block"
                          src="${card.thumbnail}"
                          loading="lazy"
                          onerror="this.style.display='none'"
                        />
                        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      </div>
                    </div>
                    <div class="flex flex-col items-start space-y-3 text-foreground-800 p-3 flex-1 justify-between">
                      <div class="flex flex-col items-start space-y-1.5">
                        <p class="line-clamp-2 text-xl font-semibold font-ginto text-foreground-800">
                          ${card.title}
                        </p>
                        <p class="line-clamp-3 text-xs text-foreground-600 leading-relaxed font-sans">
                          ${card.prompt}
                        </p>
                      </div>
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

          <!-- Section 2: Creative Explorations with Squircle-60 -->
          <section class="mt-14 w-full">
            <h3 class="text-xs font-bold uppercase tracking-wider text-foreground-500 font-ginto mb-5">
              Creative Explorations
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              ${this.creativeCards.map(
      (card) => html`
                  <div
                    class="relative isolate bg-white/45 dark:bg-background-650/10 flex h-full cursor-pointer flex-col gap-3 p-3 text-foreground-800 transition-transform duration-200 ease-in hover:scale-[1.025] shadow-sm w-full"
                    data-testid="labs-experiment-card"
                    style="clip-path: var(--clip-path-squircle-60);"
                    @click=${() => this.handleCardClick(card.prompt)}
                  >
                    <div class="items-stretch overflow-hidden rounded-b-6xl rounded-t-7xl aspect-[16/10]">
                      <div class="relative size-full">
                        <img
                          alt="${card.title}"
                          class="absolute size-full object-cover block"
                          src="${card.thumbnail}"
                          loading="lazy"
                          onerror="this.style.display='none'"
                        />
                        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      </div>
                    </div>
                    <div class="flex flex-col items-start space-y-3 text-foreground-800 p-3 flex-1 justify-between">
                      <div class="flex flex-col items-start space-y-1.5">
                        <p class="line-clamp-2 text-xl font-semibold font-ginto text-foreground-800">
                          ${card.title}
                        </p>
                        <p class="line-clamp-3 text-xs text-foreground-600 leading-relaxed font-sans">
                          ${card.prompt}
                        </p>
                      </div>
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
        </div>

        <!-- Sticky Bottom Composer Dock -->
        <div class="absolute bottom-0 inset-x-0 z-20 flex flex-col items-center px-4 pb-4 pt-8 bg-gradient-to-t from-background-150 via-background-150/80 to-transparent pointer-events-none">
          <div class="w-full max-w-chat pointer-events-auto">
            <copilot-composer
              compact
              .isWorking=${this.isWorking}
              @submit-prompt=${(e: CustomEvent) => {
        this.dispatchEvent(new CustomEvent("submit-prompt", { detail: e.detail, bubbles: true, composed: true }));
      }}
            ></copilot-composer>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "copilot-discover-view": CopilotDiscoverView;
  }
}
