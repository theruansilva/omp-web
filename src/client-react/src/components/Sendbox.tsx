import { useCallback, useEffect, useRef, useState } from "react";

const SendIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>;
const StopIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>;
const AttachIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>;

interface SendboxProps {
  disabled: boolean;
  sending: boolean;
  isStreaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  placeholder?: string;
}

export function Sendbox({ disabled, sending, isStreaming, onSend, onStop, placeholder }: SendboxProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasContent = value.trim().length > 0;

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isStreaming) { onStop(); return; }
      if (hasContent && !disabled && !sending) {
        onSend(value.trim());
        setValue("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
      }
    }
  }, [value, hasContent, disabled, sending, isStreaming, onSend, onStop]);

  const handleSendClick = useCallback(() => {
    if (isStreaming) { onStop(); return; }
    if (hasContent && !disabled && !sending) {
      onSend(value.trim());
      setValue("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
  }, [value, hasContent, disabled, sending, isStreaming, onSend, onStop]);

  return (
    <div className="sendbox">
      <textarea
        ref={textareaRef}
        className="sendbox-input"
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
      />
      <div className="sendbox-toolbar">
        <button className="sendbox-attach-btn" title="Attach file" disabled={disabled}>
          <AttachIcon />
        </button>
        <button
          className={`sendbox-send-btn${(hasContent || isStreaming) && !disabled ? " active" : ""}`}
          onClick={handleSendClick}
          disabled={disabled || (!hasContent && !isStreaming)}
          title={isStreaming ? "Stop" : "Send"}
        >
          {isStreaming ? <StopIcon /> : <SendIcon />}
        </button>
      </div>
    </div>
  );
}
