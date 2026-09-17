import { spawn } from "node:child_process";
import type { Hono } from "hono";
import { discoverAuthStorage, ModelRegistry } from "@oh-my-pi/pi-coding-agent";

export interface UsageWindow {
  id: string;
  label?: string | undefined;
  durationMs?: number | undefined;
  resetsAt?: number | undefined;
}

export interface UsageAmount {
  unit?: string | undefined;
  remainingFraction?: number | undefined;
  usedFraction?: number | undefined;
  remaining?: number | undefined;
  used?: number | undefined;
  limit?: number | undefined;
}

export interface UsageLimitScope {
  provider?: string | undefined;
  projectId?: string | undefined;
  windowId?: string | undefined;
  shared?: boolean | undefined;
  tier?: string | undefined;
  accountId?: string | undefined;
}

export interface UsageLimit {
  id: string;
  label: string;
  scope?: UsageLimitScope | undefined;
  window?: UsageWindow | undefined;
  amount?: UsageAmount | undefined;
  status?: "ok" | "warning" | "exhausted" | "unknown" | undefined;
}

export interface UsageReportMetadata {
  endpoint?: string | undefined;
  projectId?: string | undefined;
  email?: string | undefined;
  accountId?: string | undefined;
  planType?: string | undefined;
  allowed?: boolean | undefined;
  limitReached?: boolean | undefined;
  orgId?: string | undefined;
  orgName?: string | undefined;
  meterStates?: Record<string, { allowed?: boolean | undefined; limitReached?: boolean | undefined }> | undefined;
}

export interface UsageResetCredits {
  availableCount?: number | undefined;
  credits?: {
    amount?: number | undefined;
    expiresAt?: string | undefined;
  }[] | undefined;
}

export interface UsageReport {
  provider: string;
  fetchedAt?: number | undefined;
  limits: UsageLimit[];
  metadata?: UsageReportMetadata | undefined;
  resetCredits?: UsageResetCredits | undefined;
  notes?: string[] | undefined;
}

export interface UsageAccountIdentity {
  provider: string;
  type?: "api_key" | "oauth" | undefined;
  email?: string | undefined;
  accountId?: string | undefined;
  projectId?: string | undefined;
  orgId?: string | undefined;
  orgName?: string | undefined;
  enterpriseUrl?: string | undefined;
}

export interface DisabledCredentialSummary {
  provider: string;
  email?: string | undefined;
  accountId?: string | undefined;
  orgId?: string | undefined;
  orgName?: string | undefined;
  reason?: string | undefined;
}

export interface ProviderWindowStat {
  window: string;
  durationMs?: number | undefined;
  meter?: string | undefined;
  accounts: number;
  usedAccounts: number;
  remainingAccounts: number;
}

export interface UsageResponse {
  generatedAt: number;
  reports: UsageReport[];
  accountsWithoutUsage?: UsageAccountIdentity[] | undefined;
  disabledCredentials?: DisabledCredentialSummary[] | undefined;
  capacity?: Record<string, ProviderWindowStat[]> | undefined;
  error?: string | undefined;
}

export interface UsageFetchOptions {
  refresh?: boolean | undefined;
  provider?: string | undefined;
}

export interface UsageService {
  getUsage(options?: UsageFetchOptions): Promise<UsageResponse>;
  invalidate(provider?: string): Promise<void>;
}

const CACHE_TTL_MS = 30_000;

class DefaultUsageService implements UsageService {
  private cache: { data: UsageResponse; timestamp: number } | null = null;
  private inFlightPromise: Promise<UsageResponse> | null = null;

  async getUsage(options: UsageFetchOptions = {}): Promise<UsageResponse> {
    const { refresh = false, provider } = options;
    const now = Date.now();

    if (refresh) {
      await this.invalidate(provider);
    }

    if (!refresh && this.cache && now - this.cache.timestamp < CACHE_TTL_MS) {
      return this.filterResponse(this.cache.data, provider);
    }

    if (this.inFlightPromise) {
      const data = await this.inFlightPromise;
      return this.filterResponse(data, provider);
    }

    this.inFlightPromise = this.fetchUsageData()
      .then((data) => {
        this.cache = { data, timestamp: Date.now() };
        return data;
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        if (this.cache) {
          return { ...this.cache.data, error: `Refreshed failed (${message}), showing cached data.` };
        }
        return {
          generatedAt: Date.now(),
          reports: [],
          accountsWithoutUsage: [],
          disabledCredentials: [],
          capacity: {},
          error: message,
        };
      })
      .finally(() => {
        this.inFlightPromise = null;
      });

    const result = await this.inFlightPromise;
    return this.filterResponse(result, provider);
  }

