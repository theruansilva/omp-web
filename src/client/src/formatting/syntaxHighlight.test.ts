import { describe, expect, it } from "bun:test";
import { getLanguageParser, highlightCodeBlock } from "./syntaxHighlight";

describe("syntaxHighlight", () => {
  it("resolves parsers for supported language aliases", () => {
    expect(getLanguageParser("js")).not.toBeNull();
    expect(getLanguageParser("javascript")).not.toBeNull();
    expect(getLanguageParser("ts")).not.toBeNull();
    expect(getLanguageParser("typescript")).not.toBeNull();
    expect(getLanguageParser("tsx")).not.toBeNull();
    expect(getLanguageParser("jsx")).not.toBeNull();
    expect(getLanguageParser("json")).not.toBeNull();
    expect(getLanguageParser("py")).not.toBeNull();
    expect(getLanguageParser("python")).not.toBeNull();
    expect(getLanguageParser("rs")).not.toBeNull();
    expect(getLanguageParser("rust")).not.toBeNull();
    expect(getLanguageParser("go")).not.toBeNull();
    expect(getLanguageParser("html")).not.toBeNull();
    expect(getLanguageParser("css")).not.toBeNull();
    expect(getLanguageParser("md")).not.toBeNull();
  });

  it("returns null for unknown languages", () => {
    expect(getLanguageParser("unknown-lang")).toBeNull();
    expect(getLanguageParser("")).toBeNull();
  });

  it("highlights javascript code with semantic token classes", () => {
    const code = "const message = 'hello'; // comment";
    const result = highlightCodeBlock(code, "javascript");

    expect(result).toContain('class="tok-keyword"');
    expect(result).toContain("const");
    expect(result).toContain('class="tok-string"');
    expect(result).toContain("'hello'");
    expect(result).toContain('class="tok-comment"');
    expect(result).toContain("// comment");
  });

  it("highlights python code", () => {
    const code = "def greet(name):\n    return 42";
    const result = highlightCodeBlock(code, "python");

    expect(result).toContain('class="tok-keyword"');
    expect(result).toContain("def");
    expect(result).toContain('class="tok-number"');
    expect(result).toContain("42");
  });

  it("highlights json code", () => {
    const code = '{"count": 10, "active": true}';
    const result = highlightCodeBlock(code, "json");

    expect(result).toContain('class="tok-propertyName"');
    expect(result).toContain('"count"');
    expect(result).toContain('class="tok-number"');
    expect(result).toContain("10");
    expect(result).toContain('class="tok-bool"');
    expect(result).toContain("true");
  });

  it("escapes html characters in code tokens", () => {
    const code = "if (a < 10 && b > 20) {}";
    const result = highlightCodeBlock(code, "js");

    expect(result).toContain("&lt;");
    expect(result).toContain("&gt;");
    expect(result).toContain("&amp;&amp;");
    expect(result).not.toContain("< 10");
  });

  it("falls back to plain escaped text for unknown or omitted language", () => {
    const raw = "echo '<hello & world>'";
    expect(highlightCodeBlock(raw, "bash")).toBe("echo '&lt;hello &amp; world&gt;'");
    expect(highlightCodeBlock(raw)).toBe("echo '&lt;hello &amp; world&gt;'");
  });

  it("handles malformed code without throwing", () => {
    const broken = "const x = ; function {";
    expect(() => highlightCodeBlock(broken, "javascript")).not.toThrow();
    const result = highlightCodeBlock(broken, "javascript");
    expect(result).toContain('class="tok-keyword"');
    expect(result).toContain("const");
  });
});
