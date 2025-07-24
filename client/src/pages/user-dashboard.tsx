import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  ArrowLeft
} from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

type DashboardSection = 'overview' | 'favorites' | 'activity' | 'profile' | 'settings';

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

  const sections = [
    { id: 'overview', name: 'Dashboard', icon: TrendingUp },
    { id: 'favorites', name: 'Preferiti', icon: Heart },
    { id: 'activity', name: 'Attività', icon: Activity },
    { id: 'profile', name: 'Profilo', icon: User },
    { id: 'settings', name: 'Impostazioni', icon: Settings },
  ];

  const renderMobileHeader = () => (
    <div className="md:hidden bg-white dark:bg-gray-900 border-b p-4 flex items-center gap-3">
      {currentSection !== 'overview' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentSection('overview')}
          className="text-blue-600 dark:text-blue-400"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
        {sections.find(s => s.id === currentSection)?.name || 'Dashboard'}
      </h1>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.profileImageUrl || ''} />
              <AvatarFallback className="bg-blue-500 text-white text-lg">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                Ciao, {user?.firstName || 'Utente'}!
              </h2>
              <p className="text-blue-700 dark:text-blue-300">
                Benvenuto nella tua dashboard personale
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 dark:bg-red-900 p-3 rounded-lg">
                <Heart className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {favorites.length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Preferiti Totali</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg">
                <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {activities.length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Attività Recenti</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
                <Star className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {pubFavorites.length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pub Preferiti</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Menu - Only on mobile overview */}
      <div className="md:hidden grid grid-cols-2 gap-4">
        {sections.slice(1).map((section) => {
          const Icon = section.icon;
          return (
            <Card 
              key={section.id}
              className="cursor-pointer hover:shadow-md transition-all active:scale-95"
              onClick={() => setCurrentSection(section.id as DashboardSection)}
            >
              <CardContent className="p-6 text-center">
                <Icon className="h-8 w-8 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                <p className="font-medium text-gray-900 dark:text-white">{section.name}</p>
                <ChevronRight className="h-4 w-4 mx-auto mt-1 text-gray-400" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderFavorites = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pub Favorites */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-orange-600" />
              Pub ({pubFavorites.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pubFavorites.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nessun pub preferito</p>
            ) : (
              pubFavorites.slice(0, 3).map((fav: any) => (
                <div key={fav.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Store className="h-4 w-4 text-orange-600" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{fav.itemName}</p>
                    <p className="text-xs text-gray-500">{fav.itemLocation}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Brewery Favorites */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Beer className="h-5 w-5 text-amber-600" />
              Birrifici ({breweryFavorites.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {breweryFavorites.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nessun birrificio preferito</p>
            ) : (
              breweryFavorites.slice(0, 3).map((fav: any) => (
                <div key={fav.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Beer className="h-4 w-4 text-amber-600" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{fav.itemName}</p>
                    <p className="text-xs text-gray-500">{fav.itemLocation}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Beer Favorites */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-600" />
              Birre ({beerFavorites.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {beerFavorites.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nessuna birra preferita</p>
            ) : (
              beerFavorites.slice(0, 3).map((fav: any) => (
                <div key={fav.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Star className="h-4 w-4 text-yellow-600" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{fav.itemName}</p>
                    <p className="text-xs text-gray-500">{fav.itemStyle}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderActivity = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Attività Recenti
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Nessuna attività recente</p>
        ) : (
          <div className="space-y-4">
            {activities.slice(0, 10).map((activity: any) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full flex-shrink-0">
                  <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{activity.description}</p>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: it })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderProfile = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profilo Utente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user?.profileImageUrl || ''} />
            <AvatarFallback className="bg-blue-500 text-white text-xl">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-semibold">{user?.firstName} {user?.lastName}</h3>
            <p className="text-gray-500">{user?.email}</p>
            <Badge variant="secondary" className="mt-1">
              {user?.userType === 'customer' ? 'Cliente' : 'Utente'}
            </Badge>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome</label>
            <p className="mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded border">
              {user?.firstName || 'Non specificato'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cognome</label>
            <p className="mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded border">
              {user?.lastName || 'Non specificato'}
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <p className="mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded border">
              {user?.email}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Impostazioni Account
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <h4 className="font-medium">Notifiche Email</h4>
            <p className="text-sm text-gray-500">Ricevi aggiornamenti sui tuoi pub preferiti</p>
          </div>
          <Button variant="outline" size="sm">Gestisci</Button>
        </div>
        
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <h4 className="font-medium">Privacy</h4>
            <p className="text-sm text-gray-500">Controlla la visibilità del tuo profilo</p>
          </div>
          <Button variant="outline" size="sm">Modifica</Button>
        </div>

        <div className="pt-4 border-t">
          <Button 
            variant="destructive" 
            className="w-full"
            onClick={() => window.location.href = '/api/logout'}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Esci dall'Account
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderContent = () => {
    switch (currentSection) {
      case 'overview':
        return renderOverview();
      case 'favorites':
        return renderFavorites();
      case 'activity':
        return renderActivity();
      case 'profile':
        return renderProfile();
      case 'settings':
        return renderSettings();
      default:
        return renderOverview();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">Accesso Richiesto</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Effettua l'accesso per vedere la tua dashboard
            </p>
            <Button asChild className="w-full">
              <a href="/api/login">Accedi</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {renderMobileHeader()}
      
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dashboard Utente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <Button
                      key={section.id}
                      variant={currentSection === section.id ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setCurrentSection(section.id as DashboardSection)}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {section.name}
                    </Button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}