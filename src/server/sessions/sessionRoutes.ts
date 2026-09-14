import type { Hono } from "hono";
import type { UpgradeWebSocket } from "hono/ws";
import type { SessionBulkMutationRequest, SessionBulkMutationRef, SessionCleanupRequest, AskDialogResult } from "../../shared/apiTypes.js";
import { normalizeRequestCwd } from "../workingDirectory.js";
import type { SessionEventHub } from "../realtime/sessionEventHub.js";
import { createHonoRealtimeSocket, type HonoRealtimeSocket } from "../realtime/honoRealtimeSocket.js";
import type { PiSessionRef, PiSessionService } from "./piSessionService.js";
import { normalizeSessionCleanupRequest } from "./sessionCleanup.js";
import { errorMessage, isRecord } from "../utils.js";

type SessionLookup = string | PiSessionRef;

interface PromptRequestBody {
  cwd?: unknown;
  text?: unknown;
  streamingBehavior?: unknown;
  attachments?: unknown;
}

interface AttachmentsRequestBody {
  cwd?: unknown;
  attachments?: unknown;
  folder?: unknown;
}

export function registerSessionRoutes(
  app: Hono,
  sessions: PiSessionService,
  eventHub: SessionEventHub,
  prefix = "",
  upgradeWebSocket?: UpgradeWebSocket,
): void {
  app.get(`${prefix}/sessions/active`, (c) => {
    return c.json(sessions.activeSessionsSummary());
  });

  app.get(`${prefix}/sessions`, async (c) => {
    const cwd = c.req.query("cwd");
    if (cwd === undefined || cwd === "") return c.json({ error: "cwd query parameter is required" }, 400);
    try {
      return c.json(await sessions.list(normalizeRequestCwd(cwd)));
    } catch (error) {
      return c.json({ error: errorMessage(error) }, 400);
    }
  });

  app.post(`${prefix}/sessions`, async (c) => {
    try {
      const body = requireRecord(await c.req.json().catch(() => undefined));
      return c.json(await sessions.start(normalizeRequestCwd(requireString(body, "cwd"))));
    } catch (error) {
      return c.json({ error: errorMessage(error) }, 400);
    }
  });

  app.post(`${prefix}/sessions/cleanup/preview`, async (c) => {
    try {
      const body = await c.req.json().catch(() => undefined);
      return c.json(await sessions.cleanupPreview(normalizeSessionCleanupRequest(optionalRecord(body))));
    } catch (error) {
      return c.json({ error: errorMessage(error) }, 400);
    }
  });

  app.post(`${prefix}/sessions/cleanup`, async (c) => {
    try {
      const body = await c.req.json().catch(() => undefined);
      return c.json(await sessions.cleanup(normalizeSessionCleanupRequest(optionalRecord(body))));
    } catch (error) {
      return c.json({ error: errorMessage(error) }, 400);
    }
  });

  app.post(`${prefix}/sessions/bulk/archive`, async (c) => {
    try {
      const body = await c.req.json<SessionBulkMutationRequest>().catch(() => undefined);
      return c.json(await sessions.archiveMany(bulkMutationRefsFromBody(body)));
    } catch (error) {
      return c.json({ error: errorMessage(error) }, mutationErrorStatus(error));
    }
  });

  app.post(`${prefix}/sessions/bulk/delete-archived`, async (c) => {
    try {
      const body = await c.req.json<SessionBulkMutationRequest>().catch(() => undefined);
      return c.json(await sessions.deleteArchivedMany(bulkMutationRefsFromBody(body)));
    } catch (error) {
      return c.json({ error: errorMessage(error) }, mutationErrorStatus(error));
    }
  });

  app.get(`${prefix}/sessions/:sessionId/messages`, async (c) => {
    try {
      const sessionId = c.req.param("sessionId") ?? "";
      const before = c.req.query("before");
      const limit = c.req.query("limit");
      const page = { ...optionalField("before", optionalNumber(before)), ...optionalField("limit", optionalNumber(limit)) };
      return c.json(await sessions.messages(sessionLookupFromQuery(sessionId, c.req.query("cwd")), page));
    } catch (error) {
      return c.json({ error: errorMessage(error) }, 404);
    }
  });

  app.get(`${prefix}/sessions/:sessionId/status`, async (c) => {
    try {
      const sessionId = c.req.param("sessionId");
      return c.json(await sessions.status(sessionLookupFromQuery(sessionId, c.req.query("cwd"))));
    } catch (error) {
      return c.json({ error: errorMessage(error) }, 404);
    }
  });

  app.get(`${prefix}/sessions/:sessionId/models`, async (c) => {
    try {
      const sessionId = c.req.param("sessionId");
      return c.json({ models: await sessions.availableModels(sessionLookupFromQuery(sessionId, c.req.query("cwd"))) });
    } catch (error) {
      return c.json({ error: errorMessage(error) }, 404);
    }
  });

  app.post(`${prefix}/sessions/:sessionId/model`, async (c) => {
    try {
      const sessionId = c.req.param("sessionId");
      const body = optionalRecord(await c.req.json().catch(() => undefined));
      const persist = typeof body["persist"] === "boolean" ? body["persist"] : undefined;
      const role = typeof body["role"] === "string" ? body["role"] : undefined;
      const modelOptions: { persist?: boolean; role?: string } = {};
      if (persist !== undefined) modelOptions.persist = persist;
      if (role !== undefined) modelOptions.role = role;
      return c.json(await sessions.setModel(
        sessionLookupFromBody(sessionId, body),
        requireString(body, "provider"),
        requireString(body, "modelId"),
        modelOptions,
      ));
    } catch (error) {
      return c.json({ error: errorMessage(error) }, mutationErrorStatus(error));
    }
  });

  app.post(`${prefix}/sessions/:sessionId/model/cycle`, async (c) => {
    try {
      const sessionId = c.req.param("sessionId");
      const body = optionalRecord(await c.req.json().catch(() => undefined));
      const direction = body["direction"];
      if (direction !== undefined && direction !== "forward" && direction !== "backward") throw new Error("direction must be forward or backward");
      return c.json(await sessions.cycleModel(sessionLookupFromBody(sessionId, body), direction ?? "forward"));
    } catch (error) {
      return c.json({ error: errorMessage(error) }, mutationErrorStatus(error));
    }
  });

  app.get(`${prefix}/sessions/:sessionId/thinking-levels`, async (c) => {
    try {
      const sessionId = c.req.param("sessionId");
      return c.json({ levels: await sessions.availableThinkingLevels(sessionLookupFromQuery(sessionId, c.req.query("cwd"))) });
    } catch (error) {
      return c.json({ error: errorMessage(error) }, 404);
    }
  });

  app.post(`${prefix}/sessions/:sessionId/thinking-level`, async (c) => {
    try {
      const sessionId = c.req.param("sessionId");
      const body = optionalRecord(await c.req.json().catch(() => undefined));
      return c.json(await sessions.setThinkingLevel(sessionLookupFromBody(sessionId, body), requireThinkingLevel(body["level"])));
    } catch (error) {
      return c.json({ error: errorMessage(error) }, mutationErrorStatus(error));
    }
  });

  app.post(`${prefix}/sessions/:sessionId/thinking-level/cycle`, async (c) => {
    try {
      const sessionId = c.req.param("sessionId");
      const body = optionalRecord(await c.req.json().catch(() => undefined));
      return c.json(await sessions.cycleThinkingLevel(sessionLookupFromBody(sessionId, body)));
    } catch (error) {
      return c.json({ error: errorMessage(error) }, mutationErrorStatus(error));
    }
  });

  app.get(`${prefix}/sessions/:sessionId/commands`, async (c) => {
    try {
      const sessionId = c.req.param("sessionId");
      return c.json(await sessions.commands(sessionLookupFromQuery(sessionId, c.req.query("cwd"))));
    } catch (error) {
      return c.json({ error: errorMessage(error) }, 404);
    }
  });

  app.post(`${prefix}/sessions/:sessionId/prompt`, async (c) => {
    try {
      const sessionId = c.req.param("sessionId");
      const body = optionalRecord(await c.req.json<PromptRequestBody>().catch(() => undefined));
      await sessions.prompt(sessionLookupFromBody(sessionId, body), body["text"], body["streamingBehavior"], body["attachments"]);
      return c.json({ accepted: true });
    } catch (error) {
      return c.json({ error: errorMessage(error) }, mutationErrorStatus(error));
    }
  });

  app.post(`${prefix}/sessions/:sessionId/attachments`, async (c) => {
    try {
      const sessionId = c.req.param("sessionId");
      const body = optionalRecord(await c.req.json<AttachmentsRequestBody>().catch(() => undefined));
      const folder = body["folder"];
      if (folder !== undefined && typeof folder !== "string") throw new Error("folder field must be a string");
      const attachments = await sessions.saveAttachments(sessionLookupFromBody(sessionId, body), body["attachments"], folder);
      return c.json({ attachments });
    } catch (error) {
      return c.json({ error: errorMessage(error) }, mutationErrorStatus(error));
    }
  });

  app.post(`${prefix}/sessions/:sessionId/shell`, async (c) => {
    try {
      const sessionId = c.req.param("sessionId");
      const body = optionalRecord(await c.req.json().catch(() => undefined));
      await sessions.shell(sessionLookupFromBody(sessionId, body), requireString(body, "text"));
      return c.json({ accepted: true });
    } catch (error) {
      return c.json({ error: errorMessage(error) }, mutationErrorStatus(error));
    }
  });

  app.post(`${prefix}/sessions/:sessionId/commands/run`, async (c) => {
    try {
      const sessionId = c.req.param("sessionId");
      const body = optionalRecord(await c.req.json().catch(() => undefined));
      return c.json(await sessions.runCommand(sessionLookupFromBody(sessionId, body), requireString(body, "text")));
    } catch (error) {
      return c.json({ error: errorMessage(error) }, mutationErrorStatus(error));
    }
  });

  app.post(`${prefix}/sessions/:sessionId/commands/respond`, async (c) => {
    try {
      const sessionId = c.req.param("sessionId");
      const body = optionalRecord(await c.req.json().catch(() => undefined));
      return c.json(await sessions.respondToCommand(sessionLookupFromBody(sessionId, body), requireString(body, "requestId"), requireString(body, "value")));
    } catch (error) {
      return c.json({ error: errorMessage(error) }, mutationErrorStatus(error));
    }
  });

  app.post(`${prefix}/sessions/:sessionId/ask/respond`, async (c) => {
    try {
      const sessionId = c.req.param("sessionId");
      const body = optionalRecord(await c.req.json().catch(() => undefined));
      const requestId = requireString(body, "requestId");
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      const result = body?.["result"] as AskDialogResult | undefined;
      return c.json(await sessions.respondToAsk(sessionLookupFromBody(sessionId, body), requestId, result));
    } catch (error) {
      return c.json({ error: errorMessage(error) }, mutationErrorStatus(error));
    }
  });

  app.post(`${prefix}/sessions/:sessionId/abort`, async (c) => {
    try {
      const sessionId = c.req.param("sessionId");
      const body = optionalRecord(await c.req.json().catch(() => undefined));
      await sessions.abort(sessionLookupFromBody(sessionId, body));
      return c.json({ aborted: true });
    } catch (error) {
      return c.json({ error: errorMessage(error) }, mutationErrorStatus(error));
    }
  });

  app.post(`${prefix}/sessions/:sessionId/stop`, async (c) => {
    try {
      const sessionId = c.req.param("sessionId");
      const body = optionalRecord(await c.req.json().catch(() => undefined));
      sessions.stop(sessionLookupFromBody(sessionId, body));
      return c.json({ stopped: true });
    } catch (error) {
      return c.json({ error: errorMessage(error) }, mutationErrorStatus(error));
    }
  });

  app.post(`${prefix}/sessions/:sessionId/archive`, async (c) => {
    try {
      const sessionId = c.req.param("sessionId");
      const body = optionalRecord(await c.req.json().catch(() => undefined));
      await sessions.archive(sessionLookupFromBody(sessionId, body));
      return c.json({ archived: true });
    } catch (error) {
      return c.json({ error: errorMessage(error) }, mutationErrorStatus(error));
    }
  });

  app.post(`${prefix}/sessions/:sessionId/archive-tree`, async (c) => {
    try {
      const sessionId = c.req.param("sessionId");
      const body = optionalRecord(await c.req.json().catch(() => undefined));
      return c.json(await sessions.archiveTree(sessionLookupFromBody(sessionId, body)));
    } catch (error) {
      return c.json({ error: errorMessage(error) }, mutationErrorStatus(error));
    }
  });

  app.post(`${prefix}/sessions/:sessionId/restore`, async (c) => {
    try {
      const sessionId = c.req.param("sessionId");
      const body = optionalRecord(await c.req.json().catch(() => undefined));
      await sessions.restore(sessionLookupFromBody(sessionId, body));
      return c.json({ restored: true });
    } catch (error) {
      return c.json({ error: errorMessage(error) }, mutationErrorStatus(error));
    }
  });

  app.delete(`${prefix}/sessions/:sessionId`, async (c) => {
    try {
      const sessionId = c.req.param("sessionId");
      await sessions.deleteArchived(sessionLookupFromQuery(sessionId, c.req.query("cwd")));
      return c.json({ deleted: true });
    } catch (error) {
      return c.json({ error: errorMessage(error) }, mutationErrorStatus(error));
    }
  });

  app.post(`${prefix}/sessions/:sessionId/reload`, async (c) => {
    try {
      const sessionId = c.req.param("sessionId");
      const body = optionalRecord(await c.req.json().catch(() => undefined));
      await sessions.reload(sessionLookupFromBody(sessionId, body));
      return c.json({ reloaded: true });
    } catch (error) {
      return c.json({ error: errorMessage(error) }, mutationErrorStatus(error));
    }
  });

  app.post(`${prefix}/sessions/:sessionId/detach-parent`, async (c) => {
    try {
      const sessionId = c.req.param("sessionId");
      const body = optionalRecord(await c.req.json().catch(() => undefined));
      await sessions.detachParent(sessionLookupFromBody(sessionId, body));
      return c.json({ detached: true });
    } catch (error) {
      return c.json({ error: errorMessage(error) }, mutationErrorStatus(error));
    }
  });

  if (upgradeWebSocket !== undefined) {
    app.get(`${prefix}/sessions/:sessionId/events`, upgradeWebSocket((c) => {
      const sessionId = c.req.param("sessionId") ?? "";
      let adapter: HonoRealtimeSocket | undefined;
      return {
        onOpen(_evt, ws) {
          adapter = createHonoRealtimeSocket(ws);
          eventHub.add(sessionId, adapter);
        },
        onClose() {
          adapter?._triggerClose();
        },
      };
    }));

    app.get(`${prefix}/sessions/events`, upgradeWebSocket(() => {
      let adapter: HonoRealtimeSocket | undefined;
      return {
        onOpen(_evt, ws) {
          adapter = createHonoRealtimeSocket(ws);
          eventHub.addGlobal(adapter);
        },
        onClose() {
          adapter?._triggerClose();
        },
      };
    }));

    app.get(`${prefix}/events`, upgradeWebSocket(() => {
      let adapter: HonoRealtimeSocket | undefined;
      return {
        onOpen(_evt, ws) {
          adapter = createHonoRealtimeSocket(ws);
          eventHub.addGlobal(adapter);
        },
        onClose() {
          adapter?._triggerClose();
        },
      };
    }));
  }
}

