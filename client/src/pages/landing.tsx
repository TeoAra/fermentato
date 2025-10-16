import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Beer, MapPin, Star, Users, Heart, Store, Sparkles, Factory } from "lucide-react";
import Footer from "@/components/footer";
import ImageWithFallback from "@/components/image-with-fallback";

// Square Card Components
function PubSquareCard({ pub }: { pub: any }) {
  return (
    <Link href={`/pub/${pub.id}`}>
      <Card className="glass-card border-0 overflow-hidden hover:scale-105 transition-all duration-300 cursor-pointer group h-48">
        <CardContent className="p-4 h-full flex flex-col">
          <div className="relative w-full h-24 mb-3 rounded-lg overflow-hidden bg-gray-100">
            <ImageWithFallback
              src={pub.logoUrl}
              alt={pub.name}
              imageType="pub"
              containerClassName="w-full h-24 rounded-lg overflow-hidden"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              iconSize="lg"
            />
          </div>
          <div className="flex-1 flex flex-col">
            <h3 className="font-semibold text-sm mb-1 line-clamp-1 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-amber-500 group-hover:to-orange-600 group-hover:bg-clip-text transition-all">
              {pub.name}
            </h3>
            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-2">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="line-clamp-1">{pub.address}</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-auto">
              <Badge variant="outline" className="text-xs px-2 py-0.5 h-auto bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 text-blue-800 dark:text-blue-200">
                <Store className="w-3 h-3 mr-1" />
                Pub
              </Badge>
              {pub.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
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
      <Card className="glass-card border-0 overflow-hidden hover:scale-105 transition-all duration-300 cursor-pointer group h-48">
        <CardContent className="p-4 h-full flex flex-col">
          <div className="relative w-full h-24 mb-3 rounded-lg overflow-hidden bg-gray-100">
            <ImageWithFallback
              src={brewery.logoUrl}
              alt={`Logo ${brewery.name}`}
              imageType="brewery"
              containerClassName="w-full h-24 rounded-lg overflow-hidden"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              iconSize="lg"
            />
          </div>
          <div className="flex-1 flex flex-col">
            <h3 className="font-semibold text-sm mb-1 line-clamp-1 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-amber-500 group-hover:to-orange-600 group-hover:bg-clip-text transition-all">
              {brewery.name}
            </h3>
            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-2">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="line-clamp-1">
                {brewery.location}, {brewery.region || brewery.country}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-auto">
              <Badge variant="outline" className="text-xs px-2 py-0.5 h-auto bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border-amber-200 text-amber-800 dark:text-amber-200">
                <Beer className="w-3 h-3 mr-1" />
                {brewery.beerCount || 0} birre
              </Badge>
              {brewery.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-amber-50 to-orange-50 dark:from-gray-950 dark:via-amber-950 dark:to-orange-950">
      
      {/* Hero Section with Glassmorphism */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1436076863939-06870fe779c2?w=1920&h=600&fit=crop"
            alt="Beer background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-amber-600/90 via-orange-600/90 to-red-600/90"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center">
          <div className="glass-card rounded-3xl p-8 md:p-12 backdrop-blur-md bg-white/10 border border-white/20 max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white leading-tight">
              Scopri le Migliori Birre d'Italia 🍺
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-orange-100">
              Trova pub, birrifici e la perfetta birra artigianale vicino a te
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/api/login">
                <Button className="bg-white text-amber-600 px-8 py-6 rounded-xl font-semibold hover:bg-gray-100 transition-colors shadow-xl text-lg min-h-[60px]">
                  <Users className="mr-2 h-6 w-6" />
                  Accedi per Preferiti
                </Button>
              </a>
              <Link href="/explore/breweries">
                <Button variant="outline" className="backdrop-blur-md bg-white/20 border-white/40 text-white hover:bg-white/30 hover:border-white/60 px-8 py-6 rounded-xl font-semibold transition-all shadow-xl text-lg min-h-[60px]">
                  <Factory className="mr-2 h-6 w-6" />
                  Esplora Birrifici
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Quick Stats */}
        <section className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card border-0 rounded-xl p-8 text-center group hover:scale-105 transition-all duration-300">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl inline-flex mb-4 group-hover:scale-110 transition-transform">
                <MapPin className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Trova Pub Vicini</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Scopri i migliori pub nella tua zona</p>
              <Link href="/explore/pubs">
                <Button variant="outline" className="w-full bg-white/60 dark:bg-gray-800/60">
                  Cerca Pub
                </Button>
              </Link>
            </div>
            
            <div className="glass-card border-0 rounded-xl p-8 text-center group hover:scale-105 transition-all duration-300">
              <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl inline-flex mb-4 group-hover:scale-110 transition-transform">
                <Beer className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Esplora Birrifici</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Conosci i birrifici artigianali italiani</p>
              <Link href="/explore/breweries">
                <Button variant="outline" className="w-full bg-white/60 dark:bg-gray-800/60">
                  Sfoglia Birrifici
                </Button>
              </Link>
            </div>
            
            <div className="glass-card border-0 rounded-xl p-8 text-center group hover:scale-105 transition-all duration-300">
              <div className="p-4 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl inline-flex mb-4 group-hover:scale-110 transition-transform">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">I Tuoi Preferiti</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Gestisci le tue birre e pub preferiti</p>
              <a href="/api/login">
                <Button variant="outline" className="w-full bg-white/60 dark:bg-gray-800/60">
                  Accedi
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* Pub in Evidenza */}
        <section className="mb-16">
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton h-48 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.isArray(pubs) ? pubs.slice(0, 5).map((pub: any) => (
                <PubSquareCard key={pub.id} pub={pub} />
              )) : null}
            </div>
          )}
        </section>

        {/* Birrifici in Evidenza */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl mr-3">
                <Factory className="h-6 w-6 text-white" />
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton h-48 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.isArray(breweries) ? breweries.map((brewery: any) => (
                <BrewerySquareCard key={brewery.id} brewery={brewery} />
              )) : null}
            </div>
          )}
        </section>

        {/* CTA Section */}
        <section className="glass-card border-0 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
            Unisciti alla Comunità
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Accedi per salvare i tuoi pub e birre preferiti, lasciare recensioni e scoprire nuove esperienze birrarie
          </p>
          <a href="/api/login">
            <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-12 py-6 rounded-xl font-semibold shadow-xl text-lg">
              <Users className="mr-2 h-6 w-6" />
              Accedi Ora
            </Button>
          </a>
        </section>
      </main>

      <Footer />
    </div>
  );
}
