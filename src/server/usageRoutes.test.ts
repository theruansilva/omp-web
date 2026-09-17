import { beforeEach, describe, expect, it } from "bun:test";
import { Hono } from "hono";
import {
  registerUsageRoutes,
  type UsageFetchOptions,
  type UsageResponse,
  type UsageService,
} from "./usageRoutes.js";

class MockUsageService implements UsageService {
  public invalidateCalled = false;
  public invalidatedProvider: string | undefined;
  public mockResponse: UsageResponse = {
    generatedAt: 1789649870000,
    reports: [
      {
        provider: "google-antigravity",
        fetchedAt: 1789649868000,
        limits: [
          {
            id: "google-antigravity:anthropic:default:3p-weekly",
            label: "Claude & GPT (shared)",
            window: {
              id: "weekly",
              label: "Weekly",
              durationMs: 604800000,
              resetsAt: 1790167801000,
            },
            amount: {
              unit: "percent",
              remainingFraction: 0.7,
              usedFraction: 0.3,
              remaining: 70,
              used: 30,
              limit: 100,
            },
            status: "ok",
          },
        ],
        metadata: {
          email: "test@example.com",
        },
      },
      {
        provider: "openai-codex",
        fetchedAt: 1789649868000,
        limits: [
          {
            id: "openai-codex:primary",
            label: "30 days",
            window: {
              id: "30d",
              label: "30 days",
              durationMs: 2592000000,
              resetsAt: 1792191678000,
            },
            amount: {
              unit: "percent",
              remainingFraction: 1,
              usedFraction: 0,
              remaining: 100,
              used: 0,
              limit: 100,
            },
            status: "ok",
          },
        ],
        resetCredits: {
          availableCount: 1,
        },
      },
    ],
    accountsWithoutUsage: [
      {
        provider: "google-gemini-cli",
        email: "test@example.com",
      },
    ],
    disabledCredentials: [],
    capacity: {
      "google-antigravity": [
        {
          window: "7d",
          durationMs: 604800000,
          accounts: 1,
          usedAccounts: 0.3,
          remainingAccounts: 0.7,
        },
      ],
    },
  };

  async getUsage(options?: UsageFetchOptions): Promise<UsageResponse> {
    if (options?.refresh) {
      this.invalidateCalled = true;
    }
    if (options?.provider) {
      const wanted = options.provider.toLowerCase();
      return {
        ...this.mockResponse,
        reports: this.mockResponse.reports.filter((r) => r.provider.toLowerCase() === wanted),
      };
    }
    return this.mockResponse;
  }

  async invalidate(provider?: string): Promise<void> {
    this.invalidateCalled = true;
    this.invalidatedProvider = provider;
  }
}

describe("usageRoutes", () => {
  let app: Hono;
  let service: MockUsageService;

  beforeEach(() => {
    app = new Hono();
    service = new MockUsageService();
    registerUsageRoutes(app, "/api", service);
    registerUsageRoutes(app, "/api/machines/local", service);
  });

  it("exposes GET /api/usage", async () => {
    const res = await app.request("/api/usage");
    expect(res.status).toBe(200);
    const data = (await res.json()) as UsageResponse;
    expect(data.reports.length).toBe(2);
    expect(data.reports[0]?.provider).toBe("google-antigravity");
    expect(data.reports[1]?.provider).toBe("openai-codex");
    expect(data.capacity?.["google-antigravity"]).toBeDefined();
    expect(data.accountsWithoutUsage?.length).toBe(1);
  });

  it("filters by provider via ?provider=...", async () => {
    const res = await app.request("/api/usage?provider=openai-codex");
    expect(res.status).toBe(200);
    const data = (await res.json()) as UsageResponse;
    expect(data.reports.length).toBe(1);
    expect(data.reports[0]?.provider).toBe("openai-codex");
  });

  it("triggers invalidation on ?refresh=true", async () => {
    const res = await app.request("/api/usage?refresh=true");
    expect(res.status).toBe(200);
    expect(service.invalidateCalled).toBe(true);
  });

  it("exposes POST /api/usage/invalidate", async () => {
    const res = await app.request("/api/usage/invalidate?provider=anthropic", {
      method: "POST",
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok: boolean; invalidatedAt: number };
    expect(data.ok).toBe(true);
    expect(service.invalidateCalled).toBe(true);
    expect(service.invalidatedProvider).toBe("anthropic");
  });

  it("exposes /api/machines/local/usage", async () => {
    const res = await app.request("/api/machines/local/usage");
    expect(res.status).toBe(200);
    const data = (await res.json()) as UsageResponse;
    expect(data.reports.length).toBe(2);
  });
});
