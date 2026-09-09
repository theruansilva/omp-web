import { describe, expect, it } from "vitest";
import { AppMobileMainTabs } from "./AppMobileMainTabs";

describe("AppMobileMainTabs", () => {
  it("defaults bottom to false and reflects when true", () => {
    const tabs = new AppMobileMainTabs();
    expect(tabs.bottom).toBe(false);
    tabs.bottom = true;
    expect(tabs.bottom).toBe(true);
  });
});
