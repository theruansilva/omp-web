import { randomUUID } from "node:crypto";
import type { ImageContent } from "@oh-my-pi/pi-ai";
import type { StreamFn } from "@oh-my-pi/pi-agent-core";
import {
  type AgentSession,
  ModelRegistry,
  SessionManager,
} from "@oh-my-pi/pi-coding-agent";
import { readPlanFile } from "@oh-my-pi/pi-coding-agent/plan-mode/plan-files";
import type {
  ExtensionAskDialogQuestion,
  ExtensionAskDialogResult,
  ExtensionUIDialogOptions,
  ExtensionUIContext,
} from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";
import type {
  AskDialogOption,
  AskDialogQuestion,
  AskDialogResult,
} from "../../shared/apiTypes.js";
import type {
  ClientSessionStatus,
  ClientThinkingLevel,
} from "../types.js";
import { isKnownThinkingLevel } from "../../shared/thinkingLevels.js";
import { isRecord } from "../utils.js";
import type { SpawnSessionInvocation } from "./spawnSessionTool.js";
import type { PiSessionListEntry } from "./sessionArchiveHelpers.js";

export type AgentModel = NonNullable<SpawnSessionInvocation["model"]>;
export type ModelRegistryInstance = ModelRegistry;

export interface PiSessionManager {
 getCwd(): string;
 getBranch(): unknown[];
 getEntries?(): readonly unknown[];
 getLeafId(): string | null;
 getHeader?(): { parentSession?: string } | null | undefined;
 appendCustomEntry?(customType: string, data?: unknown): string;
}

export interface PiSessionManagerGateway {
 list(cwd: string): Promise<PiSessionListEntry[]>;
 create(cwd: string, options?: { parentSession?: string }): PiSessionManager;
 /**
  * Legacy id-only lookup surface for older clients. This intentionally searches
  * only Pi's default session store, because custom session directories require
  * a cwd-scoped lookup.
  */
 listAll?(): Promise<PiSessionListEntry[]>;
 open(path: string): Promise<PiSessionManager>;
}

interface PiExtensionError {
 extensionPath: string;
 event: string;
 error: string;
 stack?: string;
}

interface PiExtensionBindings {
 onError?: (error: PiExtensionError) => void;
}

