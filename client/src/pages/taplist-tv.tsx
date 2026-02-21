import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useEffect, useState } from "react";
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

  const colCount = activeTaps.length <= 6 ? 1 : activeTaps.length <= 12 ? 2 : 3;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white p-6 md:p-10 overflow-hidden">
      <style>{`
        body { overflow: hidden; cursor: none; }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .tap-shimmer { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent); background-size: 200% 100%; animation: shimmer 3s infinite; }
      `}</style>

      <div className="flex items-center justify-between mb-8 md:mb-12">
        <div className="flex items-center gap-4">
          {pub?.logoUrl ? (
            <img src={pub.logoUrl} alt="" className="w-14 h-14 md:w-20 md:h-20 rounded-2xl object-cover border-2 border-amber-500/30" />
          ) : (
            <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Beer className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              {pub?.name || "Taplist"}
            </h1>
            <p className="text-gray-400 text-sm md:text-lg mt-1">
              {activeTaps.length} birre alla spina
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl md:text-4xl font-bold text-gray-300 tabular-nums">
            {currentTime.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="text-sm text-gray-500">
            {currentTime.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>
      </div>

      {activeTaps.length === 0 ? (
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Droplets className="w-24 h-24 text-gray-600 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-400">Nessuna birra alla spina</h2>
          </div>
        </div>
      ) : (
        <div className={`grid gap-4 md:gap-6 ${
          colCount === 1 ? 'grid-cols-1 max-w-2xl mx-auto' : 
          colCount === 2 ? 'grid-cols-2' : 'grid-cols-3'
        }`}>
          {activeTaps.map((tap: any, index: number) => (
            <TapCard key={tap.id} tap={tap} index={index} />
          ))}
        </div>
      )}

      <div className="fixed bottom-4 left-0 right-0 text-center">
        <span className="text-xs text-gray-600">fermenta.to</span>
      </div>
    </div>
  );
}

function TapCard({ tap, index }: { tap: any; index: number }) {
  const beer = tap.beer || {};
  const brewery = beer.brewery?.name || beer.breweryName || "";
  const prices = tap.prices || [];

  return (
    <div className="tap-shimmer relative bg-gray-800/50 backdrop-blur-sm rounded-2xl p-5 md:p-6 border border-gray-700/50 hover:border-amber-500/30 transition-all duration-500">
      <div className="absolute top-3 right-3 w-8 h-8 md:w-10 md:h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
        <span className="text-amber-400 font-bold text-sm md:text-base">{tap.tapNumber || index + 1}</span>
      </div>

      <div className="pr-12">
        <h3 className="text-lg md:text-xl font-bold text-white mb-1 leading-tight">
          {beer.name || "Birra"}
        </h3>
        {brewery && (
          <p className="text-amber-400/80 text-sm md:text-base font-medium">{brewery}</p>
        )}
      </div>

      <div className="flex items-center gap-3 mt-3 flex-wrap">
        {beer.style && (
          <span className="text-xs md:text-sm px-2.5 py-1 rounded-full bg-gray-700/50 text-gray-300 border border-gray-600/30">
            {beer.style}
          </span>
        )}
        {beer.abv && (
          <span className="text-xs md:text-sm px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
            {beer.abv}%
          </span>
        )}
      </div>

      {prices.length > 0 && (
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {prices.map((p: any, i: number) => (
            <div key={i} className="text-center">
              {p.size && <div className="text-[10px] md:text-xs text-gray-500 uppercase">{p.size}</div>}
              <div className="text-sm md:text-base font-bold text-white">
                €{parseFloat(p.price || "0").toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
