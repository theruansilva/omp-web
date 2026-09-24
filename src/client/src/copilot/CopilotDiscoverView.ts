import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./CopilotComposer";
import type { SubmitPromptDetail } from "./CopilotComposer";

@customElement("copilot-discover-view")
export class CopilotDiscoverView extends LitElement {
  @property({ type: Boolean }) isWorking = false;

  protected override createRenderRoot() {
    return this;
  }

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
        <div class="w-full max-w-labs px-6 pt-16 pb-28 flex flex-col items-center mx-auto">
          <!-- Section Heading from Image 3 -->
          <h1
            class="text-center text-foreground-800 text-3xl font-semibold tracking-tight font-ginto mb-8 select-none"
          >
            Trending in AI & Science
          </h1>

          <!-- 2 Cards Layout from Image 3 with exact squircle-60 clip-path and hover scale -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
            <!-- Card 1 (Left): Large Card with Purple-Orange Gradient and Constellation Dots -->
            <div
              class="relative isolate bg-white/45 dark:bg-background-650/10 flex flex-col gap-3 p-3 text-foreground-800 transition-transform duration-200 ease-in hover:scale-[1.025] shadow-sm rounded-5xl cursor-pointer w-full border border-black/5 dark:border-white/10"
              style="clip-path: var(--clip-path-squircle-60);"
              @click=${() =>
        this.handleCardClick(
          "Explain the major breakthroughs in deep reasoning models and autonomous agentic workflows."
        )}
            >
              <!-- Top Banner with authentic gradient & constellation lines -->
              <div class="items-stretch overflow-hidden rounded-b-6xl rounded-t-7xl aspect-[97/74]">
                <div
                  class="relative size-full"
                  style="background: radial-gradient(circle at 10% 20%, #7E185D 0%, #B8255F 35%, #F4511E 80%, #FF8A00 100%);"
                >
                  <!-- Constellation dots -->
                  <svg class="absolute inset-0 size-full opacity-45" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="60" r="2.5" fill="white" />
                    <circle cx="80" cy="85" r="2.5" fill="white" />
                    <circle cx="110" cy="115" r="3" fill="white" />
                    <circle cx="140" cy="140" r="2.5" fill="white" />
                    <circle cx="170" cy="165" r="2" fill="white" />
                    <circle cx="210" cy="195" r="2.5" fill="white" />
                    <circle cx="125" cy="70" r="2" fill="white" />
                    <circle cx="260" cy="130" r="2.5" fill="white" />
                    <circle cx="320" cy="170" r="2" fill="white" />
                  </svg>
                </div>
              </div>

              <!-- Bottom Content with Title -->
              <div class="flex flex-col items-start p-4 flex-1 justify-center">
                <h3 class="text-xl font-semibold text-foreground-800 font-ginto leading-snug">
                  Breakthroughs in Deep Reasoning & Agentic Workflows
                </h3>
              </div>

              <!-- Squircle-60 Stroke Overlay -->
              <div
                class="before:border-black/10 dark:before:border-white/10 before:border-[20px] will-change-transform pointer-events-none absolute inset-0 before:absolute before:inset-0 before:rounded-inherit"
                style="clip-path: var(--clip-path-squircle-stroke-60);"
              ></div>
            </div>

            <!-- Card 2 (Right): Horizontal Split Card with Emerald-Teal Gradient -->
            <div
              class="relative isolate bg-white/45 dark:bg-background-650/10 flex flex-col sm:flex-row gap-3 p-3 text-foreground-800 transition-transform duration-200 ease-in hover:scale-[1.025] shadow-sm rounded-5xl cursor-pointer w-full border border-black/5 dark:border-white/10"
              style="clip-path: var(--clip-path-squircle-60);"
              @click=${() =>
        this.handleCardClick(
          "Describe the chemical and biological mechanisms of bioluminescence in marine life."
        )}
            >
              <!-- Left Artwork Banner -->
              <div class="items-stretch overflow-hidden rounded-b-6xl rounded-t-7xl aspect-[16/10] sm:w-1/2">
                <div
                  class="relative size-full"
                  style="background: radial-gradient(circle at 50% 20%, #032B28 0%, #09524A 40%, #00897B 80%, #26A69A 100%);"
                >
                  <!-- Starlight particle dots -->
                  <svg class="absolute inset-0 size-full opacity-40" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="30" cy="30" r="1.5" fill="white" />
                    <circle cx="80" cy="45" r="2" fill="white" />
                    <circle cx="120" cy="90" r="2.5" fill="white" />
                    <circle cx="60" cy="110" r="1.5" fill="white" />
                    <circle cx="140" cy="60" r="2" fill="white" />
                  </svg>
                </div>
              </div>

              <!-- Right Content with Title -->
              <div class="flex flex-col justify-center sm:w-1/2 p-4">
                <h3 class="text-lg font-semibold text-foreground-800 font-ginto leading-snug">
                  Bioluminescence: How Organisms Produce Natural Light
                </h3>
              </div>

              <!-- Squircle-60 Stroke Overlay -->
              <div
                class="before:border-black/10 dark:before:border-white/10 before:border-[20px] will-change-transform pointer-events-none absolute inset-0 before:absolute before:inset-0 before:rounded-inherit"
                style="clip-path: var(--clip-path-squircle-stroke-60);"
              ></div>
            </div>
          </div>

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
