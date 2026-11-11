import { randomUUID } from "node:crypto";
import { constants, createReadStream, createWriteStream } from "node:fs";
import { access, copyFile, cp, mkdir, readFile, rename, rm, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { homedir } from "node:os";
import { createGzip, createGunzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { getAgentDir } from "@oh-my-pi/pi-coding-agent";
import { canonicalizeStoredCwd } from "../workingDirectory.js";
import { isRecord, isNodeErrorWithCode } from "../utils.js";
export interface ArchiveSessionInput {
  sessionId: string;
  cwd: string;
  path: string;
  created: string;
  modified: string;
  messageCount: number;
  firstMessage: string;
  name?: string;
  parentSessionPath?: string;
}

export interface ArchivedSessionRecord {
  sessionId: string;
  cwd: string;
  archivedAt: string;
  originalPath?: string;
  archivePath?: string;
  created?: string;
  modified?: string;
  messageCount?: number;
  firstMessage?: string;
  name?: string;
  parentSessionPath?: string;
}

interface ArchiveFile {
  sessions: ArchivedSessionRecord[];
}
export function defaultSessionArchiveDir(agentDir = getAgentDir()): string {
  return join(agentDir, "archive", "sessions");
}

export function defaultSessionArchiveFilePath(agentDir = getAgentDir()): string {
  return join(agentDir, "archive", "archived-sessions.json");
}

export class SessionArchiveStore {
  private operationQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly filePath = defaultSessionArchiveFilePath(),
    private readonly archiveDir = defaultSessionArchiveDir(),
  ) {}

  async list(): Promise<ArchivedSessionRecord[]> {
    return (await this.read()).sessions;
  }

  async get(sessionId: string): Promise<ArchivedSessionRecord | undefined> {
    const sessions = (await this.read()).sessions;
    return sessions.find((session) => session.sessionId === sessionId) ?? sessions.find((session) => session.sessionId.startsWith(sessionId));
  }

  async archive(session: ArchiveSessionInput): Promise<ArchivedSessionRecord> {
    const [record] = await this.archiveMany([session]);
    if (record === undefined) throw new Error("Archive operation did not produce a record");
    return record;
  }

  async archiveMany(sessions: readonly ArchiveSessionInput[]): Promise<ArchivedSessionRecord[]> {
    if (sessions.length === 0) return [];
    return this.exclusive(async () => {
      const data = await this.read();
      const records: ArchivedSessionRecord[] = [];
      const filesToRemove: { source: string; archivePath: string }[] = [];

      for (const session of sessions) {
        const existingIndex = data.sessions.findIndex((record) => record.sessionId === session.sessionId);
        const existing = existingIndex === -1 ? undefined : data.sessions[existingIndex];
        const archivePath = existing?.archivePath ?? this.archivePathFor(session);
        const record = archiveRecordFromInput(session, {
          archivedAt: existing?.archivedAt ?? new Date().toISOString(),
          originalPath: existing?.originalPath ?? session.path,
          archivePath,
        });

        await copySessionFileToArchive(session.path, archivePath);

        if (existingIndex === -1) data.sessions.push(record);
        else data.sessions[existingIndex] = record;
        records.push(record);
        filesToRemove.push({ source: session.path, archivePath });
      }

      await this.write(data);
      for (const file of filesToRemove) await removeActiveSessionFile(file.source, file.archivePath);
      return records;
    });
  }

  async restore(sessionId: string): Promise<void> {
    await this.exclusive(async () => {
      const data = await this.read();
      const record = data.sessions.find((session) => session.sessionId === sessionId);
      if (record === undefined) return;

      if (record.archivePath !== undefined && record.originalPath !== undefined) {
        await restoreSessionFile(record.archivePath, record.originalPath);
      }

      const sessions = data.sessions.filter((session) => session.sessionId !== sessionId);
      await this.write({ sessions });
    });
  }

  async deleteArchived(sessionId: string): Promise<void> {
    await this.deleteArchivedMany([sessionId]);
  }

  async deleteArchivedMany(sessionIds: readonly string[]): Promise<string[]> {
    const targetIds = uniqueStrings(sessionIds);
    if (targetIds.length === 0) return [];
    return this.exclusive(async () => {
      const data = await this.read();
      const targetIdSet = new Set(targetIds);
      const records = data.sessions.filter((session) => targetIdSet.has(session.sessionId));
      if (records.length === 0) return [];

      for (const record of records) {
        if (record.archivePath !== undefined && await pathExists(record.archivePath)) {
          await unlink(record.archivePath);
          const artifacts = sessionArtifactsPath(record.archivePath);
          if (await pathExists(artifacts)) {
            await rm(artifacts, { recursive: true, force: true });
          }
        }
      }
      const sessions = data.sessions.filter((session) => !targetIdSet.has(session.sessionId));
      await this.write({ sessions });
      const deletedIds = new Set(records.map((record) => record.sessionId));
      return targetIds.filter((sessionId) => deletedIds.has(sessionId));
    });
  }

  async isArchived(sessionId: string): Promise<boolean> {
    return (await this.get(sessionId)) !== undefined;
  }

  private archivePathFor(session: ArchiveSessionInput): string {
    const sourceName = basename(session.path);
    const base = sourceName === "" ? `${safeFileName(session.sessionId)}.jsonl` : sourceName;
    const fileName = base.endsWith(".gz") ? base : `${base}.gz`;
    return join(this.archiveDir, fileName);
  }

  private async exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.operationQueue;
    let release = (): void => undefined;
    this.operationQueue = new Promise<void>((resolve) => { release = resolve; });
    await previous.catch(() => undefined);
    try {
      return await operation();
    } finally {
      release();
    }
  }

  private async read(): Promise<ArchiveFile> {
    try {
      const value: unknown = JSON.parse(await readFile(this.filePath, "utf8"));
      return parseArchiveFile(value);
    } catch (error: unknown) {
      if (isNodeErrorWithCode(error, "ENOENT")) {
        if (this.filePath === defaultSessionArchiveFilePath()) {
          const legacyPath = join(homedir(), ".omp-web", "archived-sessions.json");
          if (await pathExists(legacyPath)) {
            try {
              const legacyValue: unknown = JSON.parse(await readFile(legacyPath, "utf8"));
              return parseArchiveFile(legacyValue);
            } catch {
              return { sessions: [] };
            }
          }
        }
        return { sessions: [] };
      }
      throw error;
    }
  }

  private async write(data: ArchiveFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tempPath = join(dirname(this.filePath), `.${basename(this.filePath)}.${String(process.pid)}.${Date.now().toString()}.${randomUUID()}.tmp`);
    try {
      await writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
      await rename(tempPath, this.filePath);
    } catch (error: unknown) {
      await unlink(tempPath).catch(() => undefined);
      throw error;
    }
  }
}

