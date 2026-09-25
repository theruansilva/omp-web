import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

export interface GraduatedExperiment {
  id: string;
  title: string;
  description: string;
  image: string;
  actionText: string;
  prompt?: string;
}

@customElement("copilot-graduated-card")
export class CopilotGraduatedCard extends LitElement {
  @property({ type: Object }) experiment?: GraduatedExperiment;

  protected override createRenderRoot() {
    return this;
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

  override render() {
    if (!this.experiment) return html``;

    return html`
      <!-- Microsoft Copilot Authentic Graduated Card -->
      <div
        data-testid="labs-graduated-card"
        data-experiment-alias="${this.experiment.id}"
        class="flex flex-row gap-3 bg-background-300/20 p-3 squircle-48 dark:bg-background-650/5 cursor-pointer hover:bg-background-300/30 dark:hover:bg-background-650/15 transition-colors"
        @click=${this.handleClick}
      >
        <img
          alt="${this.experiment.title}"
          class="size-[128px] shrink-0 object-cover squircle-36 sm:h-[128px] sm:w-[204px]"
          src="${this.experiment.image}"
        />
        <div class="flex min-w-0 flex-col justify-start gap-2 p-2">
          <p class="truncate text-foreground-800 text-lg-strong">
            ${this.experiment.title}
          </p>
          <p class="line-clamp-2 text-foreground-800 text-sm">
            ${this.experiment.description}
          </p>
          <button
            type="button"
            title="${this.experiment.title}: ${this.experiment.actionText}"
            class="w-fit text-accent-550 text-sm hover:underline cursor-pointer"
            @click=${(e: Event) => {
        e.stopPropagation();
        this.handleClick();
      }}
          >
            ${this.experiment.actionText}
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "copilot-graduated-card": CopilotGraduatedCard;
  }
}
