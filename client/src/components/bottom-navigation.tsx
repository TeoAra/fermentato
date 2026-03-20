import { Search, User, Home, Activity, Compass } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

export function BottomNavigation() {
  const [location] = useLocation();
  const { isAuthenticated, user } = useAuth();

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    enabled: isAuthenticated,
    refetchInterval: 120000,
  });
  const unread = unreadData?.count && unreadData.count > 0 ? unreadData.count : undefined;

  // Hide on TV routes
  if (location.startsWith("/tv/") || location.startsWith("/festival-tv/")) return null;

  const typedUser = user as any;
  const activeRole = typedUser?.activeRole || typedUser?.userType || 'customer';
  const dashboardHref = isAuthenticated ? "/dashboard" : "/login";
  const profileLabel = !isAuthenticated ? "Accedi" :
    activeRole === 'pub_owner' ? "Pub" :
    activeRole === 'brewery_owner' ? "Birrificio" :
    activeRole === 'admin' ? "Admin" : "Tu";

  const tabs = [
    {
      key: "home",
      icon: Home,
      label: "Home",
      href: "/",
      isActive: location === "/",
      badge: undefined as number | undefined,
    },
    {
      key: "esplora",
      icon: Compass,
      label: "Esplora",
      href: "/explore/pubs",
      isActive: location.startsWith("/explore"),
      badge: undefined as number | undefined,
    },
    {
      key: "cerca",
      icon: Search,
      label: "Cerca",
      href: "/search",
      isActive: location.startsWith("/search"),
      badge: undefined as number | undefined,
    },
    {
      key: "attivita",
      icon: Activity,
      label: "Attività",
      href: "/activity",
      isActive: location.startsWith("/activity"),
      badge: undefined as number | undefined,
    },
    {
      key: "tu",
      icon: User,
      label: profileLabel,
      href: dashboardHref,
      isActive:
        location.startsWith("/dashboard") ||
        location.startsWith("/profile") ||
        location.startsWith("/activity") ||
        location.startsWith("/notifications") ||
        location === "/login",
      badge: unread,
    },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
      {/* Frosted background */}
      <div className="absolute inset-0 bg-white/97 dark:bg-[hsl(25,14%,7%)] backdrop-blur-xl border-t border-[hsl(36,14%,86%)] dark:border-[hsl(25,12%,14%)]" />
      <div
        className="relative flex items-stretch"
        style={{ paddingBottom: `max(env(safe-area-inset-bottom), 4px)`, height: `calc(56px + max(env(safe-area-inset-bottom), 4px))` }}
      >
        {tabs.map(({ key, icon: Icon, label, href, isActive, badge }) => (
          <Link key={key} href={href} className="flex-1 flex active:opacity-70 transition-opacity">
            <div className={`flex flex-col items-center justify-center gap-[3px] flex-1 py-2 px-1 transition-colors relative ${
              isActive
                ? "text-[hsl(35,90%,40%)] dark:text-[hsl(38,88%,56%)]"
                : "text-[hsl(28,8%,52%)] dark:text-[hsl(35,8%,52%)]"
            }`}>
              {/* Top active indicator */}
              {isActive && (
                <span className="absolute top-0 inset-x-0 mx-auto w-8 h-[2.5px] rounded-b-full bg-[hsl(35,90%,42%)] dark:bg-[hsl(38,88%,56%)]" />
              )}
              <div className="relative">
                <Icon
                  className={`h-[22px] w-[22px] transition-all duration-150 ${isActive ? 'scale-110' : ''}`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                {badge && badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {badge > 9 ? '9+' : badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[10px] leading-none ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {label}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </nav>
  );
}
