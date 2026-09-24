import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { renderPlusIcon, renderChevronDownIcon, renderWaveformIcon, renderSendIcon } from "./icons";

interface ShoppingCardPrompt {
  id: string;
  label: string;
  description: string;
  prompt: string;
  image: string;
}

@customElement("copilot-shopping-view")
export class CopilotShoppingView extends LitElement {
  @property({ type: Boolean }) isWorking = false;
  @state() private composerValue = "";

  protected override createRenderRoot() {
    return this;
  }

  private readonly heroCards: ShoppingCardPrompt[] = [
    {
      id: "sneakers",
      label: "Compare products",
      description: "Compare the best running sneakers for men right now",
      prompt: "Make a table comparing the top three best-reviewed running shoes for men for medium distance running",
      image: "/static/shopping/sneakers.webp",
    },
    {
      id: "sweaters",
      label: "Review summaries",
      description: "Compare the best reviewed affordable cashmere sweaters",
      prompt: "I'm looking for a budget-friendly cashmere sweater. Can you compare the reviews of the top rated options and tell me what the best one to buy is?",
      image: "/static/shopping/sweaters.webp",
    },
    {
      id: "console",
      label: "Best deals",
      description: "Find me a great deal on gaming console bundles",
      prompt: "Show me the best deals on gaming console bundles that include extra controllers and popular games",
      image: "/static/shopping/console.webp",
    },
    {
      id: "snowblower",
      label: "Winter gear",
      description: "Find reliable compact snow throwers for heavy snow",
      prompt: "What are the most reliable compact two-stage snow blowers under $800?",
      image: "/static/shopping/snowblower.webp",
    },
  ];

  private handlePromptClick(prompt: string) {
    this.dispatchEvent(
      new CustomEvent("submit-prompt", {
        detail: { prompt, model: "Quick response" },
        bubbles: true,
        composed: true,
      })
    );
  }

  private submitComposer() {
    const text = this.composerValue.trim();
    if (!text || this.isWorking) return;
    this.handlePromptClick(text);
    this.composerValue = "";
  }

