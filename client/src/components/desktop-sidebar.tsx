import { Link, useLocation } from "wouter";
import { Home, Building2, Store, CalendarDays, Search, Bell, User, Beer, LogOut, Activity, Shield, Users as UsersIcon, Newspaper, GlassWater } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState, lazy, Suspense } from "react";
const FindBeerSheet = lazy(() => import("@/components/FindBeerSheet"));
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User as UserType } from "@shared/schema";

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

export function DesktopSidebar() {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const typedUser = user as UserType | undefined;
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: isAuthenticated,
    refetchInterval: 120000,
  });

  const { data: rolesData } = useQuery<{ roles: string[]; activeRole: string }>({
    queryKey: ["/api/auth/roles"],
    enabled: isAuthenticated && (typedUser?.roles?.length ?? 0) > 1,
  });

  const switchRoleMutation = useMutation({
    mutationFn: async (role: string) =>
      apiRequest("/api/auth/switch-role", { method: "POST" }, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.location.reload();
    },
  });

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  if (location.startsWith("/tv/") || location.startsWith("/festival-tv/")) return null;

  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: GlassWater, label: "Birre", href: "/explore/beers" },
    { icon: Building2, label: "Birrifici", href: "/explore/breweries" },
    { icon: Store, label: "Pub", href: "/explore/pubs" },
    { icon: CalendarDays, label: "Eventi", href: "/eventi" },
    { icon: Newspaper, label: "News", href: "/news" },
    { icon: UsersIcon, label: "Sociale", href: "/feed" },
  ];

  const unread = unreadData?.count ?? 0;

  return (
    <>
      {searchOpen && (
        <Suspense fallback={null}>
          <FindBeerSheet open={searchOpen} onClose={() => setSearchOpen(false)} />
        </Suspense>
      )}

      {/* ── Desktop Topbar ── hidden on mobile, shown on lg+ */}
      <header className="hidden lg:flex fixed top-0 left-0 right-0 z-50 h-16 items-center border-b border-stone-200 dark:border-[hsl(25,12%,14%)] bg-white/97 dark:bg-[#15202B]/97 backdrop-blur-xl">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-6">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0 mr-2">
            <img src="/logo-full.png" alt="Fermenta.to" className="h-9 w-auto block dark:hidden" />
            <img src="/logo-dark-mode.png" alt="Fermenta.to" className="h-9 w-auto hidden dark:block" />
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link key={item.label} href={item.href}>
                  <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all select-none ${
                    active
                      ? "bg-orange-50 dark:bg-orange-900/20 text-primary"
                      : "text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-900/30 hover:text-foreground"
                  }`}>
                    <item.icon size={16} strokeWidth={active ? 2.3 : 1.8} />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right utilities */}
          <div className="flex items-center gap-1">
            {/* Search */}
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2.5 rounded-xl text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-900/30 hover:text-foreground transition-colors"
              title="Cerca"
            >
              <Search size={18} strokeWidth={1.8} />
            </button>

            {/* Notifications */}
            {isAuthenticated && (
              <Link href="/notifications">
                <div className="relative p-2.5 rounded-xl text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-900/30 hover:text-foreground transition-colors">
                  <Bell size={18} strokeWidth={1.8} />
                  {unread > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </div>
              </Link>
            )}

            {/* Theme toggle */}
            <div className="px-0.5">
              <ThemeToggle />
            </div>

            {/* User avatar + dropdown */}
            {isAuthenticated && typedUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                    <Avatar className="h-8 w-8 ring-2 ring-primary/20 dark:ring-primary/15">
                      {typedUser.profileImageUrl && (
                        <AvatarImage src={typedUser.profileImageUrl} alt={typedUser.nickname || "Profilo"} />
                      )}
                      <AvatarFallback className="bg-orange-100 dark:bg-orange-900/30 text-primary text-sm font-bold">
                        {typedUser.nickname?.[0]?.toUpperCase() || typedUser.firstName?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" align="end" className="w-56 mt-1">
                  <div className="px-3 py-2.5 border-b border-stone-100 dark:border-[#2F3D4D]">
                    <div className="text-[13px] font-semibold text-foreground truncate">
                      {typedUser.firstName
                        ? `${typedUser.firstName} ${typedUser.lastName || ""}`.trim()
                        : typedUser.email?.split("@")[0]}
                    </div>
                    {rolesData && (
                      <div className="flex items-center gap-1 mt-0.5">
                        {(() => { const Icon = roleIcons[rolesData.activeRole] || User; return <Icon className="h-3 w-3 text-primary" />; })()}
                        <span className="text-xs text-primary font-medium">
                          {roleLabels[rolesData.activeRole] || rolesData.activeRole}
                        </span>
                      </div>
                    )}
                  </div>

                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center gap-2 text-[13px] cursor-pointer">
                      <User className="h-3.5 w-3.5" />
                      Il mio profilo
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/activity" className="flex items-center gap-2 text-[13px] cursor-pointer">
                      <Activity className="h-3.5 w-3.5" />
                      Attività
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/my-stats" className="flex items-center gap-2 text-[13px] cursor-pointer">
                      <span className="text-sm">📊</span>
                      Statistiche
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/my-cellar" className="flex items-center gap-2 text-[13px] cursor-pointer">
                      <span className="text-sm">🍷</span>
                      Cantina
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/my-wishlist" className="flex items-center gap-2 text-[13px] cursor-pointer">
                      <span className="text-sm">❤️</span>
                      Wishlist
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/activity" className="flex items-center gap-2 text-[13px] cursor-pointer">
                      <span className="text-sm">👥</span>
                      Feed amici
                    </Link>
                  </DropdownMenuItem>

                  {rolesData && rolesData.roles.length > 1 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-[11px] text-muted-foreground font-normal px-3 uppercase tracking-wider">
                        Cambia ruolo
                      </DropdownMenuLabel>
                      {rolesData.roles
                        .filter((r) => r !== rolesData.activeRole)
                        .map((role) => {
                          const Icon = roleIcons[role] || User;
                          return (
                            <DropdownMenuItem
                              key={role}
                              className="flex items-center gap-2 text-[13px] cursor-pointer"
                              onClick={() => switchRoleMutation.mutate(role)}
                              disabled={switchRoleMutation.isPending}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {roleLabels[role] || role}
                            </DropdownMenuItem>
                          );
                        })}
                    </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="flex items-center gap-2 text-[13px] text-red-600 dark:text-red-400 cursor-pointer"
                    onClick={() =>
                      fetch("/api/auth/logout", { method: "POST", credentials: "include" }).then(
                        () => setLocation("/")
                      )
                    }
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Esci
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-900/30 hover:text-foreground transition-colors">
                  <User size={16} strokeWidth={1.8} />
                  Accedi
                </div>
              </Link>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
