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

  const { data: checkData, isLoading: checkLoading } = useQuery<{ isFavorite: boolean }>({
    queryKey: checkKey,
    queryFn: async () => {
      const r = await fetch(`/api/favorites/festival/${festivalId}/check`, { credentials: "include" });
      if (!r.ok) return { isFavorite: false };
      return r.json();
    },
    enabled: isAuthenticated,
    staleTime: 0,
  });

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: countKey,
    queryFn: async () => {
      const r = await fetch(`/api/favorites/festival/${festivalId}/count`);
      if (!r.ok) return { count: 0 };
      return r.json();
    },
    staleTime: 30_000,
  });

  const liked = checkData?.isFavorite ?? false;
  const count = countData?.count ?? 0;

  const toggleMutation = useMutation({
    mutationFn: async (currentlyLiked: boolean) => {
      if (currentlyLiked) {
        await apiRequest(`/api/favorites/festival/${festivalId}`, { method: "DELETE" });
      } else {
        await apiRequest("/api/favorites", { method: "POST" }, { itemType: "festival", itemId: festivalId });
      }
    },
    onMutate: async (currentlyLiked: boolean) => {
      await queryClient.cancelQueries({ queryKey: checkKey });
      await queryClient.cancelQueries({ queryKey: countKey });

      const prevCheck = queryClient.getQueryData<{ isFavorite: boolean }>(checkKey);
      const prevCount = queryClient.getQueryData<{ count: number }>(countKey);

      queryClient.setQueryData(checkKey, { isFavorite: !currentlyLiked });
      queryClient.setQueryData(countKey, { count: (prevCount?.count ?? 0) + (currentlyLiked ? -1 : 1) });

      return { prevCheck, prevCount };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevCheck !== undefined) queryClient.setQueryData(checkKey, context.prevCheck);
      if (context?.prevCount !== undefined) queryClient.setQueryData(countKey, context.prevCount);
      toast({ title: "Errore", description: "Riprova tra poco.", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: checkKey });
      queryClient.invalidateQueries({ queryKey: countKey });
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
    toggleMutation.mutate(liked);
  };

  return (
    <Button
      variant={liked ? "default" : "outline"}
      size={size}
      onClick={handleClick}
      disabled={checkLoading}
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
