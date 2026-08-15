/**
 * useCommunityTimeline — shared paginated timeline for community/social feeds.
 *
 * Paginates the two feed sources independently (check-ins via /api/user/feed and
 * microblog posts via /api/microblog/feed), each with keyset/cursor pagination,
 * then merges the loaded pages into a single time-sorted, de-duplicated timeline.
 *
 * Both endpoints return { items, hasMore, nextCursor }. Cursor paging is immune
 * to the duplicate/skip problems of OFFSET paging over a live feed; the flattened
 * timeline is still defensively de-duplicated by kind+id.
 */
import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

const PAGE_SIZE = 20;

interface FeedPage {
  items: any[];
  hasMore: boolean;
  nextCursor: string | null;
}

export type TimelineEntry =
  | { kind: "checkin"; sortAt: number; data: any }
  | { kind: "post"; sortAt: number; data: any };

async function fetchPage(url: string, cursor: string | null): Promise<FeedPage> {
  const sep = url.includes("?") ? "&" : "?";
  const cursorParam = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
  const r = await fetch(`${url}${sep}limit=${PAGE_SIZE}${cursorParam}`, {
    credentials: "include",
  });
  if (!r.ok) return { items: [], hasMore: false, nextCursor: null };
  const j = await r.json();
  // Backwards-safe: accept either the cursor shape or a bare array
  if (Array.isArray(j)) {
    return { items: j, hasMore: j.length >= PAGE_SIZE, nextCursor: null };
  }
  return {
    items: Array.isArray(j.items) ? j.items : [],
    hasMore: !!j.hasMore,
    nextCursor: typeof j.nextCursor === "string" ? j.nextCursor : null,
  };
}

/** Flatten infinite-query pages and drop duplicate ids (defensive). */
function dedupeById(pages: FeedPage[] | undefined): any[] {
  const seen = new Set<string | number>();
  const out: any[] = [];
  for (const page of pages ?? []) {
    for (const item of page.items) {
      if (item?.id == null || seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

export function useCommunityTimeline(enabled: boolean) {
  const checkins = useInfiniteQuery<FeedPage>({
    queryKey: ["/api/user/feed"],
    enabled,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchPage("/api/user/feed", pageParam as string | null),
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    staleTime: 2 * 60_000,
    refetchInterval: 3 * 60_000,
  });

  const posts = useInfiniteQuery<FeedPage>({
    queryKey: ["/api/microblog/feed"],
    enabled,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchPage("/api/microblog/feed", pageParam as string | null),
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    staleTime: 2 * 60_000,
    refetchInterval: 3 * 60_000,
  });

  const checkinItems = useMemo<any[]>(
    () => dedupeById(checkins.data?.pages),
    [checkins.data],
  );
  const postItems = useMemo<any[]>(
    () => dedupeById(posts.data?.pages),
    [posts.data],
  );

  const timeline = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [
      ...checkinItems.map(
        (it): TimelineEntry => ({
          kind: "checkin",
          sortAt: new Date(it.tasted_at).getTime(),
          data: it,
        }),
      ),
      ...postItems.map(
        (p): TimelineEntry => ({
          kind: "post",
          sortAt: new Date(p.created_at).getTime(),
          data: p,
        }),
      ),
    ].sort((a, b) => b.sortAt - a.sortAt);

    // Defensive de-dupe across merged sources by kind+id.
    const seen = new Set<string>();
    return entries.filter((e) => {
      const key = `${e.kind}:${e.data?.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [checkinItems, postItems]);

  const isLoading = checkins.isLoading || posts.isLoading;
  const hasNextPage = !!checkins.hasNextPage || !!posts.hasNextPage;
  const isFetchingNextPage = checkins.isFetchingNextPage || posts.isFetchingNextPage;

  const fetchNextPage = () => {
    if (checkins.hasNextPage && !checkins.isFetchingNextPage) checkins.fetchNextPage();
    if (posts.hasNextPage && !posts.isFetchingNextPage) posts.fetchNextPage();
  };

  return {
    timeline,
    checkinItems,
    postItems,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  };
}
