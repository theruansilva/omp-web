import type {
  ClientSession,
  ClientSessionCleanupPreviewResponse,
  ClientSessionModel,
  ClientSessionRef,
} from "../types.js";
import type { SessionBulkMutationRef } from "../../shared/apiTypes.js";
import type { SessionArchiveTreeCandidate } from "./sessionArchiveTree.js";
import type { ArchivedSessionRecord, ArchiveSessionInput } from "./sessionArchiveStore.js";
import type { SessionCleanupPlan } from "./sessionCleanup.js";
import type { PiAgentSession } from "./piAgentSession.js";
import { isRecord } from "../utils.js";

export type PiSessionLookup = string | ClientSessionRef;

export interface PiSessionListEntry {
  id: string;
  path: string;
  cwd: string;
  created: Date;
  modified: Date;
  messageCount: number;
  firstMessage: string;
  allMessagesText: string;
  name?: string;
  title?: string;
  parentSessionPath?: string;
}

export interface WorkspaceArchiveCandidate extends SessionArchiveTreeCandidate {
  cwd: string;
  listEntry?: PiSessionListEntry;
  activeSession?: PiAgentSession;
}

export interface BulkSessionLookupContext {
  sessionsByCwd: Map<string, PiSessionListEntry[]>;
  allSessions?: readonly PiSessionListEntry[];
}

export interface BulkArchivePlanItem {
  input: ArchiveSessionInput;
  activeSession?: PiAgentSession;
}

export interface BulkDeletePlanItem {
  record: ArchivedSessionRecord;
}

export function previewResponseFromPlan(plan: SessionCleanupPlan): ClientSessionCleanupPreviewResponse {
  return {
    generatedAt: plan.generatedAt,
    thresholds: plan.thresholds,
    projects: plan.projects,
    totals: plan.totals,
    ...(plan.skippedBusySessionIds.length === 0 ? {} : { skippedBusySessionIds: plan.skippedBusySessionIds }),
  };
}

