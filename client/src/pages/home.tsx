import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { Beer, MapPin, Heart, Store, TrendingUp, Navigation } from "lucide-react";
import Footer from "@/components/footer";
import PubCard from "@/components/pub-card";
import BreweryCard from "@/components/brewery-card";
import HomepageMap from "@/components/homepage-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ImageWithFallback from "@/components/image-with-fallback";

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

// Square Card Components
function BrewerySquareCard({ brewery }: { brewery: any }) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if brewery is favorited
  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  const isBreweryFavorited = Array.isArray(favorites) && favorites.some((fav: any) => 
    fav.itemType === 'brewery' && fav.itemId === brewery.id
  );

  // Favorite mutation
  const favoriteMutation = useMutation({
    mutationFn: async ({ action }: { action: 'add' | 'remove' }) => {
      if (action === 'add') {
        return apiRequest('/api/favorites', { method: 'POST' }, { itemType: 'brewery', itemId: brewery.id });
      } else {
        return apiRequest(`/api/favorites/brewery/${brewery.id}`, { method: 'DELETE' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "Successo",
        description: isBreweryFavorited ? "Rimosso dai favoriti" : "Aggiunto ai favoriti",
      });
    },
  });

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast({
        title: "Accesso richiesto",
        description: "Effettua l'accesso per aggiungere ai favoriti",
        variant: "destructive",
      });
      return;
    }

    favoriteMutation.mutate({
      action: isBreweryFavorited ? 'remove' : 'add'
    });
  };

  return (
    <Link href={`/brewery/${brewery.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group h-48 relative">
        <CardContent className="p-4 h-full flex flex-col">
          {/* Favorite Button */}
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="sm"
              className={`absolute top-2 right-2 h-8 w-8 p-0 z-10 ${isBreweryFavorited ? 'text-red-600 hover:text-red-700' : 'text-gray-400 hover:text-red-600'}`}
              onClick={handleFavoriteToggle}
              disabled={favoriteMutation.isPending}
            >
              <Heart className={`w-4 h-4 ${isBreweryFavorited ? 'fill-current' : ''}`} />
            </Button>
          )}

          <div className="relative w-full h-24 mb-3 rounded-lg overflow-hidden bg-gray-100">
            <ImageWithFallback
              src={brewery.logoUrl}
              alt={`Logo ${brewery.name}`}
              imageType="brewery"
              containerClassName="w-full h-24 rounded-lg overflow-hidden bg-gray-100"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              iconSize="lg"
            />
          </div>
          
          <div className="flex-1 flex flex-col">
            <h3 className="font-semibold text-sm mb-1 line-clamp-1 group-hover:text-primary transition-colors">
              {brewery.name}
            </h3>
            
            <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="line-clamp-1">
                {brewery.location}, {brewery.region || brewery.country}
              </span>
            </div>
            
            <div className="flex flex-wrap gap-1 mt-auto">
              <Badge variant="outline" className="text-xs px-2 py-0.5 h-auto">
                <Beer className="w-3 h-3 mr-1" />
                {brewery.beerCount || 0} birre
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
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
  });

  const { data: breweries, isLoading: breweriesLoading } = useQuery({
    queryKey: ["/api/breweries"],
    queryFn: () => fetch("/api/breweries?random=true&limit=8").then(res => res.json()),
  });

  const { data: allBreweries } = useQuery({
    queryKey: ["/api/breweries/all"],
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

  const sortedBreweries = useMemo(() => {
    if (!Array.isArray(breweries)) return [];
    if (!userLocation) return breweries.slice(0, 4);
    return [...breweries]
      .map((brewery: any) => ({
        ...brewery,
        _distance: brewery.latitude && brewery.longitude
          ? haversineDistance(userLocation.lat, userLocation.lng, parseFloat(brewery.latitude), parseFloat(brewery.longitude))
          : Infinity,
      }))
      .sort((a, b) => a._distance - b._distance)
      .slice(0, 4);
  }, [breweries, userLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-amber-50 to-orange-50 dark:from-gray-950 dark:via-amber-950 dark:to-orange-950">
      
      {/* Welcome Hero with Glassmorphism */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1436076863939-06870fe779c2?w=1920&h=400&fit=crop"
            alt="Beer background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-amber-600/90 via-orange-600/90 to-red-600/90"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="glass-card rounded-2xl p-8 backdrop-blur-md bg-white/10 border border-white/20">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="text-center lg:text-left">
                <h1 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                  Scopri le Migliori Birre d'Italia 🍺
                </h1>
                <p className="text-xl text-orange-100">
                  Trova pub, birrifici e la perfetta birra artigianale per te
                </p>
              </div>
              
              <div className="flex gap-3">
                {(user as any)?.userType === 'pub_owner' && (
                  <Link href="/dashboard">
                    <Button className="bg-white text-amber-600 hover:bg-gray-100 shadow-lg">
                      <Beer className="mr-2" />
                      Dashboard Pub
                    </Button>
                  </Link>
                )}
                
                {((user as any)?.activeRole === 'admin' || (!((user as any)?.activeRole) && (user as any)?.userType === 'admin')) && (
                  <Link href="/admin">
                    <Button className="bg-yellow-500 text-white hover:bg-yellow-600 shadow-lg">
                      <TrendingUp className="mr-2" />
                      Admin Panel
                    </Button>
                  </Link>
                )}
              </div>
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

        {/* Quick Actions */}
        <section className="mb-16 lg:mb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/explore/pubs">
              <div className="glass-card border-0 rounded-xl p-8 text-center group hover:scale-105 transition-all duration-300 cursor-pointer">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl inline-flex mb-4 group-hover:scale-110 transition-transform">
                  <MapPin className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Trova Pub Vicini</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Scopri i migliori pub nella tua zona</p>
              </div>
            </Link>
            
            <Link href="/explore/breweries">
              <div className="glass-card border-0 rounded-xl p-8 text-center group hover:scale-105 transition-all duration-300 cursor-pointer">
                <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl inline-flex mb-4 group-hover:scale-110 transition-transform">
                  <Beer className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Esplora Birrifici</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Conosci i birrifici artigianali italiani</p>
              </div>
            </Link>
            
            <Link href="/dashboard?tab=favorites">
              <div className="glass-card border-0 rounded-xl p-8 text-center group hover:scale-105 transition-all duration-300 cursor-pointer">
                <div className="p-4 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl inline-flex mb-4 group-hover:scale-110 transition-transform">
                  <Heart className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">I Tuoi Preferiti</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Gestisci le tue birre e pub preferiti ({Array.isArray(favorites) ? favorites.length : 0})</p>
              </div>
            </Link>
          </div>
        </section>

        <HomepageMap
          pubs={Array.isArray(pubs) ? pubs : []}
          breweries={Array.isArray(allBreweries) ? allBreweries : (Array.isArray(breweries) ? breweries : [])}
          userLocation={userLocation}
          isLoading={pubsLoading || breweriesLoading}
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
            <h2 className="text-3xl font-bold text-secondary mb-12 text-center">
              I Tuoi Preferiti ❤️
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Pub Preferiti */}
              {favorites.filter(fav => fav.itemType === 'pub').length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Link href="/dashboard?tab=favorites" className="flex items-center hover:text-primary transition-colors">
                        <Store className="w-5 h-5 mr-2" />
                        Pub ({favorites.filter(fav => fav.itemType === 'pub').length})
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {favorites.filter(fav => fav.itemType === 'pub').slice(0, 3).map((favorite: any) => (
                        <Link key={favorite.id} href={`/pub/${favorite.itemId}`}>
                          <div className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="font-medium">{favorite.itemName || `Pub #${favorite.itemId}`}</div>
                            <div className="text-sm text-gray-600">Clicca per vedere</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Birrifici Preferiti */}
              {favorites.filter(fav => fav.itemType === 'brewery').length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Link href="/dashboard?tab=favorites" className="flex items-center hover:text-primary transition-colors">
                        <Beer className="w-5 h-5 mr-2" />
                        Birrifici ({favorites.filter(fav => fav.itemType === 'brewery').length})
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {favorites.filter(fav => fav.itemType === 'brewery').slice(0, 3).map((favorite: any) => (
                        <Link key={favorite.id} href={`/brewery/${favorite.itemId}`}>
                          <div className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="font-medium">{favorite.itemName || `Birrificio #${favorite.itemId}`}</div>
                            <div className="text-sm text-gray-600">Clicca per vedere</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Birre Preferite */}
              {favorites.filter(fav => fav.itemType === 'beer').length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Link href="/dashboard?tab=favorites" className="flex items-center hover:text-primary transition-colors">
                        <Beer className="w-5 h-5 mr-2" />
                        Birre ({favorites.filter(fav => fav.itemType === 'beer').length})
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {favorites.filter(fav => fav.itemType === 'beer').slice(0, 3).map((favorite: any) => (
                        <Link key={favorite.id} href={`/beer/${favorite.itemId}`}>
                          <div className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="font-medium">{favorite.itemName || `Birra #${favorite.itemId}`}</div>
                            <div className="text-sm text-gray-600">Clicca per vedere</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
        ) : null}

        {/* Birrifici in Evidenza */}
        <section className="mb-16 lg:mb-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl mr-3">
                <Beer className="h-6 w-6 text-white" />
              </div>
              {userLocation ? 'Birrifici Vicini' : 'Birrifici Artigianali'}
            </h2>
            <Link href="/explore/breweries">
              <Button variant="ghost" className="text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold">
                Esplora tutti →
              </Button>
            </Link>
          </div>

          {breweriesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md h-48 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {sortedBreweries.map((brewery: any) => (
                <BreweryCard 
                  key={brewery.id} 
                  brewery={brewery}
                  distance={userLocation && brewery._distance !== Infinity ? brewery._distance : undefined}
                />
              ))}
            </div>
          )}
        </section>

        {/* Statistiche Platform */}
        <section className="mb-16 lg:mb-20 glass-card border-0 rounded-2xl p-10 lg:p-12">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            La Community Fermenta.to
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-12">
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent mb-2">29,753</div>
              <div className="text-gray-600 dark:text-gray-400">Birre nel Catalogo</div>
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent mb-2">2,968</div>
              <div className="text-gray-600 dark:text-gray-400">Birrifici Mondiali</div>
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent mb-2">293</div>
              <div className="text-gray-600 dark:text-gray-400">Stili Diversi</div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}