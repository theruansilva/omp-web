import { describe, expect, it } from "vitest";
import type { TemplateResult } from "lit";
import { CommandPicker } from "./CommandPicker";
import type { CommandOption } from "../api";

interface TemplateStringsNode {
  strings: string[];
}
interface TemplateValuesNode {
  values: unknown[];
}

function hasStrings(node: object): node is TemplateStringsNode {
  return "strings" in node && Array.isArray(node.strings);
}

function hasValues(node: object): node is TemplateValuesNode {
  return "values" in node && Array.isArray(node.values);
}

function collectTemplateText(template: TemplateResult): string[] {
  const parts: string[] = [];
  function walk(node: unknown): void {
    if (typeof node === "string") {
      parts.push(node);
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (typeof node !== "object" || node === null) return;
    if (hasStrings(node)) {
      parts.push(...node.strings);
    }
    if (hasValues(node)) {
      for (const val of node.values) {
        walk(val);
      }
    }
  }
  walk(template);
  return parts;
}

describe("CommandPicker with categories and icons", () => {
  it("renders flat options when no category is supplied", () => {
    const picker = new CommandPicker();
    picker.options = [
      { value: "opt1", label: "Option One" },
      { value: "opt2", label: "Option Two" },
    ];
    const template = picker.render();
    const text = collectTemplateText(template).join(" ");

    expect(text).not.toContain("category-header");
    expect(text).toContain("Option One");
    expect(text).toContain("Option Two");
  });

  it("renders category headers and option icons when provided", () => {
    const picker = new CommandPicker();
    picker.options = [
      {
        value: "antigravity/gemini-3.8-flash",
        label: "gemini-3.8-flash",
        category: "Antigravity",
        icon: "🪐",
        description: "antigravity",
      },
      {
        value: "anthropic/claude-3-7-sonnet",
        label: "claude-3-7-sonnet",
        category: "Claude Code",
        icon: "✦",
        description: "anthropic",
      },
    ];

    const template = picker.render();
    const text = collectTemplateText(template).join(" ");

    expect(text).toContain("category-header");
    expect(text).toContain("Antigravity");
    expect(text).toContain("Claude Code");
    expect(text).toContain("🪐");
    expect(text).toContain("✦");
  });

  it("filters options by category name in search", () => {
    const picker = new CommandPicker();
    picker.options = [
      {
        value: "antigravity/gemini-3.8-flash",
        label: "gemini-3.8-flash",
        category: "Antigravity",
        icon: "🪐",
      },
      {
        value: "anthropic/claude-3-7-sonnet",
        label: "claude-3-7-sonnet",
        category: "Claude Code",
        icon: "✦",
      },
    ];

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- test access to private methods */
    const target = picker as unknown as { query: string; filteredOptions: () => CommandOption[] };
    target.query = "antigravity";

    const filtered = target.filteredOptions();
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.category).toBe("Antigravity");
    expect(filtered[0]?.value).toBe("antigravity/gemini-3.8-flash");
  });
});
