import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Newspaper, ExternalLink, Clock, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { it as itLocale } from "date-fns/locale";

interface NewsItem {
  id: number;
  title: string;
  link: string;
  summary: string | null;
  image_url: string | null;
  published_at: string | null;
  source_name: string;
}

interface NewsStripProps {
  variant?: "home" | "hero";
  limit?: number;
  className?: string;
}

export default function NewsStrip({ variant = "home", limit = 6, className = "" }: NewsStripProps) {
  const { data: items = [], isLoading } = useQuery<NewsItem[]>({
    queryKey: ["/api/news"],
    staleTime: 5 * 60 * 1000,
  });

  const visible = items.slice(0, limit);

  if (!isLoading && visible.length === 0) return null;

  const isHero = variant === "hero";

  return (
    <section
      className={`${className} ${isHero ? "" : "mb-6"}`}
      aria-label="Ultime news birra artigianale"
      data-testid="news-strip"
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className={`flex items-center gap-2 font-black font-poppins ${isHero ? "text-base text-stone-900 dark:text-white" : "section-title"}`}>
          <span className={`${isHero ? "w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center" : "w-1.5 h-5 rounded-full bg-primary flex-shrink-0"}`}>
            {isHero && <Newspaper className="w-3.5 h-3.5 text-primary" />}
          </span>
          News dal mondo craft
        </h2>
        <Link href="/news" data-testid="link-news-all">
          <button className="text-primary text-xs font-bold flex items-center gap-0.5 tap-scale">
            Tutte <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </Link>
      </div>

      <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
        <div className="flex gap-3 pb-2 snap-x snap-mandatory">
          {isLoading
            ? [...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-44 w-64 sm:w-72 rounded-2xl flex-shrink-0" />
              ))
            : visible.map((n) => (
                <a
                  key={n.id}
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`news-item-${n.id}`}
                  className="snap-start flex-shrink-0 w-64 sm:w-72 bg-white dark:bg-[hsl(220,5%,18%)] rounded-2xl shadow-card-sm hover:shadow-card transition-shadow overflow-hidden border border-stone-100 dark:border-stone-800"
                >
                  {n.image_url ? (
                    <div className="w-full h-28 bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <img src={n.image_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-full h-28 bg-gradient-to-br from-primary/15 to-amber-200/30 dark:from-primary/25 dark:to-amber-900/20 flex items-center justify-center">
                      <Newspaper className="w-8 h-8 text-primary/60" />
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full truncate max-w-[60%]">
                        {n.source_name}
                      </span>
                      {n.published_at && (
                        <span className="text-[10px] text-stone-400 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {formatDistanceToNow(new Date(n.published_at), { addSuffix: true, locale: itLocale })}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-stone-900 dark:text-stone-50 line-clamp-2 leading-snug font-poppins">
                      {n.title}
                    </h3>
                    <p className="text-[11px] text-primary font-semibold mt-1.5 flex items-center gap-1">
                      Leggi <ExternalLink className="w-3 h-3" />
                    </p>
                  </div>
                </a>
              ))}
        </div>
      </div>
    </section>
  );
}
