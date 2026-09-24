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
  @property({ type: String }) placeholder = "Message Copilot";
  @property({ type: String }) selectedModel = "Smart";
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
      })
    );
    this.value = "";
  }

  override render() {
    return html`
      <!-- Microsoft Copilot Exact 3-Tier Composer Architecture -->
      <div
        class="copilot-composer-outer relative shadow-tinted-xl backdrop-blur-2xl backdrop-saturate-200 bg-accent-100/60 dark:bg-muted-200/50 w-full max-w-[720px] transition-all duration-300"
        style="border-radius: 32px;"
        data-testid="composer-background"
      >
        <div
          class="pointer-events-auto relative flex flex-col overflow-hidden"
          style="border-radius: 32px;"
          data-testid="composer-content"
        >
          <!-- Gradient border frame with 6px (p-1.5) padding -->
          <div
            class="relative max-h-full w-full bg-gradient-to-b p-1.5 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-white/80 dark:before:border-white/12 from-background-400/5 to-background-400/8 dark:from-background-200/65 dark:to-background-200/65"
            style="border-radius: 32px;"
          >
            <!-- Inner card with 26px concentric radius -->
            <div
              class="bg-white/95 dark:bg-[#181C26]/95 backdrop-blur-xl relative flex flex-col overflow-hidden border border-black/5 dark:border-white/5"
              style="border-radius: 26px;"
            >
              <!-- Generating progress bar -->
              ${this.isWorking
        ? html`
                    <div
                      class="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-500 animate-pulse z-10"
                    ></div>
                  `
        : nothing}

              <!-- Textarea container -->
              <div class="pt-3 px-4 pb-1">
                <textarea
                  rows="${this.compact ? "1" : "2"}"
                  placeholder="${this.placeholder}"
                  class="font-ligatures-none inline-block w-full resize-none overflow-y-hidden whitespace-pre-wrap bg-transparent align-top text-black outline-none placeholder:text-foreground-450 dark:text-white dark:placeholder:text-foreground-600/90 text-[15px] leading-relaxed font-sans"
                  .value=${this.value}
                  @input=${(e: Event) => {
        this.value = (e.target as HTMLTextAreaElement).value;
      }}
                  @keydown=${(e: KeyboardEvent) => this.handleKeyDown(e)}
                ></textarea>
              </div>

              <!-- Bottom Toolbar -->
              <div class="relative bottom-0 flex items-center justify-between pb-1.5 pe-2.5 ps-2">
                <div class="flex h-10 items-center gap-2">
                  <!-- Plus / Attachment Button -->
                  <button
                    type="button"
                    title="Add content"
                    class="size-8 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center text-foreground-800 transition-colors"
                    @click=${() => this.dispatchEvent(new CustomEvent("attach-click", { bubbles: true, composed: true }))}
                  >
                    ${renderPlusIcon()}
                  </button>

                  <!-- Model Selector Pill: "Smart ⌄" -->
                  <div class="relative">
                    <button
                      type="button"
                      class="h-7 px-3 rounded-full bg-[#F5E7DA] dark:bg-[#2C2723] hover:opacity-90 flex items-center gap-1.5 text-xs font-semibold text-[#3A342E] dark:text-[#EFE8DF] transition-opacity select-none border border-black/5 dark:border-white/5"
                      @click=${() => (this.isModelMenuOpen = !this.isModelMenuOpen)}
                    >
                      <span>${this.selectedModel}</span>
                      ${renderChevronDownIcon()}
                    </button>

                    <!-- Model Dropdown -->
                    ${this.isModelMenuOpen
        ? html`
                          <div
                            class="absolute bottom-full mb-2 left-0 min-w-[160px] p-1.5 bg-white dark:bg-[#181c28] border border-black/10 dark:border-white/15 rounded-2xl shadow-2xl flex flex-col gap-0.5 z-50 text-xs font-medium"
                          >
                            <div
                              class="px-3 py-2 rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/8 transition-colors ${this
            .selectedModel === "Smart"
            ? "text-blue-600 dark:text-blue-400 font-semibold"
            : "text-foreground-700"}"
                              @click=${() => {
            this.selectedModel = "Smart";
            this.isModelMenuOpen = false;
          }}
                            >
                              Smart (Balanced)
                            </div>
                            <div
                              class="px-3 py-2 rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/8 transition-colors ${this
            .selectedModel === "Fast"
            ? "text-blue-600 dark:text-blue-400 font-semibold"
            : "text-foreground-700"}"
                              @click=${() => {
            this.selectedModel = "Fast";
            this.isModelMenuOpen = false;
          }}
                            >
                              Fast (Quick reply)
                            </div>
                            <div
                              class="px-3 py-2 rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/8 transition-colors ${this
            .selectedModel === "Thinking"
            ? "text-blue-600 dark:text-blue-400 font-semibold"
            : "text-foreground-700"}"
                              @click=${() => {
            this.selectedModel = "Thinking";
            this.isModelMenuOpen = false;
          }}
                            >
                              Deep Thinking
                            </div>
                          </div>
                        `
        : nothing}
                  </div>
                </div>

                <!-- Right Action Button: Send Arrow or Voice Dictation -->
                <div class="flex items-center">
                  ${this.value.trim()
        ? html`
                        <button
                          type="button"
                          title="Send message"
                          class="size-8 rounded-full bg-[#1C1B1A] dark:bg-white text-white dark:text-[#1C1B1A] flex items-center justify-center active:scale-95 transition-all shadow-md"
                          @click=${() => this.submit()}
                        >
                          ${renderSendIcon()}
                        </button>
                      `
        : html`
                        <button
                          type="button"
                          title="Voice input"
                          class="size-8 rounded-full flex items-center justify-center text-foreground-600 hover:text-foreground-900 transition-colors"
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
    "copilot-composer": CopilotComposer;
  }
}
