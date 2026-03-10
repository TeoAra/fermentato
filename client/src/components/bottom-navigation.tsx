import { Search, User, Bell, MapPin, Home, Sparkles, ScanLine } from "lucide-react";
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

  const unreadCount = unreadData?.count && unreadData.count > 0 ? unreadData.count : undefined;

  function NavItem({ icon: Icon, label, href, isActive, badge }: {
    icon: any; label: string; href: string; isActive: boolean; badge?: number;
  }) {
    return (
      <Link href={href}>
        <div
          className={`group flex flex-col items-center justify-center py-2 px-2 rounded-2xl transition-all duration-300 transform active:scale-95 min-w-[56px] ${
            isActive
              ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20"
              : "text-gray-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-gray-50 dark:hover:bg-slate-800/50"
          }`}
        >
          <div className="relative">
            <Icon className={`h-5 w-5 transition-all duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
            {badge && badge > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center shadow-lg">
                {badge > 99 ? '99+' : badge}
              </div>
            )}
          </div>
          <span className={`text-[10px] font-medium mt-1 leading-tight transition-all duration-300 ${isActive ? 'text-amber-600 dark:text-amber-400' : ''}`}>
            {label}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-white dark:bg-gray-900 border-t-2 border-amber-100 dark:border-slate-700 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.3)]">
          {/* Extra top padding to make room for the floating FABs above the bar */}
          <div className="flex items-center justify-between px-2 pt-8 pb-3 safe-area-pb">

            {/* LEFT SIDE: Home + (Attività if auth) */}
            <div className="flex items-center gap-1">
              <NavItem
                icon={Home}
                label="Home"
                href="/"
                isActive={location === "/"}
              />
              {isAuthenticated && (
                <NavItem
                  icon={MapPin}
                  label="Attività"
                  href="/activity"
                  isActive={location.startsWith("/activity")}
                />
              )}
            </div>

            {/* CENTER SPACER — FABs float above this area */}
            <div className="flex-1 flex items-center justify-center relative" style={{ minWidth: 120 }}>
              {/* FAB buttons absolutely positioned above the bar */}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-2">
                {/* Scan FAB */}
                <Link href="/scan">
                  <button
                    data-testid="button-scan"
                    className="group bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white rounded-full p-3 shadow-xl transition-all duration-300 transform active:scale-95 hover:scale-110"
                  >
                    <ScanLine className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                    <span className="sr-only">Scansiona etichetta</span>
                  </button>
                </Link>

                {/* Search FAB */}
                <button
                  onClick={() => setIsSearchOpen(true)}
                  data-testid="button-search"
                  className="group relative bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-full p-4 shadow-2xl transition-all duration-300 transform active:scale-95 hover:scale-110 hover:shadow-amber-500/25"
                >
                  <div className="relative">
                    <Search className="h-6 w-6 transition-transform duration-300 group-hover:rotate-12" />
                    <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-white/70 animate-pulse" />
                  </div>
                  <span className="sr-only">Cerca pub, birrifici e birre</span>
                </button>
              </div>
            </div>

            {/* RIGHT SIDE: (Notifiche if auth) + Profilo/Accedi */}
            <div className="flex items-center gap-1">
              {isAuthenticated && (
                <NavItem
                  icon={Bell}
                  label="Notifiche"
                  href="/notifications"
                  isActive={location.startsWith("/notification")}
                  badge={unreadCount}
                />
              )}
              <NavItem
                icon={User}
                label={dashboardLabel}
                href={isAuthenticated ? "/dashboard" : "/login"}
                isActive={isAuthenticated ? location.startsWith("/dashboard") : location === "/login"}
              />
            </div>

          </div>
        </div>
      </nav>

      <SearchDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}
