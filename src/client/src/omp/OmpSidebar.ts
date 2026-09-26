import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import {
  renderOmpLogo,
  renderToggleSidebarIcon,
  renderNewChatIcon,
  renderLibraryIcon,
  renderFolderIcon,
  renderPlusIcon,
  renderProjectsIcon,
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
}

@customElement("omp-sidebar")
export class OmpSidebar extends LitElement {
  @property({ type: String }) activeTab = "new-chat";
  @property({ type: Boolean }) isOpen = true;
  @property({ attribute: false }) projects: SidebarProject[] = [];
  @property({ type: String }) selectedProjectId = "proj-1";
  @property({ attribute: false }) sessions: SidebarSession[] = [];
  @property({ type: String }) selectedSessionId = "sess-1";

  protected override createRenderRoot() {
    return this;
  }

  private readonly primaryNav: NavItem[] = [
    { id: "new-chat", label: "New chat" },
    { id: "library", label: "Library" },
    { id: "projects", label: "Projetos" },
  ];

  private readonly defaultProjects: SidebarProject[] = [
    { id: "proj-1", name: "omp-web", path: "~/code/omp-web" },
    { id: "proj-2", name: "oh-my-pi", path: "~/code/oh-my-pi" },
    { id: "proj-3", name: "api-backend", path: "~/code/api-backend" },
    { id: "proj-4", name: "ai-memory", path: "~/code/ai-memory" },
  ];

  private readonly defaultSessions: SidebarSession[] = [
    { id: "sess-1", title: "Refatorar sidebar e projetos", projectId: "proj-1" },
    { id: "sess-2", title: "Ajustar streaming de tokens", projectId: "proj-1" },
    { id: "sess-3", title: "Arquitetura do sessiond", projectId: "proj-1", isLoggedOut: true },
    { id: "sess-4", title: "Configurações de modelo e chaves", projectId: "proj-1", isLoggedOut: true },
    { id: "sess-5", title: "Setup inicial do backend", projectId: "proj-2", isLoggedOut: true },
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

  private handleSelectSession(sessionId: string) {
    this.selectedSessionId = sessionId;
    this.dispatchEvent(
      new CustomEvent("session-select", {
        detail: { sessionId },
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
      default:
        return html``;
    }
  }

  override render() {
    const projectsList = this.projects.length > 0 ? this.projects : this.defaultProjects;
    const currentProjectId = this.selectedProjectId || (projectsList[0]?.id ?? "");
    const allSessions = this.sessions.length > 0 ? this.sessions : this.defaultSessions;
    const projectSessions = allSessions.filter(
      (s) => !s.projectId || s.projectId === currentProjectId,
    );

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
                    class="group relative flex w-full items-center justify-between px-3 py-2 rounded-xl text-sm font-bold font-sans transition-colors cursor-pointer pointer-events-auto ${this.activeTab === item.id
          ? "bg-black/8 dark:bg-white/10 text-foreground-900 font-extrabold"
          : "text-foreground-700 hover:bg-black/5 dark:hover:bg-white/8 hover:text-foreground-900"
        }"
                    @click=${() => this.handleSelect(item.id)}
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      ${this.renderNavIcon(item.id)}
                      <span class="truncate">${item.label}</span>
                    </div>
                    ${item.badge
          ? html`<span
                          class="text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded border border-black/15 dark:border-white/20 text-foreground-600 leading-none"
                          >${item.badge}</span
                        >`
          : ""}
                  </button>
                `,
    )}
            </div>


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
