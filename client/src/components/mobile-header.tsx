import { Menu, X, LogOut, LogIn, User, Store, Beer, Shield, Bell, Activity, QrCode, Building2, Zap, Star, MapPin, ChevronRight, Home, PlusCircle, MessageSquare } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { User as UserType } from "@shared/schema";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState, useEffect } from "react";
import FindBeerSheet from "@/components/FindBeerSheet";

function useScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

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

function Building2Icon(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>
    </svg>
  );
}

export function MobileHeader({ onMenuToggle, isMenuOpen }: MobileHeaderProps) {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const typedUser = user as UserType | undefined;
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const scrolled = useScrolled(12);

  const { data: rolesData } = useQuery<{ roles: string[]; activeRole: string }>({
    queryKey: ["/api/auth/roles"],
    enabled: isAuthenticated && (typedUser?.roles?.length ?? 0) > 1,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    enabled: isAuthenticated,
    refetchInterval: 120000,
  });

  const { data: userStats } = useQuery<{ totalCheckins: number; totalReviews: number }>({
    queryKey: ['/api/user/stats'],
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
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

  const activeRole = (typedUser as any)?.activeRole || typedUser?.userType || 'customer';

  function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
      <div className="px-4 pt-4 pb-1.5">
        <span className="text-[10px] font-black uppercase tracking-[0.08em] text-stone-400 dark:text-stone-500">{children}</span>
      </div>
    );
  }

  function MenuItem({ href, icon: Icon, label, desc, badge, onClick }: { href: string; icon: any; label: string; desc?: string; badge?: number; onClick?: () => void }) {
    const isActive = location === href || (href !== '/' && location.startsWith(href));
    return (
      <Link href={href} onClick={() => { onMenuToggle(); onClick?.(); }}>
        <div className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl transition-colors tap-scale ${isActive ? 'bg-primary/8 dark:bg-primary/12' : 'hover:bg-stone-50 dark:hover:bg-white/5'}`}>
          <div className={`flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 ${isActive ? 'bg-primary text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'}`}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-semibold leading-snug ${isActive ? 'text-primary' : 'text-foreground'}`}>{label}</div>
            {desc && <div className="text-xs text-muted-foreground truncate mt-0.5">{desc}</div>}
          </div>
          {badge != null && badge > 0 ? (
            <span className="min-w-[20px] h-5 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center px-1.5 flex-shrink-0 animate-bounce-subtle">
              {badge > 9 ? '9+' : badge}
            </span>
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-stone-300 dark:text-stone-600 flex-shrink-0" />
          )}
        </div>
      </Link>
    );
  }

  function ActionItem({ icon: Icon, label, color, onClick }: { icon: any; label: string; color: string; onClick: () => void }) {
    return (
      <button onClick={onClick} className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-white/5 transition-colors tap-scale w-full text-left">
        <div className={`flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 ${color}`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </button>
    );
  }

  return (
    <>
      {/* ── TOP HEADER ──────────────────────────────────────────────────── */}
      <header
        className={`lg:hidden fixed top-0 left-0 right-0 z-50 backdrop-blur-xl transition-[background,box-shadow,border-color] duration-200 ${
          scrolled
            ? "bg-white/98 dark:bg-[#0F0F10]/98 border-b border-stone-200/70 dark:border-white/[0.08] shadow-sm"
            : "bg-white/95 dark:bg-[#0F0F10]/95 border-b border-stone-100 dark:border-white/[0.05]"
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className={`flex items-center justify-between px-4 transition-[height] duration-200 ${scrolled ? "h-11" : "h-14"}`}>

          {/* Left: Avatar / Bell */}
          <div className="flex items-center gap-0.5">
            {/* Avatar */}
            {isAuthenticated && typedUser ? (
              <Link href="/dashboard" className="p-1 tap-scale">
                <Avatar className="h-7 w-7 ring-2 ring-stone-200 dark:ring-stone-700">
                  {typedUser.profileImageUrl && <AvatarImage src={typedUser.profileImageUrl} alt={typedUser.nickname || 'Profilo'} />}
                  <AvatarFallback className="bg-orange-50 dark:bg-orange-900/30 text-primary text-xs font-bold">
                    {typedUser.nickname?.[0]?.toUpperCase() || typedUser.firstName?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Link href="/login" className="p-2.5 tap-scale">
                <User className="h-5 w-5 text-stone-500 dark:text-stone-400" />
              </Link>
            )}
            {/* Bell */}
            {isAuthenticated && (
              <Link href="/notifications" className="relative p-2.5 tap-scale">
                <Bell className="h-5 w-5 text-stone-500 dark:text-stone-400" />
                {(unreadData?.count ?? 0) > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-[14px] w-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {(unreadData?.count ?? 0) > 9 ? '9+' : unreadData?.count}
                  </span>
                )}
              </Link>
            )}
          </div>

          {/* Logo — center */}
          <Link href="/" className="absolute left-1/2 -translate-x-1/2">
            <img src="/logo-full.png" alt="Fermenta.to" className={`w-auto block dark:hidden transition-[height] duration-200 ${scrolled ? "h-6" : "h-7"}`}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            <img src="/logo-dark-mode.png" alt="Fermenta.to" className={`w-auto hidden dark:block transition-[height] duration-200 ${scrolled ? "h-6" : "h-7"}`}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </Link>

          {/* Right: Hamburger */}
          <button
            onClick={onMenuToggle}
            className="p-2 -mr-1 text-stone-500 dark:text-stone-400 hover:text-primary dark:hover:text-primary hover:bg-stone-100 dark:hover:bg-white/8 rounded-xl transition-colors tap-scale"
            aria-label={isMenuOpen ? "Chiudi menu" : "Apri menu"}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* ── SLIDE-OUT MENU (from RIGHT) ─────────────────────────────────── */}
      <Sheet open={isMenuOpen} onOpenChange={(open) => { if (!open) onMenuToggle(); }}>
        <SheetContent
          side="right"
          className="w-[300px] p-0 flex flex-col bg-white dark:bg-[#0F0F10] border-l border-stone-100/80 dark:border-white/[0.06]"
        >
          <SheetTitle className="sr-only">Menu di navigazione</SheetTitle>

          {/* ── User Profile Header ── */}
          <div className="px-4 pt-6 pb-4 border-b border-stone-100 dark:border-white/[0.06]">
            {isAuthenticated && typedUser ? (
              <>
                <Link href="/dashboard" onClick={onMenuToggle}>
                  <div className="flex items-center gap-3 tap-scale">
                    <Avatar className="h-14 w-14 ring-2 ring-stone-100 dark:ring-white/10 flex-shrink-0">
                      {typedUser.profileImageUrl && <AvatarImage src={typedUser.profileImageUrl} alt={typedUser.nickname || 'Profilo'} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                        {typedUser.nickname?.[0]?.toUpperCase() || typedUser.firstName?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-base text-foreground truncate leading-tight">
                        {typedUser.nickname || typedUser.firstName || typedUser.email?.split('@')[0]}
                      </div>
                      <div className="text-xs text-primary font-semibold mt-0.5">
                        {roleLabels[activeRole] || 'Utente'}
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Stats row */}
                <div className="flex gap-3 mt-4">
                  <div className="flex-1 bg-stone-50 dark:bg-white/5 rounded-2xl px-3 py-2.5 text-center">
                    <div className="text-xl font-black text-foreground leading-none">
                      {userStats?.totalCheckins ?? (typedUser as any)?.checkinsCount ?? '–'}
                    </div>
                    <div className="text-[10px] font-semibold text-muted-foreground mt-0.5">Bevute</div>
                  </div>
                  <div className="flex-1 bg-stone-50 dark:bg-white/5 rounded-2xl px-3 py-2.5 text-center">
                    <div className="text-xl font-black text-foreground leading-none">
                      {userStats?.totalReviews ?? (typedUser as any)?.reviewsCount ?? '–'}
                    </div>
                    <div className="text-[10px] font-semibold text-muted-foreground mt-0.5">Recensioni</div>
                  </div>
                </div>

                {/* Vai al profilo */}
                <Link href="/dashboard" onClick={onMenuToggle}>
                  <button className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-stone-200 dark:border-white/10 text-sm font-semibold text-foreground hover:bg-stone-50 dark:hover:bg-white/5 transition-colors tap-scale">
                    Vai al profilo <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-stone-100 dark:bg-stone-800 flex-shrink-0">
                  <User className="h-6 w-6 text-stone-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base text-foreground">Ospite</div>
                  <button onClick={() => { onMenuToggle(); setLocation('/login'); }}
                    className="text-xs text-primary font-semibold mt-0.5">
                    Accedi o registrati →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Scrollable nav items ── */}
          <div className="flex-1 overflow-y-auto py-2 space-y-0.5">

            <MenuItem href="/" icon={Home} label="Home" />

            <SectionLabel>Esplora</SectionLabel>
            <MenuItem href="/explore/beers" icon={Beer} label="Catalogo birre" desc="Oltre 1M di birre" />
            <MenuItem href="/explore/breweries" icon={Building2Icon} label="Birrifici" desc="Artigianali italiani e internazionali" />
            <MenuItem href="/explore/pubs" icon={MapPin} label="Pub & Locali" desc="Dove bere artigianale in Italia" />
            <MenuItem href="/festival" icon={QrCode} label="Festival" desc="Festival di birra artigianale" />

            {isAuthenticated && (
              <>
                <SectionLabel>Azioni veloci</SectionLabel>
                <ActionItem icon={PlusCircle} label="Aggiungi bevuta" color="bg-primary/10 text-primary" onClick={() => { onMenuToggle(); setLocation('/dashboard'); }} />
                <ActionItem icon={MessageSquare} label="Scrivi recensione" color="bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400" onClick={() => { onMenuToggle(); setLocation('/activity'); }} />

                <SectionLabel>Account</SectionLabel>
                <MenuItem href="/dashboard" icon={User} label="Il mio profilo" />
                {((user as any)?.activeRole === 'pub_owner' || (user as any)?.userType === 'pub_owner') && (
                  <MenuItem href="/dashboard" icon={Store} label="Gestione Pub" desc="Taplist, menu, eventi" />
                )}
                {((user as any)?.activeRole === 'admin' || (!(user as any)?.activeRole && (user as any)?.userType === 'admin')) && (
                  <MenuItem href="/admin" icon={Shield} label="Admin Panel" />
                )}
                <MenuItem href="/activity" icon={Activity} label="Attività" />
                <MenuItem href="/notifications" icon={Bell} label="Notifiche"
                  badge={(unreadData?.count ?? 0) > 0 ? unreadData?.count : undefined} />
              </>
            )}

            {/* Role switcher */}
            {rolesData && rolesData.roles.length > 1 && (
              <>
                <SectionLabel>Modalità attiva</SectionLabel>
                <div className="mx-3 flex gap-2 p-1 bg-stone-100 dark:bg-white/5 rounded-2xl">
                  {rolesData.roles.map(role => {
                    const isActive = role === rolesData.activeRole;
                    return (
                      <button
                        key={role}
                        onClick={() => !isActive && switchRoleMutation.mutate(role)}
                        disabled={switchRoleMutation.isPending || isActive}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all tap-scale ${
                          isActive
                            ? 'bg-white dark:bg-white/10 text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {roleLabels[role] || role}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Festivals */}
            {isAuthenticated && myFestivals && myFestivals.length > 0 && (
              <>
                <SectionLabel>Festival</SectionLabel>
                <MenuItem href="/festival-dashboard" icon={QrCode} label="Festival Dashboard" desc={`${myFestivals.length} festival attiv${myFestivals.length > 1 ? 'i' : 'o'}`} />
              </>
            )}

          </div>

          {/* ── Footer: theme + logout ── */}
          <div className="px-2 py-3 border-t border-stone-100 dark:border-white/[0.06] space-y-0.5 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px)+4rem)]">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-muted-foreground font-medium">Tema</span>
              <ThemeToggle />
            </div>
            {isAuthenticated ? (
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/15 transition-colors tap-scale"
                onClick={() => {
                  onMenuToggle();
                  fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
                    .then(() => setLocation('/'));
                }}
                data-testid="logout-button-mobile"
              >
                <LogOut style={{ width: '18px', height: '18px' }} />
                <span className="text-sm font-semibold">Esci</span>
              </button>
            ) : (
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-primary hover:bg-orange-50 dark:hover:bg-primary/10 transition-colors tap-scale"
                onClick={() => { onMenuToggle(); setLocation('/login'); }}
              >
                <LogIn style={{ width: '18px', height: '18px' }} />
                <span className="text-sm font-semibold">Accedi</span>
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <FindBeerSheet open={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
