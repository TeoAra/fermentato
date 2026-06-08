import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useSearch } from "wouter";
import { MapPin, Store, Map, Search, X, Star, ChevronRight, SlidersHorizontal, Navigation, Bookmark } from "lucide-react";
import { lazy, Suspense } from "react";
const PubMap = lazy(() => import("@/components/pub-map").then(m => ({ default: m.PubMap })));
import { EmptyState } from "@/components/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { getCurrentPosition, isGeolocationAvailable } from "@/lib/geolocation";

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
  const [mapVisible, setMapVisible] = useState(true);
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [distanceKm, setDistanceKm] = useState(10);
  const [showDistPicker, setShowDistPicker] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(() => {
    try { const c = localStorage.getItem("fermenta:userLocation"); return c ? JSON.parse(c) : null; } catch { return null; }
  });
  // Toggle: distanza in linea d'aria (default) vs percorso reale via OSRM.
  const [useRealRoute, setUseRealRoute] = useState(false);
  const [realDistances, setRealDistances] = useState<Record<number, number>>({});
  // IDs già richiesti (in-flight o completati) — evita di rilanciare l'effetto
  // quando arrivano i risultati e di duplicare le richieste.
  const requestedIdsRef = useRef<Set<number>>(new Set());

  const inputRef = useRef<HTMLInputElement>(null);

  const { data: allPubs, isLoading } = useQuery({
    queryKey: ["/api/pubs/all"],
    queryFn: () => fetch("/api/pubs/all").then(r => r.json()),
  });

  const pubsArr: any[] = Array.isArray(allPubs) ? allPubs : [];

  const pubsWithDist = useMemo(() => pubsArr.map((p: any) => {
    if (userLocation && p.latitude && p.longitude) {
      const dist = haversineDist(userLocation.lat, userLocation.lng, parseFloat(p.latitude), parseFloat(p.longitude));
      const real = useRealRoute ? realDistances[p.id] : undefined;
      return { ...p, _dist: real != null ? real : dist, _distAir: dist, _distReal: real };
    }
    return { ...p, _dist: null };
  }), [pubsArr, userLocation, useRealRoute, realDistances]);

  // Reset requestedIds quando cambiano i parametri "input" (toggle off,
  // location o filtri rilevanti) — evitiamo di rifare le stesse fetch quando
  // la lista pubs cambia per ragioni non semantiche.
  useEffect(() => {
    requestedIdsRef.current = new Set();
    if (!useRealRoute) setRealDistances({});
  }, [useRealRoute, userLocation?.lat, userLocation?.lng]);

  // Quando il toggle "percorso reale" è attivo + nearby + userLocation, calcola
  // i percorsi reali via OSRM per le prime 15 entità più vicine in linea
  // d'aria. Usa AbortController e un set di ID già richiesti per evitare
  // race condition / duplicate request quando lo state si aggiorna.
  useEffect(() => {
    if (!useRealRoute || !userLocation || quickFilter !== "nearby" || pubsArr.length === 0) return;
    const candidates = pubsArr
      .filter((p: any) => p.latitude && p.longitude)
      .map((p: any) => ({
        id: p.id as number,
        lat: parseFloat(p.latitude),
        lng: parseFloat(p.longitude),
        d: haversineDist(userLocation.lat, userLocation.lng, parseFloat(p.latitude), parseFloat(p.longitude)),
      }))
      .filter((c) => c.d <= distanceKm * 1.5)
      .sort((a, b) => a.d - b.d)
      .slice(0, 15)
      .filter((c) => !requestedIdsRef.current.has(c.id));
    if (candidates.length === 0) return;
    candidates.forEach((c) => requestedIdsRef.current.add(c.id));

    const ctrl = new AbortController();
    (async () => {
      const batch: Record<number, number> = {};
      let pending = 0;
      const flush = () => {
        if (pending > 0) {
          const snapshot = { ...batch };
          for (const k of Object.keys(snapshot)) delete batch[Number(k)];
          pending = 0;
          setRealDistances((prev) => ({ ...prev, ...snapshot }));
        }
      };
      for (const c of candidates) {
        if (ctrl.signal.aborted) return;
        try {
          const url = `/api/route?fromLat=${userLocation.lat}&fromLng=${userLocation.lng}&toLat=${c.lat}&toLng=${c.lng}&mode=driving`;
          const r = await fetch(url, { signal: ctrl.signal });
          if (!r.ok) continue;
          const j = await r.json();
          if (typeof j.distanceM === "number") {
            batch[c.id] = j.distanceM / 1000;
            pending++;
            if (pending >= 5) flush();
          }
        } catch (e) {
          if ((e as any)?.name === "AbortError") return;
        }
      }
      flush();
    })();
    return () => ctrl.abort();
    // Dipendiamo solo dagli "input" semantici: NON da realDistances, così
    // l'effetto non si rilancia ad ogni risposta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useRealRoute, userLocation?.lat, userLocation?.lng, quickFilter, distanceKm, pubsArr.length]);

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

  const handleLocate = () => {
    if (!isGeolocationAvailable()) return;
    getCurrentPosition().then(pos => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserLocation(loc);
      try { localStorage.setItem("fermenta:userLocation", JSON.stringify(loc)); } catch {}
      setQuickFilter("nearby");
    }).catch(() => {});
  };

  if (viewMode === "map") {
    const mapFilteredPins = (filtered.length > 0 ? filtered : pubsArr).map((p: any) => ({
      id: p.id, name: p.name, slug: p.slug,
      latitude: String(p.latitude || ""), longitude: String(p.longitude || ""),
      logoUrl: p.logoUrl, type: "pub" as const,
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
            <Store className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm font-bold text-foreground">
              {quickFilter !== "all" || search ? `${filtered.length} filtrati` : `${pubsArr.length} locali`}
            </span>
          </div>
        </div>
        {/* Row 2: filter chips */}
        <div className="absolute top-[3.5rem] left-3 right-3 z-50 flex items-center gap-2 overflow-x-auto scrollbar-hide pointer-events-none">
          {/* Distance */}
          <div className="relative flex-shrink-0 pointer-events-auto">
            <button
              onClick={() => setShowDistPicker(v => !v)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 tap-scale ${
                quickFilter === "nearby"
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl text-stone-700 dark:text-stone-300 border-white/50 dark:border-white/[0.1] shadow-sm hover:border-primary/30"
              }`}
            >
              Entro {distanceKm} km ▾
            </button>
            {showDistPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDistPicker(false)} />
                <div className="absolute top-9 left-0 z-50 bg-white/95 dark:bg-[#1A1D24]/95 backdrop-blur-xl border border-stone-100 dark:border-[#23262E] rounded-2xl shadow-xl overflow-hidden min-w-[110px]">
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
            { key: "open" as QuickFilter, label: "Aperti ora", icon: <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => { setQuickFilter(prev => prev === f.key ? "all" : f.key); if (f.key === "nearby") handleLocate(); }}
              className={`pointer-events-auto flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 tap-scale ${
                quickFilter === f.key
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl text-stone-600 dark:text-stone-300 border-white/50 dark:border-white/[0.1] shadow-sm hover:border-primary/30"
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
                pins={mapFilteredPins}
                height="100%"
                fullscreen
                userLocation={userLocation}
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
        <title>Pub e Birrerie Artigianali in Italia | Fermenta.to</title>
        <meta name="description" content="Trova pub, birrerie e locali craft beer in Italia. Consulta taplist in tempo reale, orari e posizione su mappa." />
      </Helmet>

      {/* ── Header (scorre con la pagina) ── */}
      <div className="bg-white/95 dark:bg-[#0B0D10]/95 backdrop-blur-md border-b border-stone-100 dark:border-[#23262E]">
        <PageContainer variant="wide" className="pt-3 pb-2">
          {/* Title row */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl lg:text-2xl font-extrabold text-foreground">Esplora Pub</h1>
              <p className="text-xs text-stone-400 dark:text-stone-500">Scopri i migliori pub vicino a te</p>
            </div>
            <button
              onClick={() => setViewMode("map")}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold bg-primary/10 dark:bg-primary/15 text-primary tap-scale border border-primary/20 hover:bg-primary/15 dark:hover:bg-primary/20 transition-colors"
            >
              <Map className="w-3.5 h-3.5" />
              Mappa
            </button>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] rounded-2xl px-3 py-2.5 mb-3 transition-all duration-200">
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

          {/* Mini mappa — si nasconde se WebGL non è disponibile */}
          {mapVisible && (
            <div className="rounded-2xl overflow-hidden border border-stone-100 dark:border-[#23262E]/60 shadow-sm h-[200px] lg:h-[220px] bg-stone-100 dark:bg-[#1A1D24] mb-3">
              <Suspense fallback={<div className="w-full h-full bg-stone-100 dark:bg-[#1A1D24] animate-pulse" />}>
                <PubMap
                  pins={(filtered.length > 0 ? filtered : pubsArr).map((p: any) => ({ id: p.id, name: p.name, slug: p.slug, latitude: String(p.latitude || ""), longitude: String(p.longitude || ""), logoUrl: p.logoUrl, type: "pub" as const }))}
                  height="100%"
                  onError={() => setMapVisible(false)}
                />
              </Suspense>
            </div>
          )}

          {/* Distance + filter chips — distance chip is outside the scroll container to avoid clipping its dropdown */}
          <div className="flex items-center gap-2 pb-1">
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowDistPicker(v => !v)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 tap-scale ${
                  quickFilter === "nearby"
                    ? "bg-primary text-white border-primary"
                    : "bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl text-stone-700 dark:text-stone-300 border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-primary/30 active:scale-[0.99]"
                }`}
              >
                Entro {distanceKm} km ▾
              </button>
              {showDistPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDistPicker(false)} />
                  <div className="absolute top-9 left-0 z-50 bg-white dark:bg-[#1A1D24] border border-stone-100 dark:border-[#23262E] rounded-2xl shadow-xl overflow-hidden min-w-[110px]">
                    {[1, 5, 10, 15, 20, 30, 50].map(d => (
                      <button
                        key={d}
                        onClick={() => { setDistanceKm(d); setShowDistPicker(false); if (userLocation) setQuickFilter("nearby"); else handleLocate(); }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors ${distanceKm === d ? 'text-primary bg-orange-50 dark:bg-orange-900/20' : 'text-foreground hover:bg-stone-50 dark:hover:bg-white/5'}`}
                      >
                        {d} km
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mr-4 pr-4 lg:-mr-6 lg:pr-6">
              {[
                { key: "nearby" as QuickFilter, label: "Vicino a te", icon: <Navigation className="w-3 h-3" /> },
                { key: "open" as QuickFilter, label: "Aperti ora", icon: <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => { setQuickFilter(prev => prev === f.key ? "all" : f.key); if (f.key === "nearby") handleLocate(); }}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 tap-scale ${
                    quickFilter === f.key
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
        </PageContainer>

        {!isLoading && (
          <PageContainer variant="wide" className="pb-2">
            <p className="text-[11px] text-stone-400 dark:text-stone-500 font-medium">
              {search || quickFilter !== "all"
                ? `${filtered.length} risultati`
                : `${pubsArr.length} ${pubsArr.length === 1 ? 'locale' : 'locali'} in Italia`
              }
            </p>
          </PageContainer>
        )}
      </div>

      {/* ── Content ── */}
      <PageContainer as="main" variant="wide" className="pt-3 pb-28 lg:pb-12">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-card rounded-2xl h-20 animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Store className="h-8 w-8 text-stone-400" />}
            title="Nessun locale trovato"
            subtitle="Prova con un'altra ricerca o rimuovi i filtri attivi."
            ctaLabel="Rimuovi filtri"
            onCta={() => { setSearch(""); setQuickFilter("all"); }}
            size="lg"
          />
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
                        <div className="relative w-36 h-28 rounded-2xl overflow-hidden bg-stone-200 dark:bg-[#1A1D24] mb-2">
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

            <div className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
              {filtered.map((pub: any) => (
                <PubListCard key={pub.id} pub={pub} showDist={quickFilter === "nearby" && userLocation != null} userLocation={userLocation} />
              ))}
            </div>
          </>
        )}
      </PageContainer>

    </div>
  );
}

function PubListCard({ pub, showDist, userLocation }: { pub: any; showDist: boolean; userLocation: { lat: number; lng: number } | null }) {
  const open = isOpenNow(pub.openingHours);
  const hasHours = !!pub.openingHours;
  const [imgErr, setImgErr] = useState(false);
  const [route, setRoute] = useState<{ km: number; durS: number; isStraight: boolean } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const canRoute = !!userLocation && pub.latitude && pub.longitude && pub._distReal == null;
  const calcRoute = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!userLocation || routeLoading) return;
    setRouteLoading(true);
    try {
      const url = `/api/route?fromLat=${userLocation.lat}&fromLng=${userLocation.lng}&toLat=${parseFloat(pub.latitude)}&toLng=${parseFloat(pub.longitude)}&mode=driving`;
      const r = await fetch(url);
      if (r.ok) {
        const j = await r.json();
        setRoute({ km: j.distanceM / 1000, durS: j.durationS, isStraight: !!j.isStraightLine });
      }
    } catch {} finally { setRouteLoading(false); }
  };
  const fmtDur = (s: number) => s < 60 ? "<1 min" : s < 3600 ? `${Math.round(s / 60)} min` : `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m`;

  return (
    <Link href={pub.slug ? `/pub/${pub.slug}` : `/pub/${pub.id}`}>
      <div className="flex items-center gap-3 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl rounded-2xl p-3 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-white/40 dark:border-white/[0.06] hover:border-primary/30 active:scale-[0.99] transition-all duration-200 cursor-pointer">
        {/* Cover / Logo */}
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 dark:bg-[#1A1D24] flex-shrink-0">
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
            {showDist && pub._dist != null ? ` · ${formatDist(pub._dist)}${pub._distReal != null && pub._distAir != null ? ` su strada · ${formatDist(pub._distAir)} in linea d'aria` : ""}` : ""}
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
            {(route || pub._distReal != null) && (
              <span className="text-[11px] font-semibold text-primary flex items-center gap-0.5">
                <Navigation className="w-2.5 h-2.5" />
                {route
                  ? `${formatDist(route.km)} · ${fmtDur(route.durS)}${route.isStraight ? " (stima)" : ""}`
                  : `${formatDist(pub._distReal)} su strada`}
              </span>
            )}
            {showDist && canRoute && !route && (
              <button
                onClick={calcRoute}
                disabled={routeLoading}
                className="text-[10px] font-bold text-primary border border-primary/40 rounded-full px-2 py-0.5 tap-scale hover:bg-primary/10"
                data-testid={`btn-calc-route-pub-${pub.id}`}
              >
                {routeLoading ? "..." : "Calcola percorso"}
              </button>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-4 h-4 text-stone-300 dark:text-stone-600 flex-shrink-0" />
      </div>
    </Link>
  );
}
