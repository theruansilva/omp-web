import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { ToolExecutionPart } from "./shared";
import { workspacePanelStyles } from "./shared";
import type { WorkspacePanelContext } from "../plugins/types";

interface TaskSubagent {
  id?: string | undefined;
  description?: string | undefined;
  assignment?: string | undefined;
}

interface TodoArgs {
  op?: string;
  task?: string;
  phase?: string;
}

@customElement("workspace-tasks-panel")
export class WorkspaceTasksPanel extends LitElement {
  @property({ attribute: false }) context: WorkspacePanelContext | undefined;

  private get executions(): ToolExecutionPart[] {
    if (!this.context) return [];
    const messages = this.context.state.messages;
    if (!messages) return [];

    const result: ToolExecutionPart[] = [];
    for (const msg of messages) {
      for (const part of msg.parts) {
        if (part.type === "toolExecution" && (part.toolName === "task" || part.toolName === "todo")) {
          result.push(part);
        }
      }
    }
    return result;
  }

  override render() {
    const executions = this.executions;
    if (executions.length === 0) {
      return html`
        <section class="panel-content">
          <div class="empty-state" role="status">
            <h2>No tasks</h2>
            <p>Task tool and todo tool calls will appear here when used in the current session.</p>
          </div>
        </section>
      `;
    }

    return html`
      <section class="panel-content">
        <div class="task-list">
          ${executions.map((exec) =>
      exec.toolName === "task" ? this.renderTask(exec) : this.renderTodo(exec)
    )}
        </div>
      </section>
    `;
  }

  private renderTask(task: ToolExecutionPart) {
    const subagents = parseTaskArgs(task.args);
    const subagentCount = subagents?.length ?? 0;

    return html`
      <details class="task-card ${task.status}">
        <summary class="task-header">
          <span class="status-icon" aria-hidden="true">${statusIcon(task.status)}</span>
          <span class="tool-badge task-badge">subagent</span>
          <span class="task-summary">${task.summary || "Task"}</span>
          <span class="task-meta">
            ${subagentCount > 0 ? html`<span class="subagent-count">${subagentCount} agent${subagentCount === 1 ? "" : "s"}</span>` : ""}
            <span class="status-badge ${task.status}">${statusLabel(task.status)}</span>
          </span>
        </summary>
        <div class="task-body">
          ${this.renderTaskContext(task)}
          ${subagents?.map((agent) => this.renderSubagent(agent))}
          ${task.resultText ? html`<pre class="task-result">${task.resultText}</pre>` : ""}
        </div>
      </details>
    `;
  }

  private renderTodo(exec: ToolExecutionPart) {
    const args = (exec.args ?? {}) as Record<string, unknown>;
    const op = String(args["op"] ?? "");
    const task = String(args["task"] ?? "");
    const phase = String(args["phase"] ?? "");

    const opLabel = op
      ? ({ init: "Initialized", start: "Started", done: "Completed", append: "Added", drop: "Removed" } as Record<string, string>)[op] ?? op
      : "";

    return html`
      <details class="todo-card ${exec.status}">
        <summary class="task-header">
          <span class="status-icon" aria-hidden="true">${op === "done" ? "✓" : op === "init" ? "○" : "◈"}</span>
          <span class="tool-badge todo-badge">todo</span>
          <span class="task-summary">${task || phase || opLabel || "Todo"}</span>
          <span class="task-meta">
            ${opLabel ? html`<span class="todo-op">${opLabel}</span>` : ""}
            <span class="status-badge ${exec.status}">${statusLabel(exec.status)}</span>
          </span>
        </summary>
        <div class="task-body">
          ${phase ? html`<div class="todo-phase">Phase: ${phase}</div>` : ""}
          ${task ? html`<div class="todo-task">${task}</div>` : ""}
          ${exec.resultText ? html`<pre class="task-result">${exec.resultText}</pre>` : ""}
        </div>
      </details>
    `;
  }

  private renderTaskContext(task: ToolExecutionPart) {
    const args = task.args as Record<string, unknown> | undefined;
    if (!args) return null;
    const context = args["context"];
    if (typeof context !== "string" || context === "") return null;
    return html`
      <details class="context-section">
        <summary class="context-header">Context</summary>
        <div class="context-body">${context}</div>
      </details>
    `;
  }

  private renderSubagent(agent: TaskSubagent) {
    const label = agent.id ?? agent.description ?? "Sub-agent";
    return html`
      <div class="subagent">
        <span class="subagent-icon">◈</span>
        <div class="subagent-info">
          <div class="subagent-label">${label}</div>
          ${agent.assignment ? html`<div class="subagent-assignment">${agent.assignment}</div>` : ""}
        </div>
      </div>
    `;
  }

