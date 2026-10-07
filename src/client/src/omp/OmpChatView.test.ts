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

  it("handles system messages with callout formatting", () => {
    const rawLines: ChatLine[] = [
      {
        role: "system",
        parts: [{ type: "text", text: "Aviso do sistema" }],
      },
    ];

    const messages = linesToChatMessages(rawLines);
    expect(messages.length).toBe(1);
    expect(messages[0].role).toBe("assistant");
    expect(messages[0].text).toContain('<callout type="info">');
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

  it("renders tools in steps timeline mode by default and minimal mode when configured", () => {
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

    // Default: steps
    expect(chatView.progressStyle).toBe("steps");
    let rendered = chatView.render();
    let text = getAllTemplateText(rendered);
    expect(text).toContain("Etapas do Agente");
    expect(text).toContain("Ver pílulas");
    expect(text).toContain("read");
    expect(text).toContain("edit");
    expect(text).toContain("+ 5");
    expect(text).toContain("- 2");

    // Minimal mode
    chatView.progressStyle = "minimal";
    rendered = chatView.render();
    text = getAllTemplateText(rendered);
    expect(text).toContain("Ver etapas");
    expect(text).toContain("read");
    expect(text).toContain("edit");
  });
});

  it("renders assistant header with OMP branding, copy action, and full width content", () => {
    const chatView = new OmpChatView();
    chatView.messages = [
      {
        id: "asst-1",
        role: "assistant",
        text: "Resposta completa do modelo.",
        timestamp: "14:30",
      },
    ];

    const rendered = chatView.render();
    const text = getAllTemplateText(rendered);
    expect(text).toContain("OMP");
    expect(text).toContain("14:30");
    expect(text).toContain("Resposta completa do modelo.");
    expect(text).toContain("Copiar resposta");
  });

  it("renders redesigned Grok-style thinking and tool action line in minimal mode", () => {
    const chatView = new OmpChatView();
    chatView.progressStyle = "minimal";
    chatView.messages = [
      {
        id: "msg-grok-1",
        role: "assistant",
        thinking: "Planejando os passos da pesquisa...",
        tools: [
          { toolName: "grep", target: "src/cli.ts", status: "completed" },
        ],
        text: "Resposta final.",
      },
    ];

    let rendered = chatView.render();
    let text = getAllTemplateText(rendered);
    expect(text).toContain("Thinking about your request");
    expect(text).toContain("Searching on codebase");
    expect(text).toContain("grep");
    expect(text).toContain("cli.ts");
    expect(text).not.toContain("Planejando os passos da pesquisa...");

    // Expand thinking
    (chatView as any).toggleThinking("msg-grok-1");
    rendered = chatView.render();
    text = getAllTemplateText(rendered);
    expect(text).toContain("Planejando os passos da pesquisa...");
  });

  it("renders + N more overflow badge in minimal mode when more than 5 tools are present", () => {
    const chatView = new OmpChatView();
    chatView.progressStyle = "minimal";
    chatView.messages = [
      {
        id: "msg-tools-overflow",
        role: "assistant",
        tools: [
          { toolName: "read", target: "file1.ts", status: "completed" },
          { toolName: "read", target: "file2.ts", status: "completed" },
          { toolName: "read", target: "file3.ts", status: "completed" },
          { toolName: "read", target: "file4.ts", status: "completed" },
          { toolName: "read", target: "file5.ts", status: "completed" },
          { toolName: "read", target: "file6.ts", status: "completed" },
        ],
        text: "Pronto.",
      },
    ];

    let rendered = chatView.render();
    let text = getAllTemplateText(rendered);
    expect(text).toMatch(/\+\s*2\s*more/);

    // Toggle show all tools
    (chatView as any).toggleShowAllTools("msg-tools-overflow");
    rendered = chatView.render();
    text = getAllTemplateText(rendered);
    expect(text).not.toMatch(/\+\s*2\s*more/);
    expect(text).toContain("file6.ts");
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
    expect(text).toContain("Command failed: exit code 1");
    expect(text).toContain("npm test");
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
