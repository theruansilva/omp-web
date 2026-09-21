import { describe, expect, it } from "bun:test";
import {
  HIDDEN_PLUGINS_STORAGE_KEY,
  isPanelHidden,
  readStoredHiddenPlugins,
  resetHiddenPlugins,
  setPluginHidden,
  writeStoredHiddenPlugins,
} from "./pluginVisibility";

class MockStorage implements Storage {
  private data: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.data).length;
  }

  clear(): void {
    this.data = {};
  }

  getItem(key: string): string | null {
    return this.data[key] ?? null;
  }

  key(index: number): string | null {
    return Object.keys(this.data)[index] ?? null;
  }

  removeItem(key: string): void {
    Reflect.deleteProperty(this.data, key);
  }

  setItem(key: string, value: string): void {
    this.data[key] = value;
  }
}

describe("pluginVisibility", () => {
  it("reads empty set when nothing is stored or invalid JSON", () => {
    const store = new MockStorage();
    expect(readStoredHiddenPlugins(store)).toEqual(new Set());

    store.setItem(HIDDEN_PLUGINS_STORAGE_KEY, "invalid-json");
    expect(readStoredHiddenPlugins(store)).toEqual(new Set());

    store.setItem(HIDDEN_PLUGINS_STORAGE_KEY, JSON.stringify({ not: "an array" }));
    expect(readStoredHiddenPlugins(store)).toEqual(new Set());
  });

  it("reads and writes hidden plugin IDs", () => {
    const store = new MockStorage();
    const hidden = new Set(["core:workspace.tasks", "mcps:workspace.mcps"]);
    writeStoredHiddenPlugins(hidden, store);

    expect(readStoredHiddenPlugins(store)).toEqual(hidden);
  });

  it("checks if a panel is hidden by panel id or plugin id", () => {
    const hidden = new Set(["core:workspace.tasks", "mcps"]);

    expect(isPanelHidden({ id: "core:workspace.tasks", pluginId: "core" }, hidden)).toBe(true);
    expect(isPanelHidden({ id: "core:workspace.files", pluginId: "core" }, hidden)).toBe(false);
    expect(isPanelHidden({ id: "mcps:workspace.mcps", pluginId: "mcps" }, hidden)).toBe(true);
    expect(isPanelHidden({ id: "usage:workspace.usage", pluginId: "usage" }, hidden)).toBe(false);
  });

  it("hides and unhides plugins", () => {
    const store = new MockStorage();
    let hidden = setPluginHidden("core:workspace.files", true, undefined, store);
    expect(hidden.has("core:workspace.files")).toBe(true);
    expect(readStoredHiddenPlugins(store).has("core:workspace.files")).toBe(true);

    hidden = setPluginHidden("core:workspace.files", false, hidden, store);
    expect(hidden.has("core:workspace.files")).toBe(false);
    expect(readStoredHiddenPlugins(store).has("core:workspace.files")).toBe(false);
  });

  it("resets all hidden plugins", () => {
    const store = new MockStorage();
    writeStoredHiddenPlugins(new Set(["a", "b", "c"]), store);
    expect(readStoredHiddenPlugins(store).size).toBe(3);

    const reset = resetHiddenPlugins(store);
    expect(reset.size).toBe(0);
    expect(readStoredHiddenPlugins(store).size).toBe(0);
  });
  it("filters a list of panels based on hidden IDs", () => {
    const panels = [
      { id: "core:workspace.files", pluginId: "core", title: "Files" },
      { id: "core:workspace.git", pluginId: "core", title: "Git" },
      { id: "mcps:workspace.mcps", pluginId: "mcps", title: "MCPs" },
      { id: "usage:workspace.usage", pluginId: "usage", title: "Usage" },
    ];
    const hidden = new Set(["core:workspace.git", "usage"]);
    const visible = panels.filter((p) => !isPanelHidden(p, hidden));
    expect(visible.map((p) => p.id)).toEqual(["core:workspace.files", "mcps:workspace.mcps"]);
  });
});