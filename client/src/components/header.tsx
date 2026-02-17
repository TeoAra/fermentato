import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Beer, Search, Bell, MapPin, Home, User, LogOut, Shield, Store } from "lucide-react";
import type { User as UserType } from "@shared/schema";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import SearchResults from "@/components/search-results";
import SearchDialog from "@/components/search-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Header() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const typedUser = user as UserType | undefined;
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const isAdmin = typedUser?.userType === 'admin';

  const { data: rolesData } = useQuery<{ roles: string[]; activeRole: string }>({
    queryKey: ["/api/auth/roles"],
    enabled: isAuthenticated && isAdmin,
  });

  const switchRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      return apiRequest("/api/auth/switch-role", { method: "POST" }, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.location.reload();
    },
  });

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

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  // Hide header for pub owners in dashboard
  const isPubOwnerInDashboard = isAuthenticated && 
    (user as any)?.userType === 'pub_owner' && 
    (location.startsWith("/smart-pub-dashboard") || location.startsWith("/dashboard"));

  // Desktop navigation items - filter based on authentication status
  const allNavItems = [
    {
      icon: Home,
      label: "Home",
      href: "/",
      isActive: location === "/",
      requiresAuth: false
    },
    {
      icon: MapPin,
      label: "Attività",
      href: "/activity",
      isActive: location.startsWith("/activity"),
      requiresAuth: true
    },
    {
      icon: Bell,
      label: "Notifiche",
      href: "/notifications", 
      isActive: location.startsWith("/notifications"),
      badge: (unreadData?.count && unreadData.count > 0) ? unreadData.count : undefined,
      requiresAuth: true
    },
    {
      icon: User,
      label: "Dashboard",
      href: "/dashboard",
      isActive: location.startsWith("/dashboard"),
      requiresAuth: true
    }
  ];

  // Filter items: show all for authenticated users, only non-auth-required for guests
  const navItems = allNavItems.filter(item => isAuthenticated || !item.requiresAuth);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log("Searching for:", searchQuery);
    }
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Don't render header for pub owners in dashboard
  if (isPubOwnerInDashboard) {
    return null;
  }

  return (
    <>
      {/* Integrated Desktop Header with Navigation */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-white/20 dark:border-gray-800/50 shadow-lg hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-12 gap-4 items-center h-16">
            {/* Logo - Fixed Width */}
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2" data-testid="logo-desktop">
                <Beer className="h-8 w-8 text-orange-600" />
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  Fermenta<span className="text-orange-600">.to</span>
                </span>
              </Link>
            </div>

            {/* Main Navigation */}
            <div className="col-span-5">
              <nav className="flex items-center justify-center">
                <div className="flex items-center space-x-1 bg-gray-100/50 dark:bg-gray-800/50 rounded-2xl p-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.isActive;
                    
                    return (
                      <div key={item.label}>
                        {item.href.startsWith('/api/') ? (
                          <a
                            href={item.href}
                            data-testid={`nav-desktop-${item.label.toLowerCase().replace(' ', '-')}`}
                            className={`relative flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${isActive ? 'text-white shadow-lg bg-gradient-to-r from-orange-500 to-orange-600' : 'text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-white/50 dark:hover:bg-gray-700/50'}`}
                          >
                            <div className="relative">
                              <Icon className="h-4 w-4" />
                              {item.badge && item.badge > 0 && (
                                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] shadow-lg">
                                  {item.badge && item.badge > 99 ? '99+' : item.badge}
                                </div>
                              )}
                            </div>
                            <span>{item.label}</span>
                          </a>
                        ) : (
                          <Link href={item.href}>
                            <div
                              data-testid={`nav-desktop-${item.label.toLowerCase().replace(' ', '-')}`}
                              className={`relative flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${isActive ? 'text-white shadow-lg bg-gradient-to-r from-orange-500 to-orange-600' : 'text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-white/50 dark:hover:bg-gray-700/50'}`}
                            >
                              <div className="relative">
                                <Icon className="h-4 w-4" />
                                {item.badge && item.badge > 0 && (
                                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] shadow-lg">
                                    {item.badge && item.badge > 99 ? '99+' : item.badge}
                                  </div>
                                )}
                              </div>
                              <span>{item.label}</span>
                            </div>
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </nav>
            </div>

            {/* Search Bar */}
            <div className="col-span-3" ref={searchRef}>
              <form onSubmit={handleSearch} className="relative max-w-xs ml-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="search"
                  placeholder="Cerca pub, birre..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowResults(e.target.value.length > 2);
                  }}
                  onFocus={() => setShowResults(searchQuery.length > 2)}
                  className="pl-10 pr-4 bg-white/50 dark:bg-gray-800/50 border-white/20 dark:border-gray-700/50"
                  data-testid="search-input-desktop"
                />
                {showResults && (
                  <SearchResults 
                    query={searchQuery} 
                    onClose={() => setShowResults(false)} 
                  />
                )}
              </form>
            </div>

            {/* User Section */}
            <div className="col-span-2 flex items-center justify-end gap-2">
              {isAuthenticated && typedUser ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-2" data-testid="user-menu-button">
                      <Avatar className="h-8 w-8">
                        {typedUser.profileImageUrl && (
                          <AvatarImage src={typedUser.profileImageUrl} alt={typedUser.nickname || 'Profilo'} />
                        )}
                        <AvatarFallback className="bg-orange-100 text-orange-600 text-sm">
                          {typedUser.nickname?.[0]?.toUpperCase() || typedUser.firstName?.[0] || typedUser.email?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden xl:inline text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
                        {typedUser.firstName || typedUser.email?.split('@')[0]}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
                        <User className="h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin && rolesData && rolesData.roles.length > 1 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-gray-500 font-normal">
                          Ruolo attivo: {roleLabels[rolesData.activeRole] || rolesData.activeRole}
                        </DropdownMenuLabel>
                        {rolesData.roles
                          .filter(role => role !== rolesData.activeRole)
                          .map(role => {
                            const Icon = roleIcons[role] || User;
                            return (
                              <DropdownMenuItem
                                key={role}
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={() => switchRoleMutation.mutate(role)}
                                disabled={switchRoleMutation.isPending}
                              >
                                <Icon className="h-4 w-4" />
                                Passa a {roleLabels[role] || role}
                              </DropdownMenuItem>
                            );
                          })}
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="flex items-center gap-2 cursor-pointer text-red-600"
                      data-testid="logout-button"
                      onClick={() => {
                        fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
                          .then(() => window.location.href = '/');
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      Esci
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild variant="default" size="sm" className="bg-orange-600 hover:bg-orange-700">
                  <Link href="/login" data-testid="login-button">Accedi / Registrati</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced Search Dialog */}
      <SearchDialog 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </>
  );
}