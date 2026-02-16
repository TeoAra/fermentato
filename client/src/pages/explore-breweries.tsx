import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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

const paesiMondiali = [
  "Italia", "Germania", "Stati Uniti", "Belgio", "Regno Unito", "Francia", 
  "Spagna", "Olanda", "Repubblica Ceca", "Canada", "Australia", "Giappone",
  "Messico", "Brasile", "Danimarca", "Svezia", "Norvegia", "Finlandia",
  "Austria", "Svizzera", "Irlanda", "Polonia", "Portogallo", "Nuova Zelanda",
  "Israele", "India", "Altri"
];

const countryNameMap: Record<string, string> = {
  "Italy": "Italia", "Italia": "Italia",
  "Germany": "Germania", "Germania": "Germania", "Deutschland": "Germania",
  "United States": "Stati Uniti", "USA": "Stati Uniti", "US": "Stati Uniti", "Stati Uniti": "Stati Uniti",
  "Belgium": "Belgio", "Belgio": "Belgio", "Belgique": "Belgio", "België": "Belgio",
  "United Kingdom": "Regno Unito", "UK": "Regno Unito", "Regno Unito": "Regno Unito",
  "France": "Francia", "Francia": "Francia",
  "Spain": "Spagna", "Spagna": "Spagna", "España": "Spagna",
  "Netherlands": "Olanda", "Olanda": "Olanda", "Holland": "Olanda", "Paesi Bassi": "Olanda",
  "Czech Republic": "Repubblica Ceca", "Czechia": "Repubblica Ceca", "Repubblica Ceca": "Repubblica Ceca",
  "Canada": "Canada",
  "Australia": "Australia",
  "Japan": "Giappone", "Giappone": "Giappone",
  "Mexico": "Messico", "Messico": "Messico", "México": "Messico",
  "Brazil": "Brasile", "Brasile": "Brasile", "Brasil": "Brasile",
  "Denmark": "Danimarca", "Danimarca": "Danimarca", "Danmark": "Danimarca",
  "Sweden": "Svezia", "Svezia": "Svezia", "Sverige": "Svezia",
  "Norway": "Norvegia", "Norvegia": "Norvegia", "Norge": "Norvegia",
  "Finland": "Finlandia", "Finlandia": "Finlandia", "Suomi": "Finlandia",
  "Austria": "Austria", "Österreich": "Austria",
  "Switzerland": "Svizzera", "Svizzera": "Svizzera", "Schweiz": "Svizzera", "Suisse": "Svizzera",
  "Ireland": "Irlanda", "Irlanda": "Irlanda",
  "Poland": "Polonia", "Polonia": "Polonia", "Polska": "Polonia",
  "Portugal": "Portogallo", "Portogallo": "Portogallo",
  "New Zealand": "Nuova Zelanda", "Nuova Zelanda": "Nuova Zelanda",
  "Israel": "Israele", "Israele": "Israele",
  "India": "India",
};

