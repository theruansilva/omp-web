import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { SessionModel } from "../../../shared/apiTypes";
import { normalizeModelName, classifyModelSource } from "../modelCategories";
import {
  renderModelProviderIcon,
  renderArrowLeftIcon,
  renderCheckIcon,
  renderBoltIcon,
  renderBrainIcon,
  renderFeatherIcon,
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
  { id: "smol", tag: "@smol", name: "Fast / Smol", desc: "Execução rápida para tarefas cotidianas e edições", color: "text-amber-500" },
  { id: "slow", tag: "@slow", name: "Thinking / Slow", desc: "Raciocínio profundo e planejamento de arquitetura", color: "text-blue-500" },
  { id: "tiny", tag: "@tiny", name: "Tiny", desc: "Modelos ultraleves ou locais para reparo de sintaxe", color: "text-purple-500" },
  { id: "advisor", tag: "@advisor", name: "Advisor", desc: "Consultor de estratégia, vendas e arquitetura", color: "text-cyan-500" },
  { id: "image", tag: "@image", name: "Imagem", desc: "Geração e transformação de imagens", color: "text-pink-500" },
  { id: "vision", tag: "@vision", name: "Visão", desc: "Análise multimodal de imagens e capturas de tela", color: "text-rose-500" },
  { id: "commit", tag: "@commit", name: "Commit", desc: "Geração de mensagens semânticas de commit", color: "text-orange-500" },
  { id: "plan", tag: "@plan", name: "Arquiteto", desc: "Geração e validação de planos de execução", color: "text-indigo-500" },
  { id: "task", tag: "@task", name: "Subtarefa", desc: "Execução autônoma de subtarefas e subagentes", color: "text-teal-500" },
  { id: "memory", tag: "@memory", name: "Memória", desc: "Extração, sumarização e consolidação na memória", color: "text-yellow-500" },
  { id: "web", tag: "@web", name: "Web Search", desc: "Busca na web e raspagem de dados", color: "text-green-500" },
];

@customElement("omp-models-view")
export class OmpModelsView extends LitElement {
  @property({ attribute: false }) models: SessionModel[] = [];
  @property({ attribute: false }) currentModel?: SessionModel;
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

