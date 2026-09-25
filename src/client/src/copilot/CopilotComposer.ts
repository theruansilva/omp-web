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
} from "./icons";

export interface SubmitPromptDetail {
  prompt: string;
  model: string;
}

interface AskOption {
  id: string;
  title: string;
  desc: string;
}

@customElement("copilot-composer")
export class CopilotComposer extends LitElement {
  @property({ type: String }) value = "";
  @property({ type: String }) placeholder =
    "Message to omp, use @ to mention a file or / to start a command";
  @property({ type: String }) selectedModel = "Smart";
  @property({ type: Boolean }) isWorking = false;
  @property({ type: Boolean }) compact = false;

  @state() private activeMenu: "create" | "model" | null = null;
  @state() private menuPosition = { left: 0, bottom: 0 };
  @state() private isAskOpen = false;
  @state() private selectedAskOption: string | null = null;

  private readonly askOptions: AskOption[] = [
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
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener(
      "pointerdown",
      this.handleDocumentPointerDown,
      true,
    );
    window.removeEventListener("keydown", this.handleDocumentKeyDown, true);
    window.removeEventListener("resize", this.handleWindowResizeOrScroll);
    window.removeEventListener("scroll", this.handleWindowResizeOrScroll, true);
    this.closeMenu();
  }

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

