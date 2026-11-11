import { html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { AiElement, emit, traceContent, traceLine, type AiStatus } from "./trace";

export interface AiThoughtResult {
  title: string;
  url?: string;
}

export interface AiThoughtStep {
  id: string;
  label: string;
  description?: string;
  status: AiStatus;
  /** Search results, rendered as links. */
  results?: AiThoughtResult[];
  /** Short chips (e.g. file names). */
  badges?: string[];
}

const CHIP = "rounded-full bg-black/5 px-2 py-0.5 font-mono text-[11px] text-foreground-700 dark:bg-white/10";

/** Summary line ("Researched in N steps") that expands into the steps taken. */
@customElement("ai-chain-of-thought")
export class AiChainOfThought extends AiElement {
  @property({ attribute: false }) steps: AiThoughtStep[] = [];
  @property({ type: Boolean }) running = false;
  @property({ type: Boolean }) open: boolean | undefined;
  @state() private userOpen: boolean | undefined;
  @state() private stepOpen: Record<string, boolean> = {};

  private renderStep(s: AiThoughtStep): TemplateResult {
    const hasBody = s.description !== undefined || (s.results?.length ?? 0) > 0 || (s.badges?.length ?? 0) > 0;
    if (!hasBody) return traceLine({ status: s.status, title: s.label });
    const open = this.stepOpen[s.id] ?? false;
    const onToggle = (): void => {
      this.stepOpen = { ...this.stepOpen, [s.id]: !open };
    };
    return html`
      ${traceLine({ status: s.status, title: s.label, open, onToggle })}
      ${open
        ? traceContent(html`
            ${s.description === undefined ? nothing : html`<p class="mb-1 whitespace-pre-wrap">${s.description}</p>`}
            ${(s.results ?? []).map((r) =>
              r.url === undefined
                ? traceLine({ title: r.title })
                : html`<a class="block rounded-lg hover:bg-black/5 dark:hover:bg-white/10" href=${r.url} target="_blank" rel="noreferrer">${traceLine({ title: r.title })}<span class="sr-only"> (opens in a new tab)</span></a>`,
            )}
            ${(s.badges?.length ?? 0) > 0 ? html`<div class="flex flex-wrap gap-1.5">${s.badges!.map((b) => html`<span class=${CHIP}>${b}</span>`)}</div>` : nothing}
          `)
        : nothing}
    `;
  }

  protected override render(): TemplateResult {
    const failed = this.steps.filter((s) => s.status === "error").length;
    const status: AiStatus = this.running ? "running" : failed > 0 ? "error" : "done";
    const title = this.running ? "Researching" : `Researched in ${this.steps.length} steps${failed > 0 ? `, ${failed} failed` : ""}`;
    const open = this.open ?? this.userOpen ?? this.running;
    const onToggle = (): void => {
      this.userOpen = !open;
      emit(this, "ai-toggle", { open: !open });
    };
    return html`
      ${traceLine({ status, title, open, onToggle, shimmer: true })}
      ${open ? traceContent(this.steps.map((s) => this.renderStep(s))) : nothing}
    `;
  }
}

export const chainOfThoughtDemo = (): TemplateResult => html`
  <ai-chain-of-thought class="block max-w-sm" open .steps=${[
    { id: "1", label: "Read the build log for dpl_8Kx2", status: "done", description: "install 41s\ncompile 38s\nimages 3m 52s" },
    { id: "2", label: "Searched the web for next.js image cache key", status: "done", results: [
      { title: "Image component | nextjs.org", url: "https://nextjs.org/docs/app/api-reference/components/image" },
      { title: "Build cache | vercel.com", url: "https://vercel.com/docs/deployments/troubleshoot-a-build" },
    ] },
    { id: "3", label: "Searched the code for cacheKey", status: "done", badges: ["next.config.ts", "scripts/optimize-images.ts"] },
  ]}></ai-chain-of-thought>
`;
