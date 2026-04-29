import { Menu, X, LogOut, LogIn, User, Store, Beer, Shield, Search, ChevronRight, MapPin, Home, Bell, Activity, QrCode, Building2 } from "lucide-react";
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
  const [location, setLocation] = useLocation();
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

  const { data: myFestivals } = useQuery<any[]>({
    queryKey: ['/api/admin/festivals'],
    enabled: isAuthenticated,
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
    { icon: Beer, label: "Esplora Birre", href: "/explore/beers", desc: "Oltre 1 milione di birre" },
    { icon: Building2Icon, label: "Birrifici", href: "/explore/breweries", desc: "Scopri i birrifici" },
    { icon: MapPin, label: "Pub & Locali", href: "/explore/pubs", desc: "Trova dove berla" },
    { icon: QrCode, label: "Festival", href: "/festival", desc: "Festival di birra artigianale" },
  ];

  const activeRole = (typedUser as any)?.activeRole || typedUser?.userType || 'customer';

  function MenuItem({ href, icon: Icon, label, desc, onClick }: { href: string; icon: any; label: string; desc?: string; onClick?: () => void }) {
    const isActive = location === href || (href !== '/' && location.startsWith(href));
    return (
      <Link href={href} onClick={() => { onMenuToggle(); onClick?.(); }}>
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${isActive ? 'bg-orange-50 dark:bg-orange-900/20' : 'hover:bg-stone-50 dark:hover:bg-stone-900/20'}`}>
          <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${isActive ? 'bg-primary text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'}`}>
            <Icon className="h-4.5 w-4.5" style={{ width: '18px', height: '18px' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-semibold ${isActive ? 'text-primary' : 'text-foreground'}`}>{label}</div>
            {desc && <div className="text-xs text-stone-400 dark:text-stone-500 truncate">{desc}</div>}
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-stone-300 dark:text-stone-600 flex-shrink-0" />
        </div>
      </Link>
    );
  }

  return (
    <>
      {/* ── TOP HEADER ──────────────────────────────────────────────────── */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-[hsl(25,14%,8%)] border-b border-stone-100 dark:border-[hsl(25,12%,14%)]"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between px-4 h-14">

          {/* Logo */}
          <Link href="/">
            <img
              src="/logo-full.png"
              alt="Fermenta.to"
              className="h-8 w-auto block dark:hidden"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextSibling as HTMLElement)?.removeAttribute('hidden'); }}
            />
            <img
              src="/logo-dark-mode.png"
              alt="Fermenta.to"
              className="h-8 w-auto hidden dark:block"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
            {/* Text fallback */}
            <span className="hidden items-center gap-1.5 text-foreground font-bold text-base">
              <Beer className="h-5 w-5 text-primary" />
              <span>Fermenta<span className="text-primary">.tò</span></span>
            </span>
          </Link>

          {/* Right icons */}
          <div className="flex items-center gap-0.5">

            {/* Bell */}
            {isAuthenticated && (
              <Link href="/notifications" className="relative p-2.5">
                <Bell className="h-5 w-5 text-stone-500 dark:text-stone-400" />
                {(unreadData?.count ?? 0) > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-[14px] w-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {(unreadData?.count ?? 0) > 9 ? '9+' : unreadData?.count}
                  </span>
                )}
              </Link>
            )}

            {/* Avatar → dashboard */}
            {isAuthenticated && typedUser ? (
              <Link href="/dashboard" className="p-1.5">
                <Avatar className="h-7 w-7 ring-2 ring-stone-200 dark:ring-stone-700">
                  {typedUser.profileImageUrl && (
                    <AvatarImage src={typedUser.profileImageUrl} alt={typedUser.nickname || 'Profilo'} />
                  )}
                  <AvatarFallback className="bg-orange-50 dark:bg-orange-900/30 text-primary text-xs font-bold">
                    {typedUser.nickname?.[0]?.toUpperCase() || typedUser.firstName?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Link href="/login" className="p-2.5">
                <User className="h-5 w-5 text-stone-500 dark:text-stone-400" />
              </Link>
            )}

            {/* Hamburger */}
            <button
              onClick={onMenuToggle}
              className="p-2.5 text-stone-500 dark:text-stone-400 hover:text-primary dark:hover:text-primary hover:bg-stone-50 dark:hover:bg-stone-900/20 rounded-xl transition-colors"
              aria-label={isMenuOpen ? "Chiudi menu" : "Apri menu"}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── SLIDE-OUT MENU ──────────────────────────────────────────────── */}
      <Sheet open={isMenuOpen} onOpenChange={(open) => { if (!open) onMenuToggle(); }}>
        <SheetContent side="right" className="w-[300px] p-0 flex flex-col bg-white dark:bg-[hsl(25,14%,9%)] border-l border-stone-100 dark:border-border">
          <SheetTitle className="sr-only">Menu di navigazione</SheetTitle>

          {/* User profile header */}
          <div className="px-4 pt-5 pb-4 border-b border-stone-100 dark:border-border">
            {isAuthenticated && typedUser ? (
              <Link href="/dashboard" onClick={onMenuToggle}>
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11 ring-2 ring-stone-100 dark:ring-stone-700">
                    {typedUser.profileImageUrl && (
                      <AvatarImage src={typedUser.profileImageUrl} alt={typedUser.nickname || 'Profilo'} />
                    )}
                    <AvatarFallback className="bg-orange-50 dark:bg-orange-900/30 text-primary text-base font-bold">
                      {typedUser.nickname?.[0]?.toUpperCase() || typedUser.firstName?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground text-sm truncate">
                      {typedUser.nickname || typedUser.firstName || typedUser.email?.split('@')[0]}
                    </div>
                    {rolesData && (
                      <div className="text-xs text-primary font-medium mt-0.5">
                        {roleLabels[rolesData.activeRole] || rolesData.activeRole}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-stone-300 flex-shrink-0" />
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-11 h-11 rounded-full bg-stone-100 dark:bg-stone-800">
                  <User className="h-5 w-5 text-stone-400" />
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">Ospite</div>
                  <button
                    onClick={() => { onMenuToggle(); setLocation('/login'); }}
                    className="text-xs text-primary font-medium"
                  >
                    Accedi o registrati →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Nav items */}
          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
            <MenuItem href="/" icon={Home} label="Home" />

            <div className="px-3 pt-3 pb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">Esplora</span>
            </div>
            <MenuItem href="/explore/beers" icon={Beer} label="Birre" desc="Catalogo di oltre 1M di birre" />
            <MenuItem href="/explore/breweries" icon={Building2Icon} label="Birrifici" desc="Artigianali italiani e internazionali" />
            <MenuItem href="/explore/pubs" icon={MapPin} label="Pub & Locali" desc="Dove bere artigianale in Italia" />
            <MenuItem href="/festival" icon={QrCode} label="Festival" desc="Festival di birra artigianale" />

            {isAuthenticated && (
              <>
                <div className="px-3 pt-3 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">Account</span>
                </div>
                <MenuItem href="/dashboard" icon={User} label="Il mio profilo" />
                <MenuItem href="/activity" icon={Activity} label="Attività" />
                <MenuItem href="/notifications" icon={Bell} label="Notifiche" />
                {((user as any)?.activeRole === 'admin' || (!(user as any)?.activeRole && (user as any)?.userType === 'admin')) && (
                  <MenuItem href="/admin" icon={Shield} label="Admin Panel" />
                )}

                <div className="px-3 pt-3 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">Festival</span>
                </div>
                {myFestivals && myFestivals.length > 0 ? (
                  <>
                    <MenuItem href="/festival-dashboard" icon={QrCode} label="Festival Dashboard" desc={`${myFestivals.length} festival attiv${myFestivals.length > 1 ? 'i' : 'o'}`} />
                    <MenuItem href="/festival" icon={Building2} label="Crea un nuovo festival" />
                  </>
                ) : (
                  <MenuItem href="/festival" icon={QrCode} label="Festival Mode" desc="Crea il tuo festival birra" />
                )}
              </>
            )}

            {/* Role switcher */}
            {rolesData && rolesData.roles.length > 1 && (
              <>
                <div className="px-3 pt-3 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">Cambia modalità</span>
                </div>
                {rolesData.roles.filter(role => role !== rolesData.activeRole).map(role => {
                  const Icon = roleIcons[role] || User;
                  return (
                    <button
                      key={role}
                      onClick={() => switchRoleMutation.mutate(role)}
                      disabled={switchRoleMutation.isPending}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-900/20 transition-colors"
                    >
                      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400">
                        <Icon style={{ width: '18px', height: '18px' }} />
                      </div>
                      <span className="text-sm font-semibold text-foreground">Passa a {roleLabels[role]}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Footer: theme + logout */}
          <div className="px-2 py-3 border-t border-stone-100 dark:border-border space-y-0.5">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-stone-500 dark:text-stone-400 font-medium">Tema</span>
              <ThemeToggle />
            </div>
            {isAuthenticated ? (
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                onClick={() => {
                  onMenuToggle();
                  fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
                    .then(() => setLocation('/'));
                }}
                data-testid="logout-button-mobile"
              >
                <LogOut className="h-4.5 w-4.5" style={{ width: '18px', height: '18px' }} />
                <span className="text-sm font-semibold">Esci</span>
              </button>
            ) : (
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-primary hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                onClick={() => { onMenuToggle(); setLocation('/login'); }}
              >
                <LogIn className="h-4.5 w-4.5" style={{ width: '18px', height: '18px' }} />
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
