import { spawn } from "node:child_process";
import { Cron } from "croner";
import type { CronStorage } from "./storage.js";
import type { CronJob, CronJobType } from "./types.js";

/** Result of `CronScheduler.validateSchedule`. On success, `schedule` is the
 *  resolved form to persist (ISO for `once`, original for `cron`/`interval`). */
type ValidateScheduleResult =
  | { ok: true; schedule: string; intervalMs?: number }
  | { ok: false; error: string };

export interface CronSchedulerOptions {
  cwd?: string | undefined;
  executeCommand?: ((command: string) => Promise<boolean>) | undefined;
}

/**
 * Manages cron job scheduling and execution
 */
export class CronScheduler {
  private jobs = new Map<string, Cron>();
  private intervals = new Map<string, NodeJS.Timeout>();
  private readonly storage: CronStorage;
  private readonly sessionId: string;
  private dispatchPrompt?: ((text: string) => Promise<void>) | undefined;
  private readonly cwd?: string | undefined;
  private readonly executeCommand?: ((command: string) => Promise<boolean>) | undefined;

  constructor(
    storage: CronStorage,
    sessionId = "",
    dispatchPrompt?: (text: string) => Promise<void>,
    options?: CronSchedulerOptions,
  ) {
    this.storage = storage;
    this.sessionId = sessionId;
    this.dispatchPrompt = dispatchPrompt;
    this.cwd = options?.cwd;
    this.executeCommand = options?.executeCommand;
  }

  setPromptDispatcher(fn: (text: string) => Promise<void>): void {
    this.dispatchPrompt = fn;
  }

  /**
   * Schedule all enabled jobs loaded for this session or workspace.
   * Foreign-session jobs are skipped so two sessions in the same cwd don't double-fire.
   */
  start(): void {
    for (const job of this.storage.getAllJobs()) {
      if (this.sessionId && !CronScheduler.isLoadedFor(job, this.sessionId)) continue;
      if (job.lastStatus === "running") {
        this.storage.updateJob(job.id, { lastStatus: undefined });
      }
      if (job.enabled) {
        this.scheduleJob(job);
      }
    }
  }

  /** Returns true if this job should be loaded for the given session. */
  static isLoadedFor(job: CronJob, sessionId?: string): boolean {
    return job.scope === "workspace" || (Boolean(sessionId) && job.sessionId === sessionId);
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    for (const cron of this.jobs.values()) {
      cron.stop();
    }
    this.jobs.clear();

    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
  }

  /**
   * Add and schedule a new job
   */
  addJob(job: CronJob): void {
    if (job.enabled) {
      this.scheduleJob(job);
    }
  }

  /**
   * Remove and unschedule a job
   */
  removeJob(id: string): void {
    this.unscheduleJob(id);
  }

  /**
   * Update a job (reschedule if needed)
   */
  updateJob(id: string, updated: CronJob): void {
    this.unscheduleJob(id);
    if (updated.enabled) {
      this.scheduleJob(updated);
    }
  }

  /**
   * Execute a job immediately on-demand
   */
  async runJob(id: string): Promise<void> {
    const job = this.storage.getJob(id);
    if (!job) throw new Error(`Job ${id} not found`);
    await this.executeJob(job);
  }

  /**
   * Get next run time for a job
   */
  getNextRun(jobId: string): Date | null {
    const cron = this.jobs.get(jobId);
    if (cron) {
      const next = cron.nextRun();
      return next ?? null;
    }
    return null;
  }

  /**
   * Schedule a single job
   */
  private scheduleJob(job: CronJob): void {
    try {
      if (job.type === "interval" && job.intervalMs != null) {
        const interval = setInterval(() => {
          void this.executeJob(job);
        }, job.intervalMs);
        this.intervals.set(job.id, interval);
      } else if (job.type === "once") {
        const targetDate = new Date(job.schedule);
        const now = new Date();
        const delay = targetDate.getTime() - now.getTime();

        if (delay > 0) {
          const timeout = setTimeout(() => {
            void this.executeJob(job);
            this.storage.updateJob(job.id, { enabled: false });
          }, delay);
          this.intervals.set(job.id, timeout);
        } else {
          console.warn(`Job ${job.id} (${job.name}) scheduled for past time: ${job.schedule}`);
          this.storage.updateJob(job.id, {
            enabled: false,
            lastStatus: "error",
          });
        }
      } else {
        const cron = new Cron(job.schedule, () => {
          void this.executeJob(job);
        });
        this.jobs.set(job.id, cron);
      }
    } catch (error) {
      console.error(`Failed to schedule job ${job.id}:`, error);
    }
  }

