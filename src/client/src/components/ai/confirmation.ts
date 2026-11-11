import { html, nothing, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { AI_CARD_CLASS, AiElement, emit } from "./trace";

export type ConfirmationState = "requested" | "approved" | "denied";

@customElement("ai-confirmation")
export class AiConfirmation extends AiElement {
  @property() heading = "";
  @property() description?: string;
  @property() state: ConfirmationState = "requested";
  @property({ attribute: "approve-label" }) approveLabel = "Approve";
  @property({ attribute: "deny-label" }) denyLabel = "Deny";

  override render(): TemplateResult {
    const s = this.state;
    return html`<div class="${AI_CARD_CLASS} flex items-center gap-3 p-3" role="group" aria-label=${this.heading}>
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-semibold text-foreground-900">${this.heading}</div>
        ${this.description ? html`<div class="text-xs text-foreground-600">${this.description}</div>` : nothing}
      </div>
      ${s === "requested"
        ? html`<button type="button" class="rounded-xl border border-black/10 px-3 py-1 text-xs hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10" @click=${() => emit(this, "ai-deny")}>${this.denyLabel}</button>
            <button type="button" class="rounded-xl bg-[var(--primary)] px-3 py-1 text-xs font-semibold hover:opacity-90" @click=${() => emit(this, "ai-approve")}>${this.approveLabel}</button>`
        : html`<span class="text-xs font-semibold ${s === "approved" ? "text-[var(--success)]" : "text-[var(--danger)]"}" role="status">${s === "approved" ? "Approved" : "Denied"}</span>`}
    </div>`;
  }
}

export const confirmationDemo = (): TemplateResult => html`
  <div class="flex flex-col gap-2">
    <ai-confirmation heading="Run bun test?" description="The command runs in this project."></ai-confirmation>
    <ai-confirmation heading="Run bun test?" state="approved"></ai-confirmation>
    <ai-confirmation heading="Delete dist/?" state="denied"></ai-confirmation>
  </div>`;
