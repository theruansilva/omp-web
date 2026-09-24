import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import "./CopilotSidebar";
import "./CopilotHeader";
import "./CopilotHomeView";
import "./CopilotChatView";
import "./CopilotDiscoverView";
import "./CopilotLabsView";
import "./CopilotImagineView";
import "./CopilotShoppingView";
import type { ChatMessage } from "./CopilotChatView";
import type { SubmitPromptDetail } from "./CopilotComposer";

@customElement("copilot-app")
export class CopilotApp extends LitElement {
  @state() private activeTab = "new-chat";
  @state() private isSidebarOpen = true;
  @state() private theme: "dark" | "light" = "light";
  @state() private messages: ChatMessage[] = [];
  @state() private isStreaming = false;

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
        { id: "msg-1", role: "user", text: "Olá! Como o Copilot pode me ajudar?", timestamp: "10:30" },
        { id: "msg-2", role: "assistant", text: "Olá! O Copilot é seu assistente de inteligência artificial recriado com 100% de fidelidade visual, consumindo as classes, fontes e tokens originais da Microsoft!", timestamp: "10:30" }
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
    const userMsg: ChatMessage = {
      id: "msg-" + Date.now(),
      role: "user",
      text: detail.prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      this.messages = [...this.messages, assistantMsg];
      this.isStreaming = false;
    }, 1200);
  }

  private generateResponse(prompt: string): string {
    const lower = prompt.toLowerCase();
    if (lower.includes("image") || lower.includes("create an image")) {
      return `Here is your conceptual visualization:\n\n✨ **Generated Creative Direction:**\n- Style: High-fidelity digital rendering\n- Palette: Atmospheric illumination & cinematic contrast\n- Subject: ${prompt.replace(/create an image:?/i, "").trim()}\n\nWould you like me to refine the color grading, aspect ratio, or artistic medium?`;
    }
    if (lower.includes("audio") || lower.includes("expression")) {
      return `Copilot Audio Expressions allows generative voice and sound synthesis directly within your workflows.\n\nKey capabilities:\n1. **Zero-shot Emotion Control**: Modulate pitch, cadence, and vocal emphasis.\n2. **Multilingual Resonance**: Real-time translation with preserved timbre.\n3. **Soundscapes**: Ambient generative audio beds generated on demand.`;
    }
    if (lower.includes("shopping") || lower.includes("price") || lower.includes("chair") || lower.includes("headphone") || lower.includes("sweater") || lower.includes("deal")) {
      return `Here are the top shopping recommendations based on verified buyer reviews, current promotions, and price analysis:\n\n- **Pricing & Discounts**: Filtered for verified seasonal deals with best-price matching.\n- **Review Aggregation**: High-sentiment highlights extracted across major retailers.\n- **Quality Benchmarks**: Premium materials, standard warranty support, and durability ratings.\n\nLet me know if you would like a side-by-side comparison table!`;
    }
    return `Certainly! Regarding **"${prompt}"**:\n\nCopilot provides straightforward reasoning, real-time research, and creative assistance. Everything is running natively in your Lit components interface with full Light DOM styling, responsive mobile drawer, and Squircles integration.\n\nHow else can I assist your workflow today?`;
  }

  private getHeaderTitle(): string {
    switch (this.activeTab) {
      case "discover":
        return "Discover";
      case "shopping":
        return "Shopping";
      case "imagine":
        return "Imagine";
      case "labs":
        return "Labs";
      case "library":
        return "Library";
      case "tasks":
        return "Tasks";
      default:
        return "";
    }
  }

  private renderActiveView() {
    switch (this.activeTab) {
      case "new-chat":
        return this.messages.length === 0
          ? html`
              <copilot-home-view
                .isWorking=${this.isStreaming}
                @submit-prompt=${(e: CustomEvent<SubmitPromptDetail>) => this.handlePromptSubmit(e.detail)}
              ></copilot-home-view>
            `
          : html`
              <copilot-chat-view
                .messages=${this.messages}
                .isStreaming=${this.isStreaming}
                @submit-prompt=${(e: CustomEvent<SubmitPromptDetail>) => this.handlePromptSubmit(e.detail)}
              ></copilot-chat-view>
            `;

      case "discover":
        return html`
          <copilot-discover-view
            .isWorking=${this.isStreaming}
            @submit-prompt=${(e: CustomEvent<SubmitPromptDetail>) => this.handlePromptSubmit(e.detail)}
          ></copilot-discover-view>
        `;

      case "shopping":
        return html`
          <copilot-shopping-view
            .isWorking=${this.isStreaming}
            @submit-prompt=${(e: CustomEvent<SubmitPromptDetail>) => this.handlePromptSubmit(e.detail)}
          ></copilot-shopping-view>
        `;

      case "imagine":
        return html`
          <copilot-imagine-view
            @submit-prompt=${(e: CustomEvent<SubmitPromptDetail>) => this.handlePromptSubmit(e.detail)}
          ></copilot-imagine-view>
        `;

      case "labs":
        return html`
          <copilot-labs-view
            @submit-prompt=${(e: CustomEvent<SubmitPromptDetail>) => this.handlePromptSubmit(e.detail)}
          ></copilot-labs-view>
        `;

      case "library":
        return html`
          <div class="flex flex-1 flex-col items-center justify-center h-full px-4 text-center select-none">
            <h2 class="text-2xl font-bold text-foreground-800 font-ginto mb-2">Your Library</h2>
            <p class="text-sm text-foreground-500 max-w-sm">Saved chats, pinned generations, and project artifacts will appear here.</p>
          </div>
        `;

      case "tasks":
        return html`
          <div class="flex flex-1 flex-col items-center justify-center h-full px-4 text-center select-none">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 border border-blue-500/30 mb-3">PREVIEW</span>
            <h2 class="text-2xl font-bold text-foreground-800 font-ginto mb-2">Automated Tasks</h2>
            <p class="text-sm text-foreground-500 max-w-sm">Schedule background reasoning, recurring research summaries, and automated project tracking.</p>
          </div>
        `;

      default:
        return html``;
    }
  }

  override render() {
    return html`
      <!-- Microsoft Copilot Shell Architecture -->
      <div
        class="flex h-screen w-screen overflow-hidden bg-sidebar-light dark:bg-sidebar-dark font-sans select-none relative"
        data-theme="${this.theme}"
      >
        <!-- Mobile Backdrop Overlay when Drawer is open (z-40) -->
        ${this.isSidebarOpen
        ? html`
              <div
                class="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
                @click=${() => (this.isSidebarOpen = false)}
              ></div>
            `
        : nothing}

        <!-- 1. Sidebar Navigation: z-50 fixed on mobile (above backdrop), relative on desktop -->
        <copilot-sidebar
          class="h-full shrink-0 will-change-auto transition-all duration-300 ease-[cubic-bezier(0.43,0.195,0.02,1)] fixed md:relative inset-y-0 left-0 z-50 md:z-auto shadow-2xl md:shadow-none ${this
        .isSidebarOpen
        ? "w-[280px] md:w-[260px] min-w-[260px] translate-x-0 opacity-100"
        : "-translate-x-full md:translate-x-0 w-0 md:w-0 min-w-0 p-0 m-0 overflow-hidden md:opacity-0 pointer-events-none"}"
          .activeTab=${this.activeTab}
          .isOpen=${this.isSidebarOpen}
          @nav-select=${(e: CustomEvent<{ tab: string }>) => this.handleNavSelect(e.detail.tab)}
          @toggle-sidebar=${() => (this.isSidebarOpen = !this.isSidebarOpen)}
          @sign-in=${() => alert("Sign in demo triggered")}
        ></copilot-sidebar>

        <!-- 2. Main Stage with Microsoft Copilot Margin & Rounded Container -->
        <main
          class="relative flex flex-1 flex-col h-full min-w-0 md:py-1.5 md:pe-1.5 transition-all duration-300 ${!this
        .isSidebarOpen
        ? "md:ps-1.5"
        : ""}"
        >
          <!-- Canvas stage with background-150 and md:rounded-container -->
          <div class="relative size-full overflow-hidden md:rounded-container bg-background-150 flex flex-col">
            <!-- Topbar Controls (Sidebar toggle ONLY appears when sidebar is closed) -->
            <copilot-header
              .isSidebarOpen=${this.isSidebarOpen}
              .theme=${this.theme}
              .title=${this.getHeaderTitle()}
              @toggle-sidebar=${() => (this.isSidebarOpen = !this.isSidebarOpen)}
              @toggle-theme=${() => this.toggleTheme()}
              @sign-in=${() => alert("Sign in demo triggered")}
            ></copilot-header>

            <!-- Current Active Stage View -->
            <div class="relative flex-1 size-full overflow-hidden">
              ${this.renderActiveView()}
            </div>
          </div>
        </main>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "copilot-app": CopilotApp;
  }
}
