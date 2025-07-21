import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

export function useAuth() {
  const [demoUser, setDemoUser] = useState<any>(null);

  // Check for demo user in localStorage
  useEffect(() => {
    const demo = localStorage.getItem('demo_user');
    if (demo) {
      setDemoUser(JSON.parse(demo));
    }
  }, []);

  const { data: realUser, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: !demoUser, // Only check real auth if no demo user
  });

  const user = demoUser || realUser;
  const isAuthenticated = !!user;

  return {
    user,
    isLoading: !demoUser && isLoading,
    isAuthenticated,
  };
}
