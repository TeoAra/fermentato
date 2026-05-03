import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export interface AuthUser {
  id: string;
  email?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  userType?: "customer" | "pub_owner" | "brewery_owner" | "admin" | string;
  managedPubId?: number | null;
  managedBreweryId?: number | null;
  [key: string]: any;
}

export function useAuth() {
  // Clean up any old demo data from localStorage
  useEffect(() => {
    localStorage.removeItem('demo_user');
  }, []);

  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