  override render() {
    const filtered = this.getFilteredModels();
    const categories = this.getAvailableCategories();
    const activeProvider = this.currentModel?.provider;
    const activeId = this.currentModel?.id;
    const activeNormalized = activeId
      ? normalizeModelName(activeProvider || "", activeId, this.currentModel?.name)
      : "Padrão (@default)";

    return html`
      <div
        class="h-full flex flex-col overflow-y-auto font-sans select-text p-4 md:p-8 space-y-6 max-w-6xl mx-auto"
        @click=${() => { if (this.activeRoleMenuModelKey) this.activeRoleMenuModelKey = null; }}
      >
        <!-- Top Navigation & Header -->
        <div class="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-black/10 dark:border-white/10">
          <div class="flex items-center gap-3.5">
            <button
              type="button"
              class="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-sm font-semibold text-foreground-800 transition-colors cursor-pointer border border-black/10 dark:border-white/10 shadow-xs"
              @click=${() => this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }))}
            >
              ${renderArrowLeftIcon("size-4")}
              <span>Voltar ao Chat</span>
            </button>
            <div class="flex flex-col">
              <h1 class="text-xl md:text-2xl font-black text-foreground-900 tracking-tight flex items-center gap-2">
                <span>Catálogo de Modelos de IA</span>
                <span class="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold">
                  ${this.models.length} modelos
                </span>
              </h1>
              <p class="text-xs text-foreground-500 mt-0.5">
                Selecione o modelo ativo ou associe modelos específicos a cada papel da TUI (@default, @smol, @slow, @tiny, etc.)
              </p>
            </div>
          </div>

          ${this.feedbackMessage
        ? html`
                <div class="px-3.5 py-1.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold animate-fade-in shadow-xs flex items-center gap-1.5">
                  <span class="size-1.5 rounded-full bg-emerald-500"></span>
                  ${this.feedbackMessage}
                </div>
              `
        : nothing}
        </div>

        <!-- TUI Roles & Current Active Model Banner (Acrylic Squircles) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <!-- 1. Default Role -->
          <div
            class="p-5 rounded-3xl omp-settings-card flex flex-col justify-between gap-3 shadow-xs"
            style="clip-path: var(--clip-path-squircle-28, none);"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                ${renderSparklesIcon("size-3.5")}
                Modelo Ativo
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold border border-emerald-500/20">
                @default
              </span>
            </div>
            <div class="flex items-center gap-3">
              <div class="size-10 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 border border-black/5 dark:border-white/10 shadow-xs">
                ${renderModelProviderIcon(activeProvider, "size-5 text-foreground-800")}
              </div>
              <div class="flex flex-col min-w-0">
                <span class="text-base font-bold text-foreground-900 truncate" title="${activeNormalized}">
                  ${activeNormalized}
                </span>
                <span class="text-xs text-foreground-500 font-mono truncate">
                  ${activeProvider ? `${activeProvider}/${activeId}` : "automático"}
                </span>
              </div>
            </div>
          </div>

          <!-- 2. Fast / Smol Role -->
          <div
            class="p-5 rounded-3xl omp-settings-card flex flex-col justify-between gap-3 shadow-xs"
            style="clip-path: var(--clip-path-squircle-28, none);"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                ${renderBoltIcon("size-3.5")}
                Fast / Smol
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold border border-amber-500/20">
                @smol
              </span>
            </div>
            <p class="text-xs text-foreground-600 leading-relaxed">
              Execução com baixa latência e custo reduzido para tarefas leves, commits e reparo automático de sintaxe.
            </p>
          </div>

          <!-- 3. Thinking / Slow Role + Reasoning Level -->
          <div
            class="p-5 rounded-3xl omp-settings-card flex flex-col justify-between gap-3 shadow-xs sm:col-span-2 lg:col-span-1"
            style="clip-path: var(--clip-path-squircle-28, none);"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                ${renderBrainIcon("size-3.5")}
                Thinking / Slow
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-bold border border-blue-500/20">
                @slow
              </span>
            </div>
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <span class="text-xs font-semibold text-foreground-700">Nível de Raciocínio:</span>
              <div class="flex items-center gap-1 p-0.5 rounded-xl bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/10">
                ${["off", "low", "medium", "high"].map(
          (lvl) => html`
                    <button
                      type="button"
                      class="px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${this.thinkingLevel === lvl
              ? "bg-[var(--omp-primary)] text-white shadow-xs"
              : "text-foreground-600 hover:text-foreground-900"
            }"
                      @click=${() => this.handleSetThinking(lvl)}
                    >
                      ${lvl.toUpperCase()}
                    </button>
                  `,
        )}
              </div>
            </div>
          </div>
        </div>

        <!-- TUI Roles Quick Strip -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-foreground-700 uppercase tracking-wider">Papéis Disponíveis na TUI:</span>
          </div>
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            ${TUI_ROLES.map(
          (role) => html`
                <div
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl omp-settings-card shrink-0 text-xs shadow-xs"
                  style="clip-path: var(--clip-path-squircle-20, none);"
                >
                  <span class="font-bold ${role.color}">${role.tag}</span>
                  <span class="text-foreground-600 font-medium">${role.name}</span>
                </div>
              `,
        )}
          </div>
        </div>

        <!-- Search Bar and Category Filters -->
        <div class="flex flex-col gap-3">
          <div class="relative w-full">
            <input
              type="text"
              class="w-full px-4 py-3 pl-11 rounded-2xl omp-settings-card text-sm text-foreground-900 placeholder:text-foreground-400 outline-none focus:outline-none focus:border-black/20 dark:focus:border-white/20 transition-all shadow-xs"
              placeholder="Pesquisar por modelo ou provedor (ex: claude, gpt-4o, gemini, deepseek, ollama)..."
              .value=${this.searchQuery}
              @input=${(e: Event) => {
        this.searchQuery = (e.target as HTMLInputElement).value;
      }}
            />
            <div class="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-400 pointer-events-none">
              <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
          </div>

          <!-- Provider Filter Chips -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            ${categories.map(
        (cat) => html`
                <button
                  type="button"
                  class="px-3.5 py-1.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border shadow-xs ${this.selectedCategory === cat.id
            ? "bg-[var(--omp-primary)] text-white border-transparent font-bold shadow-xs"
            : "omp-settings-card text-foreground-700 hover:text-foreground-900"
          }"
                  @click=${() => {
            this.selectedCategory = cat.id;
          }}
                >
                  ${cat.label}
                </button>
              `,
      )}
          </div>
        </div>

        <!-- Models Grid (Acrylic Squircles with Provider Logos & Role Assignment) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
          ${filtered.length === 0
        ? html`
                <div class="col-span-full py-16 text-center text-foreground-400 text-sm">
                  Nenhum modelo encontrado correspondente ao filtro "${this.searchQuery}".
                </div>
              `
        : filtered.map((m) => {
          const provider = m.provider || "";
          const id = m.id || "";
          const key = `${provider}/${id}`;
          const normalized = normalizeModelName(provider, id, m.name);
          const isSelected = provider === activeProvider && id === activeId;
          const isRoleMenuOpen = this.activeRoleMenuModelKey === key;
          const contextStr = m.contextWindow
            ? `${Math.round(m.contextWindow / 1000)}k contexto`
            : undefined;
          const hasReasoning = Boolean(m.reasoning);

          return html`
                  <div
                    class="p-5 rounded-3xl omp-settings-card flex flex-col justify-between gap-4 transition-all duration-200 hover:scale-[1.01] shadow-xs relative ${isSelected ? "ring-2 ring-blue-500/60" : ""
            }"
                    style="clip-path: var(--clip-path-squircle-28, none);"
                  >
                    <!-- Header with Provider Icon, Normalized Title and Badges -->
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex items-start gap-3.5 min-w-0">
                        <div class="size-11 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 border border-black/5 dark:border-white/10 shadow-xs mt-0.5">
                          ${renderModelProviderIcon(provider, "size-6 text-foreground-900")}
                        </div>
                        <div class="flex flex-col min-w-0">
                          <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-base font-bold text-foreground-900 leading-tight">
                              ${normalized}
                            </span>
                            ${isSelected
              ? html`
                                  <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <span class="size-1.5 rounded-full bg-emerald-500"></span>
                                    Ativo
                                  </span>
                                `
              : nothing}
                          </div>
                          <span class="text-xs text-foreground-500 font-mono truncate mt-1" title="${provider}/${id}">
                            ${provider}/${id}
                          </span>
                        </div>
                      </div>

                      <!-- Context Window & Thinking Badges -->
                      <div class="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        ${contextStr
              ? html`
                              <span class="text-[10px] px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/10 text-foreground-600 font-mono border border-black/5 dark:border-white/10">
                                ${contextStr}
                              </span>
                            `
              : nothing}
                        ${hasReasoning
              ? html`
                              <span class="text-[10px] px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/20" title="Suporta raciocínio profundo">
                                🧠 Think
                              </span>
                            `
              : nothing}
                      </div>
                    </div>

                    <!-- Action Buttons: Usar na Sessão, Definir Padrão, Atribuir a Papel -->
                    <div class="flex items-center justify-between gap-2 pt-3 border-t border-black/5 dark:border-white/5 relative">
                      <!-- Dropdown to assign this model to ANY TUI role -->
                      <div class="relative">
                        <button
                          type="button"
                          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-foreground-700 transition-colors cursor-pointer border border-black/5 dark:border-white/10"
                          @click=${(e: Event) => {
              e.stopPropagation();
              this.activeRoleMenuModelKey = isRoleMenuOpen ? null : key;
            }}
                        >
                          <span>Papéis TUI</span>
                          ${renderChevronDownIcon("size-3")}
                        </button>

                        ${isRoleMenuOpen
              ? html`
                              <div
                                class="absolute left-0 bottom-full mb-2 z-50 min-w-[200px] max-h-[280px] overflow-y-auto p-1.5 rounded-2xl shadow-2xl flex flex-col gap-0.5 text-xs font-sans pointer-events-auto select-none"
                                style="background: var(--omp-surface-popover, #1e2330); color: var(--omp-text-primary, #fff); border: 1px solid var(--omp-popover-border, rgba(255, 255, 255, 0.15)); backdrop-filter: blur(24px) saturate(180%); -webkit-backdrop-filter: blur(24px) saturate(180%); box-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.5);"
                                @click=${(e: Event) => e.stopPropagation()}
                              >
                                <span class="px-2.5 py-1 text-[10px] font-bold text-foreground-400 uppercase tracking-wider">
                                  Atribuir a papel:
                                </span>
                                ${TUI_ROLES.map(
                (r) => html`
                                    <button
                                      type="button"
                                      class="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-left transition-colors cursor-pointer"
                                      @click=${() => this.handleSelectModel(m, true, r.id)}
                                    >
                                      <span class="font-bold ${r.color}">${r.tag}</span>
                                      <span class="text-foreground-500 text-[11px]">${r.name}</span>
                                    </button>
                                  `,
              )}
                              </div>
                            `
              : nothing}
                      </div>

                      <div class="flex items-center gap-2">
                        <button
                          type="button"
                          class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${isSelected
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 cursor-default font-bold"
              : "bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-foreground-800 border border-black/5 dark:border-white/10"
            }"
                          @click=${() => this.handleSelectModel(m, false, "default")}
                        >
                          ${isSelected ? "✓ Ativo" : "Usar na Sessão"}
                        </button>
                        <button
                          type="button"
                          class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all cursor-pointer shadow-xs font-bold"
                          @click=${() => this.handleSelectModel(m, true, "default")}
                          title="Definir como modelo padrão global (@default)"
                        >
                          Definir Padrão
                        </button>
                      </div>
                    </div>
                  </div>
                `;
        })}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "omp-models-view": OmpModelsView;
  }
}
