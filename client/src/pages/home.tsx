import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { Capacitor } from "@capacitor/core";
import { Beer, MapPin, Heart, Store, TrendingUp, Navigation, Building2, ChevronRight, Zap, List, CalendarDays, Megaphone, Newspaper, Rocket, Users, Droplets, Bell, Bookmark, ChevronDown } from "lucide-react";
import Footer from "@/components/footer";
import PubCard from "@/components/pub-card";
import BreweryCard from "@/components/brewery-card";
import { Button } from "@/components/ui/button";

const HomepageMap = lazy(() => import("@/components/homepage-map"));

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(() => {
    try {
      const cached = localStorage.getItem("fermenta:userLocation");
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState(10);
  const [showDistancePicker, setShowDistancePicker] = useState(false);
  const [showPubs, setShowPubs] = useState(true);
  const [showBreweries, setShowBreweries] = useState(true);

  // Soglia: ignora posizioni con errore > 3 km (IP geolocation può essere > 50 km)
  const ACCURACY_THRESHOLD = 3000;
  const gotGoodPositionRef = useRef(false);
  const lastAccuracyRef = useRef<number>(Infinity);
  const autoWatchRef = useRef<number | null>(null);   // watch avviato all'avvio
  const manualWatchRef = useRef<number | null>(null); // watch avviato dal pulsante GPS

  // Applica la posizione solo se è significativamente migliore dell'ultima
  const applyPosition = useCallback((pos: GeolocationPosition) => {
    const { latitude, longitude, accuracy } = pos.coords;
    setLocationAccuracy(accuracy);
    if (accuracy <= ACCURACY_THRESHOLD && accuracy < lastAccuracyRef.current * 1.5) {
      lastAccuracyRef.current = accuracy;
      gotGoodPositionRef.current = true;
      const loc = { lat: latitude, lng: longitude };
      setUserLocation(loc);
      try { localStorage.setItem("fermenta:userLocation", JSON.stringify(loc)); } catch {}
      setLocationStatus('granted');
    }
  }, []);

  // Avvio automatico GPS all'apertura (una sola chiamata, si ferma quando accuratezza < 100m)
  // In Capacitor (Android) ritardiamo di 2 s per evitare che il dialog di permesso sistema
  // appaia prima che la pagina sia interattiva, il che corrompe lo stato touch del WebView.
  useEffect(() => {
    if (!navigator.geolocation) { setLocationStatus('denied'); return; }

    const startGeo = () => {
      setLocationStatus('requesting');

      // Fase 1: posizione veloce da cache di rete
      navigator.geolocation.getCurrentPosition(
        applyPosition,
        () => {},
        { enableHighAccuracy: false, maximumAge: 60000, timeout: 5000 }
      );

      // Fase 2: raffinamento GPS — si ferma da solo quando accuratezza < 100m
      const wid = navigator.geolocation.watchPosition(
        (pos) => {
          applyPosition(pos);
          if (pos.coords.accuracy <= 100) {
            navigator.geolocation.clearWatch(wid);
            autoWatchRef.current = null;
          }
        },
        () => { if (!gotGoodPositionRef.current) setLocationStatus('denied'); },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 25000 }
      );
      autoWatchRef.current = wid;
    };

    // Su Capacitor Android, ritarda per dare tempo al WebView di stabilizzarsi
    // prima che Android mostri il dialog di permesso geolocalizzazione
    if (Capacitor.isNativePlatform()) {
      const t = setTimeout(startGeo, 2000);
      return () => {
        clearTimeout(t);
        if (autoWatchRef.current !== null) {
          navigator.geolocation.clearWatch(autoWatchRef.current);
          autoWatchRef.current = null;
        }
      };
    }

    startGeo();
    return () => {
      if (autoWatchRef.current !== null) {
        navigator.geolocation.clearWatch(autoWatchRef.current);
        autoWatchRef.current = null;
      }
    };
  }, []); // Dipendenze vuote: si esegue solo al mount, applyPosition è stabile

  const handleRequestLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    // Cancella eventuali watch precedenti per evitare aggiornamenti sovrapposti
    if (autoWatchRef.current !== null) {
      navigator.geolocation.clearWatch(autoWatchRef.current);
      autoWatchRef.current = null;
    }
    if (manualWatchRef.current !== null) {
      navigator.geolocation.clearWatch(manualWatchRef.current);
      manualWatchRef.current = null;
    }
    lastAccuracyRef.current = Infinity; // reset soglia per accettare qualsiasi posizione
    setLocationStatus('requesting');

    const wid = navigator.geolocation.watchPosition(
      (pos) => {
        applyPosition(pos);
        if (pos.coords.accuracy <= 100) {
          navigator.geolocation.clearWatch(wid);
          manualWatchRef.current = null;
        }
      },
      () => { if (!gotGoodPositionRef.current) setLocationStatus('denied'); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 25000 }
    );
    manualWatchRef.current = wid;
  }, [applyPosition]);

  const queryClient = useQueryClient();
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);
  const { isPulling, isRefreshing } = usePullToRefresh(handleRefresh);
  
  const { data: pubs, isLoading: pubsLoading } = useQuery({
    queryKey: ["/api/pubs"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: breweriesRaw, isLoading: breweriesLoading } = useQuery({
    queryKey: ["/api/breweries"],
    queryFn: () => fetch("/api/breweries?random=true&limit=40").then(res => res.json()),
    staleTime: 0,
    gcTime: 2 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
  const breweries = useMemo(() => {
    if (!Array.isArray(breweriesRaw) || breweriesRaw.length === 0) return [];
    return [...breweriesRaw]
      .sort(() => Math.random() - 0.5)
      .slice(0, 12);
  }, [breweriesRaw]);

  const { data: taplistActivity = [] } = useQuery<any[]>({
    queryKey: ["/api/home/taplist-activity"],
    staleTime: 2 * 60 * 1000,
  });

  const { data: homeAnnouncements = [] } = useQuery<any[]>({
    queryKey: ["/api/home/announcements"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: popularStyles } = useQuery<{ style: string; count: number }[]>({
    queryKey: ["/api/beers/popular-styles"],
    staleTime: 10 * 60 * 1000,
  });

  const { data: allBreweries } = useQuery({
    queryKey: ["/api/breweries/map"],
    staleTime: 10 * 60 * 1000,
  });

  const { data: favorites } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: !!user,
  });

  const { data: myPubs } = useQuery({
    queryKey: ["/api/my-pubs"],
    enabled: isAuthenticated && ((user as any)?.userType === 'pub_owner' || (user as any)?.userType === 'admin'),
  });

  const { data: myBreweryData } = useQuery<{ brewery: any; beers: any[] }>({
    queryKey: ["/api/brewery/mine"],
    enabled: isAuthenticated && (user as any)?.userType === 'brewery_owner',
  });

  const { data: globalStats } = useQuery<{ totalBeers: number; totalBreweries: number; uniqueStyles: number; totalUsers: number; totalPubs: number }>({
    queryKey: ["/api/stats"],
    staleTime: 60 * 1000,
  });

  const sortedPubs = useMemo(() => {
    if (!Array.isArray(pubs)) return [];
    if (!userLocation) return pubs.slice(0, 8);
    return [...pubs]
      .map((pub: any) => ({
        ...pub,
        _distance: pub.latitude && pub.longitude
          ? haversineDistance(userLocation.lat, userLocation.lng, parseFloat(pub.latitude), parseFloat(pub.longitude))
          : null,
      }))
      // Includi sempre pub senza coordinate (senza GPS), filtra solo quelli con distanza nota > raggio
      .filter((pub) => pub._distance === null || pub._distance <= distanceKm)
      .sort((a, b) => {
        if (a._distance === null && b._distance === null) return 0;
        if (a._distance === null) return 1;
        if (b._distance === null) return -1;
        return a._distance - b._distance;
      })
      .slice(0, 10);
  }, [pubs, userLocation, distanceKm]);

  const typedUser = user as any;

  return (
    <div className="min-h-screen bg-background slide-up">
      <Helmet>
        <title>Fermenta.to — Birre Artigianali, Pub e Birrifici in Italia</title>
        <meta name="description" content="Scopri i migliori pub e birrifici artigianali d'Italia. Consulta taplist in tempo reale, orari di apertura e assaggia le migliori birre craft." />
        <meta property="og:title" content="Fermenta.to — Birre Artigianali, Pub e Birrifici in Italia" />
        <meta property="og:description" content="Scopri i migliori pub e birrifici artigianali d'Italia. Consulta taplist in tempo reale, orari di apertura e assaggia le migliori birre craft." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fermenta.to/" />
        <meta property="og:site_name" content="Fermenta.to" />
        <meta property="og:image" content="https://fermenta.to/logo-full.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href="https://fermenta.to/" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "@id": "https://fermenta.to/#website",
          "url": "https://fermenta.to",
          "name": "Fermenta.to",
          "description": "La piattaforma italiana per gli amanti della birra artigianale",
          "publisher": { "@id": "https://fermenta.to/#organization" },
          "inLanguage": "it-IT",
          "potentialAction": {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": "https://fermenta.to/search?q={search_term_string}"
            },
            "query-input": "required name=search_term_string"
          }
        })}</script>
      </Helmet>
      {/* Pull to refresh indicator */}
      {(isPulling || isRefreshing) && (
        <div className="fixed top-16 left-0 right-0 z-40 flex items-center justify-center py-2.5 bg-stone-50 dark:bg-stone-900/95 border-b border-stone-300 dark:border-stone-700 backdrop-blur-sm">
          {isRefreshing ? (
            <div className="flex items-center gap-2 text-primary dark:text-orange-300 text-xs font-medium">
              <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Aggiornamento in corso...
            </div>
          ) : (
            <div className="text-primary/70 text-xs font-medium">↓ Rilascia per aggiornare</div>
          )}
        </div>
      )}

      {/* ─── Attività in Zona ────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 pt-6 pb-3 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[28px] font-bold text-foreground leading-tight" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Attività in Zona
          </h1>
          {/* GPS accuracy badge */}
          {locationStatus === 'requesting' && (
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
              Ricerca GPS…
            </span>
          )}
          {locationStatus === 'granted' && locationAccuracy !== null && (
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              ±{locationAccuracy < 1000 ? `${Math.round(locationAccuracy)} m` : `${(locationAccuracy / 1000).toFixed(1)} km`}
            </span>
          )}
        </div>

        {/* Filter row: [GPS · Bookmark] poi scrollabile [distanza · Pub · Birrifici] */}
        <div className="flex items-center gap-2">
          {/* GPS button */}
          <button
            onClick={handleRequestLocation}
            title="Aggiorna posizione GPS"
            className={`w-9 h-9 flex-shrink-0 flex items-center justify-center bg-white dark:bg-card border rounded-full shadow-sm transition-colors ${
              locationStatus === 'granted'
                ? 'border-primary text-primary'
                : locationStatus === 'requesting'
                  ? 'border-amber-400 text-amber-500 animate-pulse'
                  : 'border-stone-200 dark:border-border text-stone-500 hover:text-primary'
            }`}
          >
            <Navigation className="w-4 h-4" />
          </button>

          <Link href="/dashboard?tab=favorites" className="flex-shrink-0">
            <button className="w-9 h-9 flex items-center justify-center bg-white dark:bg-card border border-stone-200 dark:border-border rounded-full shadow-sm text-stone-500 hover:text-primary transition-colors" title="I tuoi preferiti">
              <Bookmark className="w-4 h-4" />
            </button>
          </Link>

          {/* Distance picker — FUORI dal container overflow-x-auto per evitare il clipping */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowDistancePicker(v => !v)}
              className="flex items-center gap-1.5 bg-white dark:bg-card border border-stone-200 dark:border-border rounded-full px-3.5 py-2 text-sm font-bold text-foreground shadow-sm whitespace-nowrap"
            >
              {distanceKm} km
              <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
            </button>
            {showDistancePicker && (
              <>
                {/* Overlay invisibile per chiudere al click esterno */}
                <div className="fixed inset-0 z-40" onClick={() => setShowDistancePicker(false)} />
                <div className="absolute top-11 left-0 z-50 bg-white dark:bg-card border border-stone-200 dark:border-border rounded-2xl shadow-xl overflow-hidden min-w-[110px]">
                  {[5, 10, 15, 20, 30, 50, 100].map(d => (
                    <button
                      key={d}
                      onClick={() => { setDistanceKm(d); setShowDistancePicker(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors ${distanceKm === d ? 'text-primary bg-orange-50 dark:bg-orange-900/20' : 'text-foreground hover:bg-stone-50 dark:hover:bg-stone-800/40'}`}
                    >
                      {d} km
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Scrollable filter pills */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1 min-w-0">
            {/* Pub toggle */}
            <button
              onClick={() => setShowPubs(v => !v)}
              className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold shadow-sm border transition-colors whitespace-nowrap ${
                showPubs
                  ? 'bg-orange-50 dark:bg-orange-900/20 border-primary/30 text-primary'
                  : 'bg-white dark:bg-card border-stone-200 dark:border-border text-muted-foreground'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              Pub
            </button>

            {/* Birrifici toggle */}
            <button
              onClick={() => setShowBreweries(v => !v)}
              className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold shadow-sm border transition-colors whitespace-nowrap ${
                showBreweries
                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-400/40 text-amber-700 dark:text-amber-400'
                  : 'bg-white dark:bg-card border-stone-200 dark:border-border text-muted-foreground'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Birrifici
            </button>
          </div>
        </div>
      </section>

      {/* ─── Mappa ────────────────────────────────────────────────────────── */}
      <Suspense fallback={<div className="h-64 bg-stone-100 dark:bg-stone-800 animate-pulse rounded-2xl mx-4" />}>
        <HomepageMap
          pubs={Array.isArray(pubs) ? pubs : []}
          breweries={(() => {
            const src = Array.isArray(allBreweries) ? allBreweries : (Array.isArray(breweries) ? breweries : []);
            return (src as any[]).filter((b: any) => b.latitude && b.longitude);
          })()}
          userLocation={userLocation}
          isLoading={pubsLoading || breweriesLoading}
          showPubs={showPubs}
          showBreweries={showBreweries}
          distanceKm={userLocation ? distanceKm : undefined}
          onLocate={(loc) => {
            setUserLocation(loc);
            setLocationStatus('granted');
          }}
        />
      </Suspense>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-10 lg:pt-6 lg:pb-12">

        {locationStatus === 'denied' && (
          <div className="mb-6 p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/20 border border-stone-200 dark:border-stone-700/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Navigation className="w-5 h-5 text-primary flex-shrink-0" />
              <p className="text-sm text-foreground/80">
                Attiva la posizione per vedere i locali più vicini a te
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestLocation}
              className="border-stone-300 dark:border-stone-700 text-primary hover:bg-stone-100 dark:hover:bg-stone-900/30 rounded-xl flex-shrink-0 ml-3"
            >
              <Navigation className="w-4 h-4 mr-1" />
              GPS
            </Button>
          </div>
        )}

        {/* ─── Il Tuo Pub (pub owner / admin) ──────────────────────────────── */}
        {(typedUser?.userType === 'pub_owner' || (typedUser?.userType === 'admin' && Array.isArray(myPubs) && myPubs.length > 0)) ? (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-bold text-foreground flex items-center gap-2.5" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                <span className="w-1 h-5 rounded-full bg-primary flex-shrink-0" />
                Il Tuo Pub
              </h2>
              <Link href="/dashboard">
                <Button size="sm" variant="ghost" className="text-primary font-semibold text-sm hover:bg-stone-50 dark:hover:bg-stone-900/20">Dashboard →</Button>
              </Link>
            </div>
            {pubsLoading ? (
              <div className="h-24 bg-stone-50 dark:bg-[hsl(25,14%,12%)] rounded-2xl animate-pulse" />
            ) : Array.isArray(myPubs) && myPubs.length > 0 ? (
              <div className="space-y-3">
                {myPubs.map((pub: any) => (
                  <div key={pub.id} className="bg-white dark:bg-card border border-stone-100 dark:border-border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-stone-50 dark:bg-[hsl(25,14%,14%)] flex items-center justify-center">
                      {(pub.logoUrl || pub.coverImageUrl || pub.imageUrl) ? (
                        <img src={pub.logoUrl || pub.coverImageUrl || pub.imageUrl} alt={pub.name} className="w-16 h-16 object-cover" />
                      ) : (
                        <Store className="w-7 h-7 text-primary/40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-foreground truncate">{pub.name}</p>
                        {pub.isVerified && (
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full flex-shrink-0">✓ Verificato</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{pub.address}</p>
                      {pub.subscriptionStatus && pub.subscriptionStatus !== 'none' && (
                        <span className="inline-block mt-1 text-[10px] font-semibold text-orange-700 dark:text-orange-300 bg-stone-50 dark:bg-stone-900/30 px-2 py-0.5 rounded-full capitalize">
                          {pub.subscriptionStatus === 'trial' ? '⏱ Prova attiva' : pub.subscriptionStatus === 'active' ? '✓ Piano attivo' : pub.subscriptionStatus === 'gifted' ? '🎁 Piano gifted' : pub.subscriptionStatus}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Link href="/dashboard">
                        <Button size="sm" className="font-medium text-xs px-3">Gestisci</Button>
                      </Link>
                      <Link href={`/pub/${pub.slug || pub.id}`}>
                        <Button size="sm" variant="outline" className="text-xs px-3 w-full border-stone-200 dark:border-stone-700/30 hover:bg-stone-50">Pagina</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-stone-50 dark:bg-[hsl(25,14%,11%)] rounded-2xl p-6 text-center">
                <p className="text-muted-foreground text-sm mb-3">Non hai ancora registrato nessun pub</p>
                <Link href="/registra-pub"><Button size="sm">Registra il tuo pub</Button></Link>
              </div>
            )}
          </section>
        ) : null}

        {/* ─── Locali Vicini (customer) ─────────────────────────────────────── */}
        {(typedUser?.userType !== 'pub_owner' && !(typedUser?.userType === 'admin' && Array.isArray(myPubs) && myPubs.length > 0)) ? (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-bold text-foreground flex items-center gap-2.5" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                <span className="w-1 h-5 rounded-full bg-primary flex-shrink-0" />
                Locali Vicini
              </h2>
              <Link href="/explore/pubs">
                <Button variant="ghost" size="sm" className="text-primary hover:bg-stone-50 dark:hover:bg-stone-900/20 font-semibold text-sm">
                  Vedi tutti →
                </Button>
              </Link>
            </div>
            {pubsLoading ? (
              <div className="bg-white dark:bg-card rounded-2xl overflow-hidden border border-stone-100/70 dark:border-stone-700/20 shadow-sm">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 animate-pulse bg-stone-50 dark:bg-stone-800/30 mx-4 my-2 rounded-xl" />
                ))}
              </div>
            ) : sortedPubs.length === 0 ? (
              <div className="bg-white dark:bg-card rounded-2xl border border-stone-100/70 dark:border-stone-700/20 shadow-sm px-4 py-8 text-center">
                <Beer className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-sm text-stone-500 dark:text-stone-400">Nessun locale trovato in {distanceKm} km</p>
                <button onClick={() => setDistanceKm(50)} className="mt-2 text-sm font-semibold text-primary hover:underline">
                  Aumenta il raggio a 50 km
                </button>
              </div>
            ) : (
              <div className="bg-white dark:bg-card rounded-2xl overflow-hidden border border-stone-100/70 dark:border-stone-700/20 shadow-sm">
                {sortedPubs.map((pub: any, idx: number) => (
                  <PubCard 
                    key={pub.id} 
                    pub={pub}
                    distance={userLocation && pub._distance !== Infinity ? pub._distance : undefined}
                    isLast={idx === sortedPubs.length - 1}
                  />
                ))}
              </div>
            )}
          </section>
        ) : null}

        {/* ─── Il Tuo Birrificio (brewery_owner) ───────────────────────────── */}
        {typedUser?.userType === 'brewery_owner' && myBreweryData?.brewery && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-bold text-foreground flex items-center gap-2.5" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                <span className="w-1 h-5 rounded-full bg-primary flex-shrink-0" />
                Il Tuo Birrificio
              </h2>
              <Link href="/brewery-dashboard">
                <Button size="sm" variant="ghost" className="text-primary hover:bg-stone-50 dark:hover:bg-stone-900/20 font-semibold text-sm">Gestisci →</Button>
              </Link>
            </div>
            <div className="bg-white dark:bg-card border border-stone-100 dark:border-border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-stone-50 dark:bg-stone-900/20 flex items-center justify-center">
                {myBreweryData.brewery.logoUrl ? (
                  <img src={myBreweryData.brewery.logoUrl} alt={myBreweryData.brewery.name} className="w-16 h-16 object-contain" />
                ) : (
                  <Building2 className="w-7 h-7 text-primary/50" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground truncate">{myBreweryData.brewery.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />{myBreweryData.brewery.location}
                </p>
                <p className="text-xs text-primary mt-1">{myBreweryData.beers?.length ?? 0} birre nel catalogo</p>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <Link href="/brewery-dashboard">
                  <Button size="sm" className="font-medium text-xs px-3">Gestisci</Button>
                </Link>
                <Link href={`/brewery/${myBreweryData.brewery.id}`}>
                  <Button size="sm" variant="outline" className="text-xs px-3 w-full border-stone-200 dark:border-stone-700/30 hover:bg-stone-50">Pagina</Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ─── In Spina Adesso ─────────────────────────────────────────────── */}
        {taplistActivity.length > 0 && typedUser?.userType !== 'pub_owner' && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[18px] font-bold text-foreground flex items-center gap-2.5" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                <span className="w-1 h-5 rounded-full bg-primary flex-shrink-0" />
                In Spina Adesso
              </h2>
              <Link href="/explore/pubs">
                <Button variant="ghost" size="sm" className="text-primary hover:bg-stone-50 dark:hover:bg-stone-900/20 font-semibold text-sm">Vedi tutti →</Button>
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
              {taplistActivity.map((item: any) => (
                <Link key={item.id} href={`/pub/${item.pub_slug || item.pub_id}`}>
                  <div className="group flex-shrink-0 w-[168px] cursor-pointer">
                    <div className="relative h-[116px] rounded-2xl overflow-hidden mb-2 shadow-sm group-hover:shadow-md transition-shadow">
                      {item.beer_image ? (
                        <img src={item.beer_image} alt={item.beer_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary to-[hsl(20,95%,42%)] flex items-center justify-center">
                          <Beer className="w-9 h-9 text-white opacity-70" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                      <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${item.tap_type === 'pompa' ? 'bg-violet-600 text-white' : 'bg-primary text-white'}`}>
                        {item.tap_type === 'pompa' ? 'Pompa' : 'Spina'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{item.beer_name}</p>
                    {item.beer_style && <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{item.beer_style}</p>}
                    <div className="flex items-center gap-1 mt-1">
                      {item.pub_logo ? (
                        <img src={item.pub_logo} alt={item.pub_name} className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <Store className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      )}
                      <p className="text-[10px] text-muted-foreground truncate">{item.pub_name}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ─── Birrifici da Scoprire ────────────────────────────────────────── */}
        {breweries.length > 0 && typedUser?.userType !== 'pub_owner' && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[18px] font-bold text-foreground flex items-center gap-2.5" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                <span className="w-1 h-5 rounded-full bg-primary flex-shrink-0" />
                Birrifici da Scoprire
              </h2>
              <Link href="/explore/breweries">
                <Button variant="ghost" size="sm" className="text-primary hover:bg-stone-50 dark:hover:bg-stone-900/20 font-semibold text-sm">Vedi tutti →</Button>
              </Link>
            </div>
            <div className="bg-white dark:bg-card rounded-2xl overflow-hidden border border-stone-100/70 dark:border-stone-700/20 shadow-sm">
              {breweries.slice(0, 5).map((brewery: any, idx: number) => (
                <BreweryCard key={brewery.id} brewery={brewery} isLast={idx === Math.min(4, breweries.length - 1)} />
              ))}
            </div>
          </section>
        )}

        {/* ─── Ultime dai Birrifici ─────────────────────────────────────────── */}
        {homeAnnouncements.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[18px] font-bold text-foreground flex items-center gap-2.5" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                <span className="w-1 h-5 rounded-full bg-primary flex-shrink-0" />
                Ultime dai Birrifici
              </h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
              {homeAnnouncements.map((ann: any) => {
                const typeMap: Record<string, { label: string; color: string; Icon: any }> = {
                  news:    { label: "Novità",      color: "bg-stone-50 text-primary dark:bg-stone-900/40 dark:text-orange-300",   Icon: Newspaper },
                  release: { label: "Nuova Birra", color: "bg-stone-50 text-primary dark:bg-stone-900/40 dark:text-orange-300", Icon: Rocket },
                  collab:  { label: "Collab",      color: "bg-stone-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", Icon: Users },
                };
                const t = typeMap[ann.type] ?? typeMap.news;
                return (
                  <Link key={ann.id} href={`/brewery/${ann.breweryId}`}>
                    <div className="group flex-shrink-0 w-[200px] p-3 rounded-2xl border border-stone-100 dark:border-border bg-white dark:bg-[hsl(25,12%,11%)] hover:border-primary/25 dark:hover:border-primary/30 transition-colors cursor-pointer shadow-sm hover:shadow-md">
                      <div className="flex items-center gap-2 mb-2">
                        {ann.breweryLogo ? (
                          <img src={ann.breweryLogo} alt={ann.breweryName} className="w-8 h-8 rounded-full object-contain bg-stone-50 dark:bg-stone-900/20 flex-shrink-0 p-0.5" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-[hsl(20,95%,42%)] flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-white">{ann.breweryName?.[0]}</span>
                          </div>
                        )}
                        <p className="text-[11px] font-semibold text-foreground truncate">{ann.breweryName}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full mb-1.5 ${t.color}`}>
                        <t.Icon className="w-2.5 h-2.5" />{t.label}
                      </span>
                      <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">{ann.title}</p>
                      {ann.releaseDate && (
                        <p className="text-[10px] text-muted-foreground mt-1">Uscita: {new Date(ann.releaseDate).toLocaleDateString("it-IT")}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── Stili più Amati ──────────────────────────────────────────────── */}
        {isAuthenticated && Array.isArray(popularStyles) && popularStyles.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-bold text-foreground flex items-center gap-2.5" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                <span className="w-1 h-5 rounded-full bg-primary flex-shrink-0" />
                Stili più Amati
              </h2>
              <Link href="/explore/beers">
                <Button variant="ghost" size="sm" className="text-primary hover:bg-stone-50 dark:hover:bg-stone-900/20 font-semibold text-sm">Esplora →</Button>
              </Link>
            </div>
            {(() => {
              const top = popularStyles.slice(0, 10);
              const max = top[0]?.count ?? 1;
              return (
                <div className="bg-white dark:bg-card border border-stone-100 dark:border-border rounded-2xl p-4 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0">
                    {top.map((s, i) => (
                      <Link key={s.style} href={`/explore/beers?style=${encodeURIComponent(s.style)}`}>
                        <div className="group flex items-center gap-3 py-2.5 border-b border-stone-100 dark:border-[hsl(25,12%,14%)] last:border-0 cursor-pointer hover:bg-stone-50/50 dark:hover:bg-stone-900/10 rounded-lg px-2 transition-colors">
                          <span className={`flex-shrink-0 w-5 text-right text-[11px] font-bold ${i < 3 ? 'text-primary dark:text-orange-400' : 'text-muted-foreground'}`}>
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-foreground group-hover:text-primary truncate transition-colors leading-tight mb-1">
                              {s.style}
                            </p>
                            <div className="h-1 bg-stone-100 dark:bg-stone-900/30 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${Math.round((s.count / max) * 100)}%` }}
                              />
                            </div>
                          </div>
                          <span className="flex-shrink-0 text-[11px] font-semibold text-primary tabular-nums">
                            {s.count.toLocaleString('it-IT')}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })()}
          </section>
        )}

        {/* ─── I Tuoi Preferiti ─────────────────────────────────────────────── */}
        {user && favorites && Array.isArray(favorites) && favorites.length > 0 ? (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-bold text-foreground flex items-center gap-2.5" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                <span className="w-1 h-5 rounded-full bg-primary flex-shrink-0" />
                I Tuoi Preferiti
              </h2>
              <Link href="/dashboard?tab=favorites">
                <Button variant="ghost" size="sm" className="text-primary hover:bg-stone-50 dark:hover:bg-stone-900/20 font-semibold text-sm">
                  Vedi tutti →
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {(favorites as any[]).filter((f: any) => ['pub', 'brewery', 'beer'].includes(f.itemType) && f.itemName).slice(0, 12).map((favorite: any) => {
                const href = favorite.itemType === 'pub' ? `/pub/${favorite.itemId}` 
                  : favorite.itemType === 'brewery' ? `/brewery/${favorite.itemId}` 
                  : `/beer/${favorite.itemId}`;
                const TypeIcon = favorite.itemType === 'pub' ? Store : Beer;
                
                return (
                  <Link key={favorite.id} href={href}>
                    <div className="group relative bg-white dark:bg-card border border-stone-100 dark:border-border rounded-2xl p-3 hover:shadow-md hover:border-primary/20 hover:scale-[1.03] transition-all duration-200 cursor-pointer h-full">
                      <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                        <TypeIcon className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex flex-col items-center text-center gap-2">
                        {favorite.itemImageUrl ? (
                          <img src={favorite.itemImageUrl} alt={favorite.itemName} className="w-12 h-12 rounded-full object-cover ring-2 ring-orange-100 dark:ring-orange-900/30" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                            <TypeIcon className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <span className="text-xs font-medium text-foreground line-clamp-2 leading-tight">
                          {favorite.itemName || `#${favorite.itemId}`}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* ─── Guest CTA banner ─────────────────────────────────────────────── */}
        {!isAuthenticated && (
          <section className="mb-8">
            <div className="relative overflow-hidden rounded-3xl p-6 lg:p-8" style={{ background: "linear-gradient(135deg, #F77104 0%, #f98a0e 60%, #f5a623 100%)" }}>
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none" style={{ background: "rgba(255,255,255,0.08)" }} />
              <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full pointer-events-none" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <div className="flex-1">
                  <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1">Sei nuovo?</p>
                  <h3 className="text-xl font-extrabold text-white leading-tight mb-1">
                    Unisciti alla community
                  </h3>
                  <p className="text-white/80 text-sm leading-snug">
                    Salva i tuoi preferiti, tieni il diario degli assaggi e scopri birre con persone come te.
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Link href="/api/login">
                    <Button className="bg-white text-primary hover:bg-orange-50 font-bold rounded-full h-10 px-5 text-sm shadow-md">
                      Registrati gratis
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ─── Statistiche Community ────────────────────────────────────────── */}
        <section className="mb-8 bg-white dark:bg-card border border-stone-100 dark:border-border rounded-3xl p-5 lg:p-7 shadow-sm">
          <p className="text-[11px] font-bold text-center text-muted-foreground mb-5 uppercase tracking-[0.14em]">
            La Community Fermenta.to
          </p>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="text-center">
              <div className="text-2xl font-extrabold text-primary tabular-nums leading-tight">{globalStats?.totalBeers != null ? globalStats.totalBeers.toLocaleString("it-IT") : '—'}</div>
              <div className="text-[11px] text-muted-foreground mt-1 font-medium">Birre</div>
            </div>
            <div className="text-center border-x border-stone-100 dark:border-border">
              <div className="text-2xl font-extrabold text-primary tabular-nums leading-tight">{globalStats?.totalBreweries != null ? globalStats.totalBreweries.toLocaleString("it-IT") : '—'}</div>
              <div className="text-[11px] text-muted-foreground mt-1 font-medium">Birrifici</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-extrabold text-primary tabular-nums leading-tight">{globalStats?.uniqueStyles != null ? globalStats.uniqueStyles.toLocaleString("it-IT") : '—'}</div>
              <div className="text-[11px] text-muted-foreground mt-1 font-medium">Stili</div>
            </div>
          </div>
          <div className="border-t border-stone-100 dark:border-border mb-5" />
          <div className="flex justify-center gap-16">
            <div className="text-center">
              <div className="text-xl font-extrabold text-primary tabular-nums leading-tight">{globalStats?.totalUsers != null ? globalStats.totalUsers.toLocaleString("it-IT") : '—'}</div>
              <div className="text-[11px] text-muted-foreground mt-1 font-medium">Utenti</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-extrabold text-primary tabular-nums leading-tight">{globalStats?.totalPubs != null ? globalStats.totalPubs.toLocaleString("it-IT") : '—'}</div>
              <div className="text-[11px] text-muted-foreground mt-1 font-medium">Pub</div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
