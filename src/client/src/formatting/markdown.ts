import { marked, type MarkedExtension, type Tokens } from "marked";
import katex from "katex";
import { renderMermaidAsciiSafe } from "@oh-my-pi/pi-utils/mermaid-ascii";

const BOX_CHARS_REGEX = /[─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬╭╮╰╯▼▲▶◀►◄]/;
const VIDEO_EXT_REGEX = /\.(mp4|webm|ogg|ogv|mov|m4v|mkv)(?:[?#]|$)/i;
const MERMAID_KEYWORDS = /^\s*(?:---[\s\S]*?---\s*|%%[^\n]*\n\s*)*(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie|quadrantChart|requirementDiagram|gitGraph|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment|mindmap|timeline|zenuml|sankey-beta|block-beta|packet-beta|kanban|architecture-beta)\b/i;

const inlineLatexRule = /^(\${1,2})(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n$]))\1/;
const blockLatexRule = /^(\${1,2})\n((?:\\[^]|[^\\])+?)\n\1(?:\n|$)/;

interface KatexToken extends Tokens.Generic {
  type: "inlineKatex" | "blockKatex";
  text: string;
  displayMode: boolean;
}

const katexExtension: MarkedExtension = {
  extensions: [
    {
      name: "inlineKatex",
      level: "inline",
      start(src: string): number | undefined {
        const index = src.indexOf("$");
        return index === -1 ? undefined : index;
      },
      tokenizer(src: string): KatexToken | undefined {
        const match = src.match(inlineLatexRule);
        const raw = match?.[0];
        const text = match?.[2];
        const delimiter = match?.[1];
        if (raw !== undefined && text !== undefined && delimiter !== undefined) {
          return {
            type: "inlineKatex",
            raw,
            text: text.trim(),
            displayMode: delimiter.length === 2,
          };
        }
        return undefined;
      },
      renderer(token: Tokens.Generic): string {
        const kToken = token as KatexToken;
        return katex.renderToString(kToken.text, { displayMode: kToken.displayMode, throwOnError: false });
      },
    },
    {
      name: "blockKatex",
      level: "block",
      tokenizer(src: string): KatexToken | undefined {
        const match = src.match(blockLatexRule);
        const raw = match?.[0];
        const text = match?.[2];
        const delimiter = match?.[1];
        if (raw !== undefined && text !== undefined && delimiter !== undefined) {
          return {
            type: "blockKatex",
            raw,
            text: text.trim(),
            displayMode: delimiter.length === 2,
          };
        }
        return undefined;
      },
      renderer(token: Tokens.Generic): string {
        const kToken = token as KatexToken;
        return `${katex.renderToString(kToken.text, { displayMode: kToken.displayMode, throwOnError: false })}\n`;
      },
    },
  ],
};

marked.use(katexExtension);

const renderer = new marked.Renderer();
renderer.html = ({ text }) => escapeHtml(text);

renderer.code = ({ text, lang }: { text: string; lang?: string }): string => {
  const language = (lang ?? "").trim().toLowerCase();
  if (language === "mermaid") {
    const ascii = renderMermaidAsciiSafe(text);
    const hasAscii = ascii !== null && ascii.trim().length > 0;
    if (hasAscii || MERMAID_KEYWORDS.test(text)) {
      const asciiHtml = hasAscii ? `<pre class="ascii-diagram"><code class="diagram-rendered">${escapeHtml(ascii)}</code></pre>` : "";
      return `<div class="code-block-wrapper mermaid-diagram-wrapper">` +
        `<div class="diagram-header">` +
        `<span class="diagram-badge">Mermaid Diagram</span>` +
        `<div class="diagram-actions">` +
        `<button type="button" class="diagram-toggle-button" aria-label="Toggle diagram source">Source</button>` +
        `<button type="button" class="code-copy-button" title="Copy diagram" aria-label="Copy diagram"><span aria-hidden="true">⧉</span></button>` +
        `</div>` +
        `</div>` +
        `<div class="mermaid-diagram-container">` +
        `<div class="mermaid-svg-container"></div>` +
        asciiHtml +
        `</div>` +
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
  if (VIDEO_EXT_REGEX.test(href)) {
    return `<video class="markdown-video" controls preload="metadata"${widthAttr}${heightAttr}${titleAttr}><source src="${href}">${escapeHtml(altText)}</video>`;
  }
  return `<img src="${href}" alt="${escapeHtml(altText)}"${widthAttr}${heightAttr}${titleAttr} />`;
};

const MAX_MARKDOWN_CACHE_ENTRIES = 300;
const markdownHtmlCache = new Map<string, string>();

export function toSafeMarkdownHtml(text: string): string {
  const cached = markdownHtmlCache.get(text);
  if (cached !== undefined) return cached;
  const normalized = normalizeLatexDelimiters(text);
  const html = marked.parse(normalized, { async: false, breaks: true, gfm: true, renderer }) as string;
  const safeHtml = sanitizeHtml(html);
  markdownHtmlCache.set(text, safeHtml);
  if (markdownHtmlCache.size > MAX_MARKDOWN_CACHE_ENTRIES) {
    const oldest = markdownHtmlCache.keys().next().value;
    if (oldest !== undefined) markdownHtmlCache.delete(oldest);
  }
  return safeHtml;
}

function normalizeLatexDelimiters(text: string): string {
  const parts = text.split(/(```[\s\S]*?```|`[^`\n]*`)/g);
  for (let i = 0; i < parts.length; i += 2) {
    const part = parts[i];
    if (part !== undefined && part.length > 0) {
      parts[i] = part
        .replace(/\\\[([\s\S]+?)\\\]/g, (_, math) => `$$\n${math.trim()}\n$$`)
        .replace(/\\\((.+?)\\\)/g, (_, math) => `$${math.trim()}$`);
    }
  }
  return parts.join("");
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
      if ((name === "href" || name === "src" || name === "poster") && !isSafeUrl(attribute.value)) element.removeAttribute(attribute.name);
    }
    if (element.tagName === "A") {
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noreferrer noopener");
    }
  });
  return template.innerHTML;
}

function isSafeUrl(url: string): boolean {
  if (url.startsWith("#") || url.startsWith("/") || url.startsWith("./") || url.startsWith("../") || !url.includes(":")) return true;
  try {
    return ["http:", "https:", "mailto:", "data:", "blob:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}
