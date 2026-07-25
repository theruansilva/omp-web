import { isRecord } from "../utils.js";
import { Type } from "@oh-my-pi/pi-coding-agent/extensibility/typebox";
import type { ExtensionContext, ToolDefinition } from "@oh-my-pi/pi-coding-agent";
import type { AgentToolUpdateCallback } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";
import type { TranscriptContentKind, TranscriptEntry, TranscriptRole, TranscriptView } from "./subsessionTranscript.js";

/** Lifecycle phase of a tracked subsession as seen by its parent. */
export type SubsessionStatus = "working" | "idle" | "error" | "unknown";

export interface SpawnSubsessionResult {
 sessionId: string;
 cwd: string;
}

export type SpawnSubsessionModel = NonNullable<ExtensionContext["model"]>;

export interface SpawnSubsessionInvocation {
 /** cwd of the session that invoked the tool (used for project-scope checks). */
 spawningCwd: string;
 /** Session id of the parent; the spawned session is tracked against it. */
 parentSessionId: string;
 /** Session file of the parent, recorded in the child's `parentSession` header. */
 parentSessionFile: string | undefined;
 prompt: string;
 cwd: string | undefined;
 /** Current model from the dispatching session, used as the spawned session's default. */
 model?: SpawnSubsessionModel;
}

export interface SubsessionSummary {
 sessionId: string;
 cwd: string;
 status: SubsessionStatus;
}

/** Quick glance at a subsession: status plus its most recent assistant output. */
export interface SubsessionCheckResult {
 sessionId: string;
 cwd: string;
 status: SubsessionStatus;
 finalText: string;
 messageCount: number;
}

/** Exploratory transcript read: a filtered, paginated slice of the subsession's history. */
export interface SubsessionReadResult extends TranscriptView {
 sessionId: string;
 cwd: string;
 status: SubsessionStatus;
}

/** Filters the parent passes to narrow a transcript read; mirrors {@link TranscriptQuery}. */
export interface SubsessionReadQuery {
 roles?: TranscriptRole[];
 include?: TranscriptContentKind[];
 search?: string;
 maxChars?: number;
 includeToolArgs?: boolean;
 before?: number;
 limit?: number;
}

export interface SubsessionToolDeps {
 spawn(input: SpawnSubsessionInvocation): Promise<SpawnSubsessionResult>;
 list(parentSessionId: string, parentSessionFile?: string): Promise<SubsessionSummary[]>;
 check(parentSessionId: string, sessionId: string, parentSessionFile?: string): Promise<SubsessionCheckResult>;
 read(parentSessionId: string, sessionId: string, query: SubsessionReadQuery, parentSessionFile?: string): Promise<SubsessionReadResult>;
}

const SpawnSubsessionParams = Type.Object({
 prompt: Type.String({
  description: "The first instruction to send to the new tracked subsession.",
 }),
 cwd: Type.Optional(Type.String({
  description: "Working directory for the subsession. Must be a workspace (worktree, or root) of the same project as this session. Defaults to this session's working directory.",
 })),
});

const ListSubsessionsParams = Type.Object({});

const CheckSubsessionParams = Type.Object({
 sessionId: Type.String({
  description: "Id of a subsession you spawned (as returned by spawn_subsession or list_subsessions).",
 }),
});

const ReadSubsessionParams = Type.Object({
 sessionId: Type.String({
  description: "Id of a subsession you spawned (as returned by spawn_subsession or list_subsessions).",
 }),
 roles: Type.Optional(Type.Array(
  Type.Union([Type.Literal("assistant"), Type.Literal("user"), Type.Literal("tool"), Type.Literal("system"), Type.Literal("custom")]),
  { description: "Message roles to include. Omit for all roles." },
 )),
 include: Type.Optional(Type.Array(
  Type.Union([Type.Literal("text"), Type.Literal("thinking"), Type.Literal("tool_call"), Type.Literal("tool_result"), Type.Literal("image")]),
  { description: "Content kinds to keep within messages. Omit for all kinds." },
 )),
 search: Type.Optional(Type.String({
  description: "Case-insensitive substring; keep only messages whose text or tool name matches. Always searches full message content, even when maxChars is set.",
 })),
 maxChars: Type.Optional(Type.Integer({
  minimum: 0,
  description: "Truncate each text/thinking/tool-result value to this many characters; clipped parts are marked '[+N chars truncated]'. Omit for full, untruncated text (there is no default, so truncation only happens when you ask for it).",
 })),
 includeToolArgs: Type.Optional(Type.Boolean({
  description: "Include raw tool-call arguments (can be large). A compact one-line summary of each call is always shown regardless.",
 })),
 before: Type.Optional(Type.Integer({
  minimum: 0,
  description: "Return only messages before this transcript index; page backward by passing the previous response's 'start'.",
 })),
 limit: Type.Optional(Type.Integer({
  minimum: 1,
  description: "Maximum number of most-recent matching messages to return within the window (returned in chronological order). Defaults to 50.",
 })),
});

