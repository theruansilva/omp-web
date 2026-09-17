import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { lookup } from "node:dns/promises";
import { join } from "node:path";
import type { MiddlewareHandler } from "hono";
import { defaultOmpWebDataDir } from "../config.js";

export function getOrGenerateAuthToken(dataDir = defaultOmpWebDataDir(), env: NodeJS.ProcessEnv = process.env): string {
  const fromEnv = env["OMP_WEB_AUTH_TOKEN"];
  if (fromEnv !== undefined && fromEnv.trim() !== "") {
    return fromEnv.trim();
  }

  const tokenPath = join(dataDir, "auth-token");
  if (existsSync(tokenPath)) {
    try {
      const content = readFileSync(tokenPath, "utf8").trim();
      if (content !== "") return content;
    } catch {
      // fall through to generate
    }
  }

  const token = randomBytes(32).toString("hex");
  try {
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(tokenPath, `${token}\n`, { encoding: "utf8", mode: 0o600 });
    if (process.platform !== "win32") {
      chmodSync(tokenPath, 0o600);
    }
  } catch {
    // Return generated token even if saving fails
  }
  return token;
}

export function parseHostHeader(hostHeader: string | undefined): string | undefined {
  if (hostHeader === undefined || hostHeader.trim() === "") return undefined;
  const raw = hostHeader.trim().toLowerCase();
  // Handle IPv6 bracketed hosts like [::1]:8504
  if (raw.startsWith("[")) {
    const bracketEnd = raw.indexOf("]");
    if (bracketEnd !== -1) return raw.slice(1, bracketEnd);
  }
  const colonIdx = raw.indexOf(":");
  return colonIdx !== -1 ? raw.slice(0, colonIdx) : raw;
}

export function normalizeAllowedHost(entry: string): string {
  const trimmed = entry.trim().toLowerCase();
  if (trimmed === "*") return "*";
  if (trimmed.includes("://")) {
    try {
      return new URL(trimmed).hostname.toLowerCase();
    } catch {
      // fallback
    }
  }
  return parseHostHeader(trimmed) ?? trimmed;
}

export function matchAllowedHost(requestHost: string, allowedPattern: string): boolean {
  if (allowedPattern === "*") return true;
  if (allowedPattern.startsWith("*.")) {
    const suffix = allowedPattern.slice(2);
    return requestHost === suffix || requestHost.endsWith(`.${suffix}`);
  }
  return requestHost === allowedPattern;
}

export function validateHostHeader(hostHeader: string | undefined, allowedHosts: string[] | true | undefined): boolean {
  if (allowedHosts === true) return true;
  if (hostHeader === undefined || hostHeader.trim() === "") return false;
  const requestHost = parseHostHeader(hostHeader);
  if (requestHost === undefined) return false;

  const baseAllowed = ["127.0.0.1", "localhost", "::1"];
  const allowedList = Array.isArray(allowedHosts) ? [...baseAllowed, ...allowedHosts] : baseAllowed;
  return allowedList.some((h) => matchAllowedHost(requestHost, normalizeAllowedHost(h)));
}

export function validateOriginHeader(originHeader: string | undefined, hostHeader: string | undefined, allowedHosts: string[] | true | undefined): boolean {
  if (originHeader === undefined || originHeader.trim() === "") return true;
  let originUrl: URL;
  try {
    originUrl = new URL(originHeader);
  } catch {
    return false;
  }

  const originHost = originUrl.hostname.toLowerCase();

  if (allowedHosts === true) return true;

  // Check if Origin matches request Host
  const requestHostName = parseHostHeader(hostHeader);
  if (requestHostName !== undefined && originHost === requestHostName) {
    return true;
  }

  // Check against allowedHosts
  const baseAllowed = ["127.0.0.1", "localhost", "::1"];
  const allowedList = Array.isArray(allowedHosts) ? [...baseAllowed, ...allowedHosts] : baseAllowed;
  return allowedList.some((h) => matchAllowedHost(originHost, normalizeAllowedHost(h)));
}

export function isPrivateOrReservedHost(hostname: string, env: NodeJS.ProcessEnv = process.env, allowPrivate = false): boolean {
  if (allowPrivate || env["OMP_WEB_ALLOW_PRIVATE_MACHINES"] === "1" || env["OMP_WEB_ALLOW_PRIVATE_MACHINES"] === "true") {
    return false;
  }

  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return true;

  // Check IPv4
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, aStr, bStr] = ipv4Match;
    const a = Number(aStr);
    const b = Number(bStr);
    if (a === 127) return true; // 127.0.0.0/8
    if (a === 10) return true;  // 10.0.0.0/8
    if (a === 169 && b === 254) return true; // 169.254.0.0/16
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10
    if (a === 0) return true; // 0.0.0.0/8
  }

  // Check IPv6
  if (host === "::1" || (host.includes(":") && (host.startsWith("fe80:") || host.startsWith("fd") || host.startsWith("fc")))) {
    return true;
  }

  return false;
}

