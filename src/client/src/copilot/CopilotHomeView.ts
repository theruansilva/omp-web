import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./CopilotComposer";

@customElement("copilot-home-view")
export class CopilotHomeView extends LitElement {
  @property({ type: String }) greeting = "Hey Ruan, what’s on your mind today?";
  @property({ type: Boolean }) isWorking = false;

  protected override createRenderRoot() {
    return this;
  }

  override render() {
    return html`
      <!-- Microsoft Copilot Exact Home View Structure -->
      <div class="relative size-full overflow-hidden flex flex-col justify-between">
        <!-- Main Vertically Centered Content: Hero Greeting + Input Composer in One Cluster -->
        <div class="flex-1 flex flex-col items-center justify-center px-4 -mt-8 sm:-mt-12 w-full max-w-chat mx-auto gap-8 z-10">
          <!-- Prominent Hero Greeting directly above the composer with Ginto variable font settings -->
          <h1
            class="text-3xl sm:text-[38px] font-semibold tracking-[-0.02em] text-foreground-800 text-center font-ginto [font-variation-settings:'opsz'_40,_'wght'_500] select-none"
          >
            ${this.greeting}
          </h1>

          <!-- Main Input Composer centered directly beneath greeting -->
          <div class="w-full max-w-chat flex justify-center">
            <copilot-composer
              .isWorking=${this.isWorking}
              @submit-prompt=${(e: CustomEvent) => {
                this.dispatchEvent(
                  new CustomEvent("submit-prompt", {
                    detail: e.detail,
                    bubbles: true,
                    composed: true,
                  }),
                );
              }}
            ></copilot-composer>
          </div>
        </div>

        <!-- Terms & Privacy Disclaimer pinned at the bottom -->
        <div class="pb-4 px-4 flex justify-center z-10 select-none">
          <p class="text-[11px] md:text-[12px] text-foreground-500 text-center max-w-lg leading-relaxed">
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
