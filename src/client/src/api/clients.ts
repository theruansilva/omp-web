import type {
  ArchiveSessionsResponse,
  AskDialogResult,
  AuthProvidersResponse,
  CommandResult,
  DeleteWorkspaceFileResponse,
  FileContentResponse,
  FileSuggestion,
  FileTreeResponse,
  GitDiffResponse,
  GitStatusResponse,
  Machine,
  MachineHealth,
  MachineRuntime,
  MessagePage,
  ModelSelectionResponse,
  MoveWorkspaceFileOptions,
  MoveWorkspaceFileResponse,
  OAuthFlowState,
  OmpWebConfigResponse,
  OmpWebConfigValues,
  OmpWebPluginsResponse,
  OmpWebRuntimeResponse,
  OmpWebStatusResponse,
  PiPackageInstallRequest,
  PiPackageMutationResponse,
  PiPackageRemoveRequest,
  PiPackageScope,
  PiPackageUpdateRequest,
  PiPackagesResponse,
  Project,
  PromptAttachment,
  RunTerminalCommandInput,
  SavedPromptAttachment,
  SessionBulkArchiveResponse,
  SessionBulkDeleteArchivedResponse,
  SessionBulkMutationRef,
  SessionCleanupExecuteResponse,
  SessionCleanupPreviewResponse,
  SessionCleanupRequest,
  SessionInfo,
  SessionRef,
  SessionStatus,
  SlashCommand,
  TerminalCommandRun,
  TerminalCommandRunFilter,
  TerminalInfo,
  ThinkingLevelsResponse,
  Workspace,
  WorkspaceActivityResponse,
  WriteWorkspaceFileOptions,
  WriteWorkspaceFileResponse,
} from "../../../shared/apiTypes";
import { request } from "./http";
import { machineGitDiffUrl, messageUrl } from "./urls";
import { isRecord } from "../utils.js";

const machinePrefix = (machineId = "local") => `/api/machines/${encodeURIComponent(machineId)}`;

type SessionLookup = SessionRef | string;

function sessionId(session: SessionLookup): string {
  return typeof session === "string" ? session : session.id;
}

function sessionCwd(session: SessionLookup): string | undefined {
  return typeof session === "string" ? undefined : session.cwd;
}

function sessionBaseUrl(session: SessionLookup, machineId = "local"): string {
  return `${machinePrefix(machineId)}/sessions/${encodeURIComponent(sessionId(session))}`;
}

function sessionUrl(session: SessionLookup, endpoint: string, machineId = "local"): string {
  return `${sessionBaseUrl(session, machineId)}/${endpoint}`;
}

function sessionQueryUrl(session: SessionLookup, endpoint: string, machineId = "local"): string {
  return `${sessionUrl(session, endpoint, machineId)}${sessionQuery(session)}`;
}

function sessionBaseQueryUrl(session: SessionLookup, machineId = "local"): string {
  return `${sessionBaseUrl(session, machineId)}${sessionQuery(session)}`;
}

function sessionQuery(session: SessionLookup): string {
  const cwd = sessionCwd(session);
  return cwd === undefined || cwd === "" ? "" : `?${new URLSearchParams({ cwd }).toString()}`;
}

function sessionBody(session: SessionLookup, fields: Record<string, unknown> = {}): string {
  const cwd = sessionCwd(session);
  return JSON.stringify(cwd === undefined || cwd === "" ? fields : { cwd, ...fields });
}

function sessionBulkMutationBody(sessions: readonly SessionLookup[]): string {
  return JSON.stringify({ sessions: sessions.map(sessionBulkMutationRef) });
}

function sessionBulkMutationRef(session: SessionLookup): SessionBulkMutationRef {
  const id = sessionId(session);
  const cwd = sessionCwd(session);
  return cwd === undefined || cwd === "" ? { id } : { id, cwd };
}

export const ompWebApi = {
  ompWebStatus: (machineId = "local") =>
    request<OmpWebStatusResponse>(machineId === "local" ? "/api/omp-web/status" : `${machinePrefix(machineId)}/omp-web/status`),
  ompWebRuntime: () =>
    request<OmpWebRuntimeResponse>("/api/omp-web/runtime"),
};

