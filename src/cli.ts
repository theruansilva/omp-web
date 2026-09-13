#!/usr/bin/env bun
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { homedir, userInfo } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultOmpWebConfigPath, defaultOmpWebDataDir, exampleOmpWebConfig } from "./config.js";
import { packageVersion, printOmpWebVersionReport } from "./ompWebVersionReport.js";
import { isRecord } from "./server/utils.js";
import { runDoctor, runChecks, printPathSetupAdvice } from "./cli/doctor.js";
import {
  systemdUnit as makeSystemdUnit,
  launchdLogPath,
  launchdPlist as makeLaunchdPlist,
} from "./cli/serviceTemplates.js";


const OMP_WEB_PACKAGE_NAME = "@progmruansilva/omp-web";

const systemdServiceDir = join(homedir(), ".config", "systemd", "user");
const launchdServiceDir = join(homedir(), "Library", "LaunchAgents");
const logDir = join(defaultOmpWebDataDir(), "logs");

const sessiondServiceName = "omp-web-sessiond.service";
const webServiceName = "omp-web.service";
const uiDevServiceName = "omp-web-ui-dev.service";

type InstallMode = "production" | "dev";
type ServiceBackendKind = "systemd" | "launchd";
type ServiceId = "sessiond" | "web" | "uiDev";
type Check = [string, string[]];
type SupportedShell = "bash" | "zsh" | "fish";
type RestartPolicy = "on-failure" | "never";

interface InstallOptions {
  host: string;
  port: string;
  mode: InstallMode;
  config?: string;
}

interface ServiceBackend {
  kind: ServiceBackendKind;
  label: string;
}

interface ServiceRef {
  id: ServiceId;
  systemdName: string;
  launchdLabel: string;
  launchdPlistName: string;
  logName: string;
}

interface ServiceDefinition extends ServiceRef {
  description: string;
  shellCommand: string;
  restart: RestartPolicy;
  environment: Record<string, string>;
  after?: ServiceId[];
  wants?: ServiceId[];
  workingDirectory?: string;
}

interface ServiceShell {
  name: SupportedShell;
  executable: string;
  detected?: string;
  fallback: boolean;
}

interface ServiceExecutable {
  command: string;
  checks: Check[];
}

interface ServiceExecutables {
  sessiond: ServiceExecutable;
  web: ServiceExecutable;
}

type ServiceHealth = "running" | "stopped" | "not-installed" | "unknown";

interface ServiceRuntimeStatus {
  ref: ServiceRef;
  health: ServiceHealth;
  detail: string;
  target: string;
  filePath: string;
  pid?: string;
}

const serviceRefs: Record<ServiceId, ServiceRef> = {
  sessiond: {
    id: "sessiond",
    systemdName: sessiondServiceName,
    launchdLabel: "com.omp-web.sessiond",
    launchdPlistName: "com.omp-web.sessiond.plist",
    logName: "sessiond.log",
  },
  web: {
    id: "web",
    systemdName: webServiceName,
    launchdLabel: "com.omp-web.web",
    launchdPlistName: "com.omp-web.web.plist",
    logName: "web.log",
  },
  uiDev: {
    id: "uiDev",
    systemdName: uiDevServiceName,
    launchdLabel: "com.omp-web.ui-dev",
    launchdPlistName: "com.omp-web.ui-dev.plist",
    logName: "ui-dev.log",
  },
};

const productionServiceIds: ServiceId[] = ["sessiond", "web"];
const startServiceOrder: ServiceId[] = ["sessiond", "web", "uiDev"];
const stopServiceOrder: ServiceId[] = ["web", "uiDev", "sessiond"];
// Restart web/UI before sessiond: when `omp-web restart` runs in a omp-web
// terminal (owned by sessiond), restarting sessiond kills the command, so any
// services handled after it would never be restarted.
const restartServiceOrder: ServiceId[] = ["web", "uiDev", "sessiond"];

function platformLabel(): string {
  if (process.platform === "darwin") return "macOS";
  if (process.platform === "linux") return "Linux";
  if (process.platform === "win32") return "Windows";
  return process.platform;
}

function currentServiceBackend(): ServiceBackend | undefined {
  if (process.platform === "linux") return { kind: "systemd", label: "systemd user services" };
  if (process.platform === "darwin") return { kind: "launchd", label: "LaunchAgents" };
  return undefined;
}

function requireServiceBackend(command: string): ServiceBackend {
  const backend = currentServiceBackend();
  if (backend !== undefined) return backend;
  throw new Error(`\`${command}\` requires a supported per-user service manager (systemd user services or LaunchAgents) and is not supported on ${platformLabel()}.\n\n${manualRunAdvice()}`);
}

function supportsSystemdUserServices(): boolean {
  return currentServiceBackend()?.kind === "systemd";
}

