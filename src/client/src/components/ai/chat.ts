import { html, type TemplateResult } from "lit";

import { isNearScrollBottom } from "../../chatScrollPosition";
import "./message";

const BUTTON_CLASS =
  "absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 cursor-pointer items-center gap-1.5 rounded-full border border-black/10 bg-background px-3 py-1.5 text-xs font-medium text-foreground-900 transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10";

/**
 * Chat thread scroller. The HOST is the scroll container and its children are
 * the caller's own nodes (messages, checkpoints, ...). Light DOM has no slots
 * and Lit's render() would clobber those children, so this is a plain
 * HTMLElement: it never renders a template. Instead it
 *   - observes its subtree (MutationObserver) and direct children
 *     (ResizeObserver) and re-pins to the bottom while the user is pinned;
 *   - appends one imperative "Scroll to latest" button (zero-height sticky
 *     wrapper, always kept as the last child) shown only when not pinned.
 * Give the host a height (e.g. `class="h-96"`); it adds overflow-y-auto itself.
 */
const DomBase = (globalThis.HTMLElement ?? class {}) as typeof HTMLElement;
export class AiChat extends DomBase {
  private pinned = true;
  private readonly wrap = document.createElement("div");
  private readonly button = document.createElement("button");
  private readonly mutations = new MutationObserver(() => this.onContentChange());
  private readonly resizes = new ResizeObserver(() => this.stick());

  constructor() {
    super();
    this.wrap.className = "sticky bottom-0 h-0 overflow-visible";
    this.wrap.dataset["aiChatButton"] = "";
    this.button.type = "button";
    this.button.className = BUTTON_CLASS;
    this.button.textContent = "Scroll to latest";
    this.button.setAttribute("aria-label", "Scroll to latest message");
    this.button.style.display = "none"; // not `hidden`: Tailwind's inline-flex would override it
    this.button.addEventListener("click", () => this.scrollToBottom());
    this.wrap.append(this.button);
  }

  connectedCallback(): void {
    this.classList.add("block", "overflow-y-auto", "relative");
    this.setAttribute("role", "log");
    this.addEventListener("scroll", this.onScroll, { passive: true });
    this.mutations.observe(this, { childList: true, subtree: true, characterData: true });
    this.onContentChange();
    this.scrollTop = this.scrollHeight;
  }

  disconnectedCallback(): void {
    this.removeEventListener("scroll", this.onScroll);
    this.mutations.disconnect();
    this.resizes.disconnect();
  }

  /** Jump to the newest content and re-pin. */
  scrollToBottom(behavior: ScrollBehavior = "smooth"): void {
    this.pinned = true;
    this.button.style.display = "none";
    this.scrollTo({ top: this.scrollHeight, behavior });
  }

  private readonly onScroll = (): void => {
    this.pinned = isNearScrollBottom(this);
    this.button.style.display = this.pinned ? "none" : "";
  };

  private onContentChange(): void {
    // Keep the button last without re-triggering ourselves when already last.
    if (this.lastElementChild !== this.wrap) this.append(this.wrap);
    this.resizes.disconnect();
    for (const child of this.children) if (child !== this.wrap) this.resizes.observe(child);
    this.stick();
  }

  private stick(): void {
    if (this.pinned) this.scrollTop = this.scrollHeight;
    else this.button.style.display = isNearScrollBottom(this) ? "none" : "";
  }
}

// Guarded: modules importing the AI elements are loaded by bun tests without a DOM.
if (typeof customElements !== "undefined") customElements.define("ai-chat", AiChat);

export const chatDemo = (): TemplateResult => html`
  <ai-chat class="mx-auto h-72 w-full max-w-md">
    <div class="flex flex-col gap-6 p-4">
      <ai-message sender="user" text="How do I add a settings dialog?"></ai-message>
      <ai-message sender="assistant" text="Install Dialog, then open it from the gear button in the header. Focus moves into the dialog when it opens, and **Esc** closes it."></ai-message>
      <ai-message sender="user" text="Can it close on outside click too?"></ai-message>
      <ai-message sender="assistant" text="Yes. Dialog closes on outside click by default."></ai-message>
    </div>
  </ai-chat>
`;
