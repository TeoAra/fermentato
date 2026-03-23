import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Link } from "wouter";
import { Beer, Building2, MapPin, Search, ArrowLeft, SlidersHorizontal, X, PlusCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo } from "react";
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

export default function SearchPage() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const initialQ = params.get("q") || "";

  const [inputValue, setInputValue] = useState(initialQ);
  const [query, setQuery] = useState(initialQ);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [filterGlutenFree, setFilterGlutenFree] = useState(false);
  const [filterAlcoholFree, setFilterAlcoholFree] = useState(false);
  const [filterStyle, setFilterStyle] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterMinAbv, setFilterMinAbv] = useState("");
  const [filterMaxAbv, setFilterMaxAbv] = useState("");
  const [filterMinIbu, setFilterMinIbu] = useState("");
  const [filterMaxIbu, setFilterMaxIbu] = useState("");
  const [additionModalOpen, setAdditionModalOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('fermentato_recent_searches') || '[]'); }
    catch { return []; }
  });

  function addRecentSearch(q: string) {
    if (!q.trim() || q.length < 2) return;
    setRecentSearches(prev => {
      const next = [q, ...prev.filter(s => s !== q)].slice(0, 6);
      localStorage.setItem('fermentato_recent_searches', JSON.stringify(next));
      return next;
    });
  }

  function removeRecentSearch(q: string) {
    setRecentSearches(prev => {
      const next = prev.filter(s => s !== q);
      localStorage.setItem('fermentato_recent_searches', JSON.stringify(next));
      return next;
    });
  }

  useEffect(() => {
    setInputValue(initialQ);
    setQuery(initialQ);
  }, [initialQ]);

  const apiUrl = useMemo(() => {
    const p = new URLSearchParams({ q: query });
    if (filterGlutenFree) p.set("glutenFree", "true");
    if (filterAlcoholFree) p.set("alcoholFree", "true");
    if (filterStyle) p.set("style", filterStyle);
    if (filterMinAbv) p.set("minAbv", filterMinAbv);
    if (filterMaxAbv) p.set("maxAbv", filterMaxAbv);
    if (filterMinIbu) p.set("minIbu", filterMinIbu);
    if (filterMaxIbu) p.set("maxIbu", filterMaxIbu);
    return `/api/search?${p}`;
  }, [query, filterGlutenFree, filterAlcoholFree, filterStyle, filterMinAbv, filterMaxAbv, filterMinIbu, filterMaxIbu]);

  const { data: results, isLoading } = useQuery<SearchResult>({
    queryKey: ["/api/search", query, filterGlutenFree, filterAlcoholFree, filterStyle, filterMinAbv, filterMaxAbv, filterMinIbu, filterMaxIbu],
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
    window.history.replaceState(null, "", `/search?q=${encodeURIComponent(inputValue)}`);
  };

  const hasActiveFilters = filterGlutenFree || filterAlcoholFree || filterStyle || filterCountry || filterMinAbv || filterMaxAbv || filterMinIbu || filterMaxIbu;

  const clearFilters = () => {
    setFilterGlutenFree(false);
    setFilterAlcoholFree(false);
    setFilterStyle("");
    setFilterCountry("");
    setFilterMinAbv("");
    setFilterMaxAbv("");
    setFilterMinIbu("");
    setFilterMaxIbu("");
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "all", label: "Tutto", icon: Search },
    { id: "beers", label: "Birre", icon: Beer },
    { id: "breweries", label: "Birrifici", icon: Building2 },
    { id: "pubs", label: "Pub", icon: MapPin },
  ];

  const activeFilterCount = [filterGlutenFree, filterAlcoholFree, !!filterStyle, !!filterCountry, !!filterMinAbv, !!filterMaxAbv, !!filterMinIbu, !!filterMaxIbu].filter(Boolean).length;

  return (
    <>
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900">

      {/* Gradient header */}
      <div className="relative bg-gradient-to-br from-amber-500 via-amber-500 to-orange-500 dark:from-amber-700 dark:via-amber-700 dark:to-orange-700 overflow-hidden">
        <div className="absolute inset-0 bg-black/5" />
        <div className="relative max-w-3xl mx-auto px-4 pt-4 pb-5">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10 -ml-1">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Indietro
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-white font-bold text-lg leading-tight">Ricerca Avanzata</h1>
              <p className="text-white/75 text-xs">Birre · Birrifici · Pub</p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="Cerca birre, stili, birrifici, pub..."
                className="pl-10 pr-10 h-11 rounded-xl border-0 bg-white dark:bg-neutral-800 shadow-md focus-visible:ring-amber-300"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => { setInputValue(""); setQuery(""); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button type="submit" className="bg-white/20 hover:bg-white/30 text-white border border-white/30 h-11 rounded-xl px-4 backdrop-blur-sm">
              Cerca
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={`relative h-11 w-11 rounded-xl flex-shrink-0 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm ${hasActiveFilters ? "bg-white/25 border-white/60" : ""}`}
              onClick={() => setShowFilters(f => !f)}
              title="Filtri avanzati"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white text-amber-600 text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-4 pb-28 sm:pb-8">

        {/* Advanced filters panel */}
        {showFilters && (
          <div className="mb-4 p-4 rounded-xl bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700 dark:text-neutral-200 flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                Filtri
              </span>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
                  <X className="w-3 h-3" /> Cancella ({activeFilterCount})
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setFilterGlutenFree(f => !f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterGlutenFree ? "bg-green-500 text-white border-green-500" : "border-gray-200 dark:border-neutral-600 text-gray-600 dark:text-neutral-300 hover:border-green-400"}`}>
                🌾 Senza glutine
              </button>
              <button onClick={() => setFilterAlcoholFree(f => !f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterAlcoholFree ? "bg-blue-500 text-white border-blue-500" : "border-gray-200 dark:border-neutral-600 text-gray-600 dark:text-neutral-300 hover:border-blue-400"}`}>
                💧 Analcolica
              </button>

              <span className="self-center text-xs text-gray-400 px-1">|</span>
              {([["🍺 Light <5%", "", "4.9"], ["⚡ Strong >7%", "7", ""], ["💥 Imperial >9%", "9", ""]] as [string,string,string][]).map(([label, min, max]) => (
                <button key={label}
                  onClick={() => { setFilterMinAbv(filterMinAbv === min && filterMaxAbv === max ? "" : min); setFilterMaxAbv(filterMinAbv === min && filterMaxAbv === max ? "" : max); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterMinAbv === min && filterMaxAbv === max ? "bg-orange-500 text-white border-orange-500" : "border-gray-200 dark:border-neutral-600 text-gray-600 dark:text-neutral-300 hover:border-orange-400"}`}>
                  {label}
                </button>
              ))}

              <span className="self-center text-xs text-gray-400 px-1">|</span>
              {([["😌 Dolce", "", "19"], ["⚖️ Bilanciata", "20", "50"], ["🌿 Amara", "60", ""]] as [string,string,string][]).map(([label, min, max]) => (
                <button key={label}
                  onClick={() => { setFilterMinIbu(filterMinIbu === min && filterMaxIbu === max ? "" : min); setFilterMaxIbu(filterMinIbu === min && filterMaxIbu === max ? "" : max); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterMinIbu === min && filterMaxIbu === max ? "bg-green-600 text-white border-green-600" : "border-gray-200 dark:border-neutral-600 text-gray-600 dark:text-neutral-300 hover:border-green-400"}`}>
                  {label}
                </button>
              ))}
            </div>

            {popularStyles && popularStyles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-100 dark:border-neutral-700">
                <span className="self-center text-xs text-gray-400 mr-1">Stile:</span>
                {filterStyle && (
                  <button onClick={() => setFilterStyle("")}
                    className="px-2.5 py-1 rounded-full text-xs font-medium border bg-amber-500 text-white border-amber-500 flex items-center gap-1">
                    {filterStyle} <X className="w-3 h-3" />
                  </button>
                )}
                {popularStyles.slice(0, 12).filter(({ style }) => style !== filterStyle).map(({ style }) => (
                  <button key={style}
                    onClick={() => setFilterStyle(style)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium border border-gray-200 dark:border-neutral-600 text-gray-600 dark:text-neutral-300 hover:border-amber-400 hover:text-amber-600 transition-all bg-white dark:bg-neutral-700">
                    {style}
                  </button>
                ))}
              </div>
            )}

            {(activeTab === "all" || activeTab === "breweries") && (
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-100 dark:border-neutral-700">
                <span className="self-center text-xs text-gray-400 mr-1">Paese:</span>
                {["Italia", "Germany", "Belgium", "USA", "UK", "France"].map(c => (
                  <button key={c}
                    onClick={() => setFilterCountry(filterCountry === c ? "" : c)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${filterCountry === c ? "bg-orange-500 text-white border-orange-500" : "border-gray-200 dark:border-neutral-600 text-gray-600 dark:text-neutral-300 hover:border-orange-400"}`}>
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state / recent searches */}
        {query.length <= 1 && (
          <div>
            {recentSearches.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-500 dark:text-neutral-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Ricerche recenti
                  </span>
                  <button
                    onClick={() => { setRecentSearches([]); localStorage.removeItem('fermentato_recent_searches'); }}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Cancella tutto
                  </button>
                </div>
                <div className="space-y-1.5">
                  {recentSearches.map(s => (
                    <div key={s} className="flex items-center gap-2 p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 group">
                      <Clock className="w-4 h-4 text-gray-300 dark:text-neutral-600 flex-shrink-0" />
                      <button
                        className="flex-1 text-left text-sm text-gray-700 dark:text-neutral-200 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                        onClick={() => { setInputValue(s); setQuery(s); addRecentSearch(s); window.history.replaceState(null, "", `/search?q=${encodeURIComponent(s)}`); }}
                      >
                        {s}
                      </button>
                      <button onClick={() => removeRecentSearch(s)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-5">
                  <Search className="h-10 w-10 text-amber-400 dark:text-amber-500" />
                </div>
                <p className="text-lg font-semibold text-gray-700 dark:text-neutral-200 mb-1">Cosa stai cercando?</p>
                <p className="text-sm text-gray-400 dark:text-neutral-500 max-w-xs">Digita almeno 2 caratteri per cercare tra birre, birrifici e pub</p>
                <div className="flex items-center gap-4 mt-6 text-xs text-gray-400 dark:text-neutral-500">
                  <span className="flex items-center gap-1.5"><Beer className="w-3.5 h-3.5 text-amber-400" /> Birre</span>
                  <span className="text-gray-200 dark:text-neutral-700">·</span>
                  <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-amber-400" /> Birrifici</span>
                  <span className="text-gray-200 dark:text-neutral-700">·</span>
                  <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-blue-400" /> Pub</span>
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
            {/* Tab bar */}
            <div className="flex gap-1 p-1 bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm">
              {tabs.map(tab => {
                const count = tabCounts[tab.id];
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? "bg-amber-500 text-white shadow-sm"
                        : "text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    {count > 0 && (
                      <span className={`text-xs rounded-full px-1.5 py-0.5 min-w-5 text-center ${
                        activeTab === tab.id ? "bg-amber-400 text-white" : "bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300"
                      }`}>
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Results summary */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-neutral-400">
                {tabCounts.all > 0
                  ? `${tabCounts.all} risultat${tabCounts.all === 1 ? "o" : "i"} per "${query}"`
                  : `Nessun risultato per "${query}"`}
                {hasActiveFilters && <span className="text-amber-600"> · filtri attivi ({activeFilterCount})</span>}
              </p>
              <div className="flex items-center gap-3">
                {query && (
                  <button
                    onClick={() => setAdditionModalOpen(true)}
                    className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Suggerisci
                  </button>
                )}
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-amber-600 hover:underline">
                  Rimuovi filtri
                </button>
              )}
              </div>
            </div>

            {/* Beer section */}
            {(activeTab === "all" || activeTab === "beers") && filteredBeers.length > 0 && (
              <section>
                {activeTab === "all" && (
                  <h2 className="font-bold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <Beer className="h-4 w-4 text-amber-500" />
                    Birre <span className="font-normal text-gray-400">({filteredBeers.length})</span>
                  </h2>
                )}
                <div className="space-y-1.5">
                  {filteredBeers.map((beer: any) => (
                    <Link key={beer.id} href={`/beer/${beer.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md transition-all cursor-pointer group">
                        <ImageWithFallback
                          src={beer.imageUrl}
                          alt={beer.name}
                          imageType="beer"
                          containerClassName="w-11 h-11 flex-shrink-0 rounded-lg"
                          className="w-11 h-11 object-cover rounded-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {beer.name}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {(beer.brewery?.name || beer.breweryName) && (
                              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium truncate max-w-32">
                                {beer.brewery?.name || beer.breweryName}
                              </span>
                            )}
                            {beer.style && (
                              <Badge variant="outline" className="text-xs py-0 px-1.5 h-4 border-gray-200 dark:border-neutral-600">{beer.style}</Badge>
                            )}
                            {beer.abv != null && (
                              <span className="text-xs text-gray-400">{beer.abv}%</span>
                            )}
                            {beer.ibu != null && (
                              <span className="text-xs text-gray-400">{beer.ibu} IBU</span>
                            )}
                            {beer.isGlutenFree && <GlutenFreeSmallBadge size={10} />}
                            {beer.isAlcoholFree && <AlcoholFreeBadge size={10} />}
                          </div>
                        </div>
                        <Badge className="flex-shrink-0 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">Birra</Badge>
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
                  <h2 className="font-bold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <Building2 className="h-4 w-4 text-amber-500" />
                    Birrifici <span className="font-normal text-gray-400">({filteredBreweries.length})</span>
                  </h2>
                )}
                <div className="space-y-1.5">
                  {filteredBreweries.map((brewery: any) => (
                    <Link key={brewery.id} href={`/brewery/${brewery.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md transition-all cursor-pointer group">
                        <ImageWithFallback
                          src={brewery.logoUrl}
                          alt={brewery.name}
                          imageType="brewery"
                          containerClassName="w-11 h-11 flex-shrink-0 rounded-full"
                          className="w-11 h-11 object-cover rounded-full"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {brewery.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-neutral-400 truncate">
                            {brewery.location}{brewery.country ? `, ${brewery.country}` : ""}
                          </div>
                        </div>
                        <Badge className="flex-shrink-0 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0">Birrificio</Badge>
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
                  <h2 className="font-bold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    Pub <span className="font-normal text-gray-400">({filteredPubs.length})</span>
                  </h2>
                )}
                <div className="space-y-1.5">
                  {filteredPubs.map((pub: any) => (
                    <Link key={pub.id} href={`/pub/${pub.slug || pub.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all cursor-pointer group">
                        <ImageWithFallback
                          src={pub.logoUrl}
                          alt={pub.name}
                          imageType="pub"
                          containerClassName="w-11 h-11 flex-shrink-0 rounded-lg"
                          className="w-11 h-11 object-cover rounded-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {pub.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-neutral-400 truncate">
                            {pub.city}{pub.address ? ` · ${pub.address}` : ""}
                          </div>
                        </div>
                        <Badge className="flex-shrink-0 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">Pub</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* No results */}
            {tabCounts.all === 0 && (
              <div className="text-center py-14">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-gray-300 dark:text-neutral-600" />
                </div>
                <p className="font-semibold text-gray-600 dark:text-neutral-300">Nessun risultato per "{query}"</p>
                <p className="text-sm text-gray-400 dark:text-neutral-500 mt-1">Prova con termini diversi o rimuovi i filtri</p>
                <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      <X className="w-3.5 h-3.5 mr-1.5" />
                      Rimuovi filtri
                    </Button>
                  )}
                  <button
                    onClick={() => setAdditionModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-lg text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Non la trovi? Suggeriscila
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
