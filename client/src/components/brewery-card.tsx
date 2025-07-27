import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Beer, Heart } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface BreweryCardProps {
  brewery: {
    id: number;
    name: string | any;
    location: string | any;
    region: string | any;
    rating: string | number | null;
    logoUrl?: string | null;
  };
  beerCount?: number;
}

export default function BreweryCard({ brewery, beerCount = 0 }: BreweryCardProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if brewery is favorited
  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  const isBreweryFavorited = Array.isArray(favorites) && favorites.some((fav: any) => 
    fav.itemType === 'brewery' && fav.itemId === brewery.id
  );

  // Favorite mutation
  const favoriteMutation = useMutation({
    mutationFn: async ({ action }: { action: 'add' | 'remove' }) => {
      if (action === 'add') {
        return apiRequest('/api/favorites', 'POST', { itemType: 'brewery', itemId: brewery.id });
      } else {
        return apiRequest(`/api/favorites/brewery/${brewery.id}`, 'DELETE');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "Successo",
        description: isBreweryFavorited ? "Rimosso dai favoriti" : "Aggiunto ai favoriti",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Non è stato possibile aggiornare i favoriti",
        variant: "destructive",
      });
    },
  });

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast({
        title: "Accesso richiesto",
        description: "Effettua l'accesso per aggiungere ai favoriti",
        variant: "destructive",
      });
      return;
    }

    favoriteMutation.mutate({
      action: isBreweryFavorited ? 'remove' : 'add'
    });
  };

  return (
    <Link href={`/brewery/${brewery.id}`}>
      <Card className="overflow-hidden hover:shadow-md transition-all duration-200 border border-gray-100 cursor-pointer group relative">
        <CardContent className="p-4">
          {/* Mobile-First Layout */}
          <div className="flex items-center gap-4">
            
            {/* Brewery Logo */}
            <div className="relative flex-shrink-0">
              <img
                src={brewery.logoUrl || "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"}
                alt={`Logo ${brewery.name}`}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover shadow-sm group-hover:shadow-md transition-shadow"
              />
            </div>
            
            {/* Brewery Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base sm:text-lg text-gray-900 group-hover:text-primary transition-colors truncate mb-1">
                {typeof brewery.name === 'string' ? brewery.name : brewery.name?.toString() || 'Birrificio'}
              </h3>
              
              <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">
                  {typeof brewery.location === 'string' ? brewery.location : brewery.location?.name || 'Località'}, {typeof brewery.region === 'string' ? brewery.region : brewery.region?.name || 'Regione'}
                </span>
              </div>
              
              {/* Tags Row */}
              <div className="flex flex-wrap gap-1 items-center">
                <Badge variant="outline" className="text-xs px-2 py-0.5 h-auto">
                  <Beer className="w-3 h-3 mr-1" />
                  {beerCount} birre
                </Badge>
                
                {/* Rating Badge */}
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span className="text-xs text-gray-600 font-medium">
                    {typeof brewery.rating === 'string' || typeof brewery.rating === 'number' ? Number(brewery.rating).toFixed(1) : "N/A"}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Favorite Button */}
            <div className="flex-shrink-0 flex flex-col gap-2">
              {isAuthenticated && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 ${isBreweryFavorited ? 'text-red-600 hover:text-red-700' : 'text-gray-400 hover:text-red-600'}`}
                  onClick={handleFavoriteToggle}
                  disabled={favoriteMutation.isPending}
                >
                  <Heart className={`w-4 h-4 ${isBreweryFavorited ? 'fill-current' : ''}`} />
                </Button>
              )}
              
              {/* Indicator Arrow */}
              <div className="text-gray-400 group-hover:text-primary transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}