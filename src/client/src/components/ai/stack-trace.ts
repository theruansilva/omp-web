import { html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { AI_CARD_CLASS, AiElement, aiChevron, emit } from "./trace";

export interface StackFrame {
  raw: string;
  fn?: string;
  file?: string;
  line?: number;
  col?: number;
  /** node: internals / site-packages / library frames. */
  internal: boolean;
}

export interface ParsedStackTrace {
  errorType?: string;
  message: string;
  frames: StackFrame[];
}

const JS_FRAME = /^\s*at\s+(?:(.+?)\s+\()?(.+?):(\d+)(?::(\d+))?\)?\s*$/;
const PY_FRAME = /^\s*File "(.+)", line (\d+)(?:, in (.+))?\s*$/;
const ERR_LINE = /^([A-Za-z_][\w.$]*(?:Error|Exception|Warning)?)(?::\s*(.*))?$/;

function isInternal(file: string): boolean {
  return file.startsWith("node:") || file.includes("node_modules") || file.includes("site-packages") || file.includes("<frozen");
}

/** Parses JS/Node style ("at fn (file:1:2)") and Python tracebacks. */
export function parseStackTrace(text: string): ParsedStackTrace {
  const frames: StackFrame[] = [];
  const other: string[] = [];
  for (const l of text.split("\n")) {
    const js = JS_FRAME.exec(l);
    if (js) {
      const file = js[2]!;
      frames.push({ raw: l.trim(), ...(js[1] ? { fn: js[1] } : {}), file, line: Number(js[3]), ...(js[4] ? { col: Number(js[4]) } : {}), internal: isInternal(file) });
      continue;
    }
    const py = PY_FRAME.exec(l);
    if (py) {
      frames.push({ raw: l.trim(), ...(py[3] ? { fn: py[3] } : {}), file: py[1]!, line: Number(py[2]), internal: isInternal(py[1]!) });
      continue;
    }
    if (l.trim() && !l.startsWith("Traceback") && !(frames.length && /^\s{2,}\S/.test(l))) other.push(l.trim());
  }
  // JS: error is the first line; Python: the last non-frame line.
  const isPy = text.includes("Traceback (most recent call last)");
  const head = isPy ? other[other.length - 1] : other[0];
  const m = head ? ERR_LINE.exec(head) : null;
  if (m && (m[2] !== undefined || /Error|Exception/.test(m[1]!))) return { errorType: m[1]!, message: m[2] ?? "", frames };
  return { message: head ?? "", frames };
}

@customElement("ai-stack-trace")
export class AiStackTrace extends AiElement {
  @property() trace = "";
  @property({ type: Boolean, reflect: true }) open?: boolean;
  @property({ type: Boolean, attribute: "show-internal" }) showInternal = false;
  @state() private _open = false;

  private get isOpen(): boolean {
    return this.open ?? this._open;
  }

  private toggle = (): void => {
    this._open = !this.isOpen;
    emit(this, "ai-toggle", { open: this._open });
  };

  override render(): TemplateResult {
    const p = parseStackTrace(this.trace);
    const open = this.isOpen;
    const frames = this.showInternal ? p.frames : p.frames.filter((f) => !f.internal);
    return html`<div class="${AI_CARD_CLASS} overflow-hidden">
      <button type="button" class="flex w-full cursor-pointer items-start gap-2 px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10" aria-expanded=${open ? "true" : "false"} @click=${this.toggle}>
        <span class="mt-0.5">${aiChevron(open)}</span>
        <span class="min-w-0 flex-1 text-xs">
          ${p.errorType ? html`<span class="font-semibold text-[var(--danger)]">${p.errorType}</span>` : nothing}
          <span class="text-foreground-800">${p.errorType ? ": " : ""}${p.message}</span>
        </span>
      </button>
      ${open
        ? html`<ul class="m-2 mt-0 max-h-64 overflow-auto rounded-lg bg-black/5 p-2 font-mono text-[11px] dark:bg-white/[0.06]">
            ${frames.map((f) => html`<li class="py-0.5">
              <span class="text-foreground-600">at</span> ${f.fn ? html`<span class="text-foreground-900">${f.fn}</span> ` : nothing}${f.file
                ? html`<button type="button" class="cursor-pointer text-[var(--primary)] underline-offset-2 hover:underline" @click=${() => emit(this, "ai-frame-click", { file: f.file, line: f.line, col: f.col })}>${f.file}:${f.line}${f.col !== undefined ? `:${f.col}` : ""}</button>`
                : f.raw}</li>`)}
          </ul>`
        : nothing}
    </div>`;
  }
}

export const stackTraceDemo = (): TemplateResult => html`
  <ai-stack-trace open trace=${`TypeError: Cannot read properties of undefined (reading 'id')
    at getUser (/app/src/user.ts:42:17)
    at async handler (/app/src/server.ts:10:5)
    at Module._compile (node:internal/modules/cjs/loader:1256:14)`}></ai-stack-trace>`;
