import { Heart, Beer, MapPin, Star } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ImageWithFallback from "@/components/image-with-fallback";

function isOpenNow(openingHours: any) {
  if (!openingHours) return false;
  const now = new Date();
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const todayHours = openingHours[currentDay];
  if (!todayHours || todayHours.isClosed) return false;
  if (todayHours.open && todayHours.close) {
    const [openHour, openMin] = todayHours.open.split(':').map(Number);
    const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    if (closeTime < openTime) return currentTime >= openTime || currentTime <= closeTime;
    return currentTime >= openTime && currentTime <= closeTime;
  }
  return true;
}

interface PubCardProps {
  pub: {
    id: number;
    name: string;
    address: string;
    city: string;
    rating: string | null;
    coverImageUrl?: string | null;
    logoUrl?: string | null;
    isActive: boolean;
    openingHours?: any;
  };
  distance?: number | null;
}

export default function PubCard({ pub, distance }: PubCardProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tapList } = useQuery({
    queryKey: ["/api/pubs", pub.id, "taplist"],
  });

  const { data: favoritesCountData } = useQuery({
    queryKey: ["/api/favorites", "pub", pub.id, "count"],
  });

  const { data: isFavoriteData } = useQuery<{ isFavorite: boolean }>({
    queryKey: ["/api/favorites", "pub", pub.id, "check"],
    enabled: isAuthenticated,
  });

  const beersOnTap = Array.isArray(tapList) ? tapList.filter(item => item.isActive).length : 0;
  const isFavorite = isFavoriteData?.isFavorite || false;
  const favoritesCount = (favoritesCountData as any)?.count || 0;
  const open = isOpenNow(pub.openingHours);
  const rating = pub.rating ? parseFloat(pub.rating) : null;

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorite) {
        return apiRequest(`/api/favorites/pub/${pub.id}`, { method: "DELETE" });
      } else {
        return apiRequest("/api/favorites", { method: "POST" }, { itemType: "pub", itemId: pub.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", "pub", pub.id, "check"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", "pub", pub.id, "count"] });
      toast({ title: isFavorite ? "Rimosso dai preferiti" : "Aggiunto ai preferiti" });
    },
    onError: (err: any) => {
      if (err?.status === 401 || err?.message?.includes("401") || err?.message?.includes("autenticato")) {
        toast({ title: "Accedi per salvare", description: "Effettua il login per gestire i preferiti." });
      } else {
        toast({ title: "Errore", description: "Impossibile aggiornare i preferiti", variant: "destructive" });
      }
    },
  });

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast({ title: "Accesso richiesto", description: "Effettua l'accesso per aggiungere ai preferiti", variant: "destructive" });
      return;
    }
    toggleFavoriteMutation.mutate();
  };

  const handlePrefetch = () => {
    const pubId = (pub as any).slug || String(pub.id);
    queryClient.prefetchQuery({ queryKey: ["/api/pubs", pubId], staleTime: 30000 });
    queryClient.prefetchQuery({ queryKey: ["/api/pubs", pub.id, "taplist"], staleTime: 30000 });
  };

  return (
    <Link href={`/pub/${(pub as any).slug || pub.id}`} onMouseEnter={handlePrefetch} onTouchStart={handlePrefetch}>
      <div className="group neu-card rounded-2xl overflow-hidden cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200">
        {/* Cover image */}
        <div className="relative">
          <ImageWithFallback
            src={pub.coverImageUrl}
            alt={`${pub.name} - Copertina`}
            imageType="pub"
            containerClassName="w-full h-44"
            className="w-full h-44 object-cover group-hover:scale-[1.02] transition-transform duration-300 lightbox-img"
            iconSize="xl"
          />
          {!pub.isActive && (
            <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
              <span className="text-white font-semibold text-sm tracking-wide">Temporaneamente Chiuso</span>
            </div>
          )}
          {/* Open/closed pill */}
          <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-sm ${
            open
              ? 'bg-emerald-500/90 text-white'
              : 'bg-black/50 text-white/80'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-white animate-pulse' : 'bg-white/40'}`} />
            {open ? 'Aperto' : 'Chiuso'}
          </div>
          {/* Favorite */}
          <button
            className={`absolute top-3 right-3 w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center transition-all ${
              isFavorite ? 'bg-red-500 text-white' : 'bg-black/30 text-white hover:bg-red-500'
            }`}
            onClick={handleFavoriteClick}
            disabled={toggleFavoriteMutation.isPending}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Name + rating row */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="display-serif text-[16px] font-bold text-foreground truncate leading-snug group-hover:text-primary transition-colors">{pub.name}</h3>
            {rating && (
              <div className="flex items-center gap-0.5 flex-shrink-0 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full border border-amber-100 dark:border-amber-800/30">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span className="text-[12px] font-bold text-amber-700 dark:text-amber-400">{rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Location */}
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
            <MapPin className="w-3 h-3 text-stone-400 flex-shrink-0" />
            <span className="truncate">
              {distance != null ? pub.city : `${pub.city || pub.address}`}
            </span>
            {distance != null && (
              <span className="ml-1 text-[11px] font-bold text-teal-600 dark:text-teal-400 whitespace-nowrap flex-shrink-0">
                {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
              </span>
            )}
          </p>

          {/* Info pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {beersOnTap > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border border-teal-100 dark:border-teal-800/30">
                <Beer className="w-3 h-3" />
                {beersOnTap} alla spina
              </span>
            )}
            {favoritesCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900/20">
                <Heart className="w-2.5 h-2.5 fill-current" />
                {favoritesCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
