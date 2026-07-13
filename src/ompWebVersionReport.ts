import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { effectiveOmpWebConfig } from "./config.js";
import { SessionDaemonClient } from "./sessiond/sessionDaemonClient.js";
import type { OmpWebComponentStatus, OmpWebInstallationInfo, OmpWebVersionResponse } from "./shared/apiTypes.js";
import { parseOmpWebComponentStatus, parseOmpWebVersionResponse } from "./shared/ompWebStatusParsing.js";
import { errorMessage, isRecord } from "./server/utils.js";

const OMP_WEB_PACKAGE_NAME = "@ProgmRuanSilva/omp-web";
const OMP_WEB_VERSION_TIMEOUT_MS = 2000;
const OMP_WEB_VERSION_ENDPOINT_PATH = "/api/omp-web/version";
const OMP_WEB_STATUS_ENDPOINT_PATH = "/api/omp-web/status";
const DEFAULT_PACKAGE_VERSION = "0.0.0-dev";

interface PackageInfo {
  name: string;
  version: string;
  path: string;
}

interface RunningVersionInfo {
  generatedAt?: string;
  web?: OmpWebComponentStatus;
  sessiond?: OmpWebComponentStatus;
  webError?: string;
  sessiondError?: string;
}

export function packageVersion(): string {
  return readPackageInfo()?.version ?? DEFAULT_PACKAGE_VERSION;
}

export async function printOmpWebVersionReport(): Promise<void> {
  console.log("PI WEB version");
  printInstalledPackageVersions();
  printRunningVersionInfo(await collectRunningVersionInfo());
}

