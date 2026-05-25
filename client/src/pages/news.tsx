import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Newspaper, ExternalLink, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
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

export default function NewsPage() {
  const { data: items = [], isLoading } = useQuery<NewsItem[]>({
    queryKey: ["/api/news"],
  });

  return (
    <div className="min-h-screen bg-[hsl(36,10%,95%)] dark:bg-[#0B0D10] pb-24">
      <Helmet>
        <title>News birra artigianale | Fermenta.to</title>
        <meta name="description" content="Le ultime notizie dal mondo della birra artigianale italiana, aggregate dai migliori blog e magazine di settore." />
      </Helmet>

      <header className="bg-white dark:bg-[#1A1D24] border-b border-stone-100 dark:border-[#23262E] px-4 pt-6 pb-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Newspaper className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black font-poppins">News birra</h1>
            <p className="text-xs text-stone-400">Aggregato dai migliori magazine italiani di settore</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-3">
        {isLoading ? (
          [...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nessuna news ancora. Le news arrivano automaticamente ogni 30 minuti.</p>
          </div>
        ) : (
          items.map((it) => (
            <a key={it.id} href={it.link} target="_blank" rel="noopener noreferrer"
              className="block bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-200 hover:border-primary/30 active:scale-[0.99]">
              <div className="flex gap-0">
                {it.image_url && (
                  <img src={it.image_url} alt="" loading="lazy"
                    className="w-28 sm:w-40 h-28 sm:h-32 object-cover flex-shrink-0" />
                )}
                <div className="p-3 sm:p-4 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {it.source_name}
                    </span>
                    {it.published_at && (
                      <span className="text-[10px] text-stone-400 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDistanceToNow(new Date(it.published_at), { addSuffix: true, locale })}
                      </span>
                    )}
                  </div>
                  <h2 className="font-bold text-sm sm:text-base text-stone-900 dark:text-stone-50 line-clamp-2 leading-snug font-poppins">
                    {it.title}
                  </h2>
                  {it.summary && (
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2 hidden sm:block">{it.summary}</p>
                  )}
                  <p className="text-[11px] text-primary font-semibold mt-1.5 flex items-center gap-1">
                    Leggi articolo <ExternalLink className="w-3 h-3" />
                  </p>
                </div>
              </div>
            </a>
          ))
        )}
      </main>
    </div>
  );
}

const locale = it;
