import { html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { AiElement, emit } from "./trace";
import "../../omp/OmpMarkdown";

export type AiMessageActionId = "copy" | "edit" | "like" | "dislike" | "regenerate" | (string & {});

export interface AiMessageActionDef {
  id: AiMessageActionId;
  /** Accessible name and tooltip. */
  label: string;
  /** Toggle state (like/dislike); renders aria-pressed and a filled icon. */
  pressed?: boolean;
}

// Lucide paths, 24x24 stroke icons.
const ICONS: Record<string, string> = {
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  edit: '<path d="M21.2 5.9 18.1 2.8a1.8 1.8 0 0 0-2.5 0L3 15.4V21h5.6L21.2 8.4a1.8 1.8 0 0 0 0-2.5Z"/><path d="m15 5 4 4"/>',
  like: '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
  dislike: '<path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>',
  regenerate: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
};

function icon(name: string, filled: boolean): TemplateResult {
  const path = ICONS[name] ?? ICONS["regenerate"] ?? "";
  return html`<svg class="size-4" viewBox="0 0 24 24" fill=${filled ? "currentColor" : "none"} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" .innerHTML=${path}></svg>`;
}

/**
 * Row of ghost icon buttons under a message.
 * Events: `ai-message-action` { id } for every click. The `copy` action also
 * writes `copyText` to the clipboard (when set) and shows a check for 2s.
 */
@customElement("ai-message-actions")
export class AiMessageActions extends AiElement {
  @property({ attribute: false }) actions: AiMessageActionDef[] = [];
  /** Text written to the clipboard by the `copy` action. */
  @property({ type: String, attribute: "copy-text" }) copyText = "";
  @property({ type: String }) align: "start" | "end" = "start";
  @state() private copied = false;
  private copyTimer: number | undefined;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this.copyTimer);
  }

  private async onAction(a: AiMessageActionDef): Promise<void> {
    if (a.id === "copy") {
      if (this.copyText !== "") {
        try {
          await navigator.clipboard.writeText(this.copyText);
        } catch {
          return; // clipboard denied: no false "Copied" feedback
        }
      }
      this.copied = true;
      clearTimeout(this.copyTimer);
      this.copyTimer = window.setTimeout(() => (this.copied = false), 2000);
    }
    emit(this, "ai-message-action", { id: a.id });
  }

  override render(): TemplateResult {
    return html`<div class="flex items-center gap-0.5 ${this.align === "end" ? "justify-end" : ""}" role="toolbar" aria-label="Message actions">
      ${this.actions.map((a) => {
        const isCopied = a.id === "copy" && this.copied;
        const label = isCopied ? "Copied" : a.label;
        const toggle = a.pressed !== undefined;
        return html`<button type="button" class="inline-flex size-7 cursor-pointer items-center justify-center rounded-lg text-foreground-600 transition-colors hover:bg-black/5 hover:text-foreground-900 dark:hover:bg-white/10" aria-label=${label} title=${label} aria-pressed=${toggle ? String(a.pressed) : nothing} @click=${() => void this.onAction(a)}>${icon(isCopied ? "check" : a.id, a.pressed === true)}</button>`;
      })}
    </div>`;
  }
}

/**
 * One turn. User: right-aligned muted bubble. Assistant: plain markdown.
 * Pass `actions` to show an action row; clicks bubble up as `ai-message-action`.
 */
@customElement("ai-message")
export class AiMessage extends AiElement {
  @property({ type: String }) sender: "user" | "assistant" = "assistant";
  @property({ type: String }) text = "";
  @property({ attribute: false }) actions: AiMessageActionDef[] = [];

  override render(): TemplateResult {
    const user = this.sender === "user";
    return html`<div class="flex w-full flex-col gap-2 ${user ? "items-end" : "items-start"}" data-sender=${this.sender}>
      ${user
        ? html`<div class="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl bg-black/5 px-3.5 py-2 text-sm leading-relaxed text-foreground-900 dark:bg-white/10">${this.text}</div>`
        : html`<div class="w-full min-w-0 text-sm leading-relaxed text-foreground-900"><omp-markdown .text=${this.text}></omp-markdown></div>`}
      ${this.actions.length === 0
        ? nothing
        : html`<ai-message-actions .actions=${this.actions} .copyText=${this.text} align=${user ? "end" : "start"}></ai-message-actions>`}
    </div>`;
  }
}

const reply = "Install Dialog, then open it from the gear button in `site-header.tsx`.\n\n```bash\nnpx shadcn@latest add dialog\n```\n\nWrap the button in a `DialogTrigger` and put the settings form in `DialogContent`. Focus moves into the dialog when it opens, and **Esc** closes it.";

export const messageDemo = (): TemplateResult => html`
  <div class="mx-auto flex w-full max-w-md flex-col gap-8 py-6">
    <ai-message sender="user" text="How do I add a settings dialog? It should open from the gear icon in the header." .actions=${[{ id: "copy", label: "Copy" }, { id: "edit", label: "Edit" }]}></ai-message>
    <ai-message sender="assistant" text=${reply} .actions=${[{ id: "copy", label: "Copy" }, { id: "like", label: "Good response", pressed: false }, { id: "dislike", label: "Bad response", pressed: false }, { id: "regenerate", label: "Retry" }]}></ai-message>
  </div>
`;
