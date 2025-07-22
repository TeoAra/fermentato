import { Search, User, Bell, MapPin, Home } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import SearchDialog from "./search-dialog";

export function BottomNavigation() {
  const [location] = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  const navItems = [
    {
      icon: Home,
      label: "Home",
      href: "/",
      isActive: location === "/"
    },
    {
      icon: MapPin,
      label: "Attività",
      href: "/activity",
      isActive: location.startsWith("/activity")
    },
    {
      icon: Search,
      label: "Cerca",
      href: "#",
      isActive: false,
      onClick: () => setIsSearchOpen(true),
      isMainAction: true
    },
    {
      icon: Bell,
      label: "Notifiche",
      href: "/notifications", 
      isActive: location.startsWith("/notification"),
      badge: isAuthenticated ? 3 : 0
    },
    {
      icon: User,
      label: isAuthenticated ? "Dashboard" : "Accedi",
      href: isAuthenticated ? "/dashboard" : "/api/login",
      isActive: location.startsWith("/dashboard")
    }
  ];

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-pb">
        <div className="flex items-center justify-center px-4 py-2 gap-1">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isSearch = item.label === "Cerca";
            const isLogin = item.href === "/api/login";
            
            if (isSearch) {
              return (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="relative bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white rounded-full p-3 mx-2 shadow-lg transition-all duration-200 transform active:scale-95"
                >
                  <Icon className="h-6 w-6" />
                  <span className="sr-only">{item.label}</span>
                </button>
              );
            }

            if (isLogin) {
              return (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex flex-col items-center justify-center py-2 px-2 min-w-[60px] text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                >
                  <Icon className="h-5 w-5 mb-1" />
                  <span className="text-xs font-medium truncate">{item.label}</span>
                </a>
              );
            }

            return (
              <Link key={item.label} href={item.href}>
                <div className={`relative flex flex-col items-center justify-center py-2 px-2 min-w-[60px] transition-colors ${
                  item.isActive
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
                }`}>
                  <div className="relative">
                    <Icon className="h-5 w-5 mb-1" />
                    {item.badge && item.badge > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center min-w-[16px]">
                        {item.badge > 9 ? '9+' : item.badge}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium truncate">{item.label}</span>
                  {item.isActive && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-orange-600 dark:bg-orange-400 rounded-full"></div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Search Dialog */}
      <SearchDialog 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </>
  );
}