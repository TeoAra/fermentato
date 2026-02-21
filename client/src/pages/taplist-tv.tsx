import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { Beer, Droplets } from "lucide-react";

const ITEMS_PER_PAGE = 12;
const PAGE_INTERVAL = 45000;

export default function TaplistTV() {
  const { id } = useParams<{ id: string }>();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const { data: pub } = useQuery({
    queryKey: ["/api/pubs", id],
    enabled: !!id,
    refetchInterval: 15000,
  });

  const { data: tapList = [] } = useQuery({
    queryKey: ["/api/pubs", id, "taplist"],
    enabled: !!id,
    refetchInterval: 10000,
  });

  const activeTaps = useMemo(() => {
    return Array.isArray(tapList) ? tapList.filter((t: any) => t.isActive !== false) : [];
  }, [tapList]);

  const totalPages = Math.max(1, Math.ceil(activeTaps.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (totalPages <= 1) {
      setCurrentPage(0);
      return;
    }
    const interval = setInterval(() => {
      setCurrentPage(prev => (prev + 1) % totalPages);
    }, PAGE_INTERVAL);
    return () => clearInterval(interval);
  }, [totalPages]);

  useEffect(() => {
    if (currentPage >= totalPages || totalPages <= 1) setCurrentPage(0);
  }, [totalPages, currentPage, activeTaps.length]);

  const pageTaps = useMemo(() => {
    const start = currentPage * ITEMS_PER_PAGE;
    return activeTaps.slice(start, start + ITEMS_PER_PAGE);
  }, [activeTaps, currentPage]);

  const itemCount = pageTaps.length;
  const layout = useMemo(() => {
    if (itemCount <= 2) return { cols: 2, rows: 1 };
    if (itemCount <= 4) return { cols: 2, rows: 2 };
    if (itemCount <= 6) return { cols: 2, rows: 3 };
    if (itemCount <= 9) return { cols: 3, rows: 3 };
    return { cols: 3, rows: 4 };
  }, [itemCount]);

  const scaleClass = useMemo(() => {
    if (itemCount <= 2) return "scale-large";
    if (itemCount <= 4) return "scale-medium";
    if (itemCount <= 6) return "scale-normal";
    return "scale-compact";
  }, [itemCount]);

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white flex flex-col overflow-hidden">
      <style>{`
        body { overflow: hidden; cursor: none; margin: 0; padding: 0; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .tap-card-anim { animation: fadeIn 0.4s ease-out both; }
        .scale-large .tap-card { font-size: 1.4rem; }
        .scale-large .tap-name { font-size: 1.6rem; }
        .scale-large .tap-brewery { font-size: 1.1rem; }
        .scale-large .tap-badge { font-size: 0.95rem; padding: 4px 12px; }
        .scale-large .tap-price-size { font-size: 0.8rem; }
        .scale-large .tap-price-val { font-size: 1.2rem; }
        .scale-large .tap-img { width: 72px; height: 72px; }
        .scale-large .tap-num { width: 36px; height: 36px; font-size: 1rem; }
        .scale-medium .tap-card { font-size: 1.15rem; }
        .scale-medium .tap-name { font-size: 1.35rem; }
        .scale-medium .tap-brewery { font-size: 0.95rem; }
        .scale-medium .tap-badge { font-size: 0.85rem; padding: 3px 10px; }
        .scale-medium .tap-price-size { font-size: 0.75rem; }
        .scale-medium .tap-price-val { font-size: 1.05rem; }
        .scale-medium .tap-img { width: 64px; height: 64px; }
        .scale-medium .tap-num { width: 32px; height: 32px; font-size: 0.9rem; }
        .scale-normal .tap-card { font-size: 1rem; }
        .scale-normal .tap-name { font-size: 1.15rem; }
        .scale-normal .tap-brewery { font-size: 0.85rem; }
        .scale-normal .tap-badge { font-size: 0.75rem; padding: 3px 9px; }
        .scale-normal .tap-price-size { font-size: 0.65rem; }
        .scale-normal .tap-price-val { font-size: 0.95rem; }
        .scale-normal .tap-img { width: 56px; height: 56px; }
        .scale-normal .tap-num { width: 28px; height: 28px; font-size: 0.8rem; }
        .scale-compact .tap-card { font-size: 1rem; }
        .scale-compact .tap-name { font-size: clamp(1rem, 1.5vw, 1.15rem); }
        .scale-compact .tap-brewery { font-size: clamp(0.8rem, 1.2vw, 0.9rem); }
        .scale-compact .tap-badge { font-size: clamp(0.7rem, 1vw, 0.8rem); padding: 2px 8px; }
        .scale-compact .tap-price-size { font-size: clamp(0.65rem, 0.9vw, 0.75rem); }
        .scale-compact .tap-price-val { font-size: clamp(0.85rem, 1.2vw, 1rem); }
        .scale-compact .tap-img { width: 52px; height: 52px; }
        .scale-compact .tap-num { width: 28px; height: 28px; font-size: 0.8rem; }
      `}</style>

      <div className="flex items-center justify-between px-6 py-3 flex-shrink-0 border-b border-gray-800/50">
        <div className="flex items-center gap-4">
          {(pub as any)?.logoUrl ? (
            <img src={(pub as any).logoUrl} alt="" className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-500/30" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Beer className="w-8 h-8 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent leading-tight">
              {(pub as any)?.name || "Taplist"}
            </h1>
            <p className="text-gray-500 text-sm">
              {activeTaps.length} birre alla spina
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                    i === currentPage ? 'bg-amber-400 scale-125' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          )}
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-300 tabular-nums">
              {currentTime.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="text-sm text-gray-500">
              {currentTime.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
            </div>
          </div>
        </div>
      </div>

      {activeTaps.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Droplets className="w-24 h-24 text-gray-600 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-400">Nessuna birra alla spina</h2>
          </div>
        </div>
      ) : (
        <div className={`flex-1 p-4 overflow-hidden ${scaleClass}`}>
          <div
            className="grid gap-3 h-full"
            style={{
              gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
              gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
            }}
          >
            {pageTaps.map((tap: any, index: number) => (
              <TapCard
                key={tap.id}
                tap={tap}
                index={currentPage * ITEMS_PER_PAGE + index}
                delay={index * 0.05}
              />
            ))}
          </div>
        </div>
      )}

      <div className="text-center py-1 flex-shrink-0">
        <span className="text-[10px] text-gray-700">fermenta.to</span>
      </div>
    </div>
  );
}

