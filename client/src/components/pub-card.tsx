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
}

export default function PubCard({ pub }: PubCardProps) {
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
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare i preferiti",
        variant: "destructive",
      });
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

  return (
    <Link href={`/pub/${pub.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
        <div className="relative">
          <ImageWithFallback
            src={pub.coverImageUrl}
            alt={`${pub.name} - Copertina`}
            imageType="pub"
            containerClassName="w-full h-48"
            className="w-full h-48 object-cover"
            iconSize="xl"
          />
          {!pub.isActive && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="text-white font-semibold">Temporaneamente Chiuso</span>
            </div>
          )}
        </div>
        
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold text-secondary truncate">{pub.name}</h3>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 ${
                  isFavorite 
                    ? 'text-red-600 hover:text-red-700' 
                    : 'text-gray-400 hover:text-red-600'
                }`}
                onClick={handleFavoriteClick}
                disabled={toggleFavoriteMutation.isPending}
                data-testid={`button-favorite-pub-${pub.id}`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </Button>
              <span className="text-sm text-gray-600 font-medium">
                {favoritesCount}
              </span>
            </div>
          </div>
          
          <p className="text-gray-600 mb-3 flex items-center">
            <MapPin className="w-4 h-4 mr-1" />
            {pub.address}, {pub.city}
          </p>
          
          <div className="flex items-center justify-between text-sm">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Beer className="w-3 h-3 mr-1" />
              {beersOnTap} spine attive
            </Badge>
            <span className={`flex items-center ${isOpenNow(pub.openingHours) ? 'text-green-600' : 'text-red-600'}`}>
              <Clock className="w-4 h-4 mr-1" />
              {isOpenNow(pub.openingHours) ? 'Aperto ora' : 'Chiuso ora'}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
