import { describe, expect, it } from "vitest";

if (typeof globalThis.document === "undefined") {
  Reflect.set(globalThis, "document", {
    createElement: () => ({
      content: {
        querySelectorAll: () => [],
      },
      _html: "",
      set innerHTML(val: string) { this._html = val; },
      get innerHTML(): string { return this._html; },
    }),
  });
}
import { toSafeMarkdownHtml } from "./markdown.js";

describe("toSafeMarkdownHtml", () => {
  it("renders valid mermaid code blocks as ASCII diagrams", () => {
    const markdown = "```mermaid\ngraph TD\n  Client --> Server\n```";
    const html = toSafeMarkdownHtml(markdown);

    expect(html).toContain("mermaid-diagram-wrapper");
    expect(html).toContain("ascii-diagram");
    expect(html).toContain("diagram-badge");
    expect(html).toContain("Mermaid Diagram");
    expect(html).toContain("diagram-toggle-button");
    expect(html).toContain("Client");
    expect(html).toContain("Server");
    expect(html).toContain("mermaid-source");
  });

  it("falls back to standard code block when mermaid syntax is invalid", () => {
    const markdown = "```mermaid\ninvalid mermaid graph syntax !!!\n```";
    const html = toSafeMarkdownHtml(markdown);

    expect(html).not.toContain("mermaid-diagram-wrapper");
    expect(html).toContain('<pre><code class="language-mermaid">');
    expect(html).toContain("invalid mermaid graph syntax");
  });

  it("marks code blocks with box-drawing characters as ascii-diagram", () => {
    const markdown = "```\n┌─────────┐\n│ Service │\n└─────────┘\n```";
    const html = toSafeMarkdownHtml(markdown);

    expect(html).toContain('<pre class="ascii-diagram"><code>');
    expect(html).toContain("Service");
  });

  it("marks code blocks with lang ascii as ascii-diagram", () => {
    const markdown = "```ascii\n[A] -> [B]\n```";
    const html = toSafeMarkdownHtml(markdown);

    expect(html).toContain('<pre class="ascii-diagram"><code class="language-ascii">');
  });

  it("leaves standard code blocks without ascii-diagram class", () => {
    const markdown = "```typescript\nconst a = 1;\n```";
    const html = toSafeMarkdownHtml(markdown);

    expect(html).not.toContain("ascii-diagram");
    expect(html).toContain('<pre><code class="language-typescript">');
  });

  it("renders image with Obsidian-style width syntax ![alt|300](url)", () => {
    const markdown = "![my image|300](/api/preview?path=img.png)";
    const html = toSafeMarkdownHtml(markdown);

    expect(html).toContain('<img src="/api/preview?path=img.png"');
    expect(html).toContain('alt="my image"');
    expect(html).toContain('width="300"');
  });

  it("renders image with Obsidian-style width and height syntax ![alt|300x200](url)", () => {
    const markdown = "![my image|300x200](/api/preview?path=img.png)";
    const html = toSafeMarkdownHtml(markdown);

    expect(html).toContain('width="300"');
    expect(html).toContain('height="200"');
    expect(html).toContain('alt="my image"');
  });

  it("renders image with standalone dimension ![300](url)", () => {
    const markdown = "![300](/api/preview?path=img.png)";
    const html = toSafeMarkdownHtml(markdown);

    expect(html).toContain('width="300"');
    expect(html).toContain('alt=""');
  });
});
