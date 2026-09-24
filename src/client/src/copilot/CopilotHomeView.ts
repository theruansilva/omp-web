import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./CopilotComposer";

@customElement("copilot-home-view")
export class CopilotHomeView extends LitElement {
  @property({ type: String }) greeting = "Hey Guest, what’s on your mind today?";
  @property({ type: Boolean }) isWorking = false;

  protected override createRenderRoot() {
    return this;
  }

  override render() {
    return html`
      <div class="relative flex flex-1 flex-col items-center justify-center h-full px-4 w-full max-w-4xl mx-auto -mt-8">
        <!-- Prominent Hero Greeting -->
        <h1
          class="text-[28px] md:text-[32px] font-semibold tracking-[-0.02em] text-foreground-900 mb-8 text-center font-ginto select-none"
        >
          ${this.greeting}
        </h1>

        <!-- Central Floating Composer -->
        <copilot-composer
          .isWorking=${this.isWorking}
          @submit-prompt=${(e: CustomEvent) => {
        // Forward event upwards
        this.dispatchEvent(new CustomEvent("submit-prompt", { detail: e.detail, bubbles: true, composed: true }));
      }}
        ></copilot-composer>

        <!-- Terms & Privacy Disclaimer -->
        <p class="mt-8 text-[11px] md:text-[12px] text-foreground-500/80 text-center max-w-lg leading-relaxed select-none">
          Copilot is an AI and may make mistakes. Using Copilot means you agree to the
          <a href="#" class="underline hover:text-foreground-700 transition-colors">Terms of Use</a>.
          See our
          <a href="#" class="underline hover:text-foreground-700 transition-colors">Privacy Statement</a>.
        </p>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "copilot-home-view": CopilotHomeView;
  }
}
