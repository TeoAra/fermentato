import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatDistanceToNow, isAfter } from "date-fns";
import { it } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { isIosNative } from "@/lib/platform";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TapListManager } from "@/components/taplist-manager";
import { BottleListManager } from "@/components/bottle-list-manager";
import { MenuManager } from "@/components/menu-manager";
import { OwnerReportsSection } from "@/components/owner-reports";
import { ImageUpload } from "@/components/image-upload";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Beer, Wine, Utensils, Building2, Plus, AlertCircle, LogIn,
  X as Twitter, Music, Clock, MapPin, Phone, Globe, Camera,
  TrendingUp, Eye, CalendarDays,
  Home as HomeIcon, Info as InfoIcon, ArrowLeft, Share2, ChevronRight
} from "lucide-react";
import { SiFacebook, SiInstagram, SiX, SiTiktok } from "react-icons/si";
import { useAnyModalOpen, useHideGlobalBottomNav, DockPortal } from "@/components/bottom-navigation";

interface Pub {
  id: number;
  name: string;
  address: string;
  city: string;
  region: string;
  description?: string;
  imageUrl?: string; // Legacy field
  logoUrl?: string;
  coverImageUrl?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  tiktokUrl?: string;
  openingHours?: any;
  ownerId: string;
  subscriptionStatus?: string;
  trialEndsAt?: string;
  subscriptionExpiresAt?: string;
  isVerified?: boolean;
}

interface TapItem {
  id: number;
  beer: {
    id: number;
    name: string;
    style: string;
    abv: string;
    logoUrl?: string;
    brewery: {
      id: number;
      name: string;
    };
  };
  priceSmall?: string;
  priceMedium?: string;
  priceLarge?: string;
  tapNumber?: number;
  description?: string;
  isVisible: boolean;
}

interface BottleItem {
  id: number;
  beer: {
    id: number;
    name: string;
    style: string;
    abv: string;
    logoUrl?: string;
    brewery: {
      id: number;
      name: string;
    };
  };
  price: string;
  quantity: number;
  size?: string;
  vintage?: string;
  description?: string;
  isVisible: boolean;
}

interface MenuCategory {
  id: number;
  name: string;
  description?: string;
  isVisible: boolean;
  orderIndex: number;
  items: MenuItem[];
}

interface MenuItem {
  id: number;
  name: string;
  description?: string;
  price: string;
  allergens: string[];
  isVisible: boolean;
  isAvailable: boolean;
  imageUrl?: string;
  orderIndex: number;
}

