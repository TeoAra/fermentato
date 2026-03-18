import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FestivalLikeButtonProps {
  festivalId: number;
  className?: string;
  size?: "sm" | "default" | "lg";
  showLabel?: boolean;
}

export function FestivalLikeButton({ festivalId, className, size = "sm", showLabel = true }: FestivalLikeButtonProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const checkKey = ["/api/favorites", "festival", festivalId, "check"];
  const countKey = ["/api/favorites", "festival", festivalId, "count"];

  const { data: checkData } = useQuery<{ isFavorite: boolean }>({
    queryKey: checkKey,
    enabled: isAuthenticated && !!festivalId,
    staleTime: 60_000,
  });

  const { data: countData } = useQuery<{ count: number | string }>({
    queryKey: countKey,
    enabled: !!festivalId,
    staleTime: 60_000,
  });

  const liked = checkData?.isFavorite ?? false;
  const count = Number(countData?.count ?? 0);

  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (liked) {
        return apiRequest(`/api/favorites/festival/${festivalId}`, { method: "DELETE" });
      } else {
        return apiRequest("/api/favorites", { method: "POST" }, { itemType: "festival", itemId: festivalId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checkKey });
      queryClient.invalidateQueries({ queryKey: countKey });
      toast({
        title: liked ? "Rimosso dai preferiti" : "Aggiunto ai preferiti",
        description: liked
          ? "Il festival è stato rimosso dai tuoi preferiti"
          : "Il festival è stato aggiunto ai tuoi preferiti",
      });
    },
    onError: (err: any) => {
      if (err?.status === 401) {
        toast({ title: "Accedi per mettere Mi Piace", description: "Effettua il login per salvare i festival preferiti." });
      } else {
        toast({ title: "Errore", description: "Riprova tra poco.", variant: "destructive" });
      }
    },
  });

  const handleClick = () => {
    if (!isAuthenticated) {
      toast({
        title: "Accedi per mettere Mi Piace",
        description: "Effettua il login per salvare i festival preferiti.",
      });
      return;
    }
    if (toggleMutation.isPending) return;
    toggleMutation.mutate();
  };

  return (
    <Button
      variant={liked ? "default" : "outline"}
      size={size}
      onClick={handleClick}
      disabled={toggleMutation.isPending}
      className={`gap-1.5 transition-all ${
        liked
          ? "bg-red-500 hover:bg-red-600 border-red-500 text-white"
          : "border-red-200 text-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
      } ${className ?? ""}`}
      title={liked ? "Rimuovi dai preferiti" : "Mi Piace"}
    >
      <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
      {showLabel && <span>{liked ? "Piaciuto" : "Mi Piace"}</span>}
      {count > 0 && <span className="font-semibold">{count}</span>}
    </Button>
  );
}
