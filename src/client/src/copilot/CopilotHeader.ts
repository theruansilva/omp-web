import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { renderToggleSidebarIcon, renderSunIcon, renderMoonIcon } from "./icons";

@customElement("copilot-header")
export class CopilotHeader extends LitElement {
  @property({ type: Boolean }) isSidebarOpen = true;
  @property({ type: String }) override title = "";
  @property({ type: String }) theme: "dark" | "light" = "light";
  @property({ type: String }) currentUser: string | null = null;

  protected override createRenderRoot() {
    return this;
  }

  override render() {
    return html`
      <header class="absolute top-0 inset-x-0 h-14 px-4 flex items-center justify-between z-30 pointer-events-none">
        <div class="flex items-center gap-3 pointer-events-auto">
          <!-- Toggle sidebar button: ONLY rendered when sidebar is closed -->
          ${!this.isSidebarOpen
        ? html`
                <button
                  type="button"
                  aria-label="Open sidebar"
                  class="flex items-center justify-center size-9 rounded-xl text-foreground-800 bg-sidebar-light dark:bg-sidebar-dark hover:bg-black/5 dark:hover:bg-white/8 border border-black/10 dark:border-white/10 transition-colors shadow-sm cursor-pointer"
                  @click=${() => this.dispatchEvent(new CustomEvent("toggle-sidebar", { bubbles: true, composed: true }))}
                >
                  ${renderToggleSidebarIcon()}
                </button>
              `
        : nothing}

          ${this.title
        ? html`<h2 class="text-sm font-semibold text-foreground-800 font-ginto opacity-90">${this.title}</h2>`
        : nothing}
        </div>

        <div class="flex items-center gap-2 pointer-events-auto">
          <!-- Theme Toggle -->
          <button
            type="button"
            aria-label="Toggle theme"
            class="flex items-center justify-center size-8 rounded-full text-foreground-700 hover:text-foreground-900 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            @click=${() => this.dispatchEvent(new CustomEvent("toggle-theme", { bubbles: true, composed: true }))}
          >
            ${this.theme === "dark" ? renderSunIcon() : renderMoonIcon()}
          </button>

          <!-- Sign In / Active User Profile -->
          ${this.currentUser
            ? html`
                <div class="flex items-center gap-2">
                  <div
                    class="h-9 px-3 rounded-xl flex items-center gap-2 text-sm font-medium bg-[var(--copilot-surface-elevated)] border border-[var(--copilot-border-subtle)] text-[var(--copilot-text-primary)] shadow-sm"
                  >
                    <div class="size-5 rounded-full bg-[var(--copilot-accent)] text-[var(--copilot-on-accent)] flex items-center justify-center text-xs font-bold uppercase">
                      ${this.currentUser.charAt(0)}
                    </div>
                    <span class="max-w-[120px] truncate">${this.currentUser}</span>
                  </div>
                  <button
                    type="button"
                    title="Sair"
                    aria-label="Sair da conta"
                    class="h-9 px-2.5 rounded-xl flex items-center justify-center text-xs font-medium text-[var(--copilot-text-muted)] hover:text-red-500 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    @click=${() => this.dispatchEvent(new CustomEvent("sign-out", { bubbles: true, composed: true }))}
                  >
                    Sair
                  </button>
                </div>
              `
            : html`
                <button
                  type="button"
                  class="copilot-btn-signin h-9 px-3.5 py-1 rounded-xl flex items-center justify-center text-sm font-medium cursor-pointer shadow-sm active:scale-98"
                  @click=${() => this.dispatchEvent(new CustomEvent("sign-in", { bubbles: true, composed: true }))}
                >
                  Sign in
                </button>
              `}
        </div>
      </header>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "copilot-header": CopilotHeader;
  }
}
