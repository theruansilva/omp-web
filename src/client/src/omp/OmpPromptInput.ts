/**
 * Plain-text editable that mimics the slice of the <textarea> API the composer uses
 * (value, selectionStart/End, setSelectionRange). It is a contenteditable because
 * extensions such as Vimium C move the cursor with Selection.modify, which Firefox
 * does not apply inside form controls.
 */
// Unit tests run without a DOM; the class only needs a base to exist at import time.
const Base: typeof HTMLElement = typeof HTMLElement === "undefined" ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

export class OmpPromptInput extends Base {
  private plaintext = true;

  connectedCallback(): void {
    if (this.hasAttribute("contenteditable")) return;
    // plaintext-only needs Chrome 51+/Firefox 136+; older Firefox falls back to rich editing.
    this.plaintext = this.supportsPlaintextOnly();
    this.setAttribute("contenteditable", this.plaintext ? "plaintext-only" : "true");
    this.setAttribute("role", "textbox");
    this.setAttribute("aria-multiline", "true");
    this.addEventListener("input", this.syncEmpty);
    this.syncEmpty();
  }

  get value(): string {
    return this.plaintext ? (this.textContent ?? "") : this.innerText;
  }

  set value(next: string) {
    // Re-assigning the same text on every render would reset the caret.
    if (next === this.value) return;
    this.textContent = next;
    this.syncEmpty();
  }

  get selectionStart(): number {
    return this.offsetOf("start");
  }

  get selectionEnd(): number {
    return this.offsetOf("end");
  }

  setSelectionRange(start: number, end: number): void {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    const from = this.locate(start);
    const to = this.locate(end);
    range.setStart(from.node, from.offset);
    range.setEnd(to.node, to.offset);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  private readonly syncEmpty = (event?: Event): void => {
    // After deleting everything, browsers leave a stray <br> or a lone "\n" (Firefox), which
    // would hide the placeholder and keep a blank second line. Typing a newline is left alone.
    const text = this.textContent ?? "";
    const deleted = event instanceof InputEvent && event.inputType.startsWith("delete");
    if ((text === "" && this.childNodes.length > 0) || (deleted && text.trim() === "")) this.textContent = "";
    this.toggleAttribute("data-empty", this.value === "");
  };

  private supportsPlaintextOnly(): boolean {
    const probe = document.createElement("div");
    probe.setAttribute("contenteditable", "plaintext-only");
    return probe.contentEditable === "plaintext-only";
  }

  private offsetOf(edge: "start" | "end"): number {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return this.value.length;
    const range = selection.getRangeAt(0);
    if (!this.contains(range.commonAncestorContainer)) return this.value.length;
    const measure = document.createRange();
    measure.selectNodeContents(this);
    if (edge === "start") measure.setEnd(range.startContainer, range.startOffset);
    else measure.setEnd(range.endContainer, range.endOffset);
    return measure.toString().length;
  }

  private locate(offset: number): { node: Node; offset: number } {
    const walker = document.createTreeWalker(this, NodeFilter.SHOW_TEXT);
    let remaining = Math.max(0, offset);
    let last: Node | null = null;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const length = node.textContent?.length ?? 0;
      if (remaining <= length) return { node, offset: remaining };
      remaining -= length;
      last = node;
    }
    return last ? { node: last, offset: last.textContent?.length ?? 0 } : { node: this, offset: 0 };
  }
}

if (typeof customElements !== "undefined" && !customElements.get("omp-prompt-input")) {
  customElements.define("omp-prompt-input", OmpPromptInput);
}

declare global {
  interface HTMLElementTagNameMap {
    "omp-prompt-input": OmpPromptInput;
  }
}
