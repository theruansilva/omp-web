import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { Workspace, FileTreeEntry, FileContentResponse } from "../api";
import { workspacesApi, filesApi } from "../api/clients";
import { workspaceFileRawUrl, workspaceImagePreviewUrl } from "../api/urls";
import {
  renderFolderIcon,
  renderDocumentIcon,
  renderCloseIcon,
  renderRefreshIcon,
  renderBranchIcon,
  renderCopyIcon,
  renderCheckIcon,
  renderArrowLeftIcon,
} from "./icons";

@customElement("omp-files-view")
export class OmpFilesView extends LitElement {
  @property({ attribute: false }) workspace?: Workspace;
  @property({ type: String }) machineId = "local";
  @property({ type: String }) projectId?: string;

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

  private formatBytes(bytes?: number): string {
    if (!bytes || bytes <= 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  override render() {
    if (!this.workspace) {
      return html`
        <div class="size-full flex flex-col items-center justify-center p-6 text-center select-none">
          <div class="size-16 rounded-3xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center mb-4 text-foreground-450">
            ${renderFolderIcon("size-8")}
          </div>
          <h2 class="text-xl font-bold text-foreground-800 mb-1">Nenhum Workspace Ativo</h2>
          <p class="text-sm text-foreground-500 max-w-sm">
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
      <div class="size-full flex flex-col overflow-hidden bg-background-light dark:bg-background-dark font-sans select-none">
        <!-- Header -->
        <header class="h-14 px-4 sm:px-6 border-b border-black/8 dark:border-white/8 flex items-center justify-between shrink-0 bg-white/40 dark:bg-background-100/40 backdrop-blur-xl">
          <div class="flex items-center gap-3 min-w-0">
            <div class="size-9 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 text-foreground-800">
              ${renderFolderIcon("size-4.5")}
            </div>
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-foreground-900 tracking-tight leading-tight">Arquivos</span>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono bg-black/5 dark:bg-white/8 text-foreground-600 border border-black/5 dark:border-white/8">
                  ${renderBranchIcon("size-3")}
                  <span>${this.workspace.branch || this.workspace.name || "main"}</span>
                </span>
              </div>
              <span class="text-[11px] font-mono text-foreground-500 truncate leading-tight mt-0.5">
                ${this.workspace.path}${this.currentPath ? `/${this.currentPath}` : ""}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              type="button"
              class="size-8 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center text-foreground-600 hover:text-foreground-900 dark:hover:text-white transition-colors cursor-pointer"
              @click=${() => void this.loadTree()}
              title="Recarregar arquivos"
            >
              ${renderRefreshIcon("size-4")}
            </button>
            <button
              type="button"
              class="size-8 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center text-foreground-600 hover:text-foreground-900 dark:hover:text-white transition-colors cursor-pointer"
              @click=${() => this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }))}
              title="Voltar para o chat"
            >
              ${renderCloseIcon("size-4")}
            </button>
          </div>
        </header>

        <!-- Body: 2-Column Split -->
        <div class="flex-1 w-full min-h-0 flex flex-col md:flex-row overflow-hidden">
          <!-- Left Column: File Explorer Tree -->
          <div class="w-full md:w-80 md:min-w-80 border-b md:border-b-0 md:border-e border-black/8 dark:border-white/8 flex flex-col shrink-0 bg-white/20 dark:bg-background-150/20">
            <!-- Search & Navigation -->
            <div class="p-3 border-b border-black/5 dark:border-white/5 flex flex-col gap-2">
              <input
                type="text"
                placeholder="Filtrar arquivos..."
                .value=${this.searchQuery}
                @input=${(e: Event) => {
        this.searchQuery = (e.target as HTMLInputElement).value;
      }}
                class="w-full px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/8 border border-black/8 dark:border-white/10 text-xs text-foreground-800 placeholder:text-foreground-450 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
              />
              ${this.currentPath
        ? html`
                    <button
                      type="button"
                      class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-foreground-600 hover:text-foreground-900 hover:bg-black/5 dark:hover:bg-white/8 transition-colors cursor-pointer"
                      @click=${() => this.handleGoUp()}
                    >
                      ${renderArrowLeftIcon("size-3")}
                      <span>Subir nível</span>
                      <span class="text-[10px] font-mono opacity-60 truncate">/${this.currentPath}</span>
                    </button>
                  `
        : nothing}
            </div>

            <!-- Entries List -->
            <div class="flex-1 overflow-y-auto p-2 space-y-0.5">
              ${this.loading
        ? html`<div class="p-4 text-xs text-center text-foreground-450 font-mono">Carregando arquivos...</div>`
        : this.error
          ? html`<div class="p-4 text-xs text-center text-red-500 font-mono">${this.error}</div>`
          : filtered.length === 0
            ? html`<div class="p-4 text-xs text-center text-foreground-450 font-mono">Nenhum arquivo encontrado</div>`
            : filtered.map((entry) => {
              const isSelected = this.selectedPath === entry.path;
              const isDir = entry.type === "directory";
              return html`
                          <button
                            type="button"
                            class="group flex w-full items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${isSelected
                  ? "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold"
                  : "hover:bg-black/5 dark:hover:bg-white/8 text-foreground-800"
                }"
                            @click=${() => void this.handleSelectEntry(entry)}
                          >
                            <div class="flex items-center gap-2 min-w-0">
                              <span class="shrink-0 ${isDir ? "text-amber-500" : "text-foreground-500"}">
                                ${isDir ? renderFolderIcon("size-4") : renderDocumentIcon("size-4")}
                              </span>
                              <span class="truncate font-mono text-[12px]">${entry.name}</span>
                            </div>
                            ${entry.size !== undefined && !isDir
                  ? html`<span class="text-[10px] font-mono text-foreground-400 shrink-0">${this.formatBytes(entry.size)}</span>`
                  : nothing}
                          </button>
                        `;
            })}
            </div>
          </div>

          <!-- Right Column: File Preview / Code Viewer -->
          <div class="flex-1 min-w-0 flex flex-col overflow-hidden bg-white/40 dark:bg-background-100/30">
            ${this.loadingFile
        ? html`
                  <div class="size-full flex items-center justify-center text-xs font-mono text-foreground-450">
                    Carregando arquivo...
                  </div>
                `
        : this.selectedFile
          ? html`
                    <!-- Viewer Header -->
                    <div class="h-11 px-4 border-b border-black/8 dark:border-white/8 flex items-center justify-between shrink-0 bg-white/30 dark:bg-background-150/30 backdrop-blur-md">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="font-mono text-xs font-bold text-foreground-800 truncate">${this.selectedFile.path}</span>
                        <span class="text-[10px] font-mono text-foreground-450 px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/8 border border-black/5 dark:border-white/8">
                          ${this.formatBytes(this.selectedFile.size)}
                        </span>
                      </div>
                      <div class="flex items-center gap-1.5 shrink-0">
                        ${!this.selectedFile.binary
              ? html`
                              <button
                                type="button"
                                class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-foreground-700 transition-colors cursor-pointer"
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
                                class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-foreground-700 transition-colors"
                              >
                                Download
                              </a>
                            `
              : nothing}
                      </div>
                    </div>

                    <!-- Viewer Content -->
                    <div class="flex-1 min-h-0 overflow-auto p-4 select-text">
                      ${isImage && imageUrl
              ? html`
                            <div class="size-full flex items-center justify-center p-4">
                              <img
                                src=${imageUrl}
                                alt=${this.selectedFile.path}
                                class="max-w-full max-h-full object-contain rounded-xl shadow-lg border border-black/10 dark:border-white/10"
                              />
                            </div>
                          `
              : this.selectedFile.binary
                ? html`
                              <div class="size-full flex flex-col items-center justify-center text-center p-6 text-foreground-500 select-none">
                                <div class="size-12 rounded-2xl bg-black/5 dark:bg-white/8 flex items-center justify-center mb-2">
                                  ${renderDocumentIcon("size-6")}
                                </div>
                                <span class="text-sm font-semibold">Arquivo Binário</span>
                                <span class="text-xs text-foreground-450 mt-1 font-mono">${this.formatBytes(this.selectedFile.size)}</span>
                              </div>
                            `
                : html`
                              <pre class="font-mono text-xs leading-relaxed text-foreground-800 whitespace-pre-wrap break-all">${this.selectedFile.content}</pre>
                            `}
                    </div>
                  `
          : html`
                    <div class="size-full flex flex-col items-center justify-center text-center p-6 text-foreground-450 select-none">
                      <div class="size-12 rounded-2xl bg-black/5 dark:bg-white/8 flex items-center justify-center mb-3">
                        ${renderDocumentIcon("size-6")}
                      </div>
                      <span class="text-sm font-semibold text-foreground-700">Nenhum arquivo selecionado</span>
                      <span class="text-xs text-foreground-450 mt-0.5">Clique em um arquivo na lista lateral para visualizar</span>
                    </div>
                  `}
          </div>
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
