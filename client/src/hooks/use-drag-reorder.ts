/**
 * useDragReorder — pointer-event-based drag-and-drop reordering.
 *
 * Works on iOS (WKWebView), Android, and desktop.
 * Uses setPointerCapture on the grip handle so the pointer stays captured
 * while the finger/cursor moves, then elementFromPoint to find the drop target.
 *
 * Usage
 * ------
 * const { dragOverIdx, draggingIdx, gripProps, rowDataAttr } = useDragReorder({
 *   items, onReorder,
 * });
 *
 * // Row wrapper  (needs the data attr so elementFromPoint can identify it)
 * <div {...rowDataAttr(idx)} className={dragOverIdx === idx ? "ring-2 ..." : ""}>
 *   // Grip handle  (pointer events live here)
 *   <div {...gripProps(idx)} className="cursor-grab touch-none">
 *     <GripVertical />
 *   </div>
 *   ...content...
 * </div>
 *
 * For items scoped to a category pass `group`:
 *   useDragReorder({ items, onReorder, group: cat })
 * and add data-drag-group={cat} on each row (rowDataAttr does it automatically).
 */

import { useRef, useState, useEffect, useCallback } from "react";

interface Options<T> {
  items: T[];
  onReorder: (newItems: T[]) => void;
  /** When provided only rows with matching data-drag-group are valid drop targets. */
  group?: string;
  /** data attribute name used to identify rows. Default: "data-drag-idx" */
  idAttr?: string;
}

export function useDragReorder<T>({
  items,
  onReorder,
  group,
  idAttr = "data-drag-idx",
}: Options<T>) {
  // Keep refs so closure inside pointer handlers always sees latest values.
  const itemsRef = useRef(items);
  const onReorderRef = useRef(onReorder);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { onReorderRef.current = onReorder; }, [onReorder]);

  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const fromRef = useRef<number | null>(null);

  /** Find the drag-index of the element at (x, y), respecting optional group scope. */
  const findIdx = useCallback((x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const row = el.closest(`[${idAttr}]`) as HTMLElement | null;
    if (!row) return null;
    if (group !== undefined) {
      const rowGroup = row.getAttribute("data-drag-group");
      if (rowGroup !== group) return null;
    }
    const idx = parseInt(row.getAttribute(idAttr) ?? "", 10);
    return isNaN(idx) ? null : idx;
  }, [idAttr, group]);

  const doReorder = useCallback((from: number, to: number) => {
    if (from === to) return;
    const next = [...itemsRef.current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorderRef.current(next);
  }, []);

  const cleanup = useCallback(() => {
    document.body.style.userSelect = "";
    (document.body.style as any).webkitUserSelect = "";
  }, []);

  /** Props for the grip icon element. */
  const gripProps = useCallback((idx: number) => ({
    onPointerDown(e: React.PointerEvent) {
      // Only left-button on mouse; accept any pointer type for touch/stylus.
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();           // ← kills text selection / context menu
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      fromRef.current = idx;
      setDraggingIdx(idx);
      document.body.style.userSelect = "none";
      (document.body.style as any).webkitUserSelect = "none";
    },
    onPointerMove(e: React.PointerEvent) {
      if (fromRef.current === null) return;
      e.preventDefault();
      setDragOverIdx(findIdx(e.clientX, e.clientY));
    },
    onPointerUp(e: React.PointerEvent) {
      cleanup();
      const from = fromRef.current;
      fromRef.current = null;
      setDraggingIdx(null);
      setDragOverIdx(prev => {
        if (from !== null && prev !== null) doReorder(from, prev);
        return null;
      });
    },
    onPointerCancel() {
      cleanup();
      fromRef.current = null;
      setDraggingIdx(null);
      setDragOverIdx(null);
    },
    // Prevent the browser's default drag-image on desktop.
    onDragStart(e: React.DragEvent) { e.preventDefault(); },
    style: { touchAction: "none" } as React.CSSProperties,
  }), [findIdx, doReorder, cleanup]);

  /** Data attributes for the row wrapper (needed by elementFromPoint). */
  const rowDataAttr = useCallback((idx: number): Record<string, string | number> => {
    const attrs: Record<string, string | number> = { [idAttr]: idx };
    if (group !== undefined) attrs["data-drag-group"] = group;
    return attrs;
  }, [idAttr, group]);

  return { dragOverIdx, draggingIdx, gripProps, rowDataAttr };
}
