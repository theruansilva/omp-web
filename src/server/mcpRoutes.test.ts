import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HonoTestApp } from "./testUtils.js";
import { defaultGlobalMcpPath, readGlobalMcpConfig, registerMcpRoutes, type McpResponse } from "./mcpRoutes.js";

describe("mcpRoutes", () => {
  let tempDir: string;
  let mcpPath: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `mcp-routes-test-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
    mcpPath = join(tempDir, "mcp.json");
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("defaultGlobalMcpPath", () => {
    it("uses PI_CODING_AGENT_DIR when provided in env", () => {
      const customEnv = { PI_CODING_AGENT_DIR: "/custom/agent/dir" };
      expect(defaultGlobalMcpPath(customEnv)).toBe("/custom/agent/dir/mcp.json");
    });
  });

  describe("readGlobalMcpConfig", () => {
    it("returns empty servers when file does not exist", () => {
      const result = readGlobalMcpConfig(mcpPath);
      expect(result.exists).toBe(false);
      expect(result.servers).toEqual({});
      expect(result.path).toBe(mcpPath);
    });

    it("reads and parses valid mcp.json", () => {
      const payload = {
        mcpServers: {
          "ai-memory": {
            type: "http",
            url: "http://127.0.0.1:49374/mcp",
            enabled: true,
          },
          fetch: {
            command: "uvx",
            args: ["mcp-server-fetch"],
            enabled: false,
          },
        },
      };
      writeFileSync(mcpPath, JSON.stringify(payload));

      const result = readGlobalMcpConfig(mcpPath);
      expect(result.exists).toBe(true);
      expect(result.servers["ai-memory"]?.type).toBe("http");
      expect(result.servers["ai-memory"]?.url).toBe("http://127.0.0.1:49374/mcp");
      expect(result.servers["ai-memory"]?.enabled).toBe(true);
      expect(result.servers["fetch"]?.command).toBe("uvx");
      expect(result.servers["fetch"]?.enabled).toBe(false);
    });

    it("handles corrupt JSON gracefully", () => {
      writeFileSync(mcpPath, "invalid json{{{");
      const result = readGlobalMcpConfig(mcpPath);
      expect(result.exists).toBe(true);
      expect(result.servers).toEqual({});
    });
  });

  describe("HTTP endpoints", () => {
    let app: HonoTestApp;

    beforeEach(async () => {
      const payload = {
        mcpServers: {
          github: {
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-github"],
            enabled: true,
          },
        },
      };
      writeFileSync(mcpPath, JSON.stringify(payload));

      app = new HonoTestApp();
      registerMcpRoutes(app.app, "/api", mcpPath);
      registerMcpRoutes(app.app, "/api/machines/local", mcpPath);
      await app.ready();
    });

    afterEach(async () => {
      await app.close();
    });

    it("exposes /api/mcps", async () => {
      const response = await app.inject({ method: "GET", url: "/api/mcps" });
      expect(response.statusCode).toBe(200);
      const json = response.json<McpResponse>();
      expect(json.exists).toBe(true);
      expect(json.servers["github"]?.command).toBe("npx");
    });

    it("exposes /api/machines/local/mcps", async () => {
      const response = await app.inject({ method: "GET", url: "/api/machines/local/mcps" });
      expect(response.statusCode).toBe(200);
      const json = response.json<McpResponse>();
      expect(json.exists).toBe(true);
      expect(json.servers["github"]?.command).toBe("npx");
    });

    it("checks connection via POST /api/mcps/check", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/mcps/check",
        payload: {
          servers: {
            disabledServer: { command: "dummy", enabled: false },
            badServer: { command: "non_existent_binary_xyz_123", type: "stdio" },
          },
        },
      });
      expect(response.statusCode).toBe(200);
      const json = response.json<{ results: Record<string, { status: string; error?: string }> }>();
      expect(json.results["disabledServer"]?.status).toBe("disabled");
      expect(json.results["badServer"]?.status).toBe("failed");
      expect(json.results["badServer"]?.error).toBeDefined();
    });
  });
});
