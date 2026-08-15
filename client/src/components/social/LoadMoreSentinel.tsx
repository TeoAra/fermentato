/**
 * LoadMoreSentinel — shared infinite-scroll trigger for social feeds.
 * Uses an IntersectionObserver to auto-fetch the next page, with a
 * "Carica altri" fallback button when the observer doesn't fire.
 */
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

interface LoadMoreSentinelProps {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  /** Optional text shown when there are no more items. */
  endLabel?: string;
}

export function LoadMoreSentinel({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  endLabel,
}: LoadMoreSentinelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          onLoadMore();
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  if (!hasNextPage) {
    return endLabel ? (
      <p className="text-center text-xs text-stone-400 py-6">{endLabel}</p>
    ) : null;
  }

  return (
    <div ref={ref} className="py-4 flex justify-center">
      {isFetchingNextPage ? (
        <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
      ) : (
        <button
          onClick={onLoadMore}
          className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-full px-5 py-2 transition-colors"
        >
          Carica altri
        </button>
      )}
    </div>
  );
}
