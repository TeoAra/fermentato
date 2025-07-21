import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Beer, Settings, LogOut, Search } from "lucide-react";
import type { User } from "@shared/schema";
import { useState, useRef, useEffect } from "react";
import SearchResults from "@/components/search-results";

export default function Header() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const typedUser = user as User | undefined;
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

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

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Beer className="h-8 w-8 text-orange-600" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              Fermenta<span className="text-orange-600">.to</span>
            </span>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-8" ref={searchRef}>
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="search"
                placeholder="Cerca pub, birre, birrifici..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowResults(e.target.value.length > 2);
                }}
                onFocus={() => setShowResults(searchQuery.length > 2)}
                className="pl-10 pr-4"
              />
              {showResults && (
                <SearchResults 
                  query={searchQuery} 
                  onClose={() => setShowResults(false)} 
                />
              )}
            </form>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            {isAuthenticated && (
              <Link href="/dashboard">
                <Button 
                  variant={location === "/dashboard" ? "default" : "ghost"}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Dashboard Pub
                </Button>
              </Link>
            )}
          </nav>

          {/* User Actions */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                {typedUser && (
                  <div className="hidden md:flex items-center gap-2">
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
                  onClick={() => {
                    // Check if demo user
                    if (localStorage.getItem('demo_user')) {
                      localStorage.removeItem('demo_user');
                      window.location.reload();
                    } else {
                      window.location.href = "/api/logout";
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Demo login simulation
                    localStorage.setItem('demo_user', JSON.stringify({
                      id: 'demo_pub_owner',
                      email: 'pub@demo.it',
                      firstName: 'Mario',
                      lastName: 'Rossi',
                      userType: 'pub_owner'
                    }));
                    window.location.reload();
                  }}
                  className="text-orange-600 border-orange-600 hover:bg-orange-50"
                >
                  Demo Pub
                </Button>
                <Button
                  onClick={() => window.location.href = "/api/login"}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Accedi
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}