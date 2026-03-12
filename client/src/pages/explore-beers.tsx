import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Beer, ArrowLeft, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Footer from "@/components/footer";

export default function ExploreBeers() {
  const [location] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const initialStyle = params.get("style") || "";

  const [searchQuery, setSearchQuery] = useState(initialStyle || "birra artigianale");
  const [activeStyle, setActiveStyle] = useState(initialStyle);
  const [inputValue, setInputValue] = useState(initialStyle);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const s = p.get("style") || "";
    if (s) {
      setActiveStyle(s);
      setSearchQuery(s);
      setInputValue(s);
    }
  }, [location]);

  const { data: popularStyles } = useQuery<{ style: string; count: number }[]>({
    queryKey: ["/api/beers/popular-styles"],
    staleTime: 10 * 60 * 1000,
  });

  const { data: results, isLoading } = useQuery<{ beers: any[] }>({
    queryKey: ["/api/search", searchQuery],
    queryFn: () => fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`).then(r => r.json()),
    enabled: searchQuery.length > 1,
    staleTime: 2 * 60 * 1000,
  });

  const beers: any[] = results?.beers ?? [];

  function applyStyle(style: string) {
    setActiveStyle(style);
    setSearchQuery(style);
    setInputValue(style);
    window.history.replaceState(null, "", `/explore/beers?style=${encodeURIComponent(style)}`);
  }

  function applySearch(q: string) {
    setActiveStyle("");
    setSearchQuery(q);
    window.history.replaceState(null, "", `/explore/beers?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
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
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                Stile: <span className="font-semibold text-amber-600 dark:text-amber-400">{activeStyle}</span>
              </p>
            )}
          </div>
        </div>

        {/* Search bar */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && inputValue.trim()) applySearch(inputValue.trim()); }}
              placeholder="Cerca per nome, stile, birrificio…"
              className="pl-9"
            />
            {inputValue && (
              <button onClick={() => { setInputValue(""); setActiveStyle(""); setSearchQuery("birra artigianale"); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button onClick={() => { if (inputValue.trim()) applySearch(inputValue.trim()); }} className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold">
            Cerca
          </Button>
        </div>

        {/* Style pills */}
        {Array.isArray(popularStyles) && popularStyles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {popularStyles.slice(0, 20).map(s => (
              <button
                key={s.style}
                onClick={() => applyStyle(s.style)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  activeStyle === s.style
                    ? "bg-amber-500 text-gray-900 border-amber-500 shadow-md"
                    : "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-600 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400"
                }`}
              >
                {s.style}
                <span className={`text-[10px] font-bold px-1 py-0.5 rounded-full ${activeStyle === s.style ? "bg-white/30 text-gray-900" : "bg-amber-50 dark:bg-amber-900/20 text-amber-500"}`}>
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
              <div key={i} className="h-36 bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : beers.length > 0 ? (
          <>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">{beers.length} birre trovate</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {beers.map((beer: any) => (
                <Link key={beer.id} href={`/beer/${beer.id}`}>
                  <div className="group bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 hover:shadow-md hover:border-amber-200 dark:hover:border-amber-800 transition-all cursor-pointer h-full">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                        {beer.imageUrl ? (
                          <img src={beer.imageUrl} alt={beer.name} className="w-12 h-12 object-contain p-0.5" />
                        ) : (
                          <Beer className="w-6 h-6 text-amber-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400">{beer.name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-1 mt-0.5">{beer.brewery?.name || beer.breweryName}</p>
                        {beer.style && (
                          <span className="inline-block mt-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">{beer.style}</span>
                        )}
                        {beer.abv != null && (
                          <span className="ml-1 text-[10px] font-medium text-gray-500 dark:text-slate-400">{beer.abv}% ABV</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : searchQuery.length > 1 ? (
          <div className="text-center py-16 text-gray-400 dark:text-slate-500">
            <Beer className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Nessuna birra trovata</p>
            <p className="text-sm mt-1">Prova con un altro termine o stile</p>
          </div>
        ) : null}
      </div>
      <Footer />
    </div>
  );
}