  override render() {
    return html`
      <!-- Microsoft Copilot Shopping Landing Page Architecture from Image 1 -->
      <div class="scrollbar-stable t-custom-scrollbar relative flex size-full flex-col items-center overflow-y-auto overflow-x-hidden overscroll-contain bg-[#10141E] text-white">
        <div class="w-full max-w-5xl px-4 sm:px-6 pt-14 pb-20 flex flex-col items-center mx-auto">
          <!-- Main Header Slogan from Image 1 -->
          <h1
            class="text-center text-lg sm:text-2xl font-normal text-white max-w-2xl leading-relaxed tracking-tight mb-8 select-none font-sans"
          >
            I'll help you analyze prices and reviews so you can shop with confidence and know you're getting the best deal.
          </h1>

          <!-- Giant Bokeh Hero Card Banner from Image 1 -->
          <div class="relative w-full max-w-4xl flex flex-col items-center">
            <!-- Hero banner background with golden bokeh lights -->
            <div
              class="w-full h-[320px] sm:h-[370px] rounded-[36px] overflow-hidden relative flex items-center justify-center shadow-2xl border border-white/10"
              style="background: url('/static/shopping/shopping-cards-background.webp') center / cover no-repeat, #2E1B0E;"
            >
              <!-- Ambient Warm Gradient Overlay -->
              <div class="absolute inset-0 bg-radial-at-c from-transparent via-black/20 to-black/45 pointer-events-none"></div>

              <!-- Horizontal Row of Frosted Glass Cards (Custom scrollbar hidden) -->
              <div
                class="relative z-10 flex items-center gap-4 overflow-x-auto w-full px-6 py-6 justify-start sm:justify-center"
                style="scrollbar-width: none; -ms-overflow-style: none;"
              >
                ${this.heroCards.map(
      (card) => html`
                    <div
                      class="flex items-center gap-3.5 p-3 rounded-2xl bg-white/20 dark:bg-black/40 backdrop-blur-xl border border-white/25 hover:bg-white/30 transition-all duration-200 hover:scale-105 cursor-pointer shadow-lg shrink-0 min-w-[210px] max-w-[240px]"
                      @click=${() => this.handlePromptClick(card.prompt)}
                    >
                      <!-- Product Image in rounded container -->
                      <div class="size-16 rounded-xl bg-[#F0EBE5] p-1.5 shrink-0 flex items-center justify-center overflow-hidden shadow-xs">
                        <img
                          src="${card.image}"
                          alt="${card.label}"
                          class="size-full object-contain"
                          loading="lazy"
                          onerror="this.style.display='none'"
                        />
                      </div>

                      <!-- Text Metadata -->
                      <div class="flex flex-col gap-0.5 min-w-0">
                        <span class="text-[11px] font-semibold text-white/80 tracking-wide">
                          ${card.label}
                        </span>
                        <p class="text-xs font-medium text-white line-clamp-2 leading-snug">
                          ${card.description}
                        </p>
                      </div>
                    </div>
                  `
    )}
              </div>
            </div>

            <!-- Floating Pill overlapping bottom edge of Hero Banner from Image 1 -->
            <div class="relative -mt-5 z-20 flex justify-center">
              <button
                type="button"
                class="h-11 px-6 rounded-full bg-[#10141E] hover:bg-[#181D2B] border border-white/25 text-white flex items-center gap-3 shadow-2xl hover:scale-105 active:scale-98 transition-all cursor-pointer select-none font-sans"
                @click=${() => this.handlePromptClick("What are some of the funniest and most creative secret santa gift ideas under $25?")}
              >
                <span class="text-xs sm:text-sm font-semibold tracking-wide text-white">
                  Ideas for the funniest secret santa gifts
                </span>
                <div class="size-7 rounded-full bg-white/15 flex items-center justify-center text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="size-3.5">
                    <line x1="12" y1="19" x2="12" y2="5"></line>
                    <polyline points="5 12 12 5 19 12"></polyline>
                  </svg>
                </div>
              </button>
            </div>
          </div>

          <!-- Bottom Floating Composer: Shop with Copilot from Image 1 -->
          <div class="w-full max-w-4xl mt-14">
            <div class="copilot-dark-composer relative shadow-tinted-xl backdrop-blur-2xl w-full p-3 shadow-2xl">
              <!-- Input field -->
              <div class="px-2 pt-1 pb-1">
                <input
                  type="text"
                  placeholder="Shop with Copilot"
                  class="w-full bg-transparent outline-none text-[15px] font-sans"
                  .value=${this.composerValue}
                  @input=${(e: Event) => {
        this.composerValue = (e.target as HTMLInputElement).value;
      }}
                  @keydown=${(e: KeyboardEvent) => {
        if (e.key === "Enter") {
          this.submitComposer();
        }
      }}
                />
              </div>

              <!-- Controls row with Quick response pill from Image 1 -->
              <div class="flex items-center justify-between pt-2 px-1">
                <div class="flex items-center gap-2">
                  <!-- Plus button -->
                  <button
                    type="button"
                    title="Add attachment"
                    class="copilot-dark-btn size-8 rounded-full flex items-center justify-center transition-colors"
                  >
                    ${renderPlusIcon()}
                  </button>

                  <!-- Quick response pill -->
                  <button
                    type="button"
                    class="copilot-dark-btn h-7 px-3 rounded-full flex items-center gap-1.5 text-xs font-medium transition-colors"
                  >
                    <span>Quick response</span>
                    ${renderChevronDownIcon()}
                  </button>
                </div>

                <!-- Right button -->
                <div class="flex items-center">
                  ${this.composerValue.trim()
        ? html`
                        <button
                          type="button"
                          class="size-8 rounded-full bg-white text-black flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-md"
                          @click=${() => this.submitComposer()}
                        >
                          ${renderSendIcon()}
                        </button>
                      `
        : html`
                        <button
                          type="button"
                          title="Voice input"
                          class="size-8 rounded-full flex items-center justify-center text-white/80 hover:text-white transition-colors"
                        >
                          ${renderWaveformIcon()}
                        </button>
                      `}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "copilot-shopping-view": CopilotShoppingView;
  }
}
