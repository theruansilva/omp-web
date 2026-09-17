import { describe, expect, it } from "bun:test";
import {
  aggregateProviderStatus,
  countActiveProviders,
  countWarningOrExhausted,
  formatCapacityWindow,
  formatProviderName,
  formatRelativeDuration,
  formatTimeAgo,
  getLimitProgress,
} from "./usageLogic.js";
import type { UsageLimit, UsageReport, UsageResponse } from "./types.js";

describe("usageLogic", () => {
  describe("formatProviderName", () => {
    it("formats known provider names", () => {
      expect(formatProviderName("google-antigravity")).toBe("Google Antigravity");
      expect(formatProviderName("openai-codex")).toBe("OpenAI Codex");
      expect(formatProviderName("ollama-cloud")).toBe("Ollama Cloud");
      expect(formatProviderName("anthropic")).toBe("Anthropic");
      expect(formatProviderName("gemini")).toBe("Google Gemini");
    });

    it("formats unknown hyphenated providers using Title Case", () => {
      expect(formatProviderName("custom-provider-test")).toBe("Custom Provider Test");
    });
  });

  describe("formatRelativeDuration", () => {
    it("formats milliseconds into readable string", () => {
      expect(formatRelativeDuration(0)).toBe("0s");
      expect(formatRelativeDuration(30_000)).toBe("30s");
      expect(formatRelativeDuration(65_000)).toBe("1m5s");
      expect(formatRelativeDuration(3_600_000)).toBe("1h");
      expect(formatRelativeDuration(3_660_000)).toBe("1h1m");
      expect(formatRelativeDuration(86_400_000)).toBe("1d");
      expect(formatRelativeDuration(90_000_000)).toBe("1d1h");
      expect(formatRelativeDuration(604_800_000)).toBe("7d");
    });
  });

  describe("formatTimeAgo", () => {
    const base = 1_000_000_000;
    it("formats seconds, minutes, hours, days ago", () => {
      expect(formatTimeAgo(base, base + 2_000)).toBe("just now");
      expect(formatTimeAgo(base, base + 15_000)).toBe("15s ago");
      expect(formatTimeAgo(base, base + 120_000)).toBe("2m ago");
      expect(formatTimeAgo(base, base + 7_200_000)).toBe("2h ago");
      expect(formatTimeAgo(base, base + 172_800_000)).toBe("2d ago");
    });
  });

  describe("getLimitProgress", () => {
    it("calculates progress from usedFraction", () => {
      const now = 1_000_000;
      const limit: UsageLimit = {
        id: "l1",
        label: "Gemini",
        amount: {
          usedFraction: 0.25,
          remainingFraction: 0.75,
        },
        window: {
          id: "5h",
          resetsAt: now + 60_000,
        },
      };

      const progress = getLimitProgress(limit, now);
      expect(progress.usedFraction).toBe(0.25);
      expect(progress.percentUsed).toBe(25);
      expect(progress.percentRemaining).toBe(75);
      expect(progress.status).toBe("ok");
      expect(progress.statusColor).toBe("#22c55e");
      expect(progress.resetsInText).toBe("resets in 1m");
    });

    it("marks warning when used >= 80%", () => {
      const limit: UsageLimit = {
        id: "l2",
        label: "Claude",
        amount: {
          usedFraction: 0.85,
        },
      };

      const progress = getLimitProgress(limit);
      expect(progress.status).toBe("warning");
      expect(progress.statusColor).toBe("#eab308");
    });

    it("marks exhausted when used >= 99.9% or explicit exhausted status", () => {
      const limit: UsageLimit = {
        id: "l3",
        label: "GPT",
        amount: {
          usedFraction: 1,
        },
      };

      const progress = getLimitProgress(limit);
      expect(progress.status).toBe("exhausted");
      expect(progress.statusColor).toBe("#ef4444");
    });
  });

  describe("countActiveProviders & countWarningOrExhausted", () => {
    const sampleData: UsageResponse = {
      generatedAt: Date.now(),
      reports: [
        {
          provider: "google-antigravity",
          limits: [
            { id: "1", label: "A", amount: { usedFraction: 0.1 } },
            { id: "2", label: "B", amount: { usedFraction: 0.9 } }, // warning
          ],
        },
        {
          provider: "openai-codex",
          limits: [
            { id: "3", label: "C", amount: { usedFraction: 1 } }, // exhausted
          ],
        },
      ],
    };

    it("counts active providers", () => {
      expect(countActiveProviders(sampleData)).toBe(2);
    });

    it("counts warning and exhausted limits", () => {
      const counts = countWarningOrExhausted(sampleData);
      expect(counts.warnings).toBe(1);
      expect(counts.exhausted).toBe(1);
    });
  });

  describe("aggregateProviderStatus", () => {
    it("returns exhausted if any limit is exhausted", () => {
      const report: UsageReport = {
        provider: "p1",
        limits: [
          { id: "1", label: "ok", amount: { usedFraction: 0.1 } },
          { id: "2", label: "ex", amount: { usedFraction: 1 } },
        ],
      };
      expect(aggregateProviderStatus(report)).toBe("exhausted");
    });

    it("returns warning if limits has warning and none exhausted", () => {
      const report: UsageReport = {
        provider: "p1",
        limits: [
          { id: "1", label: "ok", amount: { usedFraction: 0.1 } },
          { id: "2", label: "warn", amount: { usedFraction: 0.85 } },
        ],
      };
      expect(aggregateProviderStatus(report)).toBe("warning");
    });

    it("returns unknown for report without limits", () => {
      const report: UsageReport = {
        provider: "p1",
        limits: [],
      };
      expect(aggregateProviderStatus(report)).toBe("unknown");
    });
  });

  describe("formatCapacityWindow", () => {
    it("formats capacity window stats", () => {
      const str = formatCapacityWindow({
        window: "5h",
        accounts: 1,
        usedAccounts: 0.01,
        remainingAccounts: 0.99,
      });
      expect(str).toContain("0.01/1 used");
      expect(str).toContain("0.99× quota left");
    });
  });
});
