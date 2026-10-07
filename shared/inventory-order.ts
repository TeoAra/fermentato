/** Reorder without mutating input; invalid or no-op drops preserve identity. */
export function moveInventoryItem<T extends { id: number }>(
  items: T[],
  from: number,
  to: number,
  field: "tapNumber" | "orderIndex",
): T[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from === to ||
      from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next.map((item, index) => ({ ...item, [field]: index + (field === "tapNumber" ? 1 : 0) }));
}

/** Only accept a complete, unique permutation of IDs from the authorized list. */
export function isCompleteInventoryOrder(order: unknown, existingIds: number[]): order is { id: number }[] {
  if (!Array.isArray(order) || order.length !== existingIds.length) return false;
  const allowed = new Set(existingIds);
  const seen = new Set<number>();
  return order.every(item => {
    if (!item || !Number.isSafeInteger(item.id) || !allowed.has(item.id) || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
