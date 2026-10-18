import { describe, expect, it } from "bun:test";
import "./OmpChatView";
import { OmpChatView, type ChatMessage } from "./OmpChatView";
import "./OmpHomeView";
import { OmpHomeView } from "./OmpHomeView";
import { linesToChatMessages } from "./OmpApp";
import type { ChatLine } from "../components/shared";

function getAllTemplateText(rendered: unknown): string {
  if (!rendered) return "";
  if (typeof rendered === "string") return rendered;
  if (typeof rendered === "number") return String(rendered);
  if (Array.isArray(rendered)) {
    return rendered.map(getAllTemplateText).join(" ");
  }
  if (typeof rendered === "object" && rendered !== null) {
    const obj = rendered as Record<string, unknown>;
    if (Array.isArray(obj.strings)) {
      const strings = obj.strings as string[];
      const values = Array.isArray(obj.values) ? obj.values : [];
      let result = "";
      for (let i = 0; i < strings.length; i++) {
        result += strings[i] + " ";
        if (i < values.length) {
          result += getAllTemplateText(values[i]) + " ";
        }
      }
      return result;
    }
    if (Array.isArray(obj.values)) {
      return (obj.values as unknown[]).map(getAllTemplateText).join(" ");
    }
  }
  return "";
}

describe("linesToChatMessages", () => {
  it("groups consecutive assistant, thinking and tool lines into a cohesive assistant message", () => {
    const rawLines: ChatLine[] = [
      {
        role: "user",
        parts: [{ type: "text", text: "Olá agente" }],
        meta: { timestamp: "2026-09-26T06:30:00.000Z" },
      },
      {
        role: "assistant",
        parts: [{ type: "thinking", text: "Analisando a mensagem do usuário..." }],
      },
      {
        role: "tool",
        parts: [{
          type: "toolExecution",
          toolCallId: "call-1",
          toolName: "read",
          summary: "read file src/app.ts",
          status: "completed",
        }],
      },
      {
        role: "assistant",
        parts: [{ type: "text", text: "Aqui está a resposta completa." }],
      },
    ];

    const messages = linesToChatMessages(rawLines);
    expect(messages.length).toBe(2);

    expect(messages[0].role).toBe("user");
    expect(messages[0].text).toBe("Olá agente");

    expect(messages[1].role).toBe("assistant");
    expect(messages[1].thinking).toBe("Analisando a mensagem do usuário...");
    expect(messages[1].tools?.length).toBe(1);
    expect(messages[1].tools?.[0].toolName).toBe("read");
    expect(messages[1].text).toBe("Aqui está a resposta completa.");
  });

  it("preserves chronological interleaved sequence of thinking, tools, and text parts (TUI parity)", () => {
    const rawLines: ChatLine[] = [
      {
        role: "user",
        parts: [{ type: "text", text: "Corrija o bug" }],
      },
      {
        role: "assistant",
        parts: [{ type: "thinking", text: "Primeiro passo: vou ler o arquivo" }],
      },
      {
        role: "tool",
        parts: [{
          type: "toolExecution",
          toolCallId: "call-read",
          toolName: "read",
          summary: "read src/index.ts",
          status: "completed",
        }],
      },
      {
        role: "assistant",
        parts: [{ type: "thinking", text: "Segundo passo: encontrei o bug, vou editar" }],
      },
      {
        role: "tool",
        parts: [{
          type: "toolExecution",
          toolCallId: "call-edit",
          toolName: "edit",
          summary: "edit src/index.ts",
          status: "completed",
        }],
      },
      {
        role: "assistant",
        parts: [{ type: "text", text: "Bug corrigido com sucesso!" }],
      },
    ];

    const messages = linesToChatMessages(rawLines);
    expect(messages.length).toBe(2);
    const asst = messages[1];
    expect(asst.role).toBe("assistant");

    // Chronological interleaved sequence
    expect(asst.parts).toBeDefined();
    expect(asst.parts?.length).toBe(5);

    expect(asst.parts?.[0]).toEqual({
      type: "thinking",
      thinking: "Primeiro passo: vou ler o arquivo",
    });
    expect(asst.parts?.[1].type).toBe("tool");
    expect((asst.parts?.[1] as any).tools[0].toolName).toBe("read");

    expect(asst.parts?.[2]).toEqual({
      type: "thinking",
      thinking: "Segundo passo: encontrei o bug, vou editar",
    });
    expect(asst.parts?.[3].type).toBe("tool");
    expect((asst.parts?.[3] as any).tools[0].toolName).toBe("edit");

    expect(asst.parts?.[4]).toEqual({
      type: "text",
      text: "Bug corrigido com sucesso!",
    });

    // Backward compatibility properties
    expect(asst.thinking).toContain("Primeiro passo");
    expect(asst.thinking).toContain("Segundo passo");
    expect(asst.tools?.length).toBe(2);
    expect(asst.text).toBe("Bug corrigido com sucesso!");
  });

  it("handles system messages with system role and callout formatting", () => {
    const rawLines: ChatLine[] = [
      {
        role: "system",
        parts: [{ type: "text", text: "Aviso do sistema" }],
      },
    ];

    const messages = linesToChatMessages(rawLines);
    expect(messages.length).toBe(1);
    expect(messages[0].role).toBe("system");
    expect(messages[0].isSystemPrompt).toBe(true);
    expect(messages[0].text).toContain("Aviso do sistema");
  });
});

