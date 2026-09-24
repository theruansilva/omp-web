import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { renderToggleSidebarIcon, renderUserIcon, renderSunIcon, renderMoonIcon } from "./icons";

@customElement("copilot-header")
export class CopilotHeader extends LitElement {
  @property({ type: Boolean }) isSidebarOpen = true;
  @property({ type: String }) title = "";
  @property({ type: String }) theme: "light" | "dark" = "dark";

  protected override createRenderRoot() {
    return this;
  }

  override render() {
    return html`
      <header class="absolute top-0 inset-x-0 h-14 px-4 flex items-center justify-between z-30 pointer-events-none">
        <div class="flex items-center gap-3 pointer-events-auto">
          ${!this.isSidebarOpen
        ? html`
                <button
                  type="button"
                  aria-label="Open sidebar"
                  class="flex items-center justify-center size-9 rounded-xl text-foreground-800 bg-sidebar-light dark:bg-sidebar-dark hover:bg-black/5 dark:hover:bg-white/8 border border-black/10 dark:border-white/10 transition-colors shadow-sm"
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

          <!-- Sign In Pill Button -->
          <button
            type="button"
            class="h-8 px-3.5 rounded-full bg-white dark:bg-[#202430] border border-black/10 dark:border-white/15 flex items-center gap-2 text-xs font-semibold text-foreground-800 hover:bg-black/5 dark:hover:bg-white/10 transition-all shadow-sm"
            @click=${() => this.dispatchEvent(new CustomEvent("sign-in", { bubbles: true, composed: true }))}
          >
            ${renderUserIcon()}
            <span>Sign in</span>
          </button>
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
