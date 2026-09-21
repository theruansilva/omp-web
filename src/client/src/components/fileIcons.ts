import { html, type TemplateResult } from "lit";

export type FileCategory =
  | "typescript"
  | "javascript"
  | "python"
  | "rust"
  | "go"
  | "c"
  | "csharp"
  | "java"
  | "script"
  | "shell"
  | "html"
  | "css"
  | "json"
  | "config"
  | "xml"
  | "markdown"
  | "text"
  | "database"
  | "image"
  | "audio"
  | "video"
  | "archive"
  | "pdf"
  | "git"
  | "docker"
  | "package"
  | "lock"
  | "default";

export function getFileCategory(filename: string): FileCategory {
  const lower = filename.toLowerCase();
  const name = lower.split("/").pop() ?? "";

  if (name === "dockerfile" || name.startsWith("dockerfile.") || name.startsWith("docker-compose")) return "docker";
  if (name.startsWith(".git") || name === ".gitignore" || name === ".gitmodules" || name === ".gitattributes") return "git";
  if (name === "package.json") return "package";
  if (name.endsWith(".lock") || name === "bun.lockb" || name === "package-lock.json" || name === "pnpm-lock.yaml" || name === "yarn.lock") return "lock";
  if (name.startsWith(".env")) return "config";

  const ext = name.includes(".") ? (name.split(".").pop() ?? "") : "";
  switch (ext) {
    case "ts":
    case "tsx":
    case "mts":
    case "cts":
      return "typescript";
    case "js":
    case "jsx":
    case "mjs":
    case "cjs":
      return "javascript";
    case "py":
    case "pyw":
    case "ipynb":
      return "python";
    case "rs":
      return "rust";
    case "go":
      return "go";
    case "c":
    case "cpp":
    case "cc":
    case "cxx":
    case "h":
    case "hpp":
    case "hxx":
      return "c";
    case "cs":
    case "fs":
      return "csharp";
    case "java":
    case "kt":
    case "kts":
    case "scala":
      return "java";
    case "php":
    case "rb":
    case "swift":
      return "script";
    case "sh":
    case "bash":
    case "zsh":
    case "fish":
      return "shell";
    case "html":
    case "htm":
    case "xhtml":
    case "vue":
    case "svelte":
    case "astro":
      return "html";
    case "css":
    case "scss":
    case "sass":
    case "less":
    case "styl":
      return "css";
    case "json":
    case "json5":
    case "jsonc":
      return "json";
    case "yaml":
    case "yml":
    case "toml":
    case "ini":
    case "conf":
    case "config":
    case "env":
      return "config";
    case "xml":
      return "xml";
    case "md":
    case "markdown":
    case "mdx":
      return "markdown";
    case "txt":
    case "log":
    case "csv":
    case "tsv":
      return "text";
    case "sql":
    case "sqlite":
    case "sqlite3":
    case "db":
    case "db3":
    case "prisma":
      return "database";
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "ico":
    case "bmp":
    case "avif":
    case "tiff":
    case "svg":
      return "image";
    case "mp3":
    case "wav":
    case "ogg":
    case "flac":
    case "m4a":
    case "aac":
      return "audio";
    case "mp4":
    case "mov":
    case "avi":
    case "mkv":
    case "webm":
    case "m4v":
      return "video";
    case "zip":
    case "tar":
    case "gz":
    case "tgz":
    case "7z":
    case "rar":
    case "bz2":
    case "xz":
    case "zst":
      return "archive";
    case "pdf":
      return "pdf";
    default:
      return "default";
  }
}

export function renderTreeChevron(expanded: boolean): TemplateResult {
  return html`
    <svg class="tree-chevron-svg" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      ${expanded
      ? html`<path d="M3.5 6l4.5 4.5 4.5-4.5" />`
      : html`<path d="M6 3.5l4.5 4.5-4.5 4.5" />`}
    </svg>
  `;
}