export default function PubDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedPub, setSelectedPub] = useState<Pub | null>(null);
  const [showTrialWelcome, setShowTrialWelcome] = useState(false);
  // SSR-safe: parte da "taplist" (valida desktop e mobile). In effetto client,
  // se siamo su mobile passiamo a "overview" e gestiamo i resize.
  const [activeTab, setActiveTab] = useState<string>("taplist");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    setActiveTab((prev) => (!mq.matches && prev === "taplist" ? "overview" : prev));
    const handler = (e: MediaQueryListEvent) => {
      setActiveTab((prev) => {
        if (e.matches && prev === "overview") return "taplist";
        return prev;
      });
    };
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  const isAnyModalOpen = useAnyModalOpen();
  useHideGlobalBottomNav();

  // Show welcome message if redirected from email verification
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('trial=started')) {
      setShowTrialWelcome(true);
      window.history.replaceState({}, '', '/pub-dashboard');
    }
  }, []);

  const cancelTrialMutation = useMutation({
    mutationFn: () => apiRequest("/api/my-pub/cancel-trial", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-pubs"] });
      toast({ title: "Prova annullata", description: "La tua prova gratuita è stata annullata. Puoi riattivarla in qualsiasi momento." });
      setSelectedPub(null);
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error.message || "Impossibile annullare la prova", variant: "destructive" });
    },
  });

  // Check authentication
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Accesso Richiesto",
        description: "Devi effettuare l'accesso per gestire i tuoi pub.",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/login");
      }, 1000);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Get user's pubs
  const { data: pubs = [], isLoading: pubsLoading, error: pubsError } = useQuery<Pub[]>({
    queryKey: ["/api/my-pubs"],
    enabled: isAuthenticated,
  });

  // Get pub details when pub is selected
  // IMPORTANTE: usare sempre String(id) nelle query key per uniformità con le invalidazioni
  const { data: tapList = [], error: tapListError } = useQuery<TapItem[]>({
    queryKey: ["/api/pubs", String(selectedPub?.id ?? ""), "taplist"],
    enabled: !!selectedPub?.id,
  });

  const { data: bottleList = [], error: bottleListError } = useQuery<BottleItem[]>({
    queryKey: ["/api/pubs", String(selectedPub?.id ?? ""), "bottles"],
    enabled: !!selectedPub?.id,
  });

  const { data: menu = [], error: menuError } = useQuery<MenuCategory[]>({
    queryKey: ["/api/pubs", String(selectedPub?.id ?? ""), "menu"],
    enabled: !!selectedPub?.id,
  });

  // Handle unauthorized errors
  useEffect(() => {
    const errors = [pubsError, tapListError, bottleListError, menuError].filter(Boolean);
    
    for (const error of errors) {
      if (error && isUnauthorizedError(error as Error)) {
        toast({
          title: "Sessione Scaduta",
          description: "La tua sessione è scaduta. Effettua nuovamente l'accesso.",
          variant: "destructive",
        });
        setTimeout(() => {
          setLocation("/login");
        }, 1000);
        return;
      }
    }
  }, [pubsError, tapListError, bottleListError, menuError, toast]);

  // Select first pub when pubs are loaded
  useEffect(() => {
    if (pubs && pubs.length > 0 && !selectedPub) {
      setSelectedPub(pubs[0]);
    }
  }, [pubs, selectedPub]);

  if (isLoading || pubsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p>Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white dark:bg-[#0B0D10] rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Accesso Richiesto</h2>
        <p className="text-muted-foreground dark:text-stone-300 mb-6">
          Per gestire i tuoi pub devi prima effettuare l'accesso.
        </p>
        <Button asChild className="w-full">
          <a href="/api/login">
            <LogIn className="w-4 h-4 mr-2" />
            Accedi con Replit
          </a>
        </Button>
      </div>
    );
  }

  if (!pubs || pubs.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-8 p-6 bg-white dark:bg-[#0B0D10] rounded-lg shadow">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-stone-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Nessun Pub Registrato</h2>
          <p className="text-muted-foreground dark:text-stone-300 mb-6">
            Non hai ancora registrato nessun pub. Inizia registrando il tuo primo locale.
          </p>
          <Button asChild>
            <a href="/registra-pub">
              <Plus className="w-4 h-4 mr-2" />
              Registra il tuo Pub
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`container mx-auto px-2 sm:px-4 py-4 sm:py-8 ${activeTab !== 'overview' ? 'lg:!pt-8 lg:!pb-8' : ''}`}
      style={{
        paddingBottom: 'calc(96px + env(safe-area-inset-bottom))',
        paddingTop: activeTab !== 'overview' ? 'calc(56px + env(safe-area-inset-top))' : undefined,
      }}
    >
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-8 gap-4 ${activeTab !== 'overview' ? 'hidden lg:flex' : ''}`}>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground dark:text-white">
            Dashboard Pub
          </h1>
          <p className="text-muted-foreground dark:text-stone-300 mt-2 text-sm sm:text-base">
            Gestisci i tuoi pub e le loro tap list
          </p>
          {user ? (
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Benvenuto, {(user as any)?.firstName || 'Utente'} {(user as any)?.lastName || ''}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Button asChild variant="outline" size="sm" className="text-xs sm:text-sm">
            <a href="/registra-pub">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Aggiungi Pub</span>
              <span className="sm:hidden">+ Pub</span>
            </a>
          </Button>
          <Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={() =>
            fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
              .finally(() => { window.location.href = '/'; })
          }>
            Esci
          </Button>
        </div>
      </div>

      {/* Selezione Pub */}
      {pubs.length > 1 && (
        <Card className={`mb-6 ${activeTab !== 'overview' ? 'hidden lg:block' : ''}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <span className="font-medium">Pub selezionato:</span>
              <div className="flex gap-2 flex-wrap">
                {pubs.map((pub) => (
                  <Button
                    key={pub.id}
                    variant={selectedPub?.id === pub.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPub(pub)}
                  >
                    {pub.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trial welcome banner */}
      {showTrialWelcome && (
        <Card className={`border-border bg-muted/40 mb-2 ${activeTab !== 'overview' ? 'hidden lg:block' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎉</span>
              <div className="flex-1">
                <p className="font-semibold text-green-800 dark:text-green-200">Email verificata! La tua prova gratuita è iniziata.</p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-0.5">Hai 15 giorni per esplorare tutte le funzionalità del tuo pub su Fermenta.to. Buona gestione!</p>
              </div>
              <button onClick={() => setShowTrialWelcome(false)} className="text-green-600 hover:text-green-800 text-lg leading-none">×</button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription status banner */}
      <div className={activeTab !== 'overview' ? 'hidden lg:block' : ''}>
      {pubs.length > 0 && (() => {
        const pub = selectedPub || pubs[0];
        const status = pub.subscriptionStatus || 'none';
        const now = new Date();
        if (status === 'trial' && pub.trialEndsAt) {
          const trialEnd = new Date(pub.trialEndsAt);
          const isExpired = !isAfter(trialEnd, now);
          if (isExpired) {
            return (
              <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-red-800 dark:text-red-200">⏱️ La tua prova gratuita è terminata</p>
                      <p className="text-sm text-red-700 dark:text-red-300">Abbonati per continuare a gestire il tuo pub su Fermenta.to.</p>
                    </div>
                    {isIosNative ? (
                      <p className="text-xs text-red-700 dark:text-red-300 shrink-0 max-w-[200px] text-right">
                        Abbonamento non attivo. Riattiva l'accesso per gestire il pub.
                      </p>
                    ) : (
                      <Button className="bg-primary hover:bg-primary/90 text-white shrink-0" onClick={() => setLocation('/attiva-pub')}>
                        Abbonati — €65/anno
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          }
          const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return (
            <Card className={`border-stone-200 dark:border-[#23262E] ${daysLeft <= 5 ? 'bg-stone-50 dark:bg-orange-900/20' : 'bg-stone-50 dark:bg-[#0B0D10]/20'}`}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">
                      {daysLeft <= 5 ? '⚠️' : '⏳'} Prova gratuita in corso — {daysLeft} {daysLeft === 1 ? 'giorno' : 'giorni'} rimasti
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Scade il {new Date(pub.trialEndsAt).toLocaleDateString('it-IT')}. Abbonati per continuare senza interruzioni.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20" onClick={() => {
                      if (window.confirm("Sei sicuro di voler annullare la prova gratuita? Il tuo pub verrà disattivato.")) {
                        cancelTrialMutation.mutate();
                      }
                    }} disabled={cancelTrialMutation.isPending}>
                      Annulla prova
                    </Button>
                    {!isIosNative && (
                      <Button className="bg-primary hover:bg-primary/90 text-white" size="sm" onClick={() => setLocation('/attiva-pub')}>
                        Abbonati — €65/anno
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }
        if (status === 'none') {
          return (
            <Card className="border-stone-200 dark:border-[#23262E] bg-stone-50 dark:bg-[#0B0D10]/50">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground dark:text-gray-200">🔒 Attiva il tuo abbonamento</p>
                    <p className="text-sm text-muted-foreground dark:text-stone-400">Abbonati per rendere visibile il tuo pub su Fermenta.to.</p>
                  </div>
                  {isIosNative ? (
                    <p className="text-xs text-muted-foreground shrink-0 max-w-[200px] text-right">
                      Abbonamento non attivo. Riattiva l'accesso per rendere visibile il pub.
                    </p>
                  ) : (
                    <Button className="bg-primary hover:bg-primary/90 text-white shrink-0" onClick={() => setLocation('/attiva-pub')}>
                      Abbonati — €65/anno
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        }
        return null;
      })()}
      </div>

      {selectedPub && (
        <div className="space-y-6">
          {/* Info Pub */}
          <Card className={activeTab !== 'overview' ? 'hidden lg:block' : ''}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  {/* Nome con logo rotondo */}
                  <div className="flex items-center gap-3 mb-3">
                    {selectedPub.logoUrl && (
                      <img
                        src={selectedPub.logoUrl}
                        alt={selectedPub.name}
                        className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-gray-200 shadow-sm"
                      />
                    )}
                    <CardTitle className="text-2xl sm:text-3xl">{selectedPub.name}</CardTitle>
                  </div>
                  
                  {/* Indirizzo con mappa */}
                  <div className="flex items-start gap-2 mb-3">
                    <MapPin className="text-primary flex-shrink-0 mt-1" size={18} />
                    <div>
                      <CardDescription className="text-base font-medium text-foreground dark:text-gray-200">
                        {selectedPub.address}
                      </CardDescription>
                      <CardDescription className="text-sm text-muted-foreground">
                        {selectedPub.city}, {selectedPub.region}
                      </CardDescription>
                      <button 
                        className="text-primary hover:text-primary/80 text-sm font-medium mt-1 hover:underline"
                        onClick={() => {
                          const address = encodeURIComponent(`${selectedPub.address}, ${selectedPub.city}, Italia`);
                          window.open(`https://maps.google.com/maps?q=${address}`, '_blank');
                        }}
                      >
                        Vedi su Google Maps
                      </button>
                    </div>
                  </div>

                  {selectedPub.description && (
                    <p className="text-muted-foreground dark:text-stone-300 mt-3 bg-stone-50 dark:bg-[#12151A] p-3 rounded-lg">
                      {selectedPub.description}
                    </p>
                  )}
                </div>
                
                {/* Info aggiuntive visibili */}
                <div className="space-y-2 text-sm">
                  {selectedPub.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="text-primary" size={16} />
                      <a href={`tel:${selectedPub.phone}`} className="text-muted-foreground hover:text-primary font-medium">
                        {selectedPub.phone}
                      </a>
                    </div>
                  )}
                  {selectedPub.websiteUrl && (
                    <div className="flex items-center gap-2">
                      <Globe className="text-primary" size={16} />
                      <a 
                        href={selectedPub.websiteUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary font-medium"
                      >
                        Sito Web
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Tabs per gestione */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="hidden lg:grid w-full grid-cols-6 h-auto gap-1">
              <TabsTrigger value="info" className="flex items-center gap-1 text-xs sm:text-sm px-1 sm:px-3 py-2">
                <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Info Pub</span>
                <span className="sm:hidden">Info</span>
              </TabsTrigger>
              <TabsTrigger value="taplist" className="flex items-center gap-1 text-xs sm:text-sm px-1 sm:px-3 py-2">
                <Beer className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Tap List ({tapList.length})</span>
                <span className="sm:hidden">Spine</span>
              </TabsTrigger>
              <TabsTrigger value="bottles" className="flex items-center gap-1 text-xs sm:text-sm px-1 sm:px-3 py-2">
                <Wine className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Cantina ({bottleList.length})</span>
                <span className="sm:hidden">Cantina</span>
              </TabsTrigger>
              <TabsTrigger value="menu" className="flex items-center gap-1 text-xs sm:text-sm px-1 sm:px-3 py-2">
                <Utensils className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Menu ({menu.length})</span>
                <span className="sm:hidden">Menu</span>
              </TabsTrigger>
              <TabsTrigger value="orari" className="flex items-center gap-1 text-xs sm:text-sm px-1 sm:px-3 py-2">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Orari</span>
                <span className="sm:hidden">Orari</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-1 text-xs sm:text-sm px-1 sm:px-3 py-2">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Analitiche</span>
                <span className="sm:hidden">Stats</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab (solo mobile) — preview quick stats + shortcut alle sezioni */}
            <TabsContent value="overview" className="lg:hidden space-y-6">
              {/* Quick stats */}
              <section>
                <h2 className="text-lg font-extrabold text-foreground tracking-tight mb-3">Panoramica</h2>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Spine', value: tapList.length, icon: Beer, tab: 'taplist' },
                    { label: 'Cantina', value: bottleList.length, icon: Wine, tab: 'bottles' },
                    { label: 'Menu', value: menu.length, icon: Utensils, tab: 'menu' },
                  ].map(({ label, value, icon: Icon, tab }) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className="flex flex-col items-start gap-1 p-3 rounded-2xl bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] tap-scale active:scale-[0.98] transition-all"
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      <div className="text-2xl font-black text-foreground leading-none">{value}</div>
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</div>
                    </button>
                  ))}
                </div>
              </section>

              {/* Shortcut sezioni */}
              <section>
                <h3 className="text-sm font-bold text-foreground tracking-tight mb-2">Gestisci</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Info Pub', sub: 'Nome, descrizione, immagini, social', icon: Building2, tab: 'info' },
                    { label: 'Tap List', sub: `${tapList.length} birre alla spina`, icon: Beer, tab: 'taplist' },
                    { label: 'Cantina', sub: `${bottleList.length} birre disponibili`, icon: Wine, tab: 'bottles' },
                    { label: 'Menu cibo', sub: `${menu.length} categorie`, icon: Utensils, tab: 'menu' },
                    { label: 'Orari di apertura', sub: 'Configura gli orari della settimana', icon: Clock, tab: 'orari' },
                    { label: 'Analitiche', sub: 'Visite e statistiche', icon: TrendingUp, tab: 'analytics' },
                  ].map(({ label, sub, icon: Icon, tab }) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] tap-scale active:scale-[0.99] transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-foreground leading-tight">{label}</div>
                        <div className="text-[11px] text-muted-foreground truncate mt-0.5">{sub}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-stone-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </section>
            </TabsContent>

            {/* Info Pub Tab */}
            <TabsContent value="info">
              <PubInfoTab pub={selectedPub} />
            </TabsContent>

            {/* Tap List */}
            <TabsContent value="taplist">
              <TapListManager pubId={selectedPub.id} tapList={tapList} />
            </TabsContent>

            {/* Cantina Birre */}
            <TabsContent value="bottles">
              <BottleListManager pubId={selectedPub.id} bottleList={bottleList} />
            </TabsContent>

            {/* Menu Cibo */}
            <TabsContent value="menu">
              <MenuManager pubId={selectedPub.id} menu={menu} />
            </TabsContent>

            {/* Orari Apertura */}
            <TabsContent value="orari">
              <OpeningHoursManager pub={selectedPub} />
            </TabsContent>

            {/* Analitiche */}
            <TabsContent value="analytics">
              <PubAnalyticsTab pubId={selectedPub.id} />
            </TabsContent>
          </Tabs>

          <div className={`mt-6 ${activeTab !== 'overview' ? 'hidden lg:block' : ''}`}>
            <OwnerReportsSection ownerType="pub" ownerId={selectedPub.id} />
          </div>
        </div>
      )}

      {/* ── STICKY MINI TOP BAR (mobile, non-overview) ── */}
      {activeTab !== 'overview' && !isAnyModalOpen && (
        <div
          className="lg:hidden fixed top-0 inset-x-0 z-30"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="bg-white/70 dark:bg-[#0B0B0C]/70 backdrop-blur-xl border-b border-stone-200/60 dark:border-white/[0.06]">
            <div className="flex items-center gap-3 px-3 h-14">
              <button
                onClick={() => setActiveTab('overview')}
                aria-label="Torna alla panoramica"
                className="w-10 h-10 rounded-full bg-stone-100 dark:bg-white/[0.06] flex items-center justify-center tap-scale active:scale-95"
              >
                <ArrowLeft className="h-5 w-5 text-foreground" />
              </button>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                {selectedPub?.logoUrl && (
                  <img
                    src={selectedPub.logoUrl}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover border border-stone-200 dark:border-white/10 flex-shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-foreground truncate leading-tight">
                    {selectedPub?.name || 'Dashboard Pub'}
                  </div>
                  <div className="text-[10px] font-semibold text-primary capitalize leading-tight">
                    {activeTab === 'info' && 'Info Pub'}
                    {activeTab === 'taplist' && 'Tap List'}
                    {activeTab === 'bottles' && 'Cantina'}
                    {activeTab === 'menu' && 'Menu'}
                    {activeTab === 'orari' && 'Orari'}
                    {activeTab === 'analytics' && 'Analitiche'}
                  </div>
                </div>
              </div>
              {selectedPub && (
                <a
                  href={`/pub/${selectedPub.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Vai alla pagina pubblica"
                  className="w-10 h-10 rounded-full bg-stone-100 dark:bg-white/[0.06] flex items-center justify-center tap-scale active:scale-95"
                >
                  <Eye className="h-[18px] w-[18px] text-foreground" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM DOCK DASHBOARD PUB — stesso pattern di BottomNavigation ── */}
      <DockPortal>
      <nav
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#0B0D10] rounded-t-[32px] border-t border-x border-stone-100 dark:border-white/[0.06] shadow-[0_-10px_40px_-8px_rgba(0,0,0,0.18)] dark:shadow-[0_-10px_40px_-8px_rgba(0,0,0,0.55)] transition-opacity duration-200 ${
          isAnyModalOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom) - 16px, 0px)' }}
        aria-label="Navigazione dashboard pub"
        role="tablist"
      >
        <div className="px-2">
          <div>
            <div className="flex items-stretch justify-between p-1.5 gap-1">
              {[
                { id: 'overview', label: 'Home', Icon: HomeIcon },
                { id: 'taplist',  label: 'Spine', Icon: Beer },
                { id: 'bottles',  label: 'Cantina', Icon: Wine },
                { id: 'menu',     label: 'Menu', Icon: Utensils },
                { id: 'analytics',label: 'Stats', Icon: TrendingUp },
              ].map(({ id, label, Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    role="tab"
                    aria-selected={active}
                    aria-current={active ? 'page' : undefined}
                    aria-label={label}
                    data-testid={`pub-dock-${id}`}
                    className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-[20px] transition-all duration-200 active:scale-95 ${
                      active
                        ? 'bg-primary/10 dark:bg-primary/15 text-primary'
                        : 'text-stone-500 dark:text-stone-400 hover:text-foreground'
                    }`}
                  >
                    <Icon
                      className="h-[20px] w-[20px]"
                      strokeWidth={active ? 2.6 : 1.8}
                      fill={active ? 'currentColor' : 'none'}
                      style={active ? { fillOpacity: 0.18 } : {}}
                    />
                    <span className={`text-[10px] leading-none tracking-tight ${active ? 'font-bold' : 'font-semibold'}`}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
      </DockPortal>
    </div>
  );
}

// Componente per gestire le informazioni del pub
function PubAnalyticsTab({ pubId }: { pubId: number }) {
  const { data, isLoading } = useQuery<{
    today: number; yesterday: number; last7: number; last30: number;
    series: { date: string; views: number }[];
  }>({
    queryKey: ["/api/pubs", String(pubId), "analytics"],
    queryFn: () => apiRequest(`/api/pubs/${pubId}/analytics`),
    staleTime: 5 * 60_000,
  });

  const chartData = (data?.series ?? []).map(d => ({
    day: new Date(d.date).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }),
    Visite: d.views,
  }));

  const kpis = [
    { label: "Oggi", value: data?.today ?? 0, icon: Eye },
    { label: "Ieri", value: data?.yesterday ?? 0, icon: CalendarDays },
    { label: "Ultimi 7 giorni", value: data?.last7 ?? 0, icon: TrendingUp },
    { label: "Ultimi 30 giorni", value: data?.last30 ?? 0, icon: TrendingUp },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl bg-stone-100 dark:bg-[#0B0D10] animate-pulse" />)}
        </div>
        <div className="h-64 rounded-xl bg-stone-100 dark:bg-[#0B0D10] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground dark:text-stone-400">{label}</span>
              </div>
              <p className="text-3xl font-bold text-foreground dark:text-white">{value.toLocaleString("it-IT")}</p>
              <p className="text-xs text-stone-400 mt-0.5">visite alla pagina</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Visite giornaliere — ultimi 30 giorni</CardTitle>
          <CardDescription>Numero di volte che la pagina del pub è stata aperta</CardDescription>
        </CardHeader>
        <CardContent>
          {data?.last30 === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-stone-400">
              <TrendingUp className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Nessuna visita registrata ancora.</p>
              <p className="text-xs mt-1">I dati vengono raccolti a partire da oggi.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "0.5rem", fontSize: "0.8rem", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,.12)" }}
                  formatter={(v: number) => [v, "Visite"]}
                />
                <Bar dataKey="Visite" fill="hsl(35,90%,42%)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PubInfoTab({ pub }: { pub: Pub }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: pub.name || "",
    description: pub.description || "",
    phone: pub.phone || "",
    email: pub.email || "",
    websiteUrl: pub.websiteUrl || "",
    facebookUrl: pub.facebookUrl || "",
    instagramUrl: pub.instagramUrl || "",
    twitterUrl: pub.twitterUrl || "",
    tiktokUrl: pub.tiktokUrl || "",
  });
  
  const [logoUrl, setLogoUrl] = useState<string | null>(pub.logoUrl || null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(pub.coverImageUrl || null);

  const updatePubMutation = useMutation({
    mutationFn: async (data: any) => {
      const submitData = {
        ...data,
        logoUrl,
        coverImageUrl,
      };
      return apiRequest("/api/pubs/" + pub.id, { method: "PATCH" }, submitData);
    },
    onSuccess: () => {
      toast({
        title: "Successo",
        description: "Informazioni pub aggiornate correttamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my-pubs"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Sessione Scaduta",
          description: "Effettua nuovamente l'accesso.",
          variant: "destructive",
        });
        setTimeout(() => {
          setLocation("/login");
        }, 1000);
        return;
      }
      toast({
        title: "Errore",
        description: "Impossibile aggiornare le informazioni",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePubMutation.mutate(formData);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Informazioni Pub</CardTitle>
          <CardDescription>
            Aggiorna le informazioni principali del tuo pub
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome Pub</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome del pub"
              />
            </div>

            <div>
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrizione del pub"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Telefono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+39 123 456 7890"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="info@miopub.it"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="websiteUrl">Sito Web</Label>
              <Input
                id="websiteUrl"
                value={formData.websiteUrl}
                onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                placeholder="https://www.miopub.it"
              />
            </div>

            {/* Immagini */}
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-foreground dark:text-gray-100">Immagini del Pub</h4>
                <p className="text-sm text-muted-foreground dark:text-stone-400 mt-1">
                  Carica immagini professionali per dare al tuo pub un aspetto attraente
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ImageUpload
                  label="Logo del Pub"
                  description="Il logo rappresenta l'identità del tuo pub e apparirà nei risultati di ricerca"
                  currentImageUrl={logoUrl || undefined}
                  onImageChange={setLogoUrl}
                  folder="pub-logos"
                  aspectRatio="square"
                  maxSize={2}
                  recommendedDimensions="400x400 px"
                  acceptedFormats={['JPG', 'PNG', 'WebP']}
                  showFileInfo={true}
                />
                <ImageUpload
                  label="Immagine Copertina"
                  description="L'immagine di copertina verrà mostrata nella pagina principale del pub"
                  currentImageUrl={coverImageUrl || undefined}
                  onImageChange={setCoverImageUrl}
                  folder="pub-covers"
                  aspectRatio="landscape"
                  maxSize={5}
                  recommendedDimensions="1200x630 px"
                  acceptedFormats={['JPG', 'PNG', 'WebP']}
                  showFileInfo={true}
                />
              </div>
              <div className="bg-muted border border-border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-background rounded-full p-2 flex-shrink-0">
                    <Camera className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-foreground mb-1">
                      Consigli per le immagini
                    </h5>
                    <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                      <li>• Usa immagini di alta qualità e ben illuminate</li>
                      <li>• Per il logo: semplice, leggibile anche in piccole dimensioni</li>
                      <li>• Per la copertina: mostra l'atmosfera del tuo pub</li>
                      <li>• Evita testo piccolo che potrebbe risultare illeggibile</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={updatePubMutation.isPending}
            >
              {updatePubMutation.isPending ? "Salvataggio..." : "Salva Informazioni"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social Media</CardTitle>
          <CardDescription>
            Collega i tuoi profili social per aumentare la visibilità
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="facebookUrl" className="flex items-center gap-2">
              <SiFacebook className="w-4 h-4 text-blue-600" />
              Facebook
            </Label>
            <Input
              id="facebookUrl"
              value={formData.facebookUrl}
              onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
              placeholder="https://facebook.com/miopub"
            />
          </div>

          <div>
            <Label htmlFor="instagramUrl" className="flex items-center gap-2">
              <SiInstagram className="w-4 h-4 text-pink-600" />
              Instagram
            </Label>
            <Input
              id="instagramUrl"
              value={formData.instagramUrl}
              onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
              placeholder="https://instagram.com/miopub"
            />
          </div>

          <div>
            <Label htmlFor="twitterUrl" className="flex items-center gap-2">
              <SiX className="w-4 h-4 text-black dark:text-white" />
              X (Twitter)
            </Label>
            <Input
              id="twitterUrl"
              value={formData.twitterUrl}
              onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
              placeholder="https://x.com/miopub"
            />
          </div>

          <div>
            <Label htmlFor="tiktokUrl" className="flex items-center gap-2">
              <SiTiktok className="w-4 h-4 text-black dark:text-white" />
              TikTok
            </Label>
            <Input
              id="tiktokUrl"
              value={formData.tiktokUrl}
              onChange={(e) => setFormData({ ...formData, tiktokUrl: e.target.value })}
              placeholder="https://tiktok.com/@miopub"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente per gestire gli orari di apertura
function OpeningHoursManager({ pub }: { pub: Pub }) {
  const [, setLocation] = useLocation();
  const [openingHours, setOpeningHours] = useState<any>(pub.openingHours || {});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateHoursMutation = useMutation({
    mutationFn: async (hours: any) => {
      return apiRequest("/api/pubs/" + pub.id, { method: "PATCH" }, { openingHours: hours });
    },
    onSuccess: () => {
      toast({
        title: "Successo",
        description: "Orari di apertura aggiornati",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my-pubs"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Sessione Scaduta",
          description: "Effettua nuovamente l'accesso.",
          variant: "destructive",
        });
        setTimeout(() => {
          setLocation("/login");
        }, 1000);
        return;
      }
      toast({
        title: "Errore",
        description: "Impossibile aggiornare gli orari",
        variant: "destructive",
      });
    },
  });

  const days = [
    { key: 'monday', label: 'Lunedì' },
    { key: 'tuesday', label: 'Martedì' },
    { key: 'wednesday', label: 'Mercoledì' },
    { key: 'thursday', label: 'Giovedì' },
    { key: 'friday', label: 'Venerdì' },
    { key: 'saturday', label: 'Sabato' },
    { key: 'sunday', label: 'Domenica' },
  ];

  const handleHoursChange = (day: string, type: 'open' | 'close', value: string) => {
    setOpeningHours((prev: any) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [type]: value,
        isClosed: false,
      },
    }));
  };

  const toggleClosed = (day: string) => {
    setOpeningHours((prev: any) => ({
      ...prev,
      [day]: {
        ...prev[day],
        isClosed: !prev[day]?.isClosed,
      },
    }));
  };

  const handleSave = () => {
    updateHoursMutation.mutate(openingHours);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orari di Apertura</CardTitle>
        <CardDescription>
          Configura gli orari di apertura per ogni giorno della settimana
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {days.map((day) => (
            <div key={day.key} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-24">
                  <Label className="font-medium">{day.label}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Input
                    type="time"
                    value={openingHours[day.key]?.open || "12:00"}
                    onChange={(e) => handleHoursChange(day.key, 'open', e.target.value)}
                    disabled={openingHours[day.key]?.isClosed}
                    className="w-32"
                  />
                  <span>-</span>
                  <Input
                    type="time"
                    value={openingHours[day.key]?.close || "23:00"}
                    onChange={(e) => handleHoursChange(day.key, 'close', e.target.value)}
                    disabled={openingHours[day.key]?.isClosed}
                    className="w-32"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={openingHours[day.key]?.isClosed || false}
                  onChange={() => toggleClosed(day.key)}
                  className="rounded"
                />
                <Label className="text-sm text-muted-foreground">Chiuso</Label>
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={updateHoursMutation.isPending}
            >
              {updateHoursMutation.isPending ? "Salvando..." : "Salva Orari"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}