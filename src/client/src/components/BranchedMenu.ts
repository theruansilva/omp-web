import { LitElement, css, html, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

export interface BranchedMenuLeafItem {
  value: string;
  label: string;
  icon?: unknown;
}

export interface BranchedMenuItem {
  label: string;
  value?: string;
  icon?: unknown;
  children?: BranchedMenuLeafItem[];
}

export const DEFAULT_BRANCHED_ITEMS: BranchedMenuItem[] = [
  {
    label: "Getting started",
    children: [
      { value: "install", label: "Installation" },
      { value: "quick", label: "Quick start" },
      { value: "config", label: "Configuration" },
      { value: "theming", label: "Theming" },
    ],
  },
  {
    label: "Components",
    children: [
      { value: "buttons", label: "Buttons" },
      { value: "typography", label: "Typography" },
      { value: "overlays", label: "Overlays" },
      { value: "toasts", label: "Toasts" },
    ],
  },
];

const PAD = 6;
const MARK = 16;

export function calculateBranchPath(trunk: number, rowY: number, r: number, endX: number): string {
  return `M ${trunk} ${rowY - r} A ${r} ${r} 0 0 0 ${trunk + r} ${rowY} H ${endX}`;
}

export function calculateReachPath(trunk: number, rowY: number, r: number, endX: number): string {
  return `M ${trunk} 0 V ${rowY - r} A ${r} ${r} 0 0 0 ${trunk + r} ${rowY} H ${endX}`;
}

export function calculateReachLength(trunk: number, rowY: number, r: number, endX: number): number {
  return (rowY - r) + (Math.PI * r) / 2 + (endX - trunk - r);
}

function toOpenSet(open: number | number[] | undefined): Set<number> {
  if (Array.isArray(open)) return new Set(open);
  if (typeof open === "number" && open >= 0) return new Set([open]);
  return new Set();
}

@customElement("branched-menu")
export class BranchedMenu extends LitElement {
  @property({ type: Array }) items: BranchedMenuItem[] = DEFAULT_BRANCHED_ITEMS;
  @property({ attribute: false }) defaultOpen: number | number[] = 0;
  @property({ type: String }) defaultActive = "";
  @property({ type: String }) color = "var(--pi-text, #f5f5f5)";
  @property({ type: String }) accentColor = "var(--pi-accent, #58a6ff)";
  @property({ type: String }) lineColor = "var(--pi-border-muted, #3f3f46)";
  @property({ type: Number }) width = 240;
  @property({ type: Number }) rowHeight = 36;
  @property({ type: Number }) indent = 40;
  @property({ type: Number }) trunk = 14;
  @property({ type: Number }) radius = 10;
  @property({ type: Number }) lineWidth = 1.5;
  @property({ type: Number }) fontSize = 14;
  @property({ type: Number }) drawDuration = 400;
  @property({ type: Number }) foldDuration = 300;
  @property({ type: String }) menuClassName = "";

  @property({ attribute: false }) onSelect?: (value: string, item: BranchedMenuItem | BranchedMenuLeafItem) => void;
  @property({ attribute: false }) onToggle?: (index: number, open: boolean) => void;

  @state() private openIndices: Set<number> = new Set();
  @state() private activeValue = "";

  private headElements: (HTMLElement | null)[] = [];
  private markerElement: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.openIndices = toOpenSet(this.defaultOpen);
    this.activeValue = this.resolveInitialActive();
    this.setupResizeObserver();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  private resolveInitialActive(): string {
    if (this.defaultActive) return this.defaultActive;
    const initialOpen = toOpenSet(this.defaultOpen);
    const firstSection = this.items.find((item, index) => item.children && initialOpen.has(index));
    return firstSection?.children?.[0]?.value ?? "";
  }

  private setupResizeObserver(): void {
    let initial = true;
    this.resizeObserver = new ResizeObserver(() => {
      if (initial) {
        initial = false;
        return;
      }
      this.positionMarker(false);
    });
    this.resizeObserver.observe(this);
  }

  protected override updated(): void {
    this.positionMarker(true);
  }

  private positionMarker(glide = true): void {
    const marker = this.renderRoot.querySelector<HTMLElement>(".branched-menu__marker");
    if (!marker) return;

    const activeSectionIndex = this.items.findIndex(
      (section) => section.children?.some((kid) => kid.value === this.activeValue)
    );
    const isShown = activeSectionIndex >= 0 && this.openIndices.has(activeSectionIndex);
    const headEl = this.headElements[activeSectionIndex];

    if (!glide) marker.style.transition = "none";
    if (isShown && headEl) {
      marker.style.top = `${headEl.offsetTop + (headEl.offsetHeight - MARK) / 2}px`;
    }
    marker.toggleAttribute("data-on", Boolean(isShown && headEl));
    if (!glide) {
      void marker.offsetHeight;
      marker.style.transition = "";
    }
  }

  private toggleSection(index: number): void {
    const next = new Set(this.openIndices);
    const willOpen = !next.has(index);
    if (willOpen) next.add(index);
    else next.delete(index);
    this.openIndices = next;
    this.onToggle?.(index, willOpen);
    this.dispatchEvent(new CustomEvent("toggle", { detail: { index, open: willOpen }, bubbles: true, composed: true }));
  }

  private selectItem(value: string, item: BranchedMenuItem | BranchedMenuLeafItem): void {
    this.activeValue = value;
    this.onSelect?.(value, item);
    this.dispatchEvent(new CustomEvent("select", { detail: { value, item }, bubbles: true, composed: true }));
  }

  private renderIcon(icon: unknown): TemplateResult | null {
    if (!icon) return null;
    if (typeof icon === "object" && icon !== null && "_$litType$" in (icon as Record<string, unknown>)) {
      return icon as TemplateResult;
    }
    if (typeof icon === "function") {
      try {
        const res = (icon as () => unknown)();
        if (typeof res === "object" && res !== null && "_$litType$" in (res as Record<string, unknown>)) {
          return res as TemplateResult;
        }
      } catch {
        // ignore
      }
    }
    return html`<span class="branched-menu__icon-glyph" aria-hidden="true">•</span>`;
  }

  override render() {
    const r = Math.min(this.radius, this.rowHeight / 2 - 2);
    const endX = this.indent - 8;
    const rowY = (k: number) => PAD + k * this.rowHeight + this.rowHeight / 2;
    const branch = (k: number) => calculateBranchPath(this.trunk, rowY(k), r, endX);
    const reach = (k: number) => calculateReachPath(this.trunk, rowY(k), r, endX);
    const length = (k: number) => calculateReachLength(this.trunk, rowY(k), r, endX);

    return html`
      <nav
        class=${`branched-menu${this.menuClassName ? ` ${this.menuClassName}` : ""}`}
        style="
          --bm-w: ${this.width}px;
          --bm-ink: ${this.color};
          --bm-accent: ${this.accentColor};
          --bm-line: ${this.lineColor};
          --bm-font: ${this.fontSize}px;
          --bm-row: ${this.rowHeight}px;
          --bm-indent: ${this.indent}px;
          --bm-line-w: ${this.lineWidth};
          --bm-draw: ${this.drawDuration}ms;
          --bm-fold: ${this.foldDuration}ms;
        "
      >
        <span class="branched-menu__marker" aria-hidden="true"></span>
        ${this.items.map((item, i) => {
      const kids = item.children;
      const isOpen = kids ? this.openIndices.has(i) : false;
      const leafValue = item.value ?? item.label;
      const leafActive = !kids && leafValue === this.activeValue;
      const bodyH = kids ? PAD * 2 + kids.length * this.rowHeight : 0;

      return html`
            <div class="branched-menu__section" ?data-open=${isOpen}>
              <button
                type="button"
                class="branched-menu__head"
                aria-expanded=${kids ? String(isOpen) : undefined}
                aria-current=${leafActive ? "true" : undefined}
                ?data-active=${leafActive}
                @click=${() => (kids ? this.toggleSection(i) : this.selectItem(leafValue, item))}
                ${(el: HTMLElement | null) => { this.headElements[i] = el; }}
              >
                ${item.label}
              </button>

              ${kids ? html`
                <div class="branched-menu__body">
                  <div class="branched-menu__fold">
                    <div class="branched-menu__tree" style="height: ${bodyH}px">
                      <svg class="branched-menu__lines" width=${this.indent} height=${bodyH} aria-hidden="true">
                        <path class="branched-menu__base" d="M ${this.trunk} 0 V ${rowY(kids.length - 1) - r}" />
                        ${kids.map((kid, k) => html`<path class="branched-menu__base" d=${branch(k)} />`)}
                        ${kids.map((kid, k) => {
        const isActive = kid.value === this.activeValue;
        const pathLen = length(k);
        return html`
                            <path
                              class="branched-menu__reach"
                              d=${reach(k)}
                              style="stroke-dasharray: ${pathLen}; stroke-dashoffset: ${isActive ? 0 : pathLen};"
                            />
                          `;
      })}
                      </svg>

                      ${kids.map((kid) => {
        const isKidActive = kid.value === this.activeValue;
        return html`
                          <button
                            type="button"
                            class="branched-menu__item"
                            aria-current=${isKidActive ? "true" : undefined}
                            ?data-active=${isKidActive}
                            tabindex=${isOpen ? 0 : -1}
                            @click=${() => this.selectItem(kid.value, kid)}
                          >
                            ${kid.icon ? html`<span class="branched-menu__icon" aria-hidden="true">${this.renderIcon(kid.icon)}</span>` : null}
                            <span class="branched-menu__label">${kid.label}</span>
                          </button>
                        `;
      })}
                    </div>
                  </div>
                </div>
              ` : null}
            </div>
          `;
    })}
      </nav>
    `;
  }

  static override styles = css`
    :host {
      display: block;
      width: fit-content;
      max-width: 100%;
    }

    .branched-menu {
      --bm-w: 240px;
      --bm-ink: #f5f5f5;
      --bm-accent: #f5f5f5;
      --bm-line: #3f3f46;
      --bm-font: 14px;
      --bm-row: 36px;
      --bm-indent: 40px;
      --bm-line-w: 1.5;
      --bm-draw: 400ms;
      --bm-fold: 300ms;
      --bm-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
      --bm-muted: color-mix(in srgb, var(--bm-ink) 55%, transparent);

      position: relative;
      display: flex;
      flex-direction: column;
      width: fit-content;
      max-width: min(var(--bm-w), 100%);
      padding-left: 14px;
      color: var(--bm-ink);
      font-family: inherit;
      font-size: var(--bm-font);
      line-height: 1.2;
    }

    .branched-menu::before {
      content: "";
      position: absolute;
      top: 8px;
      bottom: 0;
      left: 0;
      width: 2px;
      border-radius: 1px;
      background: linear-gradient(to bottom, var(--bm-line) 0%, var(--bm-line) 55%, transparent 100%);
    }

    .branched-menu__marker {
      position: absolute;
      top: -1px;
      left: 0;
      z-index: 1;
      width: 2px;
      height: 16px;
      border-radius: 1px;
      background: var(--bm-accent);
      opacity: 0;
      transition:
        top 220ms var(--bm-ease-out),
        opacity 150ms ease;
    }

    .branched-menu__marker[data-on] {
      opacity: 1;
    }

    .branched-menu__section {
      display: flex;
      flex-direction: column;
    }

    .branched-menu__head {
      display: block;
      margin: 0;
      padding: 9px 0;
      border: 0;
      background: none;
      color: var(--bm-muted);
      font: inherit;
      font-size: calc(var(--bm-font) + 1px);
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      outline: none;
      -webkit-tap-highlight-color: transparent;
      transition: color 200ms ease;
    }

    .branched-menu__section[data-open] .branched-menu__head,
    .branched-menu__head[data-active] {
      color: var(--bm-ink);
    }

    @media (hover: hover) and (pointer: fine) {
      .branched-menu__head:hover {
        color: var(--bm-ink);
      }
    }

    .branched-menu__body {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows var(--bm-fold) var(--bm-ease-out);
    }

    .branched-menu__section[data-open] .branched-menu__body {
      grid-template-rows: 1fr;
    }

    .branched-menu__fold {
      min-height: 0;
      overflow: hidden;
    }

    .branched-menu__tree {
      position: relative;
      padding: 6px 0;
      box-sizing: border-box;
    }

    .branched-menu__lines {
      position: absolute;
      top: 0;
      left: 0;
      overflow: visible;
      opacity: 0;
      pointer-events: none;
      transition: opacity 200ms ease;
    }

    .branched-menu__section[data-open] .branched-menu__lines {
      opacity: 1;
      transition: opacity 250ms ease 100ms;
    }

    .branched-menu__base,
    .branched-menu__reach {
      fill: none;
      stroke-width: var(--bm-line-w);
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .branched-menu__base {
      stroke: var(--bm-line);
    }

    .branched-menu__reach {
      stroke: var(--bm-accent);
      transition: stroke-dashoffset var(--bm-draw) var(--bm-ease-out);
    }

    .branched-menu__item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      height: var(--bm-row);
      margin: 0;
      padding: 0 0 0 var(--bm-indent);
      border: 0;
      background: none;
      color: var(--bm-muted);
      font: inherit;
      text-align: left;
      cursor: pointer;
      outline: none;
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
      transition: color 200ms ease;
    }

    @media (hover: hover) and (pointer: fine) {
      .branched-menu__item:hover {
        color: var(--bm-ink);
      }
    }

    .branched-menu__item[data-active] {
      color: var(--bm-accent);
      font-weight: 500;
    }

    .branched-menu__icon {
      display: inline-flex;
      flex: none;
      align-items: center;
      justify-content: center;
    }

    .branched-menu__icon-glyph {
      font-size: 10px;
      line-height: 1;
    }

    .branched-menu__label {
      white-space: nowrap;
    }

    @media (prefers-reduced-motion: reduce) {
      .branched-menu__marker {
        transition: opacity 150ms ease;
      }
      .branched-menu__body {
        transition: none;
      }
      .branched-menu__reach {
        transition: none;
      }
    }
  `;
}
