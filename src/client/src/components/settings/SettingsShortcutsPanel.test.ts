import { describe, expect, it } from "vitest";
import type { TemplateResult } from "lit";
import type { OmpWebConfigResponse, OmpWebConfigValues } from "../../api";
import { SettingsShortcutsPanel } from "./SettingsShortcutsPanel";
import type { SettingsNotice } from "./SettingsPanelFrame";

describe("settings-shortcuts-panel layout", () => {
  it("renders header, ordered notices, and shortcut settings through the shared frame", () => {
    const panel = new SettingsShortcutsPanel();
    panel.configResponse = configResponse({ shortcuts: {} });
    panel.error = "Failed to load shortcut settings.";
    panel.savedMessage = "Shortcut settings saved.";

    const template = panel.render();
    const rendered = flattenTemplateContent(template);

    expect(rendered).toContain("<settings-panel-frame");
    expect(frameNotices(template).map((notice) => notice.type)).toEqual(["error", "success"]);
    expectTextOrder(rendered, [
      "Keyboard shortcuts",
      "Edit app shortcuts by action.",
      "<code>mod+k</code>",
      "Reload",
      "Failed to load shortcut settings.",
      "Shortcut settings saved.",
      "Chat composer",
      "Config file",
      "No actions registered.",
    ]);
  });

  it("keeps the prompt-enter card before the loading shortcuts state", () => {
    const panel = new SettingsShortcutsPanel();
    panel.loading = true;

    const rendered = flattenTemplateContent(panel.render());

    expectTextOrder(rendered, ["Keyboard shortcuts", "Chat composer", "Loading shortcuts…"]);
    expect(rendered).not.toContain("Config file");
  });
});

function frameNotices(template: TemplateResult): readonly SettingsNotice[] {
  const notices = collectTemplateValues(template).find(isSettingsNoticeArray);
  if (notices === undefined) throw new Error("Expected settings-panel-frame notices to be rendered");
  return notices;
}

function flattenTemplateContent(template: TemplateResult): string {
  const chunks: string[] = [];
  visitTemplate(template);
  return chunks.join("");

  function visitTemplate(current: TemplateResult): void {
    const strings = templateStrings(current);
    const values = templateValues(current);
    for (let index = 0; index < values.length; index += 1) {
      const staticChunk = strings[index];
      if (staticChunk !== undefined) chunks.push(staticChunk);
      visitValue(values[index]);
    }
    const finalChunk = strings[values.length];
    if (finalChunk !== undefined) chunks.push(finalChunk);
  }

  function visitValue(value: unknown): void {
    if (Array.isArray(value)) {
      for (const item of value) visitValue(item);
      return;
    }
    if (isSettingsNotice(value)) {
      visitValue(value.title);
      visitValue(value.content);
      return;
    }
    if (isTemplateResult(value)) {
      visitTemplate(value);
      return;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      chunks.push(String(value));
    }
  }
}

function collectTemplateValues(template: TemplateResult): unknown[] {
  const values: unknown[] = [];
  visit(template);
  return values;

  function visit(current: unknown): void {
    if (Array.isArray(current)) {
      for (const item of current) visit(item);
      return;
    }
    if (!isTemplateResult(current)) return;
    for (const value of templateValues(current)) {
      values.push(value);
      visit(value);
    }
  }
}

function expectTextOrder(content: string, labels: readonly string[]): void {
  let previousIndex = -1;
  for (const label of labels) {
    const currentIndex = content.indexOf(label, previousIndex + 1);
    if (currentIndex === -1) throw new Error(`Expected rendered content to include ${label}`);
    expect(currentIndex).toBeGreaterThan(previousIndex);
    previousIndex = currentIndex;
  }
}

function templateStrings(template: TemplateResult): readonly string[] {
  const strings = Reflect.get(template, "strings");
  if (!isStringArray(strings)) throw new Error("TemplateResult strings were unavailable");
  return strings;
}

function templateValues(template: TemplateResult): readonly unknown[] {
  const values = Reflect.get(template, "values");
  if (!Array.isArray(values)) throw new Error("TemplateResult values were unavailable");
  return values.map((value: unknown) => value);
}

function isTemplateResult(value: unknown): value is TemplateResult {
  return typeof value === "object" && value !== null && isStringArray(Reflect.get(value, "strings")) && Array.isArray(Reflect.get(value, "values"));
}

function isSettingsNotice(value: unknown): value is SettingsNotice {
  return typeof value === "object" && value !== null && typeof Reflect.get(value, "type") === "string" && Reflect.has(value, "content");
}

function isSettingsNoticeArray(value: unknown): value is readonly SettingsNotice[] {
  return Array.isArray(value) && value.every(isSettingsNotice);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item: unknown) => typeof item === "string");
}

function configResponse(config: OmpWebConfigValues): OmpWebConfigResponse {
  return {
    path: "/tmp/omp-web/config.json",
    exists: true,
    config,
    effectiveConfig: config,
    envOverrides: { host: false, port: false, allowedHosts: false, spawnSessions: false, subsessions: false },
  };
}
