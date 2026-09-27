import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  configApi,
  pluginsApi,
  piPackagesApi,
  type OmpWebConfigResponse,
  type OmpWebConfigValues,
  type OmpWebPluginsResponse,
  type OmpWebPluginInfo,
  type PiPackagesResponse,
  type PiPackageInfo,
  type PiPackageScope,
} from "../api";
import {
  loadChatPreferences,
  saveChatPreferenceOverrides,
  preferencesEventTarget,
  CHAT_PREFERENCES_CHANGED_EVENT,
  type ChatPreferences,
} from "../chatPreferences";
import {
  readSettingsSection,
  writeSettingsSection,
  type SettingsSection,
} from "../settingsRoute";
import {
  renderSettingsIcon,
  renderSunIcon,
  renderMoonIcon,
  renderWaveformIcon,
  renderPluginsIcon,
  renderPackageIcon,
  renderKeyboardIcon,
  renderCheckIcon,
  renderCloseIcon,
  renderRefreshIcon,
  renderPlusIcon,
  renderTrashIcon,
} from "./icons";

@customElement("omp-settings-view")
export class OmpSettingsView extends LitElement {
  @property({ type: String }) theme: "dark" | "light" = "dark";
  @property({ type: String }) activeSection: SettingsSection = "general";

  @state() private configResponse?: OmpWebConfigResponse;
  @state() private pluginsResponse?: OmpWebPluginsResponse;
  @state() private packagesResponse?: PiPackagesResponse;
  @state() private chatPrefs: ChatPreferences = loadChatPreferences();

  @state() private loading = true;
  @state() private saving = false;
  @state() private installingPackage = false;
  @state() private updatingPackages = false;
  @state() private newPackageSource = "";

  @state() private notification?: { type: "success" | "error"; message: string } | undefined;

  // Form draft states
  @state() private hostDraft = "";
  @state() private portDraft = "";
  @state() private allowedHostsMode: "all" | "list" = "list";
  @state() private allowedHostsText = "";
  @state() private allowPrivateMachines = false;

  @state() private spawnSessions = false;
  @state() private subsessions = false;
  @state() private uploadsDefaultFolder = "";
  @state() private maxUploadBytesMb = "20";

  protected override createRenderRoot() {
    return this;
  }

  private notificationTimer?: ReturnType<typeof setTimeout> | undefined;

  private readonly handleChatPrefsChange = (event: Event): void => {
    if (event instanceof CustomEvent && event.detail) {
      this.chatPrefs = event.detail as ChatPreferences;
    } else {
      this.chatPrefs = loadChatPreferences();
    }
  };

  override connectedCallback(): void {
    super.connectedCallback();
    this.chatPrefs = loadChatPreferences();
    preferencesEventTarget()?.addEventListener(
      CHAT_PREFERENCES_CHANGED_EVENT,
      this.handleChatPrefsChange,
    );

    if (typeof window !== "undefined") {
      const initialSection = readSettingsSection();
      if (initialSection) {
        this.activeSection = initialSection;
      }
    }

    void this.loadAll();
  }

  override disconnectedCallback(): void {
    preferencesEventTarget()?.removeEventListener(
      CHAT_PREFERENCES_CHANGED_EVENT,
      this.handleChatPrefsChange,
    );
    clearTimeout(this.notificationTimer);
    super.disconnectedCallback();
  }

  private showNotification(type: "success" | "error", message: string): void {
    clearTimeout(this.notificationTimer);
    this.notification = { type, message };
    this.notificationTimer = setTimeout(() => {
      this.notification = undefined;
      this.requestUpdate();
    }, 4000);
  }

  private async loadAll(): Promise<void> {
    this.loading = true;
    try {
      await Promise.all([
        this.loadConfig(),
        this.loadPlugins(),
        this.loadPackages(),
      ]);
    } catch {
      // Ignored: individual loaders handle errors
    } finally {
      this.loading = false;
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const res = await configApi.config();
      this.configResponse = res;
      this.hostDraft = res.config.host ?? "";
      this.portDraft = res.config.port !== undefined ? String(res.config.port) : "";

      if (res.config.allowedHosts === true) {
        this.allowedHostsMode = "all";
        this.allowedHostsText = "";
      } else if (Array.isArray(res.config.allowedHosts)) {
        this.allowedHostsMode = "list";
        this.allowedHostsText = res.config.allowedHosts.join("\n");
      } else {
        this.allowedHostsMode = "list";
        this.allowedHostsText = "";
      }

      this.allowPrivateMachines = res.config.allowPrivateMachines ?? false;
      this.spawnSessions = res.config.spawnSessions ?? false;
      this.subsessions = res.config.subsessions ?? false;
      this.uploadsDefaultFolder = res.config.uploads?.defaultFolder ?? "";
      this.maxUploadBytesMb = res.config.maxUploadBytes
        ? String(Math.round(res.config.maxUploadBytes / (1024 * 1024)))
        : "20";
    } catch (err) {
      this.showNotification("error", `Erro ao carregar configurações: ${(err as Error).message}`);
    }
  }

