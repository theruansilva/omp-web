import { html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { AiElement, aiChevron, aiCode, aiDiff, aiStatusIcon, emit, formatDuration, type AiStatus } from "./trace";

const PRE = "max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/5 p-2 font-mono text-[11px] leading-relaxed text-foreground-800 dark:bg-white/[0.06]";

/** Normalizes omp's ToolItem status ("completed") to AiStatus. */
export function toAiStatus(s: AiStatus | "completed" | undefined): AiStatus {
  return s === "completed" ? "done" : (s ?? "pending");
}

export function stringifyInput(input: unknown): string {
  if (input === undefined || input === null) return "";
  if (typeof input === "string") return input;
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input);
  }
}

@customElement("ai-tool")
export class AiTool extends AiElement {
  @property() name = "";
  @property() status: AiStatus | "completed" = "pending";
  @property() target?: string;
  @property({ attribute: false }) input?: unknown;
  @property() output?: string;
  @property({ attribute: "error-text" }) errorText?: string;
  @property({ attribute: false }) diffStats?: { added: number; removed: number };
  @property({ type: Number, attribute: "duration-ms" }) durationMs?: number;
  @property() diff?: string;
  /** Controlled open state; leave undefined for uncontrolled. */
  @property({ type: Boolean, reflect: true }) open?: boolean;
  /** Shows Approve/Deny actions (emits ai-approve / ai-deny). */
  @property({ type: Boolean }) approval = false;
  @state() private _open = false;

  private get isOpen(): boolean {
    return this.open ?? this._open;
  }

  private toggle = (): void => {
    const next = !this.isOpen;
    this._open = next;
    emit(this, "ai-toggle", { open: next });
  };

  private block(label: string, body: unknown, cls = ""): TemplateResult {
    return html`<div class="mt-1"><div class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-foreground-600">${label}</div><pre class="${PRE} ${cls}">${body}</pre></div>`;
  }

  override render(): TemplateResult {
    const status = toAiStatus(this.status);
    const open = this.isOpen;
    const input = stringifyInput(this.input);
    const hasBody = input !== "" || !!this.output || !!this.errorText || !!this.diff;
    const stats = this.diffStats;
    const meta = html`${this.target ? html`<span class="font-mono">${this.target}</span>` : nothing}${stats ? html` <span class="text-[var(--success)]">+${stats.added}</span> <span class="text-[var(--danger)]">-${stats.removed}</span>` : nothing}${this.durationMs !== undefined ? html` ${formatDuration(this.durationMs)}` : nothing}`;
    const head = html`
      <span class="inline-flex w-4 shrink-0 items-center justify-center">${aiStatusIcon(status)}</span>
      <span class="min-w-0 truncate text-xs font-semibold text-foreground-900 ${status === "running" ? "motion-safe:animate-pulse" : ""}">${this.name}</span>
      <span class="min-w-0 truncate text-xs text-foreground-600">${meta}</span>
      ${hasBody ? html`<span class="ml-auto pl-1">${aiChevron(open)}</span>` : nothing}`;
    return html`<div class="text-xs">
      ${hasBody
        ? html`<button type="button" class="flex min-h-7 w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/10" aria-expanded=${open ? "true" : "false"} @click=${this.toggle}>${head}</button>`
        : html`<div class="flex min-h-7 items-center gap-2 px-2 py-1">${head}</div>`}
      ${open && hasBody
        ? html`<div class="ml-4 mb-1 border-l border-black/10 pl-3 dark:border-white/10">
            ${input ? this.block("Input", aiCode(input)) : nothing}
            ${this.diff ? this.block("Diff", aiDiff(this.diff)) : nothing}
            ${this.output ? this.block("Output", aiCode(this.output)) : nothing}
            ${this.errorText ? this.block("Error", aiCode(this.errorText), "text-[var(--danger)]") : nothing}
          </div>`
        : nothing}
      ${this.approval
        ? html`<div class="ml-6 mt-1 flex gap-2">
            <button type="button" class="rounded-xl border border-black/10 px-3 py-1 text-xs hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10" @click=${() => emit(this, "ai-deny")}>Deny</button>
            <button type="button" class="rounded-xl bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-[var(--primary-foreground,inherit)] hover:opacity-90" @click=${() => emit(this, "ai-approve")}>Approve</button>
          </div>`
        : nothing}
    </div>`;
  }
}

export const toolDemo = (): TemplateResult => html`
  <div class="flex flex-col gap-2">
    <ai-tool name="Read" target="src/index.ts" status="done" .durationMs=${420} .input=${{ path: "src/index.ts" }} output="export const x = 1;"></ai-tool>
    <ai-tool name="Bash" status="running" .input=${{ command: "bun test" }}></ai-tool>
    <ai-tool name="Edit" target="a.ts" status="error" .diffStats=${{ added: 3, removed: 1 }} error-text="Patch failed to apply"></ai-tool>
    <ai-tool name="Write" target="config.json" status="pending" approval .input=${{ path: "config.json" }}></ai-tool>
  </div>`;
