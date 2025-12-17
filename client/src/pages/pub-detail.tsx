import React from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { 
  Star, 
  Clock, 
  Phone, 
  Globe, 
  Wine, 
  Facebook, 
  Instagram, 
  Settings, 
  Edit,
  Heart,
  Eye,
  Share2,
  Users,
  Award,
  Navigation,
  Mail,
  Calendar,
  Info,
  CheckCircle,
  XCircle,
  Sparkles,
  TrendingUp,
  Target,
} from "lucide-react";
import Footer from "@/components/footer";
import TapList from "@/components/tap-list";
import LuppolinoMenu from "@/components/luppolino-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import OpeningHoursDialog from "@/components/OpeningHoursDialog";
import ImageWithFallback from "@/components/image-with-fallback";

// Funzione per controllare se un pub è aperto ora
function isOpenNow(openingHours: any) {
  if (!openingHours) return false;
  
  const now = new Date();
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const todayHours = openingHours[currentDay];
  if (!todayHours || todayHours.isClosed) return false;
  
  // Se ha orari, controlla se è nell'intervallo
  if (todayHours.open && todayHours.close) {
    const [openHour, openMin] = todayHours.open.split(':').map(Number);
    const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    
    if (closeTime < openTime) {
      // Orario attraversa la mezzanotte
      return currentTime >= openTime || currentTime <= closeTime;
    } else {
      return currentTime >= openTime && currentTime <= closeTime;
    }
  }
  
  return true; // Se non ha orari specifici ma non è chiuso, considera aperto
}

