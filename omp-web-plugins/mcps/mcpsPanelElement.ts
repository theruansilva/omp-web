import type { WorkspacePanelContext } from "@ProgmRuanSilva/omp-web/plugin-api";
import {
  countActiveServers,
  countFailedServers,
  formatCommandOrUrl,
  formatTransport,
  isServerEnabled,
  parseMcpConfigFile,
  PROJECT_MCP_FILES,
  toggleServerInConfig,
} from "./mcpsLogic.js";
import type { McpCheckResponse, McpConfigFile, McpResponse, McpServerConfig, McpStoreState } from "./types.js";

export const mcpsPanelTagName = "omp-web-mcps-panel";

type PanelCacheEntry = McpStoreState | { kind: "loading" } | { kind: "error"; message: string };

const panelCache = new Map<string, PanelCacheEntry>();

export function defineMcpsPanelElement(): void {
  if (!customElements.get(mcpsPanelTagName)) {
    customElements.define(mcpsPanelTagName, OmpWebMcpsPanel);
  }
}

export function mcpsBadge(context: WorkspacePanelContext): string | undefined {
  const cached = panelCache.get(cacheKeyForContext(context));
  if (cached === undefined || "kind" in cached) return undefined;
  const count = countActiveServers(cached);
  return count > 0 ? String(count) : undefined;
}