  static override styles = [
    workspacePanelStyles,
    css`
      .task-list { padding: 8px; display: grid; gap: 8px; }
      .task-card, .todo-card { border: 1px solid var(--pi-border); border-radius: 8px; background: var(--pi-surface); }
      .task-card[open], .todo-card[open] { border-color: var(--pi-accent); }
      .task-card.error, .todo-card.error { border-color: var(--pi-danger-border); }
      .task-card.success, .todo-card.success { border-color: var(--pi-success-border); }
      .task-header { display: flex; align-items: center; gap: 6px; padding: 8px 10px; cursor: pointer; user-select: none; }
      .task-header::-webkit-details-marker { display: none; }
      .status-icon { flex: 0 0 auto; width: 18px; text-align: center; font-size: 14px; }
      .task-card.running .status-icon, .todo-card.running .status-icon { color: var(--pi-accent); }
      .task-card.success .status-icon, .todo-card.success .status-icon { color: var(--pi-success); }
      .task-card.error .status-icon, .todo-card.error .status-icon { color: var(--pi-danger); }
      .tool-badge { font-size: 10px; padding: 1px 4px; border-radius: 3px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; flex: 0 0 auto; }
      .task-badge { background: color-mix(in srgb, var(--pi-accent) 14%, transparent); color: var(--pi-accent); }
      .todo-badge { background: color-mix(in srgb, var(--pi-success) 14%, transparent); color: var(--pi-success); }
      .task-summary { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; font-size: 13px; }
      .task-meta { flex: 0 0 auto; display: flex; align-items: center; gap: 6px; }
      .subagent-count { color: var(--pi-muted); font-size: 11px; white-space: nowrap; }
      .todo-op { color: var(--pi-muted); font-size: 11px; white-space: nowrap; }
      .status-badge { font-size: 11px; padding: 1px 5px; border-radius: 4px; white-space: nowrap; }
      .status-badge.running { background: color-mix(in srgb, var(--pi-accent) 14%, transparent); color: var(--pi-accent); }
      .status-badge.success { background: color-mix(in srgb, var(--pi-success) 14%, transparent); color: var(--pi-success); }
      .status-badge.error { background: color-mix(in srgb, var(--pi-danger) 14%, transparent); color: var(--pi-danger); }
      .status-badge.pending { background: color-mix(in srgb, var(--pi-muted) 14%, transparent); color: var(--pi-muted); }
      .task-body { padding: 0 10px 10px; display: grid; gap: 6px; }
      .context-section { border: 1px solid var(--pi-border-muted); border-radius: 5px; }
      .context-header { padding: 5px 8px; cursor: pointer; user-select: none; font-size: 11px; font-weight: 600; color: var(--pi-muted); }
      .context-header::-webkit-details-marker { display: none; }
      .context-body { padding: 0 8px 8px; color: var(--pi-muted); font-size: 12px; line-height: 1.4; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 120px; overflow: auto; }
      .todo-phase { font-size: 11px; color: var(--pi-muted); }
      .todo-task { font-size: 12px; font-weight: 600; padding: 4px 0; }
      .subagent { display: flex; gap: 6px; padding: 6px 8px; border: 1px solid var(--pi-border-muted); border-radius: 5px; background: var(--pi-bg); align-items: flex-start; }
      .subagent-icon { flex: 0 0 auto; color: var(--pi-accent); font-size: 12px; margin-top: 1px; }
      .subagent-info { flex: 1 1 auto; min-width: 0; }
      .subagent-label { font-weight: 600; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .subagent-assignment { color: var(--pi-muted); font-size: 11px; margin-top: 2px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      .task-result { margin: 0; padding: 8px; background: var(--pi-bg); border: 1px solid var(--pi-border-muted); border-radius: 5px; font: 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; line-height: 1.4; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 200px; overflow: auto; }
    `,
  ];
}

function statusIcon(status: ToolExecutionPart["status"]): string {
  if (status === "success") return "✓";
  if (status === "error") return "✖";
  if (status === "running") return "●";
  return "○";
}

function statusLabel(status: ToolExecutionPart["status"]): string {
  if (status === "success") return "done";
  if (status === "error") return "failed";
  if (status === "running") return "running";
  return "pending";
}

function parseTaskArgs(args: unknown): TaskSubagent[] | undefined {
  if (!args || typeof args !== "object") return undefined;
  const record = args as Record<string, unknown>;
  const tasks = record["tasks"];
  if (!Array.isArray(tasks)) return undefined;
  return tasks.map((t: unknown): TaskSubagent => {
    if (!t || typeof t !== "object") return {};
    const item = t as Record<string, unknown>;
    return {
      ...(typeof item["id"] === "string" ? { id: item["id"] } : {}),
      ...(typeof item["description"] === "string" ? { description: item["description"] } : {}),
      ...(typeof item["assignment"] === "string" ? { assignment: item["assignment"] } : {}),
    };
  });
}
