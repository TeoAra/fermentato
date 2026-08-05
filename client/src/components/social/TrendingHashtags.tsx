import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { TrendingUp, Hash } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TrendingTag {
  tag: string;
  count: number;
}

interface TrendingHashtagsProps {
  limit?: number;
  /** When true, renders a compact horizontal chip strip (for sidebar/hashtag page) */
  compact?: boolean;
}

export default function TrendingHashtags({ limit = 10, compact = false }: TrendingHashtagsProps) {
  const { data: tags = [], isLoading } = useQuery<TrendingTag[]>({
    queryKey: ["/api/microblog/trending-hashtags", limit],
    queryFn: () =>
      fetch(`/api/microblog/trending-hashtags?limit=${limit}`)
        .then(r => (r.ok ? r.json() : [])),
    staleTime: 60 * 60 * 1000, // match server 1h cache
  });

  if (!isLoading && tags.length === 0) return null;

  return (
    <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4">
      <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 mb-3 flex items-center gap-1.5">
        <TrendingUp className="w-3 h-3" /> Trending
      </p>

      {isLoading ? (
        <div className={compact ? "flex flex-wrap gap-2" : "space-y-1.5"}>
          {[...Array(compact ? 6 : 5)].map((_, i) => (
            <Skeleton key={i} className={compact ? "h-7 w-20 rounded-full" : "h-7 w-full rounded-full"} />
          ))}
        </div>
      ) : compact ? (
        /* Horizontal wrap of chips */
        <div className="flex flex-wrap gap-2">
          {tags.map(({ tag, count }) => (
            <Link key={tag} href={`/hashtag/${encodeURIComponent(tag)}`}>
              <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer">
                <Hash className="w-3 h-3 flex-shrink-0" />
                {tag}
                <span className="ml-0.5 text-[10px] font-semibold text-primary/60">{count}</span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        /* Vertical list with count bar */
        <div className="space-y-1.5">
          {tags.map(({ tag, count }, i) => {
            const maxCount = tags[0]?.count ?? 1;
            return (
              <Link key={tag} href={`/hashtag/${encodeURIComponent(tag)}`}>
                <div className="flex items-center gap-2 group cursor-pointer py-0.5">
                  <span className="text-[10px] font-black text-stone-300 dark:text-stone-600 w-4 flex-shrink-0 text-right">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-primary group-hover:underline truncate">
                        #{tag}
                      </span>
                      <span className="text-[10px] text-stone-400 ml-1 flex-shrink-0">{count}</span>
                    </div>
                    <div className="h-0.5 bg-stone-100 dark:bg-[#12151A] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/50 rounded-full"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
