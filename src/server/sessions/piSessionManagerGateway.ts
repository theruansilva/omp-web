import type { Dirent } from "node:fs";
import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { getAgentDir, SessionManager } from "@oh-my-pi/pi-coding-agent";
import { canonicalizeStoredCwd, cwdPathsEqual } from "../workingDirectory.js";
import type { PiSessionListEntry, PiSessionManager } from "./piSessionService.js";

export const PI_SESSION_DIR_ENV = "PI_CODING_AGENT_SESSION_DIR";

type SessionDirSource = "env" | "settings" | "pi-default";

export interface SessionDirResolution {
 source: SessionDirSource;
 sessionDir: string;
 usesConfiguredSessionDir: boolean;
}

export interface SessionDirResolverOptions {
 agentDir?: string;
 env?: NodeJS.ProcessEnv;
}


function readConfiguredSessionDir(cwd: string, agentDir: string): string | undefined {
 const localPath = join(cwd, ".pi", "settings.json");
 try {
  const raw = readFileSync(localPath, "utf8");
  const parsed = JSON.parse(raw);
  if (typeof parsed?.sessionDir === "string" && parsed.sessionDir !== "") return parsed.sessionDir;
 } catch { }

 const globalPath = join(agentDir, "settings.json");
 try {
  const raw = readFileSync(globalPath, "utf8");
  const parsed = JSON.parse(raw);
  if (typeof parsed?.sessionDir === "string" && parsed.sessionDir !== "") return parsed.sessionDir;
 } catch { }

 return undefined;
}

export class SessionDirResolver {
 private readonly agentDir: string;
 private readonly env: NodeJS.ProcessEnv;

 constructor(options: SessionDirResolverOptions = {}) {
  this.agentDir = options.agentDir ?? getAgentDir();
  this.env = options.env ?? process.env;
 }

 defaultSessionsRoot(): string {
  return defaultPiSessionsRoot(this.agentDir);
 }

 globalEnvSessionDir(): string | undefined {
  const envSessionDir = this.env[PI_SESSION_DIR_ENV];
  if (envSessionDir === undefined || envSessionDir === "") return undefined;
  const expanded = expandTildePath(envSessionDir);
  return isAbsolute(expanded) ? expanded : undefined;
 }

 resolve(cwd: string): SessionDirResolution {
  const envSessionDir = this.env[PI_SESSION_DIR_ENV];
  if (envSessionDir !== undefined && envSessionDir !== "") {
   return { source: "env", sessionDir: resolveConfiguredPath(envSessionDir, cwd), usesConfiguredSessionDir: true };
  }

  const settingsSessionDir = readConfiguredSessionDir(cwd, this.agentDir);
  if (settingsSessionDir !== undefined && settingsSessionDir !== "") {
   return { source: "settings", sessionDir: resolveConfiguredPath(settingsSessionDir, cwd), usesConfiguredSessionDir: true };
  }

  return { source: "pi-default", sessionDir: defaultPiSessionDir(cwd, this.agentDir), usesConfiguredSessionDir: false };
 }
}

export interface PiSessionManagerGateway {
 list(cwd: string): Promise<PiSessionListEntry[]>;
 create(cwd: string, _options?: { parentSession?: string }): PiSessionManager;
 listAll?(): Promise<PiSessionListEntry[]>;
 open(path: string): Promise<PiSessionManager>;
}

export type PiSessionManagerGatewayOptions = SessionDirResolverOptions;

export class DefaultPiSessionManagerGateway implements PiSessionManagerGateway {
 constructor(private readonly resolver: SessionDirResolver = new SessionDirResolver()) { }

 async list(cwd: string): Promise<PiSessionListEntry[]> {
  const resolution = this.resolver.resolve(cwd);
  const sessions = await listSessionsInDir(resolution.sessionDir);
  if (!resolution.usesConfiguredSessionDir) {
   const legacyDir = sessionDirInDefaultPiStore(this.resolver.defaultSessionsRoot(), cwd);
   if (legacyDir !== resolution.sessionDir) {
    try {
     const legacySessions = await listSessionsInDir(legacyDir);
     const existingIds = new Set(sessions.map((s) => s.id));
     for (const ls of legacySessions) {
      if (!existingIds.has(ls.id)) {
       sessions.push(ls);
      }
     }
    } catch { }
   }
  }
  return filterSessionsForCwd(sessions, cwd);
 }

