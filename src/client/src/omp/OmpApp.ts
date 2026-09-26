import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import "./OmpSidebar";
import "./OmpHeader";
import "./OmpHomeView";
import "./OmpChatView";
import "./OmpLoginModal";
import "./OmpTasksBanner";
import "./OmpLibraryView";
import "./OmpProjectsView";
import "./OmpProjectDetailView";
import type { ChatMessage } from "./OmpChatView";
import type { SubmitPromptDetail, BtwState } from "./OmpComposer";

@customElement("omp-app")
export class OmpApp extends LitElement {
  @state() private activeTab = "new-chat";
  @state() private isSidebarOpen = true;
  @state() private theme: "dark" | "light" = "dark";
  @state() private messages: ChatMessage[] = [];
  @state() private isStreaming = false;
  @state() private isFirstPrompt = false;
  @state() private isLoginModalOpen = false;
  @state() private currentUser: string | null = null;
  @state() private selectedProjectId = "proj-1";
  @state() private selectedSessionId = "sess-1";
  @state() private btwState?: BtwState;
  private lastPromptTime = 0;

  protected override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    // On mobile screens (< 768px), start with sidebar drawer closed
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      this.isSidebarOpen = false;
    }

    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam) {
      this.activeTab = tabParam;
    }
    const themeParam = params.get("theme");
    if (themeParam === "light" || themeParam === "dark") {
      this.theme = themeParam;
    }
    const sidebarParam = params.get("sidebar");
    if (sidebarParam === "closed") {
      this.isSidebarOpen = false;
    } else if (sidebarParam === "open") {
      this.isSidebarOpen = true;
    }
    if (params.get("mock") === "chat") {
      this.messages = [
        {
          id: "msg-1",
          role: "user",
          text: "Olá! Como o OMP pode me ajudar?",
          timestamp: "10:30",
        },
        {
          id: "msg-2",
          role: "assistant",
          text: "Olá! O OMP é seu cockpit de inteligência artificial definitivo, com design acrílico e tokens semânticos OKLCH!",
          timestamp: "10:30",
        },
      ];
    }
    this.applyTheme(this.theme);
  }

  private applyTheme(theme: "dark" | "light") {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }
  }

  private toggleTheme() {
    this.theme = this.theme === "dark" ? "light" : "dark";
    this.applyTheme(this.theme);
  }

  private handleNavSelect(tab: string) {
    this.activeTab = tab;
    // On mobile, automatically close drawer upon selecting a link
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      this.isSidebarOpen = false;
    }
    if (tab === "new-chat" && this.messages.length > 0) {
      this.messages = [];
    }
  }

  private handlePromptSubmit(detail: SubmitPromptDetail) {
    const promptTrimmed = detail.prompt.trim();
    if (promptTrimmed.toLowerCase().startsWith("/btw")) {
      const question = promptTrimmed.replace(/^\/btw\s*/i, "").trim() || "Como posso te ajudar?";
      this.handleBtwSubmit(question);
      return;
    }

    const now = Date.now();
    if (this.isStreaming || (now - this.lastPromptTime < 350)) return;
    this.lastPromptTime = now;
    if (this.messages.length === 0) {
      this.isFirstPrompt = true;
      setTimeout(() => {
        this.isFirstPrompt = false;
      }, 600);
    }

    const userMsg: ChatMessage = {
      id: "msg-" + Date.now(),
      role: "user",
      text: detail.prompt,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    this.messages = [...this.messages, userMsg];
    this.activeTab = "new-chat";
    this.isStreaming = true;

    setTimeout(() => {
      const assistantText = this.generateResponse(detail.prompt);
      const assistantMsg: ChatMessage = {
        id: "msg-" + (Date.now() + 1),
        role: "assistant",
        text: assistantText,
        hasAgentProcess: true,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      this.messages = [...this.messages, assistantMsg];
      this.isStreaming = false;
    }, 1200);
  }

  private handleBtwSubmit(question: string) {
    this.btwState = {
      status: "running",
      question,
      answer: "",
      canBranch: true,
    };
    this.activeTab = "new-chat";

    const mockAnswer = `Esta é uma resposta lateral efêmera para **"${question}"** gerada com o contexto ativo da sessão.\n\nComo o \`/btw\` não altera o histórico principal da conversa, este contexto permanece isolado. Você pode copiar esta resposta ou clicar em **"Branch para Sessão"** para continuar explorando este tópico em uma nova conversa!`;

    let progress = 0;
    const interval = setInterval(() => {
      progress += 16;
      if (progress >= mockAnswer.length) {
        clearInterval(interval);
        this.btwState = {
          status: "complete",
          question,
          answer: mockAnswer,
          canBranch: true,
        };
      } else {
        this.btwState = {
          status: "running",
          question,
          answer: mockAnswer.slice(0, progress),
          canBranch: true,
        };
      }
    }, 35);
  }

  private handleBranchBtw(state?: BtwState) {
    const target = state || this.btwState;
    if (!target?.answer) return;
    const question = target.question;
    const answer = target.answer;
    this.btwState = undefined;
    this.messages = [
      ...this.messages,
      {
        id: "msg-" + Date.now(),
        role: "user",
        text: `[Branch /btw] ${question}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
      {
        id: "msg-" + (Date.now() + 1),
        role: "assistant",
        text: answer,
        hasAgentProcess: false,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ];
    this.activeTab = "new-chat";
  }

  private generateResponse(prompt: string): string {
    return `Certainly! Regarding **"${prompt}"**:\n\nOMP provides straightforward reasoning, real-time research, and creative assistance. Everything is running natively in your Lit components interface with full Light DOM styling, responsive mobile drawer, and Squircles integration.\n\nHow else can I assist your workflow today?`;
  }

  private getHeaderTitle(): string {
    switch (this.activeTab) {
      case "library":
        return "Library";
      case "projects":
        return "Projetos";
      case "project-detail":
        return "Projeto";
      default:
        return "";
    }
  }

  private renderActiveView() {
    switch (this.activeTab) {
      case "new-chat":
        return this.messages.length === 0
          ? html`
              <omp-home-view
                .isWorking=${this.isStreaming}
                .selectedProjectId=${this.selectedProjectId}
                @project-select=${(e: CustomEvent<{ projectId: string }>) => {
                  this.selectedProjectId = e.detail.projectId;
                  this.activeTab = "project-detail";
                }}
                @submit-prompt=${(e: CustomEvent<SubmitPromptDetail>) => this.handlePromptSubmit(e.detail)}
              ></omp-home-view>
            `
          : html`
              <omp-chat-view
                .messages=${this.messages}
                .isStreaming=${this.isStreaming}
                .isFirstPrompt=${this.isFirstPrompt}
                .selectedProjectId=${this.selectedProjectId}
                .btwState=${this.btwState}
                @project-select=${(e: CustomEvent<{ projectId: string }>) => {
                  this.selectedProjectId = e.detail.projectId;
                  this.activeTab = "project-detail";
                }}
                @submit-btw=${(e: CustomEvent<{ question: string }>) => this.handleBtwSubmit(e.detail.question)}
                @branch-btw=${(e: CustomEvent<{ state?: BtwState }>) => this.handleBranchBtw(e.detail?.state)}
                @close-btw=${() => { this.btwState = undefined; }}
                @submit-prompt=${(e: CustomEvent<SubmitPromptDetail>) => this.handlePromptSubmit(e.detail)}
              ></omp-chat-view>
            `;

      case "library":
        return html`
          <omp-library-view
            .isWorking=${this.isStreaming}
            @submit-prompt=${(e: CustomEvent<SubmitPromptDetail>) => this.handlePromptSubmit(e.detail)}
          ></omp-library-view>
          <div class="fixed bottom-0 flex w-full items-center justify-center px-4 pointer-events-none z-20">
            <omp-tasks-banner
              @sign-in=${() => (this.isLoginModalOpen = true)}
            ></omp-tasks-banner>
          </div>
        `;

      case "projects":
        return html`
          <omp-projects-view
            .selectedProjectId=${this.selectedProjectId}
            .isWorking=${this.isStreaming}
            @project-open=${(e: CustomEvent<{ projectId: string }>) => {
              this.selectedProjectId = e.detail.projectId;
              this.activeTab = "project-detail";
            }}
            @project-select=${(e: CustomEvent<{ projectId: string }>) => {
              this.selectedProjectId = e.detail.projectId;
              this.activeTab = "project-detail";
            }}
            @submit-prompt=${(e: CustomEvent<SubmitPromptDetail>) => {
              this.handlePromptSubmit(e.detail);
            }}
          ></omp-projects-view>
        `;

      case "project-detail":
        return html`
          <omp-project-detail-view
            .projectId=${this.selectedProjectId}
            .isWorking=${this.isStreaming}
            @back-to-projects=${() => {
              this.activeTab = "projects";
            }}
            @project-select=${(e: CustomEvent<{ projectId: string }>) => {
              this.selectedProjectId = e.detail.projectId;
              this.activeTab = "project-detail";
            }}
            @project-delete=${(e: CustomEvent<{ projectId: string }>) => {
              if (this.selectedProjectId === e.detail.projectId) {
                this.selectedProjectId = "proj-1";
              }
            }}
            @session-select=${(e: CustomEvent<{ sessionId: string }>) => {
              this.selectedSessionId = e.detail.sessionId;
              this.activeTab = "new-chat";
            }}
            @submit-prompt=${(e: CustomEvent<SubmitPromptDetail>) => {
              this.handlePromptSubmit(e.detail);
            }}
          ></omp-project-detail-view>
        `;

      default:
        return html``;
    }
  }

  override render() {
    return html`
      <!-- OMP Web Shell Architecture -->
      <div
        class="flex h-full h-dvh w-full overflow-hidden bg-sidebar-light dark:bg-sidebar-dark font-sans select-none relative"
        data-theme="${this.theme}"
      >
        <!-- Mobile Backdrop Overlay when Drawer is open (z-40) -->
        ${
          this.isSidebarOpen
            ? html`
              <div
                class="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
                @click=${() => (this.isSidebarOpen = false)}
              ></div>
            `
            : nothing
        }

        <!-- 1. Sidebar Navigation: z-50 fixed on mobile (above backdrop), relative on desktop -->
        <omp-sidebar
          class="h-full shrink-0 will-change-auto transition-all duration-300 ease-[cubic-bezier(0.43,0.195,0.02,1)] fixed md:relative inset-y-0 left-0 z-50 md:z-auto shadow-2xl md:shadow-none ${
            this.isSidebarOpen
              ? "w-[280px] md:w-[260px] min-w-[260px] translate-x-0 opacity-100"
              : "-translate-x-full md:translate-x-0 w-0 md:w-0 min-w-0 p-0 m-0 overflow-hidden md:opacity-0 pointer-events-none"
          }"
          .activeTab=${this.activeTab}
          .isOpen=${this.isSidebarOpen}
          .selectedProjectId=${this.selectedProjectId}
          .selectedSessionId=${this.selectedSessionId}
          @project-select=${(e: CustomEvent<{ projectId: string }>) => {
            this.selectedProjectId = e.detail.projectId;
            this.activeTab = "project-detail";
          }}
          @session-select=${(e: CustomEvent<{ sessionId: string }>) => {
            this.selectedSessionId = e.detail.sessionId;
            this.activeTab = "new-chat";
          }}
          @nav-select=${(e: CustomEvent<{ tab: string }>) => this.handleNavSelect(e.detail.tab)}
          @toggle-sidebar=${() => (this.isSidebarOpen = !this.isSidebarOpen)}
          @sign-in=${() => (this.isLoginModalOpen = true)}
        ></omp-sidebar>

        <!-- 2. Main Stage with OMP Web Margin & Rounded Container -->
        <main
          class="relative flex flex-1 flex-col h-full min-w-0 md:py-1.5 md:pe-1.5 transition-all duration-300 ${
            !this.isSidebarOpen ? "md:ps-1.5" : ""
          }"
        >
          <!-- Canvas stage with background-150 and md:rounded-container -->
          <div class="relative size-full overflow-hidden md:rounded-container bg-background-150 flex flex-col">
            <!-- Topbar Controls (Sidebar toggle ONLY appears when sidebar is closed) -->
            <omp-header
              .isSidebarOpen=${this.isSidebarOpen}
              .theme=${this.theme}
              .currentUser=${this.currentUser}
              .title=${this.getHeaderTitle()}
              @toggle-sidebar=${() => (this.isSidebarOpen = !this.isSidebarOpen)}
              @toggle-theme=${() => this.toggleTheme()}
              @sign-in=${() => (this.isLoginModalOpen = true)}
              @sign-out=${() => (this.currentUser = null)}
            ></omp-header>

            <!-- Current Active Stage View -->
            <div
              class="relative flex-1 size-full overflow-hidden"
              @project-select=${(e: CustomEvent<{ projectId: string }>) => {
                this.selectedProjectId = e.detail.projectId;
                this.activeTab = "project-detail";
              }}
            >
              ${this.renderActiveView()}
            </div>
          </div>
        </main>
        <!-- Login Modal Component -->
        <omp-login-modal
          .isOpen=${this.isLoginModalOpen}
          .theme=${this.theme}
          @close=${() => (this.isLoginModalOpen = false)}
          @login-success=${(e: CustomEvent<{ username: string }>) => {
            this.currentUser = e.detail.username;
            this.isLoginModalOpen = false;
          }}
        ></omp-login-modal>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "omp-app": OmpApp;
  }
}