function archiveRecordFromInput(session: ArchiveSessionInput, archive: { archivedAt: string; originalPath: string; archivePath: string }): ArchivedSessionRecord {
  return {
    sessionId: session.sessionId,
    cwd: canonicalizeStoredCwd(session.cwd),
    archivedAt: archive.archivedAt,
    originalPath: archive.originalPath,
    archivePath: archive.archivePath,
    created: session.created,
    modified: session.modified,
    messageCount: session.messageCount,
    firstMessage: session.firstMessage,
    ...(session.name === undefined ? {} : { name: session.name }),
    ...(session.parentSessionPath === undefined ? {} : { parentSessionPath: session.parentSessionPath }),
  };
}

export async function gzipFile(source: string, destination: string): Promise<void> {
  await mkdir(dirname(destination), { recursive: true });
  const tempPath = `${destination}.${String(process.pid)}.${Date.now().toString()}.${randomUUID()}.tmp`;
  try {
    await pipeline(
      createReadStream(source),
      createGzip(),
      createWriteStream(tempPath),
    );
    await rename(tempPath, destination);
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);
    throw error;
  }
}

export async function gunzipFile(source: string, destination: string): Promise<void> {
  await mkdir(dirname(destination), { recursive: true });
  const tempPath = `${destination}.${String(process.pid)}.${Date.now().toString()}.${randomUUID()}.tmp`;
  try {
    await pipeline(
      createReadStream(source),
      createGunzip(),
      createWriteStream(tempPath),
    );
    await rename(tempPath, destination);
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);
    throw error;
  }
}

export function sessionArtifactsPath(sessionPath: string): string {
  if (sessionPath.endsWith(".jsonl.gz")) {
    return sessionPath.slice(0, -".jsonl.gz".length);
  }
  if (sessionPath.endsWith(".gz")) {
    return sessionPath.slice(0, -".gz".length);
  }
  if (sessionPath.endsWith(".jsonl")) {
    return sessionPath.slice(0, -".jsonl".length);
  }
  return sessionPath;
}

