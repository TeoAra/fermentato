import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Beer, Star } from "lucide-react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import PubCard from "@/components/pub-card";
import BreweryCard from "@/components/brewery-card";

export default function Landing() {
  const { data: pubs, isLoading: pubsLoading } = useQuery({
    queryKey: ["/api/pubs"],
  });

  const { data: breweries, isLoading: breweriesLoading } = useQuery({
    queryKey: ["/api/breweries"],
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="beer-gradient text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Scopri le Migliori Birre d'Italia
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-orange-100">
            Trova pub, birrifici e la perfetta birra artigianale vicino a te
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              <MapPin className="mr-2" />
              Trova Pub Vicino a Me
            </Button>
            <Button 
              variant="outline" 
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary transition-colors"
            >
              <Beer className="mr-2" />
              Esplora Birrifici
            </Button>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Featured Pubs */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-secondary">Pub in Evidenza</h2>
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

        {/* Featured Breweries */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-secondary">Birrifici Partner</h2>
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

        {/* Call to Action */}
        <section className="bg-gradient-to-r from-secondary to-gray-700 text-white rounded-xl p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Hai un Pub o un Birrificio?</h2>
          <p className="text-xl mb-8 text-gray-300">
            Unisciti a Fermenta.to e fai scoprire le tue birre a migliaia di appassionati
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/api/login">
              <Button className="bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors">
                <Beer className="mr-2" />
                Registra il tuo Pub
              </Button>
            </a>
            <a href="/api/login">
              <Button 
                variant="outline" 
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-secondary transition-colors"
              >
                <Star className="mr-2" />
                Registra il tuo Birrificio
              </Button>
            </a>
          </div>
          <p className="text-sm text-gray-400 mt-6">
            Gestione facile della tap list • Aggiornamento prezzi in tempo reale • Dashboard dedicata
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
