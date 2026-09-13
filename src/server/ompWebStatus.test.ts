import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "bun:test";
import { comparePackageVersions, getOmpWebRuntime, getOmpWebStatus, getOmpWebVersionStatus } from "./ompWebStatus.js";
import { SessionDaemonClient } from "../sessiond/sessionDaemonClient.js";
import type { OmpWebComponentStatus } from "../shared/apiTypes.js";
import { OMP_WEB_CAPABILITIES } from "../shared/capabilities.js";

const originalSkipVersionCheck = process.env["OMP_WEB_SKIP_VERSION_CHECK"];
const originalHome = process.env["HOME"];
const originalPath = process.env["PATH"];
const originalDockerRuntime = process.env["OMP_WEB_DOCKER_RUNTIME"];
const originalDockerMode = process.env["OMP_WEB_DOCKER_MODE"];
const originalDockerInstallDir = process.env["OMP_WEB_DOCKER_INSTALL_DIR"];
const originalDockerDevRepoRoot = process.env["OMP_WEB_DOCKER_DEV_REPO_ROOT"];

afterEach(() => {
  restoreEnv("OMP_WEB_SKIP_VERSION_CHECK", originalSkipVersionCheck);
  restoreEnv("HOME", originalHome);
  restoreEnv("PATH", originalPath);
  restoreEnv("OMP_WEB_DOCKER_RUNTIME", originalDockerRuntime);
  restoreEnv("OMP_WEB_DOCKER_MODE", originalDockerMode);
  restoreEnv("OMP_WEB_DOCKER_INSTALL_DIR", originalDockerInstallDir);
  restoreEnv("OMP_WEB_DOCKER_DEV_REPO_ROOT", originalDockerDevRepoRoot);
  vi.restoreAllMocks();
});

