import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { renderCopilotLogo, renderShareIcon, renderLoadingDots } from "./icons";
import "./CopilotComposer";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp?: string;
}

@customElement("copilot-chat-view")
export class CopilotChatView extends LitElement {
  @property({ type: Array }) messages: ChatMessage[] = [];
  @property({ type: Boolean }) isStreaming = false;

  protected override createRenderRoot() {
    return this;
  }

  protected override updated(changedProps: Map<string, unknown>) {
    if (changedProps.has("messages") || changedProps.has("isStreaming")) {
      this.scrollToBottom();
    }
  }

  private scrollToBottom() {
    const scrollContainer = this.querySelector<HTMLElement>("[data-scroll-container]");
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }

  override render() {
    return html`
      <div class="relative flex flex-col h-full w-full overflow-hidden">
        <!-- Top Action Bar (Share) -->
        <div class="absolute top-4 right-4 z-20 flex items-center gap-2">
          <button
            type="button"
            title="Share conversation"
            class="flex items-center justify-center size-8 rounded-full text-foreground-600 hover:text-foreground-900 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            ${renderShareIcon()}
          </button>
        </div>

        <!-- Scrollable Messages Area -->
        <div
          data-scroll-container
          class="flex-1 overflow-y-auto px-4 pt-14 pb-32 flex flex-col gap-6 w-full max-w-3xl mx-auto"
        >
          <!-- Date Divider -->
          <div class="flex items-center gap-3 my-2 opacity-60">
            <span class="text-xs font-medium text-foreground-500 font-ginto">Today</span>
            <div class="flex-1 h-px bg-black/10 dark:bg-white/10"></div>
          </div>

          <!-- Message Bubbles -->
          ${this.messages.map(
      (msg) => html`
              ${msg.role === "user"
          ? html`
                    <!-- User Message Bubble (Right aligned, squircle-24 peach/tan bubble) -->
                    <div class="flex justify-end">
                      <div class="squircle-24 max-w-[85%] md:max-w-[75%] px-5 py-3 bg-[#F5E7DA] dark:bg-[#2C2723] text-[#241F1B] dark:text-[#F3EDE6] text-[15px] leading-relaxed font-sans break-words drop-shadow-xs">
                        ${msg.text}
                      </div>
                    </div>
                  `
          : html`
                    <!-- Assistant Message (Left aligned, Copilot gradient logo + markdown body) -->
                    <div class="flex items-start gap-3 w-full">
                      <div class="size-7 rounded-full bg-white dark:bg-[#1E2330] border border-black/5 dark:border-white/10 flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                        ${renderCopilotLogo("size-4")}
                      </div>
                      <div class="flex-1 text-[15px] leading-relaxed text-foreground-900 font-sans break-words pt-0.5">
                        <div class="whitespace-pre-wrap">${msg.text}</div>
                      </div>
                    </div>
                  `}
            `
    )}

          <!-- Streaming / Loading Indicator -->
          ${this.isStreaming
        ? html`
                <div class="flex items-start gap-3 w-full">
                  <div class="size-7 rounded-full bg-white dark:bg-[#1E2330] border border-black/5 dark:border-white/10 flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                    ${renderCopilotLogo("size-4")}
                  </div>
                  <div class="flex items-center pt-1">
                    ${renderLoadingDots()}
                  </div>
                </div>
              `
        : nothing}
        </div>

        <!-- Sticky Bottom Composer Dock -->
        <div class="absolute bottom-0 inset-x-0 z-20 flex flex-col items-center px-4 pb-4 pt-8 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/80 dark:via-background-dark/80 to-transparent pointer-events-none">
          <div class="w-full max-w-[720px] pointer-events-auto">
            <copilot-composer
              compact
              .isWorking=${this.isStreaming}
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
    "copilot-chat-view": CopilotChatView;
  }
}
