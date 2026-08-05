import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { ExternalLink, Clock, Rss, TrendingUp } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { it } from "date-fns/locale";

interface NewsItem {
  id: number;
  title: string;
  link: string;
  summary: string | null;
  image_url: string | null;
  published_at: string | null;
  source_name: string;
}

const SOURCE_COLORS: Record<string, string> = {
  "Cronache di Birra": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  "Fermento Birra": "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  "Birra Nostra": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  "Malto Graduale": "bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-300",
};
const getSourceColor = (source: string) =>
  SOURCE_COLORS[source] ?? "bg-primary/10 text-primary dark:bg-primary/20";

function SkeletonFeatured() {
  return (
    <div className="animate-pulse rounded-3xl overflow-hidden bg-stone-200 dark:bg-stone-800/60 h-72 sm:h-96" />
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl overflow-hidden bg-stone-200/60 dark:bg-stone-800/40 h-52" />
  );
}

function FeaturedArticle({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block rounded-3xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.5)] hover:shadow-[0_12px_50px_rgba(0,0,0,0.18)] dark:hover:shadow-[0_12px_50px_rgba(0,0,0,0.6)] transition-all duration-300"
    >
      {item.image_url ? (
        <div className="relative h-72 sm:h-96">
          <img
            src={item.image_url}
            alt={item.title}
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.classList.add("bg-gradient-to-br", "from-amber-400", "to-orange-500"); (e.target as HTMLImageElement).style.display = "none"; }}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
            <SourceBadge source={item.source_name} featured />
            <h2 className="mt-2 font-black text-white text-xl sm:text-3xl leading-snug font-poppins drop-shadow-sm line-clamp-3">
              {item.title}
            </h2>
            {item.summary && (
              <p className="mt-2 text-sm text-white/80 line-clamp-2 hidden sm:block leading-relaxed">
                {item.summary}
              </p>
            )}
            <div className="mt-3 flex items-center gap-3">
              {item.published_at && (
                <span className="text-xs text-white/60 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(item.published_at), { addSuffix: true, locale: it })}
                </span>
              )}
              <span className="text-xs font-semibold text-amber-300 flex items-center gap-1 group-hover:gap-2 transition-all">
                Leggi articolo <ExternalLink className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative h-72 sm:h-80 bg-gradient-to-br from-amber-500 to-orange-600 p-6 sm:p-10 flex flex-col justify-end">
          <div className="absolute top-6 right-6 opacity-10">
            <TrendingUp className="w-32 h-32 text-white" />
          </div>
          <SourceBadge source={item.source_name} featured />
          <h2 className="mt-3 font-black text-white text-xl sm:text-3xl leading-snug font-poppins line-clamp-4">
            {item.title}
          </h2>
          <div className="mt-3 flex items-center gap-3">
            {item.published_at && (
              <span className="text-xs text-white/70 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(item.published_at), { addSuffix: true, locale: it })}
              </span>
            )}
            <span className="text-xs font-semibold text-white/90 flex items-center gap-1">
              Leggi <ExternalLink className="w-3 h-3" />
            </span>
          </div>
        </div>
      )}
    </a>
  );
}

function SourceBadge({ source, featured }: { source: string; featured?: boolean }) {
  return (
    <span
      className={`inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
        featured
          ? "bg-white/20 text-white backdrop-blur-sm border border-white/20"
          : getSourceColor(source)
      }`}
    >
      {source}
    </span>
  );
}

function ArticleCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col bg-white dark:bg-[#1A1D24] rounded-2xl overflow-hidden border border-stone-100 dark:border-white/[0.06] shadow-[0_2px_16px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)] hover:shadow-[0_6px_28px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_6px_28px_rgba(0,0,0,0.45)] hover:border-primary/20 transition-all duration-200 active:scale-[0.98]"
    >
      {item.image_url && (
        <div className="relative overflow-hidden h-40 sm:h-44 flex-shrink-0 bg-stone-100 dark:bg-stone-800">
          <img
            src={item.image_url}
            alt={item.title}
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      )}
      <div className="flex flex-col flex-1 p-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <SourceBadge source={item.source_name} />
          {item.published_at && (
            <span className="text-[10px] text-stone-400 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {formatDistanceToNow(new Date(item.published_at), { addSuffix: true, locale: it })}
            </span>
          )}
        </div>
        <h2 className="font-bold text-sm text-stone-900 dark:text-stone-50 leading-snug font-poppins group-hover:text-primary transition-colors duration-150 line-clamp-3 flex-1">
          {item.title}
        </h2>
        {item.summary && (
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 line-clamp-2 leading-relaxed hidden sm:block">
            {item.summary}
          </p>
        )}
        <p className="text-[11px] text-primary font-semibold mt-2.5 flex items-center gap-1 group-hover:gap-2 transition-all">
          Leggi articolo <ExternalLink className="w-2.5 h-2.5" />
        </p>
      </div>
    </a>
  );
}

