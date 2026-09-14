import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { AskDialogQuestion, AskDialogResult } from "../api";
import "./FormattedText";

@customElement("ask-dialog")
export class AskDialog extends LitElement {
  @property({ attribute: false }) requestId = "";
  @property({ attribute: false }) questions: AskDialogQuestion[] = [];
  @property({ attribute: false }) onSubmit?: (result: AskDialogResult, requestId?: string) => void;
  @property({ attribute: false }) onChat?: (requestId?: string) => void;
  @property({ attribute: false }) onCancel?: (requestId?: string) => void;
  @property({ type: Boolean, reflect: true }) inline = false;

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
      this.onCancel?.(this.requestId);
    }
  };

  private handleOptionToggle(question: AskDialogQuestion, optionLabel: string): void {
    const current = this.selections[question.id] ?? { selectedOptions: [], customInput: "" };
    let nextOptions: string[];
    // If multi is explicitly false, behave as single-choice (can still be clicked to unselect)
    if (question.multi === false) {
      nextOptions = current.selectedOptions.includes(optionLabel) ? [] : [optionLabel];
    } else {
      // Default is checklist: multiple options can be toggled independently
      if (current.selectedOptions.includes(optionLabel)) {
        nextOptions = current.selectedOptions.filter((opt) => opt !== optionLabel);
      } else {
        nextOptions = [...current.selectedOptions, optionLabel];
      }
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
    try {
      const results = this.questions.map((q) => {
        const state = this.selections[q.id] ?? { selectedOptions: [], customInput: "" };
        const customTrimmed = state.customInput.trim();
        return {
          id: q.id,
          question: q.question,
          options: q.options.map((o) => o.label),
          multi: q.multi !== false,
          selectedOptions: state.selectedOptions,
          ...(customTrimmed.length > 0 ? { customInput: customTrimmed } : {}),
        };
      });
      this.onSubmit?.({ kind: "submit", results }, this.requestId);
    } catch (err) {
      this.submitting = false;
      console.error("Failed to submit ask dialog", err);
    }
  }

  private handleChat(): void {
    if (this.submitting) return;
    this.submitting = true;
    this.onChat?.(this.requestId);
  }

  override render() {
    if (this.questions.length === 0) return null;

    const title = this.questions.length === 1
      ? (this.questions[0]?.header || "Clarification Needed")
      : `Clarification Needed (${this.questions.length} questions)`;

    if (this.inline) {
      return html`
        <section class="inline-card">
          <header>
            <div class="title-wrap">
              <span class="ask-badge">Pergunta</span>
              <strong>${title}</strong>
            </div>
            <button class="close-btn" @click=${() => this.onCancel?.(this.requestId)} aria-label="Dismiss" title="Dismiss">×</button>
          </header>

          <div class="body">
            ${this.questions.map((q) => this.renderQuestion(q))}
          </div>

          <footer>
            <div class="footer-left">
              <span class="shortcut-hint">Selecione uma ou mais opções</span>
            </div>
            <div class="footer-right">
              <button class="btn secondary" @click=${() => this.onCancel?.(this.requestId)}>Cancelar</button>
              <button class="btn secondary" ?disabled=${this.submitting} @click=${() => { this.handleChat(); }}>
                Responder no chat
              </button>
              <button class="btn primary" ?disabled=${this.submitting} @click=${() => { this.handleSubmit(); }}>
                ${this.submitting ? "Enviando…" : "Confirmar seleção"}
              </button>
            </div>
          </footer>
        </section>
      `;
    }

    return html`
      <div class="backdrop" @mousedown=${() => this.onCancel?.(this.requestId)}>
        <section @mousedown=${(event: MouseEvent) => { event.stopPropagation(); }}>
          <header>
            <div class="title-wrap">
              <strong>❓ ${title}</strong>
            </div>
            <button class="close-btn" @click=${() => this.onCancel?.(this.requestId)} aria-label="Close">×</button>
          </header>

          <div class="body">
            ${this.questions.map((q) => this.renderQuestion(q))}
          </div>

          <footer>
            <div class="footer-left">
              <span class="shortcut-hint">Esc to dismiss</span>
            </div>
            <div class="footer-right">
              <button class="btn secondary" @click=${() => this.onCancel?.(this.requestId)}>Cancel</button>
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

    return html`
      <div class="question-card">
        <h3 class="question-title">${q.question}</h3>
        ${q.header && q.header !== q.question ? html`<div class="question-header">${q.header}</div>` : null}

        <div class="options-group">
          ${q.options.map((option, idx) => {
      const isSelected = state.selectedOptions.includes(option.label);
      const isRecommended = q.recommended === idx;
      return html`
              <div
                class="option-row ${isSelected ? "selected" : ""}"
                role="checkbox"
                aria-checked=${isSelected ? "true" : "false"}
                tabindex="0"
                @click=${() => { this.handleOptionToggle(q, option.label); }}
                @keydown=${(e: KeyboardEvent) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            this.handleOptionToggle(q, option.label);
          }
        }}
              >
                <div class="custom-checkbox ${isSelected ? "checked" : ""}" aria-hidden="true">
                  ${isSelected ? html`<span class="check-mark">✓</span>` : null}
                </div>
                <div class="option-content">
                  <div class="option-label-wrap">
                    <span class="option-label">${option.label}</span>
                    ${isSelected ? html`<span class="selected-badge">✓ Selecionado</span>` : null}
                    ${isRecommended ? html`<span class="recommended-badge">Recomendado</span>` : null}
                  </div>
                  ${option.description ? html`<div class="option-desc">${option.description}</div>` : null}
                  ${option.preview ? html`<pre class="option-preview">${option.preview}</pre>` : null}
                </div>
              </div>
            `;
    })}
        </div>

        <div class="custom-input-wrap">
          <label for=${`custom-${q.id}`}>Outra resposta personalizada:</label>
          <input
            id=${`custom-${q.id}`}
            type="text"
            placeholder="Digite sua própria resposta (opcional)…"
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
      display: block;
      color: var(--pi-text);
      font: 14px system-ui, sans-serif;
    }

    :host(:not([inline])) {
      position: fixed;
      inset: 0;
      z-index: 1000;
    }

    :host([inline]) {
      position: static !important;
      inset: auto !important;
      display: block !important;
      width: 100% !important;
      margin: 16px 0 !important;
      z-index: auto !important;
    }

    :host([inline]) .inline-card {
      width: 100%;
      max-height: none;
      border: 1px solid var(--pi-border);
      border-radius: 12px;
      background: var(--pi-surface);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      box-sizing: border-box;
      overflow: hidden;
    }

    :host([inline]) header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid var(--pi-border);
      background: rgba(255, 255, 255, 0.02);
    }

    :host([inline]) .body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: none;
      overflow: visible;
    }

    :host([inline]) footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-top: 1px solid var(--pi-border);
      background: rgba(255, 255, 255, 0.02);
    }

    .ask-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: rgba(88, 166, 255, 0.15);
      color: var(--pi-accent, #58a6ff);
      border: 1px solid rgba(88, 166, 255, 0.3);
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
      gap: 8px;
    }

    .option-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 14px;
      border: 1.5px solid var(--pi-border, rgba(255, 255, 255, 0.12));
      border-radius: 10px;
      background: var(--pi-surface, #161b22);
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
      user-select: none;
      outline: none;
    }

    .option-row:hover, .option-row:focus-visible {
      border-color: rgba(88, 166, 255, 0.5);
      background: rgba(88, 166, 255, 0.05);
    }

    .option-row.selected {
      border-color: var(--pi-accent, #58a6ff) !important;
      background: rgba(88, 166, 255, 0.14) !important;
      box-shadow: 0 0 0 1px var(--pi-accent, #58a6ff), 0 2px 8px rgba(88, 166, 255, 0.15);
    }

    .option-row.selected .option-label {
      color: var(--pi-text, #e6edf3);
      font-weight: 600;
    }

    .custom-checkbox {
      width: 20px;
      height: 20px;
      min-width: 20px;
      margin-top: 1px;
      border-radius: 5px;
      border: 2px solid var(--pi-muted, #8b949e);
      background: var(--pi-bg, #0d1117);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease-in-out;
    }

    .option-row:hover .custom-checkbox {
      border-color: var(--pi-accent, #58a6ff);
    }

    .custom-checkbox.checked {
      background: var(--pi-accent, #58a6ff);
      border-color: var(--pi-accent, #58a6ff);
      box-shadow: 0 0 6px rgba(88, 166, 255, 0.4);
    }

    .check-mark {
      color: #ffffff;
      font-size: 13px;
      font-weight: 800;
      line-height: 1;
    }

    .selected-badge {
      font-size: 10.5px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 4px;
      background: var(--pi-accent, #58a6ff);
      color: #ffffff;
      margin-left: 6px;
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
      font-size: 13px;
      color: var(--pi-text-muted);
      line-height: 1.4;
    }

    .option-preview {
      margin: 4px 0 0;
      padding: 6px 8px;
      border-radius: 6px;
      background: var(--pi-bg);
      font-size: 11px;
      overflow-x: auto;
    }

    .custom-input-wrap {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-top: 8px;
      border-top: 1px dashed var(--pi-border);
    }

    .custom-input-wrap label {
      font-size: 12px;
      color: var(--pi-text-muted);
    }

    .custom-input-wrap input {
      padding: 8px 10px;
      border: 1px solid var(--pi-border);
      border-radius: 6px;
      background: var(--pi-bg);
      color: var(--pi-text);
      font-size: 13px;
      outline: none;
    }

    .custom-input-wrap input:focus {
      border-color: var(--pi-accent);
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
      font-size: 12px;
      color: var(--pi-text-muted);
    }

    .footer-right {
      display: flex;
      gap: 8px;
    }

    .btn {
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, opacity 0.15s;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn.secondary {
      border: 1px solid var(--pi-border);
      background: transparent;
      color: var(--pi-text);
    }

    .btn.secondary:hover:not(:disabled) {
      background: var(--pi-surface-hover, rgba(255, 255, 255, 0.05));
    }

    .btn.primary {
      border: 1px solid var(--pi-accent, #3b82f6);
      background: var(--pi-accent, #3b82f6);
      color: #fff;
    }

    .btn.primary:hover:not(:disabled) {
      opacity: 0.9;
    }
  `;
}
