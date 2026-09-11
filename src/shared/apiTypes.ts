export type MachineKind = "local" | "remote";
export type MachineStatus = "unknown" | "online" | "offline" | "error";

export const OMP_WEB_CAPABILITIES = {
 sessionsDeleteArchived: "sessions.deleteArchived",
 sessionsBulkMutations: "sessions.bulkMutations",
 sessionsCleanup: "sessions.cleanup",
 sessionsReload: "sessions.reload",
 promptAttachments: "prompt.attachments",
 workspaceFileSuggestions: "workspace.fileSuggestions",
 piPackagesManage: "piPackages.manage",
 selectedMachineSettings: "settings.selectedMachine",
} as const;

export type OmpWebCapability = typeof OMP_WEB_CAPABILITIES[keyof typeof OMP_WEB_CAPABILITIES];

export interface Machine {
 id: string;
 name: string;
 kind: MachineKind;
 baseUrl?: string;
 createdAt: string;
 updatedAt: string;
 status?: MachineStatus;
 statusMessage?: string;
}

export interface MachineHealth {
 machineId: string;
 ok: boolean;
 checkedAt: string;
 status?: MachineStatus;
 web?: OmpWebComponentStatus;
 sessiond?: OmpWebComponentStatus;
 error?: string;
}

export interface MachineRuntime {
 machineId: string;
 ok: boolean;
 checkedAt: string;
 packageName?: string;
 generatedAt?: string;
 components?: OmpWebRuntimeResponse["components"];
 capabilities?: OmpWebCapability[];
 error?: string;
}

export type OmpWebShortcutConfig = Record<string, string | null>;
export type OmpWebPluginSettings = Record<string, unknown>;
export type OmpWebPluginConfigMap = Record<string, OmpWebPluginConfig>;

export interface OmpWebPluginConfig {
 enabled?: boolean;
 settings?: OmpWebPluginSettings;
 [key: string]: unknown;
}

export interface OmpWebPathAccessConfig {
 allowedPaths?: string[];
}

export interface OmpWebUploadsConfig {
 defaultFolder?: string;
}

export interface OmpWebConfigValues {
 host?: string;
 port?: number;
 allowedHosts?: string[] | true;
 shortcuts?: OmpWebShortcutConfig;
 plugins?: OmpWebPluginConfigMap;
 /** External filesystem roots PI WEB may expose outside a workspace. */
 pathAccess?: OmpWebPathAccessConfig;
 /** Workspace-relative defaults for manual file uploads. */
 uploads?: OmpWebUploadsConfig;
 /** Maximum accepted HTTP request body size in bytes (uploads/attachments). */
 maxUploadBytes?: number;
 /** When true, LLMs can start new sessions via the spawn_session tool. */
 spawnSessions?: boolean;
 /**
  * Beta: when true, LLMs can start tracked child sessions via the
  * spawn_subsession / list_subsessions / check_subsession / read_subsession
  * tools. Off by default
  * while the capability stabilizes. Requires spawnSessions to be enabled.
  */
 subsessions?: boolean;
}

export type OmpWebPluginScope = "bundled" | "local" | "user" | "project";

export interface OmpWebPluginInfo {
 id: string;
 module: string;
 source: string;
 scope: OmpWebPluginScope;
 machineSpecific: boolean;
 enabled: boolean;
}

export interface OmpWebPluginsResponse {
 plugins: OmpWebPluginInfo[];
}

export type PiPackageScope = "user" | "project";

export interface PiPackageInfo {
 source: string;
 scope: PiPackageScope;
 filtered: boolean;
 installedPath?: string;
}

export interface PiPackagesResponse {
 packages: PiPackageInfo[];
}

export interface PiPackageInstallRequest {
 source: string;
}

export interface PiPackageRemoveRequest {
 source: string;
 /** Optional known scope from a listed package; not an install-location picker. */
 scope?: PiPackageScope;
}

export interface PiPackageUpdateRequest {
 /** Omit to update all configured Pi packages. */
 source?: string;
}

export type PiPackageMutationAction = "install" | "remove" | "update";

export interface PiPackageMutationResponse extends PiPackagesResponse {
 action: PiPackageMutationAction;
 source?: string;
 scope?: PiPackageScope;
 removed?: boolean;
}

