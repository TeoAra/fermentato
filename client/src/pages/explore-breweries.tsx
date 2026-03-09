import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { MapPin, Beer, ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const countryNameMap: Record<string, string> = {
  "Italy": "Italia", "Italia": "Italia",
  "Germany": "Germania", "Deutschland": "Germania",
  "United States": "Stati Uniti", "USA": "Stati Uniti", "US": "Stati Uniti",
  "Belgium": "Belgio", "Belgique": "Belgio", "België": "Belgio",
  "United Kingdom": "Regno Unito", "UK": "Regno Unito",
  "England": "Inghilterra",
  "Scotland": "Scozia",
  "Wales": "Galles",
  "Northern Ireland": "Irlanda del Nord",
  "France": "Francia",
  "Spain": "Spagna", "España": "Spagna",
  "Netherlands": "Paesi Bassi", "Holland": "Paesi Bassi",
  "Czech Republic": "Rep. Ceca", "Czechia": "Rep. Ceca",
  "Canada": "Canada",
  "Australia": "Australia",
  "Japan": "Giappone",
  "Mexico": "Messico", "México": "Messico",
  "Brazil": "Brasile", "Brasil": "Brasile",
  "Denmark": "Danimarca", "Danmark": "Danimarca",
  "Sweden": "Svezia", "Sverige": "Svezia",
  "Norway": "Norvegia", "Norge": "Norvegia",
  "Finland": "Finlandia", "Suomi": "Finlandia",
  "Austria": "Austria", "Österreich": "Austria",
  "Switzerland": "Svizzera", "Schweiz": "Svizzera", "Suisse": "Svizzera",
  "Ireland": "Irlanda",
  "Poland": "Polonia", "Polska": "Polonia",
  "Portugal": "Portogallo",
  "New Zealand": "Nuova Zelanda",
  "Israel": "Israele",
  "India": "India",
  "Russia": "Russia",
  "China": "Cina",
  "South Korea": "Corea del Sud",
  "Argentina": "Argentina",
  "South Africa": "Sudafrica",
  "Ukraine": "Ucraina",
  "Hungary": "Ungheria",
  "Colombia": "Colombia",
  "Chile": "Cile",
  "Slovakia": "Slovacchia",
  "Slovenia": "Slovenia",
  "Thailand": "Thailandia",
  "Croatia": "Croazia",
  "Greece": "Grecia",
  "Vietnam": "Vietnam",
  "Estonia": "Estonia",
  "Romania": "Romania",
  "Peru": "Perù",
  "Latvia": "Lettonia",
  "Serbia": "Serbia",
  "Lithuania": "Lituania",
  "Belarus": "Bielorussia",
  "Costa Rica": "Costa Rica",
  "Bulgaria": "Bulgaria",
  "Philippines": "Filippine",
  "Ecuador": "Ecuador",
  "Taiwan": "Taiwan",
  "Hong Kong": "Hong Kong",
  "Singapore": "Singapore",
  "Uruguay": "Uruguay",
};

function detectCountry(brewery: any): string {
  const dbCountry = brewery.country?.trim();
  if (dbCountry) {
    return countryNameMap[dbCountry] ?? dbCountry;
  }
  const loc = brewery.location || "";
  const parts = loc.split(",").map((p: string) => p.trim());
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1];
    if (countryNameMap[lastPart]) return countryNameMap[lastPart];
  }
  return "Sconosciuto";
}

