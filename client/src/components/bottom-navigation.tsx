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
        <div className="flex items-center py-2">
          {/* Home - Estremo sinistro senza spazi */}
          <Link href="/">
            <div className={`flex flex-col items-center justify-center py-2 px-3 transition-colors ${
              location === "/"
                ? "text-orange-600 dark:text-orange-400"
                : "text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
            }`}>
              <Home className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Home</span>
            </div>
          </Link>

          {/* Contenitore flex per centrare tutto il resto */}
          <div className="flex-1 flex items-center justify-center">
            {/* Attività */}
            <Link href="/activity">
              <div className={`flex flex-col items-center justify-center py-2 px-3 transition-colors ${
                location.startsWith("/activity")
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
              }`}>
                <MapPin className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">Attività</span>
              </div>
            </Link>

            {/* Cerca - Centro assoluto */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white rounded-full p-4 mx-6 shadow-lg transition-all duration-200 transform active:scale-95"
            >
              <Search className="h-6 w-6" />
              <span className="sr-only">Cerca</span>
            </button>

            {/* Notifiche */}
            <Link href="/notifications">
              <div className={`flex flex-col items-center justify-center py-2 px-3 transition-colors ${
                location.startsWith("/notification")
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
              }`}>
                <div className="relative">
                  <Bell className="h-5 w-5 mb-1" />
                  {isAuthenticated && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center min-w-[16px]">
                      3
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium">Notifiche</span>
              </div>
            </Link>
          </div>

          {/* Dashboard - Estremo destro senza spazi */}
          {isAuthenticated ? (
            <Link href="/dashboard">
              <div className={`flex flex-col items-center justify-center py-2 px-3 transition-colors ${
                location.startsWith("/dashboard")
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
              }`}>
                <User className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">Dashboard</span>
              </div>
            </Link>
          ) : (
            <a
              href="/api/login"
              className="flex flex-col items-center justify-center py-2 px-3 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
            >
              <User className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Accedi</span>
            </a>
          )}
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