function statusLine(summary: SubsessionSummary): string {
 return `- ${summary.sessionId} [${summary.status}] in ${summary.cwd}`;
}

function renderEntry(entry: TranscriptEntry): string {
 const header = `#${String(entry.index)} ${entry.role}`;
 const body = entry.parts.map(renderPart).filter((line) => line !== "").join("\n");
 return body === "" ? header : `${header}\n${body}`;
}

function clipNotice(part: TranscriptEntry["parts"][number]): string {
 if ((part.kind === "text" || part.kind === "thinking" || part.kind === "tool_result") && part.truncated !== undefined) {
  return ` [+${String(part.truncated.full - part.truncated.shown)} chars truncated; re-read with a larger maxChars]`;
 }
 return "";
}

function renderPart(part: TranscriptEntry["parts"][number]): string {
 if (part.kind === "text") return `${part.text}${clipNotice(part)}`;
 if (part.kind === "thinking") return `[thinking] ${part.text}${clipNotice(part)}`;
 if (part.kind === "tool_call") {
  // Raw args are only present when the caller asked (includeToolArgs); when
  // present, surface them in the model-facing text, not just `details`.
  const args = "args" in part && part.args !== undefined ? `\n  args: ${JSON.stringify(part.args)}` : "";
  return `[tool ${part.toolName}] ${part.summary}${args}`;
 }
 if (part.kind === "tool_result") return `[result${part.isError ? " error" : ""}${part.toolName === undefined ? "" : ` ${part.toolName}`}] ${part.text}${clipNotice(part)}`;
 return "[image]";
}

function renderTranscript(result: SubsessionReadResult): string {
 const last = result.entries[result.entries.length - 1];
 // Distinguish "nothing matched at all" (widen filters) from "matches exist but
 // this page/window is empty" (page differently) so the agent isn't misled.
 const range = last === undefined
  ? (result.matched === 0
   ? "no messages matched your filters"
   : `no messages in this window (${String(result.matched)} matched outside it)`)
  : `messages ${String(result.start)}–${String(last.index)} of ${String(result.total)} (${String(result.matched)} matched)`;
 const more = result.hasMore ? `\n\nMore matching messages exist earlier; page back with before: ${String(result.start)}.` : "";
 // Empty entries with matches means the `before` cursor excluded every match
 // (they all sit at index >= before): the agent paged too far back and should
 // raise `before` or omit it, not page back further.
 const body = result.entries.length > 0
  ? result.entries.map(renderEntry).join("\n\n")
  : (result.matched === 0
   ? "(nothing matched; try widening roles/include, dropping search, or raising limit)"
   : `(no messages before index ${String(result.start)}; all ${String(result.matched)} matches are later — raise 'before' or omit it)`);
 return `Subsession ${result.sessionId} [${result.status}] — ${range}:\n\n${body}${more}`;
}

/**
 * Tools that let an agent spawn *tracked* child sessions and inspect them.
 *
 * Unlike `spawn_session` (fire-and-forget peers), a subsession records its
 * parent in its session header, the parent is notified when it stops working,
 * and the parent may read its transcript/result. The tools are constructed
 * per-session, carrying the spawning cwd for project-scope validation; the
 * parent's identity is taken from the live extension context at call time.
 */
