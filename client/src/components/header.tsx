import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Beer, Search, Bell, User, LogOut, Shield, Store, Activity } from "lucide-react";
import type { User as UserType } from "@shared/schema";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import SearchResults from "@/components/search-results";
import FindBeerSheet from "@/components/FindBeerSheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Header() {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
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

  const allNavItems = [
    { label: "Home", href: "/", isActive: location === "/", requiresAuth: false },
    { label: "Birrifici", href: "/explore/breweries", isActive: location.startsWith("/explore/breweries"), requiresAuth: false },
    { label: "Pub & Locali", href: "/explore/pubs", isActive: location.startsWith("/explore/pubs"), requiresAuth: false },
    { label: "Festival", href: "/festival", isActive: location.startsWith("/festival") && !location.startsWith("/festival-dashboard") && !location.startsWith("/festival/"), requiresAuth: false },
  ];

  const navItems = allNavItems.filter(item => isAuthenticated || !item.requiresAuth);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 hidden lg:block">
        {/* Frosted background */}
        <div className="absolute inset-0 bg-white/90 dark:bg-[hsla(25,14%,7%,0.95)] backdrop-blur-xl border-b border-[hsl(36,14%,87%)] dark:border-[hsl(25,12%,14%)]" />
        
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center h-[68px] gap-8">
            {/* Logo */}
            <Link href="/" data-testid="logo-desktop" className="flex-shrink-0">
              <img src="/logo-full.png" alt="Fermenta.to" className="h-10 w-auto block dark:hidden" />
              <img src="/logo-dark-mode.png" alt="Fermenta.to" className="h-10 w-auto hidden dark:block" />
            </Link>

            {/* Main Navigation */}
            <nav className="flex items-center gap-0.5 flex-1">
              {navItems.map((item) => (
                <Link key={item.label} href={item.href}>
                  <span className={`relative flex items-center px-3 xl:px-4 py-1 text-[13px] font-medium tracking-wide transition-colors duration-200 ${
                    item.isActive
                      ? "text-[hsl(24,93%,44%)] dark:text-[hsl(24,93%,58%)]"
                      : "text-[hsl(28,10%,44%)] dark:text-[hsl(35,8%,58%)] hover:text-[hsl(28,18%,13%)] dark:hover:text-[hsl(40,12%,90%)]"
                  }`}>
                    {item.label}
                    {item.isActive && (
                      <span className="absolute -bottom-[22px] left-0 right-0 h-[2px] rounded-full bg-[hsl(24,93%,49%)] dark:bg-[hsl(24,93%,55%)]" />
                    )}
                  </span>
                </Link>
              ))}
            </nav>

            {/* Search Bar */}
            <div className="w-36 xl:w-52 flex-shrink-0" ref={searchRef}>
              <div className="relative">
                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(30,8%,58%)] h-3.5 w-3.5" />
                  <Input
                    type="search"
                    placeholder="Cerca pub, birre…"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowResults(e.target.value.length > 2);
                    }}
                    onFocus={() => setShowResults(searchQuery.length > 2)}
                    className="pl-8 pr-16 h-8 text-[13px] bg-[hsl(40,14%,94%)] dark:bg-muted border-transparent focus:border-[hsl(24,93%,49%)] dark:focus:border-[hsl(24,93%,55%)] focus:ring-0 focus:bg-white dark:focus:bg-card transition-all duration-200 placeholder:text-[hsl(30,8%,60%)] dark:placeholder:text-[hsl(35,8%,50%)]"
                    data-testid="search-input-desktop"
                  />
                  <Link href={searchQuery.trim() ? `/search?q=${encodeURIComponent(searchQuery.trim())}` : "/search"}>
                    <button
                      type="button"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[hsl(24,93%,46%)] dark:text-[hsl(24,93%,58%)] hover:text-[hsl(24,93%,38%)] font-semibold transition-colors"
                    >
                      Tutte
                    </button>
                  </Link>
                </form>
                {showResults && (
                  <SearchResults query={searchQuery} onClose={() => setShowResults(false)} />
                )}
              </div>
            </div>

            {/* User Section */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <ThemeToggle />

              {/* Notification bell – authenticated only */}
              {isAuthenticated && (
                <Link href="/notifications">
                  <button
                    className={`relative p-2 rounded-lg transition-colors ${
                      location.startsWith("/notifications")
                        ? "bg-[hsl(24,90%,93%)] dark:bg-[#1B2735] text-[hsl(24,93%,44%)] dark:text-[hsl(24,93%,56%)]"
                        : "text-[hsl(28,8%,52%)] dark:text-[hsl(35,8%,52%)] hover:bg-[hsl(38,14%,93%)] dark:hover:bg-[hsl(25,12%,14%)] hover:text-[hsl(28,18%,20%)] dark:hover:text-[hsl(40,12%,88%)]"
                    }`}
                    title="Notifiche"
                  >
                    <Bell className="h-4 w-4" />
                    {(unreadData?.count ?? 0) > 0 && (
                      <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                        {(unreadData?.count ?? 0) > 9 ? '9+' : unreadData?.count}
                      </span>
                    )}
                  </button>
                </Link>
              )}

              {isAuthenticated && typedUser ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-[hsl(38,14%,93%)] dark:hover:bg-[hsl(25,12%,14%)] transition-colors" data-testid="user-menu-button">
                      <Avatar className="h-7 w-7 ring-2 ring-[hsl(24,93%,49%)]/20 dark:ring-[hsl(24,93%,55%)]/20">
                        {typedUser.profileImageUrl && (
                          <AvatarImage src={typedUser.profileImageUrl} alt={typedUser.nickname || 'Profilo'} />
                        )}
                        <AvatarFallback className="bg-[hsl(38,80%,93%)] text-[hsl(28,70%,28%)] text-xs font-semibold">
                          {typedUser.nickname?.[0]?.toUpperCase() || typedUser.firstName?.[0] || typedUser.email?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden xl:inline text-[13px] font-medium text-[hsl(28,18%,20%)] dark:text-[hsl(40,12%,86%)] max-w-[90px] truncate">
                        {typedUser.firstName || typedUser.email?.split('@')[0]}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    <div className="px-3 py-2.5 border-b border-[hsl(36,14%,87%)] dark:border-border">
                      <div className="text-[13px] font-semibold text-[hsl(28,18%,13%)] dark:text-[hsl(40,12%,94%)] truncate">
                        {typedUser.firstName ? `${typedUser.firstName} ${typedUser.lastName || ''}`.trim() : typedUser.email?.split('@')[0]}
                      </div>
                      {rolesData && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {(() => { const Icon = roleIcons[rolesData.activeRole] || User; return <Icon className="h-3 w-3 text-[hsl(24,93%,49%)] dark:text-[hsl(24,93%,55%)]" />; })()}
                          <span className="text-xs text-[hsl(24,93%,46%)] dark:text-[hsl(24,93%,58%)] font-medium">
                            {roleLabels[rolesData.activeRole] || rolesData.activeRole}
                          </span>
                        </div>
                      )}
                    </div>

                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer text-[13px]">
                        {(() => { const activeRole = rolesData?.activeRole || typedUser.activeRole || 'customer'; const Icon = roleIcons[activeRole] || User; return <Icon className="h-3.5 w-3.5" />; })()}
                        {rolesData?.activeRole === 'customer' ? 'Il mio profilo' : rolesData?.activeRole === 'pub_owner' ? 'Pannello pub' : rolesData?.activeRole === 'brewery_owner' ? 'Pannello birrificio' : 'Dashboard'}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/activity" className="flex items-center gap-2 cursor-pointer text-[13px]">
                        <Activity className="h-3.5 w-3.5" />
                        Attività
                      </Link>
                    </DropdownMenuItem>

                    {rolesData && rolesData.roles.length > 1 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-[11px] text-[hsl(30,8%,56%)] font-normal px-3 py-1 uppercase tracking-wider">
                          Cambia modalità
                        </DropdownMenuLabel>
                        {rolesData.roles
                          .filter(role => role !== rolesData.activeRole)
                          .map(role => {
                            const Icon = roleIcons[role] || User;
                            return (
                              <DropdownMenuItem
                                key={role}
                                className="flex items-center gap-2 cursor-pointer text-[13px]"
                                onClick={() => switchRoleMutation.mutate(role)}
                                disabled={switchRoleMutation.isPending}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                Passa a {roleLabels[role] || role}
                              </DropdownMenuItem>
                            );
                          })}
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="flex items-center gap-2 cursor-pointer text-[13px] text-red-600 dark:text-red-400"
                      data-testid="logout-button"
                      onClick={() => {
                        fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
                          .then(() => setLocation('/'));
                      }}
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Esci
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild size="sm" className="h-8 px-4 text-[13px] font-semibold tracking-wide bg-[hsl(24,93%,49%)] hover:bg-[hsl(24,93%,44%)] text-white shadow-none">
                  <Link href="/login" data-testid="login-button">Accedi</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <FindBeerSheet
        open={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}
