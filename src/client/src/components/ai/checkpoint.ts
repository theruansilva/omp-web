import { html, nothing, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { AiElement, emit } from "./trace";

/** Divider-like marker with a Restore button. Event: `ai-checkpoint-restore` { id }. */
@customElement("ai-checkpoint")
export class AiCheckpoint extends AiElement {
  @property({ type: String }) label = "Checkpoint";
  /** Opaque id echoed in the restore event (e.g. the message id). */
  @property({ type: String }) checkpointId = "";
  /** Hide Restore for the latest checkpoint (nothing to drop). */
  @property({ type: Boolean, attribute: "can-restore" }) canRestore = true;

  override render(): TemplateResult {
    return html`<div class="flex w-full items-center gap-3 text-xs text-foreground-600" role="separator" aria-label=${this.label}>
      <span class="h-px flex-1 bg-black/10 dark:bg-white/10"></span>
      <span class="inline-flex items-center gap-2">
        <svg class="size-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3v12"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
        ${this.label}
        ${this.canRestore
          ? html`<button type="button" class="cursor-pointer rounded-lg border border-black/10 px-2 py-0.5 text-xs font-medium text-foreground-900 transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10" aria-label=${`Restore to ${this.label}`} @click=${() => emit(this, "ai-checkpoint-restore", { id: this.checkpointId })}>Restore</button>`
          : nothing}
      </span>
      <span class="h-px flex-1 bg-black/10 dark:bg-white/10"></span>
    </div>`;
  }
}

export const checkpointDemo = (): TemplateResult => html`
  <div class="mx-auto flex w-full max-w-sm flex-col gap-4 py-6">
    <ai-checkpoint label="Button renamed" checkpointId="rename"></ai-checkpoint>
    <ai-checkpoint label="Docs updated" checkpointId="docs" .canRestore=${false}></ai-checkpoint>
  </div>
`;