  private async loadPlugins(): Promise<void> {
    try {
      this.pluginsResponse = await pluginsApi.plugins();
    } catch {
      // Ignored: plugins endpoint may fail if not supported
    }
  }

  private async loadPackages(): Promise<void> {
    try {
      this.packagesResponse = await piPackagesApi.packages();
    } catch {
      // Ignored: packages endpoint may fail if not supported
    }
  }

  private handleSectionSelect(section: SettingsSection): void {
    this.activeSection = section;
    if (typeof window !== "undefined") {
      writeSettingsSection(section, { replace: true });
    }
  }

  private updateChatPref(key: keyof ChatPreferences): void {
    const nextVal = !this.chatPrefs[key];
    saveChatPreferenceOverrides({ [key]: nextVal });
    this.chatPrefs = { ...this.chatPrefs, [key]: nextVal };
    this.showNotification("success", "Preferência do chat atualizada.");
  }

  private async handleSaveGatewayConfig(event?: Event): Promise<void> {
    event?.preventDefault();
    this.saving = true;

    try {
      const allowedHosts =
        this.allowedHostsMode === "all"
          ? true
          : this.allowedHostsText
            .split("\n")
            .map((h) => h.trim())
            .filter((h) => h.length > 0);

      const parsedPort = this.portDraft.trim() !== "" ? Number(this.portDraft.trim()) : undefined;

      const hostTrim = this.hostDraft.trim();
      const patch: OmpWebConfigValues = {
        allowPrivateMachines: this.allowPrivateMachines,
        ...(hostTrim ? { host: hostTrim } : {}),
        ...(parsedPort !== undefined ? { port: parsedPort } : {}),
        ...(allowedHosts === true
          ? { allowedHosts: true }
          : Array.isArray(allowedHosts) && allowedHosts.length > 0
          ? { allowedHosts }
          : {}),
      };

      const updated = await configApi.saveConfig(patch);
      this.configResponse = updated;
      this.showNotification("success", "Configurações do Gateway salvas com sucesso!");
    } catch (err) {
      this.showNotification("error", `Falha ao salvar Gateway: ${(err as Error).message}`);
    } finally {
      this.saving = false;
    }
  }

  private async handleSaveSessiondConfig(event?: Event): Promise<void> {
    event?.preventDefault();
    this.saving = true;

    try {
      const parsedMb = Number(this.maxUploadBytesMb);
      const maxUploadBytes = Number.isFinite(parsedMb) && parsedMb > 0
        ? parsedMb * 1024 * 1024
        : undefined;

      const uploadsFolder = this.uploadsDefaultFolder.trim();
      const patch: OmpWebConfigValues = {
        spawnSessions: this.spawnSessions,
        subsessions: this.subsessions,
        ...(uploadsFolder ? { uploads: { defaultFolder: uploadsFolder } } : {}),
        ...(maxUploadBytes !== undefined ? { maxUploadBytes } : {}),
      };

      const updated = await configApi.saveConfig(patch);
      this.configResponse = updated;
      this.showNotification("success", "Configurações de Sessões salvas com sucesso!");
    } catch (err) {
      this.showNotification("error", `Falha ao salvar Sessões: ${(err as Error).message}`);
    } finally {
      this.saving = false;
    }
  }

  private async handleTogglePlugin(plugin: OmpWebPluginInfo): Promise<void> {
    this.saving = true;
    try {
      const targetState = !plugin.enabled;
      await configApi.saveConfig({
        plugins: {
          [plugin.id]: { enabled: targetState },
        },
      });
      await this.loadPlugins();
      this.showNotification(
        "success",
        `Plugin ${plugin.id} ${targetState ? "ativado" : "desativado"}.`,
      );
    } catch (err) {
      this.showNotification("error", `Falha ao alterar plugin: ${(err as Error).message}`);
    } finally {
      this.saving = false;
    }
  }

