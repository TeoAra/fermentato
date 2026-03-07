import { Search, User, Bell, MapPin, Home, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import SearchDialog from "./search-dialog";

export function BottomNavigation() {
  const [location] = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    enabled: isAuthenticated,
    refetchInterval: 120000,
  });

  // Smart hide/show on scroll for better UX - MOVED BEFORE CONDITIONAL LOGIC
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > lastScrollY;
      const isScrolledEnough = currentScrollY > 100;
      
      if (isScrollingDown && isScrolledEnough) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const typedUser = user as any;
  const activeRole = typedUser?.activeRole || typedUser?.userType || 'customer';

  // Label and icon for dashboard tab based on active role
  const dashboardLabel = !isAuthenticated ? "Accedi" :
    activeRole === 'pub_owner' ? "Gestione" :
    activeRole === 'brewery_owner' ? "Birrificio" :
    activeRole === 'admin' ? "Admin" :
    "Profilo";

  // Navigation items - filter based on authentication status
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
      isActive: location.startsWith("/notification"),
      badge: (unreadData?.count && unreadData.count > 0) ? unreadData.count : undefined,
      requiresAuth: true
    },
    {
      icon: User,
      label: dashboardLabel,
      href: isAuthenticated ? "/dashboard" : "/login",
      isActive: isAuthenticated ? location.startsWith("/dashboard") : location === "/login",
      requiresAuth: false
    }
  ];

  // Filter items: show all for authenticated users, only non-auth-required for guests
  const navItems = allNavItems.filter(item => isAuthenticated || !item.requiresAuth);

  return (
    <>
      {/* Mobile Bottom Navigation */}
      {(
        <nav className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out transform ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}>
        {/* Glassmorphism background */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-white/20 dark:border-gray-800/50 shadow-2xl">
          {/* Gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent dark:from-gray-800/10 pointer-events-none" />
          
          <div className="relative flex items-center justify-between px-4 py-3 safe-area-pb">
            {/* Navigation Items */}
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = item.isActive;
              
              return (
                <div key={item.label} className="flex-1 flex justify-center">
                  {item.href.startsWith('/api/') ? (
                    <a
                      href={item.href}
                      data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                      className={`group flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-300 transform active:scale-95 ${
                        isActive
                          ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20"
                          : "text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="relative">
                        <Icon className={`h-5 w-5 transition-all duration-300 ${
                          isActive ? 'scale-110' : 'group-hover:scale-105'
                        }`} />
                        {item.badge && item.badge > 0 && (
                          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] shadow-lg animate-pulse">
                            {item.badge && item.badge > 99 ? '99+' : item.badge}
                          </div>
                        )}
                      </div>
                      <span className={`text-xs font-medium mt-1 transition-all duration-300 ${
                        isActive ? 'text-amber-600 dark:text-amber-400' : ''
                      }`}>
                        {item.label}
                      </span>
                      {isActive && (
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-amber-500 rounded-full" />
                      )}
                    </a>
                  ) : (
                    <Link href={item.href}>
                      <div
                        data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                        className={`group flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-300 transform active:scale-95 ${
                          isActive
                            ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20"
                            : "text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <div className="relative">
                          <Icon className={`h-5 w-5 transition-all duration-300 ${
                            isActive ? 'scale-110' : 'group-hover:scale-105'
                          }`} />
                          {item.badge && item.badge > 0 && (
                            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] shadow-lg animate-pulse">
                              {item.badge && item.badge > 99 ? '99+' : item.badge}
                            </div>
                          )}
                        </div>
                        <span className={`text-xs font-medium mt-1 transition-all duration-300 ${
                          isActive ? 'text-amber-600 dark:text-amber-400' : ''
                        }`}>
                          {item.label}
                        </span>
                        {isActive && (
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-amber-500 rounded-full" />
                        )}
                      </div>
                    </Link>
                  )}
                </div>
              );
            })}
            
            {/* Central Search Button - Floating FAB */}
            <div className="absolute left-1/2 top-0 transform -translate-x-1/2 -translate-y-1/2">
              <button
                onClick={() => setIsSearchOpen(true)}
                data-testid="button-search"
                className="group bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-full p-4 shadow-2xl transition-all duration-300 transform active:scale-95 hover:scale-110 hover:shadow-amber-500/25 hover:shadow-2xl"
              >
                <div className="relative">
                  <Search className="h-6 w-6 transition-transform duration-300 group-hover:rotate-12" />
                  <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-white/70 animate-pulse" />
                </div>
                <span className="sr-only">Cerca pub, birrifici e birre</span>
                
                {/* Ripple effect */}
                <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-0 group-active:animate-none group-active:opacity-100" />
              </button>
            </div>
          </div>
        </div>
      </nav>
      )}


      {/* Enhanced Search Dialog */}
      <SearchDialog 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </>
  );
}