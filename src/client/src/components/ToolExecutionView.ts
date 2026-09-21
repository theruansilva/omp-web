import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { isRecord } from "../utils.js";
import type { ToolExecutionPart } from "./shared";

const MAX_COLLAPSED_DIFF_LINES = 180;

interface ToolTarget {
  label: string;
  text: string;
}

function renderToolIcon(toolName: string, status: ToolExecutionPart["status"]) {
  if (status === "running" || status === "pending") {
    return html`
      <span class="tool-icon tool-spinner" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="8" cy="8" r="6" stroke-dasharray="28" stroke-dashoffset="10" />
        </svg>
      </span>
    `;
  }

  const name = toolName.toLowerCase();
  let iconSvg;
  let color = "var(--pi-accent, #58a6ff)";

  if (name === "eval") {
    color = "#f59e0b";
    iconSvg = html`<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3.5L8 8l-4 4.5" /><path d="M8.5 12.5h4" /></svg>`;
  } else if (name === "bash" || name === "sh" || name === "terminal") {
    color = "#10b981";
    iconSvg = html`<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2.5" width="12" height="11" rx="2" /><path d="M5 6l2.5 2L5 10M9 10.5h2" /></svg>`;
  } else if (name === "read" || name === "cat") {
    color = "#38bdf8";
    iconSvg = html`<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2.5h6.5l3.5 3.5V13.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z" /><path d="M9.5 2.5V6H13" /></svg>`;
  } else if (name === "edit" || name === "patch") {
    color = "#818cf8";
    iconSvg = html`<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2.5a1.4 1.4 0 0 1 2 2L5.5 12 2 13l1-3.5L10.5 2.5z" /></svg>`;
  } else if (name === "write") {
    color = "#14b8a6";
    iconSvg = html`<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2.5h7l3 3V13.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z" /><path d="M8 8v4M6 10h4" /></svg>`;
  } else if (name === "grep" || name === "glob" || name.includes("search")) {
    color = "#ec4899";
    iconSvg = html`<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></svg>`;
  } else if (name === "task" || name === "todo") {
    color = "#f97316";
    iconSvg = html`<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="2.5" width="11" height="11" rx="2" /><path d="M5.5 8l2 2 3.5-4" /></svg>`;
  } else {
    color = "var(--pi-accent, #58a6ff)";
    iconSvg = html`<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 5.5l4 3.5-4 3.5M9.5 12.5h3" /></svg>`;
  }

  const isErr = status === "error";
  return html`<span class=${isErr ? "tool-icon error" : "tool-icon"} style=${isErr ? "" : `color: ${color};`} aria-hidden="true">${iconSvg}</span>`;
}

@customElement("tool-execution-view")
export class ToolExecutionView extends LitElement {
  @property({ attribute: false }) execution: ToolExecutionPart | undefined;
  @state() private showFullDiff = false;
  @state() private copied = false;

  override render() {
    const execution = this.execution;
    if (execution === undefined) return null;

    const path = pathFromArgs(execution.args);
    const actualDiff = diffFromDetails(execution.details);
    const preview = execution.preview;
    const visibleDiff = actualDiff ?? preview?.diff;
    const diffStats = visibleDiff === undefined ? undefined : countDiffLines(visibleDiff);
    const previewMismatch = actualDiff !== undefined && preview?.diff !== undefined && actualDiff !== preview.diff;
    const errorText = execution.status === "error" ? execution.resultText : preview?.error;
    const bodyText = visibleDiff === undefined ? execution.resultText : undefined;
    const target = toolTarget(execution, path);

    return html`
      <details class=${`tool-card ${execution.status}`} @toggle=${this.onToggle}>
        <summary class="tool-header">
          <div class="tool-title">
            ${renderToolIcon(execution.toolName, execution.status)}
            <strong>${execution.toolName}</strong>
            ${this.renderHeaderTarget(target)}
          </div>
          <div class="tool-meta">
            ${editCountLabel(execution) === undefined ? null : html`<span>${editCountLabel(execution)}</span>`}
            ${diffStats === undefined ? null : html`<span class="diff-stats"><b class="added">+${diffStats.added}</b><span>/</span><b class="removed">-${diffStats.removed}</b></span>`}
          </div>
        </summary>

        <div class="tool-content">
          ${previewMismatch ? html`<p class="notice">Applied diff differs from the preview.</p>` : null}
          ${errorText === undefined || errorText === "" ? null : html`<pre class="error-text">${errorText}</pre>`}
          ${execution.toolName === "eval" ? this.renderEvalContent(execution) : (visibleDiff === undefined ? this.renderTextContent(bodyText, target, execution.status) : this.renderDiffContent(visibleDiff, actualDiff === undefined ? "Preview diff" : "Applied diff", target))}
        </div>
      </details>
    `;
  }

