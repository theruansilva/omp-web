import { html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { AiElement, traceContent, traceLine } from "./trace";
import type { AiStep } from "./task";

/** Todo list split into "to do" and "completed" sections, each collapsible (open by default). */
@customElement("ai-queue")
export class AiQueue extends AiElement {
  @property({ attribute: false }) items: AiStep[] = [];
  @state() private closed = new Set<"pending" | "completed">();

  private section(key: "pending" | "completed", label: string, list: AiStep[]): TemplateResult | typeof nothing {
    if (list.length === 0) return nothing;
    const open = !this.closed.has(key);
    const onToggle = (): void => {
      const next = new Set(this.closed);
      if (open) next.add(key);
      else next.delete(key);
      this.closed = next;
    };
    return html`
      ${traceLine({ title: `${list.length} ${label}`, open, onToggle })}
      ${open ? traceContent(list.map((s) => traceLine({ status: s.status, title: s.title, meta: s.description }))) : nothing}
    `;
  }

  protected override render(): TemplateResult {
    const done = this.items.filter((s) => s.status === "done");
    const rest = this.items.filter((s) => s.status !== "done");
    return html`${this.section("pending", "to do", rest)}${this.section("completed", "completed", done)}`;
  }
}

export const queueDemo = (): TemplateResult => html`
  <ai-queue class="block max-w-sm" .items=${[
    { id: "1", title: "Add a dark variant to the theme tokens", status: "done" },
    { id: "2", title: "Read the theme from a cookie", status: "running" },
    { id: "3", title: "Add a toggle to the settings page", status: "pending" },
  ]}></ai-queue>
`;
