import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { Beer, MapPin, Heart, Store, TrendingUp, Navigation } from "lucide-react";
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
  
  const { data: pubs, isLoading: pubsLoading } = useQuery({
    queryKey: ["/api/pubs"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: breweries, isLoading: breweriesLoading } = useQuery({
    queryKey: ["/api/breweries"],
    queryFn: () => fetch("/api/breweries?random=true&limit=8").then(res => res.json()),
    staleTime: 5 * 60 * 1000,
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
    enabled: isAuthenticated && (user as any)?.userType === 'pub_owner',
  });

  const { data: globalStats } = useQuery<{ totalBeers: number; totalBreweries: number; uniqueStyles: number }>({
    queryKey: ["/api/stats"],
    staleTime: 10 * 60 * 1000,
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
    <div className="min-h-screen bg-white dark:bg-slate-950">
      
      {/* Welcome Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-slate-100 dark:from-gray-900 dark:via-slate-800 dark:to-gray-900">
        <div className="absolute inset-0">
          <img
            src="/hero-beer.jpg"
            alt="Beer background"
            className="w-full h-full object-cover opacity-10 dark:opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-amber-50/60 to-transparent dark:from-gray-900/95 dark:via-slate-900/80 dark:to-transparent"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-18">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900 dark:text-white">
                Benvenuto su <span className="text-amber-500 dark:text-amber-400">Fermenta.to</span>
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Trova pub, birrifici e la perfetta birra artigianale vicino a te
              </p>
            </div>
            
            <div className="flex gap-3">
              {(user as any)?.userType === 'pub_owner' && (
                <Link href="/dashboard">
                  <Button className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold shadow-md border-0">
                    <Beer className="mr-2" />
                    Dashboard Pub
                  </Button>
                </Link>
              )}
              
              {((user as any)?.activeRole === 'admin' || (!((user as any)?.activeRole) && (user as any)?.userType === 'admin')) && (
                <Link href="/admin">
                  <Button className="bg-slate-700 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500 text-white font-semibold shadow-md border-0">
                    <TrendingUp className="mr-2" />
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

        {/* I Tuoi Pub (solo per pub owner) */}
        {(user as any)?.userType === 'pub_owner' ? (
          <section className="mb-16 lg:mb-20">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl mr-3">
                  <Store className="h-6 w-6 text-white" />
                </div>
                I Tuoi Pub
              </h2>
              <Link href="/pub-registration">
                <Button className="bg-primary text-white hover:bg-primary/90">
                  + Aggiungi Pub
                </Button>
              </Link>
            </div>
            
            {pubsLoading ? (
              <div className="animate-pulse">
                <div className="bg-white rounded-xl shadow-md h-80 w-full max-w-md"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Array.isArray(myPubs) ? myPubs.map((pub: any) => (
                  <PubCard 
                    key={pub.id} 
                    pub={pub} 
                  />
                )) : null}
                {Array.isArray(myPubs) && myPubs.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <p className="text-gray-500 mb-4">Non hai ancora registrato nessun pub</p>
                    <Link href="/pub-registration">
                      <Button>Registra il tuo primo pub</Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </section>
        ) : null}

        {/* Pub in Evidenza (solo per clienti) */}
        {(user as any)?.userType !== 'pub_owner' ? (
          <section className="mb-16 lg:mb-20">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl mr-3">
                  <Store className="h-6 w-6 text-white" />
                </div>
                {userLocation ? 'Pub Vicini' : 'Pub Consigliati'}
              </h2>
              <Link href="/explore/pubs">
                <Button variant="ghost" className="text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold">
                  Vedi tutti →
                </Button>
              </Link>
            </div>

            {pubsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-md h-80 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

        {/* I Tuoi Preferiti */}
        {user && favorites && Array.isArray(favorites) && favorites.length > 0 ? (
          <section className="mb-16 lg:mb-20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <div className="p-2 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl mr-3">
                  <Heart className="h-5 w-5 text-white" />
                </div>
                I Tuoi Preferiti
              </h2>
              <Link href="/dashboard?tab=favorites">
                <Button variant="ghost" className="text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold text-sm">
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
                    <div className="group relative bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-3 hover:shadow-lg hover:scale-[1.03] transition-all duration-200 cursor-pointer h-full">
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
        <section className="mb-16 lg:mb-20 bg-amber-50 dark:bg-slate-800 border border-amber-100 dark:border-slate-700 rounded-2xl p-10 lg:p-12">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            La Community Fermenta.to
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-12">
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-500 dark:text-amber-400 mb-2">{globalStats?.totalBeers?.toLocaleString("it-IT") ?? '...'}</div>
              <div className="text-gray-600 dark:text-gray-400">Birre nel Catalogo</div>
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">{globalStats?.totalBreweries?.toLocaleString("it-IT") ?? '...'}</div>
              <div className="text-gray-600 dark:text-gray-400">Birrifici Mondiali</div>
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-bold text-teal-600 dark:text-teal-400 mb-2">{globalStats?.uniqueStyles?.toLocaleString("it-IT") ?? '...'}</div>
              <div className="text-gray-600 dark:text-gray-400">Stili Diversi</div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}