export interface OmpWebConfigEnvOverrides {
 host: boolean;
 port: boolean;
 allowedHosts: boolean;
 spawnSessions: boolean;
 subsessions: boolean;
}

export interface OmpWebConfigResponse {
 path: string;
 exists: boolean;
 config: OmpWebConfigValues;
 effectiveConfig: OmpWebConfigValues;
 envOverrides: OmpWebConfigEnvOverrides;
}

export interface Project {
 id: string;
 name: string;
 path: string;
 createdAt: string;
}

export interface WorkspaceEffectiveConfig {
 uploads?: OmpWebUploadsConfig;
}

export interface Workspace {
 id: string;
 projectId: string;
 path: string;
 label: string;
 branch?: string;
 isMain: boolean;
 isGitRepo: boolean;
 isGitWorktree: boolean;
 /** Workspace-effective project/global settings needed by workspace UI features. */
 effectiveConfig?: WorkspaceEffectiveConfig;
}

export interface SessionRef {
 id: string;
 cwd: string;
}

export interface SessionInfo extends SessionRef {
 path: string;
 /** True when the server has verified a backing session file exists; false when known transient. */
 persisted?: boolean;
 name?: string;
 created: string;
 modified: string;
 messageCount: number;
 firstMessage: string;
 parentSessionPath?: string;
 archived?: boolean;
 archivedAt?: string;
}

export interface ArchiveSessionsResponse {
 archived: true;
 sessionIds?: string[];
 archivedCount?: number;
 skippedAlreadyArchivedCount?: number;
}

export interface SessionBulkMutationRef {
 id: string;
 cwd?: string;
}

export interface SessionBulkMutationRequest {
 sessions: SessionBulkMutationRef[];
}

export interface SessionBulkFailure {
 sessionId: string;
 error: string;
}

export interface SessionBulkArchiveResponse {
 archived: true;
 archivedSessionIds: string[];
 failures: SessionBulkFailure[];
 generatedAt: string;
}

export interface SessionBulkDeleteArchivedResponse {
 deleted: true;
 deletedSessionIds: string[];
 failures: SessionBulkFailure[];
 generatedAt: string;
}

export interface SessionCleanupRequest {
 /** Archive non-archived sessions whose modified time is older than this many days. Omit/null to disable. */
 archiveIdleDays?: number | null;
 /** Permanently delete archived sessions whose archivedAt time is older than this many days. Omit/null to disable. */
 deleteArchivedDays?: number | null;
 /** Stored cwd paths selected from a preview. Omit/null to include all discovered project/workspace paths. */
 projectCwds?: string[] | null;
}

export interface SessionCleanupThresholds {
 archiveIdleDays?: number;
 deleteArchivedDays?: number;
}

export interface SessionCleanupProjectSummary {
 cwd: string;
 archiveCount: number;
 deleteCount: number;
}

export interface SessionCleanupTotals {
 archiveCount: number;
 deleteCount: number;
}

export interface SessionCleanupPreviewResponse {
 generatedAt: string;
 thresholds: SessionCleanupThresholds;
 projects: SessionCleanupProjectSummary[];
 totals: SessionCleanupTotals;
 skippedBusySessionIds?: string[];
}

export interface SessionCleanupExecuteResponse extends SessionCleanupPreviewResponse {
 archivedSessionIds: string[];
 deletedSessionIds: string[];
}

export interface SessionActivity {
 sessionId: string;
 phase: "active" | "idle" | "error";
 label: string;
 detail?: string;
 at: string;
}

export interface QueuedSessionMessage {
 kind: "steer" | "followUp";
 text: string;
}

/**
 * A pi-native image attachment carried with a prompt. The wire format mirrors
 * pi's own `ImageContent` shape (`{ type: "image", data, mimeType }`) so these
 * attachments are compatible with native multimodal delivery after validation.
 */
export interface PromptImageAttachment {
 kind: "image";
 /** Supported image MIME type (image/png, image/jpeg, image/gif, or image/webp). */
 mimeType: string;
 /** Base64-encoded binary payload (no data: URL prefix). */
 data: string;
 /** Optional original filename, used for previews and folder-mode filenames. */
 name?: string;
}

