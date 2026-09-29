#!/usr/bin/env bun
import { networkInterfaces } from "node:os";
import { defaultDevApiPort, effectiveOmpWebConfig, maxUploadBytes, ompWebDataDir } from "../config.js";
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

const basePort = config.port ?? 8504;
const isDevApi = process.env["OMP_WEB_DEV_API"] === "1";
const port = isDevApi
  ? (process.env["OMP_WEB_DEV_API_PORT"] ? Number(process.env["OMP_WEB_DEV_API_PORT"]) : defaultDevApiPort(basePort))
  : basePort;
const host = config.host ?? "127.0.0.1";

const app = await buildApp({
  bodyLimit: maxUploadBytes(process.env, config),
  authRequired,
  authToken,
  allowedHosts: (isDevApi || config.host === "0.0.0.0") ? (config.allowedHosts ?? true) : undefined,
});

Bun.serve({
  port,
  hostname: host,
  fetch: app.hono.fetch,
  websocket: app.websocket,
  maxRequestBodySize: maxUploadBytes(process.env, config),
});

const authSuffix = authRequired ? `?token=${authToken}` : "";
const serverLabel = isDevApi ? "PI WEB dev API" : "PI WEB server";
console.info(`${serverLabel} listening on http://${host}:${String(port)}${authSuffix}`);
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
