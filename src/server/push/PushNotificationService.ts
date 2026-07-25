import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import webPush from "web-push";
import { ompWebDataDir } from "../../config.js";
import { isRecord } from "../utils.js";

// ── VAPID keys ───────────────────────────────────────────────────────────────

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

const VAPID_SUBJECT = "mailto:push@omp-web.local";

function loadOrGenerateVapidKeys(): VapidKeys {
  const path = join(ompWebDataDir(), "vapid-keys.json");
  if (existsSync(path)) {
    try {
      const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
      if (isRecord(raw) && typeof raw["publicKey"] === "string" && typeof raw["privateKey"] === "string") {
        return { publicKey: raw["publicKey"], privateKey: raw["privateKey"] };
      }
    } catch {
      // fall through to generate
    }
  }
  const keys = webPush.generateVAPIDKeys();
  const pair: VapidKeys = { publicKey: keys.publicKey, privateKey: keys.privateKey };
  mkdirSync(ompWebDataDir(), { recursive: true });
  writeFileSync(path, `${JSON.stringify(pair, null, 2)}\n`, "utf8");
  return pair;
}

// ── Push subscription store ──────────────────────────────────────────────────

interface StoredSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
  addedAt: string;
}

function loadSubscriptions(): StoredSubscription[] {
  const path = join(ompWebDataDir(), "push-subscriptions.json");
  if (!existsSync(path)) return [];
  try {
    const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (Array.isArray(raw)) {
      return raw.filter((s): s is StoredSubscription =>
        isRecord(s)
        && typeof s["endpoint"] === "string"
        && isRecord(s["keys"])
        && typeof s["keys"]["p256dh"] === "string"
        && typeof s["keys"]["auth"] === "string");
    }
    return [];
  } catch {
    return [];
  }
}

function saveSubscriptions(subs: StoredSubscription[]): void {
  mkdirSync(ompWebDataDir(), { recursive: true });
  writeFileSync(join(ompWebDataDir(), "push-subscriptions.json"), `${JSON.stringify(subs, null, 2)}\n`, "utf8");
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sessionLastMessagePreview(messages: readonly unknown[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const entry = messages[i];
    if (!isRecord(entry) || entry["type"] !== "message") continue;
    const msg = entry["message"];
    if (!isRecord(msg) || msg["role"] !== "assistant") continue;
    const content = msg["content"];
    if (typeof content === "string") return content.length > 120 ? `${content.slice(0, 120)}\u2026` : content;
    if (Array.isArray(content)) {
      for (const part of content) {
        if (isRecord(part) && part["type"] === "text" && typeof part["text"] === "string") {
          const text = part["text"];
          return text.length > 120 ? `${text.slice(0, 120)}\u2026` : text;
        }
      }
    }
  }
  return "The session has finished.";
}

// ── Service ──────────────────────────────────────────────────────────────────

type WarnFn = (message: string) => void;

export class PushNotificationService {
  private readonly vapid = loadOrGenerateVapidKeys();
  private readonly warn: WarnFn;

  constructor(warn?: WarnFn) {
    this.warn = warn ?? (() => { /* no-op */ });
  }

  get publicKey(): string {
    return this.vapid.publicKey;
  }

  subscribe(endpoint: string, keys: { p256dh: string; auth: string }, userAgent?: string): void {
    const subs = loadSubscriptions();
    const existing = subs.findIndex((s) => s.endpoint === endpoint);
    const entry: StoredSubscription = { endpoint, keys, addedAt: new Date().toISOString() };
    if (userAgent !== undefined) entry.userAgent = userAgent;
    if (existing !== -1) subs[existing] = entry;
    else subs.push(entry);
    saveSubscriptions(subs);
  }

  unsubscribe(endpoint: string): void {
    saveSubscriptions(loadSubscriptions().filter((s) => s.endpoint !== endpoint));
  }

  clearAll(): void {
    saveSubscriptions([]);
  }
  async notify(title: string, body: string, url: string): Promise<void> {
    const subs = loadSubscriptions();
    if (subs.length === 0) {
      this.warn("notify: no subscriptions to notify");
      return;
    }

    const payload = JSON.stringify({ title, body, url });
    const results = await Promise.allSettled(
      subs.map((sub) =>
        webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
          payload,
          { vapidDetails: { subject: VAPID_SUBJECT, publicKey: this.vapid.publicKey, privateKey: this.vapid.privateKey } },
        ),
      ),
    );

    const live: StoredSubscription[] = [];
    for (let i = 0; i < subs.length; i++) {
      const sub = subs[i];
      const result = results[i];
      if (!sub || !result) continue;
      if (result.status === "fulfilled") {
        live.push(sub);
      } else {
        const error: unknown = result.reason;
        if (error instanceof webPush.WebPushError) {
          this.warn(`notify: push error for ${sub.endpoint.slice(0, 60)}: HTTP ${String(error.statusCode)} ${typeof error.body === "string" ? error.body.slice(0, 80) : ""}`);
          if (error.statusCode === 410) continue;
        } else {
          this.warn(`notify: unexpected error for ${sub.endpoint.slice(0, 60)}: ${String(error).slice(0, 120)}`);
        }
        live.push(sub);
      }
    }

    if (live.length !== subs.length) saveSubscriptions(live);
  }

  async notifySessionComplete(sessionId: string, sessionName: string | undefined, messages: readonly unknown[]): Promise<void> {
    const name = sessionName ?? sessionId;
    const preview = sessionLastMessagePreview(messages);
    await this.notify(`Session complete: ${name}`, preview, `/sessions/${encodeURIComponent(sessionId)}`);
  }
}
