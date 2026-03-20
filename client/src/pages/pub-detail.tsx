import React from "react";
import { Helmet } from "react-helmet-async";
import { useParams, Link } from "wouter";
import { GlutenFreeSmallBadge, AlcoholFreeBadge } from "@/components/beer-badges";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
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
  Monitor,
  MapPin,
  ShieldCheck,
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
import { PubQRCode } from "@/components/pub-qr-code";
import { MenuPdfDownload } from "@/components/menu-pdf-download";
import { EventCategoryBadge, EventShareButtons, EventInterestButton } from "@/components/events-manager";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, isFuture } from "date-fns";
import { it as itLocale } from "date-fns/locale";
import { getMapNavigationUrl } from "@/lib/utils";

type OpenStatus = 'open' | 'closing_soon' | 'opening_soon' | 'closed';

function getOpenStatus(openingHours: any): { status: OpenStatus; borderColor: string; bgColor: string } {
  if (!openingHours) return { status: 'closed', borderColor: 'ring-gray-400', bgColor: 'bg-gray-400' };
  
  const now = new Date();
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const todayHours = openingHours[currentDay];
  if (!todayHours || todayHours.isClosed) {
    return { status: 'closed', borderColor: 'ring-red-500', bgColor: 'bg-red-500' };
  }
  
  if (todayHours.open && todayHours.close) {
    const [openHour, openMin] = todayHours.open.split(':').map(Number);
    const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    
    const isOpen = closeTime < openTime 
      ? (currentTime >= openTime || currentTime <= closeTime)
      : (currentTime >= openTime && currentTime <= closeTime);
    
    if (isOpen) {
      const minutesToClose = closeTime < openTime 
        ? (currentTime >= openTime ? (24 * 60 - currentTime + closeTime) : (closeTime - currentTime))
        : (closeTime - currentTime);
      
      if (minutesToClose <= 30) {
        return { status: 'closing_soon', borderColor: 'ring-orange-500', bgColor: 'bg-orange-500' };
      }
      return { status: 'open', borderColor: 'ring-green-500', bgColor: 'bg-green-500' };
    } else {
      const minutesToOpen = openTime - currentTime;
      if (minutesToOpen > 0 && minutesToOpen <= 60) {
        return { status: 'opening_soon', borderColor: 'ring-blue-500', bgColor: 'bg-blue-500' };
      }
      return { status: 'closed', borderColor: 'ring-red-500', bgColor: 'bg-red-500' };
    }
  }
  
  return { status: 'open', borderColor: 'ring-green-500', bgColor: 'bg-green-500' };
}

function isOpenNow(openingHours: any) {
  const status = getOpenStatus(openingHours);
  return status.status === 'open' || status.status === 'closing_soon';
}

