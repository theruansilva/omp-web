import type { FastifyInstance } from "fastify";
import { PushNotificationService } from "./PushNotificationService.js";
import { errorMessage, isRecord } from "../utils.js";

export function registerPushRoutes(app: FastifyInstance, push: PushNotificationService = new PushNotificationService()): void {
  // Expose VAPID public key so clients can subscribe
  app.get("/api/push/vapid-public-key", () => ({ publicKey: push.publicKey }));

  // Subscribe a device to push notifications
  app.post<{ Body: unknown }>("/api/push/subscribe", async (request, reply) => {
    try {
      const body = requireSubscriptionBody(request.body);
      push.subscribe(body.endpoint, body.keys, request.headers["user-agent"]);
      await reply.code(201).send({ ok: true });
      return;
    } catch (error) {
      return reply.code(400).send({ error: errorMessage(error) });
    }
  });

  // Unsubscribe a device
  app.delete<{ Querystring: { endpoint: string } }>("/api/push/subscribe", async (request, reply) => {
    try {
      const endpoint = request.query.endpoint;
      if (typeof endpoint !== "string" || endpoint === "") {
        await reply.code(400).send({ error: "endpoint query parameter is required" });
        return;
      }
      push.unsubscribe(endpoint);
      return { ok: true };
    } catch (error) {
      return reply.code(400).send({ error: errorMessage(error) });
    }
  });

  // Send a test notification (for debugging)
  app.post("/api/push/test", async (request, reply) => {
    try {
      await push.notify(
        "Test notification",
        "This is a test push notification from omp-web.",
        "/",
      );
      return { ok: true };
    } catch (error) {
      return reply.code(500).send({ error: errorMessage(error) });
    }
  });
}

function requireSubscriptionBody(value: unknown): { endpoint: string; keys: { p256dh: string; auth: string } } {
  if (!isRecord(value)) throw new Error("Request body must be an object");
  if (typeof value["endpoint"] !== "string" || value["endpoint"] === "") throw new Error("endpoint is required");
  const keys = value["keys"];
  if (!isRecord(keys) || typeof keys["p256dh"] !== "string" || typeof keys["auth"] !== "string") {
    throw new Error("keys with p256dh and auth are required");
  }
  return { endpoint: value["endpoint"], keys: { p256dh: keys["p256dh"], auth: keys["auth"] } };
}
