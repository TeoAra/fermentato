import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, BeerIcon, Building, Store } from "lucide-react";

interface UserFavoritesSectionProps {
  enrichedFavorites: any[];
}

export default function UserFavoritesSection({ enrichedFavorites }: UserFavoritesSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Remove favorite mutation 
  const removeFavoriteMutation = useMutation({
    mutationFn: async ({ itemType, itemId }: { itemType: string, itemId: number }) => {
      return apiRequest(`/api/favorites/${itemType}/${itemId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "Successo",
        description: "Rimosso dai preferiti",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Non è stato possibile rimuovere dai preferiti",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">I Tuoi Preferiti</h2>
      </div>
      
      <Tabs defaultValue="birre" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="birre">Birre ({enrichedFavorites.filter(f => f.itemType === 'beer').length})</TabsTrigger>
          <TabsTrigger value="birrifici">Birrifici ({enrichedFavorites.filter(f => f.itemType === 'brewery').length})</TabsTrigger>
          <TabsTrigger value="pub">Pub ({enrichedFavorites.filter(f => f.itemType === 'pub').length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="birre" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrichedFavorites.filter(f => f.itemType === 'beer').map((favorite: any) => (
              <Card key={favorite.itemId} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <BeerIcon className="w-5 h-5 text-amber-600" />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {favorite.itemName}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Birra</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFavoriteMutation.mutate({
                        itemType: favorite.itemType,
                        itemId: favorite.itemId
                      })}
                      disabled={removeFavoriteMutation.isPending}
                    >
                      <Heart className="w-4 h-4 fill-current text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {enrichedFavorites.filter(f => f.itemType === 'beer').length === 0 && (
            <div className="text-center py-8 text-gray-500">Nessuna birra preferita</div>
          )}
        </TabsContent>
        
        <TabsContent value="birrifici" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrichedFavorites.filter(f => f.itemType === 'brewery').map((favorite: any) => (
              <Card key={favorite.itemId} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Building className="w-5 h-5 text-green-600" />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {favorite.itemName}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Birrificio</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFavoriteMutation.mutate({
                        itemType: favorite.itemType,
                        itemId: favorite.itemId
                      })}
                      disabled={removeFavoriteMutation.isPending}
                    >
                      <Heart className="w-4 h-4 fill-current text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {enrichedFavorites.filter(f => f.itemType === 'brewery').length === 0 && (
            <div className="text-center py-8 text-gray-500">Nessun birrificio preferito</div>
          )}
        </TabsContent>
        
        <TabsContent value="pub" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrichedFavorites.filter(f => f.itemType === 'pub').map((favorite: any) => (
              <Card key={favorite.itemId} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Store className="w-5 h-5 text-blue-600" />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {favorite.itemName}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Pub</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFavoriteMutation.mutate({
                        itemType: favorite.itemType,
                        itemId: favorite.itemId
                      })}
                      disabled={removeFavoriteMutation.isPending}
                    >
                      <Heart className="w-4 h-4 fill-current text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {enrichedFavorites.filter(f => f.itemType === 'pub').length === 0 && (
            <div className="text-center py-8 text-gray-500">Nessun pub preferito</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}