  private async handleInstallPackage(e: Event): Promise<void> {
    e.preventDefault();
    const source = this.newPackageSource.trim();
    if (!source) return;

    this.installingPackage = true;
    try {
      await piPackagesApi.install(source);
      this.newPackageSource = "";
      await this.loadPackages();
      this.showNotification("success", `Pacote ${source} instalado com sucesso!`);
    } catch (err) {
      this.showNotification("error", `Erro ao instalar pacote: ${(err as Error).message}`);
    } finally {
      this.installingPackage = false;
    }
  }

  private async handleRemovePackage(pkg: PiPackageInfo): Promise<void> {
    if (!confirm(`Deseja remover o pacote "${pkg.source}"?`)) return;

    try {
      await piPackagesApi.remove(pkg.source, pkg.scope);
      await this.loadPackages();
      this.showNotification("success", `Pacote ${pkg.source} removido.`);
    } catch (err) {
      this.showNotification("error", `Erro ao remover pacote: ${(err as Error).message}`);
    }
  }

  private async handleUpdatePackages(): Promise<void> {
    this.updatingPackages = true;
    try {
      await piPackagesApi.update();
      await this.loadPackages();
      this.showNotification("success", "Todos os pacotes Pi foram atualizados.");
    } catch (err) {
      this.showNotification("error", `Erro ao atualizar pacotes: ${(err as Error).message}`);
    } finally {
      this.updatingPackages = false;
    }
  }

  private renderNotificationBanner() {
    if (!this.notification) return nothing;
    const isSuccess = this.notification.type === "success";

    return html`
      <div
        class="fixed top-16 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-xl transition-all duration-300 font-sans text-sm animate-in fade-in slide-in-from-top-4 ${isSuccess
        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
        : "bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400"
      }"
      >
        <span class="size-5 rounded-full flex items-center justify-center ${isSuccess ? "bg-emerald-500/20" : "bg-red-500/20"
      }">
          ${isSuccess ? renderCheckIcon("size-3.5") : renderCloseIcon("size-3.5")}
        </span>
        <span class="font-medium">${this.notification.message}</span>
        <button
          type="button"
          aria-label="Fechar notificação"
          class="size-5 rounded-lg flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          @click=${() => {
        this.notification = undefined;
      }}
        >
          ${renderCloseIcon("size-3")}
        </button>
      </div>
    `;
  }

  private renderToggleSwitch(checked: boolean, onChange: (e: Event) => void, disabled = false) {
    return html`
      <button
        type="button"
        role="switch"
        aria-checked=${checked ? "true" : "false"}
        ?disabled=${disabled}
        class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked
        ? "bg-blue-600 dark:bg-blue-500"
        : "bg-black/20 dark:bg-white/20"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}"
        @click=${onChange}
      >
        <span
          class="pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${checked ? "translate-x-5" : "translate-x-0"
      }"
        ></span>
      </button>
    `;
  }

  private renderNavPills() {
    const items: Array<{ id: SettingsSection; label: string; icon: unknown }> = [
      { id: "general", label: "Geral", icon: renderSettingsIcon("size-4") },
      { id: "sessiond", label: "Sessões & Daemon", icon: renderWaveformIcon("size-4") },
      { id: "plugins", label: "Plugins", icon: renderPluginsIcon("size-4") },
      { id: "packages", label: "Pacotes Pi", icon: renderPackageIcon("size-4") },
      { id: "shortcuts", label: "Atalhos", icon: renderKeyboardIcon("size-4") },
    ];

    return html`
      <nav
        class="flex items-center gap-1.5 p-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 backdrop-blur-md overflow-x-auto max-w-full font-sans select-none shrink-0"
        aria-label="Seções de Configuração"
      >
        ${items.map(
      (item) => html`
            <button
              type="button"
              class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${this.activeSection === item.id
          ? "bg-white dark:bg-white/15 text-foreground-900 shadow-sm font-extrabold"
          : "text-foreground-600 hover:text-foreground-900 hover:bg-black/5 dark:hover:bg-white/8"
        }"
              @click=${() => this.handleSectionSelect(item.id)}
            >
              ${item.icon}
              <span>${item.label}</span>
            </button>
          `,
    )}
      </nav>
    `;
  }

