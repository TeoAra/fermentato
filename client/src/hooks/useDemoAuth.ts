import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useDemoAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/demo-auth/user"],
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/demo-login", "POST", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demo-auth/user"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/demo-logout", "POST", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demo-auth/user"] });
      localStorage.removeItem('demo_user');
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}