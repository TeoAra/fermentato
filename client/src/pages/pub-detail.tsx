import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Star, MapPin, Clock, Phone, Globe, Wine, Facebook, Instagram } from "lucide-react";
import Footer from "@/components/footer";
import TapList from "@/components/tap-list";
import FoodMenu from "@/components/food-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Funzione per controllare se un pub è aperto ora
function isOpenNow(openingHours: any) {
  if (!openingHours) return false;
  
  const now = new Date();
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const todayHours = openingHours[currentDay];
  if (!todayHours || todayHours.isClosed) return false;
  
  // Se ha orari, controlla se è nell'intervallo
  if (todayHours.open && todayHours.close) {
    const [openHour, openMin] = todayHours.open.split(':').map(Number);
    const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    
    if (closeTime < openTime) {
      // Orario attraversa la mezzanotte
      return currentTime >= openTime || currentTime <= closeTime;
    } else {
      return currentTime >= openTime && currentTime <= closeTime;
    }
  }
  
  return true; // Se non ha orari specifici ma non è chiuso, considera aperto
}

export default function PubDetail() {
  const { id } = useParams();
  
  const { data: pub, isLoading: pubLoading } = useQuery({
    queryKey: ["/api/pubs", id],
    enabled: !!id,
  });

  const { data: tapList, isLoading: tapLoading } = useQuery({
    queryKey: ["/api/pubs", id, "taplist"],
    enabled: !!id,
  });

  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: ["/api/pubs", id, "menu"],
    enabled: !!id,
  });

  const { data: bottles, isLoading: bottlesLoading } = useQuery({
    queryKey: ["/api/pubs", id, "bottles"],
    enabled: !!id,
  });

  if (pubLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-64 md:h-80 bg-gray-300 rounded-xl mb-8"></div>
            <div className="h-8 bg-gray-300 rounded mb-4"></div>
            <div className="h-4 bg-gray-300 rounded mb-8"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!pub) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Pub non trovato</h1>
            <p className="text-gray-600">Il pub che stai cercando non esiste o è stato rimosso.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Pub Header */}
        <Card className="mb-4 sm:mb-8 overflow-hidden">
          <div className="relative">
            <img
              src={pub.coverImageUrl || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400"}
              alt={`${pub.name} - Copertina`}
              className="w-full h-48 sm:h-64 md:h-80 object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-40"></div>
            <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 text-white pr-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mb-3">
                <div className="flex items-center space-x-3">
                  {pub.logoUrl && (
                    <img
                      src={pub.logoUrl}
                      alt={`${pub.name} - Logo`}
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-white shadow-lg"
                    />
                  )}
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold break-words">{pub.name}</h1>
                </div>
                {!pub.isActive && (
                  <Badge variant="destructive" className="mt-2 sm:mt-0 w-fit">Temporaneamente Chiuso</Badge>
                )}
              </div>
              
              {/* Mappa cliccabile al posto dell'indirizzo */}
              <div 
                className="inline-flex items-center bg-black/30 backdrop-blur-sm rounded-lg px-3 py-2 cursor-pointer hover:bg-black/40 transition-colors"
                onClick={() => {
                  const address = encodeURIComponent(`${pub.address}, ${pub.city}, Italia`);
                  window.open(`https://maps.google.com/maps?q=${address}`, '_blank');
                }}
              >
                <MapPin className="mr-2 flex-shrink-0" size={16} />
                <span className="text-sm sm:text-base">Vedi su Mappa</span>
              </div>
            </div>
          </div>

          <CardContent className="p-3 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              <div className="lg:col-span-2">
                {pub.description && (
                  <p className="text-gray-600 mb-4 text-sm sm:text-base">{pub.description}</p>
                )}
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0 mb-4">
                  <div className="flex items-center">
                    <Star className="text-yellow-400 mr-1" size={16} />
                    <span className="font-semibold text-sm sm:text-base">{pub.rating || "N/A"}</span>
                    <span className="text-gray-500 ml-1 text-sm sm:text-base">recensioni</span>
                  </div>
                  
                  <div className={`flex items-center ${isOpenNow(pub.openingHours) ? 'text-green-600' : 'text-red-600'}`}>
                    <Clock className="mr-1" size={14} />
                    <span className="text-sm">{isOpenNow(pub.openingHours) ? 'Aperto ora' : 'Chiuso ora'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mt-4 lg:mt-0">
                <h3 className="text-lg font-semibold text-secondary border-b border-gray-200 pb-2">Informazioni Contatto</h3>
                
                {/* Indirizzo completo con mappa */}
                <div className="space-y-2">
                  <div className="flex items-start">
                    <MapPin className="mr-3 text-primary flex-shrink-0 mt-1" size={18} />
                    <div>
                      <p className="font-medium text-gray-800">{pub.address}</p>
                      <p className="text-gray-600 text-sm">{pub.city}, {pub.region}</p>
                      <button 
                        className="text-primary hover:text-primary/80 text-sm font-medium mt-1 hover:underline"
                        onClick={() => {
                          const address = encodeURIComponent(`${pub.address}, ${pub.city}, Italia`);
                          window.open(`https://maps.google.com/maps?q=${address}`, '_blank');
                        }}
                      >
                        Apri in Google Maps
                      </button>
                    </div>
                  </div>
                </div>
                
                {pub.phone && (
                  <div className="flex items-center">
                    <Phone className="mr-3 text-primary flex-shrink-0" size={18} />
                    <a href={`tel:${pub.phone}`} className="text-gray-800 font-medium hover:text-primary hover:underline text-base break-all">
                      {pub.phone}
                    </a>
                  </div>
                )}
                
                {pub.websiteUrl && (
                  <div className="flex items-center">
                    <Globe className="mr-3 text-primary flex-shrink-0" size={18} />
                    <a 
                      href={pub.websiteUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-800 font-medium hover:text-primary hover:underline text-base"
                    >
                      Visita il Sito Web
                    </a>
                  </div>
                )}

                {pub.email && (
                  <div className="flex items-center">
                    <span className="mr-3 text-primary flex-shrink-0 text-lg">@</span>
                    <a href={`mailto:${pub.email}`} className="text-gray-800 font-medium hover:text-primary hover:underline text-base break-all">
                      {pub.email}
                    </a>
                  </div>
                )}
                
                {/* Social Media - se presenti */}
                <div className="flex items-center gap-4 pt-2">
                  {pub.facebookUrl && (
                    <a 
                      href={pub.facebookUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Facebook"
                    >
                      <Facebook size={20} />
                    </a>
                  )}
                  {pub.instagramUrl && (
                    <a 
                      href={pub.instagramUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-pink-600 hover:text-pink-800 transition-colors"
                      title="Instagram"
                    >
                      <Instagram size={20} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card>
          <CardContent className="p-3 sm:p-6">
            <Tabs defaultValue="taplist" className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
                <TabsTrigger value="taplist" className="text-xs sm:text-sm px-1 sm:px-3">Tap List</TabsTrigger>
                <TabsTrigger value="bottles" className="text-xs sm:text-sm px-1 sm:px-3">Cantina</TabsTrigger>
                <TabsTrigger value="menu" className="text-xs sm:text-sm px-1 sm:px-3">Menu</TabsTrigger>
                <TabsTrigger value="info" className="text-xs sm:text-sm px-1 sm:px-3">Info</TabsTrigger>
              </TabsList>
              
              <TabsContent value="taplist" className="mt-6">
                {tapLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : (
                  <TapList tapList={tapList || []} />
                )}
              </TabsContent>
              
              <TabsContent value="bottles" className="mt-6">
                {bottlesLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : (
                  <BottleList bottles={bottles || []} />
                )}
              </TabsContent>
              
              <TabsContent value="menu" className="mt-6">
                {menuLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : (
                  <FoodMenu menu={menu || []} />
                )}
              </TabsContent>
              
              <TabsContent value="info" className="mt-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Informazioni Generali</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Indirizzo Completo</p>
                        <p className="font-medium">{pub.address}, {pub.city}</p>
                        {pub.postalCode && <p className="text-sm text-gray-600">{pub.postalCode}</p>}
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500">Regione</p>
                        <p className="font-medium">{pub.region}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-4">Orari di Apertura</h3>
                    {pub.openingHours ? (
                      <OpeningHoursDisplay openingHours={pub.openingHours} />
                    ) : (
                      <p className="text-gray-600">Informazioni sugli orari non disponibili</p>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-4">Contatti</h3>
                    <div className="space-y-2">
                      {pub.phone && (
                        <p><span className="font-medium">Telefono:</span> {pub.phone}</p>
                      )}
                      {pub.email && (
                        <p><span className="font-medium">Email:</span> {pub.email}</p>
                      )}
                      {pub.websiteUrl && (
                        <p>
                          <span className="font-medium">Sito Web:</span>{" "}
                          <a href={pub.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {pub.websiteUrl}
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}



// Component to display opening hours
function OpeningHoursDisplay({ openingHours }: { openingHours: any }) {
  const days = [
    { key: 'monday', label: 'Lunedì' },
    { key: 'tuesday', label: 'Martedì' },
    { key: 'wednesday', label: 'Mercoledì' },
    { key: 'thursday', label: 'Giovedì' },
    { key: 'friday', label: 'Venerdì' },
    { key: 'saturday', label: 'Sabato' },
    { key: 'sunday', label: 'Domenica' },
  ];

  return (
    <div className="space-y-2">
      {days.map((day) => {
        const dayHours = openingHours[day.key];
        return (
          <div key={day.key} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
            <span className="font-medium">{day.label}</span>
            <span className="text-gray-600">
              {dayHours?.isClosed ? (
                <span className="text-red-600">Chiuso</span>
              ) : dayHours?.open && dayHours?.close ? (
                `${dayHours.open} - ${dayHours.close}`
              ) : (
                <span className="text-gray-400">Non definito</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Component to display bottle list
function BottleList({ bottles }: { bottles: any[] }) {
  if (!bottles || bottles.length === 0) {
    return (
      <div className="text-center py-8">
        <Wine className="mx-auto w-16 h-16 text-gray-300 mb-4" />
        <p className="text-gray-500">Cantina birre non disponibile</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold text-secondary mb-6">Cantina Birre</h3>
      
      {bottles.map((bottle: any) => (
        <Card key={bottle.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {bottle.beer.logoUrl && (
                <img
                  src={bottle.beer.logoUrl}
                  alt={bottle.beer.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div>
                <h4 className="font-semibold text-lg">{bottle.beer.name}</h4>
                <p className="text-gray-600">{bottle.beer.brewery.name}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline">{bottle.beer.style}</Badge>
                  <span className="text-sm text-gray-500">{bottle.beer.abv}% ABV</span>
                  <span className="text-sm text-gray-500">{bottle.bottleSize}</span>
                </div>
                {bottle.description && (
                  <p className="text-sm text-gray-600 mt-1">{bottle.description}</p>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <span className="text-lg font-bold text-primary">€{bottle.priceBottle}</span>
              {bottle.quantity && (
                <p className="text-sm text-gray-500">Disponibili: {bottle.quantity}</p>
              )}
              {!bottle.isActive && (
                <Badge variant="destructive" className="ml-2">Non Disponibile</Badge>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
