import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { CronStorage } from "./storage.js";
import type { CronJob } from "./types.js";

function makeJob(overrides: Partial<CronJob> & { id: string }): CronJob {
  return {
    name: "default",
    schedule: "0 * * * * *",
    prompt: "default",
    enabled: true,
    type: "cron",
    createdAt: new Date().toISOString(),
    runCount: 0,
    scope: "session" as const,
    ...overrides,
  };
}

function expectJob(storage: CronStorage, id: string): CronJob {
  const job = storage.getJob(id);
  if (job == null) throw new Error(`Expected job ${id} to exist`);
  return job;
}

describe("CronStorage", () => {
  let tempDir: string;
  let storage: CronStorage;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "schedule-prompt-test-"));
    storage = new CronStorage(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("data file path", () => {
    it("uses .omp-web/schedule-prompts.json relative to dataDir", () => {
      const filePath = join(tempDir, ".omp-web", "schedule-prompts.json");
      expect(existsSync(filePath)).toBe(false);
      storage.addJob(makeJob({ id: "test1" }));
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe("addJob and getAllJobs", () => {
    it("returns empty array when no jobs exist", () => {
      expect(storage.getAllJobs()).toEqual([]);
    });

    it("stores and retrieves a single job", () => {
      storage.addJob(
        makeJob({
          id: "job1",
          name: "test-job",
          schedule: "0 0 0 * * *",
          prompt: "say hello",
          scope: "workspace",
        }),
      );
      const jobs = storage.getAllJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0]?.id).toBe("job1");
      expect(jobs[0]?.name).toBe("test-job");
      expect(jobs[0]?.scope).toBe("workspace");
    });

    it("stores and retrieves multiple jobs", () => {
      storage.addJob(makeJob({ id: "a", name: "job-a" }));
      storage.addJob(makeJob({ id: "b", name: "job-b" }));

      expect(storage.getAllJobs()).toHaveLength(2);
    });
  });

  describe("getJob", () => {
    it("returns undefined for non-existent job", () => {
      expect(storage.getJob("nonexistent")).toBeUndefined();
    });

    it("returns the job when it exists", () => {
      storage.addJob(makeJob({ id: "findme", name: "find" }));
      const job = expectJob(storage, "findme");
      expect(job.name).toBe("find");
    });
  });

  describe("updateJob", () => {
    it("updates specified fields", () => {
      storage.addJob(makeJob({ id: "upd", name: "original", prompt: "original" }));

      storage.updateJob("upd", { name: "updated", prompt: "changed" });
      const job = expectJob(storage, "upd");
      expect(job.name).toBe("updated");
      expect(job.prompt).toBe("changed");
    });

    it("leaves other fields intact after partial update", () => {
      storage.addJob(makeJob({ id: "upd2", name: "original", prompt: "x" }));

      storage.updateJob("upd2", { name: "only-name-changed" });
      const job = expectJob(storage, "upd2");
      expect(job.name).toBe("only-name-changed");
      expect(job.schedule).toBe("0 * * * * *");
      expect(job.prompt).toBe("x");
    });

    it("returns true when job exists", () => {
      storage.addJob(makeJob({ id: "exist", name: "e" }));
      expect(storage.updateJob("exist", { name: "new" })).toBe(true);
    });

    it("returns false when job does not exist", () => {
      expect(storage.updateJob("doesnotexist", { name: "new" })).toBe(false);
    });

    it("handles setting a field to undefined by deleting it", () => {
      storage.addJob(makeJob({ id: "cleared", name: "to-clear", description: "desc", runCount: 5 }));

      storage.updateJob("cleared", { description: undefined });
      const job = expectJob(storage, "cleared");
      expect(job.description).toBeUndefined();
    });
  });

  describe("removeJob", () => {
    it("removes an existing job", () => {
      storage.addJob(makeJob({ id: "rem", name: "remove-me" }));
      expect(storage.removeJob("rem")).toBe(true);
      expect(storage.getJob("rem")).toBeUndefined();
    });

    it("returns false when job does not exist", () => {
      expect(storage.removeJob("doesnotexist")).toBe(false);
    });
  });

  describe("hasJobWithName", () => {
    it("returns true when a job with the name exists", () => {
      storage.addJob(makeJob({ id: "n1", name: "my-job" }));
      expect(storage.hasJobWithName("my-job")).toBe(true);
    });

    it("returns false when no job has the name", () => {
      expect(storage.hasJobWithName("ghost")).toBe(false);
    });
  });

  describe("file persistence", () => {
    it("survives storage instance re-creation", () => {
      storage.addJob(makeJob({ id: "persist", name: "persistent" }));

      const storage2 = new CronStorage(tempDir);
      const job = expectJob(storage2, "persist");
      expect(job.name).toBe("persistent");
    });

    it("recovers from corrupt JSON by resetting", () => {
      const filePath = join(tempDir, ".omp-web", "schedule-prompts.json");
      mkdirSync(join(tempDir, ".omp-web"), { recursive: true });
      writeFileSync(filePath, "this is not json");

      const crashStorage = new CronStorage(tempDir);
      expect(crashStorage.getAllJobs()).toEqual([]);
    });
  });
});
