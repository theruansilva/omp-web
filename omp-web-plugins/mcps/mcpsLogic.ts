import type { McpConfigFile, McpServerConfig, McpStoreState } from "./types.js";

export const PROJECT_MCP_FILES = [".mcp.json", "mcp.json", ".omp/mcp.json"] as const;

export function isMcpConfigFile(value: unknown): value is McpConfigFile {
  return (
    typeof value === "object" &&
    value !== null &&
    "mcpServers" in value &&
    typeof value.mcpServers === "object" &&
    value.mcpServers !== null
  );
}

export function parseMcpConfigFile(raw: string): McpConfigFile {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isMcpConfigFile(parsed)) {
      return parsed;
    }
    return { mcpServers: {} };
  } catch {
    return { mcpServers: {} };
  }
}

export function formatTransport(config: McpServerConfig): "stdio" | "http" | "sse" {
  if (config.type !== undefined) return config.type;
  if (config.url !== undefined) return "http";
  return "stdio";
}

export function formatCommandOrUrl(config: McpServerConfig): string {
  if (config.url !== undefined && config.url !== "") {
    return config.url;
  }
  const cmd = config.command ?? "";
  const args = config.args?.join(" ") ?? "";
  return [cmd, args].filter(Boolean).join(" ");
}

export function isServerEnabled(config: McpServerConfig): boolean {
  return config.enabled !== false;
}

export function countActiveServers(state: McpStoreState): number {
  let count = 0;
  for (const server of Object.values(state.projectServers)) {
    if (isServerEnabled(server)) count++;
  }
  for (const server of Object.values(state.globalServers)) {
    if (isServerEnabled(server)) count++;
  }
  return count;
}

export function countFailedServers(state: McpStoreState): number {
  if (!state.checkResults) return 0;
  let count = 0;
  for (const check of Object.values(state.checkResults)) {
    if (check.status === "failed") count++;
  }
  return count;
}

export function toggleServerInConfig(raw: string, serverName: string): string {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isMcpConfigFile(parsed) && parsed.mcpServers !== undefined) {
      const servers = parsed.mcpServers;
      const target = servers[serverName];
      if (target !== undefined) {
        target.enabled = !isServerEnabled(target);
        return JSON.stringify(parsed, null, 2) + "\n";
      }
    }
  } catch {
    // Return original on parse error
  }
  return raw;
}
