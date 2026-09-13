import { isRecord } from "../utils.js";

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(url, { ...init, headers });
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
