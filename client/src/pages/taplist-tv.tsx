import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Beer, Droplets } from "lucide-react";

function FitText({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const fitting = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const fit = useCallback(() => {
    if (fitting.current) return;
    const el = ref.current;
    if (!el) return;
    fitting.current = true;
    el.style.fontSize = '';
    requestAnimationFrame(() => {
      if (!el) { fitting.current = false; return; }
      const computed = window.getComputedStyle(el);
      let size = parseFloat(computed.fontSize);
      const minSize = 6;
      let iterations = 0;
      while (el.scrollWidth > el.clientWidth + 1 && size > minSize && iterations < 50) {
        size -= 0.5;
        el.style.fontSize = size + 'px';
        iterations++;
      }
      fitting.current = false;
    });
  }, []);

  useEffect(() => {
    fit();
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(() => {
      clearTimeout(timer.current);
      timer.current = setTimeout(fit, 100);
    });
    ro.observe(parent);
    return () => { ro.disconnect(); clearTimeout(timer.current); };
  }, [text, fit]);

  return (
    <div ref={ref} className={className} style={{ ...style, whiteSpace: 'nowrap', overflow: 'hidden' }}>
      {text}
    </div>
  );
}

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
        .tap-card { height: 100%; display: flex; align-items: stretch; overflow: hidden; }
        .tap-img-col { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .tap-img-wrap { border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .tap-content { display: flex; flex-direction: column; justify-content: center; flex: 1; min-width: 0; }

        .scale-large .tap-card { padding: 2.5vmin 2vw; gap: 2vmin; }
        .scale-large .tap-img-col { width: 22vmin; }
        .scale-large .tap-img-wrap { width: 19vmin; height: 19vmin; }
        .scale-large .tap-name { font-size: 5vmin; }
        .scale-large .tap-brewery { font-size: 3.2vmin; }
        .scale-large .tap-badge { font-size: 2.2vmin; padding: 0.8vmin 1.8vmin; }
        .scale-large .tap-price-size { font-size: 2vmin; }
        .scale-large .tap-price-val { font-size: 4vmin; }
        .scale-large .tap-num { width: 5vmin; height: 5vmin; font-size: 2.5vmin; }
        .scale-large .tap-badges-row { gap: 1.2vmin; margin-top: 1vmin; }
        .scale-large .tap-prices-row { gap: 2.5vmin; margin-top: 1.2vmin; }

        .scale-medium .tap-card { padding: 1.8vmin 1.5vw; gap: 1.5vmin; }
        .scale-medium .tap-img-col { width: 16vmin; }
        .scale-medium .tap-img-wrap { width: 13.5vmin; height: 13.5vmin; }
        .scale-medium .tap-name { font-size: 3.5vmin; }
        .scale-medium .tap-brewery { font-size: 2.3vmin; }
        .scale-medium .tap-badge { font-size: 1.6vmin; padding: 0.5vmin 1.3vmin; }
        .scale-medium .tap-price-size { font-size: 1.4vmin; }
        .scale-medium .tap-price-val { font-size: 2.8vmin; }
        .scale-medium .tap-num { width: 3.5vmin; height: 3.5vmin; font-size: 1.8vmin; }
        .scale-medium .tap-badges-row { gap: 0.9vmin; margin-top: 0.7vmin; }
        .scale-medium .tap-prices-row { gap: 1.8vmin; margin-top: 0.9vmin; }

        .scale-normal .tap-card { padding: 1.3vmin 1.2vw; gap: 1.2vmin; }
        .scale-normal .tap-img-col { width: 12vmin; }
        .scale-normal .tap-img-wrap { width: 10vmin; height: 10vmin; }
        .scale-normal .tap-name { font-size: 2.6vmin; }
        .scale-normal .tap-brewery { font-size: 1.7vmin; }
        .scale-normal .tap-badge { font-size: 1.2vmin; padding: 0.4vmin 1vmin; }
        .scale-normal .tap-price-size { font-size: 1.1vmin; }
        .scale-normal .tap-price-val { font-size: 2.1vmin; }
        .scale-normal .tap-num { width: 2.7vmin; height: 2.7vmin; font-size: 1.3vmin; }
        .scale-normal .tap-badges-row { gap: 0.7vmin; margin-top: 0.5vmin; }
        .scale-normal .tap-prices-row { gap: 1.3vmin; margin-top: 0.7vmin; }

        .scale-compact .tap-card { padding: 1vmin 1vw; gap: 1vmin; }
        .scale-compact .tap-img-col { width: 9.5vmin; }
        .scale-compact .tap-img-wrap { width: 8vmin; height: 8vmin; }
        .scale-compact .tap-name { font-size: 2vmin; }
        .scale-compact .tap-brewery { font-size: 1.3vmin; }
        .scale-compact .tap-badge { font-size: 0.95vmin; padding: 0.3vmin 0.8vmin; }
        .scale-compact .tap-price-size { font-size: 0.85vmin; }
        .scale-compact .tap-price-val { font-size: 1.7vmin; }
        .scale-compact .tap-num { width: 2.2vmin; height: 2.2vmin; font-size: 1.1vmin; }
        .scale-compact .tap-badges-row { gap: 0.5vmin; margin-top: 0.4vmin; }
        .scale-compact .tap-prices-row { gap: 1vmin; margin-top: 0.5vmin; }

        .tv-header { padding: 1vmin 2vw; }
        .tv-header-logo { width: 4.5vmin; height: 4.5vmin; }
        .tv-header-title { font-size: 3.2vmin; }
        .tv-header-sub { font-size: 1.3vmin; }
        .tv-header-time { font-size: 3.2vmin; }
        .tv-header-date { font-size: 1.3vmin; }
        .tv-header-dot { width: 0.9vmin; height: 0.9vmin; }
      `}</style>

      <div className="tv-header flex items-center justify-between flex-shrink-0 border-b border-gray-800/50">
        <div className="flex items-center" style={{ gap: '1.5vmin' }}>
          {(pub as any)?.logoUrl ? (
            <img src={(pub as any).logoUrl} alt="" className="tv-header-logo rounded-2xl object-cover border-2 border-amber-500/30" />
          ) : (
            <div className="tv-header-logo rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Beer style={{ width: '60%', height: '60%' }} className="text-white" />
            </div>
          )}
          <div>
            <h1 className="tv-header-title font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent leading-tight">
              {(pub as any)?.name || "Taplist"}
            </h1>
            <p className="tv-header-sub text-gray-500">
              {activeTaps.length} birre alla spina
            </p>
          </div>
        </div>
        <div className="flex items-center" style={{ gap: '2vmin' }}>
          {totalPages > 1 && (
            <div className="flex items-center" style={{ gap: '0.6vh' }}>
              {Array.from({ length: totalPages }).map((_, i) => (
                <div
                  key={i}
                  className={`tv-header-dot rounded-full transition-all duration-500 ${
                    i === currentPage ? 'bg-amber-400 scale-125' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          )}
          <div className="text-right">
            <div className="tv-header-time font-bold text-gray-300 tabular-nums">
              {currentTime.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="tv-header-date text-gray-500">
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
        <div className={`flex-1 overflow-hidden ${scaleClass}`} style={{ padding: '1vh 1.2vw' }}>
          <div
            className="grid h-full"
            style={{
              gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
              gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
              gap: '1vh 0.8vw',
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

      <div className="text-center flex-shrink-0" style={{ padding: '0.3vmin 0' }}>
        <span className="text-gray-700" style={{ fontSize: '0.9vmin' }}>fermenta.to</span>
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
      className="tap-card tap-card-anim relative bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-700/40 overflow-hidden min-h-0"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="tap-num absolute top-2 right-2 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center z-10">
        <span className="text-amber-400 font-bold">{tap.tapNumber || index + 1}</span>
      </div>

      <div className="tap-img-col">
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

      <div className="tap-content" style={{ paddingRight: '3vw' }}>
        <FitText
          text={beer.name || "Birra"}
          className="tap-name font-bold text-white leading-tight"
        />
        {brewery && (
          <FitText
            text={brewery}
            className="tap-brewery text-amber-400/80 font-medium"
          />
        )}

        <div className="tap-badges-row flex items-center flex-wrap">
          {beer.style && (
            <span className="tap-badge rounded-full bg-gray-700/60 text-gray-300 border border-gray-600/30 whitespace-nowrap">
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
          <div className="tap-prices-row flex items-center">
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