  private onToggle(e: Event) {
    const details = e.currentTarget as HTMLDetailsElement;
    this.toggleAttribute("open", details.open);
  }

  private renderHeaderTarget(target: ToolTarget | undefined) {
    if (target === undefined) return null;
    const className = target.label === "File" ? "path" : "summary";
    return html`<span class=${className} title=${target.text} aria-label=${`${target.label}: ${target.text}`}>${target.text}</span>`;
  }

  private renderExpandedTarget(target: ToolTarget | undefined) {
    if (target === undefined) return null;
    return html`
      <div class="detail-target">
        <span class="detail-label">${target.label}</span>
        <pre class="detail-target-value">${target.text}</pre>
      </div>
    `;
  }

  private renderEvalContent(execution: ToolExecutionPart) {
    const code = getString(execution.args, "code") ?? "";
    const lang = getString(execution.args, "language") ?? "py";
    const title = getString(execution.args, "title");
    const result = execution.resultText;

    return html`
      <div class="eval-content">
        <div class="detail-target">
          <span class="detail-label">Code (${lang}${title ? ` · ${title}` : ""})</span>
          <pre class="detail-code-pre">${code}</pre>
        </div>
        ${result !== undefined && result !== "" ? html`
          <div class="detail-result">
            <span class="detail-label">Output</span>
            <pre class="detail-result-pre">${result}</pre>
          </div>
        ` : (execution.status === "running" ? html`<div class="detail-running muted">Running in kernel…</div>` : null)}
      </div>
    `;
  }

  private renderTextContent(text: string | undefined, target: ToolTarget | undefined, status: ToolExecutionPart["status"]) {
    return html`
      <div class="text-content">
        ${this.renderExpandedTarget(target)}
        ${text !== undefined && text !== "" ? html`
          <div class="detail-result">
            <span class="detail-label">Result</span>
            <pre class="detail-result-pre">${text}</pre>
          </div>
        ` : (status === "running" ? html`<div class="detail-running muted">Executing…</div>` : null)}
      </div>
    `;
  }

  private renderDiffContent(diff: string, label: string, target: ToolTarget | undefined) {
    const lines = diff.split("\n");
    const truncated = !this.showFullDiff && lines.length > MAX_COLLAPSED_DIFF_LINES;
    const visibleLines = truncated ? lines.slice(0, MAX_COLLAPSED_DIFF_LINES) : lines;
    return html`
      <div class="diff-content-wrap">
        <div class="diff-header-row">
          <span>${label}</span>
          <small>${String(lines.length)} ${lines.length === 1 ? "line" : "lines"}</small>
        </div>
        ${this.renderExpandedTarget(target)}
        <div class="diff-toolbar">
          <span>${truncated ? `Showing ${String(visibleLines.length)} of ${String(lines.length)} lines` : "Full diff"}</span>
          <button type="button" @click=${(e: Event) => { e.stopPropagation(); void this.copyDiff(diff); }}>${this.copied ? "Copied" : "Copy diff"}</button>
        </div>
        <pre class="diff" aria-label=${label}><code class="diff-content">${visibleLines.map((line) => html`<span class=${diffLineClass(line)}>${line}</span>`)}</code></pre>
        ${truncated ? html`
          <button class="show-more" type="button" @click=${(e: Event) => { e.stopPropagation(); this.showFullDiff = true; }}>
            Show all ${String(lines.length)} diff lines
          </button>
        ` : null}
      </div>
    `;
  }

