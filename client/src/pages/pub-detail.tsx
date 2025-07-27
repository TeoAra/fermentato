import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { 
  Star, 
  MapPin, 
  Clock, 
  Phone, 
  Globe, 
  Wine, 
  Facebook, 
  Instagram,
  ArrowLeft,
  Heart,
  Share2,
  Beer,
  Utensils,
  Camera,
  Navigation
} from "lucide-react";
import Footer from "@/components/footer";
import TapList from "@/components/tap-list";
import FoodMenu from "@/components/food-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Funzione per controllare se un pub è aperto ora
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

interface Pub {
  id: number;
  name: string;
  address: string;
  city?: string;
  phone?: string;
  websiteUrl?: string;
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  rating?: number;
  openingHours?: any;
}

export default function PubDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("taplist");
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: pub, isLoading: pubLoading } = useQuery<Pub>({
    queryKey: ["/api/pubs", id],
    enabled: !!id,
  });

  const { data: tapList = [], isLoading: tapLoading } = useQuery({
    queryKey: ["/api/pubs", id, "taplist"],
    enabled: !!id,
  });

  const { data: menu = [], isLoading: menuLoading } = useQuery({
    queryKey: ["/api/pubs", id, "menu"],
    enabled: !!id,
  });

  const { data: bottles = [], isLoading: bottlesLoading } = useQuery({
    queryKey: ["/api/pubs", id, "bottles"],
    enabled: !!id,
  });

  // Check if pub is favorited
  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  const isPubFavorited = Array.isArray(favorites) && favorites.some((fav: any) => 
    fav.itemType === 'pub' && fav.itemId === parseInt(id || '0')
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
        description: isPubFavorited ? "Rimosso dai favoriti" : "Aggiunto ai favoriti",
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
      itemType: 'pub',
      itemId: parseInt(id || '0'),
      action: isPubFavorited ? 'remove' : 'add'
    });
  };

  if (pubLoading) {
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

  if (!pub) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Pub non trovato</h1>
          <p className="text-gray-600">Il pub che stai cercando non esiste.</p>
          <Link href="/">
            <Button className="mt-4">Torna alla Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isOpen = pub ? isOpenNow(pub.openingHours) : false;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Cover Image */}
      <div className="relative h-80 md:h-96 overflow-hidden">
        <img
          src={pub?.coverImageUrl || "https://images.unsplash.com/photo-1544145945-f90425340c7e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=600"}
          alt={`Cover ${pub?.name || 'pub'}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-40" />
        
        {/* Back Button */}
        <div className="absolute top-4 left-4">
          <Button variant="secondary" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Indietro
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex space-x-2">
          <Button 
            variant="secondary" 
            size="sm"
            className={isPubFavorited ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
            onClick={handleFavoriteToggle}
            disabled={favoriteMutation.isPending}
          >
            <Heart className={`w-4 h-4 ${isPubFavorited ? 'fill-current' : ''}`} />
          </Button>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `${pub?.name || 'Pub'}`,
                  text: `Scopri ${pub?.name || 'questo fantastico pub'} su Fermenta.to!`,
                  url: window.location.href
                });
              } else {
                // Fallback: copia URL negli appunti
                navigator.clipboard.writeText(window.location.href).then(() => {
                  alert('Link copiato negli appunti!');
                });
              }
            }}
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Pub Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-center space-x-4 mb-4">
            <Avatar className="w-16 h-16 border-2 border-white">
              <AvatarImage src={pub?.logoUrl} alt={pub?.name} />
              <AvatarFallback className="text-xl font-bold">
                {pub?.name?.split(' ').map((word: string) => word[0]).join('').slice(0, 2) || 'PB'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">{pub?.name}</h1>
              <div className="flex items-center space-x-4 mt-2">
                <Badge variant={isOpen ? "default" : "secondary"} className={isOpen ? "bg-green-500" : "bg-red-500"}>
                  {isOpen ? "Aperto ora" : "Chiuso"}
                </Badge>
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-400 mr-1" />
                  <span className="font-semibold">{pub?.rating ? Number(pub.rating).toFixed(1) : "N/A"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 -mt-8 mb-8 relative z-10">
          <Card 
            className="bg-white shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => {
              if (pub?.address) {
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pub.address)}`;
                window.open(mapsUrl, '_blank');
              }
            }}
          >
            <CardContent className="p-4 text-center">
              <MapPin className="w-6 h-6 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Indirizzo</h3>
              <p className="text-xs text-gray-600 hover:text-primary transition-colors">{pub?.address}</p>
              <p className="text-xs text-primary mt-1">Tocca per aprire Maps</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg">
            <CardContent className="p-4 text-center">
              <Phone className="w-6 h-6 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Telefono</h3>
              <p className="text-xs text-gray-600">{pub?.phone || "Non disponibile"}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg">
            <CardContent className="p-4 text-center">
              <Globe className="w-6 h-6 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Sito Web</h3>
              <p className="text-xs text-gray-600">
                {pub?.websiteUrl ? (
                  <a href={pub.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Visita
                  </a>
                ) : "Non disponibile"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        {pub?.description && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <Camera className="w-5 h-5 mr-2" />
                Chi Siamo
              </h2>
              <p className="text-gray-700 leading-relaxed">{pub?.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="taplist" className="mb-8">
          <TabsList className="grid w-full grid-cols-3 mb-6 h-auto p-1">
            <TabsTrigger value="taplist" className="flex flex-col sm:flex-row items-center p-3 text-xs sm:text-sm">
              <Beer className="w-4 h-4 sm:mr-2 mb-1 sm:mb-0" />
              <span className="text-center">
                Birre<br className="sm:hidden" />
                <span className="hidden sm:inline"> </span>({Array.isArray(tapList) ? tapList.length : 0})
              </span>
            </TabsTrigger>
            <TabsTrigger value="bottles" className="flex flex-col sm:flex-row items-center p-3 text-xs sm:text-sm">
              <Wine className="w-4 h-4 sm:mr-2 mb-1 sm:mb-0" />
              <span className="text-center">
                Cantina<br className="sm:hidden" />
                <span className="hidden sm:inline"> </span>({Array.isArray(bottles) ? bottles.length : 0})
              </span>
            </TabsTrigger>
            <TabsTrigger value="menu" className="flex flex-col sm:flex-row items-center p-3 text-xs sm:text-sm">
              <Utensils className="w-4 h-4 sm:mr-2 mb-1 sm:mb-0" />
              <span className="text-center">
                Menu<br className="sm:hidden" />
                <span className="hidden sm:inline"> </span>({Array.isArray(menu) ? menu.length : 0})
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="taplist" className="mt-0">
            {tapLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="p-4 flex items-center gap-4">
                      <div className="w-14 h-14 bg-gray-200 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                      <div className="w-20 h-8 bg-gray-200 rounded" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <TapList tapList={Array.isArray(tapList) ? tapList : []} />
            )}
          </TabsContent>

          <TabsContent value="bottles" className="mt-0">
            {bottlesLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="p-4 flex items-center gap-4">
                      <div className="w-14 h-14 bg-gray-200 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                      <div className="w-20 h-8 bg-gray-200 rounded" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Array.isArray(bottles) && bottles.length > 0 ? bottles.map((bottle: any) => (
                  <Card key={bottle.id} className="overflow-hidden hover:shadow-md transition-all duration-200">
                    <div className="p-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={bottle.beer?.bottleImageUrl || bottle.beer?.imageUrl || "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"}
                          alt={bottle.beer?.name}
                          className="w-14 h-14 object-cover rounded-lg shadow-sm flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base truncate">{bottle.beer?.name}</h3>
                          <p className="text-sm text-gray-600 truncate">{bottle.beer?.brewery?.name || bottle.beer?.brewery}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{bottle.beer?.style}</Badge>
                            {bottle.beer?.abv && <Badge variant="outline" className="text-xs">{bottle.beer?.abv}% ABV</Badge>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="bg-gray-50 rounded-lg p-2 min-w-[80px]">
                            <p className="font-bold text-lg text-primary">€{bottle.price}</p>
                            <Badge variant={bottle.isActive ? "default" : "secondary"} className="text-xs">
                              {bottle.isActive ? "Disponibile" : "Esaurita"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                )) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <Wine className="w-16 h-16 mx-auto" />
                    </div>
                    <p className="text-gray-500 text-lg font-medium">Nessuna birra in bottiglia disponibile</p>
                    <p className="text-gray-400 text-sm mt-1">Torna presto per vedere le novità!</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="menu">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Utensils className="w-5 h-5 mr-2" />
                  Menu Cibo
                </CardTitle>
              </CardHeader>
              <CardContent>
                {menuLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-32 bg-gray-200 rounded" />
                    ))}
                  </div>
                ) : (
                  <FoodMenu menu={Array.isArray(menu) ? menu : []} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Contact & Location */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Navigation className="w-5 h-5 mr-2" />
                Come Raggiungerci
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Indirizzo</h3>
                  <p className="text-gray-600">{pub?.address}</p>
                </div>
                
                {pub?.phone && (
                  <div>
                    <h3 className="font-semibold mb-2">Telefono</h3>
                    <a href={`tel:${pub.phone}`} className="text-primary hover:underline">
                      {pub.phone}
                    </a>
                  </div>
                )}

                <div className="flex space-x-4">
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      if (pub?.address) {
                        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pub.address)}`;
                        window.open(mapsUrl, '_blank');
                      }
                    }}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Indicazioni
                  </Button>
                  {pub?.phone && (
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => window.open(`tel:${pub.phone}`, '_self')}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Chiama
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Orari di Apertura
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pub?.openingHours ? Object.entries(pub.openingHours).map(([day, hours]: [string, any]) => (
                  <div key={day} className="flex justify-between items-center">
                    <span className="capitalize font-medium">
                      {day === 'monday' ? 'Lunedì' :
                       day === 'tuesday' ? 'Martedì' :
                       day === 'wednesday' ? 'Mercoledì' :
                       day === 'thursday' ? 'Giovedì' :
                       day === 'friday' ? 'Venerdì' :
                       day === 'saturday' ? 'Sabato' : 'Domenica'}
                    </span>
                    <span className="text-gray-600">
                      {hours.isClosed ? 'Chiuso' : 
                       hours.open && hours.close ? `${hours.open} - ${hours.close}` : 'Aperto'}
                    </span>
                  </div>
                )) : (
                  <p className="text-gray-500">Orari non disponibili</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}