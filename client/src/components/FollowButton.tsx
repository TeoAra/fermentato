import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UserPlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FollowButtonProps {
  userId: string;
  className?: string;
}

export function FollowButton({ userId, className }: FollowButtonProps) {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data } = useQuery<{ following: boolean }>({
    queryKey: ["/api/users", userId, "follow-status"],
    queryFn: () => fetch(`/api/users/${userId}/follow-status`).then(r => r.json()),
    enabled: isAuthenticated && !!(user as any)?.id && (user as any)?.id !== userId,
  });

  const following = data?.following ?? false;

  const followMutation = useMutation({
    mutationFn: () => following
      ? apiRequest("DELETE", `/api/users/${userId}/follow`)
      : apiRequest("POST", `/api/users/${userId}/follow`),
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/users", userId, "follow-status"], data);
      queryClient.invalidateQueries({ queryKey: ["/api/user/following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/feed"] });
      toast({ title: following ? "Non stai più seguendo" : "Ora segui questo utente! 👋" });
    },
  });

  const currentUser = user as any;
  if (!isAuthenticated || currentUser?.id === userId) return null;

  return (
    <Button
      size="sm"
      variant="outline"
      className={`rounded-xl text-xs h-8 font-medium transition-all ${
        following
          ? "border-stone-300 dark:border-stone-600 bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-600 hover:text-red-600 dark:hover:text-red-400"
          : "border-primary bg-primary text-white hover:bg-primary/90 hover:border-primary/90"
      } ${className}`}
      onClick={() => followMutation.mutate()}
      disabled={followMutation.isPending}
    >
      {following ? (
        <><UserCheck className="w-3.5 h-3.5 mr-1" /> Segui già</>
      ) : (
        <><UserPlus className="w-3.5 h-3.5 mr-1" /> Segui</>
      )}
    </Button>
  );
}
