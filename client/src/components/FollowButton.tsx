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
      variant={following ? "outline" : "default"}
      className={`rounded-xl text-xs h-8 ${following ? "" : "bg-primary text-white"} ${className}`}
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
