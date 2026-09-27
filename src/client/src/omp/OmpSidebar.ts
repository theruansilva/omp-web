import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  renderOmpLogo,
  renderToggleSidebarIcon,
  renderNewChatIcon,
  renderLibraryIcon,
  renderFolderIcon,
  renderPlusIcon,
  renderProjectsIcon,
  renderSettingsIcon,
} from "./icons";

export interface NavItem {
  id: string;
  label: string;
  badge?: string;
}

export interface SidebarProject {
  id: string;
  name: string;
  path?: string;
}

export interface SidebarSession {
  id: string;
  title: string;
  updatedAt?: string;
  projectId?: string;
  isLoggedOut?: boolean;
  archived?: boolean;
  isWorking?: boolean;
  isUnread?: boolean;
}

@customElement("omp-sidebar")
export class OmpSidebar extends LitElement {
  @property({ type: String }) activeTab = "new-chat";
  @property({ type: Boolean }) isOpen = true;
  @property({ attribute: false }) projects: SidebarProject[] = [];
  @property({ type: String }) selectedProjectId = "proj-1";
  @property({ attribute: false }) sessions: SidebarSession[] = [];
  @property({ type: String }) selectedSessionId = "sess-1";
  @state() private activeMenuSessionId: string | null = null;

  protected override createRenderRoot() {
    return this;
  }

  private holdTimer?: ReturnType<typeof setTimeout>;
  private isLongPress = false;
  private touchMoved = false;

  override connectedCallback() {
    super.connectedCallback();
    window.addEventListener("click", this.handleGlobalClick);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("click", this.handleGlobalClick);
    if (this.holdTimer) clearTimeout(this.holdTimer);
  }

  private readonly handleGlobalClick = () => {
    if (this.activeMenuSessionId) {
      this.activeMenuSessionId = null;
    }
  };

  private startHold(sessionId: string) {
    this.isLongPress = false;
    this.touchMoved = false;
    if (this.holdTimer) clearTimeout(this.holdTimer);
    this.holdTimer = setTimeout(() => {
      if (!this.touchMoved) {
        this.isLongPress = true;
        this.activeMenuSessionId = sessionId;
        try { navigator.vibrate?.(40); } catch { /* ignore */ }
        this.requestUpdate();
      }
    }, 450);
  }