async function copySessionFileToArchive(source: string, archivePath: string): Promise<void> {
  if (source === archivePath) return;
  await mkdir(dirname(archivePath), { recursive: true });
  if (await pathExists(archivePath)) return;
  if (archivePath.endsWith(".gz") && !source.endsWith(".gz")) {
    await gzipFile(source, archivePath);
  } else {
    await copyFile(source, archivePath);
  }
}

async function removeActiveSessionFile(source: string, archivePath: string): Promise<void> {
  if (source === archivePath) return;
  if (await pathExists(source)) await unlink(source);
  const sourceArtifacts = sessionArtifactsPath(source);
  const destArtifacts = sessionArtifactsPath(archivePath);
  if (sourceArtifacts !== destArtifacts && await pathExists(sourceArtifacts)) {
    await movePath(sourceArtifacts, destArtifacts);
  }
}

async function restoreSessionFile(archivePath: string, originalPath: string): Promise<void> {
  if (archivePath === originalPath) return;
  if (await pathExists(originalPath)) throw new Error(`Cannot restore archived session because a session already exists at ${originalPath}`);
  await mkdir(dirname(originalPath), { recursive: true });
  if (archivePath.endsWith(".gz") && !originalPath.endsWith(".gz")) {
    await gunzipFile(archivePath, originalPath);
    await unlink(archivePath);
  } else {
    await moveFile(archivePath, originalPath);
  }
  const archiveArtifacts = sessionArtifactsPath(archivePath);
  const originalArtifacts = sessionArtifactsPath(originalPath);
  if (archiveArtifacts !== originalArtifacts && await pathExists(archiveArtifacts)) {
    await movePath(archiveArtifacts, originalArtifacts);
  }
}

async function movePath(source: string, destination: string): Promise<void> {
  await mkdir(dirname(destination), { recursive: true });
  try {
    await rename(source, destination);
    return;
  } catch (error: unknown) {
    if (!isNodeErrorWithCode(error, "EXDEV")) throw error;
  }
  await cp(source, destination, { recursive: true });
  await rm(source, { recursive: true, force: true });
}

async function moveFile(source: string, destination: string): Promise<void> {
  try {
    await rename(source, destination);
  } catch (error: unknown) {
    if (!isNodeErrorWithCode(error, "EXDEV")) throw error;
    await copyFile(source, destination);
    await unlink(source);
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch (error: unknown) {
    if (isNodeErrorWithCode(error, "ENOENT")) return false;
    throw error;
  }
}

function parseArchiveFile(value: unknown): ArchiveFile {
  if (!isRecord(value) || !Array.isArray(value["sessions"])) throw new Error("Invalid archive file");
  return { sessions: value["sessions"].map(parseArchivedSessionRecord) };
}

function parseArchivedSessionRecord(value: unknown): ArchivedSessionRecord {
  if (!isRecord(value)) throw new Error("Invalid archived session record");
  const sessionId = value["sessionId"];
  const cwd = value["cwd"];
  const archivedAt = value["archivedAt"];
  if (typeof sessionId !== "string" || typeof cwd !== "string" || typeof archivedAt !== "string") throw new Error("Invalid archived session record");
  const canonicalCwd = canonicalizeStoredCwd(cwd);
  const originalPath = optionalString(value, "originalPath");
  const archivePath = optionalString(value, "archivePath");
  const created = optionalString(value, "created");
  const modified = optionalString(value, "modified");
  const messageCount = optionalNumber(value, "messageCount");
  const firstMessage = optionalString(value, "firstMessage");
  const name = optionalString(value, "name");
  const parentSessionPath = optionalString(value, "parentSessionPath");
  return {
    sessionId,
    cwd: canonicalCwd,
    archivedAt,
    ...(originalPath === undefined ? {} : { originalPath }),
    ...(archivePath === undefined ? {} : { archivePath }),
    ...(created === undefined ? {} : { created }),
    ...(modified === undefined ? {} : { modified }),
    ...(messageCount === undefined ? {} : { messageCount }),
    ...(firstMessage === undefined ? {} : { firstMessage }),
    ...(name === undefined ? {} : { name }),
    ...(parentSessionPath === undefined ? {} : { parentSessionPath }),
  };
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error("Invalid archived session record");
  return value;
}

function optionalNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "number") throw new Error("Invalid archived session record");
  return value;
}

function safeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_") || "session";
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

