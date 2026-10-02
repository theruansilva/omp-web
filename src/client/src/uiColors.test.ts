import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import {
  DEFAULT_UI_COLORS,
  UI_COLOR_PRESETS,
  UI_COLORS_CHANGED_EVENT,
  UI_COLORS_STORAGE_KEY,
  applyUiColors,
  formatCssVarsText,
  loadUiColors,
  resetUiColors,
  resolveUiColorVars,
  saveUiColors,
} from "./uiColors";

describe("uiColors helper", () => {
  let storage: Record<string, string> = {};
  const rootStyles: Record<string, string> = {};
  const rootAttrs: Record<string, string> = {};

  const origDocument = globalThis.document;
  const origLocalStorage = globalThis.localStorage;
  const origWindow = globalThis.window;

  beforeEach(() => {
    storage = {};
    for (const k of Object.keys(rootStyles)) delete rootStyles[k];
    for (const k of Object.keys(rootAttrs)) delete rootAttrs[k];

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

    const mockDocument = {
      documentElement: {
        classList: {
          contains: (cls: string) => cls === "dark",
        },
        getAttribute: (attr: string) => rootAttrs[attr] ?? null,
        setAttribute: (attr: string, val: string) => { rootAttrs[attr] = val; },
        removeAttribute: (attr: string) => { delete rootAttrs[attr]; },
        style: {
          getPropertyValue: (prop: string) => rootStyles[prop] ?? "",
          setProperty: (prop: string, val: string) => { rootStyles[prop] = val; },
          removeProperty: (prop: string) => { delete rootStyles[prop]; },
        },
      },
    };
    Object.defineProperty(globalThis, "document", {
      value: mockDocument,
      writable: true,
      configurable: true,
    });

    const mockWindow = new EventTarget();
    Object.defineProperty(globalThis, "window", {
      value: mockWindow,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    if (origDocument !== undefined) {
      Object.defineProperty(globalThis, "document", { value: origDocument, writable: true, configurable: true });
    } else {
      Reflect.deleteProperty(globalThis, "document");
    }
    if (origLocalStorage !== undefined) {
      Object.defineProperty(globalThis, "localStorage", { value: origLocalStorage, writable: true, configurable: true });
    } else {
      Reflect.deleteProperty(globalThis, "localStorage");
    }
    if (origWindow !== undefined) {
      Object.defineProperty(globalThis, "window", { value: origWindow, writable: true, configurable: true });
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  });

  it("exports correct default values", () => {
    expect(DEFAULT_UI_COLORS.hue).toBe(264);
    expect(DEFAULT_UI_COLORS.chroma).toBe(0.05);
    expect(DEFAULT_UI_COLORS.enabled).toBe(true);
    expect(UI_COLOR_PRESETS.length).toBeGreaterThan(5);
  });

  it("resolves CSS variables for dark mode", () => {
    const vars = resolveUiColorVars(264, 0.05, false);
    expect(vars["--hue"]).toBe("264");
    expect(vars["--chroma"]).toBe("0.05");
    expect(vars["--bg-dark"]).toContain("oklch(0.1");
    expect(vars["--bg"]).toContain("oklch(0.15");
    expect(vars["--text"]).toContain("oklch(0.96");
    expect(vars["--primary"]).toContain("oklch(0.76");
    expect(vars["--danger"]).toContain("oklch(0.7");
  });

  it("resolves CSS variables for light mode", () => {
    const vars = resolveUiColorVars(264, 0.05, true);
    expect(vars["--hue"]).toBe("264");
    expect(vars["--chroma"]).toBe("0.05");
    expect(vars["--bg-dark"]).toContain("oklch(0.92");
    expect(vars["--bg"]).toContain("oklch(0.96");
    expect(vars["--text"]).toContain("oklch(0.15");
    expect(vars["--primary"]).toContain("oklch(0.4");
    expect(vars["--danger"]).toContain("oklch(0.5");
  });

  it("formats CSS variables text correctly", () => {
    const vars = resolveUiColorVars(264, 0.05, false);
    const formatted = formatCssVarsText(vars);
    expect(formatted).toContain("--bg-dark: oklch(0.1");
    expect(formatted).toContain("--primary: oklch(0.76");
    expect(formatted).toContain("--info: oklch(0.7");
  });

  it("loads and saves UI colors in localStorage and dispatches event", () => {
    let eventDetail: unknown = null;
    const listener = (e: Event) => {
      eventDetail = (e as CustomEvent).detail;
    };
    window.addEventListener(UI_COLORS_CHANGED_EVENT, listener);

    saveUiColors({ hue: 200, chroma: 0.1, enabled: true }, false);
    expect(localStorage.getItem(UI_COLORS_STORAGE_KEY)).toContain('"hue":200');
    expect(eventDetail).toEqual({ hue: 200, chroma: 0.1, enabled: true });

    const loaded = loadUiColors();
    expect(loaded.hue).toBe(200);
    expect(loaded.chroma).toBe(0.1);
    expect(loaded.enabled).toBe(true);

    window.removeEventListener(UI_COLORS_CHANGED_EVENT, listener);
  });

  it("applies and cleans up CSS properties on root", () => {
    applyUiColors({ hue: 150, chroma: 0.08, enabled: true }, false);
    expect(document.documentElement.getAttribute("data-ui-colors")).toBe("true");
    expect(document.documentElement.style.getPropertyValue("--hue")).toBe("150");

    applyUiColors({ hue: 150, chroma: 0.08, enabled: false }, false);
    expect(document.documentElement.getAttribute("data-ui-colors")).toBeNull();
    expect(document.documentElement.style.getPropertyValue("--hue")).toBe("");
  });

  it("resets UI colors to defaults", () => {
    saveUiColors({ hue: 30, chroma: 0.2, enabled: true }, false);
    const reset = resetUiColors(false);
    expect(reset.hue).toBe(DEFAULT_UI_COLORS.hue);
    expect(reset.chroma).toBe(DEFAULT_UI_COLORS.chroma);
  });
});
