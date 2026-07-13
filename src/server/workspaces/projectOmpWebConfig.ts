import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { effectiveUploadsConfig, parsePathAccessConfig, parseUploadsConfig, type OmpWebConfig } from "../../config.js";
import type { OmpWebPathAccessConfig, OmpWebUploadsConfig } from "../../shared/apiTypes.js";
import { isRecord, isNodeErrorWithCode } from "../utils.js";

export const PROJECT_OMP_WEB_CONFIG_PATH = ".omp-web/config.json";

export interface ProjectOmpWebConfig {
  version?: 1;
  pathAccess?: OmpWebPathAccessConfig;
  uploads?: OmpWebUploadsConfig;
}

export interface LoadedProjectOmpWebConfig {
  path: string;
  exists: boolean;
  config: ProjectOmpWebConfig;
}

export async function loadProjectOmpWebConfig(projectPath: string): Promise<LoadedProjectOmpWebConfig> {
  const path = join(projectPath, PROJECT_OMP_WEB_CONFIG_PATH);
  try {
    const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
    if (!isRecord(parsed)) throw new Error(`PI WEB project config must be a JSON object: ${path}`);
    return { path, exists: true, config: parseProjectOmpWebConfig(parsed, path) };
  } catch (error) {
    if (isNodeErrorWithCode(error, "ENOENT")) return { path, exists: false, config: {} };
    throw error;
  }
}

export async function loadEffectiveProjectPathAccess(projectPath: string, globalConfig: OmpWebConfig): Promise<OmpWebPathAccessConfig | undefined> {
  const projectConfig = await loadProjectOmpWebConfig(projectPath);
  return mergePathAccessConfigs(globalConfig.pathAccess, projectConfig.config.pathAccess);
}

export async function loadEffectiveProjectUploadsConfig(projectPath: string, globalConfig: OmpWebConfig): Promise<OmpWebUploadsConfig> {
  const projectConfig = await loadProjectOmpWebConfig(projectPath);
  return effectiveUploadsConfig({ uploads: { ...(globalConfig.uploads ?? {}), ...(projectConfig.config.uploads ?? {}) } });
}

export function mergePathAccessConfigs(...configs: (OmpWebPathAccessConfig | undefined)[]): OmpWebPathAccessConfig | undefined {
  const allowedPaths = dedupe(configs.flatMap((config) => config?.allowedPaths ?? []));
  return allowedPaths.length === 0 ? undefined : { allowedPaths };
}

function parseProjectOmpWebConfig(value: Record<string, unknown>, path: string): ProjectOmpWebConfig {
  const version = value["version"];
  return {
    ...(version !== undefined ? { version: parseProjectConfigVersion(version, path) } : {}),
    ...(value["pathAccess"] !== undefined ? { pathAccess: parsePathAccessConfig(value["pathAccess"], path) } : {}),
    ...(value["uploads"] !== undefined ? { uploads: parseUploadsConfig(value["uploads"], path) } : {}),
  };
}

function parseProjectConfigVersion(value: unknown, path: string): 1 {
  if (value !== 1) throw new Error(`PI WEB project config version must be 1: ${path}`);
  return 1;
}

function dedupe(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

