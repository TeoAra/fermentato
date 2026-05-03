import { Search, User, Home, Bell, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import FindBeerSheet from "@/components/FindBeerSheet";

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
  const attivitaActive = isActive("/feed");
  const cercaActive    = searchOpen;
  const accountActive  = isActive("/profile") || isActive("/login") || isActive("/auth");

  const Tab = ({
    active,
    children,
    onClick,
  }: {
    active: boolean;
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <div
      className={`bottom-nav-tab ${active ? "tab-active" : ""}`}
      onClick={onClick}
    >
      <div className="bottom-nav-pill" />
      {children}
    </div>
  );

  return (
    <>
      <FindBeerSheet open={searchOpen} onClose={() => setSearchOpen(false)} />

      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-[55] bg-white/95 dark:bg-[#0F0F10]/96 backdrop-blur-xl border-t border-stone-100/80 dark:border-white/[0.05]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch">

          {/* Home */}
          <Link href="/" className="flex-1 flex">
            <Tab active={homeActive}>
              <span className="nav-icon">
                <Home
                  className="h-[22px] w-[22px]"
                  strokeWidth={homeActive ? 2.5 : 1.8}
                  fill={homeActive ? "currentColor" : "none"}
                  style={homeActive ? { fillOpacity: 0.12 } : {}}
                />
              </span>
              <span className="nav-label">Home</span>
            </Tab>
          </Link>

          {/* Notifiche */}
          <Link href="/notifications" className="flex-1 flex">
            <Tab active={notifActive}>
              <span className="nav-icon relative">
                <Bell
                  className="h-[22px] w-[22px]"
                  strokeWidth={notifActive ? 2.5 : 1.8}
                  fill={notifActive ? "currentColor" : "none"}
                  style={notifActive ? { fillOpacity: 0.12 } : {}}
                />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-[3px] leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </span>
              <span className="nav-label">Notifiche</span>
            </Tab>
          </Link>

          {/* Cerca */}
          <button onClick={() => setSearchOpen(true)} className="flex-1 flex">
            <Tab active={cercaActive}>
              <span className="nav-icon">
                <Search
                  className="h-[22px] w-[22px]"
                  strokeWidth={cercaActive ? 2.5 : 1.8}
                  fill={cercaActive ? "currentColor" : "none"}
                  style={cercaActive ? { fillOpacity: 0.12 } : {}}
                />
              </span>
              <span className="nav-label">Cerca</span>
            </Tab>
          </button>

          {/* Sociale */}
          <Link href="/feed" className="flex-1 flex">
            <Tab active={attivitaActive}>
              <span className="nav-icon">
                <Users
                  className="h-[22px] w-[22px]"
                  strokeWidth={attivitaActive ? 2.5 : 1.8}
                  fill={attivitaActive ? "currentColor" : "none"}
                  style={attivitaActive ? { fillOpacity: 0.12 } : {}}
                />
              </span>
              <span className="nav-label">Sociale</span>
            </Tab>
          </Link>

          {/* Account */}
          <Link href={isAuthenticated ? "/dashboard" : "/login"} className="flex-1 flex">
            <Tab active={accountActive}>
              <span className="nav-icon">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="profilo"
                    className={`h-[22px] w-[22px] rounded-full object-cover border-2 transition-all duration-200 ${
                      accountActive
                        ? "border-primary ring-1 ring-primary/30"
                        : "border-stone-200 dark:border-stone-600"
                    }`}
                  />
                ) : (
                  <User
                    className="h-[22px] w-[22px]"
                    strokeWidth={accountActive ? 2.5 : 1.8}
                    fill={accountActive ? "currentColor" : "none"}
                    style={accountActive ? { fillOpacity: 0.12 } : {}}
                  />
                )}
              </span>
              <span className="nav-label">Account</span>
            </Tab>
          </Link>

        </div>
      </nav>
    </>
  );
}