export function createSubsessionToolDefinitions(spawningCwd: string, deps: SubsessionToolDeps): ToolDefinition[] {
 const spawnTool: ToolDefinition = {
  name: "spawn_subsession",
  label: "Spawn subsession",
  description: "Start a tracked child session and send it an initial prompt. The subsession runs independently and a human can interact with it, but unlike spawn_session it is linked to you: you are notified when it stops working (finished, idle, or errored), and you can inspect it with list_subsessions, check_subsession (a quick glance at its latest output), and read_subsession (read through its transcript). Use this to delegate work you intend to follow up on.",
  parameters: SpawnSubsessionParams,
  async execute(_toolCallId: string, params: unknown, _signal: AbortSignal | undefined, _onUpdate: AgentToolUpdateCallback<SpawnSubsessionResult> | undefined, ctx: ExtensionContext) {
   const p = isRecord(params) ? params : {};
   const prompt = typeof p["prompt"] === "string" ? p["prompt"] : "";
   const cwd = typeof p["cwd"] === "string" ? p["cwd"] : undefined;
   const parentSessionId = ctx.sessionManager.getSessionId();
   const parentSessionFile = ctx.sessionManager.getSessionFile() ?? undefined;
   const result = await deps.spawn({
    spawningCwd,
    parentSessionId,
    parentSessionFile,
    prompt,
    cwd,
    ...(ctx.model === undefined ? {} : { model: ctx.model }),
   });
   return {
    content: [{ type: "text", text: `Started subsession ${result.sessionId} in ${result.cwd}. You will be notified when it stops working.` }],
    details: result,
   };
  },
 };

 const listTool: ToolDefinition = {
  name: "list_subsessions",
  label: "List subsessions",
  description: "List the tracked subsessions you spawned, with their current status (working, idle, error, or unknown).",
  parameters: ListSubsessionsParams,
  async execute(_toolCallId: string, _params: unknown, _signal: AbortSignal | undefined, _onUpdate: AgentToolUpdateCallback<{ subsessions: SubsessionSummary[] }> | undefined, ctx: ExtensionContext) {
   const parentSessionId = ctx.sessionManager.getSessionId();
   const parentSessionFile = ctx.sessionManager.getSessionFile() ?? undefined;
   const subsessions = await deps.list(parentSessionId, parentSessionFile);
   const text = subsessions.length === 0
    ? "You have not spawned any subsessions."
    : `Your subsessions:\n${subsessions.map(statusLine).join("\n")}`;
   return { content: [{ type: "text", text }], details: { subsessions } };
  },
 };

 const checkTool: ToolDefinition = {
  name: "check_subsession",
  label: "Check subsession",
  description: "Quick glance at a subsession you spawned: its current status and most recent assistant output. Use this to react to what a subsession produced. When the summary is not enough, use read_subsession to look through its full transcript.",
  parameters: CheckSubsessionParams,
  async execute(_toolCallId: string, params: unknown, _signal: AbortSignal | undefined, _onUpdate: AgentToolUpdateCallback<SubsessionCheckResult> | undefined, ctx: ExtensionContext) {
   const p = isRecord(params) ? params : {};
   const sessionId = typeof p["sessionId"] === "string" ? p["sessionId"] : "";
   const parentSessionId = ctx.sessionManager.getSessionId();
   const parentSessionFile = ctx.sessionManager.getSessionFile() ?? undefined;
   const result = await deps.check(parentSessionId, sessionId, parentSessionFile);
   const body = result.finalText === "" ? "(no output yet)" : result.finalText;
   return {
    content: [{ type: "text", text: `Subsession ${result.sessionId} [${result.status}]:\n\n${body}` }],
    details: result,
   };
  },
 };

 const readTool: ToolDefinition = {
  name: "read_subsession",
  label: "Read subsession",
  description: "Read through the transcript of a subsession you spawned.",
  parameters: ReadSubsessionParams,
  async execute(_toolCallId: string, params: unknown, _signal: AbortSignal | undefined, _onUpdate: AgentToolUpdateCallback<SubsessionReadResult> | undefined, ctx: ExtensionContext) {
   const p = isRecord(params) ? params : {};
   const sessionId = typeof p["sessionId"] === "string" ? p["sessionId"] : "";
   const query: SubsessionReadQuery = parseReadQuery(p);
   const parentSessionId = ctx.sessionManager.getSessionId();
   const parentSessionFile = ctx.sessionManager.getSessionFile() ?? undefined;
   const result = await deps.read(parentSessionId, sessionId, query, parentSessionFile);
   return {
    content: [{ type: "text", text: renderTranscript(result) }],
    details: result,
   };
  },
 };

 return [spawnTool, listTool, checkTool, readTool];
}
function parseReadQuery(p: Record<string, unknown>): SubsessionReadQuery {
 const query: SubsessionReadQuery = {};
 if (Array.isArray(p["roles"])) query.roles = p["roles"].filter(isRole);
 if (Array.isArray(p["include"])) query.include = p["include"].filter(isContentKind);
 if (typeof p["search"] === "string") query.search = p["search"];
 if (typeof p["maxChars"] === "number") query.maxChars = p["maxChars"];
 if (typeof p["includeToolArgs"] === "boolean") query.includeToolArgs = p["includeToolArgs"];
 if (typeof p["before"] === "number") query.before = p["before"];
 if (typeof p["limit"] === "number") query.limit = p["limit"];
 return query;
}

function isRole(value: unknown): value is TranscriptRole {
 return typeof value === "string" && (value === "assistant" || value === "user" || value === "tool" || value === "system" || value === "custom");
}

function isContentKind(value: unknown): value is TranscriptContentKind {
 return typeof value === "string" && (value === "text" || value === "thinking" || value === "tool_call" || value === "tool_result" || value === "image");
}