function BrewerySquareCard({ brewery }: { brewery: any }) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if brewery is favorited
  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  const isBreweryFavorited = Array.isArray(favorites) && favorites.some((fav: any) => 
    fav.itemType === 'brewery' && fav.itemId === brewery.id
  );

  // Favorite mutation
  const favoriteMutation = useMutation({
    mutationFn: async ({ action }: { action: 'add' | 'remove' }) => {
      if (action === 'add') {
        return apiRequest('/api/favorites', 'POST', { itemType: 'brewery', itemId: brewery.id });
      } else {
        return apiRequest(`/api/favorites/brewery/${brewery.id}`, 'DELETE');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "Successo",
        description: isBreweryFavorited ? "Rimosso dai favoriti" : "Aggiunto ai favoriti",
      });
    },
  });

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast({
        title: "Accesso richiesto",
        description: "Effettua l'accesso per aggiungere ai favoriti",
        variant: "destructive",
      });
      return;
    }

    favoriteMutation.mutate({
      action: isBreweryFavorited ? 'remove' : 'add'
    });
  };

  return (
    <Link href={`/brewery/${brewery.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group h-48 relative border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardContent className="p-4 h-full flex flex-col">
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="sm"
              className={`absolute top-2 right-2 h-8 w-8 p-0 z-10 ${isBreweryFavorited ? 'text-red-600 hover:text-red-700' : 'text-gray-400 hover:text-red-600'}`}
              onClick={handleFavoriteToggle}
              disabled={favoriteMutation.isPending}
            >
              <Heart className={`w-4 h-4 ${isBreweryFavorited ? 'fill-current' : ''}`} />
            </Button>
          )}

          <div className="relative w-full h-24 mb-3 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-700">
            <img
              src={brewery.logoUrl || "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=150"}
              alt={`Logo ${brewery.name}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          </div>
          
          <div className="flex-1 flex flex-col">
            <h3 className="font-semibold text-sm mb-1 line-clamp-1 text-gray-900 dark:text-amber-400 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
              {brewery.name}
            </h3>
            
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 mb-2">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="line-clamp-1">
                {brewery.location}, {brewery.region || brewery.country}
              </span>
            </div>
            
            <div className="flex flex-wrap gap-1 mt-auto">
              <Badge variant="outline" className="text-xs px-2 py-0.5 h-auto border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400">
                <Beer className="w-3 h-3 mr-1" />
                {brewery.beerCount || 0} birre
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

const PAGE_SIZE = 30;

export default function ExploreBreweries() {
  const [openCountries, setOpenCountries] = useState<string[]>([]);
  const [showCounts, setShowCounts] = useState<Record<string, number>>({});

  const { data: allBreweries, isLoading } = useQuery({
    queryKey: ["/api/breweries/all"],
    queryFn: () => fetch("/api/breweries/all").then(res => res.json()),
  });

  const toggleCountry = (country: string) => {
    setOpenCountries(prev =>
      prev.includes(country)
        ? prev.filter(c => c !== country)
        : [...prev, country]
    );
  };

  const { breweriesByCountry, countryList, totalBreweries } = useMemo(() => {
    if (!Array.isArray(allBreweries)) return { breweriesByCountry: {}, countryList: [], totalBreweries: 0 };
    const map: Record<string, any[]> = {};
    for (const brewery of allBreweries) {
      const country = detectCountry(brewery);
      if (!map[country]) map[country] = [];
      map[country].push(brewery);
    }
    for (const country of Object.keys(map)) {
      map[country].sort((a: any, b: any) => {
        const bc = (b.beerCount || 0) - (a.beerCount || 0);
        if (bc !== 0) return bc;
        return a.name.localeCompare(b.name);
      });
    }
    const sorted = Object.keys(map).sort((a, b) => map[b].length - map[a].length);
    return { breweriesByCountry: map, countryList: sorted, totalBreweries: allBreweries.length };
  }, [allBreweries]);

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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Esplora Tutti i Birrifici</h1>
              <p className="text-gray-500 dark:text-slate-400">
                {totalBreweries > 0 ? `${totalBreweries.toLocaleString('it-IT')} birrifici da tutto il mondo` : 'Scopri birrifici da tutto il mondo organizzati per paese'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="bg-gray-100 dark:bg-slate-800 rounded-lg h-48 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {countryList.map(country => {
              const countryBreweries = breweriesByCountry[country] || [];
              if (countryBreweries.length === 0) return null;
              const limit = showCounts[country] || PAGE_SIZE;
              const visible = countryBreweries.slice(0, limit);
              const remaining = countryBreweries.length - limit;

              return (
                <Collapsible
                  key={country}
                  open={openCountries.includes(country)}
                  onOpenChange={() => toggleCountry(country)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between text-left h-auto p-4 mb-4 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white hover:bg-amber-50 hover:text-gray-900 hover:border-amber-200 dark:hover:bg-slate-700 dark:hover:text-white dark:hover:border-amber-500/30"
                    >
                      <div className="flex items-center gap-3">
                        <Beer className="w-5 h-5 text-amber-500" />
                        <span className="font-semibold text-lg">{country}</span>
                        <Badge variant="secondary" className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">{countryBreweries.length.toLocaleString('it-IT')} birrifici</Badge>
                      </div>
                      <div className="text-gray-400 dark:text-slate-500">
                        {openCountries.includes(country) ? '−' : '+'}
                      </div>
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-4">
                      {visible.map((brewery: any) => (
                        <BrewerySquareCard key={brewery.id} brewery={brewery} />
                      ))}
                    </div>
                    {remaining > 0 && (
                      <div className="flex justify-center mb-6">
                        <Button
                          variant="outline"
                          className="border-amber-300 text-amber-700 dark:border-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                          onClick={() => setShowCounts(prev => ({ ...prev, [country]: limit + PAGE_SIZE }))}
                        >
                          Mostra altri {Math.min(remaining, PAGE_SIZE)} birrifici ({remaining.toLocaleString('it-IT')} rimasti)
                        </Button>
                      </div>
                    )}
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