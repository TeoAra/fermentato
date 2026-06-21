import { useState, useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Search, X, Beer, MapPin, ChevronRight, Store, Sparkles, Clock, Shuffle, Loader2, Factory, UserRound, ScanLine, ArrowLeft
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
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeStyle, setActiveStyle] = useState("");
  const [activeTab, setActiveTab] = useState<"birre" | "birrifici" | "locali" | "utenti">("birre");
  const [recents, setRecents] = useState<Recent[]>([]);
  const [surpriseLoading, setSurpriseLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);
  const [, setLocation] = useLocation();

  useLayoutEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.body.classList.add("find-beer-open");
    } else {
      document.body.style.overflow = "";
      document.body.classList.remove("find-beer-open");
    }
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("find-beer-open");
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setRecents(loadRecents());
      setTimeout(() => inputRef.current?.focus(), 350);
    } else {
      setQuery("");
      setActiveStyle("");
      setActiveTab("birre");
    }
  }, [open]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), 350);
    return () => window.clearTimeout(t);
  }, [query]);

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
      if (beer?.id) { onClose(); setLocation(`/beer/${beer.id}`); }
    } catch {} finally { setSurpriseLoading(false); }
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
    queryKey: ["/api/search", debouncedQuery],
    queryFn: () => fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`).then(r => r.json()),
    enabled: !activeStyle && debouncedQuery.length > 1,
    staleTime: 30 * 1000,
  });

  const { data: trendingBeers, isLoading: trendingLoading } = useQuery<any[]>({
    queryKey: ["/api/beers/trending"],
    staleTime: 5 * 60 * 1000,
    enabled: !activeStyle && debouncedQuery.length < 2,
  });

  const { data: pubSearchResults, isLoading: pubSearchLoading } = useQuery<any[]>({
    queryKey: ["/api/pubs/search", debouncedQuery],
    queryFn: () => fetch(`/api/pubs/search?q=${encodeURIComponent(debouncedQuery)}`).then(r => r.json()),
    enabled: activeTab === "locali" && debouncedQuery.trim().length > 1,
    staleTime: 30 * 1000,
  });

  const beers: any[] = activeStyle
    ? (styleBeers ?? [])
    : debouncedQuery.length > 1
      ? (searchResults?.beers ?? [])
      : (trendingBeers ?? []);

  const breweries: any[] = (!activeStyle && debouncedQuery.length > 1)
    ? ((searchResults as any)?.breweries ?? [])
    : [];

  const isLoading = activeStyle
    ? styleBeerLoading
    : debouncedQuery.length > 1
      ? searchLoading
      : trendingLoading;

  const hasFilter = !!activeStyle || query.length > 1;

  function clearFilters() {
    setQuery("");
    setActiveStyle("");
  }

  return (
    <>
      {/* ── MOBILE sheet: parte sotto l'header, scorre su dal basso ── */}
      <div
        className="lg:hidden fixed inset-x-0 bottom-0 z-[60]"
        style={{
          top: "var(--mobile-top-offset)",
          pointerEvents: open ? "auto" : "none",
          transform: "translateZ(0)",
        }}
      >
        <div
          className="w-full h-full flex flex-col bg-white dark:bg-[#0B0D10] rounded-t-[28px] overflow-hidden"
          style={{
            transform: open ? "translateY(0)" : "translateY(102%)",
            transition: open ? "transform 340ms cubic-bezier(0.16,1,0.3,1)" : "none",
            boxShadow: "0 -12px 48px -8px rgba(0,0,0,0.22)",
          }}
        >
          {/* Drag handle */}
          <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
            <div className="w-9 h-[3.5px] rounded-full bg-stone-200 dark:bg-stone-700" />
          </div>

          {/* Header barra ricerca */}
          <MobileSearchHeader
            query={query}
            setQuery={setQuery}
            setActiveStyle={setActiveStyle}
            clearFilters={clearFilters}
            surpriseMe={surpriseMe}
            surpriseLoading={surpriseLoading}
            onClose={onClose}
            setLocation={setLocation}
            inputRef={inputRef}
          />

          {/* Ricerche recenti */}
          {!hasFilter && recents.length > 0 && (
            <RecentSearches recents={recents} clearRecents={clearRecents} onSelect={(q) => { setQuery(q); setActiveStyle(""); setActiveTab("birre"); }} />
          )}

          {/* Shortcuts stili */}
          <StyleShortcuts activeStyle={activeStyle} activeTab={activeTab} setActiveStyle={setActiveStyle} setQuery={setQuery} setActiveTab={setActiveTab} hasFilter={hasFilter} />

          {/* Extra stili popolari */}
          {Array.isArray(popularStyles) && <ExtraStyles popularStyles={popularStyles} activeStyle={activeStyle} setActiveStyle={setActiveStyle} setQuery={setQuery} setActiveTab={setActiveTab} />}

          {/* Tab bar */}
          <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Risultati scrollabili */}
          <ResultsArea
            activeTab={activeTab}
            query={query}
            debouncedQuery={debouncedQuery}
            activeStyle={activeStyle}
            isLoading={isLoading}
            beers={beers}
            breweries={breweries}
            pubSearchResults={pubSearchResults ?? []}
            pubSearchLoading={pubSearchLoading}
            nearbyPubs={nearbyPubs}
            searchResults={searchResults}
            searchLoading={searchLoading}
            hasFilter={hasFilter}
            clearFilters={clearFilters}
            onClose={onClose}
            setQuery={setQuery}
            setLocation={setLocation}
          />
        </div>
      </div>

      {/* ── DESKTOP: overlay centrato, dimmed backdrop ── */}
      <div
        className="hidden lg:flex fixed inset-0 z-[60] items-center justify-center p-6"
        style={{
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: open ? "opacity 180ms ease" : "none",
        }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div
          className="relative z-[1] bg-white dark:bg-[#0B0D10] rounded-3xl border border-stone-200 dark:border-[#23262E] shadow-2xl flex flex-col w-full max-w-2xl max-h-[84vh] overflow-hidden"
          style={{
            transform: open ? "translateY(0) scale(1)" : "translateY(10px) scale(0.97)",
            transition: open ? "transform 280ms cubic-bezier(0.16,1,0.3,1)" : "none",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-4 flex-shrink-0" />
          <MobileSearchHeader
            query={query}
            setQuery={setQuery}
            setActiveStyle={setActiveStyle}
            clearFilters={clearFilters}
            surpriseMe={surpriseMe}
            surpriseLoading={surpriseLoading}
            onClose={onClose}
            setLocation={setLocation}
            inputRef={inputRef}
          />
          {!hasFilter && recents.length > 0 && (
            <RecentSearches recents={recents} clearRecents={clearRecents} onSelect={(q) => { setQuery(q); setActiveStyle(""); setActiveTab("birre"); }} />
          )}
          <StyleShortcuts activeStyle={activeStyle} activeTab={activeTab} setActiveStyle={setActiveStyle} setQuery={setQuery} setActiveTab={setActiveTab} hasFilter={hasFilter} />
          {Array.isArray(popularStyles) && <ExtraStyles popularStyles={popularStyles} activeStyle={activeStyle} setActiveStyle={setActiveStyle} setQuery={setQuery} setActiveTab={setActiveTab} />}
          <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
          <ResultsArea
            activeTab={activeTab}
            query={query}
            debouncedQuery={debouncedQuery}
            activeStyle={activeStyle}
            isLoading={isLoading}
            beers={beers}
            breweries={breweries}
            pubSearchResults={pubSearchResults ?? []}
            pubSearchLoading={pubSearchLoading}
            nearbyPubs={nearbyPubs}
            searchResults={searchResults}
            searchLoading={searchLoading}
            hasFilter={hasFilter}
            clearFilters={clearFilters}
            onClose={onClose}
            setQuery={setQuery}
            setLocation={setLocation}
          />
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────── sub-components ─────────────────────────── */

interface SearchHeaderProps {
  query: string;
  setQuery: (q: string) => void;
  setActiveStyle: (s: string) => void;
  clearFilters: () => void;
  surpriseMe: () => void;
  surpriseLoading: boolean;
  onClose: () => void;
  setLocation: (path: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

function MobileSearchHeader({ query, setQuery, setActiveStyle, clearFilters, surpriseMe, surpriseLoading, onClose, setLocation, inputRef }: SearchHeaderProps) {
  return (
    <div className="px-4 pt-2 pb-3 flex-shrink-0">
      <div className="flex items-center gap-2.5">
        <button
          onClick={onClose}
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/[0.06] transition-colors"
          aria-label="Chiudi ricerca"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveStyle(""); }}
            placeholder="Cerca birra, stile o birrificio…"
            className="w-full pl-10 pr-9 py-3 rounded-2xl bg-stone-100 dark:bg-white/[0.06] text-[15px] text-foreground placeholder-stone-400 dark:placeholder-stone-500 border-0 outline-none font-medium"
          />
          {(query) && (
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
          className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-primary to-orange-400 text-white flex items-center justify-center shadow-sm tap-scale disabled:opacity-60"
        >
          {surpriseLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shuffle className="w-4 h-4" />}
        </button>
        <button
          onClick={() => { onClose(); setLocation("/scan"); }}
          title="Scansiona etichetta o codice a barre"
          className="flex-shrink-0 w-9 h-9 rounded-full bg-stone-100 dark:bg-white/[0.06] flex items-center justify-center tap-scale"
        >
          <ScanLine className="w-4 h-4 text-stone-600 dark:text-stone-300" />
        </button>
      </div>
    </div>
  );
}

function RecentSearches({ recents, clearRecents, onSelect }: { recents: Recent[]; clearRecents: () => void; onSelect: (q: string) => void }) {
  return (
    <div className="px-4 pb-2 flex-shrink-0">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Recenti
        </p>
        <button onClick={clearRecents} className="text-[11px] font-semibold text-stone-400 hover:text-primary">Pulisci</button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {recents.map(r => (
          <button
            key={r.q + r.ts}
            onClick={() => onSelect(r.q)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold bg-stone-50 dark:bg-white/[0.05] text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-white/[0.08] tap-scale"
          >
            {r.q}
          </button>
        ))}
      </div>
    </div>
  );
}

function StyleShortcuts({ activeStyle, activeTab, setActiveStyle, setQuery, setActiveTab, hasFilter }: {
  activeStyle: string; activeTab: string; setActiveStyle: (s: string) => void;
  setQuery: (q: string) => void; setActiveTab: (t: any) => void; hasFilter: boolean;
}) {
  return (
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
            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold border transition-colors tap-scale ${
              (s.style && activeStyle === s.style) || (!s.style && activeTab === "locali" && !hasFilter)
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-stone-50 dark:bg-white/[0.04] text-stone-600 dark:text-stone-300 border-stone-200 dark:border-white/[0.08]"
            }`}
          >
            <span className="text-base leading-none">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ExtraStyles({ popularStyles, activeStyle, setActiveStyle, setQuery, setActiveTab }: {
  popularStyles: { style: string; count: number }[];
  activeStyle: string; setActiveStyle: (s: string) => void;
  setQuery: (q: string) => void; setActiveTab: (t: any) => void;
}) {
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
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors tap-scale ${
              activeStyle === s.style
                ? "bg-primary text-white border-primary"
                : "bg-white dark:bg-white/[0.04] text-stone-500 dark:text-stone-400 border-stone-200 dark:border-white/[0.08]"
            }`}
          >
            {s.style.split(" - ")[0].split("/")[0].trim()}
          </button>
        ))}
      </div>
    </div>
  );
}

function TabBar({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (t: any) => void }) {
  return (
    <div className="px-4 pb-3 flex-shrink-0">
      <div className="flex bg-stone-100 dark:bg-white/[0.05] rounded-2xl p-1 gap-0.5">
        {(["birre", "birrifici", "locali", "utenti"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab
                ? "bg-white dark:bg-[#1A1D24] text-foreground shadow-sm"
                : "text-stone-400 dark:text-stone-500"
            }`}
          >
            {tab === "birre" ? "🍺 Birre" : tab === "birrifici" ? "🏭 Birrifici" : tab === "locali" ? "🏠 Locali" : "👤 Utenti"}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ResultsAreaProps {
  activeTab: string;
  query: string;
  debouncedQuery: string;
  activeStyle: string;
  isLoading: boolean;
  beers: any[];
  breweries: any[];
  pubSearchResults: any[];
  pubSearchLoading: boolean;
  nearbyPubs: any[];
  searchResults: any;
  searchLoading: boolean;
  hasFilter: boolean;
  clearFilters: () => void;
  onClose: () => void;
  setQuery: (q: string) => void;
  setLocation: (path: string) => void;
}

