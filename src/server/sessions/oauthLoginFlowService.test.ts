import type { AuthStorage } from "@oh-my-pi/pi-coding-agent";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OAuthLoginFlowService } from "./oauthLoginFlowService.js";

// Minimal callback shape matching the omp AuthStorage.login() inline interface.
interface OAuthLoginCallbacks {
 signal?: AbortSignal;
 onAuth: (info: { url?: string; instructions?: string }) => void;
 onPrompt: (prompt: { message: string; placeholder?: string }) => Promise<string>;
}

type LoginHandler = (providerId: string, callbacks: OAuthLoginCallbacks) => Promise<void>;

afterEach(() => {
 vi.useRealTimers();
});

describe("OAuthLoginFlowService", () => {
 it("round-trips prompt responses and completes the flow", async () => {
  let promptValue: string | undefined;
  const service = new OAuthLoginFlowService();
  const state = service.start({
   providerId: "test-provider",
   providerName: "Test Provider",
   authStorage: fakeAuthStorage(async (_providerId, callbacks) => {
    callbacks.onAuth({ url: "https://example.test/auth", instructions: "Open it" });
    promptValue = await callbacks.onPrompt({ message: "Paste code", placeholder: "code" });
   }),
  });

  const prompt = state.prompt;
  if (prompt === undefined) throw new Error("Expected prompt");
  expect(state).toMatchObject({ auth: { url: "https://example.test/auth" } });
  expect(prompt).toMatchObject({ message: "Paste code", placeholder: "code", kind: "prompt" });

  const afterRespond = service.respond(state.flowId, prompt.requestId, "abc123");
  expect(afterRespond.prompt).toBeUndefined();
  await flushAsyncLogin();

  expect(promptValue).toBe("abc123");
  expect(service.get(state.flowId)).toMatchObject({ status: "complete" });
  service.dispose();
 });

 it("rejects pending prompts when cancelled", async () => {
  const service = new OAuthLoginFlowService();
  let promptError: Error | undefined;
  service.start({
   providerId: "test-provider",
   providerName: "Test Provider",
   authStorage: fakeAuthStorage(async (_providerId, callbacks) => {
    try {
     await callbacks.onPrompt({ message: "Paste code" });
    } catch (error: unknown) {
     promptError = toError(error);
    }
   }),
  });

  service.cancel("non-existent");
  await flushAsyncLogin();
  expect(promptError).toBeUndefined();

  const state = service.start({
   providerId: "test-provider",
   providerName: "Test Provider",
   authStorage: fakeAuthStorage(async (_providerId, callbacks) => {
    try {
     await callbacks.onPrompt({ message: "Paste code" });
    } catch (error: unknown) {
     promptError = toError(error);
    }
   }),
  });

  service.cancel(state.flowId);
  await flushAsyncLogin();
  expect(promptError).not.toBeUndefined();
  service.dispose();
 });

 it("rejects stale or duplicate responses", () => {
  const service = new OAuthLoginFlowService();
  const state = service.start({
   providerId: "test-provider",
   providerName: "Test Provider",
   authStorage: fakeAuthStorage(async () => {
    // never resolve, keep the flow pending
    await new Promise(() => undefined);
   }),
  });
  expect(state.status).toBe("running");
  expect(service.respond("non-existent", "req", "val").status).toBe("cancelled");
  expect(service.respond(state.flowId, "wrong-request-id", "val").select).toBeUndefined();
  expect(service.respond(state.flowId, "req", "val").status).toBe("running");
  expect(service.get("non-existent").status).toBe("cancelled");
  service.dispose();
 });

 it("expires abandoned running flows and evicts terminal flows", async () => {
  vi.useFakeTimers();
  const service = new OAuthLoginFlowService({ runningTtlMs: 10_000, terminalTtlMs: 5_000 });
  const state = service.start({
   providerId: "test-provider",
   providerName: "Test Provider",
   authStorage: fakeAuthStorage(async () => {
    await new Promise(() => undefined); // never resolve
   }),
  });
  expect(service.get(state.flowId).status).toBe("running");

  vi.advanceTimersByTime(10_000);
  expect(service.get(state.flowId).status).toBe("error");

  vi.advanceTimersByTime(10_000);
  expect(service.get(state.flowId).status).toBe("cancelled"); // evicted
  service.dispose();
 });
});

function fakeAuthStorage(login: LoginHandler): Pick<AuthStorage, "login"> {
 return {
  login(providerId: string, ctrl: { signal?: AbortSignal; onAuth: (info: { url?: string; instructions?: string }) => void; onPrompt: (prompt: { message: string; placeholder?: string }) => Promise<string> }): Promise<void> {
   return login(providerId, ctrl);
  },
 };
}

async function flushAsyncLogin(): Promise<void> {
 await Promise.resolve();
 await Promise.resolve();
 await Promise.resolve();
 await Promise.resolve();
 await Promise.resolve();
 await Promise.resolve();
}

function toError(error: unknown): Error {
 return error instanceof Error ? error : new Error(String(error));
}