function manualRunAdvice(): string {
  return [
    "Run PI WEB manually from a checkout:",
    "  bun run start:sessiond",
    "  OMP_WEB_PORT=8504 bun run start",
    "",
    "For development in one terminal:",
    "  bun run dev",
    "",
    "For split development, keep sessiond separate and run web/API plus Vite UI separately:",
    "  bun run dev:sessiond",
    "  bun run dev:web",
    "  bun run dev:client",
  ].join("\n");
}

function run(command: string, args: string[], options: { check?: boolean } = {}): number {
  const proc = Bun.spawnSync([command, ...args], { stdout: "inherit", stderr: "inherit", stdin: "inherit" });
  const status = proc.exitCode;
  if (options.check === true && status !== 0) process.exit(status);
  return status;
}

function capture(command: string, args: string[]): { status: number; stdout: string; stderr: string } {
  const proc = Bun.spawnSync([command, ...args]);
  return {
    status: proc.exitCode,
    stdout: proc.stdout.toString(),
    stderr: proc.stderr.toString(),
  };
}

function runQuiet(command: string, args: string[]): number {
  return capture(command, args).status;
}

function hasCommand(command: string): boolean {
  return capture("/usr/bin/env", ["sh", "-c", `command -v ${command}`]).status === 0;
}

function isLingerEnabled(): boolean | undefined {
  if (!hasCommand("loginctl")) return undefined;
  const result = capture("loginctl", ["show-user", userInfo().username, "-p", "Linger"]);
  if (result.status !== 0) return undefined;
  const value = result.stdout.trim();
  if (value === "Linger=yes") return true;
  if (value === "Linger=no") return false;
  return undefined;
}

function parseInstallOptions(args: string[]): InstallOptions {
  const options: InstallOptions = { host: "127.0.0.1", port: "8504", mode: "production" };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === undefined) continue;
    if (arg === "--host") {
      const value = args[i + 1];
      if (value === undefined) throw new Error("--host requires a value");
      options.host = value;
      i += 1;
    } else if (arg.startsWith("--host=")) {
      options.host = arg.slice("--host=".length);
    } else if (arg === "--port") {
      const value = args[i + 1];
      if (value === undefined) throw new Error("--port requires a value");
      options.port = value;
      i += 1;
    } else if (arg.startsWith("--port=")) {
      options.port = arg.slice("--port=".length);
    } else if (arg === "--config") {
      const value = args[i + 1];
      if (value === undefined) throw new Error("--config requires a value");
      options.config = value;
      i += 1;
    } else if (arg.startsWith("--config=")) {
      options.config = arg.slice("--config=".length);
    } else if (arg === "--dev") {
      options.mode = "dev";
    } else if (arg === "--user-systemd") {
      // Accepted for backwards-compatible readability; PI WEB chooses the native user service backend automatically.
    } else {
      throw new Error(`Unknown install option: ${arg}`);
    }
  }
  return options;
}

function shellSingleQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function fishSingleQuote(value: string): string {
  return `'${value.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
}

function systemdEscape(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function systemdQuotedValue(value: string): string {
  return `"${systemdEscape(value)}"`;
}

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function packageRootPath(): string {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

function packageEntrypointPath(name: "server" | "sessiond"): string {
  return join(packageRootPath(), "dist", "server", name === "server" ? "index.js" : "sessiond.js");
}

function detectServiceShell(): ServiceShell {
  const userShell = userInfo().shell ?? undefined;
  const envShell = process.env["SHELL"]?.trim();
  const detected = envShell === undefined || envShell === "" ? userShell : envShell;
  const name = basename(detected ?? "").replace(/^-/, "");
  if (name === "bash" || name === "zsh" || name === "fish") {
    return { name, executable: detected ?? name, detected: detected ?? name, fallback: false };
  }
  return { name: "bash", executable: "bash", ...(detected === undefined ? {} : { detected }), fallback: true };
}

function serviceShellCommand(command: string, cwd?: string): string[] {
  const fullCommand = cwd === undefined ? command : `cd ${serviceShellQuote(cwd)} && ${command}`;
  return ["/usr/bin/env", detectServiceShell().executable, "-lc", fullCommand];
}

function serviceShellExecPrefix(): string {
  return `/usr/bin/env ${detectServiceShell().executable} -lc`;
}

function serviceShellQuote(value: string): string {
  return detectServiceShell().name === "fish" ? fishSingleQuote(value) : shellSingleQuote(value);
}

function systemdServiceShellQuote(value: string): string {
  return serviceShellQuote(value.replaceAll("%", "%%").replaceAll("$", "$$"));
}

function checkSucceeds(command: string[]): boolean {
  const [bin, ...args] = command;
  return bin !== undefined && capture(bin, args).status === 0;
}

function serviceShellCanFindCommand(command: string, backend: ServiceBackend): boolean {
  if (!checkSucceeds(serviceShellCommand(commandCheck(command)))) return false;
  if (backend.kind === "systemd") return checkSucceeds(systemdUserServiceShellCommand(commandCheck(command)));
  return true;
}

function readableFileCheck(path: string): string {
  const quoted = serviceShellQuote(path);
  return `test -r ${quoted} && printf '%s\\n' ${quoted}`;
}

function commandExecutable(command: string, backend: ServiceBackend): ServiceExecutable {
  const shell = serviceShellLabel();
  const checks: Check[] = [[`${shell} can find ${command}`, serviceShellCommand(commandCheck(command))]];
  if (backend.kind === "systemd") {
    checks.push([`systemd user ${shell} can find ${command}`, systemdUserServiceShellCommand(commandCheck(command))]);
  }
  return { command, checks };
}

function bundledExecutable(command: string, entrypointPath: string, backend: ServiceBackend, runtime: "node" | "bun" = "node"): ServiceExecutable {
  const shell = serviceShellLabel();
  const check = readableFileCheck(entrypointPath);
  const checks: Check[] = [[`${shell} can access bundled ${command} entrypoint`, serviceShellCommand(check)]];
  if (backend.kind === "systemd") {
    checks.push([`systemd user ${shell} can access bundled ${command} entrypoint`, systemdUserServiceShellCommand(check)]);
  }
  return { command: `${runtime} ${serviceShellQuote(entrypointPath)}`, checks };
}

function serviceExecutable(envName: "OMP_WEB_SERVER_EXEC" | "OMP_WEB_SESSIOND_EXEC", command: string, entrypointPath: string, backend: ServiceBackend): ServiceExecutable {
  const configured = process.env[envName]?.trim();
  if (configured !== undefined && configured !== "") return { command: configured, checks: [] };
  // Dependencies (e.g. @oh-my-pi/pi-coding-agent) ship raw TypeScript that Node
  // refuses to type-strip under node_modules, so prefer running the bundled
  // entrypoints with Bun when the service shell has it; the node bin is the fallback.
  if (serviceShellCanFindCommand("bun", backend)) {
    const executable = bundledExecutable(command, entrypointPath, backend, "bun");
    executable.checks.unshift([`${serviceShellLabel()} can find bun`, serviceShellCommand(commandCheck("bun"))]);
    return executable;
  }
  if (serviceShellCanFindCommand(command, backend)) return commandExecutable(command, backend);
  if (existsSync(entrypointPath)) return bundledExecutable(command, entrypointPath, backend);
  return commandExecutable(command, backend);
}

function resolveServiceExecutables(backend: ServiceBackend): ServiceExecutables {
  return {
    sessiond: serviceExecutable("OMP_WEB_SESSIOND_EXEC", "omp-web-sessiond", packageEntrypointPath("sessiond"), backend),
    web: serviceExecutable("OMP_WEB_SERVER_EXEC", "omp-web-server", packageEntrypointPath("server"), backend),
  };
}

function describeServiceShell(): string {
  const shell = detectServiceShell();
  if (shell.fallback) {
    return shell.detected === undefined
      ? "could not detect a supported login shell; using bash"
      : `detected ${shell.detected}; using bash because PI WEB currently supports bash, zsh, and fish`;
  }
  return shell.detected === undefined ? shell.name : `${shell.name} (${shell.detected})`;
}

function configEnvironment(options: InstallOptions, configPath: string): Record<string, string> {
  return options.config === undefined ? {} : { OMP_WEB_CONFIG: configPath };
}

function serviceRefList(ids: ServiceId[]): ServiceRef[] {
  return ids.map((id) => serviceRefs[id]);
}

function allServiceRefs(): ServiceRef[] {
  return serviceRefList(["sessiond", "web", "uiDev"]);
}

function productionServiceRefs(): ServiceRef[] {
  return serviceRefList(productionServiceIds);
}

function orderServiceRefs(refs: ServiceRef[], order: ServiceId[]): ServiceRef[] {
  const byId = new Map(refs.map((ref) => [ref.id, ref]));
  return order.flatMap((id) => {
    const ref = byId.get(id);
    return ref === undefined ? [] : [ref];
  });
}

function startOrder(refs: ServiceRef[]): ServiceRef[] {
  return orderServiceRefs(refs, startServiceOrder);
}

function stopOrder(refs: ServiceRef[]): ServiceRef[] {
  return orderServiceRefs(refs, stopServiceOrder);
}

function restartOrder(refs: ServiceRef[]): ServiceRef[] {
  return orderServiceRefs(refs, restartServiceOrder);
}

function productionServiceDefinitions(options: InstallOptions, configPath: string, executables: ServiceExecutables): ServiceDefinition[] {
  const environment = configEnvironment(options, configPath);
  return [
    {
      ...serviceRefs.sessiond,
      description: "PI WEB session daemon",
      shellCommand: `exec ${executables.sessiond.command}`,
      restart: "on-failure",
      environment,
    },
    {
      ...serviceRefs.web,
      description: "PI WEB server",
      shellCommand: `exec ${executables.web.command}`,
      restart: "on-failure",
      environment,
      after: ["sessiond"],
      wants: ["sessiond"],
    },
  ];
}

function devRootPath(): string {
  return resolve(process.cwd());
}

function validateDevCheckout(root: string): void {
  const packageJsonPath = join(root, "package.json");
  if (!existsSync(packageJsonPath)) {
    throw new Error(`Development mode must be installed from a PI WEB checkout. Missing package.json: ${packageJsonPath}`);
  }

  const parsed: unknown = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  if (!isRecord(parsed) || (parsed["name"] !== "@progmruansilva/omp-web" && parsed["name"] !== "@theruansilva/omp-web")) {
    throw new Error(`Development mode must be installed from an OMP WEB checkout. ${packageJsonPath} is not @progmruansilva/omp-web or @theruansilva/omp-web.`);
  }

  const scripts = parsed["scripts"];
  if (!isRecord(scripts)) throw new Error(`Development mode requires npm scripts in ${packageJsonPath}.`);
  const requiredScripts = ["start:sessiond", "dev:web", "dev:client"];
  const missing = requiredScripts.filter((script) => typeof scripts[script] !== "string");
  if (missing.length > 0) throw new Error(`Development mode requires missing npm scripts: ${missing.join(", ")}.`);
}

function devServiceDefinitions(options: InstallOptions, configPath: string, root: string): ServiceDefinition[] {
  const environment = configEnvironment(options, configPath);
  return [
    {
      ...serviceRefs.sessiond,
      description: "PI WEB session daemon (dev)",
      shellCommand: "exec bun run start:sessiond",
      restart: "never",
      environment,
      workingDirectory: root,
    },
    {
      ...serviceRefs.uiDev,
      description: "PI WEB UI dev server",
      shellCommand: `exec /usr/bin/env bash -c ${serviceShellQuote('trap "kill 0" EXIT; bun run dev:web & bun run dev:client & wait')}`,
      restart: "never",
      environment,
      after: ["sessiond"],
      wants: ["sessiond"],
      workingDirectory: root,
    },
  ];
}

function systemdUnit(service: ServiceDefinition): string {
  return makeSystemdUnit(service, serviceRefs, systemdEscape, systemdQuotedValue, serviceShellExecPrefix, systemdServiceShellQuote);
}

function launchdPlist(service: ServiceDefinition): string {
  return makeLaunchdPlist(service, logDir, detectServiceShell, xmlEscape);
}

async function writeInitialConfig(options: InstallOptions): Promise<string> {
  const configPath = options.config === undefined ? defaultOmpWebConfigPath() : resolve(options.config);
  await mkdir(dirname(configPath), { recursive: true });
  if (!existsSync(configPath)) {
    await writeFile(configPath, exampleOmpWebConfig({ host: options.host, port: Number(options.port) }));
  }
  return configPath;
}

function systemdServicePath(ref: ServiceRef): string {
  return join(systemdServiceDir, ref.systemdName);
}

function launchdPlistPath(ref: ServiceRef): string {
  return join(launchdServiceDir, ref.launchdPlistName);
}

function serviceFilePath(backend: ServiceBackend, ref: ServiceRef): string {
  return backend.kind === "systemd" ? systemdServicePath(ref) : launchdPlistPath(ref);
}

function serviceFileExists(backend: ServiceBackend, ref: ServiceRef): boolean {
  return existsSync(serviceFilePath(backend, ref));
}

function installedServiceIds(backend: ServiceBackend): Set<ServiceId> {
  return new Set(allServiceRefs().filter((ref) => serviceFileExists(backend, ref)).map((ref) => ref.id));
}

function installedServiceRefs(backend: ServiceBackend): ServiceRef[] {
  const installed = startOrder(allServiceRefs().filter((ref) => serviceFileExists(backend, ref)));
  return installed.length === 0 ? productionServiceRefs() : installed;
}

async function installSystemdServices(services: ServiceDefinition[]): Promise<void> {
  const selected = new Set<ServiceId>(services.map((service) => service.id));
  const obsolete = stopOrder(allServiceRefs().filter((ref) => !selected.has(ref.id)));

  for (const ref of obsolete) {
    runQuiet("systemctl", ["--user", "disable", "--now", ref.systemdName]);
    await rm(systemdServicePath(ref), { force: true });
  }

  await mkdir(systemdServiceDir, { recursive: true });
  for (const service of services) {
    await writeFile(systemdServicePath(service), systemdUnit(service));
  }

  const names = services.map((service) => service.systemdName);
  run("systemctl", ["--user", "daemon-reload"], { check: true });
  run("systemctl", ["--user", "enable", ...names], { check: true });
  run("systemctl", ["--user", "restart", ...names], { check: true });
}

function launchdDomain(): string {
  return `gui/${String(userInfo().uid)}`;
}

function launchdServiceTarget(ref: ServiceRef): string {
  return `${launchdDomain()}/${ref.launchdLabel}`;
}

function launchdIsLoaded(ref: ServiceRef): boolean {
  return capture("launchctl", ["print", launchdServiceTarget(ref)]).status === 0;
}

function launchdBootout(ref: ServiceRef): void {
  runQuiet("launchctl", ["bootout", launchdServiceTarget(ref)]);
}

function launchdBootstrap(ref: ServiceRef): void {
  run("launchctl", ["bootstrap", launchdDomain(), launchdPlistPath(ref)], { check: true });
  run("launchctl", ["enable", launchdServiceTarget(ref)], { check: true });
}

function launchdStart(ref: ServiceRef): void {
  if (!launchdIsLoaded(ref)) launchdBootstrap(ref);
  run("launchctl", ["kickstart", launchdServiceTarget(ref)], { check: true });
}

async function installLaunchdServices(services: ServiceDefinition[]): Promise<void> {
  const selected = new Set<ServiceId>(services.map((service) => service.id));

  await mkdir(launchdServiceDir, { recursive: true });
  await mkdir(logDir, { recursive: true });

  for (const ref of stopOrder(allServiceRefs())) launchdBootout(ref);

  for (const ref of allServiceRefs().filter((candidate) => !selected.has(candidate.id))) {
    await rm(launchdPlistPath(ref), { force: true });
  }

  for (const service of services) {
    await writeFile(launchdPlistPath(service), launchdPlist(service));
  }

  for (const service of services) launchdStart(service);
}

async function installNativeServices(backend: ServiceBackend, services: ServiceDefinition[]): Promise<void> {
  if (backend.kind === "systemd") await installSystemdServices(services);
  else await installLaunchdServices(services);
}

async function uninstallSystemdServices(): Promise<void> {
  for (const ref of stopOrder(allServiceRefs())) {
    runQuiet("systemctl", ["--user", "disable", "--now", ref.systemdName]);
    await rm(systemdServicePath(ref), { force: true });
  }
  runQuiet("systemctl", ["--user", "daemon-reload"]);
}

async function uninstallLaunchdServices(): Promise<void> {
  for (const ref of stopOrder(allServiceRefs())) {
    launchdBootout(ref);
    await rm(launchdPlistPath(ref), { force: true });
  }
}

async function uninstallNativeServices(backend: ServiceBackend): Promise<void> {
  if (backend.kind === "systemd") await uninstallSystemdServices();
  else await uninstallLaunchdServices();
}

function serviceDisplayName(ref: ServiceRef): string {
  if (ref.id === "sessiond") return "session daemon";
  if (ref.id === "uiDev") return "UI/API dev server";
  return "web server";
}

function statusServiceRefs(backend: ServiceBackend): ServiceRef[] {
  const ids = installedServiceIds(backend);
  if (ids.size === 0) return [];
  if (ids.has("web") && ids.has("uiDev")) return startOrder(allServiceRefs());
  if (ids.has("uiDev")) return serviceRefList(["sessiond", "uiDev"]);
  if (ids.has("web")) return productionServiceRefs();
  return serviceRefList(["sessiond"]);
}

function serviceInstallMode(backend: ServiceBackend): string {
  const ids = installedServiceIds(backend);
  if (ids.size === 0) return "not installed";
  const hasSessiond = ids.has("sessiond");
  const hasWeb = ids.has("web");
  const hasUiDev = ids.has("uiDev");
  if (hasWeb && hasUiDev) return "mixed";
  if (hasUiDev) return hasSessiond ? "development" : "development (incomplete)";
  if (hasWeb) return hasSessiond ? "production" : "production (incomplete)";
  return "partial";
}

function makeServiceRuntimeStatus(ref: ServiceRef, health: ServiceHealth, detail: string, target: string, filePath: string, pid?: string): ServiceRuntimeStatus {
  return {
    ref,
    health,
    detail,
    target,
    filePath,
    ...(pid === undefined ? {} : { pid }),
  };
}

function firstOutputLine(...values: string[]): string | undefined {
  for (const value of values) {
    const line = value.trim().split("\n").find((candidate) => candidate.trim() !== "");
    if (line !== undefined) return line.trim();
  }
  return undefined;
}

function systemdMainPid(ref: ServiceRef): string | undefined {
  const result = capture("systemctl", ["--user", "--no-pager", "show", ref.systemdName, "--property=MainPID", "--value"]);
  if (result.status !== 0) return undefined;
  const value = result.stdout.trim();
  return value === "" || value === "0" ? undefined : value;
}

function systemdRuntimeStatus(backend: ServiceBackend, ref: ServiceRef): ServiceRuntimeStatus {
  const target = ref.systemdName;
  const filePath = serviceFilePath(backend, ref);
  if (!serviceFileExists(backend, ref)) return makeServiceRuntimeStatus(ref, "not-installed", "not installed", target, filePath);

  const result = capture("systemctl", ["--user", "--no-pager", "is-active", target]);
  const state = firstOutputLine(result.stdout, result.stderr) ?? "unknown";
  if (result.status === 0 && state === "active") return makeServiceRuntimeStatus(ref, "running", "running", target, filePath, systemdMainPid(ref));
  return makeServiceRuntimeStatus(ref, state === "unknown" ? "unknown" : "stopped", state, target, filePath);
}

function parseLaunchdField(output: string, field: string): string | undefined {
  const match = new RegExp(`^\\s*${field}\\s=\\s(.+)$`, "m").exec(output);
  return match?.[1]?.trim();
}

function launchdRuntimeStatus(backend: ServiceBackend, ref: ServiceRef): ServiceRuntimeStatus {
  const target = launchdServiceTarget(ref);
  const filePath = serviceFilePath(backend, ref);
  if (!serviceFileExists(backend, ref)) return makeServiceRuntimeStatus(ref, "not-installed", "not installed", target, filePath);

  const result = capture("launchctl", ["print", target]);
  if (result.status !== 0) {
    return makeServiceRuntimeStatus(ref, "stopped", firstOutputLine(result.stderr, result.stdout) ?? "not loaded", target, filePath);
  }

  const state = parseLaunchdField(result.stdout, "state") ?? "unknown";
  const pid = parseLaunchdField(result.stdout, "pid");
  const health: ServiceHealth = state === "running" ? "running" : state === "unknown" ? "unknown" : "stopped";
  return makeServiceRuntimeStatus(ref, health, state === "running" ? "running" : state, target, filePath, pid);
}

function runtimeStatus(backend: ServiceBackend, ref: ServiceRef): ServiceRuntimeStatus {
  return backend.kind === "systemd" ? systemdRuntimeStatus(backend, ref) : launchdRuntimeStatus(backend, ref);
}

function printServiceStatus(status: ServiceRuntimeStatus): void {
  const icon = status.health === "running" ? "✓" : "✗";
  const pid = status.pid === undefined ? "" : `, pid ${status.pid}`;
  console.log(`${icon} ${serviceDisplayName(status.ref)}: ${status.detail} (${status.target}${pid})`);
  if (status.health === "not-installed") console.log(`  missing service file: ${status.filePath}`);
}

function printServiceStatusReport(backend: ServiceBackend): boolean {
  const refs = statusServiceRefs(backend);
  console.log(`PI WEB services: ${serviceInstallMode(backend)} (${backend.label})`);
  if (refs.length === 0) {
    console.log("✗ no PI WEB service files found");
    console.log("  Run `omp-web install` or `omp-web install --dev`.");
    return false;
  }

  const statuses = refs.map((ref) => runtimeStatus(backend, ref));
  for (const status of statuses) printServiceStatus(status);
  console.log("\nUse `omp-web logs` for service logs.");
  return statuses.every((status) => status.health === "running");
}

function backendAvailabilityChecks(backend: ServiceBackend): Check[] {
  if (backend.kind === "systemd") return [["systemctl --user", ["systemctl", "--user", "--version"]]];
  return [[`launchctl ${launchdDomain()}`, ["launchctl", "print", launchdDomain()]]];
}

function baseShellChecks(backend: ServiceBackend): Check[] {
  const shell = serviceShellLabel();
  const checks: Check[] = [[`${shell} can find node >= 22`, serviceShellCommand(nodeVersionCheck())]];
  if (backend.kind === "systemd") checks.push([`systemd user ${shell} can find node >= 22`, systemdUserServiceShellCommand(nodeVersionCheck())]);
  return checks;
}

function devInstallChecks(backend: ServiceBackend, root: string): Check[] {
  const shell = serviceShellLabel();
  const checks: Check[] = [
    [`${shell} can find bun`, serviceShellCommand(commandCheck("bun"), root)],
    [`${shell} can find bash`, serviceShellCommand(commandCheck("bash"), root)],
  ];
  if (backend.kind === "systemd") {
    checks.push(
      [`systemd user ${shell} can find bun`, systemdUserServiceShellCommand(commandCheck("bun"), root)],
      [`systemd user ${shell} can find bash`, systemdUserServiceShellCommand(commandCheck("bash"), root)],
    );
  }
  return checks;
}

function installPreflightChecks(backend: ServiceBackend, mode: InstallMode, executables: ServiceExecutables | undefined, devRoot: string | undefined): Check[] {
  return [
    ...backendAvailabilityChecks(backend),
    ...baseShellChecks(backend),
    ...(mode === "dev" && devRoot !== undefined ? devInstallChecks(backend, devRoot) : []),
    ...(mode === "production" && executables !== undefined ? [...executables.web.checks, ...executables.sessiond.checks] : []),
  ];
}

async function install(args: string[]): Promise<void> {
  const backend = requireServiceBackend("omp-web install");
  const options = parseInstallOptions(args);
  const devRoot = options.mode === "dev" ? devRootPath() : undefined;
  if (devRoot !== undefined) validateDevCheckout(devRoot);

  const executables = options.mode === "production" ? resolveServiceExecutables(backend) : undefined;
  console.log(`Running PI WEB ${options.mode} install preflight checks...`);
  console.log(`Service backend: ${backend.label}`);
  console.log(`Service shell: ${describeServiceShell()}`);
  if (!runChecks(installPreflightChecks(backend, options.mode, executables, devRoot))) {
    printPathSetupAdvice(detectServiceShell().name);
    throw new Error("Install preflight checks failed. Fix the failed checks above, then run `omp-web doctor` for more detail.");
  }

  const configPath = await writeInitialConfig(options);
  const services = options.mode === "dev"
    ? devServiceDefinitions(options, configPath, devRoot ?? devRootPath())
    : productionServiceDefinitions(options, configPath, executables ?? resolveServiceExecutables(backend));

  await installNativeServices(backend, services);

  console.log(`\nPI WEB ${options.mode} services are installed and starting.`);
  console.log(`Config: ${configPath}`);
  if (options.mode === "dev") {
    console.log("Open: http://127.0.0.1:8505");
  } else {
    console.log(`Open: http://${options.host === "0.0.0.0" ? "127.0.0.1" : options.host}:${options.port}`);
  }

  if (backend.kind === "systemd") {
    const linger = isLingerEnabled();
    if (linger === false) {
      console.log("\nRecommended for server use: keep user services running after logout/reboot:");
      console.log(`  sudo loginctl enable-linger ${userInfo().username}`);
    } else if (linger === undefined) {
      console.log("\nRecommended for server use: enable systemd user lingering so services survive logout/reboot:");
      console.log(`  sudo loginctl enable-linger ${userInfo().username}`);
    }
  }

  console.log("\nUseful commands:");
  console.log("  omp-web status");
  console.log("  omp-web logs");
  console.log("  omp-web restart");
}

