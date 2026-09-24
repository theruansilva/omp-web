import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import {
  renderCopilotLogo,
  renderToggleSidebarIcon,
  renderNewChatIcon,
  renderLibraryIcon,
  renderTasksIcon,
  renderDiscoverIcon,
  renderShoppingIcon,
  renderImagineIcon,
  renderLabsIcon,
} from "./icons";

export interface NavItem {
  id: string;
  label: string;
  badge?: string;
}

@customElement("copilot-sidebar")
export class CopilotSidebar extends LitElement {
  @property({ type: String }) activeTab = "new-chat";
  @property({ type: Boolean }) isOpen = true;

  // Render in Light DOM so global Tailwind utilities & Copilot CSS apply
  protected override createRenderRoot() {
    return this;
  }

  private readonly primaryNav: NavItem[] = [
    { id: "new-chat", label: "New chat" },
    { id: "library", label: "Library" },
    { id: "tasks", label: "Tasks", badge: "PREVIEW" },
  ];

  private readonly secondaryNav: NavItem[] = [
    { id: "discover", label: "Discover" },
    { id: "shopping", label: "Shopping" },
    { id: "imagine", label: "Imagine" },
    { id: "labs", label: "Labs" },
  ];

  private handleSelect(tabId: string) {
    this.dispatchEvent(
      new CustomEvent("nav-select", {
        detail: { tab: tabId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private renderNavIcon(id: string) {
    switch (id) {
      case "new-chat":
        return renderNewChatIcon();
      case "library":
        return renderLibraryIcon();
      case "tasks":
        return renderTasksIcon();
      case "discover":
        return renderDiscoverIcon();
      case "shopping":
        return renderShoppingIcon();
      case "imagine":
        return renderImagineIcon();
      case "labs":
        return renderLabsIcon();
      default:
        return html``;
    }
  }

  override render() {
    return html`
      <aside
        class="h-full flex flex-col justify-between border-e border-black/10 dark:border-white/10 bg-sidebar-light dark:bg-sidebar-dark transition-all duration-300 ease-[cubic-bezier(0.43,0.195,0.02,1)] fixed md:relative inset-y-0 left-0 z-50 md:z-auto shadow-2xl md:shadow-none ${this
        .isOpen
        ? "w-[280px] md:w-[260px] min-w-[260px] p-3 translate-x-0"
        : "-translate-x-full md:translate-x-0 md:w-0 md:min-w-0 p-0 overflow-hidden md:opacity-0 md:border-none pointer-events-none"}"
        role="navigation"
        aria-label="Copilot Navigation"
      >
        <div>
          <!-- Header: Copilot Wordmark + Collapse Toggle -->
          <div class="flex items-center justify-between px-2 pt-1 pb-3 mb-2">
            <div
              class="flex items-center gap-2.5 cursor-pointer"
              @click=${() => this.handleSelect("new-chat")}
            >
              ${renderCopilotLogo()}
              <span class="text-[17px] font-semibold tracking-[-0.02em] text-foreground-800 font-ginto">
                Copilot
              </span>
            </div>
            <button
              type="button"
              aria-label="Close sidebar"
              class="flex items-center justify-center size-8 rounded-xl text-foreground-800 hover:bg-black/5 dark:hover:bg-white/8 transition-colors"
              @click=${() => this.dispatchEvent(new CustomEvent("toggle-sidebar", { bubbles: true, composed: true }))}
            >
              ${renderToggleSidebarIcon()}
            </button>
          </div>

          <!-- Primary Nav: New Chat, Library, Tasks -->
          <div class="flex flex-col gap-0.5" role="menu">
            ${this.primaryNav.map(
          (item) => html`
                <button
                  type="button"
                  role="menuitem"
                  class="group relative flex w-full items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${this
              .activeTab === item.id
              ? "bg-black/8 dark:bg-white/10 text-foreground-900 font-semibold"
              : "text-foreground-800 hover:bg-black/5 dark:hover:bg-white/8"}"
                  @click=${() => this.handleSelect(item.id)}
                >
                  <div class="flex items-center gap-3 min-w-0">
                    ${this.renderNavIcon(item.id)}
                    <span class="truncate">${item.label}</span>
                  </div>
                  ${item.badge
              ? html`<span
                        class="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded border border-black/15 dark:border-white/20 text-foreground-600 leading-none"
                        >${item.badge}</span
                      >`
              : ""}
                </button>
              `
        )}
          </div>

          <!-- Divider -->
          <div class="my-3 mx-1 h-0 border-t border-black/10 dark:border-white/10"></div>

          <!-- Secondary Nav: Discover, Shopping, Imagine, Labs -->
          <div class="flex flex-col gap-0.5" role="menu">
            ${this.secondaryNav.map(
          (item) => html`
                <button
                  type="button"
                  role="menuitem"
                  class="flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${this
              .activeTab === item.id
              ? "bg-black/8 dark:bg-white/10 text-foreground-900 font-semibold"
              : "text-foreground-800 hover:bg-black/5 dark:hover:bg-white/8"}"
                  @click=${() => this.handleSelect(item.id)}
                >
                  ${this.renderNavIcon(item.id)}
                  <span class="truncate">${item.label}</span>
                </button>
              `
        )}
          </div>
        </div>

        <!-- Bottom Auth Callout -->
        <div class="px-2 pb-2 pt-4 flex flex-col gap-3">
          <p class="text-[12px] leading-relaxed text-foreground-500">
            Conversations with Copilot will be shown here. Sign in to keep your conversations.
          </p>
          <button
            type="button"
            class="copilot-btn-signin w-full py-2.5 px-4 rounded-full font-semibold text-xs text-center transition-all shadow-sm hover:opacity-90 active:scale-98"
            @click=${() => this.dispatchEvent(new CustomEvent("sign-in", { bubbles: true, composed: true }))}
          >
            Sign in
          </button>
        </div>
      </aside>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "copilot-sidebar": CopilotSidebar;
  }
}
