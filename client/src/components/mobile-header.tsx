import { Menu, X, LogOut, LogIn, User, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

interface MobileHeaderProps {
  onMenuToggle: () => void;
  isMenuOpen: boolean;
}

export function MobileHeader({ onMenuToggle, isMenuOpen }: MobileHeaderProps) {
  const [location] = useLocation();
  const { isAuthenticated, user } = useAuth();

  return (
    <>
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-14">
        <div className="flex items-center justify-between px-4 h-full">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">F</span>
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              Fermenta.to
            </span>
          </Link>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* Ricerca rimossa dal mobile header per evitare ridondanza con bottom nav */}
            
            <button
              onClick={onMenuToggle}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
              aria-label={isMenuOpen ? "Chiudi menu" : "Apri menu"}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-lg">
            <nav className="px-4 py-3 space-y-3">
              <Link href="/" onClick={onMenuToggle}>
                <div className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location === "/" 
                    ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400" 
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}>
                  Home
                </div>
              </Link>
              
              <Link href="/pubs" onClick={onMenuToggle}>
                <div className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.startsWith("/pub") 
                    ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400" 
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}>
                  Pub
                </div>
              </Link>
              
              <Link href="/explore/breweries" onClick={onMenuToggle}>
                <div className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.startsWith("/brewer") 
                    ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400" 
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}>
                  Birrifici
                </div>
              </Link>

              {isAuthenticated && (
                <>
                  <Link href="/dashboard" onClick={onMenuToggle}>
                    <div className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location === "/dashboard" 
                        ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400" 
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}>
                      <User className="w-4 h-4 inline-block mr-2" />
                      Il Mio Profilo
                    </div>
                  </Link>

                  {(user as any)?.userType === 'admin' && (
                    <Link href="/admin" onClick={onMenuToggle}>
                      <div className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        location.startsWith("/admin") 
                          ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400" 
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}>
                        <Settings className="w-4 h-4 inline-block mr-2" />
                        Admin Panel
                      </div>
                    </Link>
                  )}

                  <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => {
                      onMenuToggle();
                      fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
                        .then(() => window.location.href = '/');
                    }}
                    data-testid="logout-button-mobile"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Esci
                  </Button>
                </>
              )}

              {!isAuthenticated && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start px-3 py-2 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                    onClick={() => {
                      onMenuToggle();
                      window.location.href = '/api/login';
                    }}
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Accedi
                  </Button>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Rimuovo il Search Dialog dal mobile header perché ora è gestito dalla bottom nav */}
    </>
  );
}