import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Beer, ArrowLeft, Search, X, ChevronRight, SlidersHorizontal, Bookmark, Star, Map as MapIcon, Navigation, Dices, MapPin, Flame, Sparkles, Trophy } from "lucide-react";
import { lazy, Suspense } from "react";
const PubMap = lazy(() => import("@/components/pub-map").then(m => ({ default: m.PubMap })));
import FindBeerSheet from "@/components/FindBeerSheet";
import { EmptyState } from "@/components/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { getCurrentPosition, isGeolocationAvailable } from "@/lib/geolocation";

type ViewMode = "list" | "map";
type StyleTab = "birre" | "dove";

interface StyleMeta {
  label: string;
  api: string;
  emoji: string;
  bg: string;
  ring: string;
}

const STYLE_GROUPS: { title: string; icon: React.ReactNode; items: StyleMeta[] }[] = [
  {
    title: "Ora popolari",
    icon: <Flame className="w-4 h-4 text-orange-500" />,
    items: [
      { label: "IPA",       api: "IPA",                       emoji: "🌿", bg: "bg-emerald-50 dark:bg-emerald-950/30", ring: "ring-emerald-100 dark:ring-emerald-900/40" },
      { label: "Hazy IPA",  api: "IPA - Hazy (NEIPA)",        emoji: "☁️", bg: "bg-amber-50 dark:bg-amber-950/30",     ring: "ring-amber-100 dark:ring-amber-900/40" },
      { label: "Stout",     api: "Stout - Imperial",          emoji: "🖤", bg: "bg-stone-100 dark:bg-[#1B2735]/60",    ring: "ring-stone-200 dark:ring-stone-700/40" },
      { label: "Sour",      api: "Sour / Wild Beer",          emoji: "🍒", bg: "bg-rose-50 dark:bg-rose-950/30",       ring: "ring-rose-100 dark:ring-rose-900/40" },
      { label: "DIPA",      api: "IIPA DIPA - Imperial / Double IPA", emoji: "💪", bg: "bg-lime-50 dark:bg-lime-950/30", ring: "ring-lime-100 dark:ring-lime-900/40" },
    ],
  },
  {
    title: "Da scoprire",
    icon: <Sparkles className="w-4 h-4 text-amber-500" />,
    items: [
      { label: "Saison",       api: "Saison / Farmhouse / Grisette", emoji: "🌾", bg: "bg-yellow-50 dark:bg-yellow-950/30", ring: "ring-yellow-100 dark:ring-yellow-900/40" },
      { label: "Porter",       api: "Porter",                        emoji: "☕", bg: "bg-stone-100 dark:bg-[#1B2735]/60", ring: "ring-stone-200 dark:ring-stone-700/40" },
      { label: "Fruit Ale",    api: "Flavored - Fruit",              emoji: "🍑", bg: "bg-orange-50 dark:bg-orange-950/30", ring: "ring-orange-100 dark:ring-orange-900/40" },
      { label: "Apple Cider",  api: "Apple Cider",                   emoji: "🍎", bg: "bg-red-50 dark:bg-red-950/30",      ring: "ring-red-100 dark:ring-red-900/40" },
      { label: "Witbier",      api: "Witbier / Belgian White Ale",   emoji: "🌼", bg: "bg-amber-50 dark:bg-amber-950/30",  ring: "ring-amber-100 dark:ring-amber-900/40" },
    ],
  },
  {
    title: "Classici intramontabili",
    icon: <Trophy className="w-4 h-4 text-amber-600" />,
    items: [
      { label: "Pilsner",    api: "Pilsener / Pils / Pilsner",         emoji: "🍺", bg: "bg-amber-50 dark:bg-amber-950/30",   ring: "ring-amber-100 dark:ring-amber-900/40" },
      { label: "Blonde Ale", api: "Blonde Ale / Golden Ale",           emoji: "🍻", bg: "bg-yellow-50 dark:bg-yellow-950/30", ring: "ring-yellow-100 dark:ring-yellow-900/40" },
      { label: "Amber Ale",  api: "Red Ale / International Amber Ale", emoji: "🟧", bg: "bg-orange-50 dark:bg-orange-950/30", ring: "ring-orange-100 dark:ring-orange-900/40" },
      { label: "Brown Ale",  api: "Brown Ale",                         emoji: "🟫", bg: "bg-amber-50 dark:bg-amber-950/30",   ring: "ring-amber-100 dark:ring-amber-900/40" },
      { label: "Weizen",     api: "Weissbier - Hefeweizen",            emoji: "🌾", bg: "bg-yellow-50 dark:bg-yellow-950/30", ring: "ring-yellow-100 dark:ring-yellow-900/40" },
    ],
  },
];

const ALL_STYLE_METAS: StyleMeta[] = STYLE_GROUPS.flatMap(g => g.items);

