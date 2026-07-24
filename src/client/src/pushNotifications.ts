// Web Push subscription management for the browser client.

export interface PushSubscriptionInfo {
 enabled: boolean;
 /** Human-readable error when push is unavailable / permission denied. */
 error?: string;
}

/**
 * Fetch the VAPID public key from the server.
 * Returns null on non-200 (e.g. push routes not registered on this machine).
 */
async function fetchVapidPublicKey(): Promise<string | null> {
 try {
  const res = await fetch("/api/push/vapid-public-key");
  if (!res.ok) return null;
  const data: unknown = await res.json();
  if (typeof data === "object" && data !== null && "publicKey" in data && typeof data.publicKey === "string") {
   return data.publicKey;
  }
  return null;
 } catch {
  return null;
 }
}

/** Register the Service Worker for push notifications (idempotent). */
export async function registerServiceWorker(): Promise<boolean> {
 if (!("serviceWorker" in navigator)) return false;
 try {
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  // Wait for activation so pushManager works consistently
  if (reg.active?.state !== "activated") {
   const sw = reg.installing ?? reg.waiting;
   if (sw) {
    await new Promise<void>((resolve) => {
     sw.addEventListener("statechange", () => { if (sw.state === "activated") resolve(); }, { once: true });
    });
   }
  }
  return true;
 } catch {
  return false;
 }
}

/** Ask the user for notification permission and subscribe for push. */
export async function subscribeToPush(): Promise<PushSubscriptionInfo> {
 const isSecure = "isSecureContext" in window ? window.isSecureContext : true;
 if (!("PushManager" in window) || !("Notification" in window)) {
  const reason = !isSecure
   ? "Push notifications require HTTPS (or localhost). This page is not served over a secure connection."
   : "Push notifications are not supported in this browser.";
  return { enabled: false, error: reason };
 }

 // iOS / PWAs on some devices don't show the permission prompt
 if (Notification.permission === "denied") {
  return { enabled: false, error: "Notifications are blocked. Enable them in your browser settings." };
 }

 const swOk = await registerServiceWorker();
 if (!swOk) {
  return { enabled: false, error: "Could not register the service worker." };
 }

 const permission = await Notification.requestPermission();
 if (permission !== "granted") {
  return { enabled: false, error: "Notification permission was denied." };
 }

 const publicKey = await fetchVapidPublicKey();
 if (publicKey === null) {
  return { enabled: false, error: "Web Push is not configured on the server." };
 }

 try {
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();

  if (existing) {
   // Re-sync with server (in case server state was lost)
   await fetch("/api/push/subscribe", {
    method: "POST",
    body: JSON.stringify({ endpoint: existing.endpoint, keys: existing.toJSON().keys }),
   });
   return { enabled: true };
  }

  const sub = await reg.pushManager.subscribe({
   userVisibleOnly: true,
   applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  // Send subscription to server
  const res = await fetch("/api/push/subscribe", {
   method: "POST",
   body: JSON.stringify(sub.toJSON()),
  });

  if (!res.ok) {
   return { enabled: false, error: "Failed to save push subscription on server." };
  }

  return { enabled: true };
 } catch (error: unknown) {
  return { enabled: false, error: error instanceof Error ? error.message : "Unknown error subscribing to push." };
 }
}

/** Unsubscribe from push notifications. */
export async function unsubscribeFromPush(): Promise<PushSubscriptionInfo> {
 try {
  if (!("PushManager" in window)) return { enabled: false };

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
   const endpoint = sub.endpoint;
   await sub.unsubscribe();
   // Notify server
   await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(endpoint)}`, { method: "DELETE" }).catch(() => {
    // Ignore cleanup errors
   });
  }
  return { enabled: false };
 } catch {
  return { enabled: false };
 }
}

/** Check whether the current browser is subscribed to push. */
export async function isPushSubscribed(): Promise<boolean> {
 if (typeof window === "undefined" || !("PushManager" in window) || !("serviceWorker" in navigator)) return false;
 try {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return sub !== null;
 } catch {
  return false;
 }
}

/** Check if the push API is supported at all in this browser. */
export function isPushSupported(): boolean {
 if (typeof window === "undefined") return false;
 if (!window.isSecureContext) return false;
 return "PushManager" in window
  && "Notification" in window
  && "serviceWorker" in navigator;
}

// ── VAPID key conversion ─────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
 const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
 const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
 const rawData = atob(base64);
 const outputArray = new Uint8Array(rawData.length);
 for (let i = 0; i < rawData.length; ++i) {
  outputArray[i] = rawData.charCodeAt(i);
 }
 return outputArray;
}
