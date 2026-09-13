import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { codingAgentCommandWithVersionCheck, commandWithVersionCheck, isCliEntrypoint } from "./cli.js";

const originalShell = process.env["SHELL"];

afterEach(() => {
  if (originalShell === undefined) {
    delete process.env["SHELL"];
  } else {
    process.env["SHELL"] = originalShell;
  }
});

describe("commandWithVersionCheck", () => {
  it("emits a POSIX subshell group for bash", () => {
    process.env["SHELL"] = "/bin/bash";
    expect(commandWithVersionCheck("npm")).toBe("command -v npm && (npm --version 2>&1 || true)");
  });

  it("emits a POSIX subshell group for zsh", () => {
    process.env["SHELL"] = "/bin/zsh";
    expect(commandWithVersionCheck("pi")).toBe("command -v pi && (pi --version 2>&1 || true)");
  });

  it("uses fish begin/end grouping instead of a POSIX subshell", () => {
    process.env["SHELL"] = "/usr/local/bin/fish";
    const command = commandWithVersionCheck("npm");
    expect(command).toBe("command -v npm && begin; npm --version 2>&1 || true; end");
    expect(command).not.toContain("(");
  });
});

describe("codingAgentCommandWithVersionCheck", () => {
  it("emits fallback check for bash and zsh", () => {
    process.env["SHELL"] = "/bin/bash";
    expect(codingAgentCommandWithVersionCheck()).toBe(
      "(command -v omp >/dev/null 2>&1 && (command -v omp && (omp --version 2>&1 || true))) || (command -v pi && (pi --version 2>&1 || true))",
    );
  });

  it("emits fish syntax when fish shell is detected", () => {
    process.env["SHELL"] = "/usr/local/bin/fish";
    expect(codingAgentCommandWithVersionCheck()).toBe(
      "if command -v omp >/dev/null 2>&1; command -v omp; and omp --version 2>&1 || true; else; command -v pi; and pi --version 2>&1 || true; end",
    );
  });
});

describe("isCliEntrypoint", () => {
  it("matches direct execution paths", () => {
    expect(isCliEntrypoint("/tmp/omp-web-cli.js", "/tmp/omp-web-cli.js")).toBe(true);
  });

  it("matches npm-style symlinked bin entrypoints", () => {
    const dir = mkdtempSync(join(tmpdir(), "omp-web-cli-test-"));
    try {
      const target = join(dir, "dist", "cli.js");
      const symlink = join(dir, "bin", "omp-web");
      mkdirSync(join(dir, "dist"));
      mkdirSync(join(dir, "bin"));
      writeFileSync(target, "#!/usr/bin/env bun\n", { mode: 0o755 });
      symlinkSync(target, symlink);

      expect(isCliEntrypoint(symlink, target)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not match unrelated paths", () => {
    expect(isCliEntrypoint("/tmp/omp-web", "/tmp/other-omp-web")).toBe(false);
  });
});
