import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  CHAT_PREFERENCES_CHANGED_EVENT,
  DEFAULT_CHAT_PREFERENCES,
  isChatPreferences,
  loadChatPreferences,
  saveChatPreferenceOverrides,
  setChatPreferenceDefaults,
  setPreferencesEventTarget,
  type ChatPreferences,
} from "./chatPreferences";

describe("chatPreferences", () => {
  let storage: Record<string, string> = {};
  const testTarget = new EventTarget();

  beforeEach(() => {
    storage = {};
    const mockLocalStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => { storage[key] = value; },
      removeItem: (key: string) => { Reflect.deleteProperty(storage, key); },
      clear: () => { storage = {}; },
    };
    Object.defineProperty(globalThis, "localStorage", {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });
    setPreferencesEventTarget(testTarget);
    setChatPreferenceDefaults({});
  });

  afterEach(() => {
    setChatPreferenceDefaults({});
    storage = {};
    setPreferencesEventTarget(undefined);
  });

  it("returns default preferences when storage is empty", () => {
    expect(loadChatPreferences()).toEqual(DEFAULT_CHAT_PREFERENCES);
  });

  it("uses the config default unless the browser has an explicit Vim preference", () => {
    setChatPreferenceDefaults({ vimMode: true });
    expect(loadChatPreferences().vimMode).toBe(true);

    saveChatPreferenceOverrides({ showStatusBar: true });
    expect(JSON.parse(storage["omp-web:chat-preferences"] ?? "{}")).toEqual({ showStatusBar: true });

    setChatPreferenceDefaults({ vimMode: false });
    expect(loadChatPreferences()).toMatchObject({ showStatusBar: true, vimMode: false });

    saveChatPreferenceOverrides({ vimMode: true });
    setChatPreferenceDefaults({ vimMode: false });
    expect(loadChatPreferences().vimMode).toBe(true);
  });

  it("saves and loads customized chat preferences", () => {
    const custom: ChatPreferences = {
      showThinking: false,
      showEvents: false,
      showToolExecutions: true,
      showAgentStatus: false,
      vimMode: true,
      showStatusBar: true,
      hideWorkspaces: true,
      bottomMobileNav: true,
      hideBreadcrumbs: true,
    };
    saveChatPreferenceOverrides(custom);
    expect(loadChatPreferences()).toEqual(custom);
  });

  it("replaces malformed storage when saving an override", () => {
    storage["omp-web:chat-preferences"] = "{malformed";
    saveChatPreferenceOverrides({ vimMode: true });
    expect(JSON.parse(storage["omp-web:chat-preferences"] ?? "{}")).toEqual({ vimMode: true });
    expect(loadChatPreferences().vimMode).toBe(true);
  });

  it("falls back to default for missing fields in stored JSON", () => {
    storage["omp-web:chat-preferences"] = JSON.stringify({ showThinking: false });
    const loaded = loadChatPreferences();
    expect(loaded.showThinking).toBe(false);
    expect(loaded.showEvents).toBe(true);
    expect(loaded.showToolExecutions).toBe(true);
    expect(loaded.showAgentStatus).toBe(true);
    expect(loaded.vimMode).toBe(false);
    expect(loaded.showStatusBar).toBe(false);
    expect(loaded.hideWorkspaces).toBe(false);
    expect(loaded.bottomMobileNav).toBe(true);
    expect(loaded.hideBreadcrumbs).toBe(true);
  });

  it("dispatches custom event on save", () => {
    let received: ChatPreferences | undefined;
    const handler = (event: Event) => {
      if (event instanceof CustomEvent && isChatPreferences(event.detail)) {
        received = event.detail;
      }
    };
    testTarget.addEventListener(CHAT_PREFERENCES_CHANGED_EVENT, handler);

    const next: ChatPreferences = {
      showThinking: true,
      showEvents: false,
      showToolExecutions: false,
      showAgentStatus: true,
      vimMode: true,
      showStatusBar: true,
      hideWorkspaces: true,
      bottomMobileNav: true,
      hideBreadcrumbs: true,
    };
    saveChatPreferenceOverrides(next);
    testTarget.removeEventListener(CHAT_PREFERENCES_CHANGED_EVENT, handler);

    expect(received).toEqual(next);
  });
});