  /**
   * Unschedule a job
   */
  private unscheduleJob(id: string): void {
    const cron = this.jobs.get(id);
    if (cron) {
      cron.stop();
      this.jobs.delete(id);
    }

    const interval = this.intervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(id);
    }
  }

  /**
   * Execute shell command directly in workspace directory
   */
  static runShellCommand(command: string, cwd?: string): Promise<void> {
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    const shell = process.env["SHELL"] || "/bin/sh";
    const child = spawn(shell, ["-lc", `exec ${command}`], {
      cwd: cwd || process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command exited with code ${String(code)}${stderr.trim() ? `: ${stderr.trim()}` : ""}`));
      }
    });
    return promise;
  }

  /**
   * Execute a job (command or prompt)
   */
  private async executeJob(job: CronJob): Promise<void> {
    const fresh = this.storage.getJob(job.id);
    if (fresh?.enabled !== true) return;
    if (this.sessionId && !CronScheduler.isLoadedFor(fresh, this.sessionId)) return;

    const isCommand = job.target === "command" || (Boolean(job.command) && !job.prompt);
    console.log(`Executing scheduled ${isCommand ? "command" : "prompt"}: ${job.name} (${job.id})`);

    try {
      this.storage.updateJob(job.id, { lastStatus: "running" });

      if (isCommand) {
        const cmd = job.command;
        if (!cmd) throw new Error(`Job "${job.name}" has command target but command is empty`);
        if (this.executeCommand) {
          const ok = await this.executeCommand(cmd);
          if (!ok) throw new Error("Custom command executor returned false");
        } else {
          await CronScheduler.runShellCommand(cmd, this.cwd);
        }
      } else {
        const promptText = job.prompt;
        if (!promptText) throw new Error(`Job "${job.name}" has prompt target but prompt is empty`);
        if (!this.dispatchPrompt) throw new Error("No prompt dispatcher available for workspace");
        await this.dispatchPrompt(promptText);
      }

      const nextRun = this.getNextRun(job.id);
      const latest = this.storage.getJob(job.id);
      const currentRunCount = latest?.runCount ?? job.runCount;
      this.storage.updateJob(job.id, {
        lastRun: new Date().toISOString(),
        lastStatus: "success",
        runCount: currentRunCount + 1,
        nextRun: nextRun?.toISOString(),
      });
    } catch (error) {
      console.error(`Failed to execute job ${job.id}:`, error);
      this.storage.updateJob(job.id, {
        lastRun: new Date().toISOString(),
        lastStatus: "error",
      });
    }
  }

  /**
   * Validate a cron expression (must be 6-field format with seconds)
   */
  static validateCronExpression(expression: string): { valid: boolean; error?: string; normalized?: string } {
    const trimmed = expression.trim();
    const fields = trimmed.split(/\s+/);
    let normalized = trimmed;
    if (fields.length === 5) {
      normalized = `0 ${trimmed}`;
    } else if (fields.length !== 6) {
      return {
        valid: false,
        error: `Cron expression must have 5 or 6 fields, got ${String(fields.length)}. Example: "* * * * *" or "0 * * * * *"`,
      };
    }

    try {
      new Cron(normalized, () => { /* validate */ });
      return { valid: true, normalized };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Invalid cron expression",
      };
    }
  }

  /**
   * Parse a duration string like "10s", "5m", "1h", "2d" (optionally with
   * leading `+`) into milliseconds. Returns null on invalid input.
   */
  static parseDuration(value: string): number | null {
    const re = /^\+?(\d+)(s|m|h|d)$/;
    const match = re.exec(value);
    if (!match) return null;
    const valStr = match[1];
    const unitStr = match[2];
    if (valStr == null || unitStr == null) return null;

    const valueNum = parseInt(valStr, 10);
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return valueNum * (multipliers[unitStr] ?? 0);
  }

  /** Parse relative time delta (e.g., "+10s") → ISO string */
  static parseRelativeTime(delta: string): string | null {
    if (!delta.startsWith("+")) return null;
    const ms = CronScheduler.parseDuration(delta);
    if (ms == null) return null;
    return new Date(Date.now() + ms).toISOString();
  }

  /**
   * Validate and resolve a schedule string for the given type.
   */
  static validateSchedule(type: CronJobType, schedule: string): ValidateScheduleResult {
    if (schedule.startsWith("+")) {
      const relative = CronScheduler.parseRelativeTime(schedule);
      if (relative != null) return { ok: true, schedule: relative };
    }

    if (type === "interval" || (/^\d+(s|m|h|d)$/i.test(schedule.trim()) && type !== "cron")) {
      const intervalMs = CronScheduler.parseDuration(schedule);
      if (intervalMs == null || intervalMs <= 0) {
        return {
          ok: false,
          error: `Invalid interval format: ${schedule}. Use format like '5m', '1h', '30s'`,
        };
      }
      return { ok: true, schedule, intervalMs };
    }

    if (type === "once") {
      const relative = CronScheduler.parseRelativeTime(schedule);
      if (relative != null) return { ok: true, schedule: relative };

      const date = new Date(schedule);
      if (Number.isNaN(date.getTime())) {
        return {
          ok: false,
          error: `Invalid timestamp: ${schedule}. Use ISO format or relative time like '+10s', '+5m'`,
        };
      }
      const delay = date.getTime() - Date.now();
      if (delay < 0) {
        return {
          ok: false,
          error: `Timestamp is in the past: ${date.toISOString()}. Current time: ${new Date().toISOString()}`,
        };
      }
      return { ok: true, schedule: date.toISOString() };
    }

    const validation = CronScheduler.validateCronExpression(schedule);
    if (!validation.valid) {
      return { ok: false, error: `Invalid cron expression: ${validation.error ?? ""}` };
    }
    return { ok: true, schedule: validation.normalized ?? schedule };
  }

  /**
   * Render a resolved schedule as a short human-readable phrase.
   */
  static describeSchedule(type: CronJobType, schedule: string): string {
    if (type === "interval") return `every ${schedule}`;
    if (type === "once") {
      const date = new Date(schedule);
      return Number.isNaN(date.getTime()) ? schedule : formatISOShort(date);
    }
    return humanizeCron(schedule);
  }
}

const HUMANIZED_CRON: Record<string, string> = {
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

export function humanizeCron(expression: string): string {
  return HUMANIZED_CRON[expression] ?? expression;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatISOShort(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return String(input);
  const month = MONTHS[date.getMonth()] ?? "???";
  const day = String(date.getDate());
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month} ${day} ${hours}:${minutes}`;
}
