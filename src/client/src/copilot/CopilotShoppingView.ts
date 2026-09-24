import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./CopilotComposer";

interface ProductItem {
  id: string;
  name: string;
  price: string;
  category: string;
  image: string;
  prompt: string;
}

@customElement("copilot-shopping-view")
export class CopilotShoppingView extends LitElement {
  @property({ type: Boolean }) isWorking = false;

  protected override createRenderRoot() {
    return this;
  }

  private readonly products: ProductItem[] = [
    {
      id: "prod-1",
      name: "Ergonomic High-Back Task Chair",
      price: "$289.00",
      category: "Home Office",
      image: "/static/cmc/images/product-chair.jpg",
      prompt: "Find reviews, ergonomic comparisons, and best prices for high-back mesh task chairs.",
    },
    {
      id: "prod-2",
      name: "Wireless ANC Studio Headphones",
      price: "$199.99",
      category: "Audio",
      image: "/static/cmc/images/product-headphones.jpg",
      prompt: "Compare active noise-canceling studio headphones under $200 with 30+ hour battery life.",
    },
    {
      id: "prod-3",
      name: "Minimalist Articulated Desk Lamp",
      price: "$65.00",
      category: "Lighting",
      image: "/static/cmc/images/product-lamp.jpg",
      prompt: "Recommend warm LED minimalist desk lamps with dimmer touch controls and USB charging ports.",
    },
    {
      id: "prod-4",
      name: '34" Curved WQHD Ultrawide Monitor',
      price: "$449.00",
      category: "Displays",
      image: "/static/cmc/images/product-monitor.jpg",
      prompt: "What are the top rated 34-inch curved ultrawide monitors for productivity and programming?",
    },
  ];

  private handleProductClick(prompt: string) {
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
        <!-- Scrollable Area -->
        <div class="flex-1 overflow-y-auto px-4 pt-14 pb-36 max-w-4xl mx-auto w-full flex flex-col gap-8">
          <!-- Page Header -->
          <div class="flex flex-col gap-1 text-center md:text-left select-none">
            <h1 class="text-2xl md:text-3xl font-bold tracking-tight text-foreground-900 font-ginto">
              Nice to see you, Guest. What’s new?
            </h1>
            <p class="text-sm text-foreground-600 font-sans">
              Discover curated products, price comparisons, and intelligent shopping advice.
            </p>
          </div>

          <!-- Product Recommendation Cards -->
          <div class="flex flex-col gap-4">
            <h2 class="text-xs font-bold uppercase tracking-wider text-foreground-500 font-ginto">
              Trending Product Guides
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              ${this.products.map(
      (p) => html`
                  <div
                    class="copilot-card group relative flex flex-col overflow-hidden rounded-[22px] cursor-pointer shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                    @click=${() => this.handleProductClick(p.prompt)}
                  >
                    <!-- Product Image -->
                    <div class="relative aspect-square w-full overflow-hidden bg-black/10">
                      <img
                        src="${p.image}"
                        alt="${p.name}"
                        class="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        onerror="this.style.display='none'"
                      />
                    </div>

                    <!-- Info -->
                    <div class="p-3.5 flex flex-col justify-between flex-1 gap-2">
                      <div class="flex flex-col gap-1">
                        <span class="text-[10px] font-semibold text-foreground-500 uppercase tracking-wide">
                          ${p.category}
                        </span>
                        <h3 class="copilot-card-title text-xs font-semibold group-hover:text-blue-500 transition-colors line-clamp-2 leading-snug font-ginto">
                          ${p.name}
                        </h3>
                      </div>
                      <div class="flex items-center justify-between pt-1">
                        <span class="text-xs font-bold text-foreground-900">${p.price}</span>
                        <span class="text-[11px] font-medium text-blue-500 hover:underline">Compare →</span>
                      </div>
                    </div>
                  </div>
                `
    )}
            </div>
          </div>
        </div>

        <!-- Sticky Bottom Composer Dock -->
        <div class="absolute bottom-0 inset-x-0 z-20 flex flex-col items-center px-4 pb-4 pt-8 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/80 dark:via-background-dark/80 to-transparent pointer-events-none">
          <div class="w-full max-w-[700px] pointer-events-auto">
            <copilot-composer
              compact
              placeholder="Ask Copilot about any product, deal, or review..."
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
    "copilot-shopping-view": CopilotShoppingView;
  }
}
