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
        .tap-img-col { display: flex; align-items: center; justify-content: center; padding: 6px; flex-shrink: 0; }
        .tap-img-wrap { border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .tap-card { height: 100%; }
        .scale-large .tap-img-col { width: clamp(100px, 12vh, 180px); }
        .scale-large .tap-img-wrap { width: clamp(80px, 10vh, 160px); height: clamp(80px, 10vh, 160px); }
        .scale-large .tap-name { font-size: clamp(1.4rem, 2.5vh, 2.2rem); }
        .scale-large .tap-brewery { font-size: clamp(1rem, 1.8vh, 1.4rem); }
        .scale-large .tap-badge { font-size: clamp(0.85rem, 1.4vh, 1.1rem); padding: 4px 12px; }
        .scale-large .tap-price-size { font-size: clamp(0.75rem, 1.2vh, 1rem); }
        .scale-large .tap-price-val { font-size: clamp(1.1rem, 2vh, 1.6rem); }
        .scale-large .tap-num { width: clamp(34px, 4vh, 50px); height: clamp(34px, 4vh, 50px); font-size: clamp(1rem, 1.6vh, 1.3rem); }
        .scale-medium .tap-img-col { width: clamp(90px, 10vh, 150px); }
        .scale-medium .tap-img-wrap { width: clamp(72px, 8vh, 130px); height: clamp(72px, 8vh, 130px); }
        .scale-medium .tap-name { font-size: clamp(1.2rem, 2.2vh, 1.8rem); }
        .scale-medium .tap-brewery { font-size: clamp(0.85rem, 1.5vh, 1.2rem); }
        .scale-medium .tap-badge { font-size: clamp(0.75rem, 1.2vh, 1rem); padding: 3px 10px; }
        .scale-medium .tap-price-size { font-size: clamp(0.7rem, 1vh, 0.9rem); }
        .scale-medium .tap-price-val { font-size: clamp(1rem, 1.7vh, 1.3rem); }
        .scale-medium .tap-num { width: clamp(30px, 3.5vh, 44px); height: clamp(30px, 3.5vh, 44px); font-size: clamp(0.9rem, 1.4vh, 1.1rem); }
        .scale-normal .tap-img-col { width: clamp(76px, 8vh, 120px); }
        .scale-normal .tap-img-wrap { width: clamp(60px, 6.5vh, 100px); height: clamp(60px, 6.5vh, 100px); }
        .scale-normal .tap-name { font-size: clamp(1rem, 1.8vh, 1.4rem); }
        .scale-normal .tap-brewery { font-size: clamp(0.78rem, 1.3vh, 1rem); }
        .scale-normal .tap-badge { font-size: clamp(0.7rem, 1vh, 0.85rem); padding: 3px 9px; }
        .scale-normal .tap-price-size { font-size: clamp(0.6rem, 0.9vh, 0.8rem); }
        .scale-normal .tap-price-val { font-size: clamp(0.85rem, 1.4vh, 1.1rem); }
        .scale-normal .tap-num { width: clamp(26px, 3vh, 38px); height: clamp(26px, 3vh, 38px); font-size: clamp(0.8rem, 1.2vh, 1rem); }
        .scale-compact .tap-img-col { width: clamp(64px, 7vh, 100px); }
        .scale-compact .tap-img-wrap { width: clamp(50px, 5.5vh, 84px); height: clamp(50px, 5.5vh, 84px); }
        .scale-compact .tap-name { font-size: clamp(0.95rem, 1.5vh, 1.2rem); }
        .scale-compact .tap-brewery { font-size: clamp(0.75rem, 1.1vh, 0.9rem); }
        .scale-compact .tap-badge { font-size: clamp(0.65rem, 0.9vh, 0.8rem); padding: 2px 8px; }
        .scale-compact .tap-price-size { font-size: clamp(0.6rem, 0.8vh, 0.75rem); }
        .scale-compact .tap-price-val { font-size: clamp(0.8rem, 1.2vh, 1rem); }
        .scale-compact .tap-num { width: clamp(24px, 2.8vh, 34px); height: clamp(24px, 2.8vh, 34px); font-size: clamp(0.75rem, 1vh, 0.9rem); }
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
      className="tap-card tap-card-anim relative bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-700/40 flex items-stretch overflow-hidden min-h-0"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="tap-num absolute top-2 right-2 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center z-10">
        <span className="text-amber-400 font-bold">{tap.tapNumber || index + 1}</span>
      </div>

      <div className="tap-img-col flex-shrink-0">
        <div className="tap-img-wrap bg-gray-700/50 border-2 border-amber-500/25">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={beer.name || ""}
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = 'none';
                if (el.parentElement) {
                  const icon = document.createElement('div');
                  icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:50%;height:50%;color:rgba(245,158,11,0.4)"><path d="m7.5 10.5 1.5-1.5"/><path d="M12 2a10 10 0 0 0-6.3 17.7c-.5-.8-.7-1.7-.7-2.7a5 5 0 0 1 5-5c2.5 0 4.2 1.5 5 3.5"/><path d="M17 15v7"/><path d="M21 15v7"/><path d="M17 22h4"/><path d="M17 15h4"/><path d="M9 9a5 5 0 0 1 5-5"/></svg>';
                  icon.style.cssText = 'display:flex;align-items:center;justify-content:center;width:100%;height:100%';
                  el.parentElement.appendChild(icon);
                }
              }}
            />
          ) : (
            <Beer className="w-1/2 h-1/2 text-amber-500/40" />
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 pr-10 py-3 flex flex-col justify-center">
        <h3 className="tap-name font-bold text-white leading-tight truncate">
          {beer.name || "Birra"}
        </h3>
        {brewery && (
          <p className="tap-brewery text-amber-400/80 font-medium truncate">{brewery}</p>
        )}

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {beer.style && (
            <span className="tap-badge rounded-full bg-gray-700/60 text-gray-300 border border-gray-600/30 truncate max-w-[180px]">
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
