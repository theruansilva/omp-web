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
      <div
        class="relative w-full max-w-[700px] transition-all duration-300"
        style="filter: drop-shadow(0 16px 36px rgba(0, 0, 0, 0.15)) drop-shadow(0 2px 6px rgba(0, 0, 0, 0.08));"
      >
        <!-- Border container with Squircle 28 clip path -->
        <div
          class="p-[1px] rounded-[28px] transition-colors duration-200"
          style="clip-path: var(--clip-path-squircle-28, none); background: rgba(120, 120, 120, 0.2);"
        >
          <!-- Inner card container with dark/light background -->
          <div
            class="relative flex flex-col bg-white/95 dark:bg-[#151822]/95 backdrop-blur-2xl rounded-[27px]"
            style="clip-path: var(--clip-path-squircle-28, none);"
          >
            <!-- Progress accent bar when generating -->
            ${this.isWorking
        ? html`
                  <div
                    class="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-500 animate-pulse z-10"
                  ></div>
                `
        : nothing}

            <!-- Text Input Area -->
            <div class="pt-3.5 px-5 pb-1">
              <textarea
                rows="${this.compact ? "1" : "2"}"
                placeholder="${this.placeholder}"
                class="w-full resize-none bg-transparent outline-none text-[15px] leading-relaxed text-foreground-900 placeholder:text-foreground-500/80 font-sans"
                .value=${this.value}
                @input=${(e: Event) => {
        this.value = (e.target as HTMLTextAreaElement).value;
      }}
                @keydown=${(e: KeyboardEvent) => this.handleKeyDown(e)}
              ></textarea>
            </div>

            <!-- Bottom Toolbar Row -->
            <div class="flex items-center justify-between px-3.5 pb-2.5 pt-0.5">
              <div class="flex items-center gap-2">
                <!-- Add Content / Attachment Button -->
                <button
                  type="button"
                  title="Add content"
                  class="size-8 rounded-full bg-black/5 dark:bg-white/6 hover:bg-black/10 dark:hover:bg-white/12 border border-black/8 dark:border-white/10 flex items-center justify-center text-foreground-800 transition-colors"
                  @click=${() => this.dispatchEvent(new CustomEvent("attach-click", { bubbles: true, composed: true }))}
                >
                  ${renderPlusIcon()}
                </button>

                <!-- Model Selector Pill: "Smart ⌄" -->
                <div class="relative">
                  <button
                    type="button"
                    class="h-7 px-2.5 rounded-full bg-[#F5E7DA] dark:bg-[#2C2723] hover:opacity-90 flex items-center gap-1.5 text-xs font-semibold text-[#3A342E] dark:text-[#EFE8DF] transition-opacity select-none border border-black/5 dark:border-white/5"
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
                        class="size-8 rounded-full bg-foreground-900 hover:bg-foreground-800 text-background-light dark:text-background-dark flex items-center justify-center active:scale-95 transition-all shadow-md"
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "copilot-composer": CopilotComposer;
  }
}
