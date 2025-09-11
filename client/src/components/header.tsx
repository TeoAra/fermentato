import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Beer, Settings, LogOut, Search, User, Bell, MapPin, Home } from "lucide-react";
import type { User as UserType } from "@shared/schema";
import { useState, useRef, useEffect } from "react";
import SearchResults from "@/components/search-results";
import SearchDialog from "@/components/search-dialog";

export default function Header() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const typedUser = user as UserType | undefined;
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Hide header for pub owners in dashboard
  const isPubOwnerInDashboard = isAuthenticated && 
    (user as any)?.userType === 'pub_owner' && 
    (location.startsWith("/smart-pub-dashboard") || location.startsWith("/dashboard"));

  // Desktop navigation items
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log("Searching for:", searchQuery);
    }
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Don't render header for pub owners in dashboard
  if (isPubOwnerInDashboard) {
    return null;
  }

  return (
    <>
      {/* Integrated Desktop Header with Navigation */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-white/20 dark:border-gray-800/50 shadow-lg hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-12 gap-4 items-center h-16">
            {/* Logo - Fixed Width */}
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2" data-testid="logo-desktop">
                <Beer className="h-8 w-8 text-orange-600" />
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  Fermenta<span className="text-orange-600">.to</span>
                </span>
              </Link>
            </div>

            {/* Main Navigation */}
            <div className="col-span-4">
              <nav className="flex items-center justify-center">
                <div className="flex items-center space-x-1 bg-gray-100/50 dark:bg-gray-800/50 rounded-2xl p-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.isActive;
                    
                    return (
                      <div key={item.label}>
                        {item.href.startsWith('/api/') ? (
                          <a
                            href={item.href}
                            data-testid={`nav-desktop-${item.label.toLowerCase().replace(' ', '-')}`}
                            className={`relative flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${isActive ? 'text-white shadow-lg bg-gradient-to-r from-orange-500 to-orange-600' : 'text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-white/50 dark:hover:bg-gray-700/50'}`}
                          >
                            <div className="relative">
                              <Icon className="h-4 w-4" />
                              {item.badge && item.badge > 0 && (
                                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] shadow-lg">
                                  {item.badge && item.badge > 99 ? '99+' : item.badge}
                                </div>
                              )}
                            </div>
                            <span>{item.label}</span>
                          </a>
                        ) : (
                          <Link href={item.href}>
                            <div
                              data-testid={`nav-desktop-${item.label.toLowerCase().replace(' ', '-')}`}
                              className={`relative flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${isActive ? 'text-white shadow-lg bg-gradient-to-r from-orange-500 to-orange-600' : 'text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-white/50 dark:hover:bg-gray-700/50'}`}
                            >
                              <div className="relative">
                                <Icon className="h-4 w-4" />
                                {item.badge && item.badge > 0 && (
                                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] shadow-lg">
                                    {item.badge && item.badge > 99 ? '99+' : item.badge}
                                  </div>
                                )}
                              </div>
                              <span>{item.label}</span>
                            </div>
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </nav>
            </div>

            {/* Search Bar - Centered */}
            <div className="col-span-3" ref={searchRef}>
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="search"
                  placeholder="Cerca pub, birre..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowResults(e.target.value.length > 2);
                  }}
                  onFocus={() => setShowResults(searchQuery.length > 2)}
                  className="pl-10 pr-4 bg-white/50 dark:bg-gray-800/50 border-white/20 dark:border-gray-700/50"
                  data-testid="search-input-desktop"
                />
                {showResults && (
                  <SearchResults 
                    query={searchQuery} 
                    onClose={() => setShowResults(false)} 
                  />
                )}
              </form>
            </div>

            {/* User Section */}
            <div className="col-span-3 flex items-center justify-end gap-3">
              {isAuthenticated ? (
                <>
                  {typedUser && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Ciao, {typedUser.firstName || typedUser.email}
                      </span>
                      {typedUser.userType === 'pub_owner' && (
                        <Badge variant="secondary">Proprietario Pub</Badge>
                      )}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = "/api/logout"}
                    className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 border-white/20 dark:border-gray-700/50"
                    data-testid="logout-button-desktop"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => window.location.href = "/api/login"}
                  className="bg-orange-600 hover:bg-orange-700"
                  data-testid="login-button-desktop"
                >
                  Accedi
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced Search Dialog */}
      <SearchDialog 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </>
  );
}