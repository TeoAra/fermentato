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
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationStatus('granted');
      },
      () => { setLocationStatus('denied'); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  }, []);

  const handleRequestLocation = () => {
    if (!navigator.geolocation) return;
    setLocationStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationStatus('granted');
      },
      () => { setLocationStatus('denied'); },
      { enableHighAccuracy: true, timeout: 10000 }
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
    staleTime: 0,           // always re-fetch on mount for fresh random results
    gcTime: 2 * 60 * 1000, // keep in cache max 2 min between navigations
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
  // Shuffle client-side for additional randomness, pick 12
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

  // Fetch user's own pubs for pub owners
  const { data: myPubs } = useQuery({
    queryKey: ["/api/my-pubs"],
    enabled: isAuthenticated && ((user as any)?.userType === 'pub_owner' || (user as any)?.userType === 'admin'),
  });

  // Fetch brewery for brewery owners
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


  return (
    <div className="min-h-screen bg-[hsl(38,14%,97%)] dark:bg-[hsl(25,14%,7%)]">
      {/* Pull to refresh indicator */}
      {(isPulling || isRefreshing) && (
        <div className="fixed top-16 left-0 right-0 z-40 flex items-center justify-center py-2.5 bg-amber-50 dark:bg-amber-950/90 border-b border-amber-200 dark:border-amber-800 backdrop-blur-sm">
          {isRefreshing ? (
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs font-medium">
              <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
              Aggiornamento in corso...
            </div>
          ) : (
            <div className="text-amber-600 dark:text-amber-400 text-xs font-medium">↓ Rilascia per aggiornare</div>
          )}
        </div>
      )}

      {/* Welcome Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[hsl(38,30%,96%)] via-[hsl(40,20%,98%)] to-[hsl(36,14%,94%)] dark:from-[hsl(25,18%,9%)] dark:via-[hsl(28,14%,8%)] dark:to-[hsl(25,14%,7%)]">
        <div className="absolute inset-0">
          <img
            src="/hero-beer.jpg"
            alt="Beer background"
            className="w-full h-full object-cover opacity-[0.08] dark:opacity-[0.15]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(38,30%,97%)]/90 via-[hsl(38,20%,97%)]/60 to-transparent dark:from-[hsl(25,18%,8%)]/95 dark:via-[hsl(28,14%,7%)]/80 dark:to-transparent"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl md:text-4xl font-bold mb-3 text-[hsl(28,18%,13%)] dark:text-[hsl(40,12%,92%)] tracking-tight">
                Benvenuto su <span className="text-[hsl(35,90%,42%)] dark:text-[hsl(38,88%,58%)]">Fermenta.to</span>
              </h1>
              <p className="text-base text-[hsl(28,8%,44%)] dark:text-[hsl(35,8%,58%)] leading-relaxed">
                Trova pub, birrifici e la perfetta birra artigianale vicino a te
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3 justify-center lg:justify-end">
              {(user as any)?.userType === 'pub_owner' && (
                <Link href="/dashboard">
                  <Button className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold shadow-md border-0">
                    <Store className="mr-2 h-4 w-4" />
                    Gestisci Pub
                  </Button>
                </Link>
              )}

              {(user as any)?.userType === 'brewery_owner' && (
                <Link href="/brewery-dashboard">
                  <Button className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold shadow-md border-0">
                    <Building2 className="mr-2 h-4 w-4" />
                    Il Mio Birrificio
                  </Button>
                </Link>
              )}
              
              {((user as any)?.activeRole === 'admin' || (!((user as any)?.activeRole) && (user as any)?.userType === 'admin')) && (
                <Link href="/admin">
                  <Button className="bg-slate-700 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500 text-white font-semibold shadow-md border-0">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Admin Panel
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">

        {locationStatus === 'denied' && (
          <div className="mb-8 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Navigation className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Attiva la posizione per vedere i locali più vicini a te
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestLocation}
              className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900"
            >
              <Navigation className="w-4 h-4 mr-1" />
              Attiva GPS
            </Button>
          </div>
        )}

        {locationStatus === 'granted' && (
          <div className="mb-8 p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 flex items-center gap-3">
            <Navigation className="w-4 h-4 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-800 dark:text-green-200">
              Posizione attiva - risultati ordinati per vicinanza
            </p>
          </div>
        )}

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

        {/* Il Tuo Pub (per pub owner e admin con pub) */}
        {((user as any)?.userType === 'pub_owner' || ((user as any)?.userType === 'admin' && Array.isArray(myPubs) && myPubs.length > 0)) ? (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[hsl(28,18%,13%)] dark:text-[hsl(40,12%,92%)] flex items-center gap-2 tracking-tight">
                <Store className="h-4.5 w-4.5 text-[hsl(35,90%,42%)] dark:text-[hsl(38,88%,58%)]" />
                Il Tuo Pub
              </h2>
              <Link href="/dashboard">
                <Button size="sm" variant="ghost" className="text-amber-600 dark:text-amber-400 font-semibold text-sm">Dashboard →</Button>
              </Link>
            </div>
            {pubsLoading ? (
              <div className="h-24 bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
            ) : Array.isArray(myPubs) && myPubs.length > 0 ? (
              <div className="space-y-3">
                {myPubs.map((pub: any) => (
                  <div key={pub.id} className="bg-[hsl(40,14%,99%)] dark:bg-[hsl(25,12%,12%)] border border-[hsl(36,14%,88%)] dark:border-[hsl(25,12%,17%)] rounded-2xl p-4 flex items-center gap-4 shadow-[0_1px_3px_hsla(28,16%,8%,0.06)]">
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                      {(pub.logoUrl || pub.coverImageUrl || pub.imageUrl) ? (
                        <img src={pub.logoUrl || pub.coverImageUrl || pub.imageUrl} alt={pub.name} className="w-16 h-16 object-cover" />
                      ) : (
                        <Store className="w-7 h-7 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-gray-900 dark:text-white truncate">{pub.name}</p>
                        {pub.isVerified && (
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full flex-shrink-0">✓ Verificato</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{pub.address}</p>
                      {pub.subscriptionStatus && pub.subscriptionStatus !== 'none' && (
                        <span className="inline-block mt-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full capitalize">
                          {pub.subscriptionStatus === 'trial' ? '⏱ Prova attiva' : pub.subscriptionStatus === 'active' ? '✓ Piano attivo' : pub.subscriptionStatus === 'gifted' ? '🎁 Piano gifted' : pub.subscriptionStatus}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Link href="/dashboard">
                        <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-medium text-xs px-3">Gestisci</Button>
                      </Link>
                      <Link href={`/pub/${pub.slug || pub.id}`}>
                        <Button size="sm" variant="outline" className="text-xs px-3 w-full">Pagina</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-6 text-center">
                <p className="text-gray-500 dark:text-slate-400 text-sm mb-3">Non hai ancora registrato nessun pub</p>
                <Link href="/registra-pub"><Button size="sm">Registra il tuo pub</Button></Link>
              </div>
            )}
          </section>
        ) : null}

        {/* Pub in Evidenza (solo per clienti, non per pub owner o admin con pub) */}
        {((user as any)?.userType !== 'pub_owner' && !((user as any)?.userType === 'admin' && Array.isArray(myPubs) && myPubs.length > 0)) ? (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[hsl(28,18%,13%)] dark:text-[hsl(40,12%,92%)] flex items-center gap-2 tracking-tight">
                <MapPin className="h-4 w-4 text-[hsl(35,90%,42%)] dark:text-[hsl(38,88%,58%)]" />
                {userLocation ? 'Pub Vicini' : 'Pub Consigliati'}
              </h2>
              <Link href="/explore/pubs">
                <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold text-sm">
                  Vedi tutti →
                </Button>
              </Link>
            </div>
            {pubsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-md h-64 animate-pulse" />
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

        {/* Il Tuo Birrificio (solo per brewery_owner) */}
        {(user as any)?.userType === 'brewery_owner' && myBreweryData?.brewery && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[hsl(28,18%,13%)] dark:text-[hsl(40,12%,92%)] flex items-center gap-2 tracking-tight">
                <Building2 className="h-4 w-4 text-[hsl(35,90%,42%)] dark:text-[hsl(38,88%,58%)]" />
                Il Tuo Birrificio
              </h2>
              <Link href="/brewery-dashboard">
                <Button size="sm" variant="ghost" className="text-amber-600 dark:text-amber-400 font-semibold text-sm">Gestisci →</Button>
              </Link>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                {myBreweryData.brewery.logoUrl ? (
                  <img src={myBreweryData.brewery.logoUrl} alt={myBreweryData.brewery.name} className="w-16 h-16 object-contain" />
                ) : (
                  <Building2 className="w-7 h-7 text-amber-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 dark:text-white truncate">{myBreweryData.brewery.name}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />{myBreweryData.brewery.location}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{myBreweryData.beers?.length ?? 0} birre nel catalogo</p>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <Link href="/brewery-dashboard">
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-medium text-xs px-3">Gestisci</Button>
                </Link>
                <Link href={`/brewery/${myBreweryData.brewery.id}`}>
                  <Button size="sm" variant="outline" className="text-xs px-3 w-full">Pagina</Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ─── In Spina Adesso ─────────────────────────────────────────────── */}
        {taplistActivity.length > 0 && (user as any)?.userType !== 'pub_owner' && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-[hsl(28,18%,13%)] dark:text-[hsl(40,12%,92%)] flex items-center gap-2 tracking-tight">
                <Droplets className="h-4 w-4 text-[hsl(35,90%,42%)] dark:text-[hsl(38,88%,58%)]" />
                In Spina Adesso
              </h2>
              <Link href="/explore/pubs">
                <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold text-sm">Vedi tutti →</Button>
              </Link>
            </div>
            {/* horizontal scroll */}
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
              {taplistActivity.map((item: any) => (
                <Link key={item.id} href={`/pub/${item.pub_id}`}>
                  <div className="group flex-shrink-0 w-[148px] cursor-pointer">
                    {/* Beer image area */}
                    <div className="relative h-[96px] rounded-xl overflow-hidden mb-2 shadow-sm group-hover:shadow-md transition-shadow">
                      {item.beer_image ? (
                        <img src={item.beer_image} alt={item.beer_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
                          <Beer className="w-8 h-8 text-white opacity-70" />
                        </div>
                      )}
                      {/* tap type badge */}
                      <span className={`absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.tap_type === 'pompa' ? 'bg-violet-600 text-white' : 'bg-amber-500 text-white'}`}>
                        {item.tap_type === 'pompa' ? 'Pompa' : 'Spina'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{item.beer_name}</p>
                    {item.beer_style && <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">{item.beer_style}</p>}
                    <div className="flex items-center gap-1 mt-1">
                      {item.pub_logo ? (
                        <img src={item.pub_logo} alt={item.pub_name} className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <Store className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      )}
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{item.pub_name}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ─── Birrifici da Scoprire — horizontal scroll redesigned ────────── */}
        {breweries.length > 0 && (user as any)?.userType !== 'pub_owner' && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-[hsl(28,18%,13%)] dark:text-[hsl(40,12%,92%)] flex items-center gap-2 tracking-tight">
                <Building2 className="h-4 w-4 text-[hsl(35,90%,42%)] dark:text-[hsl(38,88%,58%)]" />
                Birrifici da Scoprire
              </h2>
              <Link href="/explore/breweries">
                <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold text-sm">Vedi tutti →</Button>
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
              {breweries.map((brewery: any) => {
                const bg = brewery.coverImageUrl || brewery.logoUrl;
                const initial = brewery.name?.[0]?.toUpperCase() ?? "B";
                return (
                  <Link key={brewery.id} href={`/brewery/${brewery.id}`}>
                    <div className="group flex-shrink-0 w-[148px] cursor-pointer">
                      {/* Cover card */}
                      <div className="relative h-[96px] rounded-xl overflow-hidden mb-2 shadow-sm group-hover:shadow-md transition-shadow">
                        {bg ? (
                          <img src={bg} alt={brewery.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-400 via-orange-500 to-amber-700 flex items-center justify-center">
                            <span className="text-3xl font-bold text-white/80">{initial}</span>
                          </div>
                        )}
                        {/* Dark overlay bottom */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        {/* Location badge */}
                        {(brewery.location || brewery.region) && (
                          <span className="absolute bottom-1.5 left-2 text-[10px] text-white/90 font-medium truncate max-w-[120px] flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                            {brewery.city || brewery.location || brewery.region}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{brewery.name}</p>
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
              <h2 className="text-lg font-semibold text-[hsl(28,18%,13%)] dark:text-[hsl(40,12%,92%)] flex items-center gap-2 tracking-tight">
                <Megaphone className="h-4 w-4 text-[hsl(35,90%,42%)] dark:text-[hsl(38,88%,58%)]" />
                Ultime dai Birrifici
              </h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
              {homeAnnouncements.map((ann: any) => {
                const typeMap: Record<string, { label: string; color: string; Icon: any }> = {
                  news:    { label: "Novità",         color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",     Icon: Newspaper },
                  release: { label: "Nuova Birra",    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", Icon: Rocket },
                  collab:  { label: "Collab",         color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", Icon: Users },
                };
                const t = typeMap[ann.type] ?? typeMap.news;
                return (
                  <Link key={ann.id} href={`/brewery/${ann.breweryId}`}>
                    <div className="group flex-shrink-0 w-[200px] p-3 rounded-xl border border-[hsl(36,14%,87%)] dark:border-[hsl(25,12%,17%)] bg-white dark:bg-[hsl(25,12%,11%)] hover:border-amber-300 dark:hover:border-amber-700 transition-colors cursor-pointer shadow-sm hover:shadow-md">
                      <div className="flex items-center gap-2 mb-2">
                        {ann.breweryLogo ? (
                          <img src={ann.breweryLogo} alt={ann.breweryName} className="w-8 h-8 rounded-full object-contain bg-amber-50 dark:bg-amber-900/20 flex-shrink-0 p-0.5" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-white">{ann.breweryName?.[0]}</span>
                          </div>
                        )}
                        <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 truncate">{ann.breweryName}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full mb-1.5 ${t.color}`}>
                        <t.Icon className="w-2.5 h-2.5" />{t.label}
                      </span>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight">{ann.title}</p>
                      {ann.releaseDate && (
                        <p className="text-[10px] text-gray-400 mt-1">Uscita: {new Date(ann.releaseDate).toLocaleDateString("it-IT")}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Stili Popolari — classifica con barra di progresso */}
        {isAuthenticated && Array.isArray(popularStyles) && popularStyles.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[hsl(28,18%,13%)] dark:text-[hsl(40,12%,92%)] flex items-center gap-2 tracking-tight">
                <Beer className="h-4 w-4 text-[hsl(35,90%,42%)] dark:text-[hsl(38,88%,58%)]" />
                Stili più Amati
              </h2>
              <Link href="/explore/beers">
                <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold text-sm">Esplora →</Button>
              </Link>
            </div>
            {(() => {
              const top = popularStyles.slice(0, 10);
              const max = top[0]?.count ?? 1;
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0">
                  {top.map((s, i) => (
                    <Link key={s.style} href={`/explore/beers?style=${encodeURIComponent(s.style)}`}>
                      <div className="group flex items-center gap-3 py-2.5 border-b border-[hsl(36,14%,90%)] dark:border-[hsl(25,12%,16%)] last:border-0 cursor-pointer hover:bg-[hsl(38,20%,97%)] dark:hover:bg-[hsl(25,12%,12%)] rounded-lg px-1 transition-colors">
                        {/* Rank */}
                        <span className={`flex-shrink-0 w-5 text-right text-[11px] font-bold ${i < 3 ? 'text-[hsl(35,90%,42%)] dark:text-[hsl(38,88%,58%)]' : 'text-gray-400 dark:text-gray-600'}`}>
                          {i + 1}
                        </span>
                        {/* Name + bar */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[hsl(28,14%,18%)] dark:text-[hsl(35,10%,82%)] group-hover:text-[hsl(35,90%,38%)] dark:group-hover:text-[hsl(38,88%,60%)] truncate transition-colors leading-tight mb-1">
                            {s.style}
                          </p>
                          <div className="h-1 bg-[hsl(36,14%,88%)] dark:bg-[hsl(25,12%,18%)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[hsl(35,90%,50%)] dark:bg-[hsl(38,80%,52%)] rounded-full transition-all"
                              style={{ width: `${Math.round((s.count / max) * 100)}%` }}
                            />
                          </div>
                        </div>
                        {/* Count */}
                        <span className="flex-shrink-0 text-[11px] font-semibold text-[hsl(35,90%,42%)] dark:text-[hsl(38,80%,60%)] tabular-nums">
                          {s.count.toLocaleString('it-IT')}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              );
            })()}
          </section>
        )}

        {/* I Tuoi Preferiti */}
        {user && favorites && Array.isArray(favorites) && favorites.length > 0 ? (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[hsl(28,18%,13%)] dark:text-[hsl(40,12%,92%)] flex items-center gap-2 tracking-tight">
                <Heart className="h-4 w-4 text-[hsl(35,90%,42%)] dark:text-[hsl(38,88%,58%)]" />
                I Tuoi Preferiti
              </h2>
              <Link href="/dashboard?tab=favorites">
                <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold text-sm">
                  Vedi tutti →
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {favorites.slice(0, 12).map((favorite: any) => {
                const href = favorite.itemType === 'pub' ? `/pub/${favorite.itemId}` 
                  : favorite.itemType === 'brewery' ? `/brewery/${favorite.itemId}` 
                  : `/beer/${favorite.itemId}`;
                const typeLabel = favorite.itemType === 'pub' ? 'Pub' : favorite.itemType === 'brewery' ? 'Birrificio' : 'Birra';
                const typeColor = favorite.itemType === 'pub' ? 'bg-blue-500' : favorite.itemType === 'brewery' ? 'bg-amber-500' : 'bg-green-500';
                const TypeIcon = favorite.itemType === 'pub' ? Store : Beer;
                
                return (
                  <Link key={favorite.id} href={href}>
                    <div className="group relative bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-3 hover:shadow-lg hover:scale-[1.03] transition-[shadow,transform] duration-200 cursor-pointer h-full">
                      <div className={`absolute top-2 right-2 ${typeColor} rounded-full p-1`}>
                        <TypeIcon className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex flex-col items-center text-center gap-2">
                        {favorite.itemImageUrl ? (
                          <img src={favorite.itemImageUrl} alt={favorite.itemName} className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700" />
                        ) : (
                          <div className={`w-12 h-12 rounded-full ${typeColor} flex items-center justify-center`}>
                            <TypeIcon className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2 leading-tight">
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

        {/* Statistiche Platform */}
        <section className="mb-8 bg-[hsl(38,30%,96%)] dark:bg-[hsl(25,14%,10%)] border border-[hsl(36,20%,88%)] dark:border-[hsl(25,12%,17%)] rounded-2xl p-5 lg:p-6">
          <h2 className="text-[11px] font-bold text-center text-[hsl(28,8%,52%)] dark:text-[hsl(35,6%,52%)] mb-5 uppercase tracking-[0.12em]">
            La Community Fermenta.to
          </h2>
          {/* Riga 1: le 3 voci principali */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center">
              <div className="text-[17px] font-bold text-[hsl(35,90%,44%)] dark:text-[hsl(38,88%,58%)] tabular-nums leading-tight">{globalStats?.totalBeers != null ? globalStats.totalBeers.toLocaleString("it-IT") : '—'}</div>
              <div className="text-[10px] text-[hsl(28,8%,52%)] dark:text-[hsl(35,6%,52%)] mt-1 font-medium uppercase tracking-wide">Birre</div>
            </div>
            <div className="text-center border-x border-[hsl(36,14%,86%)] dark:border-[hsl(25,12%,18%)]">
              <div className="text-[17px] font-bold text-[hsl(215,75%,50%)] dark:text-[hsl(215,80%,65%)] tabular-nums leading-tight">{globalStats?.totalBreweries != null ? globalStats.totalBreweries.toLocaleString("it-IT") : '—'}</div>
              <div className="text-[10px] text-[hsl(28,8%,52%)] dark:text-[hsl(35,6%,52%)] mt-1 font-medium uppercase tracking-wide">Birrifici</div>
            </div>
            <div className="text-center">
              <div className="text-[17px] font-bold text-[hsl(175,55%,38%)] dark:text-[hsl(175,60%,55%)] tabular-nums leading-tight">{globalStats?.uniqueStyles != null ? globalStats.uniqueStyles.toLocaleString("it-IT") : '—'}</div>
              <div className="text-[10px] text-[hsl(28,8%,52%)] dark:text-[hsl(35,6%,52%)] mt-1 font-medium uppercase tracking-wide">Stili</div>
            </div>
          </div>
          {/* Divisore */}
          <div className="border-t border-[hsl(36,14%,86%)] dark:border-[hsl(25,12%,18%)] mb-4" />
          {/* Riga 2: Utenti e Pub — centrata */}
          <div className="flex justify-center gap-12">
            <div className="text-center">
              <div className="text-[15px] font-bold text-[hsl(142,55%,38%)] dark:text-[hsl(142,60%,55%)] tabular-nums leading-tight">{globalStats?.totalUsers != null ? globalStats.totalUsers.toLocaleString("it-IT") : '—'}</div>
              <div className="text-[10px] text-[hsl(28,8%,52%)] dark:text-[hsl(35,6%,52%)] mt-1 font-medium uppercase tracking-wide">Utenti</div>
            </div>
            <div className="text-center">
              <div className="text-[15px] font-bold text-[hsl(270,55%,50%)] dark:text-[hsl(270,60%,68%)] tabular-nums leading-tight">{globalStats?.totalPubs != null ? globalStats.totalPubs.toLocaleString("it-IT") : '—'}</div>
              <div className="text-[10px] text-[hsl(28,8%,52%)] dark:text-[hsl(35,6%,52%)] mt-1 font-medium uppercase tracking-wide">Pub</div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}