function TapCard({ tap, index, delay }: { tap: any; index: number; delay: number }) {
  const beer = tap.beer || {};
  const brewery = beer.brewery?.name || beer.breweryName || "";
  const prices = tap.prices || [];
  const imageUrl = beer.imageUrl || beer.image_url || null;

  return (
    <div
      className="tap-card tap-card-anim relative bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-700/40 flex items-center gap-4 px-4 py-3 overflow-hidden min-h-0"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="tap-num absolute top-2 right-2 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center z-10">
        <span className="text-amber-400 font-bold">{tap.tapNumber || index + 1}</span>
      </div>

      <div className="tap-img rounded-full flex-shrink-0 bg-gray-700/50 border-2 border-amber-500/20 overflow-hidden flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={beer.name || ""}
            className="w-full h-full object-cover rounded-full"
            onError={(e) => {
              const el = e.target as HTMLImageElement;
              el.style.display = 'none';
              el.parentElement!.classList.add('fallback-icon');
            }}
          />
        ) : (
          <Beer className="w-1/2 h-1/2 text-amber-500/50" />
        )}
      </div>

      <div className="flex-1 min-w-0 pr-8">
        <h3 className="tap-name font-bold text-white leading-tight truncate">
          {beer.name || "Birra"}
        </h3>
        {brewery && (
          <p className="tap-brewery text-amber-400/80 font-medium truncate">{brewery}</p>
        )}

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {beer.style && (
            <span className="tap-badge rounded-full bg-gray-700/60 text-gray-300 border border-gray-600/30 truncate max-w-[160px]">
              {beer.style}
            </span>
          )}
          {beer.abv && (
            <span className="tap-badge rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 font-bold whitespace-nowrap">
              {beer.abv}%
            </span>
          )}
        </div>

        {prices.length > 0 && (
          <div className="flex items-center gap-3 mt-1.5">
            {prices.map((p: any, i: number) => (
              <div key={i} className="flex items-baseline gap-1">
                {p.size && <span className="tap-price-size text-gray-400 uppercase">{p.size}</span>}
                <span className="tap-price-val font-bold text-white">€{parseFloat(p.price || "0").toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
