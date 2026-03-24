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

  const isSearchActive = location.startsWith("/search");

  return (
    <>
      <SearchDialog isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <div
          className="flex items-center bg-white/95 dark:bg-[hsl(25,14%,9%)]/95 backdrop-blur-xl rounded-full px-1.5 py-1.5 border border-[hsl(36,14%,88%)] dark:border-[hsl(25,12%,18%)]"
          style={{ boxShadow: "0 8px 32px rgba(247, 113, 4, 0.14), 0 2px 8px rgba(0,0,0,0.07)" }}
        >
          {/* Home */}
          <Link href="/" className="flex active:opacity-70 transition-opacity">
            <div className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full transition-all duration-200 ${
              location === "/"
                ? "bg-[hsl(24,93%,49%)] text-white"
                : "text-[hsl(28,8%,52%)] dark:text-[hsl(35,8%,52%)] hover:text-[hsl(24,93%,49%)]"
            }`}>
              <Home className={`h-[20px] w-[20px] transition-all duration-150 ${location === "/" ? 'scale-110' : ''}`} strokeWidth={location === "/" ? 2.2 : 1.8} />
              <span className={`text-[10px] leading-none ${location === "/" ? 'font-bold' : 'font-medium'}`}>Home</span>
            </div>
          </Link>

          {/* Notifiche */}
          <Link href="/notifications" className="flex active:opacity-70 transition-opacity">
            <div className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full transition-all duration-200 ${
              location.startsWith("/notifications")
                ? "bg-[hsl(24,93%,49%)] text-white"
                : "text-[hsl(28,8%,52%)] dark:text-[hsl(35,8%,52%)] hover:text-[hsl(24,93%,49%)]"
            }`}>
              <div className="relative">
                <Bell className={`h-[20px] w-[20px] transition-all duration-150 ${location.startsWith("/notifications") ? 'scale-110' : ''}`} strokeWidth={location.startsWith("/notifications") ? 2.2 : 1.8} />
                {unread && unread > 0 ? (
                  <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {unread > 9 ? '9+' : unread}
                  </span>
                ) : null}
              </div>
              <span className={`text-[10px] leading-none ${location.startsWith("/notifications") ? 'font-bold' : 'font-medium'}`}>Notifiche</span>
            </div>
          </Link>

          {/* Cerca — CENTER, always orange pill */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex active:opacity-70 transition-opacity mx-1"
          >
            <div className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full transition-all duration-200 ${
              isSearchActive || searchOpen
                ? "bg-[hsl(24,93%,49%)] text-white"
                : "bg-[hsl(24,93%,49%)] text-white hover:bg-[hsl(24,93%,44%)]"
            }`}
              style={{ boxShadow: "0 2px 12px rgba(247,113,4,0.35)" }}
            >
              <Search className="h-[20px] w-[20px] scale-105" strokeWidth={2.2} />
              <span className="text-[10px] leading-none font-bold">Cerca</span>
            </div>
          </button>

          {/* Attività */}
          <Link href="/activity" className="flex active:opacity-70 transition-opacity">
            <div className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full transition-all duration-200 ${
              location.startsWith("/activity")
                ? "bg-[hsl(24,93%,49%)] text-white"
                : "text-[hsl(28,8%,52%)] dark:text-[hsl(35,8%,52%)] hover:text-[hsl(24,93%,49%)]"
            }`}>
              <Activity className={`h-[20px] w-[20px] transition-all duration-150 ${location.startsWith("/activity") ? 'scale-110' : ''}`} strokeWidth={location.startsWith("/activity") ? 2.2 : 1.8} />
              <span className={`text-[10px] leading-none ${location.startsWith("/activity") ? 'font-bold' : 'font-medium'}`}>Attività</span>
            </div>
          </Link>

          {/* Tu / Profilo */}
          <Link href={dashboardHref} className="flex active:opacity-70 transition-opacity">
            <div className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full transition-all duration-200 ${
              location.startsWith("/dashboard") || location.startsWith("/profile") || location === "/login"
                ? "bg-[hsl(24,93%,49%)] text-white"
                : "text-[hsl(28,8%,52%)] dark:text-[hsl(35,8%,52%)] hover:text-[hsl(24,93%,49%)]"
            }`}>
              <User className={`h-[20px] w-[20px] transition-all duration-150 ${location.startsWith("/dashboard") || location.startsWith("/profile") || location === "/login" ? 'scale-110' : ''}`} strokeWidth={location.startsWith("/dashboard") || location.startsWith("/profile") || location === "/login" ? 2.2 : 1.8} />
              <span className={`text-[10px] leading-none ${location.startsWith("/dashboard") || location.startsWith("/profile") || location === "/login" ? 'font-bold' : 'font-medium'}`}>{profileLabel}</span>
            </div>
          </Link>
        </div>
      </nav>
    </>
  );
}
