import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import katexStyles from "katex/dist/katex.min.css?inline";
import mermaid from "mermaid";
import { toSafeMarkdownHtml } from "../formatting/markdown";
import { openDiagramLightbox } from "./diagramLightbox";
import { formattedTextStyles } from "./shared";

@customElement("formatted-text")
export class FormattedText extends LitElement {
  @property() text = "";

  override render() {
    return html`<div class="formatted" dir="auto" @click=${this.onFormattedClick} @keydown=${this.onFormattedKeyDown}>${unsafeHTML(toSafeMarkdownHtml(this.text))}</div>`;
  }

  override updated(): void {
    this.enhanceCodeBlocks();
    void this.renderMermaidDiagrams();
  }

  private enhanceCodeBlocks(): void {
    this.renderRoot.querySelectorAll("pre").forEach((element) => {
      if (!(element instanceof HTMLPreElement) || element.parentElement?.classList.contains("code-block-wrapper") === true) return;
      const code = element.querySelector("code");
      if (!(code instanceof HTMLElement)) return;
      const wrapper = document.createElement("div");
      wrapper.className = "code-block-wrapper";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "code-copy-button";
      button.title = "Copy code block";
      button.setAttribute("aria-label", "Copy code block");
      const icon = document.createElement("span");
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = "⧉";
      button.append(icon);
      element.before(wrapper);
      wrapper.append(element, button);
    });
  }

