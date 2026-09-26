import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { renderOmpLogo, renderLoadingDots, renderPaperclipIcon } from "./icons";
import type { PromptAttachment } from "../../../shared/apiTypes";
import "./OmpComposer";
import type { BtwState, ComposerProject } from "./OmpComposer";
import "./OmpAgentProcess";
import "./OmpMarkdown";
import type { AskDialogQuestion } from "../api";

export interface ToolItem {
  toolName: string;
  summary?: string;
  status?: "pending" | "running" | "completed" | "error";
  isError?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  thinking?: string;
  tools?: ToolItem[];
  timestamp?: string;
  hasAgentProcess?: boolean;
  attachments?: PromptAttachment[];
}

@customElement("omp-chat-view")
export class OmpChatView extends LitElement {
  @property({ type: Array }) messages: ChatMessage[] = [];
  @property({ type: Boolean }) isStreaming = false;
  @property({ type: Boolean }) isFirstPrompt = false;
  @property({ attribute: false }) projects: ComposerProject[] = [];
  @property({ type: String }) selectedProjectId = "proj-1";
  @property({ attribute: false }) btwState?: BtwState;
  @property({ attribute: false }) pendingAsk?: { requestId: string; questions: AskDialogQuestion[] };

  protected override createRenderRoot() {
    return this;
  }

  protected override updated(changedProps: Map<string, unknown>) {
    if (changedProps.has("messages") || changedProps.has("isStreaming") || changedProps.has("pendingAsk")) {
      this.scrollToBottom();
    }
  }

  private scrollToBottom() {
    requestAnimationFrame(() => {
      const scrollContainer = this.querySelector<HTMLElement>("[data-scroll-container]");
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    });
  }

