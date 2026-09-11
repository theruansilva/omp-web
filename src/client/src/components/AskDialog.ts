import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { AskDialogQuestion, AskDialogSubmitResult } from "../api";
import "./FormattedText";

@customElement("ask-dialog")
export class AskDialog extends LitElement {
  @property({ attribute: false }) requestId = "";
  @property({ attribute: false }) questions: AskDialogQuestion[] = [];
  @property({ attribute: false }) onSubmit?: (result: AskDialogSubmitResult) => void;
  @property({ attribute: false }) onChat?: () => void;
  @property({ attribute: false }) onCancel?: () => void;

  @state() private selections: Record<string, { selectedOptions: string[]; customInput: string }> = {};
  @state() private submitting = false;

  override willUpdate(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has("questions")) {
      const next: Record<string, { selectedOptions: string[]; customInput: string }> = {};
      for (const q of this.questions) {
        const existing = this.selections[q.id];
        if (existing) {
          next[q.id] = existing;
          continue;
        }
        let defaultSelected: string[] = [];
        if (q.recommended !== undefined && q.options[q.recommended]) {
          defaultSelected = [q.options[q.recommended]!.label];
        } else if (!q.multi && q.options.length > 0) {
          defaultSelected = [q.options[0]!.label];
        }
        next[q.id] = { selectedOptions: defaultSelected, customInput: "" };
      }
      this.selections = next;
    }
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

  private handleOptionToggle(question: AskDialogQuestion, optionLabel: string, multi: boolean): void {
    const current = this.selections[question.id] ?? { selectedOptions: [], customInput: "" };
    let nextOptions: string[];
    if (multi) {
      if (current.selectedOptions.includes(optionLabel)) {
        nextOptions = current.selectedOptions.filter((opt) => opt !== optionLabel);
      } else {
        nextOptions = [...current.selectedOptions, optionLabel];
      }
    } else {
      nextOptions = [optionLabel];
    }
    this.selections = {
      ...this.selections,
      [question.id]: { ...current, selectedOptions: nextOptions },
    };
  }

  private handleCustomInputChange(questionId: string, value: string): void {
    const current = this.selections[questionId] ?? { selectedOptions: [], customInput: "" };
    this.selections = {
      ...this.selections,
      [questionId]: { ...current, customInput: value },
    };
  }

  private handleSubmit(): void {
    if (this.submitting) return;
    this.submitting = true;
    const results = this.questions.map((q) => {
      const state = this.selections[q.id] ?? { selectedOptions: [], customInput: "" };
      const customTrimmed = state.customInput.trim();
      return {
        id: q.id,
        question: q.question,
        options: q.options.map((o) => o.label),
        multi: q.multi ?? false,
        selectedOptions: state.selectedOptions,
        ...(customTrimmed.length > 0 ? { customInput: customTrimmed } : {}),
      };
    });
    this.onSubmit?.({ kind: "submit", results });
  }

  private handleChat(): void {
    if (this.submitting) return;
    this.submitting = true;
    this.onChat?.();
  }

  override render() {
    if (this.questions.length === 0) return null;

    const title = this.questions.length === 1
      ? (this.questions[0]?.header || "Clarification Needed")
      : `Clarification Needed (${this.questions.length} questions)`;

    return html`
      <div class="backdrop" @mousedown=${() => this.onCancel?.()}>
        <section @mousedown=${(event: MouseEvent) => { event.stopPropagation(); }}>
          <header>
            <div class="title-wrap">
              <strong>❓ ${title}</strong>
            </div>
            <button class="close-btn" @click=${() => this.onCancel?.()} aria-label="Close">×</button>
          </header>

          <div class="body">
            ${this.questions.map((q) => this.renderQuestion(q))}
          </div>

          <footer>
            <div class="footer-left">
              <span class="shortcut-hint">Esc to dismiss</span>
            </div>
            <div class="footer-right">
              <button class="btn secondary" @click=${() => this.onCancel?.()}>Cancel</button>
              <button class="btn secondary" ?disabled=${this.submitting} @click=${() => { this.handleChat(); }}>
                Chat about this
              </button>
              <button class="btn primary" ?disabled=${this.submitting} @click=${() => { this.handleSubmit(); }}>
                ${this.submitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </footer>
        </section>
      </div>
    `;
  }

