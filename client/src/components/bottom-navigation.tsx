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
  const attivitaActive = isActive("/social-feed") || isActive("/activity");
  const cercaActive    = searchOpen;
  const scanActive     = isActive("/scan");
  const accountActive  = isActive("/profile");

  // Standard tab (icon + label)
  const Tab = ({
    active,
    children,
  }: {
    active: boolean;
    children: ReactNode;
  }) => (
    <div
      className={`flex flex-col items-center justify-center gap-[3px] flex-1 pt-2 pb-1 min-h-[52px] transition-colors active:scale-95 relative ${
        active ? "text-primary" : "text-stone-400 dark:text-stone-500"
      }`}
    >
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
        {/* Cerca — raised pill above the bar, full-width centered */}
        <div className="absolute left-0 right-0 -top-[26px] flex justify-center pointer-events-none">
          <button
            onClick={() => setSearchOpen(true)}
            className={`pointer-events-auto flex items-center gap-2 px-6 py-2.5 rounded-full shadow-lg shadow-black/10 border transition-all active:scale-95 ${
              cercaActive
                ? "bg-primary text-white border-primary shadow-primary/30"
                : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300"
            }`}
          >
            <Search className="h-[17px] w-[17px]" strokeWidth={2.2} />
            <span className="text-[13px] font-bold tracking-tight">Cerca</span>
          </button>
        </div>

        <div className="flex items-stretch">
          {/* Home */}
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

          {/* Attività */}
          <Link href="/social-feed" className="flex-1 flex">
            <Tab active={attivitaActive}>
              <Activity
                className="h-[22px] w-[22px]"
                strokeWidth={attivitaActive ? 2.4 : 1.8}
              />
              <span className="text-[10px] font-semibold leading-none">Attività</span>
            </Tab>
          </Link>

          {/* Center spacer — the raised Cerca button lives above here */}
          <div className="flex-[1.2]" />

          {/* Scan */}
          <Link href="/scan" className="flex-1 flex">
            <Tab active={scanActive}>
              <div className="relative">
                <ScanLine
                  className="h-[22px] w-[22px]"
                  strokeWidth={scanActive ? 2.4 : 1.8}
                />
                <span className="absolute -top-1 -right-2.5 bg-primary text-white text-[7px] font-black px-[3px] py-[1px] rounded-full leading-none tracking-tight">β</span>
              </div>
              <span className="text-[10px] font-semibold leading-none">Scan</span>
            </Tab>
          </Link>

          {/* Account */}
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
