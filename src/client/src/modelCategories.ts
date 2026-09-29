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

export function normalizeModelName(provider = "", id = "", name?: string): string {
  if (name && name !== id && !name.includes(":") && !name.includes("/") && name.length < 35) {
    return name;
  }
  const cleanId = (id || "").trim();
  const withoutDate = cleanId.replace(/-\d{8}$/, "").replace(/:latest$/, "");

  // Claude models
  if (/^claude-3-7-sonnet/i.test(cleanId)) return "Claude 3.7 Sonnet";
  if (/^claude-3-5-sonnet/i.test(cleanId)) return "Claude 3.5 Sonnet";
  if (/^claude-3-5-haiku/i.test(cleanId)) return "Claude 3.5 Haiku";
  if (/^claude-3-opus/i.test(cleanId)) return "Claude 3 Opus";
  if (/^claude-3-haiku/i.test(cleanId)) return "Claude 3 Haiku";

  // OpenAI models
  if (/^gpt-4o-mini/i.test(cleanId)) return "GPT-4o mini";
  if (/^gpt-4o/i.test(cleanId)) return "GPT-4o";
  if (/^gpt-4\.5/i.test(cleanId)) return "GPT-4.5";
  if (/^chatgpt-4o/i.test(cleanId)) return "ChatGPT-4o";
  if (/^o3-mini/i.test(cleanId)) return "o3-mini";
  if (/^o1-mini/i.test(cleanId)) return "o1-mini";
  if (/^o1-preview/i.test(cleanId)) return "o1-preview";
  if (/^o1/i.test(cleanId)) return "o1";

  // Gemini models
  if (/^gemini-3\.8-flash/i.test(cleanId)) return "Gemini 3.8 Flash";
  if (/^gemini-3\.8-pro/i.test(cleanId)) return "Gemini 3.8 Pro";
  if (/^gemini-2\.5-flash/i.test(cleanId)) return "Gemini 2.5 Flash";
  if (/^gemini-2\.5-pro/i.test(cleanId)) return "Gemini 2.5 Pro";
  if (/^gemini-2\.0-flash/i.test(cleanId)) return "Gemini 2.0 Flash";
  if (/^gemini-1\.5-pro/i.test(cleanId)) return "Gemini 1.5 Pro";
  if (/^gemini-1\.5-flash/i.test(cleanId)) return "Gemini 1.5 Flash";

  // DeepSeek models
  if (/^deepseek-reasoner/i.test(cleanId)) return "DeepSeek R1";
  if (/^deepseek-chat/i.test(cleanId)) return "DeepSeek V3";
  if (/^deepseek-coder/i.test(cleanId)) return "DeepSeek Coder";

  // General clean word formatting
  const formatted = withoutDate
    .split(/[-_:]+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower === "gpt") return "GPT";
      if (lower === "llm") return "LLM";
      if (lower === "pro") return "Pro";
      if (lower === "flash") return "Flash";
      if (lower === "sonnet") return "Sonnet";
      if (lower === "haiku") return "Haiku";
      if (lower === "opus") return "Opus";
      if (/^\d+[bkm]$/i.test(word)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");

  return formatted || cleanId;
}