describe("OmpChatView rendering", () => {
  it("renders collapsible thinking block and tool tags without wild timers", () => {
    const chatView = new OmpChatView();
    const messages: ChatMessage[] = [
      {
        id: "msg-1",
        role: "user",
        text: "Como funciona?",
      },
      {
        id: "msg-2",
        role: "assistant",
        thinking: "Raciocinando passo a passo sobre a pergunta...",
        tools: [{ toolName: "grep", summary: "grep pattern 'config'" }],
        text: "Funciona perfeitamente.",
      },
    ];

    chatView.messages = messages;
    chatView.projects = [
      { id: "proj-1", name: "Social Media App", path: "/home/projects/social" },
    ];
    chatView.selectedProjectId = "proj-1";

    const rendered = chatView.render();
    expect(rendered).toBeDefined();

    const text = getAllTemplateText(rendered);
    expect(text).toContain("Como funciona?");
    expect(text).toContain("Raciocínio");
    expect(text).toContain("Raciocinando passo a passo");
    expect(text).toContain("grep");
    expect(text).toContain("Funciona perfeitamente.");
  });

  it("hides thinking block when showThinking is false", () => {
    const chatView = new OmpChatView();
    chatView.showThinking = false;
    chatView.messages = [
      {
        id: "msg-1",
        role: "assistant",
        thinking: "Raciocínio interno confidencial",
        text: "Resposta final direta.",
      },
    ];

    const rendered = chatView.render();
    const text = getAllTemplateText(rendered);
    expect(text).not.toContain("Raciocínio");
    expect(text).not.toContain("Raciocínio interno confidencial");
    expect(text).toContain("Resposta final direta.");
  });

  it("extracts <thinking>, <thought>, <reasoning> and codeblock tags in linesToChatMessages", () => {
    const rawLines: ChatLine[] = [
      {
        role: "assistant",
        parts: [
          { type: "text", text: "<thinking>Pensando na resposta...</thinking>Aqui está a resposta real." },
        ],
      },
      {
        role: "assistant",
        parts: [
          { type: "text", text: "\n\n```thought\nSegundo pensamento\n```\nContinuação." },
        ],
      },
    ];

    const messages = linesToChatMessages(rawLines);
    expect(messages.length).toBe(1);
    expect(messages[0].thinking).toContain("Pensando na resposta...");
    expect(messages[0].thinking).toContain("Segundo pensamento");
    expect(messages[0].text).toContain("Aqui está a resposta real.");
    expect(messages[0].text).toContain("Continuação.");
    expect(messages[0].text).not.toContain("<thinking>");
  });

  it("renders tools in classic tool cards with icons, names, and diff stats", () => {
    const chatView = new OmpChatView();
    chatView.messages = [
      {
        id: "msg-1",
        role: "assistant",
        text: "Executando...",
        tools: [
          { toolName: "read", target: "src/cli.ts", status: "completed" },
          { toolName: "edit", target: "src/cli.ts", diffStats: { added: 5, removed: 2 }, status: "running" },
        ],
      },
    ];

    const rendered = chatView.render();
    const text = getAllTemplateText(rendered);
    expect(text).toContain("read");
    expect(text).toContain("src/cli.ts");
    expect(text).toContain("edit");
    expect(text).toContain("+ 5");
    expect(text).toContain("- 2");
  });

  it("renders tool inspection details when expanded", () => {
    const chatView = new OmpChatView();
    chatView.messages = [
      {
        id: "msg-1",
        role: "assistant",
        text: "Teste de erro",
        tools: [
          {
            toolName: "bash",
            status: "error",
            isError: true,
            errorText: "Command failed: exit code 1",
            args: { command: "npm test" },
          },
        ],
      },
    ];

    // Expand the tool
    (chatView as any).expandedToolKey = "msg-1-tool-0";

    const rendered = chatView.render();
    const text = getAllTemplateText(rendered);
    expect(text).toContain("bash");
    expect(text).toContain("Erro");
    expect(text).toContain("Command");
    expect(text).toContain("failed");
    expect(text).toContain("exit");
    expect(text).toContain("npm test");
  });

  it("collapses process block automatically once response is ready, and shows running status line while generating", () => {
    const chatView = new OmpChatView();

    // 1. While running / generating: process block is open and shows running status
    chatView.isStreaming = true;
    chatView.messages = [
      {
        id: "msg-1",
        role: "user",
        text: "Pesquise os arquivos",
      },
      {
        id: "msg-2",
        role: "assistant",
        thinking: "Analisando estrutura de pastas para encontrar arquivos",
        tools: [{ toolName: "grep", status: "running" }],
        text: "", // No response text yet!
      },
    ];

    let rendered = chatView.render();
    let text = getAllTemplateText(rendered);
    expect(text).toContain("Buscando no código…"); // statusText from running grep
    expect((chatView as any).isProcessBlockOpen("msg-2", true)).toBe(true);

    // 2. Once response is ready: auto-collapses to 'pensou em...'
    chatView.isStreaming = false;
    chatView.messages = [
      {
        id: "msg-1",
        role: "user",
        text: "Pesquise os arquivos",
      },
      {
        id: "msg-2",
        role: "assistant",
        thinking: "Analisando estrutura de pastas para encontrar arquivos",
        tools: [{ toolName: "grep", status: "completed" }],
        text: "Encontrei 5 arquivos correspondentes.",
      },
    ];

    rendered = chatView.render();
    text = getAllTemplateText(rendered);
    expect(text).toContain("pensou em");
    expect(text).toContain("Analisando estrutura de pastas");
    expect(text).toContain("Encontrei 5 arquivos correspondentes.");
    expect((chatView as any).isProcessBlockOpen("msg-2", false)).toBe(false);

    // 3. User clicks to toggle open: expands outer process box
    (chatView as any).toggleProcessBlock("msg-2", false);
    expect((chatView as any).isProcessBlockOpen("msg-2", false)).toBe(true);

    // 4. Inside the expanded box, all completed blocks are closed by default
    expect((chatView as any).expandedThinkingKeys.has("msg-2-think-0")).toBe(false);
    expect((chatView as any).expandedToolKey).toBeFalsy();

    // 5. Individual thinking step can be toggled open
    (chatView as any).toggleThinkingStep("msg-2-think-0", false);
    expect((chatView as any).expandedThinkingKeys.has("msg-2-think-0")).toBe(true);
  });
});

