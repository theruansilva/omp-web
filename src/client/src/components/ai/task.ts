import { html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { AiElement, emit, traceContent, traceLine, type AiStatus } from "./trace";

export interface AiStep {
  id: string;
  title: string;
  description?: string;
  status: AiStatus;
}

/** Overall status of a step list: error beats running; otherwise done. */
export function aggregateStatus(steps: readonly AiStep[]): AiStatus {
  if (steps.some((s) => s.status === "error")) return "error";
  if (steps.some((s) => s.status === "running")) return "running";
  return "done";
}

/** A piece of work with the steps the agent took. Open while running unless the user toggled. */
@customElement("ai-task")
export class AiTask extends AiElement {
  @property({ type: String }) override title = "";
  @property({ attribute: false }) steps: AiStep[] = [];
  @property({ type: Boolean }) open: boolean | undefined;
  @state() private userOpen: boolean | undefined;

  protected override render(): TemplateResult {
    const status = aggregateStatus(this.steps);
    const open = this.open ?? this.userOpen ?? status === "running";
    const onToggle = (): void => {
      this.userOpen = !open;
      emit(this, "ai-toggle", { open: !open });
    };
    return html`
      ${traceLine({ status, title: this.title, open, onToggle, shimmer: true })}
      ${open
        ? traceContent(this.steps.map((s) => html`${traceLine({ status: s.status, title: s.title, meta: s.description })}`))
        : nothing}
    `;
  }
}

export const taskDemo = (): TemplateResult => html`
  <div class="flex max-w-sm flex-col gap-3">
    <ai-task title="Finding the project files" .steps=${[
      { id: "1", title: "Searched for generateMetadata", status: "done" },
      { id: "2", title: "Reading app/layout.tsx", status: "running" },
    ]}></ai-task>
    <ai-task title="Updated the page metadata" .steps=${[
      { id: "1", title: "Edited app/layout.tsx", status: "done" },
      { id: "2", title: "Edited app/page.tsx", status: "done" },
    ]}></ai-task>
  </div>
`;
