import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Link } from "wouter";
import {
  Beer, Building2, MapPin, Search, ArrowLeft, SlidersHorizontal,
  X, PlusCircle, Clock, ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo, useCallback } from "react";
import { GlutenFreeSmallBadge, AlcoholFreeBadge } from "@/components/beer-badges";
import ImageWithFallback from "@/components/image-with-fallback";
import Footer from "@/components/footer";
import AdditionRequestModal from "@/components/AdditionRequestModal";

interface SearchResult {
  pubs: any[];
  breweries: any[];
  beers: any[];
}

type Tab = "all" | "beers" | "breweries" | "pubs";

// ── helpers ──────────────────────────────────────────────────────────────────
function readParam(params: URLSearchParams, key: string, def = "") {
  return params.get(key) ?? def;
}
function readBool(params: URLSearchParams, key: string) {
  return params.get(key) === "true";
}

// ── ActiveFilterBadges ────────────────────────────────────────────────────────
type FilterBadgeProps = {
  filterGlutenFree: boolean; setFilterGlutenFree: (v: boolean) => void;
  filterAlcoholFree: boolean; setFilterAlcoholFree: (v: boolean) => void;
  filterStyle: string; setFilterStyle: (v: string) => void;
  filterCity: string; setFilterCity: (v: string) => void;
  filterCountry: string; setFilterCountry: (v: string) => void;
  filterMinAbv: string; setFilterMinAbv: (v: string) => void;
  filterMaxAbv: string; setFilterMaxAbv: (v: string) => void;
  filterMinIbu: string; setFilterMinIbu: (v: string) => void;
  filterMaxIbu: string; setFilterMaxIbu: (v: string) => void;
};

