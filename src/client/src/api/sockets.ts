import type { SessionRef } from "../../../shared/apiTypes";

type SessionLookup = SessionRef | string;

function getAuthToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const fromStorage = localStorage.getItem("omp_web_token");
    if (fromStorage) return fromStorage;
    const cookieMatch = document.cookie.match(/(?:^|;\s*)omp_web_token=([^;]*)/);
    return cookieMatch ? decodeURIComponent(cookieMatch[1]) : undefined;
  } catch {
    return undefined;
  }
}

function appendAuthToken(url: string): string {
  const token = getAuthToken();
  if (!token) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}token=${encodeURIComponent(token)}`;
}

export function sessionEvents(session: SessionLookup, machineId = "local"): WebSocket {
  const cwd = typeof session === "string" ? undefined : session.cwd;
  const query = cwd === undefined || cwd === "" ? "" : `?${new URLSearchParams({ cwd }).toString()}`;
  const sessionId = typeof session === "string" ? session : session.id;
  return new WebSocket(appendAuthToken(`${webSocketBaseUrl()}${machinePrefix(machineId)}/sessions/${encodeURIComponent(sessionId)}/events${query}`));
}

export function globalSessionEvents(machineId = "local"): WebSocket {
  return new WebSocket(appendAuthToken(`${webSocketBaseUrl()}${machinePrefix(machineId)}/sessions/events`));
}

export function terminalSocket(projectId: string, workspaceId: string, terminalId: string, initialSize?: { cols: number; rows: number }, machineId = "local"): WebSocket {
  const sizeQuery = initialSize === undefined ? "" : `?cols=${encodeURIComponent(String(initialSize.cols))}&rows=${encodeURIComponent(String(initialSize.rows))}`;
  return new WebSocket(appendAuthToken(`${webSocketBaseUrl()}${machinePrefix(machineId)}/projects/${encodeURIComponent(projectId)}/workspaces/${encodeURIComponent(workspaceId)}/terminals/${encodeURIComponent(terminalId)}/socket${sizeQuery}`));
}

export function realtimeEvents(machineId = "local"): WebSocket {
  return new WebSocket(appendAuthToken(`${webSocketBaseUrl()}${machinePrefix(machineId)}/events`));
}

function machinePrefix(machineId: string): string {
  return `/api/machines/${encodeURIComponent(machineId)}`;
}

function webSocketBaseUrl(): string {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}`;
}
