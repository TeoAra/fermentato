import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { MapPin, Store, ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

function isOpenNow(openingHours: any) {
  if (!openingHours) return false;
  
  const now = new Date();
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const todayHours = openingHours[currentDay];
  if (!todayHours || todayHours.isClosed) return false;
  
  if (todayHours.open && todayHours.close) {
    const [openHour, openMin] = todayHours.open.split(':').map(Number);
    const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    
    if (closeTime < openTime) {
      return currentTime >= openTime || currentTime <= closeTime;
    } else {
      return currentTime >= openTime && currentTime <= closeTime;
    }
  }
  
  return true;
}

const statiItaliani = [
  "Abruzzo", "Basilicata", "Calabria", "Campania", "Emilia-Romagna",
  "Friuli-Venezia Giulia", "Lazio", "Liguria", "Lombardia", "Marche",
  "Molise", "Piemonte", "Puglia", "Sardegna", "Sicilia", "Toscana",
  "Trentino-Alto Adige", "Umbria", "Valle d'Aosta", "Veneto"
];

function PubSquareCard({ pub }: { pub: any }) {
  return (
    <Link href={`/pub/${pub.slug || pub.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group h-48 border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardContent className="p-4 h-full flex flex-col">
          <div className="relative w-full h-24 mb-3 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-700">
            <img
              src={pub.logoUrl || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=150"}
              alt={pub.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          </div>
          
          <div className="flex-1 flex flex-col">
            <h3 className="font-semibold text-sm mb-1 line-clamp-1 text-gray-900 dark:text-amber-400 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
              {pub.name}
            </h3>
            
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 mb-2">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="line-clamp-1">{pub.address}</span>
            </div>
            
            <div className="flex flex-wrap gap-1 mt-auto">
              <Badge variant="outline" className="text-xs px-2 py-0.5 h-auto border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400">
                <Store className="w-3 h-3 mr-1" />
                Pub
              </Badge>
              
              <Badge variant={isOpenNow(pub.openingHours) ? "default" : "secondary"} className={`text-xs px-2 py-0.5 h-auto ${isOpenNow(pub.openingHours) ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'}`}>
                <Clock className="w-3 h-3 mr-1" />
                {isOpenNow(pub.openingHours) ? 'Aperto' : 'Chiuso'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function ExplorePubs() {
  const [openStates, setOpenStates] = useState<string[]>([]);

  const { data: allPubs, isLoading } = useQuery({
    queryKey: ["/api/pubs/all"],
    queryFn: () => fetch("/api/pubs/all").then(res => res.json()),
  });

  const toggleState = (state: string) => {
    setOpenStates(prev => 
      prev.includes(state) 
        ? prev.filter(s => s !== state)
        : [...prev, state]
    );
  };

  // Group pubs by region/state
  const pubsByState = Array.isArray(allPubs) ? allPubs.reduce((acc: any, pub: any) => {
    const state = pub.region || pub.address?.split(',').pop()?.trim() || 'Altri';
    if (!acc[state]) acc[state] = [];
    acc[state].push(pub);
    return acc;
  }, {}) : {};

  // Regions start collapsed — user expands manually

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-900 shadow-sm border-b border-gray-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-50 dark:hover:text-amber-300 dark:hover:bg-amber-500/10 font-medium">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Torna alla Home
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Esplora Tutti i Pub</h1>
              <p className="text-gray-500 dark:text-slate-400">Scopri pub organizzati per regione</p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-100 dark:bg-slate-800 rounded-lg h-48 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {statiItaliani.map(state => {
              const statePubs = pubsByState[state] || [];
              if (statePubs.length === 0) return null;

              return (
                <Collapsible
                  key={state}
                  open={openStates.includes(state)}
                  onOpenChange={() => toggleState(state)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between text-left h-auto p-4 mb-4 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white hover:bg-amber-50 hover:text-gray-900 hover:border-amber-200 dark:hover:bg-slate-700 dark:hover:text-white dark:hover:border-amber-500/30"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-amber-500" />
                        <span className="font-semibold text-lg">{state}</span>
                        <Badge variant="secondary" className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">{statePubs.length} pub</Badge>
                      </div>
                      <div className="text-gray-400 dark:text-slate-500">
                        {openStates.includes(state) ? '−' : '+'}
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
                      {statePubs.map((pub: any) => (
                        <PubSquareCard key={pub.id} pub={pub} />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}