class OmpWebMcpsPanel extends HTMLElement {
  private contextValue: WorkspacePanelContext | undefined;
  private readonly root: ShadowRoot;
  private pollTimer: ReturnType<typeof setInterval> | undefined;
  private currentKey: string | undefined;
  private isChecking = false;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
  }

  set context(value: WorkspacePanelContext | undefined) {
    const prevKey = this.currentKey;
    const newKey = value ? cacheKeyForContext(value) : undefined;
    this.contextValue = value;
    this.currentKey = newKey;

    if (value && newKey !== prevKey) {
      void this.loadServers(value);
    } else {
      this.render();
    }
  }

  connectedCallback(): void {
    this.render();
    this.pollTimer = setInterval(() => {
      if (this.contextValue) void this.loadServers(this.contextValue, false);
    }, 60000);
  }

  disconnectedCallback(): void {
    if (this.pollTimer !== undefined) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  private async loadServers(context: WorkspacePanelContext, forceCheck = false): Promise<void> {
    const key = cacheKeyForContext(context);
    if (this.isChecking) return;

    let projectFile: string | undefined;
    let projectServers: Record<string, McpServerConfig> = {};

    for (const fileName of PROJECT_MCP_FILES) {
      try {
        const response = await context.files.readFile(fileName);
        const content = typeof response.content === "string"
          ? response.content
          : new TextDecoder().decode(response.content);
        const parsed = parseMcpConfigFile(content);
        if (parsed.mcpServers !== undefined) {
          projectFile = fileName;
          projectServers = parsed.mcpServers;
          break;
        }
      } catch {
        // Continue checking next candidate file
      }
    }

    let globalPath: string | undefined;
    let globalServers: Record<string, McpServerConfig> = {};

    try {
      const response = await context.apiFetch("/mcps");
      if (response.ok) {
        const data = (await response.json()) as McpResponse;
        if (data.servers) {
          globalServers = data.servers;
          globalPath = data.path;
        }
      }
    } catch {
      // Ignore network errors fetching global servers
    }

    const cached = panelCache.get(key);
    const prevCheckResults = cached && !("kind" in cached) ? cached.checkResults : undefined;

    const shouldCheck = forceCheck || prevCheckResults === undefined;

    const state: McpStoreState = {
      projectFile,
      projectServers,
      globalPath,
      globalServers,
      checkResults: prevCheckResults,
      isChecking: shouldCheck,
      lastLoaded: new Date().toISOString(),
    };

    panelCache.set(key, state);
    this.render();

    if (!shouldCheck) return;

    // Probe server connection status
    const allServers: Record<string, McpServerConfig> = {};
    for (const [name, config] of Object.entries(projectServers)) {
      if (isServerEnabled(config)) allServers[name] = config;
    }
    for (const [name, config] of Object.entries(globalServers)) {
      if (isServerEnabled(config)) allServers[name] = config;
    }

    if (Object.keys(allServers).length > 0) {
      this.isChecking = true;
      try {
        const checkRes = await context.apiFetch("/mcps/check", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ servers: allServers }),
        });
        if (checkRes.ok) {
          const checkData = (await checkRes.json()) as McpCheckResponse;
          state.checkResults = checkData.results;
        }
      } catch {
        // Ignore check probe errors
      } finally {
        this.isChecking = false;
      }
    }

    state.isChecking = false;
    panelCache.set(key, state);
    this.render();
  }

  private render(): void {
    const context = this.contextValue;
    if (context === undefined) {
      this.root.innerHTML = `${panelStyles()}<section class="empty">Select a workspace.</section>`;
      return;
    }

    const key = cacheKeyForContext(context);
    const cached = panelCache.get(key);
    const state: PanelCacheEntry = cached ?? { kind: "loading" };
    const isLoading = "kind" in state && state.kind === "loading";

    let activeCount = 0;
    let failedCount = 0;
    if (!("kind" in state)) {
      activeCount = countActiveServers(state);
      failedCount = countFailedServers(state);
    }

    this.root.innerHTML = `
      ${panelStyles()}
      <section class="toolbar">
        <div class="toolbar-title">
          <strong>MCP Servers</strong>
          ${!isLoading ? `
            <span class="badge ${activeCount > 0 ? "active" : ""}">
              ${activeCount} active
              ${failedCount > 0 ? `<span class="badge-failed">· ${failedCount} failed</span>` : ""}
            </span>
          ` : ""}
        </div>
        <button class="secondary" data-refresh ${isLoading || this.isChecking ? "disabled" : ""}>Refresh</button>
      </section>
      <section class="viewer">
        ${this.renderContent(state)}
      </section>
    `;

    this.attachEventListeners(context, state);
  }

  private renderContent(state: PanelCacheEntry): string {
    if ("kind" in state) {
      if (state.kind === "loading") {
        return `<p class="muted">Loading MCP configuration…</p>`;
      }
      return `<div class="status error">${escapeHtml(state.message)}</div>`;
    }

    const hasProjectServers = Object.keys(state.projectServers).length > 0;

    let html = "";

    // Project Section
    html += `
      <section class="server-group">
        <div class="group-header">
          <span class="group-title">Workspace Servers</span>
          ${state.projectFile !== undefined ? `<span class="group-path">${escapeHtml(state.projectFile)}</span>` : ""}
        </div>
    `;

    if (hasProjectServers) {
      html += `<div class="servers-list">`;
      for (const [name, config] of Object.entries(state.projectServers)) {
        html += this.renderServerRow(name, config, "project", state);
      }
      html += `</div>`;
    } else if (state.projectFile !== undefined) {
      html += `<p class="muted"><code>${escapeHtml(state.projectFile)}</code> exists but defines no servers.</p>`;
    } else {
      html += `
        <div class="no-file-box">
          <p class="muted">No project MCP configuration found (.mcp.json).</p>
          <button data-create-project-file class="secondary">+ Create .mcp.json</button>
        </div>
      `;
    }
    html += `</section>`;

    // Global Section
    const hasGlobalServers = Object.keys(state.globalServers).length > 0;
    html += `
      <section class="server-group">
        <div class="group-header">
          <span class="group-title">Global Servers</span>
          ${state.globalPath !== undefined ? `<span class="group-path">${escapeHtml(state.globalPath)}</span>` : ""}
        </div>
    `;

    if (hasGlobalServers) {
      html += `<div class="servers-list">`;
      for (const [name, config] of Object.entries(state.globalServers)) {
        html += this.renderServerRow(name, config, "global", state);
      }
      html += `</div>`;
    } else {
      html += `<p class="muted">No global MCP servers configured.</p>`;
    }
    html += `</section>`;

    // Quick Command Shortcuts
    html += `
      <section class="shortcuts-group">
        <span class="group-title">Oh My Pi Commands</span>
        <div class="shortcut-buttons">
          <button data-prompt="/mcp list" class="secondary">/mcp list</button>
          <button data-prompt="/mcp reload" class="secondary">/mcp reload</button>
          <button data-prompt="/mcp add " class="secondary">+ /mcp add</button>
        </div>
      </section>
    `;

    return html;
  }

  private renderServerRow(name: string, config: McpServerConfig, scope: "project" | "global", state: McpStoreState): string {
    const enabled = isServerEnabled(config);
    const transport = formatTransport(config);
    const target = formatCommandOrUrl(config);
    const check = state.checkResults?.[name];
    const isChecking = state.isChecking === true && enabled && check === undefined;

    let statusDotClass = enabled ? "active" : "disabled";
    let statusText = enabled ? "Active" : "Disabled";
    let statusTextClass = enabled ? "" : "disabled";

    if (!enabled) {
      statusDotClass = "disabled";
      statusText = "Disabled";
      statusTextClass = "disabled";
    } else if (isChecking) {
      statusDotClass = "checking";
      statusText = "Connecting…";
      statusTextClass = "checking";
    } else if (check?.status === "connected") {
      statusDotClass = "connected";
      statusText = check.serverInfo?.version ? `Connected (v${check.serverInfo.version})` : "Connected";
      statusTextClass = "connected";
    } else if (check?.status === "failed") {
      statusDotClass = "failed";
      statusText = "Connection failed";
      statusTextClass = "failed";
    }

    return `
      <article class="server-row ${enabled ? "enabled" : "disabled"} ${check?.status === "failed" ? "server-failed" : ""}">
        <div class="server-main">
          <div class="server-header">
            <span class="status-dot ${statusDotClass}"></span>
            <strong class="server-name">${escapeHtml(name)}</strong>
            <span class="tag transport">${escapeHtml(transport)}</span>
            <span class="status-text ${statusTextClass}">${escapeHtml(statusText)}</span>
          </div>
          ${target !== "" ? `<div class="server-target"><code>${escapeHtml(target)}</code></div>` : ""}
          ${config.description !== undefined ? `<div class="server-desc">${escapeHtml(config.description)}</div>` : ""}
          ${check?.status === "failed" && check.error ? `
            <div class="server-error-banner">
              <span class="error-icon">⚠️</span>
              <span class="error-msg">${escapeHtml(check.error)}</span>
            </div>
          ` : ""}
        </div>
        <div class="server-actions">
          ${scope === "project" ? `
            <button
              data-toggle-server="${escapeAttr(name)}"
              class="${enabled ? "secondary" : "accent"}"
            >
              ${enabled ? "Disable" : "Enable"}
            </button>
          ` : `
            <span class="badge-readonly">Global</span>
          `}
        </div>
      </article>
    `;
  }

  private attachEventListeners(context: WorkspacePanelContext, state: PanelCacheEntry): void {
    this.root.querySelector("button[data-refresh]")?.addEventListener("click", () => {
      void this.loadServers(context, true);
    });

    this.root.querySelector("button[data-create-project-file]")?.addEventListener("click", async () => {
      const initial: McpConfigFile = {
        $schema: "https://raw.githubusercontent.com/can1357/oh-my-pi/main/packages/coding-agent/src/config/mcp-schema.json",
        mcpServers: {},
      };
      await context.files.writeFile(".mcp.json", JSON.stringify(initial, null, 2) + "\n");
      void this.loadServers(context, true);
    });

    this.root.querySelectorAll<HTMLButtonElement>("button[data-toggle-server]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const serverName = btn.getAttribute("data-toggle-server");
        if (!serverName || "kind" in state || !state.projectFile) return;

        try {
          const res = await context.files.readFile(state.projectFile);
          const currentContent = typeof res.content === "string"
            ? res.content
            : new TextDecoder().decode(res.content);
          const updatedContent = toggleServerInConfig(currentContent, serverName);
          await context.files.writeFile(state.projectFile, updatedContent);
          void this.loadServers(context, true);
        } catch (err) {
          console.error("Failed to toggle MCP server in configuration:", err);
        }
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>("button[data-prompt]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const promptText = btn.getAttribute("data-prompt");
        if (promptText) {
          context.prompt.insertText(promptText);
        }
      });
    });
  }
}

