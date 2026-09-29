import { LitElement, html, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";

export type ButtonStatus =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "loading";

export type ButtonSize = "sm" | "md" | "lg";
export type ButtonVariant = "pill" | "squircle" | "rect" | "subtle" | "ghost";

@customElement("omp-status-button")
export class OmpStatusButton extends LitElement {
  @property({ type: String, reflect: true }) status: ButtonStatus = "neutral";
  @property({ type: String }) size: ButtonSize = "md";
  @property({ type: String }) variant: ButtonVariant = "pill";
  @property({ type: String }) label = "";
  @property({ type: Boolean, attribute: "show-icon" }) showIcon = true;
  @property({ type: Boolean, attribute: "show-neutral-icon" }) showNeutralIcon = false;
  @property({ type: Boolean }) pulse = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: String }) type: "button" | "submit" | "reset" = "button";
  @property({ type: String, attribute: "button-class" }) buttonClass = "";

  @state() private _prevStatus: ButtonStatus | null = null;
  @state() private _prevLabel: string | null = null;

  private _prevWidth = 0;
  private _cleanupTimer: ReturnType<typeof setTimeout> | null = null;

  protected override createRenderRoot() {
    return this;
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this._cleanupTimer) {
      clearTimeout(this._cleanupTimer);
      this._cleanupTimer = null;
    }
  }

  override willUpdate(changed: PropertyValues) {
    const btn = typeof this.querySelector === "function" ? this.querySelector<HTMLButtonElement>("button") : null;
    if (btn) {
      this._prevWidth = btn.getBoundingClientRect().width;
    }

    if (changed.has("status")) {
      const oldStatus = changed.get("status") as ButtonStatus | undefined;
      if (oldStatus !== undefined && oldStatus !== this.status) {
        this._prevStatus = oldStatus;
      }
    }

    if (changed.has("label")) {
      const oldLabel = changed.get("label") as string | undefined;
      if (oldLabel !== undefined && oldLabel !== this.label) {
        this._prevLabel = oldLabel;
      }
    }

    if (this._prevStatus !== null || this._prevLabel !== null) {
      if (this._cleanupTimer) {
        clearTimeout(this._cleanupTimer);
      }
      this._cleanupTimer = setTimeout(() => {
        this._prevStatus = null;
        this._prevLabel = null;
        this.requestUpdate();
      }, 500);
    }
  }

  override updated(changed: PropertyValues) {
    if ((changed.has("status") || changed.has("label")) && this._prevWidth > 0) {
      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

      if (!prefersReduced) {
        const btn = typeof this.querySelector === "function" ? this.querySelector<HTMLButtonElement>("button") : null;
        if (btn) {
          const newWidth = btn.getBoundingClientRect().width;
          if (Math.abs(newWidth - this._prevWidth) >= 1) {
            btn.animate(
              [
                { width: `${this._prevWidth}px` },
                { width: `${newWidth}px` },
              ],
              {
                duration: 380,
                easing: "cubic-bezier(0.16, 1, 0.3, 1)",
              }
            );
          }
        }
      }
    }
  }

  private renderStatusIcon(status: ButtonStatus) {
    const sizeCls =
      this.size === "sm" ? "size-3" : this.size === "lg" ? "size-4" : "size-3.5";

    switch (status) {
      case "loading":
        return html`
          <svg
            class="${sizeCls} omp-spin shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        `;
      case "success":
        return html`
          <svg
            class="${sizeCls} shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        `;
      case "warning":
        return html`
          <svg
            class="${sizeCls} shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        `;
      case "danger":
        return html`
          <svg
            class="${sizeCls} shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        `;
      case "info":
        return html`
          <svg
            class="${sizeCls} shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12" y2="8" />
            <line x1="12" y1="12" x2="12" y2="16" />
          </svg>
        `;
      case "neutral":
      default:
        if (!this.showNeutralIcon) return nothing;
        return html`
          <svg
            class="${sizeCls} shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="7" />
          </svg>
        `;
    }
  }

  override render() {
    const isPulse = this.pulse || this.status === "loading";

    return html`
      <button
        type=${this.type}
        class="omp-status-btn omp-status-btn-${this.size} omp-status-btn-${this.variant} omp-status-${this.status} ${this.buttonClass}"
        ?disabled=${this.disabled || this.status === "loading"}
        aria-live="polite"
      >
        ${isPulse
        ? html`<span class="omp-status-pulse" aria-hidden="true"></span>`
        : nothing}

        ${(() => {
          if (!this.showIcon) return nothing;
          const currentIcon = this.renderStatusIcon(this.status);
          const prevIcon = this._prevStatus ? this.renderStatusIcon(this._prevStatus) : nothing;
          if (currentIcon === nothing && prevIcon === nothing) return nothing;

          return html`
            <span class="omp-roll-stack omp-roll-stack-icon" aria-hidden="true">
              ${this._prevStatus && prevIcon !== nothing
                ? html`
                    <span class="omp-roll-item omp-roll-exit">
                      ${prevIcon}
                    </span>
                  `
                : nothing}
              ${currentIcon !== nothing
                ? html`
                    <span
                      class="omp-roll-item ${this._prevStatus ? "omp-roll-enter" : ""}"
                    >
                      ${currentIcon}
                    </span>
                  `
                : nothing}
            </span>
          `;
        })()}

        <span class="omp-roll-stack omp-roll-stack-label">
          ${this._prevLabel != null
        ? html`
                <span class="omp-roll-item omp-text-roll-exit"
                  >${this._prevLabel}</span
                >
              `
        : nothing}
          <span
            class="omp-roll-item ${this._prevLabel != null ? "omp-text-roll-enter" : ""}"
          >
            ${this.label || html`<slot></slot>`}
          </span>
        </span>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "omp-status-button": OmpStatusButton;
  }
}
