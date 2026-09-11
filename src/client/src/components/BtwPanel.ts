import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "./FormattedText";

export interface BtwState {
  status: "running" | "complete" | "error";
  question: string;
  answer: string;
  canBranch?: boolean | undefined;
  error?: string | undefined;
}

@customElement("btw-panel")
export class BtwPanel extends LitElement {
  @property({ attribute: false }) state?: BtwState;
  @property({ attribute: false }) onBranch?: () => void | Promise<void>;
  @property({ attribute: false }) onClose?: () => void;

  @state() private copied = false;
  @state() private branching = false;

  override render() {
    if (!this.state) return null;

    const isRunning = this.state.status === "running";
    const isError = this.state.status === "error";

    return html`
      <div class="btw-floating-card">
        <header>
          <div class="header-left">
            <span class="icon">💡</span>
            <strong>Side Question (/btw)</strong>
            <span class=${`status-pill ${this.state.status}`}>
              ${isRunning ? "Thinking…" : (isError ? "Error" : "Answered")}
            </span>
          </div>
          <button class="close-btn" @click=${() => this.onClose?.()} aria-label="Close">×</button>
        </header>

        <div class="question-row">
          <span class="label">Q:</span>
          <span class="question-text">${this.state.question}</span>
        </div>

        <div class="answer-row">
          ${isRunning && !this.state.answer ? html`
            <div class="loading-state">
              <span class="spinner"></span>
              <span>Thinking with session context…</span>
            </div>
          ` : null}
          ${this.state.answer ? html`
            <div class="answer-content">
              <formatted-text .text=${this.state.answer}></formatted-text>
            </div>
          ` : null}
          ${isError ? html`
            <div class="error-content">${this.state.error ?? "Failed to answer ephemeral question."}</div>
          ` : null}
        </div>

        <footer>
          <div class="footer-left">
            <span class="hint">Esc to dismiss</span>
          </div>
          <div class="footer-right">
            ${this.state.answer !== "" ? html`
              <button class="btn secondary" @click=${() => { void this.handleCopy(); }}>
                ${this.copied ? "✓ Copied" : "Copy Answer"}
              </button>
            ` : null}
            ${this.state.canBranch === true ? html`
              <button class="btn primary" ?disabled=${this.branching} @click=${() => { this.handleBranch(); }}>
                ${this.branching ? "Branching…" : "Branch to Session"}
              </button>
            ` : null}
            <button class="btn secondary" @click=${() => { this.onClose?.(); }}>Dismiss</button>
          </div>
        </footer>
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
      this.onClose?.();
    }
  };

  private async handleCopy(): Promise<void> {
    if (this.state?.answer === undefined || this.state.answer === "") return;
    try {
      await navigator.clipboard.writeText(this.state.answer);
      this.copied = true;
      setTimeout(() => { this.copied = false; }, 2000);
    } catch {
      // ignore
    }
  }

  private handleBranch(): void {
    this.branching = true;
    void this.onBranch?.();
  }

  static override styles = css`
    :host {
      position: fixed;
      bottom: 90px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 40;
      width: min(680px, calc(100vw - 32px));
      font: 14px system-ui, sans-serif;
      color: var(--pi-text);
      pointer-events: auto;
    }

    .btw-floating-card {
      display: flex;
      flex-direction: column;
      max-height: 480px;
      border: 1px solid var(--pi-border);
      border-radius: 14px;
      background: var(--pi-bg);
      box-shadow: 0 12px 40px var(--pi-shadow-strong, rgba(0, 0, 0, 0.35));
      overflow: hidden;
      animation: slide-up 0.2s ease-out;
    }

    @keyframes slide-up {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-bottom: 1px solid var(--pi-border);
      background: var(--pi-surface);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .icon {
      font-size: 16px;
    }

    .status-pill {
      font-size: 11px;
      font-weight: 500;
      padding: 2px 7px;
      border-radius: 999px;
      text-transform: capitalize;
    }

    .status-pill.running {
      background: var(--pi-accent-subtle, rgba(37, 99, 235, 0.15));
      color: var(--pi-accent, #3b82f6);
      animation: pulse 1.5s infinite;
    }

    .status-pill.complete {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
    }

    .status-pill.error {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .close-btn {
      border: 0;
      background: transparent;
      color: var(--pi-text-muted);
      font-size: 18px;
      cursor: pointer;
      line-height: 1;
      padding: 0 4px;
    }

    .close-btn:hover {
      color: var(--pi-text);
    }

    .question-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
      padding: 10px 14px;
      background: var(--pi-surface-variant, rgba(128, 128, 128, 0.08));
      border-bottom: 1px solid var(--pi-border);
      font-size: 13px;
    }

    .label {
      font-weight: bold;
      color: var(--pi-accent, #3b82f6);
    }

    .question-text {
      font-weight: 500;
      color: var(--pi-text);
      word-break: break-word;
    }

    .answer-row {
      flex: 1;
      min-height: 60px;
      max-height: 320px;
      overflow-y: auto;
      padding: 14px;
    }

    .loading-state {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--pi-text-muted);
      font-size: 13px;
      padding: 12px 0;
    }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid var(--pi-border);
      border-top-color: var(--pi-accent, #3b82f6);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .answer-content {
      line-height: 1.5;
      font-size: 13px;
    }

    .error-content {
      color: #ef4444;
      font-size: 13px;
      padding: 8px 0;
    }

    footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 14px;
      border-top: 1px solid var(--pi-border);
      background: var(--pi-surface);
    }

    .hint {
      font-size: 11px;
      color: var(--pi-text-muted);
    }

    .footer-right {
      display: flex;
      gap: 6px;
    }

    .btn {
      border: 1px solid var(--pi-border);
      border-radius: 6px;
      padding: 6px 11px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
    }

    .btn.secondary {
      background: transparent;
      color: var(--pi-text);
    }

    .btn.secondary:hover {
      background: var(--pi-surface-hover, rgba(128, 128, 128, 0.1));
    }

    .btn.primary {
      background: var(--pi-accent, #2563eb);
      border-color: var(--pi-accent, #2563eb);
      color: white;
    }

    .btn.primary:hover:not(:disabled) {
      filter: brightness(1.1);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;
}
