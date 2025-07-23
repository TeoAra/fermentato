import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Star, MapPin, Beer, Globe } from "lucide-react";
import Footer from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function BreweryDetail() {
  const { id } = useParams();
  
  const { data: brewery, isLoading: breweryLoading } = useQuery({
    queryKey: ["/api/breweries", id],
    enabled: !!id,
  });

  const { data: beers = [], isLoading: beersLoading } = useQuery({
    queryKey: ["/api/breweries", id, "beers"],
    enabled: !!id,
  });

  if (breweryLoading) {
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

  if (!brewery) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Birrificio non trovato</h1>
            <p className="text-gray-600">Il birrificio che stai cercando non esiste o è stato rimosso.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Brewery Header */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
              <img
                src={brewery?.logoUrl || "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200"}
                alt={`Logo ${brewery?.name}`}
                className="w-32 h-32 rounded-full object-cover"
              />
              
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-secondary mb-2">{brewery?.name}</h1>
                
                <p className="text-lg text-gray-600 mb-4 flex items-center">
                  <MapPin className="mr-2" size={20} />
                  {brewery?.location}, {brewery?.region}
                </p>
                
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center">
                    <Star className="text-yellow-400 mr-1" size={20} />
                    <span className="font-semibold">{brewery?.rating || "N/A"}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <Beer className="text-primary mr-1" size={20} />
                    <span className="text-gray-600">{beers.length || 0} birre</span>
                  </div>
                </div>

                {brewery?.description && (
                  <p className="text-gray-600 mb-4">{brewery.description}</p>
                )}



              </div>
            </div>
          </CardContent>
        </Card>

        {/* Beer Portfolio */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-secondary mb-6">Portfolio Birre</h2>
            
            {beersLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            ) : beers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {beers.map((beer: any) => (
                  <Link key={beer.id} href={`/beer/${beer.id}`}>
                    <Card className="hover:shadow-md transition-all hover:scale-105 cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-4">
                          <img
                            src={beer.imageUrl || beer.bottleImageUrl || beer.logoUrl || "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=80&h=120&fit=crop"}
                            alt={`${beer.name} bottle`}
                            className="w-16 h-24 rounded object-cover shadow-sm"
                          />
                          
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-secondary mb-1 hover:text-primary transition-colors">
                              {beer.name}
                            </h3>
                            
                            <div className="flex flex-wrap gap-2 mb-2">
                              <Badge variant="outline">{beer.style}</Badge>
                              {beer.abv && (
                                <Badge variant="outline">{beer.abv}% ABV</Badge>
                              )}
                              {beer.ibu && (
                                <Badge variant="outline">{beer.ibu} IBU</Badge>
                              )}
                            </div>
                          
                            {beer.description && (
                              <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                                {beer.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Beer className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-500">Nessuna birra disponibile per questo birrificio</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Map Section (Placeholder) */}
        {brewery?.latitude && brewery?.longitude && (
          <Card className="mt-8">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-secondary mb-6">Posizione</h2>
              <div className="bg-gray-200 h-64 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Mappa non disponibile</p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
