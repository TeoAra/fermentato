import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Star, MapPin, Beer as BeerIcon, Thermometer, Eye, Droplets, Wheat, Building } from "lucide-react";
import Footer from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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
  
  const { data: beer, isLoading: beerLoading } = useQuery<Beer>({
    queryKey: ["/api/beers", id],
    enabled: !!id,
  });

  const { data: availability, isLoading: availabilityLoading } = useQuery<BeerAvailability>({
    queryKey: ["/api/beers", id, "availability"],
    enabled: !!id,
  });

  if (beerLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-64 bg-gray-300 rounded-xl mb-8"></div>
            <div className="h-8 bg-gray-300 rounded mb-4"></div>
            <div className="h-4 bg-gray-300 rounded mb-8"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!beer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Birra non trovata</h1>
            <p className="text-gray-600">La birra che stai cercando non esiste o è stata rimossa.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Beer Header */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
              <div className="flex-shrink-0">
                <img
                  src={beer.bottleImageUrl || beer.imageUrl || beer.logoUrl || "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200&h=200&fit=crop"}
                  alt={`${beer.name} bottle`}
                  className="w-32 h-48 object-cover rounded-lg shadow-lg"
                />
              </div>
              
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-4xl font-bold text-secondary mb-2">{beer.name}</h1>
                    
                    {beer.brewery && (
                      <Link href={`/brewery/${beer.brewery.id}`}>
                        <div className="flex items-center text-xl text-primary hover:text-orange-600 transition-colors cursor-pointer mb-6">
                          <Building className="mr-2" size={20} />
                          {beer.brewery.name}
                          <span className="text-gray-500 ml-2">• {beer.brewery.location}, {beer.brewery.region}</span>
                        </div>
                      </Link>
                    )}
                  </div>
                </div>

                {beer.description && (
                  <p className="text-gray-600 text-lg leading-relaxed mb-6">{beer.description}</p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <Droplets className="mx-auto text-blue-500 mb-2" size={24} />
                    <div className="text-sm text-gray-500">Gradazione</div>
                    <div className="font-semibold">{beer.abv}%</div>
                  </div>
                  
                  {beer.ibu && (
                    <div className="text-center">
                      <Wheat className="mx-auto text-yellow-600 mb-2" size={24} />
                      <div className="text-sm text-gray-500">Amaro</div>
                      <div className="font-semibold">{beer.ibu} IBU</div>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <BeerIcon className="mx-auto text-orange-500 mb-2" size={24} />
                    <div className="text-sm text-gray-500">Stile</div>
                    <div className="font-semibold">{beer.style}</div>
                  </div>
                  
                  {beer.color && (
                    <div className="text-center">
                      <Eye className="mx-auto text-amber-600 mb-2" size={24} />
                      <div className="text-sm text-gray-500">Colore</div>
                      <div className="font-semibold">{beer.color}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Where to Find This Beer */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-secondary mb-6">Dove Trovare Questa Birra</h2>
            
            {availabilityLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            ) : availability && (availability.tapLocations.length > 0 || availability.bottleLocations.length > 0) ? (
              <div className="space-y-6">
                {/* Tap Locations */}
                {availability.tapLocations.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-orange-600 mb-3 flex items-center">
                      <BeerIcon className="mr-2" size={20} />
                      Alla Spina ({availability.tapLocations.length} pub)
                    </h3>
                    <div className="space-y-3">
                      {availability.tapLocations.map((location, index) => (
                        <Link key={`tap-${index}`} href={`/pub/${location.pub.id}`}>
                          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-orange-50 transition-colors cursor-pointer">
                            <div className="flex items-center space-x-4">
                              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                              <div>
                                <h4 className="font-semibold text-lg">{location.pub.name}</h4>
                                <p className="text-gray-600 flex items-center">
                                  <MapPin className="mr-1" size={16} />
                                  {location.pub.address}, {location.pub.city}
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <Badge variant="default" className="bg-orange-100 text-orange-800">
                                Alla Spina
                              </Badge>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottle Locations */}
                {availability.bottleLocations.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-green-600 mb-3 flex items-center">
                      <Droplets className="mr-2" size={20} />
                      In Bottiglia ({availability.bottleLocations.length} pub)
                    </h3>
                    <div className="space-y-3">
                      {availability.bottleLocations.map((location, index) => (
                        <Link key={`bottle-${index}`} href={`/pub/${location.pub.id}`}>
                          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-green-50 transition-colors cursor-pointer">
                            <div className="flex items-center space-x-4">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <div>
                                <h4 className="font-semibold text-lg">{location.pub.name}</h4>
                                <p className="text-gray-600 flex items-center">
                                  <MapPin className="mr-1" size={16} />
                                  {location.pub.address}, {location.pub.city}
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                Bottiglia
                              </Badge>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <BeerIcon className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-500 text-lg">
                  Questa birra non è attualmente disponibile in nessun pub
                </p>
                <p className="text-gray-400 mt-2">
                  Controlla più tardi o contatta direttamente il birrificio
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Brewery Info */}
        {beer.brewery && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-secondary mb-6">Il Birrificio</h2>
              
              <Link href={`/brewery/${beer.brewery.id}`}>
                <div className="flex items-center space-x-6 p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <img
                    src={beer.brewery.logoUrl || "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=80&h=80&fit=crop"}
                    alt={`${beer.brewery.name} logo`}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-secondary">{beer.brewery.name}</h3>
                    <p className="text-gray-600 flex items-center mt-1">
                      <MapPin className="mr-1" size={16} />
                      {beer.brewery.location}, {beer.brewery.region}
                    </p>
                  </div>
                  
                  <Button variant="outline">
                    Visita Birrificio
                  </Button>
                </div>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}