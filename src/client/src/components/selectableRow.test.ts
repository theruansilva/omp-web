import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activateSelectableRow, activateSelectableRowFromKeyboard, handleRowTouchEnd, handleRowTouchMove, handleRowTouchStart, handleSelectableRowKeyboard, resetLongPressForTests } from "./selectableRow";

describe("selectable row activation", () => {
  it("activates rows from non-interactive click targets", () => {
    const action = vi.fn();
    activateSelectableRow(eventWithPath(matchTarget(() => false)), action);
    expect(action).toHaveBeenCalledOnce();
  });

  it("preserves contributed links inside rows", () => {
    const action = vi.fn();
    activateSelectableRow(eventWithPath(matchTarget((selector: string) => selector.includes("a[href]"))), action);
    expect(action).not.toHaveBeenCalled();
  });

  it("activates rows from Enter and Space", () => {
    const enterAction = vi.fn();
    const spaceAction = vi.fn();
    const enter = keyboardEventWithPath("Enter", matchTarget(() => false));
    const space = keyboardEventWithPath(" ", matchTarget(() => false));

    activateSelectableRowFromKeyboard(enter, enterAction);
    activateSelectableRowFromKeyboard(space, spaceAction);

    expect(enterAction).toHaveBeenCalledOnce();
    expect(spaceAction).toHaveBeenCalledOnce();
    expect(enter.preventDefault).toHaveBeenCalledOnce();
    expect(space.preventDefault).toHaveBeenCalledOnce();
  });

  it("does not activate rows from keyboard events inside interactive elements", () => {
    const action = vi.fn();
    const event = keyboardEventWithPath("Enter", matchTarget((selector: string) => selector.includes("button")));

    activateSelectableRowFromKeyboard(event, action);

    expect(action).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("routes row keyboard navigation to adjacent section callbacks", () => {
    const nextSection = vi.fn();
    const event = keyboardEventWithPath("ArrowRight", matchTarget(() => false));

    expect(handleSelectableRowKeyboard(event, { activate: vi.fn(), nextSection })).toBe(true);

    expect(nextSection).toHaveBeenCalledOnce();
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
  });

  it("routes Escape row keyboard navigation to cancel", () => {
    const cancel = vi.fn();
    const event = keyboardEventWithPath("Escape", matchTarget(() => false));

    expect(handleSelectableRowKeyboard(event, { activate: vi.fn(), cancel })).toBe(true);

    expect(cancel).toHaveBeenCalledOnce();
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
  });

  describe("long press handling", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      resetLongPressForTests();
    });

    afterEach(() => {
      resetLongPressForTests();
      vi.useRealTimers();
    });

    it("triggers long press on touch hold", () => {
      const onLongPress = vi.fn();
      const target = matchTarget(() => false) as unknown as HTMLElement;
      const touchEvent = {
        composedPath: () => [target],
        currentTarget: target,
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent;

      handleRowTouchStart(touchEvent, onLongPress);
      vi.advanceTimersByTime(500);

      expect(onLongPress).toHaveBeenCalledWith(target);

      // Click after long press is suppressed
      const action = vi.fn();
      activateSelectableRow(eventWithPath(matchTarget(() => false)), action);
      expect(action).not.toHaveBeenCalled();
    });

    it("cancels long press on finger move", () => {
      const onLongPress = vi.fn();
      const target = matchTarget(() => false) as unknown as HTMLElement;
      const startEvent = {
        composedPath: () => [target],
        currentTarget: target,
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent;
      const moveEvent = {
        touches: [{ clientX: 100, clientY: 130 }],
      } as unknown as TouchEvent;

      handleRowTouchStart(startEvent, onLongPress);
      handleRowTouchMove(moveEvent);
      vi.advanceTimersByTime(500);

      expect(onLongPress).not.toHaveBeenCalled();
    });

    it("cancels long press on touch end before duration", () => {
      const onLongPress = vi.fn();
      const target = matchTarget(() => false) as unknown as HTMLElement;
      const startEvent = {
        composedPath: () => [target],
        currentTarget: target,
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent;
      handleRowTouchStart(startEvent, onLongPress);
      vi.advanceTimersByTime(200);
      handleRowTouchEnd();
      vi.advanceTimersByTime(300);

      expect(onLongPress).not.toHaveBeenCalled();
    });
  });
});

type EventWithPath = Pick<Event, "composedPath">;
type KeyboardEventWithPath = EventWithPath & Pick<KeyboardEvent, "key" | "preventDefault" | "stopPropagation">;
type MatchTarget = EventTarget & Pick<Element, "matches">;

function matchTarget(matches: Element["matches"]): MatchTarget {
  return Object.assign(new EventTarget(), { matches });
}

function eventWithPath(target: MatchTarget): EventWithPath {
  return { composedPath: () => [target] };
}

function keyboardEventWithPath(key: string, target: MatchTarget): KeyboardEventWithPath {
  return { key, preventDefault: vi.fn<() => void>(), stopPropagation: vi.fn<() => void>(), composedPath: () => [target] };
}
