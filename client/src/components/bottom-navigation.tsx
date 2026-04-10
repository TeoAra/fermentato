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
  const attivitaActive = isActive("/activity") || isActive("/social-feed");
  const cercaActive    = searchOpen;
  const scanActive     = isActive("/scan");
  const accountActive  = isActive("/profile");

  const Tab = ({ active, children }: { active: boolean; children: ReactNode }) => (
    <div className={`flex flex-col items-center justify-center gap-[3px] flex-1 py-2 min-h-[52px] transition-colors active:scale-95 relative ${
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
        <div className="flex items-stretch">

          {/* Home */}
          <Link href="/" className="flex-1 flex">
            <Tab active={homeActive}>
              <Home className="h-[22px] w-[22px]" strokeWidth={homeActive ? 2.4 : 1.8}
                fill={homeActive ? "currentColor" : "none"}
                style={homeActive ? { fillOpacity: 0.15 } : {}} />
              <span className="text-[10px] font-semibold leading-none">Home</span>
            </Tab>
          </Link>

          {/* Notifiche */}
          <Link href="/notifications" className="flex-1 flex">
            <Tab active={notifActive}>
              <div className="relative">
                <Bell className="h-[22px] w-[22px]" strokeWidth={notifActive ? 2.4 : 1.8}
                  fill={notifActive ? "currentColor" : "none"}
                  style={notifActive ? { fillOpacity: 0.15 } : {}} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-[3px] leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold leading-none">Notifiche</span>
            </Tab>
          </Link>

          {/* Cerca — uniform, same style as all other tabs */}
          <button onClick={() => setSearchOpen(true)} className="flex-1 flex">
            <Tab active={cercaActive}>
              <Search className="h-[22px] w-[22px]" strokeWidth={cercaActive ? 2.4 : 1.8}
                fill={cercaActive ? "currentColor" : "none"}
                style={cercaActive ? { fillOpacity: 0.15 } : {}} />
              <span className="text-[10px] font-semibold leading-none">Cerca</span>
            </Tab>
          </button>

          {/* Scan — inline, β badge */}
          <Link href="/scan" className="flex-1 flex">
            <Tab active={scanActive}>
              <div className="relative">
                <ScanLine className="h-[22px] w-[22px]" strokeWidth={scanActive ? 2.4 : 1.8} />
                <span className="absolute -top-1 -right-2 bg-primary text-white text-[7px] font-black px-[3px] py-[1px] rounded-full leading-none">β</span>
              </div>
              <span className="text-[10px] font-semibold leading-none">Scan</span>
            </Tab>
          </Link>

          {/* Attività */}
          <Link href="/activity" className="flex-1 flex">
            <Tab active={attivitaActive}>
              <Activity className="h-[22px] w-[22px]" strokeWidth={attivitaActive ? 2.4 : 1.8} />
              <span className="text-[10px] font-semibold leading-none">Attività</span>
            </Tab>
          </Link>

          {/* Account */}
          <Link href="/profile" className="flex-1 flex">
            <Tab active={accountActive}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="profilo"
                  className={`h-[22px] w-[22px] rounded-full object-cover border-2 transition-colors ${
                    accountActive ? "border-primary" : "border-stone-200 dark:border-stone-600"
                  }`} />
              ) : (
                <User className="h-[22px] w-[22px]" strokeWidth={accountActive ? 2.4 : 1.8}
                  fill={accountActive ? "currentColor" : "none"}
                  style={accountActive ? { fillOpacity: 0.15 } : {}} />
              )}
              <span className="text-[10px] font-semibold leading-none">Account</span>
            </Tab>
          </Link>

        </div>
      </nav>
    </>
  );
}
