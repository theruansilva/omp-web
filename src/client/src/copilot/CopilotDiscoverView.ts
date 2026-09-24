import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { renderPlusIcon, renderChevronDownIcon, renderWaveformIcon, renderSendIcon } from "./icons";

@customElement("copilot-discover-view")
export class CopilotDiscoverView extends LitElement {
  @property({ type: Boolean }) isWorking = false;
  @state() private composerValue = "";

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

  private submitComposer() {
    const text = this.composerValue.trim();
    if (!text || this.isWorking) return;
    this.handleCardClick(text);
    this.composerValue = "";
  }

  override render() {
    return html`
      <!-- Microsoft Copilot Exact Discover Page Architecture from Image 3 -->
      <div class="scrollbar-stable t-custom-scrollbar relative flex size-full flex-col items-center overflow-y-auto overflow-x-hidden overscroll-contain bg-[#10141E] text-white">
        <div class="w-full max-w-5xl px-4 sm:px-6 pt-14 pb-20 flex flex-col items-center mx-auto">
          <!-- Section Heading from Image 3 -->
          <h1
            class="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-8 text-center font-ginto select-none"
          >
            Trending in AI & Science
          </h1>

          <!-- 2 Cards Layout from Image 3 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
            <!-- Card 1 (Left): Large Card with Purple-Orange Gradient and Constellation Dots -->
            <div
              class="group relative flex flex-col overflow-hidden rounded-[32px] bg-[#161B28] border border-white/10 shadow-xl cursor-pointer hover:border-white/20 transition-all duration-200 hover:-translate-y-1"
              @click=${() =>
        this.handleCardClick(
          "Explain the major breakthroughs in deep reasoning models and autonomous agentic workflows."
        )}
            >
              <!-- Top Banner with authentic gradient & constellation lines -->
              <div
                class="relative h-60 w-full overflow-hidden"
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

              <!-- Bottom Content with Title -->
              <div class="p-6 flex flex-col justify-between flex-1">
                <h3 class="text-xl font-semibold text-white leading-snug font-ginto">
                  Breakthroughs in Deep Reasoning & Agentic Workflows
                </h3>
              </div>
            </div>

            <!-- Card 2 (Right): Horizontal Split Card with Emerald-Teal Gradient -->
            <div
              class="group relative flex flex-col sm:flex-row overflow-hidden rounded-[32px] bg-[#161B28] border border-white/10 shadow-xl cursor-pointer hover:border-white/20 transition-all duration-200 hover:-translate-y-1"
              @click=${() =>
        this.handleCardClick(
          "Describe the chemical and biological mechanisms of bioluminescence in marine life."
        )}
            >
              <!-- Left Artwork Banner -->
              <div
                class="relative h-44 sm:h-auto sm:w-1/2 overflow-hidden"
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

              <!-- Right Content with Title -->
              <div class="p-6 sm:w-1/2 flex items-center justify-center">
                <h3 class="text-lg font-semibold text-white leading-snug font-ginto">
                  Bioluminescence: How Organisms Produce Natural Light
                </h3>
              </div>
            </div>
          </div>

          <!-- Bottom Floating Composer: Dark navy container matching Image 3 -->
          <div class="w-full max-w-4xl mt-16 mb-4">
            <div class="copilot-dark-composer relative shadow-tinted-xl backdrop-blur-2xl w-full p-3 shadow-2xl">
              <!-- Input field -->
              <div class="px-2 pt-1 pb-1">
                <input
                  type="text"
                  placeholder="Message Copilot"
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

              <!-- Controls row with Quick response pill from Image 3 -->
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

                <!-- Right Action Button -->
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
    "copilot-discover-view": CopilotDiscoverView;
  }
}
