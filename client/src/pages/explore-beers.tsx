import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { Link, useLocation } from "wouter";
import { Beer, Search, X, Star, Bookmark, Dices, Flame, Sparkles, Trophy, ChevronRight, SlidersHorizontal } from "lucide-react";
import FindBeerSheet from "@/components/FindBeerSheet";
import { EmptyState } from "@/components/empty-state";
import { PageContainer } from "@/components/layout/page-container";

// ─── Style definitions ────────────────────────────────────────────────────────

interface StyleMeta {
  label: string;
  api: string;
  emoji: string;
  color: string; // tailwind bg for chip active state
}

const CHIP_STYLES: StyleMeta[] = [
  { label: "IPA",     api: "IPA",                                emoji: "🌿", color: "bg-emerald-500" },
  { label: "Stout",   api: "Stout - Imperial",                   emoji: "🖤", color: "bg-stone-700" },
  { label: "Sour",    api: "Sour / Wild Beer",                   emoji: "🍒", color: "bg-rose-500" },
  { label: "Hazy",    api: "IPA - Hazy (NEIPA)",                 emoji: "☁️", color: "bg-amber-400" },
  { label: "Pilsner", api: "Pilsener / Pils / Pilsner",          emoji: "🍺", color: "bg-yellow-500" },
  { label: "Saison",  api: "Saison / Farmhouse / Grisette",      emoji: "🌾", color: "bg-lime-600" },
  { label: "Porter",  api: "Porter",                             emoji: "☕", color: "bg-amber-900" },
  { label: "Weizen",  api: "Weissbier - Hefeweizen",             emoji: "🌻", color: "bg-yellow-600" },
  { label: "Amber",   api: "Red Ale / International Amber Ale",  emoji: "🟧", color: "bg-orange-500" },
  { label: "DIPA",    api: "IIPA DIPA - Imperial / Double IPA",  emoji: "💪", color: "bg-lime-500" },
];

const STYLE_GROUPS = [
  {
    title: "Ora popolari",
    icon: <Flame className="w-4 h-4 text-orange-500" />,
    items: [
      { label: "IPA",       api: "IPA",                                emoji: "🌿", bg: "bg-emerald-50 dark:bg-emerald-950/30", ring: "ring-emerald-100 dark:ring-emerald-900/40" },
      { label: "Hazy IPA",  api: "IPA - Hazy (NEIPA)",                 emoji: "☁️", bg: "bg-amber-50 dark:bg-amber-950/30",     ring: "ring-amber-100 dark:ring-amber-900/40" },
      { label: "Stout",     api: "Stout - Imperial",                   emoji: "🖤", bg: "bg-stone-100 dark:bg-[#1A1D24]/60",    ring: "ring-stone-200 dark:ring-stone-700/40" },
      { label: "Sour",      api: "Sour / Wild Beer",                   emoji: "🍒", bg: "bg-rose-50 dark:bg-rose-950/30",       ring: "ring-rose-100 dark:ring-rose-900/40" },
      { label: "DIPA",      api: "IIPA DIPA - Imperial / Double IPA",  emoji: "💪", bg: "bg-lime-50 dark:bg-lime-950/30",       ring: "ring-lime-100 dark:ring-lime-900/40" },
    ],
  },
  {
    title: "Da scoprire",
    icon: <Sparkles className="w-4 h-4 text-amber-500" />,
    items: [
      { label: "Saison",    api: "Saison / Farmhouse / Grisette",      emoji: "🌾", bg: "bg-yellow-50 dark:bg-yellow-950/30",  ring: "ring-yellow-100 dark:ring-yellow-900/40" },
      { label: "Porter",    api: "Porter",                             emoji: "☕", bg: "bg-stone-100 dark:bg-[#1A1D24]/60",   ring: "ring-stone-200 dark:ring-stone-700/40" },
      { label: "Fruit Ale", api: "Flavored - Fruit",                   emoji: "🍑", bg: "bg-orange-50 dark:bg-orange-950/30",  ring: "ring-orange-100 dark:ring-orange-900/40" },
      { label: "Witbier",   api: "Witbier / Belgian White Ale",        emoji: "🌼", bg: "bg-amber-50 dark:bg-amber-950/30",    ring: "ring-amber-100 dark:ring-amber-900/40" },
      { label: "Cider",     api: "Apple Cider",                        emoji: "🍎", bg: "bg-red-50 dark:bg-red-950/30",        ring: "ring-red-100 dark:ring-red-900/40" },
    ],
  },
  {
    title: "Classici",
    icon: <Trophy className="w-4 h-4 text-amber-600" />,
    items: [
      { label: "Pilsner",    api: "Pilsener / Pils / Pilsner",         emoji: "🍺", bg: "bg-amber-50 dark:bg-amber-950/30",    ring: "ring-amber-100 dark:ring-amber-900/40" },
      { label: "Blonde Ale", api: "Blonde Ale / Golden Ale",           emoji: "🍻", bg: "bg-yellow-50 dark:bg-yellow-950/30",  ring: "ring-yellow-100 dark:ring-yellow-900/40" },
      { label: "Amber Ale",  api: "Red Ale / International Amber Ale", emoji: "🟧", bg: "bg-orange-50 dark:bg-orange-950/30",  ring: "ring-orange-100 dark:ring-orange-900/40" },
      { label: "Brown Ale",  api: "Brown Ale",                         emoji: "🟫", bg: "bg-amber-50 dark:bg-amber-950/30",    ring: "ring-amber-100 dark:ring-amber-900/40" },
      { label: "Weizen",     api: "Weissbier - Hefeweizen",            emoji: "🌾", bg: "bg-yellow-50 dark:bg-yellow-950/30",  ring: "ring-yellow-100 dark:ring-yellow-900/40" },
    ],
  },
];