function bulkMutationRefsFromBody(body: SessionBulkMutationRequest | undefined): SessionBulkMutationRef[] {
  const record = requireRecord(body);
  const sessions = record["sessions"];
  if (!Array.isArray(sessions)) throw new Error("sessions field must be an array");
  return sessions.map(parseBulkMutationRef);
}

function parseBulkMutationRef(value: unknown): SessionBulkMutationRef {
  const record = requireRecord(value);
  const id = requireString(record, "id").trim();
  if (id === "") throw new Error("id field must not be empty");
  const cwd = record["cwd"];
  if (cwd === undefined || cwd === "") return { id };
  if (typeof cwd !== "string") throw new Error("cwd field must be a string");
  return { id, cwd: normalizeRequestCwd(cwd) };
}

function sessionLookupFromQuery(id: string, cwd: string | undefined): SessionLookup {
  return cwd === undefined || cwd === "" ? id : { id, cwd: normalizeRequestCwd(cwd) };
}

function sessionLookupFromBody(id: string, body: Record<string, unknown>): SessionLookup {
  const cwd = body["cwd"];
  if (cwd === undefined || cwd === "") return id;
  if (typeof cwd !== "string") throw new Error("cwd field must be a string");
  return { id, cwd: normalizeRequestCwd(cwd) };
}

function optionalRecord(value: unknown): Record<string, unknown> {
  if (value === undefined || value === null) return {};
  return requireRecord(value);
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error("request body must be an object");
  return value;
}

function requireString(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== "string") throw new Error(`${field} field must be a string`);
  return value;
}

function requireThinkingLevel(value: unknown): string {
  if (typeof value !== "string" || value === "") throw new Error("level field is invalid");
  return value;
}

function optionalField<T>(key: string, value: T | undefined): Record<string, T> | object {
  return value === undefined ? {} : { [key]: value };
}

function optionalNumber(value: string | undefined): number | undefined {
  if (value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function mutationErrorStatus(error: unknown): 400 | 404 {
  const message = errorMessage(error);
  return message === "Session not found" || message === "Archived session not found" ? 404 : 400;
}