describe("OmpHomeView projects binding", () => {
  it("accepts and binds projects down to composer", () => {
    const homeView = new OmpHomeView();
    homeView.projects = [
      { id: "proj-1", name: "Job Hunting", path: "/home/projects/job" },
    ];
    homeView.selectedProjectId = "proj-1";

    const rendered = homeView.render();
    expect(rendered).toBeDefined();
  });
});

describe("revert turn functionality", () => {
  it("preserves rawIndex and entryId on user ChatMessage", () => {
    const rawLines: ChatLine[] = [
      {
        role: "user",
        parts: [{ type: "text", text: "Turn 1" }],
        meta: { timestamp: "2026-09-26T06:30:00.000Z", entryId: "entry-turn-1" as any },
      },
    ];

    const messages = linesToChatMessages(rawLines);
    expect(messages[0].rawIndex).toBe(0);
    expect(messages[0].entryId).toBe("entry-turn-1");
  });

  it("dispatches revert-turn event when handleRevertTurn is called", () => {
    const chatView = new OmpChatView();
    let emittedDetail: any = null;
    chatView.addEventListener("revert-turn", (e: any) => {
      emittedDetail = e.detail;
    });

    const msg: ChatMessage = {
      id: "user-0",
      role: "user",
      text: "Mensagem para reverter",
      entryId: "entry-123",
      rawIndex: 0,
    };

    (chatView as any).handleRevertTurn(msg, 0);
    expect(emittedDetail).toBeDefined();
    expect(emittedDetail.message.text).toBe("Mensagem para reverter");
    expect(emittedDetail.message.entryId).toBe("entry-123");
    expect(emittedDetail.index).toBe(0);
  });
});

