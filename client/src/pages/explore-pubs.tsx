import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useRef, Suspense, lazy } from "react";
import { Link, useSearch } from "wouter";
import { MapPin, Store, Map, Search, X, Star, ChevronRight, SlidersHorizontal, Navigation, Bookmark } from "lucide-react";
import { PubMap } from "@/components/pub-map";

const HomepageMap = lazy(() => import("@/components/homepage-map"));

type ViewMode = "list" | "map";
type QuickFilter = "all" | "nearby" | "top" | "open";

function isOpenNow(openingHours: any): boolean {
  if (!openingHours) return false;
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const todayDate = now.toISOString().slice(0, 10);
  const specialDays: any[] = openingHours.specialDays ?? [];
  const specialToday = specialDays.find((s: any) => s.date === todayDate);
  const hours = specialToday ?? openingHours[['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][now.getDay()]];
  if (!hours || hours.isClosed) return false;
  if (hours.open && hours.close) {
    const [oh, om] = hours.open.split(':').map(Number);
    const [ch, cm] = hours.close.split(':').map(Number);
    const openTime = oh * 60 + om;
    const closeTime = ch * 60 + cm;
    return closeTime < openTime
      ? (currentTime >= openTime || currentTime <= closeTime)
      : (currentTime >= openTime && currentTime <= closeTime);
  }
  return true;
}

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

export default function ExplorePubs() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const initialView: ViewMode = params.get("view") === "map" ? "map" : "list";

  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [distanceKm, setDistanceKm] = useState(10);
  const [showDistPicker, setShowDistPicker] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(() => {
    try { const c = localStorage.getItem("fermenta:userLocation"); return c ? JSON.parse(c) : null; } catch { return null; }
  });

  const inputRef = useRef<HTMLInputElement>(null);

  const { data: allPubs, isLoading } = useQuery({
    queryKey: ["/api/pubs/all"],
    queryFn: () => fetch("/api/pubs/all").then(r => r.json()),
  });

  const pubsArr: any[] = Array.isArray(allPubs) ? allPubs : [];

  const pubsWithDist = useMemo(() => pubsArr.map((p: any) => {
    if (userLocation && p.latitude && p.longitude) {
      const dist = haversineDist(userLocation.lat, userLocation.lng, parseFloat(p.latitude), parseFloat(p.longitude));
      return { ...p, _dist: dist };
    }
    return { ...p, _dist: null };
  }), [pubsArr, userLocation]);

  const filtered = useMemo(() => {
    let arr = pubsWithDist;
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((p: any) => p.name?.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q) || p.region?.toLowerCase().includes(q));
    }
    if (quickFilter === "nearby" && userLocation) {
      arr = arr.filter((p: any) => p._dist != null && p._dist <= distanceKm);
    }
    if (quickFilter === "open") {
      arr = arr.filter((p: any) => isOpenNow(p.openingHours));
    }
    if (quickFilter === "top") {
      arr = [...arr].sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
    }
    if (quickFilter === "nearby" && userLocation) {
      arr = [...arr].sort((a, b) => (a._dist ?? 999) - (b._dist ?? 999));
    }
    return arr;
  }, [pubsWithDist, search, quickFilter, userLocation, distanceKm]);

  const popular = useMemo(() => {
    return [...pubsWithDist]
      .filter((p: any) => p.coverImageUrl || p.logoUrl)
      .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
      .slice(0, 8);
  }, [pubsWithDist]);

  const mapPins = pubsArr.map((p: any) => ({ ...p, type: "pub" as const }));

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserLocation(loc);
      try { localStorage.setItem("fermenta:userLocation", JSON.stringify(loc)); } catch {}
      setQuickFilter("nearby");
    });
  };

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
            <Store className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm font-bold text-foreground">{pubsArr.length} locali</span>
          </div>
        </div>
        {isLoading ? (
          <div className="w-full h-full bg-stone-100 dark:bg-stone-800 animate-pulse" />
        ) : (
          <PubMap pins={mapPins} height="100%" />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F4F0] dark:bg-background slide-up lg:flex lg:items-start">
      <Helmet>
        <title>Pub e Birrerie Artigianali in Italia | Fermenta.to</title>
        <meta name="description" content="Trova pub, birrerie e locali craft beer in Italia. Consulta taplist in tempo reale, orari e posizione su mappa." />
      </Helmet>

      {/* ── LEFT COLUMN ── */}
      <div className="lg:flex-1 lg:min-w-0 min-h-screen">

      {/* ── Sticky header ── */}
      <div className="sticky top-14 lg:top-16 z-30 bg-white/95 dark:bg-[hsl(25,14%,8%)]/95 backdrop-blur-md border-b border-stone-100 dark:border-stone-800">
        <div className="px-4 pt-3 pb-2">
          {/* Title row */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-extrabold text-foreground">Esplora Pub</h1>
              <p className="text-xs text-stone-400 dark:text-stone-500">Scopri i migliori pub vicino a te</p>
            </div>
            <button
              onClick={() => setViewMode("map")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 tap-scale border border-stone-200 dark:border-stone-700"
            >
              <Map className="w-3.5 h-3.5 text-primary" />
              Mappa
            </button>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 bg-stone-100 dark:bg-stone-800 rounded-2xl px-3 py-2.5 mb-3">
            <Search className="h-4 w-4 text-stone-400 flex-shrink-0" />
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca pub, città o indirizzo…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-stone-400 dark:placeholder:text-stone-500 outline-none min-w-0 font-medium"
            />
            {search
              ? <button onClick={() => setSearch("")} className="tap-scale"><X className="h-4 w-4 text-stone-400" /></button>
              : <SlidersHorizontal className="h-4 w-4 text-stone-400" />
            }
          </div>

          {/* Distance + filter chips */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            {/* Distance chip */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowDistPicker(v => !v)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-all tap-scale ${
                  quickFilter === "nearby"
                    ? "bg-primary text-white border-primary"
                    : "bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700"
                }`}
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
                        onClick={() => { setDistanceKm(d); setShowDistPicker(false); if (userLocation) setQuickFilter("nearby"); else handleLocate(); }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors ${distanceKm === d ? 'text-primary bg-orange-50 dark:bg-orange-900/20' : 'text-foreground hover:bg-muted'}`}
                      >
                        {d} km
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {[
              { key: "nearby" as QuickFilter, label: "Vicino a te", icon: <Navigation className="w-3 h-3" /> },
              { key: "top" as QuickFilter, label: "Top rated", icon: <Star className="w-3 h-3" /> },
              { key: "open" as QuickFilter, label: "Aperti ora", icon: <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => { setQuickFilter(prev => prev === f.key ? "all" : f.key); if (f.key === "nearby" && !userLocation) handleLocate(); }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all tap-scale ${
                  quickFilter === f.key
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700"
                }`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {!isLoading && (
          <div className="px-4 pb-2">
            <p className="text-[11px] text-stone-400 dark:text-stone-500 font-medium">
              {search || quickFilter !== "all"
                ? `${filtered.length} risultati`
                : `${pubsArr.length} ${pubsArr.length === 1 ? 'locale' : 'locali'} in Italia`
              }
            </p>
          </div>
        )}
      </div>

      {/* ── Mini map (mobile/tablet only) ── */}
      {!search && quickFilter !== "top" && (
        <div className="px-4 pt-4 lg:hidden">
          <div className="relative rounded-2xl overflow-hidden bg-stone-200 dark:bg-stone-800" style={{ height: 280 }}>
            <Suspense fallback={<div className="w-full h-full bg-stone-200 dark:bg-stone-800 animate-pulse" />}>
              <HomepageMap
                pubs={pubsArr}
                breweries={[]}
                userLocation={userLocation}
                showPubs={true}
                showBreweries={false}
                distanceKm={quickFilter === "nearby" && userLocation ? distanceKm : undefined}
                onLocate={loc => { setUserLocation(loc); setQuickFilter("nearby"); }}
              />
            </Suspense>
            <button
              onClick={handleLocate}
              className="absolute top-2 right-2 z-20 w-8 h-8 rounded-xl flex items-center justify-center bg-white/90 dark:bg-card/90 shadow-md tap-scale"
            >
              <Navigation className="w-4 h-4 text-primary" />
            </button>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <main className="px-4 py-4 pb-28 lg:pb-12 max-w-2xl mx-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-card rounded-2xl h-20 animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mx-auto mb-4">
              <Store className="h-8 w-8 text-stone-400" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">Nessun locale trovato</h3>
            <p className="text-sm text-muted-foreground">Prova con un'altra ricerca o rimuovi i filtri</p>
            <button
              onClick={() => { setSearch(""); setQuickFilter("all"); }}
              className="mt-4 px-5 py-2 rounded-2xl bg-primary text-white text-sm font-bold tap-scale"
            >
              Rimuovi filtri
            </button>
          </div>
        ) : (
          <>
            {/* Popular horizontal scroll (only when no active filter) */}
            {!search && quickFilter === "all" && popular.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="text-[15px] font-extrabold text-foreground">Popolari vicino a te</h2>
                  <button onClick={() => setViewMode("map")} className="text-xs font-bold text-primary">Vedi tutti</button>
                </div>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
                  {popular.map((pub: any) => (
                    <Link key={pub.id} href={pub.slug ? `/pub/${pub.slug}` : `/pub/${pub.id}`}>
                      <div className="flex-shrink-0 w-36 cursor-pointer">
                        <div className="relative w-36 h-28 rounded-2xl overflow-hidden bg-stone-200 dark:bg-stone-800 mb-2">
                          <img
                            src={pub.coverImageUrl || pub.logoUrl}
                            alt={pub.name}
                            className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          {isOpenNow(pub.openingHours) && (
                            <div className="absolute top-2 left-2">
                              <span className="text-[10px] font-bold text-white bg-green-500 rounded-full px-1.5 py-0.5">Aperto</span>
                            </div>
                          )}
                          {pub._dist != null && (
                            <div className="absolute bottom-2 right-2">
                              <span className="text-[10px] font-bold text-white bg-black/50 rounded-full px-1.5 py-0.5">{formatDist(pub._dist)}</span>
                            </div>
                          )}
                        </div>
                        <p className="font-bold text-[13px] text-foreground truncate">{pub.name}</p>
                        <p className="text-[11px] text-stone-400 truncate">{pub.city}</p>
                        {parseFloat(pub.rating) > 0 && (
                          <div className="flex items-center gap-0.5 mt-0.5">
                            <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                            <span className="text-[11px] font-bold text-amber-500">{parseFloat(pub.rating).toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* List */}
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold text-foreground">
                {quickFilter === "nearby" ? "Vicino a te" : quickFilter === "top" ? "Top rated" : quickFilter === "open" ? "Aperti ora" : "Tutti i pub"}
              </h2>
              {filtered.length > 1 && (
                <span className="text-xs text-stone-400 font-medium">
                  Ordina: {quickFilter === "nearby" && userLocation ? "Distanza" : "Nome"} ▾
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {filtered.map((pub: any) => (
                <PubListCard key={pub.id} pub={pub} showDist={quickFilter === "nearby" && userLocation != null} />
              ))}
            </div>
          </>
        )}
      </main>

      </div>{/* end LEFT COLUMN */}

      {/* ── RIGHT COLUMN: Map (desktop only) ── */}
      <div className="hidden lg:flex lg:flex-col lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:w-[420px] xl:w-[500px] lg:flex-shrink-0 border-l border-stone-100 dark:border-stone-800 overflow-hidden">
        <Suspense fallback={<div className="w-full h-full bg-stone-100 dark:bg-stone-800 animate-pulse" />}>
          <HomepageMap
            pubs={pubsArr}
            breweries={[]}
            userLocation={userLocation}
            showPubs={true}
            showBreweries={false}
            distanceKm={quickFilter === "nearby" && userLocation ? distanceKm : undefined}
            onLocate={loc => { setUserLocation(loc); setQuickFilter("nearby"); }}
          />
        </Suspense>
      </div>

    </div>
  );
}

function PubListCard({ pub, showDist }: { pub: any; showDist: boolean }) {
  const open = isOpenNow(pub.openingHours);
  const hasHours = !!pub.openingHours;
  const [imgErr, setImgErr] = useState(false);

  return (
    <Link href={pub.slug ? `/pub/${pub.slug}` : `/pub/${pub.id}`}>
      <div className="flex items-center gap-3 bg-white dark:bg-card rounded-2xl p-3 shadow-sm border border-stone-100 dark:border-stone-800/60 active:scale-[0.98] transition-transform cursor-pointer">
        {/* Cover / Logo */}
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 flex-shrink-0">
          {!imgErr && (pub.coverImageUrl || pub.logoUrl) ? (
            <img
              src={pub.coverImageUrl || pub.logoUrl}
              alt={pub.name}
              className="w-full h-full object-cover"
              onError={() => setImgErr(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Store className="w-6 h-6 text-stone-300" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[14px] text-foreground truncate">{pub.name}</p>
          <p className="text-[12px] text-stone-400 dark:text-stone-500 truncate mt-0.5">
            {[pub.city, pub.region].filter(Boolean).join(", ")}
            {showDist && pub._dist != null ? ` · ${formatDist(pub._dist)}` : ""}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {parseFloat(pub.rating) > 0 && (
              <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-[12px] font-bold text-amber-500">{parseFloat(pub.rating).toFixed(1)}</span>
              </span>
            )}
            {hasHours && (
              <span className={`text-[11px] font-bold ${open ? 'text-green-500' : 'text-red-400'}`}>
                {open ? "Aperto" : "Chiuso"}
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-4 h-4 text-stone-300 dark:text-stone-600 flex-shrink-0" />
      </div>
    </Link>
  );
}