export interface PiAgentSession {
 modelRegistry: ModelRegistryInstance;
 sessionManager: PiSessionManager;
 scopedModels: readonly { model: AgentModel; thinkingLevel?: ClientThinkingLevel }[];
 sessionId: string;
 sessionFile: string | undefined;
 sessionName: string | undefined;
 messages: readonly unknown[];
 model: AgentModel | undefined;
 thinkingLevel: ClientThinkingLevel;
 isStreaming: boolean;
 isCompacting: boolean;
 isBashRunning: boolean;
 pendingMessageCount: number;
 extensionRunner: { getRegisteredCommands(): readonly { name: string; description?: string }[] };
 promptTemplates: readonly { name: string; description?: string }[];
 resourceLoader: { getSkills(): { skills: readonly { name: string; description?: string }[] } };
 subscribe(listener: (event: unknown) => void): () => void;
 bindExtensions(bindings: PiExtensionBindings): Promise<void>;
 compact(instructions?: string): Promise<{ summary: string; tokensBefore: number }>;
 getUserMessagesForForking(): readonly { entryId: string; text: string }[];
 getSessionStats(): { sessionId: string; totalMessages: number; userMessages: number; assistantMessages: number; toolCalls: number; tokens: ClientSessionStatus["tokens"]; cost: number };
 reload(): Promise<void>;
 getContextUsage(): ClientSessionStatus["contextUsage"] | undefined;
 getExtensionStatuses?(): Record<string, string> | undefined;
 onExtensionStatusChange?: () => void;
 prompt(text: string, options?: { streamingBehavior?: "steer" | "followUp"; images?: ImageContent[] }): Promise<void>;
 sendCustomMessage(message: { customType: string; content: string; display: boolean; details?: unknown }, options?: { triggerTurn?: boolean; deliverAs?: "steer" | "followUp" | "nextTurn" }): Promise<void>;
 executeBash(command: string, onChunk?: (chunk: string) => void, options?: { excludeFromContext?: boolean }): Promise<{ output: string; exitCode: number | undefined; cancelled: boolean; truncated: boolean }>;
 abort(): Promise<void>;
 clearQueue(): { steering: string[]; followUp: string[] };
 getSteeringMessages(): readonly string[];
 getFollowUpMessages(): readonly string[];
 setModel(model: AgentModel, role?: string, options?: { persist?: boolean }): Promise<void>;
 cycleModel(direction?: "forward" | "backward"): Promise<{ model: AgentModel } | undefined>;
 getAvailableThinkingLevels(): ClientThinkingLevel[];
 setThinkingLevel(level: ClientThinkingLevel): void;
 cycleThinkingLevel(): ClientThinkingLevel | undefined;
 setSessionName(name: string): void;
 /**
  * Narrow re-expression of `AgentSession.agent` (an `@earendil-works/pi-agent-core`
  * `Agent`), exposing only `streamFn` — the resolved-auth/headers/retry "call this
  * model" function pi's own compaction/branch-summarization code uses internally.
  * Lets callers (e.g. session title generation) issue one-off model calls without
  * depending on pi-ai's deprecated `/compat` provider registry or leaking the full
  * `Agent`/`AgentSession` surface.
  */
 agent: { streamFn: StreamFn };
 getPlanModeState(): { enabled: boolean; planFilePath: string } | undefined;
 setPlanModeState(state: { enabled: boolean; planFilePath: string } | undefined): void;
 toggleAdvisorEnabled(): boolean;
 setAdvisorEnabled(enabled: boolean): boolean;
 getProposedPlan?(): { planFilePath: string; title: string; planContent: string } | undefined;
 approvePlan?(): Promise<void>;
 rejectPlan?(feedback?: string): Promise<void>;
 loadPlanForReview?(): Promise<{ planFilePath: string; title: string; planContent: string } | undefined>;
 getPendingAsk?(): { requestId: string; questions: AskDialogQuestion[] } | undefined;
 resolvePendingAsk?(requestId: string, result: AskDialogResult | undefined): boolean;
 onPlanProposed?: (plan: { planFilePath: string; title: string; planContent: string }) => void;
 onPlanCleared?: () => void;
 onAskRequested?: (ask: { requestId: string; questions: AskDialogQuestion[] }) => void;
 onAskCleared?: (requestId: string) => void;
}

export interface PiSessionRuntime {
 readonly cwd: string;
 readonly session: PiAgentSession;
 setRebindSession(rebindSession?: (session: PiAgentSession) => Promise<void>): void;
 fork(entryId: string, options?: { position?: "before" | "at" }): Promise<{ cancelled: boolean; selectedText?: string }>;
 dispose(): Promise<void>;
}

export interface CreateAgentRuntimeOptions {
 cwd: string;
 agentDir: string;
 sessionManager: PiSessionManager;
 initialModel?: AgentModel;
}

export type OmpWebCreateAgentSessionRuntimeFactory = (options: CreateAgentRuntimeOptions & { sessionStartEvent?: unknown }) => Promise<PiSessionRuntime>;

export type CreateAgentRuntime = (createRuntime: OmpWebCreateAgentSessionRuntimeFactory | undefined, options: CreateAgentRuntimeOptions) => Promise<PiSessionRuntime>;

export class DefaultPiAgentSession implements PiAgentSession {
 private _isBashRunning = false;
 private readonly _extensionStatuses = new Map<string, string>();
 onExtensionStatusChange?: () => void;
 onPlanProposed?: (plan: { planFilePath: string; title: string; planContent: string }) => void;
 onPlanCleared?: () => void;
 onAskRequested?: (ask: { requestId: string; questions: AskDialogQuestion[] }) => void;
 onAskCleared?: (requestId: string) => void;

 private _proposedPlan: { planFilePath: string; title: string; planContent: string } | undefined;
 private _pendingAsk: {
  requestId: string;
  questions: AskDialogQuestion[];
  resolve: (result: AskDialogResult | undefined) => void;
  timer?: ReturnType<typeof setTimeout> | undefined;
 } | undefined;
 private readonly uiContext: ExtensionUIContext;

 constructor(
  private readonly ompSession: AgentSession,
  private readonly piSessionManager: PiSessionManager,
  private readonly setToolUIContext?: (uiContext: ExtensionUIContext, hasUI: boolean) => void,
 ) {
  this.uiContext = this.buildUIContext();
  this.setToolUIContext?.(this.uiContext, true);
 }