const regionToCountry: Record<string, string> = {
  "Abruzzo": "Italia", "Basilicata": "Italia", "Calabria": "Italia", "Campania": "Italia",
  "Emilia-Romagna": "Italia", "Friuli-Venezia Giulia": "Italia", "Lazio": "Italia",
  "Liguria": "Italia", "Lombardia": "Italia", "Molise": "Italia", "Piemonte": "Italia",
  "Puglia": "Italia", "Sardegna": "Italia", "Sicilia": "Italia", "Toscana": "Italia",
  "Trentino-Alto Adige": "Italia", "Umbria": "Italia", "Valle d'Aosta": "Italia", "Veneto": "Italia",
  "Italia": "Italia",
  "AN": "Italia", "AP": "Italia", "FM": "Italia", "FO": "Italia", "IM": "Italia",
  "MB": "Italia", "MC": "Italia", "NL": "Italia", "PU": "Italia", "SA": "Italia",
  "SP": "Italia", "SV": "Italia",
  "Bavaria": "Germania", "Nord": "Germania",
  "England": "Regno Unito", "UK": "Regno Unito",
  "Alsace": "Francia",
  "East Flanders": "Belgio", "West Flanders": "Belgio", "Hainaut": "Belgio",
  "Brussels": "Belgio", "Région wallonne": "Belgio",
  "Gelderland": "Olanda", "North Holland": "Olanda",
  "Madrid": "Spagna",
  "Lisbon": "Portogallo", "Porto": "Portogallo",
  "Plzen": "Repubblica Ceca", "Krusovice": "Repubblica Ceca",
  "Arizona": "Stati Uniti", "California": "Stati Uniti", "Colorado": "Stati Uniti",
  "Idaho": "Stati Uniti", "Indiana": "Stati Uniti", "Massachusetts": "Stati Uniti",
  "Michigan": "Stati Uniti", "Minnesota": "Stati Uniti", "Nevada": "Stati Uniti",
  "New York": "Stati Uniti", "North Carolina": "Stati Uniti", "Ohio": "Stati Uniti",
  "Oklahoma": "Stati Uniti", "Oregon": "Stati Uniti", "South Carolina": "Stati Uniti",
  "Texas": "Stati Uniti", "Washington": "Stati Uniti", "Wisconsin": "Stati Uniti", "WA": "Stati Uniti",
  "Ontario": "Canada", "Quebec": "Canada", "Nova Scotia": "Canada",
  "Baja California": "Messico", "Sinaloa": "Messico",
  "Rio de Janeiro": "Brasile",
  "NSW": "Australia", "Queensland": "Australia", "Victoria": "Australia",
  "Auckland": "Nuova Zelanda", "Otago": "Nuova Zelanda", "Wellington": "Nuova Zelanda",
  "Tokyo": "Giappone", "Ibaraki": "Giappone", "Okinawa": "Giappone",
  "Saitama": "Giappone", "Shizuoka": "Giappone",
  "Cork": "Irlanda", "Kilkenny": "Irlanda",
  "Estero": "Altri",
};

function detectCountry(brewery: any): string {
  const loc = brewery.location || "";
  const parts = loc.split(",").map((p: string) => p.trim());
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1];
    const mapped = countryNameMap[lastPart];
    if (mapped) return mapped;
  }

  const region = brewery.region || "";
  if (region && regionToCountry[region]) {
    return regionToCountry[region];
  }

  if (region && countryNameMap[region]) {
    return countryNameMap[region];
  }

  for (const [key, value] of Object.entries(countryNameMap)) {
    if (loc.toLowerCase().includes(key.toLowerCase())) return value;
  }

  return "Altri";
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
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group h-48 relative">
        <CardContent className="p-4 h-full flex flex-col">
          {/* Favorite Button */}
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

          {/* Brewery Image */}
          <div className="relative w-full h-24 mb-3 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={brewery.logoUrl || "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=150"}
              alt={`Logo ${brewery.name}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          </div>
          
          {/* Brewery Info */}
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
            
            {/* Tags */}
            <div className="flex flex-wrap gap-1 mt-auto">
              <Badge variant="outline" className="text-xs px-2 py-0.5 h-auto">
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

export default function ExploreBreweries() {
  const [openCountries, setOpenCountries] = useState<string[]>([]);

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

  const breweriesByCountry = Array.isArray(allBreweries) ? allBreweries
    .filter((brewery: any) => (brewery.beerCount || 0) > 0)
    .reduce((acc: any, brewery: any) => {
      const country = detectCountry(brewery);
      if (!acc[country]) acc[country] = [];
      acc[country].push(brewery);
      return acc;
    }, {}) : {};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Torna alla Home
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Esplora Tutti i Birrifici</h1>
              <p className="text-gray-600">Scopri birrifici da tutto il mondo organizzati per paese</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md h-48 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {paesiMondiali.map(country => {
              const countryBreweries = breweriesByCountry[country] || [];
              if (countryBreweries.length === 0) return null;

              return (
                <Collapsible
                  key={country}
                  open={openCountries.includes(country)}
                  onOpenChange={() => toggleCountry(country)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between text-left h-auto p-4 mb-4"
                    >
                      <div className="flex items-center gap-3">
                        <Beer className="w-5 h-5 text-primary" />
                        <span className="font-semibold text-lg">{country}</span>
                        <Badge variant="secondary">{countryBreweries.length} birrifici</Badge>
                      </div>
                      <div className="text-gray-400">
                        {openCountries.includes(country) ? '−' : '+'}
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
                      {countryBreweries.map((brewery: any) => (
                        <BrewerySquareCard key={brewery.id} brewery={brewery} />
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