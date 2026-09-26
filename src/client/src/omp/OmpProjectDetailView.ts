import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { ProjectCardData } from "./OmpProjectsView";
import type { SidebarSession } from "./OmpSidebar";
import type { SubmitPromptDetail } from "./OmpComposer";
import {
  renderArrowLeftIcon,
  renderPhotoIcon,
  renderBranchIcon,
  renderPlusIcon,
  renderDotsHorizontalIcon,
  renderTrashIcon,
} from "./icons";
import "./OmpComposer";

export interface ProjectBranch {
  name: string;
  isMain?: boolean;
  worktreePath?: string;
  active?: boolean;
}

@customElement("omp-project-detail-view")
export class OmpProjectDetailView extends LitElement {
  @property({ type: String }) projectId = "proj-1";
  @property({ attribute: false }) project?: ProjectCardData;
  @property({ attribute: false }) projects: ProjectCardData[] = [];
  @property({ attribute: false }) sessions: SidebarSession[] = [];
  @property({ attribute: false }) branches: ProjectBranch[] = [];
  @property({ type: Boolean }) isWorking = false;

  @state() private customImage?: string;
  @state() private isMenuOpen = false;
  @state() private activeBranch = "main";

  protected override createRenderRoot() {
    return this;
  }

  private readonly defaultBranchesByProject: Record<string, ProjectBranch[]> = {
    "proj-1": [
      { name: "main", isMain: true, worktreePath: "~/code/omp-web" },
      { name: "feat/composer-navbar", worktreePath: "~/code/omp-web-composer-navbar" },
      { name: "fix/squircle-card-fit", worktreePath: "~/code/omp-web-squircle-fit" },
    ],
    "proj-2": [
      { name: "main", isMain: true, worktreePath: "~/code/oh-my-pi" },
      { name: "feat/parallel-subagents", worktreePath: "~/code/oh-my-pi-subagents" },
      { name: "dev/tool-calling-evals", worktreePath: "~/code/oh-my-pi-tool-evals" },
    ],
    "proj-3": [
      { name: "main", isMain: true, worktreePath: "~/code/api-backend" },
      { name: "feat/websocket-sessiond", worktreePath: "~/code/api-backend-ws" },
    ],
    "proj-4": [
      { name: "main", isMain: true, worktreePath: "~/code/ai-memory" },
      { name: "feat/semantic-search", worktreePath: "~/code/ai-memory-search" },
    ],
  };

  private readonly fallbackProjects: ProjectCardData[] = [
    {
      id: "proj-1",
      name: "omp-web",
      path: "~/code/omp-web",
      description: "Frontend & Client Engine do Oh My Pi com interface acrílica e suporte a subagentes",
      image: "/static/omplabs/omp-appearance-cover-image-small--2.jpg",
    },
    {
      id: "proj-2",
      name: "oh-my-pi",
      path: "~/code/oh-my-pi",
      description: "Core harness, execução de subagentes paralelos e orquestração de runtime",
      image: "/static/omplabs/omp-gaming-cover-image-small.jpg",
    },
    {
      id: "proj-3",
      name: "api-backend",
      path: "~/code/api-backend",
      description: "Servidor REST, conexões WebSocket, gestão de autenticação e workers assíncronos",
      image: "/static/omplabs/omp-vision-cover-image-small.jpg",
    },
    {
      id: "proj-4",
      name: "ai-memory",
      path: "~/code/ai-memory",
      description: "Mecanismo persistente de memória de longo prazo e continuidade entre sessões",
      image: "/static/omplabs/audio-expression-cover-image-small.jpg",
    },
  ];

  private readonly fallbackSessions: SidebarSession[] = [
    { id: "sess-1", title: "Refatorar sidebar e projetos", updatedAt: "5m atrás", projectId: "proj-1" },
    { id: "sess-2", title: "Ajustar streaming de tokens", updatedAt: "1h atrás", projectId: "proj-1" },
    { id: "sess-3", title: "Arquitetura do sessiond", updatedAt: "Ontem", projectId: "proj-1", isLoggedOut: true },
    { id: "sess-4", title: "Configurações de modelo e chaves", updatedAt: "3d atrás", projectId: "proj-1", isLoggedOut: true },
    { id: "sess-5", title: "Setup inicial do backend", updatedAt: "2d atrás", projectId: "proj-2", isLoggedOut: true },
  ];

  private getCurrentProject(): ProjectCardData {
    if (this.project) return this.project;
    const pool = this.projects.length > 0 ? this.projects : this.fallbackProjects;
    return pool.find((p) => p.id === this.projectId) ?? pool[0] ?? {
      id: this.projectId,
      name: "Projeto",
      path: "~/code/" + this.projectId,
      image: "/static/omplabs/omp-appearance-cover-image-small--2.jpg",
    };
  }

