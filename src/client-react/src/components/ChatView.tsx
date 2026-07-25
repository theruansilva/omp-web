import { useEffect, useRef } from "react";
import type { Message, SessionStatus } from "../App";

const BotIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><line x1="12" y1="7" x2="12" y2="11" /><circle cx="8" cy="16" r="1" fill="currentColor" /><circle cx="16" cy="16" r="1" fill="currentColor" /></svg>;

function renderMarkdown(text: string): string {
  let out = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // Code blocks
  out = out.replace(/```(\w*)\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>");
  // Inline code
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Bold
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic
  out = out.replace(/\*(.+?)\*/g, "<em>$1</em>");
  return out;
}

function senderLabel(role: Message["role"]): string {
  if (role === "user") return "You";
  if (role === "assistant") return "Agent";
  if (role === "tool") return "Tool";
  if (role === "bash") return "Shell";
  return "System";
}

function messageClass(role: Message["role"]): string {
  return role;
}

interface ChatViewProps {
  messages: Message[];
  status: SessionStatus;
}

export function ChatView({ messages, status }: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="chat-area" ref={scrollRef}>
        <div className="empty-state">
          <div className="empty-state-icon"><BotIcon /></div>
          <h3>OMP Agent</h3>
          <p>Select a session to view messages, or start a new chat to begin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-area" ref={scrollRef}>
      {messages.map((msg, i) => (
        <div key={msg.id || i} className={`message-row ${messageClass(msg.role)}`}>
          <div className="message-sender">
            <span className="message-sender-dot" />
            {senderLabel(msg.role)}
          </div>
          {msg.text && (
            <div
              className="message-body"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
            />
          )}
        </div>
      ))}
      {status.isStreaming && (
        <div className="message-row assistant">
          <div className="message-sender">
            <span className="message-sender-dot" style={{ animation: "pulse 1.5s ease-in-out infinite" }} />
            Agent
          </div>
          <div className="message-body" style={{ color: "var(--text-disabled)" }}>
            <span style={{ animation: "pulse 1.5s ease-in-out infinite" }}>Thinking...</span>
          </div>
        </div>
      )}
    </div>
  );
}
