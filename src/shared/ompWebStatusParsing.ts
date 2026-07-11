import type { OmpWebComponentStatus, OmpWebInstallationInfo, OmpWebRuntimeComponent, OmpWebRuntimeResponse, OmpWebVersionResponse } from "./apiTypes.js";
import { parseKnownOmpWebCapabilities } from "./capabilities.js";

export function parseOmpWebVersionResponse(value: unknown): OmpWebVersionResponse | undefined {
  if (!isRecord(value)) return undefined;
  const packageName = value["packageName"];
  const generatedAt = value["generatedAt"];
  const components = value["components"];
  if (typeof packageName !== "string" || packageName === "" || typeof generatedAt !== "string" || generatedAt === "" || !isRecord(components)) return undefined;
  const web = parseOmpWebComponentStatus(components["web"]);
  const sessiond = parseOmpWebComponentStatus(components["sessiond"]);
  if (web === undefined || sessiond === undefined) return undefined;
  return { packageName, generatedAt, components: { web, sessiond } };
}

export function parseOmpWebRuntimeResponse(value: unknown): OmpWebRuntimeResponse | undefined {
  if (!isRecord(value)) return undefined;
  const packageName = value["packageName"];
  const generatedAt = value["generatedAt"];
  const components = value["components"];
  const capabilities = parseKnownOmpWebCapabilities(value["capabilities"]);
  if (typeof packageName !== "string" || packageName === "" || typeof generatedAt !== "string" || generatedAt === "" || !isRecord(components) || capabilities === undefined) return undefined;
  const web = parseOmpWebRuntimeComponent(components["web"]);
  const sessiond = parseOmpWebRuntimeComponent(components["sessiond"]);
  if (web === undefined || sessiond === undefined) return undefined;
  return { packageName, generatedAt, components: { web, sessiond }, capabilities };
}

export function parseOmpWebRuntimeComponent(value: unknown): OmpWebRuntimeComponent | undefined {
  if (!isRecord(value)) return undefined;
  const component = value["component"];
  const label = value["label"];
  const runtimeVersion = value["runtimeVersion"];
  const available = value["available"];
  const capabilities = parseKnownOmpWebCapabilities(value["capabilities"]);
  const error = value["error"];
  if (component !== "web" && component !== "sessiond") return undefined;
  if (typeof label !== "string" || label === "" || typeof available !== "boolean" || capabilities === undefined) return undefined;
  return {
    component,
    label,
    ...(typeof runtimeVersion === "string" ? { runtimeVersion } : {}),
    available,
    capabilities,
    ...(typeof error === "string" ? { error } : {}),
  };
}

export function parseOmpWebComponentStatus(value: unknown): OmpWebComponentStatus | undefined {
  if (!isRecord(value)) return undefined;
  const component = value["component"];
  const label = value["label"];
  const runtimeVersion = value["runtimeVersion"];
  const installedVersion = value["installedVersion"];
  const stale = value["stale"];
  const available = value["available"];
  const error = value["error"];
  const installation = parseOmpWebInstallationInfo(value["installation"]);
  if (component !== "web" && component !== "sessiond") return undefined;
  if (typeof label !== "string" || label === "" || typeof stale !== "boolean" || typeof available !== "boolean") return undefined;
  return {
    component,
    label,
    ...(typeof runtimeVersion === "string" ? { runtimeVersion } : {}),
    ...(typeof installedVersion === "string" ? { installedVersion } : {}),
    stale,
    available,
    ...(installation === undefined ? {} : { installation }),
    ...(typeof error === "string" ? { error } : {}),
  };
}

export function parseOmpWebInstallationInfo(value: unknown): OmpWebInstallationInfo | undefined {
  if (!isRecord(value)) return undefined;
  const kind = value["kind"];
  const path = value["path"];
  const source = value["source"];
  const scope = value["scope"];
  const npmRoot = value["npmRoot"];
  const dockerMode = value["dockerMode"];
  if (kind !== "pi-package" && kind !== "npm-global" && kind !== "local" && kind !== "docker" && kind !== "unknown") return undefined;
  return {
    kind,
    ...(typeof path === "string" ? { path } : {}),
    ...(typeof source === "string" ? { source } : {}),
    ...(scope === "user" || scope === "project" ? { scope } : {}),
    ...(typeof npmRoot === "string" ? { npmRoot } : {}),
    ...(dockerMode === "runtime" || dockerMode === "dev" ? { dockerMode } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
