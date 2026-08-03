export function useApi() {
  const get = async <T>(url: string): Promise<T> => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url} failed: ${String(res.status)}`);
    const data: unknown = await res.json();
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return data as T;
  };

  const post = async <T>(url: string, body?: unknown): Promise<T> => {
    const init: RequestInit = { method: "POST" };
    if (body !== undefined) {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(body);
    }
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`POST ${url} failed: ${String(res.status)}`);
    const text = await res.text();
    const data: unknown = text ? JSON.parse(text) : undefined;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return data as T;
  };

  return { get, post };
}