  private renderGeneralSection() {
    return html`
      <div class="flex flex-col gap-6">
        <!-- Card 1: Tema e Aparência -->
        <section
          class="p-5 md:p-6 rounded-3xl bg-white/70 dark:bg-background-850/70 border border-black/10 dark:border-white/10 backdrop-blur-xl shadow-sm flex flex-col gap-4"
          style="clip-path: var(--clip-path-squircle-28, none);"
        >
          <div class="flex items-center justify-between">
            <div class="flex flex-col gap-0.5">
              <h3 class="text-base font-bold text-foreground-900">Aparência & Tema</h3>
              <p class="text-xs text-foreground-600">Escolha o tema de interface do OMP Web</p>
            </div>
            <button
              type="button"
              class="flex items-center gap-2 px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/15 text-foreground-800 text-xs font-bold transition-colors cursor-pointer"
              @click=${() => this.dispatchEvent(new CustomEvent("toggle-theme", { bubbles: true, composed: true }))}
            >
              ${this.theme === "dark" ? renderSunIcon("size-4") : renderMoonIcon("size-4")}
              <span>Modo ${this.theme === "dark" ? "Escuro (Dark)" : "Claro (Light)"}</span>
            </button>
          </div>
        </section>

        <!-- Card 2: Preferências de Exibição do Chat -->
        <section
          class="p-5 md:p-6 rounded-3xl bg-white/70 dark:bg-background-850/70 border border-black/10 dark:border-white/10 backdrop-blur-xl shadow-sm flex flex-col gap-4"
          style="clip-path: var(--clip-path-squircle-28, none);"
        >
          <div class="flex flex-col gap-0.5">
            <h3 class="text-base font-bold text-foreground-900">Exibição do Chat</h3>
            <p class="text-xs text-foreground-600">Personalize o que é renderizado nas respostas e status do agente</p>
          </div>

          <div class="flex flex-col divide-y divide-black/5 dark:divide-white/5">
            <!-- Show Thinking -->
            <div class="flex items-center justify-between py-3">
              <div class="flex flex-col pr-4">
                <span class="text-sm font-semibold text-foreground-800">Raciocínio do Modelo</span>
                <span class="text-xs text-foreground-500">Exibir bloco expansível de raciocínio (thinking)</span>
              </div>
              ${this.renderToggleSwitch(this.chatPrefs.showThinking, () => this.updateChatPref("showThinking"))}
            </div>

            <!-- Show Tool Executions -->
            <div class="flex items-center justify-between py-3">
              <div class="flex flex-col pr-4">
                <span class="text-sm font-semibold text-foreground-800">Execuções de Ferramentas</span>
                <span class="text-xs text-foreground-500">Mostrar detalhes e retornos das tool calls acionadas</span>
              </div>
              ${this.renderToggleSwitch(this.chatPrefs.showToolExecutions, () => this.updateChatPref("showToolExecutions"))}
            </div>

            <!-- Show Events -->
            <div class="flex items-center justify-between py-3">
              <div class="flex flex-col pr-4">
                <span class="text-sm font-semibold text-foreground-800">Eventos de Sessão</span>
                <span class="text-xs text-foreground-500">Mostrar logs de ciclo de vida e eventos de grupo</span>
              </div>
              ${this.renderToggleSwitch(this.chatPrefs.showEvents, () => this.updateChatPref("showEvents"))}
            </div>

            <!-- Vim Mode -->
            <div class="flex items-center justify-between py-3">
              <div class="flex flex-col pr-4">
                <span class="text-sm font-semibold text-foreground-800">Modo Vim</span>
                <span class="text-xs text-foreground-500">Habilitar atalhos e keybindings Vim no editor de código</span>
              </div>
              ${this.renderToggleSwitch(this.chatPrefs.vimMode, () => this.updateChatPref("vimMode"))}
            </div>
          </div>
        </section>

        <!-- Card 3: Servidor Gateway -->
        <section
          class="p-5 md:p-6 rounded-3xl bg-white/70 dark:bg-background-850/70 border border-black/10 dark:border-white/10 backdrop-blur-xl shadow-sm flex flex-col gap-4"
          style="clip-path: var(--clip-path-squircle-28, none);"
        >
          <div class="flex items-center justify-between">
            <div class="flex flex-col gap-0.5">
              <h3 class="text-base font-bold text-foreground-900">Servidor Gateway</h3>
              <p class="text-xs text-foreground-600">Configurações de rede, portas e hosts autorizados</p>
            </div>
            ${this.configResponse?.path
        ? html`<span class="text-[11px] font-mono text-foreground-400 bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-lg truncate max-w-xs" title="${this.configResponse.path}">
                  ${this.configResponse.path}
                </span>`
        : nothing}
          </div>

          <form class="flex flex-col gap-4 mt-2" @submit=${(e: Event) => void this.handleSaveGatewayConfig(e)}>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Host -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold text-foreground-700" for="gw-host">Endereço Host</label>
                <input
                  id="gw-host"
                  type="text"
                  placeholder="127.0.0.1 (ou 0.0.0.0 para acesso remoto)"
                  class="w-full px-3.5 py-2 rounded-xl text-xs font-mono bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  .value=${this.hostDraft}
                  @input=${(e: Event) => {
        this.hostDraft = (e.target as HTMLInputElement).value;
      }}
                />
              </div>

              <!-- Port -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold text-foreground-700" for="gw-port">Porta TCP</label>
                <input
                  id="gw-port"
                  type="text"
                  placeholder="8504"
                  class="w-full px-3.5 py-2 rounded-xl text-xs font-mono bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  .value=${this.portDraft}
                  @input=${(e: Event) => {
        this.portDraft = (e.target as HTMLInputElement).value;
      }}
                />
              </div>
            </div>

            <!-- Allowed Hosts -->
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-foreground-700" for="gw-hosts-mode">Hosts Autorizados (Allowed Hosts)</label>
              <select
                id="gw-hosts-mode"
                class="w-full px-3.5 py-2 rounded-xl text-xs font-sans bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-foreground-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                .value=${this.allowedHostsMode}
                @change=${(e: Event) => {
        this.allowedHostsMode = (e.target as HTMLSelectElement).value as "all" | "list";
      }}
              >
                <option value="list">Apenas hosts listados (Recomendado)</option>
                <option value="all">Permitir todos os hosts (true)</option>
              </select>

              ${this.allowedHostsMode === "list"
        ? html`
                    <textarea
                      rows="3"
                      placeholder="localhost&#10;127.0.0.1&#10;192.168.0.*"
                      class="w-full px-3.5 py-2 rounded-xl text-xs font-mono bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 mt-1"
                      .value=${this.allowedHostsText}
                      @input=${(e: Event) => {
            this.allowedHostsText = (e.target as HTMLTextAreaElement).value;
          }}
                    ></textarea>
                    <span class="text-[11px] text-foreground-500">Insira um host por linha.</span>
                  `
        : nothing}
            </div>

            <!-- Private & VPN machines -->
            <div class="flex items-center justify-between py-2">
              <div class="flex flex-col pr-4">
                <span class="text-sm font-semibold text-foreground-800">Permitir Máquinas Privadas & VPN</span>
                <span class="text-xs text-foreground-500">Permite registrar máquinas remotas no Tailscale, WireGuard ou rede LAN</span>
              </div>
              ${this.renderToggleSwitch(this.allowPrivateMachines, () => {
          this.allowPrivateMachines = !this.allowPrivateMachines;
        })}
            </div>

            <div class="flex items-center justify-end pt-2">
              <button
                type="submit"
                ?disabled=${this.saving}
                class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-98 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                ${this.saving ? "Salvando…" : "Salvar Configurações do Gateway"}
              </button>
            </div>
          </form>
        </section>

        <!-- Card 4: Autenticação -->
        <section
          class="p-5 md:p-6 rounded-3xl bg-white/70 dark:bg-background-850/70 border border-black/10 dark:border-white/10 backdrop-blur-xl shadow-sm flex flex-col gap-3"
          style="clip-path: var(--clip-path-squircle-28, none);"
        >
          <h3 class="text-base font-bold text-foreground-900">Autenticação & Segurança</h3>
          <div class="flex items-center justify-between text-xs text-foreground-700">
            <span>Status da Autenticação</span>
            <span class="font-bold px-2 py-0.5 rounded-md ${this.configResponse?.config.authRequired
        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
        : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
      }">
              ${this.configResponse?.config.authRequired ? "Protegido por senha" : "Livre / Sem senha"}
            </span>
          </div>
          ${this.configResponse?.config.authUsername
        ? html`
                <div class="flex items-center justify-between text-xs text-foreground-700">
                  <span>Usuário Configurado</span>
                  <span class="font-mono">${this.configResponse.config.authUsername}</span>
                </div>
              `
        : nothing}
        </section>
      </div>
    `;
  }

