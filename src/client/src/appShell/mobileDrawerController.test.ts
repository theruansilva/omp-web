import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import type { ReactiveControllerHost } from "lit";
import {
  MobileDrawerController,
  EDGE_SWIPE_THRESHOLD,
  DRAWER_MAX_WIDTH,
} from "./mobileDrawerController";

const originalWindow = globalThis.window;

class MockHost implements ReactiveControllerHost {
  updateCount = 0;
  addController(): void { }
  removeController(): void { }
  requestUpdate(): void {
    this.updateCount++;
  }
  updateComplete = Promise.resolve(true);
}

function createTouchEvent(type: string, clientX: number, clientY: number, target: unknown = {}): TouchEvent {
  const touch = {
    clientX,
    clientY,
    identifier: 1,
    pageX: clientX,
    pageY: clientY,
    screenX: clientX,
    screenY: clientY,
    target,
  } as unknown as Touch;

  return {
    type,
    touches: type === "touchend" ? [] : [touch],
    changedTouches: [touch],
    targetTouches: [touch],
    target,
    cancelable: true,
    preventDefault: vi.fn(),
  } as unknown as TouchEvent;
}

describe("MobileDrawerController", () => {
  let host: MockHost;
  let isMobile = true;
  let stateChanges: boolean[] = [];
  const eventListeners = new Map<string, Function[]>();

  beforeEach(() => {
    host = new MockHost();
    isMobile = true;
    stateChanges = [];
    eventListeners.clear();

    const fakeWindow = {
      innerWidth: 400,
      addEventListener: (type: string, fn: Function) => {
        const list = eventListeners.get(type) ?? [];
        list.push(fn);
        eventListeners.set(type, list);
      },
      removeEventListener: (type: string, fn: Function) => {
        const list = eventListeners.get(type) ?? [];
        eventListeners.set(type, list.filter((f) => f !== fn));
      },
    };

    Object.defineProperty(globalThis, "window", { value: fakeWindow, configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "window", { value: originalWindow, configurable: true });
  });

  function createController(drawerEl?: unknown): MobileDrawerController {
    return new MobileDrawerController(host, {
      isMobileNavigationLayout: () => isMobile,
      onStateChange: (open) => {
        stateChanges.push(open);
      },
      getDrawerElement: () => drawerEl as HTMLElement | undefined,
    });
  }

  it("initializes closed and non-dragging", () => {
    const controller = createController();
    expect(controller.isOpen).toBe(false);
    expect(controller.isDragging).toBe(false);
    expect(controller.drawerStyle()).toBe("");
    expect(controller.drawerClass()).toBe("mobile-drawer");
    expect(controller.backdropClass()).toBe("mobile-drawer-backdrop");
  });

  it("calculates drawer width clamped to max 320px", () => {
    const controller = createController();
    // window.innerWidth = 400 -> 400 * 0.85 = 340 -> clamped to 320
    expect(controller.getDrawerWidth()).toBe(DRAWER_MAX_WIDTH);

    // smaller mobile screen (320px wide) -> 320 * 0.85 = 272
    Object.defineProperty(globalThis, "window", { value: { ...globalThis.window, innerWidth: 320 }, configurable: true });
    expect(controller.getDrawerWidth()).toBe(272);
  });

  it("opens and closes programmatically", () => {
    const controller = createController();
    controller.open();
    expect(controller.isOpen).toBe(true);
    expect(stateChanges).toEqual([true]);
    expect(controller.drawerClass()).toContain("open");

    controller.close();
    expect(controller.isOpen).toBe(false);
    expect(stateChanges).toEqual([true, false]);
    expect(controller.drawerClass()).not.toContain("open");

    controller.toggle();
    expect(controller.isOpen).toBe(true);
    controller.toggle();
    expect(controller.isOpen).toBe(false);
  });

  it("ignores edge touch start if touch is past EDGE_SWIPE_THRESHOLD when closed", () => {
    const controller = createController();
    controller.handleTouchStart(createTouchEvent("touchstart", EDGE_SWIPE_THRESHOLD + 10, 100));
    controller.handleTouchMove(createTouchEvent("touchmove", EDGE_SWIPE_THRESHOLD + 50, 100));

    expect(controller.isDragging).toBe(false);
    expect(controller.isOpen).toBe(false);
  });

  it("tracks horizontal drag when touch starts near left edge and drags right", () => {
    const controller = createController();
    controller.handleTouchStart(createTouchEvent("touchstart", 10, 100));
    // Small vertical jitter (< DEADZONE) followed by horizontal drag
    controller.handleTouchMove(createTouchEvent("touchmove", 15, 102));
    controller.handleTouchMove(createTouchEvent("touchmove", 80, 103));

    expect(controller.isDragging).toBe(true);
    expect(controller.dragTranslateX).toBeLessThan(0);
    expect(controller.drawerStyle()).toContain("transform: translateX");
    expect(controller.backdropStyle()).toContain("opacity:");

    // Dragged past threshold (> 60% of width) and release slowly
    controller.handleTouchMove(createTouchEvent("touchmove", 280, 103));
    controller.handleTouchEnd(createTouchEvent("touchend", 280, 103));

    expect(controller.isOpen).toBe(true);
    expect(controller.isDragging).toBe(false);
  });

  it("cancels tracking if touch gesture is primarily vertical (scrolling)", () => {
    const controller = createController();
    controller.handleTouchStart(createTouchEvent("touchstart", 10, 100));
    // Drag primarily vertically: dy = 30, dx = 5
    controller.handleTouchMove(createTouchEvent("touchmove", 15, 130));

    expect(controller.isDragging).toBe(false);

    // Subsequent horizontal moves should be ignored because gesture was cancelled
    controller.handleTouchMove(createTouchEvent("touchmove", 100, 130));
    expect(controller.isDragging).toBe(false);
    expect(controller.isOpen).toBe(false);
  });

  it("supports fast flick to open even if drag distance was short", () => {
    const controller = createController();
    controller.handleTouchStart(createTouchEvent("touchstart", 5, 100));
    controller.handleTouchMove(createTouchEvent("touchmove", 40, 100));

    expect(controller.isDragging).toBe(true);

    // Fast fling right: touchend simulates quick completion
    controller.handleTouchEnd(createTouchEvent("touchend", 40, 100));
    expect(controller.isOpen).toBe(true);
  });

  it("tracks closing drag when drawer is open and touch moves left", () => {
    const fakeDrawer = {
      classList: { contains: () => false },
      closest: () => null,
      contains: (node: unknown) => node === fakeDrawer,
    } as unknown as HTMLElement;

    const controller = createController(fakeDrawer);
    controller.open();
    expect(controller.isOpen).toBe(true);

    // Touch starts inside drawer
    controller.handleTouchStart(createTouchEvent("touchstart", 200, 100, fakeDrawer));
    controller.handleTouchMove(createTouchEvent("touchmove", 120, 100, fakeDrawer));

    expect(controller.isDragging).toBe(true);
    expect(controller.dragTranslateX).toBeLessThan(0);

    // Dragged far left (> 35% closed) and release
    controller.handleTouchMove(createTouchEvent("touchmove", 50, 100, fakeDrawer));
    controller.handleTouchEnd(createTouchEvent("touchend", 50, 100, fakeDrawer));

    expect(controller.isOpen).toBe(false);
    expect(controller.isDragging).toBe(false);
  });

  it("tracks closing drag when touch starts on backdrop", () => {
    const fakeBackdrop = {
      classList: { contains: (cls: string) => cls === "mobile-drawer-backdrop" },
      closest: () => null,
    };

    const controller = createController();
    controller.open();
    expect(controller.isOpen).toBe(true);

    controller.handleTouchStart(createTouchEvent("touchstart", 350, 100, fakeBackdrop));
    controller.handleTouchMove(createTouchEvent("touchmove", 200, 100, fakeBackdrop));

    expect(controller.isDragging).toBe(true);
    controller.handleTouchEnd(createTouchEvent("touchend", 200, 100, fakeBackdrop));
    expect(controller.isOpen).toBe(false);
  });

  it("attaches and detaches listeners based on mobile layout", () => {
    const controller = createController();
    controller.hostConnected();
    expect(eventListeners.get("touchstart")?.length).toBe(1);

    // Switch to desktop
    isMobile = false;
    controller.updateListeners();
    expect(eventListeners.get("touchstart")?.length).toBe(0);

    // Switch back to mobile
    isMobile = true;
    controller.updateListeners();
    expect(eventListeners.get("touchstart")?.length).toBe(1);

    controller.hostDisconnected();
    expect(eventListeners.get("touchstart")?.length).toBe(0);
  });
});