  private handleImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        this.customImage = reader.result;
        this.dispatchEvent(
          new CustomEvent("project-image-change", {
            detail: { projectId: this.projectId, image: reader.result },
            bubbles: true,
            composed: true,
          }),
        );
      }
    };
    reader.readAsDataURL(file);
  }

  private handleSelectSession(sessionId: string) {
    this.dispatchEvent(
      new CustomEvent("session-select", {
        detail: { sessionId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleSubmitPrompt(detail: SubmitPromptDetail) {
    this.dispatchEvent(
      new CustomEvent("submit-prompt", {
        detail: {
          ...detail,
          projectId: this.projectId,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleDeleteProject() {
    this.isMenuOpen = false;
    this.dispatchEvent(
      new CustomEvent("project-delete", {
        detail: { projectId: this.projectId },
        bubbles: true,
        composed: true,
      }),
    );
    this.dispatchEvent(
      new CustomEvent("back-to-projects", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleSelectBranch(branchName: string) {
    this.activeBranch = branchName;
    this.dispatchEvent(
      new CustomEvent("branch-select", {
        detail: { projectId: this.projectId, branch: branchName },
        bubbles: true,
        composed: true,
      }),
    );
  }

  override render() {
    const currentProject = this.getCurrentProject();
    const coverImage =
      this.customImage ||
      currentProject.image ||
      "/static/omplabs/omp-appearance-cover-image-small--2.jpg";

    const allSessions = this.sessions.length > 0 ? this.sessions : this.fallbackSessions;
    const projectSessions = allSessions.filter(
      (s) => !s.projectId || s.projectId === this.projectId,
    );

    const projectBranches =
      this.branches.length > 0
        ? this.branches
        : this.defaultBranchesByProject[this.projectId] ?? [
          { name: "main", isMain: true, worktreePath: currentProject.path },
          { name: "feat/dev-workspace", worktreePath: `${currentProject.path}-dev` },
        ];

    return html`
      <div
        class="relative size-full overflow-hidden flex flex-col font-sans"
        @click=${() => {
        if (this.isMenuOpen) this.isMenuOpen = false;
      }}
      >
        <!-- Scrollable Content with padding-bottom for dock -->
        <div class="relative size-full overflow-y-auto px-4 py-6 md:px-8 pb-36 sm:pb-44 font-sans">
          <div class="w-full max-w-5xl mx-auto flex flex-col gap-6">
            <!-- Back Nav Link -->
            <div class="flex items-center justify-between">
              <button
                type="button"
                class="inline-flex items-center gap-2 text-xs font-bold text-foreground-600 hover:text-foreground-900 transition-colors cursor-pointer group"
                @click=${() =>
        this.dispatchEvent(
          new CustomEvent("back-to-projects", {
            bubbles: true,
            composed: true,
          }),
        )}
              >
                <div class="size-6 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center group-hover:-translate-x-0.5 transition-transform">
                  ${renderArrowLeftIcon("size-3.5")}
                </div>
                <span>Todos os Projetos</span>
              </button>

              <span class="text-xs font-mono text-foreground-400">
                ID: ${currentProject.id}
              </span>
            </div>

            <!-- Hero Cover Banner -->
            <div
              class="relative w-full h-44 sm:h-56 overflow-hidden shadow-sm bg-black/10 dark:bg-white/5 flex flex-col justify-end p-5 md:p-6 group"
              style="clip-path: var(--clip-path-squircle-60);"
            >
              <!-- Background Image -->
              <img
                alt="${currentProject.name} banner"
                src="${coverImage}"
                class="absolute inset-0 size-full object-cover block"
              />

              <!-- Dark Gradient Vignette for Readability -->
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10"></div>

              <!-- Top Right 3-Dots Action Button & Menu on Right Side with Generous Margin -->
              <button
                type="button"
                title="Opções do projeto"
                aria-label="Opções do projeto"
                class="absolute flex items-center justify-center size-8 rounded-xl bg-black/60 hover:bg-black/85 backdrop-blur-md text-white shadow-md cursor-pointer transition-all duration-200 ${
                  this.isMenuOpen ? "opacity-100 scale-105" : "opacity-0 group-hover:opacity-100 hover:scale-105"
                } z-20 select-none"
                style="top: 18px; right: 18px;"
                @click=${(e: Event) => {
                  e.stopPropagation();
                  this.isMenuOpen = !this.isMenuOpen;
                }}
              >
                ${renderDotsHorizontalIcon("size-4")}
              </button>

              <!-- 3-Dots Dropdown Menu with Native OMP Acrylic Tokens -->
              ${this.isMenuOpen
                ? html`
                    <div
                      class="absolute z-30 min-w-[160px] p-1.5 rounded-2xl shadow-2xl flex flex-col gap-0.5 text-xs font-sans pointer-events-auto select-none"
                      style="top: 56px; right: 18px; background: var(--omp-surface-popover); color: var(--omp-text-primary); border: 1px solid var(--omp-popover-border); backdrop-filter: blur(24px) saturate(180%); -webkit-backdrop-filter: blur(24px) saturate(180%); box-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.5);"
                      @click=${(e: Event) => e.stopPropagation()}
                    >
                      <!-- Alterar capa -->
                      <label
                        class="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-pointer font-semibold select-none hover:bg-black/5 dark:hover:bg-white/10"
                        style="color: var(--omp-text-primary);"
                      >
                        <span style="color: var(--omp-text-secondary); display: flex;">
                          ${renderPhotoIcon("size-4")}
                        </span>
                        <span style="color: var(--omp-text-primary);">Alterar capa</span>
                        <input
                          type="file"
                          accept="image/*"
                          class="hidden"
                          @change=${(e: Event) => {
                            this.handleImageUpload(e);
                            this.isMenuOpen = false;
                          }}
                        />
                      </label>

                      <div class="h-px my-1" style="background-color: var(--omp-popover-border);"></div>

                      <!-- Excluir -->
                      <button
                        type="button"
                        class="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-pointer font-semibold text-left select-none hover:bg-red-500/15"
                        style="color: #ef4444;"
                        @click=${(e: Event) => {
                          e.stopPropagation();
                          this.handleDeleteProject();
                        }}
                      >
                        <span style="color: #ef4444; display: flex;">
                          ${renderTrashIcon("size-4")}
                        </span>
                        <span style="color: #ef4444;">Excluir</span>
                      </button>
                    </div>
                  `
                : ""}

              <!-- Project Details Overlay -->
              <div class="relative z-10 flex flex-col items-start gap-1 text-white">
                <h1 class="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                  ${currentProject.name}
                </h1>

                <div class="flex items-center gap-2 mt-1">
                  <span class="text-xs font-mono opacity-80 bg-black/40 px-2.5 py-0.5 rounded-md backdrop-blur-xs">
                    ${currentProject.path}
                  </span>
                  ${currentProject.description
        ? html`
                        <span class="hidden sm:inline-block text-xs opacity-75 truncate max-w-md">
                          · ${currentProject.description}
                        </span>
                      `
        : nothing}
                </div>
              </div>

              <div
                class="before:border-black/10 dark:before:border-white/10 before:border-[20px] will-change-transform pointer-events-none absolute inset-0 before:absolute before:inset-0 before:rounded-inherit"
                style="clip-path: var(--clip-path-squircle-stroke-60);"
              ></div>
            </div>

            <!-- Workspaces & Branches Section -->
            <div class="w-full flex flex-col gap-3 mt-2">
              <div class="flex items-center justify-between px-1">
                <div class="flex items-center gap-2">
                  ${renderBranchIcon("size-4 text-foreground-700 dark:text-foreground-300")}
                  <h2 class="text-base font-extrabold text-foreground-900 font-sans">
                    Workspaces & Branches
                  </h2>
                  <span class="text-xs font-extrabold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-foreground-600 dark:text-foreground-400">
                    ${projectBranches.length}
                  </span>
                </div>

                <button
                  type="button"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-foreground-800 transition-colors cursor-pointer"
                  @click=${() => {
        const newBranch = prompt("Nome do novo workspace/branch:", "feat/nova-feature");
        if (newBranch && newBranch.trim()) {
          this.branches = [
            ...projectBranches,
            { name: newBranch.trim(), worktreePath: `${currentProject.path}/${newBranch.trim()}` },
          ];
          this.activeBranch = newBranch.trim();
        }
      }}
                >
                  ${renderPlusIcon("size-3.5")}
                  <span>Novo Workspace</span>
                </button>
              </div>

              <!-- Branches Grid -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${projectBranches.map((branch) => {
        const isActive = branch.name === this.activeBranch;
        return html`
                    <div
                      class="group flex items-center justify-between p-3.5 rounded-2xl border ${isActive
            ? "border-blue-500/50 bg-blue-500/[0.04] dark:bg-blue-500/[0.08]"
            : "border-black/8 dark:border-white/8 bg-white/45 dark:bg-background-650/10 hover:border-black/20 dark:hover:border-white/20"
          } transition-all cursor-pointer shadow-xs"
                      @click=${() => this.handleSelectBranch(branch.name)}
                    >
                      <div class="flex items-center gap-3 min-w-0 pr-2">
                        <div
                          class="size-8 rounded-xl ${isActive
            ? "bg-blue-600 text-white"
            : "bg-black/5 dark:bg-white/10 text-foreground-700"
          } flex items-center justify-center shrink-0 transition-colors"
                        >
                          ${renderBranchIcon("size-4")}
                        </div>

                        <div class="flex flex-col min-w-0">
                          <div class="flex items-center gap-2">
                            <span class="text-xs font-bold font-mono text-foreground-900 truncate">
                              ${branch.name}
                            </span>
                            ${branch.isMain
            ? html`<span class="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">main</span>`
            : ""}
                            ${isActive
            ? html`<span class="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">ativo</span>`
            : ""}
                          </div>
                          <span class="text-[11px] text-foreground-500 font-mono truncate mt-0.5">
                            ${branch.worktreePath || `~/code/${currentProject.name}/${branch.name}`}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        class="px-2.5 py-1 rounded-lg text-xs font-bold ${isActive
            ? "bg-blue-600 text-white"
            : "bg-black/5 dark:bg-white/10 text-foreground-700 group-hover:bg-blue-600 group-hover:text-white"
          } transition-colors shrink-0"
                        @click=${(e: Event) => {
            e.stopPropagation();
            this.handleSelectBranch(branch.name);
          }}
                      >
                        ${isActive ? "Em uso" : "Alternar"}
                      </button>
                    </div>
                  `;
      })}
              </div>
            </div>

            <!-- Sessions Section -->
            <div class="w-full flex flex-col gap-3 mt-2">
              <div class="flex items-center justify-between px-1">
                <div class="flex items-center gap-2">
                  <h2 class="text-base font-extrabold text-foreground-900 font-sans">
                    Sessões Recentes
                  </h2>
                  <span class="text-xs font-extrabold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-foreground-600 dark:text-foreground-400">
                    ${projectSessions.length}
                  </span>
                </div>
              </div>

              ${projectSessions.length > 0
        ? html`
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                      ${projectSessions.map((session, index) => {
          const isRecent = index === 0;
          return html`
                          <div
                            class="group flex items-center justify-between p-4 rounded-2xl border border-black/8 dark:border-white/8 bg-white/45 dark:bg-background-650/10 hover:border-blue-500/40 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-all cursor-pointer shadow-xs"
                            @click=${() => this.handleSelectSession(session.id)}
                          >
                            <div class="flex flex-col min-w-0 pr-3">
                              <div class="flex items-center gap-2 mb-1">
                                <span class="text-sm font-bold text-foreground-900 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                  ${session.title}
                                </span>
                                ${isRecent
              ? html`
                                      <span class="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        Última
                                      </span>
                                    `
              : nothing}
                              </div>
                              <span class="text-xs text-foreground-500 font-mono">
                                ${session.updatedAt || "Recente"}
                              </span>
                            </div>

                            <button
                              type="button"
                              class="px-3 py-1.5 rounded-xl text-xs font-bold bg-black/5 dark:bg-white/10 text-foreground-800 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0"
                              @click=${(e: Event) => {
              e.stopPropagation();
              this.handleSelectSession(session.id);
            }}
                            >
                              Continuar →
                            </button>
                          </div>
                        `;
        })}
                    </div>
                  `
        : html`
                    <div class="p-8 rounded-3xl border border-dashed border-black/10 dark:border-white/10 text-center flex flex-col items-center justify-center text-foreground-500">
                      <span class="text-sm font-bold text-foreground-800 mb-1">Nenhuma sessão encontrada</span>
                      <p class="text-xs max-w-sm">
                        Use o composer abaixo para iniciar a primeira sessão de desenvolvimento no repositório ${currentProject.name}.
                      </p>
                    </div>
                  `}
            </div>

            <!-- Bottom spacer so composer dock doesn't obscure content -->
            <div class="h-16 sm:h-20 shrink-0 pointer-events-none" aria-hidden="true"></div>
          </div>
        </div>

        <!-- Sticky Bottom Composer Dock (Navbar style) -->
        <div class="absolute bottom-0 inset-x-0 z-20 flex flex-col items-center px-4 pb-4 sm:pb-6 pb-[max(calc(env(safe-area-inset-bottom)+1rem),1.5rem)] pt-8 bg-gradient-to-t from-background-150 via-background-150/80 to-transparent pointer-events-none">
          <div class="w-full max-w-chat pointer-events-auto">
            <omp-composer
              compact
              .isWorking=${this.isWorking}
              .selectedProjectId=${this.projectId}
              .placeholder=${`Enviar mensagem no contexto de ${currentProject.name} (${this.activeBranch})...`}
              @project-select=${(e: CustomEvent<{ projectId: string }>) => {
        this.projectId = e.detail.projectId;
        this.dispatchEvent(
          new CustomEvent("project-select", {
            detail: e.detail,
            bubbles: true,
            composed: true,
          }),
        );
      }}
              @submit-prompt=${(e: CustomEvent<SubmitPromptDetail>) => this.handleSubmitPrompt(e.detail)}
            ></omp-composer>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "omp-project-detail-view": OmpProjectDetailView;
  }
}
