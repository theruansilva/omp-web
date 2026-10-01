import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { renderOmpLogo, renderLoadingDots, renderPaperclipIcon, renderBranchIcon } from "./icons";
import type { PromptAttachment, PlanModeStatus } from "../../../shared/apiTypes";
import "./OmpComposer";
import type { BtwState, ComposerProject, PendingCommandDialog } from "./OmpComposer";
import type { ArtifactData } from "./OmpArtifactPanel";
import "./OmpAgentProcess";
import "./OmpMarkdown";
import type { AskDialogQuestion } from "../api";
import { isNearScrollBottom } from "../chatScrollPosition";

export interface ToolItem {
  toolName: string;
  summary?: string;
  target?: string;
  diffStats?: { added: number; removed: number };
  status?: "pending" | "running" | "completed" | "error";
  isError?: boolean;
  args?: unknown;
  resultText?: string;
  errorText?: string;
  diff?: string;
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
  rawIndex?: number;
  entryId?: string;
}

@customElement("omp-chat-view")
export class OmpChatView extends LitElement {
  @property({ type: Array }) messages: ChatMessage[] = [];
  @property({ type: Boolean }) isStreaming = false;
  @property({ type: Boolean }) isFirstPrompt = false;
  @property({ attribute: false }) projects: ComposerProject[] = [];
  @property({ type: String }) selectedProjectId = "proj-1";
  @property({ type: String }) selectedModel = "Default";
  @property({ type: String }) selectedProvider = "";
  @property({ attribute: false }) btwState?: BtwState;
  @property({ attribute: false }) pendingAsk?: { requestId: string; questions: AskDialogQuestion[] };
  @property({ attribute: false }) pendingCommand?: PendingCommandDialog;
  @property({ attribute: false }) planMode?: PlanModeStatus;
  @property({ attribute: false }) extensionStatuses?: Record<string, string>;
  @property({ attribute: false }) artifact?: ArtifactData;
  @property({ type: String }) progressStyle: "minimal" | "steps" = "steps";
  @property({ type: Boolean }) showThinking = true;

  @state() private pinnedToBottom = true;
  @state() private expandedToolKey: string | null = null;
  @state() private copiedMessageId: string | null = null;

  private manuallyOpenedThinkingMap = new Set<string>();
  private lastScrollTop = 0;
  private lastClientHeight = 0;
  private scrollToBottomFrame?: number;

  protected override createRenderRoot() {
    return this;
  }

  protected override updated(changedProps: Map<string, unknown>) {
    // If pendingAsk just arrived, jump to bottom
    if ((changedProps.has("pendingAsk") && this.pendingAsk !== undefined) || (changedProps.has("pendingCommand") && this.pendingCommand !== undefined)) {
      this.pinnedToBottom = true;
      this.scrollToBottom(true);
      return;
    }

    // If user just sent a message (last message is user), pin to bottom
    const lastMsg = this.messages[this.messages.length - 1];
    if (changedProps.has("messages") && lastMsg?.role === "user") {
      this.pinnedToBottom = true;
      this.scrollToBottom(true);
      return;
    }

    // During streaming or new messages, only scroll if pinnedToBottom is true!
    if ((changedProps.has("messages") || changedProps.has("isStreaming")) && this.pinnedToBottom) {
      this.scrollToBottom(false);
    }
  }

  private onScroll(e: Event) {
    const container = e.currentTarget as HTMLElement;
    if (!container) return;

    const scrollingUp = container.scrollTop < this.lastScrollTop;
    const nearBottom = isNearScrollBottom(container, 80);

    if (scrollingUp) {
      this.pinnedToBottom = false;
    } else if (nearBottom) {
      this.pinnedToBottom = true;
    }

    this.lastScrollTop = container.scrollTop;
    this.lastClientHeight = container.clientHeight;
  }

