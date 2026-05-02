import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { MapPin, Store, Map, ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { PubMap } from "@/components/pub-map";
import PubCard from "@/components/pub-card";

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
  const [search, setSearch] = useState("");

  const { data: allPubs, isLoading } = useQuery({
    queryKey: ["/api/pubs/all"],
    queryFn: () => fetch("/api/pubs/all").then(res => res.json()),
  });

  const toggleState = (state: string) => {
    setOpenStates(prev =>
      prev.includes(state) ? prev.filter(s => s !== state) : [...prev, state]
    );
  };

  const pubsArr = Array.isArray(allPubs) ? (allPubs as any[]) : [];

  const filteredPubs = useMemo(() => {
    if (!search.trim()) return pubsArr;
    const q = search.toLowerCase();
    return pubsArr.filter((p: any) =>
      p.name?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q) ||
      p.region?.toLowerCase().includes(q)
    );
  }, [pubsArr, search]);

  const pubsByState = useMemo(() => filteredPubs.reduce((acc: any, pub: any) => {
    const state = pub.region || pub.address?.split(',').pop()?.trim() || 'Altri';
    if (!acc[state]) acc[state] = [];
    acc[state].push(pub);
    return acc;
  }, {}), [filteredPubs]);

  const mapPins = pubsArr.map((p: any) => ({ ...p, type: "pub" as const }));

  const hasResults = filteredPubs.length > 0;
  const totalPubs = pubsArr.length;

  // ── MAP VIEW ──────────────────────────────────────────────
  if (viewMode === "map") {
    return (
      <div className="fixed inset-x-0 bottom-0 top-14 z-40 bg-background">
        <div className="absolute top-3 left-3 right-3 z-50 flex items-center gap-2 pointer-events-none">
          <button
            onClick={() => setViewMode("list")}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-bold bg-white dark:bg-card shadow-lg border border-stone-100 dark:border-border text-foreground hover:bg-stone-50 transition-colors tap-scale"
          >
            ← Lista
          </button>
          <div className="flex-1 pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-2xl bg-white dark:bg-card shadow-lg border border-stone-100 dark:border-border">
            <Store className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm font-bold text-foreground">{totalPubs} locali</span>
          </div>
        </div>
        {isLoading ? (
          <div className="w-full h-full bg-stone-100 dark:bg-stone-800 animate-pulse" />
        ) : (
          <PubMap pins={mapPins} height="100%" />
        )}
      </div>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F7F4F0] dark:bg-background slide-up">
      <Helmet>
        <title>Pub e Birrerie Artigianali in Italia | Fermenta.to</title>
        <meta name="description" content="Trova pub, birrerie e locali craft beer in Italia. Consulta taplist in tempo reale, orari di apertura, posizione su mappa e distanza da te su Fermenta.to." />
        <meta property="og:title" content="Pub e Birrerie Artigianali in Italia | Fermenta.to" />
        <meta property="og:description" content="Trova pub, birrerie e locali che servono birra artigianale in Italia. Consulta orari, taplist live e posizione su mappa." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fermenta.to/explore/pubs" />
        <meta property="og:site_name" content="Fermenta.to" />
        <meta name="twitter:card" content="summary" />
        <link rel="canonical" href="https://fermenta.to/explore/pubs" />
      </Helmet>

      {/* ── Sticky subheader ── */}
      <div className="sticky top-14 z-30 bg-white/95 dark:bg-[hsl(25,14%,8%)]/95 backdrop-blur-md border-b border-stone-100 dark:border-stone-800">
        <div className="px-4 py-3 flex items-center gap-3">
          {/* Search */}
          <div className="flex-1 flex items-center gap-2 bg-stone-100 dark:bg-stone-800 rounded-2xl px-3 py-2">
            <Search className="h-4 w-4 text-stone-400 flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca pub o città…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-stone-400 outline-none min-w-0"
            />
            {search && (
              <button onClick={() => setSearch("")} className="tap-scale">
                <X className="h-4 w-4 text-stone-400" />
              </button>
            )}
          </div>
          {/* Map toggle */}
          <button
            onClick={() => setViewMode("map")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors tap-scale whitespace-nowrap"
          >
            <Map className="w-3.5 h-3.5" />
            Mappa
          </button>
        </div>
        {!isLoading && (
          <div className="px-4 pb-2">
            <p className="text-[11px] text-stone-400 dark:text-stone-500 font-medium">
              {search ? `${filteredPubs.length} risultati per "${search}"` : `${totalPubs} ${totalPubs === 1 ? 'locale' : 'locali'} in Italia`}
            </p>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <main className="max-w-2xl mx-auto px-3 py-4 pb-28">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-card rounded-2xl h-16 animate-pulse" />
            ))}
          </div>
        ) : !hasResults ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mx-auto mb-4">
              <Store className="h-8 w-8 text-stone-400" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">Nessun locale trovato</h3>
            <p className="text-sm text-muted-foreground">Prova con un'altra città o regione.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {statiItaliani.map(state => {
              const statePubs = pubsByState[state] || [];
              if (statePubs.length === 0) return null;
              const isOpen = openStates.includes(state) || !!search.trim();
              return (
                <div key={state} className="bg-white dark:bg-card rounded-2xl overflow-hidden border border-stone-100 dark:border-stone-800/60 shadow-sm">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors active:bg-stone-100 dark:active:bg-stone-800/50 tap-scale"
                    onClick={() => toggleState(state)}
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="font-semibold text-[15px] text-foreground">{state}</span>
                      <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {statePubs.length}
                      </span>
                    </div>
                    {isOpen
                      ? <ChevronDown className="w-4 h-4 text-stone-400 flex-shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-stone-400 flex-shrink-0" />
                    }
                  </button>
                  {isOpen && (
                    <div className="border-t border-stone-100 dark:border-stone-800/60">
                      {statePubs.map((pub: any, idx: number) => (
                        <PubCard key={pub.id} pub={pub} isLast={idx === statePubs.length - 1} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── Altri (non-matching regions) ── */}
            {(() => {
              const others = pubsByState['Altri'] || [];
              if (others.length === 0) return null;
              const isOpen = openStates.includes('Altri') || !!search.trim();
              return (
                <div className="bg-white dark:bg-card rounded-2xl overflow-hidden border border-stone-100 dark:border-stone-800/60 shadow-sm">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors tap-scale"
                    onClick={() => toggleState('Altri')}
                  >
                    <div className="flex items-center gap-2.5">
                      <Store className="w-4 h-4 text-stone-400 flex-shrink-0" />
                      <span className="font-semibold text-[15px] text-foreground">Altri</span>
                      <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{others.length}</span>
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
