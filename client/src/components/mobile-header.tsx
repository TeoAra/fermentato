import { Menu, X, LogOut, LogIn, User, Settings, Store, Beer, Shield, Search } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { User as UserType } from "@shared/schema";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";
import SearchDialog from "@/components/search-dialog";

interface MobileHeaderProps {
  onMenuToggle: () => void;
  isMenuOpen: boolean;
}

const roleLabels: Record<string, string> = {
  customer: "Utente",
  pub_owner: "Pub Owner",
  brewery_owner: "Brewery Owner",
  admin: "Amministratore",
};
const roleIcons: Record<string, any> = {
  customer: User,
  pub_owner: Store,
  brewery_owner: Beer,
  admin: Shield,
};

export function MobileHeader({ onMenuToggle, isMenuOpen }: MobileHeaderProps) {
  const [location] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const typedUser = user as UserType | undefined;
  const isAdmin = typedUser?.userType === 'admin';
  const hasMultipleRoles = (typedUser?.roles?.length ?? 0) > 1;
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const { data: rolesData } = useQuery<{ roles: string[]; activeRole: string }>({
    queryKey: ["/api/auth/roles"],
    enabled: isAuthenticated && hasMultipleRoles,
  });

  const switchRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      return apiRequest("/api/auth/switch-role", { method: "POST" }, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onMenuToggle();
      window.location.reload();
    },
  });

  return (
    <>
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 h-14">
        <div className="flex items-center justify-between px-4 h-full">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
              <Beer className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              Fermenta<span className="text-amber-500">.to</span>
            </span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Search button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              aria-label="Ricerca avanzata"
            >
              <Search className="h-5 w-5" />
            </button>

            {isAuthenticated && typedUser && (
              <Link href="/dashboard">
                <Avatar className="h-7 w-7">
                  {typedUser.profileImageUrl && (
                    <AvatarImage src={typedUser.profileImageUrl} alt={typedUser.nickname || 'Profilo'} />
                  )}
                  <AvatarFallback className="bg-amber-100 text-amber-600 text-xs">
                    {typedUser.nickname?.[0]?.toUpperCase() || typedUser.firstName?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Link>
            )}
            
            <ThemeToggle />

            <button
              onClick={onMenuToggle}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              aria-label={isMenuOpen ? "Chiudi menu" : "Apri menu"}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-lg">
            <nav className="px-4 py-3 space-y-3">
              <Link href="/" onClick={onMenuToggle}>
                <div className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location === "/" 
                    ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" 
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                }`}>
                  Home
                </div>
              </Link>
              
              <Link href="/explore/pubs" onClick={onMenuToggle}>
                <div className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.startsWith("/explore/pub") || location.startsWith("/pub")
                    ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" 
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                }`}>
                  Pub
                </div>
              </Link>
              
              <Link href="/explore/breweries" onClick={onMenuToggle}>
                <div className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.startsWith("/brewer") 
                    ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" 
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                }`}>
                  Birrifici
                </div>
              </Link>

              {isAuthenticated && (
                <>
                  <Link href="/dashboard" onClick={onMenuToggle}>
                    <div className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location === "/dashboard" 
                        ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" 
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                    }`}>
                      <User className="w-4 h-4 inline-block mr-2" />
                      Il Mio Profilo
                    </div>
                  </Link>

                  {((user as any)?.activeRole === 'admin' || (!((user as any)?.activeRole) && (user as any)?.userType === 'admin')) && (
                    <Link href="/admin" onClick={onMenuToggle}>
                      <div className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        location.startsWith("/admin") 
                          ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" 
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                      }`}>
                        <Settings className="w-4 h-4 inline-block mr-2" />
                        Admin Panel
                      </div>
                    </Link>
                  )}

                  {rolesData && rolesData.roles.length > 1 && (
                    <>
                      <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                      <div className="px-3 py-1 text-xs text-gray-500 font-normal">
                        Modalità attiva: <span className="text-amber-500 font-medium">{roleLabels[rolesData.activeRole] || rolesData.activeRole}</span>
                      </div>
                      {rolesData.roles
                        .filter(role => role !== rolesData.activeRole)
                        .map(role => {
                          const Icon = roleIcons[role] || User;
                          return (
                            <Button
                              key={role}
                              variant="ghost"
                              className="w-full justify-start px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                              onClick={() => switchRoleMutation.mutate(role)}
                              disabled={switchRoleMutation.isPending}
                            >
                              <Icon className="w-4 h-4 mr-2" />
                              Passa a {roleLabels[role] || role}
                            </Button>
                          );
                        })}
                    </>
                  )}

                  <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => {
                      onMenuToggle();
                      fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
                        .then(() => window.location.href = '/');
                    }}
                    data-testid="logout-button-mobile"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Esci
                  </Button>
                </>
              )}

              {!isAuthenticated && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start px-3 py-2 text-sm font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                    onClick={() => {
                      onMenuToggle();
                      window.location.href = '/auth';
                    }}
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Accedi
                  </Button>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      <SearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}