 get modelRegistry(): ModelRegistryInstance { return this.ompSession.modelRegistry; }
 get sessionManager(): PiSessionManager { return this.piSessionManager; }
 get scopedModels(): readonly { model: AgentModel; thinkingLevel?: ClientThinkingLevel }[] {
  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  return (this.ompSession.scopedModels as unknown) as readonly { model: AgentModel; thinkingLevel?: ClientThinkingLevel }[];
  /* eslint-enable @typescript-eslint/consistent-type-assertions */
 }
 get sessionId(): string { return this.ompSession.sessionId; }
 get sessionFile(): string | undefined { return this.ompSession.sessionFile; }
 get sessionName(): string | undefined { return this.ompSession.sessionName; }
 get messages(): readonly unknown[] { return this.ompSession.messages; }
 get model(): AgentModel | undefined { return this.ompSession.model; }
 get thinkingLevel(): ClientThinkingLevel {
  const configured = this.ompSession.configuredThinkingLevel();
  return configured !== undefined && isKnownThinkingLevel(configured) ? configured : "off";
 }
 get isStreaming(): boolean { return this.ompSession.isStreaming; }
 get isCompacting(): boolean { return this.ompSession.isCompacting; }
 get isBashRunning(): boolean { return this._isBashRunning; }
 get pendingMessageCount(): number { return this.ompSession.queuedMessageCount; }
 get extensionRunner(): { getRegisteredCommands(): readonly { name: string; description?: string }[] } {
  const runner = this.ompSession.extensionRunner;
  return { getRegisteredCommands: () => runner?.getRegisteredCommands() ?? [] };
 }
 get promptTemplates(): readonly { name: string; description?: string }[] { return this.ompSession.promptTemplates; }
 get resourceLoader(): { getSkills(): { skills: readonly { name: string; description?: string }[] } } {
  return {
   getSkills: () => ({
    skills: this.ompSession.skills.map((s) => ({ name: s.name, description: s.description })),
   }),
  };
 }
 getPlanModeState(): { enabled: boolean; planFilePath: string } | undefined {
  const fn = Reflect.get(this.ompSession, "getPlanModeState");
  if (typeof fn !== "function") return undefined;
  const res = fn.call(this.ompSession);
  return isRecord(res) && typeof res.enabled === "boolean" && typeof res.planFilePath === "string"
   ? { enabled: res.enabled, planFilePath: res.planFilePath }
   : undefined;
 }
 getProposedPlan(): { planFilePath: string; title: string; planContent: string } | undefined {
  return this._proposedPlan;
 }
 setPlanModeState(state: { enabled: boolean; planFilePath: string } | undefined): void {
  const fn = Reflect.get(this.ompSession, "setPlanModeState");
  if (typeof fn === "function") fn.call(this.ompSession, state);
  if (state?.enabled) {
   const setHandler = Reflect.get(this.ompSession, "setPlanProposalHandler");
   if (typeof setHandler === "function") {
    setHandler.call(this.ompSession, async (title: string) => {
     const prepareFn = Reflect.get(this.ompSession, "preparePlanForReview");
     if (typeof prepareFn !== "function") throw new Error("preparePlanForReview unavailable");
     /* eslint-disable @typescript-eslint/consistent-type-assertions */
     const result = (await prepareFn.call(this.ompSession, title)) as {
      content: unknown[];
      details?: { planFilePath: string; title: string; planExists: boolean };
     };
     if (result.details && typeof result.details === "object" && typeof result.details.planFilePath === "string") {
      const planContent = (await this.readPlanContent(result.details.planFilePath)) ?? "";
      this._proposedPlan = {
       planFilePath: result.details.planFilePath,
       title: result.details.title,
       planContent,
      };
      this.onPlanProposed?.(this._proposedPlan);
     }
     return result as never;
     /* eslint-enable @typescript-eslint/consistent-type-assertions */
    });
   }
  } else {
   const setHandler = Reflect.get(this.ompSession, "setPlanProposalHandler");
   if (typeof setHandler === "function") setHandler.call(this.ompSession, null);
   this._proposedPlan = undefined;
   this.onPlanCleared?.();
  }
 }
 async loadPlanForReview(): Promise<{ planFilePath: string; title: string; planContent: string } | undefined> {
  if (this._proposedPlan !== undefined) return this._proposedPlan;
  try {
   const prepareFn = Reflect.get(this.ompSession, "preparePlanForReview");
   if (typeof prepareFn !== "function") return undefined;
   const result = (await prepareFn.call(this.ompSession, "")) as {
    content: unknown[];
    details?: { planFilePath: string; title: string; planExists: boolean };
   };
   if (result.details && typeof result.details === "object" && typeof result.details.planFilePath === "string") {
    const planContent = (await this.readPlanContent(result.details.planFilePath)) ?? "";
    this._proposedPlan = {
     planFilePath: result.details.planFilePath,
     title: result.details.title,
     planContent,
    };
    return this._proposedPlan;
   }
  } catch {
   return undefined;
  }
  return undefined;
 }
 async approvePlan(): Promise<void> {
  this.setPlanModeState(undefined);
  this._proposedPlan = undefined;
  this.onPlanCleared?.();
  await this.prompt("Plan approved. Proceed with execution as planned.", { streamingBehavior: "steer" });
 }
 async rejectPlan(feedback?: string): Promise<void> {
  this._proposedPlan = undefined;
  this.onPlanCleared?.();
  const text = feedback !== undefined && feedback.trim() !== ""
   ? `Plan revision requested: ${feedback.trim()}`
   : "Plan rejected. Please revise the plan based on requirements.";
  await this.prompt(text, { streamingBehavior: "steer" });
 }
 private async readPlanContent(planFilePath: string): Promise<string | null> {
  const localOptions = {
   getArtifactsDir: () => this.ompSession.sessionManager?.getArtifactsDir?.() ?? null,
   getSessionId: () => this.ompSession.sessionManager?.getSessionId?.() ?? null,
  };
  return readPlanFile(planFilePath, {
   localProtocolOptions: localOptions,
   cwd: this.sessionManager.getCwd(),
  });
 }
 getPendingAsk(): { requestId: string; questions: AskDialogQuestion[] } | undefined {
  if (this._pendingAsk === undefined) return undefined;
  return { requestId: this._pendingAsk.requestId, questions: this._pendingAsk.questions };
 }
 resolvePendingAsk(requestId: string, result: AskDialogResult | undefined): boolean {
  if (this._pendingAsk === undefined || this._pendingAsk.requestId !== requestId) return false;
  const pending = this._pendingAsk;
  this._pendingAsk = undefined;
  if (pending.timer !== undefined) clearTimeout(pending.timer);
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  pending.resolve(result as ExtensionAskDialogResult | undefined);
  this.onAskCleared?.(requestId);
  return true;
 }
 toggleAdvisorEnabled(): boolean {
  const fn = Reflect.get(this.ompSession, "toggleAdvisorEnabled");
  if (typeof fn !== "function") return false;
  const res = fn.call(this.ompSession);
  return typeof res === "boolean" ? res : false;
 }
 setAdvisorEnabled(enabled: boolean): boolean {
  const fn = Reflect.get(this.ompSession, "setAdvisorEnabled");
  if (typeof fn !== "function") return false;
  const res = fn.call(this.ompSession, enabled);
  return typeof res === "boolean" ? res : false;
 }
 get agent(): { streamFn: StreamFn } {
  return { streamFn: this.ompSession.agent.streamFn };
 }

