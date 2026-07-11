import { join } from "node:path";
import { ompWebDataDir } from "../config.js";

export function sessiondSocketPath(): string {
  return process.env["OMP_WEB_SESSIOND_SOCKET"] ?? join(ompWebDataDir(), "sessiond.sock");
}

export function sessiondHttpUrl(): string | undefined {
  return process.env["OMP_WEB_SESSIOND_URL"];
}
