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
