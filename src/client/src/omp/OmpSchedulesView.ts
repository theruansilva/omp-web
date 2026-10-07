import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  schedulePromptsApi,
  type CronJob,
  type CronJobStatus,
  type CronJobTarget,
  type CronJobType,
} from "../api/clients";
import type { Workspace } from "../api";
import {
  renderRefreshIcon,
  renderScheduleIcon,
  renderPlusIcon,
  renderTerminalIcon,
} from "./icons";

const HUMANIZED_CRON_TABLE: Record<string, string> = {
  "* * * * * *": "a cada segundo",
  "0 * * * * *": "a cada minuto",
  "0 0 * * * *": "a cada hora",
  "0 0 0 * * *": "diariamente à meia-noite",
  "0 0 9 * * *": "diariamente às 09:00",
  "0 0 12 * * *": "diariamente ao meio-dia",
  "0 0 18 * * *": "diariamente às 18:00",
  "0 0 0 * * 1": "toda segunda-feira à meia-noite",
  "0 0 0 1 * *": "no primeiro dia de cada mês",
  "* * * * *": "a cada minuto",
  "*/5 * * * *": "a cada 5 minutos",
  "*/15 * * * *": "a cada 15 minutos",
  "*/30 * * * *": "a cada 30 minutos",
  "0 * * * *": "a cada hora",
  "0 */2 * * *": "a cada 2 horas",
  "0 0 * * *": "diariamente à meia-noite",
  "0 9 * * *": "diariamente às 09:00",
  "0 12 * * *": "diariamente ao meio-dia",
  "0 18 * * *": "diariamente às 18:00",
  "0 0 * * 1": "toda segunda-feira à meia-noite",
  "0 0 1 * *": "no primeiro dia de cada mês",
};

function humanizeSchedule(job: CronJob): string {
  if (job.type === "interval") return `a cada ${job.schedule}`;
  if (job.type === "once") {
    const d = new Date(job.schedule);
    return Number.isNaN(d.getTime()) ? job.schedule : d.toLocaleString("pt-BR");
  }
  const clean = job.schedule.trim();
  return HUMANIZED_CRON_TABLE[clean] ?? clean;
}