type SortMode = "popular" | "top" | "newest";

// ─── Utilities ────────────────────────────────────────────────────────────────

function styleDescription(style: string): string {
  const s = style.toLowerCase();
  if (s.includes("hazy") || s.startsWith("ipa - hazy")) return "IPA torbide, aromatiche e succose. Profilo morbido con esplosione di luppoli tropicali e bassa amaricatura.";
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
  if (s.includes("flavored - fruit")) return "Birre alla frutta, naturalmente dolci e profumate.";
  if (s.includes("dipa") || s.includes("double ipa") || s.includes("imperial")) return "IPA imperiali, alcoliche e luppolate all'estremo. Per palati esigenti.";
  return "Esplora le caratteristiche e i profili di questo stile.";
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function BeerCard({ beer }: { beer: any }) {
  const [imgErr, setImgErr] = useState(false);
  const rating = parseFloat(beer.rating || beer.avgRating || "0");
  const abv = beer.abv != null ? `${beer.abv}%` : null;
  return (
    <Link href={`/beer/${beer.id}`}>
      <div className="flex items-center gap-3 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl rounded-2xl p-2.5 border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-primary/30 active:scale-[0.99] transition-all duration-200 cursor-pointer">
        <div className="w-14 h-14 rounded-xl bg-stone-100 dark:bg-[#1A1D24] flex-shrink-0 overflow-hidden flex items-center justify-center">
          {!imgErr && (beer.imageUrl || beer.breweryLogoUrl) ? (
            <img src={beer.imageUrl || beer.breweryLogoUrl} alt={beer.name} className="w-full h-full object-cover" loading="lazy" decoding="async" onError={() => setImgErr(true)} />
          ) : (
            <Beer className="w-6 h-6 text-stone-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[14px] text-foreground truncate">{beer.name}</p>
          <p className="text-[12px] text-stone-500 dark:text-stone-400 truncate">{beer.breweryName || beer.brewery?.name}</p>
          <div className="flex items-center gap-2 text-[11px] text-stone-400 mt-0.5">
            {beer.style && <span className="truncate max-w-[160px]">{beer.style}</span>}
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

function BeerCardSkeleton() {
  return (
    <div className="flex items-center gap-3 bg-white/70 dark:bg-white/[0.04] rounded-2xl p-2.5 border border-white/40 dark:border-white/[0.06]">
      <div className="w-14 h-14 rounded-xl bg-stone-100 dark:bg-[#1A1D24] animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 rounded-lg bg-stone-100 dark:bg-[#1A1D24] animate-pulse w-3/4" />
        <div className="h-3 rounded-lg bg-stone-100 dark:bg-[#1A1D24] animate-pulse w-1/2" />
        <div className="h-2.5 rounded-lg bg-stone-100 dark:bg-[#1A1D24] animate-pulse w-1/3" />
      </div>
    </div>
  );
}

function StyleGroupRow({ group, styleCount, onSelect }: {
  group: typeof STYLE_GROUPS[0];
  styleCount: (api: string) => number;
  onSelect: (api: string) => void;
}) {
  return (
    <section className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        {group.icon}
        <h2 className="text-[15px] font-extrabold text-foreground">{group.title}</h2>
      </div>
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-5 lg:gap-3 pb-1">
        {group.items.map(s => (
          <button
            key={s.api}
            onClick={() => onSelect(s.api)}
            className="flex-shrink-0 w-[78px] lg:w-auto flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] tap-scale hover:border-primary/30 active:scale-[0.99] transition-all duration-200"
          >
            <div className={`w-11 h-11 rounded-xl ${s.bg} ring-1 ${s.ring} flex items-center justify-center text-xl`}>
              {s.emoji}
            </div>
            <span className="text-[12px] font-bold text-foreground text-center leading-tight line-clamp-1">{s.label}</span>
            {styleCount(s.api) > 0 && (
              <span className="text-[10px] text-stone-400 font-medium">{styleCount(s.api).toLocaleString("it-IT")}</span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ExploreBeers() {
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse URL params on mount
  const initParams = () => {
    const p = new URLSearchParams(window.location.search);
    return { style: p.get("style") || "", q: p.get("q") || "" };
  };
  const init = initParams();

  const [activeStyle, setActiveStyle] = useState(init.style);
  const [searchQ, setSearchQ] = useState(init.q);
  const [inputValue, setInputValue] = useState(init.style || init.q);
  const [sortMode, setSortMode] = useState<SortMode>("popular");
  const [showAllStyles, setShowAllStyles] = useState(false);
  const [findBeerOpen, setFindBeerOpen] = useState(false);

  // Sync URL ↔ state on browser back/forward
  useEffect(() => {
    const sync = () => {
      const p = new URLSearchParams(window.location.search);
      const s = p.get("style") || "";
      const q = p.get("q") || "";
      setActiveStyle(s);
      setSearchQ(q);
      setInputValue(s || q);
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  // ── Data queries ──
  const { data: popularStyles } = useQuery<{ style: string; count: number }[]>({
    queryKey: ["/api/beers/popular-styles", 80],
    queryFn: () => fetch("/api/beers/popular-styles?limit=80").then(r => r.json()),
    staleTime: 10 * 60 * 1000,
  });

  const { data: trendingBeers, isLoading: trendingLoading } = useQuery<any[]>({
    queryKey: ["/api/beers/trending"],
    queryFn: () => fetch("/api/beers/trending?limit=20").then(r => r.json()),
    enabled: !activeStyle && !searchQ,
    staleTime: 5 * 60 * 1000,
  });

  const { data: styleBeers, isLoading: styleLoading } = useQuery<any[]>({
    queryKey: ["/api/beers/by-style", activeStyle],
    queryFn: () => fetch(`/api/beers/by-style?style=${encodeURIComponent(activeStyle)}&limit=60`).then(r => r.json()),
    enabled: !!activeStyle,
    staleTime: 2 * 60 * 1000,
  });

  const { data: searchResults, isLoading: searchLoading } = useQuery<{ beers: any[] }>({
    queryKey: ["/api/search", searchQ],
    queryFn: () => fetch(`/api/search?q=${encodeURIComponent(searchQ)}`).then(r => r.json()),
    enabled: !activeStyle && searchQ.length > 1,
    staleTime: 2 * 60 * 1000,
  });

  // ── Computed values ──
  const styleCount = useMemo(() => {
    const map = new Map<string, number>();
    (popularStyles ?? []).forEach(s => map.set(s.style.toLowerCase(), s.count));
    return (api: string) => map.get(api.toLowerCase()) ?? 0;
  }, [popularStyles]);

  const activeStyleMeta = useMemo(
    () => CHIP_STYLES.find(s => s.api === activeStyle) ?? (activeStyle ? { label: activeStyle, api: activeStyle, emoji: "🍺", color: "bg-primary" } : null),
    [activeStyle]
  );

  const activeCount = activeStyle ? styleCount(activeStyle) : 0;

  const beers: any[] = useMemo(() => {
    if (activeStyle) return styleBeers ?? [];
    if (searchQ) return searchResults?.beers ?? [];
    return [];
  }, [activeStyle, styleBeers, searchQ, searchResults]);

  const sortedBeers = useMemo(() => {
    const arr = [...beers];
    if (sortMode === "top") return arr.sort((a, b) => (parseFloat(b.rating || b.avgRating || "0")) - (parseFloat(a.rating || a.avgRating || "0")));
    if (sortMode === "newest") return arr.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
    return arr; // popular = API default
  }, [beers, sortMode]);

  const isLoading = activeStyle ? styleLoading : (searchQ ? searchLoading : false);
  const isHome = !activeStyle && !searchQ;

  // ── Actions ──
  function selectStyle(api: string) {
    setActiveStyle(api);
    setSearchQ("");
    setInputValue(api);
    setShowAllStyles(false);
    window.history.pushState(null, "", `/explore/beers?style=${encodeURIComponent(api)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function runSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setActiveStyle("");
    setSearchQ(trimmed);
    setInputValue(trimmed);
    window.history.pushState(null, "", `/explore/beers?q=${encodeURIComponent(trimmed)}`);
  }

  function clearAll() {
    setActiveStyle("");
    setSearchQ("");
    setInputValue("");
    setShowAllStyles(false);
    window.history.pushState(null, "", `/explore/beers`);
    inputRef.current?.blur();
  }

  async function surpriseMe() {
    try {
      const r = await fetch("/api/beers/trending?limit=20&days=14");
      const data = await r.json();
      const list = Array.isArray(data) ? data : (data.beers ?? []);
      if (list.length > 0) {
        const pick = list[Math.floor(Math.random() * list.length)];
        if (pick?.id) { setLocation(`/beer/${pick.id}`); return; }
      }
      const r2 = await fetch("/api/beers?random=true&limit=1");
      const d2 = await r2.json();
      const b = (d2.beers ?? d2 ?? [])[0];
      if (b?.id) setLocation(`/beer/${b.id}`);
    } catch {}
  }

  // ── Render: "all styles" expanded sheet ──
  if (showAllStyles) {
    const sorted = (popularStyles ?? [])
      .filter(s => s.style?.trim().length > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 80);
    return (
      <div className="min-h-screen bg-[#F7F4F0] dark:bg-background">
        <Helmet><title>Tutti gli stili | Fermenta.to</title></Helmet>
        <div className="sticky z-30 bg-[#F7F4F0]/95 dark:bg-background/95 backdrop-blur-md border-b border-stone-100 dark:border-[#23262E]/60" style={{ top: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}>
          <PageContainer variant="wide" className="py-3 flex items-center gap-3">
            <button onClick={() => setShowAllStyles(false)} className="flex items-center gap-1.5 text-sm font-bold text-primary tap-scale">
              ← Indietro
            </button>
            <h1 className="text-[16px] font-extrabold text-foreground flex-1">Tutti gli stili</h1>
            <span className="text-xs text-stone-400">{sorted.length} stili</span>
          </PageContainer>
        </div>
        <PageContainer variant="wide" className="pt-4 pb-28 lg:pb-12">
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {sorted.map(s => {
              const known = STYLE_GROUPS.flatMap(g => g.items).find(i => i.api.toLowerCase() === s.style.toLowerCase());
              return (
                <button
                  key={s.style}
                  onClick={() => { setShowAllStyles(false); selectStyle(s.style); }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-sm tap-scale hover:border-primary/30 transition-all"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${known?.bg ?? "bg-stone-100 dark:bg-[#1A1D24]/60"}`}>
                    {known?.emoji ?? "🍺"}
                  </div>
                  <span className="text-[11px] font-bold text-foreground text-center leading-tight line-clamp-2">{s.style}</span>
                  <span className="text-[10px] text-stone-400">{s.count.toLocaleString("it-IT")}</span>
                </button>
              );
            })}
          </div>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F4F0] dark:bg-background">
      <Helmet>
        <title>{activeStyle ? `${activeStyleMeta?.label ?? activeStyle} — Birre Artigianali` : searchQ ? `"${searchQ}" — Birre` : "Esplora Birre Artigianali"} | Fermenta.to</title>
        <meta name="description" content="Sfoglia migliaia di birre artigianali italiane e internazionali. Filtra per stile, cerca per nome o birrificio." />
        <link rel="canonical" href="https://fermenta.to/explore/beers" />
      </Helmet>

      {/* ── Sticky search + chips ── */}
      <div
        className="sticky lg:top-16 z-30 bg-[#F7F4F0]/95 dark:bg-background/95 backdrop-blur-md border-b border-stone-100 dark:border-[#23262E]/60"
        style={{ top: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}
      >
        <PageContainer variant="wide" className="py-2.5 space-y-2.5">
          {/* Search bar */}
          <div className="flex items-center gap-2 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl rounded-2xl px-4 py-2.5 border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
            <Search className="h-4 w-4 text-stone-400 flex-shrink-0" />
            <input
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && inputValue.trim()) runSearch(inputValue); }}
              placeholder="Cerca birra, stile o birrificio…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-stone-400 outline-none min-w-0 font-medium"
            />
            {inputValue ? (
              <button onClick={clearAll} className="tap-scale flex-shrink-0">
                <X className="h-4 w-4 text-stone-400" />
              </button>
            ) : (
              <SlidersHorizontal className="h-4 w-4 text-stone-400 flex-shrink-0" />
            )}
          </div>

          {/* Style chips */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-0.5 px-0.5 pb-1">
            {CHIP_STYLES.map(s => {
              const active = activeStyle === s.api;
              return (
                <button
                  key={s.api}
                  onClick={() => active ? clearAll() : selectStyle(s.api)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 tap-scale ${
                    active
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-white dark:bg-card border-stone-200 dark:border-[#23262E] text-stone-700 dark:text-stone-200 hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary shadow-sm"
                  }`}
                >
                  <span className="text-sm leading-none">{s.emoji}</span>
                  {s.label}
                  {active && <X className="w-3 h-3 ml-0.5" />}
                </button>
              );
            })}
            {/* "Tutti gli stili" button */}
            <button
              onClick={() => setShowAllStyles(true)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border border-dashed border-stone-300 dark:border-stone-600 text-stone-500 dark:text-stone-400 bg-transparent hover:border-primary hover:text-primary tap-scale transition-all duration-200"
            >
              Tutti <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </PageContainer>
      </div>

      <PageContainer as="main" variant="wide" className="pt-4 pb-28 lg:pb-12">

        {/* ── STYLE SELECTED ── */}
        {activeStyle && (
          <>
            {/* Style banner */}
            <div className={`relative rounded-3xl overflow-hidden mb-4 ${
              STYLE_GROUPS.flatMap(g => g.items).find(i => i.api === activeStyle)?.bg ?? "bg-stone-100 dark:bg-[#1A1D24]/60"
            } ring-1 ${
              STYLE_GROUPS.flatMap(g => g.items).find(i => i.api === activeStyle)?.ring ?? "ring-stone-200 dark:ring-stone-700/40"
            }`}>
              <div className="relative p-5 lg:p-6">
                <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight leading-tight">
                  {activeStyleMeta?.label ?? activeStyle}
                </h1>
                {activeCount > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-card/60 backdrop-blur-sm">
                    <Beer className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold text-foreground">{activeCount.toLocaleString("it-IT")} birre</span>
                  </div>
                )}
                <p className="text-sm text-stone-600 dark:text-stone-300 mt-2 max-w-md leading-relaxed">
                  {styleDescription(activeStyle)}
                </p>
              </div>
              <div className="absolute right-0 bottom-0 text-[88px] leading-none opacity-20 select-none pointer-events-none translate-x-3 translate-y-3">
                {activeStyleMeta?.emoji ?? "🍺"}
              </div>
            </div>

            {/* Sort controls */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-stone-500">
                {isLoading ? "Carico birre…" : `${sortedBeers.length} birre`}
              </span>
              <div className="flex items-center gap-1 p-0.5 bg-stone-100 dark:bg-[#1A1D24]/60 rounded-xl">
                {(["popular", "top", "newest"] as SortMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setSortMode(m)}
                    className={`px-2.5 py-1 rounded-[10px] text-[11px] font-bold transition-all ${
                      sortMode === m ? "bg-white dark:bg-card text-foreground shadow-sm" : "text-stone-500 dark:text-stone-400"
                    }`}
                  >
                    {m === "popular" ? "Popolari" : m === "top" ? "Top ⭐" : "Recenti"}
                  </button>
                ))}
              </div>
            </div>

            {/* Beer list */}
            {isLoading ? (
              <div className="space-y-2.5">
                {[...Array(6)].map((_, i) => <BeerCardSkeleton key={i} />)}
              </div>
            ) : sortedBeers.length > 0 ? (
              <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
                {sortedBeers.map((beer: any) => <BeerCard key={beer.id} beer={beer} />)}
              </div>
            ) : (
              <EmptyState
                icon={<Beer className="w-8 h-8 text-stone-400" />}
                title="Nessuna birra trovata"
                subtitle="Prova con un altro stile"
                ctaLabel="Esplora stili"
                onCta={clearAll}
              />
            )}
          </>
        )}

        {/* ── SEARCH RESULTS ── */}
        {!activeStyle && searchQ && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-extrabold text-foreground">Risultati per "{searchQ}"</h2>
              <button onClick={clearAll} className="text-xs font-bold text-primary tap-scale">Annulla</button>
            </div>
            {isLoading ? (
              <div className="space-y-2.5">
                {[...Array(5)].map((_, i) => <BeerCardSkeleton key={i} />)}
              </div>
            ) : beers.length > 0 ? (
              <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
                {beers.map((b: any) => <BeerCard key={b.id} beer={b} />)}
              </div>
            ) : (
              <EmptyState
                icon={<Beer className="w-8 h-8 text-stone-400" />}
                title="Nessun risultato"
                subtitle="Prova con un altro termine o scegli uno stile"
              />
            )}
          </>
        )}

        {/* ── HOME — nessuna selezione ── */}
        {isHome && (
          <>
            {/* Header */}
            <header className="mb-5">
              <h1 className="text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight">Esplora Birre</h1>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Scopri nuovi stili e trova la tua prossima preferita</p>
            </header>

            {/* Trending section */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-foreground">
                  <Flame className="w-4 h-4 text-orange-500" />
                  In tendenza ora
                </h2>
              </div>
              {trendingLoading ? (
                <div className="space-y-2.5">
                  {[...Array(4)].map((_, i) => <BeerCardSkeleton key={i} />)}
                </div>
              ) : (trendingBeers?.length ?? 0) > 0 ? (
                <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
                  {(trendingBeers ?? []).slice(0, 8).map((beer: any) => <BeerCard key={beer.id} beer={beer} />)}
                </div>
              ) : null}
            </section>

            {/* Style groups */}
            {STYLE_GROUPS.map(group => (
              <StyleGroupRow
                key={group.title}
                group={group}
                styleCount={styleCount}
                onSelect={selectStyle}
              />
            ))}

            {/* "Tutti gli stili" CTA */}
            <button
              onClick={() => setShowAllStyles(true)}
              className="mt-6 w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-sm tap-scale hover:border-primary/20 transition-all"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-bold text-foreground">Vedi tutti gli stili</span>
                {(popularStyles?.length ?? 0) > 0 && (
                  <span className="text-xs text-stone-400">{popularStyles!.length} categorie</span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </button>

            {/* Surprise me */}
            <section className="mt-4">
              <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950/20 dark:via-amber-950/20 dark:to-yellow-950/20 rounded-3xl p-5 border border-orange-100 dark:border-orange-900/30 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#0B0D10]/40 flex items-center justify-center flex-shrink-0 shadow-sm">
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

            {/* FindBeer card */}
            <section className="mt-4">
              <div className="relative bg-white dark:bg-card rounded-3xl overflow-hidden border border-stone-100 dark:border-[#23262E]/60 shadow-sm">
                <div className="flex items-stretch">
                  <div className="flex-1 min-w-0 p-5">
                    <h2 className="text-lg font-extrabold text-foreground leading-tight">Cosa si beve<br />vicino a te?</h2>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 leading-relaxed">Scopri le birre più popolari nei pub della tua zona</p>
                    <button
                      onClick={() => setFindBeerOpen(true)}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-primary text-white text-sm font-bold tap-scale shadow-sm hover:bg-primary/90 transition-colors"
                    >
                      Trova una birra
                    </button>
                  </div>
                  <div className="relative w-[130px] sm:w-[160px] flex-shrink-0 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950/30 dark:via-amber-950/30 dark:to-yellow-950/30 flex items-center justify-center overflow-hidden">
                    <MapHeroSvg />
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </PageContainer>

      <FindBeerSheet open={findBeerOpen} onClose={() => setFindBeerOpen(false)} nearbyPubs={[]} />
    </div>
  );
}

function MapHeroSvg() {
  return (
    <svg viewBox="0 0 160 160" className="w-full h-full">
      <defs>
        <radialGradient id="bgGrad2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fed7aa" />
        </radialGradient>
      </defs>
      <rect width="160" height="160" fill="url(#bgGrad2)" />
      <circle cx="80" cy="80" r="45" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 4" opacity="0.4" />
      <circle cx="80" cy="80" r="65" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 4" opacity="0.2" />
      {[
        { x: 80, y: 28 }, { x: 128, y: 55 }, { x: 132, y: 100 },
        { x: 88, y: 134 }, { x: 42, y: 118 }, { x: 28, y: 72 }, { x: 50, y: 35 },
      ].map((p, i) => (
        <g key={i} transform={`translate(${p.x - 8}, ${p.y - 20})`}>
          <path d="M8 0 C3.5 0 0 3.5 0 8 C0 14 8 20 8 20 C8 20 16 14 16 8 C16 3.5 12.5 0 8 0 Z" fill="#f97316" />
          <circle cx="8" cy="8" r="3" fill="#fff" />
        </g>
      ))}
      <circle cx="80" cy="80" r="7" fill="#3b82f6" stroke="#fff" strokeWidth="2.5" />
    </svg>
  );
}
