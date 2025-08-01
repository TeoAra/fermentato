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

        {/* Tabs for different sections */}
        <div className="mb-6">
          <Tabs defaultValue="taplist" className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-3 mb-6">
              <TabsTrigger value="taplist" className="text-xs sm:text-sm">
                <Wine className="mr-1 sm:mr-2" size={16} />
                Spine
              </TabsTrigger>
              <TabsTrigger value="menu" className="text-xs sm:text-sm">
                <span className="mr-1 sm:mr-2">🍽️</span>
                Menu
              </TabsTrigger>
              <TabsTrigger value="bottles" className="text-xs sm:text-sm">
                <span className="mr-1 sm:mr-2">🍺</span>
                Cantina
              </TabsTrigger>
            </TabsList>

            <TabsContent value="taplist">
              <TapList 
                tapList={tapList || []} 
                isLoading={tapLoading}
                showOwnerControls={false}
              />
            </TabsContent>

            <TabsContent value="menu">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-center text-secondary">
                    🍽️ Menu
                  </h3>
                  {menuLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-6 bg-gray-300 rounded mb-2"></div>
                          <div className="h-4 bg-gray-300 rounded mb-4"></div>
                        </div>
                      ))}
                    </div>
                  ) : Array.isArray(menu) && menu.length > 0 ? (
                    <div className="space-y-6">
                      {menu.filter((category: any) => category.isVisible !== false).map((category: any) => (
                        <div key={category.id} className="border rounded-lg p-4">
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">{category.name}</h4>
                          {category.description && (
                            <p className="text-gray-600 mb-4">{category.description}</p>
                          )}
                          {category.items && category.items.length > 0 && (
                            <div className="space-y-3">
                              {category.items.map((item: any) => (
                                <div key={item.id} className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <h5 className="font-medium text-gray-900">{item.name}</h5>
                                    {item.description && (
                                      <p className="text-sm text-gray-600">{item.description}</p>
                                    )}
                                  </div>
                                  {item.price && (
                                    <span className="font-semibold text-primary">€{Number(item.price).toFixed(2)}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 sm:py-12">
                      <div className="text-gray-400 mb-4 text-4xl">🍽️</div>
                      <p className="text-gray-500 text-base sm:text-lg">Menu non ancora disponibile</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bottles">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-center text-secondary">
                    🍺 Cantina Birre
                  </h3>
                  {bottlesLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse flex items-center space-x-4 p-4 border rounded-lg">
                          <div className="w-12 h-12 bg-gray-300 rounded"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : Array.isArray(bottles) && bottles.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      {bottles.map((bottle: any) => (
                        <div key={bottle.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start space-x-4">
                            <img
                              src={bottle.beer?.imageUrl || "https://images.unsplash.com/photo-1608667508764-33cf0db3f6a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80"}
                              alt={bottle.beer?.name}
                              className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 mb-1 break-words">
                                {bottle.beer?.name || 'Nome non disponibile'}
                              </h4>
                              <p className="text-sm text-gray-600 mb-2 break-words">
                                {bottle.beer?.brewery?.name || bottle.beer?.breweryName || 'Birrificio non disponibile'}
                              </p>
                              
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {bottle.beer?.style}
                                </Badge>
                                {bottle.beer?.abv && (
                                  <Badge variant="outline" className="text-xs">
                                    {bottle.beer?.abv}% ABV
                                  </Badge>
                                )}
                              </div>
                              
                              {bottle.prices && bottle.prices.length > 0 && (
                                <div className="space-y-1">
                                  {bottle.prices.map((price: any, index: number) => (
                                    <div key={index} className="flex justify-between items-center text-sm">
                                      <span className="text-gray-600">
                                        {typeof price === 'object' ? (price as any).size : price} {typeof price === 'object' && (price as any).format && `(${(price as any).format})`}
                                      </span>
                                      <span className="font-semibold text-primary">
                                        €{typeof price === 'object' ? Number((price as any).price).toFixed(2) : Number(price).toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {bottle.description && (
                                <p className="text-xs text-gray-500 mt-2 break-words">
                                  {bottle.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 sm:py-12">
                      <Wine className="mx-auto text-gray-400 mb-4" size={48} />
                      <p className="text-gray-500 text-base sm:text-lg">Nessuna birra disponibile in cantina al momento</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}