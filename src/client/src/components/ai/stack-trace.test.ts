import { expect, test } from "bun:test";
import { parseStackTrace } from "./stack-trace";

test("parses node trace", () => {
  const p = parseStackTrace("TypeError: boom\n    at foo (/a/b.ts:1:2)\n    at /a/c.ts:3:4\n    at x (node:internal/y:5:6)");
  expect(p.errorType).toBe("TypeError");
  expect(p.message).toBe("boom");
  expect(p.frames.map((f) => [f.fn, f.file, f.line, f.col, f.internal])).toEqual([
    ["foo", "/a/b.ts", 1, 2, false],
    [undefined, "/a/c.ts", 3, 4, false],
    ["x", "node:internal/y", 5, 6, true],
  ]);
});

test("parses python traceback", () => {
  const p = parseStackTrace('Traceback (most recent call last):\n  File "a.py", line 3, in main\n    foo()\nValueError: bad');
  expect(p.errorType).toBe("ValueError");
  expect(p.message).toBe("bad");
  expect(p.frames).toHaveLength(1);
  expect(p.frames[0]).toMatchObject({ fn: "main", file: "a.py", line: 3 });
});