function packageRootPath(): string {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

function packageJsonPath(): string {
  return join(packageRootPath(), "package.json");
}

function readPackageInfo(): PackageInfo | undefined {
  const path = packageJsonPath();
  try {
    return parsePackageInfo(JSON.parse(readFileSync(path, "utf8")), path);
  } catch {
    return undefined;
  }
}

function parsePackageInfo(value: unknown, path: string): PackageInfo | undefined {
  if (!isRecord(value)) return undefined;
  const name = value["name"];
  const version = value["version"];
  if (typeof name !== "string" || name === "" || typeof version !== "string" || version === "") return undefined;
  return { name, version, path };
}

function webVersionEndpoint(): { endpoint?: string; error?: string } {
  try {
    const { config } = effectiveOmpWebConfig();
    const host = httpClientHost(config.host);
    const port = config.port ?? 8504;
    return { endpoint: `http://${urlHost(host)}:${String(port)}${OMP_WEB_VERSION_ENDPOINT_PATH}` };
  } catch (error) {
    return { error: `could not read PI WEB config: ${errorMessage(error)}` };
  }
}

function httpClientHost(configuredHost: string | undefined): string {
  const host = configuredHost === undefined || configuredHost === "" ? "127.0.0.1" : configuredHost;
  if (host === "0.0.0.0" || host === "::" || host === "[::]") return "127.0.0.1";
  return host;
}

function urlHost(host: string): string {
  if (host.startsWith("[") || !host.includes(":")) return host;
  return `[${host}]`;
}

function statusEndpointFor(versionEndpoint: string): string {
  if (!versionEndpoint.endsWith(OMP_WEB_VERSION_ENDPOINT_PATH)) return versionEndpoint;
  return `${versionEndpoint.slice(0, -OMP_WEB_VERSION_ENDPOINT_PATH.length)}${OMP_WEB_STATUS_ENDPOINT_PATH}`;
}

async function fetchOmpWebVersionResponse(endpoint: string): Promise<OmpWebVersionResponse> {
  const response = await fetch(endpoint, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(OMP_WEB_VERSION_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
  const parsed: unknown = await response.json();
  const status = parseOmpWebVersionResponse(parsed);
  if (status === undefined) throw new Error("response did not include PI WEB version information");
  return status;
}

async function collectRunningVersionInfo(): Promise<RunningVersionInfo> {
  const endpoint = webVersionEndpoint();
  if (endpoint.endpoint !== undefined) {
    try {
      const status = await fetchOmpWebVersionResponse(endpoint.endpoint);
      return { generatedAt: status.generatedAt, web: status.components.web, sessiond: status.components.sessiond };
    } catch (error) {
      let webError = `${endpoint.endpoint}: ${errorMessage(error)}`;
      const statusEndpoint = statusEndpointFor(endpoint.endpoint);
      if (statusEndpoint !== endpoint.endpoint && error instanceof Error && error.message === "HTTP 404") {
        try {
          const status = await fetchOmpWebVersionResponse(statusEndpoint);
          return { generatedAt: status.generatedAt, web: status.components.web, sessiond: status.components.sessiond };
        } catch (statusError) {
          webError = `${webError}; ${statusEndpoint}: ${errorMessage(statusError)}`;
        }
      }
      return runningVersionInfoWithSessiondFallback({ webError });
    }
  }

  return runningVersionInfoWithSessiondFallback({ webError: endpoint.error ?? "web/API status endpoint unavailable" });
}

async function runningVersionInfoWithSessiondFallback(base: { webError: string }): Promise<RunningVersionInfo> {
  const sessiond = await collectRunningSessiondInfo();
  return {
    webError: base.webError,
    ...(sessiond.component === undefined ? {} : { sessiond: sessiond.component }),
    ...(sessiond.error === undefined ? {} : { sessiondError: sessiond.error }),
  };
}

async function collectRunningSessiondInfo(): Promise<{ component?: OmpWebComponentStatus; error?: string }> {
  try {
    const response = await withTimeout(
      new SessionDaemonClient().request("GET", "/health"),
      OMP_WEB_VERSION_TIMEOUT_MS,
      "session daemon health check timed out",
    );
    if (response.statusCode < 200 || response.statusCode >= 300) throw new Error(`HTTP ${String(response.statusCode)}`);
    const parsed: unknown = response.body === "" ? undefined : JSON.parse(response.body);
    const version = isRecord(parsed) ? parsed["version"] : undefined;
    const component = parseOmpWebComponentStatus(version);
    if (component === undefined) throw new Error("health response did not include version information");
    return { component };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(timeoutMessage));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}


function printInstalledPackageVersions(): void {
  const info = readPackageInfo();
  console.log("Installed packages:");
  if (info === undefined) {
    console.log(`? ${OMP_WEB_PACKAGE_NAME}: unknown`);
    console.log(`  missing package metadata: ${packageJsonPath()}`);
    return;
  }
  console.log(`✓ ${info.name}: ${info.version}`);
  console.log(`  ${info.path}`);
}

function printRunningVersionInfo(info: RunningVersionInfo): void {
  console.log("Running services:");
  if (info.web === undefined) printUnavailableComponent("Web/UI", info.webError);
  else printComponentVersion(info.web);
  if (info.sessiond === undefined) printUnavailableComponent("Session daemon", info.sessiondError);
  else printComponentVersion(info.sessiond);
  if (info.generatedAt !== undefined) console.log(`  reported by web/API at ${info.generatedAt}`);
}

function printComponentVersion(component: OmpWebComponentStatus): void {
  const icon = component.available ? component.stale ? "!" : "✓" : "?";
  const status = !component.available ? "unavailable" : component.stale ? "restart needed" : "current";
  console.log(`${icon} ${component.label}: ${status}`);
  if (component.available || component.runtimeVersion !== undefined || component.installedVersion !== undefined) {
    console.log(`  running: ${formatVersion(component.runtimeVersion)}; installed: ${formatVersion(component.installedVersion)}`);
  }
  const installation = installationLabel(component.installation);
  if (installation !== undefined) console.log(`  installation: ${installation}`);
  if (component.error !== undefined) console.log(`  ${component.error}`);
}

function printUnavailableComponent(label: string, error: string | undefined): void {
  console.log(`? ${label}: unavailable`);
  if (error !== undefined && error !== "") console.log(`  ${error}`);
}

function installationLabel(installation: OmpWebInstallationInfo | undefined): string | undefined {
  if (installation === undefined) return undefined;
  if (installation.kind === "pi-package") {
    const source = installation.source ?? "Pi package";
    const scope = installation.scope === undefined ? "" : ` · ${installation.scope}`;
    const path = installation.path === undefined ? "" : ` · ${installation.path}`;
    return `${source}${scope}${path}`;
  }
  if (installation.kind === "npm-global") {
    const npmRoot = installation.npmRoot === undefined ? "" : ` · ${installation.npmRoot}`;
    const path = installation.path === undefined ? "" : ` · ${installation.path}`;
    return `global npm package${npmRoot}${path}`;
  }
  if (installation.kind === "local") return installation.path === undefined ? "local checkout" : `local checkout · ${installation.path}`;
  if (installation.kind === "docker") {
    const mode = installation.dockerMode === "dev" ? "Docker development runtime" : "Docker runtime";
    return installation.path === undefined ? mode : `${mode} · ${installation.path}`;
  }
  return installation.path === undefined ? "installation unknown" : `installation unknown · ${installation.path}`;
}

function formatVersion(version: string | undefined): string {
  return version === undefined || version === "" ? "unknown" : version;
}

