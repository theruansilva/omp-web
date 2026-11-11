import { html, nothing, type TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { AI_CARD_CLASS, AiElement, aiStatusIcon, emit, formatDuration, type AiStatus } from "./trace";

// ESC [ ... final-byte (CSI) and OSC sequences.
const ANSI_RE = /\u001b\[[0-?]*[ -/]*[@-~]|\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/g;

/** Removes ANSI escape sequences; colors are intentionally dropped. */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, "");
}

@customElement("ai-terminal")
export class AiTerminal extends AiElement {
  @property() command = "";
  @property() output = "";
  @property() status: AiStatus = "done";
  @property({ type: Number, attribute: "exit-code" }) exitCode?: number;
  @property({ type: Number, attribute: "duration-ms" }) durationMs?: number;
  @query("pre") private pre?: HTMLPreElement;

  protected override updated(): void {
    // Follow streaming output.
    if (this.status === "running" && this.pre) this.pre.scrollTop = this.pre.scrollHeight;
  }

  private copy = (): void => {
    void navigator.clipboard?.writeText(stripAnsi(this.output));
    emit(this, "ai-copy", { text: stripAnsi(this.output) });
  };

  override render(): TemplateResult {
    const failed = this.exitCode !== undefined && this.exitCode !== 0;
    const status = this.status === "done" && failed ? "error" : this.status;
    return html`<div class="${AI_CARD_CLASS} overflow-hidden">
      <div class="flex items-center gap-2 px-3 py-2">
        ${aiStatusIcon(status)}
        <code class="min-w-0 flex-1 truncate font-mono text-xs text-foreground-900"><span class="text-foreground-600">$</span> ${this.command}</code>
        ${this.exitCode !== undefined ? html`<span class="text-[10px] ${failed ? "text-[var(--danger)]" : "text-foreground-600"}">exit ${this.exitCode}</span>` : nothing}
        ${this.durationMs !== undefined ? html`<span class="text-[10px] text-foreground-600">${formatDuration(this.durationMs)}</span>` : nothing}
        <button type="button" class="rounded-lg px-2 py-0.5 text-[10px] text-foreground-600 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Copy output" @click=${this.copy}>Copy</button>
      </div>
      ${this.output
        ? html`<pre class="m-2 mt-0 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/5 p-2 font-mono text-[11px] leading-relaxed text-foreground-800 dark:bg-white/[0.06]">${stripAnsi(this.output)}</pre>`
        : nothing}
    </div>`;
  }
}

export const terminalDemo = (): TemplateResult => html`
  <div class="flex flex-col gap-2">
    <ai-terminal command="bun test" .exitCode=${0} .durationMs=${2300} output="\u001b[32m✓\u001b[0m 12 tests passed"></ai-terminal>
    <ai-terminal command="bun run build" .exitCode=${1} output="error: build failed"></ai-terminal>
    <ai-terminal command="bun dev" status="running" output="listening on :3000"></ai-terminal>
  </div>`;
