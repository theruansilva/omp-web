import type { Context, Hono } from "hono";
import type { UpgradeWebSocket } from "hono/ws";
import type { WebSocket } from "ws";
import { FEDERATED_HTTP_ROUTES, FEDERATED_WEBSOCKET_ROUTES, type FederatedHttpRouteSpec } from "../../shared/federatedRoutes.js";
import { mergeSelectedMachineConfig, parseOmpWebConfigResponseBody, parseSelectedMachineConfigRequest, selectedMachineConfigResponse } from "../configRoutes.js";
import { bridgeHonoSocketToUpstream } from "../webSocketBridge.js";
import { type MachineClient, type MachineJsonResponse, type MachineRequestOptions } from "./machineClient.js";
import { MachineService } from "./machineService.js";
import { filterSafeHeaders, sendGatewayErrorResponse } from "./proxyUtils.js";
import { errorMessage, isRecord } from "../utils.js";

export const REMOTE_HTTP_ROUTES = FEDERATED_HTTP_ROUTES;
export const REMOTE_WEBSOCKET_ROUTES = FEDERATED_WEBSOCKET_ROUTES;

export function registerMachineProxyRoutes(
  app: Hono,
  machines = new MachineService(),
  upgradeWebSocket?: UpgradeWebSocket,
): void {
  for (const spec of REMOTE_HTTP_ROUTES) {
    const routePath = `/api/machines/:machineId${spec.path}`;
    const handler = async (c: Context): Promise<Response> => {
      const machineId = c.req.param("machineId") ?? "";
      const method = c.req.method;
      const contentType = c.req.header("content-type");
      let body: unknown;
      if (method !== "GET" && method !== "HEAD") {
        if (contentType?.includes("application/octet-stream") || contentType?.includes("image/")) {
          body = Buffer.from(await c.req.raw.arrayBuffer());
        } else {
          body = await c.req.raw.json().catch(() => undefined);
        }
      }
      return proxyHttpRequest(machines, spec, machineId, method, c.req.url, body, contentType);
    };

    if (spec.method === "GET") app.get(routePath, handler);
    else if (spec.method === "POST") app.post(routePath, handler);
    else if (spec.method === "PUT") app.put(routePath, handler);
    else if (spec.method === "DELETE") app.delete(routePath, handler);
  }

  if (upgradeWebSocket !== undefined) {
    for (const path of REMOTE_WEBSOCKET_ROUTES) {
      app.get(`/api/machines/:machineId${path}`, upgradeWebSocket((c) => {
        const machineId = c.req.param("machineId") ?? "";
        let upstream: WebSocket | undefined;
        let bridge: { sendToUpstream: (data: unknown) => void } | undefined;
        const clientMessageQueue: unknown[] = [];

        return {
          async onOpen(_evt, ws) {
            if (machineId === "local") {
              ws.close(1011, "Local machine route is not registered for this endpoint");
              return;
            }
            const client = await machines.remoteClient(machineId);
            if (client === undefined) {
              ws.close(1011, "Remote machine not found");
              return;
            }
            try {
              upstream = client.connectWebSocket(remoteApiPath(machineId, c.req.url));
              bridge = bridgeHonoSocketToUpstream(ws, upstream);
              while (clientMessageQueue.length > 0) {
                const queued = clientMessageQueue.shift();
                if (queued !== undefined) bridge.sendToUpstream(queued);
              }
            } catch {
              ws.close(1011, "Remote machine unavailable");
            }
          },
          onMessage(evt) {
            if (bridge !== undefined) {
              bridge.sendToUpstream(evt.data);
            } else {
              clientMessageQueue.push(evt.data);
            }
          },
          onClose() {
            upstream?.close();
          },
          onError() {
            upstream?.close();
          },
        };
      }));
    }
  }
}

