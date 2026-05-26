import { Search, User, Home, Bell, Activity as ActivityIcon } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, lazy, Suspense, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
const FindBeerSheet = lazy(() => import("@/components/FindBeerSheet"));

// Rileva se c'è un Dialog/Sheet/AlertDialog aperto controllando la presenza
// di un overlay scuro fixed (backdrop Radix). Quando è aperto, nascondiamo
// la bottom nav così il modale ha più spazio e non ci sono sovrapposizioni.
export function useAnyModalOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const check = () => {
      const overlays = document.querySelectorAll('.fixed.inset-0');
      for (const el of overlays) {
        const cls = (el as HTMLElement).className || '';
        if (cls.includes('bg-black/') || cls.includes('bg-black\\/')) {
          setOpen(true);
          return;
        }
      }
      setOpen(false);
    };
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    check();
    return () => observer.disconnect();
  }, []);
  return open;
}

export function BottomNavigation() {
  const [location] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const anyModalOpen = useAnyModalOpen();

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });
  const unreadCount = unreadData?.count ?? 0;

  if (location.startsWith("/tv/") || location.startsWith("/festival-tv/")) return null;
  // Pagine di dettaglio: la bottom bar globale viene sostituita dal dock
  // contestuale specifico della pagina (pub, birrificio, birra, festival, evento, utente).
  if (
    location.startsWith("/pub/") ||
    location.startsWith("/pubs/") ||
    location.startsWith("/brewery/") ||
    location.startsWith("/breweries/") ||
    location.startsWith("/beer/") ||
    location.startsWith("/festival/") ||
    location.startsWith("/event/") ||
    location.startsWith("/user/") ||
    location === "/dashboard" ||
    location.startsWith("/dashboard/") ||
    location.startsWith("/pub-dashboard") ||
    location.startsWith("/brewery-dashboard") ||
    location === "/profile" ||
    location.startsWith("/profile/") ||
    location.startsWith("/user-dashboard")
  ) return null;

  const typedUser = user as any;
  const avatarUrl = typedUser?.profileImageUrl;

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  const homeActive     = isActive("/");
  const notifActive    = isActive("/notifications");
  const attivitaActive = isActive("/activity");
  const cercaActive    = searchOpen;
  const accountActive  = isActive("/profile") || isActive("/login") || isActive("/auth") || isActive("/dashboard");

  const Tab = ({
    active,
    icon,
    label,
    badge,
  }: {
    active: boolean;
    icon: ReactNode;
    label: string;
    badge?: ReactNode;
  }) => (
    <div className="flex-1 flex flex-col items-center justify-start gap-0.5 pt-2.5 cursor-pointer select-none">
      <span
        className={`relative inline-flex items-center justify-center transition-colors ${
          active ? "text-primary" : "text-stone-400 dark:text-stone-500"
        }`}
      >
        {icon}
        {badge}
      </span>
      <span
        className={`text-[10px] tracking-tight transition-colors ${
          active ? "font-semibold text-primary" : "font-medium text-stone-500 dark:text-stone-400"
        }`}
      >
        {label}
      </span>
      <span
        className={`mt-0.5 h-1 w-1 rounded-full transition-all ${
          active ? "bg-primary opacity-100 scale-100" : "opacity-0 scale-50"
        }`}
      />
    </div>
  );

  return (
    <>
      {searchOpen && (
        <Suspense fallback={null}>
          <FindBeerSheet open={searchOpen} onClose={() => setSearchOpen(false)} />
        </Suspense>
      )}

      <nav
        className={cn(
          "lg:hidden fixed bottom-0 left-0 right-0 z-[55] bg-white dark:bg-[#0B0D10] rounded-t-[32px] border-t border-x border-stone-100 dark:border-white/[0.06] shadow-[0_-10px_40px_-8px_rgba(0,0,0,0.18)] dark:shadow-[0_-10px_40px_-8px_rgba(0,0,0,0.55)] transition-transform duration-200",
          anyModalOpen && "translate-y-[120%]"
        )}
        style={{ paddingBottom: "max(env(safe-area-inset-bottom) - 16px, 0px)" }}
      >
        <div className="relative flex items-stretch h-[64px] px-2">

          {/* Home */}
          <Link href="/" className="flex-1 flex">
            <Tab
              active={homeActive}
              label="Home"
              icon={
                <Home
                  className="h-[22px] w-[22px]"
                  strokeWidth={homeActive ? 2.5 : 1.8}
                  fill={homeActive ? "currentColor" : "none"}
                  style={homeActive ? { fillOpacity: 0.12 } : {}}
                />
              }
            />
          </Link>

          {/* Notifiche */}
          <Link href="/notifications" className="flex-1 flex">
            <Tab
              active={notifActive}
              label="Notifiche"
              icon={
                <Bell
                  className="h-[22px] w-[22px]"
                  strokeWidth={notifActive ? 2.5 : 1.8}
                  fill={notifActive ? "currentColor" : "none"}
                  style={notifActive ? { fillOpacity: 0.12 } : {}}
                />
              }
              badge={
                unreadCount > 0 ? (
                  <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-[3px] leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : undefined
              }
            />
          </Link>

          {/* Spacer for FAB Cerca */}
          <div className="w-16 flex-shrink-0" aria-hidden="true" />

          {/* Attività */}
          <Link href="/activity" className="flex-1 flex">
            <Tab
              active={attivitaActive}
              label="Attività"
              icon={
                <ActivityIcon
                  className="h-[22px] w-[22px]"
                  strokeWidth={attivitaActive ? 2.5 : 1.8}
                  fill={attivitaActive ? "currentColor" : "none"}
                  style={attivitaActive ? { fillOpacity: 0.12 } : {}}
                />
              }
            />
          </Link>

          {/* Account */}
          <Link href={isAuthenticated ? "/dashboard" : "/login"} className="flex-1 flex">
            <Tab
              active={accountActive}
              label="Account"
              icon={
                avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="profilo"
                    className={`h-[22px] w-[22px] rounded-full object-cover border-2 transition-all ${
                      accountActive
                        ? "border-primary ring-1 ring-primary/30"
                        : "border-stone-200 dark:border-[#23262E]"
                    }`}
                  />
                ) : (
                  <User
                    className="h-[22px] w-[22px]"
                    strokeWidth={accountActive ? 2.5 : 1.8}
                    fill={accountActive ? "currentColor" : "none"}
                    style={accountActive ? { fillOpacity: 0.12 } : {}}
                  />
                )
              }
            />
          </Link>

          {/* FAB Cerca — centrale, sporge sopra la barra */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Cerca"
            className="absolute left-1/2 -translate-x-1/2 -top-7 w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-[0_8px_20px_rgba(232,119,34,0.45)] border-4 border-white dark:border-[#0B0D10] transition-transform active:scale-95 z-[1]"
          >
            <Search
              className="w-6 h-6"
              strokeWidth={2.5}
              fill={cercaActive ? "currentColor" : "none"}
              style={cercaActive ? { fillOpacity: 0.2 } : {}}
            />
          </button>

        </div>
      </nav>
    </>
  );
}
