import { isRecord } from "../utils.js";

function getStoredAuthToken(): string | undefined {
  try {
    if (typeof localStorage !== "undefined") {
      const token = localStorage.getItem("omp_web_token");
      if (token) return token;
    }
    if (typeof document !== "undefined") {
      const cookieMatch = document.cookie.match(/(?:^|;\s*)omp_web_token=([^;]*)/);
      if (cookieMatch) return decodeURIComponent(cookieMatch[1]);
    }
  } catch {}
  return undefined;
}

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !headers.has("content-type")) headers.set("content-type", "application/json");
  if (!headers.has("authorization")) {
    const token = getStoredAuthToken();
    if (token) headers.set("authorization", `Bearer ${token}`);
  }
  const credentials = init?.credentials ?? "same-origin";
  const response = await fetch(url, { ...init, headers, credentials });
  if (!response.ok) {
    const body: unknown = await response.json().catch((): unknown => ({}));
    throw new Error(errorMessage(body) ?? response.statusText);
  }
  return (await response.json()) as T;
}

function errorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  return typeof value["error"] === "string" ? value["error"] : undefined;
}
