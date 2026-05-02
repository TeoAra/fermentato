import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Search, X, Beer, MapPin, ChevronRight, Store, Sparkles
} from "lucide-react";

interface FindBeerSheetProps {
  open: boolean;
  onClose: () => void;
  nearbyPubs?: any[];
}

const SHORTCUTS = [
  { label: "Vicino a te", icon: "📍", style: "" },
  { label: "IPA", icon: "🍺", style: "IPA" },
  { label: "Stout", icon: "🌑", style: "Stout" },
  { label: "Sour", icon: "🍋", style: "Sour" },
  { label: "Weizen", icon: "🌾", style: "Weissbier - Hefeweizen" },
  { label: "Lager", icon: "🟡", style: "Pale Lager - International / Premium" },
];

export default function FindBeerSheet({ open, onClose, nearbyPubs = [] }: FindBeerSheetProps) {
  const [query, setQuery] = useState("");
  const [activeStyle, setActiveStyle] = useState("");
  const [activeTab, setActiveTab] = useState<"birre" | "locali">("birre");
  const inputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 320);
      document.body.style.overflow = "hidden";
    } else {
      setQuery("");
      setActiveStyle("");
      setActiveTab("birre");
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const { data: popularStyles } = useQuery<{ style: string; count: number }[]>({
    queryKey: ["/api/beers/popular-styles"],
    staleTime: 10 * 60 * 1000,
  });

  const { data: styleBeers, isLoading: styleBeerLoading } = useQuery<any[]>({
    queryKey: ["/api/beers/by-style", activeStyle],
    queryFn: () => fetch(`/api/beers/by-style?style=${encodeURIComponent(activeStyle)}`).then(r => r.json()),
    enabled: !!activeStyle,
    staleTime: 2 * 60 * 1000,
  });

  const { data: searchResults, isLoading: searchLoading } = useQuery<{ beers: any[] }>({
    queryKey: ["/api/search", query],
    queryFn: () => fetch(`/api/search?q=${encodeURIComponent(query)}`).then(r => r.json()),
    enabled: !activeStyle && query.length > 1,
    staleTime: 30 * 1000,
  });

  const { data: trendingBeers, isLoading: trendingLoading } = useQuery<any[]>({
    queryKey: ["/api/beers/trending"],
    staleTime: 5 * 60 * 1000,
    enabled: !activeStyle && query.length < 2,
  });

  const beers: any[] = activeStyle
    ? (styleBeers ?? [])
    : query.length > 1
      ? (searchResults?.beers ?? [])
      : (trendingBeers ?? []);

  const isLoading = activeStyle
    ? styleBeerLoading
    : query.length > 1
      ? searchLoading
      : trendingLoading;

  const hasFilter = !!activeStyle || query.length > 1;

  function clearFilters() {
    setQuery("");
    setActiveStyle("");
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        style={{ animation: "fadeIn 200ms ease" }}
      />

      <div
        ref={sheetRef}
        className="fixed inset-x-0 bottom-0 z-[61] bg-background dark:bg-[#0F0F10] rounded-t-[28px] shadow-2xl flex flex-col"
        style={{ maxHeight: "92dvh", animation: "sheetSlideUp 300ms cubic-bezier(0.32,0.72,0,1)" }}
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-[3.5px] rounded-full bg-stone-200 dark:bg-stone-700" />
        </div>

        <div className="px-4 pt-2 pb-3 flex-shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Trova una birra</p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setActiveStyle(""); }}
                placeholder="Cerca birra, stile o birrificio…"
                className="w-full pl-10 pr-9 py-3 rounded-2xl bg-stone-100 dark:bg-stone-800 text-[15px] text-foreground placeholder-stone-400 dark:placeholder-stone-500 border-0 outline-none font-medium"
              />
              {(query || activeStyle) && (
                <button
                  onClick={clearFilters}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>
        </div>

        <div className="px-4 pb-3 flex-shrink-0">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {SHORTCUTS.map(s => (
              <button
                key={s.label}
                onClick={() => {
                  if (s.style) {
                    setActiveStyle(s.style === activeStyle ? "" : s.style);
                    setQuery("");
                    setActiveTab("birre");
                  } else {
                    setActiveTab("locali");
                    setActiveStyle("");
                    setQuery("");
                  }
                }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold border transition-all tap-scale ${
                  (s.style && activeStyle === s.style) || (!s.style && activeTab === "locali" && !hasFilter)
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-stone-50 dark:bg-stone-800/60 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700"
                }`}
              >
                <span className="text-base leading-none">{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {Array.isArray(popularStyles) && popularStyles.length > 0 && (
          <div className="px-4 pb-3 flex-shrink-0">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              {popularStyles.slice(0, 20).map(s => (
                <button
                  key={s.style}
                  onClick={() => { setActiveStyle(s.style === activeStyle ? "" : s.style); setQuery(""); setActiveTab("birre"); }}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all tap-scale ${
                    activeStyle === s.style
                      ? "bg-primary text-white border-primary"
                      : "bg-white dark:bg-stone-800/40 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700"
                  }`}
                >
                  {s.style.split(" - ")[0].split("/")[0].trim()}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 pb-3 flex-shrink-0">
          <div className="flex bg-stone-100 dark:bg-stone-800/60 rounded-2xl p-1 gap-1">
            {(["birre", "locali"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab
                    ? "bg-white dark:bg-stone-700 text-foreground shadow-sm"
                    : "text-stone-400 dark:text-stone-500"
                }`}
              >
                {tab === "birre" ? "🍺 Birre" : "🏠 Locali"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 min-h-0">
          {activeTab === "birre" ? (
            isLoading ? (
              <div className="space-y-2.5">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-[72px] rounded-2xl bg-stone-100 dark:bg-stone-800/50 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
                ))}
              </div>
            ) : beers.length > 0 ? (
              <>
                {(activeStyle || query.length > 1) && (
                  <p className="text-xs font-semibold text-stone-400 mb-2.5">
                    {beers.length} birre {activeStyle ? `· stile ${activeStyle.split(" - ")[0]}` : ""}
                  </p>
                )}
                {!hasFilter && (
                  <p className="text-xs font-semibold text-stone-400 mb-2.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Tendenza adesso
                  </p>
                )}
                <div className="space-y-2">
                  {beers.slice(0, 40).map((beer: any) => (
                    <Link key={beer.id} href={`/beer/${beer.id}`} onClick={onClose}>
                      <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white dark:bg-card border border-stone-100 dark:border-stone-800 active:scale-[0.97] transition-transform shadow-sm cursor-pointer">
                        <div className="w-12 h-12 rounded-xl flex-shrink-0 bg-stone-100 dark:bg-stone-800 overflow-hidden flex items-center justify-center">
                          {beer.imageUrl || beer.breweryLogoUrl ? (
                            <img
                              src={beer.imageUrl || beer.breweryLogoUrl}
                              alt={beer.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Beer className="w-5 h-5 text-stone-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[14px] text-foreground truncate">{beer.name}</p>
                          <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5 truncate">
                            {[
                              beer.breweryName || beer.brewery?.name,
                              !activeStyle && beer.style ? beer.style.split(" - ")[0].split("/")[0].trim() : null,
                              beer.abv != null ? `${beer.abv}%` : null,
                            ].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center gap-1 bg-primary/10 dark:bg-primary/15 text-primary text-xs font-bold px-2.5 py-1.5 rounded-xl">
                            <Beer className="w-3 h-3" />
                            Bevi
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            ) : hasFilter ? (
              <div className="text-center py-14">
                <Beer className="w-12 h-12 mx-auto mb-3 text-stone-200 dark:text-stone-700" />
                <p className="font-bold text-stone-500 dark:text-stone-400 mb-1">Nessuna birra trovata</p>
                <p className="text-sm text-stone-400">Prova con un altro stile o termine</p>
                <div className="flex gap-2 justify-center mt-5">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-sm font-semibold text-stone-500"
                  >
                    Cambia stile
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mx-auto mb-4">
                  <Search className="w-7 h-7 text-primary" />
                </div>
                <p className="font-semibold text-stone-600 dark:text-stone-400">Cerca una birra</p>
                <p className="text-sm text-stone-400 mt-1">Oppure seleziona uno stile qui sopra</p>
              </div>
            )
          ) : (
            nearbyPubs.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-stone-400 mb-2.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  {nearbyPubs.length} locali nel raggio selezionato
                </p>
                {nearbyPubs.map((pub: any) => (
                  <Link key={pub.id} href={pub.slug ? `/pub/${pub.slug}` : `/pub/${pub.id}`} onClick={onClose}>
                    <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white dark:bg-card border border-stone-100 dark:border-stone-800 active:scale-[0.97] transition-transform shadow-sm cursor-pointer">
                      <div className="w-12 h-12 rounded-xl flex-shrink-0 bg-stone-100 dark:bg-stone-800 overflow-hidden flex items-center justify-center">
                        {pub.logoUrl ? (
                          <img src={pub.logoUrl} alt={pub.name} className="w-full h-full object-cover" />
                        ) : (
                          <Store className="w-5 h-5 text-stone-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[14px] text-foreground truncate">{pub.name}</p>
                        <p className="text-xs text-stone-400 mt-0.5 truncate">
                          {[
                            pub.city,
                            pub._distance != null
                              ? pub._distance < 1
                                ? `${Math.round(pub._distance * 1000)} m`
                                : `${pub._distance.toFixed(1)} km`
                              : null,
                          ].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-stone-300 dark:text-stone-600 flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-14">
                <MapPin className="w-12 h-12 mx-auto mb-3 text-stone-200 dark:text-stone-700" />
                <p className="font-bold text-stone-500 dark:text-stone-400 mb-1">Nessun locale trovato</p>
                <p className="text-sm text-stone-400">Attiva la posizione GPS per trovare pub vicino a te</p>
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
}
