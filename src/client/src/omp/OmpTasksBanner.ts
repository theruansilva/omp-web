import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("omp-tasks-banner")
export class OmpTasksBanner extends LitElement {
  @property({ type: String }) override title = "Verify your email";
  @property({ type: String }) buttonText = "Sign in to join";

  protected override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.classList.add("block");
  }

  private handleButtonClick(e: Event) {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("join-click", {
        detail: { title: this.title, buttonText: this.buttonText },
        bubbles: true,
        composed: true,
      }),
    );
    this.dispatchEvent(
      new CustomEvent("sign-in", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  override render() {
    return html`
      <!-- OMP Tasks Waitlist / Join Pill Banner -->
      <div
        class="pointer-events-auto relative flex flex-col rounded-full p-1.5 shadow-tinted-lg mb-5 sm:mb-8 bg-background-100 text-foreground-900 dark:bg-background-150"
      >
        <div class="flex items-center justify-center gap-2">
          <div class="flex shrink-0 items-center justify-center px-4">
            <span class="text-sm font-semibold tracking-tight font-ginto text-foreground-800">
              ${this.title}
            </span>
          </div>
          <span role="status" aria-live="polite" aria-atomic="true" class="sr-only"></span>
          <button
            type="button"
            class="relative min-w-44 select-none rounded-full after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:border after:border-transparent active:opacity-80 after:contrast-more:border-2 after:forced-colors:border-[ButtonText] px-6 py-3 text-base-dense bg-background-800 text-foreground-100 ring-offset-1 focus-visible:z-[1] focus-visible:bg-black focus-visible:ring-2 focus-visible:ring-stroke-900 safe-hover:bg-black dark:bg-background-300 dark:text-foreground-900 dark:focus-visible:bg-background-300/80 dark:safe-hover:bg-background-300/80 cursor-pointer"
            @click=${this.handleButtonClick}
          >
            ${this.buttonText}
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "omp-tasks-banner": OmpTasksBanner;
  }
}
