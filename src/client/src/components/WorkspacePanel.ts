import { LitElement, html, type TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import type { Workspace } from "../api";
import type { QualifiedContributionId, QualifiedWorkspacePanelContribution, WorkspacePanelContext } from "../plugins/types";
import { actionMenuPanelStyle } from "./actionMenu";
import { workspacePanelStyles } from "./shared";
import { renderSlidersIcon } from "./tabIcons";

export interface WorkspacePanelEmptyState {
  title: string;
  body?: string;
}

type WorkspacePanelBadge = string | number | TemplateResult | undefined;

@customElement("workspace-panel")
export class WorkspacePanel extends LitElement {
  @property({ attribute: false }) workspace: Workspace | undefined;
  @property({ attribute: false }) panelContext: WorkspacePanelContext | undefined;
  @property({ attribute: false }) emptyState: WorkspacePanelEmptyState | undefined;
  @property() tool: QualifiedContributionId = "core:workspace.files";
  @property({ attribute: false }) panels: QualifiedWorkspacePanelContribution[] = [];
  @property({ attribute: false }) allPanels: QualifiedWorkspacePanelContribution[] = [];
  @property({ attribute: false }) hiddenToolIds = new Set<string>();
  @property({ type: Boolean }) hideToolTabs = false;
  @property({ attribute: false }) onSelectTool: (tool: QualifiedContributionId) => void = () => undefined;
  @property({ attribute: false }) onToggleToolVisibility?: (toolId: QualifiedContributionId, hidden: boolean) => void;
  @property({ attribute: false }) onResetToolVisibility?: () => void;
  @query(".workspace-header-strip") private workspaceHeaderStrip?: HTMLElement | null;
  @state() private workspaceHeaderCanScrollLeft = false;
  @state() private workspaceHeaderCanScrollRight = false;
  @state() private customizeMenuOpen = false;
  @state() private customizeMenuStyle = "";
  @state() private contextMenuTargetPanel: QualifiedWorkspacePanelContribution | undefined;

  private observedWorkspaceHeaderStrip: HTMLElement | undefined;
  private workspaceHeaderResizeObserver: ResizeObserver | undefined;
  private readonly onWorkspaceHeaderScroll = () => {
    this.updateWorkspaceHeaderScrollState();
  };

  private readonly onDocumentClick = (event: MouseEvent) => {
    if (event.composedPath().includes(this)) return;
    this.closeCustomizeMenu();
  };

  private readonly onKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && this.customizeMenuOpen) {
      event.preventDefault();
      event.stopPropagation();
      this.closeCustomizeMenu();
    }
  };

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("click", this.onDocumentClick);
    document.addEventListener("keydown", this.onKeydown);
  }

  override firstUpdated(): void {
    this.observeWorkspaceHeaderStrip();
    this.updateWorkspaceHeaderScrollState();
  }

  override updated(): void {
    this.observeWorkspaceHeaderStrip();
    this.updateWorkspaceHeaderScrollState();
  }

  override disconnectedCallback(): void {
    document.removeEventListener("click", this.onDocumentClick);
    document.removeEventListener("keydown", this.onKeydown);
    this.workspaceHeaderResizeObserver?.disconnect();
    this.workspaceHeaderResizeObserver = undefined;
    this.observedWorkspaceHeaderStrip = undefined;
    super.disconnectedCallback();
  }

  override render() {
    const workspace = this.workspace;
    if (workspace === undefined) return this.renderEmptyState(this.emptyState ?? {
      title: "Select a workspace",
      body: "Choose a workspace to inspect files, Git, or terminals.",
    });
    const context = this.panelContext;
    if (context === undefined) return this.renderEmptyState({
      title: "Workspace tools unavailable",
      body: "Try selecting the workspace again.",
    });
    const visiblePanels = this.panels;
    const selectedPanel = visiblePanels.find((panel) => panel.id === this.tool) ?? visiblePanels[0];
    const availablePanels = this.allPanels.length > 0 ? this.allPanels : this.panels;

    if (visiblePanels.length === 0) {
      return html`
        ${this.hideToolTabs ? null : this.renderHeader(visiblePanels, selectedPanel, context, availablePanels)}
        <section class="empty-state" role="status">
          <h2>All plugins are hidden</h2>
          <p>You can restore hidden plugins anytime from the customize menu.</p>
          <button type="button" @click=${() => this.onResetToolVisibility?.()}>Show all plugins</button>
        </section>
      `;
    }

    return html`
      ${this.hideToolTabs ? null : this.renderHeader(visiblePanels, selectedPanel, context, availablePanels)}
      ${selectedPanel === undefined ? this.renderEmptyState({
      title: "No workspace tools available",
      body: "No tools are available for this workspace.",
    }) : html`
        <div class="panel-content">
          ${selectedPanel.render(context)}
        </div>
      `}
    `;
  }

  private renderHeader(
    visiblePanels: QualifiedWorkspacePanelContribution[],
    selectedPanel: QualifiedWorkspacePanelContribution | undefined,
    context: WorkspacePanelContext,
    availablePanels: QualifiedWorkspacePanelContribution[],
  ): TemplateResult {
    return html`
      <header>
        <div class=${this.workspaceHeaderFrameClass()}>
          <div class="workspace-header-strip" @scroll=${this.onWorkspaceHeaderScroll}>
            <div class="tabs">
              ${visiblePanels.map((panel) => {
      const selected = selectedPanel?.id === panel.id;
      const badge = panel.badge?.(context);
      const ariaLabel = this.panelTabAriaLabel(panel, badge);
      return html`
                  <button
                    class=${this.panelTabClass(panel, selected)}
                    title=${ariaLabel}
                    aria-label=${ariaLabel}
                    aria-pressed=${String(selected)}
                    @click=${() => { this.onSelectTool(panel.id); }}
                    @contextmenu=${(event: MouseEvent) => { this.handleTabContextMenu(event, panel); }}
                  >
                    ${this.renderPanelTabContent(panel, badge)}
                  </button>
                `;
    })}
            </div>
            ${availablePanels.length > 0 ? html`
              <div class="workspace-header-actions">
                <button
                  type="button"
                  class=${`customize-tabs-button${this.customizeMenuOpen ? " selected" : ""}`}
                  title="Customize visible plugins"
                  aria-label="Customize visible plugins"
                  aria-expanded=${String(this.customizeMenuOpen)}
                  @click=${(event: MouseEvent) => { event.stopPropagation(); this.toggleCustomizeMenu(event.currentTarget); }}
                >
                  ${renderSlidersIcon()}
                </button>
              </div>
            ` : null}
          </div>
        </div>
        ${this.customizeMenuOpen ? this.renderCustomizeMenu(availablePanels) : null}
      </header>
    `;
  }

  private renderCustomizeMenu(availablePanels: QualifiedWorkspacePanelContribution[]): TemplateResult {
    return html`
      <div
        class="action-menu-panel plugin-visibility-menu"
        style=${this.customizeMenuStyle}
        @click=${(event: MouseEvent) => { event.stopPropagation(); }}
      >
        ${this.contextMenuTargetPanel !== undefined ? html`
          <button
            type="button"
            class="menu-action-item"
            @click=${() => {
          if (this.contextMenuTargetPanel !== undefined) {
            this.onToggleToolVisibility?.(this.contextMenuTargetPanel.id, true);
            this.closeCustomizeMenu();
          }
        }}
          >
            <span>Hide "${this.contextMenuTargetPanel.title}"</span>
          </button>
          <div class="menu-divider"></div>
        ` : null}
        <div class="menu-title">Visible plugins</div>
        <div class="menu-items-list">
          ${availablePanels.map((panel) => {
          const isVisible = !this.hiddenToolIds.has(panel.id);
          return html`
              <label class="menu-checkbox-item">
                <input
                  type="checkbox"
                  .checked=${isVisible}
                  @change=${(event: Event) => {
              const checked = (event.target as HTMLInputElement).checked;
              this.onToggleToolVisibility?.(panel.id, !checked);
            }}
                />
                ${panel.icon !== undefined ? html`<span class="tab-custom-icon" aria-hidden="true">${panel.icon}</span>` : null}
                <span class="menu-item-label">${panel.title}</span>
              </label>
            `;
        })}
        </div>
        ${this.hiddenToolIds.size > 0 ? html`
          <div class="menu-divider"></div>
          <button
            type="button"
            class="menu-action-item show-all-action"
            @click=${() => {
          this.onResetToolVisibility?.();
          this.closeCustomizeMenu();
        }}
          >
            Show all plugins
          </button>
        ` : null}
      </div>
    `;
  }

  private closeCustomizeMenu(): void {
    this.customizeMenuOpen = false;
    this.contextMenuTargetPanel = undefined;
  }

  private toggleCustomizeMenu(target: EventTarget | null): void {
    if (this.customizeMenuOpen && this.contextMenuTargetPanel === undefined) {
      this.closeCustomizeMenu();
      return;
    }
    this.contextMenuTargetPanel = undefined;
    this.customizeMenuStyle = actionMenuPanelStyle(target, { constrainTo: "viewport" });
    this.customizeMenuOpen = true;
  }

  private handleTabContextMenu(event: MouseEvent, panel: QualifiedWorkspacePanelContribution): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuTargetPanel = panel;
    this.customizeMenuStyle = actionMenuPanelStyle(event.currentTarget, { constrainTo: "viewport" });
    this.customizeMenuOpen = true;
  }

  private panelTabClass(panel: QualifiedWorkspacePanelContribution, selected: boolean): string {
    return [
      ...(panel.icon === undefined ? [] : ["icon-tab"]),
      ...(selected ? ["selected"] : []),
    ].join(" ");
  }

  private panelTabAriaLabel(panel: QualifiedWorkspacePanelContribution, badge: WorkspacePanelBadge): string {
    if (typeof badge !== "string" && typeof badge !== "number") return panel.title;
    const trimmedBadge = String(badge).trim();
    return trimmedBadge === "" ? panel.title : `${panel.title}, ${trimmedBadge}`;
  }

  private renderPanelTabContent(panel: QualifiedWorkspacePanelContribution, badge: WorkspacePanelBadge): TemplateResult {
    return html`
      ${panel.icon === undefined ? null : html`<span class="tab-custom-icon" aria-hidden="true">${panel.icon}</span>`}
      <span class="tab-label">${panel.title}</span>
      ${this.isEmptyBadge(badge) ? null : html`<span class="tab-badge">${badge}</span>`}
    `;
  }

  private isEmptyBadge(badge: WorkspacePanelBadge): boolean {
    return badge === undefined || badge === "";
  }

  private renderEmptyState(state: WorkspacePanelEmptyState): TemplateResult {
    return html`
      <section class="empty-state" role="status">
        <h2>${state.title}</h2>
        ${state.body === undefined ? null : html`<p>${state.body}</p>`}
      </section>
    `;
  }

  private workspaceHeaderFrameClass(): string {
    return `workspace-header-scroll-frame${this.workspaceHeaderCanScrollLeft ? " can-scroll-left" : ""}${this.workspaceHeaderCanScrollRight ? " can-scroll-right" : ""}`;
  }

  private observeWorkspaceHeaderStrip(): void {
    const strip = this.workspaceHeaderStripElement();
    if (this.observedWorkspaceHeaderStrip === strip) return;
    this.workspaceHeaderResizeObserver?.disconnect();
    this.observedWorkspaceHeaderStrip = strip;
    this.workspaceHeaderResizeObserver = undefined;
    if (strip === undefined || typeof ResizeObserver === "undefined") return;
    this.workspaceHeaderResizeObserver = new ResizeObserver(() => {
      this.updateWorkspaceHeaderScrollState();
    });
    this.workspaceHeaderResizeObserver.observe(strip);
  }

  private updateWorkspaceHeaderScrollState(): void {
    const strip = this.workspaceHeaderStripElement();
    const maxScrollLeft = strip === undefined ? 0 : Math.max(0, strip.scrollWidth - strip.clientWidth);
    const canScrollLeft = strip !== undefined && strip.scrollLeft > 1;
    const canScrollRight = strip !== undefined && maxScrollLeft - strip.scrollLeft > 1;
    if (this.workspaceHeaderCanScrollLeft !== canScrollLeft) this.workspaceHeaderCanScrollLeft = canScrollLeft;
    if (this.workspaceHeaderCanScrollRight !== canScrollRight) this.workspaceHeaderCanScrollRight = canScrollRight;
  }

  private workspaceHeaderStripElement(): HTMLElement | undefined {
    const strip = this.workspaceHeaderStrip;
    return strip instanceof HTMLElement ? strip : undefined;
  }

  static override styles = workspacePanelStyles;
}
