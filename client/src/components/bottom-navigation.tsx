import { Search, User, Home, Activity, Beer, Store } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useState, type ReactNode } from "react";
import SearchDialog from "@/components/search-dialog";

interface TabItem {
  href?: string;
  icon: (active: boolean) => ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
}

export function BottomNavigation() {
  const [location] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  if (location.startsWith("/tv/") || location.startsWith("/festival-tv/")) return null;

  const typedUser = user as any;
  const activeRole = typedUser?.activeRole || typedUser?.userType || 'customer';

  const pubHref =
    activeRole === "pub_owner"
      ? "/dashboard"
      : activeRole === "admin"
      ? "/admin"
      : "/explore/pubs";

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  const homeActive     = isActive("/");
  const birreActive    = isActive("/explore/beers") || isActive("/beer/");
  const cercaActive    = searchOpen;
  const attivitaActive = isActive("/activity");
  const pubActive      = isActive("/explore/pubs") || isActive("/dashboard") || isActive("/admin");

  const TabInner = ({
    active,
    children,
  }: {
    active: boolean;
    children: ReactNode;
  }) => (
    <div
      className={`flex flex-col items-center justify-center gap-[3px] flex-1 py-2 min-h-[52px] transition-colors active:scale-95 relative w-full ${
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
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[hsl(25,14%,9%)] border-t border-stone-100 dark:border-[hsl(25,12%,16%)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch">
          {/* Home */}
          <Link href="/" className="flex-1 flex">
            <TabInner active={homeActive}>
              <Home
                className="h-[22px] w-[22px]"
                strokeWidth={homeActive ? 2.4 : 1.8}
                fill={homeActive ? "currentColor" : "none"}
                style={homeActive ? { fillOpacity: 0.15, strokeOpacity: 1 } : {}}
              />
              <span className="text-[10px] font-semibold leading-none">Home</span>
            </TabInner>
          </Link>

          {/* Birré */}
          <Link href="/explore/beers" className="flex-1 flex">
            <TabInner active={birreActive}>
              <Beer
                className="h-[22px] w-[22px]"
                strokeWidth={birreActive ? 2.4 : 1.8}
              />
              <span className="text-[10px] font-semibold leading-none">Birré</span>
            </TabInner>
          </Link>

          {/* Cerca — center, uses button (no link) */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex-1 flex active:scale-95 transition-transform"
          >
            <TabInner active={cercaActive}>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  cercaActive
                    ? "bg-primary text-white"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400"
                }`}
              >
                <Search className="h-[18px] w-[18px]" strokeWidth={2.2} />
              </div>
              <span className={`text-[10px] font-semibold leading-none ${cercaActive ? "text-primary" : "text-stone-400 dark:text-stone-500"}`}>
                Cerca
              </span>
            </TabInner>
          </button>

          {/* Attività */}
          <Link href="/activity" className="flex-1 flex">
            <TabInner active={attivitaActive}>
              <Activity
                className="h-[22px] w-[22px]"
                strokeWidth={attivitaActive ? 2.4 : 1.8}
              />
              <span className="text-[10px] font-semibold leading-none">Attività</span>
            </TabInner>
          </Link>

          {/* Pub */}
          <Link href={pubHref} className="flex-1 flex">
            <TabInner active={pubActive}>
              <Store
                className="h-[22px] w-[22px]"
                strokeWidth={pubActive ? 2.4 : 1.8}
              />
              <span className="text-[10px] font-semibold leading-none">Pub</span>
            </TabInner>
          </Link>
        </div>
      </nav>
    </>
  );
}
