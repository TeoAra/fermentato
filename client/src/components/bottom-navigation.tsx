import { Search, User, Home, Activity, Bell } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import SearchDialog from "@/components/search-dialog";

export function BottomNavigation() {
  const [location] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    enabled: isAuthenticated,
    refetchInterval: 120000,
  });
  const unread = unreadData?.count && unreadData.count > 0 ? unreadData.count : undefined;

  if (location.startsWith("/tv/") || location.startsWith("/festival-tv/")) return null;

  const typedUser = user as any;
  const activeRole = typedUser?.activeRole || typedUser?.userType || 'customer';
  const dashboardHref = isAuthenticated ? "/dashboard" : "/login";
  const profileLabel = !isAuthenticated ? "Accedi" :
    activeRole === 'pub_owner' ? "Pub" :
    activeRole === 'brewery_owner' ? "Birrificio" :
    activeRole === 'admin' ? "Admin" : "Tu";

  const isActive = (path: string) => {
    if (path === '/') return location === '/';
    return location.startsWith(path);
  };

  const navItem = (active: boolean) =>
    `flex flex-col items-center gap-0.5 px-4 py-2 rounded-full transition-all duration-200 active:scale-[0.92] ${
      active
        ? 'bg-[hsl(24,93%,49%)] text-white shadow-sm'
        : 'text-[hsl(28,8%,52%)] dark:text-[hsl(35,8%,52%)] hover:text-[hsl(24,93%,49%)]'
    }`;

  return (
    <>
      <SearchDialog isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <nav
        className="lg:hidden fixed z-50 left-1/2 -translate-x-1/2"
        style={{ bottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <div
          className="flex items-center bg-white/96 dark:bg-[hsl(25,14%,9%)]/96 backdrop-blur-xl rounded-full px-2 py-2 border border-orange-100 dark:border-[hsl(25,12%,18%)]"
          style={{ boxShadow: "0 8px 40px rgba(247,113,4,0.18), 0 4px 16px rgba(0,0,0,0.08)" }}
        >
          {/* Home */}
          <Link href="/" className="flex active:opacity-70 transition-opacity">
            <div className={navItem(isActive('/'))}>
              <Home className="h-[20px] w-[20px]" strokeWidth={isActive('/') ? 2.3 : 1.8} />
              <span className="text-[10px] leading-none font-semibold">Home</span>
            </div>
          </Link>

          {/* Notifiche */}
          <Link href="/notifications" className="flex active:opacity-70 transition-opacity">
            <div className={navItem(isActive('/notifications'))}>
              <div className="relative">
                <Bell className="h-[20px] w-[20px]" strokeWidth={isActive('/notifications') ? 2.3 : 1.8} />
                {unread && unread > 0 ? (
                  <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {unread > 9 ? '9+' : unread}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] leading-none font-semibold">Notifiche</span>
            </div>
          </Link>

          {/* Cerca — CENTER, gradient pill with glow */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex active:scale-95 transition-all duration-150 mx-1"
          >
            <div
              className="flex flex-col items-center gap-0.5 px-5 py-2 rounded-full text-white"
              style={{
                background: "linear-gradient(135deg, #F77104 0%, #f98a0e 50%, #f5a623 100%)",
                boxShadow: "0 4px 16px rgba(247,113,4,0.45), 0 1px 4px rgba(247,113,4,0.2)",
              }}
            >
              <Search className="h-[20px] w-[20px]" strokeWidth={2.3} />
              <span className="text-[10px] leading-none font-bold">Cerca</span>
            </div>
          </button>

          {/* Attività */}
          <Link href="/activity" className="flex active:opacity-70 transition-opacity">
            <div className={navItem(isActive('/activity'))}>
              <Activity className="h-[20px] w-[20px]" strokeWidth={isActive('/activity') ? 2.3 : 1.8} />
              <span className="text-[10px] leading-none font-semibold">Attività</span>
            </div>
          </Link>

          {/* Tu / Profilo */}
          <Link href={dashboardHref} className="flex active:opacity-70 transition-opacity">
            <div className={navItem(isActive('/dashboard') || isActive('/profile') || location === '/login')}>
              <User className="h-[20px] w-[20px]" strokeWidth={(isActive('/dashboard') || isActive('/profile') || location === '/login') ? 2.3 : 1.8} />
              <span className="text-[10px] leading-none font-semibold">{profileLabel}</span>
            </div>
          </Link>
        </div>
      </nav>
    </>
  );
}
