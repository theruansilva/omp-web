import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { lookup } from "node:dns/promises";
import { join } from "node:path";
import type { MiddlewareHandler } from "hono";
import { defaultOmpWebDataDir } from "../config.js";

export async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, { algorithm: "argon2id" });
}

export async function verifyUserPassword(password: string, expectedHashOrPlain: string): Promise<boolean> {
  if (!password || !expectedHashOrPlain) return false;
  try {
    if (expectedHashOrPlain.startsWith("$")) {
      return await Bun.password.verify(password, expectedHashOrPlain);
    }
  } catch {
    // fallback if not a valid hash format
  }
  return safeTokenCompare(password, expectedHashOrPlain);
}

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
  if (raw.startsWith("[")) {
    const bracketEnd = raw.indexOf("]");
    if (bracketEnd !== -1) return raw.slice(1, bracketEnd);
  }
  const firstColon = raw.indexOf(":");
  const lastColon = raw.lastIndexOf(":");
  if (firstColon !== -1) {
    if (firstColon !== lastColon || firstColon === 0) {
      return raw;
    }
    return raw.slice(0, firstColon);
  }
  return raw;
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

  const baseAllowed = ["127.0.0.1", "localhost", "::1", "0.0.0.0"];
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
  const baseAllowed = ["127.0.0.1", "localhost", "::1", "0.0.0.0"];
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

export interface RenderLoginOptions {
  setupRequired?: boolean;
}

