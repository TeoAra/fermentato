import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Beer, MapPin, Heart, Store, Users } from "lucide-react";
import Footer from "@/components/footer";
import PubCard from "@/components/pub-card";
import BreweryCard from "@/components/brewery-card";

export default function Landing() {
  const { data: pubs, isLoading: pubsLoading } = useQuery({
    queryKey: ["/api/pubs"],
  });

  const { data: breweries, isLoading: breweriesLoading } = useQuery({
    queryKey: ["/api/breweries"],
    queryFn: () => fetch("/api/breweries?random=true&limit=4").then(res => res.json()),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-amber-50 to-orange-50 dark:from-gray-950 dark:via-amber-950 dark:to-orange-950">
      
      {/* Hero Section - Same style as home */}
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
        {/* Quick Actions - Same style as home */}
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

        {/* Pub Consigliati - Same layout as home */}
        <section className="mb-16 lg:mb-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl mr-3">
                <Store className="h-6 w-6 text-white" />
              </div>
              Pub Consigliati
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
              {Array.isArray(pubs) ? pubs.slice(0, 3).map((pub: any) => (
                <PubCard 
                  key={pub.id} 
                  pub={pub} 
                />
              )) : null}
            </div>
          )}
        </section>

        {/* Birrifici Consigliati - Same layout as home */}
        <section className="mb-16 lg:mb-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl mr-3">
                <Beer className="h-6 w-6 text-white" />
              </div>
              Birrifici Consigliati
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
              {Array.isArray(breweries) ? breweries.map((brewery: any) => (
                <BreweryCard 
                  key={brewery.id} 
                  brewery={brewery} 
                />
              )) : null}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
