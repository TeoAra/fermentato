import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Star, MapPin, Clock, Phone, Globe } from "lucide-react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import TapList from "@/components/tap-list";
import FoodMenu from "@/components/food-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  if (pubLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
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
        <Header />
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
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Pub Header */}
        <Card className="mb-8 overflow-hidden">
          <div className="relative">
            <img
              src={pub.imageUrl || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400"}
              alt={`${pub.name} - Interno`}
              className="w-full h-64 md:h-80 object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-40"></div>
            <div className="absolute bottom-4 left-4 text-white">
              <div className="flex items-center space-x-2 mb-2">
                <h1 className="text-3xl font-bold">{pub.name}</h1>
                {!pub.isActive && (
                  <Badge variant="destructive">Temporaneamente Chiuso</Badge>
                )}
              </div>
              <p className="text-lg flex items-center">
                <MapPin className="mr-2" size={20} />
                {pub.address}, {pub.city}
              </p>
            </div>
          </div>

          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                {pub.description && (
                  <p className="text-gray-600 mb-4">{pub.description}</p>
                )}
                
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center">
                    <Star className="text-yellow-400 mr-1" size={20} />
                    <span className="font-semibold">{pub.rating || "N/A"}</span>
                    <span className="text-gray-500 ml-1">recensioni</span>
                  </div>
                  
                  <div className="flex items-center text-green-600">
                    <Clock className="mr-1" size={16} />
                    <span className="text-sm">Aperto ora</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {pub.phone && (
                  <div className="flex items-center">
                    <Phone className="mr-2 text-gray-500" size={16} />
                    <a href={`tel:${pub.phone}`} className="text-primary hover:underline">
                      {pub.phone}
                    </a>
                  </div>
                )}
                
                {pub.websiteUrl && (
                  <div className="flex items-center">
                    <Globe className="mr-2 text-gray-500" size={16} />
                    <a 
                      href={pub.websiteUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Sito Web
                    </a>
                  </div>
                )}

                {pub.email && (
                  <div className="flex items-center">
                    <span className="mr-2 text-gray-500">@</span>
                    <a href={`mailto:${pub.email}`} className="text-primary hover:underline">
                      {pub.email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="taplist" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="taplist">Tap List</TabsTrigger>
                <TabsTrigger value="menu">Menu Cibo</TabsTrigger>
                <TabsTrigger value="info">Informazioni</TabsTrigger>
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

                  {pub.openingHours && (
                    <div>
                      <h3 className="text-xl font-semibold mb-4">Orari di Apertura</h3>
                      <p className="text-gray-600">Informazioni sugli orari non disponibili</p>
                    </div>
                  )}

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