describe("PI WEB status", () => {
  it("compares semver-shaped CalVer versions", () => {
    expect(comparePackageVersions("1.202605.9", "1.202605.8")).toBeGreaterThan(0);
    expect(comparePackageVersions("1.202605.8", "1.202605.8")).toBe(0);
    expect(comparePackageVersions("1.202605.7", "1.202605.8")).toBeLessThan(0);
  });

  it("returns installed and running version components without release metadata", async () => {
    const daemon = daemonWithComponent({
      component: "sessiond",
      label: "Session daemon",
      runtimeVersion: "1.202605.7",
      installedVersion: "1.202605.8",
      stale: true,
      available: true,
    });

    const status = await getOmpWebVersionStatus(daemon);

    expect(status.packageName).toBe("@ProgmRuanSilva/omp-web");
    expect(status.components.web.component).toBe("web");
    expect(status.components.sessiond.runtimeVersion).toBe("1.202605.7");
    expect(status).not.toHaveProperty("release");
  });

  it("reports web-only capabilities from the web runtime", async () => {
    const daemon = daemonWithComponent({
      component: "sessiond",
      label: "Session daemon",
      runtimeVersion: "1.202605.7",
      installedVersion: "1.202605.8",
      stale: true,
      available: true,
    });

    const runtime = await getOmpWebRuntime(daemon);

    expect(runtime.components.web.capabilities).toEqual(expect.arrayContaining([OMP_WEB_CAPABILITIES.piPackagesManage, OMP_WEB_CAPABILITIES.selectedMachineSettings]));
    expect(runtime.components.sessiond.capabilities).not.toContain(OMP_WEB_CAPABILITIES.piPackagesManage);
    expect(runtime.components.sessiond.capabilities).not.toContain(OMP_WEB_CAPABILITIES.selectedMachineSettings);
    expect(runtime.capabilities).toEqual(expect.arrayContaining([OMP_WEB_CAPABILITIES.piPackagesManage, OMP_WEB_CAPABILITIES.selectedMachineSettings]));
  });

  it("reports stale session daemon versions as messages", async () => {
    process.env["OMP_WEB_SKIP_VERSION_CHECK"] = "1";
    disableDockerRuntimeEnv();
    const daemon = daemonWithComponent({
      component: "sessiond",
      label: "Session daemon",
      runtimeVersion: "1.202605.7",
      installedVersion: "1.202605.8",
      stale: true,
      available: true,
      installation: { kind: "pi-package", source: "npm:@ProgmRuanSilva/omp-web", scope: "user", path: "/tmp/omp-web" },
    });

    const status = await getOmpWebStatus(daemon);

    expect(status.release.skipped).toBe(true);
    expect(status.components.sessiond.stale).toBe(true);
    expect(status.components.sessiond.installation).toMatchObject({ kind: "pi-package", source: "npm:@ProgmRuanSilva/omp-web", scope: "user" });
    expect(status.messages.map((message) => message.id)).toContain("sessiond-stale");
  });

  it.skipIf(process.platform !== "linux")("suggests native systemd commands for local development services", async () => {
    process.env["OMP_WEB_SKIP_VERSION_CHECK"] = "1";
    disableDockerRuntimeEnv();
    const home = await tempHome();
    const binDir = await tempHome();
    try {
      process.env["HOME"] = home;
      await installExecutable(binDir, "systemctl");
      process.env["PATH"] = `${binDir}:${process.env["PATH"] ?? ""}`;
      await installSystemdServiceFiles(home, ["omp-web-sessiond.service", "omp-web-ui-dev.service"]);
      const daemon = daemonWithComponent(staleLocalSessiond());

      const status = await getOmpWebStatus(daemon);

      expect(status.commands.restart).toBe("systemd-run --user --collect --unit=omp-web-restart -- systemctl --user restart omp-web-ui-dev.service omp-web-sessiond.service");
      expect(status.commands.restartWeb).toBe("systemd-run --user --collect --unit=omp-web-restart-web -- systemctl --user restart omp-web-ui-dev.service");
      expect(status.commands.restartSessiond).toBe("systemd-run --user --collect --unit=omp-web-restart-sessiond -- systemctl --user restart omp-web-sessiond.service");
      expect(status.messages.find((message) => message.id === "sessiond-stale")?.command).toBe("systemd-run --user --collect --unit=omp-web-restart-sessiond -- systemctl --user restart omp-web-sessiond.service");
    } finally {
      await Promise.all([
        rm(home, { recursive: true, force: true }),
        rm(binDir, { recursive: true, force: true }),
      ]);
    }
  });

  it("suggests Docker commands when running inside the Docker runtime", async () => {
    process.env["OMP_WEB_SKIP_VERSION_CHECK"] = "1";
    process.env["OMP_WEB_DOCKER_RUNTIME"] = "1";
    process.env["OMP_WEB_DOCKER_MODE"] = "runtime";
    process.env["OMP_WEB_DOCKER_INSTALL_DIR"] = "/srv/omp-web-docker";
    process.env["PATH"] = "";
    const daemon = daemonWithComponent({ ...staleLocalSessiond(), installation: { kind: "docker", path: "/srv/omp-web-docker", dockerMode: "runtime" } });

    const status = await getOmpWebStatus(daemon);

    expect(status.components.web.installation).toEqual({ kind: "docker", path: "/srv/omp-web-docker", dockerMode: "runtime" });
    expect(status.commands).toEqual({
      update: "omp-web-docker update",
      restart: "omp-web-docker restart",
      restartWeb: "omp-web-docker restart-web",
      restartSessiond: "omp-web-docker restart-sessiond",
      status: "omp-web-docker status",
    });
    expect(JSON.stringify(status)).not.toContain("npm install -g");
    expect(JSON.stringify(status)).not.toContain("omp-web restart");
  });

  it("suggests explicit Docker development commands when running inside the Docker dev runtime", async () => {
    process.env["OMP_WEB_SKIP_VERSION_CHECK"] = "1";
    process.env["OMP_WEB_DOCKER_RUNTIME"] = "1";
    process.env["OMP_WEB_DOCKER_MODE"] = "dev";
    process.env["OMP_WEB_DOCKER_DEV_REPO_ROOT"] = "/workspace/omp-web";
    process.env["PATH"] = "";
    const daemon = daemonWithComponent({ ...staleLocalSessiond(), installation: { kind: "docker", path: "/workspace/omp-web", dockerMode: "dev" } });

    const status = await getOmpWebStatus(daemon);

    expect(status.commands).toEqual({
      update: "omp-web-docker --dev update",
      restart: "omp-web-docker --dev restart",
      restartWeb: "omp-web-docker --dev restart-web",
      restartSessiond: "omp-web-docker --dev restart-sessiond",
      status: "omp-web-docker --dev status",
    });
  });

  it("infers explicit Docker development commands from the generated dev root when mode is omitted", async () => {
    process.env["OMP_WEB_SKIP_VERSION_CHECK"] = "1";
    process.env["OMP_WEB_DOCKER_RUNTIME"] = "1";
    Reflect.deleteProperty(process.env, "OMP_WEB_DOCKER_MODE");
    process.env["OMP_WEB_DOCKER_DEV_REPO_ROOT"] = "/workspace/omp-web";
    process.env["PATH"] = "";
    const daemon = daemonWithComponent(staleLocalSessiond());

    const status = await getOmpWebStatus(daemon);

    expect(status.components.web.installation).toEqual({ kind: "docker", path: "/workspace/omp-web", dockerMode: "dev" });
    expect(status.commands.update).toBe("omp-web-docker --dev update");
    expect(status.commands.status).toBe("omp-web-docker --dev status");
  });

  it("omits local restart commands when no native service command is known", async () => {
    process.env["OMP_WEB_SKIP_VERSION_CHECK"] = "1";
    disableDockerRuntimeEnv();
    const home = await tempHome();
    try {
      process.env["HOME"] = home;
      const daemon = daemonWithComponent(staleLocalSessiond());

      const status = await getOmpWebStatus(daemon);
      const staleMessage = status.messages.find((message) => message.id === "sessiond-stale");

      expect(status.commands.restart).toBeUndefined();
      expect(staleMessage?.command).toBeUndefined();
      expect(JSON.stringify(status)).not.toContain("omp-web restart");
    } finally {
      await rm(home, { recursive: true, force: true });
    }
  });
});

