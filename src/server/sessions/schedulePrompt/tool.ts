import { isRecord } from "../../utils.js";
import { Type } from "@sinclair/typebox";
import type { ToolDefinition } from "@oh-my-pi/pi-coding-agent";
import { nanoid } from "nanoid";
import { CronScheduler } from "./scheduler.js";
import type { CronStorage } from "./storage.js";
import type { CronJob } from "./types.js";

const SchedulePromptParams = Type.Object({
  action: Type.Union([
    Type.Literal("add"), Type.Literal("remove"), Type.Literal("list"),
    Type.Literal("enable"), Type.Literal("disable"), Type.Literal("update"),
    Type.Literal("cleanup"),
  ]),
  name: Type.Optional(Type.String({
    description: "Job name, auto-generated if omitted",
  })),
  schedule: Type.Optional(Type.String({
    description: "Required for add. Cron expression (6-field with seconds e.g. '0 * * * * *'), ISO timestamp, relative time (+10s, +5m, +1h), or interval (5m, 1h)",
  })),
  prompt: Type.Optional(Type.String({
    description: "Required for add. The prompt text to execute",
  })),
  jobId: Type.Optional(Type.String({
    description: "Job ID for remove, enable, disable, or update actions",
  })),
  type: Type.Optional(Type.Union([
    Type.Literal("cron"), Type.Literal("once"), Type.Literal("interval"),
  ], {
    description: "Job type. Use 'once' for relative times like '+10s'. Default is cron",
  })),
  description: Type.Optional(Type.String({
    description: "Optional job description",
  })),
  scope: Type.Optional(Type.Union([
    Type.Literal("session"), Type.Literal("workspace"),
  ], {
    description: "Scope: 'session' (default) = only fires in this session; 'workspace' = fires in any session of this workspace",
  })),
});


interface SchedulePromptToolDetails {
  action: string;
  jobs: CronJob[];
  jobId?: string;
  jobName?: string;
  error?: string;
}

