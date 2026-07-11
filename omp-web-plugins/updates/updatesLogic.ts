import type { OmpWebDockerMode, OmpWebInstallationInfo, OmpWebStatusMessage, OmpWebStatusResponse, PluginRuntimeState } from "@ProgmRuanSilva/omp-web/plugin-api";

export interface CommandEntry {
  label: string;
  command: string;
}

export interface UpdatesRuntimeHint {
  dockerMode?: OmpWebDockerMode;
}

// The single command users should run when they do not want to think: if an
// update is available, `commands.update` already chains the update and a full
// restart; otherwise, when anything is stale, a full restart is enough.
export function recommendedCommand(status: OmpWebStatusResponse): CommandEntry | undefined {
  const { commands, release, components } = status;
  if (release.updateAvailable && typeof commands.update === "string" && commands.update !== "") {
    return { label: "Update & restart everything", command: commands.update };
  }
  const restartNeeded = components.web.stale || components.sessiond.stale || !components.sessiond.available;
  if (restartNeeded && typeof commands.restart === "string" && commands.restart !== "") {
    return { label: "Restart everything", command: commands.restart };
  }
  return undefined;
}

export function additionalCommands(status: OmpWebStatusResponse, recommended: CommandEntry | undefined): CommandEntry[] {
  return [
    ["Update", status.commands.update],
    ["Restart all", status.commands.restart],
    ["Restart Web/UI", status.commands.restartWeb],
    ["Restart session daemon", status.commands.restartSessiond],
    ["Status", status.commands.status],
  ]
    .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1] !== "")
    .filter(([, command]) => command !== recommended?.command)
    .map(([label, command]) => ({ label, command }));
}

export function messagesFor(state: PluginRuntimeState | undefined): OmpWebStatusMessage[] {
  return state?.ompWebStatus?.messages ?? [];
}

export function statusFor(state: PluginRuntimeState | undefined): OmpWebStatusResponse | undefined {
  return state?.ompWebStatus;
}

export function messageCount(state: PluginRuntimeState | undefined): number {
  return messagesFor(state).length;
}

export function isSelfManagedInstallation(installation: OmpWebInstallationInfo | undefined): boolean {
  return installation === undefined || installation.kind === "local" || installation.kind === "docker" || installation.kind === "unknown";
}

export function shouldShowUpdatesPanel(state: PluginRuntimeState | undefined, hint: UpdatesRuntimeHint = {}): boolean {
  const status = statusFor(state);
  if (hint.dockerMode !== undefined) return true;
  if (messageCount(state) > 0) return true;
  if (status === undefined) return false;
  return isSelfManagedInstallation(status.components.web.installation)
    || isSelfManagedInstallation(status.components.sessiond.installation);
}

export function fallbackDockerStatus(hint: UpdatesRuntimeHint, generatedAt = "federated status unavailable"): OmpWebStatusResponse | undefined {
  if (hint.dockerMode === undefined) return undefined;
  const commandPrefix = hint.dockerMode === "dev" ? "omp-web-docker --dev" : "omp-web-docker";
  const installation: OmpWebInstallationInfo = { kind: "docker", dockerMode: hint.dockerMode };
  return {
    packageName: "@ProgmRuanSilva/omp-web",
    generatedAt,
    components: {
      web: { component: "web", label: "Web/UI", stale: false, available: true, installation },
      sessiond: { component: "sessiond", label: "Session daemon", stale: false, available: true, installation },
    },
    release: { packageName: "@ProgmRuanSilva/omp-web", updateAvailable: false, skipped: true },
    commands: {
      update: `${commandPrefix} update`,
      restart: `${commandPrefix} restart`,
      restartWeb: `${commandPrefix} restart-web`,
      restartSessiond: `${commandPrefix} restart-sessiond`,
      status: `${commandPrefix} status`,
    },
    messages: [{
      id: "docker-status-compatibility",
      severity: "info",
      title: "Docker update commands available",
      body: "This Updates plugin was loaded from a Docker PI WEB runtime, but the gateway has not provided Docker-aware status details yet. The Docker maintenance commands below are still available.",
    }],
  };
}

export function formatVersion(version: string | undefined): string {
  return version === undefined || version === "" ? "unknown" : version;
}

export function installationLabel(installation: OmpWebInstallationInfo | undefined): string {
  if (installation === undefined) return "installation unknown";
  if (installation.kind === "pi-package") {
    const scope = installation.scope === undefined ? "" : ` · ${installation.scope}`;
    const source = installation.source ?? "Pi package";
    return `${source}${scope}`;
  }
  if (installation.kind === "npm-global") return "global npm package";
  if (installation.kind === "local") return "local checkout";
  if (installation.kind === "docker") return installation.dockerMode === "dev" ? "Docker development runtime" : "Docker runtime";
  return "installation unknown";
}
