import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { SessionModel } from "../../../shared/apiTypes";
import { normalizeModelName, classifyModelSource } from "../modelCategories";
import {
  renderModelProviderIcon,
  renderCheckIcon,
  renderBoltIcon,
  renderBrainIcon,
  renderSparklesIcon,
  renderChevronDownIcon,
} from "./icons";

export interface ModelSelectDetail {
  provider: string;
  modelId: string;
  persist?: boolean;
  role?: string;
}

export interface ModelRoleItem {
  id: string;
  tag: string;
  name: string;
  desc: string;
  color: string;
}

export const TUI_ROLES: ModelRoleItem[] = [
  { id: "default", tag: "@default", name: "Padrão", desc: "Modelo principal para chat e raciocínio geral", color: "text-emerald-500" },
  { id: "smol", tag: "@smol", name: "Fast / Smol", desc: "Fast execution for everyday tasks and quick edits", color: "text-amber-500" },
  { id: "slow", tag: "@slow", name: "Thinking / Slow", desc: "Deep reasoning and architecture planning", color: "text-blue-500" },
  { id: "tiny", tag: "@tiny", name: "Tiny", desc: "Ultra-lightweight or local models for syntax repairs", color: "text-purple-500" },
  { id: "advisor", tag: "@advisor", name: "Advisor", desc: "Strategy, sales, and architecture advisor", color: "text-cyan-500" },
  { id: "image", tag: "@image", name: "Imagem", desc: "Image generation and transformation", color: "text-pink-500" },
  { id: "vision", tag: "@vision", name: "Visão", desc: "Multimodal analysis of images and screenshots", color: "text-rose-500" },
  { id: "commit", tag: "@commit", name: "Commit", desc: "Semantic commit message generation", color: "text-orange-500" },
  { id: "plan", tag: "@plan", name: "Arquiteto", desc: "Execution plan generation and validation", color: "text-indigo-500" },
  { id: "task", tag: "@task", name: "Subtarefa", desc: "Autonomous execution of subtasks and subagents", color: "text-teal-500" },
  { id: "memory", tag: "@memory", name: "Memória", desc: "Extraction, summarization, and memory consolidation", color: "text-yellow-500" },
  { id: "web", tag: "@web", name: "Web Search", desc: "Web search and data scraping", color: "text-green-500" },
];

@customElement("omp-models-view")
export class OmpModelsView extends LitElement {
  @property({ attribute: false }) models: SessionModel[] = [];
  @property({ attribute: false }) currentModel?: SessionModel;
  @property({ attribute: false }) roleModels: Record<string, SessionModel> = {};
  @property({ type: String }) thinkingLevel = "medium";
  @property({ type: Boolean }) isWorking = false;

  @state() private searchQuery = "";
  @state() private selectedCategory = "all";
  @state() private selectedRoleFilter = "all";
  @state() private activeRoleMenuModelKey: string | null = null;
  @state() private feedbackMessage = "";

  protected override createRenderRoot() {
    return this;
  }

  private feedbackTimer?: number;

  private showFeedback(msg: string) {
    clearTimeout(this.feedbackTimer);
    this.feedbackMessage = msg;
    this.feedbackTimer = setTimeout(() => {
      this.feedbackMessage = "";
      this.requestUpdate();
    }, 3500);
  }

  private handleSelectModel(model: SessionModel, persist = false, role?: string) {
    if (!model.provider || !model.id) return;
    this.activeRoleMenuModelKey = null;
    this.dispatchEvent(
      new CustomEvent<ModelSelectDetail>("select-model", {
        detail: {
          provider: model.provider,
          modelId: model.id,
          persist,
          role,
        },
        bubbles: true,
        composed: true,
      }),
    );
    const normalized = normalizeModelName(model.provider, model.id, model.name);
    if (role && role !== "default") {
      this.showFeedback(`Modelo ${normalized} associado ao papel @${role}!`);
    } else if (persist) {
      this.showFeedback(`Modelo ${normalized} salvo como padrão global (@default)!`);
    } else {
      this.showFeedback(`Modelo ${normalized} ativado para a sessão atual!`);
    }
  }

