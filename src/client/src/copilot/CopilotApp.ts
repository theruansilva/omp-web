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
    // Start closed on mobile devices
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
    // Auto-close drawer on mobile upon selection
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
    if (lower.includes("shopping") || lower.includes("price") || lower.includes("chair") || lower.includes("headphone")) {
      return `Here are the top considerations based on recent user feedback and verified benchmarks:\n\n- **Build Quality & Durability**: Premium materials with robust warranties.\n- **Value Comparison**: Competitive tier pricing with seasonal discounts available.\n- **Compatibility**: Plug-and-play integration with standard workspaces.\n\nLet me know if you would like a detailed side-by-side spec sheet!`;
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
      <!-- Microsoft Copilot Shell Architecture with Mobile Drawer -->
      <div
        class="flex h-screen w-screen overflow-hidden bg-sidebar-light dark:bg-sidebar-dark font-sans select-none relative"
        data-theme="${this.theme}"
      >
        <!-- Mobile Backdrop Overlay when Drawer is open -->
        ${this.isSidebarOpen
        ? html`
              <div
                class="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
                @click=${() => (this.isSidebarOpen = false)}
              ></div>
            `
        : nothing}

        <!-- 1. Sidebar Navigation (Desktop pinned, Mobile slide-in drawer) -->
        <copilot-sidebar
          .activeTab=${this.activeTab}
          .isOpen=${this.isSidebarOpen}
          @nav-select=${(e: CustomEvent<{ tab: string }>) => this.handleNavSelect(e.detail.tab)}
          @toggle-sidebar=${() => (this.isSidebarOpen = !this.isSidebarOpen)}
          @sign-in=${() => alert("Sign in demo triggered")}
        ></copilot-sidebar>

        <!-- 2. Main Stage with Microsoft Copilot Margin & Rounded Container -->
        <main
          class="relative flex flex-1 flex-col h-full min-w-0 md:py-1.5 md:pe-1.5 transition-all duration-300"
        >
          <!-- Canvas stage with background-150 and md:rounded-container -->
          <div class="relative size-full overflow-hidden md:rounded-container bg-background-150">
            <!-- Topbar Controls (Menu toggle always available on mobile) -->
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