  private async renderMermaidDiagrams(): Promise<void> {
    const wrappers = this.renderRoot.querySelectorAll<HTMLElement>(".mermaid-diagram-wrapper:not([data-rendered])");
    if (wrappers.length === 0) return;

    wrappers.forEach((w) => { w.setAttribute("data-rendered", "pending"); });

    const isDark = document.documentElement.style.colorScheme !== "light";
    try {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        theme: isDark ? "dark" : "default",
        fontFamily: "inherit",
      });
    } catch {
      // Ignore re-initialization errors
    }

    for (const wrapper of wrappers) {
      const sourceCode = wrapper.querySelector("pre.mermaid-source code")?.textContent;
      const svgContainer = wrapper.querySelector<HTMLElement>(".mermaid-svg-container");
      const asciiPre = wrapper.querySelector<HTMLElement>("pre.ascii-diagram");
      if (!sourceCode || !svgContainer) {
        wrapper.setAttribute("data-rendered", "failed");
        continue;
      }

      const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
      try {
        const { svg } = await mermaid.render(id, sourceCode.trim());
        svgContainer.innerHTML = svg;
        if (asciiPre) asciiPre.style.display = "none";
        wrapper.setAttribute("data-rendered", "true");
      } catch {
        wrapper.setAttribute("data-rendered", "failed");
        if (!asciiPre) {
          const sourcePre = wrapper.querySelector<HTMLElement>("pre.mermaid-source");
          if (sourcePre) sourcePre.style.display = "";
        }
      }
    }
  }

  private readonly onFormattedKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== " " && event.key !== "Enter") return;
    if (!(event.target instanceof Element)) return;
    const optionItem = event.target.closest(".ui-option-item");
    if (optionItem instanceof HTMLElement) {
      const card = optionItem.closest(".ui-options-card");
      if (card instanceof HTMLElement && card.getAttribute("data-interactive") === "false") {
        return;
      }
      event.preventDefault();
      optionItem.click();
    }
  };

  private readonly onFormattedClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    // Checkbox / Option Item click
    const optionItem = event.target.closest(".ui-option-item");
    if (optionItem instanceof HTMLElement) {
      const card = optionItem.closest(".ui-options-card");
      if (card instanceof HTMLElement) {
        if (card.getAttribute("data-interactive") === "false") {
          return;
        }
        const isSingle = card.getAttribute("data-mode") === "single" || optionItem.getAttribute("role") === "radio";
        const wasSelected = optionItem.classList.contains("selected");

        if (isSingle) {
          card.querySelectorAll<HTMLElement>(".ui-option-item").forEach((item) => {
            if (item !== optionItem) {
              item.classList.remove("selected");
              item.setAttribute("aria-checked", "false");
              const cb = item.querySelector<HTMLInputElement>(".ui-option-checkbox");
              if (cb) cb.checked = false;
            }
          });
          const nextSelected = !wasSelected;
          optionItem.classList.toggle("selected", nextSelected);
          optionItem.setAttribute("aria-checked", nextSelected ? "true" : "false");
          const checkbox = optionItem.querySelector<HTMLInputElement>(".ui-option-checkbox");
          if (checkbox) checkbox.checked = nextSelected;
        } else {
          const nextSelected = !wasSelected;
          optionItem.classList.toggle("selected", nextSelected);
          optionItem.setAttribute("aria-checked", nextSelected ? "true" : "false");
          const checkbox = optionItem.querySelector<HTMLInputElement>(".ui-option-checkbox");
          if (checkbox) checkbox.checked = nextSelected;
        }

        const labels = getSelectedOptionLabels(card);
        const promptText = labels.length === 1 ? labels[0]! : labels.join(", ");

        const submitBtn = card.querySelector<HTMLButtonElement>(".ui-options-submit-btn");
        if (submitBtn) {
          submitBtn.textContent = labels.length > 1 ? `Enviar seleção (${labels.length})` : "Enviar seleção";
        }

        if (labels.length > 0) {
          window.dispatchEvent(new CustomEvent("omp:set-prompt-text", { detail: { text: promptText, append: false } }));
        } else {
          window.dispatchEvent(new CustomEvent("omp:set-prompt-text", { detail: { text: "", append: false } }));
        }
      }
      return;
    }

    // Submit button click
    const submitBtn = event.target.closest(".ui-options-submit-btn");
    if (submitBtn instanceof HTMLButtonElement) {
      const card = submitBtn.closest(".ui-options-card");
      if (card instanceof HTMLElement) {
        const labels = getSelectedOptionLabels(card);
        const promptText = labels.length === 1 ? labels[0]! : labels.join(", ");
        if (promptText) {
          window.dispatchEvent(new CustomEvent("omp:set-prompt-text", { detail: { text: promptText, submit: true } }));
        }
      }
      return;
    }

    const zoomButton = event.target.closest(".diagram-zoom-button");
    if (zoomButton instanceof HTMLButtonElement) {
      const wrapper = zoomButton.closest(".mermaid-diagram-wrapper");
      if (wrapper instanceof HTMLElement) {
        const svg = wrapper.querySelector(".mermaid-svg-container svg");
        if (svg instanceof SVGElement) {
          openDiagramLightbox(svg.outerHTML, "Mermaid Diagram");
        }
      }
      return;
    }

    const svgElement = event.target.closest(".mermaid-svg-container svg");
    if (svgElement instanceof SVGElement) {
      openDiagramLightbox(svgElement.outerHTML, "Mermaid Diagram");
      return;
    }

    const toggleButton = event.target.closest(".diagram-toggle-button");
    if (toggleButton instanceof HTMLButtonElement) {
      const wrapper = toggleButton.closest(".mermaid-diagram-wrapper");
      if (wrapper instanceof HTMLElement) {
        const diagramContainer = wrapper.querySelector<HTMLElement>(".mermaid-diagram-container") ?? wrapper.querySelector<HTMLElement>("pre.ascii-diagram");
        const sourcePre = wrapper.querySelector<HTMLElement>("pre.mermaid-source");
        if (diagramContainer !== null && sourcePre !== null) {
          const showingSource = sourcePre.style.display !== "none";
          if (showingSource) {
            sourcePre.style.display = "none";
            diagramContainer.style.display = "";
            toggleButton.textContent = "Source";
          } else {
            diagramContainer.style.display = "none";
            sourcePre.style.display = "";
            toggleButton.textContent = "Diagram";
          }
        }
      }
      return;
    }
    const button = event.target.closest(".code-copy-button");
    if (!(button instanceof HTMLButtonElement)) return;
    const wrapper = button.closest(".code-block-wrapper");
    if (!(wrapper instanceof HTMLElement)) return;
    let codeText = "";
    if (wrapper.classList.contains("mermaid-diagram-wrapper")) {
      const sourcePre = wrapper.querySelector<HTMLElement>("pre.mermaid-source");
      codeText = sourcePre?.querySelector("code")?.textContent ?? "";
    } else {
      const code = wrapper.querySelector("pre code");
      if (code instanceof HTMLElement) codeText = code.textContent ?? "";
    }
    void this.copyCode(codeText, button);
  };

  private async copyCode(text: string, button: HTMLButtonElement): Promise<void> {
    const ok = await writeClipboard(text);
    this.setCopyButtonState(button, ok ? "copied" : "failed");
    window.setTimeout(() => {
      this.setCopyButtonState(button, "idle");
    }, 1200);
  }

  private setCopyButtonState(button: HTMLButtonElement, state: "idle" | "copied" | "failed"): void {
    button.dataset["copyState"] = state;
    button.setAttribute("aria-label", state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy code block");
    const icon = button.querySelector("span");
    if (icon instanceof HTMLElement) {
      icon.textContent = state === "copied" ? "✓" : state === "failed" ? "✖" : "⧉";
    }
  }

  static override styles = [
    unsafeCSS(katexStyles),
    formattedTextStyles,
  ];
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.clipboard?.writeText === "function") {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function getSelectedOptionLabels(card: HTMLElement): string[] {
  const selectedItems = Array.from(card.querySelectorAll<HTMLElement>(".ui-option-item.selected"));
  return selectedItems.map((item) => {
    const cb = item.querySelector<HTMLInputElement>(".ui-option-checkbox");
    return item.dataset["label"] || item.dataset["value"] || cb?.dataset["label"] || cb?.dataset["value"] || "";
  }).filter(Boolean);
}
