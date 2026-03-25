import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Beer, ArrowLeft, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Footer from "@/components/footer";

export default function ExploreBeers() {
  const params = new URLSearchParams(window.location.search);
  const initialStyle = params.get("style") || "";
  const initialQ = params.get("q") || "";

  const [activeStyle, setActiveStyle] = useState(initialStyle);
  const [freeQuery, setFreeQuery] = useState(initialQ);
  const [inputValue, setInputValue] = useState(initialStyle || initialQ);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const s = p.get("style") || "";
    const q = p.get("q") || "";
    setActiveStyle(s);
    setFreeQuery(q);
    setInputValue(s || q);
  }, [window.location.search]);

  const { data: popularStyles } = useQuery<{ style: string; count: number }[]>({
    queryKey: ["/api/beers/popular-styles"],
    staleTime: 10 * 60 * 1000,
  });

  const { data: styleBeers, isLoading: styleLoading } = useQuery<any[]>({
    queryKey: ["/api/beers/by-style", activeStyle],
    queryFn: () => fetch(`/api/beers/by-style?style=${encodeURIComponent(activeStyle)}`).then(r => r.json()),
    enabled: !!activeStyle,
    staleTime: 2 * 60 * 1000,
  });

  const { data: searchResults, isLoading: searchLoading } = useQuery<{ beers: any[] }>({
    queryKey: ["/api/search", freeQuery],
    queryFn: () => fetch(`/api/search?q=${encodeURIComponent(freeQuery)}`).then(r => r.json()),
    enabled: !activeStyle && freeQuery.length > 1,
    staleTime: 2 * 60 * 1000,
  });

  const beers: any[] = activeStyle ? (styleBeers ?? []) : (searchResults?.beers ?? []);
  const isLoading = activeStyle ? styleLoading : searchLoading;

  function selectStyle(style: string) {
    setActiveStyle(style);
    setFreeQuery("");
    setInputValue(style);
    window.history.pushState(null, "", `/explore/beers?style=${encodeURIComponent(style)}`);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="bg-white dark:bg-[hsl(25,14%,8%)] border-b border-stone-100 dark:border-[hsl(25,12%,14%)] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 hover:bg-stone-50 dark:hover:bg-stone-900/20 -ml-2">
                <ArrowLeft className="w-4 h-4 mr-1" /> Indietro
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0">
              <Beer className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Esplora Birre</h1>
              {activeStyle ? (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Stile: <span className="font-semibold text-primary">{activeStyle}</span>
                  {Array.isArray(styleBeers) && (
                    <span className="ml-2 text-muted-foreground">· {styleBeers.length} birre</span>
                  )}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Seleziona uno stile o cerca una birra</p>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && inputValue.trim()) runSearch(inputValue.trim()); }}
                placeholder="Cerca per nome, birrificio…"
                className="pl-9 pr-9 rounded-xl border-stone-200 dark:border-stone-700/30 focus-visible:ring-primary/30"
              />
              {inputValue && (
                <button onClick={clearAll} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button
              onClick={() => { if (inputValue.trim()) runSearch(inputValue.trim()); }}
              className="rounded-xl px-5"
            >
              Cerca
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Style pills */}
        {Array.isArray(popularStyles) && popularStyles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {popularStyles.slice(0, 24).map(s => (
              <button
                key={s.style}
                onClick={() => selectStyle(s.style)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  activeStyle === s.style
                    ? "bg-primary text-white border-primary shadow-sm scale-105"
                    : "bg-stone-50 dark:bg-stone-900/20 text-orange-700 dark:text-orange-300 border-stone-200 dark:border-stone-700/30 hover:border-primary/40 hover:text-primary dark:hover:text-orange-200"
                }`}
              >
                {s.style}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeStyle === s.style
                    ? "bg-white/25 text-white"
                    : "bg-white dark:bg-stone-900/40 text-primary dark:text-orange-400"
                }`}>
                  {s.count.toLocaleString("it-IT")}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-28 bg-stone-50 dark:bg-[hsl(25,14%,12%)] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : beers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {beers.map((beer: any) => (
              <Link key={beer.id} href={`/beer/${beer.id}`}>
                <div className="group bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-100 dark:border-[hsl(25,12%,16%)] rounded-2xl p-4 hover:shadow-md hover:border-primary/20 dark:hover:border-primary/30 transition-all cursor-pointer h-full">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl flex-shrink-0 bg-stone-50 dark:bg-stone-900/20 flex items-center justify-center overflow-hidden">
                      {beer.imageUrl ? (
                        <img src={beer.imageUrl} alt={beer.name} className="w-12 h-12 object-contain p-0.5 lightbox-img" />
                      ) : beer.breweryLogoUrl ? (
                        <img src={beer.breweryLogoUrl} alt={beer.breweryName} className="w-10 h-10 object-contain" />
                      ) : (
                        <Beer className="w-6 h-6 text-primary/60" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {beer.name}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {beer.breweryName || beer.brewery?.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {beer.style && !activeStyle && (
                          <span className="text-[10px] font-semibold text-orange-700 dark:text-orange-300 bg-stone-50 dark:bg-stone-900/30 px-2 py-0.5 rounded-full">{beer.style}</span>
                        )}
                        {beer.abv != null && (
                          <span className="text-[10px] font-medium text-muted-foreground">{beer.abv}% ABV</span>
                        )}
                        {beer.ibu != null && (
                          <span className="text-[10px] font-medium text-muted-foreground">{beer.ibu} IBU</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (activeStyle || freeQuery) ? (
          <div className="text-center py-16 text-muted-foreground">
            <Beer className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Nessuna birra trovata</p>
            <p className="text-sm mt-1">Prova con un altro termine o stile</p>
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Beer className="w-14 h-14 mx-auto mb-3 opacity-20" />
            <p className="text-lg font-medium">Seleziona uno stile o cerca una birra</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