export function createSchedulePromptToolDefinition(
  sessionId: string,
  getStorage: () => CronStorage,
  getScheduler: () => CronScheduler,
): ToolDefinition {
  const def: ToolDefinition = {
    name: "schedule_prompt",
    label: "Schedule Prompt",
    description:
      "IMPORTANT: For action='add', you MUST provide both 'schedule' parameter AND 'prompt' parameter. Schedule prompts at times/intervals. Schedule formats: 6-field cron (with seconds: '0 * * * * *' = every minute), ISO timestamp, relative time (+10s, +5m, +1h), or interval (5m, 1h). Type defaults to 'cron', use 'once' for relative/ISO times. Actions: add (needs schedule+prompt), list, remove/enable/disable/update (need jobId), cleanup.",
    parameters: SchedulePromptParams,

    async execute(
      _toolCallId: string,
      params: unknown,
    ) {
      await Promise.resolve();
      const storage = getStorage();
      const scheduler = getScheduler();
      const p = parseParams(params);
      const action = p.action;
      const details: SchedulePromptToolDetails = { action, jobs: [] };

      try {
        switch (action) {
          case "add": {
            if (p.schedule === undefined || p.schedule === "" || p.prompt === undefined || p.prompt === "") {
              const missing: string[] = [];
              if (p.schedule === undefined || p.schedule === "") missing.push("'schedule'");
              if (p.prompt === undefined || p.prompt === "") missing.push("'prompt'");
              throw new Error(
                `Missing required parameters for add action: ${missing.join(" and ")}. You must provide both schedule (e.g., '+10s', '*/5 * * * * *') and prompt (the text to execute).`,
              );
            }

            const jobName = p.name !== undefined && p.name !== "" ? p.name : `job-${nanoid(6)}`;

            if (storage.hasJobWithName(jobName)) {
              throw new Error(
                `A job named "${jobName}" already exists. Please use a different name or remove the existing job first.`,
              );
            }

            const type = p.type ?? "cron";
            const validated = CronScheduler.validateSchedule(type, p.schedule);
            if (!validated.ok) throw new Error(validated.error);
            const schedule = validated.schedule;
            const intervalMs = validated.intervalMs;

            const scope = p.scope ?? "session";
            const now = new Date().toISOString();
            const job: CronJob = {
              id: nanoid(10),
              name: jobName,
              schedule,
              prompt: p.prompt,
              enabled: true,
              type,
              ...(intervalMs !== undefined ? { intervalMs } : {}),
              createdAt: now,
              runCount: 0,
              scope,
              ...(scope === "session" ? { sessionId } : {}),
              ...(p.description !== undefined ? { description: p.description } : {}),
            };

            storage.addJob(job);
            scheduler.addJob(job);
            details.jobs = [job];
            details.jobId = job.id;
            details.jobName = job.name;

            return {
              content: [{
                type: "text",
                text: `✓ Created cron job "${job.name}" (${job.id})\nType: ${job.type}\nSchedule: ${job.schedule}\nPrompt: ${job.prompt}\nScope: ${job.scope}`,
              }],
              details,
            };
          }

          case "remove": {
            if (p.jobId === undefined || p.jobId === "") throw new Error("jobId is required for remove action");

            const job = storage.getJob(p.jobId);
            if (!job) throw new Error(`Job not found: ${p.jobId}`);

            const removed = storage.removeJob(p.jobId);
            if (removed) {
              scheduler.removeJob(p.jobId);
              details.jobId = p.jobId;
              details.jobName = job.name;

              return {
                content: [{ type: "text", text: `✓ Removed cron job "${job.name}" (${p.jobId})` }],
                details,
              };
            }
            throw new Error(`Failed to remove job: ${p.jobId}`);
          }

          case "enable":
          case "disable": {
            if (p.jobId === undefined || p.jobId === "") throw new Error(`jobId is required for ${action} action`);

            const job = storage.getJob(p.jobId);
            if (!job) throw new Error(`Job not found: ${p.jobId}`);

            const enabled = action === "enable";
            storage.updateJob(p.jobId, { enabled });
            const updated = { ...job, enabled };
            scheduler.updateJob(p.jobId, updated);

            details.jobs = [updated];
            details.jobId = p.jobId;
            details.jobName = job.name;

            return {
              content: [{ type: "text", text: `✓ ${enabled ? "Enabled" : "Disabled"} cron job "${job.name}" (${p.jobId})` }],
              details,
            };
          }

          case "cleanup": {
            const disabledJobs = storage
              .getAllJobs()
              .filter((j) => !j.enabled && CronScheduler.isLoadedFor(j, sessionId));

            if (disabledJobs.length === 0) {
              details.jobs = [];
              return {
                content: [{ type: "text", text: "No disabled jobs to clean up" }],
                details,
              };
            }

            for (const job of disabledJobs) {
              storage.removeJob(job.id);
              scheduler.removeJob(job.id);
            }

            details.jobs = disabledJobs;

            return {
              content: [{
                type: "text",
                text: `✓ Removed ${String(disabledJobs.length)} disabled job(s):\n${disabledJobs.map((j) => `  - ${j.name} (${j.id})`).join("\n")}`,
              }],
              details,
            };
          }

          case "update": {
            if (p.jobId === undefined || p.jobId === "") throw new Error("jobId is required for update action");

            const job = storage.getJob(p.jobId);
            if (!job) throw new Error(`Job not found: ${p.jobId}`);

            const updates: Partial<CronJob> = {};
            if (p.name !== undefined && p.name !== "") updates.name = p.name;
            if (p.prompt !== undefined && p.prompt !== "") updates.prompt = p.prompt;
            if (p.description !== undefined) updates.description = p.description;

            if (p.schedule !== undefined && p.schedule !== "") {
              const validated = CronScheduler.validateSchedule(job.type, p.schedule);
              if (!validated.ok) throw new Error(validated.error);
              updates.schedule = validated.schedule;
              if (validated.intervalMs !== undefined) updates.intervalMs = validated.intervalMs;
            }

            storage.updateJob(p.jobId, updates);
            const updated = { ...job, ...updates };
            scheduler.updateJob(p.jobId, updated);

            details.jobs = [updated];
            details.jobId = p.jobId;
            details.jobName = updated.name;

            return {
              content: [{ type: "text", text: `✓ Updated cron job "${updated.name}" (${p.jobId})` }],
              details,
            };
          }

          case "list": {
            const jobs = storage
              .getAllJobs()
              .filter((j) => CronScheduler.isLoadedFor(j, sessionId));
            details.jobs = jobs;

            if (jobs.length === 0) {
              return {
                content: [{ type: "text", text: "No cron jobs configured." }],
                details,
              };
            }

            const lines = ["Configured cron jobs:", ""];
            for (const job of jobs) {
              const status = job.enabled ? "✓" : "✗";
              const nextRun = scheduler.getNextRun(job.id);
              const nextStr = nextRun !== null ? `Next: ${nextRun.toISOString()}` : "";
              const lastStr = job.lastRun !== undefined && job.lastRun !== "" ? `Last: ${job.lastRun}` : "Never run";

              lines.push(`${status} ${job.name} (${job.id})`);
              lines.push(`  Type: ${job.type} | Schedule: ${job.schedule} | Scope: ${job.scope}`);
              lines.push(`  Prompt: ${job.prompt}`);
              lines.push(`  ${lastStr} ${nextStr !== "" ? `| ${nextStr}` : ""}`);
              lines.push(`  Runs: ${String(job.runCount)} | Status: ${job.lastStatus ?? "pending"}`);
              if (job.description !== undefined && job.description !== "") lines.push(`  Description: ${job.description}`);
              lines.push("");
            }

            return {
              content: [{ type: "text", text: lines.join("\n") }],
              details,
            };
          }

          default:
            throw new Error(`Unknown action: ${action}`);
        }
      } catch (error) {
        details.error = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `✗ Error: ${details.error}` }],
          details,
        };
      }
    },
  };

  return def;
}

interface ParsedSchedulePromptParams {
  action: string;
  name?: string;
  schedule?: string;
  prompt?: string;
  jobId?: string;
  type?: "cron" | "once" | "interval";
  description?: string;
  scope?: "session" | "workspace";
}

function parseParams(params: unknown): ParsedSchedulePromptParams {
  const p = isRecord(params) ? params : {};
  return {
    action: typeof p["action"] === "string" ? p["action"] : "",
    ...(typeof p["name"] === "string" ? { name: p["name"] } : {}),
    ...(typeof p["schedule"] === "string" ? { schedule: p["schedule"] } : {}),
    ...(typeof p["prompt"] === "string" ? { prompt: p["prompt"] } : {}),
    ...(typeof p["jobId"] === "string" ? { jobId: p["jobId"] } : {}),
    ...(p["type"] === "cron" || p["type"] === "once" || p["type"] === "interval" ? { type: p["type"] } : {}),
    ...(typeof p["description"] === "string" ? { description: p["description"] } : {}),
    ...(p["scope"] === "session" || p["scope"] === "workspace" ? { scope: p["scope"] } : {}),
  };
}