  private async copyDiff(diff: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(diff);
      this.copied = true;
      window.setTimeout(() => { this.copied = false; }, 1200);
    } catch {
      this.copied = false;
    }
  }

  static override styles = css`
    :host { display: block; width: 100%; max-width: 100%; min-width: 0; color: var(--pi-text); font-family: inherit; }
    details.tool-card { display: block; width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; overflow: hidden; border: none; border-radius: 7px; background: transparent; color: var(--pi-text); margin: 0; transition: background 200ms cubic-bezier(0.23, 1, 0.32, 1), transform 200ms cubic-bezier(0.23, 1, 0.32, 1); }
    details.tool-card:hover:not([open]) { background: color-mix(in srgb, var(--pi-text) 4%, transparent); transform: translateX(2px); }
    details.tool-card.running, details.tool-card.pending { background: transparent; }
    details.tool-card.error { background: transparent; }
    details.tool-card[open] { background: var(--pi-surface); border: 1px solid var(--pi-border-muted); border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05); margin: 6px 0; transform: none; }
    details.tool-card[open] .tool-content { animation: bmContentSlide 260ms cubic-bezier(0.23, 1, 0.32, 1); }
    @keyframes bmContentSlide { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
    summary.tool-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; height: 32px; padding: 0 8px; cursor: pointer; user-select: none; list-style: none; outline: none; -webkit-tap-highlight-color: transparent; border-radius: 6px; transition: color 200ms ease; }
    summary.tool-header::-webkit-details-marker { display: none; }
    details.tool-card[open] > summary.tool-header { height: 36px; padding: 0 12px; border-bottom: 1px solid var(--pi-border-muted); border-radius: 7px 7px 0 0; }
    .tool-title { flex: 1 1 auto; display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
    .tool-icon { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; flex-shrink: 0; opacity: 1; transition: transform 150ms ease; }
    .tool-icon svg { display: block; width: 14px; height: 14px; }
    summary.tool-header:hover .tool-icon { transform: scale(1.08); }
    .tool-icon.error { color: var(--pi-danger, #ef4444) !important; }
    .tool-spinner { display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; color: var(--pi-warning, #f59e0b); animation: toolSpin 1s linear infinite; flex-shrink: 0; }
    .tool-spinner svg { display: block; width: 14px; height: 14px; }
    @keyframes toolSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    strong { flex: 0 0 auto; color: color-mix(in srgb, var(--pi-text) 85%, transparent); font-size: 13px; font-weight: 500; letter-spacing: -0.01em; transition: color 150ms ease; }
    summary.tool-header:hover strong, details.tool-card[open] summary.tool-header strong { color: var(--pi-text); }
    .path, .summary { display: block; flex: 1 1 auto; min-width: 0; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; pointer-events: none; color: var(--pi-muted); font: 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; direction: ltr; text-align: left; unicode-bidi: isolate; opacity: 0.85; transition: opacity 150ms ease, color 150ms ease; }
    summary.tool-header:hover .path, details.tool-card[open] .path { color: var(--pi-accent); opacity: 1; }
    .summary { color: var(--pi-muted); font-family: inherit; font-size: 12.5px; }
    .tool-meta { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 6px; color: var(--pi-muted); font-size: 11.5px; }
    .diff-stats { display: inline-flex; gap: 2px; font-size: 11px; font-weight: 500; }
    .added, .diff .added { color: var(--pi-success); }
    .removed, .diff .removed { color: var(--pi-danger); }
    .tool-content { display: grid; gap: 8px; padding: 12px; background: color-mix(in srgb, var(--pi-bg) 40%, transparent); }
    .notice { margin: 0; color: var(--pi-warning); }
    .muted { margin: 0; color: var(--pi-muted); font-size: 12px; }
    .error-text { margin: 0; max-height: 200px; overflow-y: auto; border: 1px solid var(--pi-danger); border-radius: 8px; background: var(--pi-bg); color: var(--pi-danger); padding: 8px; white-space: pre-wrap; overflow-wrap: anywhere; font: 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .text-content, .eval-content { display: grid; gap: 8px; }
    .diff-content-wrap { display: grid; gap: 6px; }
    .diff-header-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--pi-muted); font-size: 12px; }
    .detail-target, .detail-result { display: grid; gap: 4px; min-width: 0; }
    .detail-label { color: var(--pi-muted); font-size: 11px; text-transform: uppercase; letter-spacing: .04em; font-weight: 600; }
    .detail-code-pre, .detail-result-pre, .detail-target-value { box-sizing: border-box; max-width: 100%; max-height: 220px; overflow-x: auto; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; border: 1px solid var(--pi-border-muted); border-radius: 8px; background: var(--pi-bg); padding: 8px; font: 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: var(--pi-text); white-space: pre-wrap; word-break: break-word; line-height: 1.45; }
    .detail-target-value { color: var(--pi-accent); max-height: 140px; }
    .diff-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; color: var(--pi-muted); font-size: 12px; }
    .diff-toolbar span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    button { border: 1px solid var(--pi-border); border-radius: 6px; background: var(--pi-surface); color: var(--pi-text); padding: 3px 8px; font: 12px system-ui, sans-serif; cursor: pointer; }
    button:hover, button:focus { border-color: var(--pi-accent); }
    .diff { box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; max-height: 320px; margin: 0; overflow-x: auto; overflow-y: auto; overscroll-behavior-x: contain; border: 1px solid var(--pi-border-muted); border-radius: 8px; background: var(--pi-bg); padding: 8px 0; color: var(--pi-muted); font: 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; line-height: 1.45; }
    .diff-content { display: block; width: max-content; min-width: 100%; }
    .diff span { display: block; min-height: 1.45em; padding: 0 8px; white-space: pre; }
    .diff .context { color: var(--pi-muted); }
    .diff .hunk { color: var(--pi-accent); }
    .diff .file { color: var(--pi-dim); }
    .diff .meta { color: var(--pi-dim); }
    .diff .added { background: color-mix(in srgb, var(--pi-success) 12%, transparent); }
    .diff .removed { background: color-mix(in srgb, var(--pi-danger) 12%, transparent); }
    .show-more { justify-self: start; }
  `;
}

