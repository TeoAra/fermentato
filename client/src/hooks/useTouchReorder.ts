/**
 * useTouchReorder / useTouchReorderInGroup
 *
 * Touch-based drag-and-drop for iOS (WKWebView / Capacitor) where the native
 * HTML5 drag events are not supported.
 *
 * Design decisions
 * ─────────────────
 * 1. HANDLE-ONLY ACTIVATION — both hooks must be bound to the dedicated
 *    GripVertical drag handle element, not to the entire card/row. The handle
 *    carries `style={{ touchAction: 'none' }}` so the browser opts that touch
 *    out of scroll handling before JS even fires. This guarantees ordinary
 *    scrolling is never disrupted.
 *
 * 2. STOP PROPAGATION — startTouchDrag / startTouchDragInGroup always call
 *    e.stopPropagation() so nested sortable zones (e.g. items inside a
 *    category) do not also activate the parent zone's drag path.
 *
 * 3. ZONE ISOLATION via data attributes:
 *    • Flat-list wrappers: data-touch-sort-idx (NO data-touch-sort-group)
 *    • Grouped-item wrappers: data-touch-sort-idx + data-touch-sort-group
 *
 *    useTouchReorder (flat) resolves drop targets via resolveFlatTarget(),
 *    which walks up past any element that carries data-touch-sort-group.
 *    This means dragging a category over an expanded sibling's items still
 *    resolves to the correct category index.
 *
 *    useTouchReorderInGroup resolves drop targets via [data-touch-sort-group]
 *    exclusively, which only matches grouped items — never flat entries.
 *
 * 4. DRAG GHOST — on touchstart a semi-transparent clone of the row is
 *    appended to <body> and positioned fixed so it follows the finger.
 *    It is removed on touchend / touchcancel.
 *
 * Usage – flat list
 * ─────────────────
 *   const { startTouchDrag } = useTouchReorder({
 *     onReorder: (from, to) => { ... },
 *     setDragOver: setDragOverIdx,
 *   });
 *
 *   // Outer wrapper: only needs the data attribute for drop-target lookup
 *   <div data-touch-sort-idx={idx}>
 *     // Grip handle: carries the handler and touch-action
 *     <div style={{ touchAction: 'none' }} onTouchStart={e => startTouchDrag(e, idx)}>
 *       <GripVertical />
 *     </div>
 *     ...
 *   </div>
 *
 * Usage – items grouped by category
 * ───────────────────────────────────
 *   const { startTouchDragInGroup } = useTouchReorderInGroup({
 *     onReorder: (group, fromIdx, toIdx) => { ... },
 *     setDragOver: setItemDragOver,
 *   });
 *
 *   <div data-touch-sort-idx={itemIdx} data-touch-sort-group={groupKey}>
 *     <div style={{ touchAction: 'none' }}
 *          onTouchStart={e => startTouchDragInGroup(e, groupKey, itemIdx)}>
 *       <GripVertical />
 *     </div>
 *     ...
 *   </div>
 */

import { useRef } from "react";

// ── Ghost drag helpers ────────────────────────────────────────────────────────

/**
 * Create a semi-transparent clone of `sourceEl` positioned at its current
 * screen location. The clone tracks `touchX / touchY` relative to the offset
 * at which the user grabbed the element so it doesn't jump.
 *
 * Returns { ghost, offsetX, offsetY } so the caller can move it on subsequent
 * touchmove events.
 */
function createDragGhost(
  sourceEl: HTMLElement,
  touchX: number,
  touchY: number,
): { ghost: HTMLElement; rect: DOMRect; offsetX: number; offsetY: number } {
  const rect = sourceEl.getBoundingClientRect();
  const offsetX = touchX - rect.left;
  const offsetY = touchY - rect.top;

  const clone = sourceEl.cloneNode(true) as HTMLElement;
  clone.style.cssText = [
    "position:fixed",
    `top:${rect.top}px`,
    `left:${rect.left}px`,
    `width:${rect.width}px`,
    `height:${rect.height}px`,
    "margin:0",
    "opacity:0.75",
    "pointer-events:none",
    "z-index:99999",
    "transform:scale(1.03)",
    "box-shadow:0 8px 28px rgba(0,0,0,0.35)",
    "border-radius:8px",
    "transition:none",
    "will-change:top,left",
  ].join(";");

  document.body.appendChild(clone);
  return { ghost: clone, rect, offsetX, offsetY };
}

