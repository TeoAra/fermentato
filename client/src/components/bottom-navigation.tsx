import { Home, MapPin, Building, Search } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import SearchDialog from "./search-dialog";

export function BottomNavigation() {
  const [location] = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const navItems = [
    {
      icon: Home,
      label: "Home",
      href: "/",
      isActive: location === "/"
    },
    {
      icon: MapPin,
      label: "Pub",
      href: "/pubs",
      isActive: location.startsWith("/pub")
    },
    {
      icon: Search,
      label: "Cerca",
      href: "#",
      isActive: false,
      onClick: () => setIsSearchOpen(true)
    },
    {
      icon: Building,
      label: "Birrifici",
      href: "/breweries",
      isActive: location.startsWith("/brewer")
    }
  ];

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-pb">
        <div className="flex items-center justify-around px-2 py-1">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isSearch = item.label === "Cerca";
            
            if (isSearch) {
              return (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="flex flex-col items-center justify-center py-2 px-3 min-w-0 flex-1 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                >
                  <Icon className="h-5 w-5 mb-1" />
                  <span className="text-xs font-medium truncate">{item.label}</span>
                </button>
              );
            }

            return (
              <Link key={item.label} href={item.href}>
                <div className={`flex flex-col items-center justify-center py-2 px-3 min-w-0 flex-1 transition-colors ${
                  item.isActive
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
                }`}>
                  <Icon className="h-5 w-5 mb-1" />
                  <span className="text-xs font-medium truncate">{item.label}</span>
                  {item.isActive && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-orange-600 dark:bg-orange-400 rounded-full"></div>
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