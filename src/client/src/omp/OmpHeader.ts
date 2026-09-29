import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { renderToggleSidebarIcon } from "./icons";

@customElement("omp-header")
export class OmpHeader extends LitElement {
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
          <!-- Sign In Button: Rendered only when user is logged out -->
          ${!this.currentUser
            ? html`
                <button
                  type="button"
                  class="omp-btn-signin h-9 px-3.5 py-1 rounded-xl flex items-center justify-center text-sm font-medium cursor-pointer shadow-sm active:scale-98"
                  @click=${() => this.dispatchEvent(new CustomEvent("sign-in", { bubbles: true, composed: true }))}
                >
                  Entrar
                </button>
              `
            : nothing}
        </div>
      </header>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "omp-header": OmpHeader;
  }
}