async function uninstall(): Promise<void> {
  const backend = requireServiceBackend("omp-web uninstall");
  await uninstallNativeServices(backend);
  console.log(`PI WEB ${backend.label} removed. Production and development service files were removed; config and data were left in place.`);
}

function update(): void {
  const backend = requireServiceBackend("omp-web update");
  const mode = serviceInstallMode(backend);
  if (mode === "not installed") throw new Error("PI WEB is not installed. Run `omp-web install` first.");
  if (mode === "development" || mode === "mixed") {
    throw new Error("A development install is updated from its checkout (git pull, then `omp-web install --dev`). `omp-web update` only refreshes a production install.");
  }

  console.log("Updating PI WEB package...");
  run("bun", ["add", "-g", `${OMP_WEB_PACKAGE_NAME}@latest`], { check: true });

  console.log("Refreshing installed services...");
  // Re-exec the updated CLI so service units point at the newly installed package path.
  run("omp-web", ["install"], { check: true });

  serviceAction("status");
}

function systemdServiceAction(action: "start" | "stop" | "restart", refs: ServiceRef[]): void {
  const orderedRefs = action === "stop" ? stopOrder(refs) : action === "restart" ? restartOrder(refs) : startOrder(refs);
  run("systemctl", ["--user", action, ...orderedRefs.map((ref) => ref.systemdName)], { check: true });
}

