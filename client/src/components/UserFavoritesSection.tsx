import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Beer, Store, Building, X } from "lucide-react";
import { Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UserFavoritesSectionProps {
  favorites: any[];
}

export default function UserFavoritesSection({ favorites }: UserFavoritesSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const removeFavoriteMutation = useMutation({
    mutationFn: async (favoriteId: number) => {
      return apiRequest(`/api/favorites/${favoriteId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "Rimosso dai Favoriti",
        description: "L'elemento è stato rimosso dai tuoi favoriti",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile rimuovere dai favoriti",
        variant: "destructive",
      });
    },
  });

  const getCategoryItems = (type: string) => {
    return favorites.filter(fav => fav.itemType === type);
  };

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'beer': return <Beer className="w-5 h-5" />;
      case 'brewery': return <Building className="w-5 h-5" />;
      case 'pub': return <Store className="w-5 h-5" />;
      default: return <Heart className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (type: string) => {
    switch (type) {
      case 'beer': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'brewery': return 'text-green-600 bg-green-50 border-green-200';
      case 'pub': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRedirectUrl = (item: any) => {
    switch (item.itemType) {
      case 'beer': return `/beer/${item.itemId}`;
      case 'brewery': return `/brewery/${item.itemId}`;
      case 'pub': return `/pub/${item.itemId}`;
      default: return '#';
    }
  };

  const getCategoryTitle = (type: string) => {
    switch (type) {
      case 'beer': return 'Birre';
      case 'brewery': return 'Birrifici';
      case 'pub': return 'Pub';
      default: return 'Altri';
    }
  };

  if (!favorites || favorites.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Non hai ancora aggiunto nessun preferito</p>
          <p className="text-sm text-gray-400 mt-1">
            Inizia esplorando birre, birrifici e pub per creare la tua collezione
          </p>
        </CardContent>
      </Card>
    );
  }

  const categories = ['beer', 'brewery', 'pub'];

  return (
    <div className="space-y-6">
      {categories.map(category => {
        const items = getCategoryItems(category);
        if (items.length === 0) return null;

        return (
          <Card key={category} className={`border-2 ${getCategoryColor(category)}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                {getCategoryIcon(category)}
                {getCategoryTitle(category)}
                <Badge variant="secondary" className="ml-auto">
                  {items.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((favorite: any) => (
                  <div
                    key={favorite.id}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                  >
                    <Link href={getRedirectUrl(favorite)} className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${getCategoryColor(category)}`}>
                          {getCategoryIcon(category)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">
                            {favorite.itemName || `${getCategoryTitle(category)} #${favorite.itemId}`}
                          </div>
                          <div className="text-xs text-gray-500">
                            Aggiunto il {new Date(favorite.createdAt).toLocaleDateString('it-IT')}
                          </div>
                        </div>
                      </div>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.preventDefault();
                        removeFavoriteMutation.mutate(favorite.id);
                      }}
                      disabled={removeFavoriteMutation.isPending}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}