function getStyleMeta(api: string): StyleMeta {
  const found = ALL_STYLE_METAS.find(s => s.api.toLowerCase() === api.toLowerCase());
  if (found) return found;
  return { label: api, api, emoji: "🍺", bg: "bg-stone-100 dark:bg-[#1B2735]/60", ring: "ring-stone-200 dark:ring-stone-700/40" };
}

function isOpenNow(openingHours: any): boolean {
  if (!openingHours) return false;
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const today = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][now.getDay()];
  const hours = openingHours[today];
  if (!hours || hours.isClosed || !hours.open || !hours.close) return false;
  const [oh, om] = hours.open.split(':').map(Number);
  const [ch, cm] = hours.close.split(':').map(Number);
  const o = oh * 60 + om, c = ch * 60 + cm;
  return c < o ? (currentTime >= o || currentTime <= c) : (currentTime >= o && currentTime <= c);
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export default function ExploreBeers() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const initialStyle = params.get("style") || "";
  const initialQ = params.get("q") || "";

  const [activeStyle, setActiveStyle] = useState(initialStyle);
  const [freeQuery, setFreeQuery] = useState(initialQ);
  const [inputValue, setInputValue] = useState(initialStyle || initialQ);
  const [styleTab, setStyleTab] = useState<StyleTab>("birre");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [distanceKm, setDistanceKm] = useState(10);
  const [pubFilter, setPubFilter] = useState<"all" | "open">("all");
  const [stylesView, setStylesView] = useState<null | "popular" | "discover">(null);
  const [findBeerOpen, setFindBeerOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(() => {
    try { const c = localStorage.getItem("fermenta:userLocation"); return c ? JSON.parse(c) : null; } catch { return null; }
  });

  // Sync state ⇄ URL on browser back/forward
  useEffect(() => {
    function sync() {
      const p = new URLSearchParams(window.location.search);
      const s = p.get("style") || "";
      const q = p.get("q") || "";
      setActiveStyle(s);
      setFreeQuery(q);
      setInputValue(s || q);
    }
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const { data: popularStyles } = useQuery<{ style: string; count: number }[]>({
    queryKey: ["/api/beers/popular-styles", 80],
    queryFn: () => fetch(`/api/beers/popular-styles?limit=80`).then(r => r.json()),
    staleTime: 10 * 60 * 1000,
  });

  const styleCount = useMemo(() => {
    const map = new Map<string, number>();
    (popularStyles ?? []).forEach(s => map.set(s.style.toLowerCase(), s.count));
    return (api: string) => map.get(api.toLowerCase()) ?? 0;
  }, [popularStyles]);

  // Tutti gli stili ordinati per popolarità (numero di birre con quello stile)
  const sortedAllStyles = useMemo(() => {
    if (!popularStyles) return [];
    const filtered = popularStyles.filter(s => s.style && s.style.trim().length > 1);
    const sorted = [...filtered].sort((a, b) =>
      stylesView === "discover" ? a.count - b.count : b.count - a.count,
    );
    return sorted.slice(0, 40);
  }, [popularStyles, stylesView]);


  const { data: styleBeers, isLoading: styleLoading } = useQuery<any[]>({
    queryKey: ["/api/beers/by-style", activeStyle],
    queryFn: () => fetch(`/api/beers/by-style?style=${encodeURIComponent(activeStyle)}&limit=60`).then(r => r.json()),
    enabled: !!activeStyle,
    staleTime: 2 * 60 * 1000,
  });

  const { data: searchResults, isLoading: searchLoading } = useQuery<{ beers: any[] }>({
    queryKey: ["/api/search", freeQuery],
    queryFn: () => fetch(`/api/search?q=${encodeURIComponent(freeQuery)}`).then(r => r.json()),
    enabled: !activeStyle && freeQuery.length > 1,
    staleTime: 2 * 60 * 1000,
  });

  // Pubs that serve THIS beer style on tap
  const { data: stylePubs, isLoading: stylePubsLoading } = useQuery<any[]>({
    queryKey: ["/api/pubs/by-style", activeStyle],
    queryFn: () => fetch(`/api/pubs/by-style?style=${encodeURIComponent(activeStyle)}`).then(r => r.json()),
    enabled: !!activeStyle,
    staleTime: 5 * 60 * 1000,
  });

  const beers: any[] = activeStyle ? (styleBeers ?? []) : (searchResults?.beers ?? []);
  const isLoading = activeStyle ? styleLoading : searchLoading;
  const styleMeta = activeStyle ? getStyleMeta(activeStyle) : null;
  const activeCount = activeStyle ? styleCount(activeStyle) : 0;

  const pubsWithDist = useMemo(() => {
    const arr = Array.isArray(stylePubs) ? stylePubs : [];
    return arr.map((p: any) => {
      if (userLocation && p.latitude && p.longitude) {
        const d = haversine(userLocation.lat, userLocation.lng, parseFloat(p.latitude), parseFloat(p.longitude));
        return { ...p, _dist: d };
      }
      return { ...p, _dist: null };
    }).sort((a, b) => (a._dist ?? 999) - (b._dist ?? 999));
  }, [stylePubs, userLocation]);

  const filteredPubs = useMemo(() => {
    let arr = pubsWithDist;
    if (userLocation) arr = arr.filter((p: any) => p._dist != null && p._dist <= distanceKm);
    if (pubFilter === "open") arr = arr.filter((p: any) => isOpenNow(p.openingHours));
    return arr;
  }, [pubsWithDist, userLocation, distanceKm, pubFilter]);

  const mapPins = useMemo(() => filteredPubs.map((p: any) => ({ ...p, type: "pub" as const })), [filteredPubs]);

  function handleLocate() {
    if (!isGeolocationAvailable()) return;
    getCurrentPosition().then(pos => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserLocation(loc);
      try { localStorage.setItem("fermenta:userLocation", JSON.stringify(loc)); } catch {}
    }).catch(() => {});
  }

  function selectStyle(api: string) {
    setActiveStyle(api);
    setFreeQuery("");
    setInputValue(api);
    setStyleTab("birre");
    setViewMode("list");
    window.history.pushState(null, "", `/explore/beers?style=${encodeURIComponent(api)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function runSearch(q: string) {
    setActiveStyle("");
    setFreeQuery(q);
    setInputValue(q);
    window.history.pushState(null, "", `/explore/beers?q=${encodeURIComponent(q)}`);
  }

  function clearAll() {
    setActiveStyle("");
    setFreeQuery("");
    setInputValue("");
    window.history.pushState(null, "", `/explore/beers`);
  }

  async function surpriseMe() {
    try {
      // Pesca da quelle più cliccate/visualizzate negli ultimi 14 giorni
      const r = await fetch("/api/beers/trending?limit=20&days=14");
      const data = await r.json();
      const list = Array.isArray(data) ? data : (data.beers ?? []);
      if (list.length > 0) {
        const pick = list[Math.floor(Math.random() * list.length)];
        if (pick?.id) { setLocation(`/beer/${pick.id}`); return; }
      }
      // Fallback: random tra tutte se trending è vuoto
      const r2 = await fetch("/api/beers?random=true&limit=1");
      const d2 = await r2.json();
      const b = (d2.beers ?? d2 ?? [])[0];
      if (b?.id) setLocation(`/beer/${b.id}`);
    } catch {}
  }

  // ── FULLSCREEN MAP for "Dove berle" ──
  if (viewMode === "map" && activeStyle) {
    return (
      <div className="fixed inset-x-0 bottom-0 top-14 z-40 bg-background">
        <div className="absolute top-3 left-3 right-3 z-50 flex items-center gap-2 pointer-events-none">
          <button
            onClick={() => setViewMode("list")}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-bold bg-white dark:bg-card shadow-lg border border-stone-100 dark:border-border text-foreground tap-scale"
          >
            ← Lista
          </button>
          <div className="flex-1 pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-2xl bg-white dark:bg-card shadow-lg border border-stone-100 dark:border-border">
            <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm font-bold text-foreground truncate">{filteredPubs.length} pub · {styleMeta?.label}</span>
          </div>
        </div>
        <Suspense fallback={<div className="w-full h-full bg-stone-100 dark:bg-[#1B2735] animate-pulse" />}><PubMap pins={mapPins} height="100%" /></Suspense>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F4F0] dark:bg-background">
      <Helmet>
        <title>Catalogo Birre Artigianali | Fermenta.to</title>
        <meta name="description" content="Sfoglia migliaia di birre artigianali italiane e internazionali. Filtra per stile (IPA, Stout, Saison, Pilsner…), cerca per nome o birrificio e scopri le tue preferite su Fermenta.to." />
        <meta property="og:title" content="Catalogo Birre Artigianali | Fermenta.to" />
        <meta property="og:url" content="https://fermenta.to/explore/beers" />
        <link rel="canonical" href="https://fermenta.to/explore/beers" />
      </Helmet>

      {!activeStyle ? (
        // ═══════════════════════════════════════════════════════════════
        // MAIN VIEW — Esplora Birre
        // ═══════════════════════════════════════════════════════════════
        <>
        {/* Search bar + filtri stile — sticky sotto header */}
        <div
          className="sticky lg:top-16 z-30 bg-[#F7F4F0]/95 dark:bg-background/95 backdrop-blur-md border-b border-stone-100 dark:border-[#2F3D4D]/60"
          style={{ top: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}
        >
          <PageContainer variant="wide" className="py-2.5 space-y-2.5">
            <div className="flex items-center gap-2 bg-white dark:bg-card rounded-2xl px-4 py-2.5 border border-stone-100 dark:border-[#2F3D4D]/60 shadow-sm">
              <Search className="h-4 w-4 text-stone-400 flex-shrink-0" />
              <input
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && inputValue.trim()) runSearch(inputValue.trim()); }}
                placeholder="Cerca birra, stile o birrificio…"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-stone-400 outline-none min-w-0 font-medium"
              />
              {inputValue ? (
                <button onClick={clearAll} className="tap-scale"><X className="h-4 w-4 text-stone-400" /></button>
              ) : (
                <SlidersHorizontal className="h-4 w-4 text-stone-400" />
              )}
            </div>
            {/* Quick-filter stili */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-0.5 px-0.5 pb-0.5">
              {[
                { label: "IPA",     emoji: "🌿", api: "IPA" },
                { label: "Stout",   emoji: "🖤", api: "Stout - Imperial" },
                { label: "Sour",    emoji: "🍒", api: "Sour / Wild Beer" },
                { label: "Weizen",  emoji: "🌾", api: "Weissbier - Hefeweizen" },
                { label: "Pilsner", emoji: "🍺", api: "Pilsener / Pils / Pilsner" },
                { label: "Saison",  emoji: "🌻", api: "Saison / Farmhouse / Grisette" },
                { label: "Porter",  emoji: "☕", api: "Porter" },
                { label: "Amber",   emoji: "🟧", api: "Red Ale / International Amber Ale" },
                { label: "Hazy",    emoji: "☁️", api: "IPA - Hazy (NEIPA)" },
                { label: "DIPA",    emoji: "💪", api: "IIPA DIPA - Imperial / Double IPA" },
              ].map(s => (
                <button
                  key={s.label}
                  onClick={() => selectStyle(s.api)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white dark:bg-card border border-stone-200 dark:border-[#2F3D4D] text-stone-700 dark:text-stone-200 tap-scale hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary transition-colors shadow-sm"
                >
                  <span className="text-sm leading-none">{s.emoji}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </PageContainer>
        </div>

        <PageContainer as="main" variant="wide" className="pt-4 pb-28 lg:pb-12">
          <header className="mb-4">
            <h1 className="text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight">Esplora Birre</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Scopri nuovi stili e trova la tua prossima preferita</p>
          </header>

          {/* Search results inline */}
          {freeQuery && (
            <SearchResultsBlock beers={beers} loading={isLoading} query={freeQuery} onClear={clearAll} />
          )}

          {!freeQuery && stylesView && (
            // ──────────────────────────────────────────────────────────────
            // VISTA "TUTTI GLI STILI" — popolari (DESC) o da scoprire (ASC)
            // ──────────────────────────────────────────────────────────────
            <section className="mt-2">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setStylesView(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-primary tap-scale hover:opacity-80"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Indietro
                </button>
                <h2 className="flex items-center gap-2 text-[16px] lg:text-[17px] font-extrabold text-foreground">
                  {stylesView === "popular" ? <Flame className="w-4 h-4 text-orange-500" /> : <Sparkles className="w-4 h-4 text-amber-500" />}
                  {stylesView === "popular" ? "Tutti gli stili — popolari" : "Tutti gli stili — da scoprire"}
                </h2>
                <span className="text-xs text-stone-400 font-medium">{sortedAllStyles.length}</span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
                {stylesView === "popular"
                  ? "Ordinati per numero di birre con quello stile (i più cliccati in alto)."
                  : "Stili meno comuni — perfetti per esplorare nuovi sapori."}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {sortedAllStyles.map(s => {
                  const meta = getStyleMeta(s.style);
                  return (
                    <StyleCard key={s.style} meta={meta} count={s.count} onClick={() => selectStyle(s.style)} />
                  );
                })}
              </div>
            </section>
          )}

          {!freeQuery && !stylesView && (
            <>
              {/* Hero card "Cosa si beve vicino a te?" */}
              <CosaSiBeveCard onClick={() => setFindBeerOpen(true)} />

              {/* Style sections */}
              {STYLE_GROUPS.map(group => (
                <section key={group.title} className="mt-7">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="flex items-center gap-2 text-[16px] lg:text-[17px] font-extrabold text-foreground">
                      {group.icon}
                      {group.title}
                    </h2>
                    <button
                      onClick={() => setStylesView(group.title === "Da scoprire" ? "discover" : "popular")}
                      className="text-xs font-bold text-primary tap-scale hover:opacity-80"
                    >
                      Vedi tutte
                    </button>
                  </div>
                  {/* Mobile: horizontal scroll. Desktop: grid */}
                  <div className="flex gap-2.5 overflow-x-auto scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-5 lg:gap-3 pb-1">
                    {group.items.map(s => (
                      <div key={s.api} className="flex-shrink-0 w-[78px] lg:w-auto">
                        <StyleCard meta={s} count={styleCount(s.api)} onClick={() => selectStyle(s.api)} />
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              {/* "Non sai cosa scegliere?" surprise card */}
              <section className="mt-7">
                <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950/20 dark:via-amber-950/20 dark:to-yellow-950/20 rounded-3xl p-5 border border-orange-100 dark:border-orange-900/30 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#15202B]/40 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Dices className="w-7 h-7 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-extrabold text-foreground">Non sai cosa scegliere?</h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Facci sorprendere dal destino</p>
                    <button
                      onClick={surpriseMe}
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-primary text-white text-xs font-bold tap-scale shadow-sm hover:bg-primary/90 transition-colors"
                    >
                      Fammi scoprire qualcosa
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
        </PageContainer>
        </>
      ) : (
        // ═══════════════════════════════════════════════════════════════
        // STYLE SELECTED VIEW — Hai selezionato X
        // ═══════════════════════════════════════════════════════════════
        <PageContainer as="main" variant="wide" className="pt-3 pb-28 lg:pb-12">
          {/* Back link */}
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 text-sm font-semibold text-stone-500 hover:text-foreground mb-3 tap-scale"
          >
            <ArrowLeft className="w-4 h-4" />
            Esplora birre
          </button>

          {/* Hero card with selected style */}
          <div className={`relative rounded-3xl overflow-hidden mb-4 ${styleMeta?.bg ?? "bg-stone-100"} ring-1 ${styleMeta?.ring ?? "ring-stone-200"}`}>
            <div className="relative p-5 lg:p-6">
              <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">Hai selezionato</span>
              <h1 className="text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight leading-tight">{styleMeta?.label ?? activeStyle}</h1>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-card/60 backdrop-blur-sm">
                <Beer className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-foreground">{activeCount.toLocaleString("it-IT")} birre</span>
              </div>
              <p className="text-sm text-stone-600 dark:text-stone-300 mt-3 max-w-md leading-relaxed">{styleDescription(activeStyle)}</p>
            </div>
            <div className="absolute right-0 bottom-0 text-[88px] lg:text-[110px] leading-none opacity-25 select-none pointer-events-none translate-x-3 translate-y-3">
              {styleMeta?.emoji ?? "🍺"}
            </div>
          </div>

          {/* Toggle Birre / Dove berle */}
          <div className="flex items-center gap-2 mb-4 p-1 bg-stone-100 dark:bg-[#1B2735]/60 rounded-2xl w-fit">
            {(["birre", "dove"] as StyleTab[]).map(t => (
              <button
                key={t}
                onClick={() => setStyleTab(t)}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
                  styleTab === t
                    ? "bg-primary text-white shadow-sm"
                    : "text-stone-500 dark:text-stone-400 hover:text-foreground"
                }`}
              >
                {t === "birre" ? "Birre" : "Dove berle"}
              </button>
            ))}
          </div>

          {styleTab === "birre" ? (
            <BirreTab
              beers={beers}
              loading={isLoading}
              pubs={pubsWithDist.slice(0, 6)}
              pubsLoading={stylePubsLoading}
              userLocation={userLocation}
              onSeeAllPubs={() => setStyleTab("dove")}
            />
          ) : (
            <DoveBerleTab
              styleLabel={styleMeta?.label ?? activeStyle}
              pubs={filteredPubs}
              userLocation={userLocation}
              distanceKm={distanceKm}
              setDistanceKm={setDistanceKm}
              pubFilter={pubFilter}
              setPubFilter={setPubFilter}
              onOpenMap={() => setViewMode("map")}
              onLocate={handleLocate}
            />
          )}
        </PageContainer>
      )}

      <FindBeerSheet
        open={findBeerOpen}
        onClose={() => setFindBeerOpen(false)}
        nearbyPubs={[]}
      />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ───────────────────────────────────────────────────────────────────────

