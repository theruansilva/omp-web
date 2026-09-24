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
      <div class="relative flex flex-col h-full w-full overflow-hidden">
        <!-- Scrollable Feed Container with generous bottom padding so cards are never occluded -->
        <div class="flex-1 overflow-y-auto px-4 pt-14 pb-48 max-w-4xl mx-auto w-full flex flex-col gap-10">
          <!-- Page Header -->
          <div class="flex flex-col gap-1 text-center md:text-left select-none">
            <h1 class="text-2xl md:text-3xl font-bold tracking-tight text-foreground-900 font-ginto">Discover</h1>
            <p class="text-sm text-foreground-600">Explore curated topics, insights, and ideas powered by Copilot</p>
          </div>

          <!-- Section 1: Trending in AI & Science with Squircle-48-32 -->
          <div class="flex flex-col gap-4">
            <h2 class="text-xs font-bold uppercase tracking-wider text-foreground-500 font-ginto">
              Trending in AI & Science
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${this.trendingCards.map(
      (card) => html`
                  <div
                    class="relative drop-shadow-sm hover:drop-shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                    @click=${() => this.handleCardClick(card.prompt)}
                  >
                    <div class="copilot-squircle-card squircle-48-32 flex flex-col overflow-hidden">
                      <!-- Thumbnail with overlay -->
                      <div class="relative h-44 w-full overflow-hidden bg-black/20">
                        <img
                          src="${card.thumbnail}"
                          alt="${card.title}"
                          class="size-full object-cover transition-transform duration-500 hover:scale-105"
                          loading="lazy"
                          onerror="this.style.display='none'"
                        />
                        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      </div>
                      <!-- Body -->
                      <div class="p-5 flex flex-col justify-between flex-1 gap-2">
                        <h3 class="copilot-card-title text-base font-semibold leading-snug hover:text-blue-500 transition-colors font-ginto">
                          ${card.title}
                        </h3>
                        <p class="copilot-card-desc text-xs line-clamp-2 leading-relaxed">
                          ${card.prompt}
                        </p>
                      </div>

                      <!-- Squircle-48-32 Stroke Overlay -->
                      <div class="copilot-squircle-stroke squircle-stroke-48-32"></div>
                    </div>
                  </div>
                `
    )}
            </div>
          </div>

          <!-- Section 2: Creative Explorations with Squircle-36-24 -->
          <div class="flex flex-col gap-4">
            <h2 class="text-xs font-bold uppercase tracking-wider text-foreground-500 font-ginto">
              Creative Explorations
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${this.creativeCards.map(
      (card) => html`
                  <div
                    class="relative drop-shadow-sm hover:drop-shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                    @click=${() => this.handleCardClick(card.prompt)}
                  >
                    <div class="copilot-squircle-card squircle-36-24 flex flex-col overflow-hidden">
                      <div class="relative h-44 w-full overflow-hidden bg-black/20">
                        <img
                          src="${card.thumbnail}"
                          alt="${card.title}"
                          class="size-full object-cover transition-transform duration-500 hover:scale-105"
                          loading="lazy"
                          onerror="this.style.display='none'"
                        />
                        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      </div>
                      <div class="p-5 flex flex-col justify-between flex-1 gap-2">
                        <h3 class="copilot-card-title text-base font-semibold leading-snug hover:text-blue-500 transition-colors font-ginto">
                          ${card.title}
                        </h3>
                        <p class="copilot-card-desc text-xs line-clamp-2 leading-relaxed">
                          ${card.prompt}
                        </p>
                      </div>

                      <!-- Squircle-36-24 Stroke Overlay -->
                      <div class="copilot-squircle-stroke squircle-stroke-36-24"></div>
                    </div>
                  </div>
                `
    )}
            </div>
          </div>
        </div>

        <!-- Sticky Bottom Composer Dock -->
        <div class="absolute bottom-0 inset-x-0 z-20 flex flex-col items-center px-4 pb-4 pt-8 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/80 dark:via-background-dark/80 to-transparent pointer-events-none">
          <div class="w-full max-w-[720px] pointer-events-auto">
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
