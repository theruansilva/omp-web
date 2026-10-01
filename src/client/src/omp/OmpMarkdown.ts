import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import katexStyles from "katex/dist/katex.min.css?inline";
import { toSafeMarkdownHtml } from "../formatting/markdown";
import { openDiagramLightbox } from "../components/diagramLightbox";

function ensureKatexStyles(): void {
  if (typeof document === "undefined") return;
  if (!document.getElementById("omp-katex-styles")) {
    const style = document.createElement("style");
    style.id = "omp-katex-styles";
    style.textContent = katexStyles;
    document.head.appendChild(style);
  }
}

function getSelectedOptionLabels(card: HTMLElement): string[] {
  const selectedItems = Array.from(
    card.querySelectorAll<HTMLElement>(".ui-option-item.selected")
  );
  return selectedItems
    .map((item) => {
      const cb = item.querySelector<HTMLInputElement>(".ui-option-checkbox");
      return (
        item.dataset["label"] ||
        item.dataset["value"] ||
        cb?.dataset["label"] ||
        cb?.dataset["value"] ||
        ""
      );
    })
    .filter(Boolean);
}

@customElement("omp-markdown")
export class OmpMarkdown extends LitElement {
  @property({ type: String }) text = "";

  protected override createRenderRoot() {
    return this;
  }

  override render() {
    return html`
      <div
        class="omp-markdown"
        dir="auto"
        @click=${this.onMarkdownClick}
        @keydown=${this.onMarkdownKeyDown}
      >
        ${unsafeHTML(toSafeMarkdownHtml(this.text))}
      </div>
    `;
  }

  override updated(): void {
    ensureKatexStyles();
    this.enhanceCodeBlocks();
    void this.renderMermaidDiagrams();
  }

  private enhanceCodeBlocks(): void {
    this.querySelectorAll("pre").forEach((pre) => {
      if (
        !(pre instanceof HTMLPreElement) ||
        pre.parentElement?.classList.contains("code-block-wrapper") ||
        pre.parentElement?.classList.contains("code-block")
      ) {
        return;
      }
      const code = pre.querySelector("code");
      if (!(code instanceof HTMLElement)) return;

      const wrapper = document.createElement("div");
      wrapper.className = "code-block code-block-wrapper formatted-code-block-internal-container";

      // Detect language from class (e.g. language-sql -> SQL, language-typescript -> TYPESCRIPT)
      let langName = "";
      for (const cls of code.classList) {
        if (cls.startsWith("language-")) {
          langName = cls.replace("language-", "").toUpperCase();
          break;
        }
      }
      if (pre.classList.contains("ascii-diagram")) {
        langName = "DIAGRAM";
      }

      const header = document.createElement("div");
      header.className = "code-block-decoration header-formatted code-block-header gds-emphasized-body-m";

      const langSpan = document.createElement("span");
      langSpan.className = "code-block-lang";
      langSpan.textContent = langName || "CODE";

      const buttons = document.createElement("div");
      buttons.className = "buttons flex items-center gap-1";

      const downloadButton = document.createElement("button");
      downloadButton.type = "button";
      downloadButton.className = "download-button gem-button gem-icon-button code-download-button";
      downloadButton.title = "Baixar código";
      downloadButton.setAttribute("aria-label", "Baixar código");
      downloadButton.innerHTML = `
        <svg class="code-download-icon size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="8 12 12 16 16 12"/>
          <line x1="12" y1="8" x2="12" y2="16"/>
        </svg>
      `;

      const copyButton = document.createElement("button");
      copyButton.type = "button";
      copyButton.className = "copy-button gem-button gem-icon-button code-copy-button";
      copyButton.title = "Copiar o código";
      copyButton.setAttribute("aria-label", "Copiar o código");
      copyButton.setAttribute("data-test-id", "gem-copy-button");
      copyButton.innerHTML = `
        <svg class="code-copy-icon size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
        </svg>
      `;

      buttons.append(downloadButton, copyButton);
      header.append(langSpan, buttons);

      code.classList.add("code-container", "formatted");
      pre.classList.add("formatted");

      pre.before(wrapper);
      wrapper.append(header, pre);
    });
  }

