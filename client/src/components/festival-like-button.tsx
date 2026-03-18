import { useQuery, useMutation } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
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

  const { data: checkData, isLoading: checkLoading } = useQuery<{ isFavorite: boolean }>({
    queryKey: ["/api/favorites", "festival", festivalId, "check"],
    queryFn: async () => {
      const r = await fetch(`/api/favorites/festival/${festivalId}/check`, { credentials: "include" });
      if (!r.ok) return { isFavorite: false };
      return r.json();
    },
    enabled: isAuthenticated,
  });

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/favorites", "festival", festivalId, "count"],
    queryFn: async () => {
      const r = await fetch(`/api/favorites/festival/${festivalId}/count`);
      if (!r.ok) return { count: 0 };
      return r.json();
    },
  });

  const liked = checkData?.isFavorite ?? false;
  const count = countData?.count ?? 0;

  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (liked) {
        return apiRequest(`/api/favorites/festival/${festivalId}`, { method: "DELETE" });
      } else {
        return apiRequest("/api/favorites", { method: "POST" }, { itemType: "festival", itemId: festivalId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", "festival", festivalId] });
    },
    onError: () => toast({ title: "Errore", variant: "destructive" }),
  });

  const handleClick = () => {
    if (!isAuthenticated) {
      toast({
        title: "Accedi per mettere Mi Piace",
        description: "Effettua il login per salvare i festival preferiti.",
      });
      return;
    }
    toggleMutation.mutate();
  };

  return (
    <Button
      variant={liked ? "default" : "outline"}
      size={size}
      onClick={handleClick}
      disabled={toggleMutation.isPending || checkLoading}
      className={`gap-1.5 transition-all ${
        liked
          ? "bg-red-500 hover:bg-red-600 border-red-500 text-white"
          : "border-red-200 text-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
      } ${className ?? ""}`}
      title={liked ? "Rimuovi dai preferiti" : "Mi Piace"}
    >
      <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
      {showLabel && (
        <span>{liked ? "Piaciuto" : "Mi Piace"}</span>
      )}
      {count > 0 && <span className="font-semibold">{count}</span>}
    </Button>
  );
}
