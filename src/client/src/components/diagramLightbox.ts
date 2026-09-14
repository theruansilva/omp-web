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

 let scale = 1.0;
 let translateX = 0;
 let translateY = 0;
 let isDragging = false;
 let dragStartX = 0;
 let dragStartY = 0;
 let hasDragged = false;

 overlay.innerHTML = `
    <style>
      .diagram-lightbox-overlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        background: rgba(10, 14, 20, 0.95);
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
        cursor: grab;
        background: radial-gradient(circle at center, rgba(22, 27, 34, 0.7) 0%, rgba(10, 14, 20, 0.98) 100%);
      }
      .diagram-lightbox-viewport.is-dragging {
        cursor: grabbing;
      }
      .diagram-lightbox-canvas {
        position: absolute;
        top: 0;
        left: 0;
        transform-origin: 0 0;
        will-change: transform;
        padding: 20px;
        border-radius: 12px;
        background: var(--pi-surface, #161b22);
        border: 1px solid var(--pi-border, rgba(255, 255, 255, 0.12));
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
        box-sizing: content-box;
      }
      .diagram-lightbox-canvas svg {
        display: block !important;
        max-width: none !important;
        max-height: none !important;
        overflow: visible !important;
      }
      .diagram-lightbox-hint {
        position: absolute;
        bottom: 16px;
        left: 50%;
        transform: translateX(-50%);
        padding: 6px 14px;
        border-radius: 20px;
        background: rgba(0, 0, 0, 0.65);
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
 let naturalWidth = 800;
 let naturalHeight = 600;

 if (svg) {
  const vb = svg.viewBox?.baseVal;
  if (vb && vb.width > 0 && vb.height > 0) {
   naturalWidth = vb.width;
   naturalHeight = vb.height;
  } else {
   const widthAttr = parseFloat(svg.getAttribute("width") || "");
   const heightAttr = parseFloat(svg.getAttribute("height") || "");
   if (!isNaN(widthAttr) && widthAttr > 0) naturalWidth = widthAttr;
   if (!isNaN(heightAttr) && heightAttr > 0) naturalHeight = heightAttr;
  }

  svg.style.width = `${naturalWidth}px`;
  svg.style.height = `${naturalHeight}px`;
  svg.setAttribute("width", `${naturalWidth}`);
  svg.setAttribute("height", `${naturalHeight}`);
  svg.style.maxWidth = "none";
  svg.style.maxHeight = "none";
  svg.style.overflow = "visible";
 }

 const pad = 40;
 const totalWidth = naturalWidth + pad;
 const totalHeight = naturalHeight + pad;
 canvas.style.width = `${naturalWidth}px`;
 canvas.style.height = `${naturalHeight}px`;

 function updateTransform(): void {
  if (!canvas || !zoomLabel) return;
  canvas.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;
  zoomLabel.textContent = `${Math.round(scale * 100)}%`;
 }

 function centerAndFit(): void {
  if (!viewport || !canvas) return;
  const vpWidth = viewport.clientWidth || window.innerWidth;
  const vpHeight = viewport.clientHeight || (window.innerHeight - 50);

  const scaleX = (vpWidth * 0.85) / totalWidth;
  const scaleY = (vpHeight * 0.85) / totalHeight;
  scale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.2), 2.0);

  translateX = (vpWidth - totalWidth * scale) / 2;
  translateY = (vpHeight - totalHeight * scale) / 2;
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
 window.setTimeout(() => {
  centerAndFit();
 }, 50);

 // Wheel zoom
 const onWheel = (e: WheelEvent): void => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  zoomBy(factor, e.clientX, e.clientY);
 };
 viewport.addEventListener("wheel", onWheel, { passive: false });

 // Drag pan
 const onPointerDown = (e: PointerEvent): void => {
  if (e.button !== 0) return;
  isDragging = true;
  hasDragged = false;
  dragStartX = e.clientX - translateX;
  dragStartY = e.clientY - translateY;
  viewport.setPointerCapture(e.pointerId);
  viewport.classList.add("is-dragging");
 };

 const onPointerMove = (e: PointerEvent): void => {
  if (!isDragging) return;
  hasDragged = true;
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

 // Close on backdrop click if not dragged
 viewport.addEventListener("click", (e) => {
  if (e.target === viewport && !hasDragged) {
   closeDiagramLightbox();
  }
 });

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