  private scrollToBottom(force = false) {
    if (this.scrollToBottomFrame !== undefined) return;
    this.scrollToBottomFrame = requestAnimationFrame(() => {
      this.scrollToBottomFrame = undefined;
      const scrollContainer = this.querySelector<HTMLElement>("[data-scroll-container]");
      if (scrollContainer) {
        if (force || this.pinnedToBottom) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
          this.lastScrollTop = scrollContainer.scrollTop;
          this.lastClientHeight = scrollContainer.clientHeight;
        }
      }
    });
  }

  private jumpToBottom() {
    this.pinnedToBottom = true;
    const scrollContainer = this.querySelector<HTMLElement>("[data-scroll-container]");
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: "smooth" });
    }
    this.requestUpdate();
  }

  private handleRevertTurn(message: ChatMessage, index: number): void {
    this.dispatchEvent(
      new CustomEvent("revert-turn", {
        detail: { message, index },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleCopyText(text: string, id: string) {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    this.copiedMessageId = id;
    this.requestUpdate();
    setTimeout(() => {
      if (this.copiedMessageId === id) {
        this.copiedMessageId = null;
        this.requestUpdate();
      }
    }, 2000);
  }

  private toggleThinking(messageId: string) {
    if (this.manuallyOpenedThinkingMap.has(messageId)) {
      this.manuallyOpenedThinkingMap.delete(messageId);
    } else {
      this.manuallyOpenedThinkingMap.add(messageId);
    }
    this.requestUpdate();
  }

  private isThinkingOpen(messageId: string): boolean {
    return this.manuallyOpenedThinkingMap.has(messageId);
  }

  private toggleToolExpand(key: string) {
    this.expandedToolKey = this.expandedToolKey === key ? null : key;
    this.requestUpdate();
  }

  private renderThinkingBlock(thinking: string, messageId: string, isLastAssistant: boolean) {
    const firstLine = thinking.trim().split("\n")[0]?.replace(/^[*#\s>-]+|[*#\s]+$/g, "").trim() || "";
    const summary = firstLine.length > 60 ? firstLine.slice(0, 58) + "…" : firstLine;
    const isOpen = this.isThinkingOpen(messageId);
    const isStreamingThinking = isLastAssistant && this.isStreaming && !this.messages[this.messages.length - 1]?.text;

    return html`
      <details
        class="group/thinking my-2 rounded-2xl border border-black/8 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] overflow-hidden transition-all duration-200 w-full"
        ?open=${isOpen}
      >
        <summary
          class="flex items-center justify-between px-3.5 py-2 cursor-pointer select-none text-xs font-medium text-foreground-600 hover:text-foreground-900 dark:hover:text-foreground-200 list-none transition-colors"
          @click=${(e: Event) => {
            e.preventDefault();
            this.toggleThinking(messageId);
          }}
        >
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
          <svg class="size-3.5 text-foreground-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </summary>
        ${isOpen ? html`
          <div class="px-3.5 pb-3 pt-2 text-xs text-foreground-600 dark:text-foreground-400 leading-relaxed border-t border-black/5 dark:border-white/5 select-text max-h-96 overflow-y-auto">
            <omp-markdown .text=${thinking}></omp-markdown>
          </div>
        ` : nothing}
      </details>
    `;
  }

  private renderFormattedDiff(diff: string) {
    const lines = diff.split("\n");
    return lines.map((line) => {
      if (line.startsWith("+")) {
        return html`<span class="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 block px-1 rounded-xs">${line}</span>`;
      }
      if (line.startsWith("-")) {
        return html`<span class="text-red-600 dark:text-red-400 bg-red-500/10 block px-1 rounded-xs">${line}</span>`;
      }
      return html`<span class="opacity-70 block px-1">${line}</span>`;
    });
  }

  private renderToolsMinimal(tools: ToolItem[], messageId: string) {
    return html`
      <div class="flex flex-wrap items-center gap-1.5 my-2 w-full">
        ${tools.map((t, idx) => {
          const key = `${messageId}-tool-${idx}`;
          const isExpanded = this.expandedToolKey === key;
          const hasDetails = Boolean(t.diff || t.errorText || t.resultText || t.args);

          return html`
            <div class="inline-flex flex-col">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-mono border border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] text-foreground-600 hover:bg-black/5 dark:hover:bg-white/8 transition-colors ${hasDetails ? "cursor-pointer" : ""}"
                @click=${() => hasDetails && this.toggleToolExpand(key)}
                title=${hasDetails ? "Clique para inspecionar saída e detalhes" : ""}
              >
                <span class="size-1.5 rounded-full ${t.isError ? "bg-red-500" : t.status === "running" ? "bg-amber-500 animate-ping" : "bg-emerald-500"}"></span>
                <span class="font-semibold text-foreground-800 dark:text-foreground-200">${t.toolName}</span>
                ${t.target || t.summary ? html`<span class="opacity-70 truncate max-w-[200px]">${t.target || t.summary}</span>` : nothing}
                ${t.diffStats ? html`<span class="text-[10px] font-semibold"><span class="text-emerald-500">+${t.diffStats.added}</span> <span class="text-red-500">-${t.diffStats.removed}</span></span>` : nothing}
                ${hasDetails ? html`
                  <svg class="size-3 text-foreground-400 transition-transform ${isExpanded ? "rotate-180" : ""}" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
                  </svg>
                ` : nothing}
              </button>
              ${isExpanded ? html`
                <div class="mt-1.5 p-2 rounded-xl border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] text-xs space-y-1.5 w-full max-w-full">
                  ${t.args ? html`
                    <div>
                      <span class="text-[10px] uppercase font-semibold text-foreground-400 tracking-wider font-sans block mb-0.5">Parâmetros</span>
                      <pre class="font-mono text-[11px] whitespace-pre-wrap break-all bg-black/5 dark:bg-white/5 p-1.5 rounded-lg text-foreground-700 dark:text-foreground-300">${typeof t.args === "string" ? t.args : JSON.stringify(t.args, null, 2)}</pre>
                    </div>
                  ` : nothing}
                  ${t.errorText ? html`
                    <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-red-600 dark:text-red-400">
                      <span class="text-[10px] uppercase font-semibold tracking-wider font-sans block mb-0.5">Erro</span>
                      <pre class="font-mono text-[11px] whitespace-pre-wrap break-all">${t.errorText}</pre>
                    </div>
                  ` : nothing}
                  ${t.diff ? html`
                    <div class="bg-black/5 dark:bg-white/5 rounded-lg p-2 overflow-x-auto">
                      <span class="text-[10px] uppercase font-semibold text-foreground-400 tracking-wider font-sans block mb-1">Diff</span>
                      <pre class="font-mono text-[11px] leading-tight">${this.renderFormattedDiff(t.diff)}</pre>
                    </div>
                  ` : nothing}
                  ${t.resultText && !t.diff && !t.errorText ? html`
                    <div class="bg-black/5 dark:bg-white/5 rounded-lg p-2 overflow-x-auto max-h-48">
                      <span class="text-[10px] uppercase font-semibold text-foreground-400 tracking-wider font-sans block mb-0.5">Saída</span>
                      <pre class="font-mono text-[11px] whitespace-pre-wrap break-all text-foreground-600 dark:text-foreground-400">${t.resultText}</pre>
                    </div>
                  ` : nothing}
                </div>
              ` : nothing}
            </div>
          `;
        })}
        <button
          type="button"
          class="text-[10px] text-foreground-400 hover:text-foreground-700 dark:hover:text-foreground-200 transition-colors ml-1 cursor-pointer font-sans"
          title="Mudar visualização para etapas"
          @click=${() => this.toggleProgressStyle()}
        >
          Ver etapas
        </button>
      </div>
    `;
  }

  private renderToolsSteps(tools: ToolItem[], messageId: string) {
    const hasRunning = tools.some((t) => t.status === "running" || t.status === "pending");
    return html`
      <div class="my-2.5 rounded-2xl border border-black/8 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] p-3 text-xs w-full">
        <div class="flex items-center justify-between pb-2 mb-2 border-b border-black/5 dark:border-white/5 text-[11px] font-medium text-foreground-500">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-foreground-700 dark:text-foreground-300 font-sans">Etapas do Agente</span>
            <span class="px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 font-mono text-[10px]">${tools.length}</span>
            ${hasRunning ? html`<span class="inline-flex items-center gap-1 text-amber-500 font-medium font-sans"><span class="size-1.5 rounded-full bg-amber-500 animate-ping"></span>Executando</span>` : nothing}
          </div>
          <button
            type="button"
            class="text-[10px] text-foreground-400 hover:text-foreground-700 dark:hover:text-foreground-200 transition-colors cursor-pointer font-sans"
            title="Mudar visualização para minimalista"
            @click=${() => this.toggleProgressStyle()}
          >
            Ver pílulas
          </button>
        </div>
        <div class="relative pl-3.5 space-y-2.5 before:absolute before:left-1 before:top-1.5 before:bottom-1.5 before:w-px before:bg-black/10 dark:before:bg-white/10">
          ${tools.map((t, idx) => {
            const isRunning = t.status === "running" || t.status === "pending";
            const key = `${messageId}-tool-${idx}`;
            const isExpanded = this.expandedToolKey === key;
            const hasDetails = Boolean(t.diff || t.errorText || t.resultText || t.args);

            return html`
              <div class="relative flex flex-col gap-1.5 text-xs">
                <div
                  class="relative flex items-center justify-between gap-3 ${hasDetails ? "cursor-pointer select-none group/step hover:opacity-90" : ""}"
                  @click=${() => hasDetails && this.toggleToolExpand(key)}
                >
                  <span class="absolute -left-[14px] top-1/2 -translate-y-1/2 size-2 rounded-full ring-2 ring-background-150 ${t.isError ? "bg-red-500" : isRunning ? "bg-amber-500 animate-pulse" : "bg-emerald-500/80"}"></span>
                  <div class="flex items-center gap-2 min-w-0 flex-1">
                    <span class="font-mono font-semibold text-foreground-800 dark:text-foreground-200 shrink-0">${t.toolName}</span>
                    ${t.target || t.summary
                      ? html`<span class="font-mono text-[11px] text-foreground-500 truncate" title="${t.target || t.summary}">${t.target || t.summary}</span>`
                      : nothing}
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    ${t.diffStats
                      ? html`<span class="font-mono text-[10px] font-semibold"><span class="text-emerald-500">+${t.diffStats.added}</span> <span class="text-red-500">-${t.diffStats.removed}</span></span>`
                      : nothing}
                    ${isRunning
                      ? html`<svg class="size-3 text-amber-500 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>`
                      : nothing}
                    ${hasDetails ? html`
                      <svg class="size-3 text-foreground-400 transition-transform ${isExpanded ? "rotate-180" : ""}" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
                      </svg>
                    ` : nothing}
                  </div>
                </div>

                ${isExpanded ? html`
                  <div class="ml-1 my-1 p-2.5 rounded-xl border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] text-xs space-y-2">
                    ${t.args ? html`
                      <div>
                        <span class="text-[10px] uppercase font-semibold text-foreground-400 tracking-wider font-sans block mb-1">Entrada / Argumentos</span>
                        <pre class="font-mono text-[11px] whitespace-pre-wrap break-all bg-black/5 dark:bg-white/5 p-2 rounded-lg text-foreground-700 dark:text-foreground-300">${typeof t.args === "string" ? t.args : JSON.stringify(t.args, null, 2)}</pre>
                      </div>
                    ` : nothing}
                    ${t.errorText ? html`
                      <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-red-600 dark:text-red-400">
                        <span class="text-[10px] uppercase font-semibold tracking-wider font-sans block mb-1">Erro</span>
                        <pre class="font-mono text-[11px] whitespace-pre-wrap break-all">${t.errorText}</pre>
                      </div>
                    ` : nothing}
                    ${t.diff ? html`
                      <div class="bg-black/5 dark:bg-white/5 rounded-lg p-2 overflow-x-auto">
                        <span class="text-[10px] uppercase font-semibold text-foreground-400 tracking-wider font-sans block mb-1">Alterações (Diff)</span>
                        <pre class="font-mono text-[11px] leading-tight">${this.renderFormattedDiff(t.diff)}</pre>
                      </div>
                    ` : nothing}
                    ${t.resultText && !t.diff && !t.errorText ? html`
                      <div class="bg-black/5 dark:bg-white/5 rounded-lg p-2 overflow-x-auto max-h-56">
                        <span class="text-[10px] uppercase font-semibold text-foreground-400 tracking-wider font-sans block mb-1">Saída</span>
                        <pre class="font-mono text-[11px] whitespace-pre-wrap break-all text-foreground-600 dark:text-foreground-400">${t.resultText}</pre>
                      </div>
                    ` : nothing}
                  </div>
                ` : nothing}
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  private renderToolsBlock(tools: ToolItem[], messageId: string) {
    return this.progressStyle === "minimal"
      ? this.renderToolsMinimal(tools, messageId)
      : this.renderToolsSteps(tools, messageId);
  }

  private toggleProgressStyle() {
    const next = this.progressStyle === "minimal" ? "steps" : "minimal";
    this.progressStyle = next;
    this.dispatchEvent(
      new CustomEvent("progress-style-change", {
        detail: { progressStyle: next },
        bubbles: true,
        composed: true,
      })
    );
  }

  private renderStreamingStatus() {
    const lastMsg = this.messages[this.messages.length - 1];
    let statusText = "Gerando resposta…";

    if (lastMsg?.tools && lastMsg.tools.length > 0) {
      const runningTool = [...lastMsg.tools].reverse().find((t) => t.status === "running" || t.status === "pending");
      if (runningTool) {
        statusText = `Executando ${runningTool.toolName}…`;
      }
    } else if (lastMsg?.thinking && !lastMsg.text) {
      statusText = "Pensando…";
    }

    return html`
      <div class="flex items-center gap-3 w-full animate-fade-in">
        <div class="size-6 rounded-full omp-surface-avatar flex items-center justify-center shadow-xs shrink-0">
          ${renderOmpLogo("size-3.5")}
        </div>
        <div class="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/10 text-foreground-700 dark:text-foreground-300">
          <span class="size-1.5 rounded-full bg-amber-500 animate-ping"></span>
          <span>${statusText}</span>
          ${renderLoadingDots()}
        </div>
      </div>
    `;
  }

  override render() {
    const lastIndex = this.messages.length - 1;

    return html`
      <!-- OMP Web Exact Chat Page Structure -->
      <div class="relative flex flex-col h-full w-full overflow-hidden">
        ${this.artifact
          ? html`
              <div class="w-full flex items-center justify-between px-4 py-2 bg-blue-500/10 dark:bg-blue-400/10 border-b border-black/8 dark:border-white/8 shrink-0 text-xs">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="size-2 rounded-full ${this.artifact.status === "approved" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}"></span>
                  <span class="font-bold text-foreground-900 truncate">Plano: ${this.artifact.title || "Plano de Execução"}</span>
                </div>
                <button
                  type="button"
                  class="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer shrink-0 transition-colors shadow-xs"
                  @click=${() => this.dispatchEvent(new CustomEvent("open-artifact", { bubbles: true, composed: true }))}
                >
                  Ver no Painel Lateral →
                </button>
              </div>
            `
          : nothing}
        <!-- Scrollable Messages Area matching original @container/chat -->
        <div
          data-scroll-container
          @scroll=${(e: Event) => this.onScroll(e)}
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
              ${this.messages.map((msg, index) => {
                const isLastAssistant = index === lastIndex && msg.role === "assistant";

                return html`
                  ${msg.role === "user"
                    ? html`
                        <!-- User Message Article -->
                        <div class="group/user-message space-y-1" role="article">
                          <div class="flex w-full flex-col gap-1">
                            <div class="flex gap-2 justify-end">
                              <div class="relative z-10 flex opacity-0 transition-opacity duration-200 ease-in-out group-hover/user-message:opacity-100 items-center gap-1">
                                <button
                                  aria-label="Revert turn"
                                  type="button"
                                  class="size-8 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center text-foreground-800 transition-colors cursor-pointer"
                                  @click=${() => this.handleRevertTurn(msg, index)}
                                  title="Editar e reverter para este turno"
                                >
                                  ${renderBranchIcon("size-3.5")}
                                </button>
                                <button
                                  aria-label="Copy message"
                                  type="button"
                                  class="size-8 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center text-foreground-800 transition-colors cursor-pointer"
                                  @click=${() => this.handleCopyText(msg.text, msg.id)}
                                  title="Copiar mensagem"
                                >
                                  ${this.copiedMessageId === msg.id
                                    ? html`<svg class="size-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`
                                    : html`<svg class="size-4" fill="currentColor" viewBox="0 0 20 20"><path d="M8 2C6.89543 2 6 2.89543 6 4V14C6 15.1046 6.89543 16 8 16H14C15.1046 16 16 15.1046 16 14V4C16 2.89543 15.1046 2 14 2H8ZM7 4C7 3.44772 7.44772 3 8 3H14C14.5523 3 15 3.44772 15 4V14C15 14.5523 14.5523 15 14 15H8C7.44772 15 7 14.5523 7 14V4ZM4 6.00001C4 5.25973 4.4022 4.61339 5 4.26758V14.5C5 15.8807 6.11929 17 7.5 17H12.7324C12.3866 17.5978 11.7403 18 11 18H4C2.89543 18 2 17.1046 2 16V8.00001C2 6.89544 2.89543 6.00001 4 6.00001Z"></path></svg>`
                                  }
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
                        <!-- Assistant Message Article: Full Width Layout with Top Header -->
                        <div class="group/assistant-message flex flex-col w-full space-y-2" role="article">
                          <!-- Assistant Header Row -->
                          <div class="flex items-center justify-between w-full pb-0.5">
                            <div class="flex items-center gap-2">
                              <div class="size-6 rounded-full omp-surface-avatar flex items-center justify-center shadow-xs shrink-0">
                                ${renderOmpLogo("size-3.5")}
                              </div>
                              <span class="text-xs font-semibold text-foreground-800 dark:text-foreground-200 font-sans tracking-tight">OMP</span>
                              ${msg.timestamp ? html`<span class="text-[11px] text-foreground-400 font-mono select-none">${msg.timestamp}</span>` : nothing}
                            </div>

                            <!-- Actions: Copy Assistant Response -->
                            <div class="flex items-center gap-1 opacity-0 group-hover/assistant-message:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
                              ${msg.text ? html`
                                <button
                                  type="button"
                                  aria-label="Copiar resposta"
                                  title="Copiar resposta completa"
                                  class="size-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-foreground-500 hover:text-foreground-800 dark:hover:text-foreground-200 transition-colors cursor-pointer"
                                  @click=${() => this.handleCopyText(msg.text, msg.id)}
                                >
                                  ${this.copiedMessageId === msg.id
                                    ? html`<svg class="size-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`
                                    : html`<svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`
                                  }
                                </button>
                              ` : nothing}
                            </div>
                          </div>

                          <!-- Content taking 100% full width of thread -->
                          <div class="w-full flex flex-col min-w-0 select-text space-y-1.5">
                            ${this.showThinking && msg.thinking ? this.renderThinkingBlock(msg.thinking, msg.id, isLastAssistant) : nothing}
                            ${msg.tools && msg.tools.length > 0 ? this.renderToolsBlock(msg.tools, msg.id) : nothing}
                            ${msg.text ? html`
                              <div class="text-[15px] leading-relaxed text-foreground-900 font-sans break-words w-full pt-0.5">
                                <omp-markdown .text=${msg.text}></omp-markdown>
                              </div>
                            ` : nothing}
                          </div>

                          ${msg.hasAgentProcess === true
                            ? html`<omp-agent-process .autoAnimate=${false}></omp-agent-process>`
                            : nothing}
                        </div>
                      `}
                `;
              })}

              <!-- Streaming / Loading Indicator with contextual status -->
              ${this.isStreaming && (!this.messages.length || this.messages[this.messages.length - 1].role === "user" || (this.messages[this.messages.length - 1].role === "assistant" && !this.messages[this.messages.length - 1].text && !this.messages[this.messages.length - 1].thinking && (!this.messages[this.messages.length - 1].tools || !this.messages[this.messages.length - 1].tools?.length)))
                ? this.renderStreamingStatus()
                : nothing}

              <!-- Bottom spacer so composer doesn't cover last message with bottom margin -->
              <div class="h-36 sm:h-44 shrink-0 pointer-events-none" aria-hidden="true"></div>
            </div>
          </div>
        </div>

        <!-- Floating Jump to Bottom Button -->
        ${!this.pinnedToBottom ? html`
          <div class="absolute bottom-28 sm:bottom-32 inset-x-0 z-30 flex justify-center pointer-events-none animate-fade-in">
            <button
              type="button"
              class="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-background-50/95 dark:bg-background-200/95 hover:bg-background-100 dark:hover:bg-background-300 text-foreground-800 dark:text-foreground-200 shadow-md backdrop-blur border border-black/10 dark:border-white/10 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              @click=${() => this.jumpToBottom()}
              title="Rolar para o final"
            >
              <svg class="size-3.5 text-accent-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span>Ir para o final</span>
            </button>
          </div>
        ` : nothing}

        <!-- Sticky Bottom Composer Dock with Safe-Area Inset Support and proper bottom margin -->
        <div class="absolute bottom-0 inset-x-0 z-20 flex flex-col items-center px-4 pb-4 sm:pb-6 pb-[max(calc(env(safe-area-inset-bottom)+1rem),1.5rem)] pt-8 bg-gradient-to-t from-background-150 via-background-150/80 to-transparent pointer-events-none">
          <div class="w-full max-w-chat pointer-events-auto ${this.isFirstPrompt ? "animate-composer-dock" : ""}">
            <omp-composer
              compact
              .isWorking=${this.isStreaming}
              .projects=${this.projects}
              .selectedProjectId=${this.selectedProjectId}
              .selectedModel=${this.selectedModel}
              .selectedProvider=${this.selectedProvider}
              .btwState=${this.btwState}
              .pendingAsk=${this.pendingAsk}
              .pendingCommand=${this.pendingCommand}
              .planMode=${this.planMode}
              .extensionStatuses=${this.extensionStatuses}
              @submit-command=${(e: CustomEvent) => this.dispatchEvent(new CustomEvent("submit-command", { detail: e.detail, bubbles: true, composed: true }))}
              @cancel-command=${(e: CustomEvent) => this.dispatchEvent(new CustomEvent("cancel-command", { detail: e.detail, bubbles: true, composed: true }))}
              @open-models=${() => this.dispatchEvent(new CustomEvent("open-models", { bubbles: true, composed: true }))}
              @model-change=${(e: CustomEvent) => this.dispatchEvent(new CustomEvent("model-change", { detail: e.detail, bubbles: true, composed: true }))}
              @model-tier-change=${(e: CustomEvent) => this.dispatchEvent(new CustomEvent("model-tier-change", { detail: e.detail, bubbles: true, composed: true }))}
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
              @stop-generation=${() => {
                this.dispatchEvent(new CustomEvent("stop-generation", { bubbles: true, composed: true }));
              }}
              @open-plan-review=${() => this.dispatchEvent(new CustomEvent("open-plan-review", { bubbles: true, composed: true }))}
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