// Modern Beer Card Component
const ModernBeerCard = ({ beer, prices, className = "" }: { 
  beer: any; 
  prices?: any[];
  className?: string;
}) => (
  <Card className={`p-6 hover:shadow-lg transition-all duration-300 border-l-4 border-l-emerald-500 bg-white dark:bg-gray-800 ${className}`}>
    <div className="flex items-start justify-between space-x-4">
      {/* Left side: Beer details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-4">
          <ImageWithFallback
            src={beer?.imageUrl || beer?.brewery?.logoUrl}
            alt={beer?.name || 'Beer'}
            imageType="beer"
            containerClassName="w-12 h-12 rounded-lg flex-shrink-0"
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
            iconSize="md"
          />
          <div className="flex-1 min-w-0">
            <Link href={`/beer/${beer?.id}`}>
              <h3 className="font-semibold text-lg break-words hover:text-primary cursor-pointer transition-colors text-gray-900 dark:text-white">
                {beer?.name || 'Nome non disponibile'}
              </h3>
            </Link>
            {beer?.brewery?.id && (
              <Link href={`/brewery/${beer.brewery.id}`}>
                <p className="text-xs text-gray-500 dark:text-gray-400 break-words hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer transition-colors">
                  {beer.brewery.name || beer?.breweryName || 'Birrificio'}
                </p>
              </Link>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {beer?.style || 'N/D'} • {beer?.abv || '0'}% ABV
            </p>
          </div>
        </div>

        {/* Description if available */}
        {beer?.description && (
          <div className="mt-4 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">{beer.description}</p>
            </div>
          </div>
        )}
      </div>

      {/* Right side: Prices */}
      {prices && prices.length > 0 && (
        <div className="flex-shrink-0 min-w-[120px]">
          <div className="space-y-2">
            {prices.map((price: any, index: number) => (
              <div key={index} className="text-right">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {typeof price === 'object' ? (price as any).size : price}
                </div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  €{typeof price === 'object' ? parseFloat((price as any).price).toFixed(2) : parseFloat(price).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </Card>
);

// Modern Stats Card Component  
const PubStatsCard = ({ 
  icon: Icon, 
  label, 
  value, 
  gradient,
  description 
}: {
  icon: any;
  label: string;
  value: string | number;
  gradient: string;
  description?: string;
}) => (
  <div className="glass-card rounded-xl p-4 hover:scale-105 transition-all duration-300 group">
    <div className="flex items-center space-x-3">
      <div className={`p-3 rounded-lg bg-gradient-to-br ${gradient} group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{label}</p>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{description}</p>
        )}
      </div>
    </div>
  </div>
);

export default function PubDetail() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("taplist");
  const [showOpeningHours, setShowOpeningHours] = useState(false);
  
  const { data: pub, isLoading: pubLoading } = useQuery({
    queryKey: ["/api/pubs", id],
    enabled: !!id,
  });

  // Check if the current user is the owner of this pub or an admin
  const isOwner = isAuthenticated && user && pub && (user as any).id === (pub as any).ownerId;
  const isAdmin = isAuthenticated && user && ((user as any).active_role === 'admin' || (user as any).roles?.includes('admin'));
  const canManage = isOwner || isAdmin;

  const { data: tapList, isLoading: tapLoading } = useQuery({
    queryKey: ["/api/pubs", id, "taplist"],
    enabled: !!id,
  });

  const { data: menuData = [], isLoading: menuLoading } = useQuery({
    queryKey: ["/api/pubs", id, "menu"],
    enabled: !!id,
  });

  // Fetch all products for all categories
  const { data: allCategoryProducts } = useQuery({
    queryKey: ["/api/pubs", id, "menu", "all-products", menuData?.map((c: any) => c.id).join(',')],
    queryFn: async () => {
      if (!id || !Array.isArray(menuData) || menuData.length === 0) return {};
      
      const productMap: Record<number, any[]> = {};
      
      const promises = menuData.map(async (category: any) => {
        try {
          const products = await apiRequest(`/api/pubs/${id}/menu/categories/${category.id}/items`, { method: 'GET' });
          return { categoryId: category.id, products: Array.isArray(products) ? products : [] };
        } catch (error) {
          return { categoryId: category.id, products: [] };
        }
      });
      
      const results = await Promise.all(promises);
      results.forEach(({ categoryId, products }) => {
        productMap[categoryId] = products;
      });
      
      return productMap;
    },
    enabled: !!id && Array.isArray(menuData) && menuData.length > 0,
  });

  // Merge products into categories
  const menu = useMemo(() => {
    if (!Array.isArray(menuData)) return [];
    return menuData.map((category: any) => ({
      ...category,
      items: allCategoryProducts?.[category.id] || []
    }));
  }, [menuData, allCategoryProducts]);

  const { data: bottles, isLoading: bottlesLoading } = useQuery({
    queryKey: ["/api/pubs", id, "bottles"],
    enabled: !!id,
  });

  const { data: favoritesCountData, isLoading: favoritesCountLoading } = useQuery({
    queryKey: ["/api/favorites", "pub", id, "count"],
    enabled: !!id,
  });

  // Check if current pub is in user's favorites
  const { data: isFavoriteData } = useQuery({
    queryKey: ["/api/favorites", "pub", id, "check"],
    enabled: !!id && isAuthenticated,
  });

  const isFavorite = isFavoriteData?.isFavorite || false;

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorite) {
        return apiRequest(`/api/favorites/pub/${id}`, { method: "DELETE" });
      } else {
        return apiRequest("/api/favorites", { method: "POST" }, { 
          itemType: "pub", 
          itemId: parseInt(id as string) 
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", "pub", id, "check"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", "pub", id, "count"] });
      
      toast({
        title: isFavorite ? "Rimosso dai preferiti" : "Aggiunto ai preferiti",
        description: isFavorite 
          ? "Il pub è stato rimosso dai tuoi preferiti" 
          : "Il pub è stato aggiunto ai tuoi preferiti",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare i preferiti",
        variant: "destructive",
      });
    },
  });

  // Enhanced share functionality with better mobile support
  const handleShare = async () => {
    const pubName = (pub as any)?.name || 'Pub';
    const currentUrl = window.location.href;
    
    const shareData = {
      title: `${pubName} - Fermenta`,
      text: `Scopri ${pubName} su Fermenta - Birre alla spina, cantina e menu`,
      url: currentUrl,
    };

    try {
      // Check for Web Share API support (preferred on mobile)
      if (navigator.share && typeof navigator.share === 'function') {
        // Check if the data can be shared
        let canShare = true;
        try {
          if (navigator.canShare && typeof navigator.canShare === 'function') {
            canShare = navigator.canShare(shareData);
          }
        } catch (canShareError) {
          // Some browsers have navigator.share but not navigator.canShare
          canShare = true;
        }

        if (canShare) {
          await navigator.share(shareData);
          // Only show success toast if share wasn't cancelled
          toast({
            title: "Condiviso con successo! 🎉",
            description: "Il link del pub è stato condiviso",
          });
          return;
        }
      }

      // Fallback to clipboard copy with enhanced error handling
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl);
        toast({
          title: "Link copiato! 📋",
          description: "Il link è stato copiato negli appunti. Incollalo dove vuoi condividerlo!",
        });
      } else {
        // Fallback for older browsers/environments without clipboard API
        try {
          // Create a temporary textarea to copy text
          const textArea = document.createElement('textarea');
          textArea.value = currentUrl;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          
          if (successful) {
            toast({
              title: "Link copiato! 📋",
              description: "Il link è stato copiato negli appunti",
            });
          } else {
            throw new Error('Copy command failed');
          }
        } catch (fallbackError) {
          // Final fallback - show the URL to copy manually
          toast({
            title: "Copia questo link:",
            description: currentUrl,
            action: (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(currentUrl);
                  }
                }}
              >
                Copia
              </Button>
            ),
          });
        }
      }
    } catch (error: any) {
      // Handle different types of errors
      if (error.name === 'AbortError') {
        // User cancelled the share - don't show an error
        return;
      }
      
      if (error.name === 'NotAllowedError') {
        toast({
          title: "Autorizzazione necessaria",
          description: "Consenti l'accesso per condividere il link",
          variant: "destructive",
        });
        return;
      }

      // Generic error handling
      console.warn('Share failed:', error);
      
      // Try clipboard as final fallback
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(currentUrl);
          toast({
            title: "Link copiato come alternativa 📋",
            description: "La condivisione non è disponibile, ma il link è stato copiato negli appunti",
          });
        } else {
          throw new Error('Clipboard not available');
        }
      } catch (clipboardError) {
        toast({
          title: "Condivisione non disponibile",
          description: "Copia manualmente questo link: " + currentUrl,
          variant: "destructive",
        });
      }
    }
  };

  // Handle save/favorite functionality
  const handleSave = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login richiesto",
        description: "Effettua il login per gestire i preferiti",
        variant: "destructive",
      });
      return;
    }
    toggleFavoriteMutation.mutate();
  };

  if (pubLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Hero Skeleton */}
            <div className="skeleton rounded-2xl h-80 md:h-96"></div>
            
            {/* Stats Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton rounded-xl h-20"></div>
              ))}
            </div>
            
            {/* Content Skeleton */}
            <div className="skeleton rounded-2xl h-96"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!pub) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 mx-auto flex items-center justify-center">
            <XCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Pub non trovato</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Il pub che stai cercando non esiste o è stato rimosso.
          </p>
          <Button asChild>
            <Link href="/">Torna alla Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isOpen = isOpenNow((pub as any)?.openingHours);

  // Quick Actions Handlers
  const handleShowOpeningHours = () => {
    setShowOpeningHours(true);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950">
      
      {/* Modern Hero Section */}
      <div className="relative">
        <div className="relative h-96 md:h-[500px] overflow-hidden">
          <img
            src={(pub as any)?.coverImageUrl || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=600"}
            alt={`${(pub as any)?.name} - Copertina`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10"></div>
          
          {/* Hero Content */}
          <div className="absolute inset-0 flex items-end">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-12">
              <div className="glass-card rounded-2xl p-8 backdrop-blur-md bg-white/10 border border-white/20">
                <div className="flex flex-col md:flex-row items-center md:items-center justify-between gap-8">
                  <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6 w-full md:w-auto justify-center md:justify-start">
                    {(pub as any)?.logoUrl && (
                      <Avatar className="h-20 w-20 ring-4 ring-white/30 flex-shrink-0">
                        <AvatarImage src={(pub as any).logoUrl} alt={`${(pub as any).name} - Logo`} />
                        <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-2xl">
                          {(pub as any)?.name?.[0] || 'P'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="text-center md:text-left">
                      <h1 className="text-2xl sm:text-3xl md:text-4xl text-white mb-4 font-bold leading-tight">
                        {(pub as any)?.name}
                      </h1>
                      <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start space-y-3 sm:space-y-0 sm:space-x-4">
                        <div className="flex items-center justify-center space-x-3">
                          <Badge 
                            className={`${
                              isOpen 
                                ? 'bg-green-500/20 text-green-100 border-green-300/30' 
                                : 'bg-red-500/20 text-red-100 border-red-300/30'
                            } backdrop-blur-sm px-3 py-2`}
                          >
                            {isOpen ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Aperto ora
                              </>
                            ) : (
                              <>
                                <Clock className="h-4 w-4 mr-2" />
                                Chiuso
                              </>
                            )}
                          </Badge>
                          {!(pub as any)?.isActive && (
                            <Badge className="bg-orange-500/20 text-orange-100 border-orange-300/30 backdrop-blur-sm px-3 py-2">
                              Temporaneamente Chiuso
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-center bg-red-500/20 backdrop-blur-sm border border-red-300/30 rounded-lg px-4 py-2.5 min-w-[5rem]">
                          <Heart className="h-4 w-4 mr-2 text-red-400 fill-current" />
                          <span className="text-sm font-bold text-red-100">{favoritesCountData?.count || 0}</span>
                          <span className="text-xs text-red-200 ml-1 hidden sm:inline">preferiti</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Centered action buttons on mobile, right-aligned on desktop */}
                  <div className="flex items-center justify-center md:justify-end space-x-2 sm:space-x-3 w-full md:w-auto">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleSave}
                      disabled={toggleFavoriteMutation.isPending}
                      className={`backdrop-blur-md border-white/40 text-white hover:bg-white/30 hover:border-white/60 transition-all duration-300 font-medium shadow-lg min-h-[44px] min-w-[44px] ${
                        isFavorite ? 'bg-red-500/30 border-red-300/50' : 'bg-white/20'
                      }`}
                      data-testid="button-save"
                    >
                      <Heart className={`h-4 w-4 sm:mr-2 ${isFavorite ? 'fill-current' : ''}`} />
                      <span className="hidden sm:inline">{isFavorite ? 'Salvato' : 'Salva'}</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleShare}
                      className="backdrop-blur-md bg-white/20 border-white/40 text-white hover:bg-white/30 hover:border-white/60 transition-all duration-300 font-medium shadow-lg min-h-[44px] min-w-[44px]"
                      data-testid="button-share"
                    >
                      <Share2 className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Condividi</span>
                    </Button>
                    {canManage && (
                      <Link href={isAdmin ? `/admin/edit-pub/${id}` : "/dashboard"}>
                        <Button 
                          className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg min-h-[44px] min-w-[44px]"
                          data-testid="button-manage"
                        >
                          <Settings className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Gestisci</span>
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <PubStatsCard 
            icon={Wine}
            label="Taplist"
            value={Array.isArray(tapList) ? tapList.filter((t: any) => t.isVisible).length : 0}
            gradient="from-amber-500 to-orange-600"
            description="Alla spina"
          />
          <PubStatsCard 
            icon={Wine}
            label="Birre in Bottiglia"
            value={Array.isArray(bottles) ? bottles.length : 0}
            gradient="from-emerald-500 to-green-600"
            description="Selezione cantina"
          />
          <PubStatsCard 
            icon={Users}
            label="Menu Categorie"
            value={Array.isArray(menu) ? menu.length : 0}
            gradient="from-blue-500 to-indigo-600"
            description="Piatti disponibili"
          />
          <PubStatsCard 
            icon={Heart}
            label="Preferiti"
            value={favoritesCountData?.count || 0}
            gradient="from-red-500 to-pink-600"
            description="Utenti che lo adorano"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Modern Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-4 md:mb-8">
                <TabsList className="grid w-full grid-cols-3 h-auto mb-3 md:mb-6 bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl md:rounded-2xl p-0.5 sm:p-1 md:p-2 shadow-lg border border-gray-200 dark:border-gray-700">
                  <TabsTrigger 
                    value="taplist" 
                    data-testid="tab-taplist"
                    className="rounded-md sm:rounded-lg md:rounded-xl transition-all duration-300 text-xs sm:text-xs md:text-sm font-medium md:font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/20 data-[state=active]:scale-105 py-1.5 sm:py-2 md:py-3 px-1 sm:px-2 md:px-3 min-w-0 flex items-center justify-center"
                  >
                    <Wine className="mr-0.5 sm:mr-1 md:mr-2 flex-shrink-0" size={12} />
                    <span className="truncate">Taplist</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="bottles" 
                    data-testid="tab-bottles"
                    className="rounded-md sm:rounded-lg md:rounded-xl transition-all duration-300 text-xs sm:text-xs md:text-sm font-medium md:font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/20 data-[state=active]:scale-105 py-1.5 sm:py-2 md:py-3 px-1 sm:px-2 md:px-3 min-w-0 flex items-center justify-center"
                  >
                    <Sparkles className="mr-0.5 sm:mr-1 md:mr-2 flex-shrink-0" size={12} />
                    <span className="truncate">Cantina</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="menu" 
                    data-testid="tab-menu"
                    className="rounded-md sm:rounded-lg md:rounded-xl transition-all duration-300 text-xs sm:text-xs md:text-sm font-medium md:font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/20 data-[state=active]:scale-105 py-1.5 sm:py-2 md:py-3 px-1 sm:px-2 md:px-3 min-w-0 flex items-center justify-center"
                  >
                    <span className="mr-0.5 sm:mr-1 md:mr-2 text-xs sm:text-sm md:text-lg flex-shrink-0">🍽️</span>
                    <span className="truncate">Menù</span>
                  </TabsTrigger>
                </TabsList>

                {/* Taplist Tab */}
                <TabsContent value="taplist" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-display-lg text-gray-900 dark:text-white flex items-center">
                      <Wine className="mr-3 h-6 w-6 text-amber-600" />
                      Taplist
                    </h3>
                    <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200">
                      {Array.isArray(tapList) ? tapList.filter((t: any) => t.isVisible).length : 0} attive
                    </Badge>
                  </div>
                  {tapLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="skeleton rounded-xl h-24"></div>
                      ))}
                    </div>
                  ) : (
                    <TapList 
                      tapList={Array.isArray(tapList) ? tapList : []} 
                    />
                  )}
                </TabsContent>

                {/* Bottles Tab */}
                <TabsContent value="bottles" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-display-lg text-gray-900 dark:text-white flex items-center">
                      <Sparkles className="mr-3 h-6 w-6 text-emerald-600" />
                      Cantina Birre
                    </h3>
                    <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
                      {Array.isArray(bottles) ? bottles.length : 0} disponibili
                    </Badge>
                  </div>
                  
                  {bottlesLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="skeleton rounded-2xl h-48"></div>
                      ))}
                    </div>
                  ) : Array.isArray(bottles) && bottles.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {bottles.map((bottle: any) => (
                        <ModernBeerCard
                          key={bottle.id}
                          beer={bottle.beer}
                          prices={bottle.prices}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <Sparkles className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Nessuna birra in cantina
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400">
                        La cantina è attualmente vuota. Controlla più tardi!
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Menu Tab */}
                <TabsContent value="menu" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-display-lg text-gray-900 dark:text-white flex items-center">
                      <span className="mr-3 text-2xl">🍽️</span>
                      Menu
                    </h3>
                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200">
                      {Array.isArray(menu) ? menu.length : 0} categorie
                    </Badge>
                  </div>
                  
                  {menuLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="skeleton rounded-2xl h-32"></div>
                      ))}
                    </div>
                  ) : (
                    <LuppolinoMenu 
                      menu={Array.isArray(menu) ? menu.filter((category: any) => category.isVisible !== false) : []} 
                    />
                  )}
                </TabsContent>
              </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Information */}
            <Card className="modern-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900 border-b">
                <CardTitle className="flex items-center">
                  <Info className="mr-3 h-5 w-5 text-blue-600" />
                  <span className="text-lg">Informazioni</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Phone */}
                {(pub as any)?.phone && (
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                      <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <a 
                      href={`tel:${(pub as any).phone}`} 
                      className="font-medium text-gray-900 dark:text-white hover:text-primary transition-colors"
                    >
                      {(pub as any).phone}
                    </a>
                  </div>
                )}

                {/* Website */}
                {(pub as any)?.websiteUrl && (
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                      <Globe className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <a 
                      href={(pub as any).websiteUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-gray-900 dark:text-white hover:text-primary transition-colors"
                    >
                      Visita il Sito Web
                    </a>
                  </div>
                )}

                {/* Email */}
                {(pub as any)?.email && (
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
                      <Mail className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                    <a 
                      href={`mailto:${(pub as any).email}`} 
                      className="font-medium text-gray-900 dark:text-white hover:text-primary transition-colors break-all"
                    >
                      {(pub as any).email}
                    </a>
                  </div>
                )}

                {/* Social Media */}
                {((pub as any)?.facebookUrl || (pub as any)?.instagramUrl) && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Seguici</h4>
                    <div className="flex space-x-3">
                      {(pub as any)?.facebookUrl && (
                        <a 
                          href={(pub as any).facebookUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                          title="Facebook"
                        >
                          <Facebook size={16} />
                        </a>
                      )}
                      {(pub as any)?.instagramUrl && (
                        <a 
                          href={(pub as any).instagramUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white transition-colors"
                          title="Instagram"
                        >
                          <Instagram size={16} />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="modern-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900 dark:to-orange-900">
                <CardTitle className="text-lg flex items-center">
                  <TrendingUp className="mr-3 h-5 w-5 text-amber-600" />
                  Azioni Veloci
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <Button 
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-300" 
                  size="sm"
                  onClick={handleShowOpeningHours}
                  data-testid="button-show-hours"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Vedi Orari Completi
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
      
      {/* Opening Hours Dialog */}
      <OpeningHoursDialog 
        open={showOpeningHours}
        onOpenChange={setShowOpeningHours}
        pubName={(pub as any)?.name || ''}
        openingHours={(pub as any)?.openingHours}
      />
    </div>
  );
}