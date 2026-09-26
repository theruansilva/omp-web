import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  renderPlusIcon,
  renderPhotoIcon,
  renderDotsHorizontalIcon,
  renderTrashIcon,
} from "./icons";
import "./OmpComposer";
import type { SubmitPromptDetail } from "./OmpComposer";

export interface ProjectCardData {
  id: string;
  name: string;
  path: string;
  description?: string;
  image?: string;
}

@customElement("omp-projects-view")
export class OmpProjectsView extends LitElement {
  @property({ attribute: false }) projects: ProjectCardData[] = [];
  @property({ type: String }) selectedProjectId = "proj-1";
  @property({ type: Boolean }) isWorking = false;

  @state() private customImages: Record<string, string> = {};
  @state() private activeMenuProjectId: string | null = null;
  @state() private deletedProjectIds = new Set<string>();

  protected override createRenderRoot() {
    return this;
  }

  private readonly defaultProjects: ProjectCardData[] = [
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

  private handleImageUpload(projectId: string, event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        this.customImages = {
          ...this.customImages,
          [projectId]: reader.result,
        };
        this.dispatchEvent(
          new CustomEvent("project-image-change", {
            detail: { projectId, image: reader.result },
            bubbles: true,
            composed: true,
          }),
        );
      }
    };
    reader.readAsDataURL(file);
  }

  private handleOpenProject(projectId: string) {
    this.dispatchEvent(
      new CustomEvent("project-open", {
        detail: { projectId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleDeleteProject(projectId: string) {
    this.deletedProjectIds = new Set([...this.deletedProjectIds, projectId]);
    this.activeMenuProjectId = null;
    this.dispatchEvent(
      new CustomEvent("project-delete", {
        detail: { projectId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  override render() {
    const baseList = this.projects.length > 0 ? this.projects : this.defaultProjects;
    const list = baseList.filter((p) => !this.deletedProjectIds.has(p.id));

    return html`
      <div
        class="relative size-full overflow-hidden flex flex-col font-sans"
        @click=${() => {
        if (this.activeMenuProjectId) this.activeMenuProjectId = null;
      }}
      >
        <!-- Scrollable Grid Content -->
        <div class="relative size-full overflow-y-auto px-4 py-8 md:px-8 pb-36 sm:pb-44">
          <div class="w-full max-w-6xl mx-auto">
            <!-- Page Header -->
            <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground-900 font-sans">
                  Seus Projetos
                </h1>
                <p class="text-sm text-foreground-600 mt-1 max-w-xl">
                  Selecione um projeto para abrir uma sessão no chat ou personalize a imagem de capa de cada repositório.
                </p>
              </div>

              <button
                type="button"
                class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground-900 text-background-100 hover:opacity-90 active:scale-98 transition-all text-sm font-bold shadow-sm cursor-pointer self-start md:self-auto"
                @click=${() => this.dispatchEvent(new CustomEvent("project-add", { bubbles: true, composed: true }))}
              >
                ${renderPlusIcon("size-4")}
                <span>Novo Projeto</span>
              </button>
            </div>

            <!-- Projects Grid (Preview Experiments Card Style with Concentric Curvature) -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              ${list.map((project) => {
        const coverImage =
          this.customImages[project.id] ||
          project.image ||
          "/static/omplabs/omp-appearance-cover-image-small--2.jpg";
        const isSelected = this.selectedProjectId === project.id;
        const isMenuOpen = this.activeMenuProjectId === project.id;

        return html`
                  <div
                    class="relative isolate bg-white/45 dark:bg-background-650/10 flex h-full cursor-pointer flex-col gap-3 p-3 text-foreground-800 transition-all duration-200 ease-in hover:scale-[1.02] shadow-sm w-full group"
                    style="clip-path: var(--clip-path-squircle-60);"
                    @click=${() => this.handleOpenProject(project.id)}
                  >
                    <!-- Cover Image with concentric squircle curvature and 3-dots action menu -->
                    <div class="items-stretch overflow-hidden rounded-b-6xl rounded-t-7xl aspect-[16/10] relative bg-black/5 dark:bg-white/5 isolate">
                      <div class="relative size-full overflow-hidden rounded-b-6xl rounded-t-7xl">
                        <img
                          alt="${project.name} cover"
                          class="absolute size-full object-cover block transition-transform duration-300 group-hover:scale-105"
                          src="${coverImage}"
                        />
                      </div>

                      <!-- 3-Dots Action Button on Right Side with Generous Margin -->
                      <button
                        type="button"
                        title="Opções do projeto"
                        aria-label="Opções do projeto"
                        class="absolute flex items-center justify-center size-8 rounded-xl bg-black/60 hover:bg-black/85 backdrop-blur-md text-white shadow-md cursor-pointer transition-all duration-200 ${
                          isMenuOpen ? "opacity-100 scale-105" : "opacity-0 group-hover:opacity-100 hover:scale-105"
                        } z-20 select-none"
                        style="top: 14px; right: 14px;"
                        @click=${(e: Event) => {
                          e.stopPropagation();
                          this.activeMenuProjectId = isMenuOpen ? null : project.id;
                        }}
                      >
                        ${renderDotsHorizontalIcon("size-4")}
                      </button>

                      <!-- 3-Dots Dropdown Menu with Native OMP Acrylic Tokens -->
                      ${isMenuOpen
                        ? html`
                            <div
                              class="absolute z-30 min-w-[160px] p-1.5 rounded-2xl shadow-2xl flex flex-col gap-0.5 text-xs font-sans pointer-events-auto select-none"
                              style="top: 50px; right: 14px; background: var(--omp-surface-popover); color: var(--omp-text-primary); border: 1px solid var(--omp-popover-border); backdrop-filter: blur(24px) saturate(180%); -webkit-backdrop-filter: blur(24px) saturate(180%); box-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.5);"
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
                                    this.handleImageUpload(project.id, e);
                                    this.activeMenuProjectId = null;
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
                                  this.handleDeleteProject(project.id);
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
                    </div>

                    <!-- Card Body -->
                    <div class="flex flex-col items-start space-y-3 pb-3 px-2 pt-1 flex-1 justify-between">
                      <div class="flex flex-col items-start space-y-1 w-full">
                        <div class="flex items-center justify-between w-full">
                          <h2 class="text-xl font-bold font-sans text-foreground-900 truncate">
                            ${project.name}
                          </h2>
                        </div>
                        <span class="text-xs font-mono text-foreground-500 truncate w-full">
                          ${project.path}
                        </span>
                        ${project.description
            ? html`
                              <p class="text-xs text-foreground-600 leading-relaxed line-clamp-2 mt-1">
                                ${project.description}
                              </p>
                            `
            : ""}
                      </div>

                      <!-- Action Button & Start Session -->
                      <div class="flex items-center justify-between w-full pt-1">
                        <button
                          type="button"
                          class="relative flex items-center text-xs justify-center px-4 py-2 rounded-xl font-bold cursor-pointer transition-all ${isSelected
            ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
            : "bg-black/5 dark:bg-white/10 text-foreground-900 hover:bg-black/10 dark:hover:bg-white/15"
          }"
                          @click=${(e: Event) => {
            e.stopPropagation();
            this.handleOpenProject(project.id);
          }}
                        >
                          ${isSelected ? "Continuar Sessão →" : "Abrir Projeto →"}
                        </button>
                        <button
                          type="button"
                          class="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-foreground-500 hover:text-foreground-900 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                          title="Iniciar nova sessão neste projeto"
                          @click=${(e: Event) => {
            e.stopPropagation();
            this.dispatchEvent(new CustomEvent("start-new-session", { detail: { projectId: project.id }, bubbles: true, composed: true }));
          }}
                        >
                          <span class="text-sm font-light leading-none">+</span>
                          <span>Nova sessão</span>
                        </button>
                      </div>
                    </div>

                    <div
                      class="before:border-black/10 dark:before:border-white/10 before:border-[20px] will-change-transform pointer-events-none absolute inset-0 before:absolute before:inset-0 before:rounded-inherit"
                      style="clip-path: var(--clip-path-squircle-stroke-60);"
                    ></div>
                  </div>
                `;
      })}

              <!-- Add Project Card -->
              <div
                class="relative flex flex-col items-center justify-center min-h-[260px] p-6 border-2 border-dashed border-black/15 dark:border-white/15 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:bg-blue-500/[0.02] transition-all cursor-pointer group select-none text-center"
                style="clip-path: var(--clip-path-squircle-60);"
                @click=${() => this.dispatchEvent(new CustomEvent("project-add", { bubbles: true, composed: true }))}
              >
                <div class="size-12 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center text-foreground-700 group-hover:bg-blue-600 group-hover:text-white transition-colors mb-3">
                  ${renderPlusIcon("size-6")}
                </div>
                <span class="text-base font-bold text-foreground-900">Registrar Repositório</span>
                <p class="text-xs text-foreground-500 mt-1 max-w-[200px]">
                  Adicione um diretório local ou clone para começar a programar
                </p>
              </div>
            </div>

            <!-- Bottom spacer so composer doesn't cover last cards -->
            <div class="h-16 sm:h-20 shrink-0 pointer-events-none" aria-hidden="true"></div>
          </div>
        </div>

        <!-- Sticky Bottom Composer Dock (Navbar style) -->
        <div class="absolute bottom-0 inset-x-0 z-20 flex flex-col items-center px-4 pb-4 sm:pb-6 pb-[max(calc(env(safe-area-inset-bottom)+1rem),1.5rem)] pt-8 bg-gradient-to-t from-background-150 via-background-150/80 to-transparent pointer-events-none">
          <div class="w-full max-w-chat pointer-events-auto">
            <omp-composer
              .isWorking=${this.isWorking}
              .projects=${this.projects}
              .selectedProjectId=${this.selectedProjectId}
              @project-select=${(e: CustomEvent<{ projectId: string }>) => {
        this.selectedProjectId = e.detail.projectId;
        this.dispatchEvent(
          new CustomEvent("project-select", {
            detail: e.detail,
            bubbles: true,
            composed: true,
          }),
        );
      }}
              @submit-prompt=${(e: CustomEvent<SubmitPromptDetail>) => {
        this.dispatchEvent(
          new CustomEvent("submit-prompt", {
            detail: e.detail,
            bubbles: true,
            composed: true,
          }),
        );
      }}
              @stop-generation=${() => {
        this.dispatchEvent(new CustomEvent("stop-generation", { bubbles: true, composed: true }));
      }}
            ></omp-composer>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "omp-projects-view": OmpProjectsView;
  }
}
