import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Star, 
  MapPin, 
  Beer, 
  Globe, 
  ArrowLeft, 
  Heart, 
  Share2, 
  Building,
  Award
} from "lucide-react";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

export default function BreweryDetail() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAllBeers, setShowAllBeers] = useState(false);
  
  const { data: brewery, isLoading: breweryLoading } = useQuery({
    queryKey: ["/api/breweries", id],
    enabled: !!id,
  });

  const { data: beers = [], isLoading: beersLoading } = useQuery({
    queryKey: ["/api/breweries", id, "beers"],
    enabled: !!id,
  });

  // Check if brewery is favorited
  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  const isBreweryFavorited = Array.isArray(favorites) && favorites.some((fav: any) => 
    fav.itemType === 'brewery' && fav.itemId === parseInt(id || '0')
  );

  // Favorite mutation
  const favoriteMutation = useMutation({
    mutationFn: async ({ itemType, itemId, action }: { itemType: string, itemId: number, action: 'add' | 'remove' }) => {
      if (action === 'add') {
        return apiRequest('/api/favorites', 'POST', { itemType, itemId });
      } else {
        return apiRequest(`/api/favorites/${itemType}/${itemId}`, 'DELETE');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "Successo",
        description: isBreweryFavorited ? "Rimosso dai favoriti" : "Aggiunto ai favoriti",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Non è stato possibile aggiornare i favoriti",
        variant: "destructive",
      });
    },
  });

  const handleFavoriteToggle = () => {
    if (!isAuthenticated) {
      toast({
        title: "Accesso richiesto",
        description: "Effettua l'accesso per aggiungere ai favoriti",
        variant: "destructive",
      });
      return;
    }

    favoriteMutation.mutate({
      itemType: 'brewery',
      itemId: parseInt(id || '0'),
      action: isBreweryFavorited ? 'remove' : 'add'
    });
  };

  if (breweryLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse">
          <div className="h-80 bg-gray-300"></div>
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="h-8 bg-gray-300 rounded mb-4"></div>
            <div className="h-4 bg-gray-300 rounded mb-8"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!brewery) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building className="mx-auto text-gray-400 mb-4" size={64} />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Birrificio non trovato</h1>
          <p className="text-gray-600">Il birrificio che stai cercando non esiste.</p>
          <Link href="/">
            <Button className="mt-4">Torna alla Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-80 md:h-96 beer-gradient">
        <div className="absolute inset-0 bg-black bg-opacity-20" />
        
        {/* Back Button */}
        <div className="absolute top-4 left-4">
          <Button variant="secondary" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Indietro
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex space-x-2">
          {/* Favorite Button */}
          {isAuthenticated && (
            <Button
              variant="secondary"
              size="sm"
              className={`${isBreweryFavorited ? 'bg-red-100 border-red-300 text-red-700 hover:bg-red-200' : 'bg-white/90 hover:bg-white'}`}
              onClick={handleFavoriteToggle}
              disabled={favoriteMutation.isPending}
            >
              <Heart className={`w-4 h-4 ${isBreweryFavorited ? 'fill-current text-red-600' : ''}`} />
            </Button>
          )}
          
          <Button variant="secondary" size="sm">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Brewery Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center space-x-6">
              <Avatar className="w-24 h-24 border-4 border-white">
                <AvatarImage 
                  src={(brewery as any)?.logoUrl || "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200"} 
                  alt={`Logo ${(brewery as any)?.name}`} 
                />
                <AvatarFallback className="text-xl font-bold">
                  {(brewery as any)?.name?.split(' ').map((word: string) => word[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{(brewery as any)?.name}</h1>
                <div className="flex items-center space-x-4 mb-2">
                  <p className="text-lg text-orange-100 flex items-center">
                    <MapPin className="mr-2" size={20} />
                    {(brewery as any)?.location}, {(brewery as any)?.region}
                  </p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <Star className="text-yellow-400 mr-1" size={20} />
                    <span className="font-semibold">{(brewery as any)?.rating || "N/A"}</span>
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    {Array.isArray(beers) ? beers.length : 0} birre
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 -mt-8 mb-8 relative z-10">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-4 text-center">
              <Building className="w-6 h-6 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Fondato</h3>
              <p className="text-xs text-gray-600">{(brewery as any)?.founded || "N/A"}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg">
            <CardContent className="p-4 text-center">
              <Beer className="w-6 h-6 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Birre Totali</h3>
              <p className="text-xs text-gray-600">{Array.isArray(beers) ? beers.length : 0}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg">
            <CardContent className="p-4 text-center">
              <Award className="w-6 h-6 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Rating</h3>
              <p className="text-xs text-gray-600">{typeof (brewery as any)?.rating === 'number' ? (brewery as any)?.rating.toFixed(1) : (brewery as any)?.rating || "N/A"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        {(brewery as any)?.description && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="w-5 h-5 mr-2" />
                La Nostra Storia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">{(brewery as any)?.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Brewery Details & Website */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Beer className="w-5 h-5 mr-2" />
                  Le Nostre Birre ({Array.isArray(beers) ? beers.length : 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {beersLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-20 bg-gray-200 rounded" />
                    ))}
                  </div>
                ) : (
                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${showAllBeers ? '' : ''}`}>
                    {Array.isArray(beers) && beers.length > 0 ? 
                      (showAllBeers ? beers : beers.slice(0, 8)).map((beer: any) => (
                        <Link key={beer.id} href={`/beer/${beer.id}`}>
                          <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                            <img
                              src={beer.imageUrl || beer.bottleImageUrl || "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=60&h=60"}
                              alt={beer.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                            <div className="flex-1">
                              <h3 className="font-semibold text-sm">{beer.name}</h3>
                              <p className="text-xs text-gray-600">{beer.style}</p>
                              <p className="text-xs text-primary font-medium">{beer.abv}% ABV</p>
                            </div>
                          </div>
                        </Link>
                      )) : (
                        <p className="text-center text-gray-500 py-8 col-span-2">
                          Nessuna birra disponibile per questo birrificio
                        </p>
                      )
                    }
                  </div>
                )}
                
                {Array.isArray(beers) && beers.length > 8 && (
                  <div className="text-center mt-6">
                    <Button 
                      variant="outline"
                      onClick={() => setShowAllBeers(!showAllBeers)}
                    >
                      {showAllBeers ? 
                        `Mostra meno birre` : 
                        `Vedi tutte le ${beers.length} birre`
                      }
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="w-5 h-5 mr-2" />
                  Info & Contatti
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Sede</h3>
                  <p className="text-gray-600 text-sm">
                    {(brewery as any)?.location}, {(brewery as any)?.region}
                  </p>
                </div>
                
                {(brewery as any)?.websiteUrl && (
                  <div>
                    <h3 className="font-semibold mb-2">Sito Web</h3>
                    <a 
                      href={(brewery as any).websiteUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      Visita il sito ufficiale
                    </a>
                  </div>
                )}

                <div className="pt-4">
                  <Button 
                    className={`w-full mb-2 ${isBreweryFavorited ? 'bg-red-600 hover:bg-red-700' : ''}`}
                    onClick={handleFavoriteToggle}
                    disabled={favoriteMutation.isPending}
                  >
                    <Heart className={`w-4 h-4 mr-2 ${isBreweryFavorited ? 'fill-current' : ''}`} />
                    {isBreweryFavorited ? 'Rimuovi dai Favoriti' : 'Aggiungi ai Favoriti'}
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Share2 className="w-4 h-4 mr-2" />
                    Condividi
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="w-5 h-5 mr-2" />
                  Statistiche
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Birre Totali:</span>
                  <span className="font-bold">{Array.isArray(beers) ? beers.length : 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rating Medio:</span>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 mr-1" />
                    <span className="font-bold">{typeof (brewery as any)?.rating === 'number' ? (brewery as any)?.rating.toFixed(1) : (brewery as any)?.rating || "N/A"}</span>
                  </div>
                </div>
                {(brewery as any)?.founded && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fondato:</span>
                    <span className="font-bold">{(brewery as any).founded}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}