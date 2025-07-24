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
  BarChart3,
  X,
  Home,
  LogOut,
  LogIn,
  UserPlus,
  Save,
  Trash2,
  Bell
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editData, setEditData] = useState<any>({});

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

  // Mutations for managing pub data
  const updateTapItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/pubs/${currentPub?.id}/taplist/${id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", currentPub?.id, "taplist"] });
      setEditingItem(null);
      toast({ title: "Birra aggiornata", description: "Le modifiche sono state salvate" });
    },
  });

  const addTapItemMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/pubs/${currentPub?.id}/taplist`, 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", currentPub?.id, "taplist"] });
      toast({ title: "Birra aggiunta", description: "Nuova birra aggiunta alla tap list" });
    },
  });

  const removeTapItemMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/pubs/${currentPub?.id}/taplist/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", currentPub?.id, "taplist"] });
      toast({ title: "Birra rimossa", description: "Birra rimossa dalla tap list" });
    },
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/pubs/${currentPub?.id}/menu/${id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", currentPub?.id, "menu"] });
      setEditingItem(null);
      toast({ title: "Menu aggiornato", description: "Le modifiche sono state salvate" });
    },
  });

  const updatePubProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/pubs/${currentPub?.id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-pubs"] });
      toast({ title: "Profilo aggiornato", description: "Le informazioni del pub sono state aggiornate" });
    },
  });

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
                    <p className="text-sm text-gray-600">
                      {typeof item.beer?.brewery === 'string' 
                        ? item.beer.brewery 
                        : item.beer?.brewery?.name || 'Birrificio'}
                    </p>
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
      {/* Mobile Header with Navigation */}
      <div className="bg-white shadow-sm border-b md:hidden">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Indietro
          </Button>
          <h1 className="font-semibold">Dashboard Pub</h1>
          <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
          </Button>
        </div>
        
        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="absolute top-16 left-0 right-0 bg-white shadow-lg border-b z-50">
            <div className="p-4 space-y-3">
              <Button variant="ghost" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); window.location.href = '/'; }}>
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); window.location.href = '/dashboard'; }}>
                <Users className="w-4 h-4 mr-2" />
                Dashboard Utente
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); window.location.href = '/activity'; }}>
                <Activity className="w-4 h-4 mr-2" />
                Attività
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); window.location.href = '/notifications'; }}>
                <Bell className="w-4 h-4 mr-2" />
                Notifiche
              </Button>
              <div className="border-t pt-3">
                {isAuthenticated ? (
                  <Button variant="ghost" className="w-full justify-start text-red-600" onClick={() => { setMobileMenuOpen(false); window.location.href = '/api/logout'; }}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); window.location.href = '/api/login'; }}>
                      <LogIn className="w-4 h-4 mr-2" />
                      Login
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); window.location.href = '/api/login'; }}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Registrati
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
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
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-gray-900">Gestione Spine e Bottiglie</h2>
                      <Button onClick={() => setEditingItem(-1)} className="bg-primary">
                        <Plus className="w-4 h-4 mr-2" />
                        Aggiungi Birra
                      </Button>
                    </div>

                    {/* Tap List Management */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Beer className="mr-2" />
                          Birre alla Spina ({typedTapList.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {typedTapList.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex-1">
                                {editingItem === item.id ? (
                                  <div className="space-y-2">
                                    <Input 
                                      placeholder="Prezzo"
                                      value={editData.price || item.price || ''}
                                      onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                                    />
                                    <div className="flex space-x-2">
                                      <Button size="sm" onClick={() => updateTapItemMutation.mutate({ id: item.id, data: editData })}>
                                        <Save className="w-4 h-4 mr-1" />
                                        Salva
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>
                                        Annulla
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <h4 className="font-semibold">{item.beer?.name || 'Nome birra'}</h4>
                                    <p className="text-sm text-gray-600">
                                      {typeof item.beer?.brewery === 'string' 
                                        ? item.beer.brewery 
                                        : item.beer?.brewery?.name || 'Birrificio'}
                                    </p>
                                    <div className="flex items-center space-x-4 mt-2">
                                      <Badge variant={item.isActive ? "default" : "secondary"}>
                                        {item.isActive ? "Disponibile" : "Esaurita"}
                                      </Badge>
                                      <span className="text-sm font-medium">€{item.price || '0.00'}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                              <div className="flex space-x-2">
                                <Button size="sm" variant="outline" onClick={() => { setEditingItem(item.id); setEditData({ price: item.price }); }}>
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => removeTapItemMutation.mutate(item.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          {typedTapList.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              <Beer className="mx-auto mb-4" size={48} />
                              <p>Nessuna birra alla spina</p>
                              <p className="text-sm">Aggiungi le prime birre al tuo tap list</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Bottle List */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Store className="mr-2" />
                          Birre in Bottiglia ({typedBottleList.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {typedBottleList.slice(0, 6).map((item: any) => (
                            <div key={item.id} className="p-3 border rounded-lg">
                              <h5 className="font-medium text-sm">{item.beer?.name || 'Nome birra'}</h5>
                              <p className="text-xs text-gray-600">{item.beer?.brewery?.name || 'Birrificio'}</p>
                              <div className="flex items-center justify-between mt-2">
                                <Badge variant={item.isActive ? "default" : "secondary"} className="text-xs">
                                  {item.isActive ? "Disponibile" : "Esaurita"}
                                </Badge>
                                <span className="text-sm font-medium">€{item.price || '0.00'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        {typedBottleList.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <Store className="mx-auto mb-4" size={48} />
                            <p>Nessuna birra in bottiglia</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
                {currentSection === 'menu' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-gray-900">Gestione Menu</h2>
                      <Button className="bg-primary">
                        <Plus className="w-4 h-4 mr-2" />
                        Aggiungi Categoria
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {typedMenuData.map((category: any) => (
                        <Card key={category.id}>
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                              <div className="flex items-center">
                                <Utensils className="mr-2" />
                                {category.name}
                              </div>
                              <Button size="sm" variant="outline" onClick={() => { setEditingItem(category.id); setEditData(category); }}>
                                <Edit3 className="w-4 h-4" />
                              </Button>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {editingItem === category.id ? (
                              <div className="space-y-3">
                                <Input 
                                  placeholder="Nome categoria"
                                  value={editData.name || ''}
                                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                />
                                <Textarea
                                  placeholder="Descrizione"
                                  value={editData.description || ''}
                                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                />
                                <div className="flex space-x-2">
                                  <Button size="sm" onClick={() => updateMenuItemMutation.mutate({ id: category.id, data: editData })}>
                                    <Save className="w-4 h-4 mr-1" />
                                    Salva
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>
                                    Annulla
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-gray-600 text-sm mb-3">{category.description}</p>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Creata il:</span>
                                    <span>{new Date(category.createdAt).toLocaleDateString('it-IT')}</span>
                                  </div>
                                  <Badge variant="outline">Menu Category</Badge>
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      
                      {typedMenuData.length === 0 && (
                        <div className="col-span-full text-center py-12">
                          <Utensils className="mx-auto mb-4 text-gray-400" size={64} />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun menu configurato</h3>
                          <p className="text-gray-600 mb-4">Inizia aggiungendo le prime categorie del tuo menu</p>
                          <Button className="bg-primary">
                            <Plus className="w-4 h-4 mr-2" />
                            Aggiungi Prima Categoria
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {currentSection === 'analytics' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Statistiche del Pub</h2>
                    
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Visite Totali</p>
                              <p className="text-2xl font-bold text-gray-900">1,247</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-green-600" />
                          </div>
                          <p className="text-sm text-green-600 mt-2">+12% dal mese scorso</p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Birre Preferite</p>
                              <p className="text-2xl font-bold text-gray-900">89</p>
                            </div>
                            <Beer className="h-8 w-8 text-blue-600" />
                          </div>
                          <p className="text-sm text-blue-600 mt-2">+5% questa settimana</p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Rating Medio</p>
                              <p className="text-2xl font-bold text-gray-900">4.8</p>
                            </div>
                            <Activity className="h-8 w-8 text-yellow-600" />
                          </div>
                          <p className="text-sm text-yellow-600 mt-2">Eccellente</p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Recensioni</p>
                              <p className="text-2xl font-bold text-gray-900">156</p>
                            </div>
                            <Users className="h-8 w-8 text-purple-600" />
                          </div>
                          <p className="text-sm text-purple-600 mt-2">+8 questa settimana</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Birre Più Popolari</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {typedTapList.slice(0, 5).map((item: any, index: number) => (
                              <div key={item.id} className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-medium text-primary">{index + 1}</span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{item.beer?.name || 'Nome birra'}</p>
                                    <p className="text-xs text-gray-600">{item.beer?.brewery?.name || 'Birrificio'}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-sm">{Math.floor(Math.random() * 50) + 20} ordini</p>
                                  <p className="text-xs text-gray-600">€{item.price || '0.00'}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Andamento Settimanale</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'].map((day, index) => {
                              const value = Math.floor(Math.random() * 100) + 20;
                              return (
                                <div key={day} className="flex items-center space-x-3">
                                  <span className="text-sm font-medium w-20">{day}</span>
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-primary h-2 rounded-full" 
                                      style={{ width: `${value}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm text-gray-600 w-12 text-right">{value}</span>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
                {currentSection === 'settings' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Impostazioni Pub</h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Business Hours */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Calendar className="mr-2" />
                            Orari di Apertura
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'].map((day) => (
                            <div key={day} className="flex items-center justify-between">
                              <span className="font-medium text-sm">{day}</span>
                              <div className="flex items-center space-x-2">
                                <Input className="w-20 text-sm" placeholder="09:00" />
                                <span className="text-gray-500">-</span>
                                <Input className="w-20 text-sm" placeholder="23:00" />
                              </div>
                            </div>
                          ))}
                          <Button className="w-full mt-4">
                            <Save className="w-4 h-4 mr-2" />
                            Salva Orari
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Notification Settings */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Bell className="mr-2" />
                            Notifiche
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">Nuove recensioni</p>
                              <p className="text-xs text-gray-600">Ricevi notifiche per nuove recensioni</p>
                            </div>
                            <input type="checkbox" className="toggle" defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">Birre in esaurimento</p>
                              <p className="text-xs text-gray-600">Avvisi quando le birre stanno finendo</p>
                            </div>
                            <input type="checkbox" className="toggle" defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">Aggiornamenti sistema</p>
                              <p className="text-xs text-gray-600">Notifiche per aggiornamenti della piattaforma</p>
                            </div>
                            <input type="checkbox" className="toggle" />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Visibility Settings */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Eye className="mr-2" />
                            Visibilità
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">Pub visibile pubblicamente</p>
                              <p className="text-xs text-gray-600">Il tuo pub appare nelle ricerche</p>
                            </div>
                            <input type="checkbox" className="toggle" defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">Mostra prezzi</p>
                              <p className="text-xs text-gray-600">I prezzi delle birre sono visibili</p>
                            </div>
                            <input type="checkbox" className="toggle" defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">Tap list in tempo reale</p>
                              <p className="text-xs text-gray-600">Aggiornamenti automatici disponibilità</p>
                            </div>
                            <input type="checkbox" className="toggle" defaultChecked />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Danger Zone */}
                      <Card className="border-red-200">
                        <CardHeader>
                          <CardTitle className="flex items-center text-red-600">
                            <Activity className="mr-2" />
                            Zona Pericolosa
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="p-4 bg-red-50 rounded-lg">
                            <h4 className="font-medium text-red-800 mb-2">Elimina Pub</h4>
                            <p className="text-sm text-red-600 mb-4">
                              Questa azione è irreversibile. Tutti i dati del pub verranno eliminati permanentemente.
                            </p>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Elimina Pub
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
                {currentSection === 'profile' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Profilo Pub</h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Basic Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Store className="mr-2" />
                            Informazioni Generali
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Nome Pub</label>
                            <Input 
                              value={currentPub?.name || ''} 
                              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Indirizzo</label>
                            <Input 
                              value={currentPub?.address || ''} 
                              onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Descrizione</label>
                            <Textarea 
                              value={currentPub?.description || ''} 
                              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                              className="mt-1"
                              rows={3}
                            />
                          </div>
                          <Button onClick={() => updatePubProfileMutation.mutate(editData)} className="w-full">
                            <Save className="w-4 h-4 mr-2" />
                            Salva Modifiche
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Contact Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Phone className="mr-2" />
                            Contatti
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Telefono</label>
                            <Input 
                              value={currentPub?.phone || ''} 
                              onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Email</label>
                            <Input 
                              value={currentPub?.email || ''} 
                              onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Sito Web</label>
                            <Input 
                              value={currentPub?.website || ''} 
                              onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                          <div className="pt-4">
                            <h4 className="font-medium text-gray-900 mb-2">Statistiche</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Rating:</span>
                                <span className="font-medium">{currentPub?.rating?.toFixed(1) || 'N/A'} ⭐</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Registrato il:</span>
                                <span className="font-medium">
                                  {currentPub?.createdAt ? new Date(currentPub.createdAt).toLocaleDateString('it-IT') : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Images */}
                      <Card className="lg:col-span-2">
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Image className="mr-2" />
                            Immagini del Pub
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-2 block">Logo</label>
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                {currentPub?.logoUrl ? (
                                  <img 
                                    src={currentPub.logoUrl} 
                                    alt="Logo pub" 
                                    className="w-24 h-24 mx-auto rounded-full object-cover mb-4"
                                  />
                                ) : (
                                  <Image className="mx-auto mb-4 text-gray-400" size={48} />
                                )}
                                <Button variant="outline" size="sm">
                                  <Plus className="w-4 h-4 mr-2" />
                                  Carica Logo
                                </Button>
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-2 block">Immagine di Copertina</label>
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                {currentPub?.coverImageUrl ? (
                                  <img 
                                    src={currentPub.coverImageUrl} 
                                    alt="Copertina pub" 
                                    className="w-full h-24 mx-auto rounded object-cover mb-4"
                                  />
                                ) : (
                                  <Image className="mx-auto mb-4 text-gray-400" size={48} />
                                )}
                                <Button variant="outline" size="sm">
                                  <Plus className="w-4 h-4 mr-2" />
                                  Carica Copertina
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
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