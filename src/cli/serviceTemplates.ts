import { join } from "node:path";
import type { ServiceDefinition, ServiceId, ServiceRef, ServiceShell } from "./types.js";

export function dependencyLine(name: "After" | "Wants", ids: ServiceId[] | undefined, serviceRefs: Record<ServiceId, ServiceRef>): string {
  if (ids === undefined || ids.length === 0) return "";
  return `${name}=${ids.map((id) => serviceRefs[id].systemdName).join(" ")}\n`;
}

export function environmentLines(environment: Record<string, string>, systemdEscape: (val: string) => string): string {
  return Object.entries(environment)
    .map(([key, value]) => `Environment="${key}=${systemdEscape(value)}"\n`)
    .join("");
}

export function systemdUnit(
  service: ServiceDefinition,
  serviceRefs: Record<ServiceId, ServiceRef>,
  systemdEscape: (val: string) => string,
  systemdQuotedValue: (val: string) => string,
  serviceShellExecPrefix: () => string,
  systemdServiceShellQuote: (val: string) => string,
): string {
  const workingDirectory = service.workingDirectory === undefined ? "" : `WorkingDirectory=${systemdQuotedValue(service.workingDirectory)}\n`;
  const restart = service.restart === "on-failure" ? "Restart=on-failure\nRestartSec=2\n" : "Restart=no\n";
  return `[Unit]
Description=${service.description}
${dependencyLine("After", service.after, serviceRefs)}${dependencyLine("Wants", service.wants, serviceRefs)}
[Service]
Type=simple
${workingDirectory}${environmentLines(service.environment, systemdEscape)}ExecStart=${serviceShellExecPrefix()} ${systemdServiceShellQuote(service.shellCommand)}
${restart}
[Install]
WantedBy=default.target
`;
}

export function plistString(key: string, value: string, xmlEscape: (v: string) => string, indent = "  "): string {
  return `${indent}<key>${xmlEscape(key)}</key>\n${indent}<string>${xmlEscape(value)}</string>\n`;
}

export function plistProgramArguments(service: ServiceDefinition, detectServiceShell: () => ServiceShell, xmlEscape: (v: string) => string): string {
  const args = ["/usr/bin/env", detectServiceShell().executable, "-lc", service.shellCommand];
  return `  <key>ProgramArguments</key>\n  <array>\n${args.map((arg) => `    <string>${xmlEscape(arg)}</string>`).join("\n")}\n  </array>\n`;
}

export function plistEnvironment(environment: Record<string, string>, xmlEscape: (v: string) => string): string {
  const entries = Object.entries(environment);
  if (entries.length === 0) return "";
  return `  <key>EnvironmentVariables</key>\n  <dict>\n${entries.map(([key, value]) => plistString(key, value, xmlEscape, "    ")).join("")}  </dict>\n`;
}

export function launchdLogPath(logDir: string, ref: ServiceRef): string {
  return join(logDir, ref.logName);
}

export function launchdPlist(
  service: ServiceDefinition,
  logDir: string,
  detectServiceShell: () => ServiceShell,
  xmlEscape: (v: string) => string,
): string {
  const workingDirectory = service.workingDirectory === undefined ? "" : plistString("WorkingDirectory", service.workingDirectory, xmlEscape);
  const keepAlive = service.restart === "on-failure" ? "  <key>KeepAlive</key>\n  <dict>\n    <key>SuccessfulExit</key>\n    <false/>\n  </dict>\n" : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
${plistString("Label", service.launchdLabel, xmlEscape)}${plistProgramArguments(service, detectServiceShell, xmlEscape)}${workingDirectory}${plistEnvironment(service.environment, xmlEscape)}  <key>RunAtLoad</key>
  <true/>
${keepAlive}${plistString("StandardOutPath", launchdLogPath(logDir, service), xmlEscape)}${plistString("StandardErrorPath", launchdLogPath(logDir, service), xmlEscape)}</dict>
</plist>
`;
}
