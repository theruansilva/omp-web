import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./CopilotComposer";
import type { SubmitPromptDetail } from "./CopilotComposer";
import "./CopilotDiscoverCard";
import type { DiscoverCardData } from "./CopilotDiscoverCard";

@customElement("copilot-discover-view")
export class CopilotDiscoverView extends LitElement {
  @property({ type: Boolean }) isWorking = false;

  protected override createRenderRoot() {
    return this;
  }

  private readonly discoverCards: DiscoverCardData[] = [
    {
      id: "1",
      title: "Breakthroughs in Deep Reasoning & Agentic Workflows",
      prompt: "Explain the major breakthroughs in deep reasoning models and autonomous agentic workflows.",
      layout: "large",
      image: "/static/cmc/images/gallery-1-thumb.jpg",
    },
    {
      id: "2",
      title: "Bioluminescence: How Organisms Produce Natural Light",
      prompt: "Describe the chemical and biological mechanisms of bioluminescence in marine life.",
      layout: "small",
      image: "/static/cmc/images/gallery-2-thumb.jpg",
    },
  ];

  private handleCardClick(prompt: string) {
    this.dispatchEvent(
      new CustomEvent("submit-prompt", {
        detail: { prompt, model: "Quick response" },
        bubbles: true,
        composed: true,
      })
    );
  }

  override render() {
    return html`
      <!-- Microsoft Copilot Exact Discover Page Architecture from Image 3 & discover.js -->
      <div class="scrollbar-stable t-custom-scrollbar relative flex size-full flex-col items-center overflow-y-auto overflow-x-hidden overscroll-contain">
        <div class="w-full max-w-discover px-6 pt-16 pb-28 flex flex-col items-center mx-auto">
          <!-- Section Heading from Image 3 -->
          <h1
            class="text-center text-foreground-800 text-3xl font-semibold tracking-tight font-ginto mb-8 select-none"
          >
            Trending in AI & Science
          </h1>

          <!-- Section Container with authentic 2-card grid (@container/card-section) -->
          <section class="@container/card-section w-full max-w-discover" aria-label="Trending in AI & Science">
            <div class="grid grid-cols-2 gap-4 @xl/card-section:grid-cols-4">
              ${this.discoverCards.map(
      (card) => html`
                  <copilot-discover-card
                    .card=${card}
                    .layout=${card.layout ?? "vertical"}
                    @card-click=${() => this.handleCardClick(card.prompt)}
                  ></copilot-discover-card>
                `
    )}
            </div>
          </section>

          <!-- Bottom Floating Composer in Content Flow (from Image 3) -->
          <div class="w-full max-w-chat mt-14 flex justify-center">
            <copilot-composer
              placeholder="Message Copilot"
              selectedModel="Quick response"
              .isWorking=${this.isWorking}
              @submit-prompt=${(e: CustomEvent<SubmitPromptDetail>) => {
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
