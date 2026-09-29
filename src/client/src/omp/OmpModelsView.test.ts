import { describe, expect, it } from "bun:test";
import { normalizeModelName } from "../modelCategories";
import "./OmpModelsView";
import { OmpModelsView } from "./OmpModelsView";

describe("normalizeModelName", () => {
  it("normalizes Claude model names accurately", () => {
    expect(normalizeModelName("anthropic", "claude-3-7-sonnet-20250219")).toBe("Claude 3.7 Sonnet");
    expect(normalizeModelName("anthropic", "claude-3-5-sonnet-20241022")).toBe("Claude 3.5 Sonnet");
    expect(normalizeModelName("anthropic", "claude-3-5-haiku-20241022")).toBe("Claude 3.5 Haiku");
  });

  it("normalizes OpenAI model names accurately", () => {
    expect(normalizeModelName("openai", "gpt-4o-mini")).toBe("GPT-4o mini");
    expect(normalizeModelName("openai", "gpt-4o")).toBe("GPT-4o");
    expect(normalizeModelName("openai", "o3-mini")).toBe("o3-mini");
    expect(normalizeModelName("openai", "o1")).toBe("o1");
  });

  it("normalizes Gemini model names accurately", () => {
    expect(normalizeModelName("google", "gemini-3.8-flash")).toBe("Gemini 3.8 Flash");
    expect(normalizeModelName("google", "gemini-2.5-pro")).toBe("Gemini 2.5 Pro");
  });

  it("normalizes DeepSeek model names accurately", () => {
    expect(normalizeModelName("deepseek", "deepseek-chat")).toBe("DeepSeek V3");
    expect(normalizeModelName("deepseek", "deepseek-reasoner")).toBe("DeepSeek R1");
  });

  it("formats generic slugged models cleanly", () => {
    expect(normalizeModelName("groq", "llama-3.3-70b-versatile")).toBe("Llama 3.3 70B Versatile");
  });
});

describe("OmpModelsView component", () => {
  it("instantiates and renders model cards and filter categories", () => {
    const view = new OmpModelsView();
    view.models = [
      { provider: "anthropic", id: "claude-3-7-sonnet-20250219", contextWindow: 200000 },
      { provider: "openai", id: "gpt-4o", contextWindow: 128000 },
      { provider: "google", id: "gemini-3.8-flash", contextWindow: 1000000 },
    ];
    view.currentModel = { provider: "anthropic", id: "claude-3-7-sonnet-20250219" };

    const rendered = view.render();
    expect(rendered).toBeDefined();

    const filtered = (view as unknown as Record<string, (...args: unknown[]) => unknown>).getFilteredModels();
    expect(filtered.length).toBe(3);
  });

  it("filters models by search query", () => {
    const view = new OmpModelsView();
    view.models = [
      { provider: "anthropic", id: "claude-3-7-sonnet-20250219" },
      { provider: "openai", id: "gpt-4o" },
      { provider: "google", id: "gemini-3.8-flash" },
    ];

    (view as unknown as Record<string, (...args: unknown[]) => unknown>).searchQuery = "claude";
    const filtered = (view as unknown as Record<string, (...args: unknown[]) => unknown>).getFilteredModels();
    expect(filtered.length).toBe(1);
    expect(filtered[0].provider).toBe("anthropic");
  });

  it("dispatches select-model when model is chosen", () => {
    const view = new OmpModelsView();
    let detailReceived: unknown = null;
    view.addEventListener("select-model", (e: Event) => { const custom = e as CustomEvent;
      detailReceived = custom.detail;
    });

    (view as unknown as Record<string, (...args: unknown[]) => unknown>).handleSelectModel({ provider: "openai", id: "gpt-4o" }, true);
    expect(detailReceived).toEqual({
      provider: "openai",
      modelId: "gpt-4o",
      persist: true,
      role: undefined,
    });
  });

  it("dispatches set-thinking-level when thinking level is chosen", () => {
    const view = new OmpModelsView();
    let levelReceived: unknown = null;
    view.addEventListener("set-thinking-level", (e: Event) => { const custom = e as CustomEvent<{ level: string }>;
      levelReceived = custom.detail.level;
    });

    (view as unknown as Record<string, (...args: unknown[]) => unknown>).handleSetThinking("high");
    expect(levelReceived).toBe("high");
  });

  it("dispatches select-model with role when assigned to a TUI role", () => {
    const view = new OmpModelsView();
    let detailReceived: unknown = null;
    view.addEventListener("select-model", (e: Event) => {
      const custom = e as CustomEvent;
      detailReceived = custom.detail;
    });

    (view as unknown as Record<string, (...args: unknown[]) => unknown>).handleSelectModel(
      { provider: "anthropic", id: "claude-3-5-haiku" },
      true,
      "smol",
    );
    expect(detailReceived).toEqual({
      provider: "anthropic",
      modelId: "claude-3-5-haiku",
      persist: true,
      role: "smol",
    });
  });
});