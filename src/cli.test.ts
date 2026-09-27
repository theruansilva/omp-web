import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "bun:test";
import { codingAgentCommandWithVersionCheck, commandWithVersionCheck, isCliEntrypoint, remoteCommand, resetPasswordCommand, setPasswordCommand, sessionsCommand } from "./cli.js";
import { loadOmpWebConfig } from "./config.js";

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

describe("sessionsCommand", () => {
  it("prints message when no sessions are active or daemon is unreachable", async () => {
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(" "));
    try {
      await sessionsCommand([]);
      expect(logs.length).toBeGreaterThan(0);
    } finally {
      console.log = origLog;
    }
  });

  it("outputs valid json with --json flag", async () => {
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(" "));
    try {
      await sessionsCommand(["--json"]);
      expect(logs.length).toBe(1);
      const parsed = JSON.parse(logs[0]!);
      expect(Array.isArray(parsed)).toBe(true);
    } finally {
      console.log = origLog;
    }
  });
});

describe("password CLI commands", () => {
  it("sets a new password via setPasswordCommand", async () => {
    const dir = mkdtempSync(join(tmpdir(), "omp-cli-pass-"));
    process.env["OMP_WEB_CONFIG"] = join(dir, "config.json");
    try {
      await setPasswordCommand(["customadmin", "newsecret123"]);
      const loaded = loadOmpWebConfig();
      expect(loaded.config.authUsername).toBe("customadmin");
      expect(loaded.config.authPasswordHash).toContain("$argon2id$");
      expect(await Bun.password.verify("newsecret123", loaded.config.authPasswordHash!)).toBe(true);
    } finally {
      delete process.env["OMP_WEB_CONFIG"];
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("resets password via resetPasswordCommand", async () => {
    const dir = mkdtempSync(join(tmpdir(), "omp-cli-pass-"));
    process.env["OMP_WEB_CONFIG"] = join(dir, "config.json");
    try {
      await resetPasswordCommand(["admin"]);
      const loaded = loadOmpWebConfig();
      expect(loaded.config.authUsername).toBe("admin");
      expect(loaded.config.authPasswordHash).toContain("$argon2id$");
    } finally {
      delete process.env["OMP_WEB_CONFIG"];
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("remoteCommand", () => {
  it("enables and disables remote access via config", async () => {
    const dir = mkdtempSync(join(tmpdir(), "omp-cli-remote-"));
    process.env["OMP_WEB_CONFIG"] = join(dir, "config.json");
    try {
      await remoteCommand(["on"]);
      let loaded = loadOmpWebConfig();
      expect(loaded.config.host).toBe("0.0.0.0");
      expect(loaded.config.allowedHosts).toBe(true);

      await remoteCommand(["off"]);
      loaded = loadOmpWebConfig();
      expect(loaded.config.host).toBe("127.0.0.1");
    } finally {
      delete process.env["OMP_WEB_CONFIG"];
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
