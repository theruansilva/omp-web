import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./CopilotComposer";
import type { SubmitPromptDetail } from "./CopilotComposer";

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

  override render() {
    return html`
      <!-- Microsoft Copilot Shopping Landing Page Architecture from shopping.lazy.js -->
      <div class="scrollbar-stable t-custom-scrollbar relative flex size-full flex-col items-center overflow-y-auto overflow-x-hidden overscroll-contain">
        <div class="w-full max-w-5xl px-6 py-12 md:py-16 flex flex-col items-center select-none mx-auto">
          <!-- Page Title from shopping.lazy.js -->
          <div class="mb-3 flex w-full justify-center">
            <div class="max-w-xl text-center">
              <h2 class="tracking-tight text-3xl md:text-4xl font-semibold font-ginto text-foreground-800">
                Shopping with Copilot
              </h2>
            </div>
          </div>

          <!-- Page Subtitle from shopping.lazy.js / Image 1 -->
          <div class="mb-8 md:mb-12 flex w-full justify-center">
            <div class="max-w-2xl text-center text-base md:text-lg text-foreground-600 font-sans">
              <h3>
                I'll help you analyze prices and reviews so you can shop with confidence and know you're getting the best deal.
              </h3>
            </div>
          </div>

          <!-- Giant Bokeh Hero Card Banner from shopping.lazy.js -->
          <div class="relative w-full max-w-4xl flex flex-col items-center">
            <div
              class="flex h-[380px] md:h-[420px] w-full flex-col justify-center overflow-hidden rounded-5xl bg-center relative shadow-2xl border border-black/10 dark:border-white/10"
              style="background-image: url('/static/shopping/shopping-cards-background.webp'); background-size: cover; background-position: center;"
              role="presentation"
            >
              <!-- Carousel of Frosted Glass Cards -->
              <div class="relative flex w-full overflow-hidden py-4">
                <div
                  class="flex gap-4 px-6 overflow-x-auto w-full justify-start md:justify-center scrollbar-none"
                  style="scrollbar-width: none; -ms-overflow-style: none;"
                >
                  ${this.heroCards.map(
      (card) => html`
                      <div
                        class="flex h-22 min-w-60 max-w-60 items-center justify-start gap-3 p-2 pe-3 bg-white/80 dark:bg-[#1A1E2B]/85 backdrop-blur-xl rounded-2xl cursor-pointer transition-transform duration-200 ease-out hover:scale-[1.025] shadow-lg border border-white/25 shrink-0"
                        @click=${() => this.handlePromptClick(card.prompt)}
                      >
                        <div class="aspect-square h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#EBE4DC] flex items-center justify-center p-1">
                          <img src="${card.image}" alt="${card.label}" class="size-full object-contain" />
                        </div>
                        <div class="flex flex-col justify-center overflow-hidden">
                          <span class="text-xs font-semibold text-foreground-500">${card.label}</span>
                          <p class="line-clamp-2 text-xs font-medium text-foreground-800 leading-snug">${card.description}</p>
                        </div>
                      </div>
                    `
    )}
                </div>
              </div>
            </div>

            <!-- Floating Pill at bottom edge from shopping.lazy.js -->
            <div class="flex w-full justify-center -mt-6 relative z-10">
              <button
                type="button"
                class="inline-flex items-center gap-3 rounded-full bg-background-100 dark:bg-[#161B28] px-6 py-3 text-foreground-800 border border-black/10 dark:border-white/15 shadow-xl hover:scale-105 active:scale-98 transition-all cursor-pointer font-sans"
                @click=${() => this.handlePromptClick("Ideas for the funniest secret santa gifts")}
              >
                <div class="text-center text-sm md:text-base font-semibold font-ginto">
                  Ideas for the funniest secret santa gifts
                </div>
                <div class="flex size-7 items-center justify-center rounded-full bg-foreground-900 text-background-100">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="size-3.5">
                    <line x1="12" y1="19" x2="12" y2="5"></line>
                    <polyline points="5 12 12 5 19 12"></polyline>
                  </svg>
                </div>
              </button>
            </div>
          </div>

          <!-- Bottom Floating Composer: Shop with Copilot -->
          <div class="w-full max-w-chat mt-14 flex justify-center">
            <copilot-composer
              placeholder="Shop with Copilot"
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
    "copilot-shopping-view": CopilotShoppingView;
  }
}
