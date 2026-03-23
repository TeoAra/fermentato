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

  // Exact style match via dedicated endpoint
  const { data: styleBeers, isLoading: styleLoading } = useQuery<any[]>({
    queryKey: ["/api/beers/by-style", activeStyle],
    queryFn: () => fetch(`/api/beers/by-style?style=${encodeURIComponent(activeStyle)}`).then(r => r.json()),
    enabled: !!activeStyle,
    staleTime: 2 * 60 * 1000,
  });

  // Free-text search
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
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
              <ArrowLeft className="w-4 h-4 mr-1" /> Indietro
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg">
                <Beer className="h-5 w-5 text-white" />
              </div>
              Esplora Birre
            </h1>
            {activeStyle && (
              <p className="text-sm text-gray-500 dark:text-neutral-400 mt-0.5">
                Stile: <span className="font-semibold text-amber-600 dark:text-amber-400">{activeStyle}</span>
                {Array.isArray(styleBeers) && (
                  <span className="ml-2 text-gray-400">· {styleBeers.length} birre</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Search bar */}
        <div className="flex gap-2 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && inputValue.trim()) runSearch(inputValue.trim()); }}
              placeholder="Cerca per nome, birrificio…"
              className="pl-9 pr-9"
            />
            {inputValue && (
              <button onClick={clearAll} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button
            onClick={() => { if (inputValue.trim()) runSearch(inputValue.trim()); }}
            className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold"
          >
            Cerca
          </Button>
        </div>

        {/* Style pills */}
        {Array.isArray(popularStyles) && popularStyles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {popularStyles.slice(0, 24).map(s => (
              <button
                key={s.style}
                onClick={() => selectStyle(s.style)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  activeStyle === s.style
                    ? "bg-amber-500 text-gray-900 border-amber-500 shadow-md scale-105"
                    : "bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-neutral-600 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400"
                }`}
              >
                {s.style}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeStyle === s.style
                    ? "bg-white/30 text-gray-900"
                    : "bg-amber-50 dark:bg-amber-900/20 text-amber-500"
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
              <div key={i} className="h-28 bg-gray-100 dark:bg-neutral-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : beers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {beers.map((beer: any) => (
              <Link key={beer.id} href={`/beer/${beer.id}`}>
                <div className="group bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-2xl p-4 hover:shadow-md hover:border-amber-200 dark:hover:border-amber-800 transition-all cursor-pointer h-full">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl flex-shrink-0 bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center overflow-hidden">
                      {beer.imageUrl ? (
                        <img src={beer.imageUrl} alt={beer.name} className="w-12 h-12 object-contain p-0.5" />
                      ) : beer.breweryLogoUrl ? (
                        <img src={beer.breweryLogoUrl} alt={beer.breweryName} className="w-10 h-10 object-contain" />
                      ) : (
                        <Beer className="w-6 h-6 text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                        {beer.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                        {beer.breweryName || beer.brewery?.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {beer.style && !activeStyle && (
                          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">{beer.style}</span>
                        )}
                        {beer.abv != null && (
                          <span className="text-[10px] font-medium text-gray-400 dark:text-neutral-500">{beer.abv}% ABV</span>
                        )}
                        {beer.ibu != null && (
                          <span className="text-[10px] font-medium text-gray-400 dark:text-neutral-500">{beer.ibu} IBU</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (activeStyle || freeQuery) ? (
          <div className="text-center py-16 text-gray-400 dark:text-neutral-500">
            <Beer className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Nessuna birra trovata</p>
            <p className="text-sm mt-1">Prova con un altro termine o stile</p>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400 dark:text-neutral-500">
            <Beer className="w-14 h-14 mx-auto mb-3 opacity-20" />
            <p className="text-lg font-medium">Seleziona uno stile o cerca una birra</p>
          </div>
        )}

      </div>
      <Footer />
    </div>
  );
}
