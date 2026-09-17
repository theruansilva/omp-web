import type {
  LimitProgress,
  ProviderWindowStat,
  UsageLimit,
  UsageReport,
  UsageResponse,
} from "./types.js";

const KNOWN_PROVIDER_NAMES: Record<string, string> = {
  "google-antigravity": "Google Antigravity",
  "openai-codex": "OpenAI Codex",
  "ollama-cloud": "Ollama Cloud",
  "google-gemini-cli": "Google Gemini CLI",
  "github-copilot": "GitHub Copilot",
  "minimax-code": "MiniMax Code",
  "opencode-go": "OpenCode Go",
  "cline-pass": "Cline Pass",
  "charm-hyper": "Charm Hyper",
  "xai-oauth": "xAI",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
  openai: "OpenAI",
  ollama: "Ollama",
  kimi: "Kimi",
  zai: "Zhipu AI",
  devin: "Devin",
};

export function formatProviderName(provider: string): string {
  const lower = provider.toLowerCase();
  if (lower in KNOWN_PROVIDER_NAMES) {
    return KNOWN_PROVIDER_NAMES[lower]!;
  }
  return provider
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatRelativeDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0s";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remHours = hours % 24;
    return remHours > 0 ? `${days}d${remHours}h` : `${days}d`;
  }
  if (hours > 0) {
    const remMinutes = minutes % 60;
    return remMinutes > 0 ? `${hours}h${remMinutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    const remSeconds = seconds % 60;
    return remSeconds > 0 ? `${minutes}m${remSeconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

export function formatTimeAgo(timestampMs: number, nowMs = Date.now()): string {
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) return "unknown";
  const delta = Math.max(0, nowMs - timestampMs);
  if (delta < 5000) return "just now";
  const seconds = Math.floor(delta / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function getLimitProgress(limit: UsageLimit, nowMs = Date.now()): LimitProgress {
  const amount = limit.amount;
  let usedFraction = 0;
  let remainingFraction = 1;

  if (amount !== undefined) {
    if (amount.usedFraction !== undefined) {
      usedFraction = Math.max(0, amount.usedFraction);
      remainingFraction = amount.remainingFraction ?? Math.max(0, 1 - usedFraction);
    } else if (amount.used !== undefined && amount.limit !== undefined && amount.limit > 0) {
      usedFraction = Math.max(0, amount.used / amount.limit);
      remainingFraction = Math.max(0, 1 - usedFraction);
    } else if (amount.remainingFraction !== undefined) {
      remainingFraction = Math.max(0, Math.min(1, amount.remainingFraction));
      usedFraction = Math.max(0, 1 - remainingFraction);
    }
  }

  const percentUsed = Math.min(100, Math.round(usedFraction * 1000) / 10);
  const percentRemaining = Math.max(0, Math.round(remainingFraction * 1000) / 10);

  let status: "ok" | "warning" | "exhausted" = "ok";
  if (limit.status === "exhausted" || usedFraction >= 0.999) {
    status = "exhausted";
  } else if (limit.status === "warning" || usedFraction >= 0.8) {
    status = "warning";
  }

  let statusColor = "#22c55e"; // Green
  if (status === "exhausted") {
    statusColor = "#ef4444"; // Red
  } else if (status === "warning") {
    statusColor = "#eab308"; // Amber
  }

  let resetsInText: string | undefined;
  if (limit.window?.resetsAt !== undefined && limit.window.resetsAt > nowMs) {
    resetsInText = `resets in ${formatRelativeDuration(limit.window.resetsAt - nowMs)}`;
  }

  return {
    usedFraction,
    remainingFraction,
    percentUsed,
    percentRemaining,
    status,
    statusColor,
    resetsInText,
  };
}

export function countActiveProviders(data: UsageResponse): number {
  const set = new Set<string>();
  for (const report of data.reports) {
    if (report.provider) set.add(report.provider.toLowerCase());
  }
  return set.size;
}

export function countWarningOrExhausted(data: UsageResponse): { warnings: number; exhausted: number } {
  let warnings = 0;
  let exhausted = 0;

  for (const report of data.reports) {
    for (const limit of report.limits) {
      const progress = getLimitProgress(limit);
      if (progress.status === "exhausted") {
        exhausted++;
      } else if (progress.status === "warning") {
        warnings++;
      }
    }
  }

  return { warnings, exhausted };
}

export function aggregateProviderStatus(report: UsageReport): "ok" | "warning" | "exhausted" | "unknown" {
  if (report.limits.length === 0) return "unknown";
  let hasWarning = false;
  for (const limit of report.limits) {
    const progress = getLimitProgress(limit);
    if (progress.status === "exhausted") return "exhausted";
    if (progress.status === "warning") hasWarning = true;
  }
  return hasWarning ? "warning" : "ok";
}

export function formatCapacityWindow(stat: ProviderWindowStat): string {
  const accountsTotal = stat.accounts;
  const used = stat.usedAccounts;
  const left = stat.remainingAccounts;
  const usedFormatted = Number(used.toFixed(2));
  const leftFormatted = Number(left.toFixed(2));

  return `${usedFormatted}/${accountsTotal} used (${leftFormatted}× quota left)`;
}
