import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Trash2, ExternalLink, Star, MapPin } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UserFavoritesSectionProps {
  enrichedFavorites: any[];
}

export default function UserFavoritesSection({ enrichedFavorites }: UserFavoritesSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Group favorites by type
  const favoritesByType = {
    beers: enrichedFavorites.filter(fav => fav.itemType === 'beer'),
    breweries: enrichedFavorites.filter(fav => fav.itemType === 'brewery'),
    pubs: enrichedFavorites.filter(fav => fav.itemType === 'pub')
  };

  // Remove favorite mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: async (favoriteId: number) => {
      return apiRequest(`/api/favorites/${favoriteId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "Preferito rimosso",
        description: "L'elemento è stato rimosso dai tuoi preferiti",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile rimuovere dai preferiti",
        variant: "destructive",
      });
    },
  });

  const handleRemoveFavorite = (favoriteId: number) => {
    removeFavoriteMutation.mutate(favoriteId);
  };

  const renderBeerCard = (fav: any) => (
    <Card key={fav.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-200 dark:from-amber-800 dark:to-orange-900 rounded-lg flex items-center justify-center">
            <span className="text-lg">🍺</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">{fav.itemName}</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Aggiunto il {new Date(fav.createdAt).toLocaleDateString('it-IT')}
            </p>
            <Badge variant="secondary" className="mt-1 text-xs">
              Birra
            </Badge>
          </div>
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => window.open(`/beer/${fav.itemId}`, '_blank')}
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
              onClick={() => handleRemoveFavorite(fav.id)}
              disabled={removeFavoriteMutation.isPending}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderBreweryCard = (fav: any) => (
    <Card key={fav.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-200 dark:from-green-800 dark:to-emerald-900 rounded-lg flex items-center justify-center">
            <span className="text-lg">🏭</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">{fav.itemName}</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Aggiunto il {new Date(fav.createdAt).toLocaleDateString('it-IT')}
            </p>
            <Badge variant="secondary" className="mt-1 text-xs">
              Birrificio
            </Badge>
          </div>
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => window.open(`/brewery/${fav.itemId}`, '_blank')}
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
              onClick={() => handleRemoveFavorite(fav.id)}
              disabled={removeFavoriteMutation.isPending}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderPubCard = (fav: any) => (
    <Card key={fav.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-800 dark:to-indigo-900 rounded-lg flex items-center justify-center">
            <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">{fav.itemName}</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Aggiunto il {new Date(fav.createdAt).toLocaleDateString('it-IT')}
            </p>
            <Badge variant="secondary" className="mt-1 text-xs">
              Pub
            </Badge>
          </div>
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => window.open(`/pub/${fav.itemId}`, '_blank')}
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
              onClick={() => handleRemoveFavorite(fav.id)}
              disabled={removeFavoriteMutation.isPending}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5" />
          I Tuoi Preferiti ({enrichedFavorites.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="beers" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="beers">
              Birre ({favoritesByType.beers.length})
            </TabsTrigger>
            <TabsTrigger value="breweries">
              Birrifici ({favoritesByType.breweries.length})
            </TabsTrigger>
            <TabsTrigger value="pubs">
              Pub ({favoritesByType.pubs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="beers" className="mt-4">
            {favoritesByType.beers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {favoritesByType.beers.map(renderBeerCard)}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-2">Nessuna birra nei preferiti</p>
                <p className="text-sm text-gray-400">Aggiungi le tue birre preferite per trovarle facilmente</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="breweries" className="mt-4">
            {favoritesByType.breweries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {favoritesByType.breweries.map(renderBreweryCard)}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-2">Nessun birrificio nei preferiti</p>
                <p className="text-sm text-gray-400">Salva i birrifici che ti piacciono di più</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pubs" className="mt-4">
            {favoritesByType.pubs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {favoritesByType.pubs.map(renderPubCard)}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-2">Nessun pub nei preferiti</p>
                <p className="text-sm text-gray-400">Aggiungi i pub che vuoi visitare o rivedere</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}