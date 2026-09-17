import type { WorkspacePanelContext } from "@ProgmRuanSilva/omp-web/plugin-api";
import {
  aggregateProviderStatus,
  countActiveProviders,
  countWarningOrExhausted,
  formatCapacityWindow,
  formatProviderName,
  formatTimeAgo,
  getLimitProgress,
} from "./usageLogic.js";
import type {
  ProviderWindowStat,
  UsageLimit,
  UsagePanelState,
  UsageReport,
  UsageResponse,
} from "./types.js";

export const usagePanelTagName = "omp-web-usage-panel";

const panelCache = new Map<string, UsagePanelState>();

export function defineUsagePanelElement(): void {
  if (!customElements.get(usagePanelTagName)) {
    customElements.define(usagePanelTagName, OmpWebUsagePanel);
  }
}

export function usageBadge(_context: WorkspacePanelContext): string | undefined {
  return undefined;
}

class OmpWebUsagePanel extends HTMLElement {
  private contextValue: WorkspacePanelContext | undefined;
  private readonly root: ShadowRoot;
  private pollTimer: ReturnType<typeof setInterval> | undefined;
  private currentKey: string | undefined;
  private isRefreshing = false;

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
      void this.loadUsage(value, false);
    } else {
      this.render();
    }
  }

  connectedCallback(): void {
    this.render();
    this.pollTimer = setInterval(() => {
      if (this.contextValue && !this.isRefreshing) {
        void this.loadUsage(this.contextValue, false);
      }
    }, 60000);
  }

  disconnectedCallback(): void {
    if (this.pollTimer !== undefined) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  private async loadUsage(context: WorkspacePanelContext, refresh = false): Promise<void> {
    const key = cacheKeyForContext(context);
    this.isRefreshing = true;

    const cached = panelCache.get(key);
    if (!cached || cached.kind !== "loaded") {
      panelCache.set(key, { kind: "loading" });
      this.render();
    } else {
      panelCache.set(key, { ...cached, isRefreshing: true });
      this.render();
    }

    try {
      const endpoint = refresh ? "/usage?refresh=true" : "/usage";
      const response = await context.apiFetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to load usage (HTTP ${response.status})`);
      }
      const data = (await response.json()) as UsageResponse;
      panelCache.set(key, { kind: "loaded", data, isRefreshing: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (cached && cached.kind === "loaded") {
        panelCache.set(key, {
          ...cached,
          isRefreshing: false,
          data: { ...cached.data, error: message },
        });
      } else {
        panelCache.set(key, { kind: "error", message });
      }
    } finally {
      this.isRefreshing = false;
      this.render();
    }
  }

  private render(): void {
    const context = this.contextValue;
    if (context === undefined) {
      this.root.innerHTML = `${panelStyles()}<section class="empty">Select a workspace.</section>`;
      return;
    }

    const key = cacheKeyForContext(context);
    const state = panelCache.get(key) ?? { kind: "loading" };
    const isLoading = state.kind === "loading";
    const isRefreshing = state.kind === "loaded" && state.isRefreshing === true;

    let activeCount = 0;
    let warningsCount = 0;
    let exhaustedCount = 0;
    let fetchedAgo = "";

    if (state.kind === "loaded") {
      activeCount = countActiveProviders(state.data);
      const counts = countWarningOrExhausted(state.data);
      warningsCount = counts.warnings;
      exhaustedCount = counts.exhausted;
      fetchedAgo = formatTimeAgo(state.data.generatedAt);
    }

    this.root.innerHTML = `
      ${panelStyles()}
      <section class="toolbar">
        <div class="toolbar-title">
          <strong>Provider Usage</strong>
          ${state.kind === "loaded" ? `
            <span class="badge ${activeCount > 0 ? "active" : ""}">
              ${activeCount} provider${activeCount === 1 ? "" : "s"}
              ${exhaustedCount > 0 ? `<span class="badge-exhausted">· ${exhaustedCount} exhausted</span>` : ""}
              ${warningsCount > 0 ? `<span class="badge-warning">· ${warningsCount} warning</span>` : ""}
            </span>
          ` : ""}
        </div>
        <div class="toolbar-actions">
          ${fetchedAgo ? `<span class="last-fetched">${escapeHtml(fetchedAgo)}</span>` : ""}
          <button class="secondary btn-refresh" data-refresh ${isLoading || isRefreshing ? "disabled" : ""}>
            ${isRefreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </section>
      <section class="viewer">
        ${this.renderContent(state)}
      </section>
    `;

    this.attachEventListeners(context);
  }

  private renderContent(state: UsagePanelState): string {
    if (state.kind === "loading") {
      return `<p class="muted">Loading provider usage data…</p>`;
    }
    if (state.kind === "error") {
      return `<div class="status error">${escapeHtml(state.message)}</div>`;
    }

    const { data } = state;
    let html = "";

    if (data.error) {
      html += `<div class="status warning banner-warning">⚠️ ${escapeHtml(data.error)}</div>`;
    }

    // Capacity Overview (if available)
    if (data.capacity && Object.keys(data.capacity).length > 0) {
      html += this.renderCapacitySection(data.capacity);
    }

    // Reports Section (Provider Cards)
    if (data.reports.length === 0) {
      html += `
        <div class="empty-box">
          <p class="muted">No provider usage reports found.</p>
          <p class="muted-small">Make sure you have logged in to at least one provider using <code>/login</code> or configured API keys.</p>
        </div>
      `;
    } else {
      html += `<div class="providers-list">`;
      // Sort reports: exhausted first, then warning, then ok, then by name
      const sorted = [...data.reports].sort((a, b) => {
        const order = { exhausted: 0, warning: 1, ok: 2, unknown: 3 };
        const statusA = aggregateProviderStatus(a);
        const statusB = aggregateProviderStatus(b);
        if (order[statusA] !== order[statusB]) {
          return order[statusA] - order[statusB];
        }
        return a.provider.localeCompare(b.provider);
      });

      for (const report of sorted) {
        html += this.renderProviderCard(report);
      }
      html += `</div>`;
    }

    // Accounts Without Usage API (if any)
    if (data.accountsWithoutUsage && data.accountsWithoutUsage.length > 0) {
      html += `
        <details class="collapsible-section">
          <summary class="section-summary">
            Accounts without quota API (${data.accountsWithoutUsage.length})
          </summary>
          <div class="accounts-without-usage-list">
            ${data.accountsWithoutUsage
          .map(
            (acc) => `
              <div class="unsupported-row">
                <span class="unsupported-provider">${escapeHtml(formatProviderName(acc.provider))}</span>
                <span class="unsupported-email">${escapeHtml(acc.email ?? acc.accountId ?? "account")}</span>
              </div>
            `,
          )
          .join("")}
          </div>
        </details>
      `;
    }

    // Disabled Credentials (if any)
    if (data.disabledCredentials && data.disabledCredentials.length > 0) {
      html += `
        <div class="status error banner-disabled">
          <strong>Disabled Credentials (${data.disabledCredentials.length})</strong>
          ${data.disabledCredentials
          .map(
            (d) => `
            <div class="disabled-row">
              <span>${escapeHtml(formatProviderName(d.provider))}: ${escapeHtml(d.email ?? d.accountId ?? "account")}</span>
              ${d.reason ? `<span class="muted-small">${escapeHtml(d.reason)}</span>` : ""}
            </div>
          `,
          )
          .join("")}
        </div>
      `;
    }

    // Quick Command Shortcuts
    html += `
      <section class="shortcuts-group">
        <span class="group-title">Oh My Pi Commands</span>
        <div class="shortcut-buttons">
          <button data-prompt="/usage" class="secondary">/usage</button>
          <button data-prompt="/usage reset" class="secondary">/usage reset</button>
          <button data-prompt="/login" class="secondary">/login</button>
        </div>
      </section>
    `;

    return html;
  }

  private renderCapacitySection(capacity: Record<string, ProviderWindowStat[]>): string {
    let cardsHtml = "";
    for (const [provider, stats] of Object.entries(capacity)) {
      for (const stat of stats) {
        const title = `${formatProviderName(provider)} (${stat.window})`;
        const summary = formatCapacityWindow(stat);
        const percent = Math.min(100, Math.round((stat.usedAccounts / Math.max(1, stat.accounts)) * 100));
        cardsHtml += `
          <div class="capacity-card">
            <div class="capacity-header">
              <span class="capacity-title">${escapeHtml(title)}</span>
              <span class="capacity-percent">${percent}%</span>
            </div>
            <div class="progress-track small">
              <div class="progress-bar ${percent >= 90 ? "ex" : percent >= 75 ? "warn" : "ok"}" style="width: ${percent}%"></div>
            </div>
            <div class="capacity-sub">${escapeHtml(summary)}</div>
          </div>
        `;
      }
    }

    if (!cardsHtml) return "";

    return `
      <section class="capacity-section">
        <span class="group-title">Capacity Overview</span>
        <div class="capacity-grid">
          ${cardsHtml}
        </div>
      </section>
    `;
  }

  private renderProviderCard(report: UsageReport): string {
    const status = aggregateProviderStatus(report);
    const providerName = formatProviderName(report.provider);
    const accountEmail = report.metadata?.email ?? report.metadata?.accountId;
    const plan = report.metadata?.planType;
    const resetCredits = report.resetCredits?.availableCount ?? 0;

    let html = `
      <div class="provider-card status-${status}">
        <div class="card-header">
          <div class="header-left">
            <span class="status-dot ${status}"></span>
            <strong class="provider-title">${escapeHtml(providerName)}</strong>
            ${plan ? `<span class="tag plan">${escapeHtml(plan)}</span>` : ""}
          </div>
          ${accountEmail ? `<span class="account-email" title="${escapeAttr(accountEmail)}">${escapeHtml(accountEmail)}</span>` : ""}
        </div>
    `;

    if (resetCredits > 0) {
      html += `
        <div class="reset-credits-banner">
          <span>✨ <strong>${resetCredits}</strong> saved rate-limit reset${resetCredits === 1 ? "" : "s"} available</span>
          <button class="secondary xs" data-prompt="/usage reset">Redeem</button>
        </div>
      `;
    }

    // Limits
    if (report.limits.length > 0) {
      html += `<div class="limits-list">`;
      for (const limit of report.limits) {
        html += this.renderLimitRow(limit);
      }
      html += `</div>`;
    } else if (report.notes && report.notes.length > 0) {
      html += `
        <div class="notes-box">
          ${report.notes.map((n) => `<p class="muted-note">${escapeHtml(n)}</p>`).join("")}
        </div>
      `;
    } else {
      html += `<p class="muted no-limits">No specific quota limits reported</p>`;
    }

    html += `</div>`;
    return html;
  }

  private renderLimitRow(limit: UsageLimit): string {
    const progress = getLimitProgress(limit);
    const windowLabel = limit.window?.label ?? limit.scope?.windowId;
    const labelWithWindow = windowLabel ? `${limit.label} · ${windowLabel}` : limit.label;

    return `
      <div class="limit-row">
        <div class="limit-header">
          <span class="limit-name">${escapeHtml(labelWithWindow)}</span>
          <div class="limit-figures">
            <span class="limit-percent" style="color: ${progress.statusColor}">${progress.percentUsed}% used</span>
            ${progress.resetsInText ? `<span class="limit-reset">${escapeHtml(progress.resetsInText)}</span>` : ""}
          </div>
        </div>
        <div class="progress-track">
          <div class="progress-bar ${progress.status === "exhausted" ? "ex" : progress.status === "warning" ? "warn" : "ok"}" style="width: ${progress.percentUsed}%; background-color: ${progress.statusColor}"></div>
        </div>
      </div>
    `;
  }

  private attachEventListeners(context: WorkspacePanelContext): void {
    const refreshBtn = this.root.querySelector<HTMLButtonElement>("button[data-refresh]");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        void this.loadUsage(context, true);
      });
    }

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
  return context.machine.id || "local";
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
      .toolbar-actions { display: flex; align-items: center; gap: 8px; }
      .last-fetched { font-size: 11px; color: var(--pi-muted); }
      .viewer { box-sizing: border-box; min-height: 0; overflow: auto; padding: 12px; display: flex; flex-direction: column; gap: 14px; }
      
      .group-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--pi-muted); }
      
      .capacity-section { display: flex; flex-direction: column; gap: 8px; }
      .capacity-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; }
      .capacity-card { display: flex; flex-direction: column; gap: 4px; padding: 8px 10px; border-radius: 6px; background: var(--pi-surface); border: 1px solid var(--pi-border); }
      .capacity-header { display: flex; justify-content: space-between; align-items: center; font-size: 11px; }
      .capacity-title { font-weight: 500; color: var(--pi-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .capacity-percent { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 600; color: var(--pi-text); }
      .capacity-sub { font-size: 10px; color: var(--pi-muted); }

      .providers-list { display: flex; flex-direction: column; gap: 10px; }
      .provider-card { display: flex; flex-direction: column; gap: 8px; border: 1px solid var(--pi-border); border-radius: 8px; background: var(--pi-surface); padding: 10px 12px; }
      .provider-card.status-exhausted { border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.03); }
      .provider-card.status-warning { border-color: rgba(234, 179, 8, 0.35); }

      .card-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
      .header-left { display: flex; align-items: center; gap: 6px; }
      .provider-title { font-size: 13px; color: var(--pi-text); font-weight: 600; }
      .account-email { font-size: 11px; color: var(--pi-muted); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

      .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--pi-muted); flex-shrink: 0; }
      .status-dot.ok { background: #22c55e; }
      .status-dot.warning { background: #eab308; }
      .status-dot.exhausted { background: #ef4444; }
      .status-dot.unknown { background: var(--pi-muted); }

      .tag { font-size: 10px; padding: 1px 5px; border-radius: 4px; border: 1px solid var(--pi-border-muted); color: var(--pi-muted); text-transform: uppercase; }
      .tag.plan { color: var(--pi-accent); border-color: var(--pi-accent-border); }

      .reset-credits-banner { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px; border-radius: 6px; background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.25); font-size: 11px; color: var(--pi-text); }
      
      .limits-list { display: flex; flex-direction: column; gap: 8px; padding-top: 4px; }
      .limit-row { display: flex; flex-direction: column; gap: 4px; }
      .limit-header { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; font-size: 11px; }
      .limit-name { color: var(--pi-text); font-weight: 500; }
      .limit-figures { display: flex; align-items: baseline; gap: 8px; flex-shrink: 0; }
      .limit-percent { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 600; }
      .limit-reset { color: var(--pi-muted); font-size: 10px; }

      .progress-track { width: 100%; height: 6px; border-radius: 3px; background: var(--pi-border-muted); overflow: hidden; }
      .progress-track.small { height: 4px; }
      .progress-bar { height: 100%; border-radius: 3px; transition: width 0.3s ease; }
      .progress-bar.ok { background: #22c55e; }
      .progress-bar.warn { background: #eab308; }
      .progress-bar.ex { background: #ef4444; }

      .badge { font-size: 11px; padding: 2px 7px; border-radius: 10px; background: var(--pi-surface); border: 1px solid var(--pi-border); color: var(--pi-muted); }
      .badge.active { border-color: #22c55e44; color: #22c55e; }
      .badge-warning { color: #eab308; font-weight: 600; }
      .badge-exhausted { color: #ef4444; font-weight: 600; }

      .notes-box { padding: 6px 8px; border-radius: 6px; background: var(--pi-bg); border: 1px solid var(--pi-border-muted); font-size: 11px; color: var(--pi-muted); }
      .muted-note { margin: 0; line-height: 1.4; }
      .no-limits { font-size: 11px; color: var(--pi-muted); font-style: italic; }

      .collapsible-section { border: 1px solid var(--pi-border-muted); border-radius: 6px; padding: 6px 10px; }
      .section-summary { font-size: 11px; font-weight: 600; color: var(--pi-muted); cursor: pointer; user-select: none; }
      .accounts-without-usage-list { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
      .unsupported-row { display: flex; justify-content: space-between; font-size: 11px; padding: 3px 0; border-bottom: 1px solid var(--pi-border-muted); }
      .unsupported-provider { font-weight: 500; color: var(--pi-text); }
      .unsupported-email { color: var(--pi-muted); }

      .banner-disabled { display: flex; flex-direction: column; gap: 4px; padding: 8px 10px; border-radius: 6px; font-size: 11px; }
      .disabled-row { display: flex; flex-direction: column; gap: 2px; }

      .shortcuts-group { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; border-top: 1px solid var(--pi-border-muted); }
      .shortcut-buttons { display: flex; flex-wrap: wrap; gap: 6px; }

      button { border: 1px solid var(--pi-accent-border); border-radius: 6px; background: var(--pi-accent); color: var(--pi-bg); cursor: pointer; padding: 5px 9px; font: inherit; font-size: 12px; }
      button.secondary { border-color: var(--pi-border); background: var(--pi-surface); color: var(--pi-text); }
      button.xs { padding: 2px 6px; font-size: 10px; border-radius: 4px; }
      button:disabled { cursor: wait; opacity: 0.65; }

      .muted { color: var(--pi-muted); font-size: 12px; margin: 0; }
      .muted-small { color: var(--pi-muted); font-size: 11px; margin: 0; }
      .status { border: 1px solid var(--pi-border); border-radius: 8px; padding: 10px; color: var(--pi-muted); font-size: 12px; }
      .status.error { border-color: var(--pi-danger); color: var(--pi-danger); }
      .status.warning { border-color: rgba(234, 179, 8, 0.4); color: var(--pi-text); }
      .empty { padding: 16px; color: var(--pi-muted); font-size: 12px; }
      .empty-box { display: flex; flex-direction: column; gap: 6px; padding: 14px; border: 1px dashed var(--pi-border); border-radius: 8px; text-align: center; }
      code { border: 1px solid var(--pi-border-muted); border-radius: 4px; background: var(--pi-bg); color: var(--pi-text-secondary); font: 11px ui-monospace, SFMono-Regular, Menlo, monospace; padding: 1px 4px; }
    </style>
  `;
}
