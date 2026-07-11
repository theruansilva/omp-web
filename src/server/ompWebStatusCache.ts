import type { OmpWebStatusResponse } from "../shared/apiTypes.js";

const DEFAULT_OMP_WEB_STATUS_CACHE_TTL_MS = 60_000;

export interface OmpWebStatusCacheOptions {
  ttlMs?: number;
  now?: () => number;
  onError?: (error: unknown) => void;
}

export interface OmpWebStatusCache {
  get(): Promise<OmpWebStatusResponse>;
  refresh(): Promise<OmpWebStatusResponse>;
}

export function createOmpWebStatusCache(load: () => Promise<OmpWebStatusResponse>, options: OmpWebStatusCacheOptions = {}): OmpWebStatusCache {
  const ttlMs = options.ttlMs ?? DEFAULT_OMP_WEB_STATUS_CACHE_TTL_MS;
  const now = options.now ?? Date.now;
  let cached: { status: OmpWebStatusResponse; expiresAt: number } | undefined;
  let pending: Promise<OmpWebStatusResponse> | undefined;

  const refresh = (): Promise<OmpWebStatusResponse> => {
    pending ??= Promise.resolve()
      .then(load)
      .then((status) => {
        cached = { status, expiresAt: now() + ttlMs };
        return status;
      })
      .finally(() => {
        pending = undefined;
      });
    return pending;
  };

  return {
    async get(): Promise<OmpWebStatusResponse> {
      if (cached !== undefined) {
        if (cached.expiresAt > now()) return cached.status;
        void refresh().catch((error: unknown) => { options.onError?.(error); });
        return cached.status;
      }
      return refresh();
    },
    refresh,
  };
}