  private async renderMermaidDiagrams(): Promise<void> {
    const wrappers = this.querySelectorAll<HTMLElement>(
      ".mermaid-diagram-wrapper:not([data-rendered])"
    );
    if (wrappers.length === 0) return;

    wrappers.forEach((w) => {
      w.setAttribute("data-rendered", "pending");
    });

    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark" ||
      document.documentElement.classList.contains("dark") ||
      (typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    try {
      // mermaid touches window.addEventListener at module top-level if document exists;
      // dynamic import prevents crash in headless test environments where document exists without window.
      const mermaidModule = await import("mermaid");
      const mermaid = mermaidModule.default ?? mermaidModule;

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
        const sourceCode = wrapper.querySelector(
          "pre.mermaid-source code"
        )?.textContent;
        const svgContainer = wrapper.querySelector<HTMLElement>(
          ".mermaid-svg-container"
        );
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
            const sourcePre =
              wrapper.querySelector<HTMLElement>("pre.mermaid-source");
            if (sourcePre) sourcePre.style.display = "";
          }
        }
      }
    } catch {
      wrappers.forEach((w) => {
        w.setAttribute("data-rendered", "failed");
      });
    }
  }

  private readonly onMarkdownKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== " " && event.key !== "Enter") return;
    if (!(event.target instanceof Element)) return;
    const optionItem = event.target.closest(".ui-option-item");
    if (optionItem instanceof HTMLElement && this.contains(optionItem)) {
      const card = optionItem.closest(".ui-options-card");
      if (
        card instanceof HTMLElement &&
        card.getAttribute("data-interactive") === "false"
      ) {
        return;
      }
      event.preventDefault();
      optionItem.click();
    }
  };

  private readonly onMarkdownClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;

    // 1. Option / Checklist Item click
    const optionItem = event.target.closest(".ui-option-item");
    if (optionItem instanceof HTMLElement && this.contains(optionItem)) {
      const card = optionItem.closest(".ui-options-card");
      if (card instanceof HTMLElement) {
        if (card.getAttribute("data-interactive") === "false") return;

        const isSingle =
          card.getAttribute("data-mode") === "single" ||
          optionItem.getAttribute("role") === "radio";
        const wasSelected = optionItem.classList.contains("selected");

        if (isSingle) {
          card
            .querySelectorAll<HTMLElement>(".ui-option-item")
            .forEach((item) => {
              if (item !== optionItem) {
                item.classList.remove("selected");
                item.setAttribute("aria-checked", "false");
                const cb = item.querySelector<HTMLInputElement>(
                  ".ui-option-checkbox"
                );
                if (cb) cb.checked = false;
              }
            });
          const nextSelected = !wasSelected;
          optionItem.classList.toggle("selected", nextSelected);
          optionItem.setAttribute(
            "aria-checked",
            nextSelected ? "true" : "false"
          );
          const checkbox = optionItem.querySelector<HTMLInputElement>(
            ".ui-option-checkbox"
          );
          if (checkbox) checkbox.checked = nextSelected;
        } else {
          const nextSelected = !wasSelected;
          optionItem.classList.toggle("selected", nextSelected);
          optionItem.setAttribute(
            "aria-checked",
            nextSelected ? "true" : "false"
          );
          const checkbox = optionItem.querySelector<HTMLInputElement>(
            ".ui-option-checkbox"
          );
          if (checkbox) checkbox.checked = nextSelected;
        }

        const labels = getSelectedOptionLabels(card);
        const promptText =
          labels.length === 1 ? labels[0]! : labels.join(", ");

        const submitBtn = card.querySelector<HTMLButtonElement>(
          ".ui-options-submit-btn span"
        );
        if (submitBtn) {
          submitBtn.textContent =
            labels.length > 1
              ? `Enviar seleção (${labels.length})`
              : "Enviar seleção";
        }

        if (labels.length > 0) {
          window.dispatchEvent(
            new CustomEvent("omp:set-prompt-text", {
              detail: { text: promptText, append: false },
            })
          );
        } else {
          window.dispatchEvent(
            new CustomEvent("omp:set-prompt-text", {
              detail: { text: "", append: false },
            })
          );
        }
      }
      return;
    }

    // 2. Submit button click
    const submitBtn = event.target.closest(".ui-options-submit-btn");
    if (submitBtn instanceof HTMLButtonElement && this.contains(submitBtn)) {
      const card = submitBtn.closest(".ui-options-card");
      if (card instanceof HTMLElement) {
        const labels = getSelectedOptionLabels(card);
        const promptText =
          labels.length === 1 ? labels[0]! : labels.join(", ");
        if (promptText) {
          window.dispatchEvent(
            new CustomEvent("omp:set-prompt-text", {
              detail: { text: promptText, submit: true },
            })
          );
        }
      }
      return;
    }

    // 3. Zoom diagram button
    const zoomButton = event.target.closest(".diagram-zoom-button");
    if (zoomButton instanceof HTMLButtonElement && this.contains(zoomButton)) {
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
    if (svgElement instanceof SVGElement && this.contains(svgElement)) {
      openDiagramLightbox(svgElement.outerHTML, "Mermaid Diagram");
      return;
    }

    // 4. Toggle diagram button
    const toggleButton = event.target.closest(".diagram-toggle-button");
    if (
      toggleButton instanceof HTMLButtonElement &&
      this.contains(toggleButton)
    ) {
      const wrapper = toggleButton.closest(".mermaid-diagram-wrapper");
      if (wrapper instanceof HTMLElement) {
        const diagramContainer =
          wrapper.querySelector<HTMLElement>(
            ".mermaid-diagram-container"
          ) ?? wrapper.querySelector<HTMLElement>("pre.ascii-diagram");
        const sourcePre =
          wrapper.querySelector<HTMLElement>("pre.mermaid-source");
        const toggleText = toggleButton.querySelector("span");
        if (diagramContainer !== null && sourcePre !== null) {
          const showingSource = sourcePre.style.display !== "none";
          if (showingSource) {
            sourcePre.style.display = "none";
            diagramContainer.style.display = "";
            if (toggleText) toggleText.textContent = "Source";
          } else {
            diagramContainer.style.display = "none";
            sourcePre.style.display = "";
            if (toggleText) toggleText.textContent = "Diagram";
          }
        }
      }
      return;
    }

    // 5. Code download button click (Gemini-style)
    const downloadBtn = event.target.closest(".download-button, .code-download-button");
    if (downloadBtn instanceof HTMLButtonElement && this.contains(downloadBtn)) {
      const wrapper = downloadBtn.closest(".code-block-wrapper, .code-block");
      if (wrapper instanceof HTMLElement) {
        let codeText = "";
        let langName = wrapper.querySelector(".code-block-lang")?.textContent?.trim().toLowerCase() || "";
        if (wrapper.classList.contains("mermaid-diagram-wrapper")) {
          const sourcePre = wrapper.querySelector<HTMLElement>("pre.mermaid-source");
          codeText = sourcePre?.querySelector("code")?.textContent ?? "";
          langName = "mermaid";
        } else {
          const code = wrapper.querySelector("pre code");
          if (code instanceof HTMLElement) codeText = code.textContent ?? "";
        }
        this.downloadCode(codeText, langName, downloadBtn);
      }
      return;
    }

    // 6. Code copy button click (Gemini-style)
    const button = event.target.closest(".code-copy-button, .copy-button");
    if (button instanceof HTMLButtonElement && this.contains(button)) {
      const wrapper = button.closest(".code-block-wrapper, .code-block");
      if (wrapper instanceof HTMLElement) {
        let codeText = "";
        if (wrapper.classList.contains("mermaid-diagram-wrapper")) {
          const sourcePre =
            wrapper.querySelector<HTMLElement>("pre.mermaid-source");
          codeText = sourcePre?.querySelector("code")?.textContent ?? "";
        } else {
          const code = wrapper.querySelector("pre code");
          if (code instanceof HTMLElement) codeText = code.textContent ?? "";
        }
        void this.copyCode(codeText, button);
      }
      return;
    }
  };

  private downloadCode(
    text: string,
    language: string,
    button: HTMLButtonElement
  ): void {
    const extensionMap: Record<string, string> = {
      javascript: "js",
      js: "js",
      typescript: "ts",
      ts: "ts",
      jsx: "jsx",
      tsx: "tsx",
      html: "html",
      htm: "html",
      css: "css",
      scss: "scss",
      json: "json",
      python: "py",
      py: "py",
      sql: "sql",
      mysql: "sql",
      pgsql: "sql",
      postgres: "sql",
      postgresql: "sql",
      sqlite: "sql",
      rust: "rs",
      rs: "rs",
      go: "go",
      golang: "go",
      markdown: "md",
      md: "md",
      bash: "sh",
      sh: "sh",
      shell: "sh",
      zsh: "sh",
      yaml: "yaml",
      yml: "yml",
      c: "c",
      cpp: "cpp",
      java: "java",
      kotlin: "kt",
      swift: "swift",
      php: "php",
      ruby: "rb",
      rb: "rb",
      mermaid: "mmd",
      diagram: "txt",
    };
    const langKey = language.toLowerCase().trim();
    const ext = extensionMap[langKey] || "txt";
    const filename = `code.${ext}`;

    try {
      if (typeof document !== "undefined" && typeof URL !== "undefined" && typeof Blob !== "undefined") {
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("[OMP] Failed to download code snippet:", err);
    }

    const icon = button.querySelector<SVGElement>(".code-download-icon");
    if (icon) {
      button.classList.add("is-downloaded");
      icon.innerHTML = `<polyline points="20 6 9 17 4 12"/>`;
      icon.classList.add("text-emerald-500");
      window.setTimeout(() => {
        button.classList.remove("is-downloaded");
        icon.innerHTML = `
          <circle cx="12" cy="12" r="10"/>
          <polyline points="8 12 12 16 16 12"/>
          <line x1="12" y1="8" x2="12" y2="16"/>
        `;
        icon.classList.remove("text-emerald-500");
      }, 1500);
    }
  }

  private async copyCode(
    text: string,
    button: HTMLButtonElement
  ): Promise<void> {
    let ok = false;
    try {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.clipboard?.writeText === "function"
      ) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch {
      ok = false;
    }
    this.setCopyButtonState(button, ok ? "copied" : "failed");
    window.setTimeout(() => {
      this.setCopyButtonState(button, "idle");
    }, 1500);
  }

  private setCopyButtonState(
    button: HTMLButtonElement,
    state: "idle" | "copied" | "failed"
  ): void {
    button.dataset["copyState"] = state;
    button.setAttribute(
      "aria-label",
      state === "copied"
        ? "Copiado!"
        : state === "failed"
          ? "Falha ao copiar"
          : "Copiar o código"
    );
    button.title = state === "copied" ? "Copiado!" : "Copiar o código";
    const icon = button.querySelector<SVGElement>(".code-copy-icon");

    if (state === "copied") {
      button.classList.add("is-copied");
      if (icon) {
        icon.innerHTML = `<polyline points="20 6 9 17 4 12"/>`;
        icon.classList.add("text-emerald-500");
      }
    } else {
      button.classList.remove("is-copied");
      if (icon) {
        icon.innerHTML = `
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
        `;
        icon.classList.remove("text-emerald-500");
      }
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "omp-markdown": OmpMarkdown;
  }
}