function formatDate(isoString?: string): string {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

@customElement("omp-schedules-view")
export class OmpSchedulesView extends LitElement {
  @property({ attribute: false }) workspace?: Workspace;
  @property({ type: String }) machineId = "local";
  @property({ type: Boolean }) isSidebarOpen = true;

  @state() private jobs: CronJob[] = [];
  @state() private loading = false;
  @state() private error?: string;
  @state() private actionInProgress: string | null = null;
  @state() private isCreateModalOpen = false;

  // Form state
  @state() private formName = "";
  @state() private formSchedule = "0 9 * * *";
  @state() private formType: CronJobType = "cron";
  @state() private formTarget: CronJobTarget = "prompt";
  @state() private formContent = "";
  @state() private formDescription = "";
  @state() private formError?: string;

  protected override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    void this.fetchJobs();
  }

  override willUpdate(changedProps: Map<string, unknown>) {
    if (changedProps.has("workspace") || changedProps.has("machineId")) {
      void this.fetchJobs();
    }
  }

  private async fetchJobs() {
    const cwd = this.workspace?.path;
    if (!cwd) return;

    this.loading = true;
    this.error = undefined;
    try {
      const res = await schedulePromptsApi.getJobs(cwd, this.machineId);
      if (res && Array.isArray(res.jobs)) {
        this.jobs = res.jobs;
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.loading = false;
    }
  }

  private async handleToggle(job: CronJob) {
    const cwd = this.workspace?.path;
    if (!cwd) return;

    this.actionInProgress = job.id;
    try {
      await schedulePromptsApi.updateJob(
        job.id,
        { cwd, updates: { enabled: !job.enabled } },
        this.machineId
      );
      await this.fetchJobs();
    } catch (err) {
      console.error("Falha ao alternar tarefa:", err);
    } finally {
      this.actionInProgress = null;
    }
  }

  private async handleRun(job: CronJob) {
    const cwd = this.workspace?.path;
    if (!cwd) return;

    this.actionInProgress = job.id;
    try {
      await schedulePromptsApi.runJob(job.id, cwd, this.machineId);
      await this.fetchJobs();
    } catch (err) {
      console.error("Falha ao executar tarefa:", err);
    } finally {
      this.actionInProgress = null;
    }
  }

  private async handleDelete(job: CronJob) {
    const cwd = this.workspace?.path;
    if (!cwd) return;

    if (!confirm(`Deseja excluir o agendamento "${job.name}"?`)) return;

    this.actionInProgress = job.id;
    try {
      await schedulePromptsApi.deleteJob(job.id, cwd, this.machineId);
      await this.fetchJobs();
    } catch (err) {
      console.error("Falha ao remover tarefa:", err);
    } finally {
      this.actionInProgress = null;
    }
  }

  private handleOpenCreate() {
    this.formName = "";
    this.formSchedule = "0 9 * * *";
    this.formType = "cron";
    this.formTarget = "prompt";
    this.formContent = "";
    this.formDescription = "";
    this.formError = undefined;
    this.isCreateModalOpen = true;
  }

  private async handleCreateSubmit(e: Event) {
    e.preventDefault();
    const cwd = this.workspace?.path;
    if (!cwd) {
      this.formError = "Nenhum workspace selecionado";
      return;
    }

    if (!this.formName.trim()) {
      this.formError = "Nome é obrigatório";
      return;
    }
    if (!this.formSchedule.trim()) {
      this.formError = "Agendamento é obrigatório";
      return;
    }
    if (!this.formContent.trim()) {
      this.formError = this.formTarget === "command" ? "Comando é obrigatório" : "Prompt é obrigatório";
      return;
    }

    this.actionInProgress = "create";
    this.formError = undefined;

    try {
      await schedulePromptsApi.createJob(
        {
          cwd,
          name: this.formName.trim(),
          schedule: this.formSchedule.trim(),
          type: this.formType,
          target: this.formTarget,
          description: this.formDescription.trim() || undefined,
          ...(this.formTarget === "command"
            ? { command: this.formContent.trim() }
            : { prompt: this.formContent.trim() }),
        },
        this.machineId
      );
      this.isCreateModalOpen = false;
      await this.fetchJobs();
    } catch (err) {
      this.formError = err instanceof Error ? err.message : String(err);
    } finally {
      this.actionInProgress = null;
    }
  }

  private renderStatusBadge(status?: CronJobStatus, enabled = true) {
    if (!enabled) {
      return html`
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-black/5 dark:bg-white/5 text-[var(--omp-text-muted)] border border-black/10 dark:border-white/10">
          <span class="size-1.5 rounded-full bg-slate-400"></span>
          Pausado
        </span>
      `;
    }

    switch (status) {
      case "running":
        return html`
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <span class="size-1.5 rounded-full bg-sky-500 animate-ping"></span>
            Executando
          </span>
        `;
      case "error":
        return html`
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <span class="size-1.5 rounded-full bg-rose-500"></span>
            Erro
          </span>
        `;
      case "success":
        return html`
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span class="size-1.5 rounded-full bg-emerald-500"></span>
            Sucesso
          </span>
        `;
      default:
        return html`
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span class="size-1.5 rounded-full bg-emerald-500"></span>
            Ativo
          </span>
        `;
    }
  }

  override render() {
    const cwd = this.workspace?.path;
    const totalJobs = this.jobs.length;
    const activeJobs = this.jobs.filter((j) => j.enabled).length;
    const totalRuns = this.jobs.reduce((acc, j) => acc + (j.runCount || 0), 0);

    let nextRunTime: string | undefined;
    const sortedNext = [...this.jobs]
      .filter((j) => j.enabled && j.nextRun)
      .sort((a, b) => new Date(a.nextRun!).getTime() - new Date(b.nextRun!).getTime());
    if (sortedNext.length > 0 && sortedNext[0]?.nextRun) {
      nextRunTime = formatDate(sortedNext[0].nextRun);
    }

    return html`
      <div class="size-full overflow-y-auto font-sans select-none p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto ${!this.isSidebarOpen ? "pt-14 sm:pt-16" : ""}">
        <!-- Top bar with actions -->
        <div class="flex items-center justify-between pb-2 border-b border-black/8 dark:border-white/8">
          <div>
            <h1 class="text-xl sm:text-2xl font-bold text-[var(--omp-text-primary)] tracking-tight">Agendamentos de Tarefas</h1>
            <p class="text-xs text-[var(--omp-text-muted)] mt-0.5">
              ${cwd ? `Workspace: ${cwd}` : "Selecione um projeto para gerenciar tarefas agendadas"}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl omp-settings-card text-xs font-semibold text-[var(--omp-text-primary)] hover:opacity-90 transition-all cursor-pointer shadow-xs ${this.loading ? "opacity-60 cursor-not-allowed" : ""}"
              ?disabled=${this.loading || !cwd}
              @click=${() => void this.fetchJobs()}
            >
              <span class="${this.loading ? "animate-spin" : ""}">
                ${renderRefreshIcon("size-3.5")}
              </span>
              <span>${this.loading ? "Atualizando…" : "Atualizar"}</span>
            </button>

            <button
              type="button"
              class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-90 transition-all cursor-pointer shadow-xs ${!cwd ? "opacity-50 cursor-not-allowed" : ""}"
              ?disabled=${!cwd}
              @click=${() => this.handleOpenCreate()}
            >
              ${renderPlusIcon("size-3.5")}
              <span>Nova Tarefa</span>
            </button>
          </div>
        </div>

        ${!cwd
        ? html`
              <div class="p-8 rounded-3xl omp-settings-card text-center space-y-3" style="clip-path: var(--clip-path-squircle-28, none);">
                <div class="size-12 mx-auto rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  ${renderScheduleIcon("size-6")}
                </div>
                <h3 class="text-base font-bold text-[var(--omp-text-primary)]">Nenhum workspace ativo</h3>
                <p class="text-xs text-[var(--omp-text-muted)] max-w-sm mx-auto">
                  Abra um projeto na barra lateral para carregar os agendamentos salvos em <code>.omp-web/schedule-prompts.json</code>.
                </p>
              </div>
            `
        : html`
              <!-- KPI Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div class="p-4 rounded-3xl omp-settings-card border-l-2 border-l-cyan-500/60 dark:border-l-cyan-400/60 flex flex-col shadow-xs" style="clip-path: var(--clip-path-squircle-28, none);">
                  <span class="text-xs font-medium text-cyan-600 dark:text-cyan-400">Total de Tarefas</span>
                  <span class="text-2xl font-extrabold text-[var(--omp-text-primary)] mt-1">${totalJobs}</span>
                  <span class="text-[11px] text-[var(--omp-text-muted)] mt-0.5 opacity-80">Configuradas</span>
                </div>

                <div class="p-4 rounded-3xl omp-settings-card border-l-2 border-l-emerald-500/60 dark:border-l-emerald-400/60 flex flex-col shadow-xs" style="clip-path: var(--clip-path-squircle-28, none);">
                  <span class="text-xs font-medium text-emerald-600 dark:text-emerald-400">Ativas</span>
                  <span class="text-2xl font-extrabold text-[var(--omp-text-primary)] mt-1">${activeJobs}</span>
                  <span class="text-[11px] text-[var(--omp-text-muted)] mt-0.5 opacity-80">Em execução periódica</span>
                </div>

                <div class="p-4 rounded-3xl omp-settings-card border-l-2 border-l-indigo-500/60 dark:border-l-indigo-400/60 flex flex-col shadow-xs" style="clip-path: var(--clip-path-squircle-28, none);">
                  <span class="text-xs font-medium text-indigo-600 dark:text-indigo-400">Execuções</span>
                  <span class="text-2xl font-extrabold text-[var(--omp-text-primary)] mt-1">${totalRuns}</span>
                  <span class="text-[11px] text-[var(--omp-text-muted)] mt-0.5 opacity-80">Disparos acumulados</span>
                </div>

                <div class="p-4 rounded-3xl omp-settings-card border-l-2 border-l-purple-500/60 dark:border-l-purple-400/60 flex flex-col shadow-xs" style="clip-path: var(--clip-path-squircle-28, none);">
                  <span class="text-xs font-medium text-purple-600 dark:text-purple-400">Próximo Disparo</span>
                  <span class="text-base font-extrabold text-[var(--omp-text-primary)] mt-2 truncate">
                    ${nextRunTime ?? "Nenhum"}
                  </span>
                  <span class="text-[11px] text-[var(--omp-text-muted)] mt-0.5 opacity-80">Agendado</span>
                </div>
              </div>

              <!-- Error notification -->
              ${this.error
            ? html`
                    <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
                      ${this.error}
                    </div>
                  `
            : nothing}

              <!-- Jobs List -->
              <div class="space-y-3">
                <div class="flex items-center justify-between px-1">
                  <h2 class="text-sm font-bold text-[var(--omp-text-primary)] uppercase tracking-wider">Tarefas Agendadas</h2>
                  <span class="text-xs text-[var(--omp-text-muted)]">${totalJobs} tarefa(s)</span>
                </div>

                ${this.jobs.length === 0 && !this.loading
            ? html`
                      <div class="p-8 rounded-3xl omp-settings-card text-center space-y-2" style="clip-path: var(--clip-path-squircle-28, none);">
                        <p class="text-xs text-[var(--omp-text-muted)]">
                          Nenhum agendamento ativo neste workspace. Clique em <strong>"Nova Tarefa"</strong> ou use a ferramenta <code>schedule_prompt</code> no chat.
                        </p>
                      </div>
                    `
            : html`
                      <div class="grid grid-cols-1 gap-3">
                        ${this.jobs.map((job) => this.renderJobCard(job))}
                      </div>
                    `}
              </div>
            `}
      </div>

      <!-- Create Modal -->
      ${this.isCreateModalOpen ? this.renderCreateModal() : nothing}
    `;
  }

  private renderJobCard(job: CronJob) {
    const isCommand = job.target === "command" || (!job.prompt && Boolean(job.command));
    const content = (isCommand ? job.command : job.prompt) ?? "";
    const isBusy = this.actionInProgress === job.id;

    return html`
      <div
        class="p-4 sm:p-5 rounded-3xl omp-settings-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-xs ${!job.enabled ? "opacity-75" : ""}"
        style="clip-path: var(--clip-path-squircle-28, none);"
      >
        <div class="flex-1 min-w-0 space-y-2">
          <!-- Card Header / Title + Badges -->
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-bold text-[var(--omp-text-primary)] tracking-tight">
              ${job.name}
            </span>

            ${this.renderStatusBadge(job.lastStatus, job.enabled)}

            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${isCommand ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"}">
              ${isCommand ? "CLI Shell" : "Prompt IA"}
            </span>

            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/5 dark:bg-white/5 text-[var(--omp-text-muted)] border border-black/10 dark:border-white/10">
              ⏰ ${humanizeSchedule(job)} (${job.schedule})
            </span>
          </div>

          ${job.description
        ? html`<p class="text-xs text-[var(--omp-text-muted)]">${job.description}</p>`
        : nothing}

          <!-- Prompt or Command preview -->
          <div class="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 font-mono text-xs text-[var(--omp-text-primary)] truncate max-w-2xl select-text">
            ${content}
          </div>

          <!-- Metadata line -->
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--omp-text-muted)]">
            <span>Próxima: <strong class="text-[var(--omp-text-primary)]">${formatDate(job.nextRun)}</strong></span>
            <span>Última: <strong class="text-[var(--omp-text-primary)]">${formatDate(job.lastRun)}</strong></span>
            <span>Execuções: <strong class="text-[var(--omp-text-primary)]">${job.runCount || 0}</strong></span>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/5 dark:border-white/5">
          <button
            type="button"
            class="px-3 py-1.5 rounded-xl omp-settings-card text-xs font-semibold text-[var(--omp-text-primary)] hover:opacity-90 transition-all cursor-pointer shadow-xs ${isBusy ? "opacity-50 cursor-not-allowed" : ""}"
            ?disabled=${isBusy}
            title="Disparar execução agora"
            @click=${() => void this.handleRun(job)}
          >
            ${isBusy ? "…" : "Executar"}
          </button>

          <button
            type="button"
            class="px-3 py-1.5 rounded-xl omp-settings-card text-xs font-semibold ${job.enabled ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"} hover:opacity-90 transition-all cursor-pointer shadow-xs ${isBusy ? "opacity-50 cursor-not-allowed" : ""}"
            ?disabled=${isBusy}
            @click=${() => void this.handleToggle(job)}
          >
            ${job.enabled ? "Pausar" : "Ativar"}
          </button>

          <button
            type="button"
            class="px-2.5 py-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors text-xs font-medium cursor-pointer ${isBusy ? "opacity-50 cursor-not-allowed" : ""}"
            ?disabled=${isBusy}
            title="Excluir agendamento"
            @click=${() => void this.handleDelete(job)}
          >
            Excluir
          </button>
        </div>
      </div>
    `;
  }

  private renderCreateModal() {
    return html`
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans">
        <div
          class="w-full max-w-lg p-6 rounded-3xl omp-settings-card border border-black/10 dark:border-white/10 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          style="clip-path: var(--clip-path-squircle-28, none);"
        >
          <div class="flex items-center justify-between pb-2 border-b border-black/8 dark:border-white/8">
            <h3 class="text-base font-bold text-[var(--omp-text-primary)]">Novo Agendamento</h3>
            <button
              type="button"
              class="p-1 rounded-lg text-[var(--omp-text-muted)] hover:text-[var(--omp-text-primary)]"
              @click=${() => (this.isCreateModalOpen = false)}
            >
              ✕
            </button>
          </div>

          ${this.formError
        ? html`<div class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">${this.formError}</div>`
        : nothing}

          <form @submit=${(e: Event) => void this.handleCreateSubmit(e)} class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-[var(--omp-text-primary)] mb-1">Nome da Tarefa</label>
              <input
                type="text"
                class="w-full px-3 py-2 rounded-xl omp-settings-card border border-black/10 dark:border-white/10 text-xs text-[var(--omp-text-primary)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                placeholder="Ex: Resumo Diário, Backup de Notas"
                .value=${this.formName}
                @input=${(e: Event) => (this.formName = (e.target as HTMLInputElement).value)}
                required
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-[var(--omp-text-primary)] mb-1">Tipo de Gatilho</label>
                <select
                  class="w-full px-3 py-2 rounded-xl omp-settings-card border border-black/10 dark:border-white/10 text-xs text-[var(--omp-text-primary)] outline-none"
                  .value=${this.formType}
                  @change=${(e: Event) => (this.formType = (e.target as HTMLSelectElement).value as CronJobType)}
                >
                  <option value="cron">Cron (Expressão padrão)</option>
                  <option value="interval">Intervalo (ex: 30m, 1h)</option>
                  <option value="once">Execução Única (Data ISO)</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-[var(--omp-text-primary)] mb-1">Alvo</label>
                <select
                  class="w-full px-3 py-2 rounded-xl omp-settings-card border border-black/10 dark:border-white/10 text-xs text-[var(--omp-text-primary)] outline-none"
                  .value=${this.formTarget}
                  @change=${(e: Event) => (this.formTarget = (e.target as HTMLSelectElement).value as CronJobTarget)}
                >
                  <option value="prompt">Prompt de IA (Chat)</option>
                  <option value="command">Comando CLI (Shell)</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-[var(--omp-text-primary)] mb-1">
                Agendamento (${this.formType === "cron" ? "Expressão Cron" : this.formType === "interval" ? "Duração" : "Data"})
              </label>
              <input
                type="text"
                class="w-full px-3 py-2 rounded-xl omp-settings-card border border-black/10 dark:border-white/10 font-mono text-xs text-[var(--omp-text-primary)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                placeholder=${this.formType === "cron" ? "0 9 * * *" : this.formType === "interval" ? "1h ou 30m" : "2026-10-07T09:00:00"}
                .value=${this.formSchedule}
                @input=${(e: Event) => (this.formSchedule = (e.target as HTMLInputElement).value)}
                required
              />
              <div class="flex flex-wrap gap-1 mt-1.5">
                <button
                  type="button"
                  class="px-2 py-0.5 rounded-lg text-[10px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[var(--omp-text-muted)]"
                  @click=${() => { this.formType = "cron"; this.formSchedule = "0 * * * *"; }}
                >
                  A cada hora
                </button>
                <button
                  type="button"
                  class="px-2 py-0.5 rounded-lg text-[10px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[var(--omp-text-muted)]"
                  @click=${() => { this.formType = "cron"; this.formSchedule = "0 9 * * *"; }}
                >
                  Diário 09:00
                </button>
                <button
                  type="button"
                  class="px-2 py-0.5 rounded-lg text-[10px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[var(--omp-text-muted)]"
                  @click=${() => { this.formType = "cron"; this.formSchedule = "0 0 * * 1"; }}
                >
                  Semanal (Segunda)
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-[var(--omp-text-primary)] mb-1">
                ${this.formTarget === "command" ? "Comando Shell" : "Texto do Prompt"}
              </label>
              <textarea
                rows="4"
                class="w-full px-3 py-2 rounded-xl omp-settings-card border border-black/10 dark:border-white/10 font-mono text-xs text-[var(--omp-text-primary)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                placeholder=${this.formTarget === "command" ? "git pull && bun test" : "Revise os últimos commits e gere um changelog resumido"}
                .value=${this.formContent}
                @input=${(e: Event) => (this.formContent = (e.target as HTMLTextAreaElement).value)}
                required
              ></textarea>
            </div>

            <div>
              <label class="block text-xs font-semibold text-[var(--omp-text-primary)] mb-1">Descrição (Opcional)</label>
              <input
                type="text"
                class="w-full px-3 py-2 rounded-xl omp-settings-card border border-black/10 dark:border-white/10 text-xs text-[var(--omp-text-primary)] outline-none"
                placeholder="Ex: Executado toda manhã para auditar o repositório"
                .value=${this.formDescription}
                @input=${(e: Event) => (this.formDescription = (e.target as HTMLInputElement).value)}
              />
            </div>

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-black/8 dark:border-white/8">
              <button
                type="button"
                class="px-4 py-2 rounded-xl omp-settings-card text-xs font-semibold text-[var(--omp-text-primary)] hover:opacity-90"
                @click=${() => (this.isCreateModalOpen = false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-90 transition-all ${this.actionInProgress === "create" ? "opacity-60 cursor-not-allowed" : ""}"
                ?disabled=${this.actionInProgress === "create"}
              >
                ${this.actionInProgress === "create" ? "Criando…" : "Salvar Agendamento"}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }
}
