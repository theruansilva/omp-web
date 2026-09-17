import { highlightCode, classHighlighter } from "@lezer/highlight";
import type { Parser } from "@lezer/common";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { css as cssLang } from "@codemirror/lang-css";
import { html as htmlLang } from "@codemirror/lang-html";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { go } from "@codemirror/lang-go";

const jsParser = javascript().language.parser;
const tsParser = javascript({ typescript: true }).language.parser;
const tsxParser = javascript({ typescript: true, jsx: true }).language.parser;
const jsxParser = javascript({ jsx: true }).language.parser;
const jsonParser = json().language.parser;
const cssParser = cssLang().language.parser;
const htmlParser = htmlLang().language.parser;
const pythonParser = python().language.parser;
const rustParser = rust().language.parser;
const goParser = go().language.parser;
const mdParser = markdown().language.parser;

export function getLanguageParser(language: string): Parser | null {
  const normalized = language.trim().toLowerCase();
  switch (normalized) {
    case "js":
    case "javascript":
    case "mjs":
    case "cjs":
      return jsParser;
    case "ts":
    case "typescript":
    case "mts":
    case "cts":
      return tsParser;
    case "jsx":
      return jsxParser;
    case "tsx":
      return tsxParser;
    case "json":
    case "jsonc":
      return jsonParser;
    case "html":
    case "htm":
    case "xml":
    case "svg":
      return htmlParser;
    case "css":
    case "scss":
    case "less":
      return cssParser;
    case "py":
    case "python":
      return pythonParser;
    case "rs":
    case "rust":
      return rustParser;
    case "go":
    case "golang":
      return goParser;
    case "md":
    case "markdown":
      return mdParser;
    default:
      return null;
  }
}

export function highlightCodeBlock(text: string, language?: string): string {
  if (!language) return escapeHtml(text);
  const parser = getLanguageParser(language);
  if (!parser) return escapeHtml(text);

  try {
    const tree = parser.parse(text);
    let html = "";
    highlightCode(
      text,
      tree,
      classHighlighter,
      (token, classes) => {
        const escaped = escapeHtml(token);
        html += classes ? `<span class="${classes}">${escaped}</span>` : escaped;
      },
      () => {
        html += "\n";
      }
    );
    return html;
  } catch {
    return escapeHtml(text);
  }
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
