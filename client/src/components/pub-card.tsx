import { Heart, Beer, Clock, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ImageWithFallback from "@/components/image-with-fallback";

// Funzione per controllare se un pub è aperto ora
function isOpenNow(openingHours: any) {
  if (!openingHours) return false;
  
  const now = new Date();
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const todayHours = openingHours[currentDay];
  if (!todayHours || todayHours.isClosed) return false;
  
  // Se ha orari, controlla se è nell'intervallo
  if (todayHours.open && todayHours.close) {
    const [openHour, openMin] = todayHours.open.split(':').map(Number);
    const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    
    if (closeTime < openTime) {
      // Orario attraversa la mezzanotte
      return currentTime >= openTime || currentTime <= closeTime;
    } else {
      return currentTime >= openTime && currentTime <= closeTime;
    }
  }
  
  return true; // Se non ha orari specifici ma non è chiuso, considera aperto
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

  // Fetch real tap list count
  const { data: tapList } = useQuery({
    queryKey: ["/api/pubs", pub.id, "taplist"],
  });

  // Fetch favorites count for this pub
  const { data: favoritesCountData } = useQuery({
    queryKey: ["/api/favorites", "pub", pub.id, "count"],
  });

  // Check if current pub is in user's favorites
  const { data: isFavoriteData } = useQuery<{ isFavorite: boolean }>({
    queryKey: ["/api/favorites", "pub", pub.id, "check"],
    enabled: isAuthenticated,
  });

  const beersOnTap = Array.isArray(tapList) ? tapList.filter(item => item.isActive).length : 0;
  const isFavorite = isFavoriteData?.isFavorite || false;
  const favoritesCount = (favoritesCountData as any)?.count || 0;

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorite) {
        return apiRequest(`/api/favorites/pub/${pub.id}`, { method: "DELETE" });
      } else {
        return apiRequest("/api/favorites", { method: "POST" }, { 
          itemType: "pub", 
          itemId: pub.id 
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", "pub", pub.id, "check"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", "pub", pub.id, "count"] });
      
      toast({
        title: isFavorite ? "Rimosso dai preferiti" : "Aggiunto ai preferiti",
        description: isFavorite 
          ? "Il pub è stato rimosso dai tuoi preferiti" 
          : "Il pub è stato aggiunto ai tuoi preferiti",
      });
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
      toast({
        title: "Accesso richiesto",
        description: "Effettua l'accesso per aggiungere ai preferiti",
        variant: "destructive",
      });
      return;
    }

    toggleFavoriteMutation.mutate();
  };

  const open = isOpenNow(pub.openingHours);

  const handlePrefetch = () => {
    const pubId = (pub as any).slug || String(pub.id);
    queryClient.prefetchQuery({
      queryKey: ["/api/pubs", pubId],
      staleTime: 30 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ["/api/pubs", pub.id, "taplist"],
      staleTime: 30 * 1000,
    });
  };

  return (
    <Link href={`/pub/${(pub as any).slug || pub.id}`} onMouseEnter={handlePrefetch} onTouchStart={handlePrefetch}>
      <Card className="overflow-hidden cursor-pointer group hover:shadow-[0_6px_20px_hsla(28,25%,8%,0.10)] dark:hover:shadow-[0_6px_20px_hsla(0,0%,0%,0.40)] transition-all duration-250 hover:-translate-y-0.5">
        <div className="relative">
          <ImageWithFallback
            src={pub.coverImageUrl}
            alt={`${pub.name} - Copertina`}
            imageType="pub"
            containerClassName="w-full h-44"
            className="w-full h-44 object-cover group-hover:scale-[1.02] transition-transform duration-300"
            iconSize="xl"
          />
          {!pub.isActive && (
            <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
              <span className="text-white font-semibold text-sm tracking-wide">Temporaneamente Chiuso</span>
            </div>
          )}
          {/* Open/closed pill */}
          <div className={`absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold backdrop-blur-sm ${
            open
              ? 'bg-green-500/90 text-white'
              : 'bg-black/50 text-white/80'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-white' : 'bg-white/60'}`} />
            {open ? 'Aperto' : 'Chiuso'}
          </div>
        </div>

        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-1.5">
            <h3 className="text-base font-semibold text-[hsl(28,18%,13%)] dark:text-[hsl(40,12%,92%)] truncate leading-snug">{pub.name}</h3>
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <button
                className={`p-1 rounded-lg transition-colors ${
                  isFavorite
                    ? 'text-red-500'
                    : 'text-[hsl(28,8%,62%)] dark:text-[hsl(35,8%,48%)] hover:text-red-400'
                }`}
                onClick={handleFavoriteClick}
                disabled={toggleFavoriteMutation.isPending}
                data-testid={`button-favorite-pub-${pub.id}`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
              <span className="text-xs text-[hsl(28,8%,56%)] dark:text-[hsl(35,8%,48%)] font-medium min-w-[14px]">
                {favoritesCount}
              </span>
            </div>
          </div>

          <p className="text-sm text-[hsl(28,8%,50%)] dark:text-[hsl(35,8%,52%)] flex items-center mb-3">
            <MapPin className="w-3.5 h-3.5 mr-1 flex-shrink-0 opacity-70" />
            <span className="truncate">
              {distance != null ? pub.city : `${pub.address}, ${pub.city}`}
            </span>
            {distance != null && (
              <span className="ml-2 text-xs font-semibold text-[hsl(35,90%,42%)] dark:text-[hsl(38,88%,58%)] whitespace-nowrap">
                {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
              </span>
            )}
          </p>

          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[hsl(38,14%,93%)] dark:bg-[hsl(25,12%,15%)] text-[hsl(28,18%,28%)] dark:text-[hsl(35,10%,68%)]">
              <Beer className="w-3 h-3" />
              {beersOnTap} spine
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