  private handleSetThinking(level: string) {
    this.dispatchEvent(
      new CustomEvent<{ level: string }>("set-thinking-level", {
        detail: { level },
        bubbles: true,
        composed: true,
      }),
    );
    this.showFeedback(`Nível de raciocínio alterado para ${level.toUpperCase()}`);
  }

  private getFilteredModels(): SessionModel[] {
    const query = this.searchQuery.toLowerCase().trim();
    return this.models.filter((m) => {
      const provider = (m.provider || "").toLowerCase();
      const id = (m.id || "").toLowerCase();
      const name = (m.name || "").toLowerCase();
      const normalized = normalizeModelName(m.provider || "", m.id || "", m.name).toLowerCase();

      const matchesQuery =
        !query ||
        provider.includes(query) ||
        id.includes(query) ||
        name.includes(query) ||
        normalized.includes(query);

      if (!matchesQuery) return false;

      if (this.selectedCategory === "all") return true;

      const category = classifyModelSource(m.provider || "", m.id || "").category.toLowerCase();
      return category.includes(this.selectedCategory.toLowerCase()) || provider.includes(this.selectedCategory.toLowerCase());
    });
  }

  private getAvailableCategories(): Array<{ id: string; label: string }> {
    const categoriesSet = new Set<string>();
    for (const m of this.models) {
      const info = classifyModelSource(m.provider || "", m.id || "");
      categoriesSet.add(info.category);
    }
    const categories = Array.from(categoriesSet).map((cat) => ({
      id: cat.toLowerCase(),
      label: cat,
    }));
    return [{ id: "all", label: "Todos os Provedores" }, ...categories];
  }

  /**
   * Squircle surface. clip-path lives on a background layer (not the container) so
   * popovers can overflow, and the hairline outline is a drop-shadow on the wrapper,
   * which follows the clipped curve exactly (a CSS border gets cut at the corners).
   */
  private surface(content: unknown, opts: { radius?: number; className?: string; tint?: boolean } = {}) {
    const radius = opts.radius ?? 28;
    return html`
      <div class="omp-squircle-surface ${opts.tint ? "is-active" : ""} ${opts.className ?? ""}">
        <div class="omp-squircle-fill" style="--surf-clip: var(--clip-path-squircle-${radius}, none);"></div>
        <div class="relative h-full">${content}</div>
      </div>
    `;
  }

  private assignedRoles(model: SessionModel): ModelRoleItem[] {
    return TUI_ROLES.filter((r) => {
      const m = this.roleModels[r.id];
      return m && m.provider === model.provider && m.id === model.id;
    });
  }

