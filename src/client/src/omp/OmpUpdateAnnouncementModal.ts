import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { renderCloseIcon, renderSparklesIcon, renderCheckIcon } from "./icons";

const SEEN_STORAGE_KEY = "omp:seen-update-notice-v3.0.1";

@customElement("omp-update-announcement-modal")
export class OmpUpdateAnnouncementModal extends LitElement {
  @property({ type: Boolean }) isOpen = false;

  protected override createRenderRoot() {
    return this;
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isOpen) return;
    if (e.key === "Escape") {
      this.handleClose();
    }
  };

  override connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this.handleKeyDown);

    // Auto-open if never dismissed
    try {
      if (typeof localStorage !== "undefined") {
        const seen = localStorage.getItem(SEEN_STORAGE_KEY);
        if (!seen) {
          this.isOpen = true;
        }
      }
    } catch {
      // Fallback
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.handleKeyDown);
  }

  private handleClose() {
    this.isOpen = false;
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(SEEN_STORAGE_KEY, "true");
      }
    } catch {
      // ignore
    }
    this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }));
  }

  override render() {
    if (!this.isOpen) return nothing;

    return html`
      <style>
        .omp-update-backdrop {
          position: fixed;
          inset: 0;
          z-index: 10000;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: ompFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .omp-update-card {
          width: 100%;
          max-width: 580px;
          background: var(--omp-card-bg, var(--bg, #18181b));
          border: 1px solid var(--border-muted, rgba(255, 255, 255, 0.12));
          border-radius: 28px;
          box-shadow: 0 24px 64px -12px rgba(0, 0, 0, 0.45);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: ompSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes ompFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes ompSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      </style>

      <div class="omp-update-backdrop" @click=${() => this.handleClose()}>
        <div
          class="omp-update-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="update-announcement-title"
          @click=${(e: Event) => e.stopPropagation()}
        >
          <!-- Header Banner -->
          <div class="p-6 pb-4 border-b border-black/5 dark:border-white/10 flex items-start justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="size-10 rounded-2xl bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center shrink-0 border border-[var(--primary)]/20 shadow-xs">
                ${renderSparklesIcon("size-5")}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/25">
                    Novidades v3.0
                  </span>
                  <span class="text-xs text-foreground-500 font-mono">Em breve na main</span>
                </div>
                <h2 id="update-announcement-title" class="text-lg font-bold text-foreground-900 tracking-tight mt-1 font-sans">
                  Estamos preparando grandes melhorias!
                </h2>
              </div>
            </div>

            <button
              type="button"
              aria-label="Fechar"
              class="p-1.5 rounded-xl text-foreground-500 hover:text-foreground-900 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              @click=${() => this.handleClose()}
            >
              ${renderCloseIcon("size-4")}
            </button>
          </div>

          <!-- Body / Highlights -->
          <div class="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
            <p class="text-sm text-foreground-700 dark:text-foreground-300 leading-relaxed">
              Uma nova versão do <strong>OMP WEB</strong> está sendo finalizada e entrará no ar em instantes. Confira os destaques do que está mudando:
            </p>

            <div class="space-y-3 pt-1">
              <div class="flex items-start gap-3 p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5">
                <div class="size-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  ${renderCheckIcon("size-3.5")}
                </div>
                <div class="text-xs leading-relaxed">
                  <strong class="text-foreground-900 font-semibold block text-[13px] mb-0.5">Interface Flutuante & Cockpit Acrílico</strong>
                  <span class="text-foreground-600 dark:text-foreground-400">Novo design system com geometria squircle contínua, temas com contraste refinado e transições ultrarrápidas.</span>
                </div>
              </div>

              <div class="flex items-start gap-3 p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5">
                <div class="size-6 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  ${renderCheckIcon("size-3.5")}
                </div>
                <div class="text-xs leading-relaxed">
                  <strong class="text-foreground-900 font-semibold block text-[13px] mb-0.5">Ask Tool Interativa no Composer</strong>
                  <span class="text-foreground-600 dark:text-foreground-400">Decisões, escolhas e perguntas do agente agora integradas de forma nativa e intuitiva diretamente na caixa de prompt.</span>
                </div>
              </div>

              <div class="flex items-start gap-3 p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5">
                <div class="size-6 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                  ${renderCheckIcon("size-3.5")}
                </div>
                <div class="text-xs leading-relaxed">
                  <strong class="text-foreground-900 font-semibold block text-[13px] mb-0.5">Suporte a Subagentes & Ferramentas Paralelas</strong>
                  <span class="text-foreground-600 dark:text-foreground-400">Capacidade de delegar tarefas para subagentes especializados executando com travas de segurança contra deadlocks.</span>
                </div>
              </div>

              <div class="flex items-start gap-3 p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5">
                <div class="size-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  ${renderCheckIcon("size-3.5")}
                </div>
                <div class="text-xs leading-relaxed">
                  <strong class="text-foreground-900 font-semibold block text-[13px] mb-0.5">Estabilidade & Reaper de Processos Órfãos</strong>
                  <span class="text-foreground-600 dark:text-foreground-400">Limpeza automática de processos zumbis, garantindo máxima performance do servidor e menor consumo de recursos.</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="p-4 px-6 border-t border-black/5 dark:border-white/10 flex items-center justify-between bg-black/[0.01] dark:bg-white/[0.02]">
            <span class="text-xs text-foreground-500">
              Versão 3.0.1 pronta para implantação
            </span>
            <button
              type="button"
              class="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--primary)] text-white hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
              @click=${() => this.handleClose()}
            >
              Entendi, continuar
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "omp-update-announcement-modal": OmpUpdateAnnouncementModal;
  }
}
