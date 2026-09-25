import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  renderPlusIcon,
  renderChevronDownIcon,
  renderSendIcon,
  renderWaveformIcon,
} from "./icons";

export interface SubmitPromptDetail {
  prompt: string;
  model: string;
}

@customElement("copilot-composer")
export class CopilotComposer extends LitElement {
  @property({ type: String }) value = "";
  @property({ type: String }) placeholder =
    "Message to omp, use @ to metion a file or / to start a command";
  @property({ type: String }) selectedModel = "Gemini 3.8";
  @property({ type: Boolean }) isWorking = false;
  @property({ type: Boolean }) compact = false;

  @state() private isModelMenuOpen = false;

  protected override createRenderRoot() {
    return this;
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.submit();
    }
  }

  private submit() {
    const text = this.value.trim();
    if (!text || this.isWorking) return;
    this.dispatchEvent(
      new CustomEvent<SubmitPromptDetail>("submit-prompt", {
        detail: { prompt: text, model: this.selectedModel },
        bubbles: true,
        composed: true,
      }),
    );
    this.value = "";
  }

  override render() {
    return html`
      <!-- Microsoft Copilot Exact 4-Tier Composer Hierarchy with Unified Width and Border Calculations -->
      <div class="relative max-h-full min-h-composer min-w-16 w-expanded-composer max-w-chat max-w-full rounded-5xl">
        <!-- 1. Background layer with shadow-tinted-xl and backdrop-blur -->
        <div
          class="relative flex flex-col overflow-hidden shadow-tinted-xl backdrop-blur-2xl backdrop-saturate-200 bg-accent-100/60 dark:bg-muted-200/50 w-full"
          style="border-radius: 32px;"
          data-testid="composer-background"
        >
          <!-- 2. Content container (same border-radius and full width matching composer-background) -->
          <div
            class="pointer-events-auto relative flex flex-col overflow-hidden contrast-more:border-2 w-full"
            style="border-radius: 32px;"
            data-testid="composer-content"
          >
            <!-- 3. Gradient frame with 6px (p-1.5) padding and matching 32px border -->
            <div
              class="relative max-h-full w-full bg-gradient-to-b p-1.5 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-white/100 dark:before:border-white/12 from-background-400/5 to-background-400/8 dark:from-background-200/65 dark:to-background-200/65"
              style="border-radius: 32px;"
            >
              <!-- 4. Inner card with 26px concentric radius (32px - 6px padding) and white/glass fill -->
              <div
                class="bg-white/95 dark:bg-background-100/45 backdrop-blur-xl relative flex flex-col overflow-hidden shadow-xs w-full"
                style="border-radius: 26px;"
              >
                <!-- Generating accent pulse line -->
                ${this.isWorking
        ? html`
                      <div
                        class="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-500 animate-pulse z-10"
                      ></div>
                    `
        : nothing
      }

                <!-- Textarea container -->
                <div class="pt-3 px-4 pb-0">
                  <textarea
                    rows="${this.compact ? "1" : "2"}"
                    placeholder="${this.placeholder}"
                    class="font-ligatures-none inline-block w-full resize-none overflow-y-hidden whitespace-pre-wrap bg-transparent align-top text-black outline-none placeholder:text-foreground-450 dark:text-white dark:placeholder:text-foreground-600/90 text-base-dense font-sans"
                    .value=${this.value}
                    @input=${(e: Event) => {
        this.value = (e.target as HTMLTextAreaElement).value;
      }}
                    @keydown=${(e: KeyboardEvent) => this.handleKeyDown(e)}
                  ></textarea>
                </div>

                <!-- Bottom Toolbar Row -->
                <div class="relative bottom-0 flex items-center justify-between pb-1.5 pe-2.5 ps-1.5">
                  <div class="flex h-11 items-center gap-2 ps-1">
                    <!-- Plus / Attachment Button with Microsoft Copilot classes -->
                    <button
                      type="button"
                      aria-label="Attach files, connect apps, or make something with Copilot."
                      class="relative flex items-center text-foreground-800 fill-foreground-800 active:text-foreground-600 active:fill-foreground-600 dark:active:text-foreground-650 dark:active:fill-foreground-650 bg-transparent safe-hover:bg-black/5 active:bg-black/3 dark:safe-hover:bg-black/30 dark:active:bg-black/20 text-sm justify-center min-h-9 min-w-9 rounded-2xl p-1.5 transition-colors"
                      @click=${() => this.dispatchEvent(new CustomEvent("attach-click", { bubbles: true, composed: true }))}
                    >
                      ${renderPlusIcon()}
                    </button>

                    <!-- Model Selector Pill: "Gemini 3.8 ⌄" with Microsoft Copilot classes -->
                    <div class="relative">
                      <button
                        type="button"
                        class="relative flex items-center text-foreground-800 fill-foreground-800 active:text-foreground-600 active:fill-foreground-600 dark:active:text-foreground-650 dark:active:fill-foreground-650 bg-transparent safe-hover:bg-black/5 active:bg-black/3 dark:safe-hover:bg-black/30 dark:active:bg-black/20 text-sm justify-center min-h-9 min-w-9 px-2.5 py-1 rounded-2xl gap-1 select-none font-medium border border-black/8 dark:border-white/10"
                        @click=${() => (this.isModelMenuOpen = !this.isModelMenuOpen)}
                      >
                        <span>${this.selectedModel}</span>
                        ${renderChevronDownIcon()}
                      </button>

                      <!-- Model Selection Dropdown -->
                      ${this.isModelMenuOpen
        ? html`
                            <div
                              class="absolute bottom-full mb-2 left-0 min-w-[160px] p-1.5 bg-white dark:bg-[#181c28] border border-black/10 dark:border-white/15 rounded-2xl shadow-2xl flex flex-col gap-0.5 z-50 text-xs font-medium"
                            >
                              <div
                                class="px-3 py-2 rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/8 transition-colors ${this.selectedModel === "Smart"
            ? "text-blue-600 dark:text-blue-400 font-semibold"
            : "text-foreground-700"
          }"
                                @click=${() => {
            this.selectedModel = "Smart";
            this.isModelMenuOpen = false;
          }}
                              >
                                Smart (Balanced)
                              </div>
                              <div
                                class="px-3 py-2 rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/8 transition-colors ${this.selectedModel === "Fast"
            ? "text-blue-600 dark:text-blue-400 font-semibold"
            : "text-foreground-700"
          }"
                                @click=${() => {
            this.selectedModel = "Fast";
            this.isModelMenuOpen = false;
          }}
                              >
                                Fast (Quick reply)
                              </div>
                              <div
                                class="px-3 py-2 rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/8 transition-colors ${this.selectedModel === "Thinking"
            ? "text-blue-600 dark:text-blue-400 font-semibold"
            : "text-foreground-700"
          }"
                                @click=${() => {
            this.selectedModel = "Thinking";
            this.isModelMenuOpen = false;
          }}
                              >
                                Deep Thinking
                              </div>
                            </div>
                          `
        : nothing
      }
                    </div>
                  </div>

                  <!-- Right Action Button: Send Arrow or Voice Dictation -->
                  <div class="flex items-center gap-2">
                    ${this.value.trim()
        ? html`
                          <button
                            type="button"
                            title="Send message"
                            class="relative flex items-center justify-center size-9 rounded-full bg-foreground-900 text-background-100 hover:opacity-90 active:scale-95 transition-all shadow-sm"
                            @click=${() => this.submit()}
                          >
                            ${renderSendIcon()}
                          </button>
                        `
        : html`
                          <button
                            type="button"
                            title="Voice input"
                            class="relative flex items-center text-foreground-800 fill-foreground-800 active:text-foreground-600 active:fill-foreground-600 dark:active:text-foreground-650 dark:active:fill-foreground-650 bg-transparent safe-hover:bg-black/5 active:bg-black/3 dark:safe-hover:bg-black/30 dark:active:bg-black/20 text-sm justify-center min-h-9 min-w-9 rounded-2xl p-1.5 transition-colors"
                          >
                            ${renderWaveformIcon()}
                          </button>
                        `
      }
                  </div>
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
    "copilot-composer": CopilotComposer;
  }
}
