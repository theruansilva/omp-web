export interface ChatPreferences {
  showThinking: boolean;
  showEvents: boolean;
  showToolExecutions: boolean;
  showAgentStatus: boolean;
  showStatusBar: boolean;
  hideWorkspaces: boolean;
  bottomMobileNav: boolean;
}

export const DEFAULT_CHAT_PREFERENCES: ChatPreferences = {
  showThinking: true,
  showEvents: true,
  showToolExecutions: true,
  showAgentStatus: true,
  showStatusBar: false,
  hideWorkspaces: false,
  bottomMobileNav: false,
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

export function isChatPreferences(value: unknown): value is ChatPreferences {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate: Record<string, unknown> = { ...value };
  return (
    typeof candidate["showThinking"] === "boolean" &&
    typeof candidate["showEvents"] === "boolean" &&
    typeof candidate["showToolExecutions"] === "boolean" &&
    typeof candidate["showAgentStatus"] === "boolean" &&
    typeof candidate["showStatusBar"] === "boolean" &&
    typeof candidate["hideWorkspaces"] === "boolean" &&
    typeof candidate["bottomMobileNav"] === "boolean"
  );
}

export function loadChatPreferences(): ChatPreferences {
  try {
    if (typeof localStorage === "undefined") return { ...DEFAULT_CHAT_PREFERENCES };
    const raw = localStorage.getItem(CHAT_PREFERENCES_STORAGE_KEY);
    if (raw === null || raw === "") return { ...DEFAULT_CHAT_PREFERENCES };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return { ...DEFAULT_CHAT_PREFERENCES };
    const record: Record<string, unknown> = { ...parsed };
    return {
      showThinking: typeof record["showThinking"] === "boolean" ? record["showThinking"] : DEFAULT_CHAT_PREFERENCES.showThinking,
      showEvents: typeof record["showEvents"] === "boolean" ? record["showEvents"] : DEFAULT_CHAT_PREFERENCES.showEvents,
      showToolExecutions: typeof record["showToolExecutions"] === "boolean" ? record["showToolExecutions"] : DEFAULT_CHAT_PREFERENCES.showToolExecutions,
      showAgentStatus: typeof record["showAgentStatus"] === "boolean" ? record["showAgentStatus"] : DEFAULT_CHAT_PREFERENCES.showAgentStatus,
      showStatusBar: typeof record["showStatusBar"] === "boolean" ? record["showStatusBar"] : DEFAULT_CHAT_PREFERENCES.showStatusBar,
      hideWorkspaces: typeof record["hideWorkspaces"] === "boolean" ? record["hideWorkspaces"] : DEFAULT_CHAT_PREFERENCES.hideWorkspaces,
      bottomMobileNav: typeof record["bottomMobileNav"] === "boolean" ? record["bottomMobileNav"] : DEFAULT_CHAT_PREFERENCES.bottomMobileNav,
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
