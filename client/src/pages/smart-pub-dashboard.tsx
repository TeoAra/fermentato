import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  Upload,
  Star,
  Zap,
  Target,
  Crown,
  Wine
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { useMemo } from "react";
import FlexiblePriceManager from "@/components/flexible-price-manager";
import MenuCategoryManager from "@/components/menu-category-manager";
import { TapListManager } from "@/components/taplist-manager";
import { BottleListManager } from "@/components/bottle-list-manager";
import { PubOwnerTopBar } from "@/components/pub-owner-top-bar";
import { ImageUpload } from "@/components/image-upload";

type DashboardSection = 'overview' | 'taplist' | 'bottles' | 'menu' | 'hours' | 'analytics' | 'settings' | 'profile';

export default function SmartPubDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Logout handler
  const handleLogout = async () => {
    try {
      // Call logout endpoint
      await apiRequest('/api/auth/logout', { method: 'POST' });
      
      // Clear query cache
      queryClient.clear();
      
      // Redirect to home page
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, redirect to home
      window.location.href = '/';
    }
  };
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
  
  // Settings form state
  const [settingsData, setSettingsData] = useState<any>({});
  const [settingsChanged, setSettingsChanged] = useState(false);

  // Fetch pub data
  const { data: userPubs, isLoading: pubsLoading } = useQuery({
    queryKey: ["/api/my-pubs"],
    enabled: isAuthenticated && (user as any)?.userType === 'pub_owner',
  });

  const currentPub = Array.isArray(userPubs) ? userPubs[0] : null;

  // Initialize settings data when currentPub changes
  useEffect(() => {
    if (currentPub) {
      setSettingsData({
        name: currentPub.name || '',
        description: currentPub.description || '',
        address: currentPub.address || '',
        city: currentPub.city || '',
        region: currentPub.region || '',
        postalCode: currentPub.postalCode || '',
        phone: currentPub.phone || '',
        email: currentPub.email || '',
        websiteUrl: currentPub.websiteUrl || '',
        facebookUrl: currentPub.facebookUrl || '',
        instagramUrl: currentPub.instagramUrl || '',
        twitterUrl: currentPub.twitterUrl || '',
        logoUrl: currentPub.logoUrl || '',
        coverImageUrl: currentPub.coverImageUrl || '',
        openingHours: currentPub.openingHours || null,
        isActive: currentPub.isActive ?? true,
        businessName: currentPub.businessName || '',
        vatNumber: currentPub.vatNumber || '',
      });
      setSettingsChanged(false);
    }
  }, [currentPub]);

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

  // Fetch all products for all categories in a single query
  const { data: allCategoryProducts, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/pubs", currentPub?.id, "menu", "all-products"],
    queryFn: async () => {
      if (!currentPub?.id || !Array.isArray(menuData) || menuData.length === 0) return {};
      
      const productMap: Record<number, any[]> = {};
      
      // Fetch products for all categories in parallel
      const promises = menuData.map(async (category) => {
        try {
          const products = await apiRequest(`/api/pubs/${currentPub.id}/menu/categories/${category.id}/items`, { method: 'GET' });
          return { categoryId: category.id, products: Array.isArray(products) ? products : [] };
        } catch (error) {
          console.warn(`Failed to fetch products for category ${category.id}:`, error);
          return { categoryId: category.id, products: [] };
        }
      });
      
      const results = await Promise.all(promises);
      results.forEach(({ categoryId, products }) => {
        productMap[categoryId] = products;
      });
      
      return productMap;
    },
    enabled: !!currentPub?.id && Array.isArray(menuData) && menuData.length > 0,
  });

  // Create a safe reference to category products map
  const categoryProductsMap = useMemo(() => {
    return allCategoryProducts || {};
  }, [allCategoryProducts]);

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
      return apiRequest(`/api/pubs/${currentPub?.id}/taplist/${id}`, { method: 'PATCH' }, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", currentPub?.id, "taplist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", currentPub?.id] });
      setEditingItem(null);
      toast({ title: "Birra aggiornata", description: "Le modifiche sono state salvate" });
    },
  });

  const addTapItemMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Mutation called with data:', data);
      console.log('Current pub ID:', currentPub?.id);
      return apiRequest(`/api/pubs/${currentPub?.id}/taplist`, { method: 'POST' }, data);
    },
    onSuccess: async (result) => {
      console.log('Mutation success:', result);
      // Optimized cache invalidation
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", currentPub?.id, "taplist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", currentPub?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-pubs"] });
      toast({ title: "Birra aggiunta", description: "Nuova birra aggiunta alla tap list" });
      setShowBeerSearch(false);
      setSearchQuery('');
      setNewItemPrices([{size: '', price: ''}]);
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      toast({ title: "Errore", description: "Impossibile aggiungere la birra", variant: "destructive" });
    }
  });

  const removeTapItemMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log('Removing tap item:', id);
      return apiRequest(`/api/pubs/${currentPub?.id}/taplist/${id}`, { method: 'DELETE' });
    },
    onSuccess: async (data) => {
      console.log('Remove success:', data);
      // Optimized cache invalidation
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", currentPub?.id, "taplist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", currentPub?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-pubs"] });
      toast({ title: "Birra eliminata", description: "Birra rimossa dalla taplist" });
    },
    onError: (error) => {
      console.error('Remove error:', error);
      toast({ title: "Errore", description: "Impossibile eliminare la birra", variant: "destructive" });
    }
  });

  // Pub update mutation
  const updatePubMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Updating pub with data:', data);
      return apiRequest(`/api/pubs/${currentPub?.id}`, { method: 'PATCH' }, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-pubs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", currentPub?.id] });
      setSettingsChanged(false);
      toast({ 
        title: "Impostazioni aggiornate", 
        description: "Le modifiche sono state salvate correttamente" 
      });
    },
    onError: (error) => {
      console.error('Pub update error:', error);
      toast({ 
        title: "Errore", 
        description: "Impossibile salvare le modifiche", 
        variant: "destructive" 
      });
    }
  });

  // Helper functions for settings management
  const updateSettingsField = (field: string, value: any) => {
    setSettingsData((prev: any) => ({ ...prev, [field]: value }));
    setSettingsChanged(true);
  };

  const handleSaveSettings = () => {
    if (!settingsChanged) return;
    updatePubMutation.mutate(settingsData);
  };

  // Smart dashboard sections configuration
  const sections = [
    { id: 'overview', name: 'Dashboard', icon: Home, gradient: 'from-blue-500 to-purple-600' },
    { id: 'taplist', name: 'Taplist', icon: Beer, gradient: 'from-amber-500 to-orange-600' },
    { id: 'bottles', name: 'Cantina', icon: Wine, gradient: 'from-purple-500 to-violet-600' },
    { id: 'menu', name: 'Menu', icon: Utensils, gradient: 'from-green-500 to-emerald-600' },
    { id: 'hours', name: 'Orari', icon: Clock, gradient: 'from-orange-500 to-red-600' },
    { id: 'analytics', name: 'Analytics', icon: BarChart3, gradient: 'from-indigo-500 to-blue-600' },
    { id: 'settings', name: 'Impostazioni', icon: Settings, gradient: 'from-gray-500 to-slate-600' },
    { id: 'profile', name: 'Profilo', icon: Users, gradient: 'from-rose-500 to-pink-600' },
  ];

  // Modern KPI Cards Component with Animations
  const ModernKPICard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    trendValue, 
    gradient, 
    description,
    delay = 0
  }: {
    title: string;
    value: string | number;
    icon: any;
    trend?: 'up' | 'down';
    trendValue?: string;
    gradient: string;
    description?: string;
    delay?: number;
  }) => (
    <motion.div 
      className="glass-card rounded-2xl p-6 group relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Background Gradient */}
      <motion.div 
        className={`absolute inset-0 bg-gradient-to-br ${gradient}`}
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 0.1 }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <motion.div 
            className={`p-3 rounded-xl bg-gradient-to-br ${gradient} bg-opacity-10`}
            whileHover={{ scale: 1.1, rotate: 5, backgroundColor: 'rgba(255,255,255,0.2)' }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
            >
              <Icon className={`h-6 w-6 bg-gradient-to-br ${gradient} bg-clip-text text-transparent`} />
            </motion.div>
          </motion.div>
          {trend && trendValue && (
            <div className={`flex items-center text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              <span className="ml-1">{trendValue}</span>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <motion.h3 
            className="text-2xl font-bold text-gray-900 dark:text-white"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: delay + 0.2 }}
          >
            <motion.span
              key={value}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {value}
            </motion.span>
          </motion.h3>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <AnimatePresence>
            {description && (
              <motion.p 
                className="text-xs text-gray-500 dark:text-gray-500"
                initial={{ opacity: 0, height: 0 }}
                whileHover={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                {description}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Hover Effect */}
      <motion.div 
        className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`}
        initial={{ scaleX: 0 }}
        whileHover={{ scaleX: 1 }}
        transition={{ duration: 0.3 }}
        style={{ transformOrigin: 'left' }}
      />
    </motion.div>
  );

  // Modern Overview Section with Animations
  const renderOverview = () => (
    <motion.div 
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Hero Section */}
      <motion.div 
        className="glass-card rounded-2xl p-8 mb-8 relative overflow-hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="absolute inset-0 gradient-bg-primary opacity-10"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-display-xl text-gray-900 dark:text-white mb-2">
                {currentPub?.name}
              </h1>
              <div className="flex items-center text-gray-600 dark:text-gray-400 text-body-medium">
                <MapPin className="h-4 w-4 mr-2" />
                {currentPub?.address}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Attivo
              </Badge>
              <Button variant="outline" size="sm" className="btn-glass">
                <Settings className="h-4 w-4 mr-2" />
                Impostazioni
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modern KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ModernKPICard
          title="Birre alla Spina"
          value={typedTapList.length}
          icon={Beer}
          gradient="from-amber-500 to-orange-600"
          trend="up"
          trendValue="+2"
          description="Birre attive sul sistema"
          delay={0.1}
        />
        <ModernKPICard
          title="Birre in Bottiglia"
          value={typedBottleList.length}
          icon={Package}
          gradient="from-emerald-500 to-green-600"
          trend="up"
          trendValue="+5"
          description="Selezione bottiglie"
          delay={0.2}
        />
        <ModernKPICard
          title="Categorie Menu"
          value={typedMenuData.length}
          icon={Utensils}
          gradient="from-blue-500 to-indigo-600"
          description="Menu categorie attive"
          delay={0.3}
        />
        <ModernKPICard
          title="Visualizzazioni Oggi"
          value="247"
          icon={Eye}
          gradient="from-purple-500 to-pink-600"
          trend="up"
          trendValue="+12%"
          description="Visite pagina pub"
          delay={0.4}
        />
      </div>

      {/* Smart Analytics Cards */}
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        {/* Popular Beers */}
        <motion.div 
          className="lg:col-span-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <motion.div
            className="modern-card rounded-2xl overflow-hidden"
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border-b">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Crown className="mr-3 h-5 w-5 text-amber-600" />
                  <span className="text-display-lg">Birre Più Popolari</span>
                </div>
                <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                  Top 5
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {typedTapList.slice(0, 5).map((beer: any, index: number) => (
                  <motion.div 
                    key={beer.id} 
                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.7 + (index * 0.1) }}
                    whileHover={{ scale: 1.02, backgroundColor: 'rgb(243 244 246)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {beer.beer?.name || 'Nome non disponibile'}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {beer.beer?.brewery?.name || beer.beer?.breweryName || 'Birrificio'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-semibold text-gray-900 dark:text-white">4.{index + 6}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {Math.floor(Math.random() * 50) + 20} recensioni
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </motion.div>
        </motion.div>

        {/* Quick Stats */}
        <div className="space-y-6">
          <Card className="modern-card rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
              <CardTitle className="flex items-center">
                <Activity className="mr-3 h-5 w-5 text-blue-600" />
                <span className="text-lg">Attività Recente</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-green-50 dark:bg-green-950">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <p className="text-sm text-green-800 dark:text-green-200">Nuova birra aggiunta</p>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <p className="text-sm text-blue-800 dark:text-blue-200">Menu aggiornato</p>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <p className="text-sm text-orange-800 dark:text-orange-200">15 nuove recensioni</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="modern-card rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
              <CardTitle className="flex items-center">
                <Target className="mr-3 h-5 w-5 text-purple-600" />
                <span className="text-lg">Obiettivi</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Recensioni Mese</span>
                    <span className="font-semibold">67/100</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" style={{ width: '67%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Nuove Birre</span>
                    <span className="font-semibold">8/12</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full" style={{ width: '67%' }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );

  // Taplist Section
  const renderTaplist = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Taplist Management</h2>
          <p className="text-gray-600 dark:text-gray-400">Gestisci le birre alla spina del tuo pub</p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
        <TapListManager 
          pubId={currentPub?.id || 0} 
          tapList={typedTapList} 
        />
      </div>
    </div>
  );

  // Menu Section - Enhanced with better layout integration
  const renderMenu = () => (
    <motion.div 
      className="space-y-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Section Header with improved styling */}
      <motion.div 
        className="text-center lg:text-left"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="inline-flex items-center justify-center lg:justify-start w-full">
          <motion.div
            className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl shadow-lg mr-4"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ duration: 0.3 }}
          >
            <Utensils className="h-8 w-8 text-white" />
          </motion.div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Gestione Menu
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Organizza categorie e prodotti del tuo menu con facilità
            </p>
          </div>
        </div>
      </motion.div>

      {/* Menu Stats Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <motion.div
          className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-2xl p-6 border border-blue-200 dark:border-blue-800"
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                Categorie Totali
              </p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {typedMenuData.length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
              <Utensils className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-2xl p-6 border border-green-200 dark:border-green-800"
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
                Categorie Visibili
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {typedMenuData.filter(cat => cat.isVisible).length}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl">
              <Eye className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 rounded-2xl p-6 border border-orange-200 dark:border-orange-800"
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">
                Prodotti Totali
              </p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                {typedMenuData.reduce((total, category) => total + (category.items?.length || 0), 0)}
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-xl">
              <Package className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </motion.div>
      </motion.div>
      
      {/* MenuCategoryManager Component - No wrapper card needed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <MenuCategoryManager 
          pubId={currentPub?.id || 0}
          categories={typedMenuData}
        />
      </motion.div>
    </motion.div>
  );

  // Analytics Section
  const renderAnalytics = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h2>
        <p className="text-gray-600 dark:text-gray-400">Statistiche e performance del tuo pub</p>
      </div>
      
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Visualizzazioni</p>
              <p className="text-2xl font-bold">1,247</p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Eye className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Click Taplist</p>
              <p className="text-2xl font-bold">342</p>
            </div>
            <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
              <Beer className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Menu Views</p>
              <p className="text-2xl font-bold">189</p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Utensils className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Favorites</p>
              <p className="text-2xl font-bold">67</p>
            </div>
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <Star className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>
      
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Birre Più Richieste</h3>
        <div className="space-y-3">
          {typedTapList.slice(0, 5).map((beer: any, index: number) => (
            <div key={beer.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium">{beer.beer?.name || 'Nome non disponibile'}</p>
                  <p className="text-sm text-gray-500">{beer.beer?.brewery?.name || 'Birrificio'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">{Math.floor(Math.random() * 50) + 20} views</p>
                <p className="text-sm text-gray-500">questa settimana</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  // Hours Section - Dedicated Opening Hours Management
  const renderHours = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestione Orari</h2>
          <p className="text-gray-600 dark:text-gray-400">Configura gli orari di apertura del tuo pub</p>
        </div>
        {settingsChanged && (
          <Button 
            onClick={handleSaveSettings}
            disabled={updatePubMutation.isPending}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            data-testid="button-save-hours"
          >
            {updatePubMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salva Orari
              </>
            )}
          </Button>
        )}
      </div>

      {/* Opening Hours Card */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <Clock className="h-6 w-6 mr-3 text-orange-600" />
          Orari di Apertura
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Configura gli orari di apertura per ogni giorno della settimana. I clienti vedranno in tempo reale se sei attualmente aperto o chiuso.
        </p>
        <div className="space-y-4">
          {[
            { key: 'monday', label: 'Lunedì' },
            { key: 'tuesday', label: 'Martedì' },
            { key: 'wednesday', label: 'Mercoledì' },
            { key: 'thursday', label: 'Giovedì' },
            { key: 'friday', label: 'Venerdì' },
            { key: 'saturday', label: 'Sabato' },
            { key: 'sunday', label: 'Domenica' },
          ].map((day) => {
            const dayHours = settingsData.openingHours?.[day.key];
            const isClosed = dayHours?.isClosed;
            
            return (
              <div key={day.key} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-20">
                    <Label className="font-medium text-gray-900 dark:text-white">{day.label}</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Input
                      type="time"
                      value={dayHours?.open || "12:00"}
                      onChange={(e) => {
                        const newHours = {
                          ...settingsData.openingHours,
                          [day.key]: {
                            ...dayHours,
                            open: e.target.value,
                            isClosed: false,
                          },
                        };
                        updateSettingsField('openingHours', newHours);
                      }}
                      disabled={isClosed}
                      className="w-32"
                      data-testid={`input-${day.key}-open`}
                    />
                    <span className="text-gray-500 dark:text-gray-400">-</span>
                    <Input
                      type="time"
                      value={dayHours?.close || "23:00"}
                      onChange={(e) => {
                        const newHours = {
                          ...settingsData.openingHours,
                          [day.key]: {
                            ...dayHours,
                            close: e.target.value,
                            isClosed: false,
                          },
                        };
                        updateSettingsField('openingHours', newHours);
                      }}
                      disabled={isClosed}
                      className="w-32"
                      data-testid={`input-${day.key}-close`}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={isClosed || false}
                    onCheckedChange={(checked) => {
                      const newHours = {
                        ...settingsData.openingHours,
                        [day.key]: {
                          ...dayHours,
                          isClosed: checked,
                        },
                      };
                      updateSettingsField('openingHours', newHours);
                    }}
                    data-testid={`switch-${day.key}-closed`}
                  />
                  <Label className="text-sm text-gray-600 dark:text-gray-400">Chiuso</Label>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            <strong>Nota:</strong> Gli orari saranno visibili ai clienti sulla pagina del pub e determinano automaticamente se il locale appare come aperto o chiuso.
          </p>
        </div>
      </Card>
    </div>
  );

  // Settings Section - Complete Implementation
  const renderSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Impostazioni Pub</h2>
          <p className="text-gray-600 dark:text-gray-400">Gestisci tutti gli aspetti del tuo locale</p>
        </div>
        {settingsChanged && (
          <Button 
            onClick={handleSaveSettings}
            disabled={updatePubMutation.isPending}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            data-testid="button-save-all-settings"
          >
            {updatePubMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salva Tutte le Modifiche
              </>
            )}
          </Button>
        )}
      </div>

      <div className="grid gap-6">
        {/* Cover Image Section */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Image className="h-5 w-5 mr-2 text-blue-600" />
            Immagine di Copertina
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            L'immagine principale che rappresenta il tuo pub. Sarà mostrata nella pagina del pub e nei risultati di ricerca.
          </p>
          <ImageUpload
            label="Copertina Pub"
            description="Immagine principale che verrà mostrata in evidenza sulla pagina del pub"
            currentImageUrl={settingsData.coverImageUrl}
            onImageChange={(url) => updateSettingsField('coverImageUrl', url)}
            folder="pub-covers"
            aspectRatio="landscape"
            maxSize={8}
            recommendedDimensions="1200x630 px"
            acceptedFormats={['JPG', 'PNG', 'WebP']}
            showFileInfo={true}
          />
        </Card>

        {/* Logo/Profile Image Section */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2 text-purple-600" />
            Logo/Immagine Profilo
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Il logo o l'immagine che identifica il tuo pub. Apparirà come avatar nelle liste e nelle mappe.
          </p>
          <ImageUpload
            label="Logo Pub"
            description="Logo che identifica il pub, visibile in liste, mappe e risultati di ricerca"
            currentImageUrl={settingsData.logoUrl}
            onImageChange={(url) => updateSettingsField('logoUrl', url)}
            folder="pub-logos"
            aspectRatio="square"
            maxSize={3}
            recommendedDimensions="400x400 px"
            acceptedFormats={['JPG', 'PNG', 'WebP']}
            showFileInfo={true}
          />
        </Card>

        {/* Basic Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Store className="h-5 w-5 mr-2 text-orange-600" />
            Informazioni Base
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pub-name">Nome Pub *</Label>
              <Input 
                id="pub-name"
                value={settingsData.name || ''}
                onChange={(e) => updateSettingsField('name', e.target.value)}
                placeholder="Es. Il Luppolino"
                data-testid="input-pub-name"
              />
            </div>
            <div>
              <Label htmlFor="business-name">Nome Commerciale</Label>
              <Input 
                id="business-name"
                value={settingsData.businessName || ''}
                onChange={(e) => updateSettingsField('businessName', e.target.value)}
                placeholder="Ragione sociale"
                data-testid="input-business-name"
              />
            </div>
            <div>
              <Label htmlFor="pub-phone">Telefono</Label>
              <Input 
                id="pub-phone"
                value={settingsData.phone || ''}
                onChange={(e) => updateSettingsField('phone', e.target.value)}
                placeholder="+39 012 345 6789"
                data-testid="input-pub-phone"
              />
            </div>
            <div>
              <Label htmlFor="pub-email">Email</Label>
              <Input 
                id="pub-email"
                type="email"
                value={settingsData.email || ''}
                onChange={(e) => updateSettingsField('email', e.target.value)}
                placeholder="info@ilpub.it"
                data-testid="input-pub-email"
              />
            </div>
            <div>
              <Label htmlFor="vat-number">Partita IVA</Label>
              <Input 
                id="vat-number"
                value={settingsData.vatNumber || ''}
                onChange={(e) => updateSettingsField('vatNumber', e.target.value)}
                placeholder="12345678901"
                data-testid="input-vat-number"
              />
            </div>
          </div>
          <div className="mt-4">
            <Label htmlFor="pub-description">Descrizione</Label>
            <Textarea 
              id="pub-description"
              value={settingsData.description || ''}
              onChange={(e) => updateSettingsField('description', e.target.value)}
              placeholder="Racconta la storia del tuo pub, cosa lo rende speciale..."
              rows={4}
              data-testid="textarea-pub-description"
            />
          </div>
        </Card>

        {/* Address and Location */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <MapPin className="h-5 w-5 mr-2 text-red-600" />
            Indirizzo e Posizione
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="pub-address">Indirizzo *</Label>
              <Input 
                id="pub-address"
                value={settingsData.address || ''}
                onChange={(e) => updateSettingsField('address', e.target.value)}
                placeholder="Via Roma, 123"
                data-testid="input-pub-address"
              />
            </div>
            <div>
              <Label htmlFor="pub-city">Città *</Label>
              <Input 
                id="pub-city"
                value={settingsData.city || ''}
                onChange={(e) => updateSettingsField('city', e.target.value)}
                placeholder="Milano"
                data-testid="input-pub-city"
              />
            </div>
            <div>
              <Label htmlFor="pub-region">Regione/Provincia</Label>
              <Input 
                id="pub-region"
                value={settingsData.region || ''}
                onChange={(e) => updateSettingsField('region', e.target.value)}
                placeholder="Lombardia"
                data-testid="input-pub-region"
              />
            </div>
            <div>
              <Label htmlFor="pub-postal">CAP</Label>
              <Input 
                id="pub-postal"
                value={settingsData.postalCode || ''}
                onChange={(e) => updateSettingsField('postalCode', e.target.value)}
                placeholder="20121"
                data-testid="input-pub-postal"
              />
            </div>
          </div>
        </Card>

        {/* Opening Hours */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-orange-600" />
            Orari di Apertura
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Configura gli orari di apertura per ogni giorno della settimana. I clienti vedranno se sei attualmente aperto o chiuso.
          </p>
          <div className="space-y-4">
            {[
              { key: 'monday', label: 'Lunedì' },
              { key: 'tuesday', label: 'Martedì' },
              { key: 'wednesday', label: 'Mercoledì' },
              { key: 'thursday', label: 'Giovedì' },
              { key: 'friday', label: 'Venerdì' },
              { key: 'saturday', label: 'Sabato' },
              { key: 'sunday', label: 'Domenica' },
            ].map((day) => {
              const dayHours = settingsData.openingHours?.[day.key];
              const isClosed = dayHours?.isClosed;
              
              return (
                <div key={day.key} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-20">
                      <Label className="font-medium text-gray-900 dark:text-white">{day.label}</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Input
                        type="time"
                        value={dayHours?.open || "12:00"}
                        onChange={(e) => {
                          const newHours = {
                            ...settingsData.openingHours,
                            [day.key]: {
                              ...dayHours,
                              open: e.target.value,
                              isClosed: false,
                            },
                          };
                          updateSettingsField('openingHours', newHours);
                        }}
                        disabled={isClosed}
                        className="w-32"
                        data-testid={`input-${day.key}-open`}
                      />
                      <span className="text-gray-500 dark:text-gray-400">-</span>
                      <Input
                        type="time"
                        value={dayHours?.close || "23:00"}
                        onChange={(e) => {
                          const newHours = {
                            ...settingsData.openingHours,
                            [day.key]: {
                              ...dayHours,
                              close: e.target.value,
                              isClosed: false,
                            },
                          };
                          updateSettingsField('openingHours', newHours);
                        }}
                        disabled={isClosed}
                        className="w-32"
                        data-testid={`input-${day.key}-close`}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={isClosed || false}
                      onCheckedChange={(checked) => {
                        const newHours = {
                          ...settingsData.openingHours,
                          [day.key]: {
                            ...dayHours,
                            isClosed: checked,
                          },
                        };
                        updateSettingsField('openingHours', newHours);
                      }}
                      data-testid={`switch-${day.key}-closed`}
                    />
                    <Label className="text-sm text-gray-600 dark:text-gray-400">Chiuso</Label>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Social Media Links */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Globe className="h-5 w-5 mr-2 text-blue-600" />
            Social Media e Web
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Collega i tuoi profili social per aumentare la visibilità del pub.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="website-url">Sito Web</Label>
              <Input 
                id="website-url"
                value={settingsData.websiteUrl || ''}
                onChange={(e) => updateSettingsField('websiteUrl', e.target.value)}
                placeholder="https://www.ilmiopub.it"
                data-testid="input-website-url"
              />
            </div>
            <div>
              <Label htmlFor="facebook-url">Facebook</Label>
              <Input 
                id="facebook-url"
                value={settingsData.facebookUrl || ''}
                onChange={(e) => updateSettingsField('facebookUrl', e.target.value)}
                placeholder="https://facebook.com/ilmiopub"
                data-testid="input-facebook-url"
              />
            </div>
            <div>
              <Label htmlFor="instagram-url">Instagram</Label>
              <Input 
                id="instagram-url"
                value={settingsData.instagramUrl || ''}
                onChange={(e) => updateSettingsField('instagramUrl', e.target.value)}
                placeholder="https://instagram.com/ilmiopub"
                data-testid="input-instagram-url"
              />
            </div>
            <div>
              <Label htmlFor="twitter-url">Twitter/X</Label>
              <Input 
                id="twitter-url"
                value={settingsData.twitterUrl || ''}
                onChange={(e) => updateSettingsField('twitterUrl', e.target.value)}
                placeholder="https://x.com/ilmiopub"
                data-testid="input-twitter-url"
              />
            </div>
          </div>
        </Card>

        {/* Visibility and Privacy Settings */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Eye className="h-5 w-5 mr-2 text-green-600" />
            Visibilità e Privacy
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="font-medium">Pub Attivo</p>
                <p className="text-sm text-gray-500">Il pub è operativo e visibile al pubblico</p>
              </div>
              <Switch 
                checked={settingsData.isActive ?? true}
                onCheckedChange={(checked) => updateSettingsField('isActive', checked)}
                data-testid="switch-pub-active"
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="font-medium">Listato nei Risultati</p>
                <p className="text-sm text-gray-500">Il pub appare nelle ricerche e nelle mappe</p>
              </div>
              <Switch 
                checked={settingsData.isActive ?? true}
                onCheckedChange={(checked) => updateSettingsField('isActive', checked)}
                data-testid="switch-pub-visible"
              />
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 border-blue-200 dark:border-gray-600">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Modifiche in Sospeso</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {settingsChanged ? 
                  'Hai delle modifiche non salvate. Clicca "Salva" per confermare.' : 
                  'Tutte le modifiche sono state salvate.'}
              </p>
            </div>
            <div className="flex gap-3">
              {settingsChanged && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // Reset to original data
                    if (currentPub) {
                      setSettingsData({
                        name: currentPub.name || '',
                        description: currentPub.description || '',
                        address: currentPub.address || '',
                        city: currentPub.city || '',
                        region: currentPub.region || '',
                        postalCode: currentPub.postalCode || '',
                        phone: currentPub.phone || '',
                        email: currentPub.email || '',
                        websiteUrl: currentPub.websiteUrl || '',
                        facebookUrl: currentPub.facebookUrl || '',
                        instagramUrl: currentPub.instagramUrl || '',
                        twitterUrl: currentPub.twitterUrl || '',
                        logoUrl: currentPub.logoUrl || '',
                        coverImageUrl: currentPub.coverImageUrl || '',
                        openingHours: currentPub.openingHours || null,
                        isActive: currentPub.isActive ?? true,
                        businessName: currentPub.businessName || '',
                        vatNumber: currentPub.vatNumber || '',
                      });
                      setSettingsChanged(false);
                    }
                  }}
                  data-testid="button-reset-settings"
                >
                  <X className="h-4 w-4 mr-2" />
                  Annulla
                </Button>
              )}
              <Button 
                onClick={handleSaveSettings}
                disabled={!settingsChanged || updatePubMutation.isPending}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                data-testid="button-save-settings"
              >
                {updatePubMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salva Impostazioni
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  // Bottles Section
  const renderBottles = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cantina Management</h2>
          <p className="text-gray-600 dark:text-gray-400">Gestisci le birre in bottiglia della cantina</p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
        <BottleListManager 
          pubId={currentPub?.id || 0} 
          bottleList={typedBottleList} 
        />
      </div>
    </div>
  );

  // Profile Section
  const renderProfile = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Profilo</h2>
        <p className="text-gray-600 dark:text-gray-400">Gestisci il tuo account</p>
      </div>
      
      <Card className="p-6">
        <div className="flex items-center space-x-6 mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-orange-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {(user as any)?.firstName?.[0] || 'U'}{(user as any)?.lastName?.[0] || 'S'}
          </div>
          <div>
            <h3 className="text-xl font-semibold">{(user as any)?.firstName || 'Nome'} {(user as any)?.lastName || 'Cognome'}</h3>
            <p className="text-gray-600">{(user as any)?.email || 'email@example.com'}</p>
            <Badge variant="secondary" className="mt-2">Pub Owner</Badge>
          </div>
        </div>
        
        <div className="grid gap-4">
          <div>
            <Label>Nome</Label>
            <Input defaultValue={(user as any)?.firstName || ''} data-testid="input-first-name" />
          </div>
          <div>
            <Label>Cognome</Label>
            <Input defaultValue={(user as any)?.lastName || ''} data-testid="input-last-name" />
          </div>
          <div>
            <Label>Email</Label>
            <Input defaultValue={(user as any)?.email || ''} type="email" data-testid="input-email" />
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
          <Button data-testid="button-save-profile">
            <Save className="h-4 w-4 mr-2" />
            Aggiorna Profilo
          </Button>
        </div>
      </Card>
    </div>
  );

  // Mobile Header - Now without conflicts
  const renderMobileHeader = () => (
    <div className="lg:hidden bg-white dark:bg-gray-900 border-b p-4 flex items-center gap-3 sticky top-0 z-40">
      {currentSection !== 'overview' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentSection('overview')}
          className="text-primary hover:text-primary/80"
          data-testid="button-back-overview"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${sections.find(s => s.id === currentSection)?.gradient || 'from-blue-500 to-purple-600'}`}>
          {sections.find(s => s.id === currentSection)?.icon && (
            <div className="w-5 h-5 text-white">
              {React.createElement(sections.find(s => s.id === currentSection)!.icon)}
            </div>
          )}
        </div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          {sections.find(s => s.id === currentSection)?.name || 'Dashboard Pub'}
        </h1>
      </div>
    </div>
  );

  // Modern Sidebar  
  const renderSidebar = () => (
    <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
      <div className="bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-1 flex flex-col min-h-0">
        <div className="flex items-center h-16 flex-shrink-0 px-6 border-b">
          <div className="flex items-center">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
              <Store className="w-6 h-6 text-white" />
            </div>
            <span className="ml-3 text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Dashboard
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
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                {(user as any)?.firstName?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {(user as any)?.firstName || 'Nome'} {(user as any)?.lastName || 'Cognome'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {currentPub?.name}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (pubsLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 bg-primary rounded-full animate-bounce"></div>
            <div className="w-4 h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-4 h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentPub) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center space-y-4">
          <Store className="w-16 h-16 text-gray-400 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nessun pub trovato</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Non hai ancora registrato un pub. Registrane uno per accedere alla dashboard.
          </p>
          <Button className="mt-4">
            Registra un Pub
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950">
      <PubOwnerTopBar 
        currentSection={currentSection}
        setCurrentSection={setCurrentSection}
        sections={sections as any}
        currentPub={currentPub}
        user={user}
        onLogout={handleLogout}
      />
      
      {/* Main Content */}
      <div className="flex-1">
        <div className="p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
              {currentSection === 'overview' && renderOverview()}
              
              {currentSection === 'taplist' && renderTaplist()}
              {currentSection === 'bottles' && renderBottles()}
              {currentSection === 'menu' && renderMenu()}
              {currentSection === 'hours' && renderHours()}
              {currentSection === 'analytics' && renderAnalytics()}
              {currentSection === 'settings' && renderSettings()}
              {currentSection === 'profile' && renderProfile()}
              
              {/* Fallback for unimplemented sections */}
              {!['overview', 'taplist', 'bottles', 'menu', 'hours', 'analytics', 'settings', 'profile'].includes(currentSection) && (
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
                      Sezione in fase di sviluppo.
                    </p>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}