  async invalidate(provider?: string): Promise<void> {
    this.cache = null;
    try {
      const args = ["usage", "invalidate"];
      if (provider) {
        args.push("--provider", provider);
      }
      await this.execOmpCli(args);
    } catch {
      // Best-effort invalidation
    }
  }

  private filterResponse(data: UsageResponse, provider?: string): UsageResponse {
    if (!provider) return data;
    const wanted = provider.toLowerCase();
    return {
      ...data,
      reports: data.reports.filter((r) => r.provider.toLowerCase() === wanted),
      accountsWithoutUsage: data.accountsWithoutUsage ? data.accountsWithoutUsage.filter((a) => a.provider.toLowerCase() === wanted) : undefined,
      disabledCredentials: data.disabledCredentials ? data.disabledCredentials.filter((d) => d.provider.toLowerCase() === wanted) : undefined,
      capacity: data.capacity && data.capacity[wanted] ? { [wanted]: data.capacity[wanted] } : {},
    };
  }

  private async fetchUsageData(): Promise<UsageResponse> {
    try {
      const stdout = await this.execOmpCli(["usage", "--json"]);
      const parsed: unknown = JSON.parse(stdout);
      if (parsed !== null && typeof parsed === "object" && "reports" in parsed && Array.isArray(parsed.reports)) {
        // Validated at boundary
        return parsed as unknown as UsageResponse;
      }
      throw new Error("Invalid usage response format from CLI");
    } catch (cliError: unknown) {
      // Fall back to in-process fetch if CLI fails
      try {
        return await this.fetchInProcess();
      } catch {
        const message = cliError instanceof Error ? cliError.message : String(cliError);
        throw new Error(`Failed to load usage data: ${message}`);
      }
    }
  }

  private async fetchInProcess(): Promise<UsageResponse> {
    const authStorage = await discoverAuthStorage();
    try {
      const modelRegistry = new ModelRegistry(authStorage);
      const rawReports = await authStorage.fetchUsageReports({
        baseUrlResolver: (p) => modelRegistry.getProviderBaseUrl(p),
      });

      const reports: UsageReport[] = (rawReports ?? []).map((r) => ({
        provider: r.provider,
        fetchedAt: r.fetchedAt,
        limits: (r.limits ?? []).map((l) => ({
          id: l.id,
          label: l.label,
          scope: l.scope ? {
            provider: l.scope.provider,
            projectId: l.scope.projectId,
            windowId: l.scope.windowId,
            shared: l.scope.shared,
            tier: l.scope.tier,
            accountId: l.scope.accountId,
          } : undefined,
          window: l.window ? {
            id: l.window.id,
            label: l.window.label,
            durationMs: l.window.durationMs,
            resetsAt: l.window.resetsAt,
          } : undefined,
          amount: l.amount ? {
            unit: l.amount.unit,
            remainingFraction: l.amount.remainingFraction,
            usedFraction: l.amount.usedFraction,
            remaining: l.amount.remaining,
            used: l.amount.used,
            limit: l.amount.limit,
          } : undefined,
          status: l.status,
        })),
        metadata: r.metadata as UsageReportMetadata | undefined,
        resetCredits: r.resetCredits as UsageResetCredits | undefined,
        notes: r.notes,
      }));

      return {
        generatedAt: Date.now(),
        reports,
        accountsWithoutUsage: [],
        disabledCredentials: [],
        capacity: {},
      };
    } finally {
      authStorage.close();
    }
  }

  private execOmpCli(args: string[]): Promise<string> {
    const { promise, resolve, reject } = Promise.withResolvers<string>();
    const child = spawn("omp", args, {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`omp ${args.join(" ")} exited with code ${code}: ${stderr.trim()}`));
      }
    });

    child.on("error", (err) => {
      reject(err);
    });

    return promise;
  }
}

export const defaultUsageService: UsageService = new DefaultUsageService();

export function registerUsageRoutes(
  app: Hono,
  prefix = "/api",
  usageService: UsageService = defaultUsageService,
): void {
  app.get(`${prefix}/usage`, async (c) => {
    try {
      const refresh = c.req.query("refresh") === "true";
      const provider = c.req.query("provider");
      const data = await usageService.getUsage({ refresh, provider });
      return c.json(data);
    } catch (err) {
      return c.json(
        {
          generatedAt: Date.now(),
          reports: [],
          error: err instanceof Error ? err.message : String(err),
        },
        500,
      );
    }
  });

  app.post(`${prefix}/usage/invalidate`, async (c) => {
    try {
      const provider = c.req.query("provider");
      await usageService.invalidate(provider);
      return c.json({ ok: true, invalidatedAt: Date.now() });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
    }
  });
}
