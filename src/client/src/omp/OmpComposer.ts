import { LitElement, html, nothing, render } from "lit";
import type { AskDialogQuestion, AskDialogResult, FileSuggestion, SlashCommand } from "../api";
import { sessionsApi, filesApi } from "../api/clients";
import { detectPromptCompletionTrigger, fileCompletionInsertText } from "../promptCompletions";
import { isShellInput } from "../inputModes";
import { customElement, property, state } from "lit/decorators.js";
import {
  renderPlusIcon,
  renderChevronDownIcon,
  renderSendIcon,
  renderStopIcon,
  renderQueueIcon,
  renderWaveformIcon,
  renderSmartModeIcon,
  renderQuickModeIcon,
  renderThinkModeIcon,
  renderPaperclipIcon,
  renderScreenshotIcon,
  renderOneDriveIcon,
  renderGoogleDriveIcon,
  renderSparklesIcon,
  renderWebPageIcon,
  renderCheckIcon,
  renderFolderIcon,
  renderLightbulbIcon,
  renderBranchIcon,
  renderCloseIcon,
  renderBoltIcon,
  renderBrainIcon,
  renderFeatherIcon,
  renderModelsIcon,
  renderTasksIcon,
  renderModelProviderIcon,
  renderTerminalIcon,
} from "./icons";
import {
  capturePromptAttachments,
  type CapturedAttachment,
} from "../promptAttachmentCapture";
import type { PromptAttachment, PlanModeStatus } from "../../../shared/apiTypes";
import {
  createMobilePromptEnterMedia,
  readPromptEnterPreference,
  shouldSendPromptOnEnterShortcut,
  shouldUsePromptEnterShiftShortcut,
  type PromptEnterMedia,
} from "../promptEnterBehavior";

export interface PendingAttachment extends CapturedAttachment {
  readonly id: string;
}

function isInstantClientCommand(text: string): boolean {
  const trimmed = text.trim();
  const match = trimmed.match(/^\/([a-zA-Z0-9_-]+)/);
  if (!match) return false;
  const cmd = match[1].toLowerCase();
  return ["clear", "new", "terminal", "files", "usage", "settings", "theme", "hotkeys", "help", "login", "logout"].includes(cmd);
}

export interface SubmitPromptDetail {
  prompt: string;
  model: string;
  projectId?: string;
  attachments?: PromptAttachment[];
  streamingBehavior?: "steer" | "followUp";
}