/** A general file attachment that must be saved into the workspace before use. */
export interface PromptFileAttachment {
 kind: "file";
 /** Non-empty IANA MIME type (for example "application/pdf"). */
 mimeType: string;
 /** Base64-encoded binary payload (no data: URL prefix). Empty for zero-byte files. */
 data: string;
 /** Optional original filename, used for previews and folder-mode filenames. */
 name?: string;
}

export type PromptAttachment = PromptImageAttachment | PromptFileAttachment;

/**
 * How prompt attachments should be delivered to the session.
 * - "inline": send the binary to pi as native image content (multimodal input).
 * - "folder": save the file into the workspace and reference it from the prompt
 *   text so the agent reads it with its own tools.
 */
export type PromptAttachmentDelivery = "inline" | "folder";

export interface SavedPromptAttachment {
 /** Workspace-relative path the attachment was written to. */
 path: string;
 mimeType: string;
 size: number;
}

export interface SessionModel {
 provider?: string;
 id?: string;
 name?: string;
 contextWindow?: number;
 reasoning?: unknown;
}

// Domain type is owned by pi and re-exported from the shared thinking-levels
// module. Wire/data fields below intentionally use `string` so an unknown level
// from a newer pi runtime parses and renders gracefully instead of failing.
export type { ThinkingLevel } from "./thinkingLevels.js";

export type AuthType = "oauth" | "api_key";
export type AuthStatusSource = "stored" | "runtime" | "environment" | "fallback" | "models_json_key" | "models_json_command";

export interface AuthProviderStatus {
 configured: boolean;
 source?: AuthStatusSource;
 label?: string;
}

export interface AuthProviderOption {
 id: string;
 name: string;
 authType: AuthType;
 status: AuthProviderStatus;
}

export interface AuthProvidersResponse {
 providers: AuthProviderOption[];
}

export interface OAuthFlowState {
 flowId: string;
 providerId: string;
 providerName: string;
 status: "running" | "complete" | "error" | "cancelled";
 auth?: { url: string; instructions?: string };
 prompt?: { requestId: string; message: string; placeholder?: string; allowEmpty?: boolean; kind: "prompt" | "manual" };
 select?: { requestId: string; message: string; options: CommandOption[] };
 progress: string[];
 error?: string;
}

export interface ModelSelectionResponse {
 models: SessionModel[];
}

export interface ThinkingLevelsResponse {
 levels: string[];
}

export interface PlanModeStatus {
 enabled: boolean;
 planFilePath?: string | undefined;
 proposedPlan?: {
  planFilePath: string;
  title: string;
  planContent: string;
 } | undefined;
}

export interface AskDialogOption {
 label: string;
 description?: string;
 preview?: string;
}

export interface AskDialogQuestion {
 id: string;
 question: string;
 header?: string;
 options: AskDialogOption[];
 multi?: boolean;
 recommended?: number;
}

export interface AskDialogResultItem {
 id: string;
 question: string;
 options: string[];
 multi: boolean;
 selectedOptions: string[];
 customInput?: string;
 note?: string;
 timedOut?: boolean;
}

export interface AskDialogSubmitResult {
 kind: "submit";
 results: AskDialogResultItem[];
}

export interface AskDialogChatResult {
 kind: "chat";
}

export type AskDialogResult = AskDialogSubmitResult | AskDialogChatResult;


export interface SessionStatus {
 sessionId: string;
 /** True when the server has verified a backing session file exists; false when known transient. */
 persisted?: boolean;
 model?: SessionModel;
 thinkingLevel?: string;
 isStreaming: boolean;
 isCompacting: boolean;
 isBashRunning: boolean;
 pendingMessageCount: number;
 queuedMessages: QueuedSessionMessage[];
 messageCount?: number;
 tokens: { input: number; output: number; cacheRead: number; cacheWrite: number; total: number };
 cost: number;
 contextUsage?: { tokens: number | null; contextWindow: number; percent: number | null };
 /** Active extension status indicators (keyed by extension key, e.g. "ponytail"). */
 planMode?: PlanModeStatus | undefined;
 extensionStatuses?: Record<string, string> | undefined;
 pendingAsk?: {
  requestId: string;
  questions: AskDialogQuestion[];
 } | undefined;
}

export interface WorkspaceActivity {
 cwd: string;
 hasSessionActivity: boolean;
 hasTerminalActivity: boolean;
 updatedAt: string;
}

