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

export interface LimitProgress {
  usedFraction: number;
  remainingFraction: number;
  percentUsed: number;
  percentRemaining: number;
  status: "ok" | "warning" | "exhausted";
  statusColor: string;
  resetsInText?: string | undefined;
}

export type UsagePanelState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
    kind: "loaded";
    data: UsageResponse;
    isRefreshing?: boolean | undefined;
    selectedProvider?: string | undefined;
  };