  private renderRoleSummary() {
    const roles = [
      { id: "default", label: "Padrão", icon: renderSparklesIcon, color: "text-emerald-500" },
      { id: "slow", label: "Slow", icon: renderBrainIcon, color: "text-blue-500" },
      { id: "smol", label: "Smol", icon: renderBoltIcon, color: "text-amber-500" },
    ];
    return html`
      <section class="flex flex-col gap-3" aria-label="Modelos por papel">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <h2 class="text-sm font-semibold text-foreground-900">Em uso</h2>
          <div class="flex items-center gap-2">
            <span class="text-xs text-foreground-600">Raciocínio</span>
            <div class="flex items-center gap-0.5 p-0.5 rounded-xl bg-black/5 dark:bg-white/5" role="group" aria-label="Nível de raciocínio">
              ${["off", "low", "medium", "high"].map(
                (lvl) => html`
                  <button
                    type="button"
                    class="px-3 h-7 rounded-[10px] text-xs font-semibold transition-colors cursor-pointer ${this.thinkingLevel === lvl
                      ? "bg-black/10 dark:bg-white/15 text-foreground-900"
                      : "text-foreground-600 hover:text-foreground-900"}"
                    @click=${() => this.handleSetThinking(lvl)}
                  >
                    ${lvl}
                  </button>
                `,
              )}
            </div>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          ${roles.map((r) => {
            const m = this.roleModels[r.id] ?? (r.id === "default" ? this.currentModel : undefined);
            const name = m?.id ? normalizeModelName(m.provider || "", m.id, m.name) : undefined;
            return this.surface(
              html`
                <div class="p-4 flex flex-col gap-3 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <span class="flex items-center gap-1.5 text-xs font-semibold text-foreground-600">
                      <span class="${r.color}">${r.icon("size-4")}</span>
                      ${r.label}
                    </span>
                    <span class="font-mono text-[11px] text-foreground-600">@${r.id}</span>
                  </div>
                  ${name
                    ? html`
                        <div class="flex items-center gap-3 min-w-0">
                          <div class="size-10 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                            ${renderModelProviderIcon(m?.provider, "size-5 text-foreground-900")}
                          </div>
                          <div class="flex flex-col min-w-0">
                            <span class="text-base font-semibold text-foreground-900 truncate" title="${name}">${name}</span>
                            <span class="text-xs text-foreground-600 font-mono truncate">${m?.provider}/${m?.id}</span>
                          </div>
                        </div>
                      `
                    : html`<span class="text-sm text-foreground-600">Não configurado</span>`}
                </div>
              `,
              { radius: 28 },
            );
          })}
        </div>
      </section>
    `;
  }

  private renderModelCard(m: SessionModel) {
    const provider = m.provider || "";
    const id = m.id || "";
    const key = `${provider}/${id}`;
    const normalized = normalizeModelName(provider, id, m.name);
    const isActive = provider === this.currentModel?.provider && id === this.currentModel?.id;
    const menuOpen = this.activeRoleMenuModelKey === key;
    const assigned = this.assignedRoles(m);
    const badge = "text-[11px] px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/10 text-foreground-600";

    return this.surface(
      html`
        <div class="p-4 flex flex-col gap-4 h-full">
          <div class="flex items-start gap-3 min-w-0">
            <div class="size-11 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
              ${renderModelProviderIcon(provider, "size-6 text-foreground-900")}
            </div>
            <div class="flex flex-col min-w-0 flex-1">
              <span class="text-base font-semibold text-foreground-900 leading-tight truncate" title="${normalized}">${normalized}</span>
              <span class="text-xs text-foreground-600 font-mono truncate mt-1" title="${key}">${key}</span>
            </div>
            ${isActive
              ? html`<span class="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">${renderCheckIcon("size-3.5")} Ativo</span>`
              : nothing}
          </div>

          <div class="flex items-center gap-1.5 flex-wrap min-h-[22px]">
            ${m.contextWindow ? html`<span class="${badge} font-mono">${Math.round(m.contextWindow / 1000)}k</span>` : nothing}
            ${m.reasoning ? html`<span class="${badge}" title="Suporta raciocínio profundo">Thinking</span>` : nothing}
            ${assigned.map((r) => html`<span class="text-[11px] px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/10 font-mono font-semibold text-foreground-900">${r.tag}</span>`)}
          </div>

          <div class="flex items-center gap-2 mt-auto">
            <button
              type="button"
              class="flex-1 h-9 rounded-xl text-sm font-semibold transition-colors ${isActive
                ? "bg-black/5 dark:bg-white/10 text-foreground-600 cursor-default"
                : "bg-black/5 dark:bg-white/10 text-foreground-900 hover:bg-black/10 dark:hover:bg-white/15 cursor-pointer"}"
              ?disabled=${isActive}
              @click=${() => this.handleSelectModel(m, false, "default")}
            >
              ${isActive ? "Em uso na sessão" : "Usar na sessão"}
            </button>
            <div class="relative">
              <button
                type="button"
                class="h-9 px-3 flex items-center gap-1.5 rounded-xl text-sm font-semibold bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-foreground-900 transition-colors cursor-pointer"
                aria-haspopup="menu"
                aria-expanded=${menuOpen ? "true" : "false"}
                @click=${(e: Event) => {
                  e.stopPropagation();
                  this.activeRoleMenuModelKey = menuOpen ? null : key;
                }}
              >
                Papéis ${renderChevronDownIcon("size-3")}
              </button>
              ${menuOpen
                ? html`
                    <div
                      class="absolute right-0 top-full mt-2 z-50 w-56 max-h-72 overflow-y-auto p-1.5 rounded-2xl flex flex-col gap-0.5 text-sm select-none"
                      role="menu"
                      style="background: var(--surf-popover, var(--omp-surface-elevated)); border: 1px solid var(--omp-popover-border); backdrop-filter: blur(24px) saturate(180%); -webkit-backdrop-filter: blur(24px) saturate(180%); box-shadow: 0 16px 36px -8px rgba(0, 0, 0, 0.4);"
                      @click=${(e: Event) => e.stopPropagation()}
                    >
                      <span class="px-2.5 py-1 text-[11px] font-semibold text-foreground-600">Definir como</span>
                      ${TUI_ROLES.map(
                        (r) => html`
                          <button
                            type="button"
                            role="menuitem"
                            class="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-left transition-colors cursor-pointer"
                            @click=${() => this.handleSelectModel(m, true, r.id)}
                          >
                            <span class="font-medium text-foreground-900">${r.name}</span>
                            <span class="font-mono text-[11px] text-foreground-600">${r.tag}</span>
                          </button>
                        `,
                      )}
                    </div>
                  `
                : nothing}
            </div>
          </div>
        </div>
      `,
      { radius: 28, tint: isActive, className: menuOpen ? "z-30" : "" },
    );
  }

  override render() {
    const filtered = this.getFilteredModels();
    const categories = this.getAvailableCategories();

    return html`
      <div
        class="h-full overflow-y-auto font-sans select-text px-4 md:px-8 pb-16 max-w-5xl mx-auto flex flex-col gap-8"
        style="padding-top: 4.5rem;"
        @click=${() => { if (this.activeRoleMenuModelKey) this.activeRoleMenuModelKey = null; }}
      >
        <header class="flex items-center justify-between gap-3 flex-wrap">
          <p class="text-sm text-foreground-600">${this.models.length} modelos disponíveis</p>
          ${this.feedbackMessage
            ? html`
                <div class="flex items-center gap-2 px-3 h-8 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-semibold" role="status">
                  ${renderCheckIcon("size-3.5")} ${this.feedbackMessage}
                </div>
              `
            : nothing}
        </header>

        ${this.renderRoleSummary()}

        <section class="flex flex-col gap-4" aria-label="Catálogo">
          <div class="flex flex-col gap-3">
            ${this.surface(
              html`
                <label class="flex items-center gap-3 px-4 h-11 text-foreground-600">
                  <svg class="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input
                    type="text"
                    class="flex-1 min-w-0 bg-transparent text-sm text-foreground-900 placeholder:text-foreground-600 outline-none"
                    placeholder="Buscar modelo ou provedor"
                    .value=${this.searchQuery}
                    @input=${(e: Event) => { this.searchQuery = (e.target as HTMLInputElement).value; }}
                  />
                </label>
              `,
              { radius: 16 },
            )}
            <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              ${categories.map(
                (cat) => html`
                  <button
                    type="button"
                    class="px-3.5 h-8 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${this.selectedCategory === cat.id
                      ? "bg-black/10 dark:bg-white/15 text-foreground-900"
                      : "text-foreground-600 hover:bg-black/5 dark:hover:bg-white/8"}"
                    @click=${() => { this.selectedCategory = cat.id; }}
                  >
                    ${cat.label}
                  </button>
                `,
              )}
            </div>
          </div>

          ${filtered.length === 0
            ? html`
                <div class="py-16 text-center text-foreground-600 text-sm">
                  ${this.models.length === 0 ? "Nenhum modelo disponível." : "Nenhum modelo corresponde à busca."}
                </div>
              `
            : html`<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${filtered.map((m) => this.renderModelCard(m))}</div>`}
        </section>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "omp-models-view": OmpModelsView;
  }
}
