import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AllergenSelector, AllergenDisplay } from "@/components/allergen-selector";
import { PriceFormatManager } from "@/components/price-format-manager";
import { Label } from "@/components/ui/label";
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
  Bell,
  Search,
  ArrowUp,
  ArrowDown,
  Package,
  Clock,
  Upload
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import FlexiblePriceManager from "@/components/flexible-price-manager";

import MenuCategoryManager from "@/components/menu-category-manager";

type DashboardSection = 'overview' | 'taplist' | 'menu' | 'analytics' | 'settings' | 'profile';

export default function SmartPubDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentSection, setCurrentSection] = useState<DashboardSection>('overview');
  const [editingItem, setEditingItem] = useState<number | string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBeers, setSelectedBeers] = useState<any[]>([]);
  const [showBeerSearch, setShowBeerSearch] = useState(false);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [priceManagerType, setPriceManagerType] = useState<'taplist' | 'bottles'>('taplist');
  const [showPriceManager, setShowPriceManager] = useState<number | null>(null);
  const [newItemPrices, setNewItemPrices] = useState<Array<{size: string, price: string, format?: string}>>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [lastProfileUpdate, setLastProfileUpdate] = useState<Date | null>(null);
  const [replacingBeer, setReplacingBeer] = useState<number | null>(null);


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

  // Fetch all beers for search
  const { data: allBeers = [], isLoading: beersLoading } = useQuery({
    queryKey: ["/api/beers"],
    enabled: showBeerSearch,
  });

  // Filter beers based on search
  const filteredBeers = (Array.isArray(allBeers) ? allBeers : []).filter((beer: any) => 
    beer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    beer.breweryName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    beer.brewery?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      queryClient.invalidateQueries({ queryKey: [`/api/pubs/${currentPub?.id}/taplist`] });
      queryClient.invalidateQueries({ queryKey: [`/api/pubs/${currentPub?.id}`] });
      queryClient.refetchQueries({ queryKey: [`/api/pubs/${currentPub?.id}/taplist`] });
      queryClient.refetchQueries({ queryKey: [`/api/pubs/${currentPub?.id}`] });
      setEditingItem(null);
      toast({ title: "Birra aggiornata", description: "Le modifiche sono state salvate" });
    },
  });

  const addTapItemMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Mutation called with data:', data);
      console.log('Current pub ID:', currentPub?.id);
      return apiRequest(`/api/pubs/${currentPub?.id}/taplist`, 'POST', data);
    },
    onSuccess: (result) => {
      console.log('Mutation success:', result);
      queryClient.invalidateQueries({ queryKey: [`/api/pubs/${currentPub?.id}/taplist`] });
      queryClient.refetchQueries({ queryKey: [`/api/pubs/${currentPub?.id}/taplist`] });
      toast({ title: "Birra aggiunta", description: "Nuova birra aggiunta alla tap list" });
      setShowBeerSearch(false);
      setSearchQuery('');
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      toast({ title: "Errore", description: "Impossibile aggiungere la birra", variant: "destructive" });
    }
  });

  const removeTapItemMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log('Removing tap item:', id);
      return apiRequest(`/api/pubs/${currentPub?.id}/taplist/${id}`, 'DELETE');
    },
    onSuccess: async (data) => {
      console.log('Remove success:', data);
      // Forza il refresh completo e immediato
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [`/api/pubs/${currentPub?.id}/taplist`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/pubs/${currentPub?.id}`] }),
        queryClient.invalidateQueries({ queryKey: ['/api/pubs'] }),
        queryClient.refetchQueries({ queryKey: [`/api/pubs/${currentPub?.id}/taplist`] }),
        queryClient.refetchQueries({ queryKey: [`/api/pubs/${currentPub?.id}`] })
      ]);
      toast({ title: "Birra eliminata", description: "Birra rimossa dalla taplist" });
    },
    onError: (error) => {
      console.error('Remove error:', error);
      toast({ title: "Errore", description: "Impossibile eliminare la birra", variant: "destructive" });
    }
  });

  const toggleTapItemVisibilityMutation = useMutation({
    mutationFn: async ({ id, isVisible }: { id: number, isVisible: boolean }) => {
      console.log('Updating visibility:', { id, isVisible });
      return apiRequest(`/api/pubs/${currentPub?.id}/taplist/${id}`, 'PATCH', { isVisible });
    },
    onSuccess: async (data) => {
      console.log('Visibility update success:', data);
      // Forza aggiornamento immediato di tutte le query pertinenti
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [`/api/pubs/${currentPub?.id}/taplist`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/pubs/${currentPub?.id}`] }),
        queryClient.invalidateQueries({ queryKey: ['/api/pubs'] }),
        queryClient.refetchQueries({ queryKey: [`/api/pubs/${currentPub?.id}/taplist`] }),
        queryClient.refetchQueries({ queryKey: [`/api/pubs/${currentPub?.id}`] })
      ]);
      toast({ title: "Visibilità aggiornata", description: "Modifica salvata" });
    },
    onError: (error) => {
      console.error('Visibility update error:', error);
      toast({ title: "Errore", description: "Impossibile aggiornare la visibilità", variant: "destructive" });
    }
  });

  const reorderTapItemMutation = useMutation({
    mutationFn: async ({ id, newPosition }: { id: number, newPosition: number }) => {
      console.log('Reordering tap item:', { id, newPosition });
      return apiRequest(`/api/pubs/${currentPub?.id}/taplist/${id}`, 'PATCH', { tapNumber: newPosition });
    },
    onSuccess: (data) => {
      console.log('Reorder success:', data);
      queryClient.invalidateQueries({ queryKey: [`/api/pubs/${currentPub?.id}/taplist`] });
      queryClient.invalidateQueries({ queryKey: [`/api/pubs/${currentPub?.id}`] });
      queryClient.refetchQueries({ queryKey: [`/api/pubs/${currentPub?.id}/taplist`] });
      queryClient.refetchQueries({ queryKey: [`/api/pubs/${currentPub?.id}`] });
      toast({ title: "Ordine aggiornato", description: "Posizione salvata" });
    },
    onError: (error) => {
      console.error('Reorder error:', error);
      toast({ title: "Errore", description: "Impossibile riordinare", variant: "destructive" });
    }
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number | string; data: any }) => {
      if (id === -1) {
        // Create new category
        return apiRequest(`/api/pubs/${currentPub?.id}/menu-categories`, 'POST', data);
      } else if (id === -2) {
        // Create new product
        return apiRequest(`/api/menu-items`, 'POST', data);
      } else {
        // Update existing
        return apiRequest(`/api/menu-categories/${id}`, 'PATCH', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pubs/${currentPub?.id}/menu`] });
      queryClient.refetchQueries({ queryKey: [`/api/pubs/${currentPub?.id}/menu`] });
      setEditingItem(null);
      setEditData({});
      toast({ title: "Menu aggiornato", description: "Le modifiche sono state salvate" });
    },
  });

  // Add multiple prices mutation
  const addMultiplePricesMutation = useMutation({
    mutationFn: async ({ id, prices, type = 'taplist' }: { id: number; prices: {size: string, price: string}[]; type: 'taplist' | 'bottles' }) => {
      const validPrices = prices.filter(p => p.size && p.price);
      return apiRequest(`/api/pubs/${currentPub?.id}/${type}/${id}/prices`, 'POST', { prices: validPrices });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", currentPub?.id, "taplist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", currentPub?.id, "bottles"] });
      toast({ title: "Prezzi aggiornati", description: "I prezzi sono stati salvati con successo" });
      setNewItemPrices([{size: '', price: ''}]);
      setEditingItem(null);
    },
  });

  // Replace beer mutation
  const replaceBeerMutation = useMutation({
    mutationFn: async ({ oldId, newBeerId, type = 'taplist' }: { oldId: number; newBeerId: number; type: 'taplist' | 'bottles' }) => {
      console.log('Replacing beer:', { oldId, newBeerId, type });
      const endpoint = type === 'taplist' ? 'taplist' : 'bottles';
      return apiRequest(`/api/pubs/${currentPub?.id}/${endpoint}/${oldId}/replace`, 'PATCH', { newBeerId });
    },
    onSuccess: (data) => {
      console.log('Beer replacement success:', data);
      queryClient.invalidateQueries({ queryKey: [`/api/pubs/${currentPub?.id}/taplist`] });
      queryClient.invalidateQueries({ queryKey: [`/api/pubs/${currentPub?.id}/bottles`] });
      queryClient.invalidateQueries({ queryKey: [`/api/pubs/${currentPub?.id}`] });
      queryClient.refetchQueries({ queryKey: [`/api/pubs/${currentPub?.id}/taplist`] });
      queryClient.refetchQueries({ queryKey: [`/api/pubs/${currentPub?.id}/bottles`] });
      queryClient.refetchQueries({ queryKey: [`/api/pubs/${currentPub?.id}`] });
      toast({ title: "Birra sostituita", description: "La birra è stata sostituita con successo" });
      setReplacingBeer(null);
      setShowBeerSearch(false);
    },
    onError: (error) => {
      console.error('Beer replacement error:', error);
      toast({ title: "Errore", description: "Impossibile sostituire la birra", variant: "destructive" });
    }
  });

  const updatePubProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/pubs/${currentPub?.id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-pubs"] });
      setLastProfileUpdate(new Date());
      toast({ title: "Profilo aggiornato", description: "Le informazioni del pub sono state aggiornate" });
    },
  });

  // Mutation to add beer to bottles with multiple formats and prices
  const addBottleItemMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/pubs/${currentPub?.id}/bottles`, 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pubs/${currentPub?.id}/bottles`] });
      queryClient.refetchQueries({ queryKey: [`/api/pubs/${currentPub?.id}/bottles`] });
      toast({ title: "Birra aggiunta alla cantina!" });
    },
    onError: () => {
      toast({ title: "Errore nell'aggiunta della birra alla cantina", variant: "destructive" });
    },
  });

  // Mutations for bottle management
  const updateBottleItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/pubs/${currentPub?.id}/bottles/${id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pubs/${currentPub?.id}/bottles`] });
      queryClient.invalidateQueries({ queryKey: [`/api/pubs/${currentPub?.id}`] });
      queryClient.refetchQueries({ queryKey: [`/api/pubs/${currentPub?.id}/bottles`] });
      queryClient.refetchQueries({ queryKey: [`/api/pubs/${currentPub?.id}`] });
      setEditingItem(null);
      toast({ title: "Birra aggiornata", description: "Le modifiche sono state salvate" });
    },
  });

  const removeBottleItemMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/pubs/${currentPub?.id}/bottles/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pubs/${currentPub?.id}/bottles`] });
      queryClient.invalidateQueries({ queryKey: [`/api/pubs/${currentPub?.id}`] });
      queryClient.refetchQueries({ queryKey: [`/api/pubs/${currentPub?.id}/bottles`] });
      queryClient.refetchQueries({ queryKey: [`/api/pubs/${currentPub?.id}`] });
      toast({ title: "Birra rimossa dalla cantina" });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile rimuovere la birra", variant: "destructive" });
    }
  });

  const toggleBottleItemVisibilityMutation = useMutation({
    mutationFn: async ({ id, isVisible }: { id: number, isVisible: boolean }) => {
      return apiRequest(`/api/pubs/${currentPub?.id}/bottles/${id}`, 'PATCH', { isVisible });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pubs/${currentPub?.id}/bottles`] });
      queryClient.invalidateQueries({ queryKey: [`/api/pubs/${currentPub?.id}`] });
      queryClient.refetchQueries({ queryKey: [`/api/pubs/${currentPub?.id}/bottles`] });
      queryClient.refetchQueries({ queryKey: [`/api/pubs/${currentPub?.id}`] });
      toast({ title: "Visibilità aggiornata" });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiornare la visibilità", variant: "destructive" });
    }
  });

  // Check if user can update private data (30-day restriction)
  const canUpdatePrivateData = () => {
    if ((user as any)?.userType === 'admin') return true;
    if (!lastProfileUpdate) return true;
    const daysSinceUpdate = (Date.now() - lastProfileUpdate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate >= 30;
  };

  // Load last profile update from localStorage
  useEffect(() => {
    if (currentPub?.id) {
      const saved = localStorage.getItem(`pub-${currentPub.id}-last-update`);
      if (saved) {
        setLastProfileUpdate(new Date(saved));
      }
    }
  }, [currentPub?.id]);

  // Save last profile update to localStorage
  useEffect(() => {
    if (lastProfileUpdate && currentPub?.id) {
      localStorage.setItem(`pub-${currentPub.id}-last-update`, lastProfileUpdate.toISOString());
    }
  }, [lastProfileUpdate, currentPub?.id]);

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

  // Render mobile header for navigation
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
        {sections.find(s => s.id === currentSection)?.name || 'Dashboard Pub'}
      </h1>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {renderMobileHeader()}

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
                {/* Mobile Navigation Grid - Only show on overview section for mobile */}
                {currentSection === 'overview' && (
                  <div className="md:hidden mb-6">
                    {renderOverview()}
                    
                    {/* Navigation Menu - Mobile Only */}
                    <div className="grid grid-cols-2 gap-4 mt-6">
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
                  </div>
                )}
                
                {/* Desktop Content and Mobile Non-Overview Sections */}
                <div className={currentSection === 'overview' ? 'hidden md:block' : ''}>
                  {currentSection === 'overview' && renderOverview()}
                </div>
                {currentSection === 'taplist' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-gray-900">Gestione Spine e Bottiglie</h2>
                    </div>

                    {/* Tap List Management */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Beer className="mr-2" />
                            Taplist ({typedTapList.length})
                          </div>
                          <Button 
                            className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:via-orange-600 hover:to-red-600 text-white font-bold shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95"
                            onClick={() => {
                              setPriceManagerType('taplist');
                              setShowBeerSearch(true);
                            }}
                          >
                            <span className="text-sm mr-1">🍺</span>
                            <Plus className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Aggiungi Birra</span>
                            <span className="sm:hidden">Aggiungi</span>
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {typedTapList.map((item: any, index: number) => (
                            <div 
                              key={item.id} 
                              className={`flex items-center justify-between p-4 border rounded-lg cursor-move hover:bg-gray-50 ${!item.isVisible ? 'opacity-60 bg-gray-50 border-dashed' : ''}`}
                              draggable
                              onDragStart={() => setDraggedItem(item.id)}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="flex flex-col items-center space-y-1">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 w-6 p-0" 
                                    onClick={() => reorderTapItemMutation.mutate({ id: item.id, newPosition: index })}
                                    disabled={index === 0}
                                    title="Sposta in su"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </Button>
                                  <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded">
                                    {index + 1}
                                  </span>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 w-6 p-0" 
                                    onClick={() => reorderTapItemMutation.mutate({ id: item.id, newPosition: index + 2 })}
                                    disabled={index === typedTapList.length - 1}
                                    title="Sposta in giù"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </Button>
                                </div>
                                <div className="flex-1">
                                  {editingItem === item.id ? (
                                    <div className="space-y-4">
                                      <div className="p-4 border rounded-lg bg-gray-50">
                                        <div className="flex items-center space-x-4 mb-4">
                                          <img
                                            src={item.beer?.brewery?.logoUrl || "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80"}
                                            alt={`Logo ${item.beer?.brewery?.name || 'birrificio'}`}
                                            className="w-12 h-12 rounded-full object-cover"
                                          />
                                          <div>
                                            <h4 className="font-semibold">{item.beer?.name}</h4>
                                            <p className="text-sm text-gray-600">{item.beer?.brewery?.name || item.beer?.breweryName}</p>
                                            <div className="flex items-center space-x-2 mt-1">
                                              <Badge variant="outline" className="text-xs">{item.beer?.style}</Badge>
                                              {item.beer?.abv && <Badge variant="outline" className="text-xs">{item.beer?.abv}% ABV</Badge>}
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <FlexiblePriceManager
                                          type="tap"
                                          initialPrices={editData.prices || []}
                                          onSave={(prices: any) => setEditData({ ...editData, prices })}
                                          onCancel={() => {}}
                                        />
                                        
                                        <div className="mt-4 grid grid-cols-2 gap-3">
                                          <div>
                                            <Label>Numero Spina</Label>
                                            <Input 
                                              type="number"
                                              placeholder="1"
                                              value={editData.tapNumber || ''}
                                              onChange={(e) => setEditData({ ...editData, tapNumber: e.target.value })}
                                            />
                                          </div>
                                          <div>
                                            <Label>Stato</Label>
                                            <div className="flex items-center space-x-4 mt-2">
                                              <label className="flex items-center space-x-2">
                                                <input 
                                                  type="checkbox"
                                                  checked={editData.isVisible !== false}
                                                  onChange={(e) => setEditData({ ...editData, isVisible: e.target.checked })}
                                                  className="rounded"
                                                />
                                                <span className="text-sm">Visibile al pubblico</span>
                                              </label>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <div className="mt-4">
                                          <Label>Note Spina</Label>
                                          <Textarea 
                                            placeholder="Note sulla birra, descrizione, abbinamenti..."
                                            value={editData.description || ''}
                                            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                            rows={3}
                                          />
                                        </div>
                                        
                                        <div className="flex space-x-2 mt-4">
                                          <Button 
                                            size="sm" 
                                            onClick={() => {
                                              updateTapItemMutation.mutate(
                                                { id: item.id, data: editData },
                                                {
                                                  onSuccess: async () => {
                                                    // Aggiornamento istantaneo
                                                    await Promise.all([
                                                      queryClient.invalidateQueries({ queryKey: [`/api/pubs/${currentPub?.id}/taplist`] }),
                                                      queryClient.invalidateQueries({ queryKey: [`/api/pubs/${currentPub?.id}`] }),
                                                      queryClient.refetchQueries({ queryKey: [`/api/pubs/${currentPub?.id}/taplist`] })
                                                    ]);
                                                    setEditingItem(null);
                                                    setEditData({});
                                                  }
                                                }
                                              );
                                            }}
                                            disabled={updateTapItemMutation.isPending}
                                          >
                                            <Save className="w-4 h-4 mr-1" />
                                            {updateTapItemMutation.isPending ? 'Salvando...' : 'Salva'}
                                          </Button>
                                          <Button size="sm" variant="outline" onClick={() => {
                                            setEditingItem(null);
                                            setEditData({});
                                          }}>
                                            Annulla
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                          <h4 className="font-semibold text-sm truncate">{item.beer?.name || 'Nome birra'}</h4>
                                          <p className="text-xs text-gray-600 truncate">
                                            {typeof item.beer?.brewery === 'string' 
                                              ? item.beer.brewery 
                                              : item.beer?.brewery?.name || 'Birrificio'}
                                          </p>
                                        </div>
                                        <div className="flex items-center space-x-1 ml-2">
                                          <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="h-7 w-7 p-0" 
                                            onClick={() => toggleTapItemVisibilityMutation.mutate({ id: item.id, isVisible: !item.isVisible })}
                                            title={item.isVisible ? "Nascondi birra" : "Mostra birra"}
                                          >
                                            {item.isVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                          </Button>
                                          <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="h-7 w-7 p-0" 
                                            onClick={() => { 
                                              setEditingItem(item.id); 
                                              setEditData({ 
                                                prices: item.prices ? Object.entries(item.prices).map(([size, price]) => ({ 
                                                  size, 
                                                  price: typeof price === 'object' && price !== null && 'price' in price ? (price as any).price.toString() : (price as any).toString() 
                                                })) : [],
                                                priceSmall: item.priceSmall, 
                                                priceMedium: item.priceMedium, 
                                                tapNumber: item.tapNumber,
                                                description: item.description,
                                                isVisible: item.isVisible,
                                                notes: item.notes 
                                              }); 
                                            }}
                                            title="Modifica"
                                          >
                                            <Edit3 className="w-3 h-3" />
                                          </Button>
                                          <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="h-7 w-7 p-0" 
                                            onClick={() => {
                                              if (!showBeerSearch) {
                                                setReplacingBeer(item.id);
                                                setPriceManagerType('taplist');
                                                setShowBeerSearch(true);
                                                setSearchQuery('');
                                              }
                                            }}
                                            title="Sostituisci"
                                            disabled={showBeerSearch}
                                          >
                                            <Search className="w-3 h-3" />
                                          </Button>
                                          <Button 
                                            size="sm" 
                                            variant="destructive" 
                                            className="h-7 w-7 p-0" 
                                            onClick={() => {
                                              if (confirm(`Sei sicuro di voler eliminare "${item.beer?.name || 'questa birra'}" dalla taplist?`)) {
                                                removeTapItemMutation.mutate(item.id);
                                              }
                                            }}
                                            title="Elimina"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {item.prices && typeof item.prices === 'object' ? (
                                          Object.entries(item.prices).map(([size, price]) => {
                                            const displaySize = size === 'small' ? '0.2l' : 
                                                                size === 'medium' ? '0.4l' : 
                                                                size === 'large' ? '1l' : size;
                                            return (
                                              <span key={size} className="bg-gray-100 px-2 py-1 rounded text-xs">
                                                {displaySize}: €{typeof price === 'object' && price !== null && 'price' in price ? Number(price.price).toFixed(2) : Number(price).toFixed(2)}
                                              </span>
                                            );
                                          })
                                        ) : (
                                          <>
                                            <span className="bg-gray-100 px-2 py-1 rounded text-xs">0.2l: €{item.priceSmall || '0.00'}</span>
                                            <span className="bg-gray-100 px-2 py-1 rounded text-xs">0.4l: €{item.priceMedium || '0.00'}</span>
                                          </>
                                        )}
                                      </div>
                                      {item.notes && (
                                        <p className="text-xs text-gray-500 italic truncate">{item.notes}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          {typedTapList.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              <Beer className="mx-auto mb-4" size={48} />
                              <p>Nessuna birra nella taplist</p>
                              <p className="text-sm">Cerca e aggiungi le prime birre alla tua taplist</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Bottle List / Cantina */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Package className="mr-2" />
                            Cantina ({typedBottleList.length})
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => {
                              if (!showBeerSearch) {
                                setPriceManagerType('bottles');
                                setShowBeerSearch(true);
                                setSearchQuery('');
                                setReplacingBeer(null);
                              }
                            }} 
                            variant="outline"
                            disabled={showBeerSearch}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Aggiungi alla Cantina
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {typedBottleList.map((item: any, index: number) => (
                            <div key={item.id} className="p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex flex-col space-y-3">
                                {editingItem === `bottle-${item.id}` ? (
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-3 gap-3">
                                      <div>
                                        <Label>Prezzo 33cl (€)</Label>
                                        <Input 
                                          placeholder="4.50"
                                          value={editData.price33cl || ''}
                                          onChange={(e) => setEditData({ ...editData, price33cl: e.target.value })}
                                        />
                                      </div>
                                      <div>
                                        <Label>Prezzo 50cl (€)</Label>
                                        <Input 
                                          placeholder="6.50"
                                          value={editData.price50cl || ''}
                                          onChange={(e) => setEditData({ ...editData, price50cl: e.target.value })}
                                        />
                                      </div>
                                      <div>
                                        <Label>Prezzo 75cl (€)</Label>
                                        <Input 
                                          placeholder="9.50"
                                          value={editData.price75cl || ''}
                                          onChange={(e) => setEditData({ ...editData, price75cl: e.target.value })}
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <Label>Note Cantina</Label>
                                      <Textarea 
                                        placeholder="Annata, conservazione, note di degustazione..."
                                        value={editData.notes || ''}
                                        onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                                        rows={2}
                                      />
                                    </div>
                                    <div className="flex space-x-2">
                                      <Button 
                                        size="sm" 
                                        onClick={() => {
                                          updateBottleItemMutation.mutate(
                                            { id: item.id, data: editData },
                                            {
                                              onSuccess: async () => {
                                                // Aggiornamento istantaneo
                                                await Promise.all([
                                                  queryClient.invalidateQueries({ queryKey: [`/api/pubs/${currentPub?.id}/bottles`] }),
                                                  queryClient.invalidateQueries({ queryKey: [`/api/pubs/${currentPub?.id}`] }),
                                                  queryClient.refetchQueries({ queryKey: [`/api/pubs/${currentPub?.id}/bottles`] })
                                                ]);
                                                setEditingItem(null);
                                                setEditData({});
                                              }
                                            }
                                          );
                                        }}
                                        disabled={updateBottleItemMutation.isPending}
                                      >
                                        <Save className="w-4 h-4 mr-1" />
                                        {updateBottleItemMutation.isPending ? 'Salvando...' : 'Salva'}
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => {
                                        setEditingItem(null);
                                        setEditData({});
                                      }}>
                                        Annulla
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <h5 className="font-medium">{item.beer?.name || 'Nome birra'}</h5>
                                    <p className="text-sm text-gray-600">{item.beer?.brewery?.name || 'Birrificio'}</p>
                                    <div className="flex items-center space-x-4 mt-2">
                                      <Badge variant={item.isActive ? "default" : "secondary"} className="text-xs">
                                        {item.isActive ? "Disponibile" : "Esaurita"}
                                      </Badge>
                                      <div className="flex space-x-2 text-xs">
                                        {item.price33cl && <span>33cl: €{item.price33cl}</span>}
                                        {item.price50cl && <span>50cl: €{item.price50cl}</span>}
                                        {item.price75cl && <span>75cl: €{item.price75cl}</span>}
                                      </div>
                                    </div>
                                    {item.notes && (
                                      <p className="text-xs text-gray-500 mt-1 italic">{item.notes}</p>
                                    )}
                                    <div className="flex flex-wrap gap-2 mt-3">
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => toggleBottleItemVisibilityMutation.mutate({ id: item.id, isVisible: !item.isVisible })}
                                        title={item.isVisible ? "Nascondi birra" : "Mostra birra"}
                                        className="flex-shrink-0"
                                      >
                                        {item.isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => { 
                                          setEditingItem(`bottle-${item.id}` as any); 
                                          setEditData({ 
                                            price33cl: item.price33cl, 
                                            price50cl: item.price50cl, 
                                            price75cl: item.price75cl, 
                                            notes: item.notes 
                                          }); 
                                        }}
                                        title="Modifica prezzi e note"
                                        className="flex-shrink-0"
                                      >
                                        <Edit3 className="w-4 h-4" />
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => {
                                          if (!showBeerSearch) {
                                            setReplacingBeer(item.id);
                                            setPriceManagerType('bottles');
                                            setShowBeerSearch(true);
                                            setSearchQuery('');
                                          }
                                        }}
                                        title="Sostituisci con altra birra"
                                        disabled={showBeerSearch}
                                        className="flex-shrink-0"
                                      >
                                        <Search className="w-4 h-4" />
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="destructive" 
                                        onClick={() => {
                                          if (confirm(`Sei sicuro di voler eliminare "${item.beer?.name || 'questa birra'}" dalla cantina?`)) {
                                            removeBottleItemMutation.mutate(item.id);
                                          }
                                        }}
                                        title="Elimina dalla cantina"
                                        className="flex-shrink-0"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                          {typedBottleList.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              <Package className="mx-auto mb-4" size={48} />
                              <p>Nessuna birra in cantina</p>
                              <p className="text-sm">Inizia a costruire la tua selezione di bottiglie</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                {currentSection === 'menu' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestione Menu</h2>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setEditingItem(-2)}
                          className="w-full sm:w-auto"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Aggiungi Prodotto
                        </Button>
                        <Button 
                          className="bg-primary w-full sm:w-auto" 
                          onClick={() => setEditingItem(-1)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Aggiungi Categoria
                        </Button>
                      </div>
                    </div>

                    {/* Categories Management */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Utensils className="mr-2" />
                          Categorie Menu ({typedMenuData.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {editingItem === -1 && (
                            <div className="p-4 border-2 border-dashed border-primary/20 rounded-lg">
                              <div className="space-y-3">
                                <div>
                                  <Label>Nome Categoria</Label>
                                  <Input 
                                    placeholder="Es. Antipasti, Primi Piatti, Dolci..."
                                    value={editData.name || ''}
                                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label>Descrizione</Label>
                                  <Textarea
                                    placeholder="Descrizione della categoria..."
                                    value={editData.description || ''}
                                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                    rows={2}
                                  />
                                </div>
                                <div className="flex space-x-2">
                                  <Button size="sm" onClick={() => updateMenuItemMutation.mutate({ id: -1, data: editData })}>
                                    <Save className="w-4 h-4 mr-1" />
                                    Crea Categoria
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>
                                    Annulla
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {typedMenuData.map((category: any) => (
                            <div key={category.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg space-y-3 sm:space-y-0">
                              <div className="flex-1">
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
                                      rows={2}
                                    />
                                    <div className="flex flex-col sm:flex-row gap-2">
                                      <Button 
                                        size="sm" 
                                        onClick={() => updateMenuItemMutation.mutate({ id: category.id, data: editData })}
                                        className="w-full sm:w-auto"
                                      >
                                        <Save className="w-4 h-4 mr-1" />
                                        Salva
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => setEditingItem(null)}
                                        className="w-full sm:w-auto"
                                      >
                                        Annulla
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <h4 className="font-semibold text-gray-900 dark:text-white">{category.name}</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">{category.description}</p>
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                      <Badge variant={category.isVisible ? "default" : "secondary"}>
                                        {category.isVisible ? "Visibile" : "Nascosta"}
                                      </Badge>
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        Creata: {new Date(category.createdAt).toLocaleDateString('it-IT')}
                                      </span>
                                    </div>
                                  </>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => updateMenuItemMutation.mutate({ id: category.id, data: { isVisible: !category.isVisible } })}
                                  className="flex-1 sm:flex-none"
                                  title={category.isVisible ? "Nascondi categoria" : "Rendi visibile categoria"}
                                >
                                  {category.isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => { 
                                    setEditingItem(category.id); 
                                    setEditData(category); 
                                  }}
                                  className="flex-1 sm:flex-none"
                                  title="Modifica categoria"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  onClick={() => {
                                    if (confirm(`Sei sicuro di voler eliminare la categoria "${category.name}"?`)) {
                                      updateMenuItemMutation.mutate({ id: category.id, data: { deleted: true } });
                                    }
                                  }}
                                  className="flex-1 sm:flex-none"
                                  title="Elimina categoria"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          
                          {typedMenuData.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              <Utensils className="mx-auto mb-4" size={48} />
                              <p>Nessuna categoria menu</p>
                              <p className="text-sm">Crea le prime categorie per organizzare il tuo menu</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Products Management */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Package className="mr-2" />
                          Prodotti del Menu
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {editingItem === -2 && (
                            <div className="p-4 border-2 border-dashed border-primary/20 rounded-lg">
                              <div className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                    <Label>Nome Prodotto</Label>
                                    <Input 
                                      placeholder="Es. Bruschetta della casa"
                                      value={editData.name || ''}
                                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <Label>Categoria</Label>
                                    <Select onValueChange={(value) => setEditData({ ...editData, categoryId: value })}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Seleziona categoria" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {typedMenuData.map((cat: any) => (
                                          <SelectItem key={cat.id} value={cat.id.toString()}>
                                            {cat.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div>
                                  <Label>Descrizione</Label>
                                  <Textarea
                                    placeholder="Descrizione del prodotto, ingredienti..."
                                    value={editData.description || ''}
                                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                    rows={2}
                                  />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div>
                                    <Label>Prezzo Base (€)</Label>
                                    <Input 
                                      placeholder="12.00"
                                      value={editData.basePrice || ''}
                                      onChange={(e) => setEditData({ ...editData, basePrice: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <Label>Prezzo Alternativo (€)</Label>
                                    <Input 
                                      placeholder="15.00"
                                      value={editData.altPrice || ''}
                                      onChange={(e) => setEditData({ ...editData, altPrice: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <Label>Descrizione Prezzo Alt.</Label>
                                    <Input 
                                      placeholder="Porzione grande"
                                      value={editData.altPriceDesc || ''}
                                      onChange={(e) => setEditData({ ...editData, altPriceDesc: e.target.value })}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label>Allergeni</Label>
                                  <Input 
                                    placeholder="Es. Glutine, Lattosio, Uova (separati da virgola)"
                                    value={editData.allergens || ''}
                                    onChange={(e) => setEditData({ ...editData, allergens: e.target.value })}
                                  />
                                </div>
                                <div className="flex space-x-2">
                                  <Button size="sm" onClick={() => updateMenuItemMutation.mutate({ id: -2, data: editData })}>
                                    <Save className="w-4 h-4 mr-1" />
                                    Crea Prodotto
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => { setEditingItem(null); setEditData({}); }}>
                                    Annulla
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="text-center py-8 text-gray-500">
                            <Package className="mx-auto mb-4" size={48} />
                            <p>Nessun prodotto aggiunto</p>
                            <p className="text-sm">I prodotti del menu verranno visualizzati qui</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-gray-900">Profilo Pub</h2>
                      {!canUpdatePrivateData() && (
                        <div className="flex items-center space-x-2 text-orange-600 bg-orange-50 px-3 py-1 rounded-md">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">Dati privati modificabili ogni 30 giorni</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Basic Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Store className="mr-2" />
                            Informazioni Pubbliche
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label>Nome Pub</Label>
                            <Input 
                              value={editData.name || currentPub?.name || ''} 
                              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                              placeholder="Nome del tuo pub"
                            />
                          </div>
                          <div>
                            <Label>Indirizzo Completo</Label>
                            <Input 
                              value={editData.address || currentPub?.address || ''} 
                              onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                              placeholder="Via Roma 123, 20100 Milano MI"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Inserisci l'indirizzo completo con città e provincia
                            </p>
                          </div>
                          <div>
                            <Label>Descrizione</Label>
                            <Textarea 
                              value={editData.description || currentPub?.description || ''} 
                              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                              placeholder="Descrivi il tuo pub, l'atmosfera, la specialità..."
                              rows={3}
                            />
                          </div>
                          <div>
                            <Label>Tipologia</Label>
                            <Select onValueChange={(value) => setEditData({ ...editData, category: value })}>
                              <SelectTrigger>
                                <SelectValue placeholder={currentPub?.category || "Seleziona tipologia"} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="birreria">Birreria</SelectItem>
                                <SelectItem value="pub">Pub</SelectItem>
                                <SelectItem value="brew_pub">Brew Pub</SelectItem>
                                <SelectItem value="tap_room">Tap Room</SelectItem>
                                <SelectItem value="wine_bar">Wine Bar</SelectItem>
                                <SelectItem value="cocktail_bar">Cocktail Bar</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Contact Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Phone className="mr-2" />
                            Contatti e Social
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label>Telefono</Label>
                            <Input 
                              value={editData.phone || currentPub?.phone || ''} 
                              onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                              placeholder="+39 02 1234567"
                            />
                          </div>
                          <div>
                            <Label>Email Pubblica</Label>
                            <Input 
                              value={editData.email || currentPub?.email || ''} 
                              onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                              placeholder="info@iltuopub.it"
                            />
                          </div>
                          <div>
                            <Label>Sito Web</Label>
                            <Input 
                              value={editData.website || currentPub?.website || ''} 
                              onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                              placeholder="https://www.iltuopub.it"
                            />
                          </div>
                          <div>
                            <Label>Instagram</Label>
                            <Input 
                              value={editData.instagram || currentPub?.instagram || ''} 
                              onChange={(e) => setEditData({ ...editData, instagram: e.target.value })}
                              placeholder="@iltuopub"
                            />
                          </div>
                          <div>
                            <Label>Facebook</Label>
                            <Input 
                              value={editData.facebook || currentPub?.facebook || ''} 
                              onChange={(e) => setEditData({ ...editData, facebook: e.target.value })}
                              placeholder="Il Tuo Pub"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Private Data */}
                      <Card className={!canUpdatePrivateData() ? "opacity-60" : ""}>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center">
                              <MapPin className="mr-2" />
                              Dati Privati
                            </div>
                            {!canUpdatePrivateData() && (
                              <Badge variant="secondary" className="text-xs">
                                Bloccato per {Math.ceil(30 - (lastProfileUpdate ? (Date.now() - lastProfileUpdate.getTime()) / (1000 * 60 * 60 * 24) : 30))} giorni
                              </Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label>Codice Fiscale / P.IVA</Label>
                            <Input 
                              value={editData.vatNumber || currentPub?.vatNumber || ''} 
                              onChange={(e) => setEditData({ ...editData, vatNumber: e.target.value })}
                              placeholder="IT12345678901"
                              disabled={!canUpdatePrivateData()}
                            />
                          </div>
                          <div>
                            <Label>Ragione Sociale</Label>
                            <Input 
                              value={editData.legalName || currentPub?.legalName || ''} 
                              onChange={(e) => setEditData({ ...editData, legalName: e.target.value })}
                              placeholder="Il Tuo Pub S.r.l."
                              disabled={!canUpdatePrivateData()}
                            />
                          </div>
                          <div>
                            <Label>Email Fatturazione</Label>
                            <Input 
                              value={editData.billingEmail || currentPub?.billingEmail || ''} 
                              onChange={(e) => setEditData({ ...editData, billingEmail: e.target.value })}
                              placeholder="fatturazione@iltuopub.it"
                              disabled={!canUpdatePrivateData()}
                            />
                          </div>
                          <div>
                            <Label>Telefono Privato</Label>
                            <Input 
                              value={editData.privatePhone || currentPub?.privatePhone || ''} 
                              onChange={(e) => setEditData({ ...editData, privatePhone: e.target.value })}
                              placeholder="+39 333 1234567"
                              disabled={!canUpdatePrivateData()}
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Statistics and Info */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Activity className="mr-2" />
                            Statistiche e Info
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-gray-50 rounded">
                              <div className="text-2xl font-bold text-primary">
                                {currentPub?.rating && typeof currentPub.rating === 'number' ? currentPub.rating.toFixed(1) : 'N/A'}
                              </div>
                              <div className="text-xs text-gray-600">Rating Medio</div>
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded">
                              <div className="text-2xl font-bold text-primary">
                                {typedTapList.length}
                              </div>
                              <div className="text-xs text-gray-600">Birre alla Spina</div>
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Registrato il:</span>
                              <span className="font-medium">
                                {currentPub?.createdAt ? new Date(currentPub.createdAt).toLocaleDateString('it-IT') : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Ultimo aggiornamento:</span>
                              <span className="font-medium">
                                {lastProfileUpdate ? lastProfileUpdate.toLocaleDateString('it-IT') : 'Mai'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Stato:</span>
                              <Badge variant={currentPub?.isActive ? "default" : "secondary"}>
                                {currentPub?.isActive ? "Attivo" : "Inattivo"}
                              </Badge>
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
                              <Label className="mb-2 block">Logo del Pub</Label>
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                                {currentPub?.logoUrl ? (
                                  <div className="relative">
                                    <img 
                                      src={currentPub.logoUrl} 
                                      alt="Logo pub" 
                                      className="w-24 h-24 mx-auto rounded-full object-cover mb-4"
                                    />
                                    <Button variant="outline" size="sm" className="mb-2">
                                      <Upload className="w-4 h-4 mr-2" />
                                      Cambia Logo
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <Image className="mx-auto mb-4 text-gray-400" size={48} />
                                    <Button variant="outline" size="sm">
                                      <Upload className="w-4 h-4 mr-2" />
                                      Carica Logo
                                    </Button>
                                  </>
                                )}
                                <p className="text-xs text-gray-500 mt-2">
                                  Formato: JPG, PNG. Max 2MB. Consigliato: 400x400px
                                </p>
                              </div>
                            </div>
                            <div>
                              <Label className="mb-2 block">Immagine di Copertina</Label>
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                                {currentPub?.coverImageUrl ? (
                                  <div className="relative">
                                    <img 
                                      src={currentPub.coverImageUrl} 
                                      alt="Copertina pub" 
                                      className="w-full h-24 mx-auto rounded object-cover mb-4"
                                    />
                                    <Button variant="outline" size="sm" className="mb-2">
                                      <Upload className="w-4 h-4 mr-2" />
                                      Cambia Copertina
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <Image className="mx-auto mb-4 text-gray-400" size={48} />
                                    <Button variant="outline" size="sm">
                                      <Upload className="w-4 h-4 mr-2" />
                                      Carica Copertina
                                    </Button>
                                  </>
                                )}
                                <p className="text-xs text-gray-500 mt-2">
                                  Formato: JPG, PNG. Max 5MB. Consigliato: 1200x400px
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Save Button */}
                      <Card className="lg:col-span-2">
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-600">
                              {Object.keys(editData).length > 0 ? (
                                <span className="text-orange-600">⚠️ Hai modifiche non salvate</span>
                              ) : (
                                <span>✅ Profilo aggiornato</span>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                onClick={() => setEditData({})}
                                disabled={Object.keys(editData).length === 0}
                              >
                                Annulla Modifiche
                              </Button>
                              <Button 
                                onClick={() => updatePubProfileMutation.mutate(editData)} 
                                disabled={Object.keys(editData).length === 0 || updatePubProfileMutation.isPending}
                                className="min-w-32"
                              >
                                {updatePubProfileMutation.isPending ? (
                                  "Salvando..."
                                ) : (
                                  <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Salva Tutto
                                  </>
                                )}
                              </Button>
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

      {/* Beer Search Dialog - COMPLETAMENTE RINNOVATO */}
      {showBeerSearch && !showPriceManager && (
        <Dialog open={showBeerSearch} onOpenChange={() => {
          setShowBeerSearch(false);
          setSearchQuery('');
          setReplacingBeer(null);
        }}>
          <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-3 md:p-6">
            <DialogHeader className="pb-3">
              <DialogTitle className="text-lg md:text-xl font-bold">
                {replacingBeer ? '🔄 Sostituisci Birra' : '🍺 Aggiungi Birra alla Taplist'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Search Input - Always visible in the dialog */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  placeholder="Cerca birra per nome o birrificio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full"
                  autoFocus
                />
              </div>
              
              {/* Results inside the same dialog */}
              {searchQuery.length >= 2 && (
                <div className="border rounded-lg max-h-96 overflow-y-auto bg-gray-50 dark:bg-gray-800">
                  {beersLoading ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-gray-600">Cercando birre...</p>
                    </div>
                  ) : filteredBeers && filteredBeers.length > 0 ? (
                    <div className="p-2 space-y-2">
                      {filteredBeers.slice(0, 50).map((beer: any) => (
                        <div
                          key={beer.id}
                          className="p-3 bg-white dark:bg-gray-700 rounded-lg border hover:border-gray-300 transition-all cursor-pointer"
                          onClick={() => {
                            // Chiude ricerca e va direttamente al price manager
                            if (replacingBeer) {
                              replaceBeerMutation.mutate({ 
                                oldId: replacingBeer, 
                                newBeerId: beer.id, 
                                type: priceManagerType 
                              });
                            } else {
                              setShowPriceManager(beer.id);
                            }
                          }}
                        >
                          <div className="flex items-start space-x-3">
                            {beer.imageUrl && (
                              <img 
                                src={beer.imageUrl} 
                                alt={beer.name}
                                className="w-10 h-10 rounded object-cover flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0 max-w-[250px]">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {beer.name}
                              </h4>
                              <p className="text-xs text-gray-600 dark:text-gray-300 truncate font-medium">
                                {beer.breweryName || beer.brewery?.name || 'Birrificio'}
                              </p>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-xs text-gray-500 truncate">
                                  {beer.style}
                                </span>
                                {beer.abv && (
                                  <span className="text-xs text-gray-500 truncate">
                                    • {beer.abv}% ABV
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : searchQuery.length >= 2 ? (
                    <div className="p-8 text-center text-gray-500">
                      <p>Nessuna birra trovata per "{searchQuery}"</p>
                      <p className="text-sm mt-1">Prova con un altro termine di ricerca</p>
                    </div>
                  ) : null}
                </div>
              )}
              
              {searchQuery.length < 2 && (
                <div className="text-center py-8 text-gray-500">
                  <Search className="mx-auto mb-4" size={48} />
                  <p>Inserisci almeno 2 caratteri per cercare</p>
                  <p className="text-sm mt-1">Cerca per nome birra o birrificio</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Price Manager Dialog */}
      {showPriceManager && (
        <Dialog open={!!showPriceManager} onOpenChange={() => setShowPriceManager(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <FlexiblePriceManager
              type={priceManagerType === 'taplist' ? 'tap' : 'bottles'}
              initialPrices={newItemPrices}
              onSave={(prices) => {
                console.log('Saving prices:', prices, 'for beer:', showPriceManager, 'type:', priceManagerType);
                
                if (priceManagerType === 'bottles') {
                  // Add beer to bottles with configured prices
                  addBottleItemMutation.mutate({
                    beerId: showPriceManager,
                    prices: prices,
                    isActive: true,
                    isVisible: true,
                  });
                } else {
                  // Add beer to taplist with configured prices
                  addTapItemMutation.mutate({
                    beerId: showPriceManager,
                    prices: prices,
                    isActive: true,
                    isVisible: true,
                  });
                }
                
                setShowPriceManager(null);
                setNewItemPrices([]);
                setShowBeerSearch(false);
                setSearchQuery('');
              }}
              onCancel={() => {
                setShowPriceManager(null);
                setNewItemPrices([]);
              }}
              beerName="Nuova birra"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}