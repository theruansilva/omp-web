import { html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "../../omp/OmpMarkdown";
import { AiElement, emit, formatDuration, traceContent, traceLine, type AiStatus } from "./trace";
import "./tool";

export interface SubagentToolCall {
  name: string;
  status: AiStatus;
  target?: string;
  input?: unknown;
  output?: string;
}

/** Auto-opens while running unless the user toggled or `open` is controlled. */
export function subagentOpen(open: boolean | undefined, userOpen: boolean | undefined, status: AiStatus): boolean {
  return open ?? userOpen ?? status === "running";
}

@customElement("ai-subagent")
export class AiSubagent extends AiElement {
  @property() name = "";
  @property() status: AiStatus = "done";
  @property({ attribute: false }) tools: SubagentToolCall[] = [];
  /** Markdown result of the run. */
  @property() result?: string;
  @property({ type: Number, attribute: "duration-ms" }) durationMs?: number;
  @property({ type: Boolean, reflect: true }) open?: boolean;
  @state() private _open?: boolean;

  override render(): TemplateResult {
    const open = subagentOpen(this.open, this._open, this.status);
    const verb = this.status === "running" ? "Running" : this.status === "error" ? "Failed" : "Ran";
    return html`<div>
      ${traceLine({
        status: this.status,
        title: `${verb} ${this.name}`,
        meta: this.durationMs !== undefined ? formatDuration(this.durationMs) : undefined,
        shimmer: true,
        open,
        onToggle: () => {
          this._open = !open;
          emit(this, "ai-toggle", { open: this._open });
        },
      })}
      ${open
        ? traceContent(html`<div class="flex flex-col gap-2">
            ${this.tools.map((t) => html`<ai-tool .name=${t.name} .status=${t.status} .target=${t.target} .input=${t.input} .output=${t.output}></ai-tool>`)}
            ${this.result ? html`<omp-markdown .text=${this.result}></omp-markdown>` : nothing}
          </div>`)
        : nothing}
    </div>`;
  }
}

export const subagentDemo = (): TemplateResult => html`
  <ai-subagent name="the research agent" .durationMs=${12000} open .tools=${[{ name: "Grep", target: "cacheKey scripts", status: "done" }]} result="The cache is keyed on the commit SHA."></ai-subagent>
  <ai-subagent name="the review agent" status="running" .tools=${[{ name: "Read", target: "a.ts", status: "running" }]}></ai-subagent>`;
