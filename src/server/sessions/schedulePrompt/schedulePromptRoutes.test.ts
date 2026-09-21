import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Hono } from "hono";
import { SchedulePromptService } from "./schedulePromptService.js";
import { registerSchedulePromptRoutes } from "./schedulePromptRoutes.js";
import type { CronJob } from "./types.js";

describe("schedulePromptRoutes", () => {
  let tempDir: string;
  let service: SchedulePromptService;
  let app: Hono;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "schedule-routes-test-"));
    service = new SchedulePromptService();
    app = new Hono();
    registerSchedulePromptRoutes(app, service, "");
  });

  afterEach(() => {
    service.dispose();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("GET /schedule-prompts requires cwd query param", async () => {
    const res = await app.request("/schedule-prompts");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toContain("cwd query parameter is required");
  });

  it("POST and GET /schedule-prompts creates and retrieves command and prompt jobs", async () => {
    // 1. Create command job
    const createCmdRes = await app.request("/schedule-prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cwd: tempDir,
        name: "test-cmd",
        schedule: "0 30 9 * * *",
        target: "command",
        command: "echo 123",
      }),
    });
    expect(createCmdRes.status).toBe(201);
    const cmdBody = (await createCmdRes.json()) as { ok: boolean; job: CronJob };
    expect(cmdBody.ok).toBe(true);
    expect(cmdBody.job.target).toBe("command");
    expect(cmdBody.job.command).toBe("echo 123");

    // 2. Create prompt job
    const createPromptRes = await app.request("/schedule-prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cwd: tempDir,
        name: "test-prompt",
        schedule: "0 0 12 * * *",
        target: "prompt",
        prompt: "Analyze the repo",
      }),
    });
    expect(createPromptRes.status).toBe(201);

    // 3. List jobs
    const listRes = await app.request(`/schedule-prompts?cwd=${encodeURIComponent(tempDir)}`);
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as { ok: boolean; jobs: CronJob[] };
    expect(listBody.ok).toBe(true);
    expect(listBody.jobs.length).toBe(2);
  });

  it("PATCH /schedule-prompts/:jobId toggles enabled state", async () => {
    const createRes = await app.request("/schedule-prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cwd: tempDir,
        name: "toggle-me",
        schedule: "0 0 * * * *",
        target: "command",
        command: "echo toggle",
      }),
    });
    const { job } = (await createRes.json()) as { job: CronJob };

    const patchRes = await app.request(`/schedule-prompts/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cwd: tempDir,
        updates: { enabled: false },
      }),
    });
    expect(patchRes.status).toBe(200);
    const patchBody = (await patchRes.json()) as { ok: boolean; job: CronJob };
    expect(patchBody.ok).toBe(true);
    expect(patchBody.job.enabled).toBe(false);
  });

  it("DELETE /schedule-prompts/:jobId removes the job", async () => {
    const createRes = await app.request("/schedule-prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cwd: tempDir,
        name: "delete-me",
        schedule: "0 0 * * * *",
        target: "command",
        command: "echo delete",
      }),
    });
    const { job } = (await createRes.json()) as { job: CronJob };

    const deleteRes = await app.request(`/schedule-prompts/${job.id}?cwd=${encodeURIComponent(tempDir)}`, {
      method: "DELETE",
    });
    expect(deleteRes.status).toBe(200);
    const deleteBody = (await deleteRes.json()) as { ok: boolean; removed: boolean };
    expect(deleteBody.ok).toBe(true);
    expect(deleteBody.removed).toBe(true);

    const listRes = await app.request(`/schedule-prompts?cwd=${encodeURIComponent(tempDir)}`);
    const listBody = (await listRes.json()) as { ok: boolean; jobs: CronJob[] };
    expect(listBody.jobs.length).toBe(0);
  });

  it("POST /schedule-prompts/:jobId/run executes command immediately", async () => {
    const createRes = await app.request("/schedule-prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cwd: tempDir,
        name: "run-me",
        schedule: "0 0 * * * *",
        target: "command",
        command: "echo executed",
      }),
    });
    const { job } = (await createRes.json()) as { job: CronJob };

    const runRes = await app.request(`/schedule-prompts/${job.id}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cwd: tempDir }),
    });
    expect(runRes.status).toBe(200);
    const runBody = (await runRes.json()) as { ok: boolean; ran: boolean };
    expect(runBody.ok).toBe(true);
  });
});
