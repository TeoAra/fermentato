import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Menu as MenuIcon, 
  X, 
  ChevronDown,
  LogOut,
  Settings as SettingsIcon,
  Crown,
  Sparkles,
  Store,
  Home,
  User,
  RefreshCw,
  MoreHorizontal,
  Beer,
  Wine,
  Utensils,
  BarChart3
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { RoleSwitcher } from "@/components/role-switcher";

type DashboardSection = 'overview' | 'taplist' | 'bottles' | 'menu' | 'events' | 'analytics' | 'settings' | 'profile';

interface PubOwnerTopBarProps {
  currentSection: DashboardSection;
  setCurrentSection: (section: DashboardSection) => void;
  sections: Array<{
    id: DashboardSection;
    name: string;
    icon: any;
    gradient: string;
  }>;
  currentPub?: any;
  user?: any;
  onLogout?: () => void;
}

export function PubOwnerTopBar({ 
  currentSection, 
  setCurrentSection, 
  sections, 
  currentPub,
  user,
  onLogout 
}: PubOwnerTopBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentSectionData = sections.find(s => s.id === currentSection);

  return (
    <div className="sticky top-0 z-50 w-full">
      {/* Main Top Bar */}
      <motion.div 
        className="glass-card border-b border-white/20 dark:border-gray-800/50 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left Section - Logo + Pub Info */}
            <div className="flex items-center space-x-4">
              <motion.div 
                className="flex items-center space-x-3"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                {currentPub?.logoUrl ? (
                  <Avatar className="h-10 w-10 ring-2 ring-orange-500/20">
                    <AvatarImage src={currentPub.logoUrl} alt={currentPub.name} />
                    <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-bold">
                      {currentPub.name?.[0] || 'P'}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                    <Store className="h-5 w-5 text-white" />
                  </div>
                )}
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                    {currentPub?.name || 'Dashboard'}
                  </h1>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                        className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200 cursor-pointer group"
                        data-testid="pannello-gestionale-dropdown"
                      >
                        <span>Pannello Gestionale</span>
                        <ChevronDown className="h-3 w-3 transition-transform duration-200 group-hover:rotate-180" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 glass-card border-white/20">
                      <DropdownMenuItem 
                        onClick={() => setCurrentSection('settings')}
                        className="cursor-pointer"
                        data-testid="menu-impostazioni"
                      >
                        <SettingsIcon className="mr-2 h-4 w-4" />
                        <span>Impostazioni</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setCurrentSection('profile')}
                        className="cursor-pointer"
                        data-testid="menu-profilo"
                      >
                        <User className="mr-2 h-4 w-4" />
                        <span>Profilo</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => {
                          if (onLogout) {
                            onLogout();
                          } else {
                            // Fallback logout logic
                            window.location.href = '/';
                          }
                        }}
                        className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300"
                        data-testid="menu-esci"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Esci</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>

              {/* Home Navigation Button */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = '/'}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 hidden md:flex items-center gap-1 transition-all duration-300"
                  data-testid="nav-home"
                >
                  <Home className="h-3 w-3" />
                  Home
                </Button>
              </motion.div>
            </div>

            {/* Center - Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              <nav className="flex items-center space-x-1 bg-gray-100/50 dark:bg-gray-800/50 rounded-2xl p-1">
                {sections.map((section, index) => {
                  const Icon = section.icon;
                  const isActive = currentSection === section.id;
                  
                  return (
                    <motion.button
                      key={section.id}
                      onClick={() => setCurrentSection(section.id)}
                      className={`relative flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                        isActive
                          ? 'text-white shadow-lg'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
                      }`}
                      data-testid={`nav-${section.id}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      {isActive && (
                        <motion.div
                          className={`absolute inset-0 bg-gradient-to-r ${section.gradient} rounded-xl`}
                          layoutId="activeTab"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                        />
                      )}
                      
                      <div className="relative z-10 flex items-center space-x-2">
                        <motion.div
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <Icon className="h-4 w-4" />
                        </motion.div>
                        <span className="hidden xl:block">{section.name}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </nav>
            </div>

            {/* Right Section - User Menu */}
            <div className="flex items-center space-x-3">
              {/* Current Section Indicator - Mobile */}
              <div className="lg:hidden flex items-center space-x-2">
                {currentSectionData && (
                  <motion.div 
                    className="flex items-center space-x-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={currentSection}
                  >
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${currentSectionData.gradient}`}>
                      <currentSectionData.icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white hidden sm:block">
                      {currentSectionData.name}
                    </span>
                  </motion.div>
                )}
              </div>

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="relative h-10 w-10 rounded-full ring-2 ring-orange-500/20 hover:ring-orange-500/40 transition-all duration-300"
                    data-testid="user-menu-trigger"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={(user as any)?.profilePicture} alt="User" />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {(user as any)?.displayName?.[0] || (user as any)?.email?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 glass-card border-white/20">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {(user as any)?.displayName || 'Pub Owner'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(user as any)?.email}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <RefreshCw className="h-3 w-3" />
                    Cambia Ruolo
                  </DropdownMenuLabel>
                  <div className="px-2 py-1">
                    <RoleSwitcher compact />
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setCurrentSection('profile')}
                    className="cursor-pointer"
                    data-testid="menu-profile"
                  >
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    <span>Profilo</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setCurrentSection('settings')}
                    className="cursor-pointer"
                    data-testid="menu-settings"
                  >
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    <span>Impostazioni</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a href="/api/logout" className="cursor-pointer text-red-600 dark:text-red-400" data-testid="menu-logout">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Esci</span>
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

            </div>
          </div>
        </div>
      </motion.div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 safe-area-bottom">
        <nav className="flex items-center justify-around px-1 py-1">
          {sections.slice(0, 4).map((section) => {
            const Icon = section.icon;
            const isActive = currentSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setCurrentSection(section.id)}
                className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl min-w-0 flex-1 transition-all duration-200 ${
                  isActive
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
                data-testid={`bottom-nav-${section.id}`}
              >
                <div className={`relative p-1.5 rounded-lg transition-all duration-200 ${
                  isActive ? 'bg-orange-100 dark:bg-orange-900/30' : ''
                }`}>
                  <Icon className="h-5 w-5" />
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-orange-500 rounded-full" />
                  )}
                </div>
                <span className={`text-[10px] mt-0.5 font-medium truncate max-w-full ${
                  isActive ? 'text-orange-600 dark:text-orange-400' : ''
                }`}>
                  {section.name}
                </span>
              </button>
            );
          })}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl min-w-0 flex-1 transition-all duration-200 ${
                  ['analytics', 'settings', 'profile'].includes(currentSection)
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
                data-testid="bottom-nav-more"
              >
                <div className={`relative p-1.5 rounded-lg transition-all duration-200 ${
                  ['analytics', 'settings', 'profile'].includes(currentSection) ? 'bg-orange-100 dark:bg-orange-900/30' : ''
                }`}>
                  <MoreHorizontal className="h-5 w-5" />
                </div>
                <span className="text-[10px] mt-0.5 font-medium">Altro</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-52 mb-2">
              {sections.slice(4).map((section) => {
                const Icon = section.icon;
                const isActive = currentSection === section.id;
                return (
                  <DropdownMenuItem
                    key={section.id}
                    onClick={() => setCurrentSection(section.id)}
                    className={`cursor-pointer ${isActive ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : ''}`}
                    data-testid={`bottom-nav-more-${section.id}`}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{section.name}</span>
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => window.location.href = '/'}
                className="cursor-pointer"
              >
                <Home className="mr-2 h-4 w-4" />
                <span>Torna alla Home</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </div>
  );
}