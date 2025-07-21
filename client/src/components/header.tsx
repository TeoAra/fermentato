import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Beer, Settings, LogOut, Search, Home } from "lucide-react";
import type { User } from "@shared/schema";

export default function Header() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const typedUser = user as User | undefined;

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

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/">
              <Button 
                variant={location === "/" ? "default" : "ghost"}
                size="sm"
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Home
              </Button>
            </Link>
            
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
                  onClick={() => window.location.href = "/api/logout"}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </>
            ) : (
              <Button
                onClick={() => window.location.href = "/api/login"}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Accedi
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}