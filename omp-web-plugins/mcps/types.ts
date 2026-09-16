export interface McpServerConfig {
  command?: string | undefined;
  args?: string[] | undefined;
  env?: Record<string, string> | undefined;
  url?: string | undefined;
  type?: "stdio" | "http" | "sse" | undefined;
  enabled?: boolean | undefined;
  description?: string | undefined;
  timeout?: number | undefined;
}

export interface McpConfigFile {
  $schema?: string | undefined;
  mcpServers?: Record<string, McpServerConfig> | undefined;
}

export interface McpCheckResult {
  name: string;
  status: "connected" | "failed" | "disabled";
  error?: string | undefined;
  serverInfo?: { name?: string | undefined; version?: string | undefined } | undefined;
}

export interface McpCheckResponse {
  results: Record<string, McpCheckResult>;
}

export interface McpResponse {
  path: string;
  exists: boolean;
  servers: Record<string, McpServerConfig>;
}

export interface McpServerItem {
  name: string;
  scope: "project" | "global";
  config: McpServerConfig;
  sourceFile?: string | undefined;
  check?: McpCheckResult | undefined;
}

export interface McpStoreState {
  projectFile?: string | undefined;
  projectServers: Record<string, McpServerConfig>;
  globalPath?: string | undefined;
  globalServers: Record<string, McpServerConfig>;
  checkResults?: Record<string, McpCheckResult> | undefined;
  isChecking?: boolean | undefined;
  lastLoaded?: string | undefined;
  error?: string | undefined;
}