export function renderFolderIcon(expanded: boolean): TemplateResult {
  if (expanded) {
    return html`
      <svg class="tree-icon-svg folder-icon-open" viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true" focusable="false">
        <path d="M1.5 3.5a1 1 0 0 1 1-1h3l1.5 1.5h6.5a1 1 0 0 1 1 1v2H3.5a1 1 0 0 0-.95.68L1.5 12V3.5z" fill="#d97706" fill-opacity="0.25" stroke="#d97706" stroke-width="1.2" stroke-linejoin="round" />
        <path d="M2.5 7.5h11a1 1 0 0 1 .96 1.28l-1.2 4a1 1 0 0 1-.96.72H1.7a1 1 0 0 1-.96-1.28l1-4a1 1 0 0 1 .76-.72z" fill="#f59e0b" fill-opacity="0.4" stroke="#f59e0b" stroke-width="1.2" stroke-linejoin="round" />
      </svg>
    `;
  }
  return html`
    <svg class="tree-icon-svg folder-icon-closed" viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true" focusable="false">
      <path d="M1.5 3.5a1 1 0 0 1 1-1h3l1.5 1.5h6.5a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-8z" fill="#f59e0b" fill-opacity="0.25" stroke="#f59e0b" stroke-width="1.3" stroke-linejoin="round" />
    </svg>
  `;
}

export function renderGridViewIcon(): TemplateResult {
  return html`
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  `;
}

export function renderListViewIcon(): TemplateResult {
  return html`
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      <line x1="2.5" y1="4" x2="13.5" y2="4" />
      <line x1="2.5" y1="8" x2="13.5" y2="8" />
      <line x1="2.5" y1="12" x2="13.5" y2="12" />
    </svg>
  `;
}