function toolTarget(execution: ToolExecutionPart, path: string | undefined): ToolTarget | undefined {
  if (path !== undefined && path !== "") return { label: "File", text: path };
  const command = getString(execution.args, "command");
  if (command !== undefined && command !== "") return { label: "Command", text: command };
  if (execution.toolName === "eval") {
    const title = getString(execution.args, "title");
    const code = getString(execution.args, "code") ?? "";
    const firstLine = code.trim().split("\n")[0] ?? "";
    const display = title ? `${title}: ${firstLine}` : firstLine;
    if (display) return { label: "Code", text: display.length > 60 ? display.slice(0, 57) + "…" : display };
  }
  if (execution.summary !== "") return { label: "Input", text: execution.summary };
  return undefined;
}


function pathFromArgs(args: unknown): string | undefined {
  return getString(args, "path") ?? getString(args, "file_path");
}

function editCountLabel(execution: ToolExecutionPart): string | undefined {
  if (execution.toolName !== "edit") return undefined;
  const edits = getProperty(execution.args, "edits");
  if (Array.isArray(edits)) return `${String(edits.length)} edit${edits.length === 1 ? "" : "s"}`;
  if (typeof getProperty(execution.args, "oldText") === "string" && typeof getProperty(execution.args, "newText") === "string") return "1 edit";
  return undefined;
}

function diffFromDetails(details: unknown): string | undefined {
  return getString(details, "diff");
}

function countDiffLines(diff: string): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of diff.split("\n")) {
    if (isAddedDiffLine(line)) added++;
    else if (isRemovedDiffLine(line)) removed++;
  }
  return { added, removed };
}

function diffLineClass(line: string): string {
  if (isAddedDiffLine(line)) return "added";
  if (isRemovedDiffLine(line)) return "removed";
  if (line.startsWith("@@")) return "hunk";
  if (line.startsWith("+++") || line.startsWith("---")) return "file";
  if (line.startsWith("diff ") || line.startsWith("index ")) return "meta";
  return "context";
}

function isAddedDiffLine(line: string): boolean {
  return line.startsWith("+") && !line.startsWith("+++");
}

function isRemovedDiffLine(line: string): boolean {
  return line.startsWith("-") && !line.startsWith("---");
}




function getProperty(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined;
}

function getString(value: unknown, key: string): string | undefined {
  const property = getProperty(value, key);
  return typeof property === "string" ? property : undefined;
}
