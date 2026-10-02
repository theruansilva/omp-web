import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { Workspace, FileTreeEntry, FileContentResponse } from "../api";
import { workspacesApi, filesApi } from "../api/clients";
import { workspaceFileRawUrl, workspaceImagePreviewUrl } from "../api/urls";
import {
  renderFolderIcon,
  renderDocumentIcon,
  renderRefreshIcon,
  renderCopyIcon,
  renderCheckIcon,
  renderArrowLeftIcon,
} from "./icons";

@customElement("omp-files-view")
export class OmpFilesView extends LitElement {
  @property({ attribute: false }) workspace?: Workspace;
  @property({ type: String }) machineId = "local";
  @property({ type: String }) projectId?: string;
  @property({ type: Boolean }) isSidebarOpen = true;

  @state() private currentPath = "";
  @state() private entries: FileTreeEntry[] = [];
  @state() private selectedFile?: FileContentResponse;
  @state() private selectedPath?: string;
  @state() private loading = false;
  @state() private loadingFile = false;
  @state() private searchQuery = "";
  @state() private error?: string;
  @state() private copied = false;

  protected override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    void this.loadTree();
  }

  override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has("workspace") || changedProperties.has("machineId")) {
      this.currentPath = "";
      this.selectedFile = undefined;
      this.selectedPath = undefined;
      void this.loadTree();
    }
  }

  private async loadTree(path = this.currentPath) {
    if (!this.workspace) return;
    this.loading = true;
    this.error = undefined;
    const pId = this.projectId || this.workspace.projectId;
    const wId = this.workspace.id;

    try {
      if (pId && wId) {
        const res = await workspacesApi.workspaceTree(pId, wId, path, this.machineId);
        this.currentPath = path;
        this.entries = Array.isArray(res) ? res : (res?.entries || []);
      } else {
        const files = await filesApi.files(this.workspace.path, this.searchQuery, {
          machineId: this.machineId,
        });
        this.entries = (files || []).map((f) => ({
          name: f.path.split("/").pop() || f.path,
          path: f.path,
          type: f.kind === "directory" ? "directory" : "file",
        }));
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
      this.entries = [];
    } finally {
      this.loading = false;
    }
  }

  private async handleSelectEntry(entry: FileTreeEntry) {
    if (entry.type === "directory") {
      await this.loadTree(entry.path);
      return;
    }

    if (!this.workspace) return;
    const pId = this.projectId || this.workspace.projectId;
    const wId = this.workspace.id;
    if (!pId || !wId) return;

    this.selectedPath = entry.path;
    this.loadingFile = true;
    try {
      const file = await workspacesApi.workspaceFile(pId, wId, entry.path, this.machineId);
      this.selectedFile = file;
    } catch (err) {
      this.selectedFile = {
        path: entry.path,
        content: `Erro ao carregar arquivo: ${String(err)}`,
        size: 0,
        binary: false,
      };
    } finally {
      this.loadingFile = false;
    }
  }

  private handleGoUp() {
    if (!this.currentPath) return;
    const segments = this.currentPath.split("/").filter(Boolean);
    segments.pop();
    void this.loadTree(segments.join("/"));
  }

  private async handleCopyContent() {
    if (!this.selectedFile?.content) return;
    try {
      await navigator.clipboard.writeText(this.selectedFile.content);
      this.copied = true;
      this.requestUpdate();
      setTimeout(() => {
        this.copied = false;
        this.requestUpdate();
      }, 2000);
    } catch {
      // ignore
    }
  }

  private getFileColor(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    switch (ext) {
      case "ts":
      case "tsx":
      case "js":
      case "jsx":
      case "mjs":
      case "cjs":
        return "text-sky-500 dark:text-sky-400";
      case "css":
      case "scss":
      case "sass":
      case "less":
        return "text-purple-500 dark:text-purple-400";
      case "json":
      case "yaml":
      case "yml":
      case "toml":
      case "xml":
        return "text-amber-500 dark:text-amber-400";
      case "md":
      case "markdown":
      case "txt":
      case "doc":
        return "text-emerald-500 dark:text-emerald-400";
      case "py":
      case "sh":
      case "bash":
      case "zsh":
      case "fish":
        return "text-teal-500 dark:text-teal-400";
      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
      case "svg":
      case "webp":
        return "text-rose-500 dark:text-rose-400";
      case "html":
      case "htm":
        return "text-orange-500 dark:text-orange-400";
      case "lock":
        return "text-stone-400 dark:text-stone-500";
      default:
        return "text-[var(--omp-text-muted)]";
    }
  }

  private formatBytes(bytes?: number): string {
    if (!bytes || bytes <= 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  override render() {
    if (!this.workspace) {
      return html`
        <div class="size-full flex flex-col items-center justify-center p-6 text-center select-none text-[var(--omp-text-secondary)] ${!this.isSidebarOpen ? "pt-14" : ""}">
          <div class="size-16 rounded-3xl omp-settings-card flex items-center justify-center mb-4 text-[var(--omp-text-muted)]">
            ${renderFolderIcon("size-8")}
          </div>
          <h2 class="text-xl font-bold text-[var(--omp-text-primary)] mb-1">Nenhum Workspace Ativo</h2>
          <p class="text-sm opacity-80 max-w-sm">
            Selecione um projeto e workspace na barra lateral para explorar os arquivos.
          </p>
        </div>
      `;
    }

    const filtered = this.searchQuery.trim()
      ? this.entries.filter((e) => e.name.toLowerCase().includes(this.searchQuery.trim().toLowerCase()))
      : this.entries;

    const pId = this.projectId || this.workspace.projectId || "";
    const wId = this.workspace.id || "";
    const rawUrl = this.selectedPath && pId && wId ? workspaceFileRawUrl(pId, wId, this.selectedPath, { machineId: this.machineId }) : "";
    const isImage = this.selectedFile?.mediaType === "image";
    const imageUrl = this.selectedPath && pId && wId && isImage
      ? workspaceImagePreviewUrl(pId, wId, this.selectedPath, { machineId: this.machineId })
      : "";

    return html`
      <div class="size-full flex flex-col md:flex-row overflow-hidden select-none font-sans p-2 sm:p-3 gap-3 ${!this.isSidebarOpen ? "pt-12 sm:pt-14" : ""}">
        <!-- Left: File Explorer Panel -->
        <div
          class="w-full md:w-80 md:min-w-80 omp-settings-card rounded-2xl sm:rounded-3xl flex flex-col shrink-0 overflow-hidden shadow-xs"
          style="clip-path: var(--clip-path-squircle-28, none);"
        >
          <!-- Explorer Top Bar -->
          <div class="p-3 border-b border-black/8 dark:border-white/8 flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5 min-w-0">
                ${renderFolderIcon("size-4 text-[var(--omp-primary)]")}
                <span class="text-xs font-bold text-[var(--omp-text-primary)] truncate">
                  ${this.currentPath ? `/${this.currentPath}` : (this.workspace.name || "Arquivos")}
                </span>
              </div>
              <button
                type="button"
                class="size-7 rounded-xl hover:bg-black/5 dark:hover:bg-white/8 flex items-center justify-center text-[var(--omp-text-secondary)] hover:text-[var(--omp-text-primary)] transition-colors cursor-pointer"
                @click=${() => void this.loadTree()}
                title="Recarregar"
              >
                ${renderRefreshIcon("size-3.5")}
              </button>
            </div>

            <input
              type="text"
              placeholder="Filtrar arquivos..."
              .value=${this.searchQuery}
              @input=${(e: Event) => {
        this.searchQuery = (e.target as HTMLInputElement).value;
      }}
              class="w-full px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 text-xs text-[var(--omp-text-primary)] placeholder:text-[var(--omp-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--omp-primary)]"
            />

            ${this.currentPath
        ? html`
                  <button
                    type="button"
                    class="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold text-[var(--omp-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    @click=${() => this.handleGoUp()}
                  >
                    ${renderArrowLeftIcon("size-3")}
                    <span>Voltar pasta</span>
                  </button>
                `
        : nothing}
          </div>

          <!-- Entries List -->
          <div class="flex-1 overflow-y-auto p-2 space-y-0.5">
            ${this.loading
        ? html`<div class="p-4 text-xs text-center text-[var(--omp-text-muted)] font-mono">Carregando...</div>`
        : this.error
          ? html`<div class="p-4 text-xs text-center text-red-500 font-mono">${this.error}</div>`
          : filtered.length === 0
            ? html`<div class="p-4 text-xs text-center text-[var(--omp-text-muted)] font-mono">Vazio</div>`
            : filtered.map((entry) => {
              const isSelected = this.selectedPath === entry.path;
              const isDir = entry.type === "directory";
              return html`
                        <button
                          type="button"
                          class="group flex w-full items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${isSelected
                  ? "bg-[var(--omp-primary)]/15 text-[var(--omp-primary)] font-bold"
                  : "hover:bg-black/5 dark:hover:bg-white/5 text-[var(--omp-text-primary)]"
                }"
                          @click=${() => void this.handleSelectEntry(entry)}
                        >
                          <div class="flex items-center gap-2 min-w-0">
                            <span class="shrink-0 ${isDir ? "text-amber-500 dark:text-amber-400" : this.getFileColor(entry.name)}">
                              ${isDir ? renderFolderIcon("size-4") : renderDocumentIcon("size-4")}
                            </span>
                            <span class="truncate font-mono text-[12px]">${entry.name}</span>
                          </div>
                          ${entry.size !== undefined && !isDir
                  ? html`<span class="text-[10px] font-mono opacity-60 shrink-0 text-[var(--omp-text-muted)]">${this.formatBytes(entry.size)}</span>`
                  : nothing}
                        </button>
                      `;
            })}
          </div>
        </div>

        <!-- Right: File Viewer / Editor -->
        <div
          class="flex-1 min-w-0 omp-settings-card rounded-2xl sm:rounded-3xl flex flex-col overflow-hidden shadow-xs"
          style="clip-path: var(--clip-path-squircle-28, none);"
        >
          ${this.loadingFile
        ? html`
                <div class="size-full flex items-center justify-center text-xs font-mono text-[var(--omp-text-muted)]">
                  Carregando arquivo...
                </div>
              `
        : this.selectedFile
          ? html`
                  <!-- File Action Bar -->
                  <div class="h-12 px-4 border-b border-black/8 dark:border-white/8 flex items-center justify-between shrink-0">
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="${this.getFileColor(this.selectedFile.path)} shrink-0">
                        ${renderDocumentIcon("size-4")}
                      </span>
                      <span class="font-mono text-xs font-bold text-[var(--omp-text-primary)] truncate">${this.selectedFile.path}</span>
                      <span class="text-[10px] font-mono text-[var(--omp-text-muted)] px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/8">
                        ${this.formatBytes(this.selectedFile.size)}
                      </span>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                      ${!this.selectedFile.binary
              ? html`
                            <button
                              type="button"
                              class="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-[var(--omp-text-primary)] transition-colors cursor-pointer"
                              @click=${() => void this.handleCopyContent()}
                            >
                              ${this.copied ? renderCheckIcon("size-3.5 text-emerald-500") : renderCopyIcon("size-3.5")}
                              <span>${this.copied ? "Copiado!" : "Copiar"}</span>
                            </button>
                          `
              : nothing}
                      ${rawUrl
              ? html`
                            <a
                              href=${rawUrl}
                              target="_blank"
                              download
                              class="px-2.5 py-1 rounded-xl text-xs font-semibold bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-[var(--omp-text-primary)] transition-colors"
                            >
                              Baixar
                            </a>
                          `
              : nothing}
                    </div>
                  </div>

                  <!-- File Body -->
                  <div class="flex-1 min-h-0 overflow-auto p-4 select-text">
                    ${isImage && imageUrl
              ? html`
                          <div class="size-full flex items-center justify-center p-4">
                            <img
                              src=${imageUrl}
                              alt=${this.selectedFile.path}
                              class="max-w-full max-h-full object-contain rounded-2xl shadow-lg border border-black/10 dark:border-white/10"
                            />
                          </div>
                        `
              : this.selectedFile.binary
                ? html`
                            <div class="size-full flex flex-col items-center justify-center text-center p-6 text-[var(--omp-text-muted)] select-none">
                              <div class="size-12 rounded-2xl bg-black/5 dark:bg-white/8 flex items-center justify-center mb-2">
                                ${renderDocumentIcon("size-6")}
                              </div>
                              <span class="text-sm font-semibold text-[var(--omp-text-primary)]">Arquivo Binário</span>
                              <span class="text-xs opacity-60 mt-1 font-mono">${this.formatBytes(this.selectedFile.size)}</span>
                            </div>
                          `
                : html`
                            <pre class="font-mono text-xs leading-relaxed text-[var(--omp-text-primary)] whitespace-pre-wrap break-all">${this.selectedFile.content}</pre>
                          `}
                  </div>
                `
          : html`
                  <div class="size-full flex flex-col items-center justify-center text-center p-6 text-[var(--omp-text-muted)] select-none">
                    <div class="size-14 rounded-3xl bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 flex items-center justify-center mb-3">
                      ${renderDocumentIcon("size-7 opacity-60")}
                    </div>
                    <span class="text-sm font-semibold text-[var(--omp-text-primary)]">Selecione um arquivo</span>
                    <span class="text-xs opacity-75 mt-0.5">Navegue pelas pastas à esquerda para inspecionar</span>
                  </div>
                `}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "omp-files-view": OmpFilesView;
  }
}
