import { describe, expect, it } from "vitest";
import { classifyModelSource } from "./modelCategories";

describe("classifyModelSource", () => {
  it("classifies antigravity models", () => {
    const result = classifyModelSource("antigravity", "gemini-3.8-flash");
    expect(result.category).toBe("Antigravity");
    expect(result.icon).toBe("🪐");
    expect(result.priority).toBe(1);
  });

  it("classifies claude code models", () => {
    const result = classifyModelSource("anthropic", "claude-3-7-sonnet-20250219");
    expect(result.category).toBe("Claude Code");
    expect(result.icon).toBe("✦");
    expect(result.priority).toBe(2);
  });

  it("classifies openai models", () => {
    const result = classifyModelSource("openai", "gpt-4o");
    expect(result.category).toBe("OpenAI");
    expect(result.icon).toBe("🟢");
  });

  it("classifies google gemini models", () => {
    const result = classifyModelSource("google", "gemini-2.5-flash");
    expect(result.category).toBe("Google Gemini");
    expect(result.icon).toBe("✨");
  });

  it("classifies deepseek models", () => {
    const result = classifyModelSource("deepseek", "deepseek-chat");
    expect(result.category).toBe("DeepSeek");
    expect(result.icon).toBe("🐳");
  });

  it("classifies local ollama models", () => {
    const result = classifyModelSource("ollama", "llama3.2");
    expect(result.category).toBe("Ollama (Local)");
    expect(result.icon).toBe("🦙");
  });

  it("classifies unknown providers gracefully", () => {
    const result = classifyModelSource("custom-provider", "custom-model");
    expect(result.category).toBe("Custom-provider");
    expect(result.icon).toBe("⚙️");
  });
});
