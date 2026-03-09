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
import { ThemeToggle } from "@/components/theme-toggle";

export default function Header() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const typedUser = user as UserType | undefined;
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const isAdmin = typedUser?.userType === 'admin';
  const hasMultipleRoles = (typedUser?.roles?.length ?? 0) > 1;

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
    refetchInterval: 120000,
  });

  // Never hide header — multi-role users need it to switch roles
  const isPubOwnerInDashboard = false;

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
      <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-12 gap-4 items-center h-16">
            {/* Logo - Fixed Width */}
            <div className="col-span-2">
              <Link href="/" data-testid="logo-desktop">
                <img src="/logo-full.png" alt="Fermenta.to" className="h-9 w-auto dark:bg-white dark:rounded-lg dark:px-2 dark:py-0.5" />
              </Link>
            </div>

            {/* Main Navigation */}
            <div className="col-span-5">
              <nav className="flex items-center justify-center">
                <div className="flex items-center space-x-1 bg-gray-100/60 dark:bg-slate-800/60 rounded-2xl p-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.isActive;
                    
                    return (
                      <div key={item.label}>
                        {item.href.startsWith('/api/') ? (
                          <a
                            href={item.href}
                            data-testid={`nav-desktop-${item.label.toLowerCase().replace(' ', '-')}`}
                            className={`relative flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${isActive ? 'text-white shadow-md bg-gradient-to-r from-amber-500 to-amber-600' : 'text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-white/60 dark:hover:bg-slate-700/60'}`}
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
                              className={`relative flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${isActive ? 'text-white shadow-md bg-gradient-to-r from-amber-500 to-amber-600' : 'text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-white/60 dark:hover:bg-slate-700/60'}`}
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
              <div className="relative max-w-xs ml-auto">
                <form onSubmit={handleSearch} className="relative">
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
                    className="pl-10 pr-28 bg-white/60 dark:bg-slate-800/60 border-gray-200 dark:border-slate-700"
                    data-testid="search-input-desktop"
                  />
                  <Link href={searchQuery.trim() ? `/search?q=${encodeURIComponent(searchQuery.trim())}` : "/search"}>
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium whitespace-nowrap transition-colors"
                    >
                      Avanzata
                    </button>
                  </Link>
                </form>
                {showResults && (
                  <SearchResults 
                    query={searchQuery} 
                    onClose={() => setShowResults(false)} 
                  />
                )}
              </div>
            </div>

            {/* User Section */}
            <div className="col-span-2 flex items-center justify-end gap-1">
              <ThemeToggle />
              {isAuthenticated && typedUser ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-2" data-testid="user-menu-button">
                      <Avatar className="h-8 w-8">
                        {typedUser.profileImageUrl && (
                          <AvatarImage src={typedUser.profileImageUrl} alt={typedUser.nickname || 'Profilo'} />
                        )}
                        <AvatarFallback className="bg-amber-100 text-amber-600 text-sm">
                          {typedUser.nickname?.[0]?.toUpperCase() || typedUser.firstName?.[0] || typedUser.email?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden xl:inline text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
                        {typedUser.firstName || typedUser.email?.split('@')[0]}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    {/* User info */}
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {typedUser.firstName ? `${typedUser.firstName} ${typedUser.lastName || ''}`.trim() : typedUser.email?.split('@')[0]}
                      </div>
                      {rolesData && (
                        <div className="flex items-center gap-1.5 mt-1">
                          {(() => { const Icon = roleIcons[rolesData.activeRole] || User; return <Icon className="h-3 w-3 text-amber-500" />; })()}
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            {roleLabels[rolesData.activeRole] || rolesData.activeRole}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Dashboard link */}
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
                        {(() => { const activeRole = rolesData?.activeRole || typedUser.activeRole || 'customer'; const Icon = roleIcons[activeRole] || User; return <Icon className="h-4 w-4" />; })()}
                        {rolesData?.activeRole === 'customer' ? 'Il mio profilo' : rolesData?.activeRole === 'pub_owner' ? 'Pannello pub' : rolesData?.activeRole === 'brewery_owner' ? 'Pannello birrificio' : 'Dashboard'}
                      </Link>
                    </DropdownMenuItem>

                    {/* Role switcher for multi-role users */}
                    {rolesData && rolesData.roles.length > 1 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-gray-400 font-normal px-3 py-1">
                          Cambia modalità
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
                <Button asChild variant="default" size="sm" className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold">
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