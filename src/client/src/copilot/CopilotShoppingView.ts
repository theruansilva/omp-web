import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./CopilotComposer";

interface ProductItem {
  id: string;
  name: string;
  price: string;
  originalPrice: string;
  discount: string;
  category: string;
  rating: string;
  image: string;
  description: string;
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
      name: "Sony WH-1000XM5 Wireless Headphones",
      price: "$299.99",
      originalPrice: "$399.99",
      discount: "-25%",
      category: "Lowest price in 30 days",
      rating: "★ 4.8 (14.2k)",
      image: "/static/cmc/images/product-headphones.jpg",
      description: "Industry-leading noise canceling with Auto NC Optimizer, crystal clear hands-free calling, up to 30hr battery life.",
      prompt: "Find reviews, price history, and best deals for Sony WH-1000XM5 headphones.",
    },
    {
      id: "prod-2",
      name: 'LG UltraWide 34" Curved WQHD Monitor',
      price: "$379.99",
      originalPrice: "$549.99",
      discount: "-31%",
      category: "Price drop verified",
      rating: "★ 4.9 (8.5k)",
      image: "/static/cmc/images/product-monitor.jpg",
      description: "21:9 Curved UltraWide QHD display with HDR10, sRGB 99% color gamut, USB Type-C connectivity, AMD FreeSync.",
      prompt: 'Compare 34" curved ultrawide monitors for programming and productivity under $400.',
    },
    {
      id: "prod-3",
      name: "Ergonomic Mesh Executive Task Chair",
      price: "$279.00",
      originalPrice: "$399.00",
      discount: "-30%",
      category: "Trending deal",
      rating: "★ 4.7 (3.1k)",
      image: "/static/cmc/images/product-chair.jpg",
      description: "Dynamic lumbar support, 3D adjustable armrests, breathable elastomeric mesh, heavy-duty aluminum base.",
      prompt: "Show me ergonomic mesh task chair comparisons and user reviews.",
    },
    {
      id: "prod-4",
      name: "Smart Home Ambient Architecture Lamp",
      price: "$49.99",
      originalPrice: "$79.99",
      discount: "-38%",
      category: "Staff pick",
      rating: "★ 4.6 (1.9k)",
      image: "/static/cmc/images/product-lamp.jpg",
      description: "Stepless touch dimming, dual warm/cool temperature spectrum, integrated wireless charging pad and timer.",
      prompt: "Recommend modern architectural desk lamps with warm LEDs and phone charging.",
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
      <!-- Microsoft Copilot Exact Shopping View from templates/shopping.html -->
      <div class="scrollbar-stable t-custom-scrollbar relative flex size-full flex-col items-center overflow-y-auto overflow-x-hidden overscroll-contain">
        <div class="w-full max-w-labs px-4 sm:px-6 pt-16 pb-48 flex flex-col items-center mx-auto">
          <!-- Page Header -->
          <div class="flex flex-col gap-2 text-center md:text-left select-none w-full mb-8">
            <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground-800 font-ginto">
              Nice to see you, Guest. What’s new?
            </h1>
            <p class="text-sm sm:text-base text-foreground-600 font-sans">
              Discover curated products, price comparisons, and intelligent shopping advice.
            </p>
          </div>

          <!-- Product Recommendation Cards -->
          <div class="flex flex-col gap-4 w-full">
            <h2 class="text-xs font-bold uppercase tracking-wider text-foreground-500 font-ginto">
              Trending Product Guides
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
              ${this.products.map(
      (p) => html`
                  <div
                    class="relative flex flex-col overflow-hidden rounded-2xl bg-white/70 dark:bg-background-200/50 border border-black/5 dark:border-white/10 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer backdrop-blur-xl"
                    @click=${() => this.handleProductClick(p.prompt)}
                  >
                    <!-- Product Image with Discount Badge -->
                    <div class="relative h-48 w-full overflow-hidden bg-black/5">
                      <img
                        src="${p.image}"
                        alt="${p.name}"
                        class="size-full object-cover transition-transform duration-300 hover:scale-105"
                        loading="lazy"
                        onerror="this.style.display='none'"
                      />
                      <span class="absolute start-3 top-3 rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
                        ${p.discount}
                      </span>
                    </div>

                    <!-- Card Body -->
                    <div class="flex flex-1 flex-col p-4 justify-between">
                      <div>
                        <div class="flex items-center justify-between text-xs text-foreground-800/70 mb-1">
                          <span class="font-medium text-emerald-600 dark:text-emerald-400">
                            ${p.category}
                          </span>
                          <span class="opacity-80">
                            ${p.rating}
                          </span>
                        </div>
                        <h3 class="text-base font-semibold text-foreground-800 line-clamp-1 font-ginto">
                          ${p.name}
                        </h3>
                        <p class="mt-1 text-xs text-foreground-600 line-clamp-2 leading-relaxed">
                          ${p.description}
                        </p>
                      </div>

                      <div class="mt-4 flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/10">
                        <div class="flex items-baseline gap-2">
                          <span class="text-lg font-bold text-foreground-800">
                            ${p.price}
                          </span>
                          <span class="text-xs text-foreground-500 line-through">
                            ${p.originalPrice}
                          </span>
                        </div>
                        <span class="text-xs font-medium text-blue-600 hover:underline">
                          Compare →
                        </span>
                      </div>
                    </div>
                  </div>
                `
    )}
            </div>
          </div>
        </div>

        <!-- Sticky Bottom Composer Dock -->
        <div class="absolute bottom-0 inset-x-0 z-20 flex flex-col items-center px-4 pb-4 md:pb-6 pt-8 bg-gradient-to-t from-background-150 via-background-150/80 to-transparent pointer-events-none">
          <div class="w-full max-w-chat pointer-events-auto">
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
