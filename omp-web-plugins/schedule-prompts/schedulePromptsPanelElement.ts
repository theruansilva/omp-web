import type { WorkspacePanelContext } from "@ProgmRuanSilva/omp-web/plugin-api";
import type { CronJob, CronJobStatus, CronStore } from "./types.js";

export const schedulePromptsPanelTagName = "omp-web-schedule-prompts-panel";

const SCHEDULE_PROMPTS_CONFIG_PATH = ".omp-web/schedule-prompts.json";

type ConfigCacheEntry = CronStore | { kind: "loading" } | { kind: "unavailable"; message: string };

const configCache = new Map<string, ConfigCacheEntry>();

export function defineSchedulePromptsPanelElement(): void {
  if (!customElements.get(schedulePromptsPanelTagName)) {
    customElements.define(schedulePromptsPanelTagName, OmpWebSchedulePromptsPanel);
  }
}

export function schedulePromptsBadge(context: WorkspacePanelContext): string | undefined {
  const cached = configCache.get(cacheKeyForContext(context));
  if (cached === undefined || "kind" in cached) return undefined;
  const enabled = cached.jobs.filter((j) => j.enabled).length;
  return enabled > 0 ? String(enabled) : undefined;
}

class OmpWebSchedulePromptsPanel extends HTMLElement {
  private contextValue: WorkspacePanelContext | undefined;
  private readonly root: ShadowRoot;
  private pollTimer: NodeJS.Timeout | number | undefined;

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
        <strong>Scheduled Tasks</strong>
        <button class="secondary" data-refresh ${isLoading ? "disabled" : ""}>Refresh</button>
      </section>
      <section class="viewer">
        ${this.renderState(state)}
      </section>
    `;

    this.root.querySelector("button[data-refresh]")?.addEventListener("click", () => {
      void this.loadJobs(context);
    });

    this.root.querySelectorAll("button[data-toggle]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const target = e.currentTarget;
        if (!(target instanceof HTMLElement)) return;
        const jobId = target.getAttribute("data-job-id");
        const enabled = target.getAttribute("data-enabled") === "true";
        if (!jobId) return;

        target.setAttribute("disabled", "true");
        try {
          const res = await context.apiFetch(`/schedule-prompts/${encodeURIComponent(jobId)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cwd: context.workspace.path, updates: { enabled: !enabled } }),
          });
          if (!res.ok) throw new Error(`HTTP ${String(res.status)}`);
          await this.loadJobs(context);
        } catch (err) {
          console.error("Failed to toggle job:", err);
          target.removeAttribute("disabled");
        }
      });
    });

    this.root.querySelectorAll("button[data-remove]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const target = e.currentTarget;
        if (!(target instanceof HTMLElement)) return;
        const jobId = target.getAttribute("data-job-id");
        if (!jobId) return;

        target.setAttribute("disabled", "true");
        try {
          const res = await context.apiFetch(`/schedule-prompts/${encodeURIComponent(jobId)}?cwd=${encodeURIComponent(context.workspace.path)}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error(`HTTP ${String(res.status)}`);
          await this.loadJobs(context);
        } catch (err) {
          console.error("Failed to remove job:", err);
          target.removeAttribute("disabled");
        }
      });
    });

    this.root.querySelectorAll("button[data-run]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const target = e.currentTarget;
        if (!(target instanceof HTMLElement)) return;
        const jobId = target.getAttribute("data-job-id");
        if (!jobId) return;

        target.setAttribute("disabled", "true");
        try {
          const res = await context.apiFetch(`/schedule-prompts/${encodeURIComponent(jobId)}/run`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cwd: context.workspace.path }),
          });
          if (!res.ok) throw new Error(`HTTP ${String(res.status)}`);
          await this.loadJobs(context);
        } catch (err) {
          console.error("Failed to run job:", err);
        } finally {
          target.removeAttribute("disabled");
        }
      });
    });
  }

  private renderState(state: ConfigCacheEntry): string {
    if ("version" in state) {
      if (state.jobs.length === 0) {
        return `<p class="muted">No scheduled tasks. Use the <code>schedule_prompt</code> tool to add one.</p>`;
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
    const isCommand = job.target === "command" || (Boolean(job.command) && !job.prompt);
    const content = (isCommand ? job.command : job.prompt) ?? "";
    const truncatedContent = content.length > 60 ? content.slice(0, 60) + "…" : content;
    const nextRun = job.nextRun !== undefined && job.nextRun !== "" ? formatDate(job.nextRun) : "—";
    const lastRun = job.lastRun !== undefined && job.lastRun !== "" ? formatDate(job.lastRun) : "—";
    const statusLabel = job.lastStatus ?? "pending";
    const targetBadge = isCommand
      ? `<span class="badge command">CLI</span>`
      : `<span class="badge prompt">Prompt</span>`;

    return `
      <article class="job-row">
        <div class="job-info">
          <span class="job-icon">${statusIcon}</span>
          <div class="job-details">
            <div class="job-header">
              <strong>${escapeHtml(job.name)}</strong>
              ${targetBadge}
            </div>
            <span class="schedule">${escapeHtml(scheduleText)}</span>
            <span class="prompt-text">${escapeHtml(truncatedContent)}</span>
            <span class="meta">Next: ${nextRun} | Last: ${lastRun} | Runs: ${String(job.runCount)} | ${statusLabel}</span>
          </div>
        </div>
        <div class="job-actions">
          <button data-job-id="${escapeAttr(job.id)}" data-run class="secondary" title="Execute immediately">Run</button>
          <button data-job-id="${escapeAttr(job.id)}" data-enabled="${String(job.enabled)}" data-toggle class="secondary">${job.enabled ? "Disable" : "Enable"}</button>
          <button data-job-id="${escapeAttr(job.id)}" data-remove class="danger">Remove</button>
        </div>
      </article>
    `;
  }

  private async loadJobs(context: WorkspacePanelContext): Promise<void> {
    const key = cacheKeyForContext(context);

    try {
      const res = await context.apiFetch(`/schedule-prompts?cwd=${encodeURIComponent(context.workspace.path)}`);
      if (res.ok) {
        const data = (await res.json()) as { ok?: boolean; jobs?: CronJob[] };
        if (data && Array.isArray(data.jobs)) {
          configCache.set(key, { version: 1, jobs: data.jobs });
          this.render();
          return;
        }
      }
    } catch {
      // Fall back to reading .omp-web/schedule-prompts.json directly
    }

    try {
      const response = await context.files.readFile(SCHEDULE_PROMPTS_CONFIG_PATH);
      const content = typeof response.content === "string"
        ? response.content
        : new TextDecoder().decode(response.content);
      const parsed: unknown = JSON.parse(content);
      if (!isCronStore(parsed)) {
        throw new Error("Invalid schedule-prompts payload");
      }
      configCache.set(key, parsed);
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

const HUMANIZED_CRON_TABLE: Record<string, string> = {
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

function humanizeCron(expression: string): string {
  return HUMANIZED_CRON_TABLE[expression] ?? expression;
}

const MONTHS_LIST = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  const month = MONTHS_LIST[date.getMonth()] ?? "";
  const day = String(date.getDate());
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month} ${day} ${hours}:${minutes}`;
}

function isCronStore(value: unknown): value is CronStore {
  return (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    value.version === 1 &&
    "jobs" in value &&
    Array.isArray(value.jobs)
  );
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
      .job-header { display: flex; align-items: center; gap: 6px; }
      .job-details .schedule { color: var(--pi-accent); font-size: 12px; }
      .job-details .prompt-text { color: var(--pi-text-secondary); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace; }
      .job-details .meta { color: var(--pi-muted); font-size: 11px; }
      .badge { display: inline-block; padding: 1px 5px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
      .badge.command { background: rgba(56, 139, 253, 0.15); color: #58a6ff; border: 1px solid rgba(56, 139, 253, 0.4); }
      .badge.prompt { background: rgba(187, 128, 179, 0.15); color: #bc8cff; border: 1px solid rgba(187, 128, 179, 0.4); }
      .job-actions { display: inline-flex; flex-wrap: wrap; gap: 6px; }
      button { border: 1px solid var(--pi-accent-border); border-radius: 7px; background: var(--pi-accent); color: var(--pi-bg); cursor: pointer; padding: 6px 10px; font: inherit; font-size: 12px; }
      button.secondary { border-color: var(--pi-border); background: var(--pi-surface); color: var(--pi-text); }
      button.danger { border-color: var(--pi-danger); background: transparent; color: var(--pi-danger); }
      button:disabled { cursor: wait; opacity: 0.65; }
      .muted { color: var(--pi-muted); }
      .status { border: 1px solid var(--pi-border); border-radius: 8px; padding: 10px; color: var(--pi-muted); }
      .status.error { border-color: var(--pi-danger); color: var(--pi-danger); }
      .empty { padding: 24px 12px; text-align: center; color: var(--pi-muted); font-size: 13px; }
    </style>
  `;
}