function launchdServiceAction(action: "start" | "stop" | "restart", refs: ServiceRef[]): void {
  if (action === "stop") {
    for (const ref of stopOrder(refs)) launchdBootout(ref);
    return;
  }

  if (action === "restart") {
    // Restart each service fully (bootout + start) before moving to the next,
    // so the web/UI services are back up before sessiond is restarted.
    for (const ref of restartOrder(refs)) {
      launchdBootout(ref);
      launchdStart(ref);
    }
    return;
  }

  for (const ref of startOrder(refs)) launchdStart(ref);
}

function serviceAction(action: "start" | "stop" | "restart" | "status"): void {
  const backend = requireServiceBackend(`omp-web ${action}`);
  if (action === "status") {
    if (!printServiceStatusReport(backend)) process.exitCode = 1;
    return;
  }

  const refs = installedServiceRefs(backend);
  if (backend.kind === "systemd") systemdServiceAction(action, refs);
  else launchdServiceAction(action, refs);
}

function logs(): void {
  const backend = requireServiceBackend("omp-web logs");
  const refs = installedServiceRefs(backend);
  if (backend.kind === "systemd") {
    run("journalctl", ["--user", ...refs.flatMap((ref) => ["-u", ref.systemdName]), "-f"]);
    return;
  }
  run("tail", ["-F", ...refs.map((ref) => launchdLogPath(logDir, ref))]);
}

