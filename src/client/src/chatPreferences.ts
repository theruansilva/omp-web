export interface ChatPreferences {
  showThinking: boolean;
  showEvents: boolean;
  showToolExecutions: boolean;
  showAgentStatus: boolean;
  vimMode: boolean;
  showStatusBar: boolean;
  hideWorkspaces: boolean;
  bottomMobileNav: boolean;
  hideBreadcrumbs: boolean;
}

export const DEFAULT_CHAT_PREFERENCES: ChatPreferences = {
  showThinking: true,
  showEvents: true,
  showToolExecutions: true,
  showAgentStatus: true,
  vimMode: false,
  showStatusBar: false,
  hideWorkspaces: false,
  bottomMobileNav: false,
  hideBreadcrumbs: false,
};

export const CHAT_PREFERENCES_CHANGED_EVENT = "omp-web-chat-preferences-changed";
export const CHAT_PREFERENCES_STORAGE_KEY = "omp-web:chat-preferences";

let customEventTarget: EventTarget | undefined;
let configuredDefaults: Partial<ChatPreferences> = {};

export function setPreferencesEventTarget(target: EventTarget | undefined): void {
  customEventTarget = target;
}

export function preferencesEventTarget(): EventTarget | undefined {
  if (customEventTarget !== undefined) return customEventTarget;
  if (typeof window !== "undefined") return window;
  return undefined;
}

/** Sets config-file defaults for preferences without a browser override. */
export function setChatPreferenceDefaults(defaults: Partial<ChatPreferences>): void {
  configuredDefaults = { ...defaults };
  const target = preferencesEventTarget();
  if (target !== undefined) {
    target.dispatchEvent(new CustomEvent(CHAT_PREFERENCES_CHANGED_EVENT, { detail: loadChatPreferences() }));
  }
}

export function isChatPreferences(value: unknown): value is ChatPreferences {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate: Record<string, unknown> = { ...value };
  return (
    typeof candidate["showThinking"] === "boolean" &&
    typeof candidate["showEvents"] === "boolean" &&
    typeof candidate["showToolExecutions"] === "boolean" &&
    typeof candidate["showAgentStatus"] === "boolean" &&
    typeof candidate["vimMode"] === "boolean" &&
    typeof candidate["showStatusBar"] === "boolean" &&
    typeof candidate["hideWorkspaces"] === "boolean" &&
    typeof candidate["bottomMobileNav"] === "boolean" &&
    typeof candidate["hideBreadcrumbs"] === "boolean"
  );
}

export function loadChatPreferences(): ChatPreferences {
  const defaults = { ...DEFAULT_CHAT_PREFERENCES, ...configuredDefaults };
  try {
    if (typeof localStorage === "undefined") return defaults;
    const raw = localStorage.getItem(CHAT_PREFERENCES_STORAGE_KEY);
    if (raw === null || raw === "") return defaults;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return defaults;
    const record: Record<string, unknown> = { ...parsed };
    return {
      showThinking: typeof record["showThinking"] === "boolean" ? record["showThinking"] : defaults.showThinking,
      showEvents: typeof record["showEvents"] === "boolean" ? record["showEvents"] : defaults.showEvents,
      showToolExecutions: typeof record["showToolExecutions"] === "boolean" ? record["showToolExecutions"] : defaults.showToolExecutions,
      showAgentStatus: typeof record["showAgentStatus"] === "boolean" ? record["showAgentStatus"] : defaults.showAgentStatus,
      vimMode: typeof record["vimMode"] === "boolean" ? record["vimMode"] : defaults.vimMode,
      showStatusBar: typeof record["showStatusBar"] === "boolean" ? record["showStatusBar"] : defaults.showStatusBar,
      hideWorkspaces: typeof record["hideWorkspaces"] === "boolean" ? record["hideWorkspaces"] : defaults.hideWorkspaces,
      bottomMobileNav: typeof record["bottomMobileNav"] === "boolean" ? record["bottomMobileNav"] : defaults.bottomMobileNav,
      hideBreadcrumbs: typeof record["hideBreadcrumbs"] === "boolean" ? record["hideBreadcrumbs"] : defaults.hideBreadcrumbs,
    };
  } catch {
    return defaults;
  }
}

/** Persists only the supplied browser preference overrides. */
export function saveChatPreferenceOverrides(overrides: Partial<ChatPreferences>): void {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(CHAT_PREFERENCES_STORAGE_KEY);
      let stored: Record<string, unknown> = {};
      try {
        const parsed: unknown = raw === null || raw === "" ? {} : JSON.parse(raw);
        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) stored = { ...parsed };
      } catch {
        // Replace malformed stored preferences with the new overrides.
      }
      localStorage.setItem(CHAT_PREFERENCES_STORAGE_KEY, JSON.stringify({ ...stored, ...overrides }));
    }
  } catch {
    // Ignore storage quota/privacy errors.
  }
  const prefs = loadChatPreferences();
  const target = preferencesEventTarget();
  if (target !== undefined) {
    target.dispatchEvent(new CustomEvent(CHAT_PREFERENCES_CHANGED_EVENT, { detail: prefs }));
  }
}
