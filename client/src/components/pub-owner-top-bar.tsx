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
  Store
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type DashboardSection = 'overview' | 'taplist' | 'bottles' | 'menu' | 'analytics' | 'settings' | 'profile';

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
}

export function PubOwnerTopBar({ 
  currentSection, 
  setCurrentSection, 
  sections, 
  currentPub,
  user 
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
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Pannello Gestionale
                  </p>
                </div>
              </motion.div>

              {/* Crown Badge for Premium */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white border-0 hidden md:flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  Owner
                </Badge>
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

              {/* Mobile Menu Button */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="lg:hidden h-10 w-10"
                    data-testid="mobile-menu-trigger"
                  >
                    <MenuIcon className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 glass-card border-white/20">
                  <div className="flex flex-col space-y-4 mt-8">
                    <div className="text-center pb-4 border-b border-white/20">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Navigazione
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Gestisci il tuo pub
                      </p>
                    </div>
                    
                    <nav className="space-y-2">
                      {sections.map((section, index) => {
                        const Icon = section.icon;
                        const isActive = currentSection === section.id;
                        
                        return (
                          <motion.button
                            key={section.id}
                            onClick={() => {
                              setCurrentSection(section.id);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-300 ${
                              isActive
                                ? `bg-gradient-to-r ${section.gradient} text-white shadow-lg`
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                            data-testid={`mobile-nav-${section.id}`}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            whileHover={{ scale: 1.02, x: 5 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className={`p-2 rounded-lg ${
                              isActive 
                                ? 'bg-white/20' 
                                : `bg-gradient-to-br ${section.gradient} bg-opacity-10`
                            }`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <span className="font-medium">{section.name}</span>
                              {section.id === 'overview' && (
                                <p className="text-xs opacity-75">Panoramica generale</p>
                              )}
                              {section.id === 'taplist' && (
                                <p className="text-xs opacity-75">Gestisci le birre alla spina</p>
                              )}
                              {section.id === 'bottles' && (
                                <p className="text-xs opacity-75">Gestisci la cantina</p>
                              )}
                              {section.id === 'menu' && (
                                <p className="text-xs opacity-75">Gestisci menu e prodotti</p>
                              )}
                              {section.id === 'analytics' && (
                                <p className="text-xs opacity-75">Statistiche e report</p>
                              )}
                              {section.id === 'settings' && (
                                <p className="text-xs opacity-75">Configurazioni pub</p>
                              )}
                              {section.id === 'profile' && (
                                <p className="text-xs opacity-75">Il tuo profilo</p>
                              )}
                            </div>
                            {isActive && (
                              <motion.div
                                className="ml-auto"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2 }}
                              >
                                <Sparkles className="h-4 w-4" />
                              </motion.div>
                            )}
                          </motion.button>
                        );
                      })}
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}