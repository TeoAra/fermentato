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
      <div className="group neu-card rounded-2xl overflow-hidden cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200">

        {/* Cover / logo strip */}
        <div className="relative h-28 overflow-hidden">
          {coverBg ? (
            <img
              src={coverBg}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 lightbox-img"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-stone-800 via-stone-700 to-stone-900 flex items-center justify-center">
              <span className="text-5xl font-black text-white/20 display-serif">{initial}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

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
            <div className="absolute bottom-2 left-3 flex items-center gap-1 text-white text-[11px] font-medium">
              <MapPin className="w-3 h-3 text-stone-300 flex-shrink-0" />
              <span className="truncate max-w-[160px] drop-shadow-sm text-white/90">{locationStr}</span>
              {distance != null && (
                <span className="ml-1 font-bold text-teal-300">
                  {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3.5 flex items-center gap-3">
          {/* Logo circle */}
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-stone-50 dark:bg-stone-900/20 shadow-sm border-2 border-white dark:border-stone-700/40">
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
            <h3 className="display-serif font-bold text-[15px] text-foreground truncate group-hover:text-primary transition-colors leading-snug">
              {name}
            </h3>
            {beerCount > 0 && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border border-teal-100 dark:border-teal-800/30">
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
