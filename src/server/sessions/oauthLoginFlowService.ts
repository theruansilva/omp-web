import crypto from "node:crypto";
import type { AuthStorage } from "@oh-my-pi/pi-coding-agent";

type OAuthLoginStorage = Pick<AuthStorage, "login">;

const DEFAULT_RUNNING_TTL_MS = 600_000; // 10 minutes
const DEFAULT_TERMINAL_TTL_MS = 60_000; // 1 minute

// --------------- public exports ---------------

export type OAuthFlowStatus = "running" | "complete" | "error" | "cancelled";

export interface OAuthPromptView {
 readonly requestId: string;
 readonly kind: "prompt" | "manual";
 readonly message: string;
 readonly placeholder?: string;
 readonly allowEmpty?: boolean;
}

export interface OAuthSelectView {
 readonly requestId: string;
 readonly message: string;
 readonly options: { value: string; label: string }[];
}

export interface OAuthFlowView {
 readonly status: OAuthFlowStatus;
 readonly flowId: string;
 readonly progress: string[];
 readonly prompt?: OAuthPromptView;
 readonly select?: OAuthSelectView;
 readonly auth?: { url: string; instructions?: string };
 readonly error?: string;
}

// --------------- options ---------------

interface OAuthLoginOptions {
 readonly providerId: string;
 readonly providerName: string;
 readonly authStorage: OAuthLoginStorage;
 /** @default 600_000 (10 minutes) */
 readonly runningTtlMs?: number;
 /** @default 60_000 (1 minute) */
 readonly terminalTtlMs?: number;
}

interface FlowServiceOptions {
 readonly runningTtlMs?: number;
 readonly terminalTtlMs?: number;
}

// --------------- flow state ---------------
interface FlowState {
 flowId: string;
 providerId: string;
 providerName: string;
 status: OAuthFlowStatus;
 progress: string[];
 prompt?: OAuthPromptView;
 select?: OAuthSelectView;
 auth?: { url: string; instructions?: string };
 error?: string;
 timeouts: ReturnType<typeof setTimeout>[];
 pendingResolve?: ((value: string) => void) | undefined;
 pendingReject?: ((reason?: unknown) => void) | undefined;
 resolvedLogin?: (() => void) | undefined;
 rejectedLogin?: ((reason?: unknown) => void) | undefined;
}
function makeView(state: FlowState): OAuthFlowView {
 return {
  status: state.status,
  flowId: state.flowId,
  progress: state.progress,
  ...(state.prompt !== undefined ? { prompt: state.prompt } : {}),
  ...(state.select !== undefined ? { select: state.select } : {}),
  ...(state.auth !== undefined ? { auth: state.auth } : {}),
  ...(state.error !== undefined ? { error: state.error } : {}),
 };
}

export class OAuthLoginFlowService {
 private readonly runningTtlMs: number;
 private readonly terminalTtlMs: number;
 #flows = new Map<string, FlowState>();

 constructor(options: FlowServiceOptions = {}) {
  this.runningTtlMs = options.runningTtlMs ?? DEFAULT_RUNNING_TTL_MS;
  this.terminalTtlMs = options.terminalTtlMs ?? DEFAULT_TERMINAL_TTL_MS;
 }

 start(options: OAuthLoginOptions): OAuthFlowView {
  const flowId = crypto.randomUUID();
  const requestId = crypto.randomUUID();

  const state: FlowState = {
   flowId,
   providerId: options.providerId,
   providerName: options.providerName,
   status: "running",
   progress: [`Authenticating with ${options.providerName}…`],
   prompt: { requestId, kind: "prompt", message: `Authenticating with ${options.providerName}…` },
   timeouts: [],
  };
  this.#flows.set(flowId, state);

  const runningTimeout = setTimeout(() => {
   this.#setError(flowId, "Login timed out");
  }, options.runningTtlMs ?? this.runningTtlMs);
  state.timeouts.push(runningTimeout);

  void this.#runLogin(flowId, options, state);

  return makeView(state);
 }

 respond(flowId: string, requestId: string, value: string): OAuthFlowView {
  const state = this.#flows.get(flowId);
  if (!state) return { status: "cancelled", flowId: "", progress: [] };
  if (state.pendingResolve && state.prompt?.requestId === requestId) {
   state.pendingResolve(value);
   (state as { pendingResolve: undefined }).pendingResolve = undefined;
   (state as unknown as { prompt: undefined }).prompt = undefined;
  }
  return makeView(state);
 }

 cancel(flowId: string): void {
  const state = this.#flows.get(flowId);
  if (!state) return;
  state.pendingReject?.(new Error("Login cancelled"));
  (state as { pendingResolve: undefined }).pendingResolve = undefined;
  (state as { pendingReject: undefined }).pendingReject = undefined;
  state.rejectedLogin?.(new Error("Login cancelled"));
 }

 get(flowId: string): OAuthFlowView {
  const state = this.#flows.get(flowId);
  if (!state) return { status: "cancelled", flowId: "", progress: [] };
  return makeView(state);
 }

 dispose(): void {
  this.#flows.forEach((state) => {
   state.timeouts.forEach(clearTimeout);
  });
  this.#flows.clear();
 }

 async #runLogin(flowId: string, options: OAuthLoginOptions, state: FlowState): Promise<void> {
  try {
   state.resolvedLogin = undefined;
   state.rejectedLogin = undefined;

   await new Promise<void>((resolve, reject) => {
    state.resolvedLogin = resolve;
    state.rejectedLogin = reject;

    options.authStorage.login(options.providerId, {
     signal: undefined as unknown as AbortSignal,
     onAuth: (info: { url?: string; instructions?: string }) => {
      if (info.url) {
       const auth: { url: string; instructions?: string } = { url: info.url };
       if (info.instructions !== undefined) auth.instructions = info.instructions;
       state.auth = auth;
      }
     },
     onPrompt: async (prompt: { message: string; placeholder?: string }): Promise<string> => {
      const reqId = crypto.randomUUID();
      const result = new Promise<string>((res, rej) => {
       state.pendingResolve = res;
       state.pendingReject = rej;
      });
      const promptView: { requestId: string; kind: "prompt"; message: string; placeholder?: string } = {
       requestId: reqId,
       kind: "prompt",
       message: prompt.message,
      };
      if (prompt.placeholder !== undefined) promptView.placeholder = prompt.placeholder;
      state.prompt = promptView;
      return result;
     },
    }).then(() => {
     resolve();
    }, (error: unknown) => {
     reject(error);
    });
   });

   state.status = "complete";
   state.progress.push("Login complete");
   this.#scheduleEvict(state);
  } catch (error: unknown) {
   this.#setError(flowId, error instanceof Error ? error.message : String(error));
  }
 }

 #scheduleEvict(state: FlowState): void {
  const timeout = setTimeout(() => {
   state.timeouts.forEach(clearTimeout);
   this.#flows.delete(state.flowId);
  }, this.terminalTtlMs);
  state.timeouts.push(timeout);
 }

 #setError(flowId: string, message: string): void {
  const state = this.#flows.get(flowId);
  if (!state) return;
  state.status = "error";
  state.error = message;
  this.#scheduleEvict(state);
 }
}
