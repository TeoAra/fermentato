import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { Beer, MapPin, Heart, Store, Navigation, Building2, ChevronRight, Users, Bell, Bookmark, ChevronDown, Star, TrendingUp, Zap, Flame } from "lucide-react";
import Footer from "@/components/footer";
import PubCard from "@/components/pub-card";
import BreweryCard from "@/components/brewery-card";
import { Button } from "@/components/ui/button";
import FindBeerSheet from "@/components/FindBeerSheet";

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

function formatDist(km: number | null | undefined): string {
  if (km == null) return "";
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
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
  const [findBeerOpen, setFindBeerOpen] = useState(false);

  const ACCURACY_THRESHOLD = 3000;
  const gotGoodPositionRef = useRef(false);
  const lastAccuracyRef = useRef<number>(Infinity);
  const autoWatchRef = useRef<number | null>(null);
  const manualWatchRef = useRef<number | null>(null);

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

  useEffect(() => {
    const handleCapacitorLocationStart = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const perm = await Geolocation.requestPermissions();
          if (perm.location === 'granted' || (perm.location as string) === 'limited') {
            setLocationStatus('requesting');
            const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 });
            applyPosition({ coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy ?? 999 } } as any);
          } else {
            setLocationStatus('denied');
          }
        } catch { setLocationStatus('denied'); }
      }
    };
    window.addEventListener('capacitor-location-start', handleCapacitorLocationStart);
    return () => window.removeEventListener('capacitor-location-start', handleCapacitorLocationStart);
  }, [applyPosition]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (!navigator.geolocation) return;
    if (userLocation && lastAccuracyRef.current <= 200) return;

    const alreadyHasCachedLocation = !!userLocation;
    setLocationStatus('requesting');

    const wid = navigator.geolocation.watchPosition(
      (pos) => {
        applyPosition(pos);
        if (pos.coords.accuracy <= 100) {
          navigator.geolocation.clearWatch(wid);
          autoWatchRef.current = null;
        }
      },
      () => { if (!gotGoodPositionRef.current) setLocationStatus(alreadyHasCachedLocation ? 'granted' : 'denied'); },
      { enableHighAccuracy: false, maximumAge: 120000, timeout: 12000 }
    );
    autoWatchRef.current = wid;

    const hiWid = setTimeout(() => {
      if (gotGoodPositionRef.current) return;
      const w2 = navigator.geolocation.watchPosition(
        (pos) => { applyPosition(pos); if (pos.coords.accuracy <= 50) { navigator.geolocation.clearWatch(w2); } },
        () => {},
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
      );
    }, 3000);

    return () => {
      if (autoWatchRef.current !== null) { navigator.geolocation.clearWatch(autoWatchRef.current); autoWatchRef.current = null; }
      clearTimeout(hiWid);
    };
  }, []);

  const handleRequestLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    if (autoWatchRef.current !== null) { navigator.geolocation.clearWatch(autoWatchRef.current); autoWatchRef.current = null; }
    if (manualWatchRef.current !== null) { navigator.geolocation.clearWatch(manualWatchRef.current); manualWatchRef.current = null; }
    lastAccuracyRef.current = Infinity;
    setLocationStatus('requesting');
    const wid = navigator.geolocation.watchPosition(
      (pos) => {
        applyPosition(pos);
        if (pos.coords.accuracy <= 100) { navigator.geolocation.clearWatch(wid); manualWatchRef.current = null; }
      },
      () => { if (!gotGoodPositionRef.current) setLocationStatus('denied'); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 25000 }
    );
    manualWatchRef.current = wid;
  }, [applyPosition]);

  const queryClient = useQueryClient();
  const handleRefresh = useCallback(async () => { await queryClient.invalidateQueries(); }, [queryClient]);
  const { isPulling, isRefreshing } = usePullToRefresh(handleRefresh);

  const { data: pubs, isLoading: pubsLoading } = useQuery({ queryKey: ["/api/pubs"], staleTime: 5 * 60 * 1000 });
  const { data: breweriesRaw } = useQuery({
    queryKey: ["/api/breweries"],
    queryFn: () => fetch("/api/breweries?random=true&limit=40").then(r => r.json()),
    staleTime: 0, gcTime: 2 * 60 * 1000, refetchOnMount: true, refetchOnWindowFocus: false,
  });
  const breweries = useMemo(() => {
    if (!Array.isArray(breweriesRaw) || breweriesRaw.length === 0) return [];
    return [...breweriesRaw].sort(() => Math.random() - 0.5).slice(0, 12);
  }, [breweriesRaw]);

  const { data: taplistActivity = [] } = useQuery<any[]>({ queryKey: ["/api/home/taplist-activity"], staleTime: 2 * 60 * 1000 });
  const { data: homeAnnouncements = [] } = useQuery<any[]>({ queryKey: ["/api/home/announcements"], staleTime: 5 * 60 * 1000 });
  const { data: popularStyles } = useQuery<{ style: string; count: number }[]>({ queryKey: ["/api/beers/popular-styles"], staleTime: 10 * 60 * 1000 });
  const { data: allBreweries } = useQuery({ queryKey: ["/api/breweries/map"], staleTime: 10 * 60 * 1000, enabled: !Capacitor.isNativePlatform() });
  const { data: favorites } = useQuery({ queryKey: ["/api/favorites"], enabled: !!user });
  const { data: myPubs } = useQuery({ queryKey: ["/api/my-pubs"], enabled: isAuthenticated && ((user as any)?.userType === 'pub_owner' || (user as any)?.userType === 'admin') });
  const { data: myBreweryData } = useQuery<{ brewery: any; beers: any[] }>({ queryKey: ["/api/brewery/mine"], enabled: isAuthenticated && (user as any)?.userType === 'brewery_owner' });
  const { data: globalStats } = useQuery<{ totalBeers: number; totalBreweries: number; uniqueStyles: number; totalUsers: number; totalPubs: number }>({ queryKey: ["/api/stats"], staleTime: 60 * 1000 });
  const { data: userStats } = useQuery<{ total: number; avgRating: number; streak: number; topStyles: any[]; topBreweries: any[] }>({
    queryKey: ["/api/user/stats"], enabled: isAuthenticated, staleTime: 5 * 60 * 1000,
  });

  const sortedPubs = useMemo(() => {
    if (!Array.isArray(pubs)) return [];
    if (!userLocation) return (pubs as any[]).slice(0, 8);
    return [...(pubs as any[])]
      .map((pub: any) => ({
        ...pub,
        _distance: pub.latitude && pub.longitude
          ? haversineDistance(userLocation.lat, userLocation.lng, parseFloat(pub.latitude), parseFloat(pub.longitude))
          : null,
      }))
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
  const savedCount = Array.isArray(favorites) ? (favorites as any[]).length : 0;
  const breweryOfDay = useMemo(() => {
    const withCover = breweries.filter((b: any) => b.coverImageUrl || b.logoUrl);
    return withCover[0] ?? breweries[0] ?? null;
  }, [breweries]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Fermenta.to — Birre Artigianali, Pub e Birrifici in Italia</title>
        <meta name="description" content="Scopri i migliori pub e birrifici artigianali d'Italia. Consulta taplist in tempo reale, orari di apertura e assaggia le migliori birre craft." />
        <meta property="og:title" content="Fermenta.to — Birre Artigianali, Pub e Birrifici in Italia" />
        <meta property="og:description" content="Scopri i migliori pub e birrifici artigianali d'Italia." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fermenta.to/" />
        <meta property="og:image" content="https://fermenta.to/logo-full.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href="https://fermenta.to/" />
      </Helmet>

      {/* Pull-to-refresh indicator */}
      {(isPulling || isRefreshing) && (
        <div className="fixed top-16 left-0 right-0 z-40 flex items-center justify-center py-2.5 bg-background/95 border-b border-border backdrop-blur-sm">
          {isRefreshing ? (
            <div className="flex items-center gap-2 text-primary text-xs font-medium">
              <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Aggiornamento…
            </div>
          ) : (
            <div className="text-primary/70 text-xs font-medium">↓ Rilascia per aggiornare</div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          HERO — Clean map (top) + filter chips + content card
          Centered on desktop with max-w-2xl, lighter on the eye
      ═══════════════════════════════════════════════════════════════ */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        {/* Map card — taller on mobile, more compact on desktop */}
        <div className="relative rounded-3xl overflow-hidden bg-stone-200 dark:bg-stone-900 shadow-card h-[300px] lg:h-[240px]">
          {!Capacitor.isNativePlatform() ? (
            <div className="absolute inset-0 overflow-hidden">
              <Suspense fallback={<div className="w-full h-full bg-stone-200 dark:bg-stone-800" />}>
                <HomepageMap
                  pubs={Array.isArray(pubs) ? pubs as any[] : []}
                  breweries={(() => {
                    const src = Array.isArray(allBreweries) ? allBreweries : (Array.isArray(breweries) ? breweries : []);
                    return (src as any[]).filter((b: any) => b.latitude && b.longitude);
                  })()}
                  userLocation={userLocation}
                  isLoading={pubsLoading}
                  showPubs={showPubs}
                  showBreweries={showBreweries}
                  distanceKm={userLocation ? distanceKm : undefined}
                  onLocate={(loc) => { setUserLocation(loc); setLocationStatus('granted'); }}
                  showControls={false}
                />
              </Suspense>
            </div>
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(145deg, #1a0800 0%, #3d1200 35%, #8b3000 70%, #c95000 100%)' }}
            />
          )}

          {/* Floating location chip — top-left, doesn't obscure the map center */}
          <div className="absolute top-3 left-3 z-10 pointer-events-none">
            {locationStatus === 'granted' && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold bg-white/95 dark:bg-card/95 backdrop-blur-md text-primary rounded-full px-2.5 py-1.5 shadow-card-sm border border-primary/15">
                <MapPin className="w-3 h-3" />
                {locationAccuracy != null && locationAccuracy < 1000 ? `Vicino a te · ±${Math.round(locationAccuracy)}m` : 'Vicino a te'}
              </span>
            )}
            {locationStatus === 'requesting' && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold bg-amber-500 text-white rounded-full px-2.5 py-1.5 animate-pulse shadow-card-sm">
                <Navigation className="w-3 h-3" />
                Ricerca GPS…
              </span>
            )}
          </div>
        </div>

        {/* Filter chips IMMEDIATELY below the map — km, Pub, Birrifici, Preferiti */}
        <div className="flex items-center gap-2 mt-3 pb-0.5">
          {/* Distance picker */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowDistancePicker(v => !v)}
              className="tap-scale flex items-center gap-1.5 bg-card dark:bg-card border border-border rounded-full px-3.5 py-2 text-[13px] font-bold text-foreground shadow-card-sm whitespace-nowrap"
            >
              {distanceKm} km
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {showDistancePicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDistancePicker(false)} />
                <div className="absolute top-11 left-0 z-50 bg-card border border-border rounded-2xl shadow-card overflow-hidden min-w-[110px]">
                  {[1, 5, 10, 15, 20, 30, 50, 100].map(d => (
                    <button
                      key={d}
                      onClick={() => { setDistanceKm(d); setShowDistancePicker(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors ${distanceKm === d ? 'text-primary bg-orange-50 dark:bg-orange-900/20' : 'text-foreground hover:bg-muted'}`}
                    >
                      {d} km
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Scrollable chips */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1 min-w-0">
            <button
              onClick={() => setShowPubs(v => !v)}
              className={`tap-scale flex-shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold border transition-colors whitespace-nowrap shadow-card-sm ${
                showPubs ? 'bg-primary border-primary text-white' : 'bg-card border-border text-foreground'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              Pub
            </button>

            <button
              onClick={() => setShowBreweries(v => !v)}
              className={`tap-scale flex-shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold border transition-colors whitespace-nowrap shadow-card-sm ${
                showBreweries ? 'bg-amber-500 border-amber-500 text-white' : 'bg-card border-border text-foreground'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Birrifici
            </button>

            <Link href="/dashboard?tab=favorites" className="flex-shrink-0">
              <button className="tap-scale w-9 h-9 flex items-center justify-center bg-card border border-border rounded-full shadow-card-sm text-foreground" aria-label="Preferiti">
                <Bookmark className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>

        {/* Content card BELOW the chips — headline + CTAs */}
        <div className="mt-4">
          <h1 className="text-[26px] sm:text-[30px] font-extrabold text-foreground leading-[1.15] tracking-tight">
            Scopri cosa bere<br />
            <span className="text-primary">vicino a te.</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            La app per chi ama la birra artigianale.<br className="hidden sm:block" />
            Trova pub, birre e birrifici in un tap.
          </p>

          {/* Two primary CTAs — Trova una birra opens the floating panel */}
          <div className="flex gap-2.5 mt-4">
            <button
              onClick={() => setFindBeerOpen(true)}
              className="tap-scale btn-orange-glow flex-1 flex items-center justify-center gap-1.5 bg-primary text-white text-sm font-bold px-4 py-3 rounded-2xl shadow-card"
            >
              <Beer className="w-4 h-4" />
              Trova una birra
            </button>
            <Link href="/explore/pubs" className="flex-1">
              <button className="tap-scale w-full flex items-center justify-center gap-1.5 bg-card text-foreground text-sm font-bold px-4 py-3 rounded-2xl border-2 border-primary/25 shadow-card-sm">
                <Store className="w-4 h-4 text-primary" />
                Esplora pub
              </button>
            </Link>
          </div>

          {/* GPS opt-in (only when not granted) */}
          {locationStatus !== 'granted' && (
            <button
              onClick={handleRequestLocation}
              className="tap-scale w-full mt-2.5 flex items-center justify-center gap-1.5 text-primary text-[13px] font-bold px-4 py-2 rounded-2xl bg-orange-50 dark:bg-orange-900/20 border border-primary/15"
            >
              <Navigation className="w-3.5 h-3.5" />
              Attiva la posizione
            </button>
          )}
        </div>
      </div>

      <main className="px-4 pt-5 pb-28 max-w-3xl mx-auto lg:max-w-7xl">

        {/* GPS denied banner */}
        {locationStatus === 'denied' && (
          <div className="mb-5 p-4 rounded-2xl bg-card border border-border flex items-center justify-between shadow-card-sm">
            <div className="flex items-center gap-3">
              <Navigation className="w-5 h-5 text-primary flex-shrink-0" />
              <p className="text-sm text-foreground/80">Attiva la posizione per vedere i locali più vicini</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRequestLocation} className="border-border text-primary hover:bg-muted rounded-xl flex-shrink-0 ml-3">
              <Navigation className="w-4 h-4 mr-1" />
              GPS
            </Button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            OWNER SECTIONS — Pub owner / Brewery owner
        ═══════════════════════════════════════════════════════════════ */}
        {(typedUser?.userType === 'pub_owner' || (typedUser?.userType === 'admin' && Array.isArray(myPubs) && (myPubs as any[]).length > 0)) ? (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-primary flex-shrink-0" />
                Il Tuo Pub
              </h2>
              <Link href="/dashboard">
                <Button size="sm" variant="ghost" className="text-primary font-semibold text-sm">Dashboard →</Button>
              </Link>
            </div>
            {pubsLoading ? (
              <div className="h-24 bg-muted rounded-2xl animate-pulse" />
            ) : Array.isArray(myPubs) && (myPubs as any[]).length > 0 ? (
              <div className="space-y-3">
                {(myPubs as any[]).map((pub: any) => (
                  <div key={pub.id} className="tap-scale bg-card border border-border rounded-2xl p-4 flex items-center gap-4 shadow-card">
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                      {pub.logoUrl ? <img src={pub.logoUrl} alt={pub.name} className="w-14 h-14 object-cover" /> : <Store className="w-6 h-6 text-primary/40" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate">{pub.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{pub.address}</p>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Link href="/dashboard"><Button size="sm" className="font-medium text-xs px-3">Gestisci</Button></Link>
                      <Link href={`/pub/${pub.slug || pub.id}`}><Button size="sm" variant="outline" className="text-xs px-3 w-full border-border">Pagina</Button></Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-border p-6 text-center shadow-card-sm">
                <p className="text-muted-foreground text-sm mb-3">Non hai ancora registrato nessun pub</p>
                <Link href="/registra-pub"><Button size="sm">Registra il tuo pub</Button></Link>
              </div>
            )}
          </section>
        ) : null}

        {typedUser?.userType === 'brewery_owner' && myBreweryData?.brewery && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-primary flex-shrink-0" />
                Il Tuo Birrificio
              </h2>
              <Link href="/brewery-dashboard">
                <Button size="sm" variant="ghost" className="text-primary font-semibold text-sm">Gestisci →</Button>
              </Link>
            </div>
            <div className="tap-scale bg-card border border-border rounded-2xl p-4 flex items-center gap-4 shadow-card">
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                {myBreweryData.brewery.logoUrl
                  ? <img src={myBreweryData.brewery.logoUrl} alt={myBreweryData.brewery.name} className="w-14 h-14 object-contain" />
                  : <Building2 className="w-6 h-6 text-primary/50" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground truncate">{myBreweryData.brewery.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />{myBreweryData.brewery.location}
                </p>
                <p className="text-xs text-primary mt-1">{myBreweryData.beers?.length ?? 0} birre nel catalogo</p>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <Link href="/brewery-dashboard"><Button size="sm" className="font-medium text-xs px-3">Gestisci</Button></Link>
                <Link href={`/brewery/${myBreweryData.brewery.id}`}><Button size="sm" variant="outline" className="text-xs px-3 w-full border-border">Pagina</Button></Link>
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            USER STATS ROW — bevute · recensioni · salvate
        ═══════════════════════════════════════════════════════════════ */}
        {isAuthenticated && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {/* Bevute */}
            <Link href="/dashboard?tab=tastings">
              <div className="tap-scale bg-card border border-border rounded-2xl p-3.5 shadow-card text-center cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-900/25 flex items-center justify-center mx-auto mb-2">
                  <Beer className="w-4.5 h-4.5 text-primary" style={{ width: 18, height: 18 }} />
                </div>
                <p className="text-[22px] font-extrabold text-foreground leading-none">{userStats?.total ?? 0}</p>
                <p className="text-[11px] font-semibold text-foreground mt-1">Le mie bevute</p>
                {userStats?.total ? (
                  <p className="text-[10px] text-muted-foreground mt-0.5">Totale assaggi</p>
                ) : null}
              </div>
            </Link>

            {/* Salvate */}
            <Link href="/dashboard?tab=favorites">
              <div className="tap-scale bg-card border border-border rounded-2xl p-3.5 shadow-card text-center cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/25 flex items-center justify-center mx-auto mb-2">
                  <Star className="w-4.5 h-4.5 text-amber-500" style={{ width: 18, height: 18 }} fill="currentColor" />
                </div>
                <p className="text-[22px] font-extrabold text-foreground leading-none">{savedCount}</p>
                <p className="text-[11px] font-semibold text-foreground mt-1">Preferiti</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Birre salvate</p>
              </div>
            </Link>

            {/* Check-in / XP */}
            <Link href="/dashboard">
              <div className="tap-scale bg-card border border-border rounded-2xl p-3.5 shadow-card text-center cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/25 flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-4.5 h-4.5 text-red-500" style={{ width: 18, height: 18 }} />
                </div>
                <p className="text-[22px] font-extrabold text-foreground leading-none">{(userStats?.total ?? 0) * 20}</p>
                <p className="text-[11px] font-semibold text-foreground mt-1">XP totali</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Livello Beer</p>
              </div>
            </Link>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ORA VICINO A TE — taplist horizontal scroll
        ═══════════════════════════════════════════════════════════════ */}
        {(taplistActivity as any[]).length > 0 && typedUser?.userType !== 'pub_owner' && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title flex items-center gap-1.5">
                <Flame className="w-5 h-5 text-primary" />
                Ora vicino a te
              </h2>
              <Link href="/explore/pubs">
                <button className="text-sm font-semibold text-primary">Vedi tutto →</button>
              </Link>
            </div>
            <div className="flex gap-3 -mx-4 px-4 overflow-x-auto scrollbar-hide pb-2">
              {(taplistActivity as any[]).map((item: any) => (
                <Link key={item.id} href={`/pub/${item.pub_slug || item.pub_id}`}>
                  <div className="tap-scale flex-shrink-0 w-[148px] cursor-pointer">
                    <div className="relative h-[112px] rounded-2xl overflow-hidden mb-2 bg-muted shadow-card-sm">
                      {item.beer_image ? (
                        <img src={item.beer_image} alt={item.beer_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary to-[#c95000] flex items-center justify-center">
                          <Beer className="w-8 h-8 text-white/70" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                      {item.beer_abv && (
                        <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-black/45 backdrop-blur-sm rounded-full px-2 py-0.5">
                          {item.beer_abv}%
                        </span>
                      )}
                      <span className={`absolute top-2 left-2 text-[9px] font-extrabold text-white rounded-full px-1.5 py-0.5 uppercase ${item.tap_type === 'pompa' ? 'bg-violet-600' : 'bg-primary'}`}>
                        {item.tap_type === 'pompa' ? 'Pompa' : 'Spina'}
                      </span>
                    </div>
                    <p className="text-[13px] font-semibold text-foreground line-clamp-1 leading-tight">{item.beer_name}</p>
                    {item.beer_style && <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{item.beer_style}</p>}
                    <div className="flex items-center gap-1 mt-1.5">
                      {item.pub_logo
                        ? <img src={item.pub_logo} alt={item.pub_name} className="w-3.5 h-3.5 rounded-full object-cover flex-shrink-0" />
                        : <Store className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                      <p className="text-[10px] text-muted-foreground truncate">{item.pub_name}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            BIRRIFICIO DEL GIORNO — full-width hero card
        ═══════════════════════════════════════════════════════════════ */}
        {breweryOfDay && typedUser?.userType !== 'pub_owner' && (
          <section className="mb-6">
            <Link href={`/brewery/${breweryOfDay.id}`}>
              <div className="tap-scale relative rounded-3xl overflow-hidden cursor-pointer shadow-card" style={{ height: '168px' }}>
                {(breweryOfDay.coverImageUrl || breweryOfDay.logoUrl) ? (
                  <img
                    src={breweryOfDay.coverImageUrl || breweryOfDay.logoUrl}
                    alt={breweryOfDay.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #1a0800 0%, #3d1200 50%, #7a2800 100%)' }} />
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/20" />
                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-300 mb-1.5 uppercase tracking-wide">
                    <Star className="w-3 h-3" fill="currentColor" />
                    Consigliato per te
                  </span>
                  <p className="text-white/65 text-[11px] font-medium mb-0.5">Birrificio del giorno</p>
                  <p className="text-white text-[18px] font-extrabold leading-tight">{breweryOfDay.name}</p>
                  {breweryOfDay.location && (
                    <p className="text-white/60 text-[11px] mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{breweryOfDay.location}
                    </p>
                  )}
                  <button className="mt-3 self-start text-[12px] font-bold bg-white text-stone-900 rounded-full px-4 py-1.5 shadow-md">
                    Scopri il birrificio →
                  </button>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            IN SPINA VICINO A TE — pub list with taplist
        ═══════════════════════════════════════════════════════════════ */}
        {sortedPubs.length > 0 && typedUser?.userType !== 'pub_owner' && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title flex items-center gap-1.5">
                <Beer className="w-5 h-5 text-primary" />
                In spina vicino a te
              </h2>
              <Link href="/explore/pubs">
                <button className="text-sm font-semibold text-primary">Vedi tutto →</button>
              </Link>
            </div>
            <div className="bg-card rounded-2xl overflow-hidden border border-border shadow-card">
              {sortedPubs.slice(0, 4).map((pub: any, idx: number) => {
                const tap = (taplistActivity as any[]).find((t: any) => t.pub_id === pub.id);
                const isLast = idx === Math.min(3, sortedPubs.length - 1);
                return (
                  <Link key={pub.id} href={`/pub/${pub.slug || pub.id}`}>
                    <div className={`tap-scale flex items-center gap-3 px-4 py-3.5 ${!isLast ? 'border-b border-border' : ''}`}>
                      <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                        {pub.logoUrl
                          ? <img src={pub.logoUrl} alt={pub.name} className="w-10 h-10 object-cover" />
                          : <Store className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-foreground truncate">{pub.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {pub.city || pub.address?.split(',')[0]}
                          {pub._distance != null ? ` · ${formatDist(pub._distance)}` : ''}
                        </p>
                      </div>
                      {tap ? (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-[11px] font-medium text-foreground truncate max-w-[90px]">{tap.beer_name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {tap.beer_style}
                              {tap.beer_abv ? ` · ${tap.beer_abv}%` : ''}
                            </p>
                          </div>
                          {tap.beer_image
                            ? <img src={tap.beer_image} alt={tap.beer_name} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                            : (
                              <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                                <Beer className="w-4 h-4 text-primary" />
                              </div>
                            )}
                        </div>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TREND DEL MOMENTO  +  IL TUO PROFILO  (2-col grid)
        ═══════════════════════════════════════════════════════════════ */}
        {Array.isArray(popularStyles) && popularStyles.length > 0 && (
          <div className={`grid gap-3 mb-6 ${isAuthenticated ? 'grid-cols-2' : 'grid-cols-1'}`}>

            {/* Trend del momento */}
            <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] font-bold text-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Trend
                </h3>
                <Link href="/explore/beers">
                  <span className="text-[11px] font-semibold text-primary">Vedi tutto →</span>
                </Link>
              </div>
              <div className="space-y-2.5">
                {(() => {
                  const top = popularStyles.slice(0, 5);
                  const max = top[0]?.count ?? 1;
                  return top.map((s, i) => (
                    <Link key={s.style} href={`/explore/beers?style=${encodeURIComponent(s.style)}`}>
                      <div className="flex items-center gap-2 cursor-pointer">
                        <span className={`text-[10px] font-bold w-3 text-right flex-shrink-0 ${i < 3 ? 'text-primary' : 'text-muted-foreground'}`}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[11px] font-medium text-foreground truncate">{s.style}</p>
                            <p className="text-[10px] text-muted-foreground ml-1 flex-shrink-0">{Math.round((s.count / max) * 100)}%</p>
                          </div>
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-700"
                              style={{ width: `${Math.round((s.count / max) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ));
                })()}
              </div>
            </div>

            {/* Il tuo profilo (only if authenticated) */}
            {isAuthenticated && (
              <div className="bg-card border border-border rounded-2xl p-4 shadow-card flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[14px] font-bold text-foreground">Profilo</h3>
                  <Link href="/dashboard">
                    <span className="text-[11px] font-semibold text-primary">Vai →</span>
                  </Link>
                </div>
                {/* Avatar + level */}
                <div className="flex items-center gap-2 mb-3">
                  {typedUser?.profileImageUrl ? (
                    <img src={typedUser.profileImageUrl} alt="profilo" className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-primary/20" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 ring-2 ring-primary/20">
                      <span className="text-sm font-bold text-primary">{typedUser?.username?.[0]?.toUpperCase() ?? '?'}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] font-bold text-primary">Luppolo Junior</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[80px]">{typedUser?.username}</p>
                  </div>
                </div>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-1 text-center mb-3">
                  <div>
                    <p className="text-[16px] font-extrabold text-foreground leading-none">{userStats?.total ?? 0}</p>
                    <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Bevute</p>
                  </div>
                  <div className="border-x border-border">
                    <p className="text-[16px] font-extrabold text-foreground leading-none">0</p>
                    <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Rec.</p>
                  </div>
                  <div>
                    <p className="text-[16px] font-extrabold text-foreground leading-none">{savedCount}</p>
                    <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Salvate</p>
                  </div>
                </div>
                {/* XP bar */}
                <div className="mt-auto">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">XP</span>
                    <span className="text-[10px] font-bold text-primary">{(userStats?.total ?? 0) * 20} / 600</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-amber-400 transition-all duration-700"
                      style={{ width: `${Math.min(100, Math.round(((userStats?.total ?? 0) * 20 / 600) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            BIRRIFICI DA SCOPRIRE (only desktop or when no taplist)
        ═══════════════════════════════════════════════════════════════ */}
        {breweries.length > 0 && typedUser?.userType !== 'pub_owner' && (taplistActivity as any[]).length === 0 && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-primary flex-shrink-0" />
                Birrifici da Scoprire
              </h2>
              <Link href="/explore/breweries">
                <Button variant="ghost" size="sm" className="text-primary font-semibold text-sm">Vedi tutti →</Button>
              </Link>
            </div>
            <div className="bg-card rounded-2xl overflow-hidden border border-border shadow-card">
              {breweries.slice(0, 5).map((brewery: any, idx: number) => (
                <BreweryCard key={brewery.id} brewery={brewery} isLast={idx === Math.min(4, breweries.length - 1)} />
              ))}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ATTIVITÀ DALLA COMMUNITY
        ═══════════════════════════════════════════════════════════════ */}
        {((taplistActivity as any[]).length > 0 || homeAnnouncements.length > 0) && typedUser?.userType !== 'pub_owner' && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title flex items-center gap-1.5">
                <Users className="w-5 h-5 text-primary" />
                Attività dalla community
              </h2>
              <Link href="/activity">
                <button className="text-sm font-semibold text-primary">Vedi tutto →</button>
              </Link>
            </div>
            <div className="space-y-2">
              {(taplistActivity as any[]).slice(0, 4).map((item: any) => (
                <Link key={item.id} href={`/pub/${item.pub_slug || item.pub_id}`}>
                  <div className="tap-scale flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3 shadow-card-sm">
                    {item.beer_image ? (
                      <img src={item.beer_image} alt={item.beer_name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                        <Beer className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-foreground leading-snug">
                        <span className="font-bold">{item.pub_name}</span> ha aggiunto{' '}
                        <span className="font-bold">{item.beer_name}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {item.beer_style}{item.beer_abv ? ` · ${item.beer_abv}%` : ''}
                      </p>
                    </div>
                    {item.pub_logo ? (
                      <img src={item.pub_logo} alt={item.pub_name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <Store className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                </Link>
              ))}
              {homeAnnouncements.slice(0, 2).map((ann: any) => (
                <Link key={ann.id} href={`/brewery/${ann.breweryId}`}>
                  <div className="tap-scale flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3 shadow-card-sm">
                    {ann.breweryLogo ? (
                      <img src={ann.breweryLogo} alt={ann.breweryName} className="w-10 h-10 rounded-full object-contain bg-muted flex-shrink-0 p-1" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[#c95000] flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-white">{ann.breweryName?.[0]}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-foreground leading-snug">
                        <span className="font-bold">{ann.breweryName}</span>: {ann.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {ann.type === 'release' ? '🍺 Nuova birra' : ann.type === 'collab' ? '🤝 Collab' : '📰 Novità'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            I TUOI PREFERITI
        ═══════════════════════════════════════════════════════════════ */}
        {user && Array.isArray(favorites) && (favorites as any[]).length > 0 && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-primary flex-shrink-0" />
                I Tuoi Preferiti
              </h2>
              <Link href="/dashboard?tab=favorites">
                <Button variant="ghost" size="sm" className="text-primary font-semibold text-sm">Vedi tutti →</Button>
              </Link>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {(favorites as any[]).filter((f: any) => ['pub', 'brewery', 'beer'].includes(f.itemType) && f.itemName).slice(0, 6).map((favorite: any) => {
                const href = favorite.itemType === 'pub' ? `/pub/${favorite.itemId}`
                  : favorite.itemType === 'brewery' ? `/brewery/${favorite.itemId}`
                  : `/beer/${favorite.itemId}`;
                const TypeIcon = favorite.itemType === 'pub' ? Store : Beer;
                return (
                  <Link key={favorite.id} href={href}>
                    <div className="tap-scale bg-card border border-border rounded-2xl p-3 shadow-card-sm cursor-pointer text-center">
                      {favorite.itemImageUrl ? (
                        <img src={favorite.itemImageUrl} alt={favorite.itemName} className="w-10 h-10 rounded-full object-cover mx-auto mb-2 ring-2 ring-orange-100 dark:ring-orange-900/30" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                          <TypeIcon className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <p className="text-[10px] font-medium text-foreground line-clamp-2 leading-tight">{favorite.itemName}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            GUEST CTA — per utenti non autenticati
        ═══════════════════════════════════════════════════════════════ */}
        {!isAuthenticated && (
          <section className="mb-6">
            <div className="relative overflow-hidden rounded-3xl p-6" style={{ background: 'linear-gradient(135deg, #FF7A00 0%, #f98a0e 55%, #f5a623 100%)' }}>
              <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-white/10 pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/07 pointer-events-none" />
              <div className="relative">
                <p className="text-white/80 text-[11px] font-extrabold uppercase tracking-widest mb-1.5">Sei nuovo?</p>
                <h3 className="text-[20px] font-extrabold text-white leading-tight mb-2">
                  Unisciti alla community
                </h3>
                <p className="text-white/80 text-sm leading-snug mb-5">
                  Salva i tuoi preferiti, tieni il diario degli assaggi e scopri birre con persone come te.
                </p>
                <Link href="/api/login">
                  <button className="tap-scale bg-white text-primary font-bold rounded-full h-11 px-6 text-sm shadow-lg">
                    Registrati gratis →
                  </button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            COMMUNITY STATS
        ═══════════════════════════════════════════════════════════════ */}
        <section className="mb-6">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <p className="text-[11px] font-bold text-center text-muted-foreground mb-4 uppercase tracking-[0.14em]">
              La Community Fermenta.to
            </p>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-extrabold text-primary tabular-nums leading-tight">
                  {globalStats?.totalBeers != null ? globalStats.totalBeers.toLocaleString('it-IT') : '—'}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 font-medium">Birre</div>
              </div>
              <div className="text-center border-x border-border">
                <div className="text-2xl font-extrabold text-primary tabular-nums leading-tight">
                  {globalStats?.totalBreweries != null ? globalStats.totalBreweries.toLocaleString('it-IT') : '—'}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 font-medium">Birrifici</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-extrabold text-primary tabular-nums leading-tight">
                  {globalStats?.uniqueStyles != null ? globalStats.uniqueStyles.toLocaleString('it-IT') : '—'}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 font-medium">Stili</div>
              </div>
            </div>
            <div className="border-t border-border mb-4" />
            <div className="flex justify-center gap-16">
              <div className="text-center">
                <div className="text-xl font-extrabold text-primary tabular-nums">
                  {globalStats?.totalUsers != null ? globalStats.totalUsers.toLocaleString('it-IT') : '—'}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 font-medium">Utenti</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-extrabold text-primary tabular-nums">
                  {globalStats?.totalPubs != null ? globalStats.totalPubs.toLocaleString('it-IT') : '—'}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 font-medium">Pub</div>
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />

      <FindBeerSheet
        open={findBeerOpen}
        onClose={() => setFindBeerOpen(false)}
        nearbyPubs={sortedPubs}
      />
    </div>
  );
}
