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
} from "../api";
import {
  loadChatPreferences,
  saveChatPreferenceOverrides,
  preferencesEventTarget,
  CHAT_PREFERENCES_CHANGED_EVENT,
  type ChatPreferences,
} from "../chatPreferences";
import {
  loadUiColors,
  saveUiColors,
  resetUiColors,
  resolveUiColorVars,
  formatCssVarsText,
  UI_COLOR_PRESETS,
  UI_COLORS_CHANGED_EVENT,
  type UiColorsConfig,
  type UiColorPreset,
} from "../uiColors";
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
  renderLockIcon,
  renderCopyIcon,
  renderPaletteIcon,
} from "./icons";

@customElement("omp-settings-view")
export class OmpSettingsView extends LitElement {
  @property({ type: String }) theme: "dark" | "light" = "dark";
  @property({ type: String }) activeSection: SettingsSection = "general";
  @property({ type: String }) currentUser: string | null = null;

  @state() private configResponse?: OmpWebConfigResponse;
  @state() private pluginsResponse?: OmpWebPluginsResponse;
  @state() private packagesResponse?: PiPackagesResponse;
  @state() private chatPrefs: ChatPreferences = loadChatPreferences();
  @state() private uiColors: UiColorsConfig = loadUiColors();
  @state() private showCodeModal = false;
  @state() private showAlertsPreview = false;
  @state() private copiedCssCode = false;
  @state() private uiVersion: "new" | "classic" = "new";

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

  
  private readonly handleUiColorsChange = (event: Event): void => {
    if (event instanceof CustomEvent && event.detail) {
      this.uiColors = event.detail as UiColorsConfig;
      this.requestUpdate();
    }
  };

  private handleHueInput(val: number): void {
    const next = { ...this.uiColors, hue: Math.min(360, Math.max(0, Math.round(val))) };
    this.uiColors = next;
    saveUiColors(next, this.theme === "light");
  }

  private handleChromaInput(val: number): void {
    const next = { ...this.uiColors, chroma: Math.min(0.2, Math.max(0, +val.toFixed(2))) };
    this.uiColors = next;
    saveUiColors(next, this.theme === "light");
  }

  private handleUiColorsToggle(): void {
    const next = { ...this.uiColors, enabled: !this.uiColors.enabled };
    this.uiColors = next;
    saveUiColors(next, this.theme === "light");
    this.showNotification("success", next.enabled ? "Paleta UI Colors ativada na interface!" : "Paleta UI Colors desativada (cores padrão)");
  }

  private handlePresetClick(preset: UiColorPreset): void {
    const next = { ...this.uiColors, hue: preset.hue, chroma: preset.chroma, enabled: true };
    this.uiColors = next;
    saveUiColors(next, this.theme === "light");
    this.showNotification("success", `Paleta "${preset.name}" aplicada!`);
  }

  private handleResetColors(): void {
    this.uiColors = resetUiColors(this.theme === "light");
    this.showNotification("success", "Cores restauradas para o padrão do UI Colors");
  }

  private async handleCopyCode(): Promise<void> {
    const vars = resolveUiColorVars(this.uiColors.hue, this.uiColors.chroma, this.theme === "light");
    const code = formatCssVarsText(vars);
    try {
      await navigator.clipboard.writeText(code);
      this.copiedCssCode = true;
      this.showNotification("success", "Variáveis CSS (OKLCH) copiadas com sucesso!");
      setTimeout(() => {
        this.copiedCssCode = false;
        this.requestUpdate();
      }, 2000);
    } catch {
      this.showNotification("error", "Erro ao copiar para a área de transferência");
    }
  }

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

