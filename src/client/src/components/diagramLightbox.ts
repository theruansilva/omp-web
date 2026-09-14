/**
 * Fullscreen Interactive Diagram Lightbox with Pan & Zoom.
 * Allows inspecting complex Mermaid and SVG diagrams at any scale.
 */

let activeLightbox: HTMLElement | null = null;
let teardownListeners: (() => void) | null = null;

export function openDiagramLightbox(svgContent: string, title = "Diagram Preview"): void {
 closeDiagramLightbox();

 const overlay = document.createElement("div");
 overlay.id = "diagram-lightbox";
 overlay.className = "diagram-lightbox-overlay";
 overlay.setAttribute("role", "dialog");
 overlay.setAttribute("aria-modal", "true");
 overlay.setAttribute("aria-label", title);

 // State
 let scale = 1.0;
 let translateX = 0;
 let translateY = 0;
 let isDragging = false;
 let dragStartX = 0;
 let dragStartY = 0;

 overlay.innerHTML = `
    <style>
      .diagram-lightbox-overlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        background: rgba(10, 14, 20, 0.92);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        color: var(--pi-text, #e6edf3);
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        user-select: none;
        overflow: hidden;
      }
      .diagram-lightbox-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 16px;
        background: var(--pi-surface, #161b22);
        border-bottom: 1px solid var(--pi-border, rgba(255, 255, 255, 0.12));
        z-index: 10;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      .diagram-lightbox-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--pi-text, #e6edf3);
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .diagram-lightbox-badge {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 2px 6px;
        border-radius: 4px;
        background: rgba(88, 166, 255, 0.15);
        color: var(--pi-accent, #58a6ff);
        border: 1px solid rgba(88, 166, 255, 0.25);
      }
      .diagram-lightbox-toolbar {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .diagram-lightbox-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 30px;
        height: 30px;
        padding: 0 8px;
        border: 1px solid var(--pi-border, rgba(255, 255, 255, 0.15));
        border-radius: 6px;
        background: var(--pi-bg, #0d1117);
        color: var(--pi-text, #e6edf3);
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s, color 0.15s;
      }
      .diagram-lightbox-btn:hover {
        background: var(--pi-surface, #21262d);
        border-color: var(--pi-accent, #58a6ff);
        color: var(--pi-accent, #58a6ff);
      }
      .diagram-lightbox-btn.btn-close {
        font-size: 16px;
        margin-left: 6px;
      }
      .diagram-lightbox-btn.btn-close:hover {
        background: rgba(248, 81, 73, 0.15);
        border-color: rgba(248, 81, 73, 0.4);
        color: #f85149;
      }
      .diagram-lightbox-zoom-label {
        font-size: 12px;
        font-variant-numeric: tabular-nums;
        color: var(--pi-muted, #8b949e);
        min-width: 44px;
        text-align: center;
      }
      .diagram-lightbox-viewport {
        flex: 1;
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
      }
      .diagram-lightbox-viewport.is-dragging {
        cursor: grabbing;
      }
      .diagram-lightbox-canvas {
        display: inline-block;
        transform-origin: 0 0;
        will-change: transform;
        transition: none;
      }
      .diagram-lightbox-canvas svg {
        max-width: none !important;
        max-height: none !important;
        display: block;
        filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.25));
      }
      .diagram-lightbox-hint {
        position: absolute;
        bottom: 16px;
        left: 50%;
        transform: translateX(-50%);
        padding: 6px 14px;
        border-radius: 20px;
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.65);
        font-size: 11px;
        pointer-events: none;
        letter-spacing: 0.02em;
        white-space: nowrap;
      }
    </style>
    <div class="diagram-lightbox-header">
      <div class="diagram-lightbox-title">
        <span class="diagram-lightbox-badge">Interactive Viewer</span>
        <span>${escapeText(title)}</span>
      </div>
      <div class="diagram-lightbox-toolbar">
        <button type="button" class="diagram-lightbox-btn" id="dlb-zoom-out" title="Zoom out (−)" aria-label="Zoom out">−</button>
        <span class="diagram-lightbox-zoom-label" id="dlb-zoom-label">100%</span>
        <button type="button" class="diagram-lightbox-btn" id="dlb-zoom-in" title="Zoom in (+)" aria-label="Zoom in">+</button>
        <button type="button" class="diagram-lightbox-btn" id="dlb-reset" title="Reset zoom and center (0)" aria-label="Reset zoom">Reset</button>
        <button type="button" class="diagram-lightbox-btn btn-close" id="dlb-close" title="Close viewer (Esc)" aria-label="Close viewer">✕</button>
      </div>
    </div>
    <div class="diagram-lightbox-viewport" id="dlb-viewport">
      <div class="diagram-lightbox-canvas" id="dlb-canvas">${svgContent}</div>
      <div class="diagram-lightbox-hint">Scroll to zoom · Drag to pan · Double click to reset · Esc to close</div>
    </div>
  `;

 document.body.appendChild(overlay);
 activeLightbox = overlay;

 const viewport = overlay.querySelector<HTMLElement>("#dlb-viewport");
 const canvas = overlay.querySelector<HTMLElement>("#dlb-canvas");
 const zoomLabel = overlay.querySelector<HTMLElement>("#dlb-zoom-label");
 const btnZoomIn = overlay.querySelector<HTMLButtonElement>("#dlb-zoom-in");
 const btnZoomOut = overlay.querySelector<HTMLButtonElement>("#dlb-zoom-out");
 const btnReset = overlay.querySelector<HTMLButtonElement>("#dlb-reset");
 const btnClose = overlay.querySelector<HTMLButtonElement>("#dlb-close");

 if (!viewport || !canvas || !zoomLabel) return;

 const svg = canvas.querySelector("svg");
 if (svg) {
  // Remove fixed inline width/height constraints on the SVG root so it renders sharply at any scale
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.style.overflow = "visible";
 }

 function updateTransform(): void {
  if (!canvas || !zoomLabel) return;
  canvas.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  zoomLabel.textContent = `${Math.round(scale * 100)}%`;
 }

 function centerAndFit(): void {
  if (!viewport || !canvas) return;
  const vpRect = viewport.getBoundingClientRect();
  const cvRect = canvas.getBoundingClientRect();

  // Natural dimensions without transform
  const naturalWidth = svg?.viewBox?.baseVal?.width || cvRect.width || 800;
  const naturalHeight = svg?.viewBox?.baseVal?.height || cvRect.height || 600;

  const scaleX = (vpRect.width * 0.85) / naturalWidth;
  const scaleY = (vpRect.height * 0.85) / naturalHeight;
  scale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 1.5);

  translateX = (vpRect.width - naturalWidth * scale) / 2;
  translateY = (vpRect.height - naturalHeight * scale) / 2;
  updateTransform();
 }

 function zoomBy(factor: number, clientX?: number, clientY?: number): void {
  if (!viewport) return;
  const vpRect = viewport.getBoundingClientRect();
  const targetX = clientX ?? vpRect.left + vpRect.width / 2;
  const targetY = clientY ?? vpRect.top + vpRect.height / 2;

  const newScale = Math.min(Math.max(0.1, scale * factor), 15);
  const mouseX = targetX - vpRect.left;
  const mouseY = targetY - vpRect.top;

  translateX = mouseX - (mouseX - translateX) * (newScale / scale);
  translateY = mouseY - (mouseY - translateY) * (newScale / scale);
  scale = newScale;
  updateTransform();
 }

 // Initial fit
 requestAnimationFrame(() => {
  centerAndFit();
 });

 // Wheel zoom
 const onWheel = (e: WheelEvent): void => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  zoomBy(factor, e.clientX, e.clientY);
 };
 viewport.addEventListener("wheel", onWheel, { passive: false });

 // Drag pan
 const onPointerDown = (e: PointerEvent): void => {
  if (e.button !== 0) return; // Left mouse button only
  isDragging = true;
  dragStartX = e.clientX - translateX;
  dragStartY = e.clientY - translateY;
  viewport.setPointerCapture(e.pointerId);
  viewport.classList.add("is-dragging");
 };

 const onPointerMove = (e: PointerEvent): void => {
  if (!isDragging) return;
  translateX = e.clientX - dragStartX;
  translateY = e.clientY - dragStartY;
  updateTransform();
 };

 const onPointerUp = (e: PointerEvent): void => {
  if (!isDragging) return;
  isDragging = false;
  try {
   viewport.releasePointerCapture(e.pointerId);
  } catch {
   // Ignore if pointer capture already released
  }
  viewport.classList.remove("is-dragging");
 };

 viewport.addEventListener("pointerdown", onPointerDown);
 viewport.addEventListener("pointermove", onPointerMove);
 viewport.addEventListener("pointerup", onPointerUp);
 viewport.addEventListener("pointercancel", onPointerUp);

 // Double click to reset / fit
 const onDblClick = (e: MouseEvent): void => {
  if (e.target === viewport || canvas.contains(e.target as Node)) {
   centerAndFit();
  }
 };
 viewport.addEventListener("dblclick", onDblClick);

 // Toolbar buttons
 btnZoomIn?.addEventListener("click", () => { zoomBy(1.25); });
 btnZoomOut?.addEventListener("click", () => { zoomBy(1 / 1.25); });
 btnReset?.addEventListener("click", () => { centerAndFit(); });
 btnClose?.addEventListener("click", () => { closeDiagramLightbox(); });

 // Keyboard navigation
 const onKeyDown = (e: KeyboardEvent): void => {
  if (e.key === "Escape") {
   e.preventDefault();
   closeDiagramLightbox();
  } else if (e.key === "+" || e.key === "=") {
   e.preventDefault();
   zoomBy(1.25);
  } else if (e.key === "-" || e.key === "_") {
   e.preventDefault();
   zoomBy(1 / 1.25);
  } else if (e.key === "0") {
   e.preventDefault();
   centerAndFit();
  }
 };
 window.addEventListener("keydown", onKeyDown);

 teardownListeners = () => {
  viewport.removeEventListener("wheel", onWheel);
  viewport.removeEventListener("pointerdown", onPointerDown);
  viewport.removeEventListener("pointermove", onPointerMove);
  viewport.removeEventListener("pointerup", onPointerUp);
  viewport.removeEventListener("pointercancel", onPointerUp);
  viewport.removeEventListener("dblclick", onDblClick);
  window.removeEventListener("keydown", onKeyDown);
 };
}

export function closeDiagramLightbox(): void {
 teardownListeners?.();
 teardownListeners = null;
 if (activeLightbox && activeLightbox.parentNode) {
  activeLightbox.parentNode.removeChild(activeLightbox);
 }
 activeLightbox = null;
}

function escapeText(text: string): string {
 return text
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");
}
