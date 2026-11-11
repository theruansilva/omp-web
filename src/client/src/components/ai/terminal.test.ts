import { describe, expect, it } from "bun:test";
import { parseAnsi } from "./terminal";

describe("parseAnsi", () => {
  it("keeps foreground colors per run and resets on 0", () => {
    expect(parseAnsi("\u001b[32m✓\u001b[0m ok \u001b[31mfail\u001b[39m!")).toEqual([
      { text: "✓", color: "#34d399" },
      { text: " ok " },
      { text: "fail", color: "#f87171" },
      { text: "!" },
    ]);
  });

  it("drops unsupported sequences without leaking escape bytes", () => {
    expect(parseAnsi("\u001b[1mbold\u001b[0m plain")).toEqual([{ text: "bold" }, { text: " plain" }]);
  });
});
