import { LitElement, html, nothing, render } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  renderPlusIcon,
  renderChevronDownIcon,
  renderSendIcon,
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
} from "./icons";

export interface SubmitPromptDetail {
  prompt: string;
  model: string;
  projectId?: string;
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
}

@customElement("omp-composer")
export class OmpComposer extends LitElement {
  @property({ type: String }) value = "";
  @property({ type: String }) placeholder =
    "Message to omp, use @ to mention a file or / to start a command";
  @property({ type: String }) selectedModel = "Smart";
  @property({ type: Boolean }) isWorking = false;
  @property({ type: Boolean }) compact = false;
  @property({ type: Boolean }) isAskOpen = false;
  @property({ type: String }) askTitle =
    "Qual abordagem você prefere para esta tarefa?";
  @property({ attribute: false }) askOptions: AskOption[] = [];
  @property({ attribute: false }) projects: ComposerProject[] = [];
  @property({ type: String }) selectedProjectId = "proj-1";
  @property({ type: String }) askMode: "options" | "projects" = "projects";
  @property({ attribute: false }) customPills: unknown[] = [];
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

  @state() private slashCommandsOpen = false;
  @state() private slashFilter = "";
  @state() private selectedSlashIndex = 0;
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
      desc: "Limpa o histórico de mensagens da conversa atual",
      badge: "Sessão",
    },
    {
      name: "help",
      label: "/help",
      title: "Comandos & Ajuda",
      desc: "Mostra todos os comandos e atalhos disponíveis",
      badge: "Docs",
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

  get filteredSlashCommands(): SlashCommandItem[] {
    const q = this.slashFilter.trim().toLowerCase();
    if (!q) return this.defaultSlashCommands;
    return this.defaultSlashCommands.filter(
      (cmd) =>
        cmd.name.toLowerCase().startsWith(q) ||
        cmd.title.toLowerCase().includes(q),
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
    const textarea = this.querySelector<HTMLTextAreaElement>("textarea");
    if (textarea) {
      textarea.value = this.value;
    }
    this.requestUpdate();
    if (
      custom.detail.submit &&
      this.value.trim().length > 0 &&
      !this.isWorking
    ) {
      this.submit();
    }
  };

  protected override updated() {
    this.updatePortal();
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
    if (!this.activeMenu) return;
    this.updatePosition();
  };

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

    const textarea = this.querySelector(
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

  private selectModel(model: string) {
    this.selectedModel = model;
    this.closeMenu();
    this.dispatchEvent(
      new CustomEvent("model-change", {
        detail: { model },
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

  private handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.dispatchEvent(
        new CustomEvent("files-selected", {
          detail: { files: Array.from(input.files) },
          bubbles: true,
          composed: true,
        }),
      );
      input.value = "";
    }
  }

  private updatePortal() {
    const portal = this.getPortalContainer();
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
              data-selected=${this.selectedModel === "Smart" ? "true" : "false"}
              class="group flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus:bg-black/5 dark:focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500/40 active:bg-black/8 dark:active:bg-white/15 cursor-pointer select-none text-left ${this.selectedModel === "Smart" ? "bg-black/5 dark:bg-white/10" : ""}"
              @click=${() => this.selectModel("Smart")}
            >
              <div class="composer-dropdown-icon size-5 shrink-0 flex items-center justify-center ${this.selectedModel === "Smart" ? "!text-blue-600 dark:!text-blue-400" : ""}">
                ${renderSmartModeIcon()}
              </div>
              <div class="grow flex flex-col min-w-0">
                <div class="inline-flex items-center gap-1.5 text-sm font-medium leading-tight">
                  <span class="composer-dropdown-item ${this.selectedModel === "Smart" ? "!text-blue-600 dark:!text-blue-400 font-semibold" : ""}">Smart</span>
                  <span class="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">Default</span>
                </div>
                <span class="composer-dropdown-desc text-xs font-normal leading-4 mt-0.5">Balanced for everyday tasks</span>
              </div>
              ${this.selectedModel === "Smart" ? renderCheckIcon("size-4 text-blue-600 dark:text-blue-400 shrink-0") : nothing}
            </button>

            <button
              type="button"
              role="menuitem"
              tabindex="0"
              data-selected=${this.selectedModel === "Fast" ? "true" : "false"}
              class="group flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus:bg-black/5 dark:focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500/40 active:bg-black/8 dark:active:bg-white/15 cursor-pointer select-none text-left ${this.selectedModel === "Fast" ? "bg-black/5 dark:bg-white/10" : ""}"
              @click=${() => this.selectModel("Fast")}
            >
              <div class="composer-dropdown-icon size-5 shrink-0 flex items-center justify-center ${this.selectedModel === "Fast" ? "!text-blue-600 dark:!text-blue-400" : ""}">
                ${renderQuickModeIcon()}
              </div>
              <div class="grow flex flex-col min-w-0">
                <span class="composer-dropdown-item text-sm font-medium leading-tight ${this.selectedModel === "Fast" ? "!text-blue-600 dark:!text-blue-400 font-semibold" : ""}">Fast</span>
                <span class="composer-dropdown-desc text-xs font-normal leading-4 mt-0.5">Quickest answers for simpler queries</span>
              </div>
              ${this.selectedModel === "Fast" ? renderCheckIcon("size-4 text-blue-600 dark:text-blue-400 shrink-0") : nothing}
            </button>

            <button
              type="button"
              role="menuitem"
              tabindex="0"
              data-selected=${this.selectedModel === "Thinking" ? "true" : "false"}
              class="group flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus:bg-black/5 dark:focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500/40 active:bg-black/8 dark:active:bg-white/15 cursor-pointer select-none text-left ${this.selectedModel === "Thinking" ? "bg-black/5 dark:bg-white/10" : ""}"
              @click=${() => this.selectModel("Thinking")}
            >
              <div class="composer-dropdown-icon size-5 shrink-0 flex items-center justify-center ${this.selectedModel === "Thinking" ? "!text-blue-600 dark:!text-blue-400" : ""}">
                ${renderThinkModeIcon()}
              </div>
              <div class="grow flex flex-col min-w-0">
                <span class="composer-dropdown-item text-sm font-medium leading-tight ${this.selectedModel === "Thinking" ? "!text-blue-600 dark:!text-blue-400 font-semibold" : ""}">Deep Thinking</span>
                <span class="composer-dropdown-desc text-xs font-normal leading-4 mt-0.5">Multi-step reasoning for complex problems</span>
              </div>
              ${this.selectedModel === "Thinking" ? renderCheckIcon("size-4 text-blue-600 dark:text-blue-400 shrink-0") : nothing}
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
    this.requestUpdate();
  }

  public openSlashMenu(query = "") {
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

    this.value = `/${name} `;
    this.closeSlashMenu();
    const textarea = this.querySelector(
      "textarea",
    ) as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.value = this.value;
      textarea.focus();
      textarea.setSelectionRange(this.value.length, this.value.length);
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
    if (val.startsWith("/") && !val.includes("\n")) {
      const parts = val.slice(1).split(/\s+/);
      if (parts.length <= 1) {
        this.openSlashMenu(parts[0].toLowerCase());
      } else {
        this.closeSlashMenu();
      }
    } else {
      this.closeSlashMenu();
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
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

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.submit();
    }
  }

  private submit() {
    const rawText = this.value.trim();
    if (!rawText || this.isWorking) return;
    this.closeMenu();
    this.closeSlashMenu();

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
          },
          bubbles: true,
          composed: true,
        }),
      );
      this.value = "";
      this.isBtwMode = false;
      return;
    }

    this.dispatchEvent(
      new CustomEvent<SubmitPromptDetail>("submit-prompt", {
        detail: {
          prompt: rawText,
          model: this.selectedModel,
          projectId: this.selectedProjectId,
        },
        bubbles: true,
        composed: true,
      }),
    );
    this.value = "";
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

        <!-- 1. Background layer with shadow-tinted-xl and backdrop-blur -->
        <div
          class="relative flex flex-col shadow-tinted-xl backdrop-blur-2xl backdrop-saturate-200 bg-accent-100/60 dark:bg-muted-200/50 w-full"
          style="border-radius: 32px;"
          data-testid="composer-background"
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
                  <textarea
                    rows="${this.compact ? "1" : "2"}"
                    placeholder="${this.isBtwActive ? "Faça uma pergunta lateral com o contexto da sessão (/btw)..." : this.isAskOpen ? (this.askMode === "projects" ? "Digite para filtrar ou criar projeto..." : "Digite outra opção...") : this.placeholder}"
                    class="font-ligatures-none inline-block w-full resize-none overflow-y-hidden whitespace-pre-wrap bg-transparent align-top text-black outline-none placeholder:text-foreground-450 dark:text-white dark:placeholder:text-foreground-600/90 text-base-dense font-sans"
                    .value=${this.value}
                    @input=${(e: Event) => this.handleInput(e)}
                    @keydown=${(e: KeyboardEvent) => this.handleKeyDown(e)}
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

                    <!-- Model Selector Pill: "Smart ⌄" with OMP Web classes -->
                    <div class="relative">
                      <button
                        id="composer-chat-mode-smart-button"
                        data-testid="composer-chat-mode-smart-button"
                        data-spatial-navigation-autofocus="false"
                        title="${this.selectedModel}"
                        type="button"
                        aria-label="${this.selectedModel}"
                        class="relative flex items-center text-foreground-800 fill-foreground-800 active:text-foreground-600 active:fill-foreground-600 dark:active:text-foreground-650 dark:active:fill-foreground-650 bg-transparent safe-hover:bg-black/5 active:bg-black/3 dark:safe-hover:bg-white/8 dark:active:bg-white/5 text-sm justify-center min-h-9 min-w-9 px-2.5 py-1 rounded-2xl gap-1 select-none font-medium border border-black/8 dark:border-white/10"
                        @click=${(e: Event) => {
                          e.stopPropagation();
                          this.toggleMenu(
                            "model",
                            "#composer-chat-mode-smart-button",
                          );
                        }}
                      >
                        <span class="text-sm font-medium">${this.selectedModel}</span>
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
                          ${(this.projects.length > 0 ? this.projects : this.defaultProjects).find((p) => p.id === this.selectedProjectId)?.name || "Projeto"}
                        </span>
                      </button>
                    </div>

                    <!-- Side Question (/btw) Toggle Pill -->
                    <div class="relative">
                      <button
                        id="composer-btw-toggle-button"
                        data-testid="composer-btw-toggle-button"
                        title="Side Question (/btw) — Faça uma pergunta lateral efêmera com o contexto da sessão"
                        type="button"
                        aria-label="Side Question (/btw)"
                        class="relative flex items-center text-foreground-800 fill-foreground-800 bg-transparent safe-hover:bg-black/5 active:bg-black/3 dark:safe-hover:bg-white/8 dark:active:bg-white/5 text-xs justify-center min-h-9 px-2.5 py-1 rounded-2xl gap-1.5 select-none font-medium border border-black/8 dark:border-white/10 transition-colors cursor-pointer pointer-events-auto ${
                          this.isBtwActive
                            ? "!bg-amber-500/15 !text-amber-600 dark:!text-amber-400 !border-amber-500/40 font-semibold shadow-xs"
                            : ""
                        }"
                        @click=${(e: MouseEvent) => {
                          e.stopPropagation();
                          this.toggleBtwMode();
                        }}
                      >
                        ${renderLightbulbIcon("size-3.5 text-amber-500 dark:text-amber-400")}
                        <span>/btw</span>
                      </button>
                    </div>

                    <!-- Ask Tool Toggle Pill -->
                    <div class="relative">
                      <button
                        id="composer-ask-toggle-button"
                        data-testid="composer-ask-toggle-button"
                        title="Opções / Ask Tool (1, 2, 3)"
                        type="button"
                        aria-label="Ask Tool"
                        class="relative flex items-center text-foreground-800 fill-foreground-800 active:text-foreground-600 active:fill-foreground-600 dark:active:text-foreground-650 dark:active:fill-foreground-650 bg-transparent safe-hover:bg-black/5 active:bg-black/3 dark:safe-hover:bg-white/8 dark:active:bg-white/5 text-xs justify-center min-h-9 px-2.5 py-1 rounded-2xl gap-1.5 select-none font-medium border border-black/8 dark:border-white/10 transition-colors cursor-pointer pointer-events-auto ${
                          this.isAskOpen && this.askMode === "options"
                            ? "!bg-blue-500/10 !text-blue-600 dark:!text-blue-400 !border-blue-500/30 font-semibold"
                            : ""
                        }"
                        @click=${(e: MouseEvent) => {
                          e.stopPropagation();
                          this.toggleAskTool();
                        }}
                        @pointerdown=${(e: PointerEvent) => {
                          e.stopPropagation();
                        }}
                      >
                        <span class="size-1.5 rounded-full transition-colors ${
                          this.isAskOpen && this.askMode === "options"
                            ? "bg-blue-500 animate-pulse"
                            : "bg-current opacity-40"
                        }"></span>
                        <span>Opções</span>
                      </button>
                    </div>

                    <!-- Extensible Custom Pills Slot -->
                    ${this.customPills}
                  </div>

                  <!-- Right Action Button: Submit (Up Arrow), Stop, or Audio Call / Voice -->
                  <div class="flex items-center gap-2">
                    ${
                      this.isWorking
                        ? html`
                          <button
                            id="stop-button"
                            data-testid="stop-button"
                            type="button"
                            title="Stop generating"
                            aria-label="Stop generating"
                            class="relative flex items-center justify-center size-9 rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer select-none"
                            @click=${() =>
                              this.dispatchEvent(
                                new CustomEvent("stop-generation", {
                                  bubbles: true,
                                  composed: true,
                                }),
                              )}
                          >
                            <div class="size-3.5 rounded bg-current"></div>
                          </button>
                        `
                        : this.value.trim()
                          ? html`
                            <button
                              id="submit-button"
                              data-testid="submit-button"
                              type="button"
                              title="Submit"
                              aria-label="Submit"
                              class="relative flex items-center justify-center size-9 rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer select-none"
                              @click=${() => this.submit()}
                            >
                              ${renderSendIcon("size-5")}
                            </button>
                          `
                          : html`
                            <button
                              id="audio-call-button"
                              data-testid="audio-call-button"
                              type="button"
                              title="Talk to OMP"
                              aria-label="Talk to OMP"
                              class="relative flex items-center justify-center text-foreground-800 fill-foreground-800 active:text-foreground-600 active:fill-foreground-600 dark:active:text-foreground-650 dark:active:fill-foreground-650 bg-transparent safe-hover:bg-black/5 active:bg-black/3 dark:safe-hover:bg-white/8 dark:active:bg-white/5 text-sm min-h-9 min-w-9 rounded-2xl p-1.5 transition-colors cursor-pointer select-none"
                            >
                              ${renderWaveformIcon("size-6")}
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
    "omp-composer": OmpComposer;
  }
}