function serviceShellLabel(): string {
  return `${detectServiceShell().name} -lc`;
}

function systemdUserServiceShellCommand(command: string, cwd?: string): string[] {
  return [
    "systemd-run",
    "--user",
    "--wait",
    "--collect",
    "--pipe",
    "--quiet",
    ...serviceShellCommand(command, cwd),
  ];
}

function commandCheck(command: string): string {
  return `command -v ${command}`;
}

export function commandWithVersionCheck(command: string): string {
  const found = commandCheck(command);
  if (detectServiceShell().name === "fish") {
    return `${found} && begin; ${command} --version 2>&1 || true; end`;
  }
  return `${found} && (${command} --version 2>&1 || true)`;
}

export function codingAgentCommandWithVersionCheck(): string {
  if (detectServiceShell().name === "fish") {
    return "if command -v omp >/dev/null 2>&1; command -v omp; and omp --version 2>&1 || true; else; command -v pi; and pi --version 2>&1 || true; end";
  }
  return "(command -v omp >/dev/null 2>&1 && (command -v omp && (omp --version 2>&1 || true))) || (command -v pi && (pi --version 2>&1 || true))";
}

function nodeVersionCheck(): string {
  return [
    commandCheck("node"),
    "node -e \"const major = Number(process.versions.node.split('.')[0]); console.log(process.version); process.exit(major >= 22 ? 0 : 1);\"",
  ].join(" && ");
}

