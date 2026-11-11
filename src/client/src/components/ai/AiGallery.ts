import { html, type TemplateResult } from "lit";
import { customElement } from "lit/decorators.js";
import { AiElement } from "./trace";
import { chainOfThoughtDemo } from "./chain-of-thought";
import { chatDemo } from "./chat";
import { checkpointDemo } from "./checkpoint";
import { confirmationDemo } from "./confirmation";
import { planDemo } from "./plan";
import { queueDemo } from "./queue";
import { reasoningDemo } from "./reasoning";
import { stackTraceDemo } from "./stack-trace";
import { subagentDemo } from "./subagent";
import { suggestionDemo } from "./suggestion";
import { taskDemo } from "./task";
import { terminalDemo } from "./terminal";
import { toolDemo } from "./tool";

const SECTIONS: readonly [title: string, demo: () => TemplateResult][] = [
  ["Chat", chatDemo],
  ["Reasoning", reasoningDemo],
  ["Chain of Thought", chainOfThoughtDemo],
  ["Tool", toolDemo],
  ["Confirmation", confirmationDemo],
  ["Terminal", terminalDemo],
  ["Stack Trace", stackTraceDemo],
  ["Subagent", subagentDemo],
  ["Task", taskDemo],
  ["Plan", planDemo],
  ["Queue", queueDemo],
  ["Suggestion", suggestionDemo],
  ["Checkpoint", checkpointDemo],
];

/** Static catalogue of every AI element. Open via `?tab=ai-elements`. */
@customElement("ai-gallery")
export class AiGallery extends AiElement {
  override render() {
    return html`
      <div class="h-full overflow-y-auto">
        <div class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
          <h1 class="text-[17px] font-semibold tracking-tight text-foreground-900">AI Elements</h1>
          ${SECTIONS.map(([title, demo]) => html`
            <section class="omp-settings-card flex flex-col gap-3 rounded-3xl p-5" style="clip-path: var(--clip-path-squircle-28, none);">
              <h2 class="text-[11.5px] font-semibold uppercase tracking-wide text-foreground-600">${title}</h2>
              ${demo()}
            </section>
          `)}
        </div>
      </div>
    `;
  }
}
