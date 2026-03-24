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
        location.startsWith("/notifications") ||
        location === "/login",
      badge: unread,
    },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-0.5 bg-white/95 dark:bg-[hsl(25,14%,9%)]/95 backdrop-blur-xl rounded-full px-2 py-1.5 border border-[hsl(36,14%,88%)] dark:border-[hsl(25,12%,18%)]"
        style={{ boxShadow: "0 8px 32px rgba(247, 113, 4, 0.14), 0 2px 8px rgba(0,0,0,0.07)" }}>
        {tabs.map(({ key, icon: Icon, label, href, isActive, badge }) => (
          <Link key={key} href={href} className="flex active:opacity-70 transition-opacity">
            <div className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full transition-all duration-200 ${
              isActive
                ? "bg-[hsl(24,93%,49%)] dark:bg-[hsl(24,93%,55%)] text-white"
                : "text-[hsl(28,8%,52%)] dark:text-[hsl(35,8%,52%)] hover:text-[hsl(24,93%,49%)]"
            }`}>
              <div className="relative">
                <Icon
                  className={`h-[20px] w-[20px] transition-all duration-150 ${isActive ? 'scale-110' : ''}`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                {badge && badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {badge > 9 ? '9+' : badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[10px] leading-none ${isActive ? 'font-bold' : 'font-medium'}`}>
                {label}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </nav>
  );
}
