import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Beer, Store, Building, HeartOff } from "lucide-react";
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
    mutationFn: async ({ itemType, itemId }: { itemType: string; itemId: number }) => {
      return apiRequest(`/api/favorites/${itemType}/${itemId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "Rimosso dai preferiti",
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
      case 'beer': return { border: 'border-l-green-500', icon: 'text-green-600 bg-green-100 dark:bg-green-900/20', hover: 'hover:text-green-600' };
      case 'brewery': return { border: 'border-l-amber-500', icon: 'text-amber-600 bg-amber-100 dark:bg-amber-900/20', hover: 'hover:text-amber-600' };
      case 'pub': return { border: 'border-l-blue-500', icon: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20', hover: 'hover:text-blue-600' };
      default: return { border: 'border-l-gray-500', icon: 'text-muted-foreground bg-stone-100 dark:bg-[#0B0D10]/20', hover: 'hover:text-muted-foreground' };
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
      case 'beer': return 'Birre Preferite';
      case 'brewery': return 'Birrifici Preferiti';
      case 'pub': return 'Pub Preferiti';
      default: return 'Altri';
    }
  };

  if (!favorites || favorites.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-stone-100 dark:bg-[#1A1D24] rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart className="h-8 w-8 text-stone-400" />
        </div>
        <h3 className="text-lg font-semibold text-foreground dark:text-white mb-2">Nessun preferito ancora</h3>
        <p className="text-muted-foreground dark:text-stone-400 mb-4">Inizia a esplorare pub, birrifici e birre per aggiungere i tuoi preferiti!</p>
        <div className="flex gap-3 justify-center">
          <Link href="/">
            <Button variant="outline">Esplora</Button>
          </Link>
        </div>
      </div>
    );
  }

  const categories = ['pub', 'brewery', 'beer'];

  return (
    <div className="space-y-8">
      {categories.map(category => {
        const items = getCategoryItems(category);
        if (items.length === 0) return null;
        const colors = getCategoryColor(category);

        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-4">
              <div className={`p-2 rounded-lg ${colors.icon}`}>
                {getCategoryIcon(category)}
              </div>
              <h3 className="text-lg font-semibold text-foreground dark:text-white">{getCategoryTitle(category)}</h3>
              <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((favorite: any) => (
                <Card key={favorite.id} className={`hover:shadow-lg transition-all duration-200 border-l-4 ${colors.border}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Link href={getRedirectUrl(favorite)} className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer">
                        {favorite.itemImageUrl ? (
                          <img loading="lazy" 
                            src={favorite.itemImageUrl} 
                            alt={favorite.itemName || ''} 
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.icon}`}>
                            {getCategoryIcon(category)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-semibold mb-1 truncate transition-colors ${colors.hover}`}>
                            {favorite.itemName || `${getCategoryTitle(category)} #${favorite.itemId}`}
                          </h4>
                          <p className="text-xs text-muted-foreground dark:text-stone-400">
                            Aggiunto il {new Date(favorite.createdAt).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-shrink-0 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => removeFavoriteMutation.mutate({ itemType: favorite.itemType, itemId: favorite.itemId })}
                        disabled={removeFavoriteMutation.isPending}
                        title="Non seguire più"
                      >
                        <HeartOff className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
