export interface ChatPreferences {
  showThinking: boolean;
  showEvents: boolean;
  showToolExecutions: boolean;
  showAgentStatus: boolean;
  showStatusBar: boolean;
}

export const DEFAULT_CHAT_PREFERENCES: ChatPreferences = {
  showThinking: true,
  showEvents: true,
  showToolExecutions: true,
  showAgentStatus: true,
  showStatusBar: false,
};

export const CHAT_PREFERENCES_CHANGED_EVENT = "omp-web-chat-preferences-changed";
export const CHAT_PREFERENCES_STORAGE_KEY = "omp-web:chat-preferences";

let customEventTarget: EventTarget | undefined;

export function setPreferencesEventTarget(target: EventTarget | undefined): void {
  customEventTarget = target;
}

export function preferencesEventTarget(): EventTarget | undefined {
  if (customEventTarget !== undefined) return customEventTarget;
  if (typeof window !== "undefined") return window;
  return undefined;
}

export function loadChatPreferences(): ChatPreferences {
  try {
    if (typeof localStorage === "undefined") return { ...DEFAULT_CHAT_PREFERENCES };
    const raw = localStorage.getItem(CHAT_PREFERENCES_STORAGE_KEY);
    if (raw === null || raw === "") return { ...DEFAULT_CHAT_PREFERENCES };
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return { ...DEFAULT_CHAT_PREFERENCES };
    return {
      showThinking: typeof parsed.showThinking === "boolean" ? parsed.showThinking : DEFAULT_CHAT_PREFERENCES.showThinking,
      showEvents: typeof parsed.showEvents === "boolean" ? parsed.showEvents : DEFAULT_CHAT_PREFERENCES.showEvents,
      showToolExecutions: typeof parsed.showToolExecutions === "boolean" ? parsed.showToolExecutions : DEFAULT_CHAT_PREFERENCES.showToolExecutions,
      showAgentStatus: typeof parsed.showAgentStatus === "boolean" ? parsed.showAgentStatus : DEFAULT_CHAT_PREFERENCES.showAgentStatus,
      showStatusBar: typeof parsed.showStatusBar === "boolean" ? parsed.showStatusBar : DEFAULT_CHAT_PREFERENCES.showStatusBar,
    };
  } catch {
    return { ...DEFAULT_CHAT_PREFERENCES };
  }
}

export function saveChatPreferences(prefs: ChatPreferences): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(CHAT_PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
    }
  } catch {
    // Ignore storage quota/privacy errors.
  }
  const target = preferencesEventTarget();
  if (target !== undefined) {
    target.dispatchEvent(new CustomEvent(CHAT_PREFERENCES_CHANGED_EVENT, { detail: prefs }));
  }
}
