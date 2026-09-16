import { describe, expect, it } from "bun:test";
import { toClientEvent } from "./sessionEventMapper.js";

describe("toClientEvent", () => {
  it("maps text_delta and extracts fullText from partial", () => {
    const event = {
      type: "message_update",
      assistantMessageEvent: {
        type: "text_delta",
        delta: " world",
        contentIndex: 0,
        partial: {
          role: "assistant",
          content: [{ type: "text", text: "Hello world" }],
        },
      },
    };

    expect(toClientEvent(event)).toEqual({
      type: "assistant.delta",
      text: " world",
      fullText: "Hello world",
    });
  });

  it("maps thinking_delta and extracts fullText from partial", () => {
    const event = {
      type: "message_update",
      assistantMessageEvent: {
        type: "thinking_delta",
        delta: " step 2",
        contentIndex: 0,
        partial: {
          role: "assistant",
          content: [{ type: "thinking", thinking: "step 1 step 2" }],
        },
      },
    };

    expect(toClientEvent(event)).toEqual({
      type: "assistant.thinking.delta",
      text: " step 2",
      fullText: "step 1 step 2",
    });
  });
});
