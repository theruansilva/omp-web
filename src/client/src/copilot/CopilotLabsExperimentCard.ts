import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { LabInitiative } from "./CopilotLabsFeatureCard";

@customElement("copilot-labs-experiment-card")
export class CopilotLabsExperimentCard extends LitElement {
  @property({ type: Object }) experiment?: LabInitiative;

  protected override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.classList.add("block", "w-full");
  }

  private handleClick() {
    if (!this.experiment) return;
    this.dispatchEvent(
      new CustomEvent("card-click", {
        detail: this.experiment,
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      this.handleClick();
    }
  }

  override render() {
    if (!this.experiment) return html``;

    return html`
      <div
        class="relative isolate bg-white/45 dark:bg-background-650/10 flex h-full cursor-pointer flex-col gap-3 p-3 text-foreground-800 transition-transform duration-200 ease-in hover:scale-[1.025] shadow-sm w-full"
        data-experiment-alias="${this.experiment.id}"
        data-testid="labs-experiment-card"
        role="button"
        tabindex="0"
        style="clip-path: var(--clip-path-squircle-60);"
        @click=${this.handleClick}
        @keydown=${this.handleKeydown}
      >
        <div class="items-stretch overflow-hidden rounded-b-6xl rounded-t-7xl aspect-[16/10]">
          <div class="relative size-full">
            <img
              alt=""
              class="absolute size-full object-cover block"
              src="${this.experiment.image}"
            />
          </div>
        </div>
        <div class="flex flex-col items-start space-y-4 text-foreground-800 pb-4 pe-3 ps-3 pt-1 flex-1 justify-between">
          <div class="flex flex-col items-start space-y-1.5">
            <p class="line-clamp-2 text-xl font-semibold font-ginto text-foreground-800" data-testid="labs-card-title">
              ${this.experiment.title}
            </p>
            <p class="line-clamp-3 text-xs text-foreground-600 leading-relaxed" data-testid="labs-card-description">
              ${this.experiment.description}
            </p>
          </div>
          <button
            class="relative flex items-center text-foreground-800 fill-foreground-800 bg-transparent safe-hover:bg-black/5 active:bg-black/3 dark:safe-hover:bg-black/30 text-xs justify-center min-h-8 min-w-8 px-3.5 py-1.5 rounded-xl border border-black/20 dark:border-white/20 font-medium cursor-pointer"
            type="button"
            @click=${(e: Event) => {
        e.stopPropagation();
        this.handleClick();
      }}
          >
            ${this.experiment.actionText || "Try now"}
          </button>
        </div>
        <div
          class="before:border-black/10 dark:before:border-white/10 before:border-[20px] will-change-transform pointer-events-none absolute inset-0 before:absolute before:inset-0 before:rounded-inherit"
          style="clip-path: var(--clip-path-squircle-stroke-60);"
        ></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "copilot-labs-experiment-card": CopilotLabsExperimentCard;
  }
}
