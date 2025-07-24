import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
          <Button variant="secondary" size="sm">
            <Heart className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="sm">
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
                  <span className="font-semibold">{typeof pub?.rating === 'number' ? pub.rating.toFixed(1) : "N/A"}</span>
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
          <Card className="bg-white shadow-lg">
            <CardContent className="p-4 text-center">
              <MapPin className="w-6 h-6 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Indirizzo</h3>
              <p className="text-xs text-gray-600">{pub?.address}</p>
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
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="taplist" className="flex items-center">
              <Beer className="w-4 h-4 mr-2" />
              Birre ({Array.isArray(tapList) ? tapList.length : 0})
            </TabsTrigger>
            <TabsTrigger value="bottles" className="flex items-center">
              <Wine className="w-4 h-4 mr-2" />
              Cantina ({Array.isArray(bottles) ? bottles.length : 0})
            </TabsTrigger>
            <TabsTrigger value="menu" className="flex items-center">
              <Utensils className="w-4 h-4 mr-2" />
              Menu ({Array.isArray(menu) ? menu.length : 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="taplist">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Beer className="w-5 h-5 mr-2" />
                  Birre alla Spina
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tapLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-20 bg-gray-200 rounded" />
                    ))}
                  </div>
                ) : (
                  <TapList tapList={Array.isArray(tapList) ? tapList : []} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bottles">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wine className="w-5 h-5 mr-2" />
                  Cantina Birre
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bottlesLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-20 bg-gray-200 rounded" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Array.isArray(bottles) && bottles.length > 0 ? bottles.map((bottle: any) => (
                      <div key={bottle.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <img
                            src={bottle.beer?.bottleImageUrl || bottle.beer?.imageUrl || "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"}
                            alt={bottle.beer?.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div>
                            <h3 className="font-semibold">{bottle.beer?.name}</h3>
                            <p className="text-sm text-gray-600">{bottle.beer?.brewery}</p>
                            <p className="text-sm text-gray-500">{bottle.beer?.style} • {bottle.beer?.abv}%</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">€{bottle.price}</p>
                          <Badge variant={bottle.isActive ? "default" : "secondary"}>
                            {bottle.isActive ? "Disponibile" : "Esaurita"}
                          </Badge>
                        </div>
                      </div>
                    )) : (
                      <p className="text-center text-gray-500 py-8">Nessuna birra in bottiglia disponibile</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
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
                  <Button className="flex-1">
                    <MapPin className="w-4 h-4 mr-2" />
                    Indicazioni
                  </Button>
                  {pub?.phone && (
                    <Button variant="outline" className="flex-1">
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