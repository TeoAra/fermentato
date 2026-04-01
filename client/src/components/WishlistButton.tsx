import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  beerId: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function WishlistButton({ beerId, size = "md", className }: WishlistButtonProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data } = useQuery<{ inWishlist: boolean }>({
    queryKey: ["/api/user/wishlist", beerId],
    queryFn: () => fetch(`/api/user/wishlist/${beerId}`).then(r => r.json()),
    enabled: isAuthenticated,
  });

  const inWishlist = data?.inWishlist ?? false;

  const addMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/user/wishlist", { beerId }),
    onSuccess: () => {
      queryClient.setQueryData(["/api/user/wishlist", beerId], { inWishlist: true });
      queryClient.invalidateQueries({ queryKey: ["/api/user/wishlist"] });
      toast({ title: "Aggiunta alla wishlist ❤️" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/user/wishlist/${beerId}`),
    onSuccess: () => {
      queryClient.setQueryData(["/api/user/wishlist", beerId], { inWishlist: false });
      queryClient.invalidateQueries({ queryKey: ["/api/user/wishlist"] });
      toast({ title: "Rimossa dalla wishlist" });
    },
  });

  if (!isAuthenticated) return null;

  const iconSize = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5";
  const btnSize = size === "sm" ? "w-7 h-7" : size === "lg" ? "w-11 h-11" : "w-9 h-9";
  const isPending = addMutation.isPending || removeMutation.isPending;

  return (
    <button
      className={cn(
        btnSize,
        "flex items-center justify-center rounded-full transition-all active:scale-90",
        inWishlist
          ? "bg-amber-50 dark:bg-amber-500/10 text-amber-500"
          : "bg-stone-100 dark:bg-[hsl(220,5%,22%)] text-stone-400",
        isPending && "opacity-50",
        className
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isPending) return;
        if (inWishlist) removeMutation.mutate();
        else addMutation.mutate();
      }}
      title={inWishlist ? "Rimuovi dalla wishlist" : "Aggiungi alla wishlist"}
    >
      <Bookmark className={cn(iconSize, inWishlist && "fill-amber-400")} />
    </button>
  );
}
