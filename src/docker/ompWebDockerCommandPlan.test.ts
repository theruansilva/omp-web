import { describe, expect, it } from "vitest";
import {
  OMP_WEB_DOCKER_USER_COMMANDS,
  parseOmpWebDockerArgs,
  ompWebDockerCommand,
  ompWebDockerCommandPrefix,
  planOmpWebDockerDevHostCommand,
  planOmpWebDockerRuntimeHostCommand,
  validateOmpWebDockerDevRootSafety,
} from "./ompWebDockerCommandPlan.js";

describe("omp-web-docker command planning", () => {
  it("plans runtime commands by default", () => {
    expect(parseOmpWebDockerArgs(["status"])).toEqual({
      ok: true,
      plan: { mode: "runtime", command: "status", allowRoot: false, args: [] },
    });
  });

  it("emits runtime commands by default and development commands explicitly", () => {
    expect(parseOmpWebDockerArgs(["--dev", "restart-sessiond"])).toEqual({
      ok: true,
      plan: { mode: "dev", command: "restart-sessiond", allowRoot: false, args: [] },
    });
    expect(ompWebDockerCommandPrefix(undefined)).toBe("omp-web-docker");
    expect(ompWebDockerCommandPrefix("runtime")).toBe("omp-web-docker");
    expect(ompWebDockerCommandPrefix("dev")).toBe("omp-web-docker --dev");
    expect(ompWebDockerCommand(undefined, "status")).toBe("omp-web-docker status");
    expect(ompWebDockerCommand("runtime", "update")).toBe("omp-web-docker update");
    expect(ompWebDockerCommand("dev", "status")).toBe("omp-web-docker --dev status");
  });

  it("keeps production install out of development mode", () => {
    expect(parseOmpWebDockerArgs(["install", "--install-dir", "/srv/omp-web-docker"])).toEqual({
      ok: true,
      plan: { mode: "runtime", command: "install", allowRoot: false, args: ["--install-dir", "/srv/omp-web-docker"] },
    });
    expect(parseOmpWebDockerArgs(["--dev", "install"])).toEqual({
      ok: false,
      errors: ["install is only available in runtime mode"],
    });
  });

  it("validates logs and shell targets", () => {
    expect(parseOmpWebDockerArgs(["--dev", "logs", "data-init"])).toEqual({
      ok: true,
      plan: { mode: "dev", command: "logs", allowRoot: false, args: ["data-init"], target: "data-init" },
    });
    expect(parseOmpWebDockerArgs(["logs", "data-init"])).toEqual({
      ok: false,
      errors: ["logs data-init is only available in development mode"],
    });
    expect(parseOmpWebDockerArgs(["shell"])).toEqual({
      ok: true,
      plan: { mode: "runtime", command: "shell", allowRoot: false, args: [], target: "web" },
    });
    expect(parseOmpWebDockerArgs(["shell", "data-init"])).toEqual({
      ok: false,
      errors: ["Invalid shell target: data-init"],
    });
  });

  it("treats cli as the omp-web escape hatch", () => {
    expect(parseOmpWebDockerArgs(["cli", "config", "show"])).toEqual({
      ok: true,
      plan: { mode: "runtime", command: "cli", allowRoot: false, args: ["config", "show"] },
    });
    expect(parseOmpWebDockerArgs(["cli"])).toEqual({ ok: false, errors: ["cli requires omp-web arguments"] });
  });

  it("keeps the canonical user command surface parseable", () => {
    const sampleArgs = new Map<string, string[]>([
      ["install", ["--asset-ref", "release"]],
      ["logs", ["web"]],
      ["shell", ["sessiond"]],
      ["cli", ["config", "show"]],
    ]);

    for (const command of OMP_WEB_DOCKER_USER_COMMANDS) {
      const parsed = parseOmpWebDockerArgs([command, ...(sampleArgs.get(command) ?? [])]);
      expect(parsed).toMatchObject({ ok: true });
    }
  });

  it("rejects unknown options and unexpected positional arguments", () => {
    expect(parseOmpWebDockerArgs(["--prod", "status"])).toEqual({ ok: false, errors: ["Unknown global option: --prod"] });
    expect(parseOmpWebDockerArgs(["status", "web"])).toEqual({ ok: false, errors: ["status does not accept positional arguments"] });
    expect(parseOmpWebDockerArgs(["restart-sessiond", "web"])).toEqual({ ok: false, errors: ["restart-sessiond does not accept positional arguments"] });
    expect(parseOmpWebDockerArgs([])).toEqual({ ok: false, errors: ["Missing command"] });
  });

  it("parses root override as an explicit global option", () => {
    expect(parseOmpWebDockerArgs(["--dev", "--allow-root", "status"])).toEqual({
      ok: true,
      plan: { mode: "dev", command: "status", allowRoot: true, args: [] },
    });
  });

  it("plans production host commands through installer or Compose actions", () => {
    expect(runtimeHostPlan(["install", "--asset-ref", "release"])).toEqual({
      kind: "installer",
      action: "install",
      args: ["--asset-ref", "release"],
      useRuntimeRootAsInstallDir: false,
    });
    expect(runtimeHostPlan(["update"])).toEqual({ kind: "installer", action: "update", args: [], useRuntimeRootAsInstallDir: true });
    expect(runtimeHostPlan(["start"])).toEqual({ kind: "compose", args: ["up", "-d"] });
    expect(runtimeHostPlan(["stop"])).toEqual({ kind: "compose", args: ["down"] });
    expect(runtimeHostPlan(["restart"])).toEqual({ kind: "compose", args: ["restart", "web", "sessiond"] });
    expect(runtimeHostPlan(["status"])).toEqual({ kind: "compose", args: ["ps"] });
    expect(runtimeHostPlan(["logs", "web"])).toEqual({ kind: "compose", args: ["logs", "-f", "web"] });
    expect(runtimeHostPlan(["shell"])).toEqual({ kind: "compose", args: ["exec", "web", "bash"] });
    expect(runtimeHostPlan(["cli", "config", "show"])).toEqual({ kind: "compose", args: ["exec", "web", "omp-web", "config", "show"] });
  });

  it("plans development host commands through the generated dev Compose environment", () => {
    expect(devHostPlan(["--dev", "start"])).toEqual({ kind: "compose", args: ["up", "-d", "--build"], usesGeneratedEnv: true });
    expect(devHostPlan(["--dev", "status"])).toEqual({ kind: "compose", args: ["ps"], usesGeneratedEnv: true });
    expect(devHostPlan(["--dev", "logs", "data-init"])).toEqual({ kind: "compose", args: ["logs", "-f", "data-init"], usesGeneratedEnv: true });
    expect(devHostPlan(["--dev", "shell"])).toEqual({ kind: "compose", args: ["exec", "web", "bash"], usesGeneratedEnv: true });
    expect(devHostPlan(["--dev", "cli", "config", "show"])).toEqual({ kind: "compose", args: ["exec", "web", "omp-web", "config", "show"], usesGeneratedEnv: true });
    expect(devHostPlan(["--dev", "update"])).toEqual({
      kind: "composeSequence",
      usesGeneratedEnv: true,
      steps: [
        { args: ["build", "--pull"] },
        { args: ["up", "-d", "--force-recreate", "--remove-orphans"] },
      ],
    });
  });

  it("keeps development root safety explicit in command planning", () => {
    const parsed = parseOmpWebDockerArgs(["--dev", "status"]);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.errors.join("\n"));
    expect(validateOmpWebDockerDevRootSafety(parsed.plan, 0)).toBe("refusing to run Docker development mode as root; retry with --allow-root if this is intentional");
    expect(validateOmpWebDockerDevRootSafety({ ...parsed.plan, allowRoot: true }, 0)).toBeUndefined();
    expect(validateOmpWebDockerDevRootSafety(parsed.plan, 500)).toBeUndefined();
  });

  it("does not apply production host planning to development mode", () => {
    const parsed = parseOmpWebDockerArgs(["--dev", "status"]);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(planOmpWebDockerRuntimeHostCommand(parsed.plan)).toBeUndefined();
  });

  it("does not apply development host planning to production mode", () => {
    const parsed = parseOmpWebDockerArgs(["status"]);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(planOmpWebDockerDevHostCommand(parsed.plan)).toBeUndefined();
  });
});

function runtimeHostPlan(argv: string[]) {
  const parsed = parseOmpWebDockerArgs(argv);
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) throw new Error(parsed.errors.join("\n"));
  return planOmpWebDockerRuntimeHostCommand(parsed.plan);
}

function devHostPlan(argv: string[]) {
  const parsed = parseOmpWebDockerArgs(argv);
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) throw new Error(parsed.errors.join("\n"));
  return planOmpWebDockerDevHostCommand(parsed.plan);
}