function doctorChecks(): Check[] {
  const shell = serviceShellLabel();
  const backend = currentServiceBackend();
  if (backend === undefined) {
    return [
      [`${shell} can find node >= 22`, serviceShellCommand(nodeVersionCheck())],
      [`${shell} can find bun`, serviceShellCommand(commandWithVersionCheck("bun"))],
      [`${shell} can find omp or pi`, serviceShellCommand(codingAgentCommandWithVersionCheck())],
    ];
  }

  const checks: Check[] = [
    ...backendAvailabilityChecks(backend),
    ...baseShellChecks(backend),
    [`${shell} can find bun`, serviceShellCommand(commandWithVersionCheck("bun"))],
    [`${shell} can find omp or pi`, serviceShellCommand(codingAgentCommandWithVersionCheck())],
  ];
  const executables = resolveServiceExecutables(backend);
  checks.push(...executables.web.checks, ...executables.sessiond.checks);
  if (backend.kind === "systemd") {
    checks.push([`systemd user ${shell} can find omp or pi`, systemdUserServiceShellCommand(codingAgentCommandWithVersionCheck())]);
  }
  return checks;
}

async function doctor(): Promise<void> {
  await runDoctor({
    platformLabel,
    currentServiceBackend,
    describeServiceShell,
    doctorChecks,
    supportsSystemdUserServices,
    isLingerEnabled,
    manualRunAdvice,
    serviceShellLabel,
    serviceShellCommand,
    systemdUserServiceShellCommand,
    commandCheck,
    detectServiceShell,
  });
}

