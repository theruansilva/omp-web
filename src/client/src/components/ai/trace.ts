import { LitElement, html, nothing, type TemplateResult } from "lit";

/** Shared step status for every AI element built on a trace line. */
export type AiStatus = "pending" | "running" | "done" | "error";

/** Base class: Light DOM so Tailwind utilities and theme tokens apply (see DESIGN.md). */
export abstract class AiElement extends LitElement {
  protected override createRenderRoot() {
    return this;
  }
}

/** Dispatches a bubbling, composed CustomEvent from `el`. */
export function emit<T>(el: HTMLElement, name: string, detail?: T): void {
  el.dispatchEvent(new CustomEvent<T>(name, { detail: detail as T, bubbles: true, composed: true }));
}

export function aiStatusIcon(status: AiStatus | undefined): TemplateResult | typeof nothing {
  switch (status) {
    case "running":
      return html`<svg class="size-3.5 shrink-0 animate-spin text-[var(--primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-label="Running"><path d="M21 12a9 9 0 1 1-6.2-8.55" /></svg>`;
    case "done":
      return html`<svg class="size-3.5 shrink-0 text-[var(--success)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-label="Done"><path d="M20 6 9 17l-5-5" /></svg>`;
    case "error":
      return html`<svg class="size-3.5 shrink-0 text-[var(--danger)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-label="Error"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" /></svg>`;
    case "pending":
      return html`<span class="size-3.5 shrink-0 rounded-full border border-black/20 dark:border-white/25" aria-label="Pending"></span>`;
    default:
      return nothing;
  }
}

export function aiChevron(open: boolean): TemplateResult {
  return html`<svg class="size-3.5 shrink-0 text-foreground-600 transition-transform duration-200 ${open ? "rotate-90" : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>`;
}

export interface TraceLineOptions {
  status?: AiStatus | undefined;
  title: unknown;
  /** Muted text after the title (duration, target, counts). */
  meta?: unknown;
  /** Replaces the status icon when set. */
  icon?: unknown;
  /** Makes the line a toggle button. */
  open?: boolean | undefined;
  onToggle?: (() => void) | undefined;
  /** Shimmer the title while running. */
  shimmer?: boolean;
}

/**
 * One step line: [icon] title  meta  [chevron]. The single shape every
 * Reasoning/Tool/Task/Plan/Subagent/Terminal row shares (shadcn "Trace").
 */
export function traceLine(o: TraceLineOptions): TemplateResult {
  const icon = o.icon ?? aiStatusIcon(o.status);
  const body = html`
    <span class="inline-flex w-4 shrink-0 items-center justify-center">${icon}</span>
    <span class="min-w-0 truncate text-xs font-semibold text-foreground-900 ${o.shimmer === true && o.status === "running" ? "animate-pulse" : ""}">${o.title}</span>
    ${o.meta === undefined || o.meta === "" ? nothing : html`<span class="min-w-0 truncate text-xs text-foreground-600">${o.meta}</span>`}
    ${o.onToggle === undefined ? nothing : html`<span class="ml-auto pl-1">${aiChevron(o.open === true)}</span>`}
  `;
  if (o.onToggle === undefined) return html`<div class="flex min-h-7 items-center gap-2 px-2 py-1">${body}</div>`;
  const toggle = o.onToggle;
  return html`<button type="button" class="flex min-h-7 w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/10" aria-expanded=${o.open === true ? "true" : "false"} @click=${toggle}>${body}</button>`;
}

/** Indented content area under a trace line (the collapsible body). */
export function traceContent(content: unknown, extraClass = ""): TemplateResult {
  return html`<div class="ml-4 mt-1 mb-1 border-l border-black/10 pl-3 text-xs leading-relaxed text-foreground-800 dark:border-white/10 ${extraClass}">${content}</div>`;
}

/** Card surface used by block-style elements (Terminal, Stack Trace, Plan, ...). */
export const AI_CARD_CLASS = "rounded-2xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.04]";

/** Formats milliseconds as "850ms", "4s" or "1m 05s". */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}