export function renderUpFolderIcon(): TemplateResult {
  return html`
    <svg class="tree-icon-svg folder-icon-up" viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true" focusable="false">
      <path d="M1.5 3.5a1 1 0 0 1 1-1h3l1.5 1.5h6.5a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-8z" fill="#f59e0b" fill-opacity="0.25" stroke="#f59e0b" stroke-width="1.3" stroke-linejoin="round" />
      <path d="M8 11.5V5.5M5.5 8L8 5.5l2.5 2.5" stroke="#d97706" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;
}

export function renderDownloadIcon(): TemplateResult {
  return html`
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      <path d="M8 2.5v7.5M4.5 7l3.5 3.5L11.5 7M3 13.5h10" />
    </svg>
  `;
}

export function renderFileIcon(filename: string): TemplateResult {
  const category = getFileCategory(filename);

  switch (category) {
    case "typescript":
      return html`
        <svg class="tree-icon-svg file-ts" viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true" focusable="false">
          <rect x="1.5" y="1.5" width="13" height="13" rx="2" fill="#3178c6" />
          <path d="M4 6.5h4M6 6.5v5.5" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" />
          <path d="M9.5 11c.5.5 1.2.7 1.8.4.5-.3.7-.8.4-1.2-.3-.5-1.5-.7-1.7-1.3-.2-.5 0-1 .4-1.3.6-.4 1.4-.3 1.9.1" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" />
        </svg>
      `;
    case "javascript":
      return html`
        <svg class="tree-icon-svg file-js" viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true" focusable="false">
          <rect x="1.5" y="1.5" width="13" height="13" rx="2" fill="#f7df1e" />
          <path d="M6 7v3.5a1.5 1.5 0 0 1-3 0" stroke="#000000" stroke-width="1.4" stroke-linecap="round" />
          <path d="M9.5 11c.5.5 1.2.7 1.8.4.5-.3.7-.8.4-1.2-.3-.5-1.5-.7-1.7-1.3-.2-.5 0-1 .4-1.3.6-.4 1.4-.3 1.9.1" stroke="#000000" stroke-width="1.3" stroke-linecap="round" />
        </svg>
      `;
    case "python":
      return html`
        <svg class="tree-icon-svg file-python" viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true" focusable="false">
          <path d="M7.5 2C4.5 2 4 3.5 4 4.5V6h4v1H3.5C2 7 2 8.5 2 10s1.5 2.5 3 2.5h1V11c0-1.5 1-2.5 2.5-2.5H11V7c0-2-1.5-5-3.5-5z" fill="#3b82f6" />
          <path d="M8.5 14c3 0 3.5-1.5 3.5-2.5V10H8V9h4.5c1.5 0 1.5-1.5 1.5-3s-1.5-2.5-3-2.5h-1V5c0 1.5-1 2.5-2.5 2.5H5V9c0 2 1.5 5 3.5 5z" fill="#facc15" />
          <circle cx="5.5" cy="4" r=".6" fill="#fff" />
          <circle cx="10.5" cy="12" r=".6" fill="#fff" />
        </svg>
      `;
    case "rust":
      return html`
        <svg class="tree-icon-svg file-rust" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#ea580c" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <circle cx="8" cy="8" r="5" />
          <circle cx="8" cy="8" r="2" />
          <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.5 3.5l1.5 1.5M11 11l1.5 1.5M3.5 12.5l1.5-1.5M11 5l1.5-1.5" />
        </svg>
      `;
    case "go":
      return html`
        <svg class="tree-icon-svg file-go" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#06b6d4" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <ellipse cx="8" cy="8" rx="5.5" ry="4.5" />
          <circle cx="6" cy="7" r="1.2" fill="#06b6d4" />
          <circle cx="10" cy="7" r="1.2" fill="#06b6d4" />
          <path d="M7 10h2" />
        </svg>
      `;
    case "c":
    case "csharp":
    case "java":
    case "script":
      return html`
        <svg class="tree-icon-svg file-code" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#818cf8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <path d="M5 5.5L2 8l3 2.5M11 5.5l3 2.5-3 2.5M9.5 4l-3 8" />
        </svg>
      `;
    case "html":
    case "xml":
      return html`
        <svg class="tree-icon-svg file-html" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#ea580c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <path d="M5 4.5L1.5 8 5 11.5M11 4.5L14.5 8 11 11.5M9.5 3.5l-3 9" />
        </svg>
      `;
    case "css":
      return html`
        <svg class="tree-icon-svg file-css" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <path d="M3.5 5.5h9M3.5 10.5h9M6.5 3l-1 10M10.5 3l-1 10" />
        </svg>
      `;
    case "json":
      return html`
        <svg class="tree-icon-svg file-json" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <path d="M5.5 3.5c-.8 0-1.5.5-1.5 1.5v1.5c0 .6-.4 1-1 1 .6 0 1 .4 1 1V11c0 1 .7 1.5 1.5 1.5M10.5 3.5c.8 0 1.5.5 1.5 1.5v1.5c0 .6.4 1 1 1-.6 0-1 .4-1 1V11c0 1-.7 1.5-1.5 1.5" />
        </svg>
      `;
    case "config":
      return html`
        <svg class="tree-icon-svg file-config" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#a855f7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <path d="M2.5 4.5h3m3 0h5M2.5 8h6m3 0h2M2.5 11.5h2m3 0h6M5.5 3v3M11.5 6.5v3M4.5 10v3" />
        </svg>
      `;
    case "shell":
      return html`
        <svg class="tree-icon-svg file-shell" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#10b981" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <rect x="2" y="2.5" width="12" height="11" rx="2" />
          <path d="M5 6l2.5 2L5 10M9 10.5h2" />
        </svg>
      `;
    case "markdown":
      return html`
        <svg class="tree-icon-svg file-markdown" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#60a5fa" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <rect x="1.5" y="3" width="13" height="10" rx="1.5" />
          <path d="M4 10.5V6.5l2 2 2-2v4M12 8.5l-1.5 1.5L9 8.5M10.5 6.5v3.5" />
        </svg>
      `;
    case "database":
      return html`
        <svg class="tree-icon-svg file-database" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#f43f5e" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <ellipse cx="8" cy="4.5" rx="5" ry="2" />
          <path d="M3 4.5v3.5c0 1.1 2.2 2 5 2s5-.9 5-2V4.5M3 8v3.5c0 1.1 2.2 2 5 2s5-.9 5-2V8" />
        </svg>
      `;
    case "git":
      return html`
        <svg class="tree-icon-svg file-git" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#f05032" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <circle cx="4.5" cy="4.5" r="1.5" />
          <circle cx="4.5" cy="11.5" r="1.5" />
          <circle cx="11.5" cy="6.5" r="1.5" />
          <path d="M4.5 6v4M11.5 8a3.5 3.5 0 0 1-3.5 3.5H4.5" />
        </svg>
      `;
    case "docker":
      return html`
        <svg class="tree-icon-svg file-docker" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#0db7ed" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <path d="M2 9.5c.5.5 1.5.5 2 0s1.5-.5 2 0 1.5.5 2 0 1.5-.5 2 0 1.5.5 2 0M2 9.5a5.5 5.5 0 0 0 10.5.5c.8 0 1.5-.4 2-.9-.3 1.8-1.5 3.4-3.5 3.9" />
          <rect x="4.5" y="4.5" width="2" height="2" />
          <rect x="7" y="4.5" width="2" height="2" />
          <rect x="7" y="2" width="2" height="2" />
          <rect x="9.5" y="4.5" width="2" height="2" />
        </svg>
      `;
    case "package":
      return html`
        <svg class="tree-icon-svg file-package" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#ea580c" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <path d="M2.5 5L8 2l5.5 3v6L8 14l-5.5-3zM8 2v12M2.5 5l5.5 3.5 5.5-3.5" />
        </svg>
      `;
    case "lock":
      return html`
        <svg class="tree-icon-svg file-lock" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#64748b" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <rect x="3" y="6.5" width="10" height="7.5" rx="1.5" />
          <path d="M5.5 6.5V4.5a2.5 2.5 0 0 1 5 0v2" />
        </svg>
      `;
    case "image":
      return html`
        <svg class="tree-icon-svg file-image" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#ec4899" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <rect x="2" y="2.5" width="12" height="11" rx="2" />
          <circle cx="5.5" cy="5.5" r="1" />
          <path d="M14 10.5l-3.5-3.5-5 5M9 12l2.5-2.5 2.5 2" />
        </svg>
      `;
    case "audio":
      return html`
        <svg class="tree-icon-svg file-audio" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#8b5cf6" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <circle cx="4.5" cy="11.5" r="2" />
          <circle cx="11.5" cy="9.5" r="2" />
          <path d="M6.5 11.5V4l7-2v7.5" />
        </svg>
      `;
    case "video":
      return html`
        <svg class="tree-icon-svg file-video" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#ef4444" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <rect x="2" y="3.5" width="8.5" height="9" rx="1.5" />
          <path d="M10.5 6.5l3.5-2v7l-3.5-2v-3z" />
        </svg>
      `;
    case "archive":
      return html`
        <svg class="tree-icon-svg file-archive" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#d97706" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <rect x="2" y="3" width="12" height="10" rx="1.5" />
          <path d="M2 6h12M6.5 8.5h3" />
        </svg>
      `;
    case "pdf":
      return html`
        <svg class="tree-icon-svg file-pdf" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#ef4444" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <path d="M3 2.5h6l4 4V13.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z" />
          <path d="M9 2.5V6.5h4" />
          <path d="M4.5 10.5v-3h1.8a.9.9 0 0 1 0 1.8H4.5" />
        </svg>
      `;
    case "text":
      return html`
        <svg class="tree-icon-svg file-text" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#94a3b8" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <path d="M3 2.5h6l4 4V13.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z" />
          <path d="M9 2.5V6.5h4" />
          <path d="M5 8.5h6M5 11h4" />
        </svg>
      `;
    case "default":
    default:
      return html`
        <svg class="tree-icon-svg file-default" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" style="color: var(--pi-dim, #94a3b8);">
          <path d="M3 2.5h6l4 4V13.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z" />
          <path d="M9 2.5V6.5h4" />
        </svg>
      `;
  }
}
