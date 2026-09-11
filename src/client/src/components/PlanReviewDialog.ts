import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "./FormattedText";

@customElement("plan-review-dialog")
export class PlanReviewDialog extends LitElement {
  @property({ attribute: false }) plan?: { planFilePath: string; title: string; planContent: string };
  @property({ attribute: false }) onApprove?: () => void | Promise<void>;
  @property({ attribute: false }) onReject?: (feedback?: string) => void | Promise<void>;
  @property({ attribute: false }) onCancel?: () => void;

  @state() private feedback = "";
  @state() private submitting = false;

  override render() {
    if (!this.plan) return null;

    return html`
      <div class="backdrop" @mousedown=${() => this.onCancel?.()}>
        <section @mousedown=${(event: MouseEvent) => { event.stopPropagation(); }}>
          <header>
            <div class="title-wrap">
              <strong>📋 Plan Review: ${this.plan.title}</strong>
              <span class="plan-path">${this.plan.planFilePath}</span>
            </div>
            <button class="close-btn" @click=${() => this.onCancel?.()} aria-label="Close">×</button>
          </header>

          <div class="body">
            <div class="plan-content">
              <formatted-text .text=${this.plan.planContent}></formatted-text>
            </div>
            <div class="feedback-wrap">
              <label for="feedback-input">Feedback or Change Request (optional):</label>
              <input
                id="feedback-input"
                type="text"
                placeholder="Describe changes needed before approving…"
                .value=${this.feedback}
                @input=${(event: Event) => {
                  if (event.target instanceof HTMLInputElement) this.feedback = event.target.value;
                }}
                @keydown=${(event: KeyboardEvent) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    this.handleReject();
                  }
                }}
              />
            </div>
          </div>

          <footer>
            <div class="footer-left">
              <span class="shortcut-hint">Esc to dismiss</span>
            </div>
            <div class="footer-right">
              <button class="btn secondary" @click=${() => this.onCancel?.()}>Cancel</button>
              <button class="btn warning" ?disabled=${this.submitting} @click=${() => { this.handleReject(); }}>
                Request Changes
              </button>
              <button class="btn primary" ?disabled=${this.submitting} @click=${() => { this.handleApprove(); }}>
                ${this.submitting ? "Approving…" : "Approve & Execute"}
              </button>
            </div>
          </footer>
        </section>
      </div>
    `;
  }

  override firstUpdated(): void {
    window.addEventListener("keydown", this.handleGlobalKeyDown);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.handleGlobalKeyDown);
  }

  private readonly handleGlobalKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      this.onCancel?.();
    }
  };

  private handleApprove(): void {
    this.submitting = true;
    void this.onApprove?.();
  }

  private handleReject(): void {
    this.submitting = true;
    void this.onReject?.(this.feedback.trim() === "" ? undefined : this.feedback.trim());
  }

  static override styles = css`
    :host {
      position: fixed;
      inset: 0;
      z-index: 50;
      color: var(--pi-text);
      font: 14px system-ui, sans-serif;
    }

    .backdrop {
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
      background: var(--pi-overlay);
      padding: 20px;
      box-sizing: border-box;
    }

    section {
      width: min(840px, 100%);
      max-height: min(80vh, 720px);
      display: flex;
      flex-direction: column;
      border: 1px solid var(--pi-border);
      border-radius: 14px;
      background: var(--pi-bg);
      box-shadow: 0 20px 60px var(--pi-shadow-strong);
      overflow: hidden;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border-bottom: 1px solid var(--pi-border);
      background: var(--pi-surface);
    }

    .title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .title-wrap strong {
      font-size: 15px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .plan-path {
      font-family: monospace;
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 6px;
      background: var(--pi-surface-variant, rgba(128, 128, 128, 0.15));
      color: var(--pi-text-muted);
    }

    .close-btn {
      border: 0;
      background: transparent;
      color: var(--pi-text-muted);
      font-size: 20px;
      cursor: pointer;
      padding: 0 4px;
      line-height: 1;
    }

    .close-btn:hover {
      color: var(--pi-text);
    }

    .body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .plan-content {
      border: 1px solid var(--pi-border);
      border-radius: 10px;
      padding: 16px;
      background: var(--pi-surface);
      overflow-x: auto;
      line-height: 1.5;
    }

    .feedback-wrap {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .feedback-wrap label {
      font-size: 12px;
      color: var(--pi-text-muted);
      font-weight: 500;
    }

    .feedback-wrap input {
      border: 1px solid var(--pi-border);
      border-radius: 8px;
      background: var(--pi-surface);
      color: var(--pi-text);
      padding: 10px 14px;
      font-size: 13px;
      outline: none;
    }

    .feedback-wrap input:focus {
      border-color: var(--pi-focus, #3b82f6);
    }

    footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      border-top: 1px solid var(--pi-border);
      background: var(--pi-surface);
    }

    .shortcut-hint {
      font-size: 11px;
      color: var(--pi-text-muted);
    }

    .footer-right {
      display: flex;
      gap: 8px;
    }

    .btn {
      border: 1px solid var(--pi-border);
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.15s, background 0.15s;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn.secondary {
      background: transparent;
      color: var(--pi-text);
    }

    .btn.secondary:hover {
      background: var(--pi-surface-hover, rgba(128, 128, 128, 0.1));
    }

    .btn.warning {
      background: var(--pi-warning-bg, #78350f);
      border-color: var(--pi-warning-border, #92400e);
      color: var(--pi-warning-text, #fef3c7);
    }

    .btn.warning:hover:not(:disabled) {
      filter: brightness(1.1);
    }

    .btn.primary {
      background: var(--pi-accent, #2563eb);
      border-color: var(--pi-accent, #2563eb);
      color: white;
    }

    .btn.primary:hover:not(:disabled) {
      filter: brightness(1.1);
    }
  `;
}
