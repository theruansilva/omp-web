export function useApi() {
  const get = async <T,>(url: string): Promise<T> => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
    return res.json() as Promise<T>;
  };

  const post = async <T,>(url: string, body?: unknown): Promise<T> => {
    const init: RequestInit = { method: "POST" };
    if (body !== undefined) {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(body);
    }
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : (undefined as T);
  };

  return { get, post };
}
