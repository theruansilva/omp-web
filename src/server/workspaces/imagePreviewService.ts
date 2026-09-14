import { createReadStream, type ReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname } from "node:path";
import type { OmpWebPathAccessConfig } from "../../shared/apiTypes.js";
import { MAX_IMAGE_PREVIEW_BYTES, MAX_IMAGE_PREVIEW_LABEL } from "../../shared/workspaceFiles.js";
import { resolveWorkspacePathAccessTarget } from "./pathAccessPolicy.js";

const IMAGE_MIME_TYPES: Record<string, string | undefined> = {
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const VIDEO_MIME_TYPES: Record<string, string | undefined> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "video/ogg",
  ".ogv": "video/ogg",
  ".mov": "video/quicktime",
  ".m4v": "video/mp4",
  ".mkv": "video/x-matroska",
};

export interface WorkspaceImagePreview {
  path: string;
  mimeType: string;
  size: number;
  totalSize: number;
  modifiedAt: string;
  stream: ReadStream;
  status: 200 | 206;
  contentRange?: string;
}

export function imageMimeTypeForPath(path: string): string | undefined {
  return IMAGE_MIME_TYPES[extname(path).toLowerCase()];
}

export function videoMimeTypeForPath(path: string): string | undefined {
  return VIDEO_MIME_TYPES[extname(path).toLowerCase()];
}

export function isVideoPath(path: string): boolean {
  return VIDEO_MIME_TYPES[extname(path).toLowerCase()] !== undefined;
}

export async function readWorkspaceImagePreview(
  rootPath: string,
  path: string | undefined,
  pathAccess?: OmpWebPathAccessConfig,
  rangeHeader?: string,
): Promise<WorkspaceImagePreview> {
  if (path === undefined || path === "") throw new Error("path query parameter is required");
  const { target, displayPath } = await resolveWorkspacePathAccessTarget(rootPath, path, pathAccess);
  const s = await stat(target);
  if (!s.isFile()) throw new Error("Path is not a file");

  const imageMime = imageMimeTypeForPath(displayPath);
  const videoMime = videoMimeTypeForPath(displayPath);

  if (imageMime !== undefined) {
    if (s.size > MAX_IMAGE_PREVIEW_BYTES) throw new Error(`Image is too large to preview (limit ${MAX_IMAGE_PREVIEW_LABEL})`);
    return {
      path: displayPath,
      mimeType: imageMime,
      size: s.size,
      totalSize: s.size,
      modifiedAt: s.mtime.toISOString(),
      stream: createReadStream(target),
      status: 200,
    };
  }

  if (videoMime !== undefined) {
    if (rangeHeader !== undefined && rangeHeader.startsWith("bytes=")) {
      const parts = rangeHeader.slice(6).split("-");
      const rawStart = parts[0] ? parseInt(parts[0], 10) : 0;
      const rawEnd = parts[1] ? parseInt(parts[1], 10) : s.size - 1;
      const start = Number.isNaN(rawStart) ? 0 : Math.max(0, rawStart);
      const end = Number.isNaN(rawEnd) ? s.size - 1 : Math.min(s.size - 1, rawEnd);

      if (start <= end && start < s.size) {
        const chunkSize = end - start + 1;
        return {
          path: displayPath,
          mimeType: videoMime,
          size: chunkSize,
          totalSize: s.size,
          modifiedAt: s.mtime.toISOString(),
          stream: createReadStream(target, { start, end }),
          status: 206,
          contentRange: `bytes ${start}-${end}/${s.size}`,
        };
      }
    }

    return {
      path: displayPath,
      mimeType: videoMime,
      size: s.size,
      totalSize: s.size,
      modifiedAt: s.mtime.toISOString(),
      stream: createReadStream(target),
      status: 200,
    };
  }

  throw new Error("Image preview is not supported for this file type");
}
