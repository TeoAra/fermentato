import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { Link } from "wouter";
import { EmptyState } from "@/components/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { Beer, Search, X, Star, ChevronRight, SlidersHorizontal, Globe, Navigation, ChevronLeft, ChevronRight as ChevronRightIcon, Building2 } from "lucide-react";
const PubMap = lazy(() => import("@/components/pub-map").then(m => ({ default: m.PubMap })));
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { getCurrentPosition, isGeolocationAvailable } from "@/lib/geolocation";

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

const QUICK_FILTER_VALUES: QuickFilter[] = ["all", "nearby", "top", "italian", "international"];

// Guarded fetch: custom queryFns without an r.ok check turn API error objects
// into "data", crashing downstream .map/.filter (see frontend-array-guards memory).
async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export default function ExploreBreweries() {
  // ── URL state: q / country (filter) / page / view are synced to the URL so
  // filtered results are shareable (same pushState + popstate pattern as
  // explore-beers.tsx). Parse initial state from the query string on mount.
  // "italian" is the only unserialized default; every other filter (including
  // an explicit "all") is encoded so that sharing/reloading an explicit view is
  // faithful — otherwise "all" would collapse to the root URL and silently
  // reload as "italian".
  const initParams = () => {
    const p = new URLSearchParams(window.location.search);
    const q = p.get("q") || "";
    const f = p.get("filter") || "";
    const filter: QuickFilter = (QUICK_FILTER_VALUES.includes(f as QuickFilter) ? f : "italian") as QuickFilter;
    const pg = Math.max(1, parseInt(p.get("page") || "1") || 1);
    const view: ViewMode = p.get("view") === "map" ? "map" : "list";
    return { q, filter, page: pg, view };
  };
  const init = initParams();

  const [searchInput, setSearchInput] = useState(init.q);
  const [debouncedQ, setDebouncedQ] = useState(init.q);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(init.filter);
  const [page, setPage] = useState(init.page);
  const [viewMode, setViewMode] = useState<ViewMode>(init.view);
  // When a popstate restores state, the sync effect below would immediately
  // pushState the same URL again and wipe the forward-history entry. This flag
  // tells the effect to replaceState (not push) for that one restore.
  const skipNextPushRef = useRef(false);
  const [mapVisible, setMapVisible] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(() => {
    try { const c = localStorage.getItem("fermenta:userLocation"); return c ? JSON.parse(c) : null; } catch { return null; }
  });
  const [distanceKm, setDistanceKm] = useState(10);
  const [showDistPicker, setShowDistPicker] = useState(false);
  const distBtnRef = useRef<HTMLButtonElement>(null);
  const [distPickerPos, setDistPickerPos] = useState<{ top: number; left: number } | null>(null);
  // Toggle: distanza in linea d'aria (default) vs percorso reale via OSRM.
  const [useRealRoute, setUseRealRoute] = useState(false);
  const [realDistances, setRealDistances] = useState<Record<number, number>>({});
  const requestedIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Build the shareable URL for the current state. "italian" is the default and
  // stays unserialized; every other filter (incl. "all") is encoded.
  const buildUrl = useCallback((next: { q?: string; filter?: QuickFilter; page?: number; view?: ViewMode }) => {
    const p = new URLSearchParams();
    if (next.q) p.set("q", next.q);
    if (next.filter && next.filter !== "italian") p.set("filter", next.filter);
    if (next.page && next.page > 1) p.set("page", String(next.page));
    if (next.view === "map") p.set("view", "map");
    const qs = p.toString();
    return qs ? `/explore/breweries?${qs}` : "/explore/breweries";
  }, []);

  // Reflect the current state into the URL whenever the shareable inputs change.
  // Normally this pushes a new history entry, but right after a popstate restore
  // we replaceState instead so we don't clobber the forward-history stack.
  useEffect(() => {
    const url = buildUrl({ q: debouncedQ, filter: quickFilter, page, view: viewMode });
    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      window.history.replaceState(null, "", url);
    } else {
      window.history.pushState(null, "", url);
    }
  }, [debouncedQ, quickFilter, page, viewMode, buildUrl]);

  // Restore state on browser back/forward. Setting the flag makes the sync
  // effect above replace (not push) the resulting URL for this restore only.
  useEffect(() => {
    const sync = () => {
      const s = initParams();
      skipNextPushRef.current = true;
      setSearchInput(s.q);
      setDebouncedQ(s.q);
      setQuickFilter(s.filter);
      setPage(s.page);
      setViewMode(s.view);
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: countries = [] } = useQuery<{ country: string; count: number }[]>({
    queryKey: ["/api/breweries/countries"],
    queryFn: () => fetchJson<{ country: string; count: number }[]>("/api/breweries/countries"),
    staleTime: 10 * 60 * 1000,
  });

  const apiCountry = useMemo(() => {
    if (quickFilter === "italian") return "Italy";
    return "";
  }, [quickFilter]);

  const { data, isLoading, isError, refetch } = useQuery<{ breweries: any[]; total: number }>({
    queryKey: ["/api/breweries/explore", debouncedQ, apiCountry, quickFilter, page],
    queryFn: () => {
      const p = new URLSearchParams();
      if (debouncedQ) p.set("q", debouncedQ);
      if (apiCountry) p.set("country", apiCountry);
      if (quickFilter === "international") p.set("excludeCountry", "Italy");
      if (quickFilter === "top") { p.set("sort", "beerCount"); }
      p.set("page", String(page));
      p.set("limit", String(PAGE_SIZE));
      return fetchJson<{ breweries: any[]; total: number }>(`/api/breweries/explore?${p}`);
    },
    enabled: quickFilter !== "nearby",
    staleTime: 30000,
  });

  const { data: nearbyBreweries, isError: nearbyError, refetch: refetchNearby } = useQuery<any[]>({
    queryKey: ["/api/breweries/nearby", userLocation?.lat, userLocation?.lng],
    queryFn: () => fetchJson<any[]>(`/api/breweries/nearby?lat=${userLocation!.lat}&lng=${userLocation!.lng}&limit=20`),
    enabled: quickFilter === "nearby" && !!userLocation,
    staleTime: 5 * 60 * 1000,
  });

  const showError = quickFilter === "nearby" ? nearbyError : isError;
  const retry = () => { if (quickFilter === "nearby") refetchNearby(); else refetch(); };

  const breweries = useMemo(() => {
    if (quickFilter === "nearby" && Array.isArray(nearbyBreweries)) {
      return nearbyBreweries
        .map((b: any) => {
          const air = b._distance;
          const real = useRealRoute ? realDistances[b.id] : undefined;
          return { ...b, _distAir: air, _distReal: real, _distance: real != null ? real : air };
        })
        .filter((b: any) => !distanceKm || (b._distance ?? 999) <= distanceKm);
    }
    return Array.isArray(data?.breweries) ? data!.breweries : [];
  }, [data, quickFilter, nearbyBreweries, distanceKm, useRealRoute, realDistances]);

  useEffect(() => {
    requestedIdsRef.current = new Set();
    if (!useRealRoute) setRealDistances({});
  }, [useRealRoute, userLocation?.lat, userLocation?.lng]);

  useEffect(() => {
    if (!useRealRoute || !userLocation || quickFilter !== "nearby" || !Array.isArray(nearbyBreweries)) return;
    const candidates = nearbyBreweries
      .filter((b: any) => b.latitude && b.longitude && !requestedIdsRef.current.has(b.id))
      .slice(0, 15)
      .map((b: any) => ({ id: b.id as number, lat: parseFloat(b.latitude), lng: parseFloat(b.longitude) }));
    if (candidates.length === 0) return;
    candidates.forEach((c) => requestedIdsRef.current.add(c.id));
    const ctrl = new AbortController();
    (async () => {
      for (const c of candidates) {
        if (ctrl.signal.aborted) return;
        try {
          const url = `/api/route?fromLat=${userLocation.lat}&fromLng=${userLocation.lng}&toLat=${c.lat}&toLng=${c.lng}&mode=driving`;
          const r = await fetch(url, { signal: ctrl.signal });
          if (!r.ok) continue;
          const j = await r.json();
          if (typeof j.distanceM === "number") {
            setRealDistances((prev) => ({ ...prev, [c.id]: j.distanceM / 1000 }));
          }
        } catch (e) {
          if ((e as any)?.name === "AbortError") return;
        }
      }
    })();
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useRealRoute, userLocation?.lat, userLocation?.lng, quickFilter, (Array.isArray(nearbyBreweries) ? nearbyBreweries : []).map((b: any) => b.id).join(",")]);

  const total = quickFilter === "nearby" ? breweries.length : (data?.total || 0);
  const totalPages = quickFilter === "nearby" ? 1 : Math.ceil(total / PAGE_SIZE);

  const topCountries = useMemo(() => {
    const list = Array.isArray(countries) ? countries : [];
    const sorted = list.filter(c => c.country?.trim()).sort((a, b) => b.count - a.count).slice(0, 20);
    const italy = sorted.find(c => c.country === "Italy" || c.country === "Italia");
    const rest = sorted.filter(c => c.country !== "Italy" && c.country !== "Italia");
    return italy ? [italy, ...rest] : sorted;
  }, [countries]);

  const italyCount = useMemo(() => {
    const list = Array.isArray(countries) ? countries : [];
    const c = list.find(c => c.country === "Italy" || c.country === "Italia");
    return c?.count ?? 0;
  }, [countries]);

  const featured = useMemo(() => {
    if (!Array.isArray(data?.breweries)) return [];
    return data!.breweries.filter((b: any) => b.coverImageUrl || b.logoUrl).slice(0, 6);
  }, [data?.breweries]);

  const handleLocate = () => {
    if (!isGeolocationAvailable()) return;
    getCurrentPosition().then(pos => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserLocation(loc);
      try { localStorage.setItem("fermenta:userLocation", JSON.stringify(loc)); } catch {}
    }).catch(() => {});
  };

  const handleQuickFilter = (f: QuickFilter) => {
    setQuickFilter(prev => prev === f ? "all" : f);
    setPage(1);
    if (f === "nearby") handleLocate();
  };

  const clearFilters = () => {
    setSearchInput(""); setDebouncedQ(""); setQuickFilter("all"); setPage(1);
  };

  const QUICK_FILTERS: { key: QuickFilter; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "Tutti", icon: <Globe className="w-3 h-3" /> },
    { key: "nearby", label: "Vicino a te", icon: <Navigation className="w-3 h-3" /> },
    { key: "italian", label: "🇮🇹 Italiani", icon: null },
    { key: "international", label: "Internazionali", icon: null },
  ];

  /* ── FULLSCREEN MAP VIEW ─────────────────────────────────────────── */
  if (viewMode === "map") {
    const mapPins = breweries.map((b: any) => ({
      id: b.id, name: b.name, slug: b.slug,
      latitude: String(b.latitude || ""), longitude: String(b.longitude || ""),
      logoUrl: b.logoUrl, type: "brewery" as const,
    }));
    return (
      <div className="fixed inset-x-0 bottom-0 top-14 z-40 bg-background">
        {/* Row 1: back + count */}
        <div className="absolute top-3 left-3 right-3 z-50 flex items-center gap-2 pointer-events-none">
          <button
            onClick={() => setViewMode("list")}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-bold bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] text-foreground tap-scale hover:border-primary/30 active:scale-[0.99] transition-all duration-200"
          >
            ← Lista
          </button>
          <div className="flex-1 pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
            <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm font-bold text-foreground">
              {debouncedQ || quickFilter !== "all" ? `${breweries.length} filtrati` : `${total.toLocaleString("it-IT")} birrifici`}
            </span>
          </div>
        </div>
        {/* Row 2: filter chips */}
        <div className="absolute top-[3.5rem] left-3 right-3 z-50 flex items-center gap-2 overflow-x-auto scrollbar-hide pointer-events-none">
          {quickFilter === "nearby" && (
            <div className="relative flex-shrink-0 pointer-events-auto">
              <button
                onClick={() => setShowDistPicker(v => !v)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border bg-primary text-white border-primary shadow-sm tap-scale"
              >
                Entro {distanceKm} km ▾
              </button>
              {showDistPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDistPicker(false)} />
                  <div className="absolute top-9 left-0 z-50 bg-white dark:bg-[#1A1D24] border border-stone-100 dark:border-[#23262E] rounded-2xl shadow-xl overflow-hidden min-w-[110px]">
                    {[1, 5, 10, 15, 20, 30, 50].map(d => (
                      <button key={d} onClick={() => { setDistanceKm(d); setShowDistPicker(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors ${distanceKm === d ? 'text-primary bg-orange-50 dark:bg-orange-900/20' : 'text-foreground hover:bg-stone-50 dark:hover:bg-white/5'}`}>
                        {d} km
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {QUICK_FILTERS.filter(f => f.key !== "all" || quickFilter === "all").map(f => (
            <button key={f.key} onClick={() => handleQuickFilter(f.key)}
              className={`pointer-events-auto flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 tap-scale ${
                quickFilter === f.key
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl text-stone-600 dark:text-stone-300 border-white/50 dark:border-white/[0.1] shadow-sm hover:border-primary/30 active:scale-[0.99]"
              }`}
            >
              {f.icon}{f.label}
            </button>
          ))}
        </div>
        <div className="absolute inset-0">
          {isLoading ? (
            <div className="w-full h-full bg-stone-100 dark:bg-[#1A1D24] animate-pulse" />
          ) : (
            <Suspense fallback={<div className="w-full h-full bg-stone-100 dark:bg-[#1A1D24] animate-pulse" />}>
              <PubMap
                pins={mapPins}
                height="100%"
                fullscreen
                userLocation={userLocation ?? undefined}
                radiusKm={quickFilter === "nearby" && userLocation ? distanceKm : undefined}
              />
            </Suspense>
          )}
        </div>
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
      <div className="bg-white/95 dark:bg-[#0B0D10]/95 backdrop-blur-md border-b border-stone-100 dark:border-[#23262E]">
        <PageContainer variant="wide" className="pt-3 pb-2">
          {/* Title row */}
          <div className="mb-3">
            <h1 className="text-xl lg:text-2xl font-extrabold text-foreground">Esplora Birrifici</h1>
            <p className="text-xs text-stone-400 dark:text-stone-500">Scopri i migliori birrifici vicino a te</p>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] rounded-2xl px-3 py-2.5 mb-3 transition-all duration-200">
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

          {/* Mini mappa */}
          {mapVisible && (
            <div className="rounded-2xl overflow-hidden border border-stone-100 dark:border-[#23262E]/60 shadow-sm h-[200px] lg:h-[220px] bg-stone-100 dark:bg-[#1A1D24] mb-3">
              <Suspense fallback={<div className="w-full h-full bg-stone-100 dark:bg-[#1A1D24] animate-pulse" />}>
                <PubMap
                  pins={breweries.map((b: any) => ({ id: b.id, name: b.name, slug: b.slug, latitude: String(b.latitude || ""), longitude: String(b.longitude || ""), logoUrl: b.logoUrl, type: "brewery" as const }))}
                  height="100%"
                  userLocation={userLocation ?? undefined}
                  radiusKm={quickFilter === "nearby" && userLocation ? distanceKm : undefined}
                  onError={() => setMapVisible(false)}
                />
              </Suspense>
            </div>
          )}

          {/* Quick filter chips — distance chip outside overflow to avoid dropdown clipping */}
          <div className="flex items-center gap-2 pb-1">
            {/* Distance chip (only shown when nearby active) */}
            {quickFilter === "nearby" && (
              <div className="flex-shrink-0">
                <button
                  ref={distBtnRef}
                  onClick={() => {
                    if (showDistPicker) { setShowDistPicker(false); return; }
                    const r = distBtnRef.current?.getBoundingClientRect();
                    if (r) setDistPickerPos({ top: r.bottom + 6, left: r.left });
                    setShowDistPicker(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border bg-primary text-white border-primary tap-scale"
                >
                  Entro {distanceKm} km ▾
                </button>
                {showDistPicker && distPickerPos && (
                  <>
                    <div className="fixed inset-0 z-[199]" onClick={() => setShowDistPicker(false)} />
                    <div
                      className="fixed z-[200] bg-white dark:bg-[#1A1D24] border border-stone-100 dark:border-[#23262E] rounded-2xl shadow-xl overflow-hidden min-w-[110px]"
                      style={{ top: distPickerPos.top, left: distPickerPos.left }}
                    >
                      {[1, 5, 10, 15, 20, 30, 50].map(d => (
                        <button
                          key={d}
                          onClick={() => { setDistanceKm(d); setShowDistPicker(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors ${distanceKm === d ? 'text-primary bg-orange-50 dark:bg-orange-900/20' : 'text-foreground hover:bg-stone-50 dark:hover:bg-white/5'}`}
                        >
                          {d} km
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Scrollable filter chips */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mr-4 pr-4 lg:-mr-6 lg:pr-6">
              {QUICK_FILTERS.filter(f => f.key !== "all" || quickFilter === "all").map(f => (
                <button
                  key={f.key}
                  onClick={() => handleQuickFilter(f.key)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 tap-scale ${
                    quickFilter === f.key
                      ? "bg-primary text-white border-primary shadow-sm"
                      : f.key === "all"
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl text-stone-600 dark:text-stone-300 border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-primary/30 active:scale-[0.99]"
                  }`}
                >
                  {f.icon}
                  {f.label}
                </button>
              ))}
            </div>
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
                    className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all duration-200 tap-scale ${
                      isItaly
                        ? "bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/30"
                        : "bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl text-stone-500 dark:text-stone-400 border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-primary/30 active:scale-[0.99]"
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
        </PageContainer>

        {/* Result count */}
        <PageContainer variant="wide" className="pb-2">
          <p className="text-[11px] text-stone-400 dark:text-stone-500 font-medium">
            {isLoading ? "Caricamento…" : `${total.toLocaleString("it-IT")} birrifici trovati`}
            {quickFilter === "italian" ? " italiani" : quickFilter === "international" ? " internazionali" : ""}
            {quickFilter === "nearby" && userLocation ? ` · Ordina: Distanza` : ""}
          </p>
        </PageContainer>
      </div>

      {/* ── Content ── */}
      <PageContainer as="main" variant="wide" className="pt-3 pb-28 lg:pb-12">
        {showError ? (
          <EmptyState
            icon={<Beer className="h-8 w-8 text-stone-400" />}
            title="Qualcosa è andato storto"
            subtitle="Non siamo riusciti a caricare i birrifici. Controlla la connessione e riprova."
            ctaLabel="Riprova"
            onCta={retry}
            size="lg"
          />
        ) : isLoading ? (
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
                <BreweryListCard key={brewery.id} brewery={brewery} showDist={quickFilter === "nearby" && !!userLocation} userLocation={userLocation} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <button
                  disabled={page <= 1}
                  onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-bold border border-white/40 dark:border-white/[0.06] text-stone-600 dark:text-stone-300 disabled:opacity-40 tap-scale bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-primary/30 active:scale-[0.99] transition-all duration-200"
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
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-bold border border-white/40 dark:border-white/[0.06] text-stone-600 dark:text-stone-300 disabled:opacity-40 tap-scale bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-primary/30 active:scale-[0.99] transition-all duration-200"
                >
                  Successiva
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </PageContainer>

    </div>
  );
}

function FeaturedCard({ brewery }: { brewery: any }) {
  const [imgErr, setImgErr] = useState(false);
  const isItalian = brewery.country === "Italy" || brewery.country === "Italia";

  return (
    <Link href={`/brewery/${brewery.id}`}>
      <div className="flex-shrink-0 w-40 cursor-pointer">
        <div className="relative w-40 h-28 rounded-2xl overflow-hidden bg-stone-200 dark:bg-[#1A1D24] mb-2">
          {!imgErr && (brewery.coverImageUrl || brewery.logoUrl) ? (
            <img
              src={brewery.coverImageUrl || brewery.logoUrl}
              alt={brewery.name}
              loading="lazy"
              decoding="async"
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

function BreweryListCard({ brewery, showDist, userLocation }: { brewery: any; showDist: boolean; userLocation: { lat: number; lng: number } | null }) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imgErr, setImgErr] = useState(false);
  const [route, setRoute] = useState<{ km: number; durS: number; isStraight: boolean } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const canRoute = !!userLocation && brewery.latitude && brewery.longitude && brewery._distReal == null;
  const calcRoute = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!userLocation || routeLoading) return;
    setRouteLoading(true);
    try {
      const url = `/api/route?fromLat=${userLocation.lat}&fromLng=${userLocation.lng}&toLat=${parseFloat(brewery.latitude)}&toLng=${parseFloat(brewery.longitude)}&mode=driving`;
      const r = await fetch(url);
      if (r.ok) {
        const j = await r.json();
        setRoute({ km: j.distanceM / 1000, durS: j.durationS, isStraight: !!j.isStraightLine });
      }
    } catch {} finally { setRouteLoading(false); }
  };
  const fmtDur = (s: number) => s < 60 ? "<1 min" : s < 3600 ? `${Math.round(s / 60)} min` : `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m`;

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
    <div className="flex items-center gap-3 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden hover:border-primary/30 active:scale-[0.99] transition-all duration-200">
      {/* Logo */}
      <Link href={`/brewery/${brewery.id}`} className="flex-shrink-0">
        <div className="w-16 h-16 bg-stone-100 dark:bg-[#1A1D24] flex items-center justify-center">
          {!imgErr && brewery.logoUrl ? (
            <img
              src={brewery.logoUrl}
              alt={brewery.name}
              loading="lazy"
              decoding="async"
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
          {showDist && dist != null ? ` · ${formatDist(dist)}${brewery._distReal != null && brewery._distAir != null ? ` su strada · ${formatDist(brewery._distAir)} in linea d'aria` : ""}` : ""}
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
          {(route || brewery._distReal != null) && (
            <span className="text-[11px] font-semibold text-primary flex items-center gap-0.5">
              <Navigation className="w-2.5 h-2.5" />
              {route
                ? `${formatDist(route.km)} · ${fmtDur(route.durS)}${route.isStraight ? " (stima)" : ""}`
                : `${formatDist(brewery._distReal)} su strada`}
            </span>
          )}
          {showDist && canRoute && !route && (
            <button
              onClick={calcRoute}
              disabled={routeLoading}
              className="text-[10px] font-bold text-primary border border-primary/40 rounded-full px-2 py-0.5 tap-scale hover:bg-primary/10"
              data-testid={`btn-calc-route-brewery-${brewery.id}`}
            >
              {routeLoading ? "..." : "Calcola percorso"}
            </button>
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
                ? "bg-stone-100 dark:bg-[#1A1D24] text-stone-500 border-stone-200 dark:border-[#23262E]"
                : "bg-white dark:bg-[#1A1D24]/60 text-stone-500 border-stone-200 dark:border-[#23262E]"
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