    this.uiColors = loadUiColors();
    if (typeof window !== "undefined") {
      window.addEventListener(UI_COLORS_CHANGED_EVENT, this.handleUiColorsChange);
    }
    void this.loadAll();
  }

  override disconnectedCallback(): void {
    preferencesEventTarget()?.removeEventListener(
      CHAT_PREFERENCES_CHANGED_EVENT,
      this.handleChatPrefsChange,
    );
    if (typeof window !== "undefined") {
      window.removeEventListener(UI_COLORS_CHANGED_EVENT, this.handleUiColorsChange);
    }
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

  private handleSetUiVersion(version: "new" | "classic") {
    this.uiVersion = version;
    try {
      localStorage.setItem("omp-web:ui-version", version);
      document.cookie = `omp_web_ui=${version}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
    this.requestUpdate();
    if (version === "classic") {
      window.location.href = "/classic";
    } else {
      window.location.href = "/";
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

  private setProgressStyle(style: "minimal" | "steps"): void {
    saveChatPreferenceOverrides({ progressStyle: style });
    this.chatPrefs = { ...this.chatPrefs, progressStyle: style };
    this.showNotification("success", "Estilo de progresso atualizado.");
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
        role="alert"
        class="omp-settings-notification ${isSuccess ? "success" : "error"}"
      >
        <span class="size-5 rounded-full flex items-center justify-center shrink-0 ${isSuccess ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-red-500/20 text-red-600 dark:text-red-400"
      }">
          ${isSuccess ? renderCheckIcon("size-3.5") : renderCloseIcon("size-3.5")}
        </span>
        <span class="font-medium">${this.notification.message}</span>
        <button
          type="button"
          aria-label="Fechar notificação"
          class="size-5 rounded-lg flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer ml-1"
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
        class="omp-toggle-switch ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}"
        @click=${onChange}
      >
        <span class="omp-toggle-thumb"></span>
      </button>
    `;
  }

  private handleTabKeyDown(e: KeyboardEvent, items: { id: SettingsSection }[], currentIndex: number) {
    let nextIndex = currentIndex;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % items.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + items.length) % items.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIndex = items.length - 1;
    } else {
      return;
    }
    const nextItem = items[nextIndex];
    if (nextItem) {
      this.handleSectionSelect(nextItem.id);
      void this.updateComplete.then(() => {
        const btn = this.querySelector<HTMLButtonElement>(`#settings-tab-${nextItem.id}`);
        btn?.focus();
      });
    }
  }

  private renderNavPills() {
    const items: { id: SettingsSection; label: string; icon: unknown }[] = [
      { id: "general", label: "Geral", icon: renderSettingsIcon("size-4") },
      { id: "sessiond", label: "Sessões & Daemon", icon: renderWaveformIcon("size-4") },
      { id: "plugins", label: "Plugins", icon: renderPluginsIcon("size-4") },
      { id: "packages", label: "Pacotes Pi", icon: renderPackageIcon("size-4") },
      { id: "shortcuts", label: "Atalhos", icon: renderKeyboardIcon("size-4") },
    ];

    return html`
      <nav
        class="omp-settings-nav"
        role="tablist"
        aria-orientation="horizontal"
        aria-label="Seções de Configuração"
      >
        ${items.map(
      (item, idx) => html`
            <button
              id="settings-tab-${item.id}"
              role="tab"
              aria-selected="${this.activeSection === item.id ? "true" : "false"}"
              aria-controls="settings-panel-${item.id}"
              tabindex="${this.activeSection === item.id ? "0" : "-1"}"
              type="button"
              class="omp-settings-nav-btn ${this.activeSection === item.id ? "active" : ""}"
              @click=${() => { this.handleSectionSelect(item.id); }}
              @keydown=${(e: KeyboardEvent) => this.handleTabKeyDown(e, items, idx)}
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
        <!-- Card 0: Conta & Sessão -->
        <section
          class="p-5 md:p-6 rounded-3xl omp-settings-card flex flex-col gap-4"
          style="clip-path: var(--clip-path-squircle-28, none);"
        >
          <div class="flex items-center justify-between">
            <div class="flex flex-col gap-0.5">
              <h3 class="text-base font-bold text-foreground-900">Conta & Sessão</h3>
              <p class="text-xs text-foreground-600">Gerenciamento da sua conta e autenticação no OMP Web</p>
            </div>
            ${this.currentUser
              ? html`
                  <button
                    type="button"
                    class="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer"
                    @click=${() => this.dispatchEvent(new CustomEvent("sign-out", { bubbles: true, composed: true }))}
                  >
                    Sair da conta
                  </button>
                `
              : html`
                  <button
                    type="button"
                    class="omp-btn-signin px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer shadow-sm active:scale-98"
                    @click=${() => this.dispatchEvent(new CustomEvent("sign-in", { bubbles: true, composed: true }))}
                  >
                    Entrar
                  </button>
                `}
          </div>

          <div class="flex items-center gap-3 pt-2 border-t border-black/5 dark:border-white/5">
            ${this.currentUser
              ? html`
                  <div class="size-10 rounded-full bg-[var(--omp-accent)] text-[var(--omp-on-accent)] flex items-center justify-center text-sm font-bold uppercase shadow-xs shrink-0">
                    ${this.currentUser.charAt(0)}
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-sm font-bold text-foreground-900 truncate">${this.currentUser}</span>
                    <span class="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                      <span class="size-1.5 rounded-full bg-emerald-500"></span>
                      Sessão ativa
                    </span>
                  </div>
                `
              : html`
                  <div class="size-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-foreground-400 shrink-0">
                    <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div class="flex flex-col">
                    <span class="text-sm font-semibold text-foreground-700">Não conectado</span>
                    <span class="text-xs text-foreground-400">Entre para gerenciar credenciais e configurações</span>
                  </div>
                `}
          </div>
        </section>

        <!-- Card: Versão da Interface (Cutover & Preferência) -->
        <section
          class="p-5 md:p-6 rounded-3xl omp-settings-card flex flex-col gap-4 shadow-xs"
          style="clip-path: var(--clip-path-squircle-28, none);"
        >
          <div class="flex items-center justify-between">
            <div class="flex flex-col gap-0.5">
              <h3 class="text-base font-bold text-foreground-900">Versão da Interface</h3>
              <p class="text-xs text-foreground-600">Escolha entre a nova interface moderna (Cockpit) e a interface clássica legada</p>
            </div>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono">
              ${this.uiVersion === "classic" ? "Clássica" : "Nova UI (Padrão)"}
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-black/5 dark:border-white/5">
            <!-- Option 1: Nova UI -->
            <button
              type="button"
              class="flex flex-col text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                this.uiVersion !== "classic"
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 ring-1 ring-[var(--primary)]"
                  : "border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
              }"
              @click=${() => this.handleSetUiVersion("new")}
            >
              <div class="flex items-center justify-between w-full">
                <span class="text-sm font-bold text-foreground-900">Nova Interface (Cockpit)</span>
                ${this.uiVersion !== "classic" ? html`<span class="text-emerald-500 font-bold">✓ Ativo</span>` : nothing}
              </div>
              <p class="text-xs text-foreground-600 mt-1">
                Visual moderno, abas nativas de Terminal, Arquivos e Uso, e Composer Hub integrado (/ e !).
              </p>
            </button>

            <!-- Option 2: UI Clássica -->
            <button
              type="button"
              class="flex flex-col text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                this.uiVersion === "classic"
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 ring-1 ring-[var(--primary)]"
                  : "border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
              }"
              @click=${() => this.handleSetUiVersion("classic")}
            >
              <div class="flex items-center justify-between w-full">
                <span class="text-sm font-bold text-foreground-900">Interface Clássica</span>
                ${this.uiVersion === "classic" ? html`<span class="text-emerald-500 font-bold">✓ Ativo</span>` : nothing}
              </div>
              <p class="text-xs text-foreground-600 mt-1">
                Layout clássico anterior em 3 colunas com painéis laterais de Git, Tarefas e Terminal legado.
              </p>
            </button>
          </div>
        </section>

        <!-- Card 1: Tema e Aparência -->
        <section
          class="p-5 md:p-6 rounded-3xl omp-settings-card flex flex-col gap-6"
          style="clip-path: var(--clip-path-squircle-28, none);"
        >
          <!-- Header with Theme Toggle -->
          <div class="flex items-center justify-between flex-wrap gap-3">
            <div class="flex items-center gap-3">
              <div class="size-10 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center text-[var(--primary)] shrink-0">
                ${renderPaletteIcon("size-5")}
              </div>
              <div class="flex flex-col gap-0.5">
                <div class="flex items-center gap-2">
                  <h3 class="text-base font-bold text-foreground-900">Aparência & Tema</h3>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/20">
                    UI Colors
                  </span>
                </div>
                <p class="text-xs text-foreground-600">Personalize o tema e as cores da interface baseadas no template "UI Colors" (OKLCH)</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="omp-settings-btn-subtle"
                @click=${() => this.dispatchEvent(new CustomEvent("toggle-theme", { bubbles: true, composed: true }))}
              >
                ${this.theme === "dark" ? renderSunIcon("size-4") : renderMoonIcon("size-4")}
                <span>Modo ${this.theme === "dark" ? "Escuro (Dark)" : "Claro (Light)"}</span>
              </button>
            </div>
          </div>

          <!-- Enable Switch & Reset Bar -->
          <div class="flex items-center justify-between p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex-wrap gap-2">
            <div class="flex items-center gap-3">
              ${this.renderToggleSwitch(this.uiColors.enabled, () => { this.handleUiColorsToggle(); })}
              <div class="flex flex-col">
                <span class="text-xs font-bold text-foreground-900">Ativar paleta dinâmica UI Colors</span>
                <span class="text-[11px] text-foreground-500">Aplica tons harmônicos de fundo, texto, bordas e botões em todo o OMP Web</span>
              </div>
            </div>
            <button
              type="button"
              class="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-foreground-600 hover:text-foreground-900 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
              @click=${() => { this.handleResetColors(); }}
              title="Restaurar valores padrão do UI Colors"
            >
              ${renderRefreshIcon("size-3.5")}
              <span>Restaurar Padrão</span>
            </button>
          </div>

          <!-- Sliders Section -->
          <div class="flex flex-col gap-4 pt-1">
            <!-- Chroma Slider Row -->
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center justify-between text-xs font-semibold text-foreground-800">
                <span>Saturação (Chroma)</span>
                <span class="text-foreground-500 font-mono text-[11px]">Valor: ${this.uiColors.chroma.toFixed(2)}</span>
              </div>
              <div class="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3">
                <span class="text-[11px] font-medium text-foreground-500 w-14">Neutral</span>
                <input
                  type="range"
                  class="ui-color-slider-chroma w-full"
                  min="0"
                  max="0.2"
                  step="0.01"
                  .value="${String(this.uiColors.chroma)}"
                  @input=${(e: Event) => {
                    const val = parseFloat((e.target as HTMLInputElement).value);
                    if (!isNaN(val)) this.handleChromaInput(val);
                  }}
                />
                <span class="text-[11px] font-medium text-foreground-500 w-10 text-right">Vivid</span>
                <input
                  type="number"
                  class="ui-color-number-input"
                  min="0"
                  max="0.2"
                  step="0.01"
                  .value="${String(this.uiColors.chroma)}"
                  @input=${(e: Event) => {
                    const val = parseFloat((e.target as HTMLInputElement).value);
                    if (!isNaN(val)) this.handleChromaInput(val);
                  }}
                />
              </div>
            </div>

            <!-- Hue Slider Row -->
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center justify-between text-xs font-semibold text-foreground-800">
                <span>Matiz da Cor (Hue)</span>
                <span class="text-foreground-500 font-mono text-[11px]">Ângulo: ${this.uiColors.hue}°</span>
              </div>
              <div class="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3">
                <span class="text-[11px] font-medium text-foreground-500 w-14">Quente</span>
                <input
                  type="range"
                  class="ui-color-slider-hue w-full"
                  min="0"
                  max="360"
                  step="1"
                  .value="${String(this.uiColors.hue)}"
                  @input=${(e: Event) => {
                    const val = parseFloat((e.target as HTMLInputElement).value);
                    if (!isNaN(val)) this.handleHueInput(val);
                  }}
                />
                <span class="text-[11px] font-medium text-foreground-500 w-10 text-right">Frio</span>
                <input
                  type="number"
                  class="ui-color-number-input"
                  min="0"
                  max="360"
                  step="1"
                  .value="${String(this.uiColors.hue)}"
                  @input=${(e: Event) => {
                    const val = parseFloat((e.target as HTMLInputElement).value);
                    if (!isNaN(val)) this.handleHueInput(val);
                  }}
                />
              </div>
            </div>
          </div>

          <!-- Preset Chips -->
          <div class="flex flex-col gap-2 pt-1 border-t border-black/5 dark:border-white/5">
            <span class="text-xs font-bold text-foreground-700">Paletas Prontas (Presets):</span>
            <div class="flex flex-wrap gap-2">
              ${UI_COLOR_PRESETS.map((p) => {
                const isActive = Math.abs(this.uiColors.hue - p.hue) <= 2 && Math.abs(this.uiColors.chroma - p.chroma) <= 0.01;
                return html`
                  <button
                    type="button"
                    class="px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 border transition-all cursor-pointer ${
                      isActive
                        ? "bg-black/10 dark:bg-white/15 border-foreground-400 font-bold shadow-xs scale-102"
                        : "bg-black/5 dark:bg-white/5 border-transparent hover:border-black/15 dark:hover:border-white/15 text-foreground-700"
                    }"
                    @click=${() => this.handlePresetClick(p)}
                    title="${p.description} (Hue: ${p.hue}, Chroma: ${p.chroma})"
                  >
                    <span
                      class="size-3 rounded-full shrink-0 shadow-xs"
                      style="background-color: oklch(0.65 ${p.chroma || 0.04} ${p.hue});"
                    ></span>
                    <span>${p.name}</span>
                  </button>
                `;
              })}
            </div>
          </div>

          <!-- Color Palette Swatches (matching UI Colors.html) -->
          <div class="flex flex-col gap-3 pt-2 border-t border-black/5 dark:border-white/5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-foreground-700">Paleta de Cores Calculada (OKLCH)</span>
              <span class="text-[11px] text-foreground-500 font-mono">Modo ${this.theme === "dark" ? "Dark" : "Light"}</span>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <!-- Backgrounds -->
              <div class="flex flex-col gap-1.5 p-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <span class="text-[10px] font-bold text-foreground-500 uppercase tracking-wider">Fundo</span>
                <div class="flex flex-col gap-1.5">
                  <div class="flex items-center gap-2">
                    <span class="w-8 h-6 rounded-lg shadow-xs border border-black/10 dark:border-white/15 shrink-0" style="background-color: var(--bg-dark);"></span>
                    <span class="text-[11px] font-mono text-foreground-700 truncate">bg-dark</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-8 h-6 rounded-lg shadow-xs border border-black/10 dark:border-white/15 shrink-0" style="background-color: var(--bg);"></span>
                    <span class="text-[11px] font-mono text-foreground-700 truncate">bg</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-8 h-6 rounded-lg shadow-xs border border-black/10 dark:border-white/15 shrink-0" style="background-color: var(--bg-light);"></span>
                    <span class="text-[11px] font-mono text-foreground-700 truncate">bg-light</span>
                  </div>
                </div>
              </div>

              <!-- Text -->
              <div class="flex flex-col gap-1.5 p-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <span class="text-[10px] font-bold text-foreground-500 uppercase tracking-wider">Texto</span>
                <div class="flex flex-col gap-1.5">
                  <div class="flex items-center gap-2">
                    <span class="w-8 h-6 rounded-lg shadow-xs border border-black/10 dark:border-white/15 shrink-0" style="background-color: var(--text);"></span>
                    <span class="text-[11px] font-mono text-foreground-700 truncate">text</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-8 h-6 rounded-lg shadow-xs border border-black/10 dark:border-white/15 shrink-0" style="background-color: var(--text-muted);"></span>
                    <span class="text-[11px] font-mono text-foreground-700 truncate">text-muted</span>
                  </div>
                </div>
              </div>

              <!-- Border -->
              <div class="flex flex-col gap-1.5 p-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <span class="text-[10px] font-bold text-foreground-500 uppercase tracking-wider">Bordas</span>
                <div class="flex flex-col gap-1.5">
                  <div class="flex items-center gap-2">
                    <span class="w-8 h-6 rounded-lg shadow-xs border border-black/10 dark:border-white/15 shrink-0" style="background-color: var(--highlight);"></span>
                    <span class="text-[11px] font-mono text-foreground-700 truncate">highlight</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-8 h-6 rounded-lg shadow-xs border border-black/10 dark:border-white/15 shrink-0" style="background-color: var(--border);"></span>
                    <span class="text-[11px] font-mono text-foreground-700 truncate">border</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-8 h-6 rounded-lg shadow-xs border border-black/10 dark:border-white/15 shrink-0" style="background-color: var(--border-muted);"></span>
                    <span class="text-[11px] font-mono text-foreground-700 truncate">border-muted</span>
                  </div>
                </div>
              </div>

              <!-- Action -->
              <div class="flex flex-col gap-1.5 p-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <span class="text-[10px] font-bold text-foreground-500 uppercase tracking-wider">Ações</span>
                <div class="flex flex-col gap-1.5">
                  <div class="flex items-center gap-2">
                    <span class="w-8 h-6 rounded-lg shadow-xs border border-black/10 dark:border-white/15 shrink-0" style="background-color: var(--primary);"></span>
                    <span class="text-[11px] font-mono text-foreground-700 truncate">primary</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-8 h-6 rounded-lg shadow-xs border border-black/10 dark:border-white/15 shrink-0" style="background-color: var(--secondary);"></span>
                    <span class="text-[11px] font-mono text-foreground-700 truncate">secondary</span>
                  </div>
                </div>
              </div>

              <!-- Alert -->
              <div class="flex flex-col gap-1.5 p-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <span class="text-[10px] font-bold text-foreground-500 uppercase tracking-wider">Alertas</span>
                <div class="flex flex-col gap-1.5">
                  <div class="flex items-center gap-2">
                    <span class="w-8 h-6 rounded-lg shadow-xs border border-black/10 dark:border-white/15 shrink-0" style="background-color: var(--danger);"></span>
                    <span class="text-[11px] font-mono text-foreground-700 truncate">danger</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-8 h-6 rounded-lg shadow-xs border border-black/10 dark:border-white/15 shrink-0" style="background-color: var(--warning);"></span>
                    <span class="text-[11px] font-mono text-foreground-700 truncate">warning</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-8 h-6 rounded-lg shadow-xs border border-black/10 dark:border-white/15 shrink-0" style="background-color: var(--success);"></span>
                    <span class="text-[11px] font-mono text-foreground-700 truncate">success</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-8 h-6 rounded-lg shadow-xs border border-black/10 dark:border-white/15 shrink-0" style="background-color: var(--info);"></span>
                    <span class="text-[11px] font-mono text-foreground-700 truncate">info</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Preview Cards from UI Colors.html -->
          <div class="flex flex-col gap-3 pt-2 border-t border-black/5 dark:border-white/5">
            <span class="text-xs font-bold text-foreground-700">Amostras de Componentes (Cards & Sombras)</span>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div class="ui-colors-preview-card p-4 flex flex-col gap-1">
                <h4 class="text-sm font-bold text-[var(--text)]">Contrast</h4>
                <p class="text-xs text-[var(--text-muted)]">Mix sharper headings with muted text</p>
              </div>
              <div class="ui-colors-preview-card p-4 flex flex-col gap-1">
                <h4 class="text-sm font-bold text-[var(--text)]">Gradients</h4>
                <p class="text-xs text-[var(--text-muted)]">Play with gradient background</p>
              </div>
              <div class="ui-colors-preview-card p-4 flex flex-col gap-1">
                <h4 class="text-sm font-bold text-[var(--text)]">Highlight</h4>
                <p class="text-xs text-[var(--text-muted)]">Use a lighter border to simulate light</p>
              </div>
              <div class="ui-colors-preview-card p-4 flex flex-col gap-1">
                <h4 class="text-sm font-bold text-[var(--text)]">Shadows</h4>
                <p class="text-xs text-[var(--text-muted)]">Shadows to add depth and elevation</p>
              </div>
            </div>
          </div>

          <!-- Bottom Action Buttons: Show Code & Show Alerts -->
          <div class="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-black/5 dark:border-white/5">
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  this.showCodeModal ? "bg-[var(--text)] text-[var(--bg-dark)] shadow-sm" : "bg-black/5 dark:bg-white/10 text-foreground-800 hover:bg-black/10 dark:hover:bg-white/15"
                }"
                @click=${() => { this.showCodeModal = !this.showCodeModal; }}
              >
                ${renderCopyIcon("size-3.5")}
                <span>${this.showCodeModal ? "Ocultar Código CSS" : "Ver Código CSS (OKLCH)"}</span>
              </button>

              <button
                type="button"
                class="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  this.showAlertsPreview ? "bg-[var(--primary)] text-white shadow-sm" : "bg-black/5 dark:bg-white/10 text-foreground-800 hover:bg-black/10 dark:hover:bg-white/15"
                }"
                @click=${() => { this.showAlertsPreview = !this.showAlertsPreview; }}
              >
                <span>${this.showAlertsPreview ? "Ocultar Alertas" : "Amostras de Alertas"}</span>
              </button>
            </div>
          </div>

          <!-- Code Modal Drawer -->
          ${this.showCodeModal
            ? html`
                <div class="flex flex-col gap-2 p-4 rounded-2xl bg-black/5 dark:bg-black/30 border border-black/10 dark:border-white/10 animate-in fade-in duration-200">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold font-mono text-foreground-800">Variáveis CSS (OKLCH - ${this.theme === "dark" ? "Dark" : "Light"})</span>
                    <button
                      type="button"
                      class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--primary)] text-white hover:opacity-90 flex items-center gap-1 transition-opacity cursor-pointer shadow-xs"
                      @click=${() => { void this.handleCopyCode(); }}
                    >
                      ${this.copiedCssCode ? renderCheckIcon("size-3") : renderCopyIcon("size-3")}
                      <span>${this.copiedCssCode ? "Copiado!" : "Copiar"}</span>
                    </button>
                  </div>
                  <pre class="p-3 rounded-xl bg-black/10 dark:bg-black/40 text-[11px] font-mono text-foreground-800 overflow-x-auto select-all leading-relaxed">${formatCssVarsText(
                    resolveUiColorVars(this.uiColors.hue, this.uiColors.chroma, this.theme === "light")
                  )}</pre>
                </div>
              `
            : nothing}

          <!-- Alerts Preview Drawer -->
          ${this.showAlertsPreview
            ? html`
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-black/5 dark:bg-black/30 border border-black/10 dark:border-white/10 animate-in fade-in duration-200">
                  <div class="p-3.5 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 flex flex-col gap-1">
                    <div class="flex items-center gap-2 text-[var(--danger)] font-bold text-xs">
                      <span class="size-2 rounded-full bg-[var(--danger)]"></span>
                      <h4>Falha no pagamento (Danger)</h4>
                    </div>
                    <p class="text-[11px] text-foreground-700">Sua conta será suspensa em 48 horas se não houver regularização.</p>
                  </div>

                  <div class="p-3.5 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/10 flex flex-col gap-1">
                    <div class="flex items-center gap-2 text-[var(--warning)] font-bold text-xs">
                      <span class="size-2 rounded-full bg-[var(--warning)]"></span>
                      <h4>Plano expirando em breve (Warning)</h4>
                    </div>
                    <p class="text-[11px] text-foreground-700">Seu plano expira em 3 dias. Renove para não perder benefícios.</p>
                  </div>

                  <div class="p-3.5 rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/10 flex flex-col gap-1">
                    <div class="flex items-center gap-2 text-[var(--success)] font-bold text-xs">
                      <span class="size-2 rounded-full bg-[var(--success)]"></span>
                      <h4>Backup concluído (Success)</h4>
                    </div>
                    <p class="text-[11px] text-foreground-700">Todas as configurações e sessões foram salvas com sucesso!</p>
                  </div>

                  <div class="p-3.5 rounded-xl border border-[var(--info)]/30 bg-[var(--info)]/10 flex flex-col gap-1">
                    <div class="flex items-center gap-2 text-[var(--info)] font-bold text-xs">
                      <span class="size-2 rounded-full bg-[var(--info)]"></span>
                      <h4>Novo recurso disponível (Info)</h4>
                    </div>
                    <p class="text-[11px] text-foreground-700">Experimente os novos modelos de raciocínio profundo no chat.</p>
                  </div>
                </div>
              `
            : nothing}
        </section>

        <!-- Card: Provedores de IA (Model Providers) -->
        <section
          class="p-5 md:p-6 rounded-3xl omp-settings-card flex flex-col gap-4"
          style="clip-path: var(--clip-path-squircle-28, none);"
        >
          <div class="flex items-center justify-between flex-wrap gap-3">
            <div class="flex flex-col gap-0.5">
              <h3 class="text-base font-bold text-foreground-900">Provedores de Inteligência Artificial</h3>
              <p class="text-xs text-foreground-600">Configure chaves de API e assinaturas OAuth (Anthropic, OpenAI, Google, etc.)</p>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="omp-settings-btn-subtle"
                @click=${() => this.dispatchEvent(new CustomEvent("configure-auth", { bubbles: true, composed: true }))}
              >
                ${renderLockIcon("size-4")}
                <span>Configurar Provedores</span>
              </button>
              <button
                type="button"
                class="omp-settings-btn-subtle text-red-500 hover:text-red-600"
                @click=${() => this.dispatchEvent(new CustomEvent("logout-auth", { bubbles: true, composed: true }))}
                title="Desconectar provedor de IA"
              >
                <span>Desconectar</span>
              </button>
            </div>
          </div>
        </section>

        <!-- Card 2: Preferências de Exibição do Chat -->
        <section
          class="p-5 md:p-6 rounded-3xl omp-settings-card flex flex-col gap-4"
          style="clip-path: var(--clip-path-squircle-28, none);"
        >
          <div class="flex flex-col gap-0.5">
            <h3 class="text-base font-bold text-foreground-900">Exibição do Chat</h3>
            <p class="text-xs text-foreground-600">Personalize o que é renderizado nas respostas e status do agente</p>
          </div>

          <div class="flex flex-col omp-settings-divide">
            <!-- Show Thinking -->
            <div class="flex items-center justify-between py-3">
              <div class="flex flex-col pr-4">
                <span class="text-sm font-semibold text-foreground-800">Raciocínio do Modelo</span>
                <span class="text-xs text-foreground-500">Exibir bloco expansível de raciocínio (thinking)</span>
              </div>
              ${this.renderToggleSwitch(this.chatPrefs.showThinking, () => { this.updateChatPref("showThinking"); })}
            </div>

            <!-- Show Tool Executions -->
            <div class="flex items-center justify-between py-3">
              <div class="flex flex-col pr-4">
                <span class="text-sm font-semibold text-foreground-800">Execuções de Ferramentas</span>
                <span class="text-xs text-foreground-500">Mostrar detalhes e retornos das tool calls acionadas</span>
              </div>
              ${this.renderToggleSwitch(this.chatPrefs.showToolExecutions, () => { this.updateChatPref("showToolExecutions"); })}
            </div>

            <!-- Estilo do Progresso de Ferramentas -->
            <div class="flex items-center justify-between py-3">
              <div class="flex flex-col pr-4">
                <span class="text-sm font-semibold text-foreground-800">Estilo de Progresso do Agente</span>
                <span class="text-xs text-foreground-500">Alternar entre etapas verticais conectadas (Steps) ou pílulas compactas (Minimal)</span>
              </div>
              <div class="inline-flex rounded-xl p-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-xs font-medium">
                <button
                  type="button"
                  class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${this.chatPrefs.progressStyle === "steps" ? "bg-accent-250 dark:bg-accent-200 text-foreground-900 font-semibold shadow-xs" : "text-foreground-500 hover:text-foreground-800"}"
                  @click=${() => this.setProgressStyle("steps")}
                >
                  Etapas (Steps)
                </button>
                <button
                  type="button"
                  class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${this.chatPrefs.progressStyle === "minimal" ? "bg-accent-250 dark:bg-accent-200 text-foreground-900 font-semibold shadow-xs" : "text-foreground-500 hover:text-foreground-800"}"
                  @click=${() => this.setProgressStyle("minimal")}
                >
                  Minimalista
                </button>
              </div>
            </div>

            <!-- Show Events -->
            <div class="flex items-center justify-between py-3">
              <div class="flex flex-col pr-4">
                <span class="text-sm font-semibold text-foreground-800">Eventos de Sessão</span>
                <span class="text-xs text-foreground-500">Mostrar logs de ciclo de vida e eventos de grupo</span>
              </div>
              ${this.renderToggleSwitch(this.chatPrefs.showEvents, () => { this.updateChatPref("showEvents"); })}
            </div>

            <!-- Vim Mode -->
            <div class="flex items-center justify-between py-3">
              <div class="flex flex-col pr-4">
                <span class="text-sm font-semibold text-foreground-800">Modo Vim</span>
                <span class="text-xs text-foreground-500">Habilitar atalhos e keybindings Vim no editor de código</span>
              </div>
              ${this.renderToggleSwitch(this.chatPrefs.vimMode, () => { this.updateChatPref("vimMode"); })}
            </div>
          </div>
        </section>

        <!-- Card 3: Servidor Gateway -->
        <section
          class="p-5 md:p-6 rounded-3xl omp-settings-card flex flex-col gap-4"
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
                  class="omp-settings-input font-mono"
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
                  class="omp-settings-input font-mono"
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
                class="omp-settings-input font-sans"
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
                      class="omp-settings-input font-mono mt-1"
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
                class="omp-settings-btn-primary"
              >
                ${this.saving ? "Salvando…" : "Salvar Configurações do Gateway"}
              </button>
            </div>
          </form>
        </section>

        <!-- Card 4: Autenticação -->
        <section
          class="p-5 md:p-6 rounded-3xl omp-settings-card flex flex-col gap-3"
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
          class="p-5 md:p-6 rounded-3xl omp-settings-card flex flex-col gap-4"
          style="clip-path: var(--clip-path-squircle-28, none);"
        >
          <div class="flex flex-col gap-0.5">
            <h3 class="text-base font-bold text-foreground-900">Autonomia & Subagentes</h3>
            <p class="text-xs text-foreground-600">Controle a capacidade do agente de orquestrar novas sessões e filhos</p>
          </div>

          <div class="flex flex-col omp-settings-divide">
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
          class="p-5 md:p-6 rounded-3xl omp-settings-card flex flex-col gap-4"
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
                class="omp-settings-input font-mono"
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
                class="omp-settings-input font-mono"
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
                class="omp-settings-btn-primary"
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
          class="p-5 md:p-6 rounded-3xl omp-settings-card flex flex-col gap-4"
          style="clip-path: var(--clip-path-squircle-28, none);"
        >
          <div class="flex items-center justify-between">
            <div class="flex flex-col gap-0.5">
              <h3 class="text-base font-bold text-foreground-900">Plugins do OMP Web</h3>
              <p class="text-xs text-foreground-600">Extensões ativas carregadas no gateway e sessões</p>
            </div>
            <button
              type="button"
              class="omp-settings-btn-subtle"
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
                <div class="flex flex-col omp-settings-divide">
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
          class="p-5 md:p-6 rounded-3xl omp-settings-card flex flex-col gap-4"
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
              class="omp-settings-input font-mono flex-1"
              .value=${this.newPackageSource}
              @input=${(e: Event) => {
        this.newPackageSource = (e.target as HTMLInputElement).value;
      }}
            />
            <button
              type="submit"
              ?disabled=${this.installingPackage || !this.newPackageSource.trim()}
              class="omp-settings-btn-primary shrink-0"
            >
              ${renderPlusIcon("size-3.5")}
              <span>${this.installingPackage ? "Instalando…" : "Instalar"}</span>
            </button>
          </form>
        </section>

        <!-- Lista de Pacotes -->
        <section
          class="p-5 md:p-6 rounded-3xl omp-settings-card flex flex-col gap-4"
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
                class="omp-settings-btn-subtle disabled:opacity-50"
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
                <div class="flex flex-col omp-settings-divide">
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
          class="p-5 md:p-6 rounded-3xl omp-settings-card flex flex-col gap-4"
          style="clip-path: var(--clip-path-squircle-28, none);"
        >
          <div class="flex flex-col gap-0.5">
            <h3 class="text-base font-bold text-foreground-900">Atalhos de Teclado</h3>
            <p class="text-xs text-foreground-600">Comandos rápidos para aumentar sua produtividade no OMP Web</p>
          </div>

          <div class="flex flex-col omp-settings-divide mt-2">
            ${shortcuts.map(
      (item) => html`
                <div class="flex items-center justify-between py-3 gap-4">
                  <span class="text-xs text-foreground-700">${item.desc}</span>
                  <kbd class="omp-settings-kbd">
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
            <div
              class="w-full mt-2"
              role="tabpanel"
              id="settings-panel-${this.activeSection}"
              aria-labelledby="settings-tab-${this.activeSection}"
              tabindex="0"
            >
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
