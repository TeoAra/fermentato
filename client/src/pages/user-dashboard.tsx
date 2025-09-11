import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  User, 
  Heart, 
  Activity, 
  Star, 
  Beer, 
  Store, 
  Calendar,
  TrendingUp,
  MapPin,
  Eye,
  Settings,
  LogOut,
  ChevronRight,
  ArrowLeft,
  Award,
  Target,
  Clock,
  Compass,
  Bookmark,
  Trophy,
  Zap,
  Users,
  BarChart3,
  Camera,
  Edit3,
  Bell,
  Gift,
  Sparkles,
  MessageCircle,
  ThumbsUp
} from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

type DashboardSection = 'overview' | 'favorites' | 'activity' | 'profile' | 'settings' | 'discoveries';

export default function UserDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [currentSection, setCurrentSection] = useState<DashboardSection>('overview');

  // Fetch user data
  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["/api/user-activities"],
    enabled: isAuthenticated,
  });

  // Separate favorites by type
  const pubFavorites = favorites.filter((fav: any) => fav.itemType === 'pub');
  const breweryFavorites = favorites.filter((fav: any) => fav.itemType === 'brewery');
  const beerFavorites = favorites.filter((fav: any) => fav.itemType === 'beer');

  // Enhanced sections with gradients
  const sections = [
    { id: 'overview', name: 'Dashboard', icon: TrendingUp, gradient: 'from-blue-500 to-purple-600' },
    { id: 'discoveries', name: 'Scoperte', icon: Compass, gradient: 'from-emerald-500 to-teal-600' },
    { id: 'favorites', name: 'Preferiti', icon: Heart, gradient: 'from-rose-500 to-pink-600' },
    { id: 'activity', name: 'Attività', icon: Activity, gradient: 'from-orange-500 to-red-600' },
    { id: 'profile', name: 'Profilo', icon: User, gradient: 'from-indigo-500 to-purple-600' },
    { id: 'settings', name: 'Impostazioni', icon: Settings, gradient: 'from-gray-500 to-slate-600' },
  ];

  // Modern User Stats KPI Card
  const UserStatsCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    trendValue, 
    gradient, 
    description,
    badge
  }: {
    title: string;
    value: string | number;
    icon: any;
    trend?: 'up' | 'down' | 'stable';
    trendValue?: string;
    gradient: string;
    description?: string;
    badge?: string;
  }) => (
    <div className="glass-card rounded-2xl p-6 hover:scale-105 transition-all duration-300 group relative overflow-hidden">
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} bg-opacity-10 group-hover:bg-opacity-20 transition-all duration-300`}>
            <Icon className={`h-6 w-6 text-transparent bg-gradient-to-br ${gradient} bg-clip-text`} />
          </div>
          <div className="flex items-center space-x-2">
            {badge && (
              <Badge variant="secondary" className="text-xs bg-white/50 text-gray-700">
                {badge}
              </Badge>
            )}
            {trend && trendValue && (
              <div className={`flex items-center text-sm ${
                trend === 'up' ? 'text-green-600' : 
                trend === 'down' ? 'text-red-600' : 
                'text-gray-600'
              }`}>
                {trend === 'up' && <TrendingUp className="h-4 w-4" />}
                {trend === 'down' && <TrendingUp className="h-4 w-4 rotate-180" />}
                {trend === 'stable' && <div className="w-4 h-0.5 bg-current rounded" />}
                <span className="ml-1">{trendValue}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-100 transition-colors">
            {value}
          </h3>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {description}
            </p>
          )}
        </div>
      </div>
      
      {/* Hover Effect */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
    </div>
  );

  // Achievement Badge Component
  const AchievementBadge = ({ title, description, icon: Icon, unlocked = false }: {
    title: string;
    description: string;
    icon: any;
    unlocked?: boolean;
  }) => (
    <div className={`glass-card rounded-xl p-4 transition-all duration-300 ${
      unlocked ? 'hover:scale-105' : 'opacity-60'
    }`}>
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${
          unlocked 
            ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' 
            : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
        }`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h4 className={`font-semibold text-sm ${
            unlocked ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
          }`}>
            {title}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  );

  // Modern Overview Section
  const renderOverview = () => (
    <div className="space-y-8 fade-in">
      {/* Hero Welcome Section */}
      <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-20 w-20 ring-4 ring-white/20">
                  <AvatarImage src={user?.profileImageUrl || ''} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              <div>
                <h1 className="text-display-lg text-gray-900 dark:text-white mb-2">
                  Ciao, {user?.firstName || 'Utente'}! 👋
                </h1>
                <p className="text-body-medium text-gray-600 dark:text-gray-400 mb-1">
                  Benvenuto nella tua dashboard birraia
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Attivo da Luglio 2024
                  </div>
                  <div className="flex items-center">
                    <Award className="h-4 w-4 mr-1" />
                    Esploratore Birraio
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" className="btn-glass">
                <Edit3 className="h-4 w-4 mr-2" />
                Modifica Profilo
              </Button>
              <Button size="sm" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                <Compass className="h-4 w-4 mr-2" />
                Esplora
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modern User Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <UserStatsCard
          title="Preferiti Totali"
          value={favorites.length}
          icon={Heart}
          gradient="from-rose-500 to-pink-600"
          trend="up"
          trendValue="+3"
          description="Pub, birrifici e birre salvati"
        />
        <UserStatsCard
          title="Pub Visitati"
          value={pubFavorites.length}
          icon={Store}
          gradient="from-amber-500 to-orange-600"
          trend="up"
          trendValue="+2"
          description="Locali aggiunti ai preferiti"
          badge="Nuovo!"
        />
        <UserStatsCard
          title="Birrifici Scoperti"
          value={breweryFavorites.length}
          icon={Beer}
          gradient="from-emerald-500 to-green-600"
          trend="stable"
          trendValue="=0"
          description="Produttori esplorati"
        />
        <UserStatsCard
          title="Birre Assaggiate"
          value={beerFavorites.length}
          icon={Sparkles}
          gradient="from-purple-500 to-indigo-600"
          trend="up"
          trendValue="+1"
          description="Gusti diversi provati"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="modern-card rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-b">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Activity className="mr-3 h-5 w-5 text-blue-600" />
                  <span className="text-display-lg">Attività Recente</span>
                </div>
                <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                  Ultimi 7 giorni
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {favorites.slice(0, 5).map((fav: any, index: number) => (
                  <div key={fav.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-sm">
                        {fav.itemType === 'pub' && <Store className="h-5 w-5" />}
                        {fav.itemType === 'brewery' && <Beer className="h-5 w-5" />}
                        {fav.itemType === 'beer' && <Sparkles className="h-5 w-5" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          Hai aggiunto {fav.itemName} ai preferiti
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDistanceToNow(new Date(fav.createdAt), { addSuffix: true, locale: it })}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {favorites.length === 0 && (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Nessuna attività recente. Inizia esplorando!
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Content */}
        <div className="space-y-6">
          {/* Personal Goals */}
          <Card className="modern-card rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
              <CardTitle className="flex items-center">
                <Target className="mr-3 h-5 w-5 text-purple-600" />
                <span className="text-lg">I Tuoi Obiettivi</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Pub da Visitare</span>
                    <span className="font-semibold">{pubFavorites.length}/10</span>
                  </div>
                  <Progress value={(pubFavorites.length / 10) * 100} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Birrifici da Scoprire</span>
                    <span className="font-semibold">{breweryFavorites.length}/15</span>
                  </div>
                  <Progress value={(breweryFavorites.length / 15) * 100} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Stili Birra Assaggiati</span>
                    <span className="font-semibold">{beerFavorites.length}/25</span>
                  </div>
                  <Progress value={(beerFavorites.length / 25) * 100} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card className="modern-card rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950">
              <CardTitle className="flex items-center">
                <Trophy className="mr-3 h-5 w-5 text-yellow-600" />
                <span className="text-lg">Traguardi</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <AchievementBadge
                  title="Primo Preferito"
                  description="Hai aggiunto il tuo primo locale"
                  icon={Heart}
                  unlocked={favorites.length > 0}
                />
                <AchievementBadge
                  title="Esploratore"
                  description="Hai visitato 5 pub diversi"
                  icon={Compass}
                  unlocked={pubFavorites.length >= 5}
                />
                <AchievementBadge
                  title="Intenditor​e"
                  description="Hai provato 10 birre diverse"
                  icon={Beer}
                  unlocked={beerFavorites.length >= 10}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile Navigation Grid - Only on mobile overview */}
      <div className="md:hidden grid grid-cols-2 gap-4">
        {sections.slice(1).map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.id}
              className="glass-card rounded-xl p-6 text-center cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200"
              onClick={() => setCurrentSection(section.id as DashboardSection)}
            >
              <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${section.gradient} flex items-center justify-center`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{section.name}</p>
              <ChevronRight className="h-4 w-4 mx-auto text-gray-400" />
            </div>
          );
        })}
      </div>
    </div>
  );

  // Modern Favorites Section
  const renderFavorites = () => (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-display-lg text-gray-900 dark:text-white">I Tuoi Preferiti</h2>
        <Badge variant="secondary" className="bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
          {favorites.length} elementi
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pub Favorites */}
        <Card className="modern-card rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Store className="mr-3 h-5 w-5 text-orange-600" />
                <span>Pub</span>
              </div>
              <Badge variant="outline" className="border-orange-200 text-orange-800">
                {pubFavorites.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {pubFavorites.length === 0 ? (
                <div className="text-center py-8">
                  <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Nessun pub preferito
                  </p>
                </div>
              ) : (
                pubFavorites.slice(0, 5).map((fav: any) => (
                  <div key={fav.id} className="flex items-center gap-3 p-3 glass-card rounded-lg hover:scale-102 transition-transform">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white">
                      <Store className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-gray-900 dark:text-white">
                        {fav.itemName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {fav.itemLocation || 'Posizione'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Brewery Favorites */}
        <Card className="modern-card rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Beer className="mr-3 h-5 w-5 text-emerald-600" />
                <span>Birrifici</span>
              </div>
              <Badge variant="outline" className="border-emerald-200 text-emerald-800">
                {breweryFavorites.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {breweryFavorites.length === 0 ? (
                <div className="text-center py-8">
                  <Beer className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Nessun birrificio preferito
                  </p>
                </div>
              ) : (
                breweryFavorites.slice(0, 5).map((fav: any) => (
                  <div key={fav.id} className="flex items-center gap-3 p-3 glass-card rounded-lg hover:scale-102 transition-transform">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white">
                      <Beer className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-gray-900 dark:text-white">
                        {fav.itemName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {fav.itemLocation || 'Località'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Beer Favorites */}
        <Card className="modern-card rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Sparkles className="mr-3 h-5 w-5 text-purple-600" />
                <span>Birre</span>
              </div>
              <Badge variant="outline" className="border-purple-200 text-purple-800">
                {beerFavorites.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {beerFavorites.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Nessuna birra preferita
                  </p>
                </div>
              ) : (
                beerFavorites.slice(0, 5).map((fav: any) => (
                  <div key={fav.id} className="flex items-center gap-3 p-3 glass-card rounded-lg hover:scale-102 transition-transform">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-gray-900 dark:text-white">
                        {fav.itemName}
                      </p>
                      <p className="text-xs text-gray-500">
                        Birra preferita
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Modern Mobile Header
  const renderMobileHeader = () => (
    <div className="md:hidden glass-card border-b p-4 flex items-center gap-3 sticky top-0 z-50">
      {currentSection !== 'overview' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentSection('overview')}
          className="text-primary hover:text-primary/80"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${sections.find(s => s.id === currentSection)?.gradient || 'from-blue-500 to-purple-600'}`}>
          {sections.find(s => s.id === currentSection)?.icon && 
            React.createElement(sections.find(s => s.id === currentSection)!.icon, { className: "w-5 h-5 text-white" })
          }
        </div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          {sections.find(s => s.id === currentSection)?.name || 'Dashboard'}
        </h1>
      </div>
    </div>
  );

  // Modern Sidebar
  const renderSidebar = () => (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="glass-card flex-1 flex flex-col min-h-0 border-r">
        <div className="flex items-center h-16 flex-shrink-0 px-6 border-b">
          <div className="flex items-center">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
              <User className="w-6 h-6 text-white" />
            </div>
            <span className="ml-3 text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Il Tuo Profilo
            </span>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <nav className="flex-1 px-4 space-y-2">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = currentSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setCurrentSection(section.id as DashboardSection)}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl w-full text-left transition-all duration-200 ${
                    isActive
                      ? `bg-gradient-to-r ${section.gradient} text-white shadow-lg transform scale-105`
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white hover:scale-102'
                  }`}
                  data-testid={`nav-${section.id}`}
                >
                  <Icon className={`mr-3 h-5 w-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                  {section.name}
                  {isActive && <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>}
                </button>
              );
            })}
          </nav>
          
          {/* User Info */}
          <div className="p-4 border-t">
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.profileImageUrl || ''} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                  {user?.firstName?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  Esploratore Birraio
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950">
        <div className="text-center space-y-4">
          <User className="w-16 h-16 text-gray-400 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Accesso richiesto</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Effettua l'accesso per vedere la tua dashboard personale.
          </p>
          <Button className="mt-4">
            Accedi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950">
      {renderMobileHeader()}
      
      <div className="flex">
        {renderSidebar()}
        
        {/* Main Content */}
        <div className="flex-1 md:ml-64">
          <div className="p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
              {currentSection === 'overview' && renderOverview()}
              {currentSection === 'favorites' && renderFavorites()}
              
              {/* Placeholder for other sections */}
              {!['overview', 'favorites'].includes(currentSection) && (
                <div className="text-center py-16">
                  <div className="space-y-4">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${sections.find(s => s.id === currentSection)?.gradient} mx-auto flex items-center justify-center`}>
                      {sections.find(s => s.id === currentSection)?.icon && 
                        React.createElement(sections.find(s => s.id === currentSection)!.icon, { className: "w-8 h-8 text-white" })
                      }
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {sections.find(s => s.id === currentSection)?.name}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Sezione in fase di sviluppo con il nuovo design system.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 glass-card border-t safe-area-pb">
        <div className="grid grid-cols-3 gap-1 p-2">
          {sections.slice(0, 3).map((section) => {
            const Icon = section.icon;
            const isActive = currentSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setCurrentSection(section.id as DashboardSection)}
                className={`flex flex-col items-center py-3 px-2 text-xs rounded-xl transition-all duration-200 ${
                  isActive
                    ? `bg-gradient-to-t ${section.gradient} text-white shadow-lg scale-105`
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                data-testid={`mobile-nav-${section.id}`}
              >
                <Icon className={`w-5 h-5 mb-1 transition-transform ${isActive ? 'scale-110' : ''}`} />
                <span className="truncate font-medium">{section.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}