  private renderSessiondSection() {
    return html`
      <div class="flex flex-col gap-6">
        <!-- Card 1: Autonomia e Subsessões -->
        <section
          class="p-5 md:p-6 rounded-3xl bg-white/70 dark:bg-background-850/70 border border-black/10 dark:border-white/10 backdrop-blur-xl shadow-sm flex flex-col gap-4"
          style="clip-path: var(--clip-path-squircle-28, none);"
        >
          <div class="flex flex-col gap-0.5">
            <h3 class="text-base font-bold text-foreground-900">Autonomia & Subagentes</h3>
            <p class="text-xs text-foreground-600">Controle a capacidade do agente de orquestrar novas sessões e filhos</p>
          </div>

          <div class="flex flex-col divide-y divide-black/5 dark:divide-white/5">
            <!-- Spawn Sessions -->
            <div class="flex items-center justify-between py-3">
              <div class="flex flex-col pr-4">
                <span class="text-sm font-semibold text-foreground-800">Spawn Sessions</span>
                <span class="text-xs text-foreground-500">Permite que o LLM inicie sessões independentes via ferramenta <code>spawn_session</code></span>
              </div>
              ${this.renderToggleSwitch(this.spawnSessions, () => {
      this.spawnSessions = !this.spawnSessions;
    })}
            </div>

            <!-- Subsessions (Beta) -->
            <div class="flex items-center justify-between py-3">
              <div class="flex flex-col pr-4">
                <span class="text-sm font-semibold text-foreground-800">Subsessões Rastreadas (Beta)</span>
                <span class="text-xs text-foreground-500">Permite criar sessões filhas coordenadas via <code>spawn_subsession</code></span>
              </div>
              ${this.renderToggleSwitch(this.subsessions, () => {
      this.subsessions = !this.subsessions;
    })}
            </div>
          </div>
        </section>

        <!-- Card 2: Uploads e Limites -->
        <section
          class="p-5 md:p-6 rounded-3xl bg-white/70 dark:bg-background-850/70 border border-black/10 dark:border-white/10 backdrop-blur-xl shadow-sm flex flex-col gap-4"
          style="clip-path: var(--clip-path-squircle-28, none);"
        >
          <div class="flex flex-col gap-0.5">
            <h3 class="text-base font-bold text-foreground-900">Uploads & Limites de Arquivo</h3>
            <p class="text-xs text-foreground-600">Configuração de diretórios e tamanhos de anexos no workspace</p>
          </div>

          <form class="flex flex-col gap-4 mt-2" @submit=${(e: Event) => void this.handleSaveSessiondConfig(e)}>
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-foreground-700" for="up-folder">Pasta padrão de upload no workspace</label>
              <input
                id="up-folder"
                type="text"
                placeholder="uploads (ou deixe vazio para raiz)"
                class="w-full px-3.5 py-2 rounded-xl text-xs font-mono bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                .value=${this.uploadsDefaultFolder}
                @input=${(e: Event) => {
        this.uploadsDefaultFolder = (e.target as HTMLInputElement).value;
      }}
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-foreground-700" for="up-size">Tamanho Máximo por Arquivo (MB)</label>
              <input
                id="up-size"
                type="number"
                min="1"
                max="500"
                placeholder="20"
                class="w-full px-3.5 py-2 rounded-xl text-xs font-mono bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                .value=${this.maxUploadBytesMb}
                @input=${(e: Event) => {
        this.maxUploadBytesMb = (e.target as HTMLInputElement).value;
      }}
              />
            </div>

            <div class="flex items-center justify-end pt-2">
              <button
                type="submit"
                ?disabled=${this.saving}
                class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-98 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                ${this.saving ? "Salvando…" : "Salvar Configurações de Sessão"}
              </button>
            </div>
          </form>
        </section>
      </div>
    `;
  }

