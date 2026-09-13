import { describe, expect, it } from "bun:test";
import { OMP_WEB_CAPABILITIES } from "./capabilities";
import { parseOmpWebComponentStatus, parseOmpWebInstallationInfo, parseOmpWebRuntimeResponse, parseOmpWebVersionResponse } from "./ompWebStatusParsing";

describe("PI WEB status parsing", () => {
  it("parses known top-level and component capabilities while ignoring unknown strings", () => {
    expect(parseOmpWebRuntimeResponse({
      packageName: "@ProgmRuanSilva/omp-web",
      generatedAt: "now",
      components: {
        web: { component: "web", label: "Web/UI", runtimeVersion: "1.0.0", available: true, capabilities: [OMP_WEB_CAPABILITIES.piPackagesManage, OMP_WEB_CAPABILITIES.selectedMachineSettings, "future.capability"] },
        sessiond: { component: "sessiond", label: "Session daemon", runtimeVersion: "1.0.0", available: true, capabilities: ["future.sessiondCapability"] },
      },
      capabilities: [OMP_WEB_CAPABILITIES.piPackagesManage, OMP_WEB_CAPABILITIES.selectedMachineSettings, "future.capability"],
    })).toMatchObject({
      components: {
        web: { capabilities: [OMP_WEB_CAPABILITIES.piPackagesManage, OMP_WEB_CAPABILITIES.selectedMachineSettings] },
        sessiond: { capabilities: [] },
      },
      capabilities: [OMP_WEB_CAPABILITIES.piPackagesManage, OMP_WEB_CAPABILITIES.selectedMachineSettings],
    });
  });

  it("rejects runtime responses with malformed component capability arrays", () => {
    expect(parseOmpWebRuntimeResponse({
      packageName: "@ProgmRuanSilva/omp-web",
      generatedAt: "now",
      components: {
        web: { component: "web", label: "Web/UI", available: true, capabilities: [OMP_WEB_CAPABILITIES.piPackagesManage, 1] },
        sessiond: { component: "sessiond", label: "Session daemon", available: true, capabilities: [] },
      },
      capabilities: [OMP_WEB_CAPABILITIES.piPackagesManage],
    })).toBeUndefined();
  });

  it("parses Docker installation metadata", () => {
    expect(parseOmpWebInstallationInfo({ kind: "docker", path: "/srv/omp-web-docker", dockerMode: "runtime" })).toEqual({
      kind: "docker",
      path: "/srv/omp-web-docker",
      dockerMode: "runtime",
    });
    expect(parseOmpWebInstallationInfo({ kind: "docker", path: "/workspace/omp-web", dockerMode: "dev" })).toEqual({
      kind: "docker",
      path: "/workspace/omp-web",
      dockerMode: "dev",
    });
  });

  it("ignores invalid optional Docker modes without rejecting component status", () => {
    expect(parseOmpWebComponentStatus({
      component: "web",
      label: "Web/UI",
      runtimeVersion: "1.0.0",
      stale: false,
      available: true,
      installation: { kind: "docker", path: "/workspace/omp-web", dockerMode: "hidden" },
    })?.installation).toEqual({ kind: "docker", path: "/workspace/omp-web" });
  });

  it("parses version responses that include Docker runtime and development components", () => {
    const parsed = parseOmpWebVersionResponse({
      packageName: "@ProgmRuanSilva/omp-web",
      generatedAt: "now",
      components: {
        web: { component: "web", label: "Web/UI", runtimeVersion: "1.0.0", stale: false, available: true, installation: { kind: "docker", path: "/srv/omp-web-docker", dockerMode: "runtime" } },
        sessiond: { component: "sessiond", label: "Session daemon", runtimeVersion: "1.0.0", stale: false, available: true, installation: { kind: "docker", path: "/workspace/omp-web", dockerMode: "dev" } },
      },
    });

    expect(parsed?.components.web.installation).toEqual({ kind: "docker", path: "/srv/omp-web-docker", dockerMode: "runtime" });
    expect(parsed?.components.sessiond.installation).toEqual({ kind: "docker", path: "/workspace/omp-web", dockerMode: "dev" });
  });
});