  private renderQuestion(q: AskDialogQuestion) {
    const state = this.selections[q.id] ?? { selectedOptions: [], customInput: "" };
    const isMulti = q.multi ?? false;

    return html`
      <div class="question-card">
        <h3 class="question-title">${q.question}</h3>
        ${q.header && q.header !== q.question ? html`<div class="question-header">${q.header}</div>` : null}

        <div class="options-group">
          ${q.options.map((option, idx) => {
      const isSelected = state.selectedOptions.includes(option.label);
      const isRecommended = q.recommended === idx;
      return html`
              <label class="option-row ${isSelected ? "selected" : ""}">
                <input
                  type=${isMulti ? "checkbox" : "radio"}
                  name=${`question-${q.id}`}
                  .checked=${isSelected}
                  @change=${() => { this.handleOptionToggle(q, option.label, isMulti); }}
                />
                <div class="option-content">
                  <div class="option-label-wrap">
                    <span class="option-label">${option.label}</span>
                    ${isRecommended ? html`<span class="recommended-badge">Recommended</span>` : null}
                  </div>
                  ${option.description ? html`<div class="option-desc">${option.description}</div>` : null}
                  ${option.preview ? html`<pre class="option-preview">${option.preview}</pre>` : null}
                </div>
              </label>
            `;
    })}
        </div>

        <div class="custom-input-wrap">
          <label for=${`custom-${q.id}`}>Other / Custom Response:</label>
          <input
            id=${`custom-${q.id}`}
            type="text"
            placeholder="Type your own answer…"
            .value=${state.customInput}
            @input=${(event: Event) => {
        if (event.target instanceof HTMLInputElement) {
          this.handleCustomInputChange(q.id, event.target.value);
        }
      }}
            @keydown=${(event: KeyboardEvent) => {
        if (event.key === "Enter") {
          event.preventDefault();
          this.handleSubmit();
        }
      }}
          />
        </div>
      </div>
    `;
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
      width: min(640px, 100%);
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
    }

    .title-wrap strong {
      font-size: 15px;
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
      gap: 20px;
    }

    .question-card {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .question-title {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      line-height: 1.4;
    }

    .question-header {
      font-size: 12px;
      color: var(--pi-text-muted);
    }

    .options-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .option-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      border: 1px solid var(--pi-border);
      border-radius: 8px;
      background: var(--pi-surface);
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }

    .option-row:hover {
      border-color: var(--pi-accent);
    }

    .option-row.selected {
      border-color: var(--pi-accent);
      background: var(--pi-accent-subtle, rgba(59, 130, 246, 0.08));
    }

    .option-row input {
      margin-top: 3px;
      accent-color: var(--pi-accent);
      cursor: pointer;
    }

    .option-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .option-label-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .option-label {
      font-weight: 500;
      font-size: 14px;
    }

    .recommended-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 4px;
      background: var(--pi-success, #22c55e);
      color: #fff;
    }

    .option-desc {
      font-size: 12px;
      color: var(--pi-text-muted);
      line-height: 1.3;
    }

    .option-preview {
      margin: 4px 0 0 0;
      padding: 6px;
      font-size: 11px;
      border-radius: 4px;
      background: var(--pi-bg);
      border: 1px solid var(--pi-border);
      overflow-x: auto;
    }

    .custom-input-wrap {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 4px;
    }

    .custom-input-wrap label {
      font-size: 12px;
      color: var(--pi-text-muted);
    }

    .custom-input-wrap input {
      padding: 8px 12px;
      border: 1px solid var(--pi-border);
      border-radius: 6px;
      background: var(--pi-surface);
      color: var(--pi-text);
      font: inherit;
      outline: none;
    }

    .custom-input-wrap input:focus {
      border-color: var(--pi-accent);
    }

    footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border-top: 1px solid var(--pi-border);
      background: var(--pi-surface);
    }

    .footer-left {
      font-size: 11px;
      color: var(--pi-text-muted);
    }

    .footer-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn {
      padding: 7px 14px;
      border-radius: 8px;
      font: inherit;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid transparent;
      transition: background 0.15s, opacity 0.15s;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn.primary {
      background: var(--pi-accent, #3b82f6);
      color: #fff;
    }

    .btn.primary:not(:disabled):hover {
      filter: brightness(1.1);
    }

    .btn.secondary {
      background: var(--pi-surface);
      border-color: var(--pi-border);
      color: var(--pi-text);
    }

    .btn.secondary:not(:disabled):hover {
      background: var(--pi-surface-variant, rgba(128, 128, 128, 0.1));
    }
  `;
}
