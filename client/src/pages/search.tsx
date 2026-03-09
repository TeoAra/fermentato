import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Link } from "wouter";
import { Beer, Building2, MapPin, Search, ArrowLeft, SlidersHorizontal, X, ChevronDown, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo } from "react";
import { GlutenFreeSmallBadge, AlcoholFreeBadge } from "@/components/beer-badges";
import ImageWithFallback from "@/components/image-with-fallback";
import Footer from "@/components/footer";

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

  const { data: suggestions } = useQuery<{ styles: string[]; breweries: string[]; cities: string[] }>({
    queryKey: ["/api/search/suggestions"],
    queryFn: () => fetch("/api/search/suggestions").then(r => r.json()),
    staleTime: 1000 * 60 * 60,
  });

  const popularSearches = useMemo(() => {
    if (!suggestions) return ["IPA", "Lager", "Stout", "Weizen", "Pilsner", "Sour", "Porter", "Saison"];
    return [
      ...(suggestions.styles?.slice(0, 8) || []),
      ...(suggestions.cities?.slice(0, 4) || []),
    ].slice(0, 12);
  }, [suggestions]);

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
    window.history.replaceState(null, "", `/search?q=${encodeURIComponent(inputValue)}`);
  };

  const handleQuickSearch = (term: string) => {
    setInputValue(term);
    setQuery(term);
    setActiveTab("all");
    window.history.replaceState(null, "", `/search?q=${encodeURIComponent(term)}`);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-amber-50/30 to-orange-50/30 dark:from-gray-950 dark:via-slate-900 dark:to-slate-900">
      <div className="max-w-3xl mx-auto px-4 py-5 pb-28 sm:pb-5">

        {/* Search bar */}
        <div className="flex items-center gap-2 mb-5">
          <Button variant="ghost" size="sm" asChild className="-ml-2 flex-shrink-0 text-gray-500 hover:text-gray-700">
            <Link href="/"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="Cerca birre, stili, birrifici, pub..."
                className="pl-10 pr-10 h-11 rounded-xl border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm focus-visible:ring-amber-400"
                autoFocus
              />
              {inputValue && (
                <button type="button" onClick={() => { setInputValue(""); setQuery(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white h-11 rounded-xl shadow-sm px-4">
              Cerca
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={`relative h-11 w-11 rounded-xl flex-shrink-0 border-gray-200 dark:border-slate-700 ${hasActiveFilters ? "border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-900/20" : ""}`}
              onClick={() => setShowFilters(f => !f)}
              title="Filtri avanzati"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </form>
        </div>

        {/* Advanced filters panel */}
        {showFilters && (
          <div className="mb-4 p-4 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700 dark:text-slate-200 flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                Filtri avanzati
              </span>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
                  <X className="w-3 h-3" /> Cancella tutti
                </button>
              )}
            </div>

            {/* Special characteristics */}
            {(activeTab === "all" || activeTab === "beers") && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <Beer className="w-3 h-3" /> Caratteristiche birra
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilterGlutenFree(f => !f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterGlutenFree ? "bg-green-500 text-white border-green-500" : "bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-green-300"}`}
                  >
                    🌾 Senza glutine
                  </button>
                  <button
                    onClick={() => setFilterAlcoholFree(f => !f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterAlcoholFree ? "bg-blue-500 text-white border-blue-500" : "bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-blue-300"}`}
                  >
                    💧 Analcolica (0.0%)
                  </button>
                </div>

                {/* ABV range */}
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-400" /> Gradazione alcolica (ABV %)
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0" max="25" step="0.5"
                      placeholder="Min"
                      value={filterMinAbv}
                      onChange={e => setFilterMinAbv(e.target.value)}
                      className="h-8 text-sm w-20 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                    />
                    <span className="text-xs text-gray-400">—</span>
                    <Input
                      type="number"
                      min="0" max="25" step="0.5"
                      placeholder="Max"
                      value={filterMaxAbv}
                      onChange={e => setFilterMaxAbv(e.target.value)}
                      className="h-8 text-sm w-20 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                    />
                    <span className="text-xs text-gray-400">%</span>
                    {/* Quick ABV presets */}
                    <div className="flex gap-1 ml-2">
                      {[["Light (<5%)", "", "4.9"], ["Strong (>7%)", "7", ""], ["Imperial (>9%)", "9", ""]].map(([label, min, max]) => (
                        <button
                          key={label}
                          onClick={() => { setFilterMinAbv(min); setFilterMaxAbv(max); }}
                          className={`px-2 py-1 rounded-full text-[10px] font-medium border transition-all ${filterMinAbv === min && filterMaxAbv === max ? "bg-orange-500 text-white border-orange-500" : "border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-orange-300"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* IBU range */}
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">
                    🌿 Amaro (IBU)
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0" max="200" step="5"
                      placeholder="Min"
                      value={filterMinIbu}
                      onChange={e => setFilterMinIbu(e.target.value)}
                      className="h-8 text-sm w-20 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                    />
                    <span className="text-xs text-gray-400">—</span>
                    <Input
                      type="number"
                      min="0" max="200" step="5"
                      placeholder="Max"
                      value={filterMaxIbu}
                      onChange={e => setFilterMaxIbu(e.target.value)}
                      className="h-8 text-sm w-20 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                    />
                    <span className="text-xs text-gray-400">IBU</span>
                    <div className="flex gap-1 ml-2">
                      {[["Dolce (<20)", "", "19"], ["Bilanciata", "20", "50"], ["Amara (>60)", "60", ""]].map(([label, min, max]) => (
                        <button
                          key={label}
                          onClick={() => { setFilterMinIbu(min); setFilterMaxIbu(max); }}
                          className={`px-2 py-1 rounded-full text-[10px] font-medium border transition-all ${filterMinIbu === min && filterMaxIbu === max ? "bg-green-600 text-white border-green-600" : "border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-green-300"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Style pills from popular styles API */}
                {popularStyles && popularStyles.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">
                      🍺 Stile birra — {popularStyles.length} disponibili
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                      <button
                        onClick={() => setFilterStyle("")}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${!filterStyle ? "bg-amber-500 text-white border-amber-500" : "bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-amber-300"}`}
                      >
                        Tutti
                      </button>
                      {popularStyles.map(({ style, count }) => (
                        <button
                          key={style}
                          onClick={() => setFilterStyle(filterStyle === style ? "" : style)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${filterStyle === style ? "bg-amber-500 text-white border-amber-500" : "bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-amber-300"}`}
                        >
                          {style}
                          <span className={`text-[10px] ${filterStyle === style ? "text-amber-100" : "text-gray-400 dark:text-slate-500"}`}>
                            {count >= 1000 ? `${Math.floor(count / 1000)}k` : count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Brewery / country filter */}
            {(activeTab === "all" || activeTab === "breweries") && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Birrifici — filtra per paese
                </p>
                <Input
                  value={filterCountry}
                  onChange={e => setFilterCountry(e.target.value)}
                  placeholder="es. Italia, Germany, Belgium..."
                  className="h-9 text-sm border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                />
                {/* Quick country chips */}
                <div className="flex flex-wrap gap-1.5">
                  {["Italia", "Germany", "Belgium", "USA", "UK", "Czech Republic", "France", "Netherlands"].map(c => (
                    <button
                      key={c}
                      onClick={() => setFilterCountry(filterCountry === c ? "" : c)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${filterCountry === c ? "bg-orange-500 text-white border-orange-500" : "bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-orange-300"}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Popular searches (initial state) */}
        {query.length <= 1 && (
          <div className="space-y-6 py-4">
            <div>
              <p className="text-sm font-semibold text-gray-500 dark:text-slate-400 mb-3 uppercase tracking-wide">Ricerche popolari</p>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map(term => (
                  <button
                    key={term}
                    onClick={() => handleQuickSearch(term)}
                    className="px-4 py-2 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-700 dark:text-slate-200 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all shadow-sm"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>

            {/* Top styles grid */}
            {popularStyles && popularStyles.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-500 dark:text-slate-400 mb-3 uppercase tracking-wide">Top stili nel database</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {popularStyles.slice(0, 9).map(({ style, count }) => (
                    <button
                      key={style}
                      onClick={() => handleQuickSearch(style)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all shadow-sm group text-left"
                    >
                      <span className="text-sm font-medium text-gray-700 dark:text-slate-200 group-hover:text-amber-700 dark:group-hover:text-amber-300 truncate">{style}</span>
                      <span className="text-xs text-gray-400 dark:text-slate-500 ml-1 flex-shrink-0">
                        {count >= 1000 ? `${Math.floor(count / 1000)}k` : count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center py-6 text-gray-400">
              <Search className="h-14 w-14 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-gray-500">Cerca birre, stili, birrifici o pub</p>
              <p className="text-sm mt-1 text-gray-400">Digita almeno 2 caratteri per iniziare</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-2.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        )}

        {/* Results */}
        {!isLoading && results && query.length > 1 && (
          <div className="space-y-4">
            {/* Tab bar */}
            <div className="flex gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
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
                        : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    {count > 0 && (
                      <span className={`text-xs rounded-full px-1.5 py-0.5 min-w-5 text-center ${
                        activeTab === tab.id ? "bg-amber-400 text-white" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300"
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
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {tabCounts.all > 0
                  ? `${tabCounts.all} risultat${tabCounts.all === 1 ? "o" : "i"} per "${query}"`
                  : `Nessun risultato per "${query}"`}
                {hasActiveFilters && <span className="text-amber-600"> · filtri attivi ({activeFilterCount})</span>}
              </p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-amber-600 hover:underline">
                  Rimuovi filtri
                </button>
              )}
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
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md transition-all cursor-pointer group">
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
                              <Badge variant="outline" className="text-xs py-0 px-1.5 h-4 border-gray-200 dark:border-slate-600">{beer.style}</Badge>
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
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md transition-all cursor-pointer group">
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
                          <div className="text-xs text-gray-500 dark:text-slate-400 truncate">
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
                    <Link key={pub.id} href={`/pub/${pub.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group">
                        <div className="w-11 h-11 flex-shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {pub.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-slate-400 truncate">{pub.city} — {pub.address}</div>
                        </div>
                        <Badge className="flex-shrink-0 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">Pub</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Empty state */}
            {tabCounts[activeTab] === 0 && (
              <div className="text-center py-14">
                <Search className="h-12 w-12 mx-auto mb-3 text-gray-200 dark:text-slate-700" />
                <p className="font-semibold text-gray-600 dark:text-slate-300">
                  {hasActiveFilters ? "Nessun risultato con i filtri attivi" : `Nessun risultato per "${query}"`}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {hasActiveFilters ? "Prova a rimuovere qualche filtro" : "Prova con un termine diverso"}
                </p>
                {hasActiveFilters && (
                  <Button onClick={clearFilters} variant="outline" size="sm" className="mt-3 border-amber-300 text-amber-600 hover:bg-amber-50">
                    Rimuovi filtri
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />

      {/* Sticky mobile bottom bar — replaces BottomNavigation on /search */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-slate-700 shadow-lg">
        {/* Filter panel (slides up when open) */}
        {showFilters && (
          <div className="p-3 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 max-h-72 overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wide">Filtri avanzati</span>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-amber-600 font-medium">Cancella ({activeFilterCount})</button>
              )}
            </div>
            {/* Quick filter chips */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFilterGlutenFree(f => !f)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${filterGlutenFree ? "bg-green-500 text-white border-green-500" : "border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300"}`}
              >🌾 Senza glutine</button>
              <button
                onClick={() => setFilterAlcoholFree(f => !f)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${filterAlcoholFree ? "bg-blue-500 text-white border-blue-500" : "border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300"}`}
              >💧 Analcolica</button>
            </div>
            {/* ABV quick presets */}
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-gray-400 self-center">ABV:</span>
              {[["<5%", "", "4.9"], [">7%", "7", ""], [">9%", "9", ""]].map(([label, min, max]) => (
                <button
                  key={label}
                  onClick={() => { setFilterMinAbv(filterMinAbv === min && filterMaxAbv === max ? "" : min); setFilterMaxAbv(filterMinAbv === min && filterMaxAbv === max ? "" : max); }}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${filterMinAbv === min && filterMaxAbv === max ? "bg-orange-500 text-white border-orange-500" : "border-gray-200 dark:border-slate-600 text-gray-500"}`}
                >{label}</button>
              ))}
            </div>
            {/* Style pills */}
            {popularStyles && popularStyles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-gray-400 self-center">Stile:</span>
                {popularStyles.slice(0, 12).map(({ style }) => (
                  <button
                    key={style}
                    onClick={() => setFilterStyle(filterStyle === style ? "" : style)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${filterStyle === style ? "bg-amber-500 text-white border-amber-500" : "border-gray-200 dark:border-slate-600 text-gray-500"}`}
                  >{style}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bottom tab bar */}
        <div className="flex items-center px-2 py-2 gap-1">
          {tabs.map(tab => {
            const count = tabCounts[tab.id];
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setShowFilters(false); }}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
                  isActive
                    ? "bg-amber-500 text-white"
                    : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                }`}
              >
                <div className="relative">
                  <Icon className="h-4.5 w-4.5" style={{width:'1.15rem', height:'1.15rem'}} />
                  {count > 0 && !isActive && (
                    <span className="absolute -top-2 -right-2 text-[9px] font-bold bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-200 rounded-full px-1 min-w-4 text-center">
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium mt-0.5">{tab.label}</span>
              </button>
            );
          })}

          {/* Filters button */}
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl transition-all relative ${
              showFilters || hasActiveFilters
                ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                : "text-gray-500 dark:text-slate-400"
            }`}
          >
            <SlidersHorizontal style={{width:'1.15rem', height:'1.15rem'}} />
            {activeFilterCount > 0 && (
              <span className="absolute top-1 right-2 text-[9px] font-bold bg-amber-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
            <span className="text-[10px] font-medium mt-0.5">Filtri</span>
          </button>
        </div>
      </div>
    </div>
  );
}
