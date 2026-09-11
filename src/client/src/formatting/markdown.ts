import { marked } from "marked";
import { renderMermaidAsciiSafe } from "@oh-my-pi/pi-utils/mermaid-ascii";

const BOX_CHARS_REGEX = /[─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬╭╮╰╯▼▲▶◀►◄]/;

const renderer = new marked.Renderer();
renderer.html = ({ text }) => escapeHtml(text);

renderer.code = ({ text, lang }: { text: string; lang?: string }): string => {
  const language = (lang ?? "").trim().toLowerCase();
  if (language === "mermaid") {
    const ascii = renderMermaidAsciiSafe(text);
    if (ascii !== null && ascii.trim().length > 0) {
      return `<div class="code-block-wrapper mermaid-diagram-wrapper">` +
        `<div class="diagram-header">` +
        `<span class="diagram-badge">Mermaid Diagram</span>` +
        `<div class="diagram-actions">` +
        `<button type="button" class="diagram-toggle-button" aria-label="Toggle diagram source">Source</button>` +
        `<button type="button" class="code-copy-button" title="Copy diagram" aria-label="Copy diagram"><span aria-hidden="true">⧉</span></button>` +
        `</div>` +
        `</div>` +
        `<pre class="ascii-diagram"><code class="diagram-rendered">${escapeHtml(ascii)}</code></pre>` +
        `<pre class="mermaid-source" style="display: none;"><code class="language-mermaid">${escapeHtml(text)}</code></pre>` +
        `</div>`;
    }
  }

  const isAsciiDiagram = language === "ascii" || language === "diagram" || BOX_CHARS_REGEX.test(text);
  const preClass = isAsciiDiagram ? ' class="ascii-diagram"' : "";
  const codeClass = language ? ` class="language-${escapeHtml(language)}"` : "";
  return `<pre${preClass}><code${codeClass}>${escapeHtml(text)}</code></pre>`;
};

renderer.image = ({ href, title, text }: { href: string; title?: string | null; text: string }): string => {
  let altText = text ?? "";
  let widthAttr = "";
  let heightAttr = "";

  const pipeIndex = altText.lastIndexOf("|");
  let dimCandidate = "";
  if (pipeIndex !== -1) {
    dimCandidate = altText.slice(pipeIndex + 1).trim();
    altText = altText.slice(0, pipeIndex).trim();
  } else if (/^\d+(?:x\d+)?$/.test(altText.trim())) {
    dimCandidate = altText.trim();
    altText = "";
  }

  if (dimCandidate) {
    const dimMatch = dimCandidate.match(/^(\d+)(?:x(\d+))?$/);
    if (dimMatch && dimMatch[1] !== undefined) {
      widthAttr = ` width="${dimMatch[1]}"`;
      if (dimMatch[2] !== undefined) {
        heightAttr = ` height="${dimMatch[2]}"`;
      }
    }
  }

  const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
  return `<img src="${href}" alt="${escapeHtml(altText)}"${widthAttr}${heightAttr}${titleAttr} />`;
};

const MAX_MARKDOWN_CACHE_ENTRIES = 300;
const markdownHtmlCache = new Map<string, string>();

export function toSafeMarkdownHtml(text: string): string {
  const cached = markdownHtmlCache.get(text);
  if (cached !== undefined) return cached;
  const html = marked.parse(text, { async: false, breaks: true, gfm: true, renderer });
  const safeHtml = sanitizeHtml(html);
  markdownHtmlCache.set(text, safeHtml);
  if (markdownHtmlCache.size > MAX_MARKDOWN_CACHE_ENTRIES) {
    const oldest = markdownHtmlCache.keys().next().value;
    if (oldest !== undefined) markdownHtmlCache.delete(oldest);
  }
  return safeHtml;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function sanitizeHtml(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll("script, style, iframe, object, embed").forEach((node) => { node.remove(); });
  template.content.querySelectorAll("*").forEach((element) => {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith("on")) element.removeAttribute(attribute.name);
      if ((name === "href" || name === "src") && !isSafeUrl(attribute.value)) element.removeAttribute(attribute.name);
    }
    if (element.tagName === "A") {
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noreferrer noopener");
    }
  });
  return template.innerHTML;
}

function isSafeUrl(url: string): boolean {
  if (url.startsWith("#") || url.startsWith("/")) return true;
  try {
    return ["http:", "https:", "mailto:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}
