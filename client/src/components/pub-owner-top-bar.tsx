import React from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
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
  const [, navigate] = useLocation();
  return (
    <div
      className="sticky lg:top-0 z-40 w-full"
      style={{ top: 'calc(3.5rem + var(--frozen-sat))' }}
    >
      <motion.div 
        className="glass-card border-b border-white/20 dark:border-[#23262E]/50 backdrop-blur-xl bg-white/80 dark:bg-[#0B0D10]/80"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex items-center h-12 lg:h-16 gap-1 lg:gap-4">
            
            {/* Left - Pub Logo as dropdown trigger */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex-shrink-0 focus:outline-none" data-testid="pub-menu-trigger">
                  {currentPub?.logoUrl ? (
                    <Avatar className="h-8 w-8 lg:h-10 lg:w-10 ring-2 ring-orange-500/20 hover:ring-orange-500/40 transition-all">
                      <AvatarImage src={currentPub.logoUrl} alt={currentPub.name} />
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-bold text-xs">
                        {currentPub.name?.[0] || 'P'}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-8 w-8 lg:h-10 lg:w-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center hover:opacity-90 transition-all ring-2 ring-orange-500/20">
                      <Store className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52 glass-card border-white/20">
                <div className="px-3 py-2">
                  <p className="text-sm font-bold text-foreground dark:text-white">{currentPub?.name || 'Dashboard'}</p>
                  <p className="text-xs text-muted-foreground">Pannello Gestionale</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/')} className="cursor-pointer">
                  <Home className="mr-2 h-4 w-4" />
                  <span>Torna alla Home</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCurrentSection('settings')} className="cursor-pointer" data-testid="menu-impostazioni">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  <span>Impostazioni</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrentSection('profile')} className="cursor-pointer" data-testid="menu-profilo">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profilo</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => { if (onLogout) onLogout(); else navigate('/'); }}
                  className="cursor-pointer text-red-600 dark:text-red-400"
                  data-testid="menu-esci"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Esci</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Center - Section icons (icon-only on mobile, icon+label on desktop) */}
            <div className="flex-1 flex items-center justify-center">
              <nav className="flex items-center gap-0.5 lg:gap-1 bg-stone-100/50 dark:bg-[#1A1D24]/50 rounded-xl lg:rounded-2xl p-0.5 lg:p-1">
                {sections.map((section, index) => {
                  const Icon = section.icon;
                  const isActive = currentSection === section.id;
                  
                  return (
                    <motion.button
                      key={section.id}
                      onClick={() => setCurrentSection(section.id)}
                      className={`relative flex items-center justify-center p-2 lg:px-3 lg:py-2 rounded-lg lg:rounded-xl text-sm font-medium transition-all duration-300 ${
                        isActive
                          ? 'text-white shadow-lg'
                          : 'text-muted-foreground dark:text-stone-400 hover:text-foreground dark:hover:text-white hover:bg-white/50 dark:hover:bg-[#12151A]/50'
                      }`}
                      data-testid={`nav-${section.id}`}
                      whileTap={{ scale: 0.9 }}
                      title={section.name}
                    >
                      {isActive && (
                        <motion.div
                          className={`absolute inset-0 bg-gradient-to-r ${section.gradient} rounded-lg lg:rounded-xl`}
                          layoutId="activeTab"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                        />
                      )}
                      <div className="relative z-10 flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span className="hidden xl:block text-sm">{section.name}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </nav>
            </div>

            {/* Right - User avatar as dropdown trigger */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex-shrink-0 focus:outline-none" data-testid="user-menu-trigger">
                  <Avatar className="h-8 w-8 lg:h-10 lg:w-10 ring-2 ring-blue-500/20 hover:ring-blue-500/40 transition-all cursor-pointer">
                    <AvatarImage src={(user as any)?.profilePicture} alt="User" />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                      {(user as any)?.displayName?.[0] || (user as any)?.email?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 glass-card border-white/20">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium text-foreground dark:text-white">
                    {(user as any)?.displayName || 'Pub Owner'}
                  </p>
                  <p className="text-xs text-muted-foreground dark:text-stone-400">
                    {(user as any)?.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground dark:text-stone-400 flex items-center gap-2">
                  <RefreshCw className="h-3 w-3" />
                  Cambia Ruolo
                </DropdownMenuLabel>
                <div className="px-2 py-1">
                  <RoleSwitcher compact />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCurrentSection('profile')} className="cursor-pointer" data-testid="menu-profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profilo</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrentSection('settings')} className="cursor-pointer" data-testid="menu-settings">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  <span>Impostazioni</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-red-600 dark:text-red-400"
                  data-testid="menu-logout"
                  onClick={() =>
                    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
                      .finally(() => { window.location.href = '/'; })
                  }
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Esci</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
