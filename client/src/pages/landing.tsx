import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Beer, MapPin, Heart, Store, Users, Navigation } from "lucide-react";
import Footer from "@/components/footer";
import PubCard from "@/components/pub-card";
import BreweryCard from "@/components/brewery-card";

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

export default function Landing() {
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
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus('granted');
      },
      () => {
        setLocationStatus('denied');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const { data: pubs, isLoading: pubsLoading } = useQuery({
    queryKey: ["/api/pubs"],
  });

  const { data: breweries, isLoading: breweriesLoading } = useQuery({
    queryKey: ["/api/breweries"],
    queryFn: () => fetch("/api/breweries?random=true&limit=8").then(res => res.json()),
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

  const handleRequestLocation = () => {
    if (!navigator.geolocation) return;
    setLocationStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus('granted');
      },
      () => {
        setLocationStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-amber-50 to-orange-50 dark:from-gray-950 dark:via-amber-950 dark:to-orange-950">
      
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
                <a href="/api/login">
                  <Button className="bg-white text-amber-600 hover:bg-gray-100 shadow-lg">
                    <Users className="mr-2" />
                    Accedi
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
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
            
            <a href="/api/login">
              <div className="glass-card border-0 rounded-xl p-8 text-center group hover:scale-105 transition-all duration-300 cursor-pointer">
                <div className="p-4 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl inline-flex mb-4 group-hover:scale-110 transition-transform">
                  <Heart className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">I Tuoi Preferiti</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Accedi per gestire i tuoi preferiti</p>
              </div>
            </a>
          </div>
        </section>

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

        <section className="mb-16 lg:mb-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl mr-3">
                <Beer className="h-6 w-6 text-white" />
              </div>
              {userLocation ? 'Birrifici Vicini' : 'Birrifici Consigliati'}
            </h2>
            <Link href="/explore/breweries">
              <Button variant="ghost" className="text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold">
                Vedi tutti →
              </Button>
            </Link>
          </div>

          {breweriesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-md h-80 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      </main>

      <Footer />
    </div>
  );
}
