import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

interface RatingStarsProps {
  pubId: number;
  currentRating?: number;
  userRating?: number;
  totalRatings?: number;
  size?: "sm" | "default" | "lg";
  interactive?: boolean;
}

export default function RatingStars({ 
  pubId, 
  currentRating = 0, 
  userRating, 
  totalRatings = 0,
  size = "default",
  interactive = true 
}: RatingStarsProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hoverRating, setHoverRating] = useState<number>(0);

  const starSize = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-6 w-6" : "h-4 w-4";

  const submitRatingMutation = useMutation({
    mutationFn: async (rating: number) => {
      return apiRequest("/api/ratings", {
        method: "POST",
        body: JSON.stringify({ pubId, rating }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId] });
      toast({
        title: "Valutazione inviata",
        description: "Grazie per aver valutato questo pub!",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile inviare la valutazione",
        variant: "destructive",
      });
    },
  });

  const handleStarClick = (rating: number) => {
    if (!isAuthenticated) {
      toast({
        title: "Login richiesto",
        description: "Effettua il login per valutare questo pub",
        variant: "destructive",
      });
      return;
    }
    
    if (interactive) {
      submitRatingMutation.mutate(rating);
    }
  };

  const displayRating = hoverRating || userRating || currentRating;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} cursor-pointer transition-colors ${
              star <= displayRating
                ? "text-yellow-400 fill-current"
                : "text-gray-300"
            } ${interactive ? "hover:text-yellow-400" : ""}`}
            onClick={() => handleStarClick(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
          />
        ))}
      </div>
      
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {currentRating > 0 ? (
          <>
            {currentRating.toFixed(1)} ({totalRatings} {totalRatings === 1 ? "valutazione" : "valutazioni"})
          </>
        ) : (
          "Nessuna valutazione"
        )}
      </div>
    </div>
  );
}