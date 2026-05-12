import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Search, X, Beer, MapPin, ChevronRight, Store, Sparkles, Clock, Shuffle, Loader2, Factory
} from "lucide-react";

const RECENT_KEY = "fermenta:recentSearches";
const MAX_RECENTS = 6;

type Recent = { q: string; ts: number };

function loadRecents(): Recent[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(r => r && typeof r.q === "string").slice(0, MAX_RECENTS) : [];
  } catch { return []; }
}

function saveRecent(q: string) {
  const term = q.trim();
  if (term.length < 2) return;
  try {
    const list = loadRecents().filter(r => r.q.toLowerCase() !== term.toLowerCase());
    list.unshift({ q: term, ts: Date.now() });
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENTS)));
  } catch {}
}

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
  const [activeTab, setActiveTab] = useState<"birre" | "birrifici" | "locali">("birre");
  const [recents, setRecents] = useState<Recent[]>([]);
  const [surpriseLoading, setSurpriseLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (open) {
      setRecents(loadRecents());
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

  // Persist recent search after 1.2s of debounce on a meaningful query
  useEffect(() => {
    if (!open || activeStyle) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (query.trim().length < 2) return;
    debounceRef.current = window.setTimeout(() => {
      saveRecent(query);
      setRecents(loadRecents());
    }, 1200);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [query, open, activeStyle]);

  const clearRecents = () => {
    try { localStorage.removeItem(RECENT_KEY); } catch {}
    setRecents([]);
  };

  const surpriseMe = async () => {
    if (surpriseLoading) return;
    setSurpriseLoading(true);
    try {
      const res = await fetch("/api/beers/random");
      if (!res.ok) throw new Error("no beer");
      const beer = await res.json();
      if (beer?.id) {
        onClose();
        setLocation(`/beer/${beer.id}`);
      }
    } catch {} finally {
      setSurpriseLoading(false);
    }
  };

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

  // Ricerca pub per nome (indipendente dal GPS)
  const { data: pubSearchResults, isLoading: pubSearchLoading } = useQuery<any[]>({
    queryKey: ["/api/pubs/search", query],
    queryFn: () => fetch(`/api/pubs/search?q=${encodeURIComponent(query)}`).then(r => r.json()),
    enabled: activeTab === "locali" && query.trim().length > 1,
    staleTime: 30 * 1000,
  });

  const beers: any[] = activeStyle
    ? (styleBeers ?? [])
    : query.length > 1
      ? (searchResults?.beers ?? [])
      : (trendingBeers ?? []);

  const breweries: any[] = (!activeStyle && query.length > 1)
    ? ((searchResults as any)?.breweries ?? [])
    : [];

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
        className="fixed inset-0 z-[60] bg-black/70"
        onClick={onClose}
        style={{ animation: "fadeIn 200ms ease" }}
      />

      <div
        ref={sheetRef}
        className="fixed z-[61] bg-background dark:bg-[#0F0F10] shadow-2xl flex flex-col
                   inset-x-0 bottom-0 max-h-[88dvh]
                   rounded-t-3xl border-t border-x border-stone-200 dark:border-stone-800
                   md:max-w-2xl md:mx-auto md:max-h-[86vh]"
        style={{ animation: "findBeerCardIn 260ms cubic-bezier(0.16,1,0.3,1)" }}
      >
        {/* Top padding (no drag handle since it's a floating card now) */}
        <div className="h-4 flex-shrink-0" />

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
              onClick={surpriseMe}
              disabled={surpriseLoading}
              title="Sorprendimi: birra casuale"
              className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-orange-400 text-white flex items-center justify-center shadow-sm tap-scale disabled:opacity-60"
            >
              {surpriseLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Shuffle className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>
        </div>

        {!hasFilter && recents.length > 0 && (
          <div className="px-4 pb-2 flex-shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Ricerche recenti
              </p>
              <button onClick={clearRecents} className="text-[11px] font-semibold text-stone-400 hover:text-primary">Pulisci</button>
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              {recents.map(r => (
                <button
                  key={r.q + r.ts}
                  onClick={() => { setQuery(r.q); setActiveStyle(""); setActiveTab("birre"); }}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold bg-stone-50 dark:bg-stone-800/40 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 tap-scale"
                >
                  {r.q}
                </button>
              ))}
            </div>
          </div>
        )}

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

        {Array.isArray(popularStyles) && popularStyles.length > 0 && (() => {
          const shortcutStyles = new Set(SHORTCUTS.map(s => s.style).filter(Boolean));
          const extraStyles = popularStyles.filter(s => !shortcutStyles.has(s.style));
          if (extraStyles.length === 0) return null;
          return (
            <div className="px-4 pb-3 flex-shrink-0">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                {extraStyles.slice(0, 15).map(s => (
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
          );
        })()}

        <div className="px-4 pb-3 flex-shrink-0">
          <div className="flex bg-stone-100 dark:bg-stone-800/60 rounded-2xl p-1 gap-1">
            {(["birre", "birrifici", "locali"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab
                    ? "bg-white dark:bg-stone-700 text-foreground shadow-sm"
                    : "text-stone-400 dark:text-stone-500"
                }`}
              >
                {tab === "birre" ? "🍺 Birre" : tab === "birrifici" ? "🏭 Birrifici" : "🏠 Locali"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 min-h-0">
          {activeTab === "birrifici" ? (
            query.length > 1 ? (
              isLoading ? (
                <div className="space-y-2.5">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-[72px] rounded-2xl bg-stone-100 dark:bg-stone-800/50 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
                  ))}
                </div>
              ) : breweries.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-stone-400 mb-2.5 flex items-center gap-1.5">
                    <Factory className="w-3.5 h-3.5 text-primary" />
                    {breweries.length} birrifici per "{query.trim()}"
                  </p>
                  {breweries.slice(0, 15).map((brewery: any) => (
                    <Link key={brewery.id} href={`/brewery/${brewery.id}`} onClick={onClose}>
                      <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white dark:bg-card border border-stone-100 dark:border-stone-800 active:scale-[0.97] transition-transform shadow-sm cursor-pointer">
                        <div className="w-12 h-12 rounded-xl flex-shrink-0 bg-stone-100 dark:bg-stone-800 overflow-hidden flex items-center justify-center">
                          {brewery.logoUrl ? (
                            <img src={brewery.logoUrl} alt={brewery.name} className="w-full h-full object-cover" />
                          ) : (
                            <Factory className="w-5 h-5 text-stone-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[14px] text-foreground truncate">{brewery.name}</p>
                          <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5 truncate">
                            {[brewery.location || brewery.city, brewery.country].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-stone-300 dark:text-stone-600 flex-shrink-0" />
                      </div>
                    </Link>
                  ))}
                  <Link href={`/explore/breweries?q=${encodeURIComponent(query)}`} onClick={onClose}>
                    <button className="w-full text-center py-3 text-sm font-bold text-primary">
                      Vedi tutti i risultati →
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-14">
                  <Factory className="w-12 h-12 mx-auto mb-3 text-stone-200 dark:text-stone-700" />
                  <p className="font-bold text-stone-500 dark:text-stone-400 mb-1">Nessun birrificio per "{query.trim()}"</p>
                  <p className="text-sm text-stone-400">Prova con un altro nome o città</p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                  <Factory className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-stone-600 dark:text-stone-400">Cerca un birrificio</p>
                  <p className="text-sm text-stone-400 mt-1">Digita il nome o la città qui sopra</p>
                </div>
                <Link href="/explore/breweries" onClick={onClose}>
                  <button className="px-5 py-2.5 rounded-2xl bg-primary text-white text-sm font-bold tap-scale">
                    Esplora tutti i birrifici →
                  </button>
                </Link>
              </div>
            )
          ) : activeTab === "birre" ? (
            isLoading ? (
              <div className="space-y-2.5">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-[72px] rounded-2xl bg-stone-100 dark:bg-stone-800/50 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
                ))}
              </div>
            ) : (beers.length > 0 || breweries.length > 0) ? (
              <>
                {(activeStyle || query.length > 1) && beers.length > 0 && (
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
                  {/* Sezione birrifici — solo durante ricerca testuale */}
                  {breweries.length > 0 && (
                    <>
                      <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5 flex items-center gap-1.5 pt-1">
                        <Factory className="w-3.5 h-3.5 text-primary" />
                        Birrifici
                      </p>
                      {breweries.slice(0, 5).map((brewery: any) => (
                        <Link key={brewery.id} href={`/brewery/${brewery.id}`} onClick={onClose}>
                          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white dark:bg-card border border-stone-100 dark:border-stone-800 active:scale-[0.97] transition-transform shadow-sm cursor-pointer">
                            <div className="w-12 h-12 rounded-xl flex-shrink-0 bg-stone-100 dark:bg-stone-800 overflow-hidden flex items-center justify-center">
                              {brewery.logoUrl ? (
                                <img src={brewery.logoUrl} alt={brewery.name} className="w-full h-full object-cover" />
                              ) : (
                                <Factory className="w-5 h-5 text-stone-300" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-[14px] text-foreground truncate">{brewery.name}</p>
                              <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5 truncate">
                                {[brewery.location || brewery.city, brewery.region].filter(Boolean).join(" · ")}
                              </p>
                            </div>
                            <div className="flex-shrink-0">
                              <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold px-2.5 py-1.5 rounded-xl">
                                <Factory className="w-3 h-3" />
                                Birrificio
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                      {beers.length > 0 && (
                        <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5 mt-3 flex items-center gap-1.5">
                          <Beer className="w-3.5 h-3.5 text-primary" />
                          Birre
                        </p>
                      )}
                    </>
                  )}
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
          ) : (() => {
            const isSearching = query.trim().length > 1;
            const pubsToShow: any[] = isSearching
              ? (pubSearchResults ?? [])
              : nearbyPubs;
            const loading = isSearching && pubSearchLoading;

            if (loading) {
              return (
                <div className="space-y-2.5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-[72px] rounded-2xl bg-stone-100 dark:bg-stone-800/50 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
                  ))}
                </div>
              );
            }

            if (pubsToShow.length > 0) {
              return (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-stone-400 mb-2.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    {isSearching
                      ? `${pubsToShow.length} locali per "${query.trim()}"`
                      : `${pubsToShow.length} locali nel raggio selezionato`}
                  </p>
                  {pubsToShow.map((pub: any) => (
                    <Link key={pub.id} href={pub.slug ? `/pub/${pub.slug}` : `/pub/${pub.id}`} onClick={onClose}>
                      <div data-testid={`pub-result-${pub.id}`} className="flex items-center gap-3.5 p-3 rounded-2xl bg-white dark:bg-card border border-stone-100 dark:border-stone-800 active:scale-[0.97] transition-transform shadow-sm cursor-pointer">
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
              );
            }

            // Empty state — distinguishes "nessun risultato per ricerca" vs "no GPS"
            if (isSearching) {
              return (
                <div className="text-center py-14">
                  <Store className="w-12 h-12 mx-auto mb-3 text-stone-200 dark:text-stone-700" />
                  <p className="font-bold text-stone-500 dark:text-stone-400 mb-1">Nessun locale per "{query.trim()}"</p>
                  <p className="text-sm text-stone-400">Prova con un altro nome o città</p>
                </div>
              );
            }
            return (
              <div className="text-center py-14">
                <MapPin className="w-12 h-12 mx-auto mb-3 text-stone-200 dark:text-stone-700" />
                <p className="font-bold text-stone-500 dark:text-stone-400 mb-1">Nessun locale vicino</p>
                <p className="text-sm text-stone-400">Cerca per nome o attiva il GPS per i pub vicino a te</p>
              </div>
            );
          })()}
        </div>
        {/* Safe area spacer for home indicator on iOS/Android */}
        <div className="flex-shrink-0 safe-area-pb" />
      </div>
    </>
  );
}
