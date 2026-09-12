import { LitElement, css, html, type TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import type { AppState } from "../../appState";
import { renderAppTabIcon, type AppTabBuiltinIcon } from "../tabIcons";

export type AppMobileMainTabBuiltinIcon = AppTabBuiltinIcon;
export type AppMobileMainTabIcon = AppMobileMainTabBuiltinIcon | TemplateResult;

export interface AppMobileMainTab {
  id: AppState["mainView"];
  label: string;
  icon?: AppMobileMainTabIcon;
  badge?: unknown;
  className?: string | undefined;
}

@customElement("app-mobile-main-tabs")
export class AppMobileMainTabs extends LitElement {
  @property({ attribute: false }) tabs: AppMobileMainTab[] = [];
  @property({ attribute: false }) selectedView: AppState["mainView"] = "chat";
  @property({ attribute: false }) onSelect?: (view: AppState["mainView"]) => void;
  @property({ attribute: false }) onShowActions?: () => void;
  @property({ attribute: false }) refreshControl: unknown;
  @property({ type: Boolean, reflect: true }) bottom = false;
  @query(".mobile-tabs") private mobileTabs?: HTMLElement | null;
  @state() private canScrollLeft = false;
  @state() private canScrollRight = false;
  private observedMobileTabs: HTMLElement | undefined;
  private mobileTabsResizeObserver: ResizeObserver | undefined;

  override disconnectedCallback(): void {
    this.mobileTabsResizeObserver?.disconnect();
    this.mobileTabsResizeObserver = undefined;
    this.observedMobileTabs = undefined;
    super.disconnectedCallback();
  }

  override firstUpdated(): void {
    this.observeMobileTabs();
    this.updateScrollState();
  }

  override updated(): void {
    this.observeMobileTabs();
    this.updateScrollState();
  }

  override render() {
    const fallbackLabels = this.fallbackLabels();
    return html`
      <div class=${this.frameClass()}>
        <div class="mobile-tabs" @scroll=${this.onMobileTabsScroll}>
          ${this.tabs.map((tab) => {
      const selected = this.selectedView === tab.id;
      return html`
              <button class=${this.tabClass(tab)} title=${tab.label} aria-label=${this.tabAriaLabel(tab)} aria-pressed=${String(selected)} @click=${() => { this.onSelect?.(tab.id); }}>
                ${this.renderTabMark(tab, fallbackLabels)}
                <span class="tab-label">${tab.label}</span>
                ${this.isEmptyBadge(tab.badge) ? null : html`<span class="tab-badge">${tab.badge}</span>`}
              </button>
            `;
    })}
        </div>
        ${this.hasActions() ? html`
          <div class="mobile-tabs-actions">
            ${this.renderActionsButton()}${this.refreshControl}
          </div>
        ` : null}
      </div>
    `;
  }

  private renderActionsButton() {
    if (this.onShowActions === undefined) return null;
    return html`
      <button
        type="button"
        class="mobile-action-button"
        title="Show Actions"
        aria-label="Show Actions"
        @click=${(event: MouseEvent) => { event.stopPropagation(); this.onShowActions?.(); }}
      >
        <svg class="mobile-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M13 2 4 14h7l-1 8 10-13h-7V2Z"></path>
        </svg>
      </button>
    `;
  }

  private frameClass(): string {
    const classes = ["mobile-tabs-frame"];
    if (this.hasActions()) classes.push("has-mobile-actions");
    if (this.hasDoubleActions()) classes.push("has-mobile-actions-double");
    if (this.canScrollLeft) classes.push("can-scroll-left");
    if (this.canScrollRight) classes.push("can-scroll-right");
    return classes.join(" ");
  }

  private hasActions(): boolean {
    return this.onShowActions !== undefined || this.refreshControl !== undefined;
  }

  private hasDoubleActions(): boolean {
    return this.onShowActions !== undefined && this.refreshControl !== undefined;
  }

  private tabClass(tab: AppMobileMainTab): string {
    return [
      ...(tab.className === undefined ? [] : [tab.className]),
      ...(this.selectedView === tab.id ? ["selected"] : []),
    ].join(" ");
  }

  private tabAriaLabel(tab: AppMobileMainTab): string {
    if (typeof tab.badge !== "string" && typeof tab.badge !== "number") return tab.label;
    const badge = String(tab.badge).trim();
    return badge === "" ? tab.label : `${tab.label}, ${badge}`;
  }

  private isEmptyBadge(badge: unknown): boolean {
    return badge === undefined || badge === "";
  }

  private renderTabMark(tab: AppMobileMainTab, fallbackLabels: Map<AppState["mainView"], string>) {
    return tab.icon === undefined
      ? html`<span class="tab-fallback" aria-hidden="true">${fallbackLabels.get(tab.id) ?? this.initialsLabel(tab.label)}</span>`
      : renderAppTabIcon(tab.icon);
  }

  private fallbackLabels(): Map<AppState["mainView"], string> {
    const fallbackTabs = this.tabs.filter((tab) => tab.icon === undefined);
    const counts = new Map<string, number>();
    for (const tab of fallbackTabs) {
      const initials = this.initialsLabel(tab.label);
      counts.set(initials, (counts.get(initials) ?? 0) + 1);
    }

    const labels = new Map<AppState["mainView"], string>();
    for (const tab of fallbackTabs) {
      const initials = this.initialsLabel(tab.label);
      labels.set(tab.id, (counts.get(initials) ?? 0) > 1 ? this.fullFallbackLabel(tab.label) : initials);
    }
    return labels;
  }

  private initialsLabel(label: string): string {
    const words = label.match(/[\p{L}\p{N}]+/gu) ?? [];
    const initials = words.map((word) => Array.from(word)[0] ?? "").join("").toLocaleUpperCase();
    return initials === "" ? "?" : initials;
  }

  private fullFallbackLabel(label: string): string {
    const trimmed = label.trim();
    return trimmed === "" ? "?" : trimmed;
  }

  private observeMobileTabs(): void {
    const mobileTabs = this.mobileTabsElement();
    if (this.observedMobileTabs === mobileTabs) return;
    this.mobileTabsResizeObserver?.disconnect();
    this.observedMobileTabs = mobileTabs;
    this.mobileTabsResizeObserver = undefined;
    if (mobileTabs === undefined || typeof ResizeObserver === "undefined") return;
    this.mobileTabsResizeObserver = new ResizeObserver(() => {
      this.updateScrollState();
    });
    this.mobileTabsResizeObserver.observe(mobileTabs);
  }

  private updateScrollState(): void {
    const mobileTabs = this.mobileTabsElement();
    const maxScrollLeft = mobileTabs === undefined ? 0 : Math.max(0, mobileTabs.scrollWidth - mobileTabs.clientWidth);
    const canScrollLeft = mobileTabs !== undefined && mobileTabs.scrollLeft > 1;
    const canScrollRight = mobileTabs !== undefined && maxScrollLeft - mobileTabs.scrollLeft > 1;
    if (this.canScrollLeft !== canScrollLeft) this.canScrollLeft = canScrollLeft;
    if (this.canScrollRight !== canScrollRight) this.canScrollRight = canScrollRight;
  }

  private mobileTabsElement(): HTMLElement | undefined {
    const mobileTabs = this.mobileTabs;
    return mobileTabs instanceof HTMLElement ? mobileTabs : undefined;
  }

  private readonly onMobileTabsScroll = () => {
    this.updateScrollState();
  };

  static override styles = css`
    :host { flex: 0 0 auto; min-width: 0; }
    .mobile-tabs-frame { position: relative; display: flex; flex: 0 0 auto; min-width: 0; border-bottom: 1px solid var(--pi-border); background: var(--pi-bg); }
    :host([bottom]) .mobile-tabs-frame { border-bottom: 0; border-top: 1px solid var(--pi-border); padding-bottom: max(0px, env(safe-area-inset-bottom)); }
    .mobile-tabs-frame::before, .mobile-tabs-frame::after { content: ""; position: absolute; top: 0; bottom: 0; z-index: 2; width: 20px; opacity: 0; pointer-events: none; transition: opacity .15s ease; }
    .mobile-tabs-frame::before { left: 0; background: linear-gradient(90deg, color-mix(in srgb, var(--pi-shadow-strong) 55%, transparent) 0%, transparent 100%); }
    .mobile-tabs-frame::after { right: 0; background: linear-gradient(270deg, color-mix(in srgb, var(--pi-shadow-strong) 55%, transparent) 0%, transparent 100%); }
    .mobile-tabs-frame.can-scroll-left::before, .mobile-tabs-frame.can-scroll-right::after { opacity: 1; }
    .mobile-tabs-frame.has-mobile-actions::after { display: none; }
    .mobile-tabs-frame.has-mobile-actions .mobile-tabs { padding-right: 52px; scroll-padding-inline: 8px 52px; }
    .mobile-tabs-frame.has-mobile-actions-double .mobile-tabs { padding-right: 96px; scroll-padding-inline: 8px 96px; }
    .mobile-tabs-actions { position: absolute; top: 0; right: 0; bottom: 0; z-index: 3; display: flex; align-items: center; gap: 6px; padding: 0 8px; background: var(--pi-bg); pointer-events: none; }
    :host([bottom]) .mobile-tabs-actions { bottom: max(0px, env(safe-area-inset-bottom)); }
    .mobile-tabs-actions::before { content: ""; position: absolute; top: 0; bottom: 0; left: -24px; z-index: 0; width: 24px; background: linear-gradient(90deg, transparent, var(--pi-bg)); pointer-events: none; opacity: 0; transition: opacity .15s ease; }
    .mobile-tabs-frame.can-scroll-right .mobile-tabs-actions::before { opacity: 1; }
    app-refresh-control, .mobile-action-button { position: relative; z-index: 1; pointer-events: auto; }
    .mobile-action-button { box-sizing: border-box; width: 36px; height: 36px; display: grid; place-items: center; border: 1px solid var(--pi-border); border-radius: 8px; background: var(--pi-surface); color: var(--pi-text); padding: 0; line-height: 1; cursor: pointer; }
    .mobile-action-button:hover, .mobile-action-button:focus-visible { border-color: var(--pi-accent); background: var(--pi-selection-bg); }
    .mobile-action-icon { width: 18px; height: 18px; fill: currentColor; pointer-events: none; }
    .mobile-tabs { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 6px; padding: 8px; overflow-x: auto; overflow-y: hidden; overscroll-behavior-x: contain; scrollbar-width: thin; }
    .mobile-tabs button { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
    .mobile-tabs .navigation-tab { display: none; }
    .mobile-tabs button.selected { border-color: var(--pi-accent); background: var(--pi-selection-bg); }
    .tab-icon { flex: 0 0 auto; width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; pointer-events: none; }
    .tab-custom-icon { flex: 0 0 auto; width: 18px; height: 18px; display: inline-grid; place-items: center; color: currentColor; pointer-events: none; }
    .tab-custom-icon svg { width: 18px; height: 18px; pointer-events: none; }
    .tab-fallback { display: none; font-weight: 650; letter-spacing: .01em; pointer-events: none; }
    .tab-label { min-width: 0; }
    .tab-badge { flex: 0 0 auto; display: inline-block; min-width: 14px; margin-left: 0; border: 1px solid var(--pi-success-border); border-radius: 999px; background: var(--pi-success-surface); color: var(--pi-success); padding: 0 5px; font-size: 11px; line-height: 16px; text-align: center; }
    button { border: 1px solid var(--pi-border); border-radius: 8px; background: var(--pi-surface); color: var(--pi-text); padding: 7px 9px; cursor: pointer; }
    @media (max-width: 760px) {
      .mobile-tabs { gap: 4px; padding: 6px 8px; }
      .mobile-tabs button { min-width: 40px; height: 36px; justify-content: center; gap: 4px; padding: 0 8px; }
      .mobile-tabs .navigation-tab { display: inline-flex; }
      .tab-fallback { display: inline-block; }
      .tab-label { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0; }
      .tab-badge { min-width: 13px; padding: 0 4px; font-size: 10px; line-height: 13px; }
    }
  `;
}