describe("OmpChatView Scroll Behavior with Questions", () => {
  it("does not lock scroll to bottom when pendingAsk is active", () => {
    const chatView = new OmpChatView();
    (chatView as any).pinnedToBottom = true;
    chatView.pendingAsk = {
      requestId: "req-1",
      questions: [{ id: "q1", question: "Continuar?", options: [{ label: "Sim" }] }],
    };

    chatView.updated(new Map([["pendingAsk", undefined]]));
    // When question arrives, pinnedToBottom MUST be false so scroll is not locked
    expect((chatView as any).pinnedToBottom).toBe(false);
  });
});

describe("OmpChatView Conditional Tool Icons and High Contrast", () => {
  it("renders red console icon for errors, tool icon for completed (no checkmark), and white spinner for running", () => {
    const chatView = new OmpChatView();
    chatView.messages = [
      {
        id: "msg-tools",
        role: "assistant",
        tools: [
          { toolName: "bash", summary: "cargo build", status: "error", isError: true },
          { toolName: "read", target: "src/main.rs", status: "completed" },
          { toolName: "eval", summary: "running test", status: "running" },
        ],
        text: "Relatório de execução",
      },
    ];

    const rendered = chatView.render();
    const text = getAllTemplateText(rendered);

    // Error icon
    expect(text).toContain("Erro no console");
    expect(text).toContain("bash");

    // Completed: only tool icon, no checkmark
    expect(text).toContain("read");
    expect(text).not.toContain("Concluído com sucesso");

    // Running animation
    expect(text).toContain("Executando");
    expect(text).toContain("eval");
  });
});

describe("OmpChatView System-Prompt, Skill, and MCP differentiation", () => {
  it("renders system prompts as callouts, skills as banners, and tools with MCP badge", () => {
    const chatView = new OmpChatView();
    chatView.messages = [
      {
        id: "msg-sys",
        role: "user",
        text: "<system-notice>Tool inventory changed</system-notice>",
        isSystemPrompt: true,
        systemPromptKind: "notice",
      },
      {
        id: "msg-skill",
        role: "user",
        text: "Executando skill",
        isSystemPrompt: true,
        systemPromptKind: "skill",
        skillName: "advisor-alfredo-soares",
      },
      {
        id: "msg-mcp",
        role: "assistant",
        tools: [
          { toolName: "mcp__ai_memory_memory_query", summary: "querying memory", status: "completed" },
        ],
        text: "Resposta com MCP",
      },
    ];

    const rendered = chatView.render();
    const text = getAllTemplateText(rendered);

    // System prompt rendered as tool card in flow
    expect(text).toContain("system");
    expect(text).toContain("Tool inventory changed");

    // Skill rendered as tool card in flow
    expect(text).toContain("skill · advisor-alfredo-soares");

    // MCP badge
    expect(text).toContain("MCP");
    expect(text).toContain("ai_memory");
  });

  it("renders as standard user message when categorizePrompts is false", () => {
    const chatView = new OmpChatView();
    chatView.categorizePrompts = false;
    chatView.messages = [
      {
        id: "msg-sys",
        role: "user",
        text: "<system-notice>Tool inventory changed</system-notice>",
        isSystemPrompt: true,
        systemPromptKind: "notice",
      },
    ];

    const rendered = chatView.render();
    const text = getAllTemplateText(rendered);

    expect(text).not.toContain("Aviso do Sistema");
    expect(text).toContain("Tool inventory changed");
  });

  it("does not render floating jump to bottom button", () => {
    const chatView = new OmpChatView();
    (chatView as any).pinnedToBottom = false;

    const rendered = chatView.render();
    const text = getAllTemplateText(rendered);
    expect(text).not.toContain("Ir para o final");
  });
});
