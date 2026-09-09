import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CHAT_PREFERENCES_CHANGED_EVENT,
  DEFAULT_CHAT_PREFERENCES,
  loadChatPreferences,
  preferencesEventTarget,
  saveChatPreferences,
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
      removeItem: (key: string) => { delete storage[key]; },
      clear: () => { storage = {}; },
    };
    Object.defineProperty(globalThis, "localStorage", {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });
    setPreferencesEventTarget(testTarget);
  });

  afterEach(() => {
    storage = {};
    setPreferencesEventTarget(undefined);
  });

  it("returns default preferences when storage is empty", () => {
    expect(loadChatPreferences()).toEqual(DEFAULT_CHAT_PREFERENCES);
  });

  it("saves and loads customized chat preferences", () => {
    const custom: ChatPreferences = {
      showThinking: false,
      showEvents: false,
      showToolExecutions: true,
      showAgentStatus: false,
      showStatusBar: true,
      hideWorkspaces: true,
      bottomMobileNav: true,
    };
    saveChatPreferences(custom);
    expect(loadChatPreferences()).toEqual(custom);
  });

  it("falls back to default for missing fields in stored JSON", () => {
    storage["omp-web:chat-preferences"] = JSON.stringify({ showThinking: false });
    const loaded = loadChatPreferences();
    expect(loaded.showThinking).toBe(false);
    expect(loaded.showEvents).toBe(true);
    expect(loaded.showToolExecutions).toBe(true);
    expect(loaded.showAgentStatus).toBe(true);
    expect(loaded.showStatusBar).toBe(false);
    expect(loaded.hideWorkspaces).toBe(false);
    expect(loaded.bottomMobileNav).toBe(false);
  });

  it("dispatches custom event on save", () => {
    let received: ChatPreferences | undefined;
    const handler = (event: Event) => {
      received = (event as CustomEvent<ChatPreferences>).detail;
    };
    testTarget.addEventListener(CHAT_PREFERENCES_CHANGED_EVENT, handler);

    const next: ChatPreferences = {
      showThinking: true,
      showEvents: false,
      showToolExecutions: false,
      showAgentStatus: true,
      showStatusBar: true,
      hideWorkspaces: true,
      bottomMobileNav: true,
    };
    saveChatPreferences(next);
    testTarget.removeEventListener(CHAT_PREFERENCES_CHANGED_EVENT, handler);

    expect(received).toEqual(next);
  });
});
