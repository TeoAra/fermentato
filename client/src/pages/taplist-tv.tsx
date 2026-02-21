import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useEffect, useState, useMemo } from "react";
import { Beer, Droplets } from "lucide-react";

export default function TaplistTV() {
  const { id } = useParams<{ id: string }>();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const { data: pub } = useQuery({
    queryKey: ["/api/pubs", id],
    enabled: !!id,
    refetchInterval: 60000,
  });

  const { data: tapList = [] } = useQuery({
    queryKey: ["/api/pubs", id, "taplist"],
    enabled: !!id,
    refetchInterval: 30000,
  });

  const activeTaps = Array.isArray(tapList) ? tapList.filter((t: any) => t.isActive !== false) : [];

  const colCount = useMemo(() => {
    const count = activeTaps.length;
    if (count <= 4) return 2;
    if (count <= 9) return 3;
    return 4;
  }, [activeTaps.length]);

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white flex flex-col overflow-hidden">
      <style>{`
        body { overflow: hidden; cursor: none; margin: 0; padding: 0; }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .tap-shimmer { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.02), transparent); background-size: 200% 100%; animation: shimmer 4s infinite; }
      `}</style>

      <div className="flex items-center justify-between px-6 py-3 flex-shrink-0 border-b border-gray-800/50">
        <div className="flex items-center gap-3">
          {pub?.logoUrl ? (
            <img src={pub.logoUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-amber-500/30" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Beer className="w-7 h-7 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent leading-tight">
              {pub?.name || "Taplist"}
            </h1>
            <p className="text-gray-500 text-xs">
              {activeTaps.length} birre alla spina
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-300 tabular-nums">
            {currentTime.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="text-xs text-gray-500">
            {currentTime.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>
      </div>

      {activeTaps.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Droplets className="w-20 h-20 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-400">Nessuna birra alla spina</h2>
          </div>
        </div>
      ) : (
        <div className="flex-1 p-3 overflow-hidden">
          <div className={`grid gap-2.5 h-full auto-rows-fr ${
            colCount === 2 ? 'grid-cols-2' :
            colCount === 3 ? 'grid-cols-3' : 'grid-cols-4'
          }`} style={{
            gridTemplateRows: `repeat(${Math.ceil(activeTaps.length / colCount)}, 1fr)`
          }}>
            {activeTaps.map((tap: any, index: number) => (
              <TapCard key={tap.id} tap={tap} index={index} />
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

function TapCard({ tap, index }: { tap: any; index: number }) {
  const beer = tap.beer || {};
  const brewery = beer.brewery?.name || beer.breweryName || "";
  const prices = tap.prices || [];
  const imageUrl = beer.imageUrl || beer.image_url || null;

  return (
    <div className="tap-shimmer relative bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700/40 flex overflow-hidden min-h-0">
      <div className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center z-10">
        <span className="text-amber-400 font-bold text-xs">{tap.tapNumber || index + 1}</span>
      </div>

      {imageUrl && (
        <div className="w-16 flex-shrink-0 bg-gray-900/50">
          <img
            src={imageUrl}
            alt={beer.name || ""}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      <div className="flex-1 p-2.5 pr-9 flex flex-col justify-center min-w-0">
        <h3 className="text-sm font-bold text-white leading-tight truncate">
          {beer.name || "Birra"}
        </h3>
        {brewery && (
          <p className="text-amber-400/80 text-[11px] font-medium truncate mt-0.5">{brewery}</p>
        )}

        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {beer.style && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-700/60 text-gray-300 border border-gray-600/30 truncate max-w-[100px]">
              {beer.style}
            </span>
          )}
          {beer.abv && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 font-bold whitespace-nowrap">
              {beer.abv}%
            </span>
          )}
        </div>

        {prices.length > 0 && (
          <div className="flex items-center gap-2 mt-1.5">
            {prices.map((p: any, i: number) => (
              <div key={i} className="flex items-baseline gap-0.5">
                {p.size && <span className="text-[9px] text-gray-500 uppercase">{p.size}</span>}
                <span className="text-xs font-bold text-white">€{parseFloat(p.price || "0").toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
