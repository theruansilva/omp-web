import type { Hono } from "hono";
import type { WriteWorkspaceFileOptions } from "../shared/apiTypes.js";
import type { OmpWebConfigService } from "./configRoutes.js";
import type { ProjectService } from "./projects/projectService.js";
import { deleteWorkspaceFile, moveWorkspaceFile, readWorkspaceFile, readWorkspaceFileRaw, writeWorkspaceFile } from "./workspaces/fileContentService.js";
import { isAbsoluteishFileSuggestionQuery, listFileSuggestions, listPathSuggestions } from "./workspaces/fileSuggestions.js";
import { listWorkspaceTree } from "./workspaces/fileTreeService.js";
import { readWorkspaceImagePreview } from "./workspaces/imagePreviewService.js";
import { resolveWorkspaceContext } from "./workspaces/workspaceContext.js";
import { pathAccessForWorkspaceContext } from "./workspaces/effectivePathAccess.js";
import type { WorkspaceService } from "./workspaces/workspaceService.js";

export interface WorkspaceExplorerRouteOptions {
  config?: Pick<OmpWebConfigService, "read">;
}

export function registerWorkspaceExplorerRoutes(app: Hono, projects: ProjectService, workspaces: WorkspaceService, prefix = "/api", options: WorkspaceExplorerRouteOptions = {}): void {
  app.get(`${prefix}/projects/:projectId/workspaces/:workspaceId/tree`, async (c) => {
    try {
      const projectId = c.req.param("projectId");
      const workspaceId = c.req.param("workspaceId");
      const path = c.req.query("path");
      const context = await resolveWorkspaceContext(projects, workspaces, projectId, workspaceId);
      return c.json(await listWorkspaceTree(context.root, path, await pathAccessForWorkspaceContext(context, options.config)));
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
  });

  app.get(`${prefix}/projects/:projectId/workspaces/:workspaceId/file`, async (c) => {
    try {
      const projectId = c.req.param("projectId");
      const workspaceId = c.req.param("workspaceId");
      const path = c.req.query("path");
      const context = await resolveWorkspaceContext(projects, workspaces, projectId, workspaceId);
      return c.json(await readWorkspaceFile(context.root, path, await pathAccessForWorkspaceContext(context, options.config)));
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
  });

  app.put(`${prefix}/projects/:projectId/workspaces/:workspaceId/file`, async (c) => {
    try {
      const projectId = c.req.param("projectId");
      const workspaceId = c.req.param("workspaceId");
      const path = c.req.query("path");
      const createDirs = c.req.query("createDirs");
      const overwrite = c.req.query("overwrite");
      const context = await resolveWorkspaceContext(projects, workspaces, projectId, workspaceId);
      const writeOptions: WriteWorkspaceFileOptions = {
        createDirs: createDirs !== "false",
        overwrite: overwrite !== "false",
      };
      const arrayBuffer = await c.req.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return c.json(await writeWorkspaceFile(context.root, path, buffer, writeOptions));
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
  });

  app.delete(`${prefix}/projects/:projectId/workspaces/:workspaceId/file`, async (c) => {
    try {
      const projectId = c.req.param("projectId");
      const workspaceId = c.req.param("workspaceId");
      const path = c.req.query("path");
      const context = await resolveWorkspaceContext(projects, workspaces, projectId, workspaceId);
      return c.json(await deleteWorkspaceFile(context.root, path));
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
  });

  app.post(`${prefix}/projects/:projectId/workspaces/:workspaceId/file/move`, async (c) => {
    try {
      const projectId = c.req.param("projectId");
      const workspaceId = c.req.param("workspaceId");
      const fromPath = c.req.query("fromPath");
      const toPath = c.req.query("toPath");
      const createDirs = c.req.query("createDirs");
      const overwrite = c.req.query("overwrite");
      const context = await resolveWorkspaceContext(projects, workspaces, projectId, workspaceId);
      return c.json(await moveWorkspaceFile(context.root, fromPath, toPath, {
        createDirs: createDirs !== "false",
        overwrite: overwrite === "true",
      }));
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
  });

  app.get(`${prefix}/projects/:projectId/workspaces/:workspaceId/file/raw`, async (c) => {
    try {
      const projectId = c.req.param("projectId");
      const workspaceId = c.req.param("workspaceId");
      const path = c.req.query("path");
      const context = await resolveWorkspaceContext(projects, workspaces, projectId, workspaceId);
      const file = await readWorkspaceFileRaw(context.root, path, await pathAccessForWorkspaceContext(context, options.config));
      const fallbackName = file.filename.replace(/[^\x20-\x7E]|["\\]/g, "_");
      const utf8Name = encodeURIComponent(file.filename);

      return new Response(file.stream as unknown as ReadableStream, {
        headers: {
          "Content-Type": file.mimeType,
          "Cache-Control": "private, no-cache",
          "Content-Length": String(file.size),
          "Content-Disposition": `attachment; filename="${fallbackName}"; filename*=UTF-8''${utf8Name}`,
          "Content-Security-Policy": "sandbox; default-src 'none'",
          "Last-Modified": new Date(file.modifiedAt).toUTCString(),
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
  });

  app.get(`${prefix}/projects/:projectId/workspaces/:workspaceId/file/preview`, async (c) => {
    try {
      const projectId = c.req.param("projectId");
      const workspaceId = c.req.param("workspaceId");
      const path = c.req.query("path");
      const range = c.req.header("range");
      const context = await resolveWorkspaceContext(projects, workspaces, projectId, workspaceId);
      const preview = await readWorkspaceImagePreview(context.root, path, await pathAccessForWorkspaceContext(context, options.config), range);

      const headers: Record<string, string> = {
        "Content-Type": preview.mimeType,
        "Cache-Control": "private, max-age=3600",
        "Content-Length": String(preview.size),
        "Accept-Ranges": "bytes",
        "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self' data: blob:; media-src 'self' data: blob:; style-src 'unsafe-inline'",
        "Last-Modified": new Date(preview.modifiedAt).toUTCString(),
        "X-Content-Type-Options": "nosniff",
      };
      if (preview.contentRange) {
        headers["Content-Range"] = preview.contentRange;
      }

      return new Response(preview.stream as unknown as ReadableStream, {
        status: preview.status,
        headers,
      });
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
  });

  app.get(`${prefix}/projects/:projectId/workspaces/:workspaceId/files`, async (c) => {
    try {
      const projectId = c.req.param("projectId");
      const workspaceId = c.req.param("workspaceId");
      const context = await resolveWorkspaceContext(projects, workspaces, projectId, workspaceId);
      const query = c.req.query("q") ?? "";
      const kind = c.req.query("kind") as "tracked" | "untracked" | "other" | undefined;
      const mode = c.req.query("mode") as "file" | "path" | undefined;
      const scope = c.req.query("scope") as "tracked" | "all" | undefined;

      const pathAccess = isAbsoluteishFileSuggestionQuery(query) ? await pathAccessForWorkspaceContext(context, options.config) : undefined;
      if (mode === "path") return c.json(await listPathSuggestions(context.root, query, pathAccess));
      return c.json(await listFileSuggestions(context.root, query, { kind, scope, pathAccess }));
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
  });
}
