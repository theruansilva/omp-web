import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { usageApi, type UsageResponse, type UsageReport, type UsageLimit } from "../api/clients";
import {
  renderUsageIcon,
  renderRefreshIcon,
  renderModelProviderIcon,
} from "./icons";

@customElement("omp-usage-view")
export class OmpUsageView extends LitElement {
  @property({ type: String }) machineId = "local";
  @property({ type: Boolean }) isSidebarOpen = true;

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
      <div class="size-full overflow-y-auto font-sans select-none p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto ${!this.isSidebarOpen ? "pt-14 sm:pt-16" : ""}">
        <!-- Top bar with refresh button -->
        <div class="flex items-center justify-between pb-2 border-b border-black/8 dark:border-white/8">
          <div>
            <h1 class="text-xl sm:text-2xl font-bold text-[var(--omp-text-primary)] tracking-tight">Uso & Métricas</h1>
            <p class="text-xs text-[var(--omp-text-muted)] mt-0.5">
              Consumo de tokens, rate limits e renovação de cotas de IA
            </p>
          </div>

          <button
            type="button"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl omp-settings-card text-xs font-semibold text-[var(--omp-text-primary)] hover:opacity-90 transition-all cursor-pointer shadow-xs ${this.loading ? "opacity-60 cursor-not-allowed" : ""
      }"
            ?disabled=${this.loading}
            @click=${() => void this.fetchUsage(true)}
          >
            <span class="${this.loading ? "animate-spin" : ""}">
              ${renderRefreshIcon("size-3.5")}
            </span>
            <span>${this.loading ? "Atualizando…" : "Atualizar"}</span>
          </button>
        </div>

        <!-- Top KPI Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div class="p-4 rounded-3xl omp-settings-card flex flex-col shadow-xs" style="clip-path: var(--clip-path-squircle-28, none);">
            <span class="text-xs font-medium text-[var(--omp-text-muted)]">Provedores</span>
            <span class="text-2xl font-extrabold text-[var(--omp-text-primary)] mt-1">${reports.length}</span>
            <span class="text-[11px] text-[var(--omp-text-muted)] mt-0.5 opacity-80">Conectados</span>
          </div>

          <div class="p-4 rounded-3xl omp-settings-card flex flex-col shadow-xs" style="clip-path: var(--clip-path-squircle-28, none);">
            <span class="text-xs font-medium text-[var(--omp-text-muted)]">Cotas</span>
            <span class="text-2xl font-extrabold text-[var(--omp-text-primary)] mt-1">${totalLimits}</span>
            <span class="text-[11px] text-[var(--omp-text-muted)] mt-0.5 opacity-80">Monitoradas</span>
          </div>

          <div class="p-4 rounded-3xl omp-settings-card flex flex-col shadow-xs" style="clip-path: var(--clip-path-squircle-28, none);">
            <span class="text-xs font-medium text-[var(--omp-text-muted)]">Status</span>
            <span class="text-2xl font-extrabold mt-1 ${hasWarnings ? "text-amber-500" : "text-emerald-500"}">
              ${hasWarnings ? "Atenção" : "Normal"}
            </span>
            <span class="text-[11px] text-[var(--omp-text-muted)] mt-0.5 opacity-80">
              ${hasWarnings ? "Próximo do limite" : "Saudável"}
            </span>
          </div>

          <div class="p-4 rounded-3xl omp-settings-card flex flex-col shadow-xs" style="clip-path: var(--clip-path-squircle-28, none);">
            <span class="text-xs font-medium text-[var(--omp-text-muted)]">Próximo Reset</span>
            <span class="text-2xl font-extrabold text-[var(--omp-text-primary)] font-mono mt-1">
              ${this.formatResetTime(nextReset)}
            </span>
            <span class="text-[11px] text-[var(--omp-text-muted)] mt-0.5 opacity-80">Renovação</span>
          </div>
        </div>

        <!-- Reports List -->
        ${this.error
        ? html`
              <div class="p-6 rounded-3xl border border-red-500/20 bg-red-500/10 text-center text-red-500 text-sm">
                <p class="font-bold">Erro ao obter métricas de uso</p>
                <p class="text-xs opacity-80 mt-1">${this.error}</p>
                <button
                  type="button"
                  class="mt-3 px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-xs font-semibold transition-colors cursor-pointer"
                  @click=${() => void this.fetchUsage(true)}
                >
                  Tentar novamente
                </button>
              </div>
            `
        : reports.length === 0
          ? html`
                <div class="p-12 rounded-3xl omp-settings-card text-center flex flex-col items-center">
                  <div class="size-14 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center mb-3 text-[var(--omp-text-muted)]">
                    ${renderUsageIcon("size-7")}
                  </div>
                  <span class="text-base font-bold text-[var(--omp-text-primary)]">Nenhum dado de uso registrado</span>
                  <p class="text-xs text-[var(--omp-text-muted)] max-w-sm mt-1">
                    Conecte provedores via /login para acompanhar limites e cotas.
                  </p>
                </div>
              `
          : reports.map((report) => this.renderReportCard(report))}
      </div>
    `;
  }

  private renderReportCard(report: UsageReport) {
    const limits = report.limits || [];

    return html`
      <div class="rounded-3xl omp-settings-card p-5 shadow-xs space-y-4" style="clip-path: var(--clip-path-squircle-28, none);">
        <!-- Card Header -->
        <div class="flex items-center justify-between pb-3 border-b border-black/8 dark:border-white/8">
          <div class="flex items-center gap-3">
            <div class="size-9 rounded-2xl bg-black/5 dark:bg-white/8 flex items-center justify-center shrink-0">
              ${renderModelProviderIcon(report.provider, "size-5")}
            </div>
            <div class="flex flex-col">
              <span class="text-sm font-bold text-[var(--omp-text-primary)] capitalize tracking-tight">
                ${report.provider}
              </span>
              ${report.metadata?.email
        ? html`<span class="text-[11px] font-mono text-[var(--omp-text-muted)]">${report.metadata.email}</span>`
        : nothing}
            </div>
          </div>

          ${report.metadata?.planType
        ? html`
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--omp-primary)]/15 text-[var(--omp-primary)] uppercase tracking-wider font-mono">
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
              <div class="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 flex flex-col justify-between space-y-2.5">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs font-bold text-[var(--omp-text-primary)]">${limit.label}</span>
                    ${limit.window?.label
              ? html`<span class="text-[10px] font-mono text-[var(--omp-text-muted)]">(${limit.window.label})</span>`
              : nothing}
                  </div>
                  <span class="text-[11px] font-mono font-bold text-[var(--omp-text-primary)]">
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

                <div class="flex items-center justify-between text-[11px] text-[var(--omp-text-muted)] font-mono">
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
