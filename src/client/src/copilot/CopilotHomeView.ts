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
      <div class="relative size-full overflow-hidden flex flex-col justify-between">
        <!-- Main Vertically Centered Content: Hero Greeting + Input Composer in One Cluster -->
        <div class="flex-1 flex flex-col items-center justify-center px-4 -mt-8 sm:-mt-12 w-full max-w-3xl mx-auto gap-7 z-10">
          <!-- Prominent Hero Greeting directly above the composer -->
          <h1
            class="text-2xl sm:text-[32px] font-semibold tracking-[-0.02em] text-foreground-900 text-center font-ginto select-none"
          >
            ${this.greeting}
          </h1>

          <!-- Main Input Composer centered directly beneath greeting -->
          <div class="w-full max-w-[720px]">
            <copilot-composer
              .isWorking=${this.isWorking}
              @submit-prompt=${(e: CustomEvent) => {
        this.dispatchEvent(new CustomEvent("submit-prompt", { detail: e.detail, bubbles: true, composed: true }));
      }}
            ></copilot-composer>
          </div>
        </div>

        <!-- Terms & Privacy Disclaimer pinned at the bottom -->
        <div class="pb-4 px-4 flex justify-center z-10 select-none">
          <p class="text-[11px] md:text-[12px] text-foreground-500/80 text-center max-w-lg leading-relaxed">
            Copilot is an AI and may make mistakes. Using Copilot means you agree to the
            <a href="#" class="underline hover:text-foreground-700 transition-colors">Terms of Use</a>.
            See our
            <a href="#" class="underline hover:text-foreground-700 transition-colors">Privacy Statement</a>.
          </p>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "copilot-home-view": CopilotHomeView;
  }
}
