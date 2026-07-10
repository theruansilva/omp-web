import type { WorkspacePanelContext } from "@ProgmRuanSilva/omp-web/plugin-api";
import type { CronJob, CronJobStatus, CronStore } from "./types.js";

export const schedulePromptsPanelTagName = "pi-web-schedule-prompts-panel";

const SCHEDULE_PROMPTS_CONFIG_PATH = ".pi-web/schedule-prompts.json";

type ConfigCacheEntry = CronStore | { kind: "loading" } | { kind: "unavailable"; message: string };

const configCache = new Map<string, ConfigCacheEntry>();

export function defineSchedulePromptsPanelElement(): void {
  if (!customElements.get(schedulePromptsPanelTagName)) {
    customElements.define(schedulePromptsPanelTagName, PiWebSchedulePromptsPanel);
  }
}

export function schedulePromptsBadge(context: WorkspacePanelContext): string | undefined {
  const cached = configCache.get(cacheKeyForContext(context));
  if (cached === undefined || "kind" in cached) return undefined;
  const enabled = cached.jobs.filter((j) => j.enabled).length;
  return enabled > 0 ? String(enabled) : undefined;
}

class PiWebSchedulePromptsPanel extends HTMLElement {
  private contextValue: WorkspacePanelContext | undefined;
  private readonly root: ShadowRoot;
  private pollTimer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
  }

  set context(value: WorkspacePanelContext | undefined) {
    this.contextValue = value;
    if (value) {
      void this.loadJobs(value);
    }
    this.render();
  }

  connectedCallback(): void {
    this.render();
    this.pollTimer = setInterval(() => {
      if (this.contextValue) void this.loadJobs(this.contextValue);
    }, 30000);
  }

  disconnectedCallback(): void {
    if (this.pollTimer !== undefined) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  private render(): void {
    const context = this.contextValue;
    if (context === undefined) {
      this.root.innerHTML = `${panelStyles()}<section class="empty">Select a workspace.</section>`;
      return;
    }

    const key = cacheKeyForContext(context);
    const cached = configCache.get(key);
    const state: ConfigCacheEntry = cached ?? { kind: "loading" };
    const isLoading = "kind" in state && state.kind === "loading";
    this.root.innerHTML = `
      ${panelStyles()}
      <section class="toolbar">
        <strong>Scheduled Prompts</strong>
        <button class="secondary" data-refresh ${isLoading ? "disabled" : ""}>Refresh</button>
      </section>
      <section class="viewer">
        ${this.renderState(state)}
      </section>
    `;

    this.root.querySelector("button[data-refresh]")?.addEventListener("click", () => {
      void this.loadJobs(context);
    });

    this.root.querySelector("button[data-toggle]")?.addEventListener("click", (e) => {
      const btn = e.currentTarget as HTMLElement;
      const jobId = btn.getAttribute("data-job-id");
      const enabled = btn.getAttribute("data-enabled") === "true";
      if (jobId && context) {
        context.prompt.insertText(enabled
          ? `schedule_prompt action="disable" jobId="${jobId}"`
          : `schedule_prompt action="enable" jobId="${jobId}"`);
      }
    });

    this.root.querySelector("button[data-remove]")?.addEventListener("click", (e) => {
      const btn = e.currentTarget as HTMLElement;
      const jobId = btn.getAttribute("data-job-id");
      if (jobId && context) {
        context.prompt.insertText(`schedule_prompt action="remove" jobId="${jobId}"`);
      }
    });
  }

  private renderState(state: ConfigCacheEntry): string {
    if ("version" in state) {
      if (state.jobs.length === 0) {
        return `<p class="muted">No scheduled prompts. Use the <code>schedule_prompt</code> tool to add one.</p>`;
      }
      return `<div class="jobs">${state.jobs.map((job) => this.renderJobRow(job)).join("")}</div>`;
    }

    if (state.kind === "loading") {
      return `<p class="muted">Loading ${SCHEDULE_PROMPTS_CONFIG_PATH}…</p>`;
    }

    return `<div class="status error">${escapeHtml(state.message)}</div>`;
  }

  private renderJobRow(job: CronJob): string {
    const statusIcon = statusIconFor(job.lastStatus, job.enabled);
    const scheduleText = humanizeSchedule(job);
    const truncatedPrompt = job.prompt.length > 60 ? job.prompt.slice(0, 60) + "…" : job.prompt;
    const nextRun = job.nextRun ? formatDate(job.nextRun) : "—";
    const lastRun = job.lastRun ? formatDate(job.lastRun) : "—";
    const statusLabel = job.lastStatus ?? "pending";

    return `
      <article class="job-row">
        <div class="job-info">
          <span class="job-icon">${statusIcon}</span>
          <div class="job-details">
            <strong>${escapeHtml(job.name)}</strong>
            <span class="schedule">${escapeHtml(scheduleText)}</span>
            <span class="prompt-text">${escapeHtml(truncatedPrompt)}</span>
            <span class="meta">Next: ${nextRun} | Last: ${lastRun} | Runs: ${job.runCount} | ${statusLabel}</span>
          </div>
        </div>
        <div class="job-actions">
          <button data-job-id="${escapeAttr(job.id)}" data-enabled="${String(job.enabled)}" data-toggle class="secondary">${job.enabled ? "Disable" : "Enable"}</button>
          <button data-job-id="${escapeAttr(job.id)}" data-remove class="danger">Remove</button>
        </div>
      </article>
    `;
  }

  private async loadJobs(context: WorkspacePanelContext): Promise<void> {
    const key = cacheKeyForContext(context);

    try {
      const response = await context.files.readFile(SCHEDULE_PROMPTS_CONFIG_PATH);
      const content = typeof response.content === "string"
        ? response.content
        : new TextDecoder().decode(response.content);
      configCache.set(key, JSON.parse(content) as CronStore);
    } catch {
      configCache.set(key, {
        kind: "unavailable",
        message: "No schedule-prompts file yet. Use the schedule_prompt tool to create your first job.",
      });
    }

    this.render();
  }
}