  private renderPluginsSection() {
    const plugins = this.pluginsResponse?.plugins ?? [];

    return html`
      <div class="flex flex-col gap-6">
        <section
          class="p-5 md:p-6 rounded-3xl bg-white/70 dark:bg-background-850/70 border border-black/10 dark:border-white/10 backdrop-blur-xl shadow-sm flex flex-col gap-4"
          style="clip-path: var(--clip-path-squircle-28, none);"
        >
          <div class="flex items-center justify-between">
            <div class="flex flex-col gap-0.5">
              <h3 class="text-base font-bold text-foreground-900">Plugins do OMP Web</h3>
              <p class="text-xs text-foreground-600">Extensões ativas carregadas no gateway e sessões</p>
            </div>
            <button
              type="button"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/8 hover:bg-black/10 text-xs font-bold text-foreground-800 transition-colors cursor-pointer"
              @click=${() => void this.loadPlugins()}
            >
              ${renderRefreshIcon("size-3.5")}
              <span>Recarregar</span>
            </button>
          </div>

          ${plugins.length === 0
        ? html`
                <div class="py-8 text-center text-xs text-foreground-500">
                  Nenhum plugin instalado ou registrado.
                </div>
              `
        : html`
                <div class="flex flex-col divide-y divide-black/5 dark:divide-white/5">
                  ${plugins.map(
          (plugin) => html`
                      <div class="flex items-center justify-between py-3.5 gap-4">
                        <div class="flex flex-col min-w-0">
                          <div class="flex items-center gap-2">
                            <span class="text-sm font-bold text-foreground-900 truncate">${plugin.id}</span>
                            <span class="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border border-black/10 dark:border-white/10 text-foreground-500">
                              ${plugin.scope}
                            </span>
                          </div>
                          <span class="text-xs font-mono text-foreground-500 truncate mt-0.5">
                            ${plugin.module}
                          </span>
                        </div>
                        ${this.renderToggleSwitch(plugin.enabled, () => void this.handleTogglePlugin(plugin), this.saving)}
                      </div>
                    `,
        )}
                </div>
              `}
        </section>
      </div>
    `;
  }

