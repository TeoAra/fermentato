import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Beer, MapPin, Star, TrendingUp, Users, Heart, Store } from "lucide-react";
import Footer from "@/components/footer";

// Square Card Components
function PubSquareCard({ pub }: { pub: any }) {
  return (
    <Link href={`/pub/${pub.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group h-48">
        <CardContent className="p-4 h-full flex flex-col">
          <div className="relative w-full h-24 mb-3 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={pub.logoUrl || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=150"}
              alt={pub.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          </div>
          <div className="flex-1 flex flex-col">
            <h3 className="font-semibold text-sm mb-1 line-clamp-1 group-hover:text-primary transition-colors">
              {pub.name}
            </h3>
            <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="line-clamp-1">{pub.address}</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-auto">
              <Badge variant="outline" className="text-xs px-2 py-0.5 h-auto">
                <Store className="w-3 h-3 mr-1" />
                Pub
              </Badge>
              {pub.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span className="text-xs text-gray-600 font-medium">
                    {Number(pub.rating).toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function BrewerySquareCard({ brewery }: { brewery: any }) {
  return (
    <Link href={`/brewery/${brewery.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group h-48">
        <CardContent className="p-4 h-full flex flex-col">
          <div className="relative w-full h-24 mb-3 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={brewery.logoUrl || "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=150"}
              alt={`Logo ${brewery.name}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
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
              {brewery.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span className="text-xs text-gray-600 font-medium">
                    {Number(brewery.rating).toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Landing() {
  // Fetch 5 random pubs for visitors
  const { data: pubs, isLoading: pubsLoading } = useQuery({
    queryKey: ["/api/pubs"],
  });

  // Fetch 5 random breweries for visitors
  const { data: breweries, isLoading: breweriesLoading } = useQuery({
    queryKey: ["/api/breweries"],
    queryFn: () => fetch("/api/breweries?random=true&limit=5").then(res => res.json()),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      
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
            <a href="/api/login">
              <Button className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                <Users className="mr-2" />
                Accedi per Preferiti
              </Button>
            </a>
            <Link href="/explore/breweries">
              <Button 
                variant="outline" 
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary transition-colors"
              >
                <Beer className="mr-2" />
                Esplora Birrifici
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Featured Pubs */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-secondary">Pub in Evidenza</h2>
            <Link href="/explore/pubs" className="text-primary hover:text-orange-600 font-semibold">
              Esplora tutti
            </Link>
          </div>

          {pubsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md h-48 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.isArray(pubs) ? pubs.slice(0, 5).map((pub: any) => (
                <PubSquareCard key={pub.id} pub={pub} />
              )) : null}
            </div>
          )}
        </section>

        {/* Featured Breweries */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-secondary">Birrifici Partner</h2>
            <Link href="/explore/breweries" className="text-primary hover:text-orange-600 font-semibold">
              Esplora tutti
            </Link>
          </div>

          {breweriesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md h-48 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.isArray(breweries) ? breweries.slice(0, 5).map((brewery: any) => (
                <BrewerySquareCard key={brewery.id} brewery={brewery} />
              )) : null}
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
