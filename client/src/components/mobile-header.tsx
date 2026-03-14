import { Menu, X, LogOut, LogIn, User, Store, Beer, Shield, Search, ChevronRight, MapPin, Home, Bell } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const { data: rolesData } = useQuery<{ roles: string[]; activeRole: string }>({
    queryKey: ["/api/auth/roles"],
    enabled: isAuthenticated && (typedUser?.roles?.length ?? 0) > 1,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    enabled: isAuthenticated,
    refetchInterval: 120000,
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

  const exploreItems = [
    { icon: Beer, label: "Esplora Birre", href: "/search", desc: "Oltre 1 milione di birre" },
    { icon: Building2Icon, label: "Birrifici", href: "/explore/breweries", desc: "Scopri i birrifici" },
    { icon: MapPin, label: "Pub & Locali", href: "/explore/pubs", desc: "Trova dove berla" },
  ];

  const activeRole = (typedUser as any)?.activeRole || typedUser?.userType || 'customer';

  function MenuItem({ href, icon: Icon, label, desc, onClick }: { href: string; icon: any; label: string; desc?: string; onClick?: () => void }) {
    const isActive = location === href || (href !== '/' && location.startsWith(href));
    return (
      <Link href={href} onClick={() => { onMenuToggle(); onClick?.(); }}>
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive ? 'bg-amber-50 dark:bg-amber-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
          <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${isActive ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-semibold ${isActive ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>{label}</div>
            {desc && <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{desc}</div>}
          </div>
          <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
        </div>
      </Link>
    );
  }

  return (
    <>
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16">
        {/* Frosted background */}
        <div className="absolute inset-0 bg-white/88 dark:bg-[hsl(25,14%,7%)]/92 backdrop-blur-xl border-b border-[hsl(36,14%,88%)]/70 dark:border-[hsl(25,12%,14%)]/80" />
        <div className="relative flex items-center justify-between px-4 h-full">
          <Link href="/">
            <img src="/logo-full.png" alt="Fermenta.to" className="h-9 w-auto block dark:hidden" />
            <img src="/logo-dark-mode.png" alt="Fermenta.to" className="h-9 w-auto hidden dark:block" />
          </Link>

          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2.5 text-[hsl(28,8%,52%)] dark:text-[hsl(35,8%,52%)] hover:text-[hsl(35,90%,42%)] dark:hover:text-[hsl(38,88%,58%)] hover:bg-[hsl(36,14%,93%)] dark:hover:bg-[hsl(25,12%,13%)] rounded-xl transition-colors"
              aria-label="Cerca"
            >
              <Search className="h-5 w-5" />
            </button>

            {isAuthenticated && typedUser && (
              <Link href="/notifications" className="relative p-2.5">
                <Bell className="h-5 w-5 text-[hsl(28,8%,52%)] dark:text-[hsl(35,8%,52%)] hover:text-[hsl(35,90%,42%)] dark:hover:text-[hsl(38,88%,58%)] transition-colors" />
                {(unreadData?.count ?? 0) > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {(unreadData?.count ?? 0) > 9 ? '9+' : unreadData?.count}
                  </span>
                )}
              </Link>
            )}

            {isAuthenticated && typedUser && (
              <Link href="/dashboard">
                <Avatar className="h-8 w-8 ring-2 ring-[hsl(38,80%,82%)] dark:ring-[hsl(35,40%,28%)]">
                  {typedUser.profileImageUrl && (
                    <AvatarImage src={typedUser.profileImageUrl} alt={typedUser.nickname || 'Profilo'} />
                  )}
                  <AvatarFallback className="bg-[hsl(38,80%,93%)] dark:bg-[hsl(35,30%,18%)] text-[hsl(35,90%,38%)] dark:text-[hsl(38,88%,60%)] text-sm font-semibold">
                    {typedUser.nickname?.[0]?.toUpperCase() || typedUser.firstName?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Link>
            )}

            <ThemeToggle />

            <button
              onClick={onMenuToggle}
              className="p-2.5 text-[hsl(28,8%,52%)] dark:text-[hsl(35,8%,52%)] hover:text-[hsl(35,90%,42%)] dark:hover:text-[hsl(38,88%,58%)] hover:bg-[hsl(36,14%,93%)] dark:hover:bg-[hsl(25,12%,13%)] rounded-xl transition-colors"
              aria-label={isMenuOpen ? "Chiudi menu" : "Apri menu"}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <Sheet open={isMenuOpen} onOpenChange={(open) => { if (!open) onMenuToggle(); }}>
        <SheetContent side="right" className="w-[300px] p-0 flex flex-col bg-white dark:bg-slate-900 border-l border-gray-100 dark:border-slate-800">
          <SheetTitle className="sr-only">Menu di navigazione</SheetTitle>
          {/* User Profile Header */}
          <div className="px-5 pt-6 pb-4 border-b border-gray-100 dark:border-slate-800">
            {isAuthenticated && typedUser ? (
              <Link href="/dashboard" onClick={onMenuToggle}>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 ring-2 ring-amber-200 dark:ring-amber-800">
                    {typedUser.profileImageUrl && (
                      <AvatarImage src={typedUser.profileImageUrl} alt={typedUser.nickname || 'Profilo'} />
                    )}
                    <AvatarFallback className="bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400 text-lg font-bold">
                      {typedUser.nickname?.[0]?.toUpperCase() || typedUser.firstName?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white truncate">
                      {typedUser.nickname || typedUser.firstName || typedUser.email?.split('@')[0]}
                    </div>
                    {rolesData && (
                      <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                        {roleLabels[rolesData.activeRole] || rolesData.activeRole}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-800">
                  <User className="h-6 w-6 text-gray-400" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Ospite</div>
                  <button
                    onClick={() => { onMenuToggle(); window.location.href = '/login'; }}
                    className="text-xs text-amber-600 dark:text-amber-400 font-medium"
                  >
                    Accedi o registrati →
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
            {/* Home */}
            <MenuItem href="/" icon={Home} label="Home" />

            {/* Separator + Esplora */}
            <div className="px-4 pt-3 pb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Esplora</span>
            </div>
            <MenuItem href="/search" icon={Search} label="Ricerca avanzata" desc="Database di oltre 1M di birre" />
            <MenuItem href="/explore/breweries" icon={Building2Icon} label="Birrifici" desc="Artigianali italiani e internazionali" />
            <MenuItem href="/explore/pubs" icon={MapPin} label="Pub & Locali" desc="Dove bere artigianale in Italia" />

            {isAuthenticated && (
              <>
                <div className="px-4 pt-3 pb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Account</span>
                </div>
                <MenuItem href="/dashboard" icon={User} label="Il mio profilo" />
                {isAuthenticated && (
                  <MenuItem href="/activity" icon={Bell} label="Attività" />
                )}
                {isAuthenticated && (
                  <MenuItem href="/notifications" icon={Bell} label="Notifiche" />
                )}
                {((user as any)?.activeRole === 'admin' || (!(user as any)?.activeRole && (user as any)?.userType === 'admin')) && (
                  <MenuItem href="/admin" icon={Shield} label="Admin Panel" />
                )}
              </>
            )}

            {/* Role switcher */}
            {rolesData && rolesData.roles.length > 1 && (
              <>
                <div className="px-4 pt-3 pb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Cambia modalità</span>
                </div>
                {rolesData.roles.filter(role => role !== rolesData.activeRole).map(role => {
                  const Icon = roleIcons[role] || User;
                  return (
                    <button
                      key={role}
                      onClick={() => switchRoleMutation.mutate(role)}
                      disabled={switchRoleMutation.isPending}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">Passa a {roleLabels[role]}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Bottom actions */}
          <div className="px-3 py-4 border-t border-gray-100 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Tema</span>
              <ThemeToggle />
            </div>
            {isAuthenticated ? (
              <button
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                onClick={() => {
                  onMenuToggle();
                  fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
                    .then(() => window.location.href = '/');
                }}
                data-testid="logout-button-mobile"
              >
                <LogOut className="h-5 w-5" />
                <span className="text-sm font-semibold">Esci</span>
              </button>
            ) : (
              <button
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                onClick={() => { onMenuToggle(); window.location.href = '/login'; }}
              >
                <LogIn className="h-5 w-5" />
                <span className="text-sm font-semibold">Accedi</span>
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <SearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}

function Building2Icon(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>
    </svg>
  );
}
