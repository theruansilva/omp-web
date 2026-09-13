import { statSync } from "node:fs";
import { open, readFile, writeFile } from "node:fs/promises";
import { cwdPathsEqual } from "../workingDirectory.js";
import { isRecord } from "../utils.js";
import type { ActiveSession } from "./sessionRuntimeStore.js";
import type { PiAgentSession, PiSessionRuntime, PiSessionManager } from "./piAgentSession.js";

export const SUBSESSION_LINK_CUSTOM_TYPE = "omp-web.subsession.link";
export const SUBSESSION_CHILD_LINK_CUSTOM_TYPE = "omp-web.subsession.spawned";
export const SUBSESSION_NOTIFICATION_CUSTOM_TYPE = "subsession.completion";
export const SUBSESSION_NOTIFICATION_PREVIEW_CHARS = 2000;

export interface TrackedSubsessionLink {
  parentSessionId: string;
  childSessionId: string;
  childSessionFile?: string;
  parentSessionFile?: string;
  cwd?: string;
}

export interface PersistedParentSubsessionLink {
  spawnedBySessionId: string;
  spawnedSessionId: string;
  spawnedSessionFile?: string;
  cwd?: string;
}

export interface PersistedChildSubsessionLink {
  spawnedBySessionId: string;
  spawnedSessionId: string;
}

export interface SessionHeaderSummary {
  id: string;
  parentSession?: string;
}

function getString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

export function trackedSubsessionLinkFromParentLink(
  parentSessionId: string,
  link: PersistedParentSubsessionLink,
  parentSessionFile: string,
): TrackedSubsessionLink {
  return {
    parentSessionId,
    childSessionId: link.spawnedSessionId,
    ...(link.spawnedSessionFile === undefined ? {} : { childSessionFile: link.spawnedSessionFile }),
    parentSessionFile,
    ...(link.cwd === undefined ? {} : { cwd: link.cwd }),
  };
}

export function persistedParentSubsessionLinkData(link: TrackedSubsessionLink): Record<string, unknown> {
  return {
    version: 1,
    spawnedBySessionId: link.parentSessionId,
    spawnedSessionId: link.childSessionId,
    ...(link.childSessionFile === undefined ? {} : { spawnedSessionFile: link.childSessionFile }),
    ...(link.cwd === undefined ? {} : { cwd: link.cwd }),
  };
}

export function persistedChildSubsessionLinkData(parentSessionId: string, childSessionId: string): Record<string, unknown> {
  return {
    version: 1,
    spawnedBySessionId: parentSessionId,
    spawnedSessionId: childSessionId,
  };
}

export function parsePersistedParentSubsessionLink(entry: unknown): PersistedParentSubsessionLink | undefined {
  if (!isRecord(entry) || entry["type"] !== "custom" || entry["customType"] !== SUBSESSION_LINK_CUSTOM_TYPE) return undefined;
  const data = entry["data"];
  if (!isRecord(data)) return undefined;
  const spawnedBySessionId = getString(data, "spawnedBySessionId");
  const spawnedSessionId = getString(data, "spawnedSessionId");
  if (spawnedBySessionId === undefined || spawnedBySessionId === "" || spawnedSessionId === undefined || spawnedSessionId === "") return undefined;
  const spawnedSessionFile = getString(data, "spawnedSessionFile");
  const cwd = getString(data, "cwd");
  return {
    spawnedBySessionId,
    spawnedSessionId,
    ...(spawnedSessionFile === undefined || spawnedSessionFile === "" ? {} : { spawnedSessionFile }),
    ...(cwd === undefined || cwd === "" ? {} : { cwd }),
  };
}

export function parsePersistedChildSubsessionLink(entry: unknown): PersistedChildSubsessionLink | undefined {
  if (!isRecord(entry) || entry["type"] !== "custom" || entry["customType"] !== SUBSESSION_CHILD_LINK_CUSTOM_TYPE) return undefined;
  const data = entry["data"];
  if (!isRecord(data)) return undefined;
  const spawnedBySessionId = getString(data, "spawnedBySessionId");
  const spawnedSessionId = getString(data, "spawnedSessionId");
  if (spawnedBySessionId === undefined || spawnedBySessionId === "" || spawnedSessionId === undefined || spawnedSessionId === "") return undefined;
  return { spawnedBySessionId, spawnedSessionId };
}

