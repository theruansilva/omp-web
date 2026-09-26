import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

export interface LabInitiative {
  id: string;
  title: string;
  description: string;
  image: string;
  actionText: string;
  badge?: string;
}

@customElement("omp-labs-feature-card")
export class OmpLabsFeatureCard extends LitElement {
  @property({ type: Object }) initiative?: LabInitiative;

  protected override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.classList.add("block", "w-full");
  }

  private handleClick() {
    if (!this.initiative) return;
    this.dispatchEvent(
      new CustomEvent("card-click", {
        detail: this.initiative,
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
    if (!this.initiative) return html``;

    return html`
      <div
        class="relative isolate bg-white/45 dark:bg-background-650/10 flex h-full cursor-pointer flex-col gap-3 p-3 text-foreground-800 transition-transform duration-200 ease-in hover:scale-[1.025] bp-960:flex-row bp-960:gap-4 shadow-sm w-full"
        data-experiment-alias="${this.initiative.id}"
        data-testid="labs-feature-card"
        role="button"
        tabindex="0"
        style="clip-path: var(--clip-path-squircle-60);"
        @click=${this.handleClick}
        @keydown=${this.handleKeydown}
      >
        <div class="items-stretch overflow-hidden rounded-b-6xl rounded-t-7xl aspect-[97/74] bp-960:basis-[calc(50%-12px)] bp-960:rounded-l-7xl bp-960:rounded-r-6xl">
          <div class="relative size-full">
            <img
              alt=""
              class="absolute size-full object-cover block"
              src="${this.initiative.image}"
            />
          </div>
        </div>
        <div class="flex flex-col items-start justify-center space-y-6 text-foreground-800 pb-5 pe-4 ps-5 pt-1.5 bp-960:basis-[calc(50%+12px)] bp-960:pb-8 bp-960:pe-4 bp-960:ps-2 bp-960:pt-2">
          <div class="flex flex-col items-start space-y-2">
            <p class="line-clamp-2 text-2xl font-semibold font-ginto text-foreground-800" data-testid="labs-card-title">
              ${this.initiative.title}
            </p>
            <p class="line-clamp-3 text-sm text-foreground-600 leading-relaxed font-sans" data-testid="labs-card-description">
              ${this.initiative.description}
            </p>
          </div>
          <button
            class="relative flex items-center text-foreground-800 fill-foreground-800 active:text-foreground-600 active:fill-foreground-600 dark:active:text-foreground-650 dark:active:fill-foreground-650 bg-transparent safe-hover:bg-black/5 active:bg-black/3 dark:safe-hover:bg-black/30 dark:active:bg-black/20 text-sm justify-center min-h-10 min-w-10 px-4 py-2 gap-x-2 rounded-xl after:rounded-xl after:absolute after:inset-0 after:pointer-events-none after:contrast-more:border-2 outline-2 outline-offset-1 focus-visible:z-[1] focus-visible:outline focus-visible:outline-stroke-900 after:border after:border-black/30 dark:after:border-white/30 border-black/8 font-medium cursor-pointer"
            type="button"
            @click=${(e: Event) => {
        e.stopPropagation();
        this.handleClick();
      }}
          >
            ${this.initiative.actionText || "Try now"}
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
    "omp-labs-feature-card": OmpLabsFeatureCard;
  }
}