  private renderPackagesSection() {
    const packages = this.packagesResponse?.packages ?? [];

    return html`
      <div class="flex flex-col gap-6">
        <!-- Instalar novo pacote -->
        <section
          class="p-5 md:p-6 rounded-3xl bg-white/70 dark:bg-background-850/70 border border-black/10 dark:border-white/10 backdrop-blur-xl shadow-sm flex flex-col gap-4"
          style="clip-path: var(--clip-path-squircle-28, none);"
        >
          <div class="flex flex-col gap-0.5">
            <h3 class="text-base font-bold text-foreground-900">Instalar Pacote Pi</h3>
            <p class="text-xs text-foreground-600">Adicione extensões, skills ou ferramentas do Oh My Pi</p>
          </div>

          <form class="flex items-center gap-2 mt-1" @submit=${(e: Event) => void this.handleInstallPackage(e)}>
            <input
              type="text"
              placeholder="ex: @oh-my-pi/pi-catalog ou repositório git"
              class="flex-1 px-3.5 py-2.5 rounded-xl text-xs font-mono bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              .value=${this.newPackageSource}
              @input=${(e: Event) => {
        this.newPackageSource = (e.target as HTMLInputElement).value;
      }}
            />
            <button
              type="submit"
              ?disabled=${this.installingPackage || !this.newPackageSource.trim()}
              class="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-98 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
            >
              ${renderPlusIcon("size-3.5")}
              <span>${this.installingPackage ? "Instalando…" : "Instalar"}</span>
            </button>
          </form>
        </section>

        <!-- Lista de Pacotes -->
        <section
          class="p-5 md:p-6 rounded-3xl bg-white/70 dark:bg-background-850/70 border border-black/10 dark:border-white/10 backdrop-blur-xl shadow-sm flex flex-col gap-4"
          style="clip-path: var(--clip-path-squircle-28, none);"
        >
          <div class="flex items-center justify-between">
            <div class="flex flex-col gap-0.5">
              <h3 class="text-base font-bold text-foreground-900">Pacotes Instalados</h3>
              <p class="text-xs text-foreground-600">Pacotes configurados no Oh My Pi</p>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                ?disabled=${this.updatingPackages}
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/8 hover:bg-black/10 text-xs font-bold text-foreground-800 transition-colors cursor-pointer disabled:opacity-50"
                @click=${() => void this.handleUpdatePackages()}
              >
                ${renderRefreshIcon("size-3.5")}
                <span>${this.updatingPackages ? "Atualizando…" : "Atualizar Todos"}</span>
              </button>
            </div>
          </div>

          ${packages.length === 0
        ? html`
                <div class="py-8 text-center text-xs text-foreground-500">
                  Nenhum pacote Pi instalado.
                </div>
              `
        : html`
                <div class="flex flex-col divide-y divide-black/5 dark:divide-white/5">
                  ${packages.map(
          (pkg) => html`
                      <div class="flex items-center justify-between py-3.5 gap-4">
                        <div class="flex flex-col min-w-0">
                          <div class="flex items-center gap-2">
                            <span class="text-sm font-bold text-foreground-900 truncate">${pkg.source}</span>
                            <span class="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border border-black/10 dark:border-white/10 text-foreground-500">
                              ${pkg.scope}
                            </span>
                          </div>
                          ${pkg.installedPath
              ? html`<span class="text-[11px] font-mono text-foreground-500 truncate mt-0.5">
                                ${pkg.installedPath}
                              </span>`
              : nothing}
                        </div>
                        <button
                          type="button"
                          title="Remover pacote"
                          aria-label="Remover pacote"
                          class="size-8 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                          @click=${() => void this.handleRemovePackage(pkg)}
                        >
                          ${renderTrashIcon("size-4")}
                        </button>
                      </div>
                    `,
        )}
                </div>
              `}
        </section>
      </div>
    `;
  }

