import { Link, useLocation } from "wouter";
import { Home, Building2, Store, CalendarDays, Search, Bell, User, Beer, LogOut, Activity, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import SearchDialog from "@/components/search-dialog";
import { useState } from "react";
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
  const [location] = useLocation();
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
    { icon: Building2, label: "Birrifici", href: "/explore/breweries" },
    { icon: Store, label: "Pub", href: "/explore/pubs" },
    { icon: CalendarDays, label: "Festival", href: "/festival" },
  ];

  const unread = unreadData?.count ?? 0;

  function NavBtn({
    icon: Icon, label, href, onClick, badge, active,
  }: { icon: any; label: string; href?: string; onClick?: () => void; badge?: number; active?: boolean }) {
    const inner = (
      <div
        title={label}
        className={`relative flex flex-col items-center gap-[3px] px-2 py-2.5 rounded-2xl transition-all w-[3.5rem] select-none ${
          active
            ? "bg-primary text-white shadow-md shadow-orange-300/40 dark:shadow-orange-900/30"
            : "text-stone-400 dark:text-stone-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-primary dark:hover:text-primary"
        }`}
      >
        <Icon size={21} strokeWidth={active ? 2.3 : 1.8} />
        <span className="text-[9px] font-bold leading-none tracking-wide">{label}</span>
        {badge && badge > 0 ? (
          <span className="absolute -top-1 -right-1 h-[15px] min-w-[15px] px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </div>
    );
    if (onClick) return <button onClick={onClick}>{inner}</button>;
    if (href) return <Link href={href}>{inner}</Link>;
    return inner;
  }

  return (
    <>
      <SearchDialog isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <aside className="hidden lg:flex flex-col items-center gap-1.5 w-[4.5rem] shrink-0 sticky top-0 h-screen py-5 border-r border-orange-100 dark:border-[hsl(25,35%,14%)] bg-white/90 dark:bg-[hsl(25,14%,9%)]/95 backdrop-blur-xl z-40">

        {/* Logo squircle */}
        <Link href="/" className="mb-5 flex-shrink-0">
          <div className="w-11 h-11 rounded-[14px] flex items-center justify-center shadow-lg shadow-orange-200/60 dark:shadow-orange-900/50"
            style={{ background: "linear-gradient(135deg, #F77104 0%, #f98a0e 50%, #f5a623 100%)" }}>
            <Beer className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
        </Link>

        {/* Main navigation */}
        <nav className="flex flex-col items-center gap-1 flex-1">
          {navItems.map((item) => (
            <NavBtn
              key={item.label}
              icon={item.icon}
              label={item.label}
              href={item.href}
              active={isActive(item.href)}
            />
          ))}
        </nav>

        {/* Bottom utilities */}
        <div className="flex flex-col items-center gap-1.5">
          <NavBtn icon={Search} label="Cerca" onClick={() => setSearchOpen(true)} />

          {isAuthenticated && (
            <NavBtn
              icon={Bell}
              label="Alert"
              href="/notifications"
              badge={unread}
              active={isActive("/notifications")}
            />
          )}

          <div className="my-0.5">
            <ThemeToggle />
          </div>

          {/* User avatar + dropdown */}
          {isAuthenticated && typedUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="mt-0.5 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                  <Avatar className="h-9 w-9 ring-2 ring-primary/20 dark:ring-primary/15">
                    {typedUser.profileImageUrl && (
                      <AvatarImage src={typedUser.profileImageUrl} alt={typedUser.nickname || "Profilo"} />
                    )}
                    <AvatarFallback className="bg-orange-100 dark:bg-orange-900/30 text-primary text-sm font-bold">
                      {typedUser.nickname?.[0]?.toUpperCase() || typedUser.firstName?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-56 mb-2">
                <div className="px-3 py-2.5 border-b border-stone-100 dark:border-stone-800">
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
                      () => (window.location.href = "/")
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
              <div className="flex flex-col items-center gap-[3px] px-2 py-2.5 rounded-2xl text-stone-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-primary transition-all w-[3.5rem]">
                <User size={21} strokeWidth={1.8} />
                <span className="text-[9px] font-bold leading-none tracking-wide">Accedi</span>
              </div>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
