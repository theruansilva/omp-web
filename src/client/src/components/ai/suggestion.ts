import { html, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { AiElement, emit } from "./trace";

/** Horizontally scrollable row of prompt chips. Event: `ai-suggestion-select` { text }. */
@customElement("ai-suggestion")
export class AiSuggestion extends AiElement {
  @property({ attribute: false }) suggestions: string[] = [];
  @property({ type: Boolean }) disabled = false;

  override render(): TemplateResult {
    return html`<div class="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="list" aria-label="Suggestions">
      ${this.suggestions.map(
        (text) => html`<button type="button" role="listitem" class="shrink-0 cursor-pointer rounded-full border border-black/10 px-3 py-1.5 text-xs text-foreground-900 transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10" ?disabled=${this.disabled} @click=${() => emit(this, "ai-suggestion-select", { text })}>${text}</button>`,
      )}
    </div>`;
  }
}

export const suggestionDemo = (): TemplateResult => html`
  <div class="mx-auto w-full max-w-lg py-6">
    <ai-suggestion .suggestions=${["Add a dark mode toggle", "Fix the failing build", "Write tests for the form", "Upgrade to Next.js 16", "Add a loading state", "Find unused dependencies"]}></ai-suggestion>
  </div>
`;
