import { marked, type MarkedExtension, type Tokens } from "marked";
import katex from "katex";
import { renderMermaidAsciiSafe } from "@oh-my-pi/pi-utils/mermaid-ascii";
import { highlightCodeBlock } from "./syntaxHighlight";

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
        `<button type="button" class="diagram-zoom-button" title="Zoom & Pan diagram" aria-label="Zoom diagram"><svg class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/></svg><span>Zoom</span></button>` +
        `<button type="button" class="diagram-toggle-button" aria-label="Toggle diagram source"><svg class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg><span>Source</span></button>` +
        `<button type="button" class="code-copy-button" title="Copy diagram" aria-label="Copy diagram"><svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg></button>` +
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
  const displayLang = isAsciiDiagram ? "DIAGRAM" : (language ? language.toUpperCase() : "CODE");
  const preClass = isAsciiDiagram ? ' class="ascii-diagram"' : "";
  const codeClass = language ? ` class="language-${escapeHtml(language)}"` : "";
  const content = isAsciiDiagram ? escapeHtml(text) : highlightCodeBlock(text, language);

  return `<div class="code-block code-block-wrapper formatted-code-block-internal-container">` +
    `<div class="code-block-decoration header-formatted code-block-header gds-emphasized-body-m">` +
      `<span class="code-block-lang">${displayLang}</span>` +
      `<div class="buttons">` +
        `<button type="button" class="download-button gem-button gem-icon-button code-download-button" title="Baixar código" aria-label="Baixar código">` +
          `<svg class="code-download-icon size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>` +
        `</button>` +
        `<button type="button" class="copy-button gem-button gem-icon-button code-copy-button" title="Copiar o código" aria-label="Copiar o código" data-test-id="gem-copy-button">` +
          `<svg class="code-copy-icon size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>` +
        `</button>` +
      `</div>` +
    `</div>` +
    `<pre${preClass}><code${codeClass}>${content}</code></pre>` +
  `</div>`;
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

function parseAttributes(attrString: string | undefined): Record<string, string> {
  if (!attrString) return {};
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z0-9_-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrString)) !== null) {
    const key = m[1]!.toLowerCase();
    const val = m[2] ?? m[3] ?? m[4] ?? "";
    attrs[key] = val;
  }
  return attrs;
}


function getCalloutIconSvg(type: string): string {
  switch (type) {
    case "warning":
      return '<svg class="ui-callout-icon-svg size-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>';
    case "success":
      return '<svg class="ui-callout-icon-svg size-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>';
    case "danger":
      return '<svg class="ui-callout-icon-svg size-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/></svg>';
    case "info":
    default:
      return '<svg class="ui-callout-icon-svg size-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.247.25v3.25a.25.25 0 01-.25.25H9a.75.75 0 000 1.5h2a.75.75 0 000-1.5h-.253a.25.25 0 01-.247-.25V9.75A.75.75 0 009.75 9H9z" clip-rule="evenodd"/></svg>';
  }
}