function ActiveFilterBadges(p: FilterBadgeProps) {
  const chips: { label: string; onRemove: () => void }[] = [];
  if (p.filterGlutenFree) chips.push({ label: "🌾 Senza glutine", onRemove: () => p.setFilterGlutenFree(false) });
  if (p.filterAlcoholFree) chips.push({ label: "💧 Analcolica", onRemove: () => p.setFilterAlcoholFree(false) });
  if (p.filterStyle) chips.push({ label: `Stile: ${p.filterStyle}`, onRemove: () => p.setFilterStyle("") });
  if (p.filterCity) chips.push({ label: `Città: ${p.filterCity}`, onRemove: () => p.setFilterCity("") });
  if (p.filterCountry) chips.push({ label: `Paese: ${p.filterCountry}`, onRemove: () => p.setFilterCountry("") });
  if (p.filterMinAbv || p.filterMaxAbv) chips.push({
    label: p.filterMinAbv && p.filterMaxAbv ? `ABV ${p.filterMinAbv}–${p.filterMaxAbv}%`
      : p.filterMinAbv ? `ABV ≥ ${p.filterMinAbv}%` : `ABV ≤ ${p.filterMaxAbv}%`,
    onRemove: () => { p.setFilterMinAbv(""); p.setFilterMaxAbv(""); },
  });
  if (p.filterMinIbu || p.filterMaxIbu) chips.push({
    label: p.filterMinIbu && p.filterMaxIbu ? `IBU ${p.filterMinIbu}–${p.filterMaxIbu}`
      : p.filterMinIbu ? `IBU ≥ ${p.filterMinIbu}` : `IBU ≤ ${p.filterMaxIbu}`,
    onRemove: () => { p.setFilterMinIbu(""); p.setFilterMaxIbu(""); },
  });
  if (!chips.length) return null;
  return (
    <div className="flex gap-1.5 flex-wrap py-1.5">
      {chips.map(c => (
        <span key={c.label}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary dark:text-orange-400 border border-primary/20">
          {c.label}
          <button onClick={c.onRemove} className="hover:text-primary/70 transition-colors ml-0.5" aria-label="Rimuovi filtro">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

// ── FilterSheet ───────────────────────────────────────────────────────────────
function FilterSheet({
  open, onClose, activeTab, popularStyles,
  filterGlutenFree, setFilterGlutenFree,
  filterAlcoholFree, setFilterAlcoholFree,
  filterStyle, setFilterStyle,
  filterCity, setFilterCity,
  filterCountry, setFilterCountry,
  filterMinAbv, setFilterMinAbv,
  filterMaxAbv, setFilterMaxAbv,
  filterMinIbu, setFilterMinIbu,
  filterMaxIbu, setFilterMaxIbu,
  hasActiveFilters, activeFilterCount, clearFilters,
}: {
  open: boolean; onClose: () => void; activeTab: Tab; popularStyles?: { style: string; count: number }[];
  filterGlutenFree: boolean; setFilterGlutenFree: (v: boolean) => void;
  filterAlcoholFree: boolean; setFilterAlcoholFree: (v: boolean) => void;
  filterStyle: string; setFilterStyle: (v: string) => void;
  filterCity: string; setFilterCity: (v: string) => void;
  filterCountry: string; setFilterCountry: (v: string) => void;
  filterMinAbv: string; setFilterMinAbv: (v: string) => void;
  filterMaxAbv: string; setFilterMaxAbv: (v: string) => void;
  filterMinIbu: string; setFilterMinIbu: (v: string) => void;
  filterMaxIbu: string; setFilterMaxIbu: (v: string) => void;
  hasActiveFilters: boolean; activeFilterCount: number; clearFilters: () => void;
}) {
  if (!open) return null;

  const abvPresets: [string, string, string][] = [
    ["🍺 Light <5%", "", "4.9"],
    ["⚡ Strong >7%", "7", ""],
    ["💥 Imperial >9%", "9", ""],
  ];
  const ibuPresets: [string, string, string][] = [
    ["😌 Dolce", "", "19"],
    ["⚖️ Bilanciata", "20", "50"],
    ["🌿 Amara", "60", ""],
  ];

  const panelContent = (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <SlidersHorizontal className="w-4 h-4 text-primary" /> Filtri
        </span>
        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs text-primary hover:underline font-semibold flex items-center gap-1">
              <X className="w-3 h-3" /> Cancella ({activeFilterCount})
            </button>
          )}
          <button onClick={onClose} className="lg:hidden text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick toggles */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setFilterGlutenFree(!filterGlutenFree)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterGlutenFree ? "bg-green-500 text-white border-green-500" : "border-stone-200 dark:border-border text-muted-foreground hover:border-green-400"}`}>
          🌾 Senza glutine
        </button>
        <button onClick={() => setFilterAlcoholFree(!filterAlcoholFree)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterAlcoholFree ? "bg-blue-500 text-white border-blue-500" : "border-stone-200 dark:border-border text-muted-foreground hover:border-blue-400"}`}>
          💧 Analcolica
        </button>
      </div>

      {/* ABV presets */}
      {(activeTab === "all" || activeTab === "beers") && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Gradazione (ABV)</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {abvPresets.map(([label, min, max]) => (
              <button key={label}
                onClick={() => {
                  const active = filterMinAbv === min && filterMaxAbv === max;
                  setFilterMinAbv(active ? "" : min);
                  setFilterMaxAbv(active ? "" : max);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterMinAbv === min && filterMaxAbv === max ? "bg-primary text-white border-primary" : "border-stone-200 dark:border-border text-muted-foreground hover:border-primary/40"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number" min={0} max={30} step={0.5}
              placeholder="Min %"
              value={filterMinAbv}
              onChange={e => setFilterMinAbv(e.target.value)}
              className="h-8 text-xs rounded-xl w-24 border-stone-200 dark:border-border"
            />
            <span className="text-muted-foreground text-xs">–</span>
            <Input
              type="number" min={0} max={30} step={0.5}
              placeholder="Max %"
              value={filterMaxAbv}
              onChange={e => setFilterMaxAbv(e.target.value)}
              className="h-8 text-xs rounded-xl w-24 border-stone-200 dark:border-border"
            />
          </div>
        </div>
      )}

      {/* IBU presets */}
      {(activeTab === "all" || activeTab === "beers") && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Amarezza (IBU)</p>
          <div className="flex flex-wrap gap-1.5">
            {ibuPresets.map(([label, min, max]) => (
              <button key={label}
                onClick={() => {
                  const active = filterMinIbu === min && filterMaxIbu === max;
                  setFilterMinIbu(active ? "" : min);
                  setFilterMaxIbu(active ? "" : max);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterMinIbu === min && filterMaxIbu === max ? "bg-green-600 text-white border-green-600" : "border-stone-200 dark:border-border text-muted-foreground hover:border-green-400"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Style chips */}
      {(activeTab === "all" || activeTab === "beers") && popularStyles && popularStyles.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Stile birra</p>
          <div className="flex flex-wrap gap-1.5">
            {filterStyle && (
              <button onClick={() => setFilterStyle("")}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary text-white border border-primary flex items-center gap-1">
                {filterStyle} <X className="w-3 h-3" />
              </button>
            )}
            {popularStyles.slice(0, 14).filter(({ style }) => style !== filterStyle).map(({ style }) => (
              <button key={style} onClick={() => setFilterStyle(style)}
                className="px-2.5 py-1 rounded-full text-xs font-medium border border-stone-200 dark:border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all bg-white dark:bg-[#1A1D24]">
                {style}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* City filter */}
      {(activeTab === "all" || activeTab === "pubs") && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Città</p>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Es. Milano, Roma…"
              value={filterCity}
              onChange={e => setFilterCity(e.target.value)}
              className="h-9 pl-9 text-sm rounded-xl border-stone-200 dark:border-border"
            />
            {filterCity && (
              <button onClick={() => setFilterCity("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Country filter (breweries) */}
      {(activeTab === "all" || activeTab === "breweries") && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Paese birrificio</p>
          <div className="flex flex-wrap gap-1.5">
            {["Italia", "Germany", "Belgium", "USA", "UK", "France"].map(c => (
              <button key={c} onClick={() => setFilterCountry(filterCountry === c ? "" : c)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${filterCountry === c ? "bg-primary text-white border-primary" : "border-stone-200 dark:border-border text-muted-foreground hover:border-primary/40"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile: overlay + bottom sheet */}
      <div className="lg:hidden">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
        {/* Sheet */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#1A1D24] rounded-t-3xl shadow-2xl px-5 pt-4 pb-8 max-h-[85vh] overflow-y-auto">
          <div className="w-10 h-1 bg-stone-200 dark:bg-stone-700 rounded-full mx-auto mb-4" />
          {panelContent}
          <Button onClick={onClose} className="w-full mt-5 rounded-xl bg-primary text-white font-bold">
            Applica filtri {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
          </Button>
        </div>
      </div>
      {/* Desktop: inline panel */}
      <div className="hidden lg:block mb-4 p-4 rounded-2xl bg-white dark:bg-[#1A1D24] border border-stone-200 dark:border-border shadow-sm">
        {panelContent}
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SearchPage() {
  const searchStr = useSearch();
  const params = useMemo(() => new URLSearchParams(searchStr), [searchStr]);

  // ── State — initialised from URL ──
  const [inputValue, setInputValue] = useState(() => readParam(params, "q"));
  const [query, setQuery] = useState(() => readParam(params, "q"));
  const [activeTab, setActiveTab] = useState<Tab>(() => (readParam(params, "type") as Tab) || "all");
  const [showFilters, setShowFilters] = useState(false);

  const [filterGlutenFree, setFilterGlutenFree] = useState(() => readBool(params, "glutenFree"));
  const [filterAlcoholFree, setFilterAlcoholFree] = useState(() => readBool(params, "alcoholFree"));
  const [filterStyle, setFilterStyle] = useState(() => readParam(params, "style"));
  const [filterCity, setFilterCity] = useState(() => readParam(params, "city"));
  const [filterCountry, setFilterCountry] = useState(() => readParam(params, "country"));
  const [filterMinAbv, setFilterMinAbv] = useState(() => readParam(params, "minAbv"));
  const [filterMaxAbv, setFilterMaxAbv] = useState(() => readParam(params, "maxAbv"));
  const [filterMinIbu, setFilterMinIbu] = useState(() => readParam(params, "minIbu"));
  const [filterMaxIbu, setFilterMaxIbu] = useState(() => readParam(params, "maxIbu"));

  const [additionModalOpen, setAdditionModalOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("fermentato_recent_searches") || "[]"); }
    catch { return []; }
  });

  // ── Sync URL when query/filters change ──
  const syncUrl = useCallback(() => {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (activeTab !== "all") p.set("type", activeTab);
    if (filterGlutenFree) p.set("glutenFree", "true");
    if (filterAlcoholFree) p.set("alcoholFree", "true");
    if (filterStyle) p.set("style", filterStyle);
    if (filterCity) p.set("city", filterCity);
    if (filterCountry) p.set("country", filterCountry);
    if (filterMinAbv) p.set("minAbv", filterMinAbv);
    if (filterMaxAbv) p.set("maxAbv", filterMaxAbv);
    if (filterMinIbu) p.set("minIbu", filterMinIbu);
    if (filterMaxIbu) p.set("maxIbu", filterMaxIbu);
    const qs = p.toString();
    window.history.replaceState(null, "", `/search${qs ? `?${qs}` : ""}`);
  }, [query, activeTab, filterGlutenFree, filterAlcoholFree, filterStyle, filterCity, filterCountry, filterMinAbv, filterMaxAbv, filterMinIbu, filterMaxIbu]);

  useEffect(() => { syncUrl(); }, [syncUrl]);

  // ── Recent searches ──
  function addRecentSearch(q: string) {
    if (!q.trim() || q.length < 2) return;
    setRecentSearches(prev => {
      const next = [q, ...prev.filter(s => s !== q)].slice(0, 6);
      localStorage.setItem("fermentato_recent_searches", JSON.stringify(next));
      return next;
    });
  }
  function removeRecentSearch(q: string) {
    setRecentSearches(prev => {
      const next = prev.filter(s => s !== q);
      localStorage.setItem("fermentato_recent_searches", JSON.stringify(next));
      return next;
    });
  }

  // ── API URL ──
  const apiUrl = useMemo(() => {
    const p = new URLSearchParams({ q: query });
    if (activeTab !== "all") p.set("type", activeTab);
    if (filterGlutenFree) p.set("glutenFree", "true");
    if (filterAlcoholFree) p.set("alcoholFree", "true");
    if (filterStyle) p.set("style", filterStyle);
    if (filterCity) p.set("city", filterCity);
    if (filterMinAbv) p.set("minAbv", filterMinAbv);
    if (filterMaxAbv) p.set("maxAbv", filterMaxAbv);
    if (filterMinIbu) p.set("minIbu", filterMinIbu);
    if (filterMaxIbu) p.set("maxIbu", filterMaxIbu);
    return `/api/search?${p}`;
  }, [query, activeTab, filterGlutenFree, filterAlcoholFree, filterStyle, filterCity, filterMinAbv, filterMaxAbv, filterMinIbu, filterMaxIbu]);

  const { data: results, isLoading } = useQuery<SearchResult>({
    queryKey: ["/api/search", query, activeTab, filterGlutenFree, filterAlcoholFree, filterStyle, filterCity, filterMinAbv, filterMaxAbv, filterMinIbu, filterMaxIbu],
    queryFn: () => fetch(apiUrl).then(r => r.json()),
    enabled: query.length > 1,
  });

  const { data: popularStyles } = useQuery<{ style: string; count: number }[]>({
    queryKey: ["/api/beers/popular-styles"],
    queryFn: () => fetch("/api/beers/popular-styles?limit=30").then(r => r.json()),
    staleTime: 1000 * 60 * 60,
  });

  const filteredBeers = results?.beers || [];
  const filteredBreweries = useMemo(() => {
    if (!results?.breweries) return [];
    if (!filterCountry) return results.breweries;
    return results.breweries.filter(b =>
      b.country?.toLowerCase().includes(filterCountry.toLowerCase()) ||
      b.location?.toLowerCase().includes(filterCountry.toLowerCase())
    );
  }, [results?.breweries, filterCountry]);
  const filteredPubs = results?.pubs || [];

  const tabCounts = {
    all: filteredBeers.length + filteredBreweries.length + filteredPubs.length,
    beers: filteredBeers.length,
    breweries: filteredBreweries.length,
    pubs: filteredPubs.length,
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(inputValue);
    setActiveTab("all");
    addRecentSearch(inputValue);
  };

  const hasActiveFilters = !!(filterGlutenFree || filterAlcoholFree || filterStyle || filterCity || filterCountry || filterMinAbv || filterMaxAbv || filterMinIbu || filterMaxIbu);
  const clearFilters = () => {
    setFilterGlutenFree(false); setFilterAlcoholFree(false);
    setFilterStyle(""); setFilterCity(""); setFilterCountry("");
    setFilterMinAbv(""); setFilterMaxAbv("");
    setFilterMinIbu(""); setFilterMaxIbu("");
  };
  const activeFilterCount = [
    filterGlutenFree, filterAlcoholFree,
    !!filterStyle, !!filterCity, !!filterCountry,
    !!(filterMinAbv || filterMaxAbv), !!(filterMinIbu || filterMaxIbu),
  ].filter(Boolean).length;

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "all", label: "Tutto", icon: Search },
    { id: "beers", label: "Birre", icon: Beer },
    { id: "breweries", label: "Birrifici", icon: Building2 },
    { id: "pubs", label: "Pub", icon: MapPin },
  ];

  const filterProps = {
    filterGlutenFree, setFilterGlutenFree,
    filterAlcoholFree, setFilterAlcoholFree,
    filterStyle, setFilterStyle,
    filterCity, setFilterCity,
    filterCountry, setFilterCountry,
    filterMinAbv, setFilterMinAbv,
    filterMaxAbv, setFilterMaxAbv,
    filterMinIbu, setFilterMinIbu,
    filterMaxIbu, setFilterMaxIbu,
    hasActiveFilters, activeFilterCount, clearFilters,
  };

  return (
    <>
      <Helmet>
        <title>{query ? `"${query}" — Ricerca | Fermenta.to` : "Ricerca birre e pub | Fermenta.to"}</title>
        <meta name="description" content={query ? `Risultati per "${query}" su Fermenta.to` : "Cerca birre artigianali, pub e birrifici in Italia su Fermenta.to."} />
        <link rel="canonical" href={`https://fermenta.to/search${query ? `?q=${encodeURIComponent(query)}` : ""}`} />
      </Helmet>
      <div className="min-h-screen bg-background">

        {/* ── Sticky header ── */}
        <div className="bg-white dark:bg-card border-b border-stone-100 dark:border-border sticky top-[var(--mobile-top-offset)] lg:top-16 z-40">
          <div className="max-w-3xl mx-auto px-4 pt-4 pb-3">
            <div className="flex items-center gap-3 mb-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary hover:bg-stone-50/60 rounded-full -ml-1">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Indietro
                </Button>
              </Link>
              <div className="flex-1">
                <h1 className="text-foreground font-bold text-lg leading-tight">Ricerca</h1>
                <p className="text-muted-foreground text-xs">Birre · Birrifici · Pub</p>
              </div>
            </div>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                <Input
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  placeholder={
                    activeTab === "beers" ? "Cerca birra, stile, ABV…" :
                    activeTab === "breweries" ? "Cerca birrificio, nazione…" :
                    activeTab === "pubs" ? "Cerca pub, città…" :
                    "Cerca birre, birrifici, pub…"
                  }
                  className="pl-12 pr-10 h-11 rounded-2xl border-stone-200 dark:border-border bg-white dark:bg-[#1A1D24] focus-visible:ring-primary/20 text-base"
                />
                {inputValue && (
                  <button type="button" onClick={() => { setInputValue(""); setQuery(""); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-white h-11 rounded-xl px-4">Cerca</Button>
              <Button type="button" variant="outline" size="icon"
                className={`relative h-11 w-11 rounded-xl flex-shrink-0 border-stone-200 dark:border-border text-primary hover:bg-stone-50 ${hasActiveFilters ? "bg-primary/10 border-primary/30" : ""}`}
                onClick={() => setShowFilters(f => !f)} title="Filtri avanzati">
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </form>

            {/* Active filter badges */}
            <ActiveFilterBadges {...filterProps} />

            {/* Category tabs */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 mt-1">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id} type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      isActive
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-stone-50 dark:bg-[#1A1D24] text-stone-600 dark:text-stone-300 border-stone-200 dark:border-border hover:border-primary/40 hover:text-primary"
                    }`}>
                    <Icon className="h-3 w-3" />
                    {tab.label}
                    {query.length > 1 && tabCounts[tab.id] > 0 && (
                      <span className={`text-[10px] font-bold ml-0.5 ${isActive ? "opacity-80" : "text-primary dark:text-orange-400"}`}>
                        {tabCounts[tab.id]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Filter sheet ── */}
        <FilterSheet open={showFilters} onClose={() => setShowFilters(false)} activeTab={activeTab} popularStyles={popularStyles} {...filterProps} />

        {/* ── Content ── */}
        <div className="max-w-3xl mx-auto px-4 py-4 pb-28 sm:pb-8">

          {/* Empty state / recent searches */}
          {query.length <= 1 && (
            <div>
              {recentSearches.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-primary" /> Ricerche recenti
                    </span>
                    <button onClick={() => { setRecentSearches([]); localStorage.removeItem("fermentato_recent_searches"); }}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                      Cancella tutto
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {recentSearches.map(s => (
                      <div key={s} className="flex items-center gap-2 p-3 rounded-2xl bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-primary/30 active:scale-[0.99] group">
                        <Clock className="w-4 h-4 text-primary opacity-40 flex-shrink-0" />
                        <button className="flex-1 text-left text-sm text-foreground hover:text-primary transition-colors"
                          onClick={() => { setInputValue(s); setQuery(s); addRecentSearch(s); }}>
                          {s}
                        </button>
                        <button onClick={() => removeRecentSearch(s)} className="text-muted-foreground hover:text-destructive transition-all">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-20 h-20 rounded-full bg-stone-50 dark:bg-[#0B0D10]/20 flex items-center justify-center mb-5">
                    <Search className="h-10 w-10 text-primary/30" />
                  </div>
                  <p className="text-lg font-semibold text-foreground mb-1">Cosa stai cercando?</p>
                  <p className="text-sm text-muted-foreground max-w-xs">Digita almeno 2 caratteri per cercare tra birre, birrifici e pub</p>
                  <div className="flex items-center gap-4 mt-6 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Beer className="w-3.5 h-3.5 text-primary" /> Birre</span>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-primary" /> Birrifici</span>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-blue-500" /> Pub</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="space-y-2.5 mt-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-neutral-800 animate-pulse" />
              ))}
            </div>
          )}

          {/* Results */}
          {!isLoading && results && query.length > 1 && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {tabCounts.all > 0
                    ? `${tabCounts.all} risultat${tabCounts.all === 1 ? "o" : "i"} per "${query}"`
                    : `Nessun risultato per "${query}"`}
                  {hasActiveFilters && <span className="text-primary dark:text-orange-400"> · {activeFilterCount} filtri</span>}
                </p>
                <div className="flex items-center gap-3">
                  {query && (
                    <button onClick={() => setAdditionModalOpen(true)}
                      className="flex items-center gap-1.5 text-xs text-primary dark:text-orange-400 font-medium px-3 py-1.5 border border-stone-200 hover:bg-stone-50 rounded-xl transition-colors">
                      <PlusCircle className="h-3.5 w-3.5" /> Suggerisci
                    </button>
                  )}
                  {hasActiveFilters && (
                    <button onClick={clearFilters} className="text-xs text-primary hover:underline">
                      Rimuovi filtri
                    </button>
                  )}
                </div>
              </div>

              {/* Beer section */}
              {(activeTab === "all" || activeTab === "beers") && filteredBeers.length > 0 && (
                <section>
                  {activeTab === "all" && (
                    <h2 className="font-bold text-foreground mb-2 flex items-center gap-2 text-sm uppercase tracking-wide">
                      <Beer className="h-4 w-4 text-primary" />
                      Birre <span className="font-normal text-muted-foreground">({filteredBeers.length})</span>
                    </h2>
                  )}
                  <div className="space-y-2">
                    {filteredBeers.map((beer: any) => (
                      <Link key={beer.id} href={`/beer/${beer.id}`}>
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 hover:border-primary/30 active:scale-[0.99] cursor-pointer group">
                          <ImageWithFallback
                            src={beer.imageUrl}
                            alt={beer.name}
                            imageType="beer"
                            containerClassName="w-11 h-11 flex-shrink-0 rounded-lg"
                            className="w-11 h-11 object-cover rounded-lg"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                              {beer.name}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              {(beer.brewery?.name || beer.breweryName) && (
                                <span className="text-xs text-primary dark:text-orange-400 font-semibold truncate max-w-32">
                                  {beer.brewery?.name || beer.breweryName}
                                </span>
                              )}
                              {beer.style && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 border-stone-200 dark:border-border text-muted-foreground">{beer.style}</Badge>
                              )}
                              {beer.abv != null && (
                                <span className="text-[10px] text-muted-foreground font-medium">{beer.abv}%</span>
                              )}
                              {beer.ibu != null && (
                                <span className="text-[10px] text-muted-foreground font-medium">{beer.ibu} IBU</span>
                              )}
                              {beer.isGlutenFree && <GlutenFreeSmallBadge size={10} />}
                              {beer.isAlcoholFree && <AlcoholFreeBadge size={10} />}
                            </div>
                          </div>
                          <Badge className="flex-shrink-0 text-[10px] bg-stone-50 dark:bg-[#0B0D10]/20 text-primary dark:text-orange-400 border-0 font-bold uppercase tracking-wider">Birra</Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Brewery section */}
              {(activeTab === "all" || activeTab === "breweries") && filteredBreweries.length > 0 && (
                <section>
                  {activeTab === "all" && (
                    <h2 className="font-bold text-foreground mb-2 flex items-center gap-2 text-sm uppercase tracking-wide">
                      <Building2 className="h-4 w-4 text-primary" />
                      Birrifici <span className="font-normal text-muted-foreground">({filteredBreweries.length})</span>
                    </h2>
                  )}
                  <div className="space-y-2">
                    {filteredBreweries.map((brewery: any) => (
                      <Link key={brewery.id} href={`/brewery/${brewery.id}`}>
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 hover:border-primary/30 active:scale-[0.99] cursor-pointer group">
                          <ImageWithFallback
                            src={brewery.logoUrl}
                            alt={brewery.name}
                            imageType="brewery"
                            containerClassName="w-11 h-11 flex-shrink-0 rounded-full"
                            className="w-11 h-11 object-cover rounded-full"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                              {brewery.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {brewery.location}{brewery.country ? `, ${brewery.country}` : ""}
                            </div>
                          </div>
                          <Badge className="flex-shrink-0 text-[10px] bg-stone-50 dark:bg-[#0B0D10]/20 text-primary dark:text-orange-400 border-0 font-bold uppercase tracking-wider">Birrificio</Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Pub section */}
              {(activeTab === "all" || activeTab === "pubs") && filteredPubs.length > 0 && (
                <section>
                  {activeTab === "all" && (
                    <h2 className="font-bold text-foreground mb-2 flex items-center gap-2 text-sm uppercase tracking-wide">
                      <MapPin className="h-4 w-4 text-primary" />
                      Pub <span className="font-normal text-muted-foreground">({filteredPubs.length})</span>
                    </h2>
                  )}
                  <div className="space-y-2">
                    {filteredPubs.map((pub: any) => (
                      <Link key={pub.id} href={`/pub/${pub.slug || pub.id}`}>
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 hover:border-primary/30 active:scale-[0.99] cursor-pointer group">
                          <ImageWithFallback
                            src={pub.logoUrl}
                            alt={pub.name}
                            imageType="pub"
                            containerClassName="w-11 h-11 flex-shrink-0 rounded-lg"
                            className="w-11 h-11 object-cover rounded-lg"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                              {pub.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              {pub.city && <><MapPin className="w-2.5 h-2.5 flex-shrink-0" />{pub.city}</>}
                              {pub.address ? ` · ${pub.address}` : ""}
                            </div>
                          </div>
                          <Badge className="flex-shrink-0 text-[10px] bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-0 font-bold uppercase tracking-wider">Pub</Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* No results */}
              {tabCounts.all === 0 && (
                <div className="text-center py-14">
                  <div className="w-16 h-16 rounded-full bg-stone-50 dark:bg-[#0B0D10]/20 flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-primary/30" />
                  </div>
                  <p className="font-bold text-foreground">Nessun risultato per "{query}"</p>
                  <p className="text-sm text-muted-foreground mt-1">Prova con termini diversi o rimuovi i filtri</p>
                  <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
                    {hasActiveFilters && (
                      <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-xl border-stone-200 text-primary">
                        <X className="w-3.5 h-3.5 mr-1.5" /> Rimuovi filtri
                      </Button>
                    )}
                    <button onClick={() => setAdditionModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1A1D24] border border-stone-200 text-primary rounded-xl text-sm font-bold hover:bg-stone-50 transition-colors">
                      <PlusCircle className="h-4 w-4" /> Non la trovi? Suggeriscila
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <Footer />
      </div>

      <AdditionRequestModal
        open={additionModalOpen}
        onClose={() => setAdditionModalOpen(false)}
        initialBeerName={query}
        defaultTab="beer"
      />
    </>
  );
}
