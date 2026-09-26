import type { ReactiveController, ReactiveControllerHost } from "lit";

export const EDGE_SWIPE_THRESHOLD = 80;
export const DIRECTION_LOCK_DEADZONE = 8;
export const FLING_VELOCITY_THRESHOLD = 0.3; // px/ms
export const DRAWER_MAX_WIDTH = 320;
export const DRAWER_VIEWPORT_RATIO = 0.85;

function hasClass(target: unknown, className: string): boolean {
  if (!target || typeof target !== "object" || !("classList" in target)) return false;
  const classList = target.classList;
  if (!classList || typeof classList !== "object" || !("contains" in classList)) return false;
  const contains = classList.contains;
  return typeof contains === "function" && Boolean(contains.call(classList, className));
}

function nodeContains(container: unknown, target: unknown): boolean {
  if (!container || typeof container !== "object" || !("contains" in container)) return false;
  const contains = container.contains;
  return typeof contains === "function" && Boolean(contains.call(container, target));
}

export interface MobileDrawerControllerOptions {
  isMobileNavigationLayout: () => boolean;
  onStateChange?: (open: boolean) => void;
  getDrawerElement?: () => HTMLElement | null | undefined;
}

export class MobileDrawerController implements ReactiveController {
  isOpen = false;
  isDragging = false;
  dragTranslateX = 0;

  private isTracking = false;
  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0;
  private directionLock: "horizontal" | "vertical" | null = null;
  private dragMode: "opening" | "closing" | null = null;
  private listenersAttached = false;

  constructor(
    private readonly host: ReactiveControllerHost,
    private readonly options: MobileDrawerControllerOptions,
  ) {
    host.addController(this);
  }

  hostConnected(): void {
    this.updateListeners();
  }

  hostDisconnected(): void {
    this.removeListeners();
  }

  updateListeners(): void {
    if (typeof window === "undefined") return;
    const shouldAttach = this.options.isMobileNavigationLayout();
    if (shouldAttach && !this.listenersAttached) {
      window.addEventListener("touchstart", this.handleTouchStart, { passive: true });
      window.addEventListener("touchmove", this.handleTouchMove, { passive: false });
      window.addEventListener("touchend", this.handleTouchEnd, { passive: true });
      window.addEventListener("touchcancel", this.handleTouchCancel, { passive: true });
      window.addEventListener("keydown", this.handleKeyDown);
      this.listenersAttached = true;
    } else if (!shouldAttach && this.listenersAttached) {
      this.removeListeners();
      if (this.isOpen) {
        this.isOpen = false;
        this.host.requestUpdate();
      }
    }
  }

  private removeListeners(): void {
    if (typeof window === "undefined" || !this.listenersAttached) return;
    window.removeEventListener("touchstart", this.handleTouchStart);
    window.removeEventListener("touchmove", this.handleTouchMove);
    window.removeEventListener("touchend", this.handleTouchEnd);
    window.removeEventListener("touchcancel", this.handleTouchCancel);
    window.removeEventListener("keydown", this.handleKeyDown);
    this.listenersAttached = false;
  }

  getDrawerWidth(): number {
    if (typeof window === "undefined") return DRAWER_MAX_WIDTH;
    return Math.min(window.innerWidth * DRAWER_VIEWPORT_RATIO, DRAWER_MAX_WIDTH);
  }

  open(): void {
    if (this.isOpen && !this.isDragging) return;
    this.isOpen = true;
    this.isDragging = false;
    this.dragTranslateX = 0;
    this.options.onStateChange?.(true);
    this.host.requestUpdate();
  }

