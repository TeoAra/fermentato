import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState, useEffect, useMemo, useCallback } from "react";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { Beer, MapPin, Heart, Store, TrendingUp, Navigation, Building2, ChevronRight, Zap, List, CalendarDays, Settings2, Megaphone, Newspaper, Rocket, Users, Droplets } from "lucide-react";
import Footer from "@/components/footer";
import PubCard from "@/components/pub-card";
import HomepageMap from "@/components/homepage-map";
import { Button } from "@/components/ui/button";

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
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      return;
    }
    setLocationStatus('requesting');
    let watchId: number | null = null;
    let gotCoarse = false;

    // Fase 1 — risposta immediata con posizione approssimativa (cache/IP)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        gotCoarse = true;
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus('granted');
      },
      () => { /* fase 2 gestisce l'errore */ },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 5000 }
    );

    // Fase 2 — raffinamento progressivo GPS (maximumAge: 0 = sempre fresco)
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus('granted');
        // Precisione GPS raggiunta (< 50 m su mobile), stop watch
        if (pos.coords.accuracy <= 50 && watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }
      },
      () => {
        if (!gotCoarse) setLocationStatus('denied');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const handleRequestLocation = () => {
    if (!navigator.geolocation) return;
    setLocationStatus('requesting');
    let watchId: number | null = null;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus('granted');
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 5000 }
    );

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus('granted');
        if (pos.coords.accuracy <= 50 && watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }
      },
      () => { setLocationStatus('denied'); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  };

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
    queryKey: ["/api/breweries/all"],
    staleTime: 5 * 60 * 1000,
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
    if (!userLocation) return pubs.slice(0, 3);
    return [...pubs]
      .map((pub: any) => ({
        ...pub,
        _distance: pub.latitude && pub.longitude
          ? haversineDistance(userLocation.lat, userLocation.lng, parseFloat(pub.latitude), parseFloat(pub.longitude))
          : Infinity,
      }))
      .sort((a, b) => a._distance - b._distance)
      .slice(0, 3);
  }, [pubs, userLocation]);

  const typedUser = user as any;

  return (
    <div className="min-h-screen bg-background">
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

      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#FFF8F2] dark:bg-[hsl(25,20%,9%)]">
        {/* Subtle dot texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, #F77104 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            opacity: 0.04,
          }}
        />
        {/* Warm glow top-right */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(247,113,4,0.12) 0%, transparent 70%)" }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10 lg:pt-12 lg:pb-12">
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">

            {/* Left: text content */}
            <div className="max-w-xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200/70 dark:border-orange-700/30 rounded-full px-3.5 py-1.5 mb-5">
                <Beer className="w-3.5 h-3.5 text-primary" />
                <span className="text-primary text-xs font-bold tracking-wide">Il tuo punto di riferimento sulla birra</span>
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl lg:text-[3.4rem] font-extrabold text-foreground mb-3 leading-[1.1] tracking-tight">
                {typedUser?.firstName ? `Ciao, ${typedUser.firstName}!` : 'Cosa scopri oggi?'}<br />
                <span style={{
                  background: "linear-gradient(135deg, #F77104 0%, #f98a0e 50%, #f5a623 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>
                  Esplora il craft beer
                </span>
              </h1>

              <p className="text-stone-500 dark:text-stone-400 text-base md:text-lg leading-relaxed mb-5">
                Pub, birrifici e birre da tutto il mondo — geolocalizzati in tempo reale
              </p>

              {/* Stat pills */}
              {globalStats && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {globalStats.totalBreweries > 0 && (
                    <div className="flex items-center gap-1.5 bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-200 dark:border-[hsl(25,12%,16%)] rounded-full px-3 py-1 text-xs font-semibold text-stone-600 dark:text-stone-400 shadow-sm">
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                      {globalStats.totalBreweries} birrifici
                    </div>
                  )}
                  {globalStats.totalPubs > 0 && (
                    <div className="flex items-center gap-1.5 bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-200 dark:border-[hsl(25,12%,16%)] rounded-full px-3 py-1 text-xs font-semibold text-stone-600 dark:text-stone-400 shadow-sm">
                      <Store className="w-3.5 h-3.5 text-primary" />
                      {globalStats.totalPubs} pub
                    </div>
                  )}
                  {globalStats.totalBeers > 0 && (
                    <div className="flex items-center gap-1.5 bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-200 dark:border-[hsl(25,12%,16%)] rounded-full px-3 py-1 text-xs font-semibold text-stone-600 dark:text-stone-400 shadow-sm">
                      <Beer className="w-3.5 h-3.5 text-primary" />
                      {globalStats.totalBeers} birre
                    </div>
                  )}
                </div>
              )}

              {/* CTA buttons — 1 primary, 1 secondary, 1 text link */}
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/explore/breweries">
                  <Button
                    className="font-bold shadow-md shadow-orange-500/20 rounded-full h-10 px-6 text-sm text-white border-0"
                    style={{ background: "linear-gradient(135deg, #F77104 0%, #f98a0e 50%, #f5a623 100%)" }}
                  >
                    <Building2 className="w-4 h-4 mr-1.5" />
                    Esplora Birrifici
                  </Button>
                </Link>
                <Link href="/explore/pubs">
                  <Button variant="outline" className="border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-foreground hover:bg-stone-100 dark:hover:bg-stone-900/30 font-semibold rounded-full h-10 px-6 text-sm">
                    <Store className="w-4 h-4 mr-1.5" />
                    Pub Vicini
                  </Button>
                </Link>
                <Link href="/festival">
                  <span className="text-sm text-primary font-semibold hover:underline flex items-center gap-1 px-2">
                    <CalendarDays className="w-3.5 h-3.5" />
                    Festival
                  </span>
                </Link>
              </div>
            </div>

            {/* Right: role-based quick actions */}
            {(typedUser?.userType === 'pub_owner' || typedUser?.userType === 'brewery_owner' || typedUser?.userType === 'admin') && (
              <div className="flex flex-col gap-2 lg:flex-shrink-0 w-full lg:w-auto">
                {typedUser?.userType === 'pub_owner' && (
                  <Link href="/dashboard">
                    <Button variant="outline" className="border-stone-300 dark:border-stone-700 bg-white dark:bg-[hsl(25,14%,10%)] text-foreground hover:bg-stone-50 dark:hover:bg-stone-900/30 font-semibold rounded-2xl w-full shadow-sm">
                      <Store className="mr-2 h-4 w-4 text-primary" />
                      Gestisci Pub
                    </Button>
                  </Link>
                )}
                {typedUser?.userType === 'brewery_owner' && (
                  <Link href="/brewery-dashboard">
                    <Button variant="outline" className="border-stone-300 dark:border-stone-700 bg-white dark:bg-[hsl(25,14%,10%)] text-foreground hover:bg-stone-50 dark:hover:bg-stone-900/30 font-semibold rounded-2xl w-full shadow-sm">
                      <Building2 className="mr-2 h-4 w-4 text-primary" />
                      Il Mio Birrificio
                    </Button>
                  </Link>
                )}
                {(typedUser?.activeRole === 'admin' || (!typedUser?.activeRole && typedUser?.userType === 'admin')) && (
                  <Link href="/admin">
                    <Button variant="outline" className="border-stone-300 dark:border-stone-700 bg-white dark:bg-[hsl(25,14%,10%)] text-foreground hover:bg-stone-50 dark:hover:bg-stone-900/30 font-semibold rounded-2xl w-full shadow-sm">
                      <TrendingUp className="mr-2 h-4 w-4 text-primary" />
                      Admin Panel
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Mappa full-bleed, agganciata al hero ────────────────────────── */}
      <HomepageMap
        pubs={Array.isArray(pubs) ? pubs : []}
        breweries={Array.isArray(allBreweries) ? allBreweries : (Array.isArray(breweries) ? breweries : [])}
        userLocation={userLocation}
        isLoading={pubsLoading || breweriesLoading}
        onLocate={(loc) => {
          setUserLocation(loc);
          setLocationStatus('granted');
        }}
      />

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
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" />
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
                  <div key={pub.id} className="bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-100 dark:border-[hsl(25,12%,16%)] rounded-2xl p-4 flex items-center gap-4 shadow-sm">
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

        {/* ─── Pub Consigliati (customer) ───────────────────────────────────── */}
        {(typedUser?.userType !== 'pub_owner' && !(typedUser?.userType === 'admin' && Array.isArray(myPubs) && myPubs.length > 0)) ? (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {userLocation ? 'Pub Vicini' : 'Pub Consigliati'}
              </h2>
              <Link href="/explore/pubs">
                <Button variant="ghost" size="sm" className="text-primary hover:bg-stone-50 dark:hover:bg-stone-900/20 font-semibold text-sm">
                  Vedi tutti →
                </Button>
              </Link>
            </div>
            {pubsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-stone-50 dark:bg-[hsl(25,14%,12%)] rounded-2xl h-64 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedPubs.map((pub: any) => (
                  <PubCard 
                    key={pub.id} 
                    pub={pub}
                    distance={userLocation && pub._distance !== Infinity ? pub._distance : undefined}
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
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Il Tuo Birrificio
              </h2>
              <Link href="/brewery-dashboard">
                <Button size="sm" variant="ghost" className="text-primary hover:bg-stone-50 dark:hover:bg-stone-900/20 font-semibold text-sm">Gestisci →</Button>
              </Link>
            </div>
            <div className="bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-100 dark:border-[hsl(25,12%,16%)] rounded-2xl p-4 flex items-center gap-4 shadow-sm">
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
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Droplets className="h-4 w-4 text-primary" />
                In Spina Adesso
              </h2>
              <Link href="/explore/pubs">
                <Button variant="ghost" size="sm" className="text-primary hover:bg-stone-50 dark:hover:bg-stone-900/20 font-semibold text-sm">Vedi tutti →</Button>
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
              {taplistActivity.map((item: any) => (
                <Link key={item.id} href={`/pub/${item.pub_slug || item.pub_id}`}>
                  <div className="group flex-shrink-0 w-[148px] cursor-pointer">
                    <div className="relative h-[96px] rounded-2xl overflow-hidden mb-2 shadow-sm group-hover:shadow-md transition-shadow">
                      {item.beer_image ? (
                        <img src={item.beer_image} alt={item.beer_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary to-[hsl(20,95%,42%)] flex items-center justify-center">
                          <Beer className="w-8 h-8 text-white opacity-70" />
                        </div>
                      )}
                      <span className={`absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.tap_type === 'pompa' ? 'bg-violet-600 text-white' : 'bg-primary text-white'}`}>
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
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Birrifici da Scoprire
              </h2>
              <Link href="/explore/breweries">
                <Button variant="ghost" size="sm" className="text-primary hover:bg-stone-50 dark:hover:bg-stone-900/20 font-semibold text-sm">Vedi tutti →</Button>
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
              {breweries.map((brewery: any) => {
                const bg = brewery.coverImageUrl || brewery.logoUrl;
                const initial = brewery.name?.[0]?.toUpperCase() ?? "B";
                return (
                  <Link key={brewery.id} href={`/brewery/${brewery.id}`}>
                    <div className="group flex-shrink-0 w-[148px] cursor-pointer">
                      <div className="relative h-[96px] rounded-2xl overflow-hidden mb-2 shadow-sm group-hover:shadow-md transition-shadow">
                        {bg ? (
                          <img src={bg} alt={brewery.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary via-[hsl(22,92%,46%)] to-[hsl(20,95%,42%)] flex items-center justify-center">
                            <span className="text-3xl font-bold text-white/80">{initial}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        {(brewery.location || brewery.region) && (
                          <span className="absolute bottom-1.5 left-2 text-[10px] text-white/90 font-medium truncate max-w-[120px] flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                            {brewery.city || brewery.location || brewery.region}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">{brewery.name}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── Ultime dai Birrifici ─────────────────────────────────────────── */}
        {homeAnnouncements.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" />
                Ultime dai Birrifici
              </h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
              {homeAnnouncements.map((ann: any) => {
                const typeMap: Record<string, { label: string; color: string; Icon: any }> = {
                  news:    { label: "Novità",      color: "bg-stone-50 text-primary dark:bg-stone-900/40 dark:text-orange-300",   Icon: Newspaper },
                  release: { label: "Nuova Birra", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", Icon: Rocket },
                  collab:  { label: "Collab",      color: "bg-stone-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", Icon: Users },
                };
                const t = typeMap[ann.type] ?? typeMap.news;
                return (
                  <Link key={ann.id} href={`/brewery/${ann.breweryId}`}>
                    <div className="group flex-shrink-0 w-[200px] p-3 rounded-2xl border border-stone-100 dark:border-[hsl(25,12%,16%)] bg-white dark:bg-[hsl(25,12%,11%)] hover:border-primary/25 dark:hover:border-primary/30 transition-colors cursor-pointer shadow-sm hover:shadow-md">
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
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Beer className="h-4 w-4 text-primary" />
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
                <div className="bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-100 dark:border-[hsl(25,12%,16%)] rounded-2xl p-4 shadow-sm">
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
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" />
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
                    <div className="group relative bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-100 dark:border-[hsl(25,12%,16%)] rounded-2xl p-3 hover:shadow-md hover:border-primary/20 hover:scale-[1.03] transition-all duration-200 cursor-pointer h-full">
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

        {/* ─── Statistiche Community ────────────────────────────────────────── */}
        <section className="mb-8 bg-gradient-to-br from-orange-50 to-[hsl(38,30%,96%)] dark:from-[hsl(25,14%,10%)] dark:to-[hsl(25,12%,9%)] border border-stone-200 dark:border-[hsl(25,12%,16%)] rounded-2xl p-5 lg:p-6">
          <h2 className="text-[11px] font-bold text-center text-muted-foreground mb-5 uppercase tracking-[0.12em]">
            La Community Fermenta.to
          </h2>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center">
              <div className="text-[17px] font-bold text-primary tabular-nums leading-tight">{globalStats?.totalBeers != null ? globalStats.totalBeers.toLocaleString("it-IT") : '—'}</div>
              <div className="text-[10px] text-muted-foreground mt-1 font-medium uppercase tracking-wide">Birre</div>
            </div>
            <div className="text-center border-x border-stone-200 dark:border-[hsl(25,12%,16%)]">
              <div className="text-[17px] font-bold text-primary tabular-nums leading-tight">{globalStats?.totalBreweries != null ? globalStats.totalBreweries.toLocaleString("it-IT") : '—'}</div>
              <div className="text-[10px] text-muted-foreground mt-1 font-medium uppercase tracking-wide">Birrifici</div>
            </div>
            <div className="text-center">
              <div className="text-[17px] font-bold text-primary tabular-nums leading-tight">{globalStats?.uniqueStyles != null ? globalStats.uniqueStyles.toLocaleString("it-IT") : '—'}</div>
              <div className="text-[10px] text-muted-foreground mt-1 font-medium uppercase tracking-wide">Stili</div>
            </div>
          </div>
          <div className="border-t border-stone-200 dark:border-[hsl(25,12%,16%)] mb-4" />
          <div className="flex justify-center gap-12">
            <div className="text-center">
              <div className="text-[15px] font-bold text-primary tabular-nums leading-tight">{globalStats?.totalUsers != null ? globalStats.totalUsers.toLocaleString("it-IT") : '—'}</div>
              <div className="text-[10px] text-muted-foreground mt-1 font-medium uppercase tracking-wide">Utenti</div>
            </div>
            <div className="text-center">
              <div className="text-[15px] font-bold text-primary tabular-nums leading-tight">{globalStats?.totalPubs != null ? globalStats.totalPubs.toLocaleString("it-IT") : '—'}</div>
              <div className="text-[10px] text-muted-foreground mt-1 font-medium uppercase tracking-wide">Pub</div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
