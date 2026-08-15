// Keyset/cursor pagination helpers for time-ordered feeds.
// Cursor encodes the last row's (timestamp, id) so subsequent pages fetch
// strictly older rows via WHERE (ts, id) < (cursorTs, cursorId), which is
// immune to the duplicate/skip problems of OFFSET paging over a live feed.

export interface FeedCursor {
  ts: string; // ISO timestamp
  id: number;
}

/** Encode a cursor as "<isoTs>_<id>". */
export function makeFeedCursor(ts: Date | string, id: number | string): string {
  const iso = ts instanceof Date ? ts.toISOString() : new Date(ts).toISOString();
  return `${iso}_${id}`;
}

/**
 * Parse a "<isoTs>_<id>" cursor. Returns null when absent or malformed so
 * callers transparently fall back to "first page" behaviour.
 */
export function parseFeedCursor(raw: string | undefined | null): FeedCursor | null {
  if (!raw || typeof raw !== "string") return null;
  const sep = raw.lastIndexOf("_");
  if (sep <= 0) return null;
  const tsPart = raw.slice(0, sep);
  const idPart = raw.slice(sep + 1);
  const id = parseInt(idPart, 10);
  if (!Number.isFinite(id)) return null;
  const d = new Date(tsPart);
  if (Number.isNaN(d.getTime())) return null;
  return { ts: d.toISOString(), id };
}
