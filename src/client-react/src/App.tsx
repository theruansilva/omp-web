import { useCallback, useEffect, useRef, useState } from "react";
import { Sider } from "./components/Sider";
import { ChatView } from "./components/ChatView";
import { Sendbox } from "./components/Sendbox";
import { useApi } from "./hooks/useApi";

export interface Project { id: string; name: string; path: string; }
export interface Workspace { id: string; projectId: string; path: string; label: string; branch?: string; isMain: boolean; }
export interface Session {
  id: string; cwd: string; path: string; persisted?: boolean;
  name?: string; created: string; modified: string;
  messageCount: number; firstMessage: string; archived?: boolean;
}
export interface Message { id: string; role: "user" | "assistant" | "tool" | "system" | "bash"; text: string; timestamp: number; }
export interface SessionStatus { isStreaming?: boolean; isBashRunning?: boolean; isCompacting?: boolean; pendingMessageCount?: number; }

// --- Message normalization (mirrors Lit client's chatMessages.ts) ---

function getString(obj: unknown, key: string): string | undefined {
  if (obj === null || typeof obj !== "object") return undefined;
  const val = (obj as Record<string, unknown>)[key];
  return typeof val === "string" ? val : undefined;
}

function getProp(obj: unknown, key: string): unknown {
  if (obj === null || typeof obj !== "object") return undefined;
  return (obj as Record<string, unknown>)[key];
}

function normalizeRole(role: unknown): Message["role"] {
  if (role === "assistant") return "assistant";
  if (role === "user") return "user";
  if (role === "toolResult") return "tool";
  if (role === "bashExecution") return "bash";
  return "system";
}

function extractTextFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((part): part is Record<string, unknown> => typeof part === "object" && part !== null)
    .filter((part) => {
      const type = part["type"];
      // Skip tool calls, skill reads, thinking — show only text parts
      return type === "text";
    })
    .map((part) => (typeof part["text"] === "string" ? part["text"] : ""))
    .filter((t) => t !== "")
    .join("\n");
}

function normalizeOneMessage(raw: unknown, index: number): Message | null {
  if (raw === null || typeof raw !== "object") return null;
  const msg = raw as Record<string, unknown>;
  const role = normalizeRole(msg["role"]);
  const text = extractTextFromContent(msg["content"]);
  const ts = typeof msg["timestamp"] === "string" ? Date.parse(msg["timestamp"])
    : typeof msg["timestamp"] === "number" ? msg["timestamp"]
      : Date.now();

  // Skip empty messages
  if (text === "" && role !== "tool") return null;

  // Skip toolResult messages (they show up as tool cards in Lit, but we'll skip for simplicity)
  if (msg["role"] === "toolResult") return null;

  // Bash executions — format nicely
  if (msg["role"] === "bashExecution") {
    const command = getString(msg, "command") ?? "";
    const lines = [`$ ${command}`];
    const output = msg["output"];
    if (output != null) lines.push("", String(output));
    const exitCode = msg["exitCode"];
    if (exitCode != null) lines.push("", `exit ${exitCode}`);
    return { id: `msg-${index}`, role: "bash", text: lines.join("\n"), timestamp: ts };
  }

  return { id: `msg-${index}`, role, text, timestamp: ts };
}

function normalizeMessages(rawMessages: unknown[]): Message[] {
  return rawMessages
    .map((msg, i) => normalizeOneMessage(msg, i))
    .filter((msg): msg is Message => msg !== null);
}

// --- WebSocket event handling (mirrors Lit client's chatTranscript.ts) ---

let messageCounter = 0;

function applyWsEvent(messages: Message[], event: Record<string, unknown>): Message[] {
  const type = event["type"];

  if (type === "message.append") {
    const raw = event["message"] as Record<string, unknown> | undefined;
    if (!raw) return messages;
    const role = normalizeRole(raw["role"]);
    const text = extractTextFromContent(raw["content"]);
    if (text === "" && role !== "tool") return messages;
    if (raw["role"] === "toolResult") return messages;
    return [...messages, { id: `live-${++messageCounter}`, role, text, timestamp: Date.now() }];
  }

  if (type === "assistant.delta" || type === "assistant.thinking.delta") {
    const delta = typeof event["text"] === "string" ? event["text"] : "";
    if (delta === "") return messages;
    const last = messages[messages.length - 1];
    if (last && last.role === "assistant") {
      return [...messages.slice(0, -1), { ...last, text: last.text + delta }];
    }
    return [...messages, { id: `live-${++messageCounter}`, role: "assistant", text: delta, timestamp: Date.now() }];
  }

  if (type === "tool.start") {
    const toolName = typeof event["toolName"] === "string" ? event["toolName"] : "tool";
    const summary = typeof event["summary"] === "string" ? event["summary"] : "";
    return [...messages, { id: `live-${++messageCounter}`, role: "tool", text: `${toolName}: ${summary}`, timestamp: Date.now() }];
  }

  if (type === "tool.end") {
    const toolName = typeof event["toolName"] === "string" ? event["toolName"] : "tool";
    const text = typeof event["text"] === "string" ? event["text"] : "";
    const isError = event["isError"] === true;
    const last = messages[messages.length - 1];
    if (last && last.role === "tool" && last.text.startsWith(`${toolName}:`)) {
      return [...messages.slice(0, -1), { ...last, text: `${toolName}: ${text}${isError ? " (error)" : ""}` }];
    }
    return [...messages, { id: `live-${++messageCounter}`, role: "tool", text: `${toolName}: ${text}${isError ? " (error)" : ""}`, timestamp: Date.now() }];
  }

  if (type === "session.error") {
    const msg = typeof event["message"] === "string" ? event["message"] : "Session error";
    return [...messages, { id: `live-${++messageCounter}`, role: "system", text: msg, timestamp: Date.now() }];
  }

  if (type === "status.update") {
    // Status handled separately
    return messages;
  }

  return messages;
}

