export interface ModelCategoryInfo {
  category: string;
  icon: string;
  priority: number;
}

export function classifyModelSource(provider: string, modelId: string): ModelCategoryInfo {
  const p = (provider || "").toLowerCase();
  const id = (modelId || "").toLowerCase();

  // Antigravity models (specifically requested)
  if (p === "antigravity" || id.includes("antigravity")) {
    return { category: "Antigravity", icon: "🪐", priority: 1 };
  }

  // Claude Code / Anthropic (specifically requested)
  if (p === "claude-code" || p === "claude" || p === "anthropic" || id.includes("claude")) {
    return { category: "Claude Code", icon: "✦", priority: 2 };
  }

  // OpenAI / Codex
  if (p === "openai" || p === "codex" || id.startsWith("gpt") || id.startsWith("o1") || id.startsWith("o3") || id.startsWith("chatgpt")) {
    return { category: "OpenAI", icon: "🟢", priority: 3 };
  }

  // Google Gemini
  if (p === "google" || p === "gemini" || id.includes("gemini")) {
    return { category: "Google Gemini", icon: "✨", priority: 4 };
  }

  // DeepSeek
  if (p === "deepseek" || id.includes("deepseek")) {
    return { category: "DeepSeek", icon: "🐳", priority: 5 };
  }

  // Ollama / Local models
  if (p === "ollama" || p === "local" || id.includes("llama")) {
    return { category: "Ollama (Local)", icon: "🦙", priority: 6 };
  }

  // Groq
  if (p === "groq") {
    return { category: "Groq", icon: "⚡", priority: 7 };
  }

  // OpenRouter
  if (p === "openrouter") {
    return { category: "OpenRouter", icon: "🌐", priority: 8 };
  }

  // GitHub Copilot
  if (p === "github" || p === "copilot") {
    return { category: "GitHub Copilot", icon: "🐙", priority: 9 };
  }

  // Mistral AI
  if (p === "mistral" || id.includes("mistral") || id.includes("codestral")) {
    return { category: "Mistral AI", icon: "🌪️", priority: 10 };
  }

  const formattedProvider = provider !== "" ? provider.charAt(0).toUpperCase() + provider.slice(1) : "Other Models";
  return { category: formattedProvider, icon: "⚙️", priority: 99 };
}
