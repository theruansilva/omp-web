import { Cron } from "croner";
import type { CronStorage } from "./storage.js";
import type { CronJob, CronJobType } from "./types.js";

/** Result of `CronScheduler.validateSchedule`. On success, `schedule` is the
 *  resolved form to persist (ISO for `once`, original for `cron`/`interval`). */
type ValidateScheduleResult =
 | { ok: true; schedule: string; intervalMs?: number }
 | { ok: false; error: string };

/**
 * Manages cron job scheduling and execution
 */
export class CronScheduler {
 private jobs = new Map<string, Cron>();
 private intervals = new Map<string, NodeJS.Timeout>();
 private readonly storage: CronStorage;
 private readonly sessionId: string;
 private readonly dispatchPrompt: (text: string) => Promise<void>;

 constructor(
  storage: CronStorage,
  sessionId: string,
  dispatchPrompt: (text: string) => Promise<void>,
 ) {
  this.storage = storage;
  this.sessionId = sessionId;
  this.dispatchPrompt = dispatchPrompt;
 }

 /**
  * Schedule all enabled jobs loaded for this session.
  * Foreign-session jobs are skipped so two sessions in the same cwd don't double-fire.
  *
  * Also clears stale `lastStatus: "running"` from an interrupted prior run of
  * *this* session (process kill, abort) — otherwise the widget sticks on `⟳`
  * until the cron next fires. Other sessions' flags are theirs to manage.
  */
 start(): void {
  for (const job of this.storage.getAllJobs()) {
   if (!CronScheduler.isLoadedFor(job, this.sessionId)) continue;
   if (job.lastStatus === "running") {
    this.storage.updateJob(job.id, { lastStatus: undefined });
   }
   if (job.enabled) {
    this.scheduleJob(job);
   }
  }
 }

 /** Returns true if this job should be loaded for the given session. */
 static isLoadedFor(job: CronJob, sessionId: string): boolean {
  return job.scope === "workspace" || job.sessionId === sessionId;
 }

 /**
  * Stop all scheduled jobs
  */
 stop(): void {
  // Stop all cron jobs
  for (const cron of this.jobs.values()) {
   cron.stop();
  }
  this.jobs.clear();

  // Clear all intervals
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
  * Execute a job's prompt
  */
 private async executeJob(job: CronJob): Promise<void> {
  const fresh = this.storage.getJob(job.id);
  if (fresh?.enabled !== true) return;
  if (!CronScheduler.isLoadedFor(fresh, this.sessionId)) return;

  console.log(`Executing scheduled prompt: ${job.name} (${job.id})`);

  try {
   this.storage.updateJob(job.id, { lastStatus: "running" });
   await this.dispatchPrompt(job.prompt);

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
 static validateCronExpression(expression: string): { valid: boolean; error?: string } {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 6) {
   return {
    valid: false,
    error: `Cron expression must have 6 fields (second minute hour dom month dow), got ${String(fields.length)}. Example: "0 * * * * *" for every minute`,
   };
  }

  try {
   new Cron(expression, () => { /* validate */ });
   return { valid: true };
  } catch (error) {
   return {
    valid: false,
    error: error instanceof Error ? error.message : "Invalid cron expression",
   };
  }
 }

 /**
  * Parse relative time delta (e.g., "+10s", "+5m", "+1h")
  */
 static parseRelativeTime(delta: string): string | null {
  const re = /^\+(\d+)(s|m|h|d)$/;
  const match = re.exec(delta);
  if (!match) return null;
  const valStr = match[1];
  const unitStr = match[2];
  if (valStr == null || unitStr == null) return null;

  const value = parseInt(valStr, 10);
  const unit = unitStr;

  const msMap: Record<string, number> = {
   s: 1000,
   m: 60 * 1000,
   h: 60 * 60 * 1000,
   d: 24 * 60 * 60 * 1000,
  };

  const ms = value * (msMap[unit] ?? 0);
  const futureTime = new Date(Date.now() + ms);
  return futureTime.toISOString();
 }

 /**
  * Parse interval string to milliseconds
  */
 static parseInterval(interval: string): number | null {
  const re = /^(\d+)(s|m|h|d)$/;
  const match = re.exec(interval);
  if (!match) return null;
  const valStr = match[1];
  const unitStr = match[2];
  if (valStr == null || unitStr == null) return null;

  const value = parseInt(valStr, 10);
  const unit = unitStr;

  const multipliers: Record<string, number> = {
   s: 1000,
   m: 60 * 1000,
   h: 60 * 60 * 1000,
   d: 24 * 60 * 60 * 1000,
  };

  return value * (multipliers[unit] ?? 0);
 }

 /**
  * Validate and resolve a schedule string for the given type.
  */
 static validateSchedule(type: CronJobType, schedule: string): ValidateScheduleResult {
  if (type === "interval") {
   const intervalMs = CronScheduler.parseInterval(schedule);
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
   if (delay < 5000) {
    return {
     ok: false,
     error: `Timestamp is too soon (${String(Math.round(delay / 1000))}s). For delays under 5s, use relative time like '+${String(Math.ceil(delay / 1000))}s' instead, or schedule at least 5s in the future.`,
    };
   }
   return { ok: true, schedule: date.toISOString() };
  }

  const validation = CronScheduler.validateCronExpression(schedule);
  if (!validation.valid) {
   return { ok: false, error: `Invalid cron expression: ${validation.error ?? ""}` };
  }
  return { ok: true, schedule };
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
