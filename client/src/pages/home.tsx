import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/header";
import Footer from "@/components/footer";
import PubCard from "@/components/pub-card";
import BreweryCard from "@/components/brewery-card";
import { Button } from "@/components/ui/button";
import { Beer, Heart, MapPin } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user } = useAuth();
  
  const { data: pubs, isLoading: pubsLoading } = useQuery({
    queryKey: ["/api/pubs"],
  });

  const { data: breweries, isLoading: breweriesLoading } = useQuery({
    queryKey: ["/api/breweries"],
  });

  const { data: favorites } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Welcome Hero */}
      <section className="beer-gradient text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                Ciao {user?.firstName || 'Birraio'}! 🍺
              </h1>
              <p className="text-xl text-orange-100">
                Scopri nuove birre e gestisci i tuoi preferiti
              </p>
            </div>
            
            {user?.userType === 'pub_owner' && (
              <Link href="/dashboard">
                <Button className="bg-white text-primary hover:bg-gray-100">
                  <Beer className="mr-2" />
                  Dashboard Pub
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6 text-center">
              <MapPin className="mx-auto text-primary mb-4" size={48} />
              <h3 className="text-xl font-semibold mb-2">Trova Pub Vicini</h3>
              <p className="text-gray-600 mb-4">Scopri i migliori pub nella tua zona</p>
              <Button variant="outline" className="w-full">
                Cerca Pub
              </Button>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-6 text-center">
              <Beer className="mx-auto text-primary mb-4" size={48} />
              <h3 className="text-xl font-semibold mb-2">Esplora Birrifici</h3>
              <p className="text-gray-600 mb-4">Conosci i birrifici artigianali italiani</p>
              <Button variant="outline" className="w-full">
                Sfoglia Birrifici
              </Button>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-6 text-center">
              <Heart className="mx-auto text-primary mb-4" size={48} />
              <h3 className="text-xl font-semibold mb-2">I Tuoi Preferiti</h3>
              <p className="text-gray-600 mb-4">Gestisci le tue birre e pub preferiti</p>
              <Button variant="outline" className="w-full">
                Vedi Preferiti ({favorites?.length || 0})
              </Button>
            </div>
          </div>
        </section>

        {/* Featured Pubs */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-secondary">Pub Consigliati</h2>
            <a href="#" className="text-primary hover:text-orange-600 font-semibold">
              Vedi tutti
            </a>
          </div>

          {pubsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-md h-80 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pubs?.slice(0, 3).map((pub: any) => (
                <PubCard 
                  key={pub.id} 
                  pub={pub} 
                  beersOnTap={Math.floor(Math.random() * 15) + 5}
                  isOpen={Math.random() > 0.3}
                />
              ))}
            </div>
          )}
        </section>

        {/* Breweries */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-secondary">Birrifici in Evidenza</h2>
            <a href="#" className="text-primary hover:text-orange-600 font-semibold">
              Esplora tutti
            </a>
          </div>

          {breweriesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-md h-64 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {breweries?.slice(0, 4).map((brewery: any) => (
                <BreweryCard 
                  key={brewery.id} 
                  brewery={brewery}
                  beerCount={Math.floor(Math.random() * 20) + 5}
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
