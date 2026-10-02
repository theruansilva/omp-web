import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { Workspace } from "../api";
import "../components/TerminalPanel";
import { renderTerminalIcon, renderCloseIcon, renderServerIcon, renderBranchIcon } from "./icons";

@customElement("omp-terminal-view")
export class OmpTerminalView extends LitElement {
  @property({ attribute: false }) workspace?: Workspace;
  @property({ type: String }) machineId = "local";

  protected override createRenderRoot() {
    return this;
  }

  private handleClose() {
    this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }));
  }

  override render() {
    if (!this.workspace) {
      return html`
        <div class="size-full flex flex-col items-center justify-center p-6 text-center select-none">
          <div class="size-16 rounded-3xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center mb-4 text-foreground-450">
            ${renderTerminalIcon("size-8")}
          </div>
          <h2 class="text-xl font-bold text-foreground-800 mb-1">Nenhum Workspace Ativo</h2>
          <p class="text-sm text-foreground-500 max-w-sm">
            Selecione um projeto e workspace na barra lateral para abrir um terminal interativo.
          </p>
        </div>
      `;
    }

    const branchName = this.workspace.branch || this.workspace.name || "main";

    return html`
      <div class="size-full flex flex-col overflow-hidden bg-background-light dark:bg-background-dark font-sans select-none">
        <!-- Header -->
        <header class="h-14 px-4 sm:px-6 border-b border-black/8 dark:border-white/8 flex items-center justify-between shrink-0 bg-white/40 dark:bg-background-100/40 backdrop-blur-xl">
          <div class="flex items-center gap-3 min-w-0">
            <div class="size-9 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 text-foreground-800">
              ${renderTerminalIcon("size-4.5")}
            </div>
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-foreground-900 tracking-tight leading-tight">Terminal</span>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono bg-black/5 dark:bg-white/8 text-foreground-600 border border-black/5 dark:border-white/8">
                  ${renderBranchIcon("size-3")}
                  <span>${branchName}</span>
                </span>
              </div>
              <span class="text-[11px] font-mono text-foreground-500 truncate leading-tight mt-0.5">${this.workspace.path}</span>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/5 dark:bg-white/8 text-xs font-mono text-foreground-600 border border-black/5 dark:border-white/8">
              ${renderServerIcon("size-3.5")}
              <span>${this.machineId}</span>
            </div>
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

        <!-- Terminal Host Area -->
        <div class="flex-1 w-full min-h-0 p-3 sm:p-4 overflow-hidden flex flex-col">
          <div class="size-full rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-[#0d1117] shadow-xl flex flex-col">
            <terminal-panel
              class="size-full flex-1 min-h-0"
              .workspace=${this.workspace}
              .machineId=${this.machineId}
              .autoStart=${true}
            ></terminal-panel>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "omp-terminal-view": OmpTerminalView;
  }
}
