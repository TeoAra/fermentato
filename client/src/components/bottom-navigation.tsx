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
    { key: "home",     icon: Home,    label: "Home",     href: "/",               isActive: location === "/" },
    { key: "esplora",  icon: Compass, label: "Esplora",  href: "/explore/pubs",   isActive: location.startsWith("/explore") },
    { key: "cerca",    icon: Search,  label: "Cerca",    href: "/search",          isActive: location.startsWith("/search") },
    { key: "attivita", icon: Activity,label: "Attività", href: "/activity",        isActive: location.startsWith("/activity") },
    {
      key: "tu", icon: User, label: profileLabel, href: dashboardHref,
      isActive: location.startsWith("/dashboard") || location.startsWith("/profile") || location.startsWith("/activity") || location.startsWith("/notifications") || location === "/login",
      badge: unread,
    },
  ] as const;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
      {/* brutalista background — identico al mockup: #fafaf8 + 2px border top */}
      <div style={{
        position: "absolute", inset: 0,
        background: "#fafaf8",
        borderTop: "2px solid #111009",
      }} />
      <div
        className="relative flex items-stretch"
        style={{ paddingBottom: `max(env(safe-area-inset-bottom), 4px)`, height: `calc(56px + max(env(safe-area-inset-bottom), 4px))` }}
      >
        {tabs.map(({ key, icon: Icon, label, href, isActive, badge }: any) => (
          <Link key={key} href={href} className="flex-1 flex active:opacity-70 transition-opacity">
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 3, flex: 1, padding: "2px 4px", position: "relative",
              color: isActive ? "#d97706" : "#c8bdb4",
            }}>
              {/* Top active indicator */}
              {isActive && (
                <span style={{
                  position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                  width: 28, height: 2, borderRadius: "0 0 3px 3px",
                  background: "#d97706",
                }} />
              )}
              <div style={{ position: "relative" }}>
                <Icon
                  className={`transition-all duration-150 ${isActive ? 'scale-110' : ''}`}
                  style={{ width: 22, height: 22 }}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {badge && badge > 0 ? (
                  <span style={{
                    position: "absolute", top: -6, right: -8,
                    minWidth: 15, height: 15, padding: "0 2px",
                    background: "#ef4444", color: "#fff",
                    fontSize: 9, fontWeight: 700, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
                  }}>
                    {badge > 9 ? '9+' : badge}
                  </span>
                ) : null}
              </div>
              <span style={{
                fontSize: 9, lineHeight: 1,
                fontWeight: isActive ? 800 : 500,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}>
                {label.toUpperCase()}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </nav>
  );
}