  close(): void {
    if (!this.isOpen && !this.isDragging) return;
    this.isOpen = false;
    this.isDragging = false;
    this.dragTranslateX = -this.getDrawerWidth();
    this.options.onStateChange?.(false);
    this.host.requestUpdate();
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  readonly handleTouchStart = (event: TouchEvent): void => {
    if (!this.options.isMobileNavigationLayout()) return;
    if (event.touches.length !== 1) {
      this.cancelDrag();
      return;
    }

    const touch = event.touches[0];
    if (!touch) return;

    const target = event.target;
    const isInteractive = typeof HTMLElement !== "undefined" && target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, .cm-editor, .xterm"));

    if (!this.isOpen) {
      // Only initiate open if starting within edge threshold
      if (touch.clientX > EDGE_SWIPE_THRESHOLD || isInteractive) {
        return;
      }
      this.dragMode = "opening";
      this.dragTranslateX = -this.getDrawerWidth();
    } else {
      // When drawer is open, dragging can start anywhere on the drawer or backdrop
      const drawerEl = this.options.getDrawerElement?.();
      const touchedDrawer = nodeContains(drawerEl, target);
      const touchedBackdrop = hasClass(target, "mobile-drawer-backdrop");

      if (!touchedDrawer && !touchedBackdrop) {
        return;
      }
      if (isInteractive) {
        return;
      }
      this.dragMode = "closing";
      this.dragTranslateX = 0;
    }

    this.isTracking = true;
    this.isDragging = false;
    this.directionLock = null;
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
  };

  readonly handleTouchMove = (event: TouchEvent): void => {
    if (!this.isTracking || !this.dragMode) return;
    const touch = event.touches[0];
    if (!touch) return;

    const dx = touch.clientX - this.touchStartX;
    const dy = touch.clientY - this.touchStartY;

    if (this.directionLock === null) {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Deadzone: wait until finger moves at least DIRECTION_LOCK_DEADZONE in some direction
      if (absDx < DIRECTION_LOCK_DEADZONE && absDy < DIRECTION_LOCK_DEADZONE) {
        return;
      }

      // Check for horizontal intent (accommodating natural thumb diagonal arc)
      const isHorizontalIntent = this.dragMode === "opening"
        ? (dx > 6 && absDx >= absDy * 0.7)
        : (dx < -6 && absDx >= absDy * 0.7);

      if (isHorizontalIntent) {
        this.directionLock = "horizontal";
        this.isDragging = true;
      } else if (absDy > 10 && absDy > absDx * 1.3) {
        // Clearly vertical movement (scrolling content), cancel tracking
        this.directionLock = "vertical";
        this.isTracking = false;
        this.dragMode = null;
        return;
      } else {
        // Ambiguous trajectory, wait for next touchmove frame
        return;
      }
    }

    if (this.directionLock === "horizontal") {
      if (event.cancelable) {
        event.preventDefault();
      }
      const width = this.getDrawerWidth();
      if (this.dragMode === "opening") {
        this.dragTranslateX = Math.min(0, Math.max(-width, -width + dx));
      } else {
        this.dragTranslateX = Math.min(0, Math.max(-width, dx));
      }
      this.host.requestUpdate();
    }
  };

  readonly handleTouchEnd = (event: TouchEvent): void => {
    if (!this.isTracking && !this.isDragging) return;

    if (this.isDragging && this.dragMode) {
      const dt = Math.max(1, Date.now() - this.touchStartTime);
      const touch = event.changedTouches[0];
      const finalX = touch ? touch.clientX : this.touchStartX;
      const dx = finalX - this.touchStartX;
      const vx = dx / dt;
      const width = this.getDrawerWidth();

      if (this.dragMode === "opening") {
        // Fast swipe right opens, fast swipe left closes, or position threshold
        if (vx > FLING_VELOCITY_THRESHOLD) {
          this.open();
        } else if (vx < -FLING_VELOCITY_THRESHOLD) {
          this.close();
        } else if (this.dragTranslateX > -width * 0.6) {
          this.open();
        } else {
          this.close();
        }
      } else {
        // Closing mode: fast swipe left closes, fast swipe right keeps open
        if (vx < -FLING_VELOCITY_THRESHOLD) {
          this.close();
        } else if (vx > FLING_VELOCITY_THRESHOLD) {
          this.open();
        } else if (this.dragTranslateX < -width * 0.35) {
          this.close();
        } else {
          this.open();
        }
      }
    }

    this.cancelDrag();
    this.host.requestUpdate();
  };

  readonly handleTouchCancel = (): void => {
    this.cancelDrag();
    this.host.requestUpdate();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && this.isOpen) {
      event.preventDefault();
      this.close();
    }
  };

  private cancelDrag(): void {
    this.isTracking = false;
    this.isDragging = false;
    this.directionLock = null;
    this.dragMode = null;
  }

  drawerStyle(): string {
    if (!this.isDragging) return "";
    return `transform: translateX(${this.dragTranslateX}px) !important; transition: none !important;`;
  }

  backdropStyle(): string {
    if (!this.isDragging) return "";
    const width = this.getDrawerWidth();
    const progress = Math.max(0, Math.min(1, (this.dragTranslateX + width) / width));
    return `opacity: ${progress} !important; transition: none !important; pointer-events: ${progress > 0.05 ? "auto" : "none"} !important; visibility: ${progress > 0 ? "visible" : "hidden"} !important;`;
  }

  drawerClass(): string {
    return [
      "mobile-drawer",
      ...(this.isOpen ? ["open"] : []),
      ...(this.isDragging ? ["dragging"] : []),
    ].join(" ");
  }

  backdropClass(): string {
    return [
      "mobile-drawer-backdrop",
      ...(this.isOpen ? ["open"] : []),
      ...(this.isDragging ? ["dragging"] : []),
    ].join(" ");
  }
}