function cacheKeyForContext(context: WorkspacePanelContext): string {
  return `${context.machine.id}:${context.workspace.projectId}:${context.workspace.id}`;
}

function statusIconFor(lastStatus: CronJobStatus | undefined, enabled: boolean): string {
  if (!enabled) return "✗";
  if (lastStatus === "running") return "⟳";
  if (lastStatus === "error") return "!";
  return "✓";
}

function humanizeSchedule(job: CronJob): string {
  if (job.type === "interval") return `every ${job.schedule}`;
  if (job.type === "once") {
    const d = new Date(job.schedule);
    return Number.isNaN(d.getTime()) ? job.schedule : formatDate(job.schedule);
  }
  return humanizeCron(job.schedule);
}

function humanizeCron(expression: string): string {
  const known: Record<string, string> = {
    "* * * * * *": "every second",
    "0 * * * * *": "every minute",
    "0 */5 * * * *": "every 5 min",
    "0 */10 * * * *": "every 10 min",
    "0 */15 * * * *": "every 15 min",
    "0 */30 * * * *": "every 30 min",
    "0 0 * * * *": "every hour",
    "0 0 */2 * * *": "every 2 hours",
    "0 0 */3 * * *": "every 3 hours",
    "0 0 */6 * * *": "every 6 hours",
    "0 0 0 * * *": "daily",
    "0 0 0 * * 0": "weekly",
    "0 0 0 1 * *": "monthly",
    "0 0 9 * * 1-5": "9am weekdays",
    "0 0 0 * * 1-5": "weekdays",
    "0 0 0 * * 0,6": "weekends",
  };
  return known[expression] ?? expression;
}

function formatDate(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month} ${day} ${hours}:${minutes}`;
}

function escapeHtml(value: unknown): string {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttr(value: unknown): string {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function panelStyles(): string {
  return `
    <style>
      :host { display: contents; }
      .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--pi-border-muted); }
      .viewer { box-sizing: border-box; min-height: 0; overflow: auto; padding: 12px; }
      .jobs { display: grid; gap: 10px; }
      .job-row { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; border: 1px solid var(--pi-border); border-radius: 10px; background: var(--pi-surface); padding: 12px; }
      .job-info { display: grid; grid-template-columns: auto 1fr; gap: 8px; align-items: start; }
      .job-icon { font-size: 16px; line-height: 1.4; }
      .job-details { display: grid; gap: 3px; min-width: 0; }
      .job-details .schedule { color: var(--pi-accent); font-size: 12px; }
      .job-details .prompt-text { color: var(--pi-text-secondary); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .job-details .meta { color: var(--pi-muted); font-size: 11px; }
      .job-actions { display: inline-flex; flex-wrap: wrap; gap: 6px; }
      button { border: 1px solid var(--pi-accent-border); border-radius: 7px; background: var(--pi-accent); color: var(--pi-bg); cursor: pointer; padding: 6px 10px; font: inherit; font-size: 12px; }
      button.secondary { border-color: var(--pi-border); background: var(--pi-surface); color: var(--pi-text); }
      button.danger { border-color: var(--pi-danger); background: transparent; color: var(--pi-danger); }
      button:disabled { cursor: wait; opacity: 0.65; }
      .muted { color: var(--pi-muted); }
      .status { border: 1px solid var(--pi-border); border-radius: 8px; padding: 10px; color: var(--pi-muted); }
      .status.error { border-color: var(--pi-danger); color: var(--pi-danger); }
      .empty { padding: 16px; color: var(--pi-muted); }
      code { border: 1px solid var(--pi-border-muted); border-radius: 6px; background: var(--pi-bg); color: var(--pi-text-secondary); font: 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; padding: 2px 5px; }
    </style>
  `;
}