export interface WorkspaceActivityResponse {
 workspaces: WorkspaceActivity[];
 generatedAt: string;
}

export interface SlashCommand {
 name: string;
 description?: string;
 source: "extension" | "prompt" | "skill" | "builtin";
}

export interface FileSuggestion {
 path: string;
 kind: "tracked" | "untracked" | "other";
}

export interface FileTreeEntry {
 name: string;
 path: string;
 type: "file" | "directory" | "symlink";
 size?: number;
 modifiedAt?: string;
}

export interface FileTreeResponse {
 path: string;
 entries: FileTreeEntry[];
 scannedAt: string;
 truncated: boolean;
}

export type FileContentMediaType = "image";

export interface FileContentResponse {
 path: string;
 language?: string;
 mediaType?: FileContentMediaType;
 mimeType?: string;
 encoding: "utf8";
 size: number;
 modifiedAt: string;
 content: string;
 truncated: boolean;
 binary: boolean;
}

export interface WriteWorkspaceFileOptions {
 createDirs?: boolean;     // default: true — mkdir -p equivalent
 overwrite?: boolean;      // default: true — throw if false and file exists
}

export interface WriteWorkspaceFileResponse {
 path: string;
 size: number;
 modifiedAt: string;
 created: boolean;  // true if file was created, false if overwritten
}

export interface DeleteWorkspaceFileResponse {
 path: string;
 existed: boolean;  // true if file existed and was deleted, false if file did not exist
}

export interface MoveWorkspaceFileOptions {
 createDirs?: boolean;   // default: true — mkdir -p equivalent for target parent directory
 overwrite?: boolean;    // default: false — throw if target exists (safer default than writeFile)
}

export interface MoveWorkspaceFileResponse {
 fromPath: string;
 toPath: string;
 size: number;
 modifiedAt: string;
}

export type GitFileState = "unmodified" | "modified" | "added" | "deleted" | "renamed" | "copied" | "untracked" | "ignored" | "conflicted";

export interface GitStatusFile {
 path: string;
 oldPath?: string;
 index: GitFileState;
 workingTree: GitFileState;
}

export interface GitStatusResponse {
 isGitRepo: boolean;
 hash: string;
 branch?: string;
 upstream?: string;
 ahead?: number;
 behind?: number;
 files: GitStatusFile[];
}

export interface GitDiffResponse {
 path?: string;
 staged: boolean;
 hash: string;
 diff: string;
 truncated: boolean;
}

export interface TerminalInfo {
 id: string;
 cwd: string;
 name: string;
 createdAt: string;
 exited: boolean;
 exitCode?: number;
 commandRunId?: string;
}

export type TerminalCommandRunStatus = "queued" | "running" | "succeeded" | "failed";

export interface TerminalCommandRun {
 id: string;
 origin: string;
 projectId: string;
 workspaceId: string;
 terminalId: string;
 title: string;
 command: string;
 status: TerminalCommandRunStatus;
 exitCode?: number;
 createdAt: string;
 startedAt?: string;
 completedAt?: string;
 metadata: Record<string, string>;
}

export interface RunTerminalCommandInput {
 workspace: Workspace;
 title: string;
 command: string;
 metadata?: Record<string, string>;
 open?: boolean;
}

export interface TerminalCommandRunHandle {
 run: TerminalCommandRun;
 completed: Promise<TerminalCommandRun>;
}

export interface TerminalCommandRunFilter {
 projectId?: string;
 workspaceId?: string;
 terminalId?: string;
 statuses?: TerminalCommandRunStatus[];
 metadata?: Record<string, string>;
}

export type OmpWebServiceComponent = "web" | "sessiond";
export type OmpWebStatusSeverity = "info" | "warning" | "error";
export type OmpWebInstallationKind = "pi-package" | "npm-global" | "local" | "docker" | "unknown";
export type OmpWebDockerMode = "runtime" | "dev";

export interface OmpWebInstallationInfo {
 kind: OmpWebInstallationKind;
 path?: string;
 source?: string;
 scope?: "user" | "project";
 npmRoot?: string;
 dockerMode?: OmpWebDockerMode;
}

export interface OmpWebComponentStatus {
 component: OmpWebServiceComponent;
 label: string;
 runtimeVersion?: string;
 installedVersion?: string;
 stale: boolean;
 available: boolean;
 installation?: OmpWebInstallationInfo;
 error?: string;
}