// Modern Beer Card Component
const ModernBeerCard = ({ beer, prices, className = "" }: { 
  beer: any; 
  prices?: any[];
  className?: string;
}) => (
  <Card className={`overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4 border-l-emerald-500 bg-white dark:bg-gray-800 ${className}`}>
    <div className="flex gap-3 p-4">
      <ImageWithFallback
        src={beer?.imageUrl || beer?.brewery?.logoUrl}
        alt={beer?.name || 'Beer'}
        imageType="beer"
        containerClassName="w-14 h-14 rounded-xl flex-shrink-0 self-center"
        className="w-14 h-14 rounded-xl object-cover"
        iconSize="md"
      />

      <div className="flex-1 min-w-0 flex gap-2 justify-between">
        <div className="flex-1 min-w-0">
          <Link href={`/beer/${beer?.id}`}>
            <h3 className="font-bold text-base leading-snug line-clamp-1 hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer transition-colors text-gray-900 dark:text-white">
              {beer?.name || 'Nome non disponibile'}
            </h3>
          </Link>

          {beer?.brewery?.id ? (
            <Link href={`/brewery/${beer.brewery.id}`}>
              <p className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 cursor-pointer transition-colors truncate leading-snug mt-0.5">
                {beer.brewery.name || beer?.breweryName || 'Birrificio'}
              </p>
            </Link>
          ) : beer?.breweryName ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate leading-snug mt-0.5">{beer.breweryName}</p>
          ) : null}

          <p className="text-xs text-gray-500 dark:text-gray-400 truncate leading-snug mt-0.5">
            {beer?.style || 'Stile N/D'}
          </p>

          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {beer?.isAlcoholFree ? '0.0% ABV' : `${beer?.abv || '0'}% ABV`}
            </span>
            {beer?.isGlutenFree && <GlutenFreeSmallBadge size={11} />}
            {beer?.isAlcoholFree && <AlcoholFreeBadge size={10} />}
          </div>

          {beer?.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-1.5 line-clamp-2">
              {beer.description}
            </p>
          )}
        </div>

        {prices && prices.length > 0 && (
          <div className="flex-shrink-0 text-right self-center">
            <div className="space-y-1.5">
              {prices.map((price: any, index: number) => (
                <div key={index}>
                  <div className="text-xs text-gray-400 dark:text-gray-400">
                    {typeof price === 'object' ? (price as any).size : price}
                  </div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    €{typeof price === 'object' ? parseFloat((price as any).price).toFixed(2) : parseFloat(price).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
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
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
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
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Fire-and-forget: track pub page view for analytics
  useEffect(() => {
    if (!id) return;
    fetch("/api/analytics/pub-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pubId: id }),
    }).catch(() => {});
  }, [id]);
  
  const { data: pub, isLoading: pubLoading } = useQuery({
    queryKey: ["/api/pubs", id],
    enabled: !!id,
    staleTime: 3 * 60_000,
  });

  // Check if the current user is the owner of this pub or an admin
  const isOwner = isAuthenticated && user && pub && (user as any).id === (pub as any).ownerId;
  const isAdmin = isAuthenticated && user && ((user as any).activeRole === 'admin' || (!((user as any).activeRole) && (user as any).userType === 'admin'));
  const canManage = isOwner || isAdmin;

  const { data: tapList, isLoading: tapLoading } = useQuery({
    queryKey: ["/api/pubs", id, "taplist"],
    enabled: !!id,
    staleTime: 2 * 60_000,
  });

  // Single query for full menu (categories + all items) — eliminates N+1
  const { data: menuFull = [], isLoading: menuLoading } = useQuery({
    queryKey: ["/api/pubs", id, "menu", "full"],
    queryFn: () => apiRequest(`/api/pubs/${id}/menu/full`),
    enabled: !!id,
    staleTime: 5 * 60_000,
  });

  const menu = useMemo(() => Array.isArray(menuFull) ? menuFull : [], [menuFull]);

  const { data: bottles, isLoading: bottlesLoading } = useQuery({
    queryKey: ["/api/pubs", id, "bottles"],
    enabled: !!id,
    staleTime: 3 * 60_000,
  });

  const { data: pubEvents = [] } = useQuery({
    queryKey: [`/api/pubs/${id}/events`],
    enabled: !!id,
    staleTime: 2 * 60_000,
  });

  // Auto-open event from shared link (?event=N) and switch to Events tab
  useEffect(() => {
    if (!Array.isArray(pubEvents) || pubEvents.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("event");
    if (eventId) {
      const found = pubEvents.find((e: any) => String(e.id) === eventId);
      if (found) {
        setActiveTab("events");
        setSelectedEvent(found);
      }
    }
  }, [pubEvents]);

  const pubNumericId = (pub as any)?.id;

  const { data: favoritesCountData, isLoading: favoritesCountLoading } = useQuery({
    queryKey: ["/api/favorites", "pub", pubNumericId, "count"],
    enabled: !!pubNumericId,
    staleTime: 60_000,
  });

  // Check if current pub is in user's favorites
  const { data: isFavoriteData } = useQuery({
    queryKey: ["/api/favorites", "pub", pubNumericId, "check"],
    enabled: !!pubNumericId && isAuthenticated,
    staleTime: 60_000,
  });

  const isFavorite = isFavoriteData?.isFavorite || false;

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorite) {
        return apiRequest(`/api/favorites/pub/${pubNumericId}`, { method: "DELETE" });
      } else {
        return apiRequest("/api/favorites", { method: "POST" }, { 
          itemType: "pub", 
          itemId: pubNumericId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", "pub", pubNumericId, "check"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", "pub", pubNumericId, "count"] });
      
      toast({
        title: isFavorite ? "Rimosso dai preferiti" : "Aggiunto ai preferiti",
        description: isFavorite 
          ? "Il pub è stato rimosso dai tuoi preferiti" 
          : "Il pub è stato aggiunto ai tuoi preferiti",
      });
    },
    onError: (err: any) => {
      if (err?.status === 401 || err?.message?.includes("401") || err?.message?.includes("autenticato")) {
        toast({ title: "Accedi per salvare", description: "Effettua il login per gestire i preferiti." });
      } else {
        toast({ title: "Errore", description: "Impossibile aggiornare i preferiti", variant: "destructive" });
      }
    },
  });

  // Enhanced share functionality with better mobile support
  const handleShare = async () => {
    const pubName = (pub as any)?.name || 'Pub';
    const currentUrl = window.location.href;
    
    const shareData = {
      title: `${pubName} - Fermenta.to`,
      text: `Scopri ${pubName} su Fermenta.to - Birre alla spina, cantina e menu`,
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
      <div className="min-h-screen bg-[hsl(38,14%,97%)] dark:bg-[hsl(25,14%,7%)]">
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
  const openStatus = getOpenStatus((pub as any)?.openingHours);

  // Quick Actions Handlers
  const handleShowOpeningHours = () => {
    setShowOpeningHours(true);
  };


  const pubData = pub as any;
  const seoTitle = pubData?.name ? `${pubData.name} — Taplist & Birre Artigianali | Fermenta.to` : "Fermenta.to";
  const seoDesc = pubData?.description
    ? pubData.description.slice(0, 155)
    : pubData?.name
    ? `Scopri la taplist aggiornata di ${pubData.name}, le birre artigianali alla spina, il menù e gli orari di apertura su Fermenta.to.`
    : "Fermenta.to — La piattaforma per gli amanti della birra artigianale.";
  const seoImage = pubData?.coverImageUrl || pubData?.logoUrl;
  const seoUrl = `https://fermenta.to/pub/${id}`;

  return (
    <div className="min-h-screen bg-[hsl(38,14%,97%)] dark:bg-[hsl(25,14%,7%)]">
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDesc} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDesc} />
        <meta property="og:url" content={seoUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Fermenta.to" />
        {seoImage && <meta property="og:image" content={seoImage} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDesc} />
        {seoImage && <meta name="twitter:image" content={seoImage} />}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BarOrPub",
          "name": pubData?.name,
          "description": pubData?.description,
          "url": seoUrl,
          "image": seoImage,
          "address": pubData?.address ? { "@type": "PostalAddress", "streetAddress": pubData.address, "addressCountry": "IT" } : undefined,
          "telephone": pubData?.phone,
        })}</script>
      </Helmet>
      
      {/* ── HERO ── compact, image-first */}
      <div className="relative h-[220px] sm:h-[280px] md:h-[340px] overflow-hidden">
        <img
          src={(pub as any)?.coverImageUrl || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=600"}
          alt={`${(pub as any)?.name} - Copertina`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        {/* Pub name + logo anchored to bottom-left of image */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 flex items-end gap-3">
          <Avatar className={`h-14 w-14 sm:h-16 sm:w-16 ring-2 ${openStatus.borderColor} flex-shrink-0 bg-white shadow-lg`}>
            <AvatarImage src={(pub as any)?.logoUrl} alt={(pub as any)?.name} className="object-contain p-1" />
            <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-xl font-bold">
              {(pub as any)?.name?.[0] || 'P'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl md:text-3xl text-white font-bold leading-tight drop-shadow-md">
                {(pub as any)?.name}
              </h1>
              {(pub as any)?.isVerified && (
                <div title="Pub Verificato" className="flex items-center justify-center bg-emerald-600 border border-emerald-500 rounded-full w-6 h-6 shadow-sm flex-shrink-0">
                  <ShieldCheck className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </div>
            {(pub as any)?.city && (
              <p className="text-white/80 text-sm mt-0.5 flex items-center gap-1">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                {(pub as any).city}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── INFO BAR ── the most important info, always visible */}
      <div className="bg-white dark:bg-[hsl(25,14%,10%)] border-b border-gray-100 dark:border-gray-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          {/* Left: open status + tap count */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Open status pill */}
            <button
              onClick={handleShowOpeningHours}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                openStatus.status === 'open'
                  ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                  : openStatus.status === 'closing_soon'
                  ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : openStatus.status === 'opening_soon'
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                  : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
              }`}
              data-testid="button-show-hours"
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                openStatus.status === 'open' ? 'bg-green-500' :
                openStatus.status === 'closing_soon' ? 'bg-amber-500' :
                openStatus.status === 'opening_soon' ? 'bg-blue-500' : 'bg-red-500'
              }`} />
              {openStatus.status === 'open' && 'Aperto'}
              {openStatus.status === 'closing_soon' && 'Sta chiudendo'}
              {openStatus.status === 'opening_soon' && 'Sta per aprire'}
              {openStatus.status === 'closed' && 'Chiuso'}
              {!(pub as any)?.isActive && ' · Temporaneamente chiuso'}
              <Clock className="h-3 w-3 opacity-60" />
            </button>

            {/* Tap count pill */}
            {Array.isArray(tapList) && tapList.filter((t: any) => t.isActive).length > 0 && (
              <button
                onClick={() => setActiveTab('taplist')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"
              >
                <Wine className="h-3.5 w-3.5" />
                {tapList.filter((t: any) => t.isActive).length} alla spina
              </button>
            )}

            {/* Favorites count */}
            {(favoritesCountData as any)?.count > 0 && (
              <span className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <Heart className="h-3.5 w-3.5 text-red-400 fill-current" />
                {(favoritesCountData as any).count}
              </span>
            )}
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleSave}
              disabled={toggleFavoriteMutation.isPending}
              title={isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
              data-testid="button-save"
              className={`h-9 w-9 flex items-center justify-center rounded-full border transition-all ${
                isFavorite
                  ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-500'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-red-200 hover:text-red-400'
              }`}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>

            {(((pub as any)?.latitude && (pub as any)?.longitude) || (pub as any)?.address) && (
              <a
                href={getMapNavigationUrl((pub as any).name, (pub as any).address)}
                target="_blank"
                rel="noopener noreferrer"
                title="Avvia navigazione"
                className="h-9 w-9 flex items-center justify-center rounded-full border bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
              >
                <Navigation className="h-4 w-4" />
              </a>
            )}

            {(pub as any)?.phone && (
              <a
                href={`tel:${(pub as any).phone}`}
                title="Chiama"
                className="h-9 w-9 flex items-center justify-center rounded-full border bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900 transition-colors"
              >
                <Phone className="h-4 w-4" />
              </a>
            )}

            <button
              onClick={handleShare}
              title="Condividi"
              data-testid="button-share"
              className="h-9 w-9 flex items-center justify-center rounded-full border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 transition-colors"
            >
              <Share2 className="h-4 w-4" />
            </button>

            {canManage && (
              <Link href={isAdmin ? `/admin/edit-pub/${id}` : "/dashboard"}>
                <button
                  title="Gestisci pub"
                  data-testid="button-manage"
                  className="h-9 w-9 flex items-center justify-center rounded-full border bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto pb-12">
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* ── TABS ── sticky, named for humans, counts visible */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="sticky top-16 lg:top-[68px] z-30 bg-[hsl(38,14%,97%)] dark:bg-[hsl(25,14%,7%)] pt-3 pb-2 px-4 lg:px-0 border-b border-gray-100 dark:border-gray-800">
                <TabsList className={`grid w-full h-auto bg-white dark:bg-gray-900 rounded-xl p-1 shadow-sm border border-gray-200 dark:border-gray-700 ${
                  (Array.isArray(pubEvents) && pubEvents.length > 0) ? 'grid-cols-5 lg:grid-cols-4' : 'grid-cols-4 lg:grid-cols-3'
                }`}>
                  <TabsTrigger 
                    value="taplist" 
                    data-testid="tab-taplist"
                    className="rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-sm py-2 px-1 sm:px-2 min-w-0 flex items-center justify-center gap-1"
                  >
                    <Wine className="flex-shrink-0 h-3.5 w-3.5" />
                    <span className="truncate">Spina</span>
                    {Array.isArray(tapList) && tapList.filter((t: any) => t.isActive).length > 0 && (
                      <span className="hidden sm:inline text-[10px] font-bold opacity-80">
                        ({tapList.filter((t: any) => t.isActive).length})
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="bottles" 
                    data-testid="tab-bottles"
                    className="rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-sm py-2 px-1 sm:px-2 min-w-0 flex items-center justify-center gap-1"
                  >
                    <Sparkles className="flex-shrink-0 h-3.5 w-3.5" />
                    <span className="truncate">Cantina</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="menu" 
                    data-testid="tab-menu"
                    className="rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-sm py-2 px-1 sm:px-2 min-w-0 flex items-center justify-center gap-1"
                  >
                    <span className="text-sm flex-shrink-0">🍽️</span>
                    <span className="truncate">Menù</span>
                  </TabsTrigger>
                  {Array.isArray(pubEvents) && pubEvents.length > 0 && (
                    <TabsTrigger 
                      value="events" 
                      data-testid="tab-events"
                      className="rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 data-[state=active]:bg-pink-500 data-[state=active]:text-white data-[state=active]:shadow-sm py-2 px-1 sm:px-2 min-w-0 flex items-center justify-center gap-1"
                    >
                      <Calendar className="flex-shrink-0 h-3.5 w-3.5" />
                      <span className="truncate">Serate</span>
                    </TabsTrigger>
                  )}
                  {/* Info tab: visible on mobile, hidden on desktop (sidebar is there) */}
                  <TabsTrigger 
                    value="info" 
                    data-testid="tab-info"
                    className="lg:hidden rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 data-[state=active]:bg-gray-700 data-[state=active]:text-white data-[state=active]:shadow-sm py-2 px-1 sm:px-2 min-w-0 flex items-center justify-center gap-1"
                  >
                    <Info className="flex-shrink-0 h-3.5 w-3.5" />
                    <span className="truncate">Info</span>
                  </TabsTrigger>
                </TabsList>
                </div>

                {/* Taplist Tab */}
                <TabsContent value="taplist" className="px-4 lg:px-0 pt-4 space-y-4">
                  {tapLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="skeleton rounded-xl h-20"></div>
                      ))}
                    </div>
                  ) : (
                    <TapList 
                      tapList={Array.isArray(tapList) ? tapList : []} 
                    />
                  )}
                </TabsContent>

                {/* Bottles Tab */}
                <TabsContent value="bottles" className="px-4 lg:px-0 pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      {Array.isArray(bottles) ? bottles.length : 0} birre disponibili
                    </p>
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
                <TabsContent value="menu" className="px-4 lg:px-0 pt-4 space-y-3">
                  
                  {menuLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="skeleton rounded-xl h-12"></div>
                      ))}
                    </div>
                  ) : (
                    <LuppolinoMenu 
                      menu={Array.isArray(menu) ? menu.filter((category: any) => category.isVisible !== false) : []} 
                      menuInfoBox={(pub as any)?.menuInfoBox}
                    />
                  )}
                </TabsContent>

                {/* Events Tab */}
                <TabsContent value="events" className="px-4 lg:px-0 pt-4 space-y-4">
                  <div className="space-y-4">
                    {Array.isArray(pubEvents) && pubEvents.filter((e: any) => isFuture(new Date(e.eventDate))).map((event: any) => (
                      <Card key={event.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedEvent(event)}>
                        {event.imageUrl && (
                          <div className="h-40 bg-cover bg-center relative" style={{ backgroundImage: `url(${event.imageUrl})` }}>
                            <div className="absolute top-2 left-2">
                              <EventCategoryBadge category={event.category} />
                            </div>
                          </div>
                        )}
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                {!event.imageUrl && <EventCategoryBadge category={event.category} />}
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white">{event.title}</h4>
                              </div>
                              <div className="flex items-center text-sm text-pink-600 dark:text-pink-400 gap-2 mb-2">
                                <Calendar className="h-4 w-4" />
                                <span>{format(new Date(event.eventDate), "EEEE d MMMM yyyy 'alle' HH:mm", { locale: itLocale })}</span>
                              </div>
                              {event.endDate && (
                                <div className="flex items-center text-xs text-gray-500 gap-2 mb-3">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>fino alle {format(new Date(event.endDate), "HH:mm", { locale: itLocale })}</span>
                                </div>
                              )}
                              {event.description && (
                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{event.description}</p>
                              )}
                              <div className="flex items-center gap-2 flex-wrap">
                                <EventShareButtons event={event} pubId={(pub as any).id} />
                                <EventInterestButton eventId={event.id} type="pub" />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Info Tab – only shown on mobile; desktop uses sidebar */}
                <TabsContent value="info" className="lg:hidden px-4 pt-4 pb-8 space-y-5">
                  {/* Address */}
                  {(pub as any)?.address && (
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex-shrink-0">
                        <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{(pub as any).address}</p>
                        <a
                          href={getMapNavigationUrl((pub as any).name, (pub as any).address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center mt-2 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold transition-colors gap-1.5"
                        >
                          <Navigation className="h-3 w-3" />
                          Avvia navigazione
                        </a>
                      </div>
                    </div>
                  )}
                  {/* Hours */}
                  <button
                    onClick={handleShowOpeningHours}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-left"
                  >
                    <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex-shrink-0">
                      <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Orari di apertura</p>
                      <p className={`text-xs mt-0.5 font-medium ${openStatus.status === 'open' ? 'text-green-600' : openStatus.status === 'closing_soon' ? 'text-amber-600' : 'text-red-600'}`}>
                        {openStatus.status === 'open' ? 'Aperto adesso' : openStatus.status === 'closing_soon' ? 'Sta chiudendo' : openStatus.status === 'opening_soon' ? 'Sta per aprire' : 'Chiuso'}
                      </p>
                    </div>
                    <Info className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </button>
                  {/* Phone */}
                  {(pub as any)?.phone && (
                    <a href={`tel:${(pub as any).phone}`} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 transition-colors">
                      <div className="p-2.5 rounded-xl bg-green-100 dark:bg-green-900/40 flex-shrink-0">
                        <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{(pub as any).phone}</span>
                    </a>
                  )}
                  {/* Website */}
                  {(pub as any)?.websiteUrl && (
                    <a href={(pub as any).websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
                      <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex-shrink-0">
                        <Globe className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">Sito Web</span>
                    </a>
                  )}
                  {/* Email */}
                  {(pub as any)?.email && (
                    <a href={`mailto:${(pub as any).email}`} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700 transition-colors">
                      <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/40 flex-shrink-0">
                        <Mail className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{(pub as any).email}</span>
                    </a>
                  )}
                  {/* Social */}
                  {((pub as any)?.facebookUrl || (pub as any)?.instagramUrl) && (
                    <div className="flex gap-3">
                      {(pub as any)?.facebookUrl && (
                        <a href={(pub as any).facebookUrl} target="_blank" rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors">
                          <Facebook size={16} /> Facebook
                        </a>
                      )}
                      {(pub as any)?.instagramUrl && (
                        <a href={(pub as any).instagramUrl} target="_blank" rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold transition-colors">
                          <Instagram size={16} /> Instagram
                        </a>
                      )}
                    </div>
                  )}
                  {/* Description */}
                  {(pub as any)?.description && (
                    <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{(pub as any).description}</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
          </div>

          {/* Sidebar – desktop only */}
          <div className="hidden lg:block space-y-5 pt-4 pl-6 pr-4 sticky top-[136px] self-start">
            {/* Contact Information */}
            <Card className="modern-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900 border-b">
                <CardTitle className="flex items-center">
                  <Info className="mr-3 h-5 w-5 text-blue-600" />
                  <span className="text-lg">Informazioni</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Address with Maps button */}
                {(pub as any)?.address && (
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900 flex-shrink-0">
                      <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{(pub as any).address}</p>
                      <a
                        href={getMapNavigationUrl((pub as any).name, (pub as any).address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center mt-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold transition-colors gap-1.5"
                      >
                        <Navigation className="h-3 w-3" />
                        Avvia navigazione
                      </a>
                    </div>
                  </div>
                )}

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

            {/* Opening Hours Button */}
            <Button 
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-300 rounded-xl shadow-lg" 
              size="lg"
              onClick={handleShowOpeningHours}
              data-testid="button-show-hours"
            >
              <Clock className="h-5 w-5 mr-2" />
              Vedi Orari Completi
            </Button>
          </div>
        </div>
      </main>

      <Footer />
      
      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => { if (!open) setSelectedEvent(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
          {selectedEvent && (
            <>
              {selectedEvent.imageUrl && (
                <div className="relative h-48 sm:h-56">
                  <img 
                    src={selectedEvent.imageUrl} 
                    alt={selectedEvent.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <EventCategoryBadge category={selectedEvent.category} />
                  </div>
                </div>
              )}
              <div className="p-6 space-y-4">
                <DialogHeader>
                  <div className="flex items-center gap-2 flex-wrap">
                    {!selectedEvent.imageUrl && <EventCategoryBadge category={selectedEvent.category} />}
                    <DialogTitle className="text-xl">{selectedEvent.title}</DialogTitle>
                  </div>
                </DialogHeader>
                <div className="flex items-center text-sm text-pink-600 dark:text-pink-400 gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(selectedEvent.eventDate), "EEEE d MMMM yyyy 'alle' HH:mm", { locale: itLocale })}</span>
                </div>
                {selectedEvent.endDate && (
                  <div className="flex items-center text-sm text-gray-500 gap-2">
                    <Clock className="h-4 w-4" />
                    <span>fino alle {format(new Date(selectedEvent.endDate), "HH:mm", { locale: itLocale })}</span>
                  </div>
                )}
                {selectedEvent.description && (
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedEvent.description}</p>
                )}
                <div className="pt-3 border-t">
                  <p className="text-xs text-gray-500 mb-2">Condividi questo evento</p>
                  <EventShareButtons event={selectedEvent} pubId={(pub as any).id} size="default" />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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