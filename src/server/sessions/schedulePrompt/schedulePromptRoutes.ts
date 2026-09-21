import type { Hono } from "hono";
import { errorMessage, isRecord } from "../../utils.js";
import { normalizeRequestCwd } from "../../workingDirectory.js";
import type { SchedulePromptService } from "./schedulePromptService.js";
import { CronScheduler } from "./scheduler.js";
import type { CronJob, CronJobTarget, CronJobType } from "./types.js";

function requireRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error("Request body must be a JSON object");
  return value;
}

function requireString(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${field} field is required`);
  return value;
}

function optionalString(record: Record<string, unknown>, field: string): string | undefined {
  const value = record[field];
  return typeof value === "string" ? value : undefined;
}

export function registerSchedulePromptRoutes(
  app: Hono,
  scheduleService: SchedulePromptService,
  prefix = "",
): void {
  app.get(`${prefix}/schedule-prompts`, (c) => {
    const cwdParam = c.req.query("cwd");
    if (!cwdParam) {
      return c.json({ ok: false, error: "cwd query parameter is required" }, 400);
    }
    try {
      const cwd = normalizeRequestCwd(cwdParam);
      const { storage } = scheduleService.getOrCreateForWorkspace(cwd);
      return c.json({ ok: true, jobs: storage.getAllJobs() });
    } catch (error) {
      return c.json({ ok: false, error: errorMessage(error) }, 400);
    }
  });

  app.post(`${prefix}/schedule-prompts`, async (c) => {
    try {
      const body = requireRecord(await c.req.json().catch(() => undefined));
      const cwd = normalizeRequestCwd(requireString(body, "cwd"));
      const scheduleStr = requireString(body, "schedule");
      const targetStr = optionalString(body, "target");
      const target: CronJobTarget = targetStr === "command" ? "command" : "prompt";
      const type: CronJobType = (body["type"] as CronJobType) ?? "cron";

      const validation = CronScheduler.validateSchedule(type, scheduleStr);
      if (!validation.ok) {
        return c.json({ ok: false, error: validation.error }, 400);
      }

      const prompt = optionalString(body, "prompt");
      const command = optionalString(body, "command");

      if (target === "command" && !command) {
        return c.json({ ok: false, error: "command is required when target is 'command'" }, 400);
      }
      if (target === "prompt" && !prompt) {
        return c.json({ ok: false, error: "prompt is required when target is 'prompt'" }, 400);
      }

      const { storage, scheduler } = scheduleService.getOrCreateForWorkspace(cwd);
      const id = crypto.randomUUID().slice(0, 10);
      const name = optionalString(body, "name") || `job-${Date.now().toString(36)}`;

      const job: CronJob = {
        id,
        name,
        schedule: validation.schedule,
        target,
        ...(target === "command" ? { command } : { prompt }),
        enabled: body["enabled"] !== false,
        type,
        intervalMs: validation.intervalMs,
        createdAt: new Date().toISOString(),
        runCount: 0,
        scope: (body["scope"] as "workspace" | "session") ?? "workspace",
        description: optionalString(body, "description"),
      };

      storage.addJob(job);
      scheduler.addJob(job);

      return c.json({ ok: true, job }, 201);
    } catch (error) {
      return c.json({ ok: false, error: errorMessage(error) }, 400);
    }
  });

  app.patch(`${prefix}/schedule-prompts/:jobId`, async (c) => {
    try {
      const jobId = c.req.param("jobId");
      const body = requireRecord(await c.req.json().catch(() => undefined));
      const cwd = normalizeRequestCwd(requireString(body, "cwd"));
      const { storage, scheduler } = scheduleService.getOrCreateForWorkspace(cwd);

      const rawUpdates = (isRecord(body["updates"]) ? body["updates"] : body) as Partial<CronJob>;
      const updates: Partial<CronJob> = {};

      if (typeof rawUpdates.enabled === "boolean") updates.enabled = rawUpdates.enabled;
      if (typeof rawUpdates.name === "string") updates.name = rawUpdates.name;
      if (typeof rawUpdates.prompt === "string") updates.prompt = rawUpdates.prompt;
      if (typeof rawUpdates.command === "string") updates.command = rawUpdates.command;
      if (rawUpdates.target === "command" || rawUpdates.target === "prompt") updates.target = rawUpdates.target;
      if (typeof rawUpdates.description === "string") updates.description = rawUpdates.description;

      if (typeof rawUpdates.schedule === "string") {
        const type = rawUpdates.type ?? storage.getJob(jobId)?.type ?? "cron";
        const validation = CronScheduler.validateSchedule(type, rawUpdates.schedule);
        if (!validation.ok) return c.json({ ok: false, error: validation.error }, 400);
        updates.schedule = validation.schedule;
        updates.intervalMs = validation.intervalMs;
      }

      const ok = storage.updateJob(jobId, updates);
      if (!ok) return c.json({ ok: false, error: `Job ${jobId} not found` }, 404);

      const updatedJob = storage.getJob(jobId);
      if (updatedJob) scheduler.updateJob(jobId, updatedJob);

      return c.json({ ok: true, job: updatedJob });
    } catch (error) {
      return c.json({ ok: false, error: errorMessage(error) }, 400);
    }
  });

  app.delete(`${prefix}/schedule-prompts/:jobId`, async (c) => {
    try {
      const jobId = c.req.param("jobId");
      let cwdParam = c.req.query("cwd");
      if (!cwdParam) {
        const body = await c.req.json().catch(() => undefined);
        if (isRecord(body) && typeof body["cwd"] === "string") {
          cwdParam = body["cwd"];
        }
      }

      if (!cwdParam) {
        return c.json({ ok: false, error: "cwd parameter is required" }, 400);
      }

      const cwd = normalizeRequestCwd(cwdParam);
      const { storage, scheduler } = scheduleService.getOrCreateForWorkspace(cwd);

      scheduler.removeJob(jobId);
      const removed = storage.removeJob(jobId);
      return c.json({ ok: true, removed });
    } catch (error) {
      return c.json({ ok: false, error: errorMessage(error) }, 400);
    }
  });

  app.post(`${prefix}/schedule-prompts/:jobId/run`, async (c) => {
    try {
      const jobId = c.req.param("jobId");
      let cwdParam = c.req.query("cwd");
      if (!cwdParam) {
        const body = await c.req.json().catch(() => undefined);
        if (isRecord(body) && typeof body["cwd"] === "string") {
          cwdParam = body["cwd"];
        }
      }

      if (!cwdParam) {
        return c.json({ ok: false, error: "cwd parameter is required" }, 400);
      }

      const cwd = normalizeRequestCwd(cwdParam);
      const { scheduler } = scheduleService.getOrCreateForWorkspace(cwd);

      await scheduler.runJob(jobId);
      return c.json({ ok: true, ran: true });
    } catch (error) {
      return c.json({ ok: false, error: errorMessage(error) }, 400);
    }
  });
}
