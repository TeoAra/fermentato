import { Search, User, Home, ScanLine, Bell, Activity } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import SearchDialog from "@/components/search-dialog";

export function BottomNavigation() {
  const [location] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  if (location.startsWith("/tv/") || location.startsWith("/festival-tv/")) return null;

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });
  const unreadCount = unreadData?.count ?? 0;

  const typedUser = user as any;
  const avatarUrl = typedUser?.profileImageUrl;

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  const homeActive     = isActive("/");
  const notifActive    = isActive("/notifications");
  const attivitaActive = isActive("/social-feed") || isActive("/activity");
  const cercaActive    = searchOpen;
  const scanActive     = isActive("/scan");
  const accountActive  = isActive("/profile");

  const Tab = ({ active, children }: { active: boolean; children: ReactNode }) => (
    <div className={`flex flex-col items-center justify-center gap-[3px] flex-1 pt-2 pb-1 min-h-[52px] transition-colors active:scale-95 relative ${
      active ? "text-primary" : "text-stone-400 dark:text-stone-500"
    }`}>
      {active && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2.5px] rounded-full bg-primary" />
      )}
      {children}
    </div>
  );

  return (
    <>
      <SearchDialog isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[hsl(25,14%,9%)] border-t border-stone-100 dark:border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* ── Raised center buttons: Cerca (orange circle) + Scan ── */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-[46px] flex items-end gap-2.5 pointer-events-none">

          {/* Cerca — orange circle */}
          <button
            onClick={() => setSearchOpen(true)}
            className={`pointer-events-auto w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 ${
              cercaActive
                ? "bg-primary shadow-primary/40 scale-105"
                : "bg-primary shadow-primary/25 hover:bg-primary/90"
            }`}
          >
            <Search className="h-[22px] w-[22px] text-white" strokeWidth={2.3} />
          </button>

          {/* Scan — smaller secondary circle */}
          <Link href="/scan" className="pointer-events-auto relative">
            <div className={`w-[44px] h-[44px] rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 ${
              scanActive
                ? "bg-stone-800 dark:bg-stone-700 shadow-black/30"
                : "bg-stone-100 dark:bg-stone-800 shadow-black/10 hover:bg-stone-200 dark:hover:bg-stone-700"
            }`}>
              <ScanLine
                className={`h-[20px] w-[20px] ${scanActive ? "text-white" : "text-stone-500 dark:text-stone-400"}`}
                strokeWidth={2.2}
              />
            </div>
            <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[7px] font-black px-[3px] py-[1.5px] rounded-full leading-none tracking-tight">β</span>
          </Link>
        </div>

        <div className="flex items-stretch">
          {/* ── LEFT: Home ── */}
          <Link href="/" className="flex-1 flex">
            <Tab active={homeActive}>
              <Home
                className="h-[22px] w-[22px]"
                strokeWidth={homeActive ? 2.4 : 1.8}
                fill={homeActive ? "currentColor" : "none"}
                style={homeActive ? { fillOpacity: 0.15, strokeOpacity: 1 } : {}}
              />
              <span className="text-[10px] font-semibold leading-none">Home</span>
            </Tab>
          </Link>

          {/* ── LEFT: Notifiche ── */}
          <Link href="/notifications" className="flex-1 flex">
            <Tab active={notifActive}>
              <div className="relative">
                <Bell
                  className="h-[22px] w-[22px]"
                  strokeWidth={notifActive ? 2.4 : 1.8}
                  fill={notifActive ? "currentColor" : "none"}
                  style={notifActive ? { fillOpacity: 0.15, strokeOpacity: 1 } : {}}
                />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-[3px] leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold leading-none">Notifiche</span>
            </Tab>
          </Link>

          {/* ── CENTER spacer — raised buttons sit above here ── */}
          <div className="flex-[1.6]" />

          {/* ── RIGHT: Attività ── */}
          <Link href="/social-feed" className="flex-1 flex">
            <Tab active={attivitaActive}>
              <Activity
                className="h-[22px] w-[22px]"
                strokeWidth={attivitaActive ? 2.4 : 1.8}
              />
              <span className="text-[10px] font-semibold leading-none">Attività</span>
            </Tab>
          </Link>

          {/* ── RIGHT: Account ── */}
          <Link href="/profile" className="flex-1 flex">
            <Tab active={accountActive}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="profilo"
                  className={`h-[22px] w-[22px] rounded-full object-cover border-2 transition-colors ${
                    accountActive ? "border-primary" : "border-stone-200 dark:border-stone-600"
                  }`}
                />
              ) : (
                <User
                  className="h-[22px] w-[22px]"
                  strokeWidth={accountActive ? 2.4 : 1.8}
                  fill={accountActive ? "currentColor" : "none"}
                  style={accountActive ? { fillOpacity: 0.15, strokeOpacity: 1 } : {}}
                />
              )}
              <span className="text-[10px] font-semibold leading-none">Account</span>
            </Tab>
          </Link>
        </div>
      </nav>
    </>
  );
}
