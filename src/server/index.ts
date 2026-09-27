#!/usr/bin/env bun
import { networkInterfaces } from "node:os";
import { effectiveOmpWebConfig, maxUploadBytes, ompWebDataDir } from "../config.js";
import { buildApp } from "./app.js";
import { getOrGenerateAuthToken } from "./security.js";

function getLanIp(): string | undefined {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    if (/^(tailscale|docker|br-|veth)/i.test(name)) continue;
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return undefined;
}

function getTailscaleIp(): string | undefined {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    if (name.toLowerCase().includes("tailscale") || name.toLowerCase().startsWith("utun")) {
      for (const net of nets[name] || []) {
        if (net.family === "IPv4" && !net.internal) {
          return net.address;
        }
      }
    }
  }
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        const [a, b] = net.address.split(".").map(Number);
        if (a === 100 && b !== undefined && b >= 64 && b <= 127) {
          return net.address;
        }
      }
    }
  }
  return undefined;
}

const { config } = effectiveOmpWebConfig();
const authToken = getOrGenerateAuthToken(ompWebDataDir(process.env));
const authRequired = config.authRequired !== false && process.env["OMP_WEB_AUTH_REQUIRED"] !== "0" && process.env["OMP_WEB_AUTH_REQUIRED"] !== "false";

const app = await buildApp({
  bodyLimit: maxUploadBytes(process.env, config),
  authRequired,
  authToken,
});

const port = config.port ?? 8504;
const host = config.host ?? "127.0.0.1";

Bun.serve({
  port,
  hostname: host,
  fetch: app.hono.fetch,
  websocket: app.websocket,
  maxRequestBodySize: maxUploadBytes(process.env, config),
});

const authSuffix = authRequired ? `?token=${authToken}` : "";
console.info(`PI WEB server listening on http://${host}:${String(port)}${authSuffix}`);
if (host === "0.0.0.0") {
  const lan = getLanIp();
  if (lan) {
    console.info(`Network access: http://${lan}:${String(port)}${authSuffix}`);
  }
  const ts = getTailscaleIp();
  if (ts) {
    console.info(`Tailscale access: http://${ts}:${String(port)}${authSuffix}`);
  }
}
