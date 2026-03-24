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
  const day = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const mins = now.getHours() * 60 + now.getMinutes();
  const today = openingHours[day];
  if (!today || today.isClosed) return false;
  if (today.open && today.close) {
    const [oh, om] = today.open.split(':').map(Number);
    const [ch, cm] = today.close.split(':').map(Number);
    const o = oh * 60 + om, c = ch * 60 + cm;
    return c < o ? (mins >= o || mins <= c) : (mins >= o && mins <= c);
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

  const { data: tapList } = useQuery({ queryKey: ["/api/pubs", pub.id, "taplist"] });
  const { data: favoritesCountData } = useQuery({ queryKey: ["/api/favorites", "pub", pub.id, "count"] });
  const { data: isFavoriteData } = useQuery<{ isFavorite: boolean }>({
    queryKey: ["/api/favorites", "pub", pub.id, "check"],
    enabled: isAuthenticated,
  });

  const beersOnTap = Array.isArray(tapList) ? tapList.filter((i: any) => i.isActive).length : 0;
  const isFavorite = isFavoriteData?.isFavorite || false;
  const favoritesCount = (favoritesCountData as any)?.count || 0;
  const rating = pub.rating ? parseFloat(pub.rating) : null;

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorite) return apiRequest(`/api/favorites/pub/${pub.id}`, { method: "DELETE" });
      return apiRequest("/api/favorites", { method: "POST" }, { itemType: "pub", itemId: pub.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", "pub", pub.id, "check"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", "pub", pub.id, "count"] });
      toast({ title: isFavorite ? "Rimosso dai preferiti" : "Aggiunto ai preferiti" });
    },
    onError: (err: any) => {
      if (err?.status === 401 || err?.message?.includes("401")) {
        toast({ title: "Accedi per salvare", description: "Effettua il login per gestire i preferiti." });
      } else {
        toast({ title: "Errore", description: "Impossibile aggiornare i preferiti", variant: "destructive" });
      }
    },
  });

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!isAuthenticated) {
      toast({ title: "Accesso richiesto", description: "Effettua l'accesso per aggiungere ai preferiti", variant: "destructive" });
      return;
    }
    toggleFavoriteMutation.mutate();
  };

  const open = isOpenNow(pub.openingHours);

  const handlePrefetch = () => {
    const id = (pub as any).slug || String(pub.id);
    queryClient.prefetchQuery({ queryKey: ["/api/pubs", id], staleTime: 30 * 1000 });
    queryClient.prefetchQuery({ queryKey: ["/api/pubs", pub.id, "taplist"], staleTime: 30 * 1000 });
  };

  return (
    <Link href={`/pub/${(pub as any).slug || pub.id}`} onMouseEnter={handlePrefetch} onTouchStart={handlePrefetch}>
      <div className="group bg-white dark:bg-[hsl(25,12%,11%)] border border-[hsl(36,14%,88%)] dark:border-[hsl(25,12%,17%)] rounded-2xl overflow-hidden cursor-pointer hover:shadow-[0_8px_24px_hsla(28,25%,8%,0.12)] dark:hover:shadow-[0_8px_24px_hsla(0,0%,0%,0.40)] hover:-translate-y-0.5 transition-all duration-250">

        {/* Image */}
        <div className="relative">
          <ImageWithFallback
            src={pub.coverImageUrl}
            alt={`${pub.name}`}
            imageType="pub"
            containerClassName="w-full h-48"
            className="w-full h-48 object-cover group-hover:scale-[1.02] transition-transform duration-300"
            iconSize="xl"
          />
          {!pub.isActive && (
            <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
              <span className="text-white font-semibold text-sm tracking-wide">Temporaneamente Chiuso</span>
            </div>
          )}

          {/* Open/closed pill */}
          <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-sm shadow-sm ${
            open ? 'bg-emerald-500/90 text-white' : 'bg-black/55 text-white/80'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${open ? 'bg-white' : 'bg-white/50'}`} />
            {open ? 'Aperto' : 'Chiuso'}
          </div>

          {/* Rating pill */}
          {rating !== null && (
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[12px] font-bold px-2 py-1 rounded-full shadow-sm">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {rating.toFixed(1)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-[15px] font-bold text-[hsl(28,18%,13%)] dark:text-[hsl(40,12%,92%)] leading-snug line-clamp-1">
              {pub.name}
            </h3>
            <button
              className={`flex-shrink-0 flex items-center gap-1 p-1 rounded-lg transition-colors ${
                isFavorite ? 'text-red-500' : 'text-gray-300 dark:text-neutral-600 hover:text-red-400'
              }`}
              onClick={handleFavoriteClick}
              disabled={toggleFavoriteMutation.isPending}
              data-testid={`button-favorite-pub-${pub.id}`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              {favoritesCount > 0 && (
                <span className="text-[10px] font-semibold text-gray-500 dark:text-neutral-500">{favoritesCount}</span>
              )}
            </button>
          </div>

          <p className="text-[13px] text-gray-500 dark:text-neutral-400 flex items-center gap-1 mb-3">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
            <span className="truncate">
              {distance != null ? pub.city : `${pub.address}, ${pub.city}`}
            </span>
            {distance != null && (
              <span className="ml-1.5 font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap text-[12px]">
                {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
              </span>
            )}
          </p>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
              <Beer className="w-3 h-3" />
              {beersOnTap} {beersOnTap === 1 ? 'spina' : 'spine'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
