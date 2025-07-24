import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Store, 
  Beer, 
  Users, 
  TrendingUp, 
  Plus, 
  Edit3, 
  Eye,
  EyeOff,
  DollarSign,
  Calendar,
  Activity,
  Settings,
  Image,
  MapPin,
  Phone,
  Mail,
  Globe,
  ArrowLeft,
  ChevronRight,
  Menu as MenuIcon,
  Utensils,
  BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

type DashboardSection = 'overview' | 'taplist' | 'menu' | 'analytics' | 'settings' | 'profile';

export default function PubDashboardNew() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentSection, setCurrentSection] = useState<DashboardSection>('overview');
  const [editingItem, setEditingItem] = useState<number | null>(null);

  // Fetch pub data
  const { data: userPubs, isLoading: pubsLoading } = useQuery({
    queryKey: ["/api/pubs/by-owner"],
    enabled: isAuthenticated && user?.userType === 'pub_owner',
  });

  const currentPub = userPubs?.[0];

  // Fetch tap list
  const { data: tapList = [] } = useQuery({
    queryKey: ["/api/pubs", currentPub?.id, "taplist"],
    enabled: !!currentPub?.id,
  });

  // Fetch bottle list
  const { data: bottleList = [] } = useQuery({
    queryKey: ["/api/pubs", currentPub?.id, "bottles"],
    enabled: !!currentPub?.id,
  });

  // Fetch menu data
  const { data: menuData = [] } = useQuery({
    queryKey: ["/api/pubs", currentPub?.id, "menu"],
    enabled: !!currentPub?.id,
  });

  const sections = [
    { id: 'overview', name: 'Dashboard', icon: TrendingUp },
    { id: 'taplist', name: 'Spine e Bottiglie', icon: Beer },
    { id: 'menu', name: 'Menu Cibo', icon: Utensils },
    { id: 'analytics', name: 'Analytics', icon: BarChart3 },
    { id: 'profile', name: 'Profilo Pub', icon: Store },
    { id: 'settings', name: 'Impostazioni', icon: Settings },
  ];

  const renderMobileHeader = () => (
    <div className="md:hidden bg-white dark:bg-gray-900 border-b p-4 flex items-center gap-3">
      {currentSection !== 'overview' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentSection('overview')}
          className="text-orange-600 dark:text-orange-400"
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
      <Card className="bg-gradient-to-br from-orange-50 to-red-100 dark:from-orange-950 dark:to-red-900 border-orange-200 dark:border-orange-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="bg-orange-500 p-4 rounded-xl">
              <Store className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                {currentPub?.name || 'Il Tuo Pub'}
              </h2>
              <p className="text-orange-700 dark:text-orange-300">
                Gestisci il tuo locale dalla dashboard
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                <Beer className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {tapList.length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Spine Attive</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
                <Beer className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {bottleList.length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Bottiglie</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-lg">
                <Utensils className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {menuData.reduce((acc: number, cat: any) => acc + (cat.items?.length || 0), 0)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Piatti Menu</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 dark:bg-orange-900 p-2 rounded-lg">
                <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">4.8</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Rating Medio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Menu - Mobile Only */}
      <div className="md:hidden grid grid-cols-2 gap-4">
        {sections.slice(1).map((section) => {
          const Icon = section.icon;
          return (
            <Card 
              key={section.id}
              className="cursor-pointer hover:shadow-md transition-all active:scale-95"
              onClick={() => setCurrentSection(section.id as DashboardSection)}
            >
              <CardContent className="p-4 text-center">
                <Icon className="h-6 w-6 mx-auto mb-2 text-orange-600 dark:text-orange-400" />
                <p className="font-medium text-sm text-gray-900 dark:text-white">{section.name}</p>
                <ChevronRight className="h-4 w-4 mx-auto mt-1 text-gray-400" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Attività Recenti
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { action: 'Aggiunta nuova birra', item: 'Punk IPA', time: '2 ore fa', type: 'beer' },
              { action: 'Modificato prezzo', item: 'Super Baladin', time: '1 giorno fa', type: 'price' },
              { action: 'Nuovo piatto menu', item: 'Hamburger Gourmet', time: '3 giorni fa', type: 'food' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className={`p-2 rounded-full ${
                  activity.type === 'beer' ? 'bg-blue-100 dark:bg-blue-900' :
                  activity.type === 'price' ? 'bg-green-100 dark:bg-green-900' :
                  'bg-purple-100 dark:bg-purple-900'
                }`}>
                  {activity.type === 'beer' ? <Beer className="h-4 w-4 text-blue-600 dark:text-blue-400" /> :
                   activity.type === 'price' ? <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" /> :
                   <Utensils className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{activity.action}: {activity.item}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTapList = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h3 className="text-xl font-semibold">Gestione Birre</h3>
          <p className="text-gray-600 dark:text-gray-400">Spine attive e bottiglie disponibili</p>
        </div>
        <Button className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi Birra
        </Button>
      </div>

      {/* Tap List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Beer className="h-5 w-5 text-blue-600" />
            Spine Attive ({tapList.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tapList.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              Nessuna birra alla spina configurata
            </p>
          ) : (
            <div className="space-y-3">
              {tapList.map((tap: any) => (
                <div key={tap.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {tap.beer?.imageUrl && (
                    <img 
                      src={tap.beer.imageUrl} 
                      alt={tap.beer.name}
                      className="w-12 h-12 rounded object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <h4 className="font-medium truncate">{tap.beer?.name}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {tap.beer?.style}
                      </Badge>
                      {tap.isActive ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          <Eye className="h-3 w-3 mr-1" />
                          Attiva
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Non attiva
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{tap.beer?.brewery}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm font-medium">€{tap.price}</span>
                      <span className="text-xs text-gray-500">{tap.size}ml</span>
                      {tap.beer?.abv && <span className="text-xs text-gray-500">{tap.beer.abv}% ABV</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottle List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Beer className="h-5 w-5 text-green-600" />
            Bottiglie Disponibili ({bottleList.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bottleList.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              Nessuna bottiglia in cantina configurata
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bottleList.map((bottle: any) => (
                <div key={bottle.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {bottle.beer?.bottleImageUrl && (
                    <img 
                      src={bottle.beer.bottleImageUrl} 
                      alt={bottle.beer.name}
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{bottle.beer?.name}</h4>
                    <p className="text-xs text-gray-500">{bottle.beer?.brewery}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-medium">€{bottle.price}</span>
                      <span className="text-xs text-gray-500">{bottle.size}ml</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Edit3 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderMenu = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Utensils className="h-5 w-5" />
          Menu Cibo
        </CardTitle>
      </CardHeader>
      <CardContent>
        {menuData.length === 0 ? (
          <div className="text-center py-8">
            <Utensils className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">Nessun menu configurato</p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Crea Menu
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {menuData.map((category: any) => (
              <div key={category.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">{category.name}</h3>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi Piatto
                  </Button>
                </div>
                <div className="space-y-3">
                  {category.items?.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      <div>
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-gray-500">{item.description}</p>
                        <span className="text-sm font-medium">€{item.price}</span>
                      </div>
                      <Button variant="outline" size="sm">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics Pub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Birre più Richieste</h4>
              <div className="space-y-2">
                {['Punk IPA', 'Super Baladin', 'Guinness'].map((beer, index) => (
                  <div key={beer} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="text-sm">{beer}</span>
                    <Badge variant="secondary">{[45, 32, 28][index]} ordini</Badge>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">Visitatori Ultima Settimana</h4>
              <div className="text-center py-8">
                <div className="text-3xl font-bold text-blue-600">245</div>
                <p className="text-sm text-gray-500">visitatori unici</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderProfile = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          Profilo Pub
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {currentPub ? (
          <>
            <div className="flex items-center gap-4">
              {currentPub.logoUrl && (
                <img 
                  src={currentPub.logoUrl} 
                  alt={currentPub.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
              )}
              <div>
                <h3 className="text-xl font-semibold">{currentPub.name}</h3>
                <p className="text-gray-500">{currentPub.city}</p>
                <Badge className="mt-1">Pub Verificato</Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Indirizzo</label>
                  <div className="flex items-center gap-2 mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{currentPub.address}</span>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Telefono</label>
                  <div className="flex items-center gap-2 mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{currentPub.phone || 'Non specificato'}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <div className="flex items-center gap-2 mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{currentPub.email || 'Non specificato'}</span>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sito Web</label>
                  <div className="flex items-center gap-2 mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{currentPub.website || 'Non specificato'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Descrizione</label>
              <p className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded border text-sm">
                {currentPub.description || 'Nessuna descrizione disponibile'}
              </p>
            </div>

            <Button className="w-full">
              <Edit3 className="h-4 w-4 mr-2" />
              Modifica Profilo Pub
            </Button>
          </>
        ) : (
          <div className="text-center py-8">
            <Store className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">Nessun pub registrato</p>
            <Button>Registra il Tuo Pub</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Impostazioni Pub
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <h4 className="font-medium">Visibilità Pubblica</h4>
            <p className="text-sm text-gray-500">Il pub è visibile nelle ricerche</p>
          </div>
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Attivo
          </Badge>
        </div>
        
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <h4 className="font-medium">Notifiche Ordini</h4>
            <p className="text-sm text-gray-500">Ricevi notifiche per nuovi ordini</p>
          </div>
          <Button variant="outline" size="sm">Gestisci</Button>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <h4 className="font-medium">Orari di Apertura</h4>
            <p className="text-sm text-gray-500">Configura gli orari del locale</p>
          </div>
          <Button variant="outline" size="sm">Modifica</Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderContent = () => {
    switch (currentSection) {
      case 'overview':
        return renderOverview();
      case 'taplist':
        return renderTapList();
      case 'menu':
        return renderMenu();
      case 'analytics':
        return renderAnalytics();
      case 'profile':
        return renderProfile();
      case 'settings':
        return renderSettings();
      default:
        return renderOverview();
    }
  };

  if (!isAuthenticated || user?.userType !== 'pub_owner') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Store className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">Accesso Riservato</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Solo i proprietari di pub possono accedere a questa dashboard
            </p>
            <Button asChild className="w-full">
              <a href={user ? "/" : "/api/login"}>
                {user ? "Torna alla Home" : "Accedi"}
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pubsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Caricamento dashboard...</p>
        </div>
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
                  <Store className="h-5 w-5" />
                  Dashboard Pub
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