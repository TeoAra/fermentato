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

export default function SmartPubDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentSection, setCurrentSection] = useState<DashboardSection>('overview');
  const [editingItem, setEditingItem] = useState<number | null>(null);

  // Fetch pub data
  const { data: userPubs, isLoading: pubsLoading } = useQuery({
    queryKey: ["/api/my-pubs"],
    enabled: isAuthenticated && (user as any)?.userType === 'pub_owner',
  });

  const currentPub = Array.isArray(userPubs) ? userPubs[0] : null;

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

  // Type assertions for data
  const typedTapList = Array.isArray(tapList) ? tapList : [];
  const typedBottleList = Array.isArray(bottleList) ? bottleList : [];
  const typedMenuData = Array.isArray(menuData) ? menuData : [];

  if (!isAuthenticated || (user as any)?.userType !== 'pub_owner') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Store className="mx-auto text-gray-400 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Accesso Riservato</h2>
          <p className="text-gray-600">Questa area è riservata ai proprietari di pub.</p>
        </div>
      </div>
    );
  }

  if (pubsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentPub) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Store className="mx-auto text-gray-400 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Nessun Pub Registrato</h2>
          <p className="text-gray-600 mb-4">Non hai ancora registrato un pub.</p>
          <Button onClick={() => window.location.href = "/pub-registration"}>
            Registra il tuo Pub
          </Button>
        </div>
      </div>
    );
  }

  const sections = [
    { id: 'overview', name: 'Dashboard', icon: TrendingUp },
    { id: 'taplist', name: 'Spine e Bottiglie', icon: Beer },
    { id: 'menu', name: 'Menu', icon: Utensils },
    { id: 'analytics', name: 'Statistiche', icon: BarChart3 },
    { id: 'settings', name: 'Impostazioni', icon: Settings },
    { id: 'profile', name: 'Profilo Pub', icon: Store },
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{currentPub.name}</h1>
          <p className="text-gray-600">{currentPub.address}</p>
        </div>
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          Attivo
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Beer className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Birre alla Spina</p>
                <p className="text-2xl font-bold text-gray-900">{typedTapList.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Store className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Birre in Bottiglia</p>
                <p className="text-2xl font-bold text-gray-900">{typedBottleList.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Utensils className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Categorie Menu</p>
                <p className="text-2xl font-bold text-gray-900">{typedMenuData.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Attività Oggi</p>
                <p className="text-2xl font-bold text-gray-900">42</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Beer className="mr-2" />
              Birre Più Popolari
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {typedTapList.slice(0, 5).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.beer?.name || 'Nome non disponibile'}</p>
                    <p className="text-sm text-gray-600">{item.beer?.brewery || 'Birrificio'}</p>
                  </div>
                  <Badge variant="outline">€{item.price || '0.00'}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2" />
              Attività Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <p className="text-sm">Sistema online - tutto funziona correttamente</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <p className="text-sm">Tap list aggiornata {formatDistanceToNow(new Date(), { addSuffix: true, locale: it })}</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <p className="text-sm">Menu aggiornato di recente</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white shadow-sm border-b md:hidden">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Indietro
          </Button>
          <h1 className="font-semibold">Dashboard Pub</h1>
          <div className="w-16" />
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="hidden md:flex md:w-64 md:flex-col">
          <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto bg-white shadow-sm">
            <div className="flex items-center flex-shrink-0 px-4">
              <Store className="w-8 h-8 text-primary" />
              <span className="ml-2 text-lg font-semibold text-gray-900">Dashboard Pub</span>
            </div>
            <div className="mt-5 flex-grow flex flex-col">
              <nav className="flex-1 px-2 space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setCurrentSection(section.id as DashboardSection)}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left transition-colors ${
                        currentSection === section.id
                          ? 'bg-primary text-white'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {section.name}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                {currentSection === 'overview' && renderOverview()}
                {currentSection === 'taplist' && (
                  <div>
                    <h2 className="text-2xl font-bold mb-6">Gestione Spine e Bottiglie</h2>
                    <p className="text-gray-600">Sezione in sviluppo - gestione tap list e cantina birre</p>
                  </div>
                )}
                {currentSection === 'menu' && (
                  <div>
                    <h2 className="text-2xl font-bold mb-6">Gestione Menu</h2>
                    <p className="text-gray-600">Sezione in sviluppo - gestione menu cibo</p>
                  </div>
                )}
                {currentSection === 'analytics' && (
                  <div>
                    <h2 className="text-2xl font-bold mb-6">Statistiche</h2>
                    <p className="text-gray-600">Sezione in sviluppo - analytics del pub</p>
                  </div>
                )}
                {currentSection === 'settings' && (
                  <div>
                    <h2 className="text-2xl font-bold mb-6">Impostazioni</h2>
                    <p className="text-gray-600">Sezione in sviluppo - configurazione pub</p>
                  </div>
                )}
                {currentSection === 'profile' && (
                  <div>
                    <h2 className="text-2xl font-bold mb-6">Profilo Pub</h2>
                    <p className="text-gray-600">Sezione in sviluppo - modifica informazioni pub</p>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="grid grid-cols-3 gap-1">
          {sections.slice(0, 3).map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setCurrentSection(section.id as DashboardSection)}
                className={`flex flex-col items-center py-2 px-1 text-xs ${
                  currentSection === section.id
                    ? 'text-primary bg-primary/10'
                    : 'text-gray-600'
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="truncate">{section.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}