export function uniqueBulkSessionRefs(refs: readonly SessionBulkMutationRef[]): SessionBulkMutationRef[] {
  const seen = new Set<string>();
  const unique: SessionBulkMutationRef[] = [];
  for (const ref of refs) {
    const key = `${ref.cwd ?? ""}\0${ref.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(ref);
  }
  return unique;
}

export function bulkRefToLookup(ref: SessionBulkMutationRef): PiSessionLookup {
  return ref.cwd === undefined ? ref.id : { id: ref.id, cwd: ref.cwd };
}

export function findArchivedRecordForBulkRef(records: readonly ArchivedSessionRecord[], ref: SessionBulkMutationRef): ArchivedSessionRecord | undefined {
  return records.find((record) => (ref.cwd === undefined || record.cwd === ref.cwd) && (record.sessionId === ref.id || record.sessionId.startsWith(ref.id)));
}

export function findListedSessionForBulkRef(context: BulkSessionLookupContext, ref: SessionBulkMutationRef): PiSessionListEntry | undefined {
  if (ref.cwd !== undefined) return findSessionByIdOrPrefix(context.sessionsByCwd.get(ref.cwd) ?? [], ref.id);
  return context.allSessions === undefined ? undefined : findSessionByIdOrPrefix(context.allSessions, ref.id);
}

export function findSessionByIdOrPrefix(sessions: readonly PiSessionListEntry[], sessionId: string): PiSessionListEntry | undefined {
  return sessions.find((session) => session.id === sessionId) ?? sessions.find((session) => session.id.startsWith(sessionId));
}

export function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export function modelToClientModel(model: PiAgentSession["model"]): ClientSessionModel {
  if (model === undefined) return {};
  const name = isRecord(model) && typeof model["name"] === "string" ? model["name"] : undefined;
  const reasoning = isRecord(model) ? model["reasoning"] : undefined;
  return {
    provider: model.provider,
    id: model.id,
    ...(name === undefined ? {} : { name }),
    ...(model.contextWindow === null ? {} : { contextWindow: model.contextWindow }),
    ...(reasoning === undefined ? {} : { reasoning }),
  };
}

export function clientSessionFromListEntry(session: PiSessionListEntry): ClientSession {
  const name = session.name ?? session.title;
  return {
    id: session.id,
    path: session.path,
    cwd: session.cwd,
    persisted: true,
    ...(name === undefined || name === "" ? {} : { name }),
    created: session.created.toISOString(),
    modified: session.modified.toISOString(),
    messageCount: session.messageCount,
    firstMessage: session.firstMessage,
    ...(session.parentSessionPath === undefined ? {} : { parentSessionPath: session.parentSessionPath }),
  };
}

export function archiveInputFromListEntry(session: PiSessionListEntry): ArchiveSessionInput {
  const name = session.name ?? session.title;
  return {
    sessionId: session.id,
    cwd: session.cwd,
    path: session.path,
    created: session.created.toISOString(),
    modified: session.modified.toISOString(),
    messageCount: session.messageCount,
    firstMessage: session.firstMessage,
    ...(name === undefined || name === "" ? {} : { name }),
    ...(session.parentSessionPath === undefined ? {} : { parentSessionPath: session.parentSessionPath }),
  };
}

export function archiveInputFromActiveSession(session: PiAgentSession): ArchiveSessionInput {
  const sessionFile = session.sessionFile;
  if (sessionFile === undefined || sessionFile === "") throw new Error("Session is not persisted");
  const parentSessionPath = session.sessionManager.getHeader?.()?.parentSession;
  return {
    sessionId: session.sessionId,
    cwd: session.sessionManager.getCwd(),
    path: sessionFile,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    messageCount: session.messages.length,
    firstMessage: "",
    ...(session.sessionName === undefined ? {} : { name: session.sessionName }),
    ...(parentSessionPath === undefined ? {} : { parentSessionPath }),
  };
}

export function archiveCandidateFromListEntry(session: PiSessionListEntry): WorkspaceArchiveCandidate {
  return {
    id: session.id,
    path: session.path,
    cwd: session.cwd,
    archived: false,
    listEntry: session,
    ...(session.parentSessionPath === undefined ? {} : { parentSessionPath: session.parentSessionPath }),
  };
}

export function archiveCandidateFromArchivedRecord(record: ArchivedSessionRecord, fallback: PiSessionListEntry | undefined): WorkspaceArchiveCandidate | undefined {
  const path = record.originalPath ?? fallback?.path;
  if (path === undefined) return undefined;
  const parentSessionPath = record.parentSessionPath ?? fallback?.parentSessionPath;
  return {
    id: record.sessionId,
    path,
    cwd: record.cwd,
    archived: true,
    ...(fallback === undefined ? {} : { listEntry: fallback }),
    ...(parentSessionPath === undefined ? {} : { parentSessionPath }),
  };
}

export function archiveCandidateFromActiveSession(session: PiAgentSession, archived: boolean): WorkspaceArchiveCandidate {
  const sessionFile = session.sessionFile;
  if (sessionFile === undefined || sessionFile === "") throw new Error("Session is not persisted");
  const parentSessionPath = session.sessionManager.getHeader?.()?.parentSession;
  return {
    id: session.sessionId,
    path: sessionFile,
    cwd: session.sessionManager.getCwd(),
    archived,
    activeSession: session,
    ...(parentSessionPath === undefined ? {} : { parentSessionPath }),
  };
}

export function archiveInputFromCandidate(candidate: WorkspaceArchiveCandidate): ArchiveSessionInput {
  if (candidate.listEntry !== undefined) return archiveInputFromListEntry(candidate.listEntry);
  if (candidate.activeSession !== undefined) return archiveInputFromActiveSession(candidate.activeSession);
  throw new Error(`Session is not available for archiving: ${candidate.id}`);
}

export function sessionHasActiveWork(session: PiAgentSession, extraQueuedMessageCount = 0): boolean {
  return session.isStreaming || session.isCompacting || session.isBashRunning || session.pendingMessageCount + extraQueuedMessageCount > 0;
}

export function clientSessionFromArchivedRecord(record: ArchivedSessionRecord, fallback: PiSessionListEntry | undefined): ClientSession | undefined {
  const path = record.originalPath ?? fallback?.path;
  const created = record.created ?? fallback?.created.toISOString();
  const modified = record.modified ?? fallback?.modified.toISOString();
  const messageCount = record.messageCount ?? fallback?.messageCount;
  const firstMessage = record.firstMessage ?? fallback?.firstMessage;
  if (path === undefined || created === undefined || modified === undefined || messageCount === undefined || firstMessage === undefined) return undefined;
  const name = record.name ?? fallback?.name ?? fallback?.title;
  const parentSessionPath = record.parentSessionPath ?? fallback?.parentSessionPath;
  return {
    id: record.sessionId,
    path,
    cwd: record.cwd,
    ...(name === undefined ? {} : { name }),
    created,
    modified,
    messageCount,
    firstMessage,
    ...(parentSessionPath === undefined ? {} : { parentSessionPath }),
    archived: true,
    archivedAt: record.archivedAt,
  };
}

export function addSessionName(names: Set<string>, name: string | undefined): void {
  const trimmed = name?.replace(/\s+/g, " ").trim();
  if (trimmed !== undefined && trimmed !== "") names.add(trimmed);
}

export function compareArchivedRecords(a: ArchivedSessionRecord, b: ArchivedSessionRecord): number {
  return archivedTimestamp(b) - archivedTimestamp(a);
}

export function archivedTimestamp(record: ArchivedSessionRecord): number {
  const time = Date.parse(record.archivedAt);
  return Number.isNaN(time) ? 0 : time;
}

export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