 async listAll(): Promise<PiSessionListEntry[]> {
  const globalEnv = this.resolver.globalEnvSessionDir();
  const defaultSessions = await listSessionsInDefaultPiStore(this.resolver.defaultSessionsRoot());
  if (globalEnv === undefined) return defaultSessions;
  const envSessions = await listSessionsInDir(globalEnv);
  const combined = [...defaultSessions, ...envSessions];
  const unique = new Map<string, PiSessionListEntry>();
  for (const session of combined) {
   const existing = unique.get(session.id);
   if (!existing || session.modified.getTime() > existing.modified.getTime()) {
    unique.set(session.id, session);
   }
  }
  return Array.from(unique.values()).sort((a, b) => b.modified.getTime() - a.modified.getTime());
 }
 create(cwd: string, _options?: { parentSession?: string }): PiSessionManager {
  const resolution = this.resolver.resolve(cwd);
  return SessionManager.create(cwd, resolution.sessionDir);
 }

 async open(path: string): Promise<PiSessionManager> {
  return SessionManager.open(path, dirname(path));
 }
}

export function createPiSessionManagerGateway(options: PiSessionManagerGatewayOptions = {}): PiSessionManagerGateway {
 return new DefaultPiSessionManagerGateway(new SessionDirResolver(options));
}
export async function listSessionsInDir(sessionDir: string): Promise<PiSessionListEntry[]> {
 // Use SessionManager.list() which lists by cwd but also accepts an explicit
 // sessionDir so we only discover sessions stored in the given directory.
 const sessions = await SessionManager.list("", sessionDir);
 return sessions.map((session) => {
  const rawTitle = session.title?.trim();
  const name = rawTitle !== undefined && rawTitle !== "" ? rawTitle : undefined;
  return {
   ...session,
   cwd: canonicalizeStoredCwd(session.cwd),
   ...(name !== undefined ? { name } : {}),
  };
 });
}

export async function listSessionsInDefaultPiStore(storeRoot = defaultPiSessionsRoot()): Promise<PiSessionListEntry[]> {
 let entries: Dirent[];
 try {
  entries = await readdir(storeRoot, { withFileTypes: true });
 } catch {
  return [];
 }

 const sessionDirs = entries.filter((entry) => entry.isDirectory()).map((entry) => join(storeRoot, entry.name));
 const sessions = (await Promise.all(sessionDirs.map((dir) => listSessionsInDir(dir)))).flat();
 return sessions.sort((a, b) => b.modified.getTime() - a.modified.getTime());
}

export function filterSessionsForCwd(sessions: readonly PiSessionListEntry[], cwd: string): PiSessionListEntry[] {
 // Sessions with an empty cwd (old session files) are excluded: resolve("") would
 // resolve to this process's cwd and produce false matches.
 return sessions.filter((session) => session.cwd !== "" && cwdPathsEqual(session.cwd, cwd));
}


export function defaultPiSessionsRoot(agentDir = getAgentDir()): string {
 return join(agentDir, "sessions");
}

export function defaultPiSessionDir(cwd: string, agentDir = getAgentDir()): string {
 try {
  return SessionManager.getDefaultSessionDir(cwd, agentDir);
 } catch {
  return sessionDirInDefaultPiStore(defaultPiSessionsRoot(agentDir), cwd);
 }
}

export function sessionDirInDefaultPiStore(storeRoot: string, cwd: string): string {
 const safePath = `--${cwd.replace(/^[/\\]/u, "").replace(/[/\\:]/gu, "-")}--`;
 return join(storeRoot, safePath);
}

export function resolveConfiguredPath(path: string, cwd: string): string {
 const expanded = expandTildePath(path);
 return isAbsolute(expanded) ? expanded : resolve(cwd, expanded);
}

function expandTildePath(path: string): string {
 if (path === "~") return homedir();
 if (path.startsWith("~/")) return join(homedir(), path.slice(2));
 return path;
}
