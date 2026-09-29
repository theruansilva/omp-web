import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { defaultDevApiPort, effectiveOmpWebConfig } from "./src/config";

const { config } = effectiveOmpWebConfig();
const devPort = Number(process.env["OMP_WEB_DEV_PORT"] ?? config.port ?? 8504);
const apiPort = Number(process.env["OMP_WEB_DEV_API_PORT"] ?? defaultDevApiPort(devPort));
const docsRoot = resolve("docs");
const docsPrefix = "/site";

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webm": "video/webm",
  ".xml": "application/xml; charset=utf-8",
};

type MiddlewareNext = (error?: unknown) => void;

async function serveDevDocs(request: IncomingMessage, response: ServerResponse, next: MiddlewareNext): Promise<void> {
  const requestUrl = request.url;
  if (requestUrl === undefined) {
    next();
    return;
  }

  const url = new URL(requestUrl, "http://localhost");
  if (url.pathname === docsPrefix) {
    response.statusCode = 301;
    response.setHeader("Location", `${docsPrefix}/`);
    response.end();
    return;
  }
  if (!url.pathname.startsWith(`${docsPrefix}/`)) {
    next();
    return;
  }

  const relativePath = decodeURIComponent(url.pathname.slice(docsPrefix.length + 1)) || "index.html";
  const requestedPath = relativePath.endsWith("/") ? join(relativePath, "index.html") : relativePath;
  const candidatePaths = extname(requestedPath) === "" ? [requestedPath, `${requestedPath}.html`] : [requestedPath];

  for (const candidatePath of candidatePaths) {
    const fullPath = resolve(docsRoot, candidatePath);
    if (fullPath !== docsRoot && !fullPath.startsWith(`${docsRoot}${sep}`)) {
      response.statusCode = 403;
      response.end("Forbidden");
      return;
    }

    try {
      const fileStat = await stat(fullPath);
      if (!fileStat.isFile()) continue;

      response.statusCode = 200;
      response.setHeader("Content-Type", contentTypes[extname(fullPath)] ?? "application/octet-stream");
      response.setHeader("Cache-Control", "no-cache");
      createReadStream(fullPath).pipe(response);
      return;
    } catch {
      // Continue to next candidate.
    }
  }

  response.statusCode = 404;
  response.end("Not found");
}

function devDocsPlugin(): Plugin {
  return {
    name: "omp-web-dev-docs",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        void serveDevDocs(request, response, next);
      });
    },
  };
}

export default defineConfig({
  plugins: [devDocsPlugin()],
  root: "src/client",
  resolve: {
    alias: {
      "@oh-my-pi/pi-utils/mermaid-ascii": resolve("src/client/src/formatting/mermaid-ascii-shim.ts"),
    },
  },
  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve("src/client/index.html"),
        omp: resolve("src/client/omp.html"),
      },
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@lezer/common") || id.includes("@lezer/highlight") || id.includes("@lezer/lr")) return "vendor-editor-core";
          if (id.includes("@codemirror/lang-") || id.includes("@lezer/")) return "vendor-editor-languages";
          if (id.includes("@codemirror") || id.includes("codemirror")) return "vendor-editor-core";
          if (id.includes("@xterm")) return "vendor-terminal";
          if (id.includes("@material/web")) return "vendor-material-m3";
          return undefined;
        },
      },
    },
  },
  server: {
    host: config.host === "0.0.0.0" ? "0.0.0.0" : (process.env["OMP_WEB_HOST"] ?? "localhost"),
    port: devPort,
    strictPort: true,
    allowedHosts: config.allowedHosts ?? true,
    proxy: {
      "/api": { target: `http://localhost:${String(apiPort)}`, ws: true },
      "/omp-web-plugins": { target: `http://localhost:${String(apiPort)}` },
    },
  },
});