function ArticleRow({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-3 py-3.5 border-b border-stone-100 dark:border-white/[0.05] last:border-0 hover:bg-stone-50/50 dark:hover:bg-white/[0.02] -mx-4 px-4 transition-colors duration-150 rounded-xl"
    >
      {item.image_url ? (
        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-stone-100 dark:bg-stone-800">
          <img
            src={item.image_url}
            alt={item.title}
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="w-16 h-16 rounded-xl flex-shrink-0 bg-gradient-to-br from-primary/20 to-amber-200 dark:from-primary/30 dark:to-amber-900/30 flex items-center justify-center">
          <Rss className="w-6 h-6 text-primary/60" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <SourceBadge source={item.source_name} />
          {item.published_at && (
            <span className="text-[10px] text-stone-400 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {formatDistanceToNow(new Date(item.published_at), { addSuffix: true, locale: it })}
            </span>
          )}
        </div>
        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-snug font-poppins group-hover:text-primary transition-colors line-clamp-2">
          {item.title}
        </h3>
        <p className="text-[11px] text-primary font-semibold mt-1 flex items-center gap-1">
          Leggi <ExternalLink className="w-2.5 h-2.5" />
        </p>
      </div>
    </a>
  );
}

export default function NewsPage() {
  const { data: items = [], isLoading } = useQuery<NewsItem[]>({
    queryKey: ["/api/news"],
  });

  const [featured, ...rest] = items;
  const gridItems = rest.slice(0, 4);
  const listItems = rest.slice(4);

  return (
    <div className="min-h-screen bg-[hsl(36,10%,96%)] dark:bg-[#0B0D10] pb-28">
      <Helmet>
        <title>News birra artigianale | Fermenta.to</title>
        <meta name="description" content="Le ultime notizie dal mondo della birra artigianale italiana, aggregate dai migliori blog e magazine di settore." />
      </Helmet>

      {/* Header */}
      <header className="bg-white/80 dark:bg-[#0B0D10]/80 backdrop-blur-xl border-b border-stone-100/80 dark:border-white/[0.05] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center">
              <Rss className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-black font-poppins text-stone-900 dark:text-white leading-tight">News birra</h1>
              <p className="text-[10px] text-stone-400 leading-tight">Magazine italiani di settore</p>
            </div>
          </div>
          {!isLoading && items.length > 0 && (
            <span className="text-xs font-semibold text-stone-400 bg-stone-100 dark:bg-stone-800 px-2.5 py-1 rounded-full">
              {items.length} articoli
            </span>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-8">

        {isLoading ? (
          <>
            <SkeletonFeatured />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mx-auto mb-4">
              <Rss className="w-7 h-7 text-stone-300 dark:text-stone-600" />
            </div>
            <p className="font-bold text-stone-500 dark:text-stone-400">Nessuna news ancora</p>
            <p className="text-xs text-stone-400 mt-1">Le news arrivano automaticamente ogni 30 minuti.</p>
          </div>
        ) : (
          <>
            {/* Featured */}
            {featured && <FeaturedArticle item={featured} />}

            {/* Grid 2×2 */}
            {gridItems.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-1 h-5 rounded-full bg-primary block" />
                  <h2 className="text-sm font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Ultime notizie
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {gridItems.map((item) => (
                    <ArticleCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )}

            {/* Remaining as compact rows */}
            {listItems.length > 0 && (
              <section className="bg-white dark:bg-[#1A1D24] rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)] border border-stone-100 dark:border-white/[0.06]">
                <div className="flex items-center gap-2 mb-2 pb-3 border-b border-stone-100 dark:border-white/[0.05]">
                  <span className="w-1 h-5 rounded-full bg-stone-300 dark:bg-stone-600 block" />
                  <h2 className="text-sm font-black uppercase tracking-wider text-stone-400 dark:text-stone-500">
                    Più vecchie
                  </h2>
                </div>
                {listItems.map((item) => (
                  <ArticleRow key={item.id} item={item} />
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