export async function isPrivateOrReservedHostAsync(hostname: string, env: NodeJS.ProcessEnv = process.env, allowPrivate = false): Promise<boolean> {
  if (isPrivateOrReservedHost(hostname, env, allowPrivate)) return true;
  if (allowPrivate || env["OMP_WEB_ALLOW_PRIVATE_MACHINES"] === "1" || env["OMP_WEB_ALLOW_PRIVATE_MACHINES"] === "true") {
    return false;
  }
  try {
    const records = await lookup(hostname, { all: true });
    for (const record of records) {
      if (isPrivateOrReservedHost(record.address, env, allowPrivate)) {
        return true;
      }
    }
  } catch {
    // DNS resolution failure (e.g. offline or unresolvable test domain)
  }
  return false;
}

export function safeTokenCompare(provided: string | undefined, expected: string): boolean {
  if (provided === undefined || provided === "") return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function parseCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (cookieHeader === undefined || cookieHeader.trim() === "") return undefined;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  const value = match?.[1];
  return value !== undefined ? decodeURIComponent(value) : undefined;
}

export function renderLoginPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PI WEB — Authentication</title>
  <style>
    body { background: #070912; color: #e1e4ea; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #101527; border: 1px solid #1f2742; border-radius: 12px; padding: 2rem; width: 100%; max-width: 400px; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
    h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
    p { font-size: 0.875rem; color: #8b949e; margin: 0 0 1.5rem; }
    input[type="password"] { width: 100%; box-sizing: border-box; padding: 0.75rem; background: #070912; border: 1px solid #1f2742; border-radius: 6px; color: #fff; margin-bottom: 1rem; font-family: monospace; font-size: 0.9rem; }
    button { width: 100%; padding: 0.75rem; background: #238636; border: none; border-radius: 6px; color: #fff; font-weight: 600; cursor: pointer; }
    button:hover { background: #2ea043; }
    .hint { font-size: 0.75rem; color: #6e7681; margin-top: 1rem; text-align: center; }
    code { background: #161b22; padding: 0.15rem 0.3rem; border-radius: 3px; font-size: 0.8rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>PI WEB</h1>
    <p>Authentication required to access this instance.</p>
    <form id="loginForm">
      <input type="password" name="token" placeholder="Enter auth token" autofocus required />
      <button type="submit">Unlock</button>
    </form>
    <div class="hint">Token is stored in <code>~/.omp-web/auth-token</code> or <code>OMP_WEB_AUTH_TOKEN</code></div>
  </div>
  <script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = e.target.token.value.trim();
      const res = await fetch('/api/omp-web/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token })
      });
      if (res.ok) {
        location.reload();
      } else {
        alert('Invalid token');
      }
    });
  </script>
</body>
</html>`;
}

export interface SecurityMiddlewareOptions {
  allowedHosts?: string[] | true | (() => string[] | true | undefined | Promise<string[] | true | undefined>) | undefined;
  authToken?: string | (() => string | undefined | Promise<string | undefined>) | undefined;
  authRequired?: boolean | (() => boolean | undefined | Promise<boolean | undefined>) | undefined;
}

export function createSecurityMiddleware(options: SecurityMiddlewareOptions = {}): MiddlewareHandler {
  return async (c, next) => {
    const path = c.req.path;
    const hostHeader = c.req.header("host");
    const originHeader = c.req.header("origin");

    const allowedHosts = typeof options.allowedHosts === "function"
      ? await options.allowedHosts()
      : options.allowedHosts;

    // 1. Host header validation
    if (!validateHostHeader(hostHeader, allowedHosts)) {
      return c.json({ error: "Forbidden: Host not allowed" }, 403);
    }

    // 2. Origin header validation for WebSockets / CSRF
    if (!validateOriginHeader(originHeader, hostHeader, allowedHosts)) {
      return c.json({ error: "Forbidden: Cross-Origin request blocked" }, 403);
    }

    // 3. Auth Token validation (if required or authToken provided)
    const authRequired = typeof options.authRequired === "function"
      ? await options.authRequired()
      : options.authRequired;
    const authToken = typeof options.authToken === "function"
      ? await options.authToken()
      : options.authToken;

    if (authRequired && authToken) {
      const isExempt = path === "/health"
        || path === "/runtime"
        || path === "/api/omp-web/status"
        || path === "/api/omp-web/version"
        || path === "/api/omp-web/runtime"
        || path === "/api/omp-web/auth"
        || path.startsWith("/omp-web-plugins/");

      if (!isExempt) {
        const authHeader = c.req.header("authorization");
        const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;
        const cookieToken = parseCookie(c.req.header("cookie"), "omp_web_token");
        const queryToken = c.req.query("token");
        const token = bearerToken ?? cookieToken ?? queryToken;

        if (!safeTokenCompare(token, authToken)) {
          if (path.startsWith("/api/") || c.req.header("upgrade") === "websocket") {
            return c.json({ error: "Unauthorized: Invalid or missing auth token" }, 401);
          }
          return c.html(renderLoginPage(), 401);
        }

        if (queryToken && safeTokenCompare(queryToken, authToken) && !path.startsWith("/api/")) {
          c.header("Set-Cookie", `omp_web_token=${encodeURIComponent(queryToken)}; Path=/; HttpOnly; SameSite=Lax`);
        }
      }
    }

    await next();
    return;
  };
}
