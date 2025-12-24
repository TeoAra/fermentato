import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Beer, Search, Bell, MapPin, Home, User, LogOut } from "lucide-react";
import type { User as UserType } from "@shared/schema";
import { useState, useRef, useEffect } from "react";
import SearchResults from "@/components/search-results";
import SearchDialog from "@/components/search-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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

  // Desktop navigation items - filter based on authentication status
  const allNavItems = [
    {
      icon: Home,
      label: "Home",
      href: "/",
      isActive: location === "/",
      requiresAuth: false
    },
    {
      icon: MapPin,
      label: "Attività",
      href: "/activity",
      isActive: location.startsWith("/activity"),
      requiresAuth: true
    },
    {
      icon: Bell,
      label: "Notifiche",
      href: "/notifications", 
      isActive: location.startsWith("/notifications"),
      badge: 3,
      requiresAuth: true
    },
    {
      icon: User,
      label: isAuthenticated ? "Dashboard" : "Accedi",
      href: isAuthenticated ? "/dashboard" : "/api/login",
      isActive: isAuthenticated && location.startsWith("/dashboard"),
      requiresAuth: false
    }
  ];

  // Filter items: show all for authenticated users, only non-auth-required for guests
  const navItems = allNavItems.filter(item => isAuthenticated || !item.requiresAuth);

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

            {/* Search Bar */}
            <div className="col-span-4" ref={searchRef}>
              <form onSubmit={handleSearch} className="relative max-w-sm ml-auto">
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
            <div className="col-span-2 flex items-center justify-end gap-2">
              {isAuthenticated && typedUser ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-2" data-testid="user-menu-button">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-orange-100 text-orange-600 text-sm">
                          {typedUser.firstName?.[0] || typedUser.email?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden xl:inline text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
                        {typedUser.firstName || typedUser.email?.split('@')[0]}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
                        <User className="h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <a href="/api/auth/logout" className="flex items-center gap-2 cursor-pointer text-red-600" data-testid="logout-button">
                        <LogOut className="h-4 w-4" />
                        Esci
                      </a>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild variant="default" size="sm" className="bg-orange-600 hover:bg-orange-700">
                  <a href="/auth" data-testid="login-button">Accedi</a>
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