  private renderThinkingBlock(thinking: string, isStreamingThinking = false) {
    const firstLine = thinking.trim().split("\n")[0]?.replace(/^[*#\s>-]+|[*#\s]+$/g, "").trim() || "";
    const summary = firstLine.length > 60 ? firstLine.slice(0, 58) + "…" : firstLine;

    return html`
      <details
        class="group/thinking my-2 rounded-2xl border border-black/8 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] overflow-hidden transition-all duration-200"
        ?open=${isStreamingThinking}
      >
        <summary class="flex items-center justify-between px-3.5 py-2 cursor-pointer select-none text-xs font-medium text-foreground-600 hover:text-foreground-900 list-none transition-colors">
          <div class="flex items-center gap-2 min-w-0">
            <svg class="size-3.5 text-amber-500 shrink-0 ${isStreamingThinking ? "animate-pulse" : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/>
              <path d="M9 21h6"/>
            </svg>
            <span class="font-semibold text-foreground-700 dark:text-foreground-300">
              ${isStreamingThinking ? "Pensando…" : "Raciocínio"}
            </span>
            ${summary ? html`<span class="text-foreground-400 truncate max-w-[280px] sm:max-w-md font-normal">${summary}</span>` : nothing}
          </div>
          <svg class="size-3.5 text-foreground-400 shrink-0 transition-transform duration-200 group-open/thinking:rotate-180" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </summary>
        <div class="px-3.5 pb-3 pt-1 text-xs text-foreground-600 dark:text-foreground-400 whitespace-pre-wrap font-mono leading-relaxed border-t border-black/5 dark:border-white/5 select-text max-h-96 overflow-y-auto">
          ${thinking}
        </div>
      </details>
    `;
  }

  private renderToolsBlock(tools: ToolItem[]) {
    return html`
      <div class="flex flex-wrap items-center gap-1.5 my-2">
        ${tools.map(
      (t) => html`
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-mono border border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] text-foreground-600">
              <span class="size-1.5 rounded-full ${t.isError ? "bg-red-500" : t.status === "running" ? "bg-amber-500 animate-ping" : "bg-emerald-500"}"></span>
              <span class="font-semibold text-foreground-800 dark:text-foreground-200">${t.toolName}</span>
              ${t.summary ? html`<span class="opacity-70 truncate max-w-[200px]">${t.summary}</span>` : nothing}
            </span>
          `,
    )}
      </div>
    `;
  }

  override render() {
    return html`
      <!-- OMP Web Exact Chat Page Structure -->
      <div class="relative flex flex-col h-full w-full overflow-hidden">
        <!-- Scrollable Messages Area matching original @container/chat -->
        <div
          data-scroll-container
          class="@container/chat flex-1 overflow-y-auto overflow-x-hidden scrollbar-stable flex flex-col items-center w-full pt-14 text-foreground-800"
        >
          <!-- Conversation wrapper matching original <motion.div data-content="conversation"> -->
          <div
            data-content="conversation"
            data-copy="false"
            class="grow flex flex-col w-full max-w-chat px-4 sm:px-6"
          >
            <!-- Date Divider with OMP Web classes -->
            <div class="flex items-center gap-3 my-2 opacity-70">
              <span class="text-xs font-semibold text-foreground-800 font-ginto" data-testid="date-divider">Today</span>
              <div class="flex-1 h-px bg-black/10 dark:bg-white/10"></div>
            </div>

            <!-- Message Thread with authentic space-y-8 and entrance transition -->
            <div class="inline-block w-full space-y-8 pt-3 ${this.isFirstPrompt ? "animate-thread-fade-in" : ""}">
              ${this.messages.map(
      (msg) => html`
                  ${msg.role === "user"
          ? html`
                        <!-- User Message Article -->
                        <div class="group/user-message space-y-1" role="article">
                          <div class="flex w-full flex-col gap-1">
                            <div class="flex gap-2 justify-end">
                              <div class="relative z-10 flex opacity-0 transition-opacity duration-200 ease-in-out group-hover/user-message:opacity-100 items-center">
                                <button
                                  aria-label="Copy message"
                                  type="button"
                                  class="size-8 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center text-foreground-800 transition-colors cursor-pointer"
                                  @click=${() => navigator.clipboard?.writeText(msg.text)}
                                >
                                  <svg class="size-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M8 2C6.89543 2 6 2.89543 6 4V14C6 15.1046 6.89543 16 8 16H14C15.1046 16 16 15.1046 16 14V4C16 2.89543 15.1046 2 14 2H8ZM7 4C7 3.44772 7.44772 3 8 3H14C14.5523 3 15 3.44772 15 4V14C15 14.5523 14.5523 15 14 15H8C7.44772 15 7 14.5523 7 14V4ZM4 6.00001C4 5.25973 4.4022 4.61339 5 4.26758V14.5C5 15.8807 6.11929 17 7.5 17H12.7324C12.3866 17.5978 11.7403 18 11 18H4C2.89543 18 2 17.1046 2 16V8.00001C2 6.89544 2.89543 6.00001 4 6.00001Z"></path>
                                  </svg>
                                </button>
                              </div>

                              <div class="flex flex-col gap-2 items-end">
                                ${msg.attachments && msg.attachments.length > 0
                                  ? html`
                                    <div class="flex flex-wrap gap-2 justify-end">
                                      ${msg.attachments.map((att) =>
                                        att.kind === "image"
                                          ? html`
                                            <div class="overflow-hidden rounded-2xl max-w-xs max-h-60 border border-black/10 dark:border-white/10 shadow-xs">
                                              <img
                                                src="data:${att.mimeType};base64,${att.data}"
                                                alt="${att.name || "Imagem anexada"}"
                                                class="size-full object-contain block"
                                              />
                                            </div>
                                          `
                                          : html`
                                            <div class="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-xs text-foreground-800">
                                              ${renderPaperclipIcon("size-3.5")}
                                              <span>${att.name || "Arquivo anexado"}</span>
                                            </div>
                                          `
                                      )}
                                    </div>
                                  `
                                  : nothing}
                                ${msg.text
                                  ? html`<div class="font-ligatures-none relative h-fit max-w-user-text-message whitespace-pre-wrap break-words px-4 py-2.5 squircle-16 bg-accent-250/60 dark:bg-accent-200 text-base self-end text-foreground-900 shadow-xs select-text font-sans" data-content="user-message">${msg.text}</div>`
                                  : nothing}
                              </div>
                            </div>
                          </div>
                        </div>
                      `
          : html`
                        <!-- Assistant Message with OMP gradient logo -->
                        <div class="flex flex-col w-full space-y-2">
                          <div class="flex items-start gap-3 w-full">
                            <div class="size-8 rounded-full omp-surface-avatar flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                              ${renderOmpLogo("size-5")}
                            </div>
                            <div class="flex-1 flex flex-col min-w-0 pt-0.5 select-text">
                              ${msg.thinking ? this.renderThinkingBlock(msg.thinking, !msg.text && this.isStreaming) : nothing}
                              ${msg.tools && msg.tools.length > 0 ? this.renderToolsBlock(msg.tools) : nothing}
                              ${msg.text ? html`
                                <div class="text-[15px] leading-relaxed text-foreground-900 font-sans break-words pt-1">
                                  <omp-markdown .text=${msg.text}></omp-markdown>
                                </div>
                              ` : nothing}
                            </div>
                          </div>
                          ${msg.hasAgentProcess === true
              ? html`<omp-agent-process .autoAnimate=${false}></omp-agent-process>`
              : nothing}
                        </div>
                      `}
                `,
    )}

              <!-- Streaming / Loading Indicator with bouncing animated dots -->
              ${this.isStreaming && (!this.messages.length || this.messages[this.messages.length - 1].role === "user" || (this.messages[this.messages.length - 1].role === "assistant" && !this.messages[this.messages.length - 1].text && !this.messages[this.messages.length - 1].thinking))
        ? html`
                    <div class="flex items-start gap-3 w-full">
                      <div class="size-8 rounded-full omp-surface-avatar flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                        ${renderOmpLogo("size-5")}
                      </div>
                      <div class="flex items-center pt-2">
                        ${renderLoadingDots()}
                      </div>
                    </div>
                  `
        : nothing}

              <!-- Bottom spacer so composer doesn't cover last message with bottom margin -->
              <div class="h-36 sm:h-44 shrink-0 pointer-events-none" aria-hidden="true"></div>
            </div>
          </div>
        </div>

        <!-- Sticky Bottom Composer Dock with Safe-Area Inset Support and proper bottom margin -->
        <div class="absolute bottom-0 inset-x-0 z-20 flex flex-col items-center px-4 pb-4 sm:pb-6 pb-[max(calc(env(safe-area-inset-bottom)+1rem),1.5rem)] pt-8 bg-gradient-to-t from-background-150 via-background-150/80 to-transparent pointer-events-none">
          <div class="w-full max-w-chat pointer-events-auto ${this.isFirstPrompt ? "animate-composer-dock" : ""}">
            <omp-composer
              compact
              .isWorking=${this.isStreaming}
              .projects=${this.projects}
              .selectedProjectId=${this.selectedProjectId}
              .btwState=${this.btwState}
              .pendingAsk=${this.pendingAsk}
              @submit-ask=${(e: CustomEvent) => {
        this.dispatchEvent(new CustomEvent("submit-ask", { detail: e.detail, bubbles: true, composed: true }));
      }}
              @cancel-ask=${(e: CustomEvent) => {
        this.dispatchEvent(new CustomEvent("cancel-ask", { detail: e.detail, bubbles: true, composed: true }));
      }}
              @project-select=${(e: CustomEvent<{ projectId: string }>) => {
        this.selectedProjectId = e.detail.projectId;
        this.dispatchEvent(
          new CustomEvent("project-select", {
            detail: e.detail,
            bubbles: true,
            composed: true,
          }),
        );
      }}
              @submit-btw=${(e: CustomEvent) => {
        this.dispatchEvent(new CustomEvent("submit-btw", { detail: e.detail, bubbles: true, composed: true }));
      }}
              @branch-btw=${(e: CustomEvent) => {
        this.dispatchEvent(new CustomEvent("branch-btw", { detail: e.detail, bubbles: true, composed: true }));
      }}
              @close-btw=${() => {
        this.dispatchEvent(new CustomEvent("close-btw", { bubbles: true, composed: true }));
      }}
              @submit-prompt=${(e: CustomEvent) => {
        this.dispatchEvent(new CustomEvent("submit-prompt", { detail: e.detail, bubbles: true, composed: true }));
      }}
            ></omp-composer>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "omp-chat-view": OmpChatView;
  }
}
