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
      description: "Transform natural language prompts and reference photos into full 3D interactive models in real time.",
      image: "/static/copilotlabs/copilot-3d-cover-image-small.png",
      actionText: "Try now",
    },
    {
      id: "portraits",
      title: "Portraits",
      description: "Generate studio-quality personal portraits, avatar variations, and stylized editorial captures.",
      image: "/static/copilotlabs/portrait-cover-image-small--2.jpg",
      actionText: "Try now",
    },
    {
      id: "vision",
      title: "Copilot Vision",
      description: "Allow Copilot to understand, analyze, and reason about what you see on screen with low-latency multimodal reasoning.",
      image: "/static/copilotlabs/copilot-vision-cover-image-small.jpg",
      actionText: "Explore",
    },
    {
      id: "gaming",
      title: "Copilot for Gaming",
      description: "Real-time companion advice, walkthrough assistance, and tactical tips as you play your favorite titles.",
      image: "/static/copilotlabs/copilot-gaming-cover-image-small.jpg",
      actionText: "Explore",
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
      <div class="relative flex flex-col h-full w-full overflow-y-auto px-4 pt-14 pb-20">
        <div class="max-w-4xl mx-auto w-full flex flex-col gap-10">
          <!-- Page Header -->
          <div class="flex flex-col gap-2 text-center md:text-left select-none">
            <h1 class="text-3xl md:text-4xl font-bold tracking-tight text-foreground-900 font-ginto">
              Copilot Labs
            </h1>
            <p class="text-base text-foreground-600 font-sans">
              Discover experimental AI initiatives and test next-generation capabilities
            </p>
          </div>

          <!-- Featured Hero Card with Squircle-48-32 -->
          <div class="relative drop-shadow-md">
            <div
              class="copilot-squircle-card squircle-48-32 flex flex-col md:flex-row overflow-hidden transition-all duration-200"
            >
              <!-- Visual Artwork (Left) -->
              <div class="relative md:w-1/2 h-56 md:h-auto overflow-hidden bg-black/30">
                <img
                  src="${this.featuredInitiative.image}"
                  alt="${this.featuredInitiative.title}"
                  class="size-full object-cover transition-transform duration-500 hover:scale-105"
                  onerror="this.style.display='none'"
                />
                <div class="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-transparent to-black/20"></div>
              </div>

              <!-- Content Area (Right) -->
              <div class="p-6 md:p-8 md:w-1/2 flex flex-col justify-between gap-4">
                <div class="flex flex-col gap-2.5">
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                      ${this.featuredInitiative.badge}
                    </span>
                  </div>
                  <h2 class="copilot-card-title text-xl md:text-2xl font-bold font-ginto">
                    ${this.featuredInitiative.title}
                  </h2>
                  <p class="copilot-card-desc text-sm leading-relaxed font-sans">
                    ${this.featuredInitiative.description}
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    class="copilot-btn-pill h-9 px-5 rounded-full text-xs font-semibold tracking-wide transition-colors"
                    @click=${() => this.handleAction(this.featuredInitiative)}
                  >
                    ${this.featuredInitiative.actionText}
                  </button>
                </div>
              </div>

              <!-- Squircle-48-32 Stroke Overlay -->
              <div class="copilot-squircle-stroke squircle-stroke-48-32"></div>
            </div>
          </div>

          <!-- 2-Column Grid with Squircle-36-24 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            ${this.gridInitiatives.map(
      (item) => html`
                <div class="relative drop-shadow-sm hover:drop-shadow-md transition-all duration-200 hover:-translate-y-0.5">
                  <div
                    class="copilot-squircle-card squircle-36-24 flex flex-col overflow-hidden"
                  >
                    <!-- Card Image -->
                    <div class="relative h-48 w-full overflow-hidden bg-black/20">
                      <img
                        src="${item.image}"
                        alt="${item.title}"
                        class="size-full object-cover transition-transform duration-500 hover:scale-105"
                        loading="lazy"
                        onerror="this.style.display='none'"
                      />
                    </div>

                    <!-- Card Info -->
                    <div class="p-6 flex flex-col justify-between flex-1 gap-4">
                      <div class="flex flex-col gap-1.5">
                        <h3 class="copilot-card-title text-lg font-bold font-ginto">
                          ${item.title}
                        </h3>
                        <p class="copilot-card-desc text-xs leading-relaxed">
                          ${item.description}
                        </p>
                      </div>

                      <div>
                        <button
                          type="button"
                          class="copilot-btn-pill h-8 px-4 rounded-full text-xs font-semibold tracking-wide transition-colors"
                          @click=${() => this.handleAction(item)}
                        >
                          ${item.actionText}
                        </button>
                      </div>
                    </div>

                    <!-- Squircle-36-24 Stroke Overlay -->
                    <div class="copilot-squircle-stroke squircle-stroke-36-24"></div>
                  </div>
                </div>
              `
    )}
          </div>

          <!-- Bottom Community Callout with Squircle-28 -->
          <div class="relative drop-shadow-xs">
            <div class="copilot-squircle-card squircle-28 p-6 flex flex-col md:flex-row items-center justify-between gap-4 overflow-hidden">
              <div class="flex flex-col gap-1 text-center md:text-left">
                <h4 class="copilot-card-title text-base font-bold font-ginto">Play, discuss and build together!</h4>
                <p class="copilot-card-desc text-xs">Join our community discussions to shape the future of Copilot experimental features.</p>
              </div>
              <button
                type="button"
                class="h-9 px-5 rounded-full bg-foreground-900 text-background-100 text-xs font-semibold transition-colors shrink-0 shadow-sm hover:opacity-90"
                @click=${() => this.handleAction({ id: "community", title: "Labs Community", description: "", image: "", actionText: "" })}
              >
                Join Discussion
              </button>

              <!-- Squircle-28 Stroke Overlay -->
              <div class="copilot-squircle-stroke squircle-stroke-28"></div>
            </div>
          </div>
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