function wsBase(): string {
  const loc = window.location;
  return `${loc.protocol === "https:" ? "wss:" : "ws:"}//${loc.host}`;
}

export function App() {
  const api = useApi();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<SessionStatus>({});
  const [sending, setSending] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load projects
  useEffect(() => {
    api.get<Project[]>("/api/projects").then(setProjects).catch(console.error);
  }, []);

  // Load workspaces when project selected
  useEffect(() => {
    if (!selectedProjectId) return;
    api.get<Workspace[]>(`/api/projects/${selectedProjectId}/workspaces`).then(setWorkspaces).catch(console.error);
  }, [selectedProjectId]);

  // Load sessions when workspace selected
  useEffect(() => {
    if (!selectedWorkspace) return;
    const cwd = selectedWorkspace.path;
    api.get<Session[]>(`/api/sessions?cwd=${encodeURIComponent(cwd)}`).then(setSessions).catch(console.error);
  }, [selectedWorkspace]);

  // Load messages when session selected
  useEffect(() => {
    if (!selectedSession) { setMessages([]); return; }
    messageCounter = 0;

    // API returns { messages: [...], start, total }
    api.get<{ messages: unknown[]; start: number; total: number }>(
      `/api/machines/local/sessions/${selectedSession.id}/messages?cwd=${encodeURIComponent(selectedSession.cwd)}&limit=200`
    ).then((page) => {
      setMessages(normalizeMessages(page.messages));
    }).catch(console.error);
  }, [selectedSession]);

  // WebSocket for real-time session events
  useEffect(() => {
    if (!selectedSession) { wsRef.current?.close(); return; }
    const cwd = encodeURIComponent(selectedSession.cwd);
    const ws = new WebSocket(`${wsBase()}/api/machines/local/sessions/${selectedSession.id}/events?cwd=${cwd}`);
    wsRef.current = ws;
    ws.onmessage = (ev) => {
      try {
        const event = JSON.parse(ev.data) as Record<string, unknown>;
        setMessages((prev) => applyWsEvent(prev, event));

        // Handle status updates
        if (event["type"] === "status.update") {
          const data = event["data"] as Record<string, unknown> | undefined;
          if (data) {
            setStatus({
              isStreaming: data["isStreaming"] === true,
              isBashRunning: data["isBashRunning"] === true,
              isCompacting: data["isCompacting"] === true,
              pendingMessageCount: typeof data["pendingMessageCount"] === "number" ? data["pendingMessageCount"] : 0,
            });
          }
        }
      } catch { /* ignore parse errors */ }
    };
    ws.onerror = () => { };
    ws.onclose = () => { };
    return () => ws.close();
  }, [selectedSession?.id]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleNewSession = useCallback(async () => {
    if (!selectedWorkspace) return;
    try {
      const session = await api.post<Session>("/api/machines/local/sessions", { cwd: selectedWorkspace.path });
      setSessions((prev) => [session, ...prev]);
      setSelectedSession(session);
    } catch (e) { console.error(e); }
  }, [selectedWorkspace]);

  const handleSend = useCallback(async (text: string) => {
    if (!selectedSession || !text.trim()) return;
    setSending(true);
    try {
      await api.post(`/api/machines/local/sessions/${selectedSession.id}/prompt`, { text, streamingBehavior: "followUp" });
    } catch (e) { console.error(e); }
    setSending(false);
  }, [selectedSession]);

  const handleStop = useCallback(() => {
    if (!selectedSession) return;
    fetch(`/api/machines/local/sessions/${selectedSession.id}/abort`, { method: "POST" }).catch(console.error);
  }, [selectedSession]);

  const activeSessionTitle = selectedSession?.name || selectedSession?.id || (selectedSession ? `Session ${selectedSession.id.slice(0, 6)}` : "");

  return (
    <div className="app-shell">
      <Sider
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={(p) => { setSelectedProjectId(p.id); setSelectedWorkspace(null); setSelectedSession(null); setWorkspaces([]); setSessions([]); setMessages([]); }}
        workspaces={workspaces}
        selectedWorkspaceId={selectedWorkspace?.id ?? null}
        onSelectWorkspace={(w) => { setSelectedWorkspace(w); setSelectedSession(null); setSessions([]); setMessages([]); }}
        sessions={sessions}
        selectedSessionId={selectedSession?.id ?? null}
        onSelectSession={(s) => { setSelectedSession(s); setMessages([]); }}
        onNewSession={handleNewSession}
      />
      <div className="main-area">
        {selectedSession && (
          <header className="main-header">
            <div className="main-header-title">
              <strong>{activeSessionTitle}</strong>
              {selectedWorkspace && <span className="main-header-badge">{selectedWorkspace.label}</span>}
            </div>
            <div className="main-header-actions">
              {selectedWorkspace && (
                <button className="btn-primary" onClick={handleNewSession}>+ New Chat</button>
              )}
            </div>
          </header>
        )}
        <ChatView messages={messages} status={status} />
        <div className="sendbox-wrapper">
          <Sendbox
            disabled={!selectedSession}
            sending={sending}
            isStreaming={status.isStreaming === true}
            onSend={handleSend}
            onStop={handleStop}
            placeholder={
              !selectedWorkspace
                ? "Select a project and workspace to start..."
                : !selectedSession
                  ? "Start a new chat..."
                  : status.isStreaming
                    ? "Agent is thinking..."
                    : "Type a message..."
            }
          />
        </div>
      </div>
    </div>
  );
}