export function renderLoginPage(options: RenderLoginOptions = {}): string {
  const isSetup = Boolean(options.setupRequired);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PI WEB — Authentication</title>
  <style>
    * { box-sizing: border-box; }
    body {
      background: #070912;
      color: #e1e4ea;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1.5rem;
    }
    .card {
      background: #101527;
      border: 1px solid #1f2742;
      border-radius: 14px;
      padding: 2.25rem;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 12px 32px rgba(0,0,0,0.6);
    }
    .badge {
      display: inline-block;
      padding: 0.2rem 0.55rem;
      background: rgba(56, 139, 253, 0.15);
      border: 1px solid rgba(56, 139, 253, 0.3);
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 600;
      color: #58a6ff;
      margin-bottom: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    h1 { font-size: 1.35rem; margin: 0 0 0.4rem; color: #fff; }
    p { font-size: 0.875rem; color: #8b949e; margin: 0 0 1.5rem; line-height: 1.45; }
    .form-group { margin-bottom: 1rem; }
    label { display: block; font-size: 0.8rem; font-weight: 500; color: #c9d1d9; margin-bottom: 0.35rem; }
    input[type="text"], input[type="password"] {
      width: 100%;
      padding: 0.75rem 0.85rem;
      background: #070912;
      border: 1px solid #1f2742;
      border-radius: 8px;
      color: #fff;
      font-size: 0.92rem;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    input[type="text"]:focus, input[type="password"]:focus {
      outline: none;
      border-color: #388bfd;
      box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.2);
    }
    input::placeholder { color: #484f58; }
    .btn {
      width: 100%;
      padding: 0.8rem;
      background: #238636;
      border: none;
      border-radius: 8px;
      color: #fff;
      font-size: 0.92rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
      margin-top: 0.5rem;
    }
    .btn:hover { background: #2ea043; }
    .btn:active { background: #1f7a31; }
    .error-box {
      display: none;
      background: rgba(248, 81, 73, 0.12);
      border: 1px solid rgba(248, 81, 73, 0.35);
      border-radius: 8px;
      color: #f85149;
      padding: 0.65rem 0.85rem;
      font-size: 0.82rem;
      margin-bottom: 1.25rem;
      line-height: 1.4;
    }
    .hint {
      font-size: 0.75rem;
      color: #6e7681;
      margin-top: 1.25rem;
      text-align: center;
      line-height: 1.4;
    }
    code {
      background: #161b22;
      color: #e1e4ea;
      padding: 0.15rem 0.35rem;
      border-radius: 4px;
      font-size: 0.78rem;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    }
    .toggle-link {
      display: block;
      margin-top: 1rem;
      text-align: center;
      font-size: 0.8rem;
      color: #58a6ff;
      text-decoration: none;
      cursor: pointer;
    }
    .toggle-link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${isSetup ? "Primeiro Acesso" : "Segurança"}</div>
    <h1>PI WEB</h1>
    <p>${isSetup
      ? "Crie suas credenciais de administrador para proteger este painel."
      : "Autenticação necessária para acessar esta instância."
    }</p>

    <div id="errorBox" class="error-box"></div>

    ${isSetup
      ? `<form id="setupForm">
      <div class="form-group">
        <label for="username">Nome de Usuário</label>
        <input type="text" id="username" name="username" placeholder="ex: admin" autocomplete="username" autofocus required />
      </div>
      <div class="form-group">
        <label for="password">Senha</label>
        <input type="password" id="password" name="password" placeholder="Mínimo 6 caracteres" autocomplete="new-password" required />
      </div>
      <div class="form-group">
        <label for="confirmPassword">Confirme a Senha</label>
        <input type="password" id="confirmPassword" name="confirmPassword" placeholder="Repita a senha" autocomplete="new-password" required />
      </div>

      <button type="submit" class="btn">Criar Administrador e Entrar</button>
    </form>
    `
      : `<form id="loginForm">
      <div class="form-group">
        <label for="username">Nome de Usuário</label>
        <input type="text" id="username" name="username" placeholder="Seu usuário" autocomplete="username" autofocus required />
      </div>
      <div class="form-group">
        <label for="password">Senha</label>
        <input type="password" id="password" name="password" placeholder="Sua senha" autocomplete="current-password" required />
      </div>
      <button type="submit" class="btn">Entrar</button>
      <a href="#" id="showTokenBtn" class="toggle-link">Ou entrar com Token de Acesso</a>
    </form>

    <form id="tokenForm" style="display: none;">
      <div class="form-group">
        <label for="tokenInput">Token de Acesso</label>
        <input type="password" id="tokenInput" name="token" placeholder="Insira o auth token" required />
      </div>
      <button type="submit" class="btn">Entrar com Token</button>
      <a href="#" id="showLoginBtn" class="toggle-link">Voltar para Usuário e Senha</a>
    </form>
    <div class="hint">Token salvo em <code>~/.omp-web/auth-token</code> ou <code>OMP_WEB_AUTH_TOKEN</code>.</div>`
    }
  </div>

  <script>
    const errorBox = document.getElementById('errorBox');
    function showError(msg) {
      errorBox.textContent = msg;
      errorBox.style.display = 'block';
    }

    ${isSetup
      ? `
    const urlParams = new URLSearchParams(window.location.search);
    const queryToken = urlParams.get('token');
    if (queryToken) {
      const tokenInput = document.getElementById('token');
      if (tokenInput) tokenInput.value = queryToken;
    }

    document.getElementById('setupForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.style.display = 'none';

      const username = e.target.username.value.trim();
      const password = e.target.password.value;
      const confirmPassword = e.target.confirmPassword.value;
      const token = "";

      if (password !== confirmPassword) {
        showError('As senhas digitadas não coincidem.');
        return;
      }
      if (password.length < 6) {
        showError('A senha deve ter pelo menos 6 caracteres.');
        return;
      }

      try {
        const res = await fetch('/api/omp-web/setup', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ username, password, token })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          window.location.href = '/';
        } else {
          showError(data.error || 'Falha ao criar credenciais.');
        }
      } catch (err) {
        showError('Erro de conexão ao salvar credenciais.');
      }
    });`
      : `
    const loginForm = document.getElementById('loginForm');
    const tokenForm = document.getElementById('tokenForm');
    const showTokenBtn = document.getElementById('showTokenBtn');
    const showLoginBtn = document.getElementById('showLoginBtn');

    showTokenBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      loginForm.style.display = 'none';
      tokenForm.style.display = 'block';
      errorBox.style.display = 'none';
    });

    showLoginBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      tokenForm.style.display = 'none';
      loginForm.style.display = 'block';
      errorBox.style.display = 'none';
    });

    loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.style.display = 'none';

      const username = e.target.username.value.trim();
      const password = e.target.password.value;

      try {
        const res = await fetch('/api/omp-web/auth', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          window.location.reload();
        } else {
          showError(data.error || 'Usuário ou senha inválidos.');
        }
      } catch (err) {
        showError('Erro de conexão ao realizar login.');
      }
    });

    tokenForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.style.display = 'none';

      const token = e.target.token.value.trim();
      try {
        const res = await fetch('/api/omp-web/auth', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          window.location.reload();
        } else {
          showError(data.error || 'Token de acesso inválido.');
        }
      } catch (err) {
        showError('Erro de conexão ao autenticar token.');
      }
    });`
    }
  </script>
</body>
</html>`;
}

export interface SecurityMiddlewareOptions {
  allowedHosts?: string[] | true | (() => string[] | true | undefined | Promise<string[] | true | undefined>) | undefined;
  authToken?: string | (() => string | undefined | Promise<string | undefined>) | undefined;
  authRequired?: boolean | (() => boolean | undefined | Promise<boolean | undefined>) | undefined;
  authUsername?: string | (() => string | undefined | Promise<string | undefined>) | undefined;
  authPasswordHash?: string | (() => string | undefined | Promise<string | undefined>) | undefined;
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
        || path === "/api/omp-web/setup"
        || path.startsWith("/omp-web-plugins/")
        || path.startsWith("/assets/")
        || /\.(js|mjs|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|json)$/i.test(path);
      if (!isExempt) {
        const hasUserConfig = options.authUsername !== undefined || options.authPasswordHash !== undefined;
        const authUsername = typeof options.authUsername === "function"
          ? await options.authUsername()
          : options.authUsername;
        const authPasswordHash = typeof options.authPasswordHash === "function"
          ? await options.authPasswordHash()
          : options.authPasswordHash;
        const setupRequired = hasUserConfig && !authPasswordHash;

        const authHeader = c.req.header("authorization");
        const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;
        const cookieToken = parseCookie(c.req.header("cookie"), "omp_web_token");
        const queryToken = c.req.query("token");
        const token = bearerToken ?? cookieToken ?? queryToken;

        const isAuthedWithToken = safeTokenCompare(token, authToken);
        const isBrowserNavigation = !path.startsWith("/api/") && c.req.header("upgrade") !== "websocket";

        if (setupRequired && isBrowserNavigation && !cookieToken) {
          return c.html(renderLoginPage({ setupRequired: true }), 401);
        }

        if (!isAuthedWithToken) {
          if (path.startsWith("/api/") || c.req.header("upgrade") === "websocket") {
            return c.json({ error: "Unauthorized: Invalid or missing auth token" }, 401);
          }
          return c.html(renderLoginPage({ setupRequired }), 401);
        }

        if (queryToken && isAuthedWithToken && !path.startsWith("/api/")) {
          c.header("Set-Cookie", `omp_web_token=${encodeURIComponent(queryToken)}; Path=/; HttpOnly; SameSite=Lax`);
        }
      }
    }

    await next();
    return;
  };
}
