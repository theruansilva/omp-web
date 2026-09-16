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
        return katex.renderToString(kToken.text, { displayMode: kToken.displayMode, throwOnError: false, strict: false });
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
        return `${katex.renderToString(kToken.text, { displayMode: kToken.displayMode, throwOnError: false, strict: false })}\n`;
      },
    },
  ],
};

marked.use(katexExtension);

const renderer = new marked.Renderer();
renderer.html = ({ text }) => text;

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
        `<button type="button" class="diagram-zoom-button" title="Zoom & Pan diagram" aria-label="Zoom diagram"><span aria-hidden="true">⛶</span></button>` +
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
  const withUiTags = expandCustomUiTags(text);
  const normalized = normalizeLatexDelimiters(withUiTags);
  const html = marked.parse(normalized, { async: false, breaks: true, gfm: true, renderer }) as string;
  const safeHtml = sanitizeHtml(html);
  markdownHtmlCache.set(text, safeHtml);
  if (markdownHtmlCache.size > MAX_MARKDOWN_CACHE_ENTRIES) {
    const oldest = markdownHtmlCache.keys().next().value;
    if (oldest !== undefined) markdownHtmlCache.delete(oldest);
  }
  return safeHtml;
}

function expandCustomUiTags(text: string): string {
  const parts = text.split(/(```[\s\S]*?```|`[^`\n]*`)/g);
  for (let i = 0; i < parts.length; i += 2) {
    const part = parts[i];
    if (part !== undefined && part.length > 0) {
      parts[i] = part
        .replace(/<card(?:\s+title="([^"]*)")?(?:\s+badge="([^"]*)")?(?:\s+color="([^"]*)")?(?:\s+subtitle="([^"]*)")?\s*>([\s\S]*?)<\/card>/gi, (_, title, badge, color, subtitle, content) => {
          const colorClass = color ? ` ui-badge-${color}` : " ui-badge-blue";
          const badgeHtml = badge ? `<span class="ui-badge${colorClass}">${badge}</span>` : "";
          const subtitleHtml = subtitle ? `<p class="ui-card-subtitle">${subtitle}</p>` : "";
          const headerHtml = (title || badgeHtml) ? `<div class="ui-card-header">${title ? `<h3 class="ui-card-title">${title}</h3>` : ""}${badgeHtml}</div>` : "";
          return `<div class="ui-card">\n\n${headerHtml}\n\n${subtitleHtml}\n\n${content.trim()}\n\n</div>`;
        })
        .replace(/<badge(?:\s+color="([^"]*)")?\s*>([\s\S]*?)<\/badge>/gi, (_, color, content) => {
          const colorClass = color ? ` ui-badge-${color}` : " ui-badge-blue";
          return `<span class="ui-badge${colorClass}">${content.trim()}</span>`;
        })
        .replace(/<kpi-grid\s*>([\s\S]*?)<\/kpi-grid>/gi, (_, content) => {
          return `<div class="ui-kpi-grid">\n\n${content.trim()}\n\n</div>`;
        })
        .replace(/<kpi(?:\s+label="([^"]*)")?(?:\s+value="([^"]*)")?(?:\s+color="([^"]*)")?(?:\s+sub="([^"]*)")?\s*(?:\/>|>([\s\S]*?)<\/kpi>)/gi, (_, label, value, color, sub, inner) => {
          const val = value ?? inner ?? "";
          const colorStyle = color ? ` style="color: ${color};"` : "";
          const subHtml = sub ? `<small class="ui-kpi-sub">${sub}</small>` : "";
          return `<div class="ui-kpi"><small class="ui-kpi-label">${label ?? ""}</small><strong class="ui-kpi-value"${colorStyle}>${val.trim()}</strong>${subHtml}</div>`;
        })
        .replace(/<qa-card\s*>([\s\S]*?)<\/qa-card>/gi, (_, content) => {
          return `<div class="ui-qa-card">\n\n${content.trim()}\n\n</div>`;
        })
        .replace(/<callout(?:\s+type="([^"]*)")?\s*>([\s\S]*?)<\/callout>/gi, (_, type, content) => {
          const t = type ?? "info";
          return `<div class="ui-callout ui-callout-${t}">\n\n${content.trim()}\n\n</div>`;
        })
        .replace(/<(?:checklist|options)(?:\s+title="([^"]*)")?(?:\s+badge="([^"]*)")?(?:\s+color="([^"]*)")?(?:\s+subtitle="([^"]*)")?\s*>([\s\S]*?)<\/(?:checklist|options)>/gi, (_, title, badge, color, subtitle, blockContent) => {
          const colorClass = color ? ` ui-badge-${color}` : " ui-badge-blue";
          const badgeHtml = badge ? `<span class="ui-badge${colorClass}">${badge}</span>` : `<span class="ui-badge ui-badge-blue">Opções</span>`;
          const headerHtml = `<div class="ui-card-header"><h3 class="ui-card-title">${title || "Selecione as opções desejadas"}</h3>${badgeHtml}</div>`;
          const subtitleHtml = subtitle ? `<p class="ui-card-subtitle">${subtitle}</p>` : "";

          const items: string[] = [];
          const itemRegex = /<(?:item|opt)(?:\s+label="([^"]*)")?(?:\s+desc="([^"]*)")?(?:\s+value="([^"]*)")?\s*(?:\/>|>([\s\S]*?)<\/(?:item|opt)>)/gi;
          let match;
          while ((match = itemRegex.exec(blockContent)) !== null) {
            const label = match[1] || match[4] || "";
            const desc = match[2] || "";
            const value = match[3] || label;
            items.push(
              `<div class="ui-option-item" role="checkbox" aria-checked="false" tabindex="0">` +
              `<input type="checkbox" class="ui-option-checkbox" data-value="${escapeHtml(value)}" data-label="${escapeHtml(label)}" />` +
              `<span class="ui-option-box"><span class="ui-option-check">✓</span></span>` +
              `<div class="ui-option-content">` +
              `<strong class="ui-option-label">${escapeHtml(label)}</strong>` +
              (desc ? `<small class="ui-option-desc">${escapeHtml(desc)}</small>` : "") +
              `</div>` +
              `</div>`
            );
          }

          if (items.length === 0) {
            return `<div class="ui-card ui-options-card">\n\n${headerHtml}\n\n${subtitleHtml}\n\n${blockContent.trim()}\n\n</div>`;
          }

          return (
            `<div class="ui-card ui-options-card">` +
            headerHtml +
            subtitleHtml +
            `<div class="ui-options-list">${items.join("")}</div>` +
            `<div class="ui-options-actions">` +
            `<button type="button" class="ui-options-btn ui-options-apply-btn" title="Inserir seleção no campo de prompt">Inserir no prompt</button>` +
            `<button type="button" class="ui-options-btn ui-options-submit-btn primary" title="Enviar seleção diretamente para o assistente">Enviar seleção</button>` +
            `</div>` +
            `</div>`
          );
        });
    }
  }
  return parts.join("");
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
  template.content.querySelectorAll("script, style, iframe, object, embed, base, meta, form, input").forEach((node) => { node.remove(); });
  template.content.querySelectorAll("*").forEach((element) => {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith("on")) {
        element.removeAttribute(attribute.name);
        continue;
      }
      if (name === "href" || name === "src" || name === "poster" || name === "action" || name === "formaction" || name === "xlink:href" || name.endsWith(":href") || name.endsWith(":src")) {
        if (!isSafeUrl(attribute.value)) {
          element.removeAttribute(attribute.name);
        }
      }
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
