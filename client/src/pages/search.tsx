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
    <div className="min-h-screen bg-background">

      {/* Header section */}
      <div className="bg-white dark:bg-card border-b border-stone-100 dark:border-border sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 pt-4 pb-5">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary hover:bg-stone-50/60 rounded-full -ml-1">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Indietro
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-foreground font-bold text-lg leading-tight">Ricerca Avanzata</h1>
              <p className="text-muted-foreground text-xs">Birre · Birrifici · Pub</p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              <Input
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="Cerca birre, stili, birrifici, pub..."
                className="pl-12 pr-10 h-11 rounded-2xl border-stone-200 dark:border-border bg-white dark:bg-[#1B2735] focus-visible:ring-primary/20 text-base"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => { setInputValue(""); setQuery(""); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-white h-11 rounded-xl px-4">
              Cerca
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={`relative h-11 w-11 rounded-xl flex-shrink-0 border-stone-200 dark:border-border text-primary hover:bg-stone-50 ${hasActiveFilters ? "bg-primary/10 border-primary/30" : ""}`}
              onClick={() => setShowFilters(f => !f)}
              title="Filtri avanzati"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
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
          <div className="mb-4 p-4 rounded-2xl bg-white dark:bg-card border border-stone-100 dark:border-border shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                Filtri
              </span>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-primary dark:text-orange-400 hover:underline font-medium flex items-center gap-1">
                  <X className="w-3 h-3" /> Cancella ({activeFilterCount})
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setFilterGlutenFree(f => !f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterGlutenFree ? "bg-green-500 text-white border-green-500" : "border-stone-200 dark:border-border text-muted-foreground hover:border-green-400"}`}>
                🌾 Senza glutine
              </button>
              <button onClick={() => setFilterAlcoholFree(f => !f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterAlcoholFree ? "bg-blue-500 text-white border-blue-500" : "border-stone-200 dark:border-border text-muted-foreground hover:border-blue-400"}`}>
                💧 Analcolica
              </button>

              <span className="self-center text-xs text-muted-foreground/40 px-1">|</span>
              {([["🍺 Light <5%", "", "4.9"], ["⚡ Strong >7%", "7", ""], ["💥 Imperial >9%", "9", ""]] as [string,string,string][]).map(([label, min, max]) => (
                <button key={label}
                  onClick={() => { setFilterMinAbv(filterMinAbv === min && filterMaxAbv === max ? "" : min); setFilterMaxAbv(filterMinAbv === min && filterMaxAbv === max ? "" : max); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterMinAbv === min && filterMaxAbv === max ? "bg-primary text-white border-primary" : "border-stone-200 dark:border-border text-muted-foreground hover:border-primary/40"}`}>
                  {label}
                </button>
              ))}

              <span className="self-center text-xs text-muted-foreground/40 px-1">|</span>
              {([["😌 Dolce", "", "19"], ["⚖️ Bilanciata", "20", "50"], ["🌿 Amara", "60", ""]] as [string,string,string][]).map(([label, min, max]) => (
                <button key={label}
                  onClick={() => { setFilterMinIbu(filterMinIbu === min && filterMaxIbu === max ? "" : min); setFilterMaxIbu(filterMinIbu === min && filterMaxIbu === max ? "" : max); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterMinIbu === min && filterMaxIbu === max ? "bg-green-600 text-white border-green-600" : "border-stone-200 dark:border-border text-muted-foreground hover:border-green-400"}`}>
                  {label}
                </button>
              ))}
            </div>

            {popularStyles && popularStyles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-stone-100 dark:border-border">
                <span className="self-center text-xs text-muted-foreground mr-1">Stile:</span>
                {filterStyle && (
                  <button onClick={() => setFilterStyle("")}
                    className="px-2.5 py-1 rounded-full text-xs font-medium border bg-primary text-white border-primary flex items-center gap-1">
                    {filterStyle} <X className="w-3 h-3" />
                  </button>
                )}
                {popularStyles.slice(0, 12).filter(({ style }) => style !== filterStyle).map(({ style }) => (
                  <button key={style}
                    onClick={() => setFilterStyle(style)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium border border-stone-200 dark:border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all bg-white dark:bg-[#1B2735]">
                    {style}
                  </button>
                ))}
              </div>
            )}

            {(activeTab === "all" || activeTab === "breweries") && (
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-stone-100 dark:border-border">
                <span className="self-center text-xs text-muted-foreground mr-1">Paese:</span>
                {["Italia", "Germany", "Belgium", "USA", "UK", "France"].map(c => (
                  <button key={c}
                    onClick={() => setFilterCountry(filterCountry === c ? "" : c)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${filterCountry === c ? "bg-primary text-white border-primary" : "border-stone-200 dark:border-border text-muted-foreground hover:border-primary/40"}`}>
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
                  <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-primary" />
                    Ricerche recenti
                  </span>
                  <button
                    onClick={() => { setRecentSearches([]); localStorage.removeItem('fermentato_recent_searches'); }}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Cancella tutto
                  </button>
                </div>
                <div className="space-y-1.5">
                  {recentSearches.map(s => (
                    <div key={s} className="flex items-center gap-2 p-3 rounded-2xl bg-white dark:bg-card border border-stone-100 dark:border-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all group">
                      <Clock className="w-4 h-4 text-primary opacity-40 flex-shrink-0" />
                      <button
                        className="flex-1 text-left text-sm text-foreground hover:text-primary transition-colors"
                        onClick={() => { setInputValue(s); setQuery(s); addRecentSearch(s); window.history.replaceState(null, "", `/search?q=${encodeURIComponent(s)}`); }}
                      >
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
                <div className="w-20 h-20 rounded-full bg-stone-50 dark:bg-[#15202B]/20 flex items-center justify-center mb-5">
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
            {/* Tab bar */}
            <div className="flex gap-1 p-1 bg-white dark:bg-card rounded-2xl border border-stone-100 dark:border-border shadow-sm overflow-x-auto scrollbar-hide">
              {tabs.map(tab => {
                const count = tabCounts[tab.id];
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-4 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-primary text-white"
                        : "text-muted-foreground hover:text-primary hover:bg-stone-50/60"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span className={`text-[10px] rounded-full px-1.5 py-0.5 min-w-5 text-center font-bold ${
                        isActive ? "bg-white/20 text-white" : "bg-stone-50 dark:bg-[#15202B]/20 text-primary dark:text-orange-400"
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
              <p className="text-xs text-muted-foreground">
                {tabCounts.all > 0
                  ? `${tabCounts.all} risultat${tabCounts.all === 1 ? "o" : "i"} per "${query}"`
                  : `Nessun risultato per "${query}"`}
                {hasActiveFilters && <span className="text-primary dark:text-orange-400"> · filtri attivi ({activeFilterCount})</span>}
              </p>
              <div className="flex items-center gap-3">
                {query && (
                  <button
                    onClick={() => setAdditionModalOpen(true)}
                    className="flex items-center gap-1.5 text-xs text-primary dark:text-orange-400 font-medium px-3 py-1.5 border border-stone-200 hover:bg-stone-50 rounded-xl transition-colors"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Suggerisci
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
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-card border border-stone-100 dark:border-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group">
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
                        <Badge className="flex-shrink-0 text-[10px] bg-stone-50 dark:bg-[#15202B]/20 text-primary dark:text-orange-400 border-0 font-bold uppercase tracking-wider">Birra</Badge>
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
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-card border border-stone-100 dark:border-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group">
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
                        <Badge className="flex-shrink-0 text-[10px] bg-stone-50 dark:bg-[#15202B]/20 text-primary dark:text-orange-400 border-0 font-bold uppercase tracking-wider">Birrificio</Badge>
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
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-card border border-stone-100 dark:border-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group">
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
                          <div className="text-xs text-muted-foreground truncate">
                            {pub.city}{pub.address ? ` · ${pub.address}` : ""}
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
                <div className="w-16 h-16 rounded-full bg-stone-50 dark:bg-[#15202B]/20 flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-primary/30" />
                </div>
                <p className="font-bold text-foreground">Nessun risultato per "{query}"</p>
                <p className="text-sm text-muted-foreground mt-1">Prova con termini diversi o rimuovi i filtri</p>
                <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-xl border-stone-200 text-primary">
                      <X className="w-3.5 h-3.5 mr-1.5" />
                      Rimuovi filtri
                    </Button>
                  )}
                  <button
                    onClick={() => setAdditionModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1B2735] border border-stone-200 text-primary rounded-xl text-sm font-bold hover:bg-stone-50 transition-colors"
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
