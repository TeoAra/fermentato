import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  MapPin, Building2, Navigation, LocateFixed, Search,
  Clock, ExternalLink, RefreshCw, AlertCircle, X, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useGeolocation } from "@/hooks/useGeolocation";
import ImageWithFallback from "@/components/image-with-fallback";
import Footer from "@/components/footer";

// ── Opening-hours helper ──────────────────────────────────────────────────────
function isOpenNow(openingHours: any): boolean {
  if (!openingHours) return false;
  const now = new Date();
  const todayDate = now.toISOString().slice(0, 10);
  const dayName = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][now.getDay()];
  const specialDays: any[] = openingHours.specialDays ?? [];
  const special = specialDays.find((s: any) => s.date === todayDate);
  const hours = special ?? openingHours[dayName];
  if (!hours || hours.isClosed) return false;
  if (hours.open && hours.close) {
    const cur = now.getHours() * 60 + now.getMinutes();
    const [oh, om] = hours.open.split(":").map(Number);
    const [ch, cm] = hours.close.split(":").map(Number);
    const openT = oh * 60 + om;
    const closeT = ch * 60 + cm;
    return closeT < openT
      ? (cur >= openT || cur <= closeT)
      : (cur >= openT && cur <= closeT);
  }
  return true;
}

function fmtDist(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function directionsUrl(lat: string | number, lng: string | number, name: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(name)}`;
}

// ── Card components ───────────────────────────────────────────────────────────
function PubCard({ pub, onlyOpen }: { pub: any; onlyOpen: boolean }) {
  const open = isOpenNow(pub.openingHours);
  if (onlyOpen && !open) return null;
  const href = `/pub/${pub.id}`;
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-primary/30 active:scale-[0.99] transition-all">
      <Link href={href} className="flex items-center gap-3 flex-1 min-w-0">
        <ImageWithFallback
          src={pub.logoUrl}
          alt={pub.name}
          imageType="pub"
          containerClassName="w-12 h-12 flex-shrink-0 rounded-xl"
          className="w-12 h-12 object-cover rounded-xl"
        />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-foreground truncate">{pub.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {pub.city && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5 flex-shrink-0" />{pub.city}
              </span>
            )}
            {open !== null && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${open ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-stone-100 dark:bg-stone-800 text-stone-500"}`}>
                {open ? "● Aperto" : "● Chiuso"}
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-2 flex-shrink-0">
        {pub.distanceKm != null && (
          <span className="text-xs font-bold text-primary dark:text-orange-400 bg-primary/10 px-2 py-1 rounded-full">
            {fmtDist(parseFloat(pub.distanceKm))}
          </span>
        )}
        <a
          href={directionsUrl(pub.latitude, pub.longitude, pub.name)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
          title="Indicazioni stradali"
        >
          <Navigation className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

function BreweryCard({ brewery, onlyOpen }: { brewery: any; onlyOpen: boolean }) {
  // Breweries rarely publish opening hours, so only filter if onlyOpen is off
  if (onlyOpen) return null; // breweries don't have reliable opening_hours
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-primary/30 active:scale-[0.99] transition-all">
      <Link href={`/brewery/${brewery.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        <ImageWithFallback
          src={brewery.logoUrl}
          alt={brewery.name}
          imageType="brewery"
          containerClassName="w-12 h-12 flex-shrink-0 rounded-full"
          className="w-12 h-12 object-cover rounded-full"
        />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-foreground truncate">{brewery.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {brewery.location && (
              <span className="text-xs text-muted-foreground truncate">{brewery.location}</span>
            )}
            {brewery.beerCount > 0 && (
              <span className="text-[10px] text-muted-foreground">· {brewery.beerCount} birr{brewery.beerCount === 1 ? "a" : "e"}</span>
            )}
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-2 flex-shrink-0">
        {brewery._distance != null && (
          <span className="text-xs font-bold text-primary dark:text-orange-400 bg-primary/10 px-2 py-1 rounded-full">
            {fmtDist(parseFloat(brewery._distance))}
          </span>
        )}
        <a
          href={directionsUrl(brewery.latitude, brewery.longitude, brewery.name)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
          title="Indicazioni stradali"
        >
          <Navigation className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

// ── Permission / onboarding screens ──────────────────────────────────────────
function PermissionScreen({ onRequest }: { onRequest: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-lg">
        <LocateFixed className="w-12 h-12 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">Scopri cosa c'è vicino a te</h2>
      <p className="text-sm text-muted-foreground max-w-xs mb-8 leading-relaxed">
        Pub e birrifici ordinati per distanza dalla tua posizione attuale. Il permesso è usato solo in questa pagina.
      </p>
      <Button onClick={onRequest} className="bg-primary hover:bg-primary/90 text-white rounded-2xl h-12 px-8 text-base font-bold shadow-md">
        <LocateFixed className="w-5 h-5 mr-2" />
        Usa la mia posizione
      </Button>
    </div>
  );
}

function DeniedScreen({
  error,
  cityQuery,
  setCityQuery,
  onCitySearch,
  onRetry,
}: {
  error: string | null;
  cityQuery: string;
  setCityQuery: (v: string) => void;
  onCitySearch: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-orange-500" />
      </div>
      <h2 className="text-lg font-bold text-foreground mb-1">Posizione non disponibile</h2>
      <p className="text-xs text-muted-foreground max-w-xs mb-6 leading-relaxed">
        {error ?? "Abilita la geolocalizzazione nelle impostazioni e riprova."}
      </p>
      <Button variant="outline" size="sm" onClick={onRetry} className="rounded-xl mb-6 border-stone-200">
        <RefreshCw className="w-4 h-4 mr-1.5" /> Riprova
      </Button>
      <div className="w-full max-w-xs">
        <p className="text-xs font-bold text-muted-foreground mb-2">In alternativa, cerca per città:</p>
        <form onSubmit={e => { e.preventDefault(); onCitySearch(); }} className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={cityQuery}
              onChange={e => setCityQuery(e.target.value)}
              placeholder="Es. Milano, Roma…"
              className="pl-9 h-10 rounded-xl border-stone-200 dark:border-border text-sm"
            />
          </div>
          <Button type="submit" className="rounded-xl h-10 px-4 bg-primary text-white">
            <Search className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function RequestingScreen() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="relative w-20 h-20 mb-5 flex items-center justify-center">
        <span aria-hidden="true" className="gps-radar absolute inset-2 rounded-full" />
        <div className="relative w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <LocateFixed className="w-8 h-8 text-primary" />
        </div>
      </div>
      <p className="text-sm font-semibold text-foreground">Individuazione posizione in corso…</p>
      <p className="text-xs text-muted-foreground mt-1">Il segnale GPS si sta agganciando</p>
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
type ActiveTab = "all" | "pubs" | "breweries";

// ── Main page ─────────────────────────────────────────────────────────────────
export default function NearbyPage() {
  const geo = useGeolocation();
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [radius, setRadius] = useState(15);
  const [cityQuery, setCityQuery] = useState("");
  const [citySearch, setCitySearch] = useState(""); // committed city for city-mode

  // City-mode: when geo is denied/unsupported, user can search by city
  // We reuse the /api/search?q=CITY&type=pubs endpoint for city fallback
  const cityMode = geo.status === "denied" || geo.status === "error" || geo.status === "unsupported";
  const useCityFallback = cityMode && citySearch.length >= 2;

  const { data: nearbyPubs, isLoading: loadingPubs } = useQuery<any[]>({
    queryKey: ["/api/pubs/nearby", geo.lat, geo.lng, radius],
    queryFn: () => fetch(`/api/pubs/nearby?lat=${geo.lat}&lng=${geo.lng}&radius=${radius}&limit=50`).then(r => r.json()),
    enabled: geo.status === "granted" && geo.lat != null && geo.lng != null,
    staleTime: 2 * 60 * 1000,
  });

  const { data: nearbyBreweries, isLoading: loadingBreweries } = useQuery<any[]>({
    queryKey: ["/api/breweries/nearby", geo.lat, geo.lng],
    queryFn: () => fetch(`/api/breweries/nearby?lat=${geo.lat}&lng=${geo.lng}&limit=20`).then(r => r.json()),
    enabled: geo.status === "granted" && geo.lat != null && geo.lng != null,
    staleTime: 2 * 60 * 1000,
  });

  // City fallback: search pubs by city name
  const { data: cityPubsResult, isLoading: loadingCityPubs } = useQuery<any>({
    queryKey: ["/api/search", citySearch, "pubs"],
    queryFn: () => fetch(`/api/search?q=${encodeURIComponent(citySearch)}&type=pubs&city=${encodeURIComponent(citySearch)}`).then(r => r.json()),
    enabled: useCityFallback,
    staleTime: 2 * 60 * 1000,
  });

  const cityPubs: any[] = useCityFallback ? (cityPubsResult?.pubs ?? []) : [];
  const pubs: any[] = (geo.status === "granted" ? (nearbyPubs ?? []) : cityPubs);
  const breweries: any[] = geo.status === "granted" ? (nearbyBreweries ?? []) : [];

  const isLoading = loadingPubs || loadingBreweries || loadingCityPubs;

  const tabs: { id: ActiveTab; label: string; icon: any; count: number }[] = [
    { id: "all", label: "Tutto", icon: MapPin, count: pubs.length + breweries.length },
    { id: "pubs", label: "Pub", icon: MapPin, count: pubs.length },
    { id: "breweries", label: "Birrifici", icon: Building2, count: breweries.length },
  ];

  const showPubs = activeTab === "all" || activeTab === "pubs";
  const showBreweries = (activeTab === "all" || activeTab === "breweries") && !onlyOpen;
  const noResults = !isLoading && geo.status === "granted" && pubs.length === 0 && breweries.length === 0;

  return (
    <>
      <Helmet>
        <title>Vicino a te — Pub e birrifici | Fermenta.to</title>
        <meta name="description" content="Scopri pub e birrifici artigianali vicini a te, ordinati per distanza." />
      </Helmet>
      <div className="min-h-screen bg-background">

        {/* ── Sticky header ── */}
        <div className="bg-white dark:bg-card border-b border-stone-100 dark:border-border sticky top-[var(--mobile-top-offset)] lg:top-16 z-40">
          <div className="max-w-2xl mx-auto px-4 pt-4 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <LocateFixed className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-foreground font-bold text-lg leading-tight">Vicino a te</h1>
                <p className="text-muted-foreground text-xs">
                  {geo.status === "granted" && geo.lat != null
                    ? `Raggio ${radius} km · ${pubs.length + breweries.length} trovati`
                    : "Pub e birrifici intorno a te"}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Radius selector */}
                {geo.status === "granted" && (
                  <select
                    value={radius}
                    onChange={e => setRadius(Number(e.target.value))}
                    className="h-9 text-xs rounded-xl border border-stone-200 dark:border-border bg-white dark:bg-[#1A1D24] px-2 text-foreground font-medium"
                  >
                    {[3, 5, 10, 15, 25, 50].map(r => (
                      <option key={r} value={r}>{r} km</option>
                    ))}
                  </select>
                )}
                {/* Refresh position */}
                {geo.status === "granted" && (
                  <button
                    onClick={geo.request}
                    className="w-9 h-9 rounded-xl border border-stone-200 dark:border-border flex items-center justify-center text-primary hover:bg-stone-50 dark:hover:bg-[#1A1D24] transition-colors"
                    title="Aggiorna posizione"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick filters */}
            {geo.status === "granted" && (
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                {tabs.map(t => (
                  <button key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      activeTab === t.id
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-stone-50 dark:bg-[#1A1D24] text-stone-600 dark:text-stone-300 border-stone-200 dark:border-border hover:border-primary/40"
                    }`}>
                    {t.label}
                    {t.count > 0 && (
                      <span className={`text-[10px] font-bold ${activeTab === t.id ? "opacity-70" : "text-primary dark:text-orange-400"}`}>
                        {t.count}
                      </span>
                    )}
                  </button>
                ))}
                <button
                  onClick={() => setOnlyOpen(v => !v)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    onlyOpen
                      ? "bg-green-500 text-white border-green-500"
                      : "bg-stone-50 dark:bg-[#1A1D24] text-stone-600 dark:text-stone-300 border-stone-200 dark:border-border"
                  }`}>
                  <Clock className="w-3 h-3" />
                  Solo aperti
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="max-w-2xl mx-auto px-4 py-4 pb-28 sm:pb-10">

          {/* Permission request */}
          {geo.status === "idle" && <PermissionScreen onRequest={geo.request} />}

          {/* Requesting */}
          {geo.status === "requesting" && <RequestingScreen />}

          {/* Denied / error / unsupported */}
          {cityMode && (
            <DeniedScreen
              error={geo.error}
              cityQuery={cityQuery}
              setCityQuery={setCityQuery}
              onCitySearch={() => setCitySearch(cityQuery)}
              onRetry={geo.request}
            />
          )}

          {/* City results */}
          {useCityFallback && !loadingCityPubs && cityPubs.length > 0 && (
            <div className="space-y-2 mt-4">
              <p className="text-xs text-muted-foreground font-semibold mb-3">
                Pub in <span className="text-foreground">{citySearch}</span> ({cityPubs.length})
              </p>
              {cityPubs.map((pub: any) => (
                <Link key={pub.id} href={`/pub/${pub.id}`}>
                  <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:border-primary/30 active:scale-[0.99] transition-all cursor-pointer">
                    <ImageWithFallback
                      src={pub.logoUrl}
                      alt={pub.name}
                      imageType="pub"
                      containerClassName="w-11 h-11 flex-shrink-0 rounded-xl"
                      className="w-11 h-11 object-cover rounded-xl"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-foreground truncate">{pub.name}</div>
                      {pub.city && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5" />{pub.city}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Skeleton loader */}
          {isLoading && geo.status === "granted" && (
            <div className="space-y-2.5">
              {[...Array(6)].map((_, i) => (
                <div key={i}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-white/40 dark:border-white/[0.06] result-reveal"
                  style={{ animationDelay: `${i * 55}ms` }}>
                  <div className="w-12 h-12 rounded-xl skeleton-shimmer flex-shrink-0" />
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="h-3.5 w-1/2 rounded skeleton-shimmer" />
                    <div className="h-2.5 w-1/3 rounded skeleton-shimmer" />
                  </div>
                  <div className="h-6 w-14 rounded-full skeleton-shimmer flex-shrink-0" />
                </div>
              ))}
            </div>
          )}

          {/* No results */}
          {noResults && (
            <div className="text-center py-14">
              <div className="w-16 h-16 rounded-full bg-stone-50 dark:bg-[#0B0D10]/30 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-primary/30" />
              </div>
              <p className="font-bold text-foreground">Nessun locale trovato</p>
              <p className="text-sm text-muted-foreground mt-1">
                Prova ad aumentare il raggio o cerca in una città
              </p>
              <Button variant="outline" size="sm" onClick={() => setRadius(50)} className="mt-4 rounded-xl border-stone-200 text-primary">
                Espandi a 50 km
              </Button>
            </div>
          )}

          {/* Results */}
          {!isLoading && geo.status === "granted" && (pubs.length > 0 || breweries.length > 0) && (
            <div className="space-y-4">

              {/* Pub section */}
              {showPubs && pubs.length > 0 && (
                <section>
                  {activeTab === "all" && (
                    <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-500" />
                      Pub vicini
                      <span className="font-normal text-muted-foreground/60 normal-case tracking-normal">({pubs.length})</span>
                    </h2>
                  )}
                  <div className="space-y-2">
                    {pubs.map((pub: any, i: number) => (
                      <div key={pub.id} className="result-reveal" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                        <PubCard pub={pub} onlyOpen={onlyOpen} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Brewery section */}
              {showBreweries && breweries.length > 0 && (
                <section>
                  {activeTab === "all" && (
                    <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5 mt-4">
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                      Birrifici vicini
                      <span className="font-normal text-muted-foreground/60 normal-case tracking-normal">({breweries.length})</span>
                    </h2>
                  )}
                  <div className="space-y-2">
                    {breweries.map((b: any, i: number) => (
                      <div key={b.id} className="result-reveal" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                        <BreweryCard brewery={b} onlyOpen={onlyOpen} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Position info footer */}
              <div className="pt-4 border-t border-stone-100 dark:border-border flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 gps-fix-pop">
                  <span className="gps-dot-pulse inline-block w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  <LocateFixed className="w-3.5 h-3.5 text-primary" />
                  Posizione acquisita
                </span>
                <button
                  onClick={geo.clear}
                  className="flex items-center gap-1 hover:text-destructive transition-colors"
                >
                  <X className="w-3 h-3" /> Cancella posizione
                </button>
              </div>
            </div>
          )}

          {/* Explore CTA */}
          {geo.status !== "idle" && geo.status !== "requesting" && (
            <div className="mt-6 p-4 rounded-2xl bg-stone-50 dark:bg-[#1A1D24] border border-stone-100 dark:border-border flex items-center gap-3">
              <Search className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Vuoi cercare ovunque?</p>
                <p className="text-xs text-muted-foreground">Esplora tutti i pub e birrifici in Italia</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link href="/explore-pubs">
                  <Button variant="outline" size="sm" className="rounded-xl text-xs border-stone-200 text-foreground h-8">
                    Pub
                  </Button>
                </Link>
                <Link href="/explore-breweries">
                  <Button variant="outline" size="sm" className="rounded-xl text-xs border-stone-200 text-foreground h-8">
                    Birrifici
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </>
  );
}
