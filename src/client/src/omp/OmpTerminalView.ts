import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { Workspace } from "../api";
import "../components/TerminalPanel";
import { renderTerminalIcon } from "./icons";

@customElement("omp-terminal-view")
export class OmpTerminalView extends LitElement {
  @property({ attribute: false }) workspace?: Workspace;
  @property({ type: String }) machineId = "local";
  @property({ type: Boolean }) isSidebarOpen = true;

  protected override createRenderRoot() {
    return this;
  }

  override render() {
    if (!this.workspace) {
      return html`
        <div class="size-full flex flex-col items-center justify-center p-6 text-center select-none text-[var(--omp-text-secondary)] ${!this.isSidebarOpen ? "pt-14" : ""}">
          <div class="size-16 rounded-3xl omp-settings-card flex items-center justify-center mb-4 text-[var(--omp-text-muted)]">
            ${renderTerminalIcon("size-8")}
          </div>
          <h2 class="text-xl font-bold text-[var(--omp-text-primary)] mb-1">Nenhum Workspace Ativo</h2>
          <p class="text-sm opacity-80 max-w-sm">
            Selecione um projeto e workspace na barra lateral para abrir o terminal.
          </p>
        </div>
      `;
    }

    return html`
      <div class="size-full flex flex-col overflow-hidden p-2 sm:p-3 select-none ${!this.isSidebarOpen ? "pt-12 sm:pt-14" : ""}">
        <div class="size-full rounded-2xl sm:rounded-3xl overflow-hidden border border-black/10 dark:border-white/10 bg-[#0d1117] shadow-xl flex flex-col">
          <terminal-panel
            class="size-full flex-1 min-h-0"
            .workspace=${this.workspace}
            .machineId=${this.machineId}
            .autoStart=${true}
          ></terminal-panel>
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