/**
 * Reposition an existing ghost clone so it follows the finger.
 */
function moveDragGhost(
  ghost: HTMLElement,
  rect: DOMRect,
  offsetX: number,
  offsetY: number,
  touchX: number,
  touchY: number,
) {
  ghost.style.top = `${touchY - offsetY}px`;
  ghost.style.left = `${touchX - offsetX}px`;
}

/**
 * Remove the ghost clone from the DOM.
 */
function removeDragGhost(ghost: HTMLElement | null) {
  if (ghost && ghost.parentNode) {
    ghost.parentNode.removeChild(ghost);
  }
}

// ── Zone target helpers ───────────────────────────────────────────────────────

/**
 * Resolve a flat-list drop target at (clientX, clientY).
 * Walks up the DOM looking for [data-touch-sort-idx] but skips any element
 * that ALSO carries data-touch-sort-group (those belong to an inner grouped
 * sortable and must not be mistaken for flat-list category targets).
 */
function resolveFlatTarget(clientX: number, clientY: number): HTMLElement | null {
  const el = document.elementFromPoint(clientX, clientY);
  let node = el?.closest("[data-touch-sort-idx]") as HTMLElement | null;
  while (node && "touchSortGroup" in node.dataset) {
    node = node.parentElement?.closest("[data-touch-sort-idx]") as HTMLElement | null ?? null;
  }
  return node ?? null;
}

/**
 * Resolve a grouped-item drop target at (clientX, clientY).
 * Uses [data-touch-sort-group] so it only matches grouped items,
 * never bare flat-list category wrappers.
 */
function resolveGroupedTarget(
  clientX: number,
  clientY: number,
): { toIdx: number; toGroup: string } | null {
  const el = document.elementFromPoint(clientX, clientY);
  const target = el?.closest("[data-touch-sort-group]") as HTMLElement | null;
  if (!target) return null;
  const toIdx = parseInt(target.dataset.touchSortIdx ?? "-1", 10);
  const toGroup = target.dataset.touchSortGroup ?? "";
  if (toIdx < 0) return null;
  return { toIdx, toGroup };
}

// ── Flat list ─────────────────────────────────────────────────────────────────

export function useTouchReorder({
  onReorder,
  setDragOver,
}: {
  onReorder: (from: number, to: number) => void;
  setDragOver: (idx: number | null) => void;
}) {
  const dragFromRef = useRef<number | null>(null);

  /**
   * Attach to the GRIP HANDLE element (not the card/row).
   * The handle must carry style={{ touchAction: 'none' }}.
   */
  const startTouchDrag = (e: React.TouchEvent, idx: number) => {
    // Prevent bubbling to a parent sortable zone (e.g. category drag when
    // an item handle is touched inside an expanded category).
    e.stopPropagation();

    dragFromRef.current = idx;

    // ── Ghost setup ──────────────────────────────────────────────────────────
    const touch0 = e.touches[0];
    const rowEl = (e.currentTarget as HTMLElement).closest(
      "[data-touch-sort-idx]",
    ) as HTMLElement | null;

    let ghostInfo: ReturnType<typeof createDragGhost> | null = null;
    if (rowEl) {
      ghostInfo = createDragGhost(rowEl, touch0.clientX, touch0.clientY);
    }

    const handleMove = (ev: TouchEvent) => {
      // touch-action: none on the handle means the browser will not scroll
      // for this gesture; preventDefault() reinforces that for old WebKit.
      ev.preventDefault();
      const touch = ev.touches[0];

      // Move ghost clone
      if (ghostInfo) {
        moveDragGhost(
          ghostInfo.ghost,
          ghostInfo.rect,
          ghostInfo.offsetX,
          ghostInfo.offsetY,
          touch.clientX,
          touch.clientY,
        );
      }

      const target = resolveFlatTarget(touch.clientX, touch.clientY);
      if (target) {
        const toIdx = parseInt(target.dataset.touchSortIdx ?? "-1", 10);
        if (toIdx >= 0) setDragOver(toIdx);
      }
    };

    const handleEnd = (ev: TouchEvent) => {
      const touch = ev.changedTouches[0];
      const from = dragFromRef.current;
      dragFromRef.current = null;
      setDragOver(null);
      removeDragGhost(ghostInfo?.ghost ?? null);
      ghostInfo = null;
      cleanup();
      if (from === null) return;
      const target = resolveFlatTarget(touch.clientX, touch.clientY);
      if (!target) return;
      const toIdx = parseInt(target.dataset.touchSortIdx ?? "-1", 10);
      if (toIdx < 0 || toIdx === from) return;
      onReorder(from, toIdx);
    };

    const handleCancel = () => {
      dragFromRef.current = null;
      setDragOver(null);
      removeDragGhost(ghostInfo?.ghost ?? null);
      ghostInfo = null;
      cleanup();
    };

    const cleanup = () => {
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
      document.removeEventListener("touchcancel", handleCancel);
    };

    document.addEventListener("touchmove", handleMove, { passive: false });
    document.addEventListener("touchend", handleEnd);
    document.addEventListener("touchcancel", handleCancel);
  };

  return { startTouchDrag };
}

