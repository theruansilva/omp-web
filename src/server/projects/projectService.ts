import { mkdir, realpath, stat } from "node:fs/promises";
import type { ProjectStore } from "../storage/projectStore.js";
import type { Project } from "../types.js";
import { expandUserPath } from "./directorySuggestions.js";

const FORBIDDEN_ROOT_PATHS: Record<string, true> = {
  "/": true,
  "/etc": true,
  "/root": true,
  "/bin": true,
  "/sbin": true,
  "/usr": true,
  "/var": true,
  "/dev": true,
  "/proc": true,
  "/sys": true,
};

export function isForbiddenProjectRoot(path: string): boolean {
  const normalized = path.replace(/\\/g, "/").toLowerCase();
  if (FORBIDDEN_ROOT_PATHS[normalized] === true) return true;
  if (/^[a-z]:\/?$/i.test(normalized) || /^[a-z]:\/windows\/?$/i.test(normalized)) return true;
  return false;
}

export class ProjectService {
  constructor(private readonly store: ProjectStore) { }

  list(): Promise<Project[]> {
    return this.store.list();
  }

  async add(input: { name?: string; path: string; create?: boolean }): Promise<Project> {
    const requestedPath = expandUserPath(input.path);
    if (input.create === true) await mkdir(requestedPath, { recursive: true });
    const resolved = await realpath(requestedPath);
    if (isForbiddenProjectRoot(resolved)) {
      throw new Error("Cannot add system root directory as a project");
    }
    const s = await stat(resolved);
    if (!s.isDirectory()) throw new Error("Project path must be a directory");
    return this.store.add(input.name === undefined ? { path: resolved } : { name: input.name, path: resolved });
  }

  async close(id: string): Promise<void> {
    if (!(await this.store.remove(id))) throw new Error("Project not found");
  }

  async requireProject(id: string): Promise<Project> {
    const project = await this.store.get(id);
    if (!project) throw new Error("Project not found");
    return project;
  }
}
