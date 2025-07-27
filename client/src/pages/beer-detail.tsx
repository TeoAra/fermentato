import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Star, 
  MapPin, 
  Beer as BeerIcon, 
  Thermometer, 
  Eye, 
  Droplets, 
  Wheat, 
  Building,
  ArrowLeft,
  Heart,
  Share2,
  Wine,
  Store
} from "lucide-react";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import BeerTastingForm from "@/components/BeerTastingForm";

interface Beer {
  id: number;
  name: string;
  style: string;
  abv: string;
  ibu?: number;
  description?: string;
  logoUrl?: string;
  imageUrl?: string;
  bottleImageUrl?: string;
  color?: string;
  isBottled?: boolean;
  breweryId: number;
  brewery?: {
    id: number;
    name: string;
    location: string;
    region: string;
    logoUrl?: string;
  };
}

interface BeerAvailability {
  tapLocations: Array<{
    pub: {
      id: number;
      name: string;
      city: string;
      address: string;
    };
    tapItem: {
      id: number;
      price?: string;
      isActive: boolean;
    };
  }>;
  bottleLocations: Array<{
    pub: {
      id: number;
      name: string;
      city: string;
      address: string;
    };
    bottleItem: {
      id: number;
      price?: string;
      isActive: boolean;
    };
  }>;
}