function expandCustomUiTags(text: string): string {
  const parts = text.split(/(```[\s\S]*?```|`[^`\n]*`)/g);
  for (let i = 0; i < parts.length; i += 2) {
    const part = parts[i];
    if (part !== undefined && part.length > 0) {
      parts[i] = part
        .replace(/<card(\s+[^>]*)?>([\s\S]*?)<\/card>/gi, (_, attrStr, inner) => {
          const attrs = parseAttributes(attrStr);
          const title = attrs["title"];
          const badge = attrs["badge"];
          const color = attrs["color"];
          const subtitle = attrs["subtitle"] || attrs["sub"];
          const colorClass = color ? ` ui-badge-${color}` : " ui-badge-blue";
          const badgeHtml = badge ? `<span class="ui-badge${colorClass}">${badge}</span>` : "";
          const subtitleHtml = subtitle ? `<p class="ui-card-subtitle">${subtitle}</p>` : "";
          const headerHtml = (title || badgeHtml) ? `<div class="ui-card-header">${title ? `<h3 class="ui-card-title">${title}</h3>` : ""}${badgeHtml}</div>` : "";
          return `<div class="ui-card">\n\n${headerHtml}\n\n${subtitleHtml}\n\n${inner.trim()}\n\n</div>`;
        })
        .replace(/<badge(\s+[^>]*)?>([\s\S]*?)<\/badge>/gi, (_, attrStr, inner) => {
          const attrs = parseAttributes(attrStr);
          const color = attrs["color"];
          const colorClass = color ? ` ui-badge-${color}` : " ui-badge-blue";
          return `<span class="ui-badge${colorClass}">${inner.trim()}</span>`;
        })
        .replace(/<kpi-grid(\s+[^>]*)?>([\s\S]*?)<\/kpi-grid>/gi, (_, _attrStr, inner) => {
          return `<div class="ui-kpi-grid">\n\n${inner.trim()}\n\n</div>`;
        })
        .replace(/<kpi(\s+[^>]*)?(?:\/>|>([\s\S]*?)<\/kpi>)/gi, (_, attrStr, inner) => {
          const attrs = parseAttributes(attrStr);
          const label = attrs["label"] ?? "";
          const val = attrs["value"] ?? (inner ? inner.trim() : "");
          const color = attrs["color"];
          const sub = attrs["sub"] ?? attrs["subtitle"];
          const colorStyle = color ? ` style="color: ${color};"` : "";
          const subHtml = sub ? `<small class="ui-kpi-sub">${sub}</small>` : "";
          return `<div class="ui-kpi"><small class="ui-kpi-label">${label}</small><strong class="ui-kpi-value"${colorStyle}>${val}</strong>${subHtml}</div>`;
        })
        .replace(/<qa-card(\s+[^>]*)?>([\s\S]*?)<\/qa-card>/gi, (_, _attrStr, inner) => {
          return `<div class="ui-qa-card">\n\n${inner.trim()}\n\n</div>`;
        })
        .replace(/<callout(\s+[^>]*)?>([\s\S]*?)<\/callout>/gi, (_, attrStr, inner) => {
          const attrs = parseAttributes(attrStr);
          const t = attrs["type"] ?? "info";
          const iconSvg = getCalloutIconSvg(t);
          return `<div class="ui-callout ui-callout-${t}"><div class="ui-callout-icon">${iconSvg}</div><div class="ui-callout-body">\n\n${inner.trim()}\n\n</div></div>`;
        })
        .replace(/<(checklist|options|option-cards|options-card)(\s+[^>]*)?>([\s\S]*?)<\/\1>/gi, (_, tag, attrStr, blockContent) => {
          const attrs = parseAttributes(attrStr);
          const isChecklist = tag.toLowerCase() === "checklist";
          const hasMultiAttr = attrs["multi"] === "true" || attrs["multiple"] !== undefined || attrs["mode"] === "multi";
          const hasSingleAttr = attrs["multi"] === "false" || attrs["single"] !== undefined || attrs["mode"] === "single";
          const isSingle = hasSingleAttr || (!isChecklist && !hasMultiAttr);
          const mode = isSingle ? "single" : "multi";

          const hasInteractiveAttr = attrs["interactive"];
          const hasReadonlyAttr = attrs["readonly"] !== undefined || attrs["static"] !== undefined || attrs["mode"] === "readonly" || attrs["mode"] === "static" || attrs["done"] !== undefined || attrs["completed"] !== undefined;
          const explicitlyNonInteractive = hasInteractiveAttr === "false" || hasInteractiveAttr === "no" || hasReadonlyAttr;
          const explicitlyInteractive = hasInteractiveAttr === "true" || hasInteractiveAttr === "yes";

          const role = isSingle ? "radio" : "checkbox";
          const checkIcon = isSingle
            ? `<span class="ui-option-radio-dot"></span><span style="display:none">●</span>`
            : `<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-6"/></svg><span style="display:none">✓</span>`;
          const inputType = isSingle ? "radio" : "checkbox";

          interface ParsedOptionItem {
            label: string;
            desc: string;
            value: string;
            isChecked: boolean;
            isDone: boolean;
          }

          const parsedItems: ParsedOptionItem[] = [];
          const itemRegex = /<(item|opt|option)(\s+[^>]*)?(?:\/>|>([\s\S]*?)<\/\1>)/gi;
          let match;
          while ((match = itemRegex.exec(blockContent)) !== null) {
            const itemAttrs = parseAttributes(match[2]);
            const innerText = match[3] ? match[3].trim() : "";
            const label = itemAttrs["label"] || innerText || "";
            const desc = itemAttrs["desc"] || itemAttrs["description"] || (itemAttrs["label"] ? innerText : "");
            const value = itemAttrs["value"] || label;
            const isItemDone = itemAttrs["done"] === "true" || itemAttrs["done"] === "" || itemAttrs["status"] === "done" || itemAttrs["status"] === "completed";
            const isItemChecked = isItemDone || itemAttrs["checked"] === "true" || itemAttrs["checked"] === "" || itemAttrs["selected"] === "true";
            parsedItems.push({ label, desc, value, isChecked: isItemChecked, isDone: isItemDone });
          }

          // Fallback: parse markdown bullets if no XML tags found inside <options>
          if (parsedItems.length === 0) {
            const bulletRegex = /^(?:[-*]|\d+\.)\s+(?:\[([ xX])\]\s+)?(?:\*\*([^*]+)\*\*|__([^_]+)__|([^:\n]+))(?::\s*([^\n]+)|$)/gm;
            let bmatch;
            while ((bmatch = bulletRegex.exec(blockContent)) !== null) {
              const checkedChar = bmatch[1];
              const label = (bmatch[2] || bmatch[3] || bmatch[4] || "").trim();
              const desc = (bmatch[5] || "").trim();
              if (label) {
                const isBulletChecked = checkedChar !== undefined && checkedChar.toLowerCase() === "x";
                parsedItems.push({
                  label,
                  desc,
                  value: label,
                  isChecked: isBulletChecked,
                  isDone: isBulletChecked,
                });
              }
            }
          }

          const allChecked = parsedItems.length > 0 && parsedItems.every((item) => item.isChecked);
          let isInteractive = true;
          if (explicitlyNonInteractive) {
            isInteractive = false;
          } else if (!explicitlyInteractive && isChecklist && allChecked) {
            isInteractive = false;
          }

          const title = attrs["title"];
          const badge = attrs["badge"];
          const color = attrs["color"];
          const subtitle = attrs["subtitle"] || attrs["sub"];
          const colorClass = color ? ` ui-badge-${color}` : (!isInteractive && isChecklist ? " ui-badge-green" : " ui-badge-blue");
          const defaultBadge = isChecklist ? (isInteractive ? "Checklist" : "Concluído") : "Opções";
          const defaultTitle = isChecklist ? (isInteractive ? "Selecione as opções desejadas" : "Tarefas concluídas") : (isSingle ? "Escolha uma opção" : "Selecione as opções");
          const badgeHtml = badge ? `<span class="ui-badge${colorClass}">${badge}</span>` : `<span class="ui-badge${colorClass}">${defaultBadge}</span>`;
          const headerHtml = `<div class="ui-card-header"><h3 class="ui-card-title">${title || defaultTitle}</h3>${badgeHtml}</div>`;
          const subtitleHtml = subtitle ? `<p class="ui-card-subtitle">${subtitle}</p>` : "";

          if (parsedItems.length === 0) {
            return `<div class="ui-card ui-options-card" data-mode="${mode}" data-interactive="${isInteractive ? "true" : "false"}">\n\n${headerHtml}\n\n${subtitleHtml}\n\n${blockContent.trim()}\n\n</div>`;
          }

          const itemsHtml = parsedItems.map((item) => {
            const isDone = item.isDone || (isChecklist && item.isChecked);
            const isChecked = item.isChecked;
            const itemClasses = ["ui-option-item"];
            if (isChecked) itemClasses.push("selected");
            if (isDone) itemClasses.push("is-done");
            const ariaChecked = isChecked ? "true" : "false";
            const checkedInputAttr = isChecked ? " checked" : "";
            const tabindexAttr = isInteractive ? ' tabindex="0"' : "";

            return (
              `<div class="${itemClasses.join(" ")}" role="${role}" aria-checked="${ariaChecked}"${tabindexAttr} data-value="${escapeHtml(item.value)}" data-label="${escapeHtml(item.label)}">` +
              `<input type="${inputType}" class="ui-option-checkbox" data-value="${escapeHtml(item.value)}" data-label="${escapeHtml(item.label)}"${checkedInputAttr} />` +
              `<span class="ui-option-box"><span class="ui-option-check">${checkIcon}</span></span>` +
              `<div class="ui-option-content">` +
              `<strong class="ui-option-label">${escapeHtml(item.label)}</strong>` +
              (item.desc ? `<small class="ui-option-desc">${escapeHtml(item.desc)}</small>` : "") +
              `</div>` +
              `</div>`
            );
          }).join("");

          const actionsHtml = isInteractive
            ? `<div class="ui-options-actions"><button type="button" class="ui-options-btn ui-options-submit-btn primary" title="Enviar seleção diretamente para o assistente"><svg class="size-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg><span>Enviar seleção</span></button></div>`
            : "";

          return (
            `<div class="ui-card ui-options-card" data-mode="${mode}" data-interactive="${isInteractive ? "true" : "false"}">` +
            headerHtml +
            subtitleHtml +
            `<div class="ui-options-list">${itemsHtml}</div>` +
            actionsHtml +
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
  template.content.querySelectorAll("script, style, iframe, object, embed, base, meta, form, input:not(.ui-option-checkbox)").forEach((node) => { node.remove(); });
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
