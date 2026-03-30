import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { MapPin, Store, ArrowLeft, Map, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PubMap } from "@/components/pub-map";
import PubCard from "@/components/pub-card";

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
    if (closeTime < openTime) return currentTime >= openTime || currentTime <= closeTime;
    return currentTime >= openTime && currentTime <= closeTime;
  }
  return true;
}

const statiItaliani = [
  "Abruzzo", "Basilicata", "Calabria", "Campania", "Emilia-Romagna",
  "Friuli-Venezia Giulia", "Lazio", "Liguria", "Lombardia", "Marche",
  "Molise", "Piemonte", "Puglia", "Sardegna", "Sicilia", "Toscana",
  "Trentino-Alto Adige", "Umbria", "Valle d'Aosta", "Veneto"
];

type ViewMode = "list" | "map";

export default function ExplorePubs() {
  const [openStates, setOpenStates] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const { data: allPubs, isLoading } = useQuery({
    queryKey: ["/api/pubs/all"],
    queryFn: () => fetch("/api/pubs/all").then(res => res.json()),
  });

  const toggleState = (state: string) => {
    setOpenStates(prev =>
      prev.includes(state) ? prev.filter(s => s !== state) : [...prev, state]
    );
  };

  const pubsByState = Array.isArray(allPubs) ? allPubs.reduce((acc: any, pub: any) => {
    const state = pub.region || pub.address?.split(',').pop()?.trim() || 'Altri';
    if (!acc[state]) acc[state] = [];
    acc[state].push(pub);
    return acc;
  }, {}) : {};

  const mapPins = Array.isArray(allPubs)
    ? allPubs.map((p: any) => ({ ...p, type: "pub" as const }))
    : [];

  if (viewMode === "map") {
    return (
      <div className="fixed inset-x-0 bottom-0 top-16 z-40 bg-background">
        <div className="absolute top-3 left-3 right-3 z-50 flex items-center gap-2 pointer-events-none">
          <button
            onClick={() => setViewMode("list")}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-bold bg-white dark:bg-card shadow-lg border border-stone-100 dark:border-border text-foreground hover:bg-stone-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Lista
          </button>
          <div className="flex-1 pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-2xl bg-white dark:bg-card shadow-lg border border-stone-100 dark:border-border">
            <Store className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm font-bold text-foreground truncate">Mappa pub</span>
          </div>
        </div>
        {isLoading ? (
          <div className="w-full h-full bg-stone-100 dark:bg-[hsl(25,14%,12%)] animate-pulse" />
        ) : (
          <PubMap pins={mapPins} height="100%" />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background slide-up">
      {/* Header */}
      <div className="bg-white dark:bg-[hsl(25,14%,8%)] border-b border-stone-100 dark:border-[hsl(25,12%,14%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/">
                <button className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-stone-900 dark:text-white">Pub & Locali</h1>
                <p className="text-xs text-stone-400 dark:text-stone-500">
                  {Array.isArray(allPubs) ? `${allPubs.length} locali` : 'Caricamento…'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setViewMode("map")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            >
              <Map className="w-3.5 h-3.5" />
              Mappa
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-24">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-card rounded-2xl h-14 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {statiItaliani.map(state => {
              const statePubs = pubsByState[state] || [];
              if (statePubs.length === 0) return null;
              const isOpen = openStates.includes(state);
              return (
                <div key={state} className="bg-white dark:bg-card rounded-2xl overflow-hidden border border-stone-100/70 dark:border-stone-700/20 shadow-sm">
                  {/* Region header */}
                  <button
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors"
                    onClick={() => toggleState(state)}
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="font-semibold text-[15px] text-stone-900 dark:text-white">{state}</span>
                      <span className="text-xs font-bold text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-full">
                        {statePubs.length}
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-stone-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-stone-400 flex-shrink-0" />
                    )}
                  </button>

                  {/* Pub rows */}
                  {isOpen && (
                    <div className="border-t border-stone-100 dark:border-stone-800/60">
                      {statePubs.map((pub: any, idx: number) => (
                        <PubCard
                          key={pub.id}
                          pub={pub}
                          isLast={idx === statePubs.length - 1}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Other/unlisted */}
            {(() => {
              const others = pubsByState['Altri'] || [];
              if (others.length === 0) return null;
              const isOpen = openStates.includes('Altri');
              return (
                <div className="bg-white dark:bg-card rounded-2xl overflow-hidden border border-stone-100/70 dark:border-stone-700/20 shadow-sm">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors"
                    onClick={() => toggleState('Altri')}
                  >
                    <div className="flex items-center gap-2.5">
                      <Store className="w-4 h-4 text-stone-400 flex-shrink-0" />
                      <span className="font-semibold text-[15px] text-stone-900 dark:text-white">Altri</span>
                      <span className="text-xs font-bold text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-full">{others.length}</span>
                    </div>
                    {isOpen ? <ChevronDown className="w-4 h-4 text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-400" />}
                  </button>
                  {isOpen && (
                    <div className="border-t border-stone-100 dark:border-stone-800/60">
                      {others.map((pub: any, idx: number) => (
                        <PubCard key={pub.id} pub={pub} isLast={idx === others.length - 1} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
}