async function proxyHttpRequest(machines: MachineService, spec: FederatedHttpRouteSpec, machineId: string, method: string, requestUrl: string, body: unknown, contentType: string | undefined): Promise<Response> {
  if (machineId === "local") {
    return Response.json({ error: "Local machine route is not registered for this endpoint" }, { status: 501 });
  }

  const client = await machines.remoteClient(machineId);
  if (client === undefined) {
    return Response.json({ error: "Machine not found" }, { status: 404 });
  }

  try {
    const remotePath = remoteApiPath(machineId, requestUrl);
    if (spec.path === "/config") return await proxySelectedMachineConfigRequest(client, machineId, method, remotePath, body);

    const requestOptions = proxyRequestOptions(spec, body, contentType);
    const upstream = requestOptions === undefined
      ? await client.request(method, remotePath, body)
      : await client.request(method, remotePath, body, requestOptions);

    const headers = filterSafeHeaders(upstream.headers);
    return new Response(upstream.body as unknown as BodyInit, { status: upstream.statusCode, headers });
  } catch (error) {
    if (isSelectedMachineConfigRequestError(error)) return Response.json({ error: errorMessage(error) }, { status: 400 });
    return sendGatewayErrorResponse(machineId, error);
  }
}

async function proxySelectedMachineConfigRequest(client: MachineClient, machineId: string, method: string, remotePath: string, body: unknown): Promise<Response> {
  if (method === "GET") {
    return sendSelectedMachineConfigResponse(await client.requestJson("GET", remotePath), machineId);
  }

  if (method === "PUT") {
    const patch = parseSelectedMachineConfigRequest(configPayload(body));
    const currentResponse = await client.requestJson("GET", remotePath);
    if (!isSuccessfulStatus(currentResponse.statusCode)) return sendUpstreamJsonResponse(currentResponse, machineId);

    const current = parseOmpWebConfigResponseBody(currentResponse.body, "Remote machine config response");
    const merged = mergeSelectedMachineConfig(current.config, patch);
    return sendSelectedMachineConfigResponse(await client.requestJson("PUT", remotePath, { config: merged }), machineId);
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
}

function configPayload(body: unknown): unknown {
  return isRecord(body) ? body["config"] : undefined;
}

function sendSelectedMachineConfigResponse(upstream: MachineJsonResponse, machineId: string): Response {
  if (!isSuccessfulStatus(upstream.statusCode)) return sendUpstreamJsonResponse(upstream, machineId);
  const headers = filterSafeHeaders(upstream.headers);
  const data = selectedMachineConfigResponse(parseOmpWebConfigResponseBody(upstream.body, "Remote machine config response"));
  return Response.json(data, { status: upstream.statusCode, headers });
}

function sendUpstreamJsonResponse(upstream: MachineJsonResponse, machineId: string): Response {
  const headers = filterSafeHeaders(upstream.headers);
  const payload = upstream.body ?? { error: "Remote machine config request failed", machineId, statusCode: upstream.statusCode };
  return Response.json(payload, { status: upstream.statusCode, headers });
}

function isSuccessfulStatus(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 300;
}

function remoteApiPath(machineId: string, requestUrl: string): string {
  const machinePrefix = `/api/machines/${encodeURIComponent(machineId)}`;
  const url = new URL(requestUrl, "http://localhost");
  const fullPath = url.pathname + url.search;
  const stripped = fullPath.startsWith(machinePrefix) ? fullPath.slice(machinePrefix.length) : fullPath;
  const compatPath = stripped.startsWith("/") ? stripped : `/${stripped}`;
  return `/api${compatPath}`;
}

function proxyRequestOptions(spec: Pick<FederatedHttpRouteSpec, "timeoutMs">, body: unknown, contentType: string | undefined): MachineRequestOptions | undefined {
  const options: MachineRequestOptions = {};
  if (spec.timeoutMs !== undefined) options.timeoutMs = spec.timeoutMs;
  if (isRawProxyBody(body) && contentType !== undefined && contentType !== "") {
    options.contentType = contentType;
  }
  return Object.keys(options).length === 0 ? undefined : options;
}

function isRawProxyBody(body: unknown): boolean {
  return typeof body === "string" || body instanceof ArrayBuffer || ArrayBuffer.isView(body);
}

function isSelectedMachineConfigRequestError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith("PI WEB selected-machine config");
}