function daemonWithComponent(component: OmpWebComponentStatus): SessionDaemonClient {
  const daemon = new SessionDaemonClient();
  vi.spyOn(daemon, "request").mockResolvedValue({
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ version: component }),
  });
  return daemon;
}

function staleLocalSessiond(): OmpWebComponentStatus {
  return {
    component: "sessiond",
    label: "Session daemon",
    runtimeVersion: "1.202605.7",
    installedVersion: "1.202605.8",
    stale: true,
    available: true,
    installation: { kind: "local", path: "/srv/dev/omp-web" },
  };
}

async function tempHome(): Promise<string> {
  return await mkdtemp(join(tmpdir(), "omp-web-status-"));
}

async function installSystemdServiceFiles(home: string, names: string[]): Promise<void> {
  const dir = join(home, ".config", "systemd", "user");
  await mkdir(dir, { recursive: true });
  await Promise.all(names.map((name) => writeFile(join(dir, name), "")));
}

async function installExecutable(dir: string, name: string): Promise<void> {
  const path = join(dir, name);
  await writeFile(path, "#!/usr/bin/env sh\nexit 0\n");
  await chmod(path, 0o755);
}

function disableDockerRuntimeEnv(): void {
  process.env["OMP_WEB_DOCKER_RUNTIME"] = "0";
  Reflect.deleteProperty(process.env, "OMP_WEB_DOCKER_MODE");
  Reflect.deleteProperty(process.env, "OMP_WEB_DOCKER_INSTALL_DIR");
  Reflect.deleteProperty(process.env, "OMP_WEB_DOCKER_DEV_REPO_ROOT");
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) Reflect.deleteProperty(process.env, key);
  else process.env[key] = value;
}
