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
  Crown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { useMemo } from "react";
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

  // Fetch all products for all categories in a single query
  const { data: allCategoryProducts, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/pubs", currentPub?.id, "menu", "all-products"],
    queryFn: async () => {
      if (!currentPub?.id || !Array.isArray(menuData) || menuData.length === 0) return {};
      
      const productMap: Record<number, any[]> = {};
      
      // Fetch products for all categories in parallel
      const promises = menuData.map(async (category) => {
        try {
          const products = await apiRequest(`/api/pubs/${currentPub.id}/menu/categories/${category.id}/items`, 'GET');
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
      return apiRequest(`/api/pubs/${currentPub?.id}/taplist/${id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", currentPub?.id, "taplist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", currentPub?.id] });
      queryClient.refetchQueries({ queryKey: ["/api/pubs", currentPub?.id, "taplist"] });
      queryClient.refetchQueries({ queryKey: ["/api/pubs", currentPub?.id] });
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
    onSuccess: async (result) => {
      console.log('Mutation success:', result);
      // Aggiornamento istantaneo forzato
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/pubs", currentPub?.id, "taplist"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/pubs", currentPub?.id] }),
        queryClient.invalidateQueries({ queryKey: ["/api/my-pubs"] }),
        queryClient.refetchQueries({ queryKey: ["/api/pubs", currentPub?.id, "taplist"] }),
        queryClient.refetchQueries({ queryKey: ["/api/pubs", currentPub?.id] })
      ]);
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
      return apiRequest(`/api/pubs/${currentPub?.id}/taplist/${id}`, 'DELETE');
    },
    onSuccess: async (data) => {
      console.log('Remove success:', data);
      // Forza il refresh completo e immediato
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/pubs", currentPub?.id, "taplist"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/pubs", currentPub?.id] }),
        queryClient.invalidateQueries({ queryKey: ["/api/my-pubs"] }),
        queryClient.refetchQueries({ queryKey: ["/api/pubs", currentPub?.id, "taplist"] }),
        queryClient.refetchQueries({ queryKey: ["/api/pubs", currentPub?.id] })
      ]);
      toast({ title: "Birra eliminata", description: "Birra rimossa dalla taplist" });
    },
    onError: (error) => {
      console.error('Remove error:', error);
      toast({ title: "Errore", description: "Impossibile eliminare la birra", variant: "destructive" });
    }
  });

  // Smart dashboard sections configuration
  const sections = [
    { id: 'overview', name: 'Dashboard', icon: Home, gradient: 'from-blue-500 to-purple-600' },
    { id: 'taplist', name: 'Taplist', icon: Beer, gradient: 'from-amber-500 to-orange-600' },
    { id: 'menu', name: 'Menu', icon: Utensils, gradient: 'from-green-500 to-emerald-600' },
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
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="glass-card flex-1 flex flex-col min-h-0 border-r">
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
                {user?.firstName?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.firstName} {user?.lastName}
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
      {renderMobileHeader()}
      
      <div className="flex">
        {renderSidebar()}
        
        {/* Main Content */}
        <div className="flex-1 md:ml-64">
          <div className="p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
              {currentSection === 'overview' && renderOverview()}
              
              {/* Placeholder for other sections - will be implemented */}
              {currentSection !== 'overview' && (
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