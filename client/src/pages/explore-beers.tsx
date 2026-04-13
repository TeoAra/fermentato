import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Beer, ArrowLeft, Search, X, ChevronRight } from "lucide-react";
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
    <div className="min-h-screen bg-background slide-up">
      <Helmet>
        <title>Catalogo Birre Artigianali | Fermenta.to</title>
        <meta name="description" content="Sfoglia migliaia di birre artigianali italiane e internazionali. Filtra per stile (IPA, Stout, Weizen, Lager…), cerca per nome o birrificio e scopri le tue preferite su Fermenta.to." />
        <meta property="og:title" content="Catalogo Birre Artigianali | Fermenta.to" />
        <meta property="og:description" content="Sfoglia migliaia di birre artigianali italiane. Filtra per stile, cerca per nome o birrificio e scopri le tue preferite." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fermenta.to/explore/beers" />
        <meta property="og:site_name" content="Fermenta.to" />
        <meta name="twitter:card" content="summary" />
        <link rel="canonical" href="https://fermenta.to/explore/beers" />
        <script type="application/ld+json">{JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://fermenta.to/" },
              { "@type": "ListItem", "position": 2, "name": "Catalogo Birre", "item": "https://fermenta.to/explore/beers" },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "@id": "https://fermenta.to/explore/beers",
            "name": "Catalogo Birre Artigianali",
            "description": "Il più completo catalogo di birre artigianali italiane e internazionali. Cerca per stile, birrificio o nome.",
            "url": "https://fermenta.to/explore/beers",
            "publisher": { "@id": "https://fermenta.to/#organization" },
            ...(Array.isArray(styleBeers) && styleBeers.length > 0 ? {
              "hasPart": styleBeers.slice(0, 10).map((b: any) => ({
                "@type": "Product",
                "name": b.name,
                "url": `https://fermenta.to/beer/${b.id}`,
                ...(b.style ? { "category": b.style } : {}),
                ...(b.imageUrl ? { "image": b.imageUrl } : {}),
              }))
            } : {}),
          }
        ])}</script>
      </Helmet>
      {/* Page header */}
      <div className="bg-white dark:bg-[hsl(25,14%,8%)] border-b border-stone-100 dark:border-[hsl(25,12%,14%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/">
              <button className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-stone-900 dark:text-white">Esplora Birre</h1>
              <p className="text-xs text-stone-400 dark:text-stone-500">
                {activeStyle ? `Stile: ${activeStyle}${Array.isArray(styleBeers) ? ` · ${styleBeers.length} birre` : ''}` : 'Seleziona uno stile o cerca'}
              </p>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-24">
        {/* Style pills */}
        {Array.isArray(popularStyles) && popularStyles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {popularStyles.slice(0, 24).map(s => (
              <button
                key={s.style}
                onClick={() => selectStyle(s.style)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  activeStyle === s.style
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white dark:bg-stone-900/20 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700/30 hover:border-primary/40 hover:text-primary"
                }`}
              >
                {s.style}
                <span className={`text-[10px] font-bold ${
                  activeStyle === s.style ? "opacity-75" : "text-stone-400"
                }`}>
                  {s.count.toLocaleString("it-IT")}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="bg-white dark:bg-card rounded-2xl overflow-hidden border border-stone-100/70 dark:border-stone-700/20 shadow-sm">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse bg-stone-50 dark:bg-stone-800/30 mx-4 my-2 rounded-xl" />
            ))}
          </div>
        ) : beers.length > 0 ? (
          <div className="bg-white dark:bg-card rounded-2xl overflow-hidden border border-stone-100/70 dark:border-stone-700/20 shadow-sm">
            {beers.map((beer: any, idx: number) => (
              <div key={beer.id}>
                <Link href={`/beer/${beer.id}`}>
                  <div className="flex items-center gap-3.5 px-4 py-3.5 active:bg-stone-50 dark:active:bg-stone-800/30 cursor-pointer transition-colors group">
                    <div className="w-11 h-11 rounded-xl flex-shrink-0 bg-stone-100 dark:bg-stone-800 flex items-center justify-center overflow-hidden">
                      {beer.imageUrl ? (
                        <img src={beer.imageUrl} alt={beer.name} className="w-full h-full object-cover" />
                      ) : beer.breweryLogoUrl ? (
                        <img src={beer.breweryLogoUrl} alt={beer.breweryName} className="w-full h-full object-cover" />
                      ) : (
                        <Beer className="w-5 h-5 text-stone-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[15px] text-stone-900 dark:text-white leading-snug truncate group-hover:text-primary transition-colors">
                        {beer.name}
                      </p>
                      <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5 truncate">
                        {[
                          beer.breweryName || beer.brewery?.name,
                          beer.style && !activeStyle ? beer.style : null,
                          beer.abv != null ? `${beer.abv}%` : null,
                          beer.ibu != null ? `${beer.ibu} IBU` : null,
                        ].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-stone-300 dark:text-stone-600 flex-shrink-0" />
                  </div>
                </Link>
                {idx < beers.length - 1 && (
                  <div className="h-px bg-stone-100 dark:bg-stone-800/60 ml-[3.875rem] mr-4" />
                )}
              </div>
            ))}
          </div>
        ) : (activeStyle || freeQuery) ? (
          <div className="text-center py-16 text-stone-400">
            <Beer className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-base font-semibold text-stone-600 dark:text-stone-400">Nessuna birra trovata</p>
            <p className="text-sm mt-1">Prova con un altro termine o stile</p>
          </div>
        ) : (
          <div className="text-center py-16 text-stone-400">
            <Beer className="w-14 h-14 mx-auto mb-3 opacity-20" />
            <p className="text-base font-semibold text-stone-600 dark:text-stone-400">Seleziona uno stile o cerca una birra</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
