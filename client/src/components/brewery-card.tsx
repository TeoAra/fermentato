import { MapPin, Beer, Heart, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ImageWithFallback from "@/components/image-with-fallback";

interface BreweryCardProps {
  brewery: {
    id: number;
    name: string | any;
    location: string | any;
    region: string | any;
    rating: string | number | null;
    logoUrl?: string | null;
    coverImageUrl?: string | null;
    country?: string | null;
  };
  beerCount?: number;
  distance?: number | null;
}

export default function BreweryCard({ brewery, beerCount = 0, distance }: BreweryCardProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  const isBreweryFavorited = Array.isArray(favorites) && favorites.some((fav: any) =>
    fav.itemType === 'brewery' && fav.itemId === brewery.id
  );

  const favoriteMutation = useMutation({
    mutationFn: async ({ action }: { action: 'add' | 'remove' }) => {
      if (action === 'add') {
        return apiRequest('/api/favorites', { method: 'POST' }, { itemType: 'brewery', itemId: brewery.id });
      } else {
        return apiRequest(`/api/favorites/brewery/${brewery.id}`, { method: 'DELETE' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({ title: isBreweryFavorited ? "Rimosso dai preferiti" : "Aggiunto ai preferiti" });
    },
    onError: () => {
      toast({ title: "Errore", description: "Non è stato possibile aggiornare i preferiti", variant: "destructive" });
    },
  });

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast({ title: "Accesso richiesto", description: "Effettua l'accesso per aggiungere ai preferiti", variant: "destructive" });
      return;
    }
    favoriteMutation.mutate({ action: isBreweryFavorited ? 'remove' : 'add' });
  };

  const handlePrefetch = () => {
    queryClient.prefetchQuery({ queryKey: ["/api/breweries", brewery.id], staleTime: 30000 });
  };

  const name = typeof brewery.name === 'string' ? brewery.name : brewery.name?.toString() || 'Birrificio';
  const location = typeof brewery.location === 'string' ? brewery.location : brewery.location?.name || '';
  const region = typeof brewery.region === 'string' ? brewery.region : brewery.region?.name || '';
  const locationStr = distance != null ? location : [location, region].filter(Boolean).join(', ');
  const initial = name[0]?.toUpperCase() ?? 'B';
  const coverBg = brewery.coverImageUrl || brewery.logoUrl;

  return (
    <Link href={`/brewery/${brewery.id}`} onMouseEnter={handlePrefetch} onTouchStart={handlePrefetch}>
      <div className="group bg-white dark:bg-[hsl(25,14%,10%)] rounded-2xl border border-orange-50 dark:border-[hsl(25,12%,16%)] shadow-sm overflow-hidden cursor-pointer hover:shadow-[0_8px_28px_rgba(247,113,4,0.13)] hover:-translate-y-0.5 transition-all duration-250">
        
        {/* Cover / logo strip */}
        <div className="relative h-28 overflow-hidden">
          {coverBg ? (
            <img src={coverBg} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[hsl(24,93%,49%)] via-[hsl(22,92%,46%)] to-[hsl(20,95%,42%)] flex items-center justify-center">
              <span className="text-4xl font-black text-white/80">{initial}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* Favorite button */}
          <button
            className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center transition-all ${
              isBreweryFavorited ? 'bg-red-500 text-white' : 'bg-black/30 text-white hover:bg-red-500'
            }`}
            onClick={handleFavoriteToggle}
            disabled={favoriteMutation.isPending}
          >
            <Heart className={`w-4 h-4 ${isBreweryFavorited ? 'fill-current' : ''}`} />
          </button>

          {/* Location overlay */}
          {locationStr && (
            <div className="absolute bottom-2 left-3 flex items-center gap-1 text-white text-[11px] font-semibold">
              <MapPin className="w-3 h-3 text-orange-300 flex-shrink-0" />
              <span className="truncate max-w-[160px] drop-shadow-sm">{locationStr}</span>
              {distance != null && (
                <span className="ml-1 font-bold text-orange-300">
                  {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3.5 flex items-center gap-3">
          {/* Logo circle */}
          <div className="w-12 h-12 rounded-xl border border-orange-50 dark:border-[hsl(25,12%,20%)] overflow-hidden flex-shrink-0 bg-orange-50 dark:bg-orange-950/20 shadow-sm">
            <ImageWithFallback
              src={brewery.logoUrl}
              alt={`Logo ${name}`}
              imageType="brewery"
              containerClassName="w-12 h-12"
              className="w-12 h-12 object-contain"
              iconSize="md"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[14px] text-foreground truncate group-hover:text-primary transition-colors leading-snug">
              {name}
            </h3>
            {beerCount > 0 && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 dark:bg-orange-950/30 text-primary dark:text-orange-400 border border-orange-100 dark:border-orange-900/30">
                <Beer className="w-2.5 h-2.5" />
                {beerCount} birre
              </span>
            )}
          </div>

          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
        </div>
      </div>
    </Link>
  );
}
