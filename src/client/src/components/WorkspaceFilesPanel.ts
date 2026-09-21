import { css, html, LitElement, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import type { FileContentResponse, FileTreeEntry } from "../api";
import { workspaceFileRawUrl, workspaceImagePreviewUrl } from "../api/urls";
import { workspaceUploadPath } from "../api/workspaceUploads";
import type { WorkspaceUploadBatchState, WorkspaceUploadFileState } from "../workspaceUploadState";
import { MAX_IMAGE_PREVIEW_BYTES, MAX_IMAGE_PREVIEW_LABEL } from "../../../shared/workspaceFiles";
import type { WorkspacePanelContext } from "../plugins/types";
import { workspacePanelStyles } from "./shared";
import { renderDownloadIcon, renderFileIcon, renderFolderIcon, renderGridViewIcon, renderListViewIcon, renderTreeChevron, renderUpFolderIcon } from "./fileIcons";

function filenameForPath(path: string): string {
  return path.split("/").pop() ?? path;
}

interface PendingWorkspaceUploadReview {
  files: File[];
}

export interface WorkspaceUploadScope {
  projectId: string;
  workspaceId: string;
  machineId: string;
}

const FILES_VIEW_MODE_STORAGE_KEY = "omp-web:files-view-mode";

export function loadFilesViewMode(): "grid" | "list" {
  try {
    const saved = localStorage.getItem(FILES_VIEW_MODE_STORAGE_KEY);
    if (saved === "list" || saved === "grid") return saved;
  } catch {
    // ignore
  }
  return "grid";
}

@customElement("workspace-files-panel")
export class WorkspaceFilesPanel extends LitElement {
  @property({ attribute: false }) context: WorkspacePanelContext | undefined;
  @query("#workspace-upload-input") private uploadInput?: HTMLInputElement;
  @state() private viewMode: "grid" | "list" = loadFilesViewMode();
  @state() private currentDir = "";
  @state() private pendingUpload: PendingWorkspaceUploadReview | undefined;
  @state() private destinationFolder = "";
  @state() private overwrite = false;
  @state() private createDirs = true;
  @state() private formError = "";
  @state() private dragActive = false;
  private dragDepth = 0;

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    if (!changedProperties.has("context")) return;
    const previous = changedProperties.get("context");
    if (previous !== undefined && this.context !== undefined && workspaceContextKey(previous) !== workspaceContextKey(this.context)) { this.resetPendingUpload(); this.currentDir = ""; }
  }

  override render(): TemplateResult {
    const context = this.context;
    if (context === undefined) return html`<p class="muted">Files unavailable.</p>`;
    return html`
      <section
        class=${this.dragActive ? "files-panel dragging" : "files-panel"}
        @dragenter=${this.handleDragEnter}
        @dragover=${this.handleDragOver}
        @dragleave=${this.handleDragLeave}
        @drop=${this.handleDrop}
      >
        <section class="toolbar">
          <strong>Files</strong>
          ${context.fileTreeStale ? html`<span class="stale">stale</span>` : null}
          <div class="toolbar-actions">
            <div class="view-mode-toggle" role="group" aria-label="View mode">
              <button
                class=${this.viewMode === "grid" ? "selected" : ""}
                title="Grid view"
                aria-label="Grid view"
                @click=${() => { this.setViewMode("grid"); }}
              >
                ${renderGridViewIcon()}
                <span>Grid</span>
              </button>
              <button
                class=${this.viewMode === "list" ? "selected" : ""}
                title="List view"
                aria-label="List view"
                @click=${() => { this.setViewMode("list"); }}
              >
                ${renderListViewIcon()}
                <span>List</span>
              </button>
            </div>
            <button @click=${this.openFilePicker}>Upload</button>
            <button @click=${context.onRefreshFiles}>Refresh</button>
          </div>
          <input id="workspace-upload-input" class="visually-hidden" type="file" multiple @change=${this.handleFileInputChange} />
        </section>
        ${this.renderUploadProgress(context)}
        <section class="split">
          <div class="file-browser ${this.viewMode}">
            ${this.viewMode === "grid"
              ? this.renderGridView(context)
              : this.renderListView(context)}
          </div>
          <div class="viewer">
            ${this.renderFileViewer(context)}
          </div>
        </section>
        <div class="drop-overlay" aria-hidden=${this.dragActive ? "false" : "true"}>
          <div>
            <strong>Drop files to upload</strong>
            <span>Uploads immediately to the default folder.</span>
          </div>
        </div>
        ${this.pendingUpload === undefined ? null : this.renderUploadDialog(context, this.pendingUpload)}
      </section>
    `;
  }

  private setViewMode(mode: "grid" | "list"): void {
    this.viewMode = mode;
    try {
      localStorage.setItem(FILES_VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }

  private renderListView(context: WorkspacePanelContext): TemplateResult {
    if (context.fileTree.length === 0) return html`<p class="muted" style="padding: 16px;">No files loaded.</p>`;
    return html`
      <div class="list tree">
        ${context.fileTree.map((entry) => this.renderTreeEntry(context, entry, 0))}
      </div>
    `;
  }

  private renderGridView(context: WorkspacePanelContext): TemplateResult {
    if (context.fileTree.length === 0) {
      return html`<p class="muted" style="padding: 16px;">No files loaded.</p>`;
    }

    const entries = this.currentDir === ""
      ? context.fileTree
      : context.expandedDirs[this.currentDir];

    if (entries === undefined) {
      context.onExpandDir(this.currentDir);
      return html`
        <div class="grid-container">
          ${this.renderGridBreadcrumbs(context)}
          <p class="muted" style="padding: 16px;">Loading ${this.currentDir}…</p>
        </div>
      `;
    }

    const sorted = [...entries].sort((a, b) => {
      if (a.type === "directory" && b.type !== "directory") return -1;
      if (a.type !== "directory" && b.type === "directory") return 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
    });

    return html`
      <div class="grid-container">
        ${this.renderGridBreadcrumbs(context)}
        <div class="grid-items">
          ${this.currentDir !== "" ? this.renderUpTile(context) : null}
          ${sorted.length === 0
            ? html`<p class="muted" style="grid-column: 1 / -1; padding: 12px; margin: 0;">Empty folder.</p>`
            : sorted.map((entry) => this.renderGridItem(context, entry))}
        </div>
      </div>
    `;
  }

  private renderUpTile(context: WorkspacePanelContext): TemplateResult {
    return html`
      <button
        class="grid-tile up-dir"
        @click=${() => { this.navigateUp(context); }}
        title="Go up to parent directory"
      >
        <span class="grid-tile-icon">${renderUpFolderIcon()}</span>
        <span class="grid-tile-label">..</span>
      </button>
    `;
  }

  private renderGridBreadcrumbs(context: WorkspacePanelContext): TemplateResult {
    const crumbs = this.getBreadcrumbs();
    return html`
      <div class="grid-breadcrumbs">
        <button
          class="breadcrumb-btn ${this.currentDir === "" ? "active" : ""}"
          @click=${() => { this.navigateToDir(context, ""); }}
          title="Root directory"
        >
          ${renderFolderIcon(this.currentDir === "")}
          <span>/</span>
        </button>
        ${crumbs.map((crumb, idx) => html`
          <span class="breadcrumb-sep">/</span>
          <button
            class="breadcrumb-btn ${idx === crumbs.length - 1 ? "active" : ""}"
            @click=${() => { this.navigateToDir(context, crumb.path); }}
            title=${crumb.path}
          >
            ${crumb.name}
          </button>
        `)}
      </div>
    `;
  }

  private renderGridItem(context: WorkspacePanelContext, entry: FileTreeEntry): TemplateResult {
    const isFile = entry.type !== "directory";
    const selected = isFile && context.selectedFilePath === entry.path;
    const downloadUrl = isFile
      ? workspaceFileRawUrl(context.workspace.projectId, context.workspace.id, entry.path, { machineId: context.machine.id })
      : undefined;

    return html`
      <div
        class="grid-tile ${selected ? "selected" : ""} ${isFile ? "is-file" : "is-folder"}"
        @click=${() => {
          if (isFile) {
            context.onSelectFile(entry.path);
          } else {
            this.navigateToDir(context, entry.path);
          }
        }}
        title=${entry.name}
      >
        <span class="grid-tile-icon">
          ${isFile ? renderFileIcon(entry.name) : renderFolderIcon(false)}
        </span>
        <span class="grid-tile-label">${entry.name}</span>
        ${isFile && downloadUrl !== undefined ? html`
          <a
            class="grid-tile-download"
            href=${downloadUrl}
            download=${entry.name}
            title=${`Download ${entry.name}`}
            aria-label=${`Download ${entry.name}`}
            target="_blank"
            rel="noopener"
            @click=${(event: MouseEvent) => { event.stopPropagation(); }}
          >${renderDownloadIcon()}</a>
        ` : null}
      </div>
    `;
  }

  private navigateToDir(context: WorkspacePanelContext, path: string): void {
    this.currentDir = path;
    if (path !== "" && context.expandedDirs[path] === undefined) {
      context.onExpandDir(path);
    }
  }

  private navigateUp(context: WorkspacePanelContext): void {
    if (this.currentDir === "") return;
    const segments = this.currentDir.split("/").filter(Boolean);
    segments.pop();
    const parentPath = segments.join("/");
    this.navigateToDir(context, parentPath);
  }

  private getBreadcrumbs(): Array<{ name: string; path: string }> {
    if (this.currentDir === "") return [];
    const parts = this.currentDir.split("/").filter(Boolean);
    const crumbs: Array<{ name: string; path: string }> = [];
    let acc = "";
    for (const part of parts) {
      acc = acc === "" ? part : `${acc}/${part}`;
      crumbs.push({ name: part, path: acc });
    }
    return crumbs;
  }

  private renderTreeEntry(context: WorkspacePanelContext, entry: FileTreeEntry, depth: number): TemplateResult {
    const children = context.expandedDirs[entry.path];
    const hasChildren = children !== undefined;
    const isFile = entry.type !== "directory";
    const selected = isFile && context.selectedFilePath === entry.path;
    const downloadUrl = isFile
      ? workspaceFileRawUrl(context.workspace.projectId, context.workspace.id, entry.path, { machineId: context.machine.id })
      : undefined;
    return html`
      <div class=${selected ? "tree-row selected" : "tree-row"}>
        <button class="row" style=${`--depth:${String(depth)}`} @click=${() => { this.selectTreeEntry(context, entry); }}>
          <span class=${isFile ? "tree-chevron spacer" : (hasChildren ? "tree-chevron expanded" : "tree-chevron collapsed")}>
            ${isFile ? null : renderTreeChevron(hasChildren)}
          </span>
          <span class="tree-icon">${isFile ? renderFileIcon(entry.name) : renderFolderIcon(hasChildren)}</span>
          <span class="tree-label">${entry.name}</span>
        </button>
        ${isFile && downloadUrl !== undefined ? html`
          <a
            class="tree-download-link"
            href=${downloadUrl}
            download=${entry.name}
            title=${`Download ${entry.name}`}
            aria-label=${`Download ${entry.name}`}
            target="_blank"
            rel="noopener"
            @click=${(event: MouseEvent) => { event.stopPropagation(); }}
          >${renderDownloadIcon()}</a>
        ` : null}
      </div>
      ${hasChildren ? children.map((child) => this.renderTreeEntry(context, child, depth + 1)) : null}
    `;
  }

  private selectTreeEntry(context: WorkspacePanelContext, entry: FileTreeEntry): void {
    if (entry.type === "directory") context.onExpandDir(entry.path);
    else context.onSelectFile(entry.path);
  }

  private renderFileViewer(context: WorkspacePanelContext): TemplateResult {
    const file = context.selectedFileContent;
    if (context.selectedFilePath === undefined || context.selectedFilePath === "") return html`<p class="muted">Select a file.</p>`;
    if (context.state.error !== "" && file === undefined) return html`
      <div class="viewer-header">
        <div class="viewer-title">
          <span class="tree-icon">${renderFileIcon(context.selectedFilePath)}</span>
          <strong>${context.selectedFilePath}</strong>
        </div>
        <small>Error</small>
      </div>
      <p class="muted dialog-error" style="margin: 16px;">${context.state.error}</p>
    `;
    if (file === undefined) return html`<p class="muted">Loading ${context.selectedFilePath}…</p>`;
    const downloadUrl = workspaceFileRawUrl(context.workspace.projectId, context.workspace.id, file.path, { machineId: context.machine.id });
    const filename = filenameForPath(file.path);

    if (file.mediaType === "image") return this.renderImageViewer(context, file, downloadUrl, filename);
    if (file.mediaType === "video") return this.renderVideoViewer(context, file, downloadUrl, filename);
    if (file.binary) return html`
      <div class="viewer-header">
        <div class="viewer-title">
          <span class="tree-icon">${renderFileIcon(file.path)}</span>
          <strong>${file.path}</strong>
        </div>
        <div class="viewer-actions">
          <small>binary · ${formatFileSize(file.size)}</small>
          <a class="download-button" href=${downloadUrl} download=${filename} target="_blank" rel="noopener">Download</a>
        </div>
      </div>
      <div class="binary-file-view">
        <p class="muted">Binary file: ${file.path} · ${formatFileSize(file.size)}</p>
        <a class="download-button primary" href=${downloadUrl} download=${filename} target="_blank" rel="noopener">Download ${filename}</a>
      </div>
    `;
    loadCodeViewer();
    return html`
      <div class="viewer-header">
        <div class="viewer-title">
          <span class="tree-icon">${renderFileIcon(file.path)}</span>
          <strong>${file.path}</strong>
        </div>
        <div class="viewer-actions">
          <small>${file.language ?? "text"}${file.truncated ? " · truncated" : ""}</small>
          <a class="download-button" href=${downloadUrl} download=${filename} target="_blank" rel="noopener">Download</a>
        </div>
      </div>
      <code-viewer .content=${file.content} .language=${file.language}></code-viewer>
    `;
  }

  private renderVideoViewer(context: WorkspacePanelContext, file: FileContentResponse, downloadUrl: string, filename: string): TemplateResult {
    const metadata = `${file.mimeType ?? "video"} · ${formatFileSize(file.size)}`;
    const src = workspaceImagePreviewUrl(context.workspace.projectId, context.workspace.id, file.path, { modifiedAt: file.modifiedAt, machineId: context.machine.id });
    return html`
      <div class="viewer-header">
        <div class="viewer-title">
          <span class="tree-icon">${renderFileIcon(file.path)}</span>
          <strong>${file.path}</strong>
        </div>
        <div class="viewer-actions">
          <small>${metadata}</small>
          <a class="download-button" href=${downloadUrl} download=${filename} target="_blank" rel="noopener">Download</a>
        </div>
      </div>
      <div class="video-preview" style="display: flex; justify-content: center; align-items: center; padding: 20px; background: var(--pi-bg); overflow: auto;">
        <video controls preload="metadata" style="max-width: 100%; max-height: 70vh; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
          <source src=${src} type=${file.mimeType ?? "video/mp4"}>
          Your browser does not support the video tag.
        </video>
      </div>
    `;
  }

  private renderImageViewer(context: WorkspacePanelContext, file: FileContentResponse, downloadUrl: string, filename: string): TemplateResult {
    const metadata = `${file.mimeType ?? "image"} · ${formatFileSize(file.size)}`;
    if (file.size > MAX_IMAGE_PREVIEW_BYTES) {
      return html`
        <div class="viewer-header">
          <div class="viewer-title">
            <span class="tree-icon">${renderFileIcon(file.path)}</span>
            <strong>${file.path}</strong>
          </div>
          <div class="viewer-actions">
            <small>${metadata}</small>
            <a class="download-button" href=${downloadUrl} download=${filename} target="_blank" rel="noopener">Download</a>
          </div>
        </div>
        <div class="binary-file-view">
          <p class="muted">Image too large to preview: ${formatFileSize(file.size)} · limit ${MAX_IMAGE_PREVIEW_LABEL}</p>
          <a class="download-button primary" href=${downloadUrl} download=${filename} target="_blank" rel="noopener">Download ${filename}</a>
        </div>
      `;
    }
    const src = workspaceImagePreviewUrl(context.workspace.projectId, context.workspace.id, file.path, { modifiedAt: file.modifiedAt, machineId: context.machine.id });
    return html`
      <div class="viewer-header">
        <div class="viewer-title">
          <span class="tree-icon">${renderFileIcon(file.path)}</span>
          <strong>${file.path}</strong>
        </div>
        <div class="viewer-actions">
          <small>${metadata}</small>
          <a class="download-button" href=${downloadUrl} download=${filename} target="_blank" rel="noopener">Download</a>
        </div>
      </div>
      <div class="image-preview">
        <img src=${src} alt=${file.path} decoding="async" />
      </div>
    `;
  }

  private renderUploadProgress(context: WorkspacePanelContext): TemplateResult | null {
    const batches = workspaceUploadBatchesForScope(context.state.workspaceUploadBatches, {
      projectId: context.workspace.projectId,
      workspaceId: context.workspace.id,
      machineId: context.machine.id,
    });
    if (batches.length === 0) return null;
    return html`
      <section class="upload-progress" aria-label="Workspace uploads">
        <div class="upload-progress-header">
          <strong>Uploads</strong>
          <small>${uploadSummaryLabel(batches)}</small>
        </div>
        ${batches.map((batch) => this.renderUploadBatch(context, batch))}
      </section>
    `;
  }

  private renderUploadBatch(context: WorkspacePanelContext, batch: WorkspaceUploadBatchState): TemplateResult {
    return html`
      <article class=${`upload-batch ${batch.status}`}>
        <div class="upload-batch-heading">
          <div>
            <strong>${uploadBatchTitle(batch)}</strong>
            <small>${batch.destinationFolder === "" ? "workspace root" : batch.destinationFolder}</small>
          </div>
          <span>${uploadBatchStatusLabel(batch)}</span>
        </div>
        <progress max="1" .value=${uploadBatchProgressValue(batch)}></progress>
        <div class="upload-file-list">
          ${batch.files.map((file) => this.renderUploadFile(file))}
        </div>
        <div class="upload-actions">
          ${batch.status === "uploading" ? html`<button @click=${() => { context.onCancelWorkspaceUpload(batch.id); }}>Cancel</button>` : html`<button @click=${() => { context.onClearWorkspaceUpload(batch.id); }}>Dismiss</button>`}
        </div>
      </article>
    `;
  }

  private renderUploadFile(file: WorkspaceUploadFileState): TemplateResult {
    const detail = uploadFileDetail(file);
    return html`
      <div class=${`upload-file ${file.status}`}>
        <div class="upload-file-main">
          <span>${file.name}</span>
          <small>${detail}</small>
        </div>
        <span class="upload-file-status">${uploadFileStatusLabel(file)}</span>
      </div>
    `;
  }

  private renderUploadDialog(context: WorkspacePanelContext, review: PendingWorkspaceUploadReview): TemplateResult {
    const fileCount = review.files.length;
    return html`
      <div class="dialog-backdrop" @mousedown=${() => { this.closeUploadDialog(); }}>
        <section class="upload-dialog" role="dialog" aria-modal="true" aria-label="Review file upload" @mousedown=${(event: MouseEvent) => { event.stopPropagation(); }} @keydown=${this.handleDialogKeyDown}>
          <header>
            <div>
              <span class="eyebrow">Upload</span>
              <h2>Review ${fileCount === 1 ? "file" : `${String(fileCount)} files`}</h2>
            </div>
            <button class="close-button" title="Cancel upload" aria-label="Cancel upload" @click=${() => { this.closeUploadDialog(); }}>×</button>
          </header>
          <form @submit=${(event: SubmitEvent) => { this.submitUploadReview(event, context, review); }}>
            <label>
              <span>Destination folder</span>
              <input .value=${this.destinationFolder} placeholder=${context.workspaceUploadDefaultFolder} @input=${this.handleDestinationInput} />
              <small>Workspace-relative. Leave empty to upload at the workspace root.</small>
            </label>
            <div class="dialog-options">
              <label>
                <input type="checkbox" .checked=${this.createDirs} @change=${this.handleCreateDirsChange} />
                <span>Create parent folders</span>
              </label>
              <label>
                <input type="checkbox" .checked=${this.overwrite} @change=${this.handleOverwriteChange} />
                <span>Overwrite existing files</span>
              </label>
            </div>
            <section class="review-files" aria-label="Files to upload">
              <strong>${fileCount === 1 ? "File" : "Files"}</strong>
              ${review.files.map((file) => html`
                <div class="review-file">
                  <span>${file.name}</span>
                  <small>${formatFileSize(file.size)}</small>
                </div>
              `)}
            </section>
            ${this.formError === "" ? null : html`<div class="dialog-error" role="alert">${this.formError}</div>`}
            <footer>
              <button type="button" @click=${() => { this.closeUploadDialog(); }}>Cancel</button>
              <button type="submit">Upload</button>
            </footer>
          </form>
        </section>
      </div>
    `;
  }

  private readonly openFilePicker = (): void => {
    this.uploadInput?.click();
  };

  private readonly handleFileInputChange = (event: Event): void => {
    const input = event.currentTarget instanceof HTMLInputElement ? event.currentTarget : undefined;
    const files = input?.files ? Array.from(input.files) : [];
    if (input !== undefined) input.value = "";
    if (files.length > 0) this.openUploadReview(files);
  };

  private readonly handleDragEnter = (event: DragEvent): void => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    this.dragDepth += 1;
    this.dragActive = true;
  };

  private readonly handleDragOver = (event: DragEvent): void => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    if (event.dataTransfer !== null) event.dataTransfer.dropEffect = "copy";
    this.dragActive = true;
  };

  private readonly handleDragLeave = (event: DragEvent): void => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    if (this.dragDepth === 0) this.dragActive = false;
  };

  private readonly handleDrop = (event: DragEvent): void => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    this.dragDepth = 0;
    this.dragActive = false;
    const files = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : [];
    const context = this.context;
    if (files.length > 0 && context !== undefined) startDirectWorkspaceUpload(context, files);
  };

  private readonly handleDestinationInput = (event: Event): void => {
    const input = event.currentTarget instanceof HTMLInputElement ? event.currentTarget : undefined;
    this.destinationFolder = input?.value ?? "";
    this.formError = "";
  };

  private readonly handleCreateDirsChange = (event: Event): void => {
    const input = event.currentTarget instanceof HTMLInputElement ? event.currentTarget : undefined;
    this.createDirs = input?.checked ?? true;
  };

  private readonly handleOverwriteChange = (event: Event): void => {
    const input = event.currentTarget instanceof HTMLInputElement ? event.currentTarget : undefined;
    this.overwrite = input?.checked ?? false;
  };

  private readonly handleDialogKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    this.closeUploadDialog();
  };

  private openUploadReview(files: File[]): void {
    const context = this.context;
    const defaults = workspaceUploadReviewDefaults(context?.workspaceUploadDefaultFolder ?? "");
    this.pendingUpload = { files };
    this.destinationFolder = defaults.destinationFolder;
    this.overwrite = defaults.overwrite;
    this.createDirs = defaults.createDirs;
    this.formError = "";
  }

  private submitUploadReview(event: SubmitEvent, context: WorkspacePanelContext, review: PendingWorkspaceUploadReview): void {
    event.preventDefault();
    const validationError = workspaceUploadReviewError(review.files, this.destinationFolder);
    if (validationError !== undefined) {
      this.formError = validationError;
      return;
    }
    const run = context.onStartWorkspaceUpload(review.files, {
      destinationFolder: this.destinationFolder,
      createDirs: this.createDirs,
      overwrite: this.overwrite,
      selectUploadedFile: true,
    });
    if (run !== undefined) this.closeUploadDialog();
  }

  private closeUploadDialog(): void {
    this.pendingUpload = undefined;
    this.formError = "";
  }

  private resetPendingUpload(): void {
    this.closeUploadDialog();
    this.dragDepth = 0;
    this.dragActive = false;
  }

  static override styles = [
    workspacePanelStyles,
    css`
      :host { flex: 1 1 auto; }
      .files-panel { position: relative; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
      .toolbar-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
      .toolbar .toolbar-actions button { margin-left: 0; }
      .visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0; }
      .drop-overlay { position: absolute; inset: 52px 10px 10px; z-index: 15; display: grid; place-items: center; border: 2px dashed var(--pi-accent); border-radius: 12px; background: color-mix(in srgb, var(--pi-bg-overlay) 90%, var(--pi-accent) 10%); color: var(--pi-text); opacity: 0; pointer-events: none; transition: opacity .12s ease; }
      .files-panel.dragging .drop-overlay { opacity: 1; }
      .drop-overlay div { display: grid; gap: 4px; justify-items: center; padding: 18px; border-radius: 10px; background: var(--pi-bg-overlay); box-shadow: 0 8px 24px var(--pi-shadow); }
      .drop-overlay span { color: var(--pi-muted); }
      .upload-progress { flex: 0 0 auto; display: grid; gap: 8px; padding: 8px; border-bottom: 1px solid var(--pi-border-muted); background: color-mix(in srgb, var(--pi-surface) 55%, transparent); }
      .upload-progress-header, .upload-batch-heading, .upload-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .upload-batch { display: grid; gap: 6px; border: 1px solid var(--pi-border-muted); border-radius: 8px; background: var(--pi-bg); padding: 8px; }
      .upload-batch.error { border-color: var(--pi-danger); }
      .upload-batch.cancelled { border-color: var(--pi-warning-border); }
      .upload-batch.completed { border-color: var(--pi-success-border); }
      .upload-batch-heading > div { min-width: 0; display: grid; gap: 2px; }
      .upload-batch-heading strong, .upload-batch-heading small { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      progress { width: 100%; accent-color: var(--pi-accent); }
      .upload-file-list { display: grid; gap: 4px; max-height: 180px; overflow: auto; padding-right: 2px; }
      .upload-file { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px; color: var(--pi-muted); }
      .upload-file.completed .upload-file-status { color: var(--pi-success); }
      .upload-file.error { color: var(--pi-danger); }
      .upload-file.cancelled .upload-file-status { color: var(--pi-warning); }
      .upload-file-main { min-width: 0; display: grid; gap: 1px; }
      .upload-file-main span, .upload-file-main small { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .upload-file-status { font-size: 12px; white-space: nowrap; }
      .upload-actions { justify-content: end; }
      .dialog-backdrop { position: fixed; inset: 0; z-index: 100; box-sizing: border-box; display: grid; place-items: center; padding: max(20px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(20px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left)); background: var(--pi-overlay); }
      .upload-dialog { box-sizing: border-box; width: min(560px, 100%); max-height: min(720px, 100%); display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--pi-border); border-radius: 14px; background: var(--pi-bg); box-shadow: 0 18px 70px var(--pi-shadow-strong); }
      .upload-dialog header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--pi-border-muted); }
      .upload-dialog h2 { margin: 2px 0 0; font-size: 18px; line-height: 1.2; }
      .eyebrow { color: var(--pi-muted); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
      .close-button { font-size: 20px; line-height: 1; padding: 4px 9px; }
      form { min-height: 0; display: flex; flex-direction: column; gap: 12px; overflow: auto; padding: 16px; }
      form > label { display: grid; gap: 6px; }
      form > label > span, .review-files > strong { font-weight: 600; }
      input[type="text"], form > label > input:not([type]) { box-sizing: border-box; width: 100%; border: 1px solid var(--pi-border); border-radius: 8px; background: var(--pi-surface); color: var(--pi-text); padding: 8px 9px; font: var(--pi-control-font-size, 16px) var(--pi-control-font-family, system-ui, sans-serif); }
      input:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 1px; }
      .dialog-options { display: grid; gap: 8px; }
      .dialog-options label { display: flex; align-items: center; gap: 8px; color: var(--pi-text); }
      .review-files { display: grid; gap: 6px; min-height: 0; max-height: 180px; overflow: auto; border: 1px solid var(--pi-border-muted); border-radius: 8px; padding: 8px; }
      .review-file { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: baseline; }
      .review-file span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dialog-error { border: 1px solid var(--pi-danger); border-radius: 8px; background: color-mix(in srgb, var(--pi-danger) 10%, transparent); color: var(--pi-danger); padding: 9px; line-height: 1.35; overflow-wrap: anywhere; }
      footer { display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px; }
      .view-mode-toggle {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        padding: 2px;
        border: 1px solid var(--pi-border);
        border-radius: 8px;
        background: var(--pi-bg);
      }
      .view-mode-toggle button {
        border: 0;
        border-radius: 6px;
        background: transparent;
        padding: 4px 8px;
        font-size: 12px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        color: var(--pi-muted);
        line-height: 1;
      }
      .view-mode-toggle button:hover {
        color: var(--pi-text);
      }
      .view-mode-toggle button.selected {
        background: var(--pi-selection-bg);
        color: var(--pi-text);
        font-weight: 500;
      }
      .view-mode-toggle svg {
        display: block;
        width: 13px;
        height: 13px;
      }
      .file-browser {
        min-height: 0;
        overflow: auto;
        border-bottom: 1px solid var(--pi-border);
        display: flex;
        flex-direction: column;
      }
      .file-browser.list {
        padding: 6px;
      }
      .grid-container {
        display: flex;
        flex-direction: column;
        min-height: 0;
        flex: 1 1 auto;
      }
      .grid-breadcrumbs {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        gap: 2px;
        padding: 5px 8px;
        border-bottom: 1px solid var(--pi-border-muted);
        background: color-mix(in srgb, var(--pi-surface) 40%, transparent);
        font-size: 12px;
        overflow-x: auto;
        white-space: nowrap;
      }
      .breadcrumb-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 6px;
        border: 0;
        border-radius: 4px;
        background: transparent;
        color: var(--pi-muted);
        font-size: 12px;
        cursor: pointer;
        line-height: 1.4;
      }
      .breadcrumb-btn:hover {
        background: var(--pi-surface);
        color: var(--pi-text);
      }
      .breadcrumb-btn.active {
        color: var(--pi-text);
        font-weight: 600;
      }
      .breadcrumb-sep {
        color: var(--pi-dim, var(--pi-muted));
        font-size: 11px;
        user-select: none;
      }
      .grid-items {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
        gap: 6px;
        padding: 10px;
        align-content: start;
      }
      .grid-tile {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        padding: 8px 6px 6px;
        border: 1px solid transparent;
        border-radius: 8px;
        background: transparent;
        color: var(--pi-text);
        cursor: pointer;
        text-align: center;
        user-select: none;
        transition: background .12s, border-color .12s;
        box-sizing: border-box;
      }
      .grid-tile:hover {
        background: var(--pi-surface);
        border-color: var(--pi-border-muted);
      }
      .grid-tile.selected {
        background: var(--pi-selection-bg);
        border-color: var(--pi-accent);
      }
      .grid-tile.up-dir {
        color: var(--pi-muted);
      }
      .grid-tile-icon {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 4px;
        flex-shrink: 0;
      }
      .grid-tile-icon svg {
        width: 32px !important;
        height: 32px !important;
        display: block;
      }
      .grid-tile-label {
        font-size: 11.5px;
        line-height: 1.25;
        width: 100%;
        max-width: 100%;
        word-break: break-word;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .grid-tile-download {
        position: absolute;
        top: 3px;
        right: 3px;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        background: var(--pi-bg);
        border: 1px solid var(--pi-border-muted);
        color: var(--pi-muted);
        text-decoration: none;
        opacity: 0;
        transition: opacity .15s, color .15s;
      }
      .grid-tile:hover .grid-tile-download,
      .grid-tile-download:focus-visible {
        opacity: 1;
      }
      .grid-tile-download:hover {
        color: var(--pi-text);
        border-color: var(--pi-accent);
      }
      .grid-tile-download svg {
        width: 11px;
        height: 11px;
        display: block;
      }
      .tree-row { position: relative; display: flex; align-items: center; width: 100%; border-radius: 5px; }
      .tree-row:hover, .tree-row.selected { background: var(--pi-selection-bg); }
      .tree-row .row {
        flex: 1 1 auto;
        min-width: 0;
        border-radius: 5px;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 6px 4px calc(6px + var(--depth, 0) * 14px);
      }
      .tree-row:hover .row, .tree-row.selected .row { background: transparent; }
      .tree-chevron {
        flex: 0 0 14px;
        width: 14px;
        height: 14px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--pi-muted);
      }
      .tree-chevron.spacer {
        visibility: hidden;
      }
      .tree-chevron svg {
        display: block;
        width: 12px;
        height: 12px;
      }
      .tree-icon {
        flex: 0 0 16px;
        width: 16px;
        height: 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .tree-icon svg {
        display: block;
        max-width: 16px;
        max-height: 16px;
      }
      .tree-label {
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .viewer-title {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .viewer-title strong {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .viewer-title .tree-icon {
        flex-shrink: 0;
      }
      .tree-download-link {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 24px;
        margin-right: 4px;
        border-radius: 4px;
        color: var(--pi-muted);
        text-decoration: none;
        opacity: 0.5;
        transition: opacity .15s, color .15s, background .15s;
      }
      .tree-download-link svg {
        display: block;
        width: 13px;
        height: 13px;
      }
      .tree-row:hover .tree-download-link,
      .tree-download-link:focus-visible {
        opacity: 1;
        color: var(--pi-text);
      }
      .tree-download-link:hover {
        opacity: 1;
        color: var(--pi-text);
        background: color-mix(in srgb, var(--pi-surface) 80%, transparent);
      }
      @media (hover: none) {
        .tree-download-link {
          opacity: 0.8;
          min-width: 32px;
          min-height: 32px;
        }
      }
      .viewer-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
      .download-button {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        font-size: 12px;
        color: var(--pi-text);
        background: var(--pi-surface);
        border: 1px solid var(--pi-border);
        border-radius: 6px;
        text-decoration: none;
        cursor: pointer;
      }
      .download-button:hover, .download-button:focus-visible {
        background: var(--pi-surface-hover);
        border-color: var(--pi-accent);
      }
      .download-button.primary {
        padding: 6px 12px;
        font-size: 13px;
        background: var(--pi-accent);
        color: var(--pi-accent-contrast, #fff);
        border-color: var(--pi-accent);
      }
      .download-button.primary:hover {
        filter: brightness(1.1);
      }
      .binary-file-view {
        padding: 16px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
      .binary-file-view p { margin: 0; }
    `,
  ];
}

