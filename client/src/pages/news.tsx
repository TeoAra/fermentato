import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { ExternalLink, Clock, Rss, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { cloudinaryUrl, cloudinarySrcSet } from "@/lib/cloudinary";

const PAGE_SIZE = 12;

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
  "Fermento Birra":   "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  "Birra Nostra":     "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  "Malto Graduale":   "bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-300",
};
const getSourceColor = (source: string) =>
  SOURCE_COLORS[source] ?? "bg-primary/10 text-primary dark:bg-primary/20";

function SourceBadge({ source, featured }: { source: string; featured?: boolean }) {
  return (
    <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
      featured
        ? "bg-white/20 text-white backdrop-blur-sm border border-white/20"
        : getSourceColor(source)
    }`}>
      {source}
    </span>
  );
}

function TimeAgo({ date }: { date: string | null }) {
  if (!date) return null;
  return (
    <span className="text-[10px] text-stone-400 flex items-center gap-0.5">
      <Clock className="w-2.5 h-2.5" />
      {formatDistanceToNow(new Date(date), { addSuffix: true, locale: it })}
    </span>
  );
}

/* ── Featured hero (first article on page 1) ── */
function FeaturedArticle({ item }: { item: NewsItem }) {
  return (
    <a href={item.link} target="_blank" rel="noopener noreferrer"
      className="group relative block rounded-3xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.5)] hover:shadow-[0_14px_50px_rgba(0,0,0,0.18)] transition-all duration-300">
      {item.image_url ? (
        <div className="relative h-72 sm:h-[420px]">
          <img src={cloudinaryUrl(item.image_url, 960)} srcSet={cloudinarySrcSet(item.image_url, [480, 768, 960, 1280]) || undefined}
            sizes="(max-width: 640px) calc(100vw - 2rem), 960px" alt={item.title} loading="eager" fetchPriority="high" decoding="async"
            onError={e => { (e.target as HTMLImageElement).parentElement!.classList.add("bg-gradient-to-br","from-amber-400","to-orange-600"); (e.target as HTMLImageElement).style.display="none"; }}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
            <SourceBadge source={item.source_name} featured />
            <h2 className="mt-3 font-black text-white text-2xl sm:text-4xl leading-snug font-poppins drop-shadow-sm line-clamp-3">
              {item.title}
            </h2>
            {item.summary && (
              <p className="mt-2 text-sm text-white/75 line-clamp-2 hidden sm:block leading-relaxed max-w-3xl">{item.summary}</p>
            )}
            <div className="mt-4 flex items-center gap-4">
              <TimeAgo date={item.published_at} />
              <span className="text-xs font-semibold text-amber-300 flex items-center gap-1 group-hover:gap-2 transition-all">
                Leggi articolo <ExternalLink className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative h-72 sm:h-80 bg-gradient-to-br from-amber-500 to-orange-600 p-8 sm:p-12 flex flex-col justify-end">
          <SourceBadge source={item.source_name} featured />
          <h2 className="mt-3 font-black text-white text-2xl sm:text-3xl leading-snug font-poppins line-clamp-4">{item.title}</h2>
          <div className="mt-3 flex items-center gap-4">
            <TimeAgo date={item.published_at} />
            <span className="text-xs font-semibold text-white/90 flex items-center gap-1">Leggi <ExternalLink className="w-3 h-3" /></span>
          </div>
        </div>
      )}
    </a>
  );
}

/* ── Grid card ── */
function ArticleCard({ item }: { item: NewsItem }) {
  return (
    <a href={item.link} target="_blank" rel="noopener noreferrer"
      className="group flex flex-col bg-white dark:bg-[#1A1D24] rounded-2xl overflow-hidden border border-stone-100 dark:border-white/[0.06] shadow-[0_2px_16px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)] hover:shadow-[0_6px_28px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_6px_28px_rgba(0,0,0,0.45)] hover:border-primary/20 transition-all duration-200 active:scale-[0.98]">
      {item.image_url && (
        <div className="relative overflow-hidden h-40 sm:h-44 flex-shrink-0 bg-stone-100 dark:bg-stone-800">
          <img src={cloudinaryUrl(item.image_url, 640)} srcSet={cloudinarySrcSet(item.image_url, [320, 480, 640, 960]) || undefined}
            sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1024px) 50vw, 320px" alt={item.title} loading="lazy" decoding="async"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
        </div>
      )}
      <div className="flex flex-col flex-1 p-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <SourceBadge source={item.source_name} />
          <TimeAgo date={item.published_at} />
        </div>
        <h2 className="font-bold text-sm text-stone-900 dark:text-stone-50 leading-snug font-poppins group-hover:text-primary transition-colors duration-150 line-clamp-3 flex-1">
          {item.title}
        </h2>
        {item.summary && (
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 line-clamp-2 leading-relaxed hidden sm:block">{item.summary}</p>
        )}
        <p className="text-[11px] text-primary font-semibold mt-2.5 flex items-center gap-1 group-hover:gap-2 transition-all">
          Leggi articolo <ExternalLink className="w-2.5 h-2.5" />
        </p>
      </div>
    </a>
  );
}

/* ── Skeleton ── */
function SkeletonCard() {
  return <div className="animate-pulse rounded-2xl bg-stone-200/60 dark:bg-stone-800/40 h-52" />;
}

/* ── Pagination controls ── */
function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-4 pb-2">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="flex items-center gap-1 px-3 h-9 rounded-xl text-sm font-semibold bg-white dark:bg-[#1A1D24] border border-stone-200 dark:border-white/[0.08] text-stone-600 dark:text-stone-300 hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Precedente
      </button>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
          const isActive = p === page;
          const isNear = Math.abs(p - page) <= 1 || p === 1 || p === totalPages;
          if (!isNear) {
            if (p === 2 && page > 3) return <span key={p} className="text-stone-400 px-1">…</span>;
            if (p === totalPages - 1 && page < totalPages - 2) return <span key={p} className="text-stone-400 px-1">…</span>;
            return null;
          }
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`w-9 h-9 rounded-xl text-sm font-bold transition-colors ${
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white dark:bg-[#1A1D24] border border-stone-200 dark:border-white/[0.08] text-stone-600 dark:text-stone-300 hover:border-primary/40"
              }`}
            >
              {p}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="flex items-center gap-1 px-3 h-9 rounded-xl text-sm font-semibold bg-white dark:bg-[#1A1D24] border border-stone-200 dark:border-white/[0.08] text-stone-600 dark:text-stone-300 hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Successiva <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ── Main page ── */
export default function NewsPage() {
  const [page, setPage] = useState(1);

  const { data: items = [], isLoading } = useQuery<NewsItem[]>({
    queryKey: ["/api/news"],
  });

  const totalPages = Math.ceil(Math.max(items.length - 1, 0) / PAGE_SIZE);
  const isFirstPage = page === 1;

  // Page 1: featured (items[0]) + up to PAGE_SIZE grid cards (items[1..PAGE_SIZE])
  // Page 2+: PAGE_SIZE grid cards
  const gridItems = isFirstPage
    ? items.slice(1, PAGE_SIZE + 1)
    : items.slice(1 + (page - 1) * PAGE_SIZE, 1 + page * PAGE_SIZE);

  const featured = isFirstPage ? items[0] : null;

  const handlePageChange = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[hsl(36,10%,96%)] dark:bg-[#0B0D10] pb-28">
      <Helmet>
        <title>News birra artigianale | Fermenta.to</title>
        <meta name="description" content="Le ultime notizie dal mondo della birra artigianale italiana, aggregate dai migliori blog e magazine di settore." />
      </Helmet>

      {/* Header */}
      <header className="bg-white/80 dark:bg-[#0B0D10]/80 backdrop-blur-xl border-b border-stone-100/80 dark:border-white/[0.05] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center">
              <Rss className="w-4 h-4 text-primary" />
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

      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 space-y-6">
        {isLoading ? (
          <>
            <div className="animate-pulse rounded-3xl bg-stone-200 dark:bg-stone-800/60 h-72 sm:h-[420px]" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
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
            {/* Featured — solo pagina 1 */}
            {featured && <FeaturedArticle item={featured} />}

            {/* Griglia articoli */}
            {gridItems.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-1 h-5 rounded-full bg-primary block" />
                  <h2 className="text-sm font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    {isFirstPage ? "Ultime notizie" : `Pagina ${page}`}
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {gridItems.map(item => (
                    <ArticleCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )}

            {/* Paginazione */}
            <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />
          </>
        )}
      </main>
    </div>
  );
}