export default function BeerDetail() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showTastingForm, setShowTastingForm] = useState(false);
  
  const { data: beer, isLoading: beerLoading } = useQuery<Beer>({
    queryKey: ["/api/beers", id],
    enabled: !!id,
  });

  const { data: availability, isLoading: availabilityLoading } = useQuery<BeerAvailability>({
    queryKey: ["/api/beers", id, "availability"],
    enabled: !!id,
  });

  // Check if beer is favorited
  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  const isBeerFavorited = Array.isArray(favorites) && favorites.some((fav: any) => 
    fav.itemType === 'beer' && fav.itemId === parseInt(id || '0')
  );

  // Check if user has already tasted this beer
  const { data: userTastings = [] } = useQuery({
    queryKey: ["/api/user/beer-tastings"],
    enabled: isAuthenticated,
  });

  const existingTasting = userTastings.find((tasting: any) => tasting.beerId === parseInt(id || '0'));
  const hasTasted = !!existingTasting;

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
        description: isBeerFavorited ? "Rimossa dai favoriti" : "Aggiunta ai favoriti",
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
      itemType: 'beer',
      itemId: parseInt(id || '0'),
      action: isBeerFavorited ? 'remove' : 'add'
    });
  };

  if (beerLoading) {
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

  if (!beer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BeerIcon className="mx-auto text-gray-400 mb-4" size={64} />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Birra non trovata</h1>
          <p className="text-gray-600">La birra che stai cercando non esiste.</p>
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
              className={`${isBeerFavorited ? 'bg-red-100 border-red-300 text-red-700 hover:bg-red-200' : 'bg-white/90 hover:bg-white'}`}
              onClick={handleFavoriteToggle}
              disabled={favoriteMutation.isPending}
            >
              <Heart className={`w-4 h-4 ${isBeerFavorited ? 'fill-current text-red-600' : ''}`} />
            </Button>
          )}
          
          <Button variant="secondary" size="sm">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Beer Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end space-x-6">
              <div className="w-32 h-40 bg-white rounded-lg shadow-lg overflow-hidden">
                <img
                  src={beer.bottleImageUrl || beer.imageUrl || "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=300"}
                  alt={beer.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{beer.name}</h1>
                <div className="flex items-center space-x-4 mb-4">
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    {beer.style}
                  </Badge>
                  <span className="text-lg font-semibold">{beer.abv}% ABV</span>
                  {beer.ibu && (
                    <span className="text-lg">{beer.ibu} IBU</span>
                  )}
                </div>
                
                {beer.brewery && (
                  <Link href={`/brewery/${beer.brewery.id}`}>
                    <div className="flex items-center space-x-3 text-orange-100 hover:text-white transition-colors">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={beer.brewery.logoUrl} />
                        <AvatarFallback className="text-xs">
                          {beer.brewery.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{beer.brewery.name}</p>
                        <p className="text-sm">{beer.brewery.location}, {beer.brewery.region}</p>
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <Thermometer className="w-6 h-6 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">ABV</h3>
              <p className="text-lg font-bold text-primary">{beer.abv}%</p>
            </CardContent>
          </Card>
          
          {beer.ibu && (
            <Card>
              <CardContent className="p-4 text-center">
                <Droplets className="w-6 h-6 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-sm">IBU</h3>
                <p className="text-lg font-bold text-primary">{beer.ibu}</p>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardContent className="p-4 text-center">
              <Wheat className="w-6 h-6 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Stile</h3>
              <p className="text-sm font-semibold">{beer.style}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Eye className="w-6 h-6 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Colore</h3>
              <p className="text-sm">{beer.color || "Ambrato"}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Description */}
          <div className="lg:col-span-2 space-y-6">
            {beer.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BeerIcon className="w-5 h-5 mr-2" />
                    Descrizione
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">{beer.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Availability */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Dove Trovarla
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availabilityLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Tap Locations */}
                    {availability?.tapLocations && availability.tapLocations.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center">
                          <BeerIcon className="w-4 h-4 mr-2" />
                          Alla Spina
                        </h3>
                        <div className="space-y-2">
                          {availability.tapLocations.map((location, index) => (
                            <Link key={index} href={`/pub/${location.pub.id}`}>
                              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                <div>
                                  <h4 className="font-semibold">{location.pub.name}</h4>
                                  <p className="text-sm text-gray-600">{location.pub.address}</p>
                                </div>
                                <div className="text-right">
                                  {location.tapItem.price && (
                                    <p className="font-bold">€{location.tapItem.price}</p>
                                  )}
                                  <Badge variant={location.tapItem.isActive ? "default" : "secondary"}>
                                    {location.tapItem.isActive ? "Disponibile" : "Esaurita"}
                                  </Badge>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bottle Locations */}
                    {availability?.bottleLocations && availability.bottleLocations.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center">
                          <Wine className="w-4 h-4 mr-2" />
                          In Bottiglia
                        </h3>
                        <div className="space-y-2">
                          {availability.bottleLocations.map((location, index) => (
                            <Link key={index} href={`/pub/${location.pub.id}`}>
                              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                <div>
                                  <h4 className="font-semibold">{location.pub.name}</h4>
                                  <p className="text-sm text-gray-600">{location.pub.address}</p>
                                </div>
                                <div className="text-right">
                                  {location.bottleItem.price && (
                                    <p className="font-bold">€{location.bottleItem.price}</p>
                                  )}
                                  <Badge variant={location.bottleItem.isActive ? "default" : "secondary"}>
                                    {location.bottleItem.isActive ? "Disponibile" : "Esaurita"}
                                  </Badge>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {(!availability?.tapLocations?.length && !availability?.bottleLocations?.length) && (
                      <p className="text-center text-gray-500 py-8">
                        Nessuna disponibilità trovata nei pub registrati
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Brewery Info */}
            {beer.brewery && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building className="w-5 h-5 mr-2" />
                    Birrificio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href={`/brewery/${beer.brewery.id}`}>
                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={beer.brewery.logoUrl} />
                        <AvatarFallback>
                          {beer.brewery.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{beer.brewery.name}</h3>
                        <p className="text-sm text-gray-600">
                          {beer.brewery.location}, {beer.brewery.region}
                        </p>
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Azioni Rapide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className={`w-full ${isBeerFavorited ? 'bg-red-600 hover:bg-red-700' : ''}`}
                  onClick={handleFavoriteToggle}
                  disabled={favoriteMutation.isPending}
                >
                  <Heart className={`w-4 h-4 mr-2 ${isBeerFavorited ? 'fill-current' : ''}`} />
                  {isBeerFavorited ? 'Rimuovi dai Favoriti' : 'Aggiungi ai Favoriti'}
                </Button>
                
                {/* Beer Tasting Form Integrated */}
                {hasTasted ? (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      // Open edit existing tasting modal
                      setShowTastingForm(true);
                    }}
                  >
                    ✓ Hai bevuto questa birra il {new Date(existingTasting.tastedAt).toLocaleDateString('it-IT')}
                  </Button>
                ) : (
                  <BeerTastingForm 
                    beerId={parseInt(id || '0')} 
                    beerName={beer?.name || ''} 
                    existingTasting={null} 
                  />
                )}
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: `${beer?.name} - Fermenta.to`,
                        text: `Scopri ${beer?.name} di ${beer?.brewery?.name} su Fermenta.to!`,
                        url: window.location.href,
                      });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      toast({
                        title: "Link copiato!",
                        description: "Il link è stato copiato negli appunti",
                      });
                    }
                  }}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Condividi Birra
                </Button>

              </CardContent>
            </Card>

            {/* Technical Details */}
            <Card>
              <CardHeader>
                <CardTitle>Dettagli Tecnici</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gradazione:</span>
                    <span className="font-semibold">{beer.abv}% ABV</span>
                  </div>
                  {beer.ibu && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amarezza:</span>
                      <span className="font-semibold">{beer.ibu} IBU</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stile:</span>
                    <span className="font-semibold">{beer.style}</span>
                  </div>
                  {beer.color && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Colore:</span>
                      <span className="font-semibold">{beer.color}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>


        </div>
      </main>

      <Footer />
    </div>
  );
}