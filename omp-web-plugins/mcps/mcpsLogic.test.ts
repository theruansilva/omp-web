import { describe, expect, it } from "bun:test";
import {
  countActiveServers,
  countFailedServers,
  formatCommandOrUrl,
  formatTransport,
  isMcpConfigFile,
  isServerEnabled,
  parseMcpConfigFile,
  toggleServerInConfig,
} from "./mcpsLogic.js";

describe("mcpsLogic", () => {
  describe("isMcpConfigFile & parseMcpConfigFile", () => {
    it("recognizes valid mcp config file", () => {
      expect(isMcpConfigFile({ mcpServers: {} })).toBe(true);
      expect(isMcpConfigFile({ mcpServers: { a: {} } })).toBe(true);
      expect(isMcpConfigFile(null)).toBe(false);
      expect(isMcpConfigFile({})).toBe(false);
      expect(isMcpConfigFile({ mcpServers: null })).toBe(false);
    });

    it("parses valid JSON into McpConfigFile", () => {
      const raw = JSON.stringify({
        mcpServers: {
          test: { command: "node", args: ["server.js"], enabled: true },
        },
      });
      const parsed = parseMcpConfigFile(raw);
      expect(parsed.mcpServers?.['test']?.command).toBe("node");
    });

    it("returns empty servers on malformed JSON", () => {
      expect(parseMcpConfigFile("not json").mcpServers).toEqual({});
      expect(parseMcpConfigFile("{}").mcpServers).toEqual({});
    });
  });

  describe("formatTransport", () => {
    it("prefers explicit type", () => {
      expect(formatTransport({ type: "sse" })).toBe("sse");
      expect(formatTransport({ type: "http" })).toBe("http");
      expect(formatTransport({ type: "stdio" })).toBe("stdio");
    });

    it("infers http when url is provided", () => {
      expect(formatTransport({ url: "http://localhost:8000" })).toBe("http");
    });

    it("defaults to stdio", () => {
      expect(formatTransport({ command: "python" })).toBe("stdio");
    });
  });

  describe("formatCommandOrUrl", () => {
    it("formats command with args", () => {
      expect(formatCommandOrUrl({ command: "npx", args: ["-y", "server"] })).toBe("npx -y server");
    });

    it("returns url if present", () => {
      expect(formatCommandOrUrl({ url: "http://127.0.0.1:4000/mcp" })).toBe("http://127.0.0.1:4000/mcp");
    });
  });

  describe("isServerEnabled & countActiveServers", () => {
    it("is enabled by default when enabled is undefined", () => {
      expect(isServerEnabled({})).toBe(true);
      expect(isServerEnabled({ enabled: true })).toBe(true);
      expect(isServerEnabled({ enabled: false })).toBe(false);
    });

    it("counts active servers across project and global", () => {
      const state = {
        projectServers: {
          s1: { command: "a", enabled: true },
          s2: { command: "b", enabled: false },
        },
        globalServers: {
          s3: { url: "http://...", enabled: true },
        },
      };
      expect(countActiveServers(state)).toBe(2);
    });

    it("counts failed servers from checkResults", () => {
      const state = {
        projectServers: {},
        globalServers: {},
        checkResults: {
          s1: { name: "s1", status: "connected" as const },
          s2: { name: "s2", status: "failed" as const, error: "timeout" },
          s3: { name: "s3", status: "failed" as const, error: "not found" },
          s4: { name: "s4", status: "disabled" as const },
        },
      };
      expect(countFailedServers(state)).toBe(2);
      expect(countFailedServers({ projectServers: {}, globalServers: {} })).toBe(0);
    });
  });

  describe("toggleServerInConfig", () => {
    it("toggles enabled state in JSON", () => {
      const initial = JSON.stringify(
        {
          mcpServers: {
            myServer: { command: "test", enabled: true },
          },
        },
        null,
        2
      );

      const updated = toggleServerInConfig(initial, "myServer");
      const parsed = JSON.parse(updated) as { mcpServers: { myServer: { enabled: boolean } } };
      expect(parsed.mcpServers.myServer.enabled).toBe(false);

      const toggledBack = toggleServerInConfig(updated, "myServer");
      const parsedBack = JSON.parse(toggledBack) as { mcpServers: { myServer: { enabled: boolean } } };
      expect(parsedBack.mcpServers.myServer.enabled).toBe(true);
    });

    it("returns original content on unknown server or invalid json", () => {
      expect(toggleServerInConfig("invalid", "x")).toBe("invalid");
      const valid = JSON.stringify({ mcpServers: {} });
      expect(toggleServerInConfig(valid, "nonexistent")).toBe(valid);
    });
  });
});
