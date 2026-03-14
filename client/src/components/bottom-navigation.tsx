import { Search, User, Bell, MapPin, Home, ScanLine } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import SearchDialog from "./search-dialog";

export function BottomNavigation() {
  const [location] = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    enabled: isAuthenticated,
    refetchInterval: 120000,
  });

  if (location === '/search' || location === '/scan') return null;

  const typedUser = user as any;
  const activeRole = typedUser?.activeRole || typedUser?.userType || 'customer';

  const dashboardLabel = !isAuthenticated ? "Accedi" :
    activeRole === 'pub_owner' ? "Gestione" :
    activeRole === 'brewery_owner' ? "Birrificio" :
    activeRole === 'admin' ? "Admin" :
    "Profilo";

  const dashboardHref = isAuthenticated ? "/dashboard" : "/login";

  const unreadCount = unreadData?.count && unreadData.count > 0 ? unreadData.count : undefined;

  function NavItem({ icon: Icon, label, href, isActive, badge }: {
    icon: any; label: string; href: string; isActive: boolean; badge?: number;
  }) {
    return (
      <Link href={href}>
        <div className={`flex flex-col items-center justify-center py-1.5 px-3 min-w-[52px] transition-all duration-200 active:scale-90 ${
          isActive
            ? "text-[hsl(35,90%,40%)] dark:text-[hsl(38,88%,58%)]"
            : "text-[hsl(28,8%,52%)] dark:text-[hsl(35,8%,52%)]"
        }`}>
          <div className="relative mb-0.5">
            <Icon className={`h-[22px] w-[22px] transition-all duration-200 ${isActive ? 'stroke-[2.2px]' : 'stroke-[1.7px]'}`} />
            {badge && badge > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-3.5 h-3.5 text-[9px] font-bold bg-red-500 text-white rounded-full">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </div>
          <span className={`text-[10px] leading-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
            {label}
          </span>
          {isActive && (
            <span className="mt-0.5 w-4 h-[2.5px] rounded-full bg-[hsl(35,90%,42%)] dark:bg-[hsl(38,88%,56%)]" />
          )}
        </div>
      </Link>
    );
  }

  function SearchItem() {
    const isActive = isSearchOpen;
    return (
      <button
        onClick={() => setIsSearchOpen(true)}
        data-testid="button-search"
        className={`flex flex-col items-center justify-center py-1.5 px-3 min-w-[52px] transition-all duration-200 active:scale-90 ${
          isActive
            ? "text-[hsl(35,90%,40%)] dark:text-[hsl(38,88%,58%)]"
            : "text-[hsl(28,8%,52%)] dark:text-[hsl(35,8%,52%)]"
        }`}
      >
        <Search className="h-[22px] w-[22px] mb-0.5 stroke-[1.7px]" />
        <span className="text-[10px] leading-tight font-medium">Cerca</span>
      </button>
    );
  }

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-white/88 dark:bg-[hsl(25,14%,7%)]/92 backdrop-blur-xl border-t border-[hsl(36,14%,88%)]/70 dark:border-[hsl(25,12%,14%)]/80" />

        <div className="relative flex items-center justify-around px-1 pt-1.5" style={{ paddingBottom: `max(env(safe-area-inset-bottom), 8px)` }}>

          <NavItem icon={Home} label="Home" href="/" isActive={location === "/"} />
          <NavItem icon={MapPin} label="Pub" href="/explore/pubs" isActive={location.startsWith("/explore/pubs")} />
          <SearchItem />

          {isAuthenticated && (
            <NavItem
              icon={Bell}
              label="Notifiche"
              href="/notifications"
              isActive={location.startsWith("/notifications")}
              badge={unreadCount}
            />
          )}

          {activeRole === 'admin' && (
            <Link href="/scan">
              <div className={`flex flex-col items-center justify-center py-1.5 px-3 min-w-[52px] transition-all duration-200 active:scale-90 ${
                location === '/scan'
                  ? "text-[hsl(35,90%,40%)] dark:text-[hsl(38,88%,58%)]"
                  : "text-[hsl(28,8%,52%)] dark:text-[hsl(35,8%,52%)]"
              }`}>
                <ScanLine className="h-[22px] w-[22px] mb-0.5 stroke-[1.7px]" />
                <span className="text-[10px] leading-tight font-medium">Scan</span>
              </div>
            </Link>
          )}

          <NavItem
            icon={User}
            label={dashboardLabel}
            href={dashboardHref}
            isActive={
              location.startsWith("/dashboard") ||
              location.startsWith("/profile") ||
              location.startsWith("/login")
            }
          />

        </div>
      </nav>

      <SearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
