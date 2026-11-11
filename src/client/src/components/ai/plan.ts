import { html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { AiElement, emit, traceContent, traceLine } from "./trace";
import type { AiStep } from "./task";

/** Steps decided up front, with "N of M done" progress. Open by default. */
@customElement("ai-plan")
export class AiPlan extends AiElement {
  @property({ type: String }) override title = "";
  @property({ type: String }) description = "";
  @property({ attribute: false }) steps: AiStep[] = [];
  @property({ type: Boolean }) open: boolean | undefined;
  @state() private userOpen: boolean | undefined;

  protected override render(): TemplateResult {
    const done = this.steps.filter((s) => s.status === "done").length;
    const running = this.steps.some((s) => s.status === "running");
    const open = this.open ?? this.userOpen ?? true;
    const onToggle = (): void => {
      this.userOpen = !open;
      emit(this, "ai-toggle", { open: !open });
    };
    return html`
      ${traceLine({
        status: running ? "running" : undefined,
        title: this.title,
        meta: `${done} of ${this.steps.length} done`,
        open,
        onToggle,
      })}
      ${open
        ? traceContent(html`
            ${this.description === "" ? nothing : html`<p class="mb-1 px-2 text-foreground-600">${this.description}</p>`}
            ${this.steps.map((s) => traceLine({ status: s.status, title: s.title, meta: s.description }))}
          `)
        : nothing}
    `;
  }
}

export const planDemo = (): TemplateResult => html`
  <ai-plan class="block max-w-sm" title="Plan: migrate to Base UI" description="Swap the Radix primitives for Base UI." .steps=${[
    { id: "1", title: "Install @base-ui/react", status: "done" },
    { id: "2", title: "Replace the Radix imports", status: "done" },
    { id: "3", title: "Rename asChild to render", status: "running" },
    { id: "4", title: "Run the type checker", status: "pending" },
  ]}></ai-plan>
`;