function ResultsArea({ activeTab, query, debouncedQuery, activeStyle, isLoading, beers, breweries, pubSearchResults, pubSearchLoading, nearbyPubs, searchResults, searchLoading, hasFilter, clearFilters, onClose, setQuery, setLocation }: ResultsAreaProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 pb-[max(24px,env(safe-area-inset-bottom))] min-h-0">
      {activeTab === "birrifici" ? (
        query.length > 1 ? (
          isLoading ? <SkeletonList count={4} /> : breweries.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-stone-400 mb-2.5 flex items-center gap-1.5">
                <Factory className="w-3.5 h-3.5 text-primary" />
                {breweries.length} birrifici per "{query.trim()}"
              </p>
              {breweries.slice(0, 15).map((brewery: any) => (
                <Link key={brewery.id} href={`/brewery/${brewery.id}`} onClick={onClose}>
                  <ResultRow icon={<Factory className="w-5 h-5 text-stone-300" />} img={brewery.logoUrl} title={brewery.name} subtitle={[brewery.location || brewery.city, brewery.country].filter(Boolean).join(" · ")} />
                </Link>
              ))}
              <Link href={`/explore/breweries?q=${encodeURIComponent(query)}`} onClick={onClose}>
                <button className="w-full text-center py-3 text-sm font-bold text-primary">Vedi tutti i risultati →</button>
              </Link>
            </div>
          ) : (
            <EmptyState icon={<Factory className="w-12 h-12 mx-auto mb-3 text-stone-200 dark:text-stone-700" />}
              title={`Nessun birrificio per "${query.trim()}"`} subtitle="Prova con un altro nome o città" />
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
              <button className="px-5 py-2.5 rounded-2xl bg-primary text-white text-sm font-bold tap-scale">Esplora tutti i birrifici →</button>
            </Link>
          </div>
        )
      ) : activeTab === "birre" ? (
        isLoading ? <SkeletonList count={5} /> : beers.length > 0 ? (
          <>
            {(activeStyle || query.length > 1) && (
              <p className="text-xs font-semibold text-stone-400 mb-2.5">
                {beers.length} birre {activeStyle ? `· stile ${activeStyle.split(" - ")[0]}` : ""}
              </p>
            )}
            {!hasFilter && (
              <p className="text-xs font-semibold text-stone-400 mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Tendenza adesso
              </p>
            )}
            <div className="space-y-2">
              {beers.slice(0, 40).map((beer: any) => (
                <Link key={beer.id} href={`/beer/${beer.id}`} onClick={onClose}>
                  <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white dark:bg-white/[0.03] border border-stone-100 dark:border-white/[0.06] active:scale-[0.97] transition-transform shadow-sm cursor-pointer">
                    <div className="w-12 h-12 rounded-xl flex-shrink-0 bg-stone-100 dark:bg-white/[0.05] overflow-hidden flex items-center justify-center">
                      {beer.imageUrl || beer.breweryLogoUrl
                        ? <img src={beer.imageUrl || beer.breweryLogoUrl} alt={beer.name} className="w-full h-full object-cover" />
                        : <Beer className="w-5 h-5 text-stone-300" />}
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
                    <span className="flex-shrink-0 inline-flex items-center gap-1 bg-primary/10 dark:bg-primary/15 text-primary text-xs font-bold px-2.5 py-1.5 rounded-xl">
                      <Beer className="w-3 h-3" /> Bevi
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : hasFilter ? (
          <EmptyState icon={<Beer className="w-12 h-12 mx-auto mb-3 text-stone-200 dark:text-stone-700" />}
            title="Nessuna birra trovata" subtitle="Prova con un altro stile o termine">
            <button onClick={clearFilters} className="mt-5 px-4 py-2 rounded-xl border border-stone-200 dark:border-white/[0.08] text-sm font-semibold text-stone-500">
              Cambia stile
            </button>
          </EmptyState>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-primary" />
            </div>
            <p className="font-semibold text-stone-600 dark:text-stone-400">Cerca una birra</p>
            <p className="text-sm text-stone-400 mt-1">Oppure seleziona uno stile qui sopra</p>
          </div>
        )
      ) : activeTab === "locali" ? (() => {
        const isSearching = query.trim().length > 1;
        const pubsToShow: any[] = isSearching ? pubSearchResults : nearbyPubs;
        const loading = isSearching && pubSearchLoading;
        if (loading) return <SkeletonList count={5} />;
        if (pubsToShow.length > 0) return (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-stone-400 mb-2.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              {isSearching ? `${pubsToShow.length} locali per "${query.trim()}"` : `${pubsToShow.length} locali nel raggio selezionato`}
            </p>
            {pubsToShow.map((pub: any) => (
              <Link key={pub.id} href={pub.slug ? `/pub/${pub.slug}` : `/pub/${pub.id}`} onClick={onClose}>
                <ResultRow icon={<Store className="w-5 h-5 text-stone-300" />} img={pub.logoUrl} title={pub.name}
                  subtitle={[pub.city, pub._distance != null ? (pub._distance < 1 ? `${Math.round(pub._distance * 1000)} m` : `${pub._distance.toFixed(1)} km`) : null].filter(Boolean).join(" · ")} />
              </Link>
            ))}
          </div>
        );
        if (isSearching) return <EmptyState icon={<Store className="w-12 h-12 mx-auto mb-3 text-stone-200 dark:text-stone-700" />} title={`Nessun locale per "${query.trim()}"`} subtitle="Prova con un altro nome o città" />;
        return <EmptyState icon={<MapPin className="w-12 h-12 mx-auto mb-3 text-stone-200 dark:text-stone-700" />} title="Nessun locale vicino" subtitle="Cerca per nome o attiva il GPS per i pub vicino a te" />;
      })() : (() => {
        const users: any[] = query.length > 1 ? ((searchResults as any)?.users ?? []) : [];
        if (searchLoading && query.length > 1) return <SkeletonList count={4} />;
        if (users.length > 0) return (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-stone-400 mb-2.5 flex items-center gap-1.5">
              <UserRound className="w-3.5 h-3.5 text-primary" />
              {users.length} utent{users.length === 1 ? "e" : "i"} per "{query.trim()}"
            </p>
            {users.map((u: any) => (
              <Link key={u.id} href={`/user/${u.nickname || u.id}`} onClick={onClose}>
                <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white dark:bg-white/[0.03] border border-stone-100 dark:border-white/[0.06] active:scale-[0.97] transition-transform shadow-sm cursor-pointer">
                  <div className="w-12 h-12 rounded-full flex-shrink-0 bg-stone-100 dark:bg-white/[0.05] overflow-hidden flex items-center justify-center">
                    {u.profileImageUrl
                      ? <img loading="lazy" src={u.profileImageUrl} alt={u.nickname} className="w-full h-full object-cover" />
                      : <span className="text-base font-bold text-stone-400">{u.nickname?.[0]?.toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[14px] text-foreground truncate">@{u.nickname}</p>
                    {u.firstName && <p className="text-xs text-stone-400 mt-0.5 truncate">{u.firstName} {u.lastName}</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-300 dark:text-stone-600 flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        );
        return (
          <EmptyState icon={<UserRound className="w-12 h-12 mx-auto mb-3 text-stone-200 dark:text-stone-700" />}
            title={query.length > 1 ? `Nessun utente per "${query.trim()}"` : "Cerca un utente"}
            subtitle={query.length > 1 ? "Prova con nickname o nome" : "Digita il nickname qui sopra"} />
        );
      })()}
    </div>
  );
}

function ResultRow({ icon, img, title, subtitle }: { icon: React.ReactNode; img?: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white dark:bg-white/[0.03] border border-stone-100 dark:border-white/[0.06] active:scale-[0.97] transition-transform shadow-sm cursor-pointer">
      <div className="w-12 h-12 rounded-xl flex-shrink-0 bg-stone-100 dark:bg-white/[0.05] overflow-hidden flex items-center justify-center">
        {img ? <img loading="lazy" src={img} alt={title} className="w-full h-full object-cover" /> : icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[14px] text-foreground truncate">{title}</p>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5 truncate">{subtitle}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-stone-300 dark:text-stone-600 flex-shrink-0" />
    </div>
  );
}

function SkeletonList({ count }: { count: number }) {
  return (
    <div className="space-y-2.5">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="h-[72px] rounded-2xl bg-stone-100 dark:bg-white/[0.04] animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  );
}

function EmptyState({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <div className="text-center py-14">
      {icon}
      <p className="font-bold text-stone-500 dark:text-stone-400 mb-1">{title}</p>
      <p className="text-sm text-stone-400">{subtitle}</p>
      {children}
    </div>
  );
}