export interface OmpWebRuntimeComponent {
 component: OmpWebServiceComponent;
 label: string;
 runtimeVersion?: string;
 available: boolean;
 capabilities: OmpWebCapability[];
 error?: string;
}

export interface OmpWebReleaseStatus {
 packageName: string;
 latestVersion?: string;
 updateAvailable: boolean;
 checkedAt?: string;
 skipped?: boolean;
 error?: string;
}

export interface OmpWebStatusMessage {
 id: string;
 severity: OmpWebStatusSeverity;
 title: string;
 body: string;
 command?: string;
}

export interface OmpWebVersionResponse {
 packageName: string;
 generatedAt: string;
 components: {
  web: OmpWebComponentStatus;
  sessiond: OmpWebComponentStatus;
 };
}

export interface OmpWebRuntimeResponse {
 packageName: string;
 generatedAt: string;
 components: {
  web: OmpWebRuntimeComponent;
  sessiond: OmpWebRuntimeComponent;
 };
 capabilities: OmpWebCapability[];
}

export interface OmpWebStatusResponse extends OmpWebVersionResponse {
 release: OmpWebReleaseStatus;
 commands: {
  update?: string;
  restart?: string;
  restartWeb?: string;
  restartSessiond?: string;
  status?: string;
 };
 messages: OmpWebStatusMessage[];
}

export type TerminalUiEvent =
 | { type: "terminal.created"; terminal: TerminalInfo }
 | { type: "terminal.exited"; terminal: TerminalInfo }
 | { type: "terminal.closed"; terminalId: string; cwd: string };

export interface WorkspaceActivityUiEvent {
 type: "workspace.activity";
 activity: WorkspaceActivity;
}

export interface CommandOption {
 value: string;
 label: string;
 description?: string;
 category?: string;
 icon?: string;
}

export interface MessagePage {
 messages: unknown[];
 start: number;
 total: number;
}

export type CommandResult =
 | { type: "done"; message?: string; session?: SessionInfo; promptDraft?: string }
 | { type: "select"; requestId: string; title: string; options: CommandOption[] }
 | { type: "unsupported"; message: string };

export type SessionUiEvent =
 | { type: "message.append"; message: unknown }
 | { type: "assistant.delta"; text: string }
 | { type: "assistant.thinking.delta"; text: string }
 | { type: "tool.start"; toolName: string; toolCallId: string; summary: string; args?: unknown }
 | { type: "tool.update"; toolName: string; toolCallId: string; text: string; content?: unknown; details?: unknown }
 | { type: "tool.end"; toolName: string; toolCallId: string; text: string; isError: boolean; content?: unknown; details?: unknown }
 | { type: "shell.start"; command: string; excludeFromContext?: boolean }
 | { type: "shell.chunk"; chunk: string }
 | { type: "shell.end"; output?: string; exitCode?: number | null; cancelled?: boolean; truncated?: boolean; fullOutputPath?: string; isError?: boolean }
 | { type: "agent.start" }
 | { type: "agent.end" }
 | { type: "message.end"; message?: unknown }
 | { type: "status.update"; status: SessionStatus }
 | { type: "activity.update"; activity: SessionActivity }
 | { type: "command.output"; level: "info" | "success" | "error"; message: string }
 | { type: "session.error"; message: string }
 | { type: "session.name"; sessionId: string; name?: string }
 | { type: "session.created"; session: SessionInfo }
 | { type: "pi.event"; eventType: string }
 | { type: "plan.proposed"; plan: { planFilePath: string; title: string; planContent: string } }
 | { type: "plan.cleared" }
 | { type: "btw.start"; question: string }
 | { type: "btw.delta"; delta: string }
 | { type: "btw.end"; question: string; answer: string; canBranch: boolean }
 | { type: "btw.error"; error: string }
 | { type: "btw.cleared" }
 | { type: "ask.requested"; requestId: string; questions: AskDialogQuestion[] }
 | { type: "ask.cleared"; requestId: string };

export type GlobalSessionEvent = Extract<SessionUiEvent, { type: "status.update" | "activity.update" | "session.name" | "session.created" }>;
export type RealtimeEvent = GlobalSessionEvent | TerminalUiEvent | WorkspaceActivityUiEvent;
