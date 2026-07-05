import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PI_WEB_DOCKER_USER_COMMANDS } from "./piWebDockerCommandPlan.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dockerOneLine = "curl -fsSL https://raw.githubusercontent.com/ProgmRuanSilva/omp-web/main/docker/install.sh | sh";

describe("pi-web-docker documentation", () => {
  it("documents the Docker one-line install in the Docker guide", async () => {
    const dockerReadme = await readRepoFile("docker/README.md");

    expect(dockerReadme).toContain(dockerOneLine);
    expect(dockerReadme).toContain("does not require Node.js or npm on the host");
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
      expect(content).not.toContain("pi-web-docker");
      expect(content).not.toContain("Docker beta");
      expect(content).not.toContain("Docker guide");
    }
  });

  it("keeps the Docker command matrix aligned with the canonical user command surface", async () => {
    const [dockerReadme, dockerEntrypoint] = await Promise.all([
      readRepoFile("docker/README.md"),
      readRepoFile("docker/pi-web-docker"),
    ]);

    for (const command of PI_WEB_DOCKER_USER_COMMANDS) {
      expect(dockerReadme).toContain(`| \`${command}\` |`);
      expect(dockerEntrypoint).toContain(command);
    }

    expect(dockerReadme).toContain("`pi-web-docker --dev status`");
    expect(dockerReadme).toContain("`./docker/pi-web-docker --dev start`");
    expect(dockerReadme).not.toContain("pi-web-docker-control");
    expect(dockerReadme).not.toContain("docker/scripts/docker-compose-dev");
  });
});

async function readRepoFile(relativePath: string): Promise<string> {
  return await readFile(join(repoRoot, relativePath), "utf8");
}
