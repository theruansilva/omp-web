import type { Hono } from "hono";
import { machineScopedPluginId, parseMachineScopedPluginId, type MachineScopedPluginIdParts } from "../../shared/machinePluginIds.js";
import { isOmpWebPluginId } from "../../shared/pluginIds.js";
import { type MachineClient } from "./machineClient.js";
import { MachineService } from "./machineService.js";
import { filterSafeHeaders, sendGatewayErrorResponse } from "./proxyUtils.js";
import { isRecord } from "../utils.js";

interface RemotePluginManifestEntry {
  id: string;
  module: string;
  source?: string;
  scope?: string;
  machineSpecific?: boolean;
}

interface RemotePluginManifest {
  plugins: RemotePluginManifestEntry[];
}

interface MachinePluginProxyMachines {
  remoteClient(id: string): Promise<MachineClient | undefined>;
}

const MACHINE_PLUGIN_MANIFEST_TIMEOUT_MS = 10_000;

export function registerMachinePluginProxyRoutes(app: Hono, machines: MachinePluginProxyMachines = new MachineService()): void {
  app.get("/api/machines/:machineId/omp-web-plugins/manifest.json", async (c) => {
    const machineId = c.req.param("machineId");
    if (machineId === "local") return c.json({ plugins: [] });

    const client = await machines.remoteClient(machineId);
    if (client === undefined) return c.json({ error: "Machine not found" }, 404);

    try {
      const response = await client.requestJson("GET", "/omp-web-plugins/manifest.json", undefined, { timeoutMs: MACHINE_PLUGIN_MANIFEST_TIMEOUT_MS });
      if (response.statusCode === 404) return c.json({ plugins: [] });
      if (response.statusCode < 200 || response.statusCode >= 300) {
        return c.json(response.body, response.statusCode as 400);
      }
      return c.json(rewriteRemotePluginManifest(machineId, parseRemoteManifest(response.body)));
    } catch (error) {
      return sendGatewayErrorResponse(machineId, error);
    }
  });
}

export async function proxyMachinePluginAsset(machines: MachinePluginProxyMachines, scopedPluginId: string, assetPath: string, requestUrl: string): Promise<Response | null> {
  const remotePlugin = parseMachineScopedPluginId(scopedPluginId);
  if (remotePlugin === undefined) return null;

  const client = await machines.remoteClient(remotePlugin.machineId);
  if (client === undefined) {
    return Response.json({ error: "Machine not found" }, { status: 404 });
  }

  const requestPath = remotePluginAssetRequestPath(remotePlugin, assetPath, requestUrl);
  if (requestPath === undefined) {
    return Response.json({ error: "Invalid remote OMP WEB plugin asset path" }, { status: 400 });
  }

  try {
    const upstream = await client.request("GET", requestPath);
    const headers = filterSafeHeaders(upstream.headers);
    return new Response(upstream.body as unknown as BodyInit, { status: upstream.statusCode, headers });
  } catch (error) {
    return sendGatewayErrorResponse(remotePlugin.machineId, error);
  }
}

function rewriteRemotePluginManifest(machineId: string, manifest: RemotePluginManifest): RemotePluginManifest {
  return {
    plugins: manifest.plugins.flatMap((plugin) => {
      const modulePath = remotePluginModulePath(plugin.id, plugin.module);
      if (modulePath === undefined) return [];
      return [{
        ...plugin,
        module: `/omp-web-plugins/${encodeURIComponent(machineScopedPluginId(machineId, plugin.id))}/${modulePath.path}${modulePath.query}`,
      }];
    }),
  };
}

function remotePluginModulePath(pluginId: string, module: string): { path: string; query: string } | undefined {
  if (!isOmpWebPluginId(pluginId)) return undefined;
  const prefix = `/omp-web-plugins/${encodeURIComponent(pluginId)}/`;
  const base = new URL(prefix, "http://omp-web.local");
  try {
    const url = new URL(module, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(prefix)) return undefined;
    const path = safeRemotePluginAssetPath(url.pathname.slice(prefix.length));
    return path === undefined ? undefined : { path, query: url.search };
  } catch {
    return undefined;
  }
}

function remotePluginAssetRequestPath(remotePlugin: MachineScopedPluginIdParts, assetPath: string, requestUrl: string): string | undefined {
  const path = safeRemotePluginAssetPath(assetPath);
  if (path === undefined) return undefined;
  const query = requestUrl.includes("?") ? requestUrl.slice(requestUrl.indexOf("?")) : "";
  return `/omp-web-plugins/${encodeURIComponent(remotePlugin.pluginId)}/${path}${query}`;
}

function safeRemotePluginAssetPath(path: string): string | undefined {
  const segments: string[] = [];
  for (const rawSegment of path.split("/")) {
    const segment = safeRemotePluginAssetPathSegment(rawSegment);
    if (segment === undefined) return undefined;
    if (segment === "") continue;
    segments.push(segment);
  }
  if (segments.length === 0) return undefined;
  return segments.map((segment) => encodeURIComponent(segment)).join("/");
}

function safeRemotePluginAssetPathSegment(rawSegment: string): string | undefined {
  if (rawSegment === "" || rawSegment === ".") return "";
  if (/%(?:2f|5c)/iu.test(rawSegment)) return undefined;
  let segment: string;
  try {
    segment = decodeURIComponent(rawSegment);
  } catch {
    return undefined;
  }
  if (segment === "" || segment === ".") return "";
  if (segment === ".." || segment.includes("/") || segment.includes("\\") || hasControlCharacter(segment)) return undefined;
  return segment;
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

function parseRemoteManifest(value: unknown): RemotePluginManifest {
  if (!isRecord(value) || !Array.isArray(value["plugins"])) throw new Error("Invalid remote OMP WEB plugin manifest");
  return {
    plugins: value["plugins"].map((entry) => {
      if (!isRecord(entry) || typeof entry["id"] !== "string" || !isOmpWebPluginId(entry["id"]) || typeof entry["module"] !== "string" || entry["module"] === "") {
        throw new Error("Invalid remote OMP WEB plugin manifest entry");
      }
      return {
        id: entry["id"],
        module: entry["module"],
        ...(typeof entry["source"] === "string" ? { source: entry["source"] } : {}),
        ...(typeof entry["scope"] === "string" ? { scope: entry["scope"] } : {}),
        ...(parseRemoteMachineSpecific(entry["machineSpecific"])),
      };
    }),
  };
}

function parseRemoteMachineSpecific(value: unknown): { machineSpecific?: boolean } {
  if (value === undefined) return {};
  if (typeof value !== "boolean") throw new Error("Invalid remote OMP WEB plugin manifest entry");
  return { machineSpecific: value };
}