 subscribe(listener: (event: unknown) => void): () => void {
  return this.ompSession.subscribe(listener);
 }

 getExtensionStatuses(): Record<string, string> | undefined {
  if (this._extensionStatuses.size === 0) return undefined;
  return Object.fromEntries(this._extensionStatuses);
 }

 private buildUIContext(): ExtensionUIContext {
  // eslint-disable-next-line no-control-regex -- ANSI escape sequences contain ASCII 0x1B
  const ANSI_ESCAPE = /\x1b\[[0-9;]*m/g;
  const cleanStatusText = (text: string): string => text.replace(ANSI_ESCAPE, "").trim();

  const theme = {
   fg: (_color: string, text: string) => text,
   bg: (_color: string, text: string) => text,
  };

  /* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-empty-function, @typescript-eslint/consistent-type-assertions */
  return {
   theme: theme as never,
   setStatus: (key: string, text: string | undefined): void => {
    if (text === undefined || text.trim() === "") {
     this._extensionStatuses.delete(key);
    } else {
     this._extensionStatuses.set(key, cleanStatusText(text));
    }
    this.onExtensionStatusChange?.();
   },
   notify: (_message: string, _type?: "info" | "warning" | "error"): void => {},
   onTerminalInput: () => () => {},
   select: async (prompt, options, dialogOptions) => {
    const res = await this.askDialog(
     [{ id: "select", question: prompt, options: options.map((opt) => ({ label: typeof opt === "string" ? opt : opt.label })) }],
     dialogOptions,
    );
    if (res?.kind === "submit" && res.results[0]?.selectedOptions[0]) {
     return res.results[0].selectedOptions[0];
    }
    return undefined;
   },
   confirm: async (title, message, dialogOptions) => {
    const res = await this.askDialog(
     [{ id: "confirm", question: `${title}\n${message}`.trim(), options: [{ label: "Yes" }, { label: "No" }] }],
     dialogOptions,
    );
    return res?.kind === "submit" && res.results[0]?.selectedOptions[0] === "Yes";
   },
   input: async (title, placeholder, dialogOptions) => {
    const question: ExtensionAskDialogQuestion = {
     id: "input",
     question: title,
     options: [],
     ...(placeholder !== undefined && placeholder.trim() !== "" ? { header: placeholder } : {}),
    };
    const res = await this.askDialog([question], dialogOptions);
    return res?.kind === "submit" ? res.results[0]?.customInput : undefined;
   },
   askDialog: async (questions, dialogOptions) => {
    return this.askDialog(questions, dialogOptions);
   },
   setWorkingMessage: (): void => {},
   setWidget: (): void => {},
   setFooter: (): void => {},
   setHeader: (): void => {},
   setTitle: (): void => {},
   custom: async () => undefined as never,
   setEditorComponent: (): void => {},
   setEditorText: (): void => {},
   pasteToEditor: (): void => {},
   getEditorText: (): string => "",
   editor: async () => "",
   addAutocompleteProvider: () => () => {},
   getAllThemes: async () => [],
   getTheme: async () => undefined,
   setTheme: async () => ({ success: false }),
   getToolsExpanded: () => false,
   setToolsExpanded: (): void => {},
  };
  /* eslint-enable @typescript-eslint/require-await, @typescript-eslint/no-empty-function, @typescript-eslint/consistent-type-assertions */
 }

 private askDialog(
  questions: ExtensionAskDialogQuestion[],
  dialogOptions?: ExtensionUIDialogOptions,
 ): Promise<ExtensionAskDialogResult | undefined> {
  if (this._pendingAsk !== undefined) {
   this.resolvePendingAsk(this._pendingAsk.requestId, undefined);
  }
  const requestId = randomUUID();
  return new Promise<ExtensionAskDialogResult | undefined>((resolve) => {
   let timer: ReturnType<typeof setTimeout> | undefined;
   if (dialogOptions?.timeout !== undefined && dialogOptions.timeout > 0) {
    timer = setTimeout(() => {
     const results = questions.map((q) => {
      const recIndex = q.recommended ?? 0;
      const rec = q.options[recIndex]?.label ?? q.options[0]?.label;
      return {
       id: q.id,
       question: q.question,
       options: q.options.map((o) => o.label),
       multi: q.multi ?? false,
       selectedOptions: rec ? [rec] : [],
       timedOut: true,
      };
     });
     this.resolvePendingAsk(requestId, { kind: "submit", results });
    }, dialogOptions.timeout);
   }
   if (dialogOptions?.signal) {
    dialogOptions.signal.addEventListener(
     "abort",
     () => { this.resolvePendingAsk(requestId, undefined); },
     { once: true },
    );
   }
   this._pendingAsk = { requestId, questions, resolve, timer };
   this.onAskRequested?.({ requestId, questions });
  });
 }

 async bindExtensions(bindings?: PiExtensionBindings): Promise<void> {
  this.setToolUIContext?.(this.uiContext, true);
  const runner = this.ompSession.extensionRunner;
  if (!runner) return Promise.resolve();

  if (bindings?.onError) {
   runner.onError((err: { extensionPath: string; event: string; error: string }) => {
    bindings.onError?.(err);
   });
  }

  try {
   runner.initialize(
    {
     sendMessage: (msg, opts) => { void this.ompSession.sendCustomMessage(msg, opts); },
     sendUserMessage: (c, opts) => { void this.ompSession.sendUserMessage(c, opts); },
     appendEntry: (t, d) => { this.ompSession.sessionManager.appendCustomEntry(t, d); },
     setLabel: (targetId, label) => { this.ompSession.sessionManager.appendLabelChange(targetId, label); },
     getActiveTools: () => this.ompSession.getEnabledToolNames(),
     getAllTools: () => this.ompSession.getAllToolInfos(),
     setActiveTools: async (tools) => { await this.ompSession.setActiveToolsByName(tools); },
     getCommands: () => [],
     setModel: async (m) => { const res = await this.ompSession.setModel(m); return res.switched; },
     getThinkingLevel: () => this.ompSession.thinkingLevel,
     setThinkingLevel: (l) => { this.ompSession.setThinkingLevel(l); },
     getSessionName: () => this.ompSession.sessionManager.getSessionName(),
     setSessionName: async (n) => { await this.ompSession.sessionManager.setSessionName(n, "user"); },
    },
    {
     getModel: () => this.ompSession.model,
     isIdle: () => !this.ompSession.isStreaming,
     abort: () => { void this.ompSession.abort(); },
     hasPendingMessages: () => this.ompSession.queuedMessageCount > 0,
     shutdown: () => {},
     getContextUsage: () => this.ompSession.getContextUsage(),
     getSystemPrompt: () => this.ompSession.systemPrompt,
     compact: async (opts) => { await this.ompSession.compact(typeof opts === "string" ? opts : undefined); },
    },
    {
     getContextUsage: () => this.ompSession.getContextUsage(),
     waitForIdle: async () => { await this.ompSession.agent.waitForIdle(); },
     newSession: async () => ({ cancelled: false }),
     branch: async () => ({ cancelled: false }),
     navigateTree: async () => ({ cancelled: false }),
     switchSession: async () => ({ cancelled: false }),
     reload: async () => {},
     compact: async (opts) => { await this.ompSession.compact(typeof opts === "string" ? opts : undefined); },
    },
    this.uiContext,
    "rpc"
   );

   await runner.emit({ type: "session_start" });
   return;
  } catch {
   return Promise.resolve();
  }
 }

 async compact(instructions?: string): Promise<{ summary: string; tokensBefore: number }> {
  const result = await this.ompSession.compact(instructions);
  return { summary: result.summary, tokensBefore: 0 };
 }

 getUserMessagesForForking(): readonly { entryId: string; text: string }[] {
  return this.ompSession.getUserMessagesForBranching();
 }

 getSessionStats(): {
  sessionId: string; totalMessages: number; userMessages: number;
  assistantMessages: number; toolCalls: number;
  tokens: ClientSessionStatus["tokens"]; cost: number;
 } {
  const stats = this.ompSession.getSessionStats();
  return {
   sessionId: stats.sessionId,
   totalMessages: stats.totalMessages,
   userMessages: stats.userMessages,
   assistantMessages: stats.assistantMessages,
   toolCalls: stats.toolCalls,
   tokens: stats.tokens,
   cost: stats.cost,
  };
 }

 async reload(): Promise<void> {
  // omp sessions manage persistence internally
 }

 getContextUsage(): ClientSessionStatus["contextUsage"] | undefined {
  return undefined;
 }

 async prompt(text: string, options?: { streamingBehavior?: "steer" | "followUp"; images?: ImageContent[] }): Promise<void> {
  await this.ompSession.prompt(text, options);
 }

 async sendCustomMessage(
  message: { customType: string; content: string; display: boolean; details?: unknown },
  options?: { triggerTurn?: boolean; deliverAs?: "steer" | "followUp" | "nextTurn" },
 ): Promise<void> {
  await this.ompSession.sendCustomMessage(message, options);
 }

 async executeBash(
  command: string,
  onChunk?: (chunk: string) => void,
  options?: { excludeFromContext?: boolean },
 ): Promise<{ output: string; exitCode: number | undefined; cancelled: boolean; truncated: boolean }> {
  this._isBashRunning = true;
  try {
   const result = await this.ompSession.executeBash(command, onChunk, options);
   return {
    output: result.output,
    exitCode: result.exitCode,
    cancelled: result.cancelled,
    truncated: result.truncated,
   };
  } finally {
   this._isBashRunning = false;
  }
 }

 async abort(): Promise<void> {
  await this.ompSession.abort();
 }

 clearQueue(): { steering: string[]; followUp: string[] } {
  const result = this.ompSession.clearQueue();
  const extractText = (m: unknown): string => {
   if (typeof m === "string") return m;
   if (isRecord(m) && typeof m["text"] === "string") return m["text"];
   return "";
  };
  return {
   steering: result.steering.map(extractText),
   followUp: result.followUp.map(extractText),
  };
 }

 getSteeringMessages(): readonly string[] {
  return this.ompSession.getQueuedMessages().steering;
 }

 getFollowUpMessages(): readonly string[] {
  return this.ompSession.getQueuedMessages().followUp;
 }

 async setModel(model: AgentModel, role = "default", options: { persist?: boolean } = {}): Promise<void> {
  await this.ompSession.setModel(model, role, options);
 }
 setThinkingLevel(level: ClientThinkingLevel): void {
  const setLevel = Reflect.get(this.ompSession, "setThinkingLevel");
  if (typeof setLevel === "function") {
   Reflect.apply(setLevel, this.ompSession, [level === "off" ? undefined : level]);
  }
 }

 async cycleModel(direction?: "forward" | "backward"): Promise<{ model: AgentModel } | undefined> {
  const result = await this.ompSession.cycleModel(direction);
  if (result === undefined) return undefined;
  return { model: result.model };
 }

 getAvailableThinkingLevels(): ClientThinkingLevel[] {
  const efforts = this.ompSession.getAvailableThinkingLevels();
  const levels: ClientThinkingLevel[] = ["off"];
  for (const effort of efforts) {
   if (isKnownThinkingLevel(effort)) levels.push(effort);
  }
  return levels;
 }

 cycleThinkingLevel(): ClientThinkingLevel | undefined {
  const levels = this.ompSession.getAvailableThinkingLevels();
  const fullCycle: ClientThinkingLevel[] = ["off"];
  for (const level of levels) {
   if (isKnownThinkingLevel(level)) fullCycle.push(level);
  }
  const current = this.ompSession.configuredThinkingLevel();
  if (current !== undefined && !isKnownThinkingLevel(current)) return undefined;
  const currentLevel: ClientThinkingLevel = current !== undefined && isKnownThinkingLevel(current) ? current : "off";
  const currentIndex = fullCycle.indexOf(currentLevel);
  if (currentIndex === -1) return undefined;
  const nextIndex = (currentIndex + 1) % fullCycle.length;
  const next = fullCycle[nextIndex];
  if (next === undefined) return undefined;
  this.setThinkingLevel(next);
  return next;
 }

 setSessionName(name: string): void {
  void this.ompSession.setSessionName(name);
 }
}

export class DefaultPiSessionRuntime implements PiSessionRuntime {
 readonly cwd: string;
 readonly session: PiAgentSession;
 private rebindSessionCallback: ((session: PiAgentSession) => Promise<void>) | undefined = undefined;
 private readonly ompSession: AgentSession;

 constructor(session: PiAgentSession, cwd: string, private readonly result: { session: AgentSession }) {
  this.session = session;
  this.cwd = cwd;
  this.ompSession = result.session;
 }

 setRebindSession(rebindSession?: (session: PiAgentSession) => Promise<void>): void {
  this.rebindSessionCallback = rebindSession;
 }

 async fork(entryId: string): Promise<{ cancelled: boolean; selectedText?: string }> {
  return this.ompSession.branch(entryId);
 }

 async dispose(): Promise<void> {
  await this.ompSession.dispose();
 }
}

export function defaultCreateAgentRuntime(createRuntime: OmpWebCreateAgentSessionRuntimeFactory | undefined, options: CreateAgentRuntimeOptions): Promise<PiSessionRuntime> {
 if (createRuntime === undefined) throw new Error("Runtime factory is required");
 return createRuntime(options);
}
