import { useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface UniversalFavoritesButtonProps {
  itemType: 'pub' | 'brewery' | 'beer';
  itemId: number;
  size?: "sm" | "default" | "lg";
}

export default function UniversalFavoritesButton({ 
  itemType, 
  itemId, 
  size = "default" 
}: UniversalFavoritesButtonProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: isFavoriteData } = useQuery({
    queryKey: ["/api/favorites", itemType, itemId, "check"],
    queryFn: () => fetch(`/api/favorites/${itemType}/${itemId}/check`).then(res => res.json()),
    enabled: isAuthenticated,
  });

  const isFavorite = isFavoriteData?.isFavorite || false;

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorite) {
        return apiRequest(`/api/favorites/${itemType}/${itemId}`, {
          method: "DELETE",
        });
      } else {
        return apiRequest("/api/favorites", {
          method: "POST",
          body: JSON.stringify({ itemType, itemId }),
          headers: { "Content-Type": "application/json" },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", itemType, itemId, "check"] });
      
      const itemName = itemType === 'pub' ? 'pub' : itemType === 'brewery' ? 'birrificio' : 'birra';
      toast({
        title: isFavorite ? "Rimosso dai preferiti" : "Aggiunto ai preferiti",
        description: isFavorite 
          ? `Il ${itemName} è stato rimosso dai tuoi preferiti` 
          : `Il ${itemName} è stato aggiunto ai tuoi preferiti`,
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

  if (!isAuthenticated) {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={() => {
          toast({
            title: "Login richiesto",
            description: "Effettua il login per gestire i preferiti",
            variant: "destructive",
          });
        }}
        className="flex items-center gap-2"
      >
        <Heart className="h-4 w-4" />
        {size !== "sm" && "Preferiti"}
      </Button>
    );
  }

  return (
    <Button
      variant={isFavorite ? "default" : "outline"}
      size={size}
      onClick={() => toggleFavoriteMutation.mutate()}
      disabled={toggleFavoriteMutation.isPending}
      className={`flex items-center gap-2 ${
        isFavorite ? "bg-red-500 hover:bg-red-600 text-white" : ""
      }`}
    >
      <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
      {size !== "sm" && (isFavorite ? "Nei Preferiti" : "Aggiungi ai Preferiti")}
    </Button>
  );
}