export function nonEmptyString(value: string | undefined): string | undefined {
  return value === undefined || value === "" ? undefined : value;
}

export function subsessionHydratedParentKey(parentSessionId: string, parentSessionFile: string | undefined): string {
  return `${parentSessionId}\0${parentSessionFile ?? ""}`;
}

export function sessionPathsEqual(a: string, b: string): boolean {
  return cwdPathsEqual(a, b);
}

export function sessionFileExists(sessionFile: string | undefined): sessionFile is string {
  if (sessionFile === undefined || sessionFile === "") return false;
  try {
    return statSync(sessionFile).isFile();
  } catch {
    return false;
  }
}

export function sessionFileMatches(session: PiAgentSession, expectedSessionFile: string | undefined): boolean {
  const sessionFile = nonEmptyString(session.sessionFile);
  return sessionFile !== undefined && expectedSessionFile !== undefined && sessionPathsEqual(sessionFile, expectedSessionFile);
}

export function activeSessionFileMatches(active: ActiveSession<PiSessionRuntime>, expectedSessionFile: string | undefined): boolean {
  return sessionFileMatches(active.runtime.session, expectedSessionFile);
}

export function trackedLinkParentFileMatches(link: TrackedSubsessionLink, parentSessionFile: string): boolean {
  return link.parentSessionFile !== undefined && sessionPathsEqual(link.parentSessionFile, parentSessionFile);
}

export async function readSessionHeaderSummary(sessionFile: string): Promise<SessionHeaderSummary | undefined> {
  let file: Awaited<ReturnType<typeof open>> | undefined;
  try {
    file = await open(sessionFile, "r");
    const buffer = Buffer.alloc(4096);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    const firstLine = buffer.toString("utf8", 0, bytesRead).split("\n", 1)[0];
    if (firstLine === undefined || firstLine === "") return undefined;
    const header: unknown = JSON.parse(firstLine);
    if (!isRecord(header) || header["type"] !== "session" || typeof header["id"] !== "string") return undefined;
    const parentSession = getString(header, "parentSession");
    return { id: header["id"], ...(parentSession === undefined ? {} : { parentSession }) };
  } catch {
    return undefined;
  } finally {
    await file?.close().catch(() => undefined);
  }
}

export async function sessionFileHeaderMatches(sessionFile: string, expected: { sessionId: string; parentSessionFile?: string | undefined }): Promise<boolean> {
  const header = await readSessionHeaderSummary(sessionFile);
  if (header?.id !== expected.sessionId) return false;
  if (expected.parentSessionFile === undefined) return true;
  return header.parentSession !== undefined && sessionPathsEqual(header.parentSession, expected.parentSessionFile);
}

export async function clearParentSession(sessionFile: string): Promise<void> {
  const content = await readFile(sessionFile, "utf8");
  const newlineIndex = content.indexOf("\n");
  const firstLine = newlineIndex === -1 ? content : content.slice(0, newlineIndex);
  const rest = newlineIndex === -1 ? "" : content.slice(newlineIndex);
  const header: unknown = JSON.parse(firstLine);
  if (!isRecord(header) || header["type"] !== "session") throw new Error("Invalid session file header");
  if (header["parentSession"] === undefined) return;
  delete header["parentSession"];
  await writeFile(sessionFile, `${JSON.stringify(header)}${rest}`, "utf8");
}

export function clearParentSessionHeader(sessionManager: PiSessionManager): void {
  const header = sessionManager.getHeader?.();
  if (header !== undefined && header !== null) delete header.parentSession;
}

export function truncateForNotification(text: string): string {
  if (text.length <= SUBSESSION_NOTIFICATION_PREVIEW_CHARS) return text;
  return `${text.slice(0, SUBSESSION_NOTIFICATION_PREVIEW_CHARS)}…`;
}

export function finalAssistantText(messages: readonly unknown[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (!isRecord(message) || message["role"] !== "assistant") continue;
    const content = message["content"];
    if (typeof content === "string") return content;
    if (!Array.isArray(content)) continue;
    const texts: string[] = [];
    for (const part of content) {
      if (isRecord(part) && part["type"] === "text" && typeof part["text"] === "string") texts.push(part["text"]);
    }
    if (texts.length > 0) return texts.join("\n").trim();
  }
  return "";
}