function cacheKeyForContext(context: WorkspacePanelContext): string {
  return `${context.machine.id}:${context.workspace.projectId}:${context.workspace.id}`;
}

function escapeHtml(value: unknown): string {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttr(value: unknown): string {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function panelStyles(): string {
  return `
    <style>
      :host { display: contents; }
      .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--pi-border-muted); }
      .toolbar-title { display: flex; align-items: center; gap: 8px; }
      .viewer { box-sizing: border-box; min-height: 0; overflow: auto; padding: 12px; display: flex; flex-direction: column; gap: 16px; }
      .server-group { display: flex; flex-direction: column; gap: 8px; }
      .group-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .group-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--pi-muted); }
      .group-path { font-size: 11px; color: var(--pi-muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .servers-list { display: grid; gap: 8px; }
      .server-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; border: 1px solid var(--pi-border); border-radius: 8px; background: var(--pi-surface); padding: 10px 12px; }
      .server-row.disabled { opacity: 0.65; }
      .server-row.server-failed { border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.04); }
      .server-main { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; }
      .server-header { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
      .server-name { font-size: 13px; color: var(--pi-text); }
      .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--pi-muted); flex-shrink: 0; }
      .status-dot.active { background: #22c55e; }
      .status-dot.connected { background: #22c55e; }
      .status-dot.checking { background: #eab308; animation: pulse 1.5s infinite; }
      .status-dot.failed { background: #ef4444; }
      .status-dot.disabled { background: var(--pi-muted); opacity: 0.5; }
      .status-text { font-size: 11px; color: var(--pi-muted); }
      .status-text.connected { color: #22c55e; }
      .status-text.checking { color: #eab308; }
      .status-text.failed { color: #ef4444; font-weight: 500; }
      .status-text.disabled { color: var(--pi-muted); opacity: 0.7; }
      .tag { font-size: 10px; padding: 1px 5px; border-radius: 4px; border: 1px solid var(--pi-border-muted); color: var(--pi-muted); font-family: ui-monospace, monospace; }
      .tag.transport { color: var(--pi-accent); border-color: var(--pi-accent-border); }
      .server-target { font-size: 11px; color: var(--pi-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .server-target code { border: none; background: transparent; padding: 0; color: inherit; }
      .server-desc { font-size: 11px; color: var(--pi-muted); }
      .server-error-banner { display: flex; align-items: flex-start; gap: 6px; margin-top: 6px; padding: 6px 10px; border-radius: 6px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); font-size: 11px; color: #f87171; line-height: 1.4; word-break: break-word; }
      .error-icon { flex-shrink: 0; font-size: 12px; line-height: 1; }
      .error-msg { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .server-actions { display: flex; align-items: center; gap: 6px; }
      .badge { font-size: 11px; padding: 2px 7px; border-radius: 10px; background: var(--pi-surface); border: 1px solid var(--pi-border); color: var(--pi-muted); }
      .badge.active { border-color: #22c55e44; color: #22c55e; }
      .badge-failed { color: #ef4444; font-weight: 600; }
      .badge-readonly { font-size: 11px; padding: 2px 7px; border-radius: 6px; background: var(--pi-border-muted); color: var(--pi-muted); }
      .no-file-box { display: flex; flex-direction: column; gap: 8px; padding: 12px; border: 1px dashed var(--pi-border); border-radius: 8px; background: var(--pi-surface); align-items: flex-start; }
      .shortcuts-group { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; border-top: 1px solid var(--pi-border-muted); }
      .shortcut-buttons { display: flex; flex-wrap: wrap; gap: 6px; }
      button { border: 1px solid var(--pi-accent-border); border-radius: 6px; background: var(--pi-accent); color: var(--pi-bg); cursor: pointer; padding: 5px 9px; font: inherit; font-size: 12px; }
      button.secondary { border-color: var(--pi-border); background: var(--pi-surface); color: var(--pi-text); }
      button.accent { border-color: var(--pi-accent-border); background: var(--pi-accent); color: var(--pi-bg); }
      button:disabled { cursor: wait; opacity: 0.65; }
      .muted { color: var(--pi-muted); font-size: 12px; margin: 0; }
      .status { border: 1px solid var(--pi-border); border-radius: 8px; padding: 10px; color: var(--pi-muted); font-size: 12px; }
      .status.error { border-color: var(--pi-danger); color: var(--pi-danger); }
      .empty { padding: 16px; color: var(--pi-muted); font-size: 12px; }
      code { border: 1px solid var(--pi-border-muted); border-radius: 4px; background: var(--pi-bg); color: var(--pi-text-secondary); font: 11px ui-monospace, SFMono-Regular, Menlo, monospace; padding: 1px 4px; }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(0.85); }
      }
    </style>
  `;
}
