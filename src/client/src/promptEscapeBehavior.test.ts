import { describe, expect, it } from "bun:test";
import {
  handlePromptBlurAction,
  handlePromptEscapeAction,
  handlePromptShiftTabAction,
} from "./promptEscapeBehavior";

describe("handlePromptEscapeAction", () => {
  it("closes completions when open and does not trigger onEscape or blur", () => {
    let closed = false;
    let blurred = false;
    let escaped = false;

    const handled = handlePromptEscapeAction(true, {
      closeCompletions: () => {
        closed = true;
      },
      blur: () => {
        blurred = true;
      },
      onEscape: () => {
        escaped = true;
      },
    });

    expect(handled).toBe(true);
    expect(closed).toBe(true);
    expect(blurred).toBe(false);
    expect(escaped).toBe(false);
  });

  it("blurs editor and triggers onEscape when completions are empty", () => {
    let closed = false;
    let blurred = false;
    let escaped = false;

    const handled = handlePromptEscapeAction(false, {
      closeCompletions: () => {
        closed = true;
      },
      blur: () => {
        blurred = true;
      },
      onEscape: () => {
        escaped = true;
      },
    });

    expect(handled).toBe(true);
    expect(closed).toBe(false);
    expect(blurred).toBe(true);
    expect(escaped).toBe(true);
  });
});

describe("handlePromptShiftTabAction", () => {
  it("returns true and skips escape when shift indentation succeeds", () => {
    let escapeCalled = false;
    const handled = handlePromptShiftTabAction(true, () => {
      escapeCalled = true;
      return true;
    });

    expect(handled).toBe(true);
    expect(escapeCalled).toBe(false);
  });

  it("delegates to escape action when shift indentation returns false", () => {
    let escapeCalled = false;
    const handled = handlePromptShiftTabAction(false, () => {
      escapeCalled = true;
      return true;
    });

    expect(handled).toBe(true);
    expect(escapeCalled).toBe(true);
  });
});

describe("handlePromptBlurAction", () => {
  it("triggers onEscape when relatedTarget is null or undefined", () => {
    let count = 0;
    handlePromptBlurAction(null, () => {
      count++;
    });
    handlePromptBlurAction(undefined, () => {
      count++;
    });

    expect(count).toBe(2);
  });

  it("does not trigger onEscape when relatedTarget is an element", () => {
    let count = 0;
    handlePromptBlurAction({}, () => {
      count++;
    });

    expect(count).toBe(0);
  });
});
