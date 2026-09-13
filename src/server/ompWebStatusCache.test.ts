import { afterEach, describe, expect, it, vi } from "bun:test";
import type { OmpWebStatusResponse } from "../shared/apiTypes.js";
import { createOmpWebStatusCache } from "./ompWebStatusCache.js";

describe("createOmpWebStatusCache", () => {
  afterEach(() => { vi.useRealTimers(); });

  it("serves cached status while it is fresh", async () => {
    vi.useFakeTimers();
    const load = vi.fn(() => Promise.resolve(status("first")));
    const cache = createOmpWebStatusCache(load, { ttlMs: 100 });

    await expect(cache.get()).resolves.toMatchObject({ generatedAt: "first" });
    vi.advanceTimersByTime(50);
    await expect(cache.get()).resolves.toMatchObject({ generatedAt: "first" });

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("returns stale status immediately while refreshing in the background", async () => {
    vi.useFakeTimers();
    const load = vi.fn()
      .mockResolvedValueOnce(status("first"))
      .mockResolvedValueOnce(status("second"));
    const cache = createOmpWebStatusCache(load, { ttlMs: 100 });

    await expect(cache.get()).resolves.toMatchObject({ generatedAt: "first" });
    vi.advanceTimersByTime(101);

    await expect(cache.get()).resolves.toMatchObject({ generatedAt: "first" });
    await waitForMicrotasks();

    await expect(cache.get()).resolves.toMatchObject({ generatedAt: "second" });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("deduplicates concurrent cold loads", async () => {
    const deferred = createDeferred<OmpWebStatusResponse>();
    const load = vi.fn(() => deferred.promise);
    const cache = createOmpWebStatusCache(load);

    const first = cache.get();
    const second = cache.get();
    deferred.resolve(status("ready"));

    await expect(first).resolves.toMatchObject({ generatedAt: "ready" });
    await expect(second).resolves.toMatchObject({ generatedAt: "ready" });
    expect(load).toHaveBeenCalledTimes(1);
  });
});

function status(generatedAt: string): OmpWebStatusResponse {
  return {
    packageName: "@ProgmRuanSilva/omp-web",
    generatedAt,
    components: {
      web: { component: "web", label: "Web/UI", stale: false, available: true },
      sessiond: { component: "sessiond", label: "Session daemon", stale: false, available: true },
    },
    release: { packageName: "@ProgmRuanSilva/omp-web", updateAvailable: false },
    commands: {},
    messages: [],
  };
}

async function waitForMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function createDeferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}
