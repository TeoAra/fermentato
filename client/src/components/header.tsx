import { useState } from "react";
import { Link } from "wouter";
import { Beer, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import SearchBar from "./search-bar";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Beer className="text-primary text-2xl mr-2" />
              <span className="text-2xl font-bold text-secondary">Fermenta.to</span>
            </Link>
          </div>

          {/* Search Bar - Desktop */}
          <div className="hidden md:block flex-1 max-w-2xl mx-8">
            <SearchBar />
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-gray-700 hover:text-primary font-medium">
              Pub
            </Link>
            <Link href="/" className="text-gray-700 hover:text-primary font-medium">
              Birrifici
            </Link>
            <Link href="/" className="text-gray-700 hover:text-primary font-medium">
              Birre
            </Link>
            
            {isAuthenticated ? (
              <>
                <Link href="/dashboard">
                  <Button variant="outline" size="sm">
                    Dashboard
                  </Button>
                </Link>
                <a href="/api/logout">
                  <Button variant="ghost" size="sm">
                    Logout
                  </Button>
                </a>
              </>
            ) : (
              <>
                <Link href="/register-pub">
                  <Button className="bg-primary text-white hover:bg-orange-600 font-medium">
                    Registra il tuo Pub
                  </Button>
                </Link>
                <a href="/api/login">
                  <Button variant="outline">
                    Accedi
                  </Button>
                </a>
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          <button 
            className="md:hidden p-2 text-gray-700"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="md:hidden px-4 pb-4">
        <SearchBar />
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 px-4 py-4 space-y-4">
          <Link href="/" className="block text-gray-700 hover:text-primary font-medium">
            Pub
          </Link>
          <Link href="/" className="block text-gray-700 hover:text-primary font-medium">
            Birrifici
          </Link>
          <Link href="/" className="block text-gray-700 hover:text-primary font-medium">
            Birre
          </Link>
          
          {isAuthenticated ? (
            <>
              <Link href="/dashboard" className="block">
                <Button variant="outline" size="sm" className="w-full">
                  Dashboard
                </Button>
              </Link>
              <a href="/api/logout" className="block">
                <Button variant="ghost" size="sm" className="w-full">
                  Logout
                </Button>
              </a>
            </>
          ) : (
            <>
              <Link href="/register-pub" className="block">
                <Button className="bg-primary text-white hover:bg-orange-600 font-medium w-full">
                  Registra il tuo Pub
                </Button>
              </Link>
              <a href="/api/login" className="block">
                <Button variant="outline" className="w-full">
                  Accedi
                </Button>
              </a>
            </>
          )}
        </div>
      )}
    </header>
  );
}
