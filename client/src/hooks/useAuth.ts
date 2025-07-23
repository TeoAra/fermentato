import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export function useAuth() {
  // Clean up any old demo data from localStorage
  useEffect(() => {
    localStorage.removeItem('demo_user');
  }, []);

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
