import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { usageApi, type UsageResponse, type UsageReport, type UsageLimit } from "../api/clients";
import {
  renderUsageIcon,
  renderCloseIcon,
  renderRefreshIcon,
  renderModelProviderIcon,
  renderCheckIcon,
  renderServerIcon,
} from "./icons";

@customElement("omp-usage-view")
export class OmpUsageView extends LitElement {
  @property({ type: String }) machineId = "local";

  @state() private data?: UsageResponse;
  @state() private loading = false;
  @state() private error?: string;

  protected override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    void this.fetchUsage(false);
  }

  private async fetchUsage(refresh = false) {
    this.loading = true;
    this.error = undefined;
    try {
      const res = await usageApi.getUsage({ refresh }, this.machineId);
      this.data = res;
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.loading = false;
    }
  }

  private handleClose() {
    this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }));
  }

  private formatResetTime(timestamp?: number): string {
    if (!timestamp) return "—";
    const diff = timestamp - Date.now();
    if (diff <= 0) return "Agora";
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hours < 24) return `${hours}h ${remMins}m`;
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h`;
  }

  private getProgressColor(usedFraction?: number): string {
    const fraction = usedFraction ?? 0;
    if (fraction > 0.85) return "bg-rose-500";
    if (fraction > 0.65) return "bg-amber-500";
    return "bg-emerald-500";
  }

  override render() {
    const reports = this.data?.reports || [];
    const totalLimits = reports.reduce((acc, r) => acc + (r.limits?.length || 0), 0);
    const hasWarnings = reports.some((r) =>
      r.limits?.some((l) => l.status === "warning" || l.status === "exhausted" || (l.amount?.usedFraction || 0) > 0.85),
    );

    let nextReset: number | undefined;
    for (const r of reports) {
      for (const l of r.limits || []) {
        if (l.window?.resetsAt && l.window.resetsAt > Date.now()) {
          if (!nextReset || l.window.resetsAt < nextReset) {
            nextReset = l.window.resetsAt;
          }
        }
      }
    }

    return html`
      <div class="size-full flex flex-col overflow-hidden bg-background-light dark:bg-background-dark font-sans select-none">
        <!-- Header -->
        <header class="h-14 px-4 sm:px-6 border-b border-black/8 dark:border-white/8 flex items-center justify-between shrink-0 bg-white/40 dark:bg-background-100/40 backdrop-blur-xl">
          <div class="flex items-center gap-3 min-w-0">
            <div class="size-9 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 text-foreground-800">
              ${renderUsageIcon("size-4.5")}
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-sm font-bold text-foreground-900 tracking-tight leading-tight">Uso & Métricas</span>
              <span class="text-[11px] text-foreground-500 truncate leading-tight mt-0.5">
                Monitoramento de cotas de IA, rate limits e consumo de tokens
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              type="button"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-xs font-semibold text-foreground-700 transition-colors cursor-pointer ${this.loading ? "opacity-60 cursor-not-allowed" : ""
      }"
              ?disabled=${this.loading}
              @click=${() => void this.fetchUsage(true)}
              title="Atualizar métricas agora"
            >
              <span class="${this.loading ? "animate-spin" : ""}">
                ${renderRefreshIcon("size-3.5")}
              </span>
              <span>${this.loading ? "Atualizando…" : "Atualizar"}</span>
            </button>
            <button
              type="button"
              class="size-8 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center text-foreground-600 hover:text-foreground-900 dark:hover:text-white transition-colors cursor-pointer"
              @click=${() => this.handleClose()}
              title="Voltar para o chat"
            >
              ${renderCloseIcon("size-4")}
            </button>
          </div>
        </header>

        <!-- Content Body -->
        <div class="flex-1 w-full min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
          <!-- Top KPI Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div class="p-4 rounded-2xl bg-white/60 dark:bg-background-150/40 border border-black/8 dark:border-white/8 shadow-xs flex flex-col">
              <span class="text-xs font-medium text-foreground-450">Provedores Conectados</span>
              <span class="text-2xl font-extrabold text-foreground-900 font-sans mt-1">${reports.length}</span>
              <span class="text-[11px] text-foreground-400 mt-0.5">Monitoramento ativo</span>
            </div>

            <div class="p-4 rounded-2xl bg-white/60 dark:bg-background-150/40 border border-black/8 dark:border-white/8 shadow-xs flex flex-col">
              <span class="text-xs font-medium text-foreground-450">Cotas Rastreadas</span>
              <span class="text-2xl font-extrabold text-foreground-900 font-sans mt-1">${totalLimits}</span>
              <span class="text-[11px] text-foreground-400 mt-0.5">Janelas de limite</span>
            </div>

            <div class="p-4 rounded-2xl bg-white/60 dark:bg-background-150/40 border border-black/8 dark:border-white/8 shadow-xs flex flex-col">
              <span class="text-xs font-medium text-foreground-450">Status Geral</span>
              <span class="text-2xl font-extrabold font-sans mt-1 ${hasWarnings ? "text-amber-500" : "text-emerald-500"}">
                ${hasWarnings ? "Atenção" : "Normal"}
              </span>
              <span class="text-[11px] text-foreground-400 mt-0.5">
                ${hasWarnings ? "Cotas próximas do limite" : "Todas as cotas saudáveis"}
              </span>
            </div>

            <div class="p-4 rounded-2xl bg-white/60 dark:bg-background-150/40 border border-black/8 dark:border-white/8 shadow-xs flex flex-col">
              <span class="text-xs font-medium text-foreground-450">Próximo Reset</span>
              <span class="text-2xl font-extrabold text-foreground-900 font-mono mt-1">
                ${this.formatResetTime(nextReset)}
              </span>
              <span class="text-[11px] text-foreground-400 mt-0.5">Renovação de quota</span>
            </div>
          </div>

          <!-- Reports List -->
          ${this.error
        ? html`
                <div class="p-6 rounded-2xl border border-red-500/20 bg-red-500/5 text-center text-red-500 text-sm">
                  <p class="font-semibold">Erro ao obter métricas de uso</p>
                  <p class="text-xs opacity-80 mt-1">${this.error}</p>
                  <button
                    type="button"
                    class="mt-3 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold transition-colors cursor-pointer"
                    @click=${() => void this.fetchUsage(true)}
                  >
                    Tentar novamente
                  </button>
                </div>
              `
        : reports.length === 0
          ? html`
                  <div class="p-12 rounded-3xl border border-black/8 dark:border-white/8 bg-white/40 dark:bg-background-150/20 text-center flex flex-col items-center">
                    <div class="size-12 rounded-2xl bg-black/5 dark:bg-white/8 flex items-center justify-center mb-3 text-foreground-450">
                      ${renderUsageIcon("size-6")}
                    </div>
                    <span class="text-base font-bold text-foreground-800">Nenhum dado de uso registrado</span>
                    <p class="text-xs text-foreground-500 max-w-sm mt-1">
                      Conecte provedores via /login ou utilize o modelo para gerar métricas de consumo e limites.
                    </p>
                  </div>
                `
          : reports.map((report) => this.renderReportCard(report))}
        </div>
      </div>
    `;
  }

  private renderReportCard(report: UsageReport) {
    const limits = report.limits || [];

    return html`
      <div class="rounded-3xl border border-black/8 dark:border-white/8 bg-white/70 dark:bg-background-100/60 p-5 shadow-xs space-y-4">
        <!-- Card Header -->
        <div class="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
          <div class="flex items-center gap-3">
            <div class="size-8 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
              ${renderModelProviderIcon(report.provider, "size-4.5")}
            </div>
            <div class="flex flex-col">
              <span class="text-sm font-bold text-foreground-900 capitalize tracking-tight">
                ${report.provider}
              </span>
              ${report.metadata?.email
        ? html`<span class="text-[11px] font-mono text-foreground-500">${report.metadata.email}</span>`
        : nothing}
            </div>
          </div>

          ${report.metadata?.planType
        ? html`
                <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase tracking-wider font-mono">
                  ${report.metadata.planType}
                </span>
              `
        : nothing}
        </div>

        <!-- Limits Bars -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          ${limits.map((limit) => {
          const usedFraction = limit.amount?.usedFraction ?? 0;
          const remaining = limit.amount?.remaining ?? Math.round((1 - usedFraction) * 100);
          const usedPct = Math.round(usedFraction * 100);
          const resetsIn = this.formatResetTime(limit.window?.resetsAt);

          return html`
              <div class="p-3.5 rounded-2xl bg-black/3 dark:bg-white/4 border border-black/5 dark:border-white/5 flex flex-col justify-between space-y-2.5">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs font-bold text-foreground-800">${limit.label}</span>
                    ${limit.window?.label
              ? html`<span class="text-[10px] font-mono text-foreground-450">(${limit.window.label})</span>`
              : nothing}
                  </div>
                  <span class="text-[11px] font-mono font-semibold text-foreground-700">
                    ${remaining}% livre
                  </span>
                </div>

                <!-- Progress Bar -->
                <div class="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-300 ${this.getProgressColor(usedFraction)}"
                    style="width: ${Math.min(100, Math.max(0, usedPct))}%;"
                  ></div>
                </div>

                <div class="flex items-center justify-between text-[11px] text-foreground-450 font-mono">
                  <span>${usedPct}% consumido</span>
                  <span>Reset em: ${resetsIn}</span>
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
    "omp-usage-view": OmpUsageView;
  }
}
