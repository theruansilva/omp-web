import { describe, it, expect } from "vitest";
import { CronScheduler, humanizeCron, formatISOShort } from "./scheduler.js";
import type { CronJob } from "./types.js";


function makePartialJob(partial: Partial<CronJob>): CronJob {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- test helper for partial job stubs
  return partial as unknown as CronJob;
}
describe("CronScheduler", () => {
  describe("validateSchedule", () => {
    it("accepts valid 6-field cron expressions", () => {
      const result = CronScheduler.validateSchedule("cron", "0 * * * * *");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.schedule).toBe("0 * * * * *");
      }
    });

    it("accepts relative time syntax for once type", () => {
      const result = CronScheduler.validateSchedule("once", "+5m");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.schedule).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        const parsed = new Date(result.schedule).getTime();
        const now = Date.now();
        expect(parsed - now).toBeGreaterThan(4 * 60 * 1000);
        expect(parsed - now).toBeLessThan(6 * 60 * 1000);
      }
    });

    it("accepts interval strings and returns intervalMs", () => {
      const result = CronScheduler.validateSchedule("interval", "10m");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.schedule).toBe("10m");
        expect(result.intervalMs).toBe(600000);
      }
    });

    it("rejects 5-field cron expressions (missing seconds)", () => {
      const result = CronScheduler.validateSchedule("cron", "* * * * *");
      expect(result.ok).toBe(false);
    });

    it("rejects invalid interval format", () => {
      const result = CronScheduler.validateSchedule("interval", "abc");
      expect(result.ok).toBe(false);
    });

    it("rejects invalid timestamp for once type", () => {
      const result = CronScheduler.validateSchedule("once", "not-a-date");
      expect(result.ok).toBe(false);
    });

    it("rejects past timestamps for once type", () => {
      const result = CronScheduler.validateSchedule("once", "2020-01-01T00:00:00.000Z");
      expect(result.ok).toBe(false);
    });
  });

  describe("isLoadedFor", () => {
    it("returns true for workspace-scoped jobs regardless of sessionId", () => {
      expect(CronScheduler.isLoadedFor(makePartialJob({ scope: "workspace" }), "any-id")).toBe(true);
    });

    it("returns true for session-scoped jobs matching the given sessionId", () => {
      expect(CronScheduler.isLoadedFor(makePartialJob({ scope: "session", sessionId: "abc" }), "abc")).toBe(true);
    });

    it("returns false for session-scoped jobs with different sessionId", () => {
      expect(CronScheduler.isLoadedFor(makePartialJob({ scope: "session", sessionId: "abc" }), "xyz")).toBe(false);
    });
  });

  describe("parseRelativeTime", () => {
    it("parses +10s to future ISO timestamp", () => {
      const result = CronScheduler.parseRelativeTime("+10s");
      expect(result).not.toBeNull();
      if (result != null) {
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        const diff = new Date(result).getTime() - Date.now();
        expect(diff).toBeGreaterThan(5 * 1000);
        expect(diff).toBeLessThan(15 * 1000);
      }
    });

    it("returns null for invalid format", () => {
      expect(CronScheduler.parseRelativeTime("abc")).toBeNull();
      expect(CronScheduler.parseRelativeTime("10s")).toBeNull();
      expect(CronScheduler.parseRelativeTime("+10x")).toBeNull();
    });
  });

  describe("parseInterval", () => {
    it("parses '5m' to 300000 ms", () => {
      expect(CronScheduler.parseInterval("5m")).toBe(300000);
    });

    it("parses '1h' to 3600000 ms", () => {
      expect(CronScheduler.parseInterval("1h")).toBe(3600000);
    });

    it("returns null for invalid format", () => {
      expect(CronScheduler.parseInterval("abc")).toBeNull();
    });
  });

  describe("validateCronExpression", () => {
    it("validates a valid 6-field expression", () => {
      const result = CronScheduler.validateCronExpression("0 */5 * * * *");
      expect(result.valid).toBe(true);
    });

    it("rejects 5-field expression", () => {
      const result = CronScheduler.validateCronExpression("*/5 * * * *");
      expect(result.valid).toBe(false);
    });

    it("rejects invalid cron expression", () => {
      const result = CronScheduler.validateCronExpression("a b c d e f");
      expect(result.valid).toBe(false);
    });
  });

  describe("humanizeCron", () => {
    it("returns human-readable for known patterns", () => {
      expect(humanizeCron("0 * * * * *")).toBe("every minute");
      expect(humanizeCron("0 0 0 * * *")).toBe("daily");
    });

    it("falls back to raw expression for unknown patterns", () => {
      expect(humanizeCron("1 2 3 4 5 6")).toBe("1 2 3 4 5 6");
    });
  });

  describe("formatISOShort", () => {
    it("formats a date as 'Mon DD HH:mm'", () => {
      const date = new Date("2026-07-10T15:30:00");
      const formatted = formatISOShort(date);
      expect(formatted).toMatch(/^\w{3} \d{1,2} \d{2}:\d{2}$/);
      expect(formatted).toContain("Jul");
      expect(formatted).toContain("10");
    });

    it("returns the input unchanged for invalid dates", () => {
      expect(formatISOShort("not-a-date")).toBe("not-a-date");
    });
  });
});
