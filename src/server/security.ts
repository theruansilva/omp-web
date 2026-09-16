import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
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
  if (hostHeader === undefined || hostHeader.trim() === "") return true;
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

export function isPrivateOrReservedHost(hostname: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (env["OMP_WEB_ALLOW_PRIVATE_MACHINES"] === "1" || env["OMP_WEB_ALLOW_PRIVATE_MACHINES"] === "true") {
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

export interface SecurityMiddlewareOptions {
  allowedHosts?: string[] | true | (() => string[] | true | undefined | Promise<string[] | true | undefined>) | undefined;
  authToken?: string | undefined;
  authRequired?: boolean | undefined;
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
    if (options.authRequired && options.authToken) {
      const isExempt = path === "/health" || path === "/runtime" || path === "/api/omp-web/status" || path.startsWith("/omp-web-plugins/");
      if (!isExempt) {
        const authHeader = c.req.header("authorization");
        const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;
        const queryToken = c.req.query("token");
        const token = bearerToken ?? queryToken;

        if (token !== options.authToken) {
          return c.json({ error: "Unauthorized: Invalid or missing auth token" }, 401);
        }
      }
    }

    await next();
    return;
  };
}
