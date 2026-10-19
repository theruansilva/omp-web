import { LitElement, html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { highlightCodeBlock } from "../formatting/syntaxHighlight";
import { customElement, property, state } from "lit/decorators.js";
import { renderOmpLogo, renderLoadingDots, renderPaperclipIcon, renderBranchIcon, renderPencilIcon, renderDotMatrixIcon } from "./icons";
import type { PromptAttachment, PlanModeStatus } from "../../../shared/apiTypes";
import "./OmpComposer";
import type { BtwState, ComposerProject, PendingCommandDialog } from "./OmpComposer";
import type { ArtifactData } from "./OmpArtifactPanel";
import "./OmpAgentProcess";
import "./OmpMarkdown";
import type { AskDialogQuestion, Machine, MachineHealth } from "../api";
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

export interface ChatMessagePartThinking {
  type: "thinking";
  thinking: string;
}

export interface ChatMessagePartTool {
  type: "tool";
  tools: ToolItem[];
}

export interface ChatMessagePartText {
  type: "text";
  text: string;
}

export type ChatMessagePart = ChatMessagePartThinking | ChatMessagePartTool | ChatMessagePartText;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  thinking?: string;
  tools?: ToolItem[];
  parts?: ChatMessagePart[];
  timestamp?: string;
  hasAgentProcess?: boolean;
  attachments?: PromptAttachment[];
  rawIndex?: number;
  entryId?: string;
  isSystemPrompt?: boolean;
  systemPromptKind?: "notice" | "reminder" | "compaction" | "skill" | "rewind" | "checkpoint";
  skillName?: string;
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
  @property({ type: String }) sessionId?: string;
  @property({ type: String }) cwd?: string;
  @property({ type: String }) machineId = "local";
  @property({ attribute: false }) machines: Machine[] = [];
  @property({ attribute: false }) selectedMachine?: Machine;
  @property({ attribute: false }) machineStatuses: Record<string, MachineHealth> = {};
  @property({ attribute: false }) artifact?: ArtifactData;
  @property({ type: String }) progressStyle: "minimal" | "steps" = "steps";
  @property({ type: Boolean }) showThinking = true;
  @property({ type: Boolean }) categorizePrompts = true;

  @state() private pinnedToBottom = true;
  @state() private streamElapsedSeconds = 0;
  @state() private processBlockStates: Record<string, boolean> = {};
  @state() private expandedThinkingKeys = new Set<string>();

  private toggleThinkingStep(key: string, defaultOpen: boolean) {
    if (this.expandedThinkingKeys.has(key)) {
      this.expandedThinkingKeys.delete(key);
    } else {
      this.expandedThinkingKeys.add(key);
    }
    this.requestUpdate();
  }

  private isProcessBlockOpen(messageId: string, isRunningProcess: boolean): boolean {
    if (this.processBlockStates[messageId] !== undefined) {
      return this.processBlockStates[messageId];
    }
    return isRunningProcess;
  }

  private toggleProcessBlock(messageId: string, currentOpen: boolean) {
    this.processBlockStates[messageId] = !currentOpen;
    this.requestUpdate();
  }

  private getMessageProcessParts(msg: ChatMessage): ChatMessagePart[] {
    let parts: ChatMessagePart[] = [];
    if (msg.parts && msg.parts.length > 0) {
      parts = msg.parts.filter((p) => p.type === "thinking" || p.type === "tool");
    } else {
      if (msg.thinking) {
        parts.push({ type: "thinking", thinking: msg.thinking });
      }
      if (msg.tools && msg.tools.length > 0) {
        parts.push({ type: "tool", tools: msg.tools });
      }
    }
    if (!this.showThinking) {
      parts = parts.filter((p) => p.type !== "thinking");
    }
    return parts;
  }

  private getProcessSummary(msg: ChatMessage, processParts: ChatMessagePart[]): string {
    if (this.showThinking) {
      if (msg.thinking) {
        const firstLine = msg.thinking.trim().split("\n")[0]?.replace(/^[\*#\s>-]+|[\*#\s]+$/g, "").trim() || "";
        if (firstLine) {
          return firstLine.length > 60 ? `${firstLine.slice(0, 58)}…` : firstLine;
        }
      }
      for (const part of processParts) {
        if (part.type === "thinking" && part.thinking) {
          const firstLine = part.thinking.trim().split("\n")[0]?.replace(/^[\*#\s>-]+|[\*#\s]+$/g, "").trim() || "";
          if (firstLine) {
            return firstLine.length > 60 ? `${firstLine.slice(0, 58)}…` : firstLine;
          }
        }
      }
    }
    const toolCount = processParts.reduce((acc, p) => acc + (p.type === "tool" ? p.tools.length : 0), 0);
    if (toolCount > 0) {
      return `executed ${toolCount} ${toolCount === 1 ? "action" : "actions"}`;
    }
    return "agent reasoning";
  }

  private getStreamingStatusText(msg?: ChatMessage): string {
    let statusText = "Generating response…";
    if (msg?.tools && msg.tools.length > 0) {
      const runningTool = [...msg.tools].reverse().find((t) => t.status === "running" || t.status === "pending");
      if (runningTool) {
        const name = (runningTool.toolName || "").toLowerCase();
        if (name === "bash" || name === "terminal" || name === "sh") {
          statusText = "Running terminal…";
        } else if (name === "read" || name === "cat") {
          statusText = runningTool.target ? `Reading ${runningTool.target.split("/").pop()}…` : "Reading files…";
        } else if (name === "edit" || name === "patch") {
          statusText = runningTool.target ? `Editing ${runningTool.target.split("/").pop()}…` : "Editing files…";
        } else if (name === "write") {
          statusText = runningTool.target ? `Writing ${runningTool.target.split("/").pop()}…` : "Writing file…";
        } else if (name === "grep" || name === "glob" || name.includes("search")) {
          statusText = "Searching codebase…";
        } else if (name === "eval") {
          statusText = "Running in kernel…";
        } else if (name.startsWith("mcp__") || name.startsWith("mcp:")) {
          statusText = `Calling MCP ${name.replace(/^mcp__/, "").replace(/__/g, " · ")}…`;
        } else {
          statusText = `Running ${runningTool.toolName}…`;
        }
      } else {
        statusText = "Processing results…";
      }
    } else if (msg) {
      const lastPart = msg.parts?.[msg.parts.length - 1];
      if ((lastPart?.type === "thinking" || msg.thinking) && !msg.text) {
        statusText = "Thinking…";
      }
    }
    return statusText;
  }

  private shouldRenderBottomStreamingStatus(): boolean {
    if (!this.isStreaming) return false;
    const lastMsg = this.messages[this.messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant") return true;
    const processParts = this.getMessageProcessParts(lastMsg);
    const isRunningProcess = processParts.length > 0 && (!lastMsg.text || lastMsg.text.trim() === "");
    return !isRunningProcess;
  }
  private streamTimer?: ReturnType<typeof setInterval>;

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this.streamTimer) {
      clearInterval(this.streamTimer);
      this.streamTimer = undefined;
    }
  }

  private formatElapsedTime(): string {
    const elapsed = this.streamElapsedSeconds;
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  }
  @state() private expandedToolKey: string | null = null;
  @state() private copiedMessageId: string | null = null;
  @state() private showAllToolsMap = new Set<string>();

  private manuallyOpenedThinkingMap = new Set<string>();
  private lastScrollTop = 0;
  private lastClientHeight = 0;
  private scrollToBottomFrame?: number;

  protected override createRenderRoot() {
    return this;
  }

  protected override updated(changedProps: Map<string, unknown>) {
    // Manage streaming timer for elapsed seconds
    if (changedProps.has("isStreaming")) {
      if (this.isStreaming) {
        this.streamElapsedSeconds = 0;
        if (this.streamTimer) clearInterval(this.streamTimer);
        this.streamTimer = setInterval(() => {
          this.streamElapsedSeconds++;
          this.requestUpdate();
        }, 1000);
      } else {
        if (this.streamTimer) {
          clearInterval(this.streamTimer);
          this.streamTimer = undefined;
        }
      }
    }

    // When pendingAsk or pendingCommand arrives, do NOT lock scroll to bottom!
    // Keep user's scroll position so they can freely read context and previous messages.
    if ((changedProps.has("pendingAsk") && this.pendingAsk !== undefined) || (changedProps.has("pendingCommand") && this.pendingCommand !== undefined)) {
      this.pinnedToBottom = false;
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

  private getAskContext(): string {
    if (!this.pendingAsk && !this.pendingCommand) return "";
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const msg = this.messages[i];
      if (msg.role === "assistant" && (msg.text || msg.thinking)) {
        return msg.text || msg.thinking || "";
      }
    }
    return "";
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

  private toggleShowAllTools(messageId: string) {
    if (this.showAllToolsMap.has(messageId)) {
      this.showAllToolsMap.delete(messageId);
    } else {
      this.showAllToolsMap.add(messageId);
    }
    this.requestUpdate();
  }

  private renderThinkingBlock(thinking: string, messageId: string, isStreamingBlock = false) {
    if (this.progressStyle === "minimal") {
      return this.renderThinkingMinimal(thinking, messageId, isStreamingBlock);
    }
    return this.renderThinkingSteps(thinking, messageId, isStreamingBlock);
  }

  private renderThinkingMinimal(thinking: string, messageId: string, isStreamingBlock = false) {
    return this.renderThinkingSteps(thinking, messageId, isStreamingBlock);
  }

  private renderThinkingSteps(thinking: string, messageId: string, isStreamingBlock = false) {
    const firstLine = thinking.trim().split("\n")[0]?.replace(/^[\*#\s>-]+|[\*#\s]+$/g, "").trim() || "";
    const summary = firstLine.length > 60 ? firstLine.slice(0, 58) + "…" : firstLine;
    const isOpen = this.isThinkingOpen(messageId);
    const isStreamingThinking = isStreamingBlock && this.isStreaming;

    return html`
      <details
        class="group/thinking my-1 w-full bg-transparent select-none overflow-hidden"
        ?open=${isOpen}
      >
        <summary
          class="flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer select-none text-xs font-semibold text-foreground-800 hover:text-foreground-900 hover:bg-black/5 dark:hover:bg-white/8 list-none transition-colors"
          @click=${(e: Event) => {
            e.preventDefault();
            this.toggleThinking(messageId);
          }}
        >
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <span class="inline-flex items-center justify-center size-5 rounded-md bg-amber-500/20 text-amber-500 shrink-0 ring-1 ring-amber-500/30">
              <svg class="size-3.5 text-amber-500 ${isStreamingThinking ? "animate-pulse" : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/>
                <path d="M9 21h6"/>
              </svg>
            </span>
            <strong class="font-bold text-foreground-900 text-xs shrink-0">
              ${isStreamingThinking ? "Pensando…" : "Raciocínio"}
            </strong>
            ${summary ? html`<span class="text-foreground-700 truncate max-w-[280px] sm:max-w-md font-medium text-xs">${summary}</span>` : nothing}
          </div>
          <svg class="size-3.5 text-foreground-600 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </summary>
        ${isOpen ? html`
          <div class="ml-2.5 my-1 pl-3 py-2 text-xs text-foreground-900 leading-relaxed border-l-2 border-amber-500/40 select-text max-h-96 overflow-y-auto font-sans">
            <omp-markdown .text=${thinking}></omp-markdown>
          </div>
        ` : nothing}
      </details>
    `;
  }

          private renderToolItemIcon(t: ToolItem) {
    const isError = Boolean(t.isError || t.status === "error");
    const isRunning = t.status === "running" || t.status === "pending";

    // 1. Error: console icon in red
    if (isError) {
      return html`
        <span class="tool-icon error inline-flex items-center justify-center size-5 shrink-0 text-red-500" style="color: #ef4444;" title="Console error">
          <svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="2.5" width="12" height="11" rx="2" />
            <path d="M5 6.5l2 2-2 2M9.5 10.5h2" />
          </svg>
        </span>
      `;
    }

    // 2. Running: white/light spinning animation
    if (isRunning) {
      return html`
        <span class="tool-icon tool-spinner inline-flex items-center justify-center size-5 shrink-0 text-white dark:text-white" title="Running…">
          <svg class="size-3.5 animate-spin text-white" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <circle cx="8" cy="8" r="6" stroke-dasharray="28" stroke-dashoffset="10" />
          </svg>
        </span>
      `;
    }

    // 3. Completed: tool's classic icon in dedicated color (NO CHECKMARK!)
    const name = (t.toolName || "").toLowerCase();

    if (name === "bash" || name === "sh" || name === "terminal") {
      return html`
        <span class="tool-icon inline-flex items-center justify-center size-5 shrink-0" style="color: #10b981;" title="${t.toolName}">
          <svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="2.5" width="12" height="11" rx="2" />
            <path d="M5 6l2.5 2L5 10M9 10.5h2" />
          </svg>
        </span>
      `;
    }

    if (name === "eval") {
      return html`
        <span class="tool-icon inline-flex items-center justify-center size-5 shrink-0" style="color: #f59e0b;" title="${t.toolName}">
          <svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 3.5L8 8l-4 4.5" />
            <path d="M8.5 12.5h4" />
          </svg>
        </span>
      `;
    }

    if (name === "read" || name === "cat") {
      return html`
        <span class="tool-icon inline-flex items-center justify-center size-5 shrink-0" style="color: #38bdf8;" title="${t.toolName}">
          <svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 2.5h6.5l3.5 3.5V13.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z" />
            <path d="M9.5 2.5V6H13" />
          </svg>
        </span>
      `;
    }

    if (name === "edit" || name === "patch") {
      return html`
        <span class="tool-icon inline-flex items-center justify-center size-5 shrink-0" style="color: #818cf8;" title="${t.toolName}">
          <svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 2.5a1.4 1.4 0 0 1 2 2L5.5 12 2 13l1-3.5L10.5 2.5z" />
          </svg>
        </span>
      `;
    }

    if (name === "write") {
      return html`
        <span class="tool-icon inline-flex items-center justify-center size-5 shrink-0" style="color: #14b8a6;" title="${t.toolName}">
          <svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 2.5h7l3 3V13.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z" />
            <path d="M8 8v4M6 10h4" />
          </svg>
        </span>
      `;
    }

    if (name === "task" || name === "todo") {
      return html`
        <span class="tool-icon inline-flex items-center justify-center size-5 shrink-0" style="color: #f97316;" title="${t.toolName}">
          <svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
            <path d="M5.5 8l2 2 3.5-4" />
          </svg>
        </span>
      `;
    }

    if (name.startsWith("mcp__") || name.startsWith("mcp:")) {
      return html`
        <span class="tool-icon inline-flex items-center justify-center size-5 shrink-0 text-purple-400" style="color: #a855f7;" title="MCP: ${t.toolName}">
          <svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2v3M10 2v3M4 5h8v4a4 4 0 0 1-8 0V5zM8 13v2" />
          </svg>
        </span>
      `;
    }

    // Default / grep / search
    return html`
      <span class="tool-icon inline-flex items-center justify-center size-5 shrink-0" style="color: #ec4899;" title="${t.toolName || "search"}">
        <svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5L14 14" />
        </svg>
      </span>
    `;
  }

  private renderFormattedDiff(diff: string) {
    const lines = diff.split("\n");
    return lines.map((line) => {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        return html`<span class="text-emerald-400 bg-emerald-500/10 block px-1.5 rounded-xs leading-relaxed font-mono">${line}</span>`;
      }
      if (line.startsWith("-") && !line.startsWith("---")) {
        return html`<span class="text-red-400 bg-red-500/10 block px-1.5 rounded-xs leading-relaxed font-mono">${line}</span>`;
      }
      if (line.startsWith("@@")) {
        return html`<span class="text-sky-400 block px-1.5 leading-relaxed font-mono font-bold">${line}</span>`;
      }
      return html`<span class="text-foreground-800 block px-1.5 leading-relaxed font-mono opacity-80">${line}</span>`;
    });
  }

    private renderHighlightedCode(text?: string, defaultLang?: string) {
    if (!text) return nothing;
    let lang = defaultLang;
    if (!lang) {
      const trimmed = text.trim();
      if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
        lang = "json";
      } else if (trimmed.includes("expect(") || trimmed.includes("const ") || trimmed.includes("function ") || trimmed.includes("import ") || trimmed.includes("export ")) {
        lang = "typescript";
      } else if (trimmed.includes("def ") || trimmed.includes("import ") || trimmed.includes("print(")) {
        lang = "python";
      } else if (trimmed.includes("$ ") || trimmed.includes("npm ") || trimmed.includes("bun ") || trimmed.includes("git ")) {
        lang = "bash";
      }
    }
    const htmlStr = lang ? highlightCodeBlock(text, lang) : this.escapeCodeHtml(text);
    return html`<code class="tok-code font-mono text-xs block leading-relaxed">${unsafeHTML(htmlStr)}</code>`;
  }

  private escapeCodeHtml(text: string): string {
    return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  private renderSystemMessage(msg: ChatMessage) {
    const txt = msg.text || "";
    const kind = msg.systemPromptKind || (
      txt.includes("Branch-return summary") || txt.includes("Checkpoint called and rewound") || txt.includes("Branch summary") || txt.includes("Compacted history")
        ? "rewind"
        : msg.skillName || txt.includes("<skill name=")
        ? "skill"
        : txt.includes("<system-reminder>")
        ? "reminder"
        : "notice"
    );

    let icon = html`<span class="tool-icon inline-flex items-center justify-center size-5 shrink-0 text-sky-400" title="Sistema"><svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><line x1="8" y1="7" x2="8" y2="11"/><line x1="8" y1="5" x2="8.01" y2="5"/></svg></span>`;
    let label = "system";
    let summary = txt.trim().split("\n")[0] || "";

    if (kind === "rewind") {
      icon = html`<span class="tool-icon inline-flex items-center justify-center size-5 shrink-0 text-emerald-400" title="Rewind"><svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h7a4 4 0 0 1 0 8H6"/><polyline points="6 10 3 7 6 4"/></svg></span>`;
      label = "rewind";
      summary = "Branch-return summary";
    } else if (kind === "skill") {
      icon = html`<span class="tool-icon inline-flex items-center justify-center size-5 shrink-0 text-amber-500" title="Skill"><svg class="size-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M9.5 2L3 9h5l-1.5 6L13 8H8l1.5-6z"/></svg></span>`;
      label = `skill · ${msg.skillName || "skill"}`;
      summary = txt && !txt.startsWith("<skill") ? txt.split("\n")[0] : "";
    } else if (kind === "reminder") {
      icon = html`<span class="tool-icon inline-flex items-center justify-center size-5 shrink-0 text-sky-400" title="Lembrete"><svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><polyline points="8 5 8 8 10 10"/></svg></span>`;
      label = "reminder";
    }

    const key = `sys-${msg.id}`;
    const isExpanded = this.expandedToolKey === key;

    return html`
      <details class="tool-card system-card w-full bg-transparent overflow-hidden my-0.5 select-none" ?open=${isExpanded}>
        <summary
          class="tool-header flex items-center justify-between gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/8 list-none select-none font-sans"
          @click=${(e: Event) => {
            e.preventDefault();
            this.toggleToolExpand(key);
          }}
        >
          <div class="tool-title flex items-center gap-2.5 min-w-0 flex-1">
            ${icon}
            <strong class="font-mono font-bold text-foreground-900 text-xs shrink-0">${label}</strong>
            ${summary ? html`<span class="path font-mono text-xs font-semibold text-foreground-700 truncate" title="${summary}">${summary}</span>` : nothing}
          </div>
          <div class="tool-meta flex items-center gap-2 shrink-0">
            <svg class="size-3.5 text-foreground-600 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </div>
        </summary>
        ${isExpanded ? html`
          <div class="tool-content px-2 pb-2.5 pt-1 space-y-2 text-xs font-sans select-text">
            <div class="p-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/10 dark:bg-black/40 text-foreground-900 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
              ${this.renderHighlightedCode(txt)}
            </div>
          </div>
        ` : nothing}
      </details>
    `;
  }

  private renderClassicToolCard(t: ToolItem, key: string, isCurrent = false) {
    const isRunning = t.status === "running" || t.status === "pending";
    const isExpanded = this.expandedToolKey
      ? this.expandedToolKey === key
      : (isCurrent && isRunning);
    const hasDetails = Boolean(t.diff || t.errorText || t.resultText || t.args);
    const targetText = t.target || t.summary;

    return html`
      <details class="tool-card ${t.status || 'completed'} w-full bg-transparent overflow-hidden my-0.5 select-none" .open=${isExpanded}>
        <summary
          class="tool-header inline-flex items-center gap-2 py-1 px-1.5 rounded-lg cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/8 list-none select-none font-sans max-w-full"
          @click=${(e: Event) => {
            e.preventDefault();
            if (hasDetails) this.toggleToolExpand(key);
          }}
        >
          ${this.renderToolItemIcon(t)}
          ${t.toolName.startsWith("mcp__") || t.toolName.startsWith("mcp:") ? html`
            <span class="px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-[10px] font-mono font-bold text-purple-400 shrink-0">
              MCP${t.toolName.startsWith("mcp__") ? ` · ${t.toolName.slice(5).split("__")[0]}` : ""}
            </span>
          ` : nothing}
          <strong class="font-mono font-bold text-xs shrink-0" style="color: var(--omp-text-primary, #F8FAFC);">${t.toolName.startsWith("mcp__") ? (t.toolName.slice(5).split("__").slice(1).join("__") || t.toolName) : t.toolName}</strong>
          ${targetText ? html`<span class="path font-mono text-xs font-medium truncate max-w-[280px] sm:max-w-md" style="color: var(--omp-text-primary, #F8FAFC); opacity: 0.85;" title="${targetText}">${targetText}</span>` : nothing}
          ${t.diffStats ? html`
            <span class="diff-stats font-mono text-[11px] font-bold shrink-0">
              <span class="text-emerald-500">+${t.diffStats.added}</span><span class="text-foreground-500 mx-0.5">/</span><span class="text-red-500">-${t.diffStats.removed}</span>
            </span>
          ` : nothing}
          ${hasDetails ? html`
            <svg class="size-3.5 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}" style="color: var(--omp-text-primary, #F8FAFC); opacity: 0.6;" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
            </svg>
          ` : nothing}
        </summary>

        ${isExpanded ? html`
          <div class="tool-content px-2 pb-2.5 pt-1 space-y-2 text-xs font-sans select-text">
            ${t.errorText ? html`
              <div class="p-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 font-mono text-xs whitespace-pre-wrap break-all">
                <span class="text-[10px] uppercase font-bold tracking-wider font-sans block mb-1 text-red-500">Console error</span>
                <pre class="font-mono text-xs whitespace-pre-wrap break-all leading-relaxed">${this.renderHighlightedCode(t.errorText, "typescript")}</pre>
              </div>
            ` : nothing}

            ${t.args ? html`
              <div>
                <span class="text-[10px] uppercase font-bold text-foreground-700 tracking-wider font-sans block mb-1">Input / Arguments</span>
                <pre class="font-mono text-xs p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-black/10 dark:bg-black/40 text-foreground-900 whitespace-pre-wrap break-all leading-relaxed">${this.renderHighlightedCode(typeof t.args === "string" ? t.args : JSON.stringify(t.args, null, 2), "json")}</pre>
              </div>
            ` : nothing}

            ${t.diff ? html`
              <div>
                <span class="text-[10px] uppercase font-bold text-foreground-700 tracking-wider font-sans block mb-1">Changes (Diff)</span>
                <pre class="font-mono text-xs p-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/10 dark:bg-black/40 overflow-x-auto max-h-72 leading-relaxed text-foreground-900">${this.renderFormattedDiff(t.diff)}</pre>
              </div>
            ` : nothing}

            ${t.resultText && !t.diff && !t.errorText ? html`
              <div>
                <span class="text-[10px] uppercase font-bold text-foreground-700 tracking-wider font-sans block mb-1">Output</span>
                <pre class="font-mono text-xs p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-black/10 dark:bg-black/40 text-foreground-850 whitespace-pre-wrap break-all max-h-56 overflow-y-auto leading-relaxed">${this.renderHighlightedCode(t.resultText)}</pre>
              </div>
            ` : nothing}
          </div>
        ` : nothing}
      </details>
    `;
  }

  private renderToolsBlock(tools: ToolItem[], messageId: string) {
    if (!tools || tools.length === 0) return nothing;

    return html`
      <div class="my-1 space-y-0.5 w-full font-sans">
        ${tools.map((t, idx) => this.renderClassicToolCard(t, `${messageId}-tool-${idx}`))}
      </div>
    `;
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
    const statusText = this.getStreamingStatusText(lastMsg);
    const elapsed = this.formatElapsedTime();

    return html`
      <div class="chat-thread-status inline-flex items-center gap-2.5 my-2.5 py-1 select-none font-sans animate-fade-in" aria-live="polite">
        <span class="inline-flex items-center justify-center size-4 shrink-0 text-[var(--omp-primary,#ed4abf)] animate-pulse" aria-hidden="true">
          <svg viewBox="0 0 64 64" class="size-3.5 fill-current">
            <path d="M14 16h36v8H40v32h-8V24h-6v22h-8V24h-4z" />
          </svg>
        </span>
        <span class="status-label font-semibold text-xs text-foreground-900">${statusText}</span>
        <span class="font-mono text-[11px] text-foreground-600 font-medium">· ${elapsed}</span>
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
                  class="px-2.5 py-1 rounded-lg bg-[var(--primary)] hover:opacity-90 active:scale-95 text-white font-semibold cursor-pointer shrink-0 transition-all shadow-xs"
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


            <!-- Message Thread with authentic space-y-8 and entrance transition -->
            <div class="inline-block w-full space-y-8 pt-3 ${this.isFirstPrompt ? "animate-thread-fade-in" : ""}">
              ${this.messages.map((msg, index) => {
                const isLastAssistant = index === lastIndex && msg.role === "assistant";
                const txt = msg.text || "";
                const isSystem = Boolean(
                  this.categorizePrompts && (
                    msg.role === "system" ||
                    msg.isSystemPrompt ||
                    txt.includes("Branch-return summary") ||
                    txt.includes("Checkpoint called and rewound") ||
                    txt.includes("<system-notice>") ||
                    txt.includes("<system-reminder>") ||
                    txt.includes("<system-instruction>")
                  )
                );

                if (isSystem) {
                  return this.renderSystemMessage(msg);
                }

                return html`
                  ${msg.role === "user"
                    ? html`
                        <!-- Standard Human User Message Article -->
                        <div class="group/user-message space-y-1" role="article">
                          <div class="flex w-full flex-col gap-1">
                            <div class="flex gap-2 justify-end">
                              <div class="relative z-10 flex opacity-0 transition-opacity duration-200 ease-in-out group-hover/user-message:opacity-100 items-center gap-1">
                                <button
                                  aria-label="Edit message"
                                  type="button"
                                  class="min-w-10 min-h-10 sm:size-8 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center text-foreground-800 transition-colors cursor-pointer"
                                  @click=${() => this.handleRevertTurn(msg, index)}
                                  title="Edit message"
                                >
                                  ${renderPencilIcon("size-3.5")}
                                </button>
                                <button
                                  aria-label="Copy message"
                                  type="button"
                                  class="min-w-10 min-h-10 sm:size-8 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center text-foreground-800 transition-colors cursor-pointer"
                                  @click=${() => this.handleCopyText(msg.text, msg.id)}
                                  title="Copy message"
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
                                  ? html`<div class="font-ligatures-none relative min-w-fit h-fit max-w-user-text-message whitespace-pre-wrap break-words px-4 py-2.5 rounded-2xl squircle-16 bg-accent-250/60 dark:bg-accent-200 text-base self-end text-foreground-900 shadow-xs select-text font-sans" data-content="user-message">${msg.text}</div>`
                                  : nothing}
                              </div>
                            </div>
                          </div>
                        </div>
                      `
                    : html`
                        <!-- Assistant Message Article: Clean Full Width Layout -->
                        <div class="group/assistant-message relative flex flex-col w-full space-y-1.5" role="article">
                          <!-- Content taking 100% full width of thread -->
                          <div class="w-full flex flex-col min-w-0 select-text space-y-1.5">
                            ${(() => {
                              const processParts = this.getMessageProcessParts(msg);
                              const isStreamingThisMessage = isLastAssistant && this.isStreaming;
                              const isRunningProcess = isStreamingThisMessage && (!msg.text || msg.text.trim() === "");
                              const isOpen = this.isProcessBlockOpen(msg.id, isRunningProcess);
                              const summaryText = this.getProcessSummary(msg, processParts);
                              const statusText = this.getStreamingStatusText(msg);
                              const elapsed = this.formatElapsedTime();

                              return html`
                                ${processParts.length > 0 ? html`
                                  <details
                                    class="group/process-block my-1 w-full bg-transparent border-0 select-none transition-colors"
                                    .open=${isOpen}
                                  >
                                    <summary
                                      class="inline-flex items-center gap-2 py-1 px-1.5 cursor-pointer select-none text-xs bg-transparent rounded-lg hover:bg-black/5 dark:hover:bg-white/5 list-none transition-colors max-w-full"
                                      @click=${(e: Event) => {
                                        e.preventDefault();
                                        this.toggleProcessBlock(msg.id, isOpen);
                                      }}
                                    >
                                      <span class="tool-icon inline-flex items-center justify-center size-5 shrink-0 text-amber-400">
                                        <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                          <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/>
                                          <path d="M9 21h6"/>
                                        </svg>
                                      </span>
                                      <span class="font-semibold text-xs shrink-0" style="color: var(--omp-text-primary, #F8FAFC);">
                                        thought about
                                      </span>
                                      <span class="font-normal text-xs truncate max-w-[280px] sm:max-w-lg" style="color: var(--omp-text-primary, #F8FAFC); opacity: 0.9;">
                                        ${summaryText}
                                      </span>
                                      <svg class="size-3.5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}" style="color: var(--omp-text-primary, #F8FAFC); opacity: 0.6;" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                                      </svg>
                                    </summary>

                                    <!-- Process Body: Clean indentation without horizontal or vertical dividing lines -->
                                    <div class="pl-3 py-1 space-y-1 select-text font-sans">
                                      ${(() => {
                                        let toolCounter = 0;
                                        return processParts.map((part, pIdx) => {
                                          const isLastPart = pIdx === processParts.length - 1;
                                          const isCurrent = isRunningProcess && isLastPart;
                                          const thinkKey = `${msg.id}-think-${pIdx}`;
                                          const isThinkOpen = this.expandedThinkingKeys.has(thinkKey) || isCurrent;

                                          if (part.type === "thinking") {
                                            const firstLine = part.thinking.trim().split("\n")[0]?.replace(/^[\*#\s>-]+|[\*#\s]+$/g, "").trim() || "Raciocínio";
                                            const stepSummary = firstLine.length > 55 ? `${firstLine.slice(0, 52)}…` : firstLine;

                                            return this.showThinking && part.thinking ? html`
                                              <details class="my-0.5 group/think-step" .open=${isThinkOpen}>
                                                <summary
                                                  class="inline-flex items-center gap-2 py-1 px-1.5 text-xs cursor-pointer select-none rounded hover:bg-black/5 dark:hover:bg-white/5 list-none max-w-full"
                                                  @click=${(e: Event) => {
                                                    e.preventDefault();
                                                    this.toggleThinkingStep(thinkKey, isThinkOpen);
                                                  }}
                                                >
                                                  <span class="tool-icon inline-flex items-center justify-center size-5 shrink-0 text-amber-400">
                                                    <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                      <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/>
                                                      <path d="M9 21h6"/>
                                                    </svg>
                                                  </span>
                                                  <strong class="font-bold text-xs shrink-0" style="color: var(--omp-text-primary, #F8FAFC);">Raciocínio</strong>
                                                  <span class="font-normal text-xs truncate max-w-[240px] sm:max-w-md" style="color: var(--omp-text-primary, #F8FAFC); opacity: 0.85;">${stepSummary}</span>
                                                  <svg class="size-3.5 shrink-0 transition-transform duration-200 ${isThinkOpen ? "rotate-90" : ""}" style="color: var(--omp-text-primary, #F8FAFC); opacity: 0.6;" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                                                  </svg>
                                                </summary>
                                                <div class="my-1 pl-7 py-1 text-xs leading-relaxed border-l-2 border-amber-500/40 font-sans" style="color: var(--omp-text-primary, #F8FAFC);">
                                                  <omp-markdown .text=${part.thinking}></omp-markdown>
                                                </div>
                                              </details>
                                            ` : nothing;
                                          }
                                          if (part.type === "tool") {
                                            const startIdx = toolCounter;
                                            toolCounter += part.tools.length;
                                            return part.tools && part.tools.length > 0
                                              ? html`
                                                <div class="my-0.5 space-y-0.5 w-full font-sans">
                                                  ${part.tools.map((t, idx) => {
                                                    const isToolCurrent = isCurrent && idx === part.tools.length - 1;
                                                    return this.renderClassicToolCard(t, `${msg.id}-tool-${startIdx + idx}`, isToolCurrent);
                                                  })}
                                                </div>
                                              `
                                              : nothing;
                                          }
                                          return nothing;
                                        });
                                      })()}


                                    </div>
                                  </details>
                                ` : nothing}

                                ${msg.text ? html`
                                  <div class="relative group/msg-text text-[15px] leading-relaxed text-foreground-900 font-sans break-words w-full pt-0.5">
                                    <omp-markdown .text=${msg.text}></omp-markdown>
                                    <div class="flex items-center gap-1 opacity-0 group-hover/assistant-message:opacity-100 transition-opacity duration-150 mt-1">
                                      <button
                                        type="button"
                                        aria-label="Copy response"
                                        title="Copy entire response"
                                        class="size-6 rounded-md hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-foreground-500 hover:text-foreground-800 transition-colors cursor-pointer"
                                        @click=${() => this.handleCopyText(msg.text, msg.id)}
                                      >
                                        ${this.copiedMessageId === msg.id
                                          ? html`<svg class="size-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`
                                          : html`<svg class="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`
                                        }
                                      </button>
                                    </div>
                                  </div>
                                ` : nothing}
                              `;
                            })()}
                          </div>

                          ${msg.hasAgentProcess === true
                            ? html`<omp-agent-process .autoAnimate=${false}></omp-agent-process>`
                            : nothing}
                        </div>
                      `}
                `;
              })}

              <!-- Streaming / Loading Indicator placed at the very bottom -->
              ${this.isStreaming ? this.renderStreamingStatus() : nothing}

              <!-- Bottom spacer so composer doesn't cover last message with bottom margin -->
              <div class="${this.pendingAsk || this.pendingCommand ? "h-80 sm:h-96" : "h-36 sm:h-44"} shrink-0 pointer-events-none transition-[height] duration-300" aria-hidden="true"></div>
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
              .selectedModel=${this.selectedModel}
              .selectedProvider=${this.selectedProvider}
              .btwState=${this.btwState}
              .pendingAsk=${this.pendingAsk}
              .pendingCommand=${this.pendingCommand}
              .planMode=${this.planMode}
              .extensionStatuses=${this.extensionStatuses}
              .sessionId=${this.sessionId}
              .cwd=${this.cwd}
              .machineId=${this.machineId}
              .askContext=${this.getAskContext()}
              .machines=${this.machines}
              .selectedMachine=${this.selectedMachine}
              .machineStatuses=${this.machineStatuses}
              @select-machine=${(e: CustomEvent) => this.dispatchEvent(new CustomEvent("select-machine", { detail: e.detail, bubbles: true, composed: true }))}
              @add-machine=${(e: CustomEvent) => this.dispatchEvent(new CustomEvent("add-machine", { detail: e.detail, bubbles: true, composed: true }))}
              @remove-machine=${(e: CustomEvent) => this.dispatchEvent(new CustomEvent("remove-machine", { detail: e.detail, bubbles: true, composed: true }))}
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
