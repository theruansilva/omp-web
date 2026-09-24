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
      <!-- Microsoft Copilot Exact Chat Page Structure -->
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
          class="flex-1 overflow-y-auto px-4 pt-14 pb-36 flex flex-col gap-6 w-full max-w-chat mx-auto"
        >
          <!-- Date Divider with Microsoft Copilot classes -->
          <div class="flex items-center gap-3 my-2 opacity-70">
            <span class="text-xs font-semibold text-foreground-800 font-ginto" data-testid="date-divider">Today</span>
            <div class="flex-1 h-px bg-black/10 dark:bg-white/10"></div>
          </div>

          <!-- Message Thread -->
          ${this.messages.map(
      (msg) => html`
              ${msg.role === "user"
          ? html`
                    <!-- User Message: squircle-16 + hover copy button -->
                    <div class="flex gap-2 justify-end group/user-message">
                      <div class="relative z-10 flex opacity-0 transition-opacity duration-200 ease-in-out group-hover/user-message:opacity-100 items-center">
                        <button
                          aria-label="Copy message"
                          type="button"
                          class="size-8 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center text-foreground-800 transition-colors"
                          @click=${() => navigator.clipboard?.writeText(msg.text)}
                        >
                          <svg class="size-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8 2C6.89543 2 6 2.89543 6 4V14C6 15.1046 6.89543 16 8 16H14C15.1046 16 16 15.1046 16 14V4C16 2.89543 15.1046 2 14 2H8ZM7 4C7 3.44772 7.44772 3 8 3H14C14.5523 3 15 3.44772 15 4V14C15 14.5523 14.5523 15 14 15H8C7.44772 15 7 14.5523 7 14V4ZM4 6.00001C4 5.25973 4.4022 4.61339 5 4.26758V14.5C5 15.8807 6.11929 17 7.5 17H12.7324C12.3866 17.5978 11.7403 18 11 18H4C2.89543 18 2 17.1046 2 16V8.00001C2 6.89544 2.89543 6.00001 4 6.00001Z"></path>
                          </svg>
                        </button>
                      </div>

                      <div
                        class="font-ligatures-none relative h-fit max-w-user-text-message whitespace-pre-wrap break-words px-4 py-2.5 squircle-16 bg-accent-250/60 dark:bg-accent-200 text-base self-end text-foreground-900 shadow-xs select-text font-sans"
                        data-content="user-message"
                      >
                        ${msg.text}
                      </div>
                    </div>
                  `
          : html`
                    <!-- Assistant Message with Copilot gradient logo -->
                    <div class="flex items-start gap-3 w-full">
                      <div class="size-8 rounded-full bg-white dark:bg-[#1E2330] border border-black/5 dark:border-white/10 flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                        ${renderCopilotLogo("size-5")}
                      </div>
                      <div class="flex-1 text-[15px] leading-relaxed text-foreground-900 font-sans break-words pt-1 select-text">
                        <div class="whitespace-pre-wrap">${msg.text}</div>
                      </div>
                    </div>
                  `}
            `
    )}

          <!-- Streaming / Loading Indicator with bouncing animated dots -->
          ${this.isStreaming
        ? html`
                <div class="flex items-start gap-3 w-full">
                  <div class="size-8 rounded-full bg-white dark:bg-[#1E2330] border border-black/5 dark:border-white/10 flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                    ${renderCopilotLogo("size-5")}
                  </div>
                  <div class="flex items-center pt-2">
                    ${renderLoadingDots()}
                  </div>
                </div>
              `
        : nothing}
        </div>

        <!-- Sticky Bottom Composer Dock -->
        <div class="absolute bottom-0 inset-x-0 z-20 flex flex-col items-center px-4 pb-4 md:pb-6 pt-8 bg-gradient-to-t from-background-150 via-background-150/80 to-transparent pointer-events-none">
          <div class="w-full max-w-chat pointer-events-auto">
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
