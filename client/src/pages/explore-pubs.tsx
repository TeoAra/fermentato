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
  const open = isOpenNow(pub.openingHours);
  return (
    <Link href={`/pub/${pub.slug || pub.id}`}>
      <Card className="overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer group h-48 border border-orange-50 dark:border-[hsl(25,12%,16%)] bg-white dark:bg-[hsl(25,14%,10%)] hover:border-primary/20 dark:hover:border-primary/30 rounded-2xl">
        <CardContent className="p-4 h-full flex flex-col">
          <div className="relative w-full h-24 mb-3 rounded-xl overflow-hidden bg-orange-50 dark:bg-[hsl(25,14%,14%)]">
            <img
              src={pub.logoUrl || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=150"}
              alt={pub.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          </div>
          
          <div className="flex-1 flex flex-col">
            <h3 className="font-semibold text-sm mb-1 line-clamp-1 text-foreground group-hover:text-primary transition-colors">
              {pub.name}
            </h3>
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="line-clamp-1">{pub.address}</span>
            </div>
            
            <div className="flex flex-wrap gap-1 mt-auto">
              <Badge variant="outline" className="text-xs px-2 py-0.5 h-auto border-orange-100 dark:border-orange-900/30 text-orange-700 dark:text-orange-300">
                <Store className="w-3 h-3 mr-1" />
                Pub
              </Badge>
              
              <Badge className={`text-xs px-2 py-0.5 h-auto border-0 ${open ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                <Clock className="w-3 h-3 mr-1" />
                {open ? 'Aperto' : 'Chiuso'}
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

  const pubsByState = Array.isArray(allPubs) ? allPubs.reduce((acc: any, pub: any) => {
    const state = pub.region || pub.address?.split(',').pop()?.trim() || 'Altri';
    if (!acc[state]) acc[state] = [];
    acc[state].push(pub);
    return acc;
  }, {}) : {};

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-white dark:bg-[hsl(25,14%,8%)] border-b border-orange-50 dark:border-[hsl(25,12%,14%)] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 hover:bg-orange-50 dark:hover:bg-orange-950/20 -ml-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Torna alla Home
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0">
                <Store className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Esplora Tutti i Pub</h1>
                <p className="text-sm text-muted-foreground">Scopri pub organizzati per regione</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-orange-50 dark:bg-[hsl(25,14%,12%)] rounded-2xl h-48 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
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
                      className="w-full justify-between text-left h-auto p-4 mb-2 bg-white dark:bg-[hsl(25,14%,10%)] border-orange-100 dark:border-[hsl(25,12%,16%)] text-foreground hover:bg-orange-50 dark:hover:bg-orange-950/10 hover:border-primary/30 dark:hover:border-primary/20 rounded-2xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="font-semibold text-base">{state}</span>
                        <span className="text-xs font-semibold text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-950/30 px-2 py-0.5 rounded-full">{statePubs.length} pub</span>
                      </div>
                      <div className="text-muted-foreground text-lg font-light">
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
