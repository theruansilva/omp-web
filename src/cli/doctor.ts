import { userInfo } from "node:os";
import { printOmpWebVersionReport } from "../ompWebVersionReport.js";
import type { Check, ServiceBackend, ServiceShell } from "./types.js";

export function capture(command: string, args: string[]): { status: number; stdout: string; stderr: string } {
  const proc = Bun.spawnSync([command, ...args]);
  return {
    status: proc.exitCode,
    stdout: proc.stdout.toString(),
    stderr: proc.stderr.toString(),
  };
}

export function runChecks(checks: Check[]): boolean {
  let failed = false;
  for (const [label, command] of checks) {
    const [bin, ...args] = command;
    if (bin === undefined) continue;
    const result = capture(bin, args);
    const ok = result.status === 0;
    failed ||= !ok;
    console.log(`${ok ? "✓" : "✗"} ${label}`);
    printCheckOutput(result.stdout || result.stderr);
  }
  return !failed;
}

export function printCheckOutput(output: string): void {
  const trimmed = output.trim();
  if (trimmed === "") return;
  const lines = trimmed.split("\n");
  for (const line of lines.slice(0, 3)) console.log(`  ${line}`);
  if (lines.length > 3) console.log("  ...");
}

export function printPathSetupAdvice(shellName?: string): void {
  console.log("\nPATH setup advice:");
  if (shellName === "bash") {
    console.log("  Detected bash. Put PATH setup for node/version managers/tools in ~/.bash_profile or ~/.profile.");
    console.log("  If ~/.bash_profile exists, bash will not read ~/.profile unless you source it from ~/.bash_profile.");
    console.log("  Do not rely only on ~/.bashrc or prompt hooks for tools needed by services or agents.");
  } else if (shellName === "zsh") {
    console.log("  Detected zsh. Put PATH setup for node/version managers/tools in ~/.zprofile, not only ~/.zshrc.");
    console.log("  Avoid relying on prompt hooks; PI WEB services run non-interactive login shells.");
  } else {
    console.log("  Detected fish. Prefer universal PATH setup such as `fish_add_path -U ...` for tools needed by services or agents.");
    console.log("  Avoid relying on prompt hooks; PI WEB services run non-interactive login shells.");
  }
}


export interface DoctorDeps {
  platformLabel: () => string;
  currentServiceBackend: () => ServiceBackend | undefined;
  describeServiceShell: () => string;
  doctorChecks: () => Check[];
  supportsSystemdUserServices: () => boolean;
  isLingerEnabled: () => boolean | undefined;
  manualRunAdvice: () => string;
  serviceShellLabel: () => string;
  serviceShellCommand: (command: string, cwd?: string) => string[];
  systemdUserServiceShellCommand: (command: string, cwd?: string) => string[];
  commandCheck: (tool: string) => string;
  detectServiceShell: () => ServiceShell;
}

export function printOptionalDoctorChecks(deps: DoctorDeps): void {
  const shell = deps.serviceShellLabel();
  const backend = deps.currentServiceBackend();
  const checks: Check[] = [[`${shell} can find optional ripgrep (rg)`, deps.serviceShellCommand(deps.commandCheck("rg"))]];
  if (backend?.kind === "systemd") checks.push([`systemd user ${shell} can find optional ripgrep (rg)`, deps.systemdUserServiceShellCommand(deps.commandCheck("rg"))]);

  let missingOptionalTool = false;
  for (const [label, command] of checks) {
    const [bin, ...args] = command;
    if (bin === undefined) continue;
    const result = capture(bin, args);
    const ok = result.status === 0;
    missingOptionalTool ||= !ok;
    console.log(`${ok ? "✓" : "!"} ${label}`);
    printCheckOutput(result.stdout || result.stderr);
  }
  if (missingOptionalTool) {
    console.log("  Install ripgrep, or make rg visible to the service shell, for faster all-file @ suggestions.");
    console.log("  PI WEB falls back to a bounded filesystem scan when rg is unavailable.");
  }
}

export async function runDoctor(deps: DoctorDeps): Promise<void> {
  const backend = deps.currentServiceBackend();
  console.log(`Platform: ${deps.platformLabel()}`);
  console.log(`Service backend: ${backend?.label ?? "manual run only"}`);
  console.log(`Service shell: ${deps.describeServiceShell()}`);
  if (backend === undefined) {
    console.log(`- Native user service checks skipped on ${deps.platformLabel()}`);
  }
  console.log("");
  await printOmpWebVersionReport();
  console.log("\nDoctor checks:");
  const ok = runChecks(deps.doctorChecks());
  printOptionalDoctorChecks(deps);

  if (deps.supportsSystemdUserServices()) {
    const linger = deps.isLingerEnabled();
    if (linger === true) {
      console.log("✓ systemd user lingering enabled");
    } else if (linger === false) {
      console.log("✗ systemd user lingering disabled");
      console.log(`  Recommended on servers: sudo loginctl enable-linger ${userInfo().username}`);
    } else {
      console.log("? systemd user lingering unknown");
      console.log(`  Recommended on servers: sudo loginctl enable-linger ${userInfo().username}`);
    }
  } else if (backend?.kind === "launchd") {
    console.log("- user services start at login with LaunchAgents");
  } else {
    console.log(`- systemd user lingering skipped on ${deps.platformLabel()}`);
  }

  if (!ok) {
    console.log("\nIf a command works in your terminal but fails here, make sure your service shell login files set PATH the same way.");
    if (backend?.kind === "systemd") console.log("If a bundled entrypoint is not accessible, reinstall or update the PI WEB package.");
    printPathSetupAdvice(deps.detectServiceShell().name);
  }

  if (ok && backend === undefined) {
    console.log(`\n${deps.manualRunAdvice()}`);
  }

  if (!ok) process.exitCode = 1;
}
