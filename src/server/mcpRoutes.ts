import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Hono } from "hono";
import { connectToServer, disconnectServer, type MCPServerConfig } from "@oh-my-pi/pi-coding-agent/mcp";

export interface McpServerConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  type?: "stdio" | "http" | "sse";
  enabled?: boolean;
  description?: string;
  timeout?: number;
}

export interface McpCheckResult {
  name: string;
  status: "connected" | "failed" | "disabled";
  error?: string;
  serverInfo?: { name?: string; version?: string };
}

export interface McpResponse {
  path: string;
  exists: boolean;
  servers: Record<string, McpServerConfig>;
}

export function defaultGlobalMcpPath(env: NodeJS.ProcessEnv = process.env): string {
  const agentDir = env["PI_CODING_AGENT_DIR"] || join(homedir(), ".omp", "agent");
  return join(agentDir, "mcp.json");
}

export function maskMcpServers(servers: Record<string, McpServerConfig>): Record<string, McpServerConfig> {
  const masked: Record<string, McpServerConfig> = {};
  for (const [name, config] of Object.entries(servers)) {
    masked[name] = {
      ...config,
      ...(config.env !== undefined ? { env: Object.fromEntries(Object.keys(config.env).map((key) => [key, "***"])) } : {}),
    };
  }
  return masked;
}

export function readGlobalMcpConfig(mcpPath = defaultGlobalMcpPath()): McpResponse {
  if (!existsSync(mcpPath)) {
    return { path: mcpPath, exists: false, servers: {} };
  }

  try {
    const raw = readFileSync(mcpPath, "utf8");
    const parsed = JSON.parse(raw) as { mcpServers?: Record<string, McpServerConfig> };
    return {
      path: mcpPath,
      exists: true,
      servers: maskMcpServers(parsed.mcpServers ?? {}),
    };
  } catch {
    return { path: mcpPath, exists: true, servers: {} };
  }
}

export async function checkMcpServer(name: string, config: McpServerConfig): Promise<McpCheckResult> {
  if (config.enabled === false) {
    return { name, status: "disabled" };
  }

  try {
    const probeConfig = {
      ...config,
      timeout: typeof config.timeout === "number" ? Math.min(config.timeout, 5000) : 5000,
    };
    /* eslint-disable @typescript-eslint/consistent-type-assertions */
    const conn = await connectToServer(name, probeConfig as unknown as MCPServerConfig);
    /* eslint-enable @typescript-eslint/consistent-type-assertions */
    const serverInfo = conn.serverInfo ? { name: conn.serverInfo.name, version: conn.serverInfo.version } : undefined;
    await disconnectServer(conn).catch(() => undefined);
    return { name, status: "connected", ...(serverInfo ? { serverInfo } : {}) };
  } catch (err) {
    return {
      name,
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function checkMcpServers(servers: Record<string, McpServerConfig>): Promise<Record<string, McpCheckResult>> {
  const results: Record<string, McpCheckResult> = {};
  await Promise.all(
    Object.entries(servers).map(async ([name, config]) => {
      results[name] = await checkMcpServer(name, config);
    }),
  );
  return results;
}

export function registerMcpRoutes(app: Hono, prefix = "/api", customPath?: string): void {
  app.get(`${prefix}/mcps`, (c) => {
    return c.json(readGlobalMcpConfig(customPath));
  });

  app.post(`${prefix}/mcps/check`, async (c) => {
    try {
      const body = (await c.req.json().catch(() => ({}))) as { servers?: Record<string, McpServerConfig> };
      const servers = body.servers ?? {};
      const results = await checkMcpServers(servers);
      return c.json({ results });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
    }
  });
}