export const machinesApi = {
  machines: () =>
    request<Machine[]>("/api/machines"),
  addMachine: (input: { name: string; baseUrl: string; token?: string }) =>
    request<Machine>("/api/machines", { method: "POST", body: JSON.stringify(input) }),
  deleteMachine: (machineId: string) =>
    request<{ deleted: true }>(`/api/machines/${encodeURIComponent(machineId)}`, { method: "DELETE" }),
  health: (machineId: string) =>
    request<MachineHealth>(`/api/machines/${encodeURIComponent(machineId)}/health`),
  runtime: (machineId: string) =>
    request<MachineRuntime>(`/api/machines/${encodeURIComponent(machineId)}/runtime`),
};

function configUrl(machineId?: string): string {
  return machineId === undefined ? "/api/config" : `${machinePrefix(machineId)}/config`;
}

function pluginsUrl(machineId?: string): string {
  return machineId === undefined ? "/api/plugins" : `${machinePrefix(machineId)}/plugins`;
}

export const configApi = {
  config: (machineId?: string) =>
    request<OmpWebConfigResponse>(configUrl(machineId)),
  saveConfig: (config: OmpWebConfigValues, machineId?: string) =>
    request<OmpWebConfigResponse>(configUrl(machineId), { method: "PUT", body: JSON.stringify({ config }) }),
};

export const pluginsApi = {
  plugins: (machineId?: string) =>
    request<OmpWebPluginsResponse>(pluginsUrl(machineId)),
};

function piPackageUrl(endpoint = "", machineId?: string): string {
  const baseUrl = machineId === undefined ? "/api/pi-packages" : `${machinePrefix(machineId)}/pi-packages`;
  return endpoint === "" ? baseUrl : `${baseUrl}/${endpoint}`;
}

