import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { MapPin, Beer, ArrowLeft, Heart, Search, Globe, X, ChevronLeft, ChevronRight } from "lucide-react";
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
        ? apiRequest("/api/favorites", "POST", { itemType: "brewery", itemId: brewery.id })
        : apiRequest(`/api/favorites/brewery/${brewery.id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({ title: isFav ? "Rimosso dai preferiti" : "Aggiunto ai preferiti" });
    },
  });

  const flag = getFlag(brewery.country || "");
  const italianCountry = getItalianName(brewery.country || "");

  return (
    <Link href={`/brewery/${brewery.id}`}>
      <div className="group relative rounded-2xl overflow-hidden cursor-pointer bg-white dark:bg-slate-800 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 dark:border-slate-700">
        <div className="relative h-44 overflow-hidden bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/20">
          <img
            src={imgError || !brewery.logoUrl ? BREWERY_FALLBACK : brewery.logoUrl}
            alt={brewery.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-white font-bold text-sm leading-tight line-clamp-2 drop-shadow">{brewery.name}</p>
          </div>
          {isAuthenticated && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); favMut.mutate({ action: isFav ? "remove" : "add" }); }}
              className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow ${isFav ? "bg-red-500 text-white" : "bg-white/80 text-gray-500 hover:bg-red-50 hover:text-red-500"}`}
            >
              <Heart className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
            </button>
          )}
        </div>

        <div className="p-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 mb-2">
            <span className="text-base leading-none">{flag}</span>
            <span className="truncate">{italianCountry}</span>
            {brewery.location && brewery.location !== brewery.country && (
              <>
                <span className="text-gray-300 dark:text-slate-600">·</span>
                <span className="truncate">{brewery.location}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Beer className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              {Number(brewery.beerCount || 0).toLocaleString("it-IT")} birre
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

const PAGE_SIZE = 48;

export default function ExploreBreweries() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
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

  const { data, isLoading } = useQuery<{ breweries: any[]; total: number }>({
    queryKey: ["/api/breweries/explore", debouncedQ, selectedCountry, page],
    queryFn: () => {
      const p = new URLSearchParams();
      if (debouncedQ) p.set("q", debouncedQ);
      if (selectedCountry) p.set("country", selectedCountry);
      p.set("page", String(page));
      p.set("limit", String(PAGE_SIZE));
      return fetch(`/api/breweries/explore?${p}`).then(r => r.json());
    },
    staleTime: 30000,
  });

  const breweries = data?.breweries || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const topCountries = useMemo(() => {
    return countries
      .filter(c => c.country && c.country.trim())
      .sort((a, b) => b.count - a.count)
      .slice(0, 24);
  }, [countries]);

  const handleCountrySelect = useCallback((country: string) => {
    setSelectedCountry(prev => prev === country ? "" : country);
    setPage(1);
  }, []);

  const clearFilters = () => {
    setSearchInput("");
    setDebouncedQ("");
    setSelectedCountry("");
    setPage(1);
  };

  const hasFilters = debouncedQ || selectedCountry;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-amber-600 via-amber-500 to-orange-500 dark:from-amber-800 dark:via-amber-700 dark:to-orange-700 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url('/brewery-cover.jpg')", backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="absolute inset-0 bg-gradient-to-br from-amber-600/90 to-orange-600/80" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Home
              </Button>
            </Link>
          </div>

          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <div className="bg-white/20 rounded-full p-3">
                <Globe className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 tracking-tight">
              Esplora i Birrifici del Mondo
            </h1>
            <p className="text-amber-100 text-base">
              {total > 0
                ? `${total.toLocaleString("it-IT")} birrifici${selectedCountry ? ` in ${getItalianName(selectedCountry)}` : " in tutto il mondo"}`
                : "Scopri i migliori birrifici artigianali dal mondo"}
            </p>
          </div>

          {/* Search bar */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
            <Input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Cerca birrificio per nome..."
              className="pl-12 pr-12 py-3 h-12 text-base rounded-xl border-0 shadow-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus-visible:ring-2 focus-visible:ring-white"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(""); setDebouncedQ(""); setPage(1); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Country pills */}
      <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => { setSelectedCountry(""); setPage(1); }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                !selectedCountry
                  ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                  : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-amber-300 hover:text-amber-600"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Tutti</span>
            </button>
            {topCountries.map(c => (
              <button
                key={c.country}
                onClick={() => handleCountrySelect(c.country)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  selectedCountry === c.country
                    ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                    : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-amber-300 hover:text-amber-600"
                }`}
              >
                <span>{getFlag(c.country)}</span>
                <span>{getItalianName(c.country)}</span>
                <span className={`text-xs ${selectedCountry === c.country ? "text-amber-100" : "text-gray-400"}`}>
                  {c.count.toLocaleString("it-IT")}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {hasFilters && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-500 dark:text-slate-400">Filtri attivi:</span>
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
            <button onClick={clearFilters} className="text-xs text-amber-600 hover:text-amber-700 font-medium">
              Cancella tutti
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden animate-pulse">
                <div className="h-44 bg-gray-200 dark:bg-slate-700" />
                <div className="p-3 bg-white dark:bg-slate-800 space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : breweries.length === 0 ? (
          <div className="text-center py-20">
            <Globe className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-slate-700" />
            <p className="font-semibold text-gray-600 dark:text-slate-300 text-lg">Nessun birrificio trovato</p>
            <p className="text-gray-400 text-sm mt-1">Prova con un nome diverso o un altro paese</p>
            <Button onClick={clearFilters} variant="outline" className="mt-4 border-amber-300 text-amber-600 hover:bg-amber-50">
              Rimuovi filtri
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {breweries.map((brewery: any) => (
                <BreweryCard key={brewery.id} brewery={brewery} />
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
                  className="border-amber-200 text-amber-700 dark:border-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Precedente
                </Button>
                <span className="text-sm text-gray-500 dark:text-slate-400 px-2">
                  Pagina <span className="font-semibold text-gray-800 dark:text-white">{page}</span> di{" "}
                  <span className="font-semibold text-gray-800 dark:text-white">{totalPages.toLocaleString("it-IT")}</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="border-amber-200 text-amber-700 dark:border-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-40"
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
