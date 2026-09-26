import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

export interface DiscoverCardData {
  id: string;
  title: string;
  description?: string;
  prompt: string;
  layout?: "vertical" | "horizontal" | "large" | "small";
  image?: string;
  gradient?: string;
  tag?: string;
  actionText?: string;
  hasConstellations?: boolean;
  hasParticles?: boolean;
}

@customElement("omp-discover-card")
export class OmpDiscoverCard extends LitElement {
  @property({ type: Object }) card?: DiscoverCardData;
  @property({ type: String }) layout: "vertical" | "horizontal" | "large" | "small" = "vertical";

  protected override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.classList.add("contents");
  }

  private handleClick() {
    if (!this.card) return;
    this.dispatchEvent(
      new CustomEvent("card-click", {
        detail: this.card,
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleActionClick(e: Event) {
    e.stopPropagation();
    if (!this.card) return;
    this.dispatchEvent(
      new CustomEvent("action-click", {
        detail: this.card,
        bubbles: true,
        composed: true,
      })
    );
  }

  override render() {
    if (!this.card) return html``;

    const isLarge = this.layout === "large" || this.layout === "vertical" || this.card.layout === "large" || this.card.layout === "vertical";

    // 1. Large Card (Square, squircle-60, squircle-48-32 image, max-h-discover-card-large)
    if (isLarge) {
      return html`
        <div
          class="isolate bg-white/45 dark:bg-background-650/10 relative pb-0.5 text-foreground-800 transition-transform duration-200 ease-in hover:scale-[1.025] size-full max-h-discover-card-large col-span-2 row-span-2 aspect-square group cursor-pointer"
          role="button"
          tabindex="0"
          data-testid="discover-card"
          aria-labelledby="disc-${this.card.id}"
          style="clip-path: var(--clip-path-squircle-60);"
          @click=${this.handleClick}
          @keydown=${(e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            this.handleClick();
          }
        }}
        >
          <div id="disc-${this.card.id}" class="size-full">
            <div
              class="flex h-full gap-4 bg-white/20 p-3 text-start dark:bg-transparent flex-col text-xl sm:text-lg md:text-xl max-h-discover-card-large"
              style="opacity: 1;"
            >
              ${this.card.image
          ? html`
                    <img
                      class="aspect-square min-h-0 bg-black/5 object-cover dark:bg-black/20 squircle-48-32"
                      alt="${this.card.title}"
                      draggable="false"
                      aria-hidden="true"
                      role="presentation"
                      src="${this.card.image}"
                    />
                  `
          : html`
                    <div
                      class="aspect-square min-h-0 object-cover squircle-48-32 relative"
                      style="background: ${this.card.gradient};"
                    >
                      ${this.card.hasConstellations
              ? html`
                            <svg class="absolute inset-0 size-full opacity-45 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="50" cy="60" r="2.5" fill="white" />
                              <circle cx="80" cy="85" r="2.5" fill="white" />
                              <circle cx="110" cy="115" r="3" fill="white" />
                              <circle cx="140" cy="140" r="2.5" fill="white" />
                              <circle cx="170" cy="165" r="2" fill="white" />
                              <circle cx="210" cy="195" r="2.5" fill="white" />
                              <circle cx="125" cy="70" r="2" fill="white" />
                              <circle cx="260" cy="130" r="2.5" fill="white" />
                              <circle cx="320" cy="170" r="2" fill="white" />
                            </svg>
                          `
              : ""}
                    </div>
                  `}
              <div class="flex min-h-16 min-w-0 shrink-0 items-center pb-5 pe-4 px-5">
                <p class="line-clamp-4 break-words">${this.card.title}</p>
              </div>
            </div>
          </div>

          <!-- 3-dots more menu button -->
          <div class="absolute z-10 transition-opacity duration-200 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 end-8 top-8">
            <button
              aria-label="See more is collapsed"
              type="button"
              class="relative flex items-center text-foreground-800 fill-foreground-800 active:text-foreground-600 active:fill-foreground-600 dark:active:text-foreground-650 dark:active:fill-foreground-650 shadow-sm bg-transparent safe-hover:bg-white/50 active:bg-white/35 dark:safe-hover:bg-black/30 dark:active:bg-black/20 text-sm justify-center size-9 rounded-xl after:rounded-xl after:absolute after:inset-0 after:pointer-events-none after:border after:border-transparent after:contrast-more:border-2 outline-2 outline-offset-1 focus-visible:z-[1] focus-visible:outline focus-visible:outline-stroke-900 cursor-pointer"
              title="See more is collapsed"
              role="menu"
              data-spatial-navigation-autofocus="false"
              @click=${this.handleActionClick}
            >
              <div class="absolute inset-0 overflow-hidden backdrop-blur-2xl backdrop-saturate-200 bg-white/70 dark:bg-muted-200/70 rounded-xl after:rounded-xl"></div>
              <div class="relative flex items-center gap-x-1.5">
                <svg viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
                  <path d="M6.25 10C6.25 10.6904 5.69036 11.25 5 11.25C4.30964 11.25 3.75 10.6904 3.75 10C3.75 9.30964 4.30964 8.75 5 8.75C5.69036 8.75 6.25 9.30964 6.25 10ZM11.25 10C11.25 10.6904 10.6904 11.25 10 11.25C9.30964 11.25 8.75 10.6904 8.75 10C8.75 9.30964 8.75 8.75 8.75 8.75C10.6904 8.75 11.25 9.30964 11.25 10ZM15 11.25C15.6904 11.25 16.25 10.6904 16.25 10C16.25 9.30964 15.6904 8.75 15 8.75C14.3096 8.75 13.75 9.30964 13.75 10C13.75 10.6904 14.3096 11.25 15 11.25Z"></path>
                </svg>
              </div>
            </button>
          </div>

          <!-- Squircle-60 stroke overlay -->
          <div
            class="before:border-black/10 dark:before:border-white/10 before:border-[20px] will-change-transform pointer-events-none absolute inset-0 before:absolute before:inset-0 before:rounded-inherit"
            style="clip-path: var(--clip-path-squircle-stroke-60);"
          ></div>
        </div>
      `;
    }

    // 2. Small Horizontal Card (squircle-48, squircle-36 image, max-h-discover-card-small, aspect-[2/1])
    return html`
      <div
        class="isolate bg-white/45 dark:bg-background-650/10 relative pb-0.5 text-foreground-800 transition-transform duration-200 ease-in hover:scale-[1.025] size-full max-h-discover-card-small col-span-2 row-span-1 aspect-[2/1] h-40 sm:h-auto group cursor-pointer"
        role="button"
        tabindex="0"
        data-testid="discover-card"
        aria-labelledby="disc-${this.card.id}"
        style="clip-path: var(--clip-path-squircle-48);"
        @click=${this.handleClick}
        @keydown=${(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.handleClick();
        }
      }}
      >
        <div id="disc-${this.card.id}" class="size-full">
          <div
            class="flex h-full gap-4 bg-white/20 p-3 text-start dark:bg-transparent text-lg max-h-discover-card-small"
            style="opacity: 1;"
          >
            ${this.card.image
        ? html`
                  <img
                    class="aspect-square min-h-0 bg-black/5 object-cover dark:bg-black/20 shrink-0 squircle-36"
                    alt="${this.card.title}"
                    draggable="false"
                    aria-hidden="true"
                    role="presentation"
                    src="${this.card.image}"
                  />
                `
        : html`
                  <div
                    class="aspect-square min-h-0 object-cover shrink-0 squircle-36 relative"
                    style="background: ${this.card.gradient};"
                  >
                    ${this.card.hasParticles
            ? html`
                          <svg class="absolute inset-0 size-full opacity-40 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="30" cy="30" r="1.5" fill="white" />
                            <circle cx="80" cy="45" r="2" fill="white" />
                            <circle cx="120" cy="90" r="2.5" fill="white" />
                            <circle cx="60" cy="110" r="1.5" fill="white" />
                            <circle cx="140" cy="60" r="2" fill="white" />
                          </svg>
                        `
            : ""}
                  </div>
                `}
            <div class="flex min-h-16 min-w-0 items-end px-2 pb-2">
              <p class="line-clamp-4 break-words">${this.card.title}</p>
            </div>
          </div>
        </div>

        <!-- 3-dots more menu button -->
        <div class="absolute z-10 transition-opacity duration-200 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 end-5 top-5">
          <button
            aria-label="See more is collapsed"
            type="button"
            class="relative flex items-center text-foreground-800 fill-foreground-800 active:text-foreground-600 active:fill-foreground-600 dark:active:text-foreground-650 dark:active:fill-foreground-650 shadow-sm bg-transparent safe-hover:bg-white/50 active:bg-white/35 dark:safe-hover:bg-black/30 dark:active:bg-black/20 text-sm justify-center size-9 rounded-xl after:rounded-xl after:absolute after:inset-0 after:pointer-events-none after:border after:border-transparent after:contrast-more:border-2 outline-2 outline-offset-1 focus-visible:z-[1] focus-visible:outline focus-visible:outline-stroke-900 cursor-pointer"
            title="See more is collapsed"
            role="menu"
            data-spatial-navigation-autofocus="false"
            @click=${this.handleActionClick}
          >
            <div class="absolute inset-0 overflow-hidden backdrop-blur-2xl backdrop-saturate-200 bg-white/70 dark:bg-muted-200/70 rounded-xl after:rounded-xl"></div>
            <div class="relative flex items-center gap-x-1.5">
              <svg viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
                <path d="M6.25 10C6.25 10.6904 5.69036 11.25 5 11.25C4.30964 11.25 3.75 10.6904 3.75 10C3.75 9.30964 4.30964 8.75 5 8.75C5.69036 8.75 6.25 9.30964 6.25 10ZM11.25 10C11.25 10.6904 10.6904 11.25 10 11.25C9.30964 11.25 8.75 10.6904 8.75 10C8.75 9.30964 8.75 8.75 8.75 8.75C10.6904 8.75 11.25 9.30964 11.25 10ZM15 11.25C15.6904 11.25 16.25 10.6904 16.25 10C16.25 9.30964 15.6904 8.75 15 8.75C14.3096 8.75 13.75 9.30964 13.75 10C13.75 10.6904 14.3096 11.25 15 11.25Z"></path>
              </svg>
            </div>
          </button>
        </div>

        <!-- Squircle-48 stroke overlay -->
        <div
          class="before:border-black/10 dark:before:border-white/10 before:border-[20px] will-change-transform pointer-events-none absolute inset-0 before:absolute before:inset-0 before:rounded-inherit"
          style="clip-path: var(--clip-path-squircle-stroke-48);"
        ></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "omp-discover-card": OmpDiscoverCard;
  }
}
