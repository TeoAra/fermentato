import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Beer, MapPin, Heart, Store, TrendingUp } from "lucide-react";
import Footer from "@/components/footer";
import PubCard from "@/components/pub-card";
import BreweryCard from "@/components/brewery-card";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  
  const { data: pubs, isLoading: pubsLoading } = useQuery({
    queryKey: ["/api/pubs"],
  });

  const { data: breweries, isLoading: breweriesLoading } = useQuery({
    queryKey: ["/api/breweries", "random"],
    queryFn: () => fetch("/api/breweries?random=true&limit=4").then(res => res.json()),
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

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Welcome Hero */}
      <section className="beer-gradient text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                Ciao {(user as any)?.firstName || 'Birraio'}! 🍺
              </h1>
              <p className="text-xl text-orange-100">
                Scopri nuove birre e gestisci i tuoi preferiti
              </p>
            </div>
            
            {(user as any)?.userType === 'pub_owner' && (
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
                Vedi Preferiti ({Array.isArray(favorites) ? favorites.length : 0})
              </Button>
            </div>
          </div>
        </section>

        {/* I Tuoi Pub (solo per pub owner) */}
        {(user as any)?.userType === 'pub_owner' && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-secondary">I Tuoi Pub</h2>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        )}

        {/* Pub in Evidenza (solo per clienti) */}
        {(user as any)?.userType !== 'pub_owner' && (
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
                {Array.isArray(pubs) ? pubs.slice(0, 3).map((pub: any) => (
                  <PubCard 
                    key={pub.id} 
                    pub={pub} 
                  />
                )) : null}
              </div>
            )}
          </section>
        )}

        {/* Birrifici in Evidenza */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-secondary">Birrifici Artigianali</h2>
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
              {Array.isArray(breweries) ? breweries.map((brewery: any) => (
                <BreweryCard key={brewery.id} brewery={brewery} />
              )) : null}
            </div>
          )}
        </section>

        {/* Statistiche Platform */}
        <section className="mb-12 bg-white rounded-xl shadow-md p-8">
          <h2 className="text-3xl font-bold text-center text-secondary mb-8">
            La Community Fermenta.to
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">29,753</div>
              <div className="text-gray-600">Birre nel Catalogo</div>
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">2,968</div>
              <div className="text-gray-600">Birrifici Mondiali</div>
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">293</div>
              <div className="text-gray-600">Stili Diversi</div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}