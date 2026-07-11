import { Type } from "typebox";
import type { Static } from "typebox";
import type { ExtensionContext, ToolDefinition } from "@oh-my-pi/pi-coding-agent";
import type { AgentToolResult, AgentToolUpdateCallback } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";

export interface SpawnSessionResult {
 sessionId: string;
 cwd: string;
}

export type SpawnSessionModel = NonNullable<ExtensionContext["model"]>;

export interface SpawnSessionInvocation {
 spawningCwd: string;
 prompt: string;
 cwd: string | undefined;
 /** Current model from the dispatching session, used as the spawned session's default. */
 model?: SpawnSessionModel;
}

export interface SpawnSessionToolDeps {
 spawn(input: SpawnSessionInvocation): Promise<SpawnSessionResult>;
}

type SpawnSessionToolDetails = SpawnSessionResult;

const SpawnSessionParams = Type.Object({
 prompt: Type.String({
  description: "The first instruction to send to the newly created session. The new session runs independently; you do not receive its output.",
 }),
 cwd: Type.Optional(Type.String({
  description: "Working directory for the new session. Must be a workspace (worktree, or root) of the same project as this session. Defaults to this session's working directory.",
 })),
});

/**
 * Custom tool that lets the LLM start a new, independent omp-web session and
 * deliver an initial prompt to it. The spawned session is a normal omp-web session
 * a human can open and interact with. The tool is constructed per-session, so it
 * carries the spawning session's cwd for project-scope validation.
 */
export function createSpawnSessionToolDefinition(spawningCwd: string, deps: SpawnSessionToolDeps) {
 const def = {
  name: "spawn_session",
  label: "Spawn session",
  description: "Start a new, independent omp-web session and send it an initial prompt. Use this to dispatch a fresh agent to continue work or follow a plan. The new session runs on its own and a human can interact with it; you do not receive its output.",
  parameters: SpawnSessionParams,
  async execute(_toolCallId: string, params: unknown, _signal: AbortSignal | undefined, _onUpdate: AgentToolUpdateCallback<SpawnSessionToolDetails> | undefined, ctx: ExtensionContext) {
   const p = params as Static<typeof SpawnSessionParams>;
   const result = await deps.spawn({
    spawningCwd,
    prompt: p.prompt,
    cwd: p.cwd,
    ...(ctx.model === undefined ? {} : { model: ctx.model }),
   });
   return {
    content: [{ type: "text", text: `Started session ${result.sessionId} in ${result.cwd}.` }],
    details: result,
   } as AgentToolResult<SpawnSessionToolDetails>;
  },
 };
 return def as unknown as ToolDefinition;
}