async function readFileAsBase64(file: File): Promise<string> {
  if (typeof file.arrayBuffer === "function") {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read file"));
    };
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Failed to read file as data URL"));
        return;
      }
      const comma = reader.result.indexOf(",");
      resolve(comma >= 0 ? reader.result.slice(comma + 1) : reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function pendingToPromptAttachment(
  attachment: PendingAttachment,
): PromptAttachment {
  if (attachment.kind === "image") {
    return {
      kind: "image",
      mimeType: attachment.mimeType,
      data: attachment.data,
      name: attachment.name,
    };
  }
  return {
    kind: "file",
    mimeType: attachment.mimeType,
    data: attachment.data,
    name: attachment.name,
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface ComposerProject {
  id: string;
  name: string;
  path?: string;
  image?: string;
}

export interface BtwState {
  status: "running" | "complete" | "error";
  question: string;
  answer: string;
  canBranch?: boolean | undefined;
  error?: string | undefined;
}

export interface SlashCommandItem {
  name: string;
  label: string;
  title: string;
  desc: string;
  badge: string;
}

export interface AskOption {
  id: string;
  title: string;
  desc: string;
  value?: string;
}

export interface PendingCommandDialog {
  requestId: string;
  title: string;
  options: Array<{
    value: string;
    label: string;
    description?: string;
    category?: string;
    icon?: string;
  }>;
}

@customElement("omp-composer")
export class OmpComposer extends LitElement {
  @property({ type: String }) value = "";
  @property({ type: String }) placeholder =
    "Message to omp, use @ to mention a file or / to start a command";
  @property({ type: String }) selectedModel = "Default";
  @property({ type: String }) selectedProvider = "";
  @property({ type: Boolean }) isWorking = false;
  @property({ type: Boolean }) compact = false;
  @property({ type: Boolean }) isAskOpen = false;
  @property({ type: String }) askTitle =
    "Qual abordagem você prefere para esta tarefa?";
  @property({ attribute: false }) askOptions: AskOption[] = [];
  @property({ attribute: false }) projects: ComposerProject[] = [];
  @property({ type: String }) selectedProjectId = "proj-1";
  @property({ type: String }) sessionId?: string;
  @property({ type: String }) cwd?: string;
  @property({ type: String }) machineId = "local";
  @property({ type: String }) askMode: "options" | "projects" = "projects";
  @property({ attribute: false }) customPills: unknown[] = [];
  @property({ attribute: false }) planMode?: PlanModeStatus;
  @property({ attribute: false }) extensionStatuses?: Record<string, string>;
  @property({ attribute: false }) pendingAsk?: {
    requestId: string;
    questions: AskDialogQuestion[];
  };
  @property({ attribute: false }) pendingCommand?: PendingCommandDialog;
  private _btwState?: BtwState;

  @property({ attribute: false })
  get btwState(): BtwState | undefined {
    return this._btwState;
  }
  set btwState(val: BtwState | undefined) {
    const old = this._btwState;
    this._btwState = val;
    if (val) {
      this.cachedBtwState = val;
      this.isBtwOpen = true;
    } else if (this.isBtwOpen) {
      this.isBtwOpen = false;
      setTimeout(() => {
        if (!this.isBtwOpen) {
          this.cachedBtwState = undefined;
          if (this.isConnected) this.requestUpdate();
        }
      }, 460);
    }
    this.requestUpdate("btwState", old);
  }
  @property({ type: Boolean }) isBtwMode = false;
  @property({ attribute: false }) onBranchBtw?: () => void | Promise<void>;
  @property({ attribute: false }) onCloseBtw?: () => void;
  @property({ attribute: false }) promptEnterMedia?: PromptEnterMedia = createMobilePromptEnterMedia();
  private explicitShiftKeyActive = false;

  @state() private attachments: PendingAttachment[] = [];
  @state() private attachmentError?: string;
  @state() private isDragOver = false;

  @state() private slashCommandsOpen = false;
  @state() private slashFilter = "";
  @state() private selectedSlashIndex = 0;
  @state() private fileMenuOpen = false;
  @state() private fileSuggestions: FileSuggestion[] = [];
  @state() private selectedFileIndex = 0;
  @state() private dynamicCommands: SlashCommand[] = [];
  @state() private isShellMode = false;
  private fileTrigger?: { from: number; to: number; query: string };
  private commandsFetchTime = 0;
  @state() private btwBranching = false;
  @state() private btwCopied = false;
  @state() private isBtwOpen = false;
  @state() private cachedBtwState?: BtwState;

  private readonly defaultSlashCommands: SlashCommandItem[] = [
    {
      name: "btw",
      label: "/btw",
      title: "Side Question",
      desc: "Faça uma pergunta lateral efêmera usando o contexto atual",
      badge: "Contexto",
    },
    {
      name: "plan",
      label: "/plan",
      title: "Plan Mode",
      desc: "Ativa ou revisa o modo de planejamento da tarefa",
      badge: "Tarefas",
    },
    {
      name: "plan-review",
      label: "/plan-review",
      title: "Review Plan",
      desc: "Abre o painel lateral com o plano proposto",
      badge: "Tarefas",
    },
    {
      name: "model",
      label: "/model",
      title: "Switch Model",
      desc: "Troca o modelo de raciocínio (Smart, Fast, Thinking)",
      badge: "Modelo",
    },
    {
      name: "clear",
      label: "/clear",
      title: "Clear Chat",
      desc: "Limpa a conversa e o histórico visível do chat",
      badge: "Sessão",
    },
    {
      name: "new",
      label: "/new",
      title: "New Session",
      desc: "Inicia uma sessão de chat limpa no workspace",
      badge: "Sessão",
    },
    {
      name: "compact",
      label: "/compact",
      title: "Compact Session",
      desc: "Resume o contexto da sessão para economizar tokens",
      badge: "Sessão",
    },
    {
      name: "session",
      label: "/session",
      title: "Session Stats",
      desc: "Exibe estatísticas de tokens, custo e mensagens",
      badge: "Sessão",
    },
    {
      name: "name",
      label: "/name",
      title: "Rename Session",
      desc: "Define o nome de exibição desta sessão",
      badge: "Sessão",
    },
    {
      name: "fork",
      label: "/fork",
      title: "Fork Session",
      desc: "Bifurca a sessão a partir de uma mensagem anterior",
      badge: "Sessão",
    },
    {
      name: "clone",
      label: "/clone",
      title: "Clone Session",
      desc: "Duplica a sessão atual na posição exata",
      badge: "Sessão",
    },
    {
      name: "terminal",
      label: "/terminal",
      title: "Terminal",
      desc: "Abre o terminal interativo no workspace ativo",
      badge: "Workspace",
    },
    {
      name: "files",
      label: "/files",
      title: "Files Explorer",
      desc: "Explora e visualiza arquivos do workspace ativo",
      badge: "Workspace",
    },
    {
      name: "usage",
      label: "/usage",
      title: "Usage & Metrics",
      desc: "Monitoramento de consumo de tokens e rate limits de IA",
      badge: "Métricas",
    },
    {
      name: "reload",
      label: "/reload",
      title: "Reload Resources",
      desc: "Recarrega extensões, skills e templates de prompt",
      badge: "Runtime",
    },
    {
      name: "settings",
      label: "/settings",
      title: "Settings",
      desc: "Abre as configurações gerais e de plugins",
      badge: "Sistema",
    },
    {
      name: "theme",
      label: "/theme",
      title: "Toggle Theme",
      desc: "Alterna entre os temas claro e escuro",
      badge: "Visual",
    },
    {
      name: "hotkeys",
      label: "/hotkeys",
      title: "Keyboard Shortcuts",
      desc: "Exibe os atalhos de teclado do sistema",
      badge: "Ajuda",
    },
    {
      name: "help",
      label: "/help",
      title: "Help & Commands",
      desc: "Mostra todos os comandos e atalhos disponíveis",
      badge: "Docs",
    },
    {
      name: "advisor",
      label: "/advisor",
      title: "Toggle Advisor",
      desc: "Ativa ou desativa o consultor autônomo",
      badge: "Agente",
    },
    {
      name: "login",
      label: "/login",
      title: "Configure Auth",
      desc: "Configura chaves de API e autenticação de provedores",
      badge: "Auth",
    },
    {
      name: "logout",
      label: "/logout",
      title: "Logout Auth",
      desc: "Remove credenciais do provedor de IA",
      badge: "Auth",
    },
    {
      name: "exit",
      label: "/exit",
      title: "Archive & Exit",
      desc: "Arquiva a sessão atual e encerra",
      badge: "Sessão",
    },
  ];

  get activeBtwState(): BtwState | undefined {
    return this.btwState || this.cachedBtwState;
  }

  get hasActiveBtw(): boolean {
    return this.isBtwOpen || this._btwState !== undefined;
  }

  get isBtwActive(): boolean {
    return (
      this.isBtwMode ||
      this.value.trim().toLowerCase().startsWith("/btw") ||
      this.hasActiveBtw
    );
  }

  private async fetchDynamicCommands() {
    const now = Date.now();
    if (now - this.commandsFetchTime < 15000 && this.dynamicCommands.length > 0) return;
    if (!this.sessionId || !this.cwd) return;
    try {
      this.commandsFetchTime = now;
      const cmds = await sessionsApi.commands({ id: this.sessionId, cwd: this.cwd }, this.machineId);
      if (Array.isArray(cmds) && cmds.length > 0) {
        this.dynamicCommands = cmds;
        this.requestUpdate();
      }
    } catch {
      // ignore
    }
  }

  get allAvailableSlashCommands(): SlashCommandItem[] {
    const items = [...this.defaultSlashCommands];
    const knownNames = new Set(items.map((i) => i.name));
    for (const cmd of this.dynamicCommands) {
      if (!knownNames.has(cmd.name)) {
        knownNames.add(cmd.name);
        const sourceLabel =
          cmd.source === "skill"
            ? "Skill"
            : cmd.source === "extension"
              ? "Extensão"
              : cmd.source === "prompt"
                ? "Template"
                : "Comando";
        items.push({
          name: cmd.name,
          label: `/${cmd.name}`,
          title: cmd.name.startsWith("skill:") ? cmd.name.slice(6) : cmd.name,
          desc: cmd.description || `Executar ${cmd.name}`,
          badge: sourceLabel,
        });
      }
    }
    return items;
  }

  get filteredSlashCommands(): SlashCommandItem[] {
    const q = this.slashFilter.trim().toLowerCase();
    const all = this.allAvailableSlashCommands;
    if (!q) return all;
    return all.filter(
      (cmd) =>
        cmd.name.toLowerCase().startsWith(q) ||
        cmd.title.toLowerCase().includes(q) ||
        cmd.desc.toLowerCase().includes(q),
    );
  }

  @state() private activeMenu: "create" | "model" | null = null;
  @state() private menuPosition = { left: 0, bottom: 0 };
  @state() private selectedAskOption: string | null = null;

  private readonly defaultProjects: ComposerProject[] = [
    {
      id: "proj-1",
      name: "omp-web",
      path: "~/code/omp-web",
      image: "/static/omplabs/omp-appearance-cover-image-small--2.jpg",
    },
    {
      id: "proj-2",
      name: "oh-my-pi",
      path: "~/code/oh-my-pi",
      image: "/static/omplabs/omp-gaming-cover-image-small.jpg",
    },
    {
      id: "proj-3",
      name: "api-backend",
      path: "~/code/api-backend",
      image: "/static/omplabs/omp-vision-cover-image-small.jpg",
    },
    {
      id: "proj-4",
      name: "ai-memory",
      path: "~/code/ai-memory",
      image: "/static/omplabs/audio-expression-cover-image-small.jpg",
    },
  ];

  private readonly defaultAskOptions: AskOption[] = [
    {
      id: "1",
      title: "Abordagem rápida",
      desc: "Patch direto com menor diff e entrega imediata",
    },
    {
      id: "2",
      title: "Abordagem robusta",
      desc: "Estruturação modular com validações e tratamento de foco",
    },
    {
      id: "3",
      title: "Abordagem passo a passo",
      desc: "Planejamento detalhado em fases com aprovação prévia",
    },
  ];

  protected override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    if (typeof window !== "undefined") {
      window.addEventListener(
        "pointerdown",
        this.handleDocumentPointerDown,
        true,
      );
      window.addEventListener("keydown", this.handleDocumentKeyDown, true);
      window.addEventListener("resize", this.handleWindowResizeOrScroll, {
        passive: true,
      });
      window.addEventListener("scroll", this.handleWindowResizeOrScroll, {
        passive: true,
        capture: true,
      });
      window.addEventListener("omp:set-prompt-text", this.handleSetPromptText);
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (typeof window !== "undefined") {
      window.removeEventListener(
        "pointerdown",
        this.handleDocumentPointerDown,
        true,
      );
      window.removeEventListener("keydown", this.handleDocumentKeyDown, true);
      window.removeEventListener("resize", this.handleWindowResizeOrScroll);
      window.removeEventListener(
        "scroll",
        this.handleWindowResizeOrScroll,
        true,
      );
      window.removeEventListener(
        "omp:set-prompt-text",
        this.handleSetPromptText,
      );
    }
    this.closeMenu();
  }

  private readonly handleSetPromptText = (event: Event): void => {
    const custom = event as CustomEvent<{
      text: string;
      append?: boolean;
      submit?: boolean;
    }>;
    if (typeof custom.detail?.text !== "string") return;
    const newText =
      custom.detail.append && this.value.trim().length > 0
        ? `${this.value}\n${custom.detail.text}`
        : custom.detail.text;
    this.value = newText;
    const textarea = (this.querySelector?.("textarea") as HTMLTextAreaElement | null);
    if (textarea) {
      textarea.value = this.value;
    }
    this.requestUpdate();
    this.adjustTextareaHeight();
    if (
      custom.detail.submit &&
      this.value.trim().length > 0 &&
      !this.isWorking
    ) {
      this.submit();
    }
  };

  protected override firstUpdated() {
    this.adjustTextareaHeight();
  }

  protected override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has("value") || changedProperties.has("compact")) {
      this.adjustTextareaHeight();
    }
    if (typeof document !== "undefined") {
      this.updatePortal();
    }
    if (changedProperties.has("pendingCommand") || changedProperties.has("pendingAsk")) {
      if (this.pendingCommand && this.pendingCommand.options.length > 0) {
        this.isAskOpen = true;
        this.askMode = "options";
        this.askTitle = this.pendingCommand.title;
        this.askOptions = this.pendingCommand.options.map((opt, idx) => ({
          id: String(idx + 1),
          title: opt.label,
          desc: opt.description || "",
          value: opt.value,
        }));
        if (typeof requestAnimationFrame !== "undefined") {
          requestAnimationFrame(() => {
            this.querySelector("textarea")?.focus();
          });
        }
      } else if (this.pendingAsk && this.pendingAsk.questions.length > 0) {
        const q = this.pendingAsk.questions[0];
        this.isAskOpen = true;
        this.askMode = "options";
        this.askTitle = q.question;
        this.askOptions = q.options.map((opt, idx) => ({
          id: String(idx + 1),
          title: opt.label,
          desc: opt.description || "",
        }));
        if (typeof requestAnimationFrame !== "undefined") {
          requestAnimationFrame(() => {
            this.querySelector("textarea")?.focus();
          });
        }
      } else if (!this.pendingAsk && !this.pendingCommand && this.askMode === "options") {
        this.isAskOpen = false;
        this.askOptions = [];
      }
    }
  }

  private handleDocumentPointerDown = (e: PointerEvent) => {
    if (!this.activeMenu) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (
      target.closest("#composer-dropdown-button-menu-contents") ||
      target.closest("#composer-create-button") ||
      target.closest("#composer-chat-mode-smart-button")
    ) {
      return;
    }
    this.closeMenu();
  };

  private handleDocumentKeyDown = (e: KeyboardEvent) => {
    // 0. Escape handler for Active BTW and Slash Menu
    if (e.key === "Escape") {
      if (this.slashCommandsOpen) {
        e.preventDefault();
        e.stopPropagation();
        this.closeSlashMenu();
        return;
      }
      if (this.hasActiveBtw) {
        e.preventDefault();
        e.stopPropagation();
        this.closeBtw();
        return;
      }
      if (this.isBtwMode) {
        e.preventDefault();
        e.stopPropagation();
        this.clearBtwMode();
        return;
      }
    }

    // 1. Hotkeys for Ask Tool
    if (this.isAskOpen) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this.toggleAskTool();
        return;
      }

      if (e.key === "1" || e.key === "2" || e.key === "3") {
        const textarea = this.querySelector(
          "textarea",
        ) as HTMLTextAreaElement | null;
        const isTextarea = document.activeElement === textarea;
        if (!isTextarea || this.value.trim() === "") {
          e.preventDefault();
          e.stopPropagation();
          this.selectAskOption(e.key);
          return;
        }
      }
    }

    // 2. Dropdown menus keyboard navigation
    if (!this.activeMenu) return;

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      const prevMenu = this.activeMenu;
      this.closeMenu();
      const triggerId =
        prevMenu === "create"
          ? "#composer-create-button"
          : "#composer-chat-mode-smart-button";
      (this.querySelector(triggerId) as HTMLElement | null)?.focus();
      return;
    }

    if (e.key === "Tab") {
      this.closeMenu();
      return;
    }

    const portal = document.getElementById("popoverPortal") || document.body;
    const items = Array.from(
      portal.querySelectorAll<HTMLElement>(
        '#composer-dropdown-button-menu-contents [role="menuitem"]:not([disabled])',
      ),
    );
    if (items.length === 0) return;

    const activeEl = document.activeElement as HTMLElement | null;
    const currentIndex = items.indexOf(activeEl!);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      const nextIndex =
        currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
      items[nextIndex]?.focus();
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      const prevIndex =
        currentIndex < 0
          ? items.length - 1
          : (currentIndex - 1 + items.length) % items.length;
      items[prevIndex]?.focus();
      return;
    }

    if (e.key === "Home") {
      e.preventDefault();
      e.stopPropagation();
      items[0]?.focus();
      return;
    }

    if (e.key === "End") {
      e.preventDefault();
      e.stopPropagation();
      items[items.length - 1]?.focus();
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      if (activeEl && items.includes(activeEl)) {
        e.preventDefault();
        e.stopPropagation();
        activeEl.click();
      }
    }
  };

  private handleWindowResizeOrScroll = () => {
    if (this.activeMenu) {
      this.updatePosition();
    }
    this.adjustTextareaHeight();
  };

  public setText(val: string, focus = true): void {
    this.value = val;
    const textarea = this.querySelector?.("textarea") as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.value = val;
      if (focus) {
        textarea.focus();
        textarea.setSelectionRange(val.length, val.length);
      }
      this.adjustTextareaHeight();
    }
    this.requestUpdate();
  }

  public adjustTextareaHeight(): void {
    const textarea = (this.querySelector?.("textarea") as HTMLTextAreaElement | null);
    if (!textarea) return;

    // Temporarily reset height to auto to calculate accurate scrollHeight
    textarea.style.height = "auto";

    if (!textarea.value) {
      textarea.style.height = "";
      textarea.style.overflowY = "hidden";
      return;
    }

    const maxHeight = 280;
    const scrollHeight = textarea.scrollHeight;

    if (scrollHeight > maxHeight) {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = "auto";
    } else {
      textarea.style.height = `${scrollHeight}px`;
      textarea.style.overflowY = "hidden";
    }
  }

  public toggleProjectSelector() {
    if (this.isAskOpen && this.askMode === "projects") {
      this.isAskOpen = false;
    } else {
      this.isAskOpen = true;
      this.askMode = "projects";
    }
    this.requestUpdate();
  }

  public toggleAskTool() {
    if (this.isAskOpen && this.askMode === "options") {
      this.isAskOpen = false;
      if (this.pendingAsk) {
        this.dispatchEvent(
          new CustomEvent("cancel-ask", {
            detail: { requestId: this.pendingAsk.requestId },
            bubbles: true,
            composed: true,
          }),
        );
      }
      if (this.pendingCommand) {
        this.dispatchEvent(
          new CustomEvent("cancel-command", {
            detail: { requestId: this.pendingCommand.requestId },
            bubbles: true,
            composed: true,
          }),
        );
      }
    } else {
      this.isAskOpen = true;
      this.askMode = "options";
    }
    this.selectedAskOption = null;
    this.requestUpdate();
  }

  public selectProjectOption(id: string) {
    this.selectedProjectId = id;
    this.dispatchEvent(
      new CustomEvent("project-select", {
        detail: { projectId: id },
        bubbles: true,
        composed: true,
      }),
    );
    setTimeout(() => {
      this.isAskOpen = false;
      this.requestUpdate();
    }, 180);
  }

  private selectAskOption(id: string) {
    const opt = this.askOptions.find((o) => o.id === id);
    if (!opt) return;

    this.selectedAskOption = id;
    this.value = `[${opt.id}] ${opt.title}`;

    const textarea = this.querySelector?.(
      "textarea",
    ) as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.value = this.value;
    }
    this.requestUpdate();

    setTimeout(() => {
      this.isAskOpen = false;
      this.selectedAskOption = null;
      this.requestUpdate();

      if (this.pendingCommand && this.pendingCommand.options.length > 0) {
        this.dispatchEvent(
          new CustomEvent("submit-command", {
            detail: {
              requestId: this.pendingCommand.requestId,
              value: opt.value || opt.title,
            },
            bubbles: true,
            composed: true,
          }),
        );
        this.value = "";
        if (textarea) textarea.value = "";
        this.adjustTextareaHeight();
        return;
      }

      if (this.pendingAsk && this.pendingAsk.questions.length > 0) {
        const q = this.pendingAsk.questions[0];
        const result: AskDialogResult = {
          kind: "submit",
          results: [
            {
              id: q.id,
              question: q.question,
              options: q.options.map((o) => o.label),
              multi: false,
              selectedOptions: [opt.title],
            },
          ],
        };
        this.dispatchEvent(
          new CustomEvent("submit-ask", {
            detail: { requestId: this.pendingAsk.requestId, result },
            bubbles: true,
            composed: true,
          }),
        );
        this.value = "";
        if (textarea) textarea.value = "";
        this.adjustTextareaHeight();
        return;
      }

      this.dispatchEvent(
        new CustomEvent("ask-select", {
          detail: { id: opt.id, title: opt.title, desc: opt.desc },
          bubbles: true,
          composed: true,
        }),
      );

      requestAnimationFrame(() => {
        textarea?.focus();
      });
    }, 160);
  }

  private closeMenu() {
    if (!this.activeMenu) return;
    this.activeMenu = null;
    const portal = document.getElementById("popoverPortal");
    if (portal) {
      render(nothing, portal);
    }
  }

  private toggleMenu(menu: "create" | "model", selector: string) {
    if (this.activeMenu === menu) {
      this.closeMenu();
      return;
    }

    const btn = this.querySelector(selector) as HTMLElement | null;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const popoverWidth = 260;
      const left = Math.max(
        12,
        Math.min(window.innerWidth - popoverWidth - 12, rect.left),
      );
      const bottom = Math.max(12, window.innerHeight - rect.top + 8);
      this.menuPosition = { left, bottom };
    }
    this.activeMenu = menu;
    this.requestUpdate();
    this.focusFirstMenuItem();
  }

  private focusFirstMenuItem() {
    requestAnimationFrame(() => {
      const portal = document.getElementById("popoverPortal") || document.body;
      const selectedItem = portal.querySelector<HTMLElement>(
        '#composer-dropdown-button-menu-contents [role="menuitem"][data-selected="true"]',
      );
      const firstItem =
        selectedItem ||
        portal.querySelector<HTMLElement>(
          '#composer-dropdown-button-menu-contents [role="menuitem"]:not([disabled])',
        );
      firstItem?.focus();
    });
  }

  private updatePosition() {
    if (!this.activeMenu) return;
    const selector =
      this.activeMenu === "create"
        ? "#composer-create-button"
        : "#composer-chat-mode-smart-button";
    const btn = this.querySelector(selector) as HTMLElement | null;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const popoverWidth = 260;
      const left = Math.max(
        12,
        Math.min(window.innerWidth - popoverWidth - 12, rect.left),
      );
      const bottom = Math.max(12, window.innerHeight - rect.top + 8);
      this.menuPosition = { left, bottom };
      this.updatePortal();
    }
  }

  private getPortalContainer(): HTMLElement {
    let portal = document.getElementById("popoverPortal");
    if (!portal) {
      portal = document.createElement("div");
      portal.id = "popoverPortal";
      document.body.appendChild(portal);
    }
    return portal;
  }

  private selectModel(model: string, role?: string) {
    this.selectedModel = model;
    this.closeMenu();
    this.dispatchEvent(
      new CustomEvent("model-change", {
        detail: { model, role },
        bubbles: true,
        composed: true,
      }),
    );
    (
      this.querySelector(
        "#composer-chat-mode-smart-button",
      ) as HTMLElement | null
    )?.focus();
  }

  private handleOpenModels() {
    this.closeMenu();
    this.dispatchEvent(
      new CustomEvent("open-models", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleCreateAction(action: string) {
    this.closeMenu();
    if (action === "upload") {
      const fileInput = this.querySelector(
        "#composer-file-input",
      ) as HTMLInputElement | null;
      if (fileInput) {
        fileInput.click();
      }
    }
    this.dispatchEvent(
      new CustomEvent("create-action", {
        detail: { action },
        bubbles: true,
        composed: true,
      }),
    );
    (
      this.querySelector("#composer-create-button") as HTMLElement | null
    )?.focus();
  }

  public async addFiles(files: File[]) {
    if (files.length === 0) return;
    this.attachmentError = undefined;
    const { attachments, error } = await capturePromptAttachments(
      files,
      readFileAsBase64,
    );
    if (attachments.length > 0) {
      const newItems: PendingAttachment[] = attachments.map((att) => ({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...att,
      }));
      this.attachments = [...this.attachments, ...newItems];
      this.dispatchEvent(
        new CustomEvent("files-selected", {
          detail: { files, attachments: this.attachments },
          bubbles: true,
          composed: true,
        }),
      );
    }
    if (error) {
      this.attachmentError = error;
    }
    this.requestUpdate();
  }

  public removeAttachment(id: string) {
    this.attachments = this.attachments.filter((a) => a.id !== id);
    if (this.attachments.length === 0) {
      this.attachmentError = undefined;
    }
    this.requestUpdate();
  }

  public clearAttachments() {
    this.attachments = [];
    this.attachmentError = undefined;
    this.requestUpdate();
  }

  private async handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      await this.addFiles(Array.from(input.files));
      input.value = "";
    }
  }

  private async handlePaste(e: ClipboardEvent) {
    const files = e.clipboardData ? Array.from(e.clipboardData.files) : [];
    if (files.length > 0) {
      e.preventDefault();
      await this.addFiles(files);
      return;
    }
    requestAnimationFrame(() => {
      this.adjustTextareaHeight();
    });
  }

  private handleDragOver(e: DragEvent) {
    if (e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files")) {
      e.preventDefault();
      this.isDragOver = true;
    }
  }

  private handleDragLeave(e: DragEvent) {
    e.preventDefault();
    this.isDragOver = false;
  }

  private async handleDrop(e: DragEvent) {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      this.isDragOver = false;
      await this.addFiles(Array.from(e.dataTransfer.files));
    }
  }

  private updatePortal() {
    if (typeof document === "undefined" || !document.body) return;
    const portal = this.getPortalContainer();
    if (!portal || typeof (portal as any).nodeType !== "number") return;
    if (!this.activeMenu) {
      render(nothing, portal);
      return;
    }

    render(this.renderPopover(), portal);
  }

  private renderPopover() {
    if (this.activeMenu === "create") {
      return html`
        <div
          class="composer-dropdown-popover fixed z-[9999] p-1.5 rounded-[20px] shadow-2xl backdrop-blur-2xl backdrop-saturate-200 border border-black/8 dark:border-white/12 transition-all duration-150 animate-in fade-in select-none"
          style="left: ${this.menuPosition.left}px; bottom: ${this.menuPosition.bottom}px; min-width: 250px;"
          role="menu"
          aria-orientation="vertical"
        >
          <div
            id="composer-dropdown-button-menu-contents"
            data-testid="composer-dropdown-button-menu-contents"
            class="flex flex-col gap-0.5"
          >
            <button
              type="button"
              role="menuitem"
              tabindex="0"
              class="group flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus:bg-black/5 dark:focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500/40 active:bg-black/8 dark:active:bg-white/15 cursor-pointer select-none text-left"
              @click=${() => this.handleCreateAction("upload")}
            >
              <div class="composer-dropdown-icon size-5 shrink-0 flex items-center justify-center">
                ${renderPaperclipIcon()}
              </div>
              <div class="grow flex flex-col min-w-0">
                <span class="composer-dropdown-item text-sm font-medium leading-tight">Add photos or files</span>
                <span class="composer-dropdown-desc text-xs font-normal leading-4 mt-0.5">Upload from device</span>
              </div>
            </button>

            <button
              type="button"
              role="menuitem"
              tabindex="0"
              class="group flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus:bg-black/5 dark:focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500/40 active:bg-black/8 dark:active:bg-white/15 cursor-pointer select-none text-left"
              @click=${() => this.handleCreateAction("screenshot")}
            >
              <div class="composer-dropdown-icon size-5 shrink-0 flex items-center justify-center">
                ${renderScreenshotIcon()}
              </div>
              <div class="grow flex flex-col min-w-0">
                <span class="composer-dropdown-item text-sm font-medium leading-tight">Take a screenshot</span>
                <span class="composer-dropdown-desc text-xs font-normal leading-4 mt-0.5">Capture screen or window</span>
              </div>
            </button>

            <button
              type="button"
              role="menuitem"
              tabindex="0"
              class="group flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus:bg-black/5 dark:focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500/40 active:bg-black/8 dark:active:bg-white/15 cursor-pointer select-none text-left"
              @click=${() => this.handleCreateAction("onedrive")}
            >
              <div class="composer-dropdown-icon size-5 shrink-0 flex items-center justify-center">
                ${renderOneDriveIcon()}
              </div>
              <div class="grow flex flex-col min-w-0">
                <span class="composer-dropdown-item text-sm font-medium leading-tight">Add from OneDrive</span>
                <span class="composer-dropdown-desc text-xs font-normal leading-4 mt-0.5">Cloud drive storage</span>
              </div>
            </button>

            <button
              type="button"
              role="menuitem"
              tabindex="0"
              class="group flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus:bg-black/5 dark:focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500/40 active:bg-black/8 dark:active:bg-white/15 cursor-pointer select-none text-left"
              @click=${() => this.handleCreateAction("gdrive")}
            >
              <div class="composer-dropdown-icon size-5 shrink-0 flex items-center justify-center">
                ${renderGoogleDriveIcon()}
              </div>
              <div class="grow flex flex-col min-w-0">
                <span class="composer-dropdown-item text-sm font-medium leading-tight">Add from Google Drive</span>
                <span class="composer-dropdown-desc text-xs font-normal leading-4 mt-0.5">Cloud files</span>
              </div>
            </button>

            <div class="my-1 border-t border-black/8 dark:border-white/10"></div>

            <button
              type="button"
              role="menuitem"
              tabindex="0"
              class="group flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus:bg-black/5 dark:focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500/40 active:bg-black/8 dark:active:bg-white/15 cursor-pointer select-none text-left"
              @click=${() => this.handleCreateAction("create-image")}
            >
              <div class="composer-dropdown-icon size-5 shrink-0 flex items-center justify-center">
                ${renderSparklesIcon()}
              </div>
              <div class="grow flex flex-col min-w-0">
                <span class="composer-dropdown-item text-sm font-medium leading-tight">Create an image</span>
                <span class="composer-dropdown-desc text-xs font-normal leading-4 mt-0.5">Generate visual art</span>
              </div>
            </button>

            <button
              type="button"
              role="menuitem"
              tabindex="0"
              class="group flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus:bg-black/5 dark:focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500/40 active:bg-black/8 dark:active:bg-white/15 cursor-pointer select-none text-left"
              @click=${() => this.handleCreateAction("web-page")}
            >
              <div class="composer-dropdown-icon size-5 shrink-0 flex items-center justify-center">
                ${renderWebPageIcon()}
              </div>
              <div class="grow flex flex-col min-w-0">
                <span class="composer-dropdown-item text-sm font-medium leading-tight">Web page</span>
                <span class="composer-dropdown-desc text-xs font-normal leading-4 mt-0.5">Build an interactive page</span>
              </div>
            </button>
          </div>
        </div>
      `;
    }

    if (this.activeMenu === "model") {
      return html`
        <div
          class="composer-dropdown-popover fixed z-[9999] p-1.5 rounded-[20px] shadow-2xl backdrop-blur-2xl backdrop-saturate-200 border border-black/8 dark:border-white/12 transition-all duration-150 animate-in fade-in select-none"
          style="left: ${this.menuPosition.left}px; bottom: ${this.menuPosition.bottom}px; min-width: 260px;"
          role="menu"
          aria-orientation="vertical"
        >
          <div
            id="composer-dropdown-button-menu-contents"
            data-testid="composer-dropdown-button-menu-contents"
            class="flex flex-col gap-0.5"
          >
            <button
              type="button"
              role="menuitem"
              tabindex="0"
              data-selected=${this.selectedModel === "Fast" ? "true" : "false"}
              class="group flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus:bg-black/5 dark:focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500/40 active:bg-black/8 dark:active:bg-white/15 cursor-pointer select-none text-left ${this.selectedModel === "Fast" ? "bg-black/5 dark:bg-white/10" : ""}"
              @click=${() => this.selectModel("Fast", "smol")}
            >
              <div class="composer-dropdown-icon size-5 shrink-0 flex items-center justify-center ${this.selectedModel === "Fast" ? "!text-amber-500" : "text-amber-500"}">
                ${renderBoltIcon()}
              </div>
              <div class="grow flex flex-col min-w-0">
                <span class="composer-dropdown-item text-sm font-medium leading-tight ${this.selectedModel === "Fast" ? "!text-amber-600 dark:!text-amber-400 font-semibold" : ""}">Fast</span>
                <span class="composer-dropdown-desc text-xs font-normal leading-4 mt-0.5">Execução rápida para tarefas do dia a dia</span>
              </div>
              ${this.selectedModel === "Fast" ? renderCheckIcon("size-4 text-amber-500 shrink-0") : nothing}
            </button>

            <button
              type="button"
              role="menuitem"
              tabindex="0"
              data-selected=${this.selectedModel === "Thinking" ? "true" : "false"}
              class="group flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus:bg-black/5 dark:focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500/40 active:bg-black/8 dark:active:bg-white/15 cursor-pointer select-none text-left ${this.selectedModel === "Thinking" ? "bg-black/5 dark:bg-white/10" : ""}"
              @click=${() => this.selectModel("Thinking", "slow")}
            >
              <div class="composer-dropdown-icon size-5 shrink-0 flex items-center justify-center ${this.selectedModel === "Thinking" ? "!text-blue-500" : "text-blue-500"}">
                ${renderBrainIcon()}
              </div>
              <div class="grow flex flex-col min-w-0">
                <span class="composer-dropdown-item text-sm font-medium leading-tight ${this.selectedModel === "Thinking" ? "!text-blue-600 dark:!text-blue-400 font-semibold" : ""}">Thinking</span>
                <span class="composer-dropdown-desc text-xs font-normal leading-4 mt-0.5">Raciocínio profundo e arquitetura</span>
              </div>
              ${this.selectedModel === "Thinking" ? renderCheckIcon("size-4 text-blue-500 shrink-0") : nothing}
            </button>

            <button
              type="button"
              role="menuitem"
              tabindex="0"
              data-selected=${this.selectedModel === "Smol" ? "true" : "false"}
              class="group flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus:bg-black/5 dark:focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500/40 active:bg-black/8 dark:active:bg-white/15 cursor-pointer select-none text-left ${this.selectedModel === "Smol" ? "bg-black/5 dark:bg-white/10" : ""}"
              @click=${() => this.selectModel("Smol", "tiny")}
            >
              <div class="composer-dropdown-icon size-5 shrink-0 flex items-center justify-center ${this.selectedModel === "Smol" ? "!text-purple-500" : "text-purple-500"}">
                ${renderFeatherIcon()}
              </div>
              <div class="grow flex flex-col min-w-0">
                <span class="composer-dropdown-item text-sm font-medium leading-tight ${this.selectedModel === "Smol" ? "!text-purple-600 dark:!text-purple-400 font-semibold" : ""}">Smol</span>
                <span class="composer-dropdown-desc text-xs font-normal leading-4 mt-0.5">Modelo leve e compacto</span>
              </div>
              ${this.selectedModel === "Smol" ? renderCheckIcon("size-4 text-purple-500 shrink-0") : nothing}
            </button>

            <div class="my-1 h-px bg-black/10 dark:bg-white/10"></div>

            <!-- Option to view all models -->
            <button
              type="button"
              role="menuitem"
              tabindex="0"
              class="group flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus:bg-black/5 dark:focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500/40 cursor-pointer select-none text-left text-blue-600 dark:text-blue-400"
              @click=${() => this.handleOpenModels()}
            >
              <div class="size-5 shrink-0 flex items-center justify-center">
                ${renderModelsIcon("size-4")}
              </div>
              <div class="grow flex flex-col min-w-0">
                <span class="text-sm font-semibold leading-tight">Ver todos os modelos...</span>
                <span class="text-xs text-foreground-500 font-normal leading-4 mt-0.5">Explorar catálogo completo de modelos e provedores</span>
              </div>
              <svg class="size-4 shrink-0 text-foreground-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>
      `;
    }

    return nothing;
  }

  public toggleBtwMode() {
    if (this.hasActiveBtw) {
      this.closeBtw();
      return;
    }
    if (this.isBtwActive) {
      this.clearBtwMode();
    } else {
      this.isBtwMode = true;
      this.isAskOpen = false;
      this.requestUpdate();
      if (typeof requestAnimationFrame !== "undefined") {
        requestAnimationFrame(() => {
          const textarea = this.querySelector?.(
            "textarea",
          ) as HTMLTextAreaElement | null;
          textarea?.focus();
        });
      }
    }
  }

  public clearBtwMode() {
    this.isBtwMode = false;
    if (this.value.toLowerCase().startsWith("/btw")) {
      this.value = this.value.replace(/^\/btw\s*/i, "");
      const textarea = this.querySelector?.(
        "textarea",
      ) as HTMLTextAreaElement | null;
      if (textarea) textarea.value = this.value;
    }
    this.adjustTextareaHeight();
    this.requestUpdate();
  }

  public openFileMenu(trigger: { from: number; to: number; query: string }) {
    this.fileTrigger = trigger;
    this.fileMenuOpen = true;
    this.selectedFileIndex = 0;
    void this.fetchFileSuggestions(trigger.query);
  }

  public closeFileMenu() {
    if (!this.fileMenuOpen) return;
    this.fileMenuOpen = false;
    this.fileSuggestions = [];
    this.fileTrigger = undefined;
    this.selectedFileIndex = 0;
    this.requestUpdate();
  }

  private async fetchFileSuggestions(query: string) {
    if (!this.cwd) return;
    try {
      const files = await filesApi.files(this.cwd, query, {
        machineId: this.machineId,
        projectId: this.selectedProjectId,
      });
      if (Array.isArray(files)) {
        this.fileSuggestions = files.slice(0, 15);
        this.selectedFileIndex = 0;
        this.requestUpdate();
      }
    } catch {
      this.fileSuggestions = [];
    }
  }

  public selectFileSuggestion(file: FileSuggestion) {
    if (!this.fileTrigger) return;
    const insertText = fileCompletionInsertText(file.path, false);
    const before = this.value.slice(0, this.fileTrigger.from);
    const after = this.value.slice(this.fileTrigger.to);
    this.value = `${before}${insertText} ${after}`;
    this.closeFileMenu();

    const textarea = this.querySelector?.("textarea") as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.value = this.value;
      const cursorPos = (before + insertText + " ").length;
      textarea.focus();
      textarea.setSelectionRange(cursorPos, cursorPos);
      this.adjustTextareaHeight();
    }
    this.requestUpdate();
  }

  public clearShellMode() {
    this.isShellMode = false;
    if (this.value.trim().startsWith("!")) {
      this.value = this.value.replace(/^!+ */, "");
      const textarea = typeof this.querySelector === "function" ? (this.querySelector("textarea") as HTMLTextAreaElement | null) : null;
      if (textarea) textarea.value = this.value;
      this.adjustTextareaHeight();
    }
    this.requestUpdate();
  }

  public openSlashMenu(query = "") {
    void this.fetchDynamicCommands();
    this.slashCommandsOpen = true;
    this.slashFilter = query;
    this.selectedSlashIndex = 0;
    this.requestUpdate();
  }

  public closeSlashMenu() {
    if (!this.slashCommandsOpen) return;
    this.slashCommandsOpen = false;
    this.slashFilter = "";
    this.selectedSlashIndex = 0;
    this.requestUpdate();
  }

  public selectSlashCommand(name: string) {
    if (name === "btw") {
      this.value = "/btw ";
      this.isBtwMode = true;
      this.closeSlashMenu();
      const textarea = this.querySelector?.(
        "textarea",
      ) as HTMLTextAreaElement | null;
      if (textarea) {
        textarea.value = this.value;
        textarea.focus?.();
        textarea.setSelectionRange?.(this.value.length, this.value.length);
        this.adjustTextareaHeight();
      }
      this.requestUpdate();
      return;
    }

    if (name === "model") {
      this.value = "";
      this.closeSlashMenu();
      const textarea = this.querySelector?.(
        "textarea",
      ) as HTMLTextAreaElement | null;
      if (textarea) textarea.value = "";
      this.toggleMenu("model", "#composer-chat-mode-smart-button");
      return;
    }

    if (name === "settings" || name === "theme" || name === "clear" || name === "new" || name === "plan-review" || name === "terminal" || name === "files" || name === "usage") {
      this.value = `/${name}`;
      this.closeSlashMenu();
      this.submit();
      return;
    }

    this.value = `/${name} `;
    this.closeSlashMenu();
    const textarea = this.querySelector(
      "textarea",
    ) as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.value = this.value;
      textarea.focus();
      textarea.setSelectionRange(this.value.length, this.value.length);
      this.adjustTextareaHeight();
    }
    this.requestUpdate();
  }

  public async handleCopyBtw(): Promise<void> {
    const ans = this.activeBtwState?.answer;
    if (!ans) return;
    try {
      await navigator.clipboard.writeText(ans);
      this.btwCopied = true;
      this.requestUpdate();
      setTimeout(() => {
        this.btwCopied = false;
        this.requestUpdate();
      }, 2000);
    } catch {
      // ignore
    }
  }

  public handleBranchBtw(): void {
    if (!this.activeBtwState) return;
    this.btwBranching = true;
    this.requestUpdate();

    this.dispatchEvent(
      new CustomEvent("branch-btw", {
        detail: { state: this.activeBtwState },
        bubbles: true,
        composed: true,
      }),
    );

    this.dispatchEvent(
      new CustomEvent<SubmitPromptDetail>("submit-prompt", {
        detail: {
          prompt: "/btw branch",
          model: this.selectedModel,
          projectId: this.selectedProjectId,
        },
        bubbles: true,
        composed: true,
      }),
    );

    void this.onBranchBtw?.();

    setTimeout(() => {
      this.btwBranching = false;
      this.closeBtw();
    }, 400);
  }

  public closeBtw(): void {
    if (!this.isBtwOpen && !this._btwState && !this.cachedBtwState) return;
    this.isBtwOpen = false;
    this.isBtwMode = false;
    this._btwState = undefined;
    this.dispatchEvent(
      new CustomEvent("close-btw", {
        bubbles: true,
        composed: true,
      }),
    );
    this.onCloseBtw?.();
    if (this.isConnected) {
      this.requestUpdate();
    }
    setTimeout(() => {
      if (!this.isBtwOpen) {
        this.cachedBtwState = undefined;
        if (this.isConnected) this.requestUpdate();
      }
    }, 460);
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(() => {
        const textarea = this.querySelector?.(
          "textarea",
        ) as HTMLTextAreaElement | null;
        textarea?.focus();
      });
    }
  }

  private handleInput(e: Event) {
    const val = (e.target as HTMLTextAreaElement).value;
    this.value = val;
    this.adjustTextareaHeight();

    this.isShellMode = isShellInput(val);

    if (val.startsWith("/") && !val.includes("\n")) {
      const parts = val.slice(1).split(/\s+/);
      if (parts.length <= 1) {
        this.closeFileMenu();
        this.openSlashMenu(parts[0].toLowerCase());
      } else {
        this.closeSlashMenu();
      }
    } else {
      this.closeSlashMenu();
    }

    const fileTrigger = detectPromptCompletionTrigger(val);
    if (fileTrigger && fileTrigger.kind === "file") {
      this.closeSlashMenu();
      this.openFileMenu(fileTrigger);
    } else {
      this.closeFileMenu();
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Shift") {
      this.explicitShiftKeyActive = true;
      return;
    }
    if (this.slashCommandsOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const len = this.filteredSlashCommands.length;
        if (len > 0) {
          this.selectedSlashIndex = (this.selectedSlashIndex + 1) % len;
          this.requestUpdate();
        }
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const len = this.filteredSlashCommands.length;
        if (len > 0) {
          this.selectedSlashIndex = (this.selectedSlashIndex - 1 + len) % len;
          this.requestUpdate();
        }
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const cmd = this.filteredSlashCommands[this.selectedSlashIndex];
        if (cmd) {
          this.selectSlashCommand(cmd.name);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        this.closeSlashMenu();
        return;
      }
    }

    if (this.fileMenuOpen && this.fileSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        this.selectedFileIndex = (this.selectedFileIndex + 1) % this.fileSuggestions.length;
        this.requestUpdate();
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        this.selectedFileIndex = (this.selectedFileIndex - 1 + this.fileSuggestions.length) % this.fileSuggestions.length;
        this.requestUpdate();
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const file = this.fileSuggestions[this.selectedFileIndex];
        if (file) {
          this.selectFileSuggestion(file);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        this.closeFileMenu();
        return;
      }
    }

    if (this.hasActiveBtw && e.key === "Escape") {
      e.preventDefault();
      this.closeBtw();
      return;
    }

    if (this.isBtwMode && e.key === "Escape" && this.value.trim() === "") {
      e.preventDefault();
      this.clearBtwMode();
      return;
    }

    if (e.key === "Enter") {
      if (e.defaultPrevented || e.isComposing) return;
      const shiftKey = shouldUsePromptEnterShiftShortcut(
        e.shiftKey,
        this.explicitShiftKeyActive,
        this.promptEnterMedia,
      );
      this.explicitShiftKeyActive = false;

      if (
        shouldSendPromptOnEnterShortcut(
          shiftKey,
          this.promptEnterMedia,
          readPromptEnterPreference(),
        )
      ) {
        e.preventDefault();
        this.submit();
      }
    } else {
      this.explicitShiftKeyActive = false;
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    if (e.key === "Shift") {
      this.explicitShiftKeyActive = false;
    }
  }

  private handleBlur() {
    this.explicitShiftKeyActive = false;
  }

  private submit(streamingBehavior?: "steer" | "followUp") {
    const rawText = this.value.trim();
    if (!rawText && this.attachments.length === 0) return;
    const behavior = streamingBehavior ?? (this.isWorking ? "followUp" : undefined);
    if (this.isWorking && !this.pendingAsk && !this.pendingCommand && !behavior) return;
    this.closeMenu();
    this.closeSlashMenu();

    if (this.pendingCommand && this.pendingCommand.options.length > 0) {
      const matched = this.askOptions.find(
        (o) =>
          o.title.toLowerCase() === rawText.toLowerCase() ||
          `[${o.id}] ${o.title}`.toLowerCase() === rawText.toLowerCase() ||
          o.id === rawText ||
          o.value === rawText,
      );
      const chosenValue = matched ? (matched.value || matched.title) : rawText;

      this.dispatchEvent(
        new CustomEvent("submit-command", {
          detail: { requestId: this.pendingCommand.requestId, value: chosenValue },
          bubbles: true,
          composed: true,
        }),
      );

      this.value = "";
      this.isAskOpen = false;
      const textarea = (this.querySelector?.("textarea") as HTMLTextAreaElement | null);
      if (textarea) textarea.value = "";
      this.adjustTextareaHeight();
      this.requestUpdate();
      return;
    }

    if (this.pendingAsk && this.pendingAsk.questions.length > 0) {
      const q = this.pendingAsk.questions[0];
      const matched = this.askOptions.find(
        (o) =>
          o.title.toLowerCase() === rawText.toLowerCase() ||
          `[${o.id}] ${o.title}`.toLowerCase() === rawText.toLowerCase() ||
          o.id === rawText,
      );
      const selectedOptions = matched ? [matched.title] : [];
      const customInput = matched ? undefined : rawText;

      const result: AskDialogResult = {
        kind: "submit",
        results: [
          {
            id: q.id,
            question: q.question,
            options: q.options.map((o) => o.label),
            multi: false,
            selectedOptions,
            ...(customInput ? { customInput } : {}),
          },
        ],
      };

      this.dispatchEvent(
        new CustomEvent("submit-ask", {
          detail: { requestId: this.pendingAsk.requestId, result },
          bubbles: true,
          composed: true,
        }),
      );

      this.value = "";
      this.isAskOpen = false;
      const textarea = (this.querySelector?.("textarea") as HTMLTextAreaElement | null);
      if (textarea) textarea.value = "";
      this.adjustTextareaHeight();
      this.requestUpdate();
      return;
    }

    const attachments =
      this.attachments.length > 0
        ? this.attachments.map(pendingToPromptAttachment)
        : undefined;

    const isBtw = this.isBtwMode || rawText.toLowerCase().startsWith("/btw");
    let prompt = rawText;
    let btwQuestion = "";

    if (isBtw) {
      if (rawText.toLowerCase().startsWith("/btw")) {
        btwQuestion = rawText.replace(/^\/btw\s*/i, "").trim();
        prompt = rawText;
      } else {
        btwQuestion = rawText;
        prompt = `/btw ${rawText}`;
      }
    }

    if (isBtw && btwQuestion) {
      this.dispatchEvent(
        new CustomEvent("submit-btw", {
          detail: { question: btwQuestion, prompt },
          bubbles: true,
          composed: true,
        }),
      );
      this.dispatchEvent(
        new CustomEvent<SubmitPromptDetail>("submit-prompt", {
          detail: {
            prompt,
            model: this.selectedModel,
            projectId: this.selectedProjectId,
            attachments,
          },
          bubbles: true,
          composed: true,
        }),
      );
      this.value = "";
      this.attachments = [];
      this.attachmentError = undefined;
      this.isBtwMode = false;
      this.isWorking = true;
      const textarea = (this.querySelector?.("textarea") as HTMLTextAreaElement | null);
      if (textarea) textarea.value = "";
      this.adjustTextareaHeight();
      this.requestUpdate();
      return;
    }

    this.dispatchEvent(
      new CustomEvent<SubmitPromptDetail>("submit-prompt", {
        detail: {
          prompt: rawText,
          model: this.selectedModel,
          projectId: this.selectedProjectId,
          attachments,
          streamingBehavior: behavior,
        },
        bubbles: true,
        composed: true,
      }),
    );
    this.value = "";
    this.attachments = [];
    this.attachmentError = undefined;
    if (!isInstantClientCommand(rawText)) {
      this.isWorking = true;
    }
    const textarea = (this.querySelector?.("textarea") as HTMLTextAreaElement | null);
    if (textarea) textarea.value = "";
    this.adjustTextareaHeight();
    this.requestUpdate();
  }

  private renderBtwContent() {
    if (!this.activeBtwState) return nothing;
    const activeBtw = this.activeBtwState;
    const isRunning = activeBtw.status === "running";
    const isError = activeBtw.status === "error";

    return html`
      <div class="px-3.5 pt-3 pb-2 flex flex-col pointer-events-auto font-sans" data-testid="composer-btw-card">
        <!-- Header row with Question directly at top -->
        <div class="flex items-center justify-between gap-3 pb-2 border-b border-black/5 dark:border-white/5">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <div class="size-6 rounded-lg bg-amber-500/15 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0">
              ${renderLightbulbIcon("size-3.5")}
            </div>
            <span class="text-sm font-semibold text-foreground-900 truncate leading-snug" title="${activeBtw.question}">
              ${activeBtw.question}
            </span>
            ${
              isRunning
                ? html`
                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse shrink-0">
                  <span class="size-1.5 rounded-full bg-amber-500 animate-ping"></span>Pensando…
                </span>
              `
                : nothing
            }
          </div>

          <button
            type="button"
            title="Fechar"
            aria-label="Fechar pergunta lateral"
            class="rounded-full text-foreground-600 hover:text-foreground-900 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer text-xs p-1 shrink-0"
            @click=${(e: MouseEvent) => {
              e.stopPropagation();
              this.closeBtw();
            }}
          >
            ✕
          </button>
        </div>

        <!-- Answer takes the full space -->
        <div class="mt-2.5 max-h-64 overflow-y-auto scrollbar-stable px-1 text-xs sm:text-sm text-foreground-900 leading-relaxed break-words select-text">
          ${
            isRunning && !activeBtw.answer
              ? html`
              <div class="flex items-center gap-2 py-2 text-foreground-500 text-xs italic">
                <span class="size-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span>Pensando com o contexto da sessão…</span>
              </div>
            `
              : nothing
          }
          ${
            activeBtw.answer
              ? html`<div class="whitespace-pre-wrap">${activeBtw.answer}</div>`
              : nothing
          }
          ${
            isError
              ? html`<div class="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs">${activeBtw.error || "Falha ao responder pergunta lateral."}</div>`
              : nothing
          }
        </div>

        <!-- Footer actions without last divider -->
        <div class="flex items-center justify-end gap-2 pt-2 mt-0.5">
          ${
            activeBtw.answer
              ? html`
              <button
                type="button"
                class="px-2.5 py-1 rounded-xl text-xs font-semibold bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-foreground-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                @click=${() => this.handleCopyBtw()}
              >
                ${this.btwCopied ? renderCheckIcon("size-3.5 text-emerald-500") : nothing}
                <span>${this.btwCopied ? "Copiado!" : "Copiar"}</span>
              </button>
            `
              : nothing
          }
          ${
            activeBtw.canBranch !== false && activeBtw.status === "complete"
              ? html`
              <button
                type="button"
                class="px-2.5 py-1 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                ?disabled=${this.btwBranching}
                @click=${() => this.handleBranchBtw()}
              >
                ${renderBranchIcon("size-3.5")}
                <span>${this.btwBranching ? "Criando branch…" : "Branch para Sessão"}</span>
              </button>
            `
              : nothing
          }
        </div>
      </div>
    `;
  }

  private renderAskToolContent() {
    const projectsList =
      this.projects.length > 0 ? this.projects : this.defaultProjects;
    const currentProject =
      projectsList.find((p) => p.id === this.selectedProjectId) ??
      projectsList[0];
    const optionsToUse =
      this.askOptions.length > 0 ? this.askOptions : this.defaultAskOptions;

    return html`
      <style>
        .composer-dropdown-popover {
          background-color: var(--omp-surface-popover) !important;
          color: var(--omp-text-primary) !important;
          border: 1px solid var(--omp-popover-border) !important;
        }

        .composer-dropdown-popover [role="menuitem"],
        .composer-dropdown-popover .composer-dropdown-item {
          color: var(--omp-text-primary) !important;
        }

        .composer-dropdown-popover .composer-dropdown-desc {
          color: var(--omp-text-secondary) !important;
        }


        .composer-btw-expander {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 460ms linear(0, 0.22 8%, 0.6 18%, 0.94 30%, 1.07 40%, 1.05 48%, 1 60%, 0.99 74%, 1);
          overflow: hidden;
        }
        .composer-btw-expander.open {
          grid-template-rows: 1fr;
        }
        .composer-btw-inner {
          min-height: 0;
          overflow: hidden;
        }
        .composer-btw-expander:not(.open) [data-testid="composer-btw-card"] {
          opacity: 0;
          transform: translateY(-6px);
          transition: opacity 220ms ease-out, transform 240ms ease-out;
        }
        .composer-btw-expander.open [data-testid="composer-btw-card"] {
          opacity: 1;
          transform: translateY(0);
          transition: opacity 220ms ease-out, transform 240ms ease-out;
        }
        .composer-ask-expander {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 460ms linear(0, 0.22 8%, 0.6 18%, 0.94 30%, 1.07 40%, 1.05 48%, 1 60%, 0.99 74%, 1);
          overflow: hidden;
        }
        .composer-ask-expander.open {
          grid-template-rows: 1fr;
        }
        .composer-ask-inner {
          min-height: 0;
          overflow: hidden;
        }
        .composer-ask-expander.open .composer-ask-header {
          animation: ask-item-reveal 260ms cubic-bezier(0.16, 1, 0.3, 1) 180ms both;
        }
        .composer-ask-expander.open .composer-ask-item-1 {
          animation: ask-item-reveal 260ms cubic-bezier(0.16, 1, 0.3, 1) 220ms both;
        }
        .composer-ask-expander.open .composer-ask-item-2 {
          animation: ask-item-reveal 260ms cubic-bezier(0.16, 1, 0.3, 1) 270ms both;
        }
        .composer-ask-expander.open .composer-ask-item-3 {
          animation: ask-item-reveal 260ms cubic-bezier(0.16, 1, 0.3, 1) 320ms both;
        }
        .composer-ask-expander.open .composer-ask-item-4 {
          animation: ask-item-reveal 260ms cubic-bezier(0.16, 1, 0.3, 1) 370ms both;
        }
        .composer-ask-expander:not(.open) .composer-ask-header,
        .composer-ask-expander:not(.open) .composer-ask-item {
          opacity: 0;
          transform: translateY(-4px);
          transition: opacity 120ms linear, transform 120ms linear;
        }
        @keyframes ask-item-reveal {
          0% {
            opacity: 0;
            transform: translateY(12px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      </style>
      <div class="px-3.5 pt-3 pb-1 flex flex-col pointer-events-auto font-sans">
        <!-- Header row -->
        <div class="composer-ask-header px-1 pb-2">
          <div class="flex items-center justify-between">
            <div class="text-sm font-bold text-foreground-900 leading-snug flex items-center gap-2">
              ${this.askMode === "projects" ? renderFolderIcon("size-4 text-foreground-700") : nothing}
              <span>
                ${this.askMode === "projects" ? "Selecione o projeto para esta sessão" : this.askTitle}
              </span>
            </div>

            <button
              type="button"
              title="Fechar"
              aria-label="Fechar opções"
              class="rounded-full text-foreground-600 hover:text-foreground-900 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer pointer-events-auto text-xs p-1"
              @click=${(e: MouseEvent) => {
                e.stopPropagation();
                this.isAskOpen = false;
                if (this.pendingAsk) {
                  this.dispatchEvent(
                    new CustomEvent("cancel-ask", {
                      detail: { requestId: this.pendingAsk.requestId },
                      bubbles: true,
                      composed: true,
                    }),
                  );
                }
                if (this.pendingCommand) {
                  this.dispatchEvent(
                    new CustomEvent("cancel-command", {
                      detail: { requestId: this.pendingCommand.requestId },
                      bubbles: true,
                      composed: true,
                    }),
                  );
                }
                this.requestUpdate();
              }}
            >
              ✕
            </button>
          </div>
        </div>

        ${
          this.askMode === "projects"
            ? html`
            <!-- Lista de Projetos Estilo Ask Tool (1, 2, 3...) -->
            <div class="flex flex-col gap-1.5" role="radiogroup" aria-label="Projetos disponíveis">
              ${projectsList.map((proj, idx) => {
                const isSelected = this.selectedProjectId === proj.id;
                return html`
                  <button
                    type="button"
                    role="radio"
                    aria-checked="${isSelected}"
                    class="composer-ask-item composer-ask-item-${idx + 1} pointer-events-auto cursor-pointer group flex items-center justify-between w-full px-3 py-2 sm:py-2.5 rounded-2xl text-left transition-all duration-150 border ${
                      isSelected
                        ? "!bg-blue-500/15 !border-blue-500/40 text-blue-600 dark:text-blue-400 font-semibold"
                        : "border-black/5 dark:border-white/10 hover:border-blue-500/30 bg-black/[0.02] dark:bg-white/[0.04] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-foreground-900"
                    } active:scale-[0.99]"
                    @click=${(e: MouseEvent) => {
                      e.stopPropagation();
                      this.selectProjectOption(proj.id);
                    }}
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="relative size-9 shrink-0 overflow-hidden rounded-xl bg-black/8 dark:bg-white/10 border border-black/10 dark:border-white/10 shadow-xs">
                        ${
                          proj.image
                            ? html`<img src="${proj.image}" alt="${proj.name}" class="size-full object-cover block" />`
                            : html`<div class="size-full flex items-center justify-center">${renderFolderIcon("size-4 text-foreground-700")}</div>`
                        }
                      </div>
                      <div class="min-w-0 flex flex-col">
                        <span class="text-sm font-bold leading-tight truncate">
                          ${proj.name}
                        </span>
                        <span class="text-xs opacity-65 leading-tight mt-0.5 font-mono">
                          ${proj.path || "~/code/" + proj.name}
                        </span>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0 ps-2">
                      ${isSelected ? renderCheckIcon("size-4 text-blue-600 dark:text-blue-400") : html`<span class="text-xs font-semibold text-foreground-400 opacity-0 group-hover:opacity-100 transition-opacity">Selecionar</span>`}
                    </div>
                  </button>
                `;
              })}
            </div>
          `
            : html`
            <!-- Lista de Opções Tradicionais Ask Tool -->
            <div class="flex flex-col gap-1.5" role="radiogroup" aria-label="Opções do OMP">
              ${optionsToUse.map((opt, idx) => {
                const isSelected = this.selectedAskOption === opt.id;
                return html`
                  <button
                    type="button"
                    role="radio"
                    aria-checked="${isSelected}"
                    class="composer-ask-item composer-ask-item-${idx + 1} pointer-events-auto cursor-pointer group flex items-center justify-between w-full px-3 py-2 sm:py-2.5 rounded-2xl text-left transition-all duration-150 border border-black/5 dark:border-white/10 hover:border-blue-500/30 dark:hover:border-blue-500/40 bg-black/[0.02] dark:bg-white/[0.04] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] active:scale-[0.99] ${
                      isSelected
                        ? "!bg-blue-500/15 !border-blue-500/40 text-blue-600 dark:text-blue-400 font-semibold"
                        : "text-foreground-900"
                    }"
                    @click=${(e: MouseEvent) => {
                      e.stopPropagation();
                      this.selectAskOption(opt.id);
                    }}
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      <span
                        class="grid size-6 shrink-0 place-items-center rounded-xl bg-black/8 dark:bg-white/10 font-mono text-xs font-bold text-foreground-800 transition-colors group-hover:bg-blue-600 group-hover:text-white ${
                          isSelected ? "!bg-blue-600 !text-white" : ""
                        }"
                      >
                        ${opt.id}
                      </span>
                      <div class="min-w-0 flex flex-col">
                        <span class="text-sm font-medium leading-tight truncate">
                          ${opt.title}
                        </span>
                        <span class="text-xs opacity-65 leading-tight mt-0.5 font-normal">
                          ${opt.desc}
                        </span>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0 ps-2">
                      ${isSelected ? renderCheckIcon("size-4 text-blue-600 dark:text-blue-400") : nothing}
                    </div>
                  </button>
                `;
              })}
            </div>
          `
        }
      </div>
    `;
  }

  private renderPendingAttachments() {
    if (this.attachments.length === 0 && !this.attachmentError) return nothing;

    return html`
      <div
        class="flex flex-wrap items-center gap-2 pb-2.5 mb-1.5 border-b border-black/5 dark:border-white/5 animate-in fade-in"
        aria-label="Anexos pendentes"
        data-testid="composer-pending-attachments"
      >
        ${this.attachments.map((att) => {
          const isImg = att.kind === "image";
          return html`
            <div
              class="group relative flex items-center gap-2 rounded-2xl p-1.5 transition-all select-none border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
              title="${att.name}"
              data-testid="attachment-chip"
            >
              ${
                isImg
                  ? html`
                    <div class="relative size-12 shrink-0 overflow-hidden rounded-xl bg-black/10 dark:bg-white/10">
                      <img
                        src="data:${att.mimeType};base64,${att.data}"
                        alt="${att.name}"
                        class="size-full object-cover block"
                      />
                    </div>
                  `
                  : html`
                    <div class="flex items-center justify-center size-9 shrink-0 rounded-xl bg-black/8 dark:bg-white/10 text-foreground-700">
                      ${renderPaperclipIcon("size-4")}
                    </div>
                  `
              }
              <div class="flex flex-col min-w-0 max-w-[130px] pr-5">
                <span class="text-xs font-semibold text-foreground-800 truncate leading-tight">
                  ${att.name}
                </span>
                <span class="text-[10px] text-foreground-500 font-mono leading-tight mt-0.5">
                  ${formatFileSize(att.size)}
                </span>
              </div>
              <button
                type="button"
                aria-label="Remover anexo ${att.name}"
                title="Remover anexo"
                class="absolute top-1 right-1 size-5 rounded-full bg-black/10 dark:bg-white/20 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 text-foreground-600 flex items-center justify-center transition-colors cursor-pointer"
                @click=${(e: Event) => {
                  e.stopPropagation();
                  this.removeAttachment(att.id);
                }}
              >
                ${renderCloseIcon("size-3")}
              </button>
            </div>
          `;
        })}
        ${this.attachmentError
          ? html`<div class="text-xs text-red-500 font-medium py-1">${this.attachmentError}</div>`
          : nothing}
      </div>
    `;
  }

  private renderActionButton() {
    const hasContent = Boolean(this.value.trim() || this.attachments.length > 0);

    if (this.isWorking && hasContent) {
      return html`
        <button
          id="queue-button"
          data-testid="queue-button"
          type="button"
          title="Queue message (agent is working)"
          aria-label="Queue message"
          class="relative flex items-center justify-center size-9 rounded-2xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer select-none"
          @click=${() => this.submit("followUp")}
        >
          ${renderQueueIcon("size-4")}
        </button>
      `;
    }

    if (this.isWorking && !hasContent) {
      return html`
        <button
          id="stop-button"
          data-testid="stop-button"
          type="button"
          title="Stop generating"
          aria-label="Stop generating"
          class="relative flex items-center justify-center size-9 rounded-2xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer select-none"
          @click=${() => {
            this.isWorking = false;
            this.dispatchEvent(
              new CustomEvent("stop-generation", {
                bubbles: true,
                composed: true,
              }),
            );
          }}
        >
          ${renderStopIcon("size-4")}
        </button>
      `;
    }

    if (!this.isWorking && !hasContent) {
      return html`
        <button
          id="submit-button"
          data-testid="submit-button"
          type="button"
          disabled
          title="Type a message to send"
          aria-label="Send message (empty input)"
          class="relative flex items-center justify-center size-9 rounded-2xl bg-black text-white dark:bg-white dark:text-black opacity-35 cursor-not-allowed select-none transition-all shadow-none"
        >
          ${renderSendIcon("size-5")}
        </button>
      `;
    }

    return html`
      <button
        id="submit-button"
        data-testid="submit-button"
        type="button"
        title="Submit"
        aria-label="Submit"
        class="relative flex items-center justify-center size-9 rounded-2xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer select-none"
        @click=${() => this.submit()}
      >
        ${renderSendIcon("size-5")}
      </button>
    `;
  }

  override render() {
    return html`
      <!-- Hidden file input for native attachment handling -->
      <input
        type="file"
        id="composer-file-input"
        class="hidden"
        multiple
        @change=${(e: Event) => this.handleFileChange(e)}
      />

      <!-- OMP Web Exact 4-Tier Composer Hierarchy with Unclipped Popover Support -->
      <div class="relative max-h-full min-h-composer min-w-16 w-expanded-composer max-w-chat max-w-full rounded-5xl">
        <!-- Floating Slash Command Autocomplete Popover -->
        ${
          this.slashCommandsOpen && this.filteredSlashCommands.length > 0
            ? html`
            <div
              id="composer-slash-menu"
              data-testid="composer-slash-menu"
              class="absolute bottom-full mb-3 left-2 sm:left-4 z-40 min-w-[280px] max-w-[360px] w-[calc(100%-16px)] sm:w-auto p-1.5 rounded-[22px] shadow-2xl backdrop-blur-2xl backdrop-saturate-200 bg-white/95 dark:bg-background-100/90 border border-black/8 dark:border-white/12 flex flex-col gap-0.5 animate-in fade-in select-none font-sans"
            >
              <div class="px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase text-foreground-450 flex items-center justify-between border-b border-black/5 dark:border-white/5 mb-0.5">
                <span>Comandos Rápidos</span>
                <span class="font-mono text-[9px]">↑↓ Navegar · ↵ Selecionar</span>
              </div>
              ${this.filteredSlashCommands.map((cmd, idx) => {
                const isSelected = idx === this.selectedSlashIndex;
                return html`
                  <button
                    type="button"
                    role="option"
                    aria-selected=${isSelected}
                    class="group flex w-full items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition-all duration-100 cursor-pointer ${
                      isSelected
                        ? "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-medium"
                        : "hover:bg-black/5 dark:hover:bg-white/10 text-foreground-900"
                    }"
                    @click=${() => this.selectSlashCommand(cmd.name)}
                  >
                    <div class="flex items-center gap-2.5 min-w-0">
                      <div class="size-6 rounded-lg flex items-center justify-center shrink-0 ${
                        cmd.name === "btw"
                          ? "bg-amber-500/15 text-amber-500 dark:text-amber-400"
                          : "bg-black/5 dark:bg-white/10 text-foreground-700"
                      }">
                        ${cmd.name === "btw" ? renderLightbulbIcon("size-3.5") : html`<span class="text-xs font-mono font-bold">/</span>`}
                      </div>
                      <div class="flex flex-col min-w-0">
                        <div class="flex items-center gap-1.5">
                          <span class="text-sm font-bold leading-tight font-mono">${cmd.label}</span>
                          <span class="text-xs font-medium text-foreground-600 leading-tight">· ${cmd.title}</span>
                        </div>
                        <span class="text-[11px] opacity-70 leading-tight truncate mt-0.5">${cmd.desc}</span>
                      </div>
                    </div>
                    <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      cmd.name === "btw"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono"
                        : "bg-black/5 dark:bg-white/10 text-foreground-500 font-mono"
                    }">${cmd.badge}</span>
                  </button>
                `;
              })}
            </div>
          `
            : nothing
        }

                <!-- Floating File Mention Autocomplete Popover (@) -->
        ${
          this.fileMenuOpen && this.fileSuggestions.length > 0
            ? html`
            <div
              id="composer-file-menu"
              data-testid="composer-file-menu"
              class="absolute bottom-full mb-3 left-2 sm:left-4 z-40 min-w-[280px] max-w-[380px] w-[calc(100%-16px)] sm:w-auto p-1.5 rounded-[22px] shadow-2xl backdrop-blur-2xl backdrop-saturate-200 bg-white/95 dark:bg-background-100/90 border border-black/8 dark:border-white/12 flex flex-col gap-0.5 animate-in fade-in select-none font-sans"
            >
              <div class="px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase text-foreground-450 flex items-center justify-between border-b border-black/5 dark:border-white/5 mb-0.5">
                <span>Arquivos do Workspace</span>
                <span class="font-mono text-[9px]">↑↓ Navegar · ↵ Selecionar</span>
              </div>
              ${this.fileSuggestions.map((file, idx) => {
                const isSelected = idx === this.selectedFileIndex;
                return html`
                  <button
                    type="button"
                    role="option"
                    aria-selected=${isSelected}
                    class="group flex w-full items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition-all duration-100 cursor-pointer ${
                      isSelected
                        ? "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-medium"
                        : "hover:bg-black/5 dark:hover:bg-white/10 text-foreground-900"
                    }"
                    @click=${() => this.selectFileSuggestion(file)}
                  >
                    <div class="flex items-center gap-2.5 min-w-0">
                      <div class="size-6 rounded-lg flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/10 text-foreground-700">
                        ${file.kind === "directory" ? renderFolderIcon("size-3.5") : html`<span class="text-xs font-mono">@</span>`}
                      </div>
                      <div class="flex flex-col min-w-0">
                        <span class="text-sm font-medium leading-tight font-mono truncate">${file.path}</span>
                      </div>
                    </div>
                    <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-foreground-500 font-mono">${file.kind}</span>
                  </button>
                `;
              })}
            </div>
          `
            : nothing
        }

        <!-- 1. Background layer with shadow-tinted-xl and backdrop-blur -->
        <div
          class="relative flex flex-col shadow-tinted-xl backdrop-blur-2xl backdrop-saturate-200 bg-accent-100/60 dark:bg-muted-200/50 w-full ${this.isDragOver ? "ring-2 ring-blue-500/50 bg-blue-500/5" : ""}"
          style="border-radius: 32px;"
          data-testid="composer-background"
          @dragover=${(e: DragEvent) => this.handleDragOver(e)}
          @dragleave=${(e: DragEvent) => this.handleDragLeave(e)}
          @drop=${(e: DragEvent) => this.handleDrop(e)}
        >
          <!-- 2. Content container -->
          <div
            class="pointer-events-auto relative flex flex-col contrast-more:border-2 w-full"
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
                class="bg-white/95 dark:bg-background-100/45 backdrop-blur-xl relative flex flex-col shadow-xs w-full overflow-hidden"
                style="border-radius: 26px;"
              >
                <!-- Ask Tool Expander (Composer background rises upwards with spring!) -->
                <div class="composer-ask-expander ${this.isAskOpen ? "open" : ""}">
                  <div class="composer-ask-inner">
                    ${this.renderAskToolContent()}
                  </div>
                </div>

                <!-- BTW Side Question Expander (Spring open!) -->
                <div class="composer-btw-expander ${this.isBtwOpen ? "open" : ""}">
                  <div class="composer-btw-inner">
                    ${this.renderBtwContent()}
                  </div>
                </div>

                <!-- Generating accent pulse line -->
                ${
                  this.isWorking
                    ? html`
                      <div
                        class="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-500 animate-pulse z-10 rounded-t-[26px]"
                      ></div>
                    `
                    : nothing
                }

                <!-- Textarea container -->
                <div class="pt-3 px-4 pb-0">
                  <!-- Pending Attachments Section -->
                  ${this.renderPendingAttachments()}

                  <!-- Active /btw Mode Pill Banner -->
                  ${
                    this.isBtwActive && !this.hasActiveBtw
                      ? html`
                      <div class="flex items-center justify-between pb-2 mb-1 border-b border-black/5 dark:border-white/5">
                        <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold border border-amber-500/20 animate-in fade-in select-none">
                          ${renderLightbulbIcon("size-3.5")}
                          <span>Side Question (/btw)</span>
                          <span class="text-[11px] opacity-75 font-normal">· Efêmero, não polui o histórico</span>
                        </div>
                        <button
                          type="button"
                          class="text-xs text-foreground-500 hover:text-foreground-800 transition-colors cursor-pointer"
                          @click=${() => this.clearBtwMode()}
                        >
                          Cancelar
                        </button>
                      </div>
                    `
                      : nothing
                  }
                  ${
                    this.isShellMode
                      ? html`
                      <div class="flex items-center justify-between px-3 pt-2 pb-1 border-b border-black/5 dark:border-white/5">
                        <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20 animate-in fade-in select-none">
                          ${renderTerminalIcon("size-3.5")}
                          <span>Modo Shell Direct (!)</span>
                          <span class="text-[11px] opacity-75 font-normal">· Executa direto no terminal do workspace</span>
                        </div>
                        <button
                          type="button"
                          class="text-xs text-foreground-500 hover:text-foreground-800 transition-colors cursor-pointer"
                          @click=${() => this.clearShellMode()}
                        >
                          Cancelar
                        </button>
                      </div>
                    `
                      : nothing
                  }
                  <textarea
                    rows="${this.compact ? "1" : "2"}"
                    placeholder="${this.isBtwActive ? "Faça uma pergunta lateral com o contexto da sessão (/btw)..." : this.isAskOpen ? (this.askMode === "projects" ? "Digite para filtrar ou criar projeto..." : "Digite outra opção...") : this.placeholder}"
                    class="omp-composer-textarea font-ligatures-none inline-block w-full resize-none overflow-y-hidden whitespace-pre-wrap bg-transparent align-top text-black outline-none placeholder:text-foreground-450 dark:text-white dark:placeholder:text-foreground-600/90 text-base-dense font-sans"
                    style="field-sizing: content; max-height: 280px;"
                    .value=${this.value}
                    @input=${(e: Event) => this.handleInput(e)}
                    @keydown=${(e: KeyboardEvent) => this.handleKeyDown(e)}
                    @keyup=${(e: KeyboardEvent) => this.handleKeyUp(e)}
                    @blur=${() => this.handleBlur()}
                    @paste=${(e: ClipboardEvent) => this.handlePaste(e)}
                  ></textarea>
                </div>

                <!-- Bottom Toolbar Row -->
                <div class="relative bottom-0 flex items-center justify-between pb-1.5 pe-2.5 ps-1.5 z-10">
                  <div class="flex h-11 items-center gap-2 ps-1">
                    <!-- Plus / Attachment Button with OMP Web classes -->
                    <button
                      id="composer-create-button"
                      data-testid="composer-create-button"
                      data-spatial-navigation-autofocus="false"
                      title="Attach files, connect apps, or make something with OMP."
                      type="button"
                      aria-label="Attach files, connect apps, or make something with OMP."
                      class="relative flex items-center text-foreground-800 fill-foreground-800 active:text-foreground-600 active:fill-foreground-600 dark:active:text-foreground-650 dark:active:fill-foreground-650 bg-transparent safe-hover:bg-black/5 active:bg-black/3 dark:safe-hover:bg-white/8 dark:active:bg-white/5 text-sm justify-center min-h-9 min-w-9 after:rounded-xl after:absolute after:inset-0 after:pointer-events-none after:border after:border-transparent after:contrast-more:border-2 outline-2 outline-offset-1 focus-visible:z-[1] focus-visible:outline focus-visible:outline-stroke-900 h-9 select-none gap-1 rounded-2xl border border-black/8 dark:border-white/8 p-0 transition-colors"
                      @click=${(e: Event) => {
                        e.stopPropagation();
                        this.toggleMenu("create", "#composer-create-button");
                      }}
                    >
                      ${renderPlusIcon("size-6")}
                    </button>

                    <!-- Model Selector Pill with Provider Icon & Normalized Name -->
                    <div class="relative">
                      <button
                        id="composer-chat-mode-smart-button"
                        data-testid="composer-chat-mode-smart-button"
                        data-spatial-navigation-autofocus="false"
                        title="${this.selectedModel}"
                        type="button"
                        aria-label="${this.selectedModel}"
                        class="relative flex items-center text-foreground-800 fill-foreground-800 active:text-foreground-600 active:fill-foreground-600 dark:active:text-foreground-650 dark:active:fill-foreground-650 bg-transparent safe-hover:bg-black/5 active:bg-black/3 dark:safe-hover:bg-white/8 dark:active:bg-white/5 text-sm justify-center min-h-9 min-w-9 px-2.5 py-1 rounded-2xl gap-1.5 select-none font-medium border border-black/8 dark:border-white/10 cursor-pointer pointer-events-auto"
                        @click=${(e: Event) => {
                          e.stopPropagation();
                          this.toggleMenu(
                            "model",
                            "#composer-chat-mode-smart-button",
                          );
                        }}
                      >
                        <span class="text-sm font-medium truncate max-w-[130px]">${this.selectedModel}</span>
                        ${renderChevronDownIcon()}
                      </button>
                    </div>

                    <!-- Project Selector Pill -->
                    <div class="relative">
                      <button
                        id="composer-project-pill"
                        data-testid="composer-project-pill"
                        title="Selecionar projeto ativo"
                        type="button"
                        aria-label="Selecionar projeto"
                        class="relative flex items-center text-foreground-800 fill-foreground-800 bg-transparent safe-hover:bg-black/5 active:bg-black/3 dark:safe-hover:bg-white/8 dark:active:bg-white/5 text-xs justify-center min-h-9 px-2.5 py-1 rounded-2xl gap-1.5 select-none font-semibold border border-black/8 dark:border-white/10 transition-colors cursor-pointer pointer-events-auto ${
                          this.isAskOpen && this.askMode === "projects"
                            ? "!bg-blue-500/10 !text-blue-600 dark:!text-blue-400 !border-blue-500/30"
                            : ""
                        }"
                        @click=${(e: MouseEvent) => {
                          e.stopPropagation();
                          this.toggleProjectSelector();
                        }}
                      >
                        ${renderFolderIcon("size-3.5 shrink-0")}
                        <span class="max-w-[120px] truncate">
                          ${((this.projects.length > 0 ? this.projects : this.defaultProjects).find((p) => p.id === this.selectedProjectId) ?? (this.projects.length > 0 ? this.projects[0] : this.defaultProjects[0]))?.name || "Projeto"}
                        </span>
                      </button>
                    </div>

                    <!-- Status badges: plan-mode & extension statuses matching toolbar pill style -->
                    ${this.planMode?.enabled ? html`
                      <button
                        type="button"
                        class="extension-status-chip plan-mode-chip inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-400 select-none cursor-pointer transition-colors hover:bg-blue-500/20 active:scale-95 ${this.planMode.proposedPlan ? "!bg-blue-500/20 !border-blue-500/40 animate-pulse font-semibold" : ""}"
                        title=${this.planMode.proposedPlan ? "Plan proposed – click to review" : "Plan mode active"}
                        @click=${() => this.dispatchEvent(new CustomEvent("open-plan-review", { bubbles: true, composed: true }))}
                      >
                        <span>📋</span>
                        <span>${this.planMode.proposedPlan ? "Review Plan" : "Plan Mode"}</span>
                      </button>
                    ` : nothing}
                    ${Object.entries(this.extensionStatuses ?? {}).map(([key, text]) => html`
                      <span
                        class="extension-status-chip hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-black/10 dark:border-white/10 bg-black/[0.04] dark:bg-white/[0.06] text-foreground-700 select-none"
                        title=${key + ": " + text}
                      >${text}</span>
                    `)}
                    <!-- Extensible Custom Pills Slot -->
                    ${this.customPills}
                  </div>

                  <!-- Right Action Button: Submit (Up Arrow), Stop, or Queue (matching legacy PromptEditor behavior) -->
                  <div class="flex items-center gap-1.5">
                    ${this.renderActionButton()}
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
    "omp-composer": OmpComposer;
  }
}