  private cancelHold() {
    this.touchMoved = true;
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = undefined;
    }
  }

  private endHold() {
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = undefined;
    }
  }

  private handleContextMenu(sessionId: string, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.activeMenuSessionId = sessionId;
    this.requestUpdate();
  }

  private handleSessionClick(sessionId: string, projectId?: string, e?: MouseEvent) {
    if (this.isLongPress) {
      this.isLongPress = false;
      e?.preventDefault();
      e?.stopPropagation();
      return;
    }
    this.handleSelectSession(sessionId, projectId);
  }

  private handleArchiveSession(sessionId: string, projectId?: string, e?: Event) {
    e?.stopPropagation();
    this.activeMenuSessionId = null;
    this.dispatchEvent(
      new CustomEvent("archive-session", {
        detail: { sessionId, projectId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private readonly primaryNav: NavItem[] = [
    { id: "new-chat", label: "New chat" },
    { id: "library", label: "Library" },
    { id: "projects", label: "Projetos" },
    { id: "settings", label: "Configurações" },
  ];

  private readonly defaultProjects: SidebarProject[] = [
    { id: "proj-1", name: "omp-web", path: "~/code/omp-web" },
    { id: "proj-2", name: "oh-my-pi", path: "~/code/oh-my-pi" },
    { id: "proj-3", name: "api-backend", path: "~/code/api-backend" },
    { id: "proj-4", name: "ai-memory", path: "~/code/ai-memory" },
  ];

  private readonly defaultSessions: SidebarSession[] = [
    {
      id: "sess-1",
      title: "Refatorar sidebar e projetos",
      projectId: "proj-1",
    },
    { id: "sess-2", title: "Ajustar streaming de tokens", projectId: "proj-1" },
    {
      id: "sess-3",
      title: "Arquitetura do sessiond",
      projectId: "proj-1",
      isLoggedOut: true,
    },
    {
      id: "sess-4",
      title: "Configurações de modelo e chaves",
      projectId: "proj-1",
      isLoggedOut: true,
    },
    {
      id: "sess-5",
      title: "Setup inicial do backend",
      projectId: "proj-2",
      isLoggedOut: true,
    },
  ];

  private handleSelect(tabId: string) {
    this.dispatchEvent(
      new CustomEvent("nav-select", {
        detail: { tab: tabId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleSelectSession(sessionId: string, projectId?: string) {
    this.selectedSessionId = sessionId;
    if (projectId) this.selectedProjectId = projectId;
    this.dispatchEvent(
      new CustomEvent("session-select", {
        detail: { sessionId, projectId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleNewSession(projectId: string) {
    this.selectedProjectId = projectId;
    this.dispatchEvent(
      new CustomEvent("start-new-session", {
        detail: { projectId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private renderNavIcon(id: string) {
    switch (id) {
      case "new-chat":
        return renderNewChatIcon();
      case "library":
        return renderLibraryIcon();
      case "projects":
        return renderProjectsIcon("size-5 shrink-0");
      case "settings":
        return renderSettingsIcon("size-5 shrink-0");
      default:
        return html``;
    }
  }

  override render() {
    const projectsList =
      this.projects.length > 0 ? this.projects : this.defaultProjects;
    const currentProjectId =
      this.selectedProjectId || (projectsList[0]?.id ?? "");
    const allSessions =
      this.sessions.length > 0 ? this.sessions : this.defaultSessions;

    return html`
      <aside
        class="w-full h-full flex flex-col justify-between border-e border-black/10 dark:border-white/10 bg-sidebar-light dark:bg-sidebar-dark p-3 select-none pointer-events-auto"
        role="navigation"
        aria-label="OMP Navigation"
      >
        <div class="w-full h-full flex flex-col overflow-hidden">
          <!-- Header: OMP Wordmark + Collapse Toggle -->
          <div class="flex items-center justify-between px-2 pt-1 pb-3 mb-1 shrink-0">
            <div
              class="flex items-center gap-2.5 cursor-pointer pointer-events-auto"
              @click=${() => this.handleSelect("new-chat")}
            >
              ${renderOmpLogo()}
              <span class="text-[17px] font-extrabold tracking-[-0.02em] text-foreground-900 font-sans">
                OMP
              </span>
            </div>
            <button
              type="button"
              aria-label="Close sidebar"
              class="flex items-center justify-center size-8 rounded-xl text-foreground-800 hover:bg-black/5 dark:hover:bg-white/8 transition-colors cursor-pointer pointer-events-auto"
              @click=${() => this.dispatchEvent(new CustomEvent("toggle-sidebar", { bubbles: true, composed: true }))}
            >
              ${renderToggleSidebarIcon()}
            </button>
          </div>

          <!-- Scrollable Body with Top Nav (New chat, Library, Projetos) + 1 Divider + Sessions -->
          <div class="flex-1 overflow-y-auto min-h-0 flex flex-col gap-1 pr-0.5 font-sans">
            <!-- 1. Primary Nav: New Chat, Library, Projetos (links diretos e limpos) -->
            <div class="flex flex-col gap-0.5 shrink-0" role="menu">
              ${this.primaryNav.map(
                (item) => html`
                  <button
                    type="button"
                    role="menuitem"
                    class="group relative flex w-full items-center justify-between px-3 py-2 rounded-xl text-sm font-bold font-sans transition-colors cursor-pointer pointer-events-auto ${
                      this.activeTab === item.id
                        ? "bg-black/8 dark:bg-white/10 text-foreground-900 font-extrabold"
                        : "text-foreground-700 hover:bg-black/5 dark:hover:bg-white/8 hover:text-foreground-900"
                    }"
                    @click=${() => this.handleSelect(item.id)}
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      ${this.renderNavIcon(item.id)}
                      <span class="truncate">${item.label}</span>
                    </div>
                    ${
                      item.badge
                        ? html`<span
                          class="text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded border border-black/15 dark:border-white/20 text-foreground-600 leading-none"
                          >${item.badge}</span
                        >`
                        : ""
                    }
                  </button>
                `,
              )}
            </div>
            ${projectsList.map((project) => {
              const pSessions = allSessions.filter(
                (s) => (!s.projectId || s.projectId === project.id) && !s.archived,
              );
              const sorted = [...pSessions].sort((a, b) => {
                if (a.isUnread && !b.isUnread) return -1;
                if (!a.isUnread && b.isUnread) return 1;
                if (a.isWorking && !b.isWorking) return -1;
                if (!a.isWorking && b.isWorking) return 1;
                return 0;
              });
              const displaySessions = sorted.slice(0, 5);

              return html`
                <div class="h-px bg-black/10 dark:bg-white/10 my-2 shrink-0"></div>
                <div class="flex items-center justify-between px-3 py-1 text-[11px] font-bold text-foreground-500 uppercase tracking-wider select-none">
                  <span class="truncate">${project.name}</span>
                  <button
                    type="button"
                    class="flex items-center justify-center size-5 rounded-md text-foreground-500 hover:text-foreground-900 hover:bg-black/8 dark:hover:bg-white/10 transition-colors cursor-pointer pointer-events-auto"
                    title="Nova sessão em ${project.name}"
                    aria-label="Nova sessão em ${project.name}"
                    @click=${(e: Event) => {
                      e.stopPropagation();
                      this.handleNewSession(project.id);
                    }}
                  >
                    ${renderPlusIcon("size-3.5")}
                  </button>
                </div>

                ${
                  displaySessions.length > 0
                    ? html`
                  <div class="flex flex-col gap-0.5 shrink-0" role="menu">
                    ${displaySessions.map(
                      (session) => html`
                        <div class="relative group/session w-full">
                          <button
                            type="button"
                            role="menuitem"
                            class="relative flex w-full items-center justify-between px-3 py-2 rounded-xl text-xs font-medium font-sans transition-colors cursor-pointer pointer-events-auto select-none ${
                              this.selectedSessionId === session.id
                                ? "bg-black/8 dark:bg-white/10 text-foreground-900 font-bold"
                                : session.archived
                                  ? "text-foreground-400 dark:text-foreground-500 opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/8 hover:text-foreground-700 dark:hover:text-foreground-300"
                                  : "text-foreground-700 hover:bg-black/5 dark:hover:bg-white/8 hover:text-foreground-900"
                            }"
                            @click=${(e: MouseEvent) => this.handleSessionClick(session.id, project.id, e)}
                            @contextmenu=${(e: MouseEvent) => this.handleContextMenu(session.id, e)}
                            @mousedown=${() => this.startHold(session.id)}
                            @mouseup=${() => this.endHold()}
                            @mouseleave=${() => this.cancelHold()}
                            @touchstart=${() => this.startHold(session.id)}
                            @touchmove=${() => this.cancelHold()}
                            @touchend=${() => this.endHold()}
                            @touchcancel=${() => this.cancelHold()}
                          >
                            <div class="flex items-center gap-2 min-w-0 flex-1 pr-1">
                              ${
                                session.isWorking
                                  ? html`<span class="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Trabalhando"></span>`
                                  : session.isUnread
                                    ? html`<span class="size-2 rounded-full bg-blue-500 ring-2 ring-blue-500/20 shrink-0" title="Trabalho concluído (não lido)"></span>`
                                    : nothing
                              }
                              <span class="truncate text-left flex-1 ${session.archived ? "opacity-75" : ""}">${session.title}</span>
                            </div>

                            ${session.updatedAt ? html`<span class="text-[10px] text-foreground-400 font-mono shrink-0 ml-2">${session.updatedAt}</span>` : nothing}
                          </button>

                          ${
                            this.activeMenuSessionId === session.id
                              ? html`
                                <div
                                  class="absolute right-2 top-full mt-1 z-30 min-w-[130px] rounded-xl border border-black/10 dark:border-white/10 bg-surface-150/95 dark:bg-background-800/95 backdrop-blur-md p-1 shadow-xl flex flex-col font-sans select-none pointer-events-auto"
                                  @click=${(e: Event) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    class="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground-700 hover:text-foreground-900 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer text-left"
                                    @click=${(e: Event) => this.handleArchiveSession(session.id, project.id, e)}
                                  >
                                    <span class="text-sm leading-none opacity-70">📦</span>
                                    <span>Arquivar</span>
                                  </button>
                                </div>
                              `
                              : nothing
                          }
                        </div>
                      `,
                    )}
                  </div>
                `
                    : nothing
                }
              `;
            })}
          </div>
        </div>
      </aside>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "omp-sidebar": OmpSidebar;
  }
}
