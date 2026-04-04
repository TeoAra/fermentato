import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { MapPin, Beer, ArrowLeft, Heart, Search, Globe, X, ChevronLeft, ChevronRight, TrendingUp, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const countryNameMap: Record<string, string> = {
  "Italy": "Italia", "Italia": "Italia",
  "Germany": "Germania", "Deutschland": "Germania",
  "United States": "Stati Uniti", "USA": "Stati Uniti", "US": "Stati Uniti",
  "Belgium": "Belgio", "Belgique": "Belgio", "België": "Belgio",
  "United Kingdom": "Regno Unito", "UK": "Regno Unito",
  "England": "Inghilterra",
  "Scotland": "Scozia",
  "Wales": "Galles",
  "Northern Ireland": "Irlanda del Nord",
  "France": "Francia",
  "Spain": "Spagna", "España": "Spagna",
  "Netherlands": "Paesi Bassi", "Holland": "Paesi Bassi",
  "Czech Republic": "Rep. Ceca", "Czechia": "Rep. Ceca",
  "Canada": "Canada",
  "Australia": "Australia",
  "Japan": "Giappone",
  "Mexico": "Messico", "México": "Messico",
  "Brazil": "Brasile", "Brasil": "Brasile",
  "Denmark": "Danimarca", "Danmark": "Danimarca",
  "Sweden": "Svezia", "Sverige": "Svezia",
  "Norway": "Norvegia", "Norge": "Norvegia",
  "Finland": "Finlandia", "Suomi": "Finlandia",
  "Austria": "Austria", "Österreich": "Austria",
  "Switzerland": "Svizzera", "Schweiz": "Svizzera", "Suisse": "Svizzera",
  "Ireland": "Irlanda",
  "Poland": "Polonia", "Polska": "Polonia",
  "Portugal": "Portogallo",
  "New Zealand": "Nuova Zelanda",
  "Israel": "Israele",
  "India": "India",
  "Russia": "Russia",
  "China": "Cina",
  "South Korea": "Corea del Sud",
  "Argentina": "Argentina",
  "South Africa": "Sudafrica",
  "Ukraine": "Ucraina",
  "Hungary": "Ungheria",
  "Colombia": "Colombia",
  "Chile": "Cile",
  "Slovakia": "Slovacchia",
  "Slovenia": "Slovenia",
  "Thailand": "Thailandia",
  "Croatia": "Croazia",
  "Greece": "Grecia",
  "Vietnam": "Vietnam",
  "Estonia": "Estonia",
  "Romania": "Romania",
  "Peru": "Perù",
  "Latvia": "Lettonia",
  "Serbia": "Serbia",
  "Lithuania": "Lituania",
  "Belarus": "Bielorussia",
  "Costa Rica": "Costa Rica",
  "Bulgaria": "Bulgaria",
  "Philippines": "Filippine",
  "Ecuador": "Ecuador",
  "Taiwan": "Taiwan",
  "Hong Kong": "Hong Kong",
  "Singapore": "Singapore",
  "Uruguay": "Uruguay",
};

const countryFlags: Record<string, string> = {
  "United States": "🇺🇸", "USA": "🇺🇸", "US": "🇺🇸",
  "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Germany": "🇩🇪", "Deutschland": "🇩🇪",
  "France": "🇫🇷", "Canada": "🇨🇦", "Italy": "🇮🇹", "Italia": "🇮🇹",
  "Spain": "🇪🇸", "España": "🇪🇸", "Japan": "🇯🇵",
  "Netherlands": "🇳🇱", "Holland": "🇳🇱", "Belgium": "🇧🇪", "Belgique": "🇧🇪",
  "Australia": "🇦🇺", "Brazil": "🇧🇷", "Brasil": "🇧🇷",
  "Czech Republic": "🇨🇿", "Czechia": "🇨🇿",
  "Switzerland": "🇨🇭", "Schweiz": "🇨🇭",
  "Sweden": "🇸🇪", "Sverige": "🇸🇪",
  "Norway": "🇳🇴", "Norge": "🇳🇴",
  "Denmark": "🇩🇰", "Danmark": "🇩🇰",
  "Finland": "🇫🇮", "Suomi": "🇫🇮",
  "Austria": "🇦🇹", "Österreich": "🇦🇹",
  "Ireland": "🇮🇪", "Poland": "🇵🇱", "Polska": "🇵🇱",
  "Portugal": "🇵🇹", "New Zealand": "🇳🇿",
  "United Kingdom": "🇬🇧", "UK": "🇬🇧",
  "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "Wales": "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  "Israel": "🇮🇱", "India": "🇮🇳", "Russia": "🇷🇺", "China": "🇨🇳",
  "South Korea": "🇰🇷", "Argentina": "🇦🇷", "South Africa": "🇿🇦",
  "Ukraine": "🇺🇦", "Hungary": "🇭🇺", "Colombia": "🇨🇴", "Chile": "🇨🇱",
  "Slovakia": "🇸🇰", "Slovenia": "🇸🇮", "Thailand": "🇹🇭",
  "Croatia": "🇭🇷", "Greece": "🇬🇷", "Vietnam": "🇻🇳",
  "Estonia": "🇪🇪", "Romania": "🇷🇴", "Peru": "🇵🇪",
  "Latvia": "🇱🇻", "Serbia": "🇷🇸", "Lithuania": "🇱🇹",
  "Belarus": "🇧🇾", "Costa Rica": "🇨🇷", "Bulgaria": "🇧🇬",
  "Philippines": "🇵🇭", "Ecuador": "🇪🇨", "Taiwan": "🇹🇼",
  "Mexico": "🇲🇽", "México": "🇲🇽",
};

function getFlag(country: string): string {
  return countryFlags[country] || "🌍";
}

function getItalianName(country: string): string {
  return countryNameMap[country] ?? country;
}

const BREWERY_FALLBACK = "/brewery-cover.jpg";

function BreweryCard({ brewery }: { brewery: any }) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imgError, setImgError] = useState(false);

  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  const isFav = Array.isArray(favorites) && favorites.some(
    (f: any) => f.itemType === "brewery" && f.itemId === brewery.id
  );

  const favMut = useMutation({
    mutationFn: ({ action }: { action: "add" | "remove" }) =>
      action === "add"
        ? apiRequest("/api/favorites", { method: "POST" }, { itemType: "brewery", itemId: brewery.id })
        : apiRequest(`/api/favorites/brewery/${brewery.id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({ title: isFav ? "Rimosso dai preferiti" : "Aggiunto ai preferiti" });
    },
  });

  const flag = getFlag(brewery.country || "");
  const italianCountry = getItalianName(brewery.country || "");
  const isItalian = brewery.country === "Italy" || brewery.country === "Italia";

  return (
    <Link href={`/brewery/${brewery.id}`}>
      <div className="group relative rounded-2xl overflow-hidden cursor-pointer bg-white dark:bg-neutral-800 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-100 dark:border-neutral-700">
        <div className="relative h-40 overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-900/20">
          <img
            src={imgError || !brewery.logoUrl ? BREWERY_FALLBACK : brewery.logoUrl}
            alt={brewery.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-white font-bold text-sm leading-tight line-clamp-2 drop-shadow">{brewery.name}</p>
          </div>
          {isAuthenticated && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); favMut.mutate({ action: isFav ? "remove" : "add" }); }}
              className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow ${isFav ? "bg-red-500 text-white" : "bg-white/80 text-muted-foreground hover:bg-red-50 hover:text-red-500"}`}
            >
              <Heart className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
            </button>
          )}
        </div>

        <div className="p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground dark:text-neutral-400 mb-1.5">
            <span className="text-base leading-none">{flag}</span>
            <span className="truncate">{italianCountry}</span>
            {!isItalian && brewery.location && brewery.location !== brewery.country && (
              <>
                <span className="text-gray-300 dark:text-neutral-600">·</span>
                <span className="truncate">{brewery.location}</span>
              </>
            )}
            {isItalian && brewery.location && (
              <>
                <span className="text-gray-300 dark:text-neutral-600">·</span>
                <span className="truncate text-orange-600 dark:text-orange-400 font-medium">{brewery.location}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Beer className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="text-xs font-semibold text-primary dark:text-orange-400">
              {Number(brewery.beerCount || 0).toLocaleString("it-IT")} birre
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

const PAGE_SIZE = 48;

// Nazioni "internazionali" = tutte eccetto Italy/Italia
const INTL_EXCLUDE = ["Italy", "Italia"];

type QuickFilter = "all" | "italy" | "international" | "top";

export default function ExploreBreweries() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: countries = [] } = useQuery<{ country: string; count: number }[]>({
    queryKey: ["/api/breweries/countries"],
    staleTime: 10 * 60 * 1000,
  });

  // Build API params considering quick filters
  const apiCountry = useMemo(() => {
    if (selectedCountry) return selectedCountry;
    if (quickFilter === "italy") return "Italy";
    return "";
  }, [selectedCountry, quickFilter]);

  const { data, isLoading } = useQuery<{ breweries: any[]; total: number }>({
    queryKey: ["/api/breweries/explore", debouncedQ, apiCountry, quickFilter, page],
    queryFn: () => {
      const p = new URLSearchParams();
      if (debouncedQ) p.set("q", debouncedQ);
      if (apiCountry) p.set("country", apiCountry);
      if (quickFilter === "international" && !selectedCountry) p.set("excludeCountry", "Italy");
      p.set("page", String(page));
      p.set("limit", String(PAGE_SIZE));
      return fetch(`/api/breweries/explore?${p}`).then(r => r.json());
    },
    staleTime: 30000,
  });

  const breweries = data?.breweries || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Country pills: pin Italy first, then rest sorted by count
  const topCountries = useMemo(() => {
    const sorted = countries
      .filter(c => c.country && c.country.trim())
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);

    const italyEntry = sorted.find(c => c.country === "Italy" || c.country === "Italia");
    const rest = sorted.filter(c => c.country !== "Italy" && c.country !== "Italia");
    return italyEntry ? [italyEntry, ...rest] : sorted;
  }, [countries]);

  const handleCountrySelect = useCallback((country: string) => {
    setSelectedCountry(prev => prev === country ? "" : country);
    setQuickFilter("all");
    setPage(1);
  }, []);

  const handleQuickFilter = (f: QuickFilter) => {
    setQuickFilter(f);
    setSelectedCountry("");
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput("");
    setDebouncedQ("");
    setSelectedCountry("");
    setQuickFilter("all");
    setPage(1);
  };

  const hasFilters = debouncedQ || selectedCountry || quickFilter !== "all";

  const italyCount = useMemo(() => {
    const c = countries.find(c => c.country === "Italy" || c.country === "Italia");
    return c?.count ?? 0;
  }, [countries]);

  return (
    <div className="min-h-screen bg-background slide-up">
      <Helmet>
        <title>Birrifici Artigianali Italiani | Fermenta.to</title>
        <meta name="description" content="Esplora i migliori birrifici artigianali d'Italia. Scopri le birre, la storia dei produttori e i locali dove trovarle vicino a te." />
        <meta property="og:title" content="Birrifici Artigianali Italiani | Fermenta.to" />
        <meta property="og:description" content="Esplora i migliori birrifici artigianali d'Italia. Scopri le birre, la storia dei produttori e i locali dove trovarle vicino a te." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fermenta.to/explore/breweries" />
        <meta property="og:site_name" content="Fermenta.to" />
        <meta name="twitter:card" content="summary" />
        <link rel="canonical" href="https://fermenta.to/explore/breweries" />
      </Helmet>
      {/* Header */}
      <div className="bg-white dark:bg-[hsl(25,14%,8%)] border-b border-stone-100 dark:border-[hsl(25,12%,14%)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/">
              <button className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-stone-900 dark:text-white">Birrifici</h1>
              <p className="text-xs text-stone-400 dark:text-stone-500">
                {total > 0
                  ? `${total.toLocaleString("it-IT")} birrifici${selectedCountry ? ` · ${getItalianName(selectedCountry)}` : quickFilter === "italy" ? " italiani" : quickFilter === "international" ? " internazionali" : ""}`
                  : "Caricamento…"}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 z-10" />
            <Input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Cerca birrificio…"
              className="pl-9 pr-9 rounded-xl border-stone-200 dark:border-stone-700/30 focus-visible:ring-primary/30 bg-stone-50 dark:bg-stone-900/30"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(""); setDebouncedQ(""); setPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick filters */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {[
              { key: "all" as QuickFilter, label: "Tutti", icon: <Globe className="w-3 h-3" /> },
              { key: "italy" as QuickFilter, label: `🇮🇹 Italia${italyCount > 0 ? ` ${italyCount.toLocaleString("it-IT")}` : ""}`, icon: null },
              { key: "international" as QuickFilter, label: "Internazionali", icon: <MapPin className="w-3 h-3" /> },
              { key: "top" as QuickFilter, label: "Più grandi", icon: <TrendingUp className="w-3 h-3" /> },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => handleQuickFilter(f.key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  quickFilter === f.key && !selectedCountry
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white dark:bg-stone-900/20 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700/30 hover:border-primary/40 hover:text-primary"
                }`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>

          {/* Country pills */}
          <div className="relative">
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white dark:from-[hsl(25,14%,8%)] to-transparent z-10" />
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide pr-8">
              {topCountries.map(c => {
                const isItaly = c.country === "Italy" || c.country === "Italia";
                return (
                  <button
                    key={c.country}
                    onClick={() => handleCountrySelect(c.country)}
                    className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      selectedCountry === c.country
                        ? "bg-primary text-white border-primary shadow-sm"
                        : isItaly
                        ? "bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/30"
                        : "bg-white dark:bg-stone-900/20 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700/30 hover:border-primary/40 hover:text-primary"
                    }`}
                  >
                    <span>{getFlag(c.country)}</span>
                    <span>{getItalianName(c.country)}</span>
                    <span className={`${selectedCountry === c.country ? "opacity-75" : "text-stone-400"}`}>
                      {c.count.toLocaleString("it-IT")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {hasFilters && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-sm text-muted-foreground dark:text-neutral-400">Filtri:</span>
            {quickFilter !== "all" && !selectedCountry && (
              <Badge variant="secondary" className="gap-1">
                {quickFilter === "italy" ? "🇮🇹 Italia" : quickFilter === "international" ? "🌍 Internazionali" : "🔝 Più grandi"}
                <X className="w-3 h-3 cursor-pointer" onClick={() => handleQuickFilter("all")} />
              </Badge>
            )}
            {debouncedQ && (
              <Badge variant="secondary" className="gap-1">
                "{debouncedQ}"
                <X className="w-3 h-3 cursor-pointer" onClick={() => { setSearchInput(""); setDebouncedQ(""); setPage(1); }} />
              </Badge>
            )}
            {selectedCountry && (
              <Badge variant="secondary" className="gap-1">
                {getFlag(selectedCountry)} {getItalianName(selectedCountry)}
                <X className="w-3 h-3 cursor-pointer" onClick={() => { setSelectedCountry(""); setPage(1); }} />
              </Badge>
            )}
            <button onClick={clearFilters} className="text-xs text-primary hover:text-primary/80 font-medium">
              Cancella tutti
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="bg-white dark:bg-card rounded-2xl overflow-hidden border border-stone-100/70 dark:border-stone-700/20 shadow-sm">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse bg-stone-50 dark:bg-stone-800/30 mx-4 my-2 rounded-xl" />
            ))}
          </div>
        ) : breweries.length === 0 ? (
          <div className="text-center py-16">
            <Globe className="w-12 h-12 mx-auto mb-3 text-stone-200 dark:text-stone-700" />
            <p className="font-semibold text-stone-600 dark:text-stone-300 text-base">Nessun birrificio trovato</p>
            <p className="text-stone-400 text-sm mt-1">Prova con un nome diverso o un altro filtro</p>
            <Button onClick={clearFilters} variant="outline" className="mt-4 border-stone-300 text-primary hover:bg-stone-50 rounded-full">
              Rimuovi filtri
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-card rounded-2xl overflow-hidden border border-stone-100/70 dark:border-stone-700/20 shadow-sm">
              {breweries.map((brewery: any, idx: number) => (
                <BreweryCard key={brewery.id} brewery={brewery} isLast={idx === breweries.length - 1} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="border-primary/30 text-primary hover:bg-stone-50 dark:hover:bg-stone-900/20 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Precedente
                </Button>
                <span className="text-sm text-muted-foreground dark:text-neutral-400 px-2">
                  Pagina <span className="font-semibold text-gray-800 dark:text-white">{page}</span> di{" "}
                  <span className="font-semibold text-gray-800 dark:text-white">{totalPages.toLocaleString("it-IT")}</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="border-primary/30 text-primary hover:bg-stone-50 dark:hover:bg-stone-900/20 disabled:opacity-40"
                >
                  Successiva
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
