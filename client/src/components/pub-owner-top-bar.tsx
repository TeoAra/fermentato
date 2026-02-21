import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ChevronDown,
  LogOut,
  Settings as SettingsIcon,
  Store,
  Home,
  User,
  RefreshCw,
} from "lucide-react";
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
  return (
    <div className="sticky top-0 z-50 w-full">
      <motion.div 
        className="glass-card border-b border-white/20 dark:border-gray-800/50 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 lg:h-16 gap-2 lg:gap-4">
            
            {/* Left - Logo (compact on mobile) */}
            <div className="flex items-center flex-shrink-0">
              <motion.div 
                className="flex items-center space-x-2 lg:space-x-3 cursor-pointer"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
                onClick={() => setCurrentSection('overview')}
              >
                {currentPub?.logoUrl ? (
                  <Avatar className="h-8 w-8 lg:h-10 lg:w-10 ring-2 ring-orange-500/20">
                    <AvatarImage src={currentPub.logoUrl} alt={currentPub.name} />
                    <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-bold text-xs lg:text-sm">
                      {currentPub.name?.[0] || 'P'}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-8 w-8 lg:h-10 lg:w-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                    <Store className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                  </div>
                )}
                <div className="hidden sm:block">
                  <h1 className="text-sm lg:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                    {currentPub?.name || 'Dashboard'}
                  </h1>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                        className="flex items-center space-x-1 text-[10px] lg:text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200 cursor-pointer group"
                        data-testid="pannello-gestionale-dropdown"
                      >
                        <span>Pannello Gestionale</span>
                        <ChevronDown className="h-2.5 w-2.5 lg:h-3 lg:w-3 transition-transform duration-200 group-hover:rotate-180" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 glass-card border-white/20">
                      <DropdownMenuItem 
                        onClick={() => window.location.href = '/'}
                        className="cursor-pointer"
                      >
                        <Home className="mr-2 h-4 w-4" />
                        <span>Torna alla Home</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
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
            </div>

            {/* Center - Navigation (scrollable on mobile, pill style on desktop) */}
            <div className="flex-1 min-w-0 overflow-hidden">
              {/* Mobile: scrollable compact pills */}
              <nav className="lg:hidden flex items-center overflow-x-auto scrollbar-hide gap-1 py-0.5">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = currentSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setCurrentSection(section.id)}
                      className={`flex items-center gap-1 py-1.5 px-2.5 rounded-full whitespace-nowrap text-[11px] font-medium transition-all duration-200 flex-shrink-0 ${
                        isActive
                          ? `bg-gradient-to-r ${section.gradient} text-white shadow-sm`
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      data-testid={`mobile-nav-${section.id}`}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{section.name}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Desktop: centered pill navigation */}
              <div className="hidden lg:flex items-center justify-center">
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
                          <Icon className="h-4 w-4" />
                          <span className="hidden xl:block">{section.name}</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Right - User Menu */}
            <div className="flex items-center flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="relative h-8 w-8 lg:h-10 lg:w-10 rounded-full ring-2 ring-orange-500/20 hover:ring-orange-500/40 transition-all duration-300 p-0"
                    data-testid="user-menu-trigger"
                  >
                    <Avatar className="h-7 w-7 lg:h-9 lg:w-9">
                      <AvatarImage src={(user as any)?.profilePicture} alt="User" />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
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
                  <DropdownMenuItem
                    onClick={() => window.location.href = '/'}
                    className="cursor-pointer sm:hidden"
                  >
                    <Home className="mr-2 h-4 w-4" />
                    <span>Torna alla Home</span>
                  </DropdownMenuItem>
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
                    <User className="mr-2 h-4 w-4" />
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
    </div>
  );
}
