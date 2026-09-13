export type InstallMode = "production" | "dev";
export type ServiceBackendKind = "systemd" | "launchd";
export type ServiceId = "sessiond" | "web" | "uiDev";
export type Check = [string, string[]];
export type SupportedShell = "bash" | "zsh" | "fish";
export type RestartPolicy = "on-failure" | "never";

export interface InstallOptions {
  host: string;
  port: string;
  mode: InstallMode;
  config?: string;
}

export interface ServiceBackend {
  kind: ServiceBackendKind;
  label: string;
}

export interface ServiceRef {
  id: ServiceId;
  systemdName: string;
  launchdLabel: string;
  launchdPlistName: string;
  logName: string;
}

export interface ServiceDefinition extends ServiceRef {
  description: string;
  shellCommand: string;
  restart: RestartPolicy;
  environment: Record<string, string>;
  after?: ServiceId[];
  wants?: ServiceId[];
  workingDirectory?: string;
}

export interface ServiceShell {
  name: SupportedShell;
  executable: string;
  detected?: string;
  fallback: boolean;
}

export interface ServiceExecutable {
  command: string;
  checks: Check[];
}

export interface ServiceExecutables {
  sessiond: ServiceExecutable;
  web: ServiceExecutable;
}

export type ServiceHealth = "running" | "stopped" | "not-installed" | "unknown";

export interface ServiceRuntimeStatus {
  ref: ServiceRef;
  health: ServiceHealth;
  detail: string;
  target: string;
  filePath: string;
  pid?: string;
}
