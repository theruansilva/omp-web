import type { AssistantMessage, Model } from "@oh-my-pi/pi-ai";
import { AssistantMessageEventStream } from "@oh-my-pi/pi-ai/utils/event-stream";
import type { StreamFn } from "@oh-my-pi/pi-agent-core";
import { describe, expect, it } from "vitest";
import { cleanSessionName, fallbackSessionName, generateShortSessionName } from "./sessionNameGenerator.js";

function fakeModel(): Model {
 const model: Model = {
  id: "fake-model",
  name: "Fake Model",
  api: "anthropic-messages",
  provider: "anthropic",
  baseUrl: "https://example.test",
  reasoning: false,
  input: ["text"],
  compat: undefined,
  identity: { class: "unknown" },
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 1000,
  maxTokens: 100,
 };
 return model;
}

function fakeAssistantMessage(overrides: Partial<AssistantMessage> = {}): AssistantMessage {
 return {
  role: "assistant",
  content: [],
  api: "anthropic-messages",
  provider: "anthropic",
  model: "fake-model",
  usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
  stopReason: "stop",
  timestamp: Date.now(),
  ...overrides,
 };
}

function streamThatCompletes(text: string): StreamFn {
 return () => {
  const stream = new AssistantMessageEventStream();
  const message = fakeAssistantMessage({ content: [{ type: "text", text }] });
  stream.push({ type: "done", reason: "stop", message });
  stream.end(message);
  return stream;
 };
}

function streamThatErrors(): StreamFn {
 return () => {
  const stream = new AssistantMessageEventStream();
  const message = fakeAssistantMessage({ stopReason: "error", errorMessage: "boom" });
  stream.push({ type: "error", reason: "error", error: message });
  stream.end(message);
  return stream;
 };
}

describe("sessionNameGenerator", () => {
 it("generates a session name by calling the injected streamFn", async () => {
  const calls: unknown[] = [];
  const stream = streamThatCompletes('Title: "Fix the bug"');
  const streamFn: StreamFn = (model, context, options) => {
   calls.push({ model, context, options });
   return stream(model, context, options);
  };

  const name = await generateShortSessionName(streamFn, fakeModel(), "Please fix the login bug");

  expect(name).toBe("Fix the bug");
  expect(calls).toHaveLength(1);
 });

 it("returns undefined when the stream reports an error", async () => {
  const streamFn = streamThatErrors();

  const name = await generateShortSessionName(streamFn, fakeModel(), "Please fix the login bug");

  expect(name).toBeUndefined();
 });

 it("cleans model-generated titles", () => {
  expect(cleanSessionName('Title: "Fix Session Naming."\nextra')).toBe("Fix Session Naming");
 });


 it("builds a concise fallback from the first request", () => {
  expect(fallbackSessionName("Seems like auto name for sessions is not working, I still get the first message as a name."))
   .toBe("Seems like auto name for sessions");
 });

 it("ignores skill blocks in fallback names", () => {
  expect(fallbackSessionName('<skill name="x" location="/x">\nDo x\n</skill>\n\nCheck the UI now'))
   .toBe("Check the UI now");
 });

 it("skips fallback names when the first request is missing", () => {
  expect(fallbackSessionName(undefined)).toBeUndefined();
 });
});
