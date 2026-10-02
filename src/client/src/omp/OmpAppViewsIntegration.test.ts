import { describe, expect, it } from "bun:test";
import "./OmpApp";
import { OmpApp } from "./OmpApp";

type TestableOmpApp = {
  activeTab: string;
  renderActiveView: () => unknown;
  getHeaderTitle: () => string;
};

describe("OmpApp renderActiveView for new pages", () => {
  it("renders omp-terminal-view when activeTab is terminal", () => {
    const app = new OmpApp();
    const testApp = app as unknown as TestableOmpApp;
    testApp.activeTab = "terminal";
    const rendered = testApp.renderActiveView();
    expect(rendered).toBeDefined();
    const str = JSON.stringify(rendered);
    expect(str).toContain("omp-terminal-view");
  });

  it("renders omp-files-view when activeTab is files", () => {
    const app = new OmpApp();
    const testApp = app as unknown as TestableOmpApp;
    testApp.activeTab = "files";
    const rendered = testApp.renderActiveView();
    expect(rendered).toBeDefined();
    const str = JSON.stringify(rendered);
    expect(str).toContain("omp-files-view");
  });

  it("renders omp-usage-view when activeTab is usage", () => {
    const app = new OmpApp();
    const testApp = app as unknown as TestableOmpApp;
    testApp.activeTab = "usage";
    const rendered = testApp.renderActiveView();
    expect(rendered).toBeDefined();
    const str = JSON.stringify(rendered);
    expect(str).toContain("omp-usage-view");
  });

  it("getHeaderTitle returns correct titles for the new pages", () => {
    const app = new OmpApp();
    const testApp = app as unknown as TestableOmpApp;
    testApp.activeTab = "terminal";
    expect(testApp.getHeaderTitle()).toBe("Terminal");

    testApp.activeTab = "files";
    expect(testApp.getHeaderTitle()).toBe("Arquivos");

    testApp.activeTab = "usage";
    expect(testApp.getHeaderTitle()).toBe("Uso & Métricas");
  });
});