export function workspaceUploadBatchesForScope(batches: Record<string, WorkspaceUploadBatchState>, scope: WorkspaceUploadScope): WorkspaceUploadBatchState[] {
  return Object.values(batches)
    .filter((batch) => batch.projectId === scope.projectId && batch.workspaceId === scope.workspaceId && batch.machineId === scope.machineId)
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
}

export function workspaceUploadReviewError(files: readonly File[], destinationFolder: string): string | undefined {
  if (files.length === 0) return "Choose at least one file to upload.";
  for (const file of files) {
    try {
      workspaceUploadPath(destinationFolder, file.name);
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  }
  return undefined;
}

export function workspaceUploadReviewDefaults(destinationFolder: string): { destinationFolder: string; createDirs: boolean; overwrite: boolean } {
  return { destinationFolder, createDirs: true, overwrite: false };
}

export function startDirectWorkspaceUpload(
  context: Pick<WorkspacePanelContext, "workspaceUploadDefaultFolder" | "onStartWorkspaceUpload">,
  files: readonly File[],
): ReturnType<WorkspacePanelContext["onStartWorkspaceUpload"]> {
  if (files.length === 0) return undefined;
  return context.onStartWorkspaceUpload(files, {
    destinationFolder: context.workspaceUploadDefaultFolder,
    createDirs: true,
    overwrite: false,
    selectUploadedFile: true,
  });
}

function workspaceContextKey(context: WorkspacePanelContext): string {
  return `${context.machine.id}:${context.workspace.projectId}:${context.workspace.id}`;
}


function isFileDrag(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

function uploadSummaryLabel(batches: readonly WorkspaceUploadBatchState[]): string {
  const uploading = batches.filter((batch) => batch.status === "uploading").length;
  return uploading === 0 ? `${String(batches.length)} recent` : `${String(uploading)} uploading`;
}

function uploadBatchTitle(batch: WorkspaceUploadBatchState): string {
  const count = batch.files.length;
  const files = count === 1 ? "file" : "files";
  switch (batch.status) {
    case "completed": return `Uploaded ${String(count)} ${files}`;
    case "error": return `Upload failed for ${String(count)} ${files}`;
    case "cancelled": return `Upload cancelled for ${String(count)} ${files}`;
    case "uploading": return `Uploading ${String(count)} ${files}`;
  }
}

export function uploadBatchStatusLabel(batch: WorkspaceUploadBatchState): string {
  switch (batch.status) {
    case "completed": return "Done";
    case "error": return "Failed";
    case "cancelled": return "Cancelled";
    case "uploading": return formatPercent(batch.percent);
  }
}

export function uploadBatchProgressValue(batch: WorkspaceUploadBatchState): number {
  return batch.status === "uploading" ? batch.percent : 1;
}

function uploadFileStatusLabel(file: WorkspaceUploadFileState): string {
  switch (file.status) {
    case "pending": return "Pending";
    case "uploading": return formatPercent(file.percent);
    case "completed": return "Done";
    case "error": return "Error";
    case "cancelled": return "Cancelled";
  }
}

function uploadFileDetail(file: WorkspaceUploadFileState): string {
  if (file.error !== undefined) return file.error;
  if (file.response !== undefined) return `Wrote ${file.response.path}`;
  return `${file.path} · ${formatFileSize(file.loaded)} / ${formatFileSize(file.total)}`;
}

function formatPercent(value: number): string {
  return `${String(Math.round(Math.max(0, Math.min(1, value)) * 100))}%`;
}

function loadCodeViewer(): void {
  void import("./CodeViewer");
}

function formatFileSize(size: number): string {
  if (!Number.isFinite(size) || size < 0) return "0 B";
  if (size < 1024) return `${String(size)} B`;
  const kib = size / 1024;
  if (kib < 1024) return `${formatScaledFileSize(kib)} KB`;
  const mib = kib / 1024;
  if (mib < 1024) return `${formatScaledFileSize(mib)} MB`;
  return `${formatScaledFileSize(mib / 1024)} GB`;
}

function formatScaledFileSize(value: number): string {
  return value >= 10 ? String(Math.round(value)) : value.toFixed(1);
}
