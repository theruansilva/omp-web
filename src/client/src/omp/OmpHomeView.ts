import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./OmpComposer";
import type { ComposerProject } from "./OmpComposer";

@customElement("omp-home-view")
export class OmpHomeView extends LitElement {
  @property({ type: String }) username: string | null = null;
  @property({ type: String }) greeting = "";
  @property({ type: Boolean }) isWorking = false;
  @property({ attribute: false }) projects: ComposerProject[] = [];
  @property({ type: String }) selectedProjectId = "proj-1";

  protected override createRenderRoot() {
    return this;
  }

  override render() {
    const trimmedUser = this.username?.trim();
    const displayGreeting =
      this.greeting ||
      (trimmedUser ? `Hey ${trimmedUser}, what’s on your mind today?` : "Hey, what’s on your mind today?");

    return html`
      <!-- OMP Web Exact Home View Structure with Fixed Bottom Composer Dock -->
      <div class="relative size-full overflow-hidden flex flex-col justify-between">
        <!-- Main Vertically Centered Content: Hero Greeting -->
        <div class="flex-1 flex flex-col items-center justify-center px-4 w-full max-w-chat mx-auto z-10 pb-20">
          <h1
            class="text-3xl sm:text-[38px] font-semibold tracking-[-0.02em] text-foreground-800 text-center font-ginto [font-variation-settings:'opsz'_40,_'wght'_500] select-none"
          >
            ${displayGreeting}
          </h1>
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
              @submit-prompt=${(e: CustomEvent) => {
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
    "omp-home-view": OmpHomeView;
  }
}