function help(): void {
  console.log(`PI WEB

Usage:
  omp-web install [--dev] [--host 127.0.0.1] [--port 8504] [--config ~/.config/omp-web/config.json]
  omp-web update
  omp-web uninstall
  omp-web start|stop|restart|status|logs
  omp-web doctor
  else if (command === "update") update();

Recommended install:
  bun add -g @progmruansilva/omp-web
  omp-web install

Development service install from a checkout:
  omp-web install --dev
`);
}

async function main(): Promise<void> {
  const [command = "help", ...args] = process.argv.slice(2);
  if (command === "install") await install(args);
  else if (command === "update") update();
  else if (command === "uninstall") await uninstall();
  else if (command === "start" || command === "stop" || command === "restart" || command === "status") serviceAction(command);
  else if (command === "logs") logs();
  else if (command === "doctor") await doctor();
  else if (command === "version") await printOmpWebVersionReport();
  else if (command === "--version" || command === "-v") console.log(packageVersion());
  else if (command === "help" || command === "--help" || command === "-h") help();
  else throw new Error(`Unknown command: ${command}`);
}

export function isCliEntrypoint(entrypoint: string | undefined = process.argv[1], modulePath: string = fileURLToPath(import.meta.url)): boolean {
  if (entrypoint === undefined) return false;
  if (entrypoint === modulePath) return true;
  try {
    return realpathSync(entrypoint) === realpathSync(modulePath);
  } catch {
    return false;
  }
}

if (isCliEntrypoint()) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
