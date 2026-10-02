import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "./OmpMarkdown";
import {
  renderDocumentIcon,
  renderCheckIcon,
  renderCloseIcon,
  renderCopyIcon,
  renderSparklesIcon,
} from "./icons";

export interface ArtifactData {
  type: "plan" | "code" | "markdown";
  title: string;
  planFilePath?: string;
  planContent: string;
  status?: "proposed" | "approved" | "rejected";
}

@customElement("omp-artifact-panel")
export class OmpArtifactPanel extends LitElement {
  @property({ attribute: false }) artifact?: ArtifactData;
  @property({ type: Boolean }) isSubmitting = false;

  @state() private showFeedbackInput = false;
  @state() private feedbackText = "";
  @state() private copied = false;

  protected override createRenderRoot() {
    return this;
  }

  private copyTimer?: number;

  private handleCopy() {
    if (!this.artifact?.planContent) return;
    void navigator.clipboard?.writeText(this.artifact.planContent);
    window.clearTimeout(this.copyTimer);
    this.copied = true;
    this.copyTimer = window.setTimeout(() => {
      this.copied = false;
      this.requestUpdate();
    }, 2000);
    this.requestUpdate();
  }

  private handleApprove() {
    if (this.isSubmitting) return;
    this.dispatchEvent(
      new CustomEvent("approve", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleReject() {
    if (this.isSubmitting) return;
    const feedback = this.feedbackText.trim() || undefined;
    this.dispatchEvent(
      new CustomEvent<{ feedback?: string }>("reject", {
        detail: { feedback },
        bubbles: true,
        composed: true,
      }),
    );
    this.showFeedbackInput = false;
    this.feedbackText = "";
  }

  private handleClose() {
    this.dispatchEvent(
      new CustomEvent("close", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  override render() {
    if (!this.artifact) return nothing;

    const { title, planFilePath, planContent, status = "proposed" } = this.artifact;

    return html`
      <aside
        class="w-full md:w-[460px] lg:w-[500px] xl:w-[560px] shrink-0 h-full border-s border-black/10 dark:border-white/10 bg-background-100/95 dark:bg-card-dark/95 backdrop-blur-xl flex flex-col z-30 shadow-2xl md:shadow-none animate-slide-left font-sans select-text overflow-hidden"
        role="region"
        aria-label="Painel de Artefato"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-black/10 dark:border-white/10 shrink-0 bg-white/40 dark:bg-black/20">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="size-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              ${renderDocumentIcon("size-4")}
            </div>
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-foreground-900 truncate" title="${title}">
                  ${title || "Plano de Execução"}
                </span>
                <!-- Status Badge -->
                ${status === "proposed"
        ? html`
                      <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                        Em Revisão
                      </span>
                    `
        : status === "approved"
          ? html`
                        <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0 flex items-center gap-1">
                          ${renderCheckIcon("size-3")}
                          Aprovado
                        </span>
                      `
          : html`
                        <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shrink-0">
                          Rejeitado
                        </span>
                      `}
              </div>
              ${planFilePath
        ? html`
                    <span class="text-xs text-foreground-500 font-mono truncate" title="${planFilePath}">
                      ${planFilePath}
                    </span>
                  `
        : nothing}
            </div>
          </div>

          <!-- Top Action Controls -->
          <div class="flex items-center gap-1 shrink-0">
            <button
              type="button"
              aria-label="Copiar conteúdo"
              class="min-w-10 min-h-10 sm:size-8 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-foreground-600 hover:text-foreground-900 flex items-center justify-center transition-colors cursor-pointer"
              title="Copiar conteúdo"
              @click=${() => this.handleCopy()}
            >
              ${this.copied
        ? html`<span class="text-xs text-emerald-500 font-bold">✓</span>`
        : renderCopyIcon("size-4")}
            </button>
            <button
              type="button"
              aria-label="Fechar painel de artefato"
              class="min-w-10 min-h-10 sm:size-8 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-foreground-600 hover:text-foreground-900 flex items-center justify-center transition-colors cursor-pointer"
              title="Fechar painel"
              @click=${() => this.handleClose()}
            >
              ${renderCloseIcon("size-4")}
            </button>
          </div>
        </div>

        <!-- Action Bar (Sticky at top when plan is proposed) -->
        ${status === "proposed"
        ? html`
              <div class="p-3 border-b border-black/10 dark:border-white/10 bg-black/3 dark:bg-white/3 flex flex-col gap-2 shrink-0">
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    ?disabled=${this.isSubmitting}
                    @click=${() => this.handleApprove()}
                  >
                    ${renderCheckIcon("size-3.5")}
                    <span>${this.isSubmitting ? "Aprovando..." : "Aprovar & Iniciar Execução"}</span>
                  </button>

                  <button
                    type="button"
                    class="px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-xs font-semibold text-foreground-800 transition-colors cursor-pointer"
                    @click=${() => {
            this.showFeedbackInput = !this.showFeedbackInput;
          }}
                  >
                    <span>${this.showFeedbackInput ? "Ocultar" : "Solicitar Ajustes"}</span>
                  </button>
                </div>

                ${this.showFeedbackInput
            ? html`
                      <div class="flex flex-col gap-2 pt-1 animate-fade-in">
                        <input
                          type="text"
                          class="w-full px-3 py-2 rounded-xl bg-white dark:bg-card-dark border border-black/15 dark:border-white/15 text-xs text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 shadow-xs"
                          placeholder="Ex: No passo 2, prefiro usar Bun em vez de Node..."
                          .value=${this.feedbackText}
                          @input=${(e: Event) => {
                this.feedbackText = (e.target as HTMLInputElement).value;
              }}
                          @keydown=${(e: KeyboardEvent) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  this.handleReject();
                }
              }}
                        />
                        <div class="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            class="px-2.5 py-1 text-xs text-foreground-500 hover:text-foreground-800 cursor-pointer"
                            @click=${() => {
                this.showFeedbackInput = false;
              }}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            class="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
                            ?disabled=${this.isSubmitting}
                            @click=${() => this.handleReject()}
                          >
                            ${this.isSubmitting ? "Enviando..." : "Enviar Ajustes"}
                          </button>
                        </div>
                      </div>
                    `
            : nothing}
              </div>
            `
        : nothing}

        <!-- Scrollable Plan Content (rendered via OmpMarkdown) -->
        <div class="flex-1 overflow-y-auto p-4 md:p-6 select-text">
          <omp-markdown .text=${planContent}></omp-markdown>
        </div>
      </aside>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "omp-artifact-panel": OmpArtifactPanel;
  }
}
