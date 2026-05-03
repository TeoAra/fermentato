import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { lazy, Suspense } from "react";
const PubMap = lazy(() => import("@/components/pub-map").then(m => ({ default: m.PubMap })));
import { EmptyState } from "@/components/empty-state";
import { Beer, Search, X, Star, ChevronRight, SlidersHorizontal, Globe, Navigation, Map, ChevronLeft, ChevronRight as ChevronRightIcon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

const countryNameMap: Record<string, string> = {
  "Italy": "Italia", "Italia": "Italia",
  "Germany": "Germania", "Deutschland": "Germania",
  "United States": "Stati Uniti", "USA": "Stati Uniti", "US": "Stati Uniti",
  "Belgium": "Belgio", "Belgique": "Belgio", "België": "Belgio",
  "United Kingdom": "Regno Unito", "UK": "Regno Unito",
  "England": "Inghilterra", "Scotland": "Scozia", "Wales": "Galles",
  "France": "Francia", "Spain": "Spagna", "España": "Spagna",
  "Netherlands": "Paesi Bassi", "Holland": "Paesi Bassi",
  "Czech Republic": "Rep. Ceca", "Czechia": "Rep. Ceca",
  "Canada": "Canada", "Australia": "Australia", "Japan": "Giappone",
  "Mexico": "Messico", "México": "Messico", "Brazil": "Brasile", "Brasil": "Brasile",
  "Denmark": "Danimarca", "Danmark": "Danimarca", "Sweden": "Svezia", "Sverige": "Svezia",
  "Norway": "Norvegia", "Norge": "Norvegia", "Finland": "Finlandia", "Suomi": "Finlandia",
  "Austria": "Austria", "Österreich": "Austria",
  "Switzerland": "Svizzera", "Schweiz": "Svizzera", "Suisse": "Svizzera",
  "Ireland": "Irlanda", "Poland": "Polonia", "Polska": "Polonia",
  "Portugal": "Portogallo", "New Zealand": "Nuova Zelanda",
  "Israel": "Israele", "India": "India", "Russia": "Russia", "China": "Cina",
  "South Korea": "Corea del Sud", "Argentina": "Argentina", "South Africa": "Sudafrica",
  "Ukraine": "Ucraina", "Hungary": "Ungheria", "Colombia": "Colombia", "Chile": "Cile",
  "Slovakia": "Slovacchia", "Slovenia": "Slovenia", "Thailand": "Thailandia",
  "Croatia": "Croazia", "Greece": "Grecia", "Vietnam": "Vietnam",
  "Estonia": "Estonia", "Romania": "Romania", "Peru": "Perù",
  "Latvia": "Lettonia", "Serbia": "Serbia", "Lithuania": "Lituania",
  "Belarus": "Bielorussia", "Costa Rica": "Costa Rica", "Bulgaria": "Bulgaria",
  "Philippines": "Filippine", "Ecuador": "Ecuador", "Taiwan": "Taiwan",
  "Hong Kong": "Hong Kong", "Singapore": "Singapore",
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
  "Sweden": "🇸🇪", "Sverige": "🇸🇪", "Norway": "🇳🇴", "Norge": "🇳🇴",
  "Denmark": "🇩🇰", "Danmark": "🇩🇰", "Finland": "🇫🇮", "Suomi": "🇫🇮",
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

function getFlag(country: string): string { return countryFlags[country] || "🌍"; }
function getItalianName(country: string): string { return countryNameMap[country] ?? country; }

function haversineDist(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

type QuickFilter = "all" | "nearby" | "top" | "italian" | "international";
type ViewMode = "list" | "map";
const PAGE_SIZE = 30;

export default function ExploreBreweries() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [page, setPage] = useState(1);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(() => {
    try { const c = localStorage.getItem("fermenta:userLocation"); return c ? JSON.parse(c) : null; } catch { return null; }
  });
  const [distanceKm, setDistanceKm] = useState(10);
  const [showDistPicker, setShowDistPicker] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: countries = [] } = useQuery<{ country: string; count: number }[]>({
    queryKey: ["/api/breweries/countries"],
    staleTime: 10 * 60 * 1000,
  });

  const apiCountry = useMemo(() => {
    if (quickFilter === "italian") return "Italy";
    return "";
  }, [quickFilter]);

  const { data, isLoading } = useQuery<{ breweries: any[]; total: number }>({
    queryKey: ["/api/breweries/explore", debouncedQ, apiCountry, quickFilter, page],
    queryFn: () => {
      const p = new URLSearchParams();
      if (debouncedQ) p.set("q", debouncedQ);
      if (apiCountry) p.set("country", apiCountry);
      if (quickFilter === "international") p.set("excludeCountry", "Italy");
      if (quickFilter === "top") { p.set("sort", "beerCount"); }
      p.set("page", String(page));
      p.set("limit", String(PAGE_SIZE));
      return fetch(`/api/breweries/explore?${p}`).then(r => r.json());
    },
    staleTime: 30000,
  });

  const { data: nearbyBreweries } = useQuery<any[]>({
    queryKey: ["/api/breweries/nearby", userLocation?.lat, userLocation?.lng],
    queryFn: () => fetch(`/api/breweries/nearby?lat=${userLocation!.lat}&lng=${userLocation!.lng}&limit=20`).then(r => r.json()),
    enabled: quickFilter === "nearby" && !!userLocation,
    staleTime: 5 * 60 * 1000,
  });

  const breweries = useMemo(() => {
    if (quickFilter === "nearby" && nearbyBreweries) {
      return nearbyBreweries.filter((b: any) => !distanceKm || (b._distance ?? 999) <= distanceKm);
    }
    return data?.breweries || [];
  }, [data, quickFilter, nearbyBreweries, distanceKm]);

  const total = quickFilter === "nearby" ? breweries.length : (data?.total || 0);
  const totalPages = quickFilter === "nearby" ? 1 : Math.ceil(total / PAGE_SIZE);

  const topCountries = useMemo(() => {
    const sorted = countries.filter(c => c.country?.trim()).sort((a, b) => b.count - a.count).slice(0, 20);
    const italy = sorted.find(c => c.country === "Italy" || c.country === "Italia");
    const rest = sorted.filter(c => c.country !== "Italy" && c.country !== "Italia");
    return italy ? [italy, ...rest] : sorted;
  }, [countries]);

  const italyCount = useMemo(() => {
    const c = countries.find(c => c.country === "Italy" || c.country === "Italia");
    return c?.count ?? 0;
  }, [countries]);

  const featured = useMemo(() => {
    if (!data?.breweries) return [];
    return data.breweries.filter((b: any) => b.coverImageUrl || b.logoUrl).slice(0, 6);
  }, [data?.breweries]);

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserLocation(loc);
      try { localStorage.setItem("fermenta:userLocation", JSON.stringify(loc)); } catch {}
    });
  };

  const handleQuickFilter = (f: QuickFilter) => {
    setQuickFilter(prev => prev === f ? "all" : f);
    setPage(1);
    if (f === "nearby" && !userLocation) handleLocate();
  };

  const clearFilters = () => {
    setSearchInput(""); setDebouncedQ(""); setQuickFilter("all"); setPage(1);
  };

  const QUICK_FILTERS: { key: QuickFilter; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "Tutti", icon: <Globe className="w-3 h-3" /> },
    { key: "nearby", label: "Vicino a te", icon: <Navigation className="w-3 h-3" /> },
    { key: "top", label: "Top rated", icon: <Star className="w-3 h-3" /> },
    { key: "italian", label: "🇮🇹 Italiani", icon: null },
    { key: "international", label: "Internazionali", icon: null },
  ];

  const breweryMapPins = useMemo(() =>
    breweries
      .filter((b: any) => b.latitude && b.longitude)
      .map((b: any) => ({ id: b.id, name: b.name, latitude: String(b.latitude), longitude: String(b.longitude), logoUrl: b.logoUrl, type: "brewery" as const })),
    [breweries]
  );

  if (viewMode === "map") {
    return (
      <div className="fixed inset-x-0 bottom-0 top-14 z-40 bg-background">
        <div className="absolute top-3 left-3 right-3 z-50 flex items-center gap-2 pointer-events-none">
          <button
            onClick={() => setViewMode("list")}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-bold bg-white dark:bg-card shadow-lg border border-stone-100 dark:border-border text-foreground tap-scale"
          >
            ← Lista
          </button>
          <div className="flex-1 pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-2xl bg-white dark:bg-card shadow-lg border border-stone-100 dark:border-border">
            <Beer className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm font-bold text-foreground">{breweryMapPins.length} birrifici</span>
          </div>
        </div>
        {isLoading ? (
          <div className="w-full h-full bg-stone-100 dark:bg-stone-800 animate-pulse" />
        ) : (
          <Suspense fallback={<div className="w-full h-full bg-stone-100 dark:bg-stone-800 animate-pulse" />}><PubMap pins={breweryMapPins} height="100%" /></Suspense>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F4F0] dark:bg-background">
      <Helmet>
        <title>Birrifici Artigianali Italiani | Fermenta.to</title>
        <meta name="description" content="Esplora oltre 50.000 birrifici artigianali italiani e internazionali. Scopri birre, storia e dove trovarli su Fermenta.to." />
      </Helmet>

      {/* ── Header (scorre con la pagina) ── */}
      <div className="bg-white/95 dark:bg-[hsl(25,14%,8%)]/95 backdrop-blur-md border-b border-stone-100 dark:border-stone-800">
        <div className="max-w-5xl mx-auto px-4 lg:px-6 pt-3 pb-2">
          {/* Title row */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl lg:text-2xl font-extrabold text-foreground">Esplora Birrifici</h1>
              <p className="text-xs text-stone-400 dark:text-stone-500">Scopri i migliori birrifici vicino a te</p>
            </div>
            <button
              onClick={() => setViewMode("map")}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold bg-primary/10 dark:bg-primary/15 text-primary tap-scale border border-primary/20 hover:bg-primary/15 dark:hover:bg-primary/20 transition-colors"
            >
              <Map className="w-3.5 h-3.5" />
              Mappa
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-stone-100 dark:bg-stone-800 rounded-2xl px-3 py-2.5 mb-3">
            <Search className="h-4 w-4 text-stone-400 flex-shrink-0" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Cerca birrificio, città, nazione…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-stone-400 dark:placeholder:text-stone-500 outline-none min-w-0 font-medium"
            />
            {searchInput
              ? <button onClick={() => { setSearchInput(""); setDebouncedQ(""); setPage(1); }} className="tap-scale"><X className="h-4 w-4 text-stone-400" /></button>
              : <SlidersHorizontal className="h-4 w-4 text-stone-400" />
            }
          </div>

          {/* Mini mappa — pin dei birrifici geolocalizzati */}
          <div className="rounded-2xl overflow-hidden border border-stone-100 dark:border-stone-800/60 shadow-sm h-[240px] lg:h-[260px] bg-stone-100 dark:bg-stone-800 mb-3">
            <Suspense fallback={<div className="w-full h-full bg-stone-100 dark:bg-stone-800 animate-pulse" />}><PubMap pins={breweryMapPins} height="100%" /></Suspense>
          </div>

          {/* Quick filter chips */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 lg:-mx-6 lg:px-6">
            {/* Distance chip (only shown when nearby active) */}
            {quickFilter === "nearby" && (
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setShowDistPicker(v => !v)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border bg-primary text-white border-primary tap-scale"
                >
                  Entro {distanceKm} km ▾
                </button>
                {showDistPicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDistPicker(false)} />
                    <div className="absolute top-9 left-0 z-50 bg-card border border-border rounded-2xl shadow-xl overflow-hidden min-w-[110px]">
                      {[1, 5, 10, 15, 20, 30, 50].map(d => (
                        <button
                          key={d}
                          onClick={() => { setDistanceKm(d); setShowDistPicker(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors ${distanceKm === d ? 'text-primary bg-orange-50 dark:bg-orange-900/20' : 'text-foreground hover:bg-muted'}`}
                        >
                          {d} km
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {QUICK_FILTERS.filter(f => f.key !== "all" || quickFilter === "all").map(f => (
              <button
                key={f.key}
                onClick={() => handleQuickFilter(f.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all tap-scale ${
                  quickFilter === f.key
                    ? "bg-primary text-white border-primary shadow-sm"
                    : f.key === "all"
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700"
                }`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>

          {/* Country pills */}
          {quickFilter === "all" && !debouncedQ && topCountries.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pt-2 pb-1 -mx-4 px-4 lg:-mx-6 lg:px-6">
              {topCountries.slice(0, 15).map(c => {
                const isItaly = c.country === "Italy" || c.country === "Italia";
                return (
                  <button
                    key={c.country}
                    onClick={() => { setQuickFilter(isItaly ? "italian" : "all"); if (!isItaly) { setSearchInput(getItalianName(c.country)); setDebouncedQ(c.country); } }}
                    className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all tap-scale ${
                      isItaly
                        ? "bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/30"
                        : "bg-white dark:bg-stone-800/40 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700"
                    }`}
                  >
                    <span>{getFlag(c.country)}</span>
                    <span>{getItalianName(c.country)}</span>
                    <span className="opacity-60 text-[10px]">{c.count.toLocaleString("it-IT")}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Result count */}
        <div className="max-w-5xl mx-auto px-4 lg:px-6 pb-2">
          <p className="text-[11px] text-stone-400 dark:text-stone-500 font-medium">
            {isLoading ? "Caricamento…" : `${total.toLocaleString("it-IT")} birrifici trovati`}
            {quickFilter === "italian" ? " italiani" : quickFilter === "international" ? " internazionali" : ""}
            {quickFilter === "nearby" && userLocation ? ` · Ordina: Distanza` : ""}
          </p>
        </div>
      </div>

      {/* ── Content ── */}
      <main className="max-w-5xl mx-auto px-4 lg:px-6 pt-3 pb-28 lg:pb-12">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-card rounded-2xl h-[88px] animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
        ) : breweries.length === 0 ? (
          <EmptyState
            icon={<Beer className="h-8 w-8 text-stone-400" />}
            title="Nessun birrificio trovato"
            subtitle="Prova con un nome diverso o cambia i filtri."
            ctaLabel="Rimuovi filtri"
            onCta={clearFilters}
            size="lg"
          />
        ) : (
          <>
            {/* Featured horizontal (only on first page, no filter, no search) */}
            {quickFilter === "all" && !debouncedQ && page === 1 && featured.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="text-[15px] font-extrabold text-foreground">Birrifici in evidenza</h2>
                  <span className="text-xs font-bold text-primary">Vedi tutti</span>
                </div>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
                  {featured.map((b: any) => (
                    <FeaturedCard key={b.id} brewery={b} />
                  ))}
                </div>
              </div>
            )}

            {/* List header */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-extrabold text-foreground">
                {quickFilter === "nearby" ? "Vicino a te" : quickFilter === "italian" ? "Birrifici italiani" : quickFilter === "international" ? "Internazionali" : quickFilter === "top" ? "I più grandi" : "Tutti i birrifici"}
              </h2>
              {total > 1 && (
                <span className="text-xs text-stone-400 font-medium">
                  Ordina: {quickFilter === "nearby" && userLocation ? "Distanza" : quickFilter === "top" ? "Birre" : "Nome"} ▾
                </span>
              )}
            </div>

            {/* Brewery list */}
            <div className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
              {breweries.map((brewery: any) => (
                <BreweryListCard key={brewery.id} brewery={brewery} showDist={quickFilter === "nearby" && !!userLocation} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <button
                  disabled={page <= 1}
                  onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-bold border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 disabled:opacity-40 tap-scale bg-white dark:bg-card"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Precedente
                </button>
                <span className="text-sm text-stone-400 font-medium">
                  {page} / {totalPages.toLocaleString("it-IT")}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-bold border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 disabled:opacity-40 tap-scale bg-white dark:bg-card"
                >
                  Successiva
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </main>

    </div>
  );
}

function FeaturedCard({ brewery }: { brewery: any }) {
  const [imgErr, setImgErr] = useState(false);
  const isItalian = brewery.country === "Italy" || brewery.country === "Italia";

  return (
    <Link href={`/brewery/${brewery.id}`}>
      <div className="flex-shrink-0 w-40 cursor-pointer">
        <div className="relative w-40 h-28 rounded-2xl overflow-hidden bg-stone-200 dark:bg-stone-800 mb-2">
          {!imgErr && (brewery.coverImageUrl || brewery.logoUrl) ? (
            <img
              src={brewery.coverImageUrl || brewery.logoUrl}
              alt={brewery.name}
              className="w-full h-full object-cover"
              onError={() => setImgErr(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900/30 to-orange-900/20">
              <Beer className="w-8 h-8 text-amber-600/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-2 left-2">
            <span className="text-[10px] font-bold text-white/80">{getFlag(brewery.country || "")} {getItalianName(brewery.country || "")}</span>
          </div>
        </div>
        <p className="font-bold text-[13px] text-foreground truncate">{brewery.name}</p>
        <p className="text-[11px] text-stone-400 truncate">{brewery.location}</p>
        {Number(brewery.beerCount) > 0 && (
          <div className="flex items-center gap-0.5 mt-0.5">
            <Beer className="w-2.5 h-2.5 text-primary" />
            <span className="text-[11px] font-bold text-primary">{Number(brewery.beerCount).toLocaleString("it-IT")} birre</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function BreweryListCard({ brewery, showDist }: { brewery: any; showDist: boolean }) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imgErr, setImgErr] = useState(false);

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
  const dist = brewery._distance ?? brewery._dist;

  return (
    <div className="flex items-center gap-3 bg-white dark:bg-card rounded-2xl border border-stone-100 dark:border-stone-800/60 shadow-sm overflow-hidden active:scale-[0.98] transition-transform">
      {/* Logo */}
      <Link href={`/brewery/${brewery.id}`} className="flex-shrink-0">
        <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
          {!imgErr && brewery.logoUrl ? (
            <img
              src={brewery.logoUrl}
              alt={brewery.name}
              className="w-full h-full object-cover"
              onError={() => setImgErr(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900/30 to-orange-900/20">
              <Beer className="w-6 h-6 text-amber-600/50" />
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <Link href={`/brewery/${brewery.id}`} className="flex-1 min-w-0 py-3">
        <p className="font-bold text-[14px] text-foreground truncate">{brewery.name}</p>
        <p className="text-[12px] text-stone-400 dark:text-stone-500 truncate mt-0.5">
          {flag} {italianCountry}
          {brewery.location && brewery.location !== brewery.country ? ` · ${brewery.location}` : ""}
          {showDist && dist != null ? ` · ${formatDist(dist)}` : ""}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {Number(brewery.beerCount) > 0 && (
            <span className="text-[11px] font-semibold text-primary flex items-center gap-0.5">
              <Beer className="w-2.5 h-2.5" />
              {Number(brewery.beerCount).toLocaleString("it-IT")} birre
            </span>
          )}
          {showDist && dist != null && (
            <span className="text-[11px] text-stone-400 flex items-center gap-0.5">
              📍 {formatDist(dist)}
            </span>
          )}
        </div>
      </Link>

      {/* Actions */}
      <div className="flex flex-col gap-1.5 pr-3 flex-shrink-0">
        {isAuthenticated && (
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); favMut.mutate({ action: isFav ? "remove" : "add" }); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all tap-scale ${
              isFav
                ? "bg-stone-100 dark:bg-stone-800 text-stone-500 border-stone-200 dark:border-stone-700"
                : "bg-white dark:bg-stone-800/60 text-stone-500 border-stone-200 dark:border-stone-700"
            }`}
          >
            {isFav ? "✓ Seguito" : "👤 Segui"}
          </button>
        )}
        <Link href={`/brewery/${brewery.id}`}>
          <button className="w-full px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-white tap-scale">
            Vedi →
          </button>
        </Link>
      </div>
    </div>
  );
}