  private toggleAskTool() {
    this.isAskOpen = !this.isAskOpen;
    this.selectedAskOption = null;
    this.requestUpdate();
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
          class="composer-dropdown-popover fixed z-[9999] p-1.5 rounded-[20px] shadow-2xl backdrop-blur-2xl backdrop-saturate-200 border border-black/8 dark:border-white/12 bg-white/95 dark:bg-[#161a24]/96 text-foreground-900 dark:text-foreground-100 transition-all duration-150 animate-in fade-in select-none"
          style="left: ${this.menuPosition.left}px; bottom: ${this.menuPosition.bottom}px; min-width: 250px; border-radius: 20px;"
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
          class="composer-dropdown-popover fixed z-[9999] p-1.5 rounded-[20px] shadow-2xl backdrop-blur-2xl backdrop-saturate-200 border border-black/8 dark:border-white/12 bg-white/95 dark:bg-[#161a24]/96 text-foreground-900 dark:text-foreground-100 transition-all duration-150 animate-in fade-in select-none"
          style="left: ${this.menuPosition.left}px; bottom: ${this.menuPosition.bottom}px; min-width: 260px; border-radius: 20px;"
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

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.submit();
    }
  }

  private submit() {
    const text = this.value.trim();
    if (!text || this.isWorking) return;
    this.closeMenu();
    this.dispatchEvent(
      new CustomEvent<SubmitPromptDetail>("submit-prompt", {
        detail: { prompt: text, model: this.selectedModel },
        bubbles: true,
        composed: true,
      }),
    );
    this.value = "";
  }

  private renderAskToolContent() {
    return html`
      <style>
        .composer-dropdown-popover {
          background-color: rgba(255, 255, 255, 0.96) !important;
          color: #1c1b1a !important;
          border: 1px solid rgba(0, 0, 0, 0.08) !important;
          border-radius: 20px !important;
          box-shadow: 0 20px 48px -8px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.05) !important;
          backdrop-filter: blur(24px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
          padding: 6px !important;
        }

        .composer-dropdown-popover [role="menuitem"],
        .composer-dropdown-popover .composer-dropdown-item {
          color: #1c1b1a !important;
        }

        .composer-dropdown-popover .composer-dropdown-desc {
          color: #666666 !important;
        }

        .dark .composer-dropdown-popover,
        [data-theme="dark"] .composer-dropdown-popover,
        html.dark .composer-dropdown-popover,
        html[data-theme="dark"] .composer-dropdown-popover {
          background-color: rgba(22, 26, 36, 0.96) !important;
          color: #f8fafc !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          box-shadow: 0 24px 56px -8px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08) !important;
        }

        .dark .composer-dropdown-popover [role="menuitem"],
        [data-theme="dark"] .composer-dropdown-popover [role="menuitem"],
        html.dark .composer-dropdown-popover [role="menuitem"],
        html[data-theme="dark"] .composer-dropdown-popover [role="menuitem"] {
          color: #f8fafc !important;
        }

        .dark .composer-dropdown-popover .composer-dropdown-item,
        [data-theme="dark"] .composer-dropdown-popover .composer-dropdown-item,
        html.dark .composer-dropdown-popover .composer-dropdown-item,
        html[data-theme="dark"] .composer-dropdown-popover .composer-dropdown-item {
          color: #f8fafc !important;
        }

        .dark .composer-dropdown-popover .composer-dropdown-desc,
        [data-theme="dark"] .composer-dropdown-popover .composer-dropdown-desc,
        html.dark .composer-dropdown-popover .composer-dropdown-desc,
        html[data-theme="dark"] .composer-dropdown-popover .composer-dropdown-desc {
          color: #94a3b8 !important;
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
      <div class="px-3.5 pt-3 pb-1 flex flex-col pointer-events-auto">
        <!-- Header row -->
        <div class="composer-ask-header px-1 pb-2">
          <div class="flex items-center justify-between">
            <div class="text-sm font-medium text-foreground-900 leading-snug">
              Qual abordagem você prefere para esta tarefa?
            </div>

            <button
              type="button"
              title="Fechar opções"
              aria-label="Fechar opções"
              class="rounded-full text-foreground-600 hover:text-foreground-900 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer pointer-events-auto text-xs"
              @click=${(e: MouseEvent) => {
                e.stopPropagation();
                this.toggleAskTool();
              }}
              @pointerdown=${(e: PointerEvent) => {
                e.stopPropagation();
              }}
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Options 1, 2, 3 -->
        <div class="flex flex-col gap-1.5" role="radiogroup" aria-label="Opções do Copilot">
          ${this.askOptions.map((opt, idx) => {
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
                @pointerdown=${(e: PointerEvent) => {
                  e.stopPropagation();
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
                  <span class="text-xs font-mono opacity-0 group-hover:opacity-70 transition-opacity">
                    ↵
                  </span>
                  ${isSelected ? renderCheckIcon("size-4 text-blue-600 dark:text-blue-400") : nothing}
                </div>
              </button>
            `;
          })}
        </div>
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

      <!-- Microsoft Copilot Exact 4-Tier Composer Hierarchy with Unclipped Popover Support -->
      <div class="relative max-h-full min-h-composer min-w-16 w-expanded-composer max-w-chat max-w-full rounded-5xl">
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
                  <textarea
                    rows="${this.compact ? "1" : "2"}"
                    placeholder="${this.isAskOpen ? "Type another option" : this.placeholder}"
                    class="font-ligatures-none inline-block w-full resize-none overflow-y-hidden whitespace-pre-wrap bg-transparent align-top text-black outline-none placeholder:text-foreground-450 dark:text-white dark:placeholder:text-foreground-600/90 text-base-dense font-sans"
                    .value=${this.value}
                    @input=${(e: Event) => {
                      this.value = (e.target as HTMLTextAreaElement).value;
                    }}
                    @keydown=${(e: KeyboardEvent) => this.handleKeyDown(e)}
                  ></textarea>
                </div>

                <!-- Bottom Toolbar Row -->
                <div class="relative bottom-0 flex items-center justify-between pb-1.5 pe-2.5 ps-1.5 z-10">
                  <div class="flex h-11 items-center gap-2 ps-1">
                    <!-- Plus / Attachment Button with Microsoft Copilot classes -->
                    <button
                      id="composer-create-button"
                      data-testid="composer-create-button"
                      data-spatial-navigation-autofocus="false"
                      title="Attach files, connect apps, or make something with Copilot."
                      type="button"
                      aria-label="Attach files, connect apps, or make something with Copilot."
                      class="relative flex items-center text-foreground-800 fill-foreground-800 active:text-foreground-600 active:fill-foreground-600 dark:active:text-foreground-650 dark:active:fill-foreground-650 bg-transparent safe-hover:bg-black/5 active:bg-black/3 dark:safe-hover:bg-white/8 dark:active:bg-white/5 text-sm justify-center min-h-9 min-w-9 after:rounded-xl after:absolute after:inset-0 after:pointer-events-none after:border after:border-transparent after:contrast-more:border-2 outline-2 outline-offset-1 focus-visible:z-[1] focus-visible:outline focus-visible:outline-stroke-900 h-9 select-none gap-1 rounded-2xl border border-black/8 dark:border-white/8 p-0 transition-colors"
                      @click=${(e: Event) => {
                        e.stopPropagation();
                        this.toggleMenu("create", "#composer-create-button");
                      }}
                    >
                      ${renderPlusIcon("size-6")}
                    </button>

                    <!-- Model Selector Pill: "Smart ⌄" with Microsoft Copilot classes -->
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

                    <!-- Ask Tool Toggle Pill (Para teste / reabertura) -->
                    <div class="relative">
                      <button
                        id="composer-ask-toggle-button"
                        data-testid="composer-ask-toggle-button"
                        title="Testar Ask Tool estilo Claude (1, 2, 3)"
                        type="button"
                        aria-label="Ask Tool"
                        class="relative flex items-center text-foreground-800 fill-foreground-800 active:text-foreground-600 active:fill-foreground-600 dark:active:text-foreground-650 dark:active:fill-foreground-650 bg-transparent safe-hover:bg-black/5 active:bg-black/3 dark:safe-hover:bg-white/8 dark:active:bg-white/5 text-xs justify-center min-h-9 px-2.5 py-1 rounded-2xl gap-1.5 select-none font-medium border border-black/8 dark:border-white/10 transition-colors cursor-pointer pointer-events-auto ${
                          this.isAskOpen
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
                          this.isAskOpen
                            ? "bg-blue-500 animate-pulse"
                            : "bg-current opacity-40"
                        }"></span>
                        <span>Ask Tool</span>
                      </button>
                    </div>
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
                              title="Talk to Copilot"
                              aria-label="Talk to Copilot"
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
    "copilot-composer": CopilotComposer;
  }
}