export const piPackagesApi = {
  packages: (machineId?: string) =>
    request<PiPackagesResponse>(piPackageUrl("", machineId)),
  install: (source: string, machineId?: string) => {
    const body: PiPackageInstallRequest = { source };
    return request<PiPackageMutationResponse>(piPackageUrl("install", machineId), { method: "POST", body: JSON.stringify(body) });
  },
  remove: (source: string, scope?: PiPackageScope, machineId?: string) => {
    const body: PiPackageRemoveRequest = scope === undefined ? { source } : { source, scope };
    return request<PiPackageMutationResponse>(piPackageUrl("remove", machineId), { method: "POST", body: JSON.stringify(body) });
  },
  update: (source?: string, machineId?: string) => {
    const body: PiPackageUpdateRequest | undefined = source === undefined ? undefined : { source };
    return request<PiPackageMutationResponse>(piPackageUrl("update", machineId), { method: "POST", ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  },
};

export const activityApi = {
  workspaceActivity: (machineId = "local") =>
    request<WorkspaceActivityResponse>(`${machinePrefix(machineId)}/activity`),
};

export const projectsApi = {
  projects: (machineId = "local") =>
    request<Project[]>(`${machinePrefix(machineId)}/projects`),
  addProject: (path: string, name?: string, create?: boolean, machineId = "local") =>
    request<Project>(`${machinePrefix(machineId)}/projects`, { method: "POST", body: JSON.stringify({ path, name, create }) }),
  closeProject: (projectId: string, machineId = "local") =>
    request<{ closed: true }>(`${machinePrefix(machineId)}/projects/${encodeURIComponent(projectId)}`, { method: "DELETE" }),
  projectDirectories: (query: string, machineId = "local") =>
    request<FileSuggestion[]>(`${machinePrefix(machineId)}/project-directories?q=${encodeURIComponent(query)}`),
};

export const workspacesApi = {
  workspaces: (projectId: string, machineId = "local") =>
    request<Workspace[]>(`${machinePrefix(machineId)}/projects/${projectId}/workspaces`),
  deleteWorkspace: (projectId: string, workspaceId: string, machineId = "local") =>
    request<TerminalCommandRun>(`${machinePrefix(machineId)}/projects/${encodeURIComponent(projectId)}/workspaces/${encodeURIComponent(workspaceId)}`, { method: "DELETE" }),
  workspaceTree: (projectId: string, workspaceId: string, path = "", machineId = "local") =>
    request<FileTreeResponse>(`${machinePrefix(machineId)}/projects/${encodeURIComponent(projectId)}/workspaces/${encodeURIComponent(workspaceId)}/tree?path=${encodeURIComponent(path)}`),
  workspaceFile: (projectId: string, workspaceId: string, path: string, machineId = "local") =>
    request<FileContentResponse>(`${machinePrefix(machineId)}/projects/${encodeURIComponent(projectId)}/workspaces/${encodeURIComponent(workspaceId)}/file?path=${encodeURIComponent(path)}`),
  writeWorkspaceFile: (projectId: string, workspaceId: string, path: string, content: string | Uint8Array, options?: WriteWorkspaceFileOptions, machineId = "local") => {
    const params = new URLSearchParams({ path });
    if (options?.createDirs === false) params.set("createDirs", "false");
    if (options?.overwrite === false) params.set("overwrite", "false");
    const isBinary = content instanceof Uint8Array;
    const body: BodyInit = isBinary ? new Uint8Array(content) : new TextEncoder().encode(content);
    return request<WriteWorkspaceFileResponse>(
      `${machinePrefix(machineId)}/projects/${encodeURIComponent(projectId)}/workspaces/${encodeURIComponent(workspaceId)}/file?${params.toString()}`,
      { method: "PUT", body, headers: { "Content-Type": isBinary ? "application/octet-stream" : "text/plain" } },
    );
  },
  deleteWorkspaceFile: (projectId: string, workspaceId: string, path: string, machineId = "local"): Promise<DeleteWorkspaceFileResponse> => {
    const params = new URLSearchParams({ path });
    return request<DeleteWorkspaceFileResponse>(`${machinePrefix(machineId)}/projects/${encodeURIComponent(projectId)}/workspaces/${encodeURIComponent(workspaceId)}/file?${params.toString()}`, { method: "DELETE" });
  },
  moveWorkspaceFile: (projectId: string, workspaceId: string, fromPath: string, toPath: string, options?: MoveWorkspaceFileOptions, machineId = "local") => {
    const params = new URLSearchParams({ fromPath, toPath });
    if (options?.createDirs === false) params.set("createDirs", "false");
    if (options?.overwrite === true) params.set("overwrite", "true");
    return request<MoveWorkspaceFileResponse>(
      `${machinePrefix(machineId)}/projects/${encodeURIComponent(projectId)}/workspaces/${encodeURIComponent(workspaceId)}/file/move?${params.toString()}`,
      { method: "POST" },
    );
  },
};

export const sessionsApi = {
  sessions: (cwd: string, machineId = "local") =>
    request<SessionInfo[]>(`${machinePrefix(machineId)}/sessions?cwd=${encodeURIComponent(cwd)}`),
  startSession: (cwd: string, machineId = "local") =>
    request<SessionInfo>(`${machinePrefix(machineId)}/sessions`, { method: "POST", body: JSON.stringify({ cwd }) }),
  cleanupPreview: (input: SessionCleanupRequest, machineId = "local") =>
    request<SessionCleanupPreviewResponse>(`${machinePrefix(machineId)}/sessions/cleanup/preview`, { method: "POST", body: JSON.stringify(input) }),
  cleanup: (input: SessionCleanupRequest, machineId = "local") =>
    request<SessionCleanupExecuteResponse>(`${machinePrefix(machineId)}/sessions/cleanup`, { method: "POST", body: JSON.stringify(input) }),
  archiveMany: (sessions: readonly SessionLookup[], machineId = "local") =>
    request<SessionBulkArchiveResponse>(`${machinePrefix(machineId)}/sessions/bulk/archive`, { method: "POST", body: sessionBulkMutationBody(sessions) }),
  deleteArchivedMany: (sessions: readonly SessionLookup[], machineId = "local") =>
    request<SessionBulkDeleteArchivedResponse>(`${machinePrefix(machineId)}/sessions/bulk/delete-archived`, { method: "POST", body: sessionBulkMutationBody(sessions) }),
  messages: (session: SessionLookup, options?: { limit?: number; before?: number }, machineId = "local") =>
    request<MessagePage>(messageUrl(session, options, machineId)),
  status: (session: SessionLookup, machineId = "local") =>
    request<SessionStatus>(sessionQueryUrl(session, "status", machineId)),
  models: (session: SessionLookup, machineId = "local") =>
    request<ModelSelectionResponse>(sessionQueryUrl(session, "models", machineId)),
  setModel: (session: SessionLookup, provider: string, modelId: string, persistOrMachineId?: boolean | string, machineId?: string) => {
    const persist = typeof persistOrMachineId === "boolean" ? persistOrMachineId : undefined;
    const effectiveMachineId = typeof persistOrMachineId === "string" ? persistOrMachineId : (machineId ?? "local");
    return request<SessionStatus>(sessionUrl(session, "model", effectiveMachineId), { method: "POST", body: sessionBody(session, { provider, modelId, ...(persist === true ? { persist: true } : {}) }) });
  },
  cycleModel: (session: SessionLookup, direction: "forward" | "backward", machineId = "local") =>
    request<SessionStatus>(sessionUrl(session, "model/cycle", machineId), { method: "POST", body: sessionBody(session, { direction }) }),
  thinkingLevels: (session: SessionLookup, machineId = "local") =>
    request<ThinkingLevelsResponse>(sessionQueryUrl(session, "thinking-levels", machineId)),
  setThinkingLevel: (session: SessionLookup, level: string, machineId = "local") =>
    request<SessionStatus>(sessionUrl(session, "thinking-level", machineId), { method: "POST", body: sessionBody(session, { level }) }),
  cycleThinkingLevel: (session: SessionLookup, machineId = "local") =>
    request<SessionStatus>(sessionUrl(session, "thinking-level/cycle", machineId), { method: "POST", body: sessionBody(session) }),
  commands: (session: SessionLookup, machineId = "local") =>
    request<SlashCommand[]>(sessionQueryUrl(session, "commands", machineId)),
  prompt: (session: SessionLookup, text: string, streamingBehavior?: "steer" | "followUp", machineId = "local", attachments?: PromptAttachment[]) =>
    request<{ accepted: true }>(sessionUrl(session, "prompt", machineId), { method: "POST", body: sessionBody(session, { text, ...(streamingBehavior === undefined ? {} : { streamingBehavior }), ...(attachments !== undefined && attachments.length > 0 ? { attachments } : {}) }) }),
  saveAttachments: (session: SessionLookup, attachments: PromptAttachment[], machineId = "local", folder?: string) =>
    request<SavedPromptAttachment[]>(sessionUrl(session, "attachments", machineId), { method: "POST", body: sessionBody(session, { attachments, ...(folder === undefined ? {} : { folder }) }) }),
  shell: (session: SessionLookup, text: string, machineId = "local") =>
    request<{ accepted: true }>(sessionUrl(session, "shell", machineId), { method: "POST", body: sessionBody(session, { text }) }),
  runCommand: (session: SessionLookup, text: string, machineId = "local") =>
    request<CommandResult>(sessionUrl(session, "commands/run", machineId), { method: "POST", body: sessionBody(session, { text }) }),
  respondToCommand: (session: SessionLookup, requestId: string, value: string, machineId = "local") =>
    request<CommandResult>(sessionUrl(session, "commands/respond", machineId), { method: "POST", body: sessionBody(session, { requestId, value }) }),
  respondToAsk: (session: SessionLookup, requestId: string, result: AskDialogResult | undefined, machineId = "local") =>
    request<{ ok: true }>(sessionUrl(session, "ask/respond", machineId), { method: "POST", body: sessionBody(session, { requestId, result }) }),
  abort: (session: SessionLookup, machineId = "local") =>
    request<{ aborted: true }>(sessionUrl(session, "abort", machineId), { method: "POST", body: sessionBody(session) }),
  stop: (session: SessionLookup, machineId = "local") =>
    request<{ stopped: true }>(sessionUrl(session, "stop", machineId), { method: "POST", body: sessionBody(session) }),
  archive: (session: SessionLookup, machineId = "local") =>
    request<ArchiveSessionsResponse>(sessionUrl(session, "archive", machineId), { method: "POST", body: sessionBody(session) }),
  archiveWithDescendants: (session: SessionLookup, machineId = "local") =>
    request<ArchiveSessionsResponse>(sessionUrl(session, "archive-tree", machineId), { method: "POST", body: sessionBody(session) }),
  restore: (session: SessionLookup, machineId = "local") =>
    request<{ restored: true }>(sessionUrl(session, "restore", machineId), { method: "POST", body: sessionBody(session) }),
  deleteArchived: (session: SessionLookup, machineId = "local") =>
    request<{ deleted: true }>(sessionBaseQueryUrl(session, machineId), { method: "DELETE" }),
  detachParent: (session: SessionLookup, machineId = "local") =>
    request<{ detached: true }>(sessionUrl(session, "detach-parent", machineId), { method: "POST", body: sessionBody(session) }),
  reloadSession: (session: SessionLookup, machineId = "local") =>
    request<{ reloaded: true }>(sessionUrl(session, "reload", machineId), { method: "POST", body: sessionBody(session) }),
  authProviders: (options?: { mode?: "login" | "logout"; authType?: "oauth" | "api_key"; machineId?: string }) => {
    const params = new URLSearchParams();
    if (options?.mode !== undefined) params.set("mode", options.mode);
    if (options?.authType !== undefined) params.set("authType", options.authType);
    const query = params.toString();
    return request<AuthProvidersResponse>(`${machinePrefix(options?.machineId)}/auth/providers${query === "" ? "" : `?${query}`}`);
  },
  saveApiKey: (providerId: string, key: string, machineId = "local") =>
    request<{ accepted: true }>(`${machinePrefix(machineId)}/auth/api-key`, { method: "POST", body: JSON.stringify({ providerId, key }) }),
  logoutProvider: (providerId: string, machineId = "local") =>
    request<{ accepted: true }>(`${machinePrefix(machineId)}/auth/logout`, { method: "POST", body: JSON.stringify({ providerId }) }),
  startOAuthLogin: (providerId: string, machineId = "local") =>
    request<OAuthFlowState>(`${machinePrefix(machineId)}/auth/oauth`, { method: "POST", body: JSON.stringify({ providerId }) }),
  oauthFlow: (flowId: string, machineId = "local") =>
    request<OAuthFlowState>(`${machinePrefix(machineId)}/auth/oauth/${encodeURIComponent(flowId)}`),
  respondOAuthFlow: (flowId: string, requestId: string, value: string, machineId = "local") =>
    request<OAuthFlowState>(`${machinePrefix(machineId)}/auth/oauth/${encodeURIComponent(flowId)}/respond`, { method: "POST", body: JSON.stringify({ requestId, value }) }),
  cancelOAuthFlow: (flowId: string, machineId = "local") =>
    request<OAuthFlowState>(`${machinePrefix(machineId)}/auth/oauth/${encodeURIComponent(flowId)}/cancel`, { method: "POST" }),
};

export const terminalsApi = {
  terminals: (projectId: string, workspaceId: string, machineId = "local") =>
    request<TerminalInfo[]>(`${machinePrefix(machineId)}/projects/${encodeURIComponent(projectId)}/workspaces/${encodeURIComponent(workspaceId)}/terminals`),
  startTerminal: (projectId: string, workspaceId: string, options?: { name?: string; cols?: number; rows?: number }, machineId = "local") =>
    request<TerminalInfo>(`${machinePrefix(machineId)}/projects/${encodeURIComponent(projectId)}/workspaces/${encodeURIComponent(workspaceId)}/terminals`, { method: "POST", body: JSON.stringify(options ?? {}) }),
  closeWorkspaceTerminals: (projectId: string, workspaceId: string, machineId = "local") =>
    request<{ closed: true }>(`${machinePrefix(machineId)}/projects/${encodeURIComponent(projectId)}/workspaces/${encodeURIComponent(workspaceId)}/terminals`, { method: "DELETE" }),
  closeTerminal: (projectId: string, workspaceId: string, terminalId: string, machineId = "local") =>
    request<{ closed: true }>(`${machinePrefix(machineId)}/projects/${encodeURIComponent(projectId)}/workspaces/${encodeURIComponent(workspaceId)}/terminals/${encodeURIComponent(terminalId)}`, { method: "DELETE" }),
  continueTerminal: (projectId: string, workspaceId: string, terminalId: string, machineId = "local") =>
    request<TerminalInfo>(`${machinePrefix(machineId)}/projects/${encodeURIComponent(projectId)}/workspaces/${encodeURIComponent(workspaceId)}/terminals/${encodeURIComponent(terminalId)}/continue`, { method: "POST" }),
  runTerminalCommand: (origin: string, input: RunTerminalCommandInput, machineId = "local") =>
    request<TerminalCommandRun>(`${machinePrefix(machineId)}/projects/${encodeURIComponent(input.workspace.projectId)}/workspaces/${encodeURIComponent(input.workspace.id)}/terminal-command-runs`, { method: "POST", body: JSON.stringify({ origin, title: input.title, command: input.command, metadata: input.metadata ?? {} }) }),
  listCommandRuns: (filter?: TerminalCommandRunFilter, machineId = "local") =>
    request<TerminalCommandRun[]>(`${machinePrefix(machineId)}/terminal-command-runs${terminalCommandRunFilterQuery(filter)}`),
  getCommandRun: (runId: string, machineId = "local") => getOptionalTerminalCommandRun(runId, machineId),
  cancelCommandRun: (runId: string, machineId = "local") =>
    request<TerminalCommandRun>(`${machinePrefix(machineId)}/terminal-command-runs/${encodeURIComponent(runId)}/cancel`, { method: "POST" }),
};

async function getOptionalTerminalCommandRun(runId: string, machineId: string): Promise<TerminalCommandRun | undefined> {
  const response = await fetch(`${machinePrefix(machineId)}/terminal-command-runs/${encodeURIComponent(runId)}`);
  if (response.status === 404) return undefined;
  if (!response.ok) {
    const body: unknown = await response.json().catch((): unknown => ({}));
    throw new Error(apiErrorMessage(body) ?? response.statusText);
  }
  return (await response.json()) as TerminalCommandRun;
}

function terminalCommandRunFilterQuery(filter: TerminalCommandRunFilter | undefined): string {
  if (filter === undefined) return "";
  const params = new URLSearchParams();
  if (filter.projectId !== undefined) params.set("projectId", filter.projectId);
  if (filter.workspaceId !== undefined) params.set("workspaceId", filter.workspaceId);
  if (filter.terminalId !== undefined) params.set("terminalId", filter.terminalId);
  if (filter.statuses !== undefined && filter.statuses.length > 0) params.set("statuses", filter.statuses.join(","));
  if (filter.metadata !== undefined && Object.keys(filter.metadata).length > 0) params.set("metadata", JSON.stringify(filter.metadata));
  const query = params.toString();
  return query === "" ? "" : `?${query}`;
}

function apiErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  const error = value["error"];
  return typeof error === "string" ? error : undefined;
}

export interface FileSuggestionQueryOptions {
  kind?: FileSuggestion["kind"] | undefined;
  mode?: "file" | "path" | undefined;
  scope?: "tracked" | "all" | undefined;
  machineId?: string | undefined;
  projectId?: string | undefined;
  workspaceId?: string | undefined;
  workspaceScoped?: boolean | undefined;
}

export const filesApi = {
  files: (cwd: string, query: string, options: FileSuggestionQueryOptions = {}) => {
    const params = new URLSearchParams({ q: query });
    if (options.kind !== undefined) params.set("kind", options.kind);
    if (options.mode !== undefined) params.set("mode", options.mode);
    if (options.scope !== undefined) params.set("scope", options.scope);
    if (options.workspaceScoped === true && options.projectId !== undefined && options.workspaceId !== undefined) {
      return request<FileSuggestion[]>(`${machinePrefix(options.machineId)}/projects/${encodeURIComponent(options.projectId)}/workspaces/${encodeURIComponent(options.workspaceId)}/files?${params.toString()}`);
    }
    params.set("cwd", cwd);
    return request<FileSuggestion[]>(`${machinePrefix(options.machineId)}/files?${params.toString()}`);
  },
};

export const gitApi = {
  gitStatus: (projectId: string, workspaceId: string, machineId = "local") =>
    request<GitStatusResponse>(`${machinePrefix(machineId)}/projects/${encodeURIComponent(projectId)}/workspaces/${encodeURIComponent(workspaceId)}/git/status`),
  gitDiff: (projectId: string, workspaceId: string, options?: { path?: string; staged?: boolean }, machineId = "local") =>
    request<GitDiffResponse>(machineGitDiffUrl(machineId, projectId, workspaceId, options)),
};

export const api = {
  ...ompWebApi,
  ...machinesApi,
  ...configApi,
  ...pluginsApi,
  ...piPackagesApi,
  ...activityApi,
  ...projectsApi,
  ...workspacesApi,
  ...sessionsApi,
  ...terminalsApi,
  ...filesApi,
  ...gitApi,
};