// ── Grouped list ──────────────────────────────────────────────────────────────

export function useTouchReorderInGroup({
  onReorder,
  setDragOver,
}: {
  /** Called only when from and to share the same group. */
  onReorder: (group: string, fromIdx: number, toIdx: number) => void;
  setDragOver: (state: { group: string; idx: number } | null) => void;
}) {
  const dragFromRef = useRef<{ group: string; idx: number } | null>(null);

  /**
   * Attach to the GRIP HANDLE element (not the card/row).
   * The handle must carry style={{ touchAction: 'none' }}.
   */
  const startTouchDragInGroup = (
    e: React.TouchEvent,
    group: string,
    idx: number,
  ) => {
    // Stop propagation so a parent sortable zone (e.g. category drag) is
    // not also activated.
    e.stopPropagation();

    dragFromRef.current = { group, idx };

    // ── Ghost setup ──────────────────────────────────────────────────────────
    const touch0 = e.touches[0];
    const rowEl = (e.currentTarget as HTMLElement).closest(
      "[data-touch-sort-group]",
    ) as HTMLElement | null;

    let ghostInfo: ReturnType<typeof createDragGhost> | null = null;
    if (rowEl) {
      ghostInfo = createDragGhost(rowEl, touch0.clientX, touch0.clientY);
    }

    const handleMove = (ev: TouchEvent) => {
      ev.preventDefault();
      const touch = ev.touches[0];

      // Move ghost clone
      if (ghostInfo) {
        moveDragGhost(
          ghostInfo.ghost,
          ghostInfo.rect,
          ghostInfo.offsetX,
          ghostInfo.offsetY,
          touch.clientX,
          touch.clientY,
        );
      }

      const info = resolveGroupedTarget(touch.clientX, touch.clientY);
      if (info) setDragOver({ group: info.toGroup, idx: info.toIdx });
    };

    const handleEnd = (ev: TouchEvent) => {
      const touch = ev.changedTouches[0];
      const from = dragFromRef.current;
      dragFromRef.current = null;
      setDragOver(null);
      removeDragGhost(ghostInfo?.ghost ?? null);
      ghostInfo = null;
      cleanup();
      if (!from) return;
      const info = resolveGroupedTarget(touch.clientX, touch.clientY);
      if (!info) return;
      if (info.toGroup !== from.group || info.toIdx === from.idx) return;
      onReorder(from.group, from.idx, info.toIdx);
    };

    const handleCancel = () => {
      dragFromRef.current = null;
      setDragOver(null);
      removeDragGhost(ghostInfo?.ghost ?? null);
      ghostInfo = null;
      cleanup();
    };

    const cleanup = () => {
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
      document.removeEventListener("touchcancel", handleCancel);
    };

    document.addEventListener("touchmove", handleMove, { passive: false });
    document.addEventListener("touchend", handleEnd);
    document.addEventListener("touchcancel", handleCancel);
  };

  return { startTouchDragInGroup };
}
