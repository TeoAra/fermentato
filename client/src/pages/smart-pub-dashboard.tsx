import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  Wine,
  Gift,
  ShieldOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  CalendarDays,
  BadgeCheck
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
import { EventsManager } from "@/components/events-manager";
import { PubQRCode } from "@/components/pub-qr-code";
import { MenuPdfDownload } from "@/components/menu-pdf-download";
import { Cast, Share2, Link as LinkIcon, Tv, Info, QrCode } from "lucide-react";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { SiFacebook, SiInstagram, SiX, SiTiktok } from "react-icons/si";
import { RoleSwitcherBanner } from "@/components/role-switcher-banner";

function PubMenuInfoBox({ pubId, currentValue }: { pubId: number; currentValue: string }) {
  const [text, setText] = useState(currentValue);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  useEffect(() => { setText(currentValue); }, [currentValue]);

  const saveMutation = useMutation({
    mutationFn: async (value: string) => {
      return apiRequest(`/api/pubs/${pubId}`, { method: 'PATCH' }, { menuInfoBox: value || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-pubs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId] });
      setIsEditing(false);
      toast({ title: "Info box salvata" });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile salvare", variant: "destructive" });
    }
  });

  if (!isEditing && !currentValue) {
    return (
      <Button
        variant="outline"
        onClick={() => setIsEditing(true)}
        className="w-full border-dashed border-amber-300 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-900/30"
      >
        <Info className="h-4 w-4 mr-2" />
        Aggiungi Info Box generale (prima di tutto il menu)
      </Button>
    );
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Info Box Generale Menu</span>
        </div>
        <div className="flex gap-1">
          {isEditing ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => { setText(currentValue); setIsEditing(false); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate(text)}>
                <Save className="h-3.5 w-3.5 mr-1" />{saveMutation.isPending ? '...' : 'Salva'}
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700"
                onClick={() => { if (confirm('Rimuovere la info box generale?')) saveMutation.mutate(''); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
      {isEditing ? (
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nota informativa che apparirà prima di tutto il menu nel PDF..."
          rows={3}
          className="bg-white dark:bg-gray-800"
        />
      ) : (
        <p className="text-sm text-amber-900 dark:text-amber-100 italic">{currentValue}</p>
      )}
    </div>
  );
}

type DashboardSection = 'overview' | 'taplist' | 'bottles' | 'menu' | 'events' | 'analytics' | 'settings' | 'profile';

interface SmartPubDashboardProps {
  adminPubId?: number;
}

export default function SmartPubDashboard({ adminPubId }: SmartPubDashboardProps = {}) {
  const { user, isAuthenticated } = useAuth();
  const isAdminMode = !!adminPubId;
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
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('trial') === 'started') {
      setTimeout(() => {
        toast({ title: "Email verificata! Prova gratuita attivata 🎉", description: "Hai 15 giorni per esplorare tutte le funzionalità di Fermenta.to." });
      }, 800);
      window.history.replaceState({}, '', '/dashboard');
    } else if (params.get('pub-pending') === 'true') {
      setTimeout(() => {
        toast({
          title: "Email verificata!",
          description: "La tua richiesta di registrazione è in attesa di approvazione. Ti avviseremo entro breve.",
        });
      }, 800);
      window.history.replaceState({}, '', '/dashboard');
    }
  }, []);

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

  // Subscription cancel dialog
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const cancelSubMutation = useMutation({
    mutationFn: () => {
      const status = currentPub?.subscriptionStatus;
      const endpoint = status === 'trial'
        ? '/api/my-pub/cancel-trial'
        : '/api/my-pub/cancel-subscription';
      return apiRequest(endpoint, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-pubs'] });
      setShowCancelDialog(false);
      toast({ title: 'Abbonamento disdetto', description: 'Il pub è stato ibernato. Puoi riattivarlo in qualsiasi momento.' });
    },
    onError: (err: any) => {
      toast({ title: 'Errore', description: err?.message || 'Impossibile disdire', variant: 'destructive' });
    },
  });

  // Fetch pub data - either from admin mode or owner mode
  const { data: userPubs, isLoading: pubsLoading } = useQuery({
    queryKey: isAdminMode ? ["/api/pubs", adminPubId] : ["/api/my-pubs"],
    enabled: isAuthenticated && (isAdminMode || (user as any)?.userType === 'pub_owner' || (user as any)?.userType === 'admin'),
  });

  // In admin mode, userPubs is a single pub object; in owner mode it's an array
  const currentPub = isAdminMode ? userPubs : (Array.isArray(userPubs) ? userPubs[0] : null);

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
        tiktokUrl: currentPub.tiktokUrl || '',
        logoUrl: currentPub.logoUrl || '',
        coverImageUrl: currentPub.coverImageUrl || '',
        openingHours: currentPub.openingHours || null,
        isActive: currentPub.isActive ?? true,
        businessName: currentPub.businessName || '',
        vatNumber: currentPub.vatNumber || '',
      });
      setSettingsChanged(false);
    }
  }, [currentPub?.id]);

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
    queryKey: ["/api/pubs", currentPub?.id, "menu", "all-products", menuData?.map((c: any) => c.id).join(',')],
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

  // Merge products into categories
  const categoriesWithItems = useMemo(() => {
    if (!Array.isArray(menuData)) return [];
    return menuData.map(category => ({
      ...category,
      items: categoryProductsMap[category.id] || []
    }));
  }, [menuData, categoryProductsMap]);

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

  const { data: pubEventsData = [] } = useQuery({
    queryKey: ["/api/pubs", currentPub?.id, "events"],
    queryFn: () => apiRequest(`/api/pubs/${currentPub?.id}/events`),
    enabled: !!currentPub?.id,
  });

  // Type assertions for data
  const typedTapList = Array.isArray(tapList) ? tapList : [];
  const typedBottleList = Array.isArray(bottleList) ? bottleList : [];
  const typedMenuData = Array.isArray(menuData) ? menuData : [];
  const typedEvents = Array.isArray(pubEventsData) ? (pubEventsData as any[]).filter((e: any) => e.isPublished && new Date(e.eventDate) > new Date()) : [];

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
    { id: 'events', name: 'Eventi', icon: Calendar, gradient: 'from-pink-500 to-rose-600' },
    { id: 'analytics', name: 'Analytics', icon: BarChart3, gradient: 'from-indigo-500 to-blue-600' },
    { id: 'settings', name: 'Impostazioni', icon: Settings, gradient: 'from-gray-500 to-neutral-600' },
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
      className="glass-card rounded-xl p-4 group relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.03, y: -2 }}
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
        <div className="flex items-center justify-between mb-2">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient} bg-opacity-10`}>
            <Icon className={`h-5 w-5 bg-gradient-to-br ${gradient} bg-clip-text text-transparent`} />
          </div>
          {trend && trendValue && (
            <div className={`flex items-center text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              <span className="ml-1">{trendValue}</span>
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {value}
          </h3>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <AnimatePresence>
            {description && (
              <motion.p 
                className="text-xs text-gray-500 dark:text-gray-400"
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

  // ── Subscription banner (shown on every section) ──────────────────────────
  const renderSubscriptionBanner = () => {
    if (!currentPub || isAdminMode) return null;
    const status = currentPub.subscriptionStatus as string;
    const trialEndsAt = currentPub.trialEndsAt ? new Date(currentPub.trialEndsAt) : null;
    const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000)) : 0;
    const isTrialExpiringSoon = status === 'trial' && daysLeft <= 3;

    if (status === 'trial' && trialEndsAt) {
      return (
        <div className={`mb-6 flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${isTrialExpiringSoon ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700' : 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <Gift className={`w-5 h-5 flex-shrink-0 ${isTrialExpiringSoon ? 'text-orange-500' : 'text-green-500'}`} />
            <div className="min-w-0">
              <p className={`font-semibold text-sm ${isTrialExpiringSoon ? 'text-orange-800 dark:text-orange-200' : 'text-green-800 dark:text-green-200'}`}>
                {daysLeft > 0 ? `Prova gratuita · ${daysLeft} giorn${daysLeft === 1 ? 'o' : 'i'} rimanent${daysLeft === 1 ? 'e' : 'i'}` : 'Prova scaduta'}
              </p>
              <p className={`text-xs ${isTrialExpiringSoon ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                {daysLeft > 0 ? `Poi €65/anno IVA inclusa · ${trialEndsAt.toLocaleDateString('it-IT')}` : 'Il tuo abbonamento si rinnoverà automaticamente'}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowCancelDialog(true)}
            className="flex-shrink-0 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs">
            Disdici
          </Button>
        </div>
      );
    }

    if (status === 'gifted') return null;

    if (status === 'active') {
      return (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-blue-500" />
            <div className="min-w-0">
              <p className="font-semibold text-sm text-blue-800 dark:text-blue-200">Piano Pub Pro — Attivo</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">€65/anno IVA inclusa · rinnovo automatico</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowCancelDialog(true)}
            className="flex-shrink-0 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs">
            Disdici
          </Button>
        </div>
      );
    }

    // Hibernated / no subscription
    if (!currentPub.isActive || status === 'none' || status === 'cancelled' || status === 'expired') {
      return (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <ShieldOff className="w-5 h-5 flex-shrink-0 text-red-500" />
            <div className="min-w-0">
              <p className="font-semibold text-sm text-red-800 dark:text-red-200">Pub ibernato</p>
              <p className="text-xs text-red-600 dark:text-red-400">Il profilo non è visibile. Riattiva l'abbonamento per riprendere.</p>
            </div>
          </div>
          <Link href="/attiva-pub">
            <Button size="sm" className="flex-shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-xs">
              Riattiva
            </Button>
          </Link>
        </div>
      );
    }

    return null;
  };

  const renderOverview = () => (
    <motion.div 
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <RoleSwitcherBanner currentView="pub" />

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
            <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Attivo
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Festival Mode CTA */}
      <Link href="/festival">
        <div className="glass-card rounded-2xl border border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-5 mb-6 flex items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 min-w-0">
            <div className="p-3 bg-amber-500 rounded-xl shrink-0">
              <QrCode className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white">Festival Mode</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">Crea il taplist QR per il tuo prossimo festival birra</p>
            </div>
          </div>
          <LinkIcon className="h-5 w-5 text-amber-500 shrink-0" />
        </div>
      </Link>

      {/* Abbonamento */}
      {!isAdminMode && currentPub && (() => {
        const status = currentPub.subscriptionStatus as string;
        const trialEndsAt = currentPub.trialEndsAt ? new Date(currentPub.trialEndsAt) : null;
        const expiresAt = currentPub.subscriptionExpiresAt ? new Date(currentPub.subscriptionExpiresAt) : null;
        const now = new Date();
        const trialStartedAt = trialEndsAt ? new Date(trialEndsAt.getTime() - 15 * 86400000) : null;
        const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86400000)) : 0;
        const trialExpired = status === 'trial' && trialEndsAt && trialEndsAt < now;
        const fmt = (d: Date) => d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });

        let bgColor = 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
        let icon = <Gift className="w-5 h-5 text-amber-500" />;
        let badgeEl = <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">Prova gratuita</span>;

        if (status === 'gifted') {
          bgColor = 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800';
          icon = <Crown className="w-5 h-5 text-violet-500" />;
          badgeEl = <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200">Accesso fondatore ✦</span>;
        } else if (status === 'active') {
          bgColor = 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
          icon = <BadgeCheck className="w-5 h-5 text-green-500" />;
          badgeEl = <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">Abbonato ✓</span>;
        } else if (trialExpired) {
          bgColor = 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
          icon = <AlertTriangle className="w-5 h-5 text-red-500" />;
          badgeEl = <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">Prova scaduta</span>;
        } else if (status === 'canceled' || status === 'none') {
          bgColor = 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700';
          icon = <CreditCard className="w-5 h-5 text-gray-400" />;
          badgeEl = <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">Non attivo</span>;
        }

        return (
          <motion.div
            className={`rounded-2xl border p-5 ${bgColor}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0">{icon}</div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">Abbonamento</span>
                    {badgeEl}
                  </div>
                  <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    {status === 'gifted' && (
                      <>
                        <div className="flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                          <span className="text-violet-700 dark:text-violet-300 font-medium">Accesso completo senza scadenza</span>
                        </div>
                        {expiresAt && expiresAt.getFullYear() < 2099 && (
                          <div className="flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                            <span>Valido fino al <strong className="text-gray-800 dark:text-gray-200">{fmt(expiresAt)}</strong></span>
                          </div>
                        )}
                      </>
                    )}
                    {status === 'trial' && trialStartedAt && trialEndsAt && (
                      <>
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                          <span>Inizio prova: <strong className="text-gray-800 dark:text-gray-200">{fmt(trialStartedAt)}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {trialExpired
                              ? <>Prova scaduta il <strong className="text-red-600 dark:text-red-400">{fmt(trialEndsAt)}</strong></>
                              : <>Scade il <strong className="text-gray-800 dark:text-gray-200">{fmt(trialEndsAt)}</strong>
                                  {daysLeft > 0 && <span className="ml-1 font-semibold text-amber-600 dark:text-amber-400">({daysLeft} {daysLeft === 1 ? 'giorno' : 'giorni'} rimasti)</span>}
                                </>
                            }
                          </span>
                        </div>
                      </>
                    )}
                    {status === 'active' && expiresAt && (
                      <>
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 shrink-0" />
                          <span>€65/anno IVA inclusa</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                          <span>Prossimo rinnovo: <strong className="text-gray-800 dark:text-gray-200">{fmt(expiresAt)}</strong></span>
                        </div>
                      </>
                    )}
                    {(status === 'none' || status === 'canceled') && (
                      <span>Attiva l'abbonamento per rendere il pub visibile su Fermenta.to</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0">
                {(status === 'trial' && !trialExpired) && (
                  <>
                    <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white text-xs whitespace-nowrap" onClick={() => window.location.href = '/attiva-pub?checkout=1'}>
                      Abbonati €65/anno
                    </Button>
                    <button
                      className="text-xs text-red-500 hover:text-red-700 underline whitespace-nowrap"
                      onClick={() => setShowCancelDialog(true)}
                    >
                      Annulla prova
                    </button>
                  </>
                )}
                {(trialExpired || status === 'none' || status === 'canceled') && (
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white text-xs whitespace-nowrap" onClick={() => window.location.href = '/attiva-pub?checkout=1'}>
                    Abbonati €65/anno
                  </Button>
                )}
                {status === 'active' && (
                  <button
                    className="text-xs text-red-500 hover:text-red-700 underline whitespace-nowrap"
                    onClick={() => setShowCancelDialog(true)}
                  >
                    Disdici
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        );
      })()}

      {/* Sharing & Tools */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.45 }}
      >
        <PubQRCode pubId={currentPub?.id} pubName={currentPub?.name || ""} compact />
        <MenuPdfDownload
          pubName={currentPub?.name || ""}
          tapList={typedTapList}
          bottleList={typedBottleList}
          menuCategories={categoriesWithItems}
          menuInfoBox={currentPub?.menuInfoBox}
          compact
        />
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Cast className="h-4 w-4" />
              TV Mode
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Cast className="h-5 w-5" />
                Taplist su TV
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Apri questo indirizzo nel browser della tua Smart TV:
              </p>

              <div
                className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 flex items-center justify-between gap-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                onClick={() => {
                  navigator.clipboard?.writeText(`${window.location.origin}/tv/${currentPub?.id}`)
                    .catch(() => {});
                  toast({ title: "Link copiato!" });
                }}
              >
                <code className="text-sm font-mono font-bold text-amber-600 dark:text-amber-400 break-all">
                  {window.location.origin}/tv/{currentPub?.id}
                </code>
                <LinkIcon className="h-4 w-4 shrink-0 text-gray-400" />
              </div>

              <Button
                className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 py-5 text-base"
                onClick={async () => {
                  const w = window as any;
                  const castFramework = w.cast?.framework;

                  if (!castFramework) {
                    // Cast SDK non caricato — apri la pagina TV e suggerisci Cast nativo di Chrome
                    window.open(`/tv/${currentPub?.id}`, '_blank');
                    toast({ title: "Pagina TV aperta", description: "Usa il menu di Chrome per trasmettere" });
                    return;
                  }

                  try {
                    const ctx = castFramework.CastContext.getInstance();
                    ctx.setOptions({
                      receiverApplicationId: '6666EC62',
                      autoJoinPolicy: w.chrome?.cast?.AutoJoinPolicy?.ORIGIN_SCOPED ?? 'origin_scoped'
                    });
                    toast({ title: "Connessione alla TV...", description: "Seleziona il dispositivo" });
                    await ctx.requestSession();
                    const session = ctx.getCurrentSession();
                    if (!session) {
                      toast({ title: "Sessione non creata", description: "Riprova", variant: "destructive" });
                      return;
                    }
                    toast({ title: "Connesso!", description: "Invio taplist live..." });
                    const taplistUrl = `https://fermenta.to/tv/${currentPub?.id}`;
                    await session.sendMessage('urn:x-cast:fermenta.to', { url: taplistUrl });
                    toast({ title: "Taplist LIVE sulla TV!", description: "Si aggiorna in tempo reale" });
                  } catch (err: any) {
                    if (err?.code === 'cancel' || err?.message === 'cancel') return;
                    const errCode = err?.code || '';
                    const errDesc = err?.description || err?.message || '';
                    console.error('Cast error:', errCode, errDesc);
                    // Fallback: apri la pagina TV
                    window.open(`/tv/${currentPub?.id}`, '_blank');
                    toast({ title: "Pagina TV aperta", description: "Usa Cast di Chrome per trasmetterla" });
                  }
                }}
              >
                <Cast className="h-5 w-5" />
                Trasmetti Taplist su TV
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => window.open(`/tv/${currentPub?.id}`, '_blank')}
                >
                  <Eye className="h-4 w-4" />
                  Apri Taplist TV
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/tv/${currentPub?.id}`);
                    toast({ title: "Link copiato!" });
                  }}
                >
                  <LinkIcon className="h-4 w-4" />
                  Copia Link
                </Button>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Oppure digita nel browser della Smart TV:</p>
                <div
                  className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2 flex items-center justify-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/tv/${currentPub?.id}`);
                    toast({ title: "Link copiato!" });
                  }}
                >
                  <code className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                    {window.location.host}/tv/{currentPub?.id}
                  </code>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => window.open(`/pub/${currentPub?.id}`, '_blank')}
        >
          <Eye className="h-4 w-4" />
          Pagina Pub
        </Button>
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
          bottleList={typedBottleList}
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
                {categoriesWithItems.reduce((total: number, category: any) => total + (category.items || []).filter((i: any) => !i.isInfoBox).length, 0)}
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-xl">
              <Package className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </motion.div>
      </motion.div>
      
      {/* Pub-level Menu Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
      >
        <PubMenuInfoBox pubId={currentPub?.id || 0} currentValue={currentPub?.menuInfoBox || ''} />
      </motion.div>

      {/* MenuCategoryManager Component - No wrapper card needed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <MenuCategoryManager 
          pubId={currentPub?.id || 0}
          categories={categoriesWithItems}
        />
      </motion.div>
    </motion.div>
  );

  // Analytics Section
  const { data: favoritesCount = 0 } = useQuery({
    queryKey: ["/api/favorites/pub", currentPub?.id, "count"],
    queryFn: () => apiRequest(`/api/favorites/pub/${currentPub?.id}/count`),
    enabled: !!currentPub?.id,
    select: (data: any) => data?.count ?? data ?? 0,
  });

  const totalMenuItems = useMemo(() => {
    return Object.values(categoryProductsMap).reduce((sum: number, items: any) => sum + (Array.isArray(items) ? items.length : 0), 0);
  }, [categoryProductsMap]);

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h2>
        <p className="text-gray-600 dark:text-gray-400">Statistiche reali del tuo pub</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Birre alla Spina</p>
              <p className="text-2xl font-bold">{typedTapList.length}</p>
            </div>
            <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
              <Beer className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Bottiglie</p>
              <p className="text-2xl font-bold">{typedBottleList.length}</p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Package className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Prodotti Menu</p>
              <p className="text-2xl font-bold">{totalMenuItems}</p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Utensils className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Preferiti</p>
              <p className="text-2xl font-bold">{favoritesCount}</p>
            </div>
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <Star className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Beer className="mr-2 h-5 w-5 text-amber-600" />
            Birre alla Spina
          </h3>
          <div className="space-y-3">
            {typedTapList.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Nessuna birra alla spina</p>
            ) : (
              typedTapList.map((beer: any, index: number) => (
                <div key={beer.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {beer.tapNumber || index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{beer.beer?.name || 'N/D'}</p>
                      <p className="text-xs text-gray-500">{beer.beer?.brewery?.name || beer.beer?.breweryName || ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {beer.beer?.abv ? `${beer.beer.abv}%` : ''}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Package className="mr-2 h-5 w-5 text-green-600" />
            Bottiglie in Cantina
          </h3>
          <div className="space-y-3">
            {typedBottleList.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Nessuna bottiglia</p>
            ) : (
              typedBottleList.slice(0, 10).map((bottle: any, index: number) => (
                <div key={bottle.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{bottle.beer?.name || 'N/D'}</p>
                      <p className="text-xs text-gray-500">{bottle.beer?.brewery?.name || bottle.beer?.breweryName || ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {bottle.beer?.abv ? `${bottle.beer.abv}%` : ''}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {typedEvents.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-purple-600" />
            Prossimi Eventi ({typedEvents.length})
          </h3>
          <div className="space-y-3">
            {typedEvents.slice(0, 5).map((event: any) => (
              <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{event.title}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(event.eventDate).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                </div>
                {event.category && (
                  <Badge variant="secondary" className="text-xs">{event.category}</Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
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
              <div key={day.key} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between sm:justify-start sm:w-28 flex-shrink-0">
                  <Label className="font-semibold text-sm text-gray-900 dark:text-white w-24">{day.label}</Label>
                  <div className="flex items-center gap-2 sm:hidden">
                    <Switch
                      checked={isClosed || false}
                      onCheckedChange={(checked) => {
                        const newHours = {
                          ...settingsData.openingHours,
                          [day.key]: { ...dayHours, isClosed: checked },
                        };
                        updateSettingsField('openingHours', newHours);
                      }}
                      data-testid={`switch-${day.key}-closed`}
                    />
                    <Label className="text-xs text-gray-500">Chiuso</Label>
                  </div>
                </div>
                <div className={`flex items-center gap-2 flex-1 ${isClosed ? 'opacity-40 pointer-events-none' : ''}`}>
                  <Input
                    type="time"
                    value={dayHours?.open || "12:00"}
                    onChange={(e) => {
                      const newHours = {
                        ...settingsData.openingHours,
                        [day.key]: { ...dayHours, open: e.target.value, isClosed: false },
                      };
                      updateSettingsField('openingHours', newHours);
                    }}
                    disabled={isClosed}
                    className="flex-1 min-w-0 text-sm"
                    data-testid={`input-${day.key}-open`}
                  />
                  <span className="text-gray-400 text-sm font-medium flex-shrink-0">—</span>
                  <Input
                    type="time"
                    value={dayHours?.close || "23:00"}
                    onChange={(e) => {
                      const newHours = {
                        ...settingsData.openingHours,
                        [day.key]: { ...dayHours, close: e.target.value, isClosed: false },
                      };
                      updateSettingsField('openingHours', newHours);
                    }}
                    disabled={isClosed}
                    className="flex-1 min-w-0 text-sm"
                    data-testid={`input-${day.key}-close`}
                  />
                </div>
                <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                  <Switch
                    checked={isClosed || false}
                    onCheckedChange={(checked) => {
                      const newHours = {
                        ...settingsData.openingHours,
                        [day.key]: { ...dayHours, isClosed: checked },
                      };
                      updateSettingsField('openingHours', newHours);
                    }}
                    data-testid={`switch-${day.key}-closed`}
                  />
                  <Label className="text-xs text-gray-500 whitespace-nowrap">Chiuso</Label>
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
  const renderSettings = () => {
    return (
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

      <div className="grid grid-cols-1 gap-6">
        {/* Images */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Image className="h-5 w-5 text-blue-600" />
            Immagini
          </h3>
          <div className="space-y-3">
            <ImageUpload
              label="Immagine di Copertina"
              description="1200×630 px consigliato · visibile nella pagina pub e nei risultati di ricerca"
              currentImageUrl={settingsData.coverImageUrl}
              onImageChange={(url) => updateSettingsField('coverImageUrl', url)}
              folder="pub-covers"
              aspectRatio="landscape"
              maxSize={8}
              recommendedDimensions="1200×630 px"
              acceptedFormats={['JPG', 'PNG', 'WebP']}
            />
            <ImageUpload
              label="Logo / Immagine Profilo"
              description="400×400 px consigliato · appare come avatar in liste e mappe"
              currentImageUrl={settingsData.logoUrl}
              onImageChange={(url) => updateSettingsField('logoUrl', url)}
              folder="pub-logos"
              aspectRatio="square"
              maxSize={3}
              recommendedDimensions="400×400 px"
              acceptedFormats={['JPG', 'PNG', 'WebP']}
            />
          </div>
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
              <AddressAutocomplete
                value={settingsData.address || ''}
                placeholder="Cerca indirizzo nel mondo..."
                countryRestriction={null}
                onAddressSelect={(details) => {
                  const updates: any = { address: details.formattedAddress };
                  if (details.city) updates.city = details.city;
                  if (details.region) updates.region = details.region;
                  if (details.postalCode) updates.postalCode = details.postalCode;
                  if (details.lat !== undefined) updates.latitude = String(details.lat);
                  if (details.lng !== undefined) updates.longitude = String(details.lng);
                  setSettingsData((prev: any) => ({ ...prev, ...updates }));
                  setSettingsChanged(true);
                }}
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
                <div key={day.key} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center justify-between sm:justify-start sm:w-28 flex-shrink-0">
                    <Label className="font-semibold text-sm text-gray-900 dark:text-white w-24">{day.label}</Label>
                    <div className="flex items-center gap-2 sm:hidden">
                      <Switch
                        checked={isClosed || false}
                        onCheckedChange={(checked) => {
                          const newHours = {
                            ...settingsData.openingHours,
                            [day.key]: { ...dayHours, isClosed: checked },
                          };
                          updateSettingsField('openingHours', newHours);
                        }}
                        data-testid={`switch-${day.key}-closed`}
                      />
                      <Label className="text-xs text-gray-500">Chiuso</Label>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 flex-1 ${isClosed ? 'opacity-40 pointer-events-none' : ''}`}>
                    <Input
                      type="time"
                      value={dayHours?.open || "12:00"}
                      onChange={(e) => {
                        const newHours = {
                          ...settingsData.openingHours,
                          [day.key]: { ...dayHours, open: e.target.value, isClosed: false },
                        };
                        updateSettingsField('openingHours', newHours);
                      }}
                      disabled={isClosed}
                      className="flex-1 min-w-0 text-sm"
                      data-testid={`input-${day.key}-open`}
                    />
                    <span className="text-gray-400 text-sm font-medium flex-shrink-0">—</span>
                    <Input
                      type="time"
                      value={dayHours?.close || "23:00"}
                      onChange={(e) => {
                        const newHours = {
                          ...settingsData.openingHours,
                          [day.key]: { ...dayHours, close: e.target.value, isClosed: false },
                        };
                        updateSettingsField('openingHours', newHours);
                      }}
                      disabled={isClosed}
                      className="flex-1 min-w-0 text-sm"
                      data-testid={`input-${day.key}-close`}
                    />
                  </div>
                  <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                    <Switch
                      checked={isClosed || false}
                      onCheckedChange={(checked) => {
                        const newHours = {
                          ...settingsData.openingHours,
                          [day.key]: { ...dayHours, isClosed: checked },
                        };
                        updateSettingsField('openingHours', newHours);
                      }}
                      data-testid={`switch-${day.key}-closed`}
                    />
                    <Label className="text-xs text-gray-500 whitespace-nowrap">Chiuso</Label>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Social Media Links */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-1 flex items-center">
            <Globe className="h-5 w-5 mr-2 text-blue-600" />
            Social Media e Web
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Collega i profili social — il logo appare automaticamente in base all'URL inserito.
          </p>
          <div className="space-y-3">
            {[
              { field: 'websiteUrl', label: 'Sito Web', placeholder: 'https://www.ilmiopub.it', icon: null },
              { field: 'facebookUrl', label: 'Facebook', placeholder: 'https://facebook.com/ilmiopub', icon: 'facebook' },
              { field: 'instagramUrl', label: 'Instagram', placeholder: 'https://instagram.com/ilmiopub', icon: 'instagram' },
              { field: 'twitterUrl', label: 'Twitter / X', placeholder: 'https://x.com/ilmiopub', icon: 'twitter' },
              { field: 'tiktokUrl', label: 'TikTok', placeholder: 'https://tiktok.com/@ilmiopub', icon: 'tiktok' },
            ].map(({ field, label, placeholder, icon }) => {
              const val = settingsData[field] || '';
              const url = val.toLowerCase();
              let rowIcon: React.ReactNode = <Globe className="w-4 h-4" />;
              let iconColor = 'text-gray-400';
              if (icon === 'facebook' || url.includes('facebook.com')) { rowIcon = <SiFacebook size={15} />; iconColor = 'text-[#1877F2]'; }
              else if (icon === 'instagram' || url.includes('instagram.com')) { rowIcon = <SiInstagram size={15} />; iconColor = 'text-[#E1306C]'; }
              else if (icon === 'twitter' || url.includes('x.com') || url.includes('twitter.com')) { rowIcon = <SiX size={15} />; iconColor = 'text-gray-800 dark:text-white'; }
              else if (icon === 'tiktok' || url.includes('tiktok.com')) { rowIcon = <SiTiktok size={15} />; iconColor = 'text-gray-900 dark:text-white'; }
              else if (val) { iconColor = 'text-blue-500'; }
              return (
                <div key={field} className="relative">
                  <div className={`absolute left-3 top-1/2 -tranneutral-y-1/2 pointer-events-none z-10 ${iconColor}`}>
                    {rowIcon}
                  </div>
                  <Input
                    value={val}
                    onChange={(e) => updateSettingsField(field, e.target.value)}
                    placeholder={`${label} — ${placeholder}`}
                    className="h-10 pl-9 text-sm"
                    data-testid={`input-${field}`}
                  />
                </div>
              );
            })}
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
  };

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
          tapList={typedTapList}
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
        
        <div className="grid grid-cols-1 gap-4">
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
          <Link href="/registra-pub">
            <Button className="mt-4">
              Registra un Pub
            </Button>
          </Link>
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

            {/* Subscription banner — always visible */}
            {renderSubscriptionBanner()}

            {/* Hibernation overlay — blocks all sections when pub is inactive */}
            {!isAdminMode && currentPub && !currentPub.isActive && currentSection !== 'overview' && (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                <ShieldOff className="w-16 h-16 text-red-400 mx-auto" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Pub ibernato</h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                  Questa sezione non è disponibile mentre l'abbonamento è sospeso. Riattiva il pub per continuare.
                </p>
                <Link href="/attiva-pub">
                  <Button className="bg-amber-500 hover:bg-amber-600 text-white">
                    <RefreshCw className="w-4 h-4 mr-2" /> Riattiva abbonamento
                  </Button>
                </Link>
              </div>
            )}

            {/* Section content — hidden when hibernated (except overview) */}
            {(isAdminMode || currentPub?.isActive || currentSection === 'overview') && (
              <>
                {currentSection === 'overview' && renderOverview()}
                {currentSection === 'taplist' && renderTaplist()}
                {currentSection === 'bottles' && renderBottles()}
                {currentSection === 'menu' && renderMenu()}
                {currentSection === 'events' && (
                  <EventsManager pubId={currentPub?.id || 0} pubName={currentPub?.name} />
                )}
                {currentSection === 'analytics' && renderAnalytics()}
                {currentSection === 'settings' && renderSettings()}
                {currentSection === 'profile' && renderProfile()}
                {!['overview', 'taplist', 'bottles', 'menu', 'events', 'hours', 'analytics', 'settings', 'profile'].includes(currentSection) && (
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
                      <p className="text-gray-600 dark:text-gray-400">Sezione in fase di sviluppo.</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cancel subscription confirmation dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              {currentPub?.subscriptionStatus === 'trial' ? 'Disdici la prova gratuita?' : 'Disdici l\'abbonamento?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                {currentPub?.subscriptionStatus === 'trial'
                  ? 'Annullando la prova, il tuo pub verrà immediatamente ibernato e non sarà più visibile agli utenti. Nessun addebito verrà effettuato.'
                  : 'Disdire l\'abbonamento iberna immediatamente il pub. Il profilo non sarà più visibile. Puoi riattivarlo in qualsiasi momento.'}
              </span>
              <span className="block font-medium text-gray-900 dark:text-white">
                Sei sicuro di voler continuare?
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelSubMutation.mutate()}
              disabled={cancelSubMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {cancelSubMutation.isPending ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Elaborazione…</>
              ) : (
                currentPub?.subscriptionStatus === 'trial' ? 'Sì, disdici la prova' : 'Sì, disdici abbonamento'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}