function StyleCard({ meta, count, onClick }: { meta: StyleMeta; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white dark:bg-card border border-stone-100 dark:border-[#2F3D4D]/60 shadow-sm tap-scale hover:border-primary/30 hover:shadow-md transition-all`}
    >
      <div className={`w-11 h-11 rounded-xl ${meta.bg} ring-1 ${meta.ring} flex items-center justify-center text-xl`}>
        {meta.emoji}
      </div>
      <span className="text-[12px] font-bold text-foreground text-center leading-tight line-clamp-1">{meta.label}</span>
      {count > 0 && (
        <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">{count.toLocaleString("it-IT")} birre</span>
      )}
    </button>
  );
}

function CosaSiBeveCard({ onClick }: { onClick: () => void }) {
  return (
    <div className="relative bg-white dark:bg-card rounded-3xl overflow-hidden border border-stone-100 dark:border-[#2F3D4D]/60 shadow-sm">
      <div className="flex items-stretch">
        <div className="flex-1 min-w-0 p-5">
          <h2 className="text-lg font-extrabold text-foreground leading-tight">Cosa si beve<br />vicino a te?</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 leading-relaxed">Scopri le birre più popolari dai pub della tua zona</p>
          <button
            onClick={onClick}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-primary text-white text-sm font-bold tap-scale shadow-sm hover:bg-primary/90 transition-colors"
          >
            Trova una birra
          </button>
        </div>
        <div className="relative w-[140px] sm:w-[180px] flex-shrink-0 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950/30 dark:via-amber-950/30 dark:to-yellow-950/30 flex items-center justify-center">
          <MapHeroIllustration />
        </div>
      </div>
    </div>
  );
}

function MapHeroIllustration() {
  return (
    <svg viewBox="0 0 180 180" className="w-full h-full">
      {/* radial bg */}
      <defs>
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fed7aa" />
        </radialGradient>
      </defs>
      <rect width="180" height="180" fill="url(#bgGrad)" />
      {/* dotted radius circles */}
      <circle cx="90" cy="90" r="50" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 4" opacity="0.4" />
      <circle cx="90" cy="90" r="70" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 4" opacity="0.25" />
      {/* pins */}
      {[
        { x: 90, y: 35 }, { x: 140, y: 60 }, { x: 145, y: 110 },
        { x: 100, y: 145 }, { x: 50, y: 130 }, { x: 35, y: 80 }, { x: 55, y: 40 },
      ].map((p, i) => (
        <g key={i} transform={`translate(${p.x - 9}, ${p.y - 22})`}>
          <path d="M9 0 C 4 0 0 4 0 9 C 0 16 9 22 9 22 C 9 22 18 16 18 9 C 18 4 14 0 9 0 Z" fill="#f97316" />
          <circle cx="9" cy="9" r="3.5" fill="#fff" />
        </g>
      ))}
      {/* center user */}
      <circle cx="90" cy="90" r="8" fill="#3b82f6" stroke="#fff" strokeWidth="2.5" />
    </svg>
  );
}

function BirreTab({ beers, loading, pubs, pubsLoading, userLocation, onSeeAllPubs }: {
  beers: any[];
  loading: boolean;
  pubs: any[];
  pubsLoading: boolean;
  userLocation: { lat: number; lng: number } | null;
  onSeeAllPubs: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-extrabold text-foreground">Birre più popolari</h2>
        {beers.length > 0 && (
          <span className="text-xs text-stone-400 font-medium">{beers.length} risultati</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2.5 mb-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-card rounded-2xl h-[72px] animate-pulse" />
          ))}
        </div>
      ) : beers.length > 0 ? (
        <div className="space-y-2 mb-6">
          {beers.slice(0, 30).map((beer: any) => (
            <BeerListRow key={beer.id} beer={beer} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<Beer className="w-8 h-8 text-stone-400" />} title="Nessuna birra trovata" subtitle="Prova con un altro stile" />
      )}

      {/* Dove berle horizontal preview */}
      {(pubsLoading || pubs.length > 0) && (
        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-extrabold text-foreground">Dove berle vicino a te</h2>
            <button onClick={onSeeAllPubs} className="text-xs font-bold text-primary tap-scale hover:opacity-80">Vedi tutte</button>
          </div>
          {pubsLoading ? (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 lg:-mx-6 lg:px-6 pb-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-36">
                  <div className="w-36 h-24 rounded-2xl bg-stone-100 dark:bg-[#1B2735] animate-pulse mb-2" />
                  <div className="w-24 h-3 rounded bg-stone-100 dark:bg-[#1B2735] animate-pulse mb-1" />
                  <div className="w-16 h-2.5 rounded bg-stone-100 dark:bg-[#1B2735] animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 lg:-mx-6 lg:px-6 pb-1">
              {pubs.slice(0, 8).map((pub: any) => (
                <PubMiniCard key={pub.id} pub={pub} />
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}

function DoveBerleTab({
  styleLabel, pubs, userLocation, distanceKm, setDistanceKm, pubFilter, setPubFilter, onOpenMap, onLocate,
}: {
  styleLabel: string;
  pubs: any[];
  userLocation: { lat: number; lng: number } | null;
  distanceKm: number;
  setDistanceKm: (n: number) => void;
  pubFilter: "all" | "open";
  setPubFilter: (f: "all" | "open") => void;
  onOpenMap: () => void;
  onLocate: () => void;
}) {
  const [showDistPicker, setShowDistPicker] = useState(false);

  return (
    <>
      {/* Filter chips */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 lg:-mx-6 lg:px-6 mb-3">
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowDistPicker(v => !v)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border bg-white dark:bg-[#1B2735] text-stone-700 dark:text-stone-300 border-stone-200 dark:border-[#2F3D4D] tap-scale"
          >
            Entro {distanceKm} km ▾
          </button>
          {showDistPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDistPicker(false)} />
              <div className="absolute top-9 left-0 z-50 bg-card border border-border rounded-2xl shadow-xl overflow-hidden min-w-[110px]">
                {[1, 5, 10, 15, 20, 30, 50].map(d => (
                  <button
                    key={d}
                    onClick={() => { setDistanceKm(d); setShowDistPicker(false); if (!userLocation) onLocate(); }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors ${distanceKm === d ? 'text-primary bg-orange-50 dark:bg-orange-900/20' : 'text-foreground hover:bg-muted'}`}
                  >
                    {d} km
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button
          onClick={() => setPubFilter(pubFilter === "open" ? "all" : "open")}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all tap-scale ${
            pubFilter === "open"
              ? "bg-primary text-white border-primary shadow-sm"
              : "bg-white dark:bg-[#1B2735] text-stone-600 dark:text-stone-300 border-stone-200 dark:border-[#2F3D4D]"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          Aperti ora
        </button>
        <button
          onClick={onOpenMap}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 tap-scale"
        >
          <MapIcon className="w-3 h-3" />
          Mappa
        </button>
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-stone-500 font-bold">{pubs.length} pub trovati</span>
        {pubs.length > 1 && (
          <span className="text-xs text-stone-400 font-medium">
            Ordina: {userLocation ? "Distanza" : "Nome"} ▾
          </span>
        )}
      </div>

      {!userLocation ? (
        <div className="bg-white dark:bg-card rounded-3xl p-6 text-center border border-stone-100 dark:border-[#2F3D4D]/60">
          <Navigation className="w-10 h-10 text-primary mx-auto mb-3" />
          <h3 className="text-[15px] font-extrabold text-foreground">Posizione</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Per trovare pub che servono {styleLabel} vicino a te</p>
          <button
            onClick={onLocate}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-primary text-white text-sm font-bold tap-scale shadow-sm"
          >
            Continua
          </button>
        </div>
      ) : pubs.length === 0 ? (
        <EmptyState icon={<MapPin className="w-8 h-8 text-stone-400" />} title="Nessun pub vicino" subtitle="Prova ad aumentare la distanza" />
      ) : (
        <div className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {pubs.map((pub: any) => (
            <PubListRow key={pub.id} pub={pub} />
          ))}
        </div>
      )}
    </>
  );
}

function BeerListRow({ beer }: { beer: any }) {
  const [imgErr, setImgErr] = useState(false);
  const rating = parseFloat(beer.rating || beer.avgRating || "0");
  const abv = beer.abv != null ? `${beer.abv}%` : null;
  return (
    <Link href={`/beer/${beer.id}`}>
      <div className="flex items-center gap-3 bg-white dark:bg-card rounded-2xl p-2.5 border border-stone-100 dark:border-[#2F3D4D]/60 shadow-sm active:scale-[0.98] transition-transform cursor-pointer">
        <div className="w-14 h-14 rounded-xl bg-stone-100 dark:bg-[#1B2735] flex-shrink-0 overflow-hidden flex items-center justify-center">
          {!imgErr && (beer.imageUrl || beer.breweryLogoUrl) ? (
            <img
              src={beer.imageUrl || beer.breweryLogoUrl}
              alt={beer.name}
              className="w-full h-full object-cover"
              onError={() => setImgErr(true)}
            />
          ) : (
            <Beer className="w-6 h-6 text-stone-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[14px] text-foreground truncate">{beer.name}</p>
          <p className="text-[12px] text-stone-500 dark:text-stone-400 truncate">{beer.breweryName || beer.brewery?.name}</p>
          <div className="flex items-center gap-2 text-[11px] text-stone-400 mt-0.5">
            {beer.style && <span className="truncate max-w-[140px]">{beer.style}</span>}
            {abv && <span>· {abv}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {rating > 0 && (
            <div className="flex items-center gap-0.5">
              <span className="text-[13px] font-bold text-foreground">{rating.toFixed(2)}</span>
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            </div>
          )}
          <Bookmark className="w-4 h-4 text-stone-300 dark:text-stone-600" />
        </div>
      </div>
    </Link>
  );
}

function PubMiniCard({ pub }: { pub: any }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <Link href={pub.slug ? `/pub/${pub.slug}` : `/pub/${pub.id}`}>
      <div className="flex-shrink-0 w-36 cursor-pointer">
        <div className="relative w-36 h-24 rounded-2xl overflow-hidden bg-stone-200 dark:bg-[#1B2735] mb-1.5">
          {!imgErr && (pub.coverImageUrl || pub.logoUrl) ? (
            <img src={pub.coverImageUrl || pub.logoUrl} alt={pub.name} className="w-full h-full object-cover" loading="lazy" decoding="async" onError={() => setImgErr(true)} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/40">
              <Beer className="w-6 h-6 text-amber-600/60" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
        <p className="font-bold text-[13px] text-foreground truncate">{pub.name}</p>
        <p className="text-[11px] text-stone-400 truncate">
          {pub.city ?? "—"}{pub._dist != null ? ` · ${formatDist(pub._dist)}` : ""}
        </p>
        {parseFloat(pub.rating) > 0 && (
          <div className="flex items-center gap-0.5 mt-0.5">
            <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
            <span className="text-[11px] font-bold text-amber-500">{parseFloat(pub.rating).toFixed(1)}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function PubListRow({ pub }: { pub: any }) {
  const [imgErr, setImgErr] = useState(false);
  const open = isOpenNow(pub.openingHours);
  const tapCount = pub.tapCount ?? pub.taplistCount ?? null;
  return (
    <Link href={pub.slug ? `/pub/${pub.slug}` : `/pub/${pub.id}`}>
      <div className="flex items-center gap-3 bg-white dark:bg-card rounded-2xl p-3 border border-stone-100 dark:border-[#2F3D4D]/60 shadow-sm active:scale-[0.98] transition-transform cursor-pointer">
        <div className="w-14 h-14 rounded-xl bg-stone-100 dark:bg-[#1B2735] flex-shrink-0 overflow-hidden flex items-center justify-center">
          {!imgErr && (pub.coverImageUrl || pub.logoUrl) ? (
            <img src={pub.coverImageUrl || pub.logoUrl} alt={pub.name} className="w-full h-full object-cover" loading="lazy" decoding="async" onError={() => setImgErr(true)} />
          ) : (
            <Beer className="w-6 h-6 text-stone-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[14px] text-foreground truncate">{pub.name}</p>
          <p className="text-[12px] text-stone-400 truncate mt-0.5">
            {pub.city ?? ""}{pub._dist != null ? ` · ${formatDist(pub._dist)}` : ""}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {open && <span className="text-[11px] font-bold text-green-500">Aperto</span>}
            {tapCount && <span className="text-[11px] text-stone-400">{tapCount} birre alla spina</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {parseFloat(pub.rating) > 0 && (
            <div className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-[13px] font-bold text-amber-500">{parseFloat(pub.rating).toFixed(1)}</span>
            </div>
          )}
          <Bookmark className="w-4 h-4 text-stone-300 dark:text-stone-600" />
        </div>
      </div>
    </Link>
  );
}

function SearchResultsBlock({ beers, loading, query, onClear }: { beers: any[]; loading: boolean; query: string; onClear: () => void }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-extrabold text-foreground">Risultati per "{query}"</h2>
        <button onClick={onClear} className="text-xs font-bold text-primary tap-scale">Annulla</button>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-white dark:bg-card rounded-2xl h-[72px] animate-pulse" />)}
        </div>
      ) : beers.length > 0 ? (
        <div className="space-y-2">{beers.slice(0, 30).map((b: any) => <BeerListRow key={b.id} beer={b} />)}</div>
      ) : (
        <EmptyState icon={<Beer className="w-8 h-8 text-stone-400" />} title="Nessun risultato" subtitle="Prova con un altro termine" />
      )}
    </div>
  );
}


function styleDescription(style: string): string {
  const s = style.toLowerCase();
  if (s.startsWith("ipa - hazy") || s.includes("hazy")) return "IPA torbide, aromatiche e succose. Profilo morbido con esplosione di luppoli tropicali e bassa amaricatura.";
  if (s.startsWith("ipa")) return "Birre luppolate, amare e aromatiche. Dal classico stile West Coast alle IPA più moderne e fruttate.";
  if (s.startsWith("stout")) return "Birre scure, intense e cremose. Sentori di caffè, cacao e cioccolato fondente.";
  if (s.includes("sour")) return "Birre acide e rinfrescanti, spesso con frutta. Profilo brillante e dissetante.";
  if (s.includes("saison")) return "Birre rustiche e speziate, prodotte tradizionalmente nelle fattorie belghe.";
  if (s.includes("porter")) return "Birre scure, tostate e maltose. Più delicate e morbide degli stout.";
  if (s.includes("apple cider")) return "Sidri di mela, freschi e frizzanti. Da quelli secchi a quelli più dolci.";
  if (s.includes("pilsener") || s.includes("pilsner")) return "Lager dorate, secche e luppolate. Lo stile lager di riferimento, fresco e bevibile.";
  if (s.includes("blonde") || s.includes("golden")) return "Birre chiare, equilibrate e bevibili. Perfette per chi vuole iniziare a esplorare il mondo craft.";
  if (s.includes("amber") || s.includes("red ale")) return "Birre ramate con malti caramellati e luppolatura moderata. Sapore equilibrato e tostato.";
  if (s.includes("brown ale")) return "Birre ambrate con note di nocciola, caramello e malto tostato.";
  if (s.includes("weissbier") || s.includes("weizen")) return "Birre di frumento bavaresi, fruttate, speziate e rinfrescanti.";
  if (s.includes("witbier")) return "Birre di frumento belghe, agrumate e speziate con coriandolo e arancia.";
  if (s.includes("flavored - fruit")) return "Birre alla frutta, naturalmente dolci e profumate. Una grande varietà di profili.";
  if (s.includes("dipa") || s.includes("double ipa") || s.includes("imperial")) return "IPA imperiali, alcoliche e luppolate all'estremo. Per palati esigenti.";
  return "Esplora le caratteristiche e i profili di questo stile.";
}