  private renderShortcutsSection() {
    const shortcuts = [
      { key: "Enter", desc: "Enviar prompt ou mensagem ativa (no mobile gera quebra de linha)" },
      { key: "Shift + Enter", desc: "Inserir nova linha no editor do composer" },
      { key: "Ctrl + B / Cmd + B", desc: "Alternar visibilidade da barra lateral (Sidebar)" },
      { key: "Ctrl + K / Cmd + K", desc: "Alternar tema visual (Claro / Escuro)" },
      { key: "/btw <pergunta>", desc: "Iniciar pergunta paralela no chat sem poluir o histórico" },
      { key: "/clear", desc: "Limpar o histórico de mensagens da conversa local" },
      { key: "Esc", desc: "Fechar modais, menus de contexto ou cancelar ações pendentes" },
    ];

    return html`
      <div class="flex flex-col gap-6">
        <section
          class="p-5 md:p-6 rounded-3xl bg-white/70 dark:bg-background-850/70 border border-black/10 dark:border-white/10 backdrop-blur-xl shadow-sm flex flex-col gap-4"
          style="clip-path: var(--clip-path-squircle-28, none);"
        >
          <div class="flex flex-col gap-0.5">
            <h3 class="text-base font-bold text-foreground-900">Atalhos de Teclado</h3>
            <p class="text-xs text-foreground-600">Comandos rápidos para aumentar sua produtividade no OMP Web</p>
          </div>

          <div class="flex flex-col divide-y divide-black/5 dark:divide-white/5 mt-2">
            ${shortcuts.map(
      (item) => html`
                <div class="flex items-center justify-between py-3 gap-4">
                  <span class="text-xs text-foreground-700">${item.desc}</span>
                  <kbd class="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-mono font-bold text-foreground-800 shrink-0">
                    ${item.key}
                  </kbd>
                </div>
              `,
    )}
          </div>
        </section>
      </div>
    `;
  }

  override render() {
    return html`
      <div class="relative size-full overflow-hidden flex flex-col font-sans">
        ${this.renderNotificationBanner()}

        <!-- Scrollable Content -->
        <div class="relative size-full overflow-y-auto px-4 py-6 md:px-8 pb-32 font-sans">
          <div class="w-full max-w-4xl mx-auto flex flex-col gap-6">
            <!-- Header title -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div class="flex flex-col gap-1">
                <h1 class="text-2xl sm:text-3xl font-bold font-sans text-foreground-900 tracking-tight">
                  Configurações
                </h1>
                <p class="text-xs sm:text-sm text-foreground-600">
                  Gerencie opções do sistema, servidor gateway, plugins e preferências
                </p>
              </div>

              <!-- Segmented Navigation Pills -->
              ${this.renderNavPills()}
            </div>

            <!-- Active Section Content -->
            <div class="w-full mt-2">
              ${this.activeSection === "sessiond"
        ? this.renderSessiondSection()
        : this.activeSection === "plugins"
          ? this.renderPluginsSection()
          : this.activeSection === "packages"
            ? this.renderPackagesSection()
            : this.activeSection === "shortcuts"
              ? this.renderShortcutsSection()
              : this.renderGeneralSection()}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "omp-settings-view": OmpSettingsView;
  }
}
