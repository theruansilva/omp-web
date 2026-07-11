import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { OMP_WEB_DOCKER_USER_COMMANDS } from "./ompWebDockerCommandPlan.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dockerOneLine = "curl -fsSL https://raw.githubusercontent.com/ProgmRuanSilva/omp-web/main/docker/install.sh | sh";

describe("omp-web-docker documentation", () => {
  it("documents the Docker one-line install in the Docker guide", async () => {
    const dockerReadme = await readRepoFile("docker/README.md");

    expect(dockerReadme).toContain(dockerOneLine);
    expect(dockerReadme).toContain("does not require Bun or Node.js on the host");
  });

  it("keeps Docker setup documentation scoped to the Docker folder", async () => {
    const nonDockerDocs = await Promise.all([
      readRepoFile("README.md"),
      readRepoFile("docs/install.html"),
      readRepoFile("docs/plugins.md"),
      readRepoFile("docs/plugins.html"),
    ]);

    for (const content of nonDockerDocs) {
      expect(content).not.toContain(dockerOneLine);
      expect(content).not.toContain("omp-web-docker");
      expect(content).not.toContain("Docker beta");
      expect(content).not.toContain("Docker guide");
    }
  });

  it("keeps the Docker command matrix aligned with the canonical user command surface", async () => {
    const [dockerReadme, dockerEntrypoint] = await Promise.all([
      readRepoFile("docker/README.md"),
      readRepoFile("docker/omp-web-docker"),
    ]);

    for (const command of OMP_WEB_DOCKER_USER_COMMANDS) {
      expect(dockerReadme).toContain(`| \`${command}\` |`);
      expect(dockerEntrypoint).toContain(command);
    }

    expect(dockerReadme).toContain("`omp-web-docker --dev status`");
    expect(dockerReadme).toContain("`./docker/omp-web-docker --dev start`");
    expect(dockerReadme).not.toContain("omp-web-docker-control");
    expect(dockerReadme).not.toContain("docker/scripts/docker-compose-dev");
  });
});

async function readRepoFile(relativePath: string): Promise<string> {
  return await readFile(join(repoRoot, relativePath), "utf8");
}
