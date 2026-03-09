import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Link } from "wouter";
import { Beer, Building2, MapPin, Search, ArrowLeft, SlidersHorizontal, X, ChevronDown } from "lucide-react";
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

const POPULAR_SEARCHES = ["IPA", "Lager", "Stout", "Weizen", "Pilsner", "Sour", "Porter", "Saison"];

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

  useEffect(() => {
    setInputValue(initialQ);
    setQuery(initialQ);
  }, [initialQ]);

  const apiUrl = useMemo(() => {
    const p = new URLSearchParams({ q: query });
    if (filterGlutenFree) p.set("glutenFree", "true");
    if (filterAlcoholFree) p.set("alcoholFree", "true");
    return `/api/search?${p}`;
  }, [query, filterGlutenFree, filterAlcoholFree]);

  const { data: results, isLoading } = useQuery<SearchResult>({
    queryKey: ["/api/search", query, filterGlutenFree, filterAlcoholFree],
    queryFn: () => fetch(apiUrl).then(r => r.json()),
    enabled: query.length > 1,
  });

  const filteredBeers = useMemo(() => {
    if (!results?.beers) return [];
    return results.beers.filter(b => {
      if (filterStyle && b.style && !b.style.toLowerCase().includes(filterStyle.toLowerCase())) return false;
      if (filterGlutenFree && !b.isGlutenFree) return false;
      if (filterAlcoholFree && !b.isAlcoholFree) return false;
      return true;
    });
  }, [results?.beers, filterStyle, filterGlutenFree, filterAlcoholFree]);

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

  const availableStyles = useMemo(() => {
    if (!results?.beers) return [];
    const styles = [...new Set(results.beers.map(b => b.style).filter(Boolean))] as string[];
    return styles.sort();
  }, [results?.beers]);

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

  const hasActiveFilters = filterGlutenFree || filterAlcoholFree || filterStyle || filterCountry;

  const clearFilters = () => {
    setFilterGlutenFree(false);
    setFilterAlcoholFree(false);
    setFilterStyle("");
    setFilterCountry("");
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "all", label: "Tutto", icon: Search },
    { id: "beers", label: "Birre", icon: Beer },
    { id: "breweries", label: "Birrifici", icon: Building2 },
    { id: "pubs", label: "Pub", icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-amber-50/30 to-orange-50/30 dark:from-gray-950 dark:via-slate-900 dark:to-slate-900">
      <div className="max-w-3xl mx-auto px-4 py-5">

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
                placeholder="Cerca birre, birrifici, stili, pub..."
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
            {query.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={`h-11 w-11 rounded-xl flex-shrink-0 border-gray-200 dark:border-slate-700 ${hasActiveFilters ? "border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-900/20" : ""}`}
                onClick={() => setShowFilters(f => !f)}
                title="Filtri avanzati"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {hasActiveFilters && <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />}
              </Button>
            )}
          </form>
        </div>

        {/* Advanced filters panel */}
        {showFilters && query.length > 1 && (
          <div className="mb-4 p-4 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">Filtri avanzati</span>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-amber-600 hover:text-amber-700 font-medium">
                  Cancella tutti
                </button>
              )}
            </div>

            {/* Beer filters */}
            {(activeTab === "all" || activeTab === "beers") && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <Beer className="w-3 h-3" /> Per le birre
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
                    💧 Analcolica
                  </button>
                </div>
                {availableStyles.length > 0 && (
                  <div className="relative">
                    <select
                      value={filterStyle}
                      onChange={e => setFilterStyle(e.target.value)}
                      className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 appearance-none pr-8"
                    >
                      <option value="">Tutti gli stili</option>
                      {availableStyles.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                )}
              </div>
            )}

            {/* Brewery filters */}
            {(activeTab === "all" || activeTab === "breweries") && results?.breweries && results.breweries.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Per i birrifici
                </p>
                <Input
                  value={filterCountry}
                  onChange={e => setFilterCountry(e.target.value)}
                  placeholder="Filtra per paese (es. Italia, Germany...)"
                  className="h-9 text-sm border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                />
              </div>
            )}
          </div>
        )}

        {/* Popular searches (initial state) */}
        {query.length <= 1 && (
          <div className="space-y-8 py-4">
            <div>
              <p className="text-sm font-semibold text-gray-500 dark:text-slate-400 mb-3 uppercase tracking-wide">Ricerche popolari</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map(term => (
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
            <div className="text-center py-8 text-gray-400">
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
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {tabCounts.all > 0
                ? `${tabCounts.all} risultat${tabCounts.all === 1 ? "o" : "i"} per "${query}"`
                : `Nessun risultato per "${query}"`}
              {hasActiveFilters && " (con filtri attivi)"}
            </p>

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
    </div>
  );
}
