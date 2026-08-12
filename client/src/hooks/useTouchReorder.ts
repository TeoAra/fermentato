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

    const handleMove = (ev: TouchEvent) => {
      // touch-action: none on the handle means the browser will not scroll
      // for this gesture; preventDefault() reinforces that for old WebKit.
      ev.preventDefault();
      const touch = ev.touches[0];
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
      cleanup();
      if (from === null) return;
      const target = resolveFlatTarget(touch.clientX, touch.clientY);
      if (!target) return;
      const toIdx = parseInt(target.dataset.touchSortIdx ?? "-1", 10);
      if (toIdx < 0 || toIdx === from) return;
      onReorder(from, toIdx);
    };

    const cleanup = () => {
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
      document.removeEventListener("touchcancel", cleanup);
    };

    document.addEventListener("touchmove", handleMove, { passive: false });
    document.addEventListener("touchend", handleEnd);
    document.addEventListener("touchcancel", cleanup);
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

    const handleMove = (ev: TouchEvent) => {
      ev.preventDefault();
      const touch = ev.touches[0];
      const info = resolveGroupedTarget(touch.clientX, touch.clientY);
      if (info) setDragOver({ group: info.toGroup, idx: info.toIdx });
    };

    const handleEnd = (ev: TouchEvent) => {
      const touch = ev.changedTouches[0];
      const from = dragFromRef.current;
      dragFromRef.current = null;
      setDragOver(null);
      cleanup();
      if (!from) return;
      const info = resolveGroupedTarget(touch.clientX, touch.clientY);
      if (!info) return;
      if (info.toGroup !== from.group || info.toIdx === from.idx) return;
      onReorder(from.group, from.idx, info.toIdx);
    };

    const cleanup = () => {
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
      document.removeEventListener("touchcancel", cleanup);
    };

    document.addEventListener("touchmove", handleMove, { passive: false });
    document.addEventListener("touchend", handleEnd);
    document.addEventListener("touchcancel", cleanup);
  };

  return { startTouchDragInGroup };
}
