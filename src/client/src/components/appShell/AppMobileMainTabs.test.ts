import { describe, expect, it, vi } from "vitest";
import type { TemplateResult } from "lit";
import { AppMobileMainTabs } from "./AppMobileMainTabs";

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

function collectTemplateContent(template: TemplateResult): string[] {
  const parts: string[] = [];
  function walk(node: unknown): void {
    if (typeof node === "string") {
      parts.push(node);
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

describe("AppMobileMainTabs", () => {
  it("defaults bottom to false and reflects when true", () => {
    const tabs = new AppMobileMainTabs();
    expect(tabs.bottom).toBe(false);
    tabs.bottom = true;
    expect(tabs.bottom).toBe(true);
  });

  it("renders actions button when onShowActions is set", () => {
    const tabs = new AppMobileMainTabs();
    tabs.onShowActions = () => undefined;
    const template = tabs.render() as TemplateResult;
    const text = collectTemplateContent(template).join(" ");

    expect(text).toContain("mobile-tabs-actions");
    expect(text).toContain("mobile-action-button");
    expect(text).toContain("has-mobile-actions");
  });

  it("omits actions container when neither onShowActions nor refreshControl is set", () => {
    const tabs = new AppMobileMainTabs();
    const template = tabs.render() as TemplateResult;
    const text = collectTemplateContent(template).join(" ");

    expect(text).not.toContain("mobile-tabs-actions");
    expect(text).not.toContain("mobile-action-button");
    expect(text).not.toContain("has-mobile-actions");
  });

  it("sets has-mobile-actions-double when both onShowActions and refreshControl are provided", () => {
    const tabs = new AppMobileMainTabs();
    tabs.onShowActions = () => undefined;
    tabs.refreshControl = "refresh-control-node";
    const template = tabs.render() as TemplateResult;
    const text = collectTemplateContent(template).join(" ");

    expect(text).toContain("has-mobile-actions-double");
  });

  it("calls onShowActions when renderActionsButton is triggered", () => {
    const onShowActions = vi.fn();
    const tabs = new AppMobileMainTabs();
    tabs.onShowActions = onShowActions;

    const buttonTemplate = Reflect.get(tabs, "renderActionsButton").call(tabs) as TemplateResult;
    expect(buttonTemplate).toBeDefined();

    const stopPropagation = vi.fn();
    const clickEvent = { stopPropagation } as unknown as MouseEvent;
    const clickHandler = buttonTemplate.values.find((val: unknown) => typeof val === "function") as (e: MouseEvent) => void;
    clickHandler(clickEvent);

    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(onShowActions).toHaveBeenCalledTimes(1);
  });
});
