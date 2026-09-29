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
} from "./icons";

export interface ModelSelectDetail {
  provider: string;
  modelId: string;
  persist?: boolean;
}

@customElement("omp-models-view")
export class OmpModelsView extends LitElement {
  @property({ attribute: false }) models: SessionModel[] = [];
  @property({ attribute: false }) currentModel?: SessionModel;
  @property({ type: String }) thinkingLevel = "medium";
  @property({ type: Boolean }) isWorking = false;

  @state() private searchQuery = "";
  @state() private selectedCategory = "all";
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
    }, 3000);
  }

  private handleSelectModel(model: SessionModel, persist = false) {
    if (!model.provider || !model.id) return;
    this.dispatchEvent(
      new CustomEvent<ModelSelectDetail>("select-model", {
        detail: {
          provider: model.provider,
          modelId: model.id,
          persist,
        },
        bubbles: true,
        composed: true,
      }),
    );
    const normalized = normalizeModelName(model.provider, model.id, model.name);
    this.showFeedback(
      persist
        ? `Modelo ${normalized} definido como padrão global!`
        : `Modelo ${normalized} ativado para esta sessão!`,
    );
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
      return category.includes(this.selectedCategory.toLowerCase());
    });
  }

  private getAvailableCategories(): Array<{ id: string; label: string; icon: string }> {
    const set = new Set<string>();
    for (const m of this.models) {
      const info = classifyModelSource(m.provider || "", m.id || "");
      set.add(info.category);
    }
    const categories = Array.from(set).map((cat) => ({
      id: cat.toLowerCase(),
      label: cat,
      icon: "",
    }));
    return [{ id: "all", label: "Todos", icon: "🌐" }, ...categories];
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
      <div class="h-full flex flex-col bg-background-150 overflow-y-auto font-sans select-text p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
        <!-- Top Navigation & Header -->
        <div class="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-black/10 dark:border-white/10">
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-sm font-semibold text-foreground-800 transition-colors cursor-pointer"
              @click=${() => this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }))}
            >
              ${renderArrowLeftIcon("size-4")}
              <span>Voltar</span>
            </button>
            <div class="flex flex-col">
              <h1 class="text-xl md:text-2xl font-black text-foreground-900 tracking-tight flex items-center gap-2">
                <span>Modelos de IA</span>
                <span class="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                  ${this.models.length} disponíveis
                </span>
              </h1>
              <p class="text-xs text-foreground-500">
                Selecione o modelo do agente para raciocínio, geração de código e uso de ferramentas
              </p>
            </div>
          </div>

          ${this.feedbackMessage
        ? html`
                <div class="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold animate-fade-in">
                  ${this.feedbackMessage}
                </div>
              `
        : nothing}
        </div>

        <!-- TUI Roles & Current Active Model Banner -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <!-- 1. Default Role -->
          <div class="p-4 rounded-2xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 shadow-xs flex flex-col justify-between gap-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                ${renderSparklesIcon("size-3.5")}
                Modelo Ativo
              </span>
              <span class="text-[10px] px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 font-mono text-foreground-600">
                @default
              </span>
            </div>
            <div class="flex items-center gap-2.5 mt-1">
              <div class="size-7 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                ${renderModelProviderIcon(activeProvider, "size-4 text-foreground-800")}
              </div>
              <div class="flex flex-col min-w-0">
                <span class="text-sm font-bold text-foreground-900 truncate" title="${activeNormalized}">
                  ${activeNormalized}
                </span>
                <span class="text-[11px] text-foreground-500 font-mono truncate">
                  ${activeProvider ? `${activeProvider}/${activeId}` : "auto"}
                </span>
              </div>
            </div>
          </div>

          <!-- 2. Fast / Smol Role -->
          <div class="p-4 rounded-2xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 shadow-xs flex flex-col justify-between gap-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                ${renderBoltIcon("size-3.5")}
                Fast / Smol
              </span>
              <span class="text-[10px] px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 font-mono text-foreground-600">
                @smol
              </span>
            </div>
            <p class="text-xs text-foreground-600 mt-1 leading-relaxed">
              Execução ultrarrápida para tarefas leves, commits e reparo de sintaxe.
            </p>
          </div>

          <!-- 3. Thinking / Slow Role -->
          <div class="p-4 rounded-2xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 shadow-xs flex flex-col justify-between gap-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                ${renderBrainIcon("size-3.5")}
                Thinking / Slow
              </span>
              <span class="text-[10px] px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 font-mono text-foreground-600">
                @slow
              </span>
            </div>
            <div class="flex items-center gap-1.5 mt-1">
              <span class="text-xs text-foreground-600">Raciocínio:</span>
              <div class="flex items-center gap-1">
                ${["off", "low", "medium", "high"].map(
          (lvl) => html`
                    <button
                      type="button"
                      class="px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${this.thinkingLevel === lvl
              ? "bg-blue-600 text-white font-bold"
              : "bg-black/5 dark:bg-white/10 text-foreground-600 hover:text-foreground-900"
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

        <!-- Search and Filter Bar -->
        <div class="flex flex-col gap-3">
          <div class="relative w-full">
            <input
              type="text"
              class="w-full px-4 py-2.5 pl-10 rounded-2xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 text-sm text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-xs transition-all"
              placeholder="Pesquisar por modelo ou provedor (ex: claude, gpt-4o, gemini, deepseek, ollama)..."
              .value=${this.searchQuery}
              @input=${(e: Event) => {
        this.searchQuery = (e.target as HTMLInputElement).value;
      }}
            />
            <div class="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-400 pointer-events-none">
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
                  class="px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${this.selectedCategory === cat.id
            ? "bg-foreground-900 text-background-100 dark:bg-foreground-100 dark:text-background-900 shadow-xs font-bold"
            : "bg-black/5 dark:bg-white/10 text-foreground-700 hover:bg-black/10 dark:hover:bg-white/15"
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

        <!-- Models Cards List -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          ${filtered.length === 0
        ? html`
                <div class="col-span-full py-12 text-center text-foreground-400 text-sm">
                  Nenhum modelo encontrado correspondente a "${this.searchQuery}".
                </div>
              `
        : filtered.map((m) => {
          const provider = m.provider || "";
          const id = m.id || "";
          const normalized = normalizeModelName(provider, id, m.name);
          const isSelected = provider === activeProvider && id === activeId;
          const contextStr = m.contextWindow
            ? `${Math.round(m.contextWindow / 1000)}k tokens`
            : undefined;
          const hasReasoning = Boolean(m.reasoning);

          return html`
                  <div
                    class="p-4 rounded-2xl bg-white dark:bg-card-dark border transition-all duration-150 flex flex-col justify-between gap-3 shadow-xs ${isSelected
              ? "border-blue-500/60 dark:border-blue-400/60 ring-2 ring-blue-500/10"
              : "border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20"
            }"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex items-start gap-3 min-w-0">
                        <div class="size-9 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                          ${renderModelProviderIcon(provider, "size-5 text-foreground-800")}
                        </div>
                        <div class="flex flex-col min-w-0">
                          <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="text-sm font-bold text-foreground-900 leading-tight">
                              ${normalized}
                            </span>
                            ${isSelected
              ? html`
                                  <span class="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <span class="size-1 rounded-full bg-emerald-500"></span>
                                    Ativo
                                  </span>
                                `
              : nothing}
                          </div>
                          <span class="text-xs text-foreground-400 font-mono truncate mt-0.5" title="${provider}/${id}">
                            ${provider}/${id}
                          </span>
                        </div>
                      </div>

                      <!-- Badges (Context, Reasoning) -->
                      <div class="flex items-center gap-1 shrink-0">
                        ${contextStr
              ? html`
                              <span class="text-[10px] px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-foreground-600 font-mono">
                                ${contextStr}
                              </span>
                            `
              : nothing}
                        ${hasReasoning
              ? html`
                              <span class="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold" title="Suporta raciocínio profundo">
                                🧠 Think
                              </span>
                            `
              : nothing}
                      </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex items-center justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/5">
                      <button
                        type="button"
                        class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${isSelected
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 cursor-default"
              : "bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-foreground-800"
            }"
                        @click=${() => this.handleSelectModel(m, false)}
                      >
                        ${isSelected ? "✓ Selecionado" : "Usar nesta sessão"}
                      </button>
                      <button
                        type="button"
                        class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-xs"
                        @click=${() => this.handleSelectModel(m, true)}
                        title="Definir como modelo padrão global para todas as conversas"
                      >
                        Definir Padrão
                      </button>
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
