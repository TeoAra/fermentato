import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
import { useChromecast } from "@/hooks/useChromecast";
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
import { QRCodeSVG } from "qrcode.react";
import { Cast, Share2, Link as LinkIcon, Tv, Info, QrCode, Bot } from "lucide-react";
import BotConnectCard from "@/components/BotConnectCard";

import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { SiFacebook, SiInstagram, SiX, SiTiktok } from "react-icons/si";
import { RoleSwitcherBanner } from "@/components/role-switcher-banner";
import { StatsGrid } from "@/components/dashboard-primitives";
import { PageContainer } from "@/components/layout/page-container";

const MenuPdfDownload = lazy(() =>
  import("@/components/menu-pdf-download").then(m => ({ default: m.MenuPdfDownload }))
);

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
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId)] });
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
        className="w-full border-dashed border-stone-200 dark:border-border text-primary hover:bg-stone-50 dark:text-orange-400 dark:hover:bg-stone-900/30 rounded-xl"
      >
        <Info className="h-4 w-4 mr-2" />
        Aggiungi Info Box generale (prima di tutto il menu)
      </Button>
    );
  }

  return (
    <div className="bg-stone-50 dark:bg-[#15202B]/20 border border-stone-200 dark:border-[#2F3D4D]/50 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-orange-800 dark:text-orange-200">Info Box Generale Menu</span>
        </div>
        <div className="flex gap-1">
          {isEditing ? (
            <>
              <Button size="sm" variant="ghost" className="hover:text-primary rounded-xl" onClick={() => { setText(currentValue); setIsEditing(false); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-white" disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate(text)}>
                <Save className="h-3.5 w-3.5 mr-1" />{saveMutation.isPending ? '...' : 'Salva'}
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" className="hover:text-primary rounded-xl" onClick={() => setIsEditing(true)}>
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 rounded-xl"
                onClick={() => { if (confirm('Rimuovere la info box generale?')) saveMutation.mutate(''); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
      {isEditing ? (
        <Textarea
          className="bg-white dark:bg-card border-stone-200 dark:border-border rounded-xl focus-visible:ring-primary/20"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nota informativa che apparirà prima di tutto il menu nel PDF..."
          rows={3}
        />
      ) : (
        <p className="text-sm text-orange-900 dark:text-orange-100 italic">{currentValue}</p>
      )}
    </div>
  );
}

// ─── Special Days Editor ─────────────────────────────────────────────────────
function SpecialDaysEditor({ specialDays, onChange }: { specialDays: any[]; onChange: (days: any[]) => void }) {
  const emptyForm = { date: "", label: "", isClosed: true, open: "18:00", close: "23:00" };
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  const upcoming = [...(specialDays ?? [])]
    .filter(d => d.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  const addDay = () => {
    if (!form.date) return;
    const existing = (specialDays ?? []).filter(d => d.date !== form.date);
    const newDay = form.isClosed
      ? { date: form.date, label: form.label, isClosed: true }
      : { date: form.date, label: form.label, isClosed: false, open: form.open, close: form.close };
    onChange([...existing, newDay]);
    setForm(emptyForm);
    setShowForm(false);
  };

  const removeDay = (date: string) => onChange((specialDays ?? []).filter(d => d.date !== date));

  const formatDate = (dateStr: string) => {
    try { return new Date(dateStr + "T12:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "long", year: "numeric" }); }
    catch { return dateStr; }
  };

  return (
    <Card className="p-6 mt-4">
      <h3 className="text-lg font-semibold mb-1 flex items-center">
        <CalendarDays className="h-5 w-5 mr-2 text-primary" />
        Giorni Speciali e Chiusure Straordinarie
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Aggiungi chiusure straordinarie o orari diversi per festività, eventi speciali o ferie. Hanno priorità sugli orari settimanali.
      </p>

      {upcoming.length > 0 && (
        <div className="space-y-2 mb-4">
          {upcoming.map(day => (
            <div key={day.date} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">{day.label || "Giorno speciale"}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">{formatDate(day.date)}</p>
                <p className="text-xs font-medium mt-0.5">
                  {day.isClosed
                    ? <span className="text-red-600 dark:text-red-400">Chiuso</span>
                    : <span className="text-green-600 dark:text-green-400">Orario speciale: {day.open} – {day.close}</span>}
                </p>
              </div>
              <button onClick={() => removeDay(day.date)} className="ml-3 p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="p-4 border border-stone-200 dark:border-border rounded-xl space-y-3 bg-stone-50 dark:bg-[#15202B]/30">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Data</Label>
              <Input type="date" value={form.date} min={todayStr} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="rounded-xl text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Etichetta</Label>
              <Input placeholder="es. Natale, Chiusura estiva…" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} className="rounded-xl text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.isClosed} onCheckedChange={v => setForm(f => ({ ...f, isClosed: v }))} />
            <Label className="text-sm">{form.isClosed ? "Chiuso tutto il giorno" : "Orario personalizzato"}</Label>
          </div>
          {!form.isClosed && (
            <div className="flex items-center gap-2">
              <Input type="time" value={form.open} onChange={e => setForm(f => ({ ...f, open: e.target.value }))} className="flex-1 rounded-xl text-sm" />
              <span className="text-muted-foreground text-sm">—</span>
              <Input type="time" value={form.close} onChange={e => setForm(f => ({ ...f, close: e.target.value }))} className="flex-1 rounded-xl text-sm" />
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={addDay} disabled={!form.date} className="flex-1 rounded-xl bg-primary text-white">Salva giorno speciale</Button>
            <Button size="sm" variant="outline" onClick={() => { setForm(emptyForm); setShowForm(false); }} className="rounded-xl"><X className="h-4 w-4" /></Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)} className="w-full border-dashed rounded-xl text-sm text-primary dark:text-orange-400">
          <Plus className="h-4 w-4 mr-2" /> Aggiungi giorno speciale
        </Button>
      )}
    </Card>
  );
}

type DashboardSection = 'overview' | 'taplist' | 'bottles' | 'menu' | 'events' | 'analytics' | 'settings' | 'profile' | 'bot';

interface SmartPubDashboardProps {
  adminPubId?: number;
}

const isIosDevice = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
const isNativeAndroid = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.() && !isIosDevice;
const isNativeIos     = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.() && isIosDevice;

export default function SmartPubDashboard({ adminPubId }: SmartPubDashboardProps = {}) {
  const { user, isAuthenticated } = useAuth();
  const isAdminMode = !!adminPubId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Logout handler
  const handleLogout = async () => {
    try {
      // Call logout endpoint
      await apiRequest('/api/auth/logout', { method: 'POST' });
      
      // Clear query cache
      queryClient.clear();
      
      // Redirect to home page
      setLocation('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, redirect to home
      setLocation('/');
    }
  };
  // ── Chromecast ───────────────────────────────────────────────────────────
  const { castState, deviceName, castToTV, stopCasting, isAvailable, isConnected } = useChromecast();

  // ── AirPlay: video element persistente per webkitShowPlaybackTargetPicker ──
  // Deve essere già nel DOM quando l'utente preme il pulsante, altrimenti
  // iOS non permette di aprire il picker (fuori dal contesto del gesto utente).
  const airplayVideoRef = useRef<HTMLVideoElement | null>(null);
  const [airplayAvailable, setAirplayAvailable] = useState<boolean>(false);

  useEffect(() => {
    if (!isIosDevice) return;
    const video = document.createElement('video');
    video.setAttribute('x-webkit-airplay', 'allow');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.muted = true;
    video.loop = true;
    // Sorgente audio necessaria: senza src WKWebView (Capacitor) non rileva
    // i dispositivi AirPlay 2 (LG TV, Apple TV) nel picker
    video.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    video.style.cssText = 'position:fixed;width:1px;height:1px;top:-9999px;left:-9999px;opacity:0;pointer-events:none;';
    document.body.appendChild(video);
    airplayVideoRef.current = video;

    const onAvailability = (e: Event) => {
      setAirplayAvailable((e as any).availability === 'available');
    };
    video.addEventListener('webkitplaybacktargetavailabilitychanged', onAvailability);

    return () => {
      video.removeEventListener('webkitplaybacktargetavailabilitychanged', onAvailability);
      if (document.body.contains(video)) document.body.removeChild(video);
      airplayVideoRef.current = null;
    };
  }, []);

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
  // Check both userType and activeRole so newly-approved publican sessions work
  const isPubOwnerContext = (user as any)?.userType === 'pub_owner' || (user as any)?.activeRole === 'pub_owner' || (user as any)?.userType === 'admin';
  const { data: userPubs, isLoading: pubsLoading } = useQuery({
    queryKey: isAdminMode ? ["/api/pubs", String(adminPubId)] : ["/api/my-pubs"],
    enabled: isAuthenticated && (isAdminMode || isPubOwnerContext),
  });

  // If no pub found, check if there's a pending request so we can show the right state
  const { data: pendingRequest } = useQuery<{ status: string; pubName: string } | null>({
    queryKey: ["/api/my-pub/pending-request"],
    enabled: isAuthenticated && !isAdminMode && isPubOwnerContext,
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
        slug: (currentPub as any).slug || '',
      });
      setSettingsChanged(false);
    }
  }, [currentPub?.id]);

  // Fetch tap list
  const { data: tapList = [] } = useQuery({
    queryKey: ["/api/pubs", String(currentPub?.id ?? ""), "taplist"],
    enabled: !!currentPub?.id,
  });

  // Fetch bottle list
  const { data: bottleList = [] } = useQuery({
    queryKey: ["/api/pubs", String(currentPub?.id ?? ""), "bottles"],
    enabled: !!currentPub?.id,
  });

  // Fetch menu data
  const { data: menuData = [] } = useQuery<any[]>({
    queryKey: ["/api/pubs", String(currentPub?.id ?? ""), "menu"],
    enabled: !!currentPub?.id,
  });

  // Fetch all products for all categories in a single query
  const { data: allCategoryProducts, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/pubs", String(currentPub?.id ?? ""), "menu", "all-products", Array.isArray(menuData) ? menuData.map((c: any) => c.id).join(',') : ''],
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
    queryKey: ["/api/pubs", String(currentPub?.id ?? ""), "events"],
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
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(currentPub?.id ?? ""), "taplist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(currentPub?.id ?? "")] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(currentPub?.id ?? ""), "taplist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(currentPub?.id ?? "")] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(currentPub?.id ?? ""), "taplist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(currentPub?.id ?? "")] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(currentPub?.id ?? "")] });
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

  // Smart dashboard sections configuration — 5 primary tabs only
  // Settings and Profile remain accessible via the dropdown menus
  const sections = [
    { id: 'overview', name: 'Dashboard', icon: Home, gradient: 'from-primary to-orange-600' },
    { id: 'taplist', name: 'Taplist', icon: Beer, gradient: 'from-primary to-orange-600' },
    { id: 'bottles', name: 'Cantina', icon: Wine, gradient: 'from-purple-500 to-violet-600' },
    { id: 'menu', name: 'Menu', icon: Utensils, gradient: 'from-emerald-500 to-teal-600' },
    { id: 'events', name: 'Eventi', icon: Calendar, gradient: 'from-pink-500 to-rose-600' },
  ];

  // ── Subscription banner (shown on every section) ──────────────────────────
  const renderSubscriptionBanner = () => {
    if (!currentPub || isAdminMode) return null;
    const status = currentPub.subscriptionStatus as string;
    const trialEndsAt = currentPub.trialEndsAt ? new Date(currentPub.trialEndsAt) : null;
    const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000)) : 0;
    const isTrialExpiringSoon = status === 'trial' && daysLeft <= 3;

    if (status === 'trial' && trialEndsAt) {
      return (
        <div className={`mb-6 flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 ${isTrialExpiringSoon ? 'bg-stone-50 dark:bg-[#15202B]/20 border-primary/30' : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <Gift className={`w-5 h-5 flex-shrink-0 ${isTrialExpiringSoon ? 'text-primary' : 'text-emerald-600'}`} />
            <div className="min-w-0">
              <p className={`font-semibold text-sm ${isTrialExpiringSoon ? 'text-orange-900 dark:text-orange-100' : 'text-emerald-900 dark:text-emerald-100'}`}>
                {daysLeft > 0 ? `Prova gratuita · ${daysLeft} giorn${daysLeft === 1 ? 'o' : 'i'} rimanent${daysLeft === 1 ? 'e' : 'i'}` : 'Prova scaduta'}
              </p>
              <p className={`text-xs ${isTrialExpiringSoon ? 'text-orange-700 dark:text-orange-300' : 'text-emerald-700 dark:text-emerald-400'}`}>
                {daysLeft > 0 ? `Poi €65/anno IVA inclusa · ${trialEndsAt.toLocaleDateString('it-IT')}` : 'Il tuo abbonamento si rinnoverà automaticamente'}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="flex-shrink-0 text-red-700 border-red-100 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs rounded-xl" onClick={() => setShowCancelDialog(true)}>
            Disdici
          </Button>
        </div>
      );
    }

    if (status === 'gifted') return null;

    if (status === 'active') {
      return (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <div className="min-w-0">
              <p className="font-semibold text-sm text-emerald-900 dark:text-emerald-100">Piano Pub Pro — Attivo</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">€65/anno IVA inclusa · rinnovo automatico</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="flex-shrink-0 text-red-700 border-red-100 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs rounded-xl" onClick={() => setShowCancelDialog(true)}>
            Disdici
          </Button>
        </div>
      );
    }

    // Hibernated / no subscription
    if (!currentPub.isActive || status === 'none' || status === 'cancelled' || status === 'expired') {
      return (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-stone-200 dark:border-[#2F3D4D]/30 bg-stone-50 dark:bg-[#15202B]/20 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <ShieldOff className="w-5 h-5 flex-shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="font-semibold text-sm text-orange-900 dark:text-orange-100">Pub ibernato</p>
              <p className="text-xs text-orange-700 dark:text-orange-300">Il profilo non è visibile. Riattiva l'abbonamento per riprendere.</p>
            </div>
          </div>
          <Link href="/attiva-pub">
            <Button size="sm" className="flex-shrink-0 bg-primary hover:bg-primary/90 text-white text-xs rounded-2xl font-bold">
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
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <RoleSwitcherBanner currentView="pub" />

      {/* Header — nome pub + indirizzo + badge stato */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{currentPub?.name}</h1>
          <div className="flex items-center text-muted-foreground text-sm mt-1">
            <MapPin className="h-3.5 w-3.5 mr-1.5 text-primary shrink-0" />
            {currentPub?.address}
          </div>
        </div>
        <Badge
          variant="secondary"
          className={`shrink-0 px-3 py-1 ${currentPub?.isActive
            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100'
            : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-100'}`}
        >
          <div className={`w-2 h-2 rounded-full mr-2 ${currentPub?.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
          {currentPub?.isActive ? 'Attivo' : 'Ibernato'}
        </Badge>
      </div>

      {/* KPI — uniformata su tutte le dashboard */}
      <StatsGrid
        cols={4}
        items={[
          { icon: Beer,     label: "Alla spina",    value: typedTapList.length,    accent: "primary" },
          { icon: Wine,     label: "Bottiglie",     value: typedBottleList.length, accent: "purple" },
          { icon: Utensils, label: "Prodotti menu", value: totalMenuItems,         accent: "stone" },
          { icon: Star,     label: "Preferiti",     value: favoritesCount,         accent: "red" },
        ]}
      />

      {/* Strumenti — azioni rapide */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Strumenti</p>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">

          {/* QR Code */}
          <PubQRCode pubId={currentPub?.id} pubName={currentPub?.name || ""} pubSlug={(currentPub as any)?.slug} compact />

          {/* PDF Menu */}
          <Suspense fallback={<div className="h-20 bg-stone-100 dark:bg-[#1B2735] animate-pulse rounded-2xl" />}>
            <MenuPdfDownload
              pubName={currentPub?.name || ""}
              tapList={typedTapList}
              bottleList={typedBottleList}
              menuCategories={categoriesWithItems}
              menuInfoBox={currentPub?.menuInfoBox}
              compact
            />
          </Suspense>

          {/* Festival Mode */}
          <Link href="/festival">
            <div className="bg-white dark:bg-card border border-stone-100 dark:border-border rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all h-full">
              <div className="p-2.5 bg-orange-50 dark:bg-orange-950/20 rounded-xl shrink-0">
                <QrCode className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-foreground leading-tight">Festival Mode</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">Taplist per eventi</p>
              </div>
            </div>
          </Link>

          {/* TV Mode */}
          <Sheet>
            <SheetTrigger asChild>
              <div className="bg-white dark:bg-card border border-stone-100 dark:border-border rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all">
                <div className="p-2.5 bg-stone-100 dark:bg-[#1B2735]/60 rounded-xl shrink-0">
                  <Cast className="h-5 w-5 text-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground leading-tight">TV Mode</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-tight">Taplist su Smart TV</p>
                </div>
              </div>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl safe-area-pb">
              <SheetHeader className="text-left">
                <SheetTitle className="flex items-center gap-2">
                  <Cast className="h-5 w-5" />
                  Taplist su TV
                </SheetTitle>
              </SheetHeader>
              {(() => {
                  const tvUrl = `${window.location.origin}/tv/${currentPub?.id}`;

                  // Su Android nativo mostriamo sempre il pulsante Cast (il plugin può
                  // impiegare qualche istante ad inizializzarsi dopo il montaggio del componente).
                  // Su browser/PWA lo nascondiamo se il Cast SDK non è stato caricato.
                  // iOS nativo: Cast via google-cast-sdk + bridging header (+ AirPlay sempre presente).
                  const castSdkLoaded = castState !== "unavailable" || isNativeAndroid || isNativeIos;

                  return (
                    <div className="space-y-3">

                      {/* ── Cast SDK caricato: pulsante Chromecast diretto ── */}
                      {castSdkLoaded && (
                        <div className="space-y-2">
                          {isConnected && (
                            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-3 py-2.5">
                              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                              <span className="text-sm font-medium text-green-700 dark:text-green-300 flex-1">
                                Streaming su <strong>{deviceName}</strong>
                              </span>
                              <button
                                onClick={stopCasting}
                                className="text-xs text-red-500 hover:text-red-700 font-medium underline"
                              >
                                Interrompi
                              </button>
                            </div>
                          )}
                          {castState === "no_devices" && (
                            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
                              <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
                                Nessun Chromecast trovato — verifica che sia sulla stessa rete WiFi
                              </p>
                            </div>
                          )}
                          <Button
                            className="w-full gap-2 bg-primary hover:bg-primary/90 py-5 text-base disabled:opacity-60"
                            disabled={castState === "connecting"}
                            onClick={async () => {
                              const ok = await castToTV(tvUrl, `Fermenta.to — ${currentPub?.name || "Taplist"}`);
                              if (ok) {
                                toast({ title: `Taplist LIVE su ${deviceName || "TV"}!`, description: "Si aggiorna in tempo reale" });
                              } else if (isNativeAndroid) {
                                // Su APK il fallback non deve aprire l'URL TV nel WebView:
                                // mostra solo un suggerimento operativo
                                toast({
                                  title: "Nessun Chromecast trovato",
                                  description: "Assicurati che il Chromecast sia acceso e sulla stessa rete WiFi, poi riprova.",
                                  variant: "destructive",
                                });
                              } else {
                                window.open(tvUrl, "_blank");
                                toast({ title: "Pagina TV aperta", description: "Seleziona dal menu Cast di Chrome (⋮ → Trasmetti)" });
                              }
                            }}
                          >
                            <Cast className="h-5 w-5" />
                            {castState === "connecting"
                              ? "Connessione in corso…"
                              : isConnected
                              ? `Aggiorna su ${deviceName}`
                              : isAvailable
                              ? "Trasmetti su Chromecast"
                              : "Trasmetti su TV"}
                          </Button>
                        </div>
                      )}

                      {/* ── AirPlay: sempre visibile su iOS native ── */}
                      {isIosDevice && (
                        <Button
                          variant="outline"
                          className="w-full gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400"
                          onClick={() => {
                            const video = airplayVideoRef.current;
                            if (video && (video as any).webkitShowPlaybackTargetPicker) {
                              (video as any).webkitShowPlaybackTargetPicker();
                            } else {
                              // Fallback: istruzioni Control Center
                              window.open(tvUrl, "_blank");
                            }
                          }}
                        >
                          <Tv className="h-4 w-4" />
                          {airplayAvailable ? "AirPlay su Apple TV" : "Apri taplist su TV"}
                        </Button>
                      )}

                      {/* ── URL — copia + apri ── */}
                      <div className="flex gap-2">
                        <div
                          className="flex-1 bg-stone-100 dark:bg-card border border-stone-200 dark:border-border rounded-xl px-3 py-2.5 flex items-center gap-2 cursor-pointer hover:bg-stone-200 dark:hover:bg-[#1B2735] transition-colors min-w-0"
                          onClick={() => { navigator.clipboard?.writeText(tvUrl).catch(() => {}); toast({ title: "Link copiato!" }); }}
                        >
                          <code className="text-xs font-mono font-bold text-primary dark:text-orange-400 truncate">
                            {tvUrl}
                          </code>
                          <LinkIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 rounded-xl"
                          onClick={() => window.open(tvUrl, "_blank")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* ── Condividi — share nativo (Android/iOS) ── */}
                      <div className="flex gap-2">
                        {typeof navigator !== 'undefined' && 'share' in navigator && (
                          <Button
                            variant="outline"
                            className="flex-1 gap-2 rounded-xl"
                            onClick={() => {
                              navigator.share({
                                title: `Taplist ${currentPub?.name || ''} — Fermenta.to`,
                                text: 'Guarda la taplist live su TV',
                                url: tvUrl,
                              }).catch(() => {});
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                            </svg>
                            Condividi link
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          className="flex-1 gap-2 rounded-xl"
                          onClick={() => { navigator.clipboard?.writeText(tvUrl).catch(() => {}); toast({ title: "Link copiato negli appunti!" }); }}
                        >
                          <LinkIcon className="h-4 w-4" />
                          Copia link
                        </Button>
                      </div>

                      {/* ── QR Code — punta direttamente alla pagina TV ── */}
                      <div className="border border-border rounded-xl p-4 flex flex-col items-center gap-3 bg-white dark:bg-card">
                        <p className="text-xs text-muted-foreground font-medium text-center">
                          Scansiona per aprire la taplist su un altro schermo
                        </p>
                        <div className="bg-white rounded-xl p-3 shadow-sm">
                          <QRCodeSVG
                            value={tvUrl}
                            size={160}
                            level="M"
                            includeMargin={false}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono text-center opacity-60 truncate max-w-full px-2">
                          {tvUrl}
                        </p>
                      </div>

                    </div>
                  );
                })()}
            </SheetContent>
          </Sheet>

          {/* Pagina Pub */}
          <div
            className="bg-white dark:bg-card border border-stone-100 dark:border-border rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
            onClick={() => window.open(`/pub/${(currentPub as any)?.slug || currentPub?.id}`, '_blank')}
          >
            <div className="p-2.5 bg-stone-100 dark:bg-[#1B2735]/60 rounded-xl shrink-0">
              <Eye className="h-5 w-5 text-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground leading-tight">Pagina Pub</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">Anteprima pubblica</p>
            </div>
          </div>

          {/* Bot Manager */}
          <div
            className="bg-white dark:bg-card border border-stone-100 dark:border-border rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
            onClick={() => setCurrentSection('bot')}
          >
            <div className="p-2.5 bg-violet-50 dark:bg-violet-950/20 rounded-xl shrink-0">
              <Bot className="h-5 w-5 text-violet-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground leading-tight">Bot Manager</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">Telegram & WhatsApp</p>
            </div>
          </div>

        </div>
      </div>

    </motion.div>
  );

  // Taplist Section
  const renderTaplist = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground dark:text-white">Taplist Management</h2>
          <p className="text-muted-foreground dark:text-muted-foreground">Gestisci le birre alla spina del tuo pub</p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-card rounded-2xl shadow-sm border border-stone-100 dark:border-border">
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
            className="p-3 bg-primary rounded-2xl shadow-lg mr-4"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ duration: 0.3 }}
          >
            <Utensils className="h-8 w-8 text-white" />
          </motion.div>
          <div>
            <h1 className="text-3xl font-bold text-foreground dark:text-white mb-2">
              Gestione Menu
            </h1>
            <p className="text-lg text-muted-foreground dark:text-muted-foreground">
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
          className="bg-card border border-border rounded-2xl p-6"
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Categorie Totali</p>
              <p className="text-2xl font-bold text-foreground">{typedMenuData.length}</p>
            </div>
            <div className="p-3 bg-muted rounded-2xl">
              <Utensils className="h-6 w-6 text-foreground/60" />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-card border border-border rounded-2xl p-6"
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Categorie Visibili</p>
              <p className="text-2xl font-bold text-foreground">{typedMenuData.filter(cat => cat.isVisible).length}</p>
            </div>
            <div className="p-3 bg-muted rounded-2xl">
              <Eye className="h-6 w-6 text-foreground/60" />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-card border border-border rounded-2xl p-6"
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Prodotti Totali</p>
              <p className="text-2xl font-bold text-foreground">
                {categoriesWithItems.reduce((total: number, category: any) => total + (category.items || []).filter((i: any) => !i.isInfoBox).length, 0)}
              </p>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-2xl">
              <Package className="h-6 w-6 text-primary" />
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
        <h2 className="text-2xl font-bold text-foreground dark:text-white">Analytics</h2>
        <p className="text-muted-foreground dark:text-muted-foreground">Statistiche reali del tuo pub</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">Birre alla Spina</p>
              <p className="text-2xl font-bold">{typedTapList.length}</p>
            </div>
            <div className="p-2 bg-stone-100 dark:bg-[#15202B]/20 rounded-xl">
              <Beer className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">Bottiglie</p>
              <p className="text-2xl font-bold">{typedBottleList.length}</p>
            </div>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/20 rounded-xl">
              <Package className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">Prodotti Menu</p>
              <p className="text-2xl font-bold">{totalMenuItems}</p>
            </div>
            <div className="p-2 bg-muted rounded-xl">
              <Utensils className="h-6 w-6 text-blue-700" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">Preferiti</p>
              <p className="text-2xl font-bold">{favoritesCount}</p>
            </div>
            <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded-xl">
              <Star className="h-6 w-6 text-red-700" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Beer className="mr-2 h-5 w-5 text-primary" />
            Birre alla Spina
          </h3>
          <div className="space-y-3">
            {typedTapList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nessuna birra alla spina</p>
            ) : (
              typedTapList.map((beer: any, index: number) => (
                <div key={beer.id} className="flex items-center justify-between p-3 bg-white dark:bg-card rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {beer.tapNumber || index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{beer.beer?.name || 'N/D'}</p>
                      <p className="text-xs text-muted-foreground">{beer.beer?.brewery?.name || beer.beer?.breweryName || ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
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
            <Package className="mr-2 h-5 w-5 text-emerald-600" />
            Bottiglie in Cantina
          </h3>
          <div className="space-y-3">
            {typedBottleList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nessuna bottiglia</p>
            ) : (
              typedBottleList.slice(0, 10).map((bottle: any, index: number) => (
                <div key={bottle.id} className="flex items-center justify-between p-3 bg-white dark:bg-card rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{bottle.beer?.name || 'N/D'}</p>
                      <p className="text-xs text-muted-foreground">{bottle.beer?.brewery?.name || bottle.beer?.breweryName || ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
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
              <div key={event.id} className="flex items-center justify-between p-3 bg-white dark:bg-card rounded-xl">
                <div>
                  <p className="font-medium text-sm">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
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
          <h2 className="text-2xl font-bold text-foreground dark:text-white">Gestione Orari</h2>
          <p className="text-muted-foreground dark:text-muted-foreground">Configura gli orari di apertura del tuo pub</p>
        </div>
        {settingsChanged && (
          <Button 
            onClick={handleSaveSettings}
            disabled={updatePubMutation.isPending}
            className=""
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
        <p className="text-sm text-muted-foreground dark:text-muted-foreground mb-6">
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
              <div key={day.key} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border border-stone-100 dark:border-border rounded-xl bg-white dark:bg-card">
                <div className="flex items-center justify-between sm:justify-start sm:w-28 flex-shrink-0">
                  <Label className="font-semibold text-sm text-foreground dark:text-white w-24">{day.label}</Label>
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
                    <Label className="text-xs text-muted-foreground">Chiuso</Label>
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
                    className="flex-1 min-w-0 text-sm border-stone-200 dark:border-border rounded-xl focus-visible:ring-primary/20"
                    data-testid={`input-${day.key}-open`}
                  />
                  <span className="text-muted-foreground text-sm font-medium flex-shrink-0">—</span>
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
                    className="flex-1 min-w-0 text-sm border-stone-200 dark:border-border rounded-xl focus-visible:ring-primary/20"
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
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Chiuso</Label>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 p-4 bg-muted rounded-xl border border-border">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-primary" />
            <span><strong className="text-foreground">Nota:</strong> Gli orari saranno visibili ai clienti sulla pagina del pub e determinano automaticamente se il locale appare come aperto o chiuso.</span>
          </p>
        </div>
      </Card>
      <SpecialDaysEditor
        specialDays={settingsData.openingHours?.specialDays ?? []}
        onChange={(days) => updateSettingsField('openingHours', { ...settingsData.openingHours, specialDays: days })}
      />
    </div>
  );

  // Settings Section - Complete Implementation
  const renderSettings = () => {
    return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground dark:text-white">Impostazioni Pub</h2>
          <p className="text-muted-foreground dark:text-muted-foreground">Gestisci tutti gli aspetti del tuo locale</p>
        </div>
        {settingsChanged && (
          <Button 
            onClick={handleSaveSettings}
            disabled={updatePubMutation.isPending}
            className=""
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
            <Image className="h-5 w-5 text-blue-700" />
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
              <Input className="border-stone-200 dark:border-border rounded-xl focus-visible:ring-primary/20" 
                id="pub-name"
                value={settingsData.name || ''}
                onChange={(e) => updateSettingsField('name', e.target.value)}
                placeholder="Es. Il Luppolino"
                data-testid="input-pub-name"
              />
            </div>
            <div>
              <Label htmlFor="business-name">Nome Commerciale</Label>
              <Input className="border-stone-200 dark:border-border rounded-xl focus-visible:ring-primary/20" 
                id="business-name"
                value={settingsData.businessName || ''}
                onChange={(e) => updateSettingsField('businessName', e.target.value)}
                placeholder="Ragione sociale"
                data-testid="input-business-name"
              />
            </div>
            <div>
              <Label htmlFor="pub-phone">Telefono</Label>
              <Input className="border-stone-200 dark:border-border rounded-xl focus-visible:ring-primary/20" 
                id="pub-phone"
                value={settingsData.phone || ''}
                onChange={(e) => updateSettingsField('phone', e.target.value)}
                placeholder="+39 012 345 6789"
                data-testid="input-pub-phone"
              />
            </div>
            <div>
              <Label htmlFor="pub-email">Email</Label>
              <Input className="border-stone-200 dark:border-border rounded-xl focus-visible:ring-primary/20" 
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
              <Input className="border-stone-200 dark:border-border rounded-xl focus-visible:ring-primary/20" 
                id="vat-number"
                value={settingsData.vatNumber || ''}
                onChange={(e) => updateSettingsField('vatNumber', e.target.value)}
                placeholder="12345678901"
                data-testid="input-vat-number"
              />
            </div>
          </div>
          <div className="mt-4">
            <Label htmlFor="pub-slug" className="flex items-center gap-1.5">
              Indirizzo web univoco
              <span className="text-xs font-normal text-muted-foreground">(opzionale)</span>
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs select-none pointer-events-none">fermenta.to/pub/</span>
              <Input
                id="pub-slug"
                className="border-stone-200 dark:border-border rounded-xl focus-visible:ring-primary/20 pl-[130px]"
                value={settingsData.slug || ''}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                  updateSettingsField('slug', val);
                }}
                placeholder="nome-del-pub"
                data-testid="input-pub-slug"
              />
            </div>
            {settingsData.slug && (
              <p className="text-xs text-muted-foreground mt-1">
                Il tuo pub sarà raggiungibile su fermenta.to/pub/{settingsData.slug}
              </p>
            )}
          </div>
          <div className="mt-4">
            <Label htmlFor="pub-description">Descrizione</Label>
            <Textarea className="border-stone-200 dark:border-border rounded-xl focus-visible:ring-primary/20" 
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
            <MapPin className="h-5 w-5 mr-2 text-red-700" />
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
              <Input className="border-stone-200 dark:border-border rounded-xl focus-visible:ring-primary/20" 
                id="pub-city"
                value={settingsData.city || ''}
                onChange={(e) => updateSettingsField('city', e.target.value)}
                placeholder="Milano"
                data-testid="input-pub-city"
              />
            </div>
            <div>
              <Label htmlFor="pub-region">Regione/Provincia</Label>
              <Input className="border-stone-200 dark:border-border rounded-xl focus-visible:ring-primary/20" 
                id="pub-region"
                value={settingsData.region || ''}
                onChange={(e) => updateSettingsField('region', e.target.value)}
                placeholder="Lombardia"
                data-testid="input-pub-region"
              />
            </div>
            <div>
              <Label htmlFor="pub-postal">CAP</Label>
              <Input className="border-stone-200 dark:border-border rounded-xl focus-visible:ring-primary/20" 
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
          <p className="text-sm text-muted-foreground dark:text-muted-foreground mb-6">
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
                <div key={day.key} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border border-stone-100 dark:border-border rounded-xl bg-white dark:bg-card">
                  <div className="flex items-center justify-between sm:justify-start sm:w-28 flex-shrink-0">
                    <Label className="font-semibold text-sm text-foreground dark:text-white w-24">{day.label}</Label>
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
                      <Label className="text-xs text-muted-foreground">Chiuso</Label>
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
                      className="flex-1 min-w-0 text-sm border-stone-200 dark:border-border rounded-xl focus-visible:ring-primary/20"
                      data-testid={`input-${day.key}-open`}
                    />
                    <span className="text-muted-foreground text-sm font-medium flex-shrink-0">—</span>
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
                      className="flex-1 min-w-0 text-sm border-stone-200 dark:border-border rounded-xl focus-visible:ring-primary/20"
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
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Chiuso</Label>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <SpecialDaysEditor
          specialDays={settingsData.openingHours?.specialDays ?? []}
          onChange={(days) => updateSettingsField('openingHours', { ...settingsData.openingHours, specialDays: days })}
        />

        {/* Social Media Links */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-1 flex items-center">
            <Globe className="h-5 w-5 mr-2 text-blue-700" />
            Social Media e Web
          </h3>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground mb-5">
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
              let iconColor = 'text-muted-foreground';
              if (icon === 'facebook' || url.includes('facebook.com')) { rowIcon = <SiFacebook size={15} />; iconColor = 'text-[#1877F2]'; }
              else if (icon === 'instagram' || url.includes('instagram.com')) { rowIcon = <SiInstagram size={15} />; iconColor = 'text-[#E1306C]'; }
              else if (icon === 'twitter' || url.includes('x.com') || url.includes('twitter.com')) { rowIcon = <SiX size={15} />; iconColor = 'text-gray-800 dark:text-white'; }
              else if (icon === 'tiktok' || url.includes('tiktok.com')) { rowIcon = <SiTiktok size={15} />; iconColor = 'text-foreground dark:text-white'; }
              else if (val) { iconColor = 'text-foreground/60'; }
              return (
                <div key={field} className="relative">
                  <div className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 ${iconColor}`}>
                    {rowIcon}
                  </div>
                  <Input
                    value={val}
                    onChange={(e) => updateSettingsField(field, e.target.value)}
                    placeholder={`${label} — ${placeholder}`}
                    className="h-10 pl-9 text-sm border-stone-200 dark:border-border rounded-xl focus-visible:ring-primary/20"
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
            <Eye className="h-5 w-5 mr-2 text-emerald-600" />
            Visibilità e Privacy
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white dark:bg-card rounded-xl">
              <div>
                <p className="font-medium">Pub Attivo</p>
                <p className="text-sm text-muted-foreground">Il pub è operativo e visibile al pubblico</p>
              </div>
              <Switch 
                checked={settingsData.isActive ?? true}
                onCheckedChange={(checked) => updateSettingsField('isActive', checked)}
                data-testid="switch-pub-active"
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-white dark:bg-card rounded-xl">
              <div>
                <p className="font-medium">Listato nei Risultati</p>
                <p className="text-sm text-muted-foreground">Il pub appare nelle ricerche e nelle mappe</p>
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
        <Card className="p-6 bg-muted/50 border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-foreground dark:text-white">Modifiche in Sospeso</h4>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                {settingsChanged ? 
                  'Hai delle modifiche non salvate. Clicca "Salva" per confermare.' : 
                  'Tutte le modifiche sono state salvate.'}
              </p>
            </div>
            <div className="flex gap-3">
              {settingsChanged && (
                <Button 
                  variant="outline" className="border-stone-200 dark:border-border hover:bg-stone-50 rounded-xl" 
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
                className=""
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
          <h2 className="text-2xl font-bold text-foreground dark:text-white">Cantina Management</h2>
          <p className="text-muted-foreground dark:text-muted-foreground">Gestisci le birre in bottiglia della cantina</p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-card rounded-2xl shadow-sm border border-stone-100 dark:border-border">
        <BottleListManager 
          pubId={currentPub?.id || 0} 
          bottleList={typedBottleList}
          tapList={typedTapList}
        />
      </div>
    </div>
  );

  // Bot Manager Section
  const renderBot = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setCurrentSection('overview')} className="text-primary rounded-xl">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground dark:text-white">Bot Manager</h2>
          <p className="text-muted-foreground dark:text-muted-foreground">Gestisci il menu via Telegram e WhatsApp</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-violet-50 dark:bg-violet-950/20 rounded-xl">
            <Bot className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Collega un Bot</h3>
            <p className="text-xs text-muted-foreground">Scrivi messaggi in italiano e il bot aggiorna il menu automaticamente</p>
          </div>
        </div>
        <BotConnectCard pubId={currentPub?.id} />
      </Card>
    </div>
  );

  // Profile Section
  const renderProfile = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground dark:text-white">Profilo</h2>
        <p className="text-muted-foreground dark:text-muted-foreground">Gestisci il tuo account</p>
      </div>
      
      <Card className="p-6">
        <div className="flex items-center space-x-6 mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-orange-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {(user as any)?.firstName?.[0] || 'U'}{(user as any)?.lastName?.[0] || 'S'}
          </div>
          <div>
            <h3 className="text-xl font-semibold">{(user as any)?.firstName || 'Nome'} {(user as any)?.lastName || 'Cognome'}</h3>
            <p className="text-muted-foreground">{(user as any)?.email || 'email@example.com'}</p>
            <Badge variant="secondary" className="mt-2">Pub Owner</Badge>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label>Nome</Label>
            <Input className="border-stone-200 dark:border-border rounded-xl focus-visible:ring-primary/20" defaultValue={(user as any)?.firstName || ''} data-testid="input-first-name" />
          </div>
          <div>
            <Label>Cognome</Label>
            <Input className="border-stone-200 dark:border-border rounded-xl focus-visible:ring-primary/20" defaultValue={(user as any)?.lastName || ''} data-testid="input-last-name" />
          </div>
          <div>
            <Label>Email</Label>
            <Input className="border-stone-200 dark:border-border rounded-xl focus-visible:ring-primary/20" defaultValue={(user as any)?.email || ''} type="email" data-testid="input-email" />
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
    <div className="lg:hidden bg-white dark:bg-card border-b p-4 flex items-center gap-3 sticky top-0 z-40">
      {currentSection !== 'overview' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentSection('overview')}
          className="text-primary hover:text-primary/80 rounded-xl"
          data-testid="button-back-overview"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-xl bg-gradient-to-br ${sections.find(s => s.id === currentSection)?.gradient || 'from-blue-500 to-purple-600'}`}>
          {sections.find(s => s.id === currentSection)?.icon && (
            <div className="w-5 h-5 text-white">
              {React.createElement(sections.find(s => s.id === currentSection)!.icon)}
            </div>
          )}
        </div>
        <h1 className="text-lg font-semibold text-foreground dark:text-white">
          {sections.find(s => s.id === currentSection)?.name || 'Dashboard Pub'}
        </h1>
      </div>
    </div>
  );

  // Modern Sidebar  
  const renderSidebar = () => (
    <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
      <div className="bg-white dark:bg-card border-r border-stone-100 dark:border-border flex-1 flex flex-col min-h-0">
        <div className="flex items-center h-16 flex-shrink-0 px-6 border-b">
          <div className="flex items-center">
            <div className="p-2 rounded-2xl bg-primary">
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
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-2xl w-full text-left transition-all duration-200 ${
                    isActive
                      ? `bg-stone-50 dark:bg-[#15202B]/20 text-primary border-r-2 border-primary`
                      : 'text-muted-foreground hover:bg-stone-50/60 dark:hover:bg-stone-900/10 hover:text-foreground'
                  }`}
                  data-testid={`nav-${section.id}`}
                >
                  <Icon className={`mr-3 h-5 w-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                  {section.name}
                </button>
              );
            })}
          </nav>
          
          {/* User Info */}
          <div className="p-4 border-t">
            <div className="flex items-center space-x-3 p-3 rounded-2xl bg-white dark:bg-card">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                {(user as any)?.firstName?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground dark:text-white truncate">
                  {(user as any)?.firstName || 'Nome'} {(user as any)?.lastName || 'Cognome'}
                </p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground truncate">
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
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 bg-primary rounded-full animate-bounce"></div>
            <div className="w-4 h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-4 h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <p className="text-muted-foreground dark:text-muted-foreground">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentPub) {
    const isPending = pendingRequest?.status === 'pending';
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 px-6">
        <div className="text-center space-y-4 max-w-sm">
          {isPending ? (
            <>
              <div className="flex items-center justify-center w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-900/20 mx-auto">
                <Clock className="w-10 h-10 text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground dark:text-white">Richiesta in attesa</h2>
              <p className="text-muted-foreground">
                La tua richiesta per <strong className="text-foreground">{pendingRequest?.pubName}</strong> è in fase di revisione. Riceverai una notifica non appena sarà approvata.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                In attesa di approvazione
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-20 h-20 rounded-full bg-stone-100 dark:bg-[#1B2735] mx-auto">
                <Store className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground dark:text-white">Nessun pub trovato</h2>
              <p className="text-muted-foreground">
                Non hai ancora registrato un pub. Registrane uno per accedere alla dashboard.
              </p>
              <Link href="/become-publican">
                <Button className="mt-2 bg-primary hover:bg-primary/90 text-white rounded-xl">
                  <Store className="w-4 h-4 mr-2" />
                  Registra il tuo locale
                </Button>
              </Link>
            </>
          )}
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
        <div className="py-4 sm:py-6 md:py-8">
          <PageContainer variant="wide">

            {/* Subscription banner — always visible */}
            {renderSubscriptionBanner()}

            {/* Hibernation overlay — blocks all sections when pub is inactive */}
            {!isAdminMode && currentPub && !currentPub.isActive && currentSection !== 'overview' && (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                <ShieldOff className="w-16 h-16 text-red-400 mx-auto" />
                <h2 className="text-2xl font-bold text-foreground dark:text-white">Pub ibernato</h2>
                <p className="text-muted-foreground dark:text-muted-foreground max-w-sm">
                  Questa sezione non è disponibile mentre l'abbonamento è sospeso. Riattiva il pub per continuare.
                </p>
                <Link href="/attiva-pub">
                  <Button className="bg-orange-500 hover:bg-primary text-white">
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
                {currentSection === 'bot' && renderBot()}
                {!['overview', 'taplist', 'bottles', 'menu', 'events', 'hours', 'analytics', 'settings', 'profile', 'bot'].includes(currentSection) && (
                  <div className="text-center py-16">
                    <div className="space-y-4">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${sections.find(s => s.id === currentSection)?.gradient} mx-auto flex items-center justify-center`}>
                        {sections.find(s => s.id === currentSection)?.icon && 
                          React.createElement(sections.find(s => s.id === currentSection)!.icon, { className: "w-8 h-8 text-white" })
                        }
                      </div>
                      <h2 className="text-2xl font-bold text-foreground dark:text-white">
                        {sections.find(s => s.id === currentSection)?.name}
                      </h2>
                      <p className="text-muted-foreground dark:text-muted-foreground">Sezione in fase di sviluppo.</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </PageContainer>
        </div>
      </div>

      {/* Cancel subscription confirmation dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-700" />
              {currentPub?.subscriptionStatus === 'trial' ? 'Disdici la prova gratuita?' : 'Disdici l\'abbonamento?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                {currentPub?.subscriptionStatus === 'trial'
                  ? 'Annullando la prova, il tuo pub verrà immediatamente ibernato e non sarà più visibile agli utenti. Nessun addebito verrà effettuato.'
                  : 'Disdire l\'abbonamento iberna immediatamente il pub. Il profilo non sarà più visibile. Puoi riattivarlo in qualsiasi momento.'}
              </span>
              <span className="block font-medium text-foreground dark:text-white">
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