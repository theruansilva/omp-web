import { html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "../../omp/OmpMarkdown";
import { AiElement, emit, formatDuration, traceContent, traceLine } from "./trace";

/** The agent's thinking. Auto-opens while running, closes when done unless the user toggled it. */
@customElement("ai-reasoning")
export class AiReasoning extends AiElement {
  @property({ type: String }) text = "";
  @property({ type: Boolean }) running = false;
  @property({ type: Number, attribute: "duration-ms" }) durationMs: number | undefined;
  /** Controlled open state; leave undefined for uncontrolled. */
  @property({ type: Boolean }) open: boolean | undefined;
  @state() private userOpen: boolean | undefined;

  private toggle = (): void => {
    const next = !(this.open ?? this.userOpen ?? this.running);
    this.userOpen = next;
    emit(this, "ai-toggle", { open: next });
  };

  protected override render(): TemplateResult {
    const title = this.running ? "Thinking" : "Thought";
    const meta = !this.running && this.durationMs !== undefined ? `for ${formatDuration(this.durationMs)}` : undefined;
    const status = this.running ? "running" : "done";
    if (this.text.length === 0) return html`${traceLine({ status, title, meta, shimmer: true })}`;
    const open = this.open ?? this.userOpen ?? this.running;
    return html`
      ${traceLine({ status, title, meta, open, onToggle: this.toggle, shimmer: true })}
      ${open ? traceContent(html`<omp-markdown .text=${this.text}></omp-markdown>`) : nothing}
    `;
  }
}

export const reasoningDemo = (): TemplateResult => html`
  <div class="flex max-w-sm flex-col gap-3">
    <ai-reasoning running text="The deploy log has three phases. Install takes 38s and next build takes 52s, both normal for this repo."></ai-reasoning>
    <ai-reasoning .durationMs=${12000} text="Image optimization takes **3m 50s**. It reruns on every deploy because its cache key includes the commit hash, so the cache never hits."></ai-reasoning>
  </div>
`;
