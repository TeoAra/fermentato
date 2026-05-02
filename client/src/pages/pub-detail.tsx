import React, { lazy, Suspense, useState, useMemo, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, Link } from "wouter";
import { GlutenFreeSmallBadge, AlcoholFreeBadge } from "@/components/beer-badges";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Clock, 
  Phone, 
  Globe, 
  Wine, 
  Facebook, 
  Instagram, 
  Settings, 
  Heart,
  Share2,
  Navigation,
  Mail,
  Calendar,
  Info,
  XCircle,
  Sparkles,
  MapPin,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Plus,
  Star,
  X as XIcon,
  Beer as BeerIcon,
} from "lucide-react";
import Footer from "@/components/footer";
import TapList from "@/components/tap-list";
import LuppolinoMenu from "@/components/luppolino-menu";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import OpeningHoursDialog from "@/components/OpeningHoursDialog";
import ImageWithFallback from "@/components/image-with-fallback";
import { PubQRCode } from "@/components/pub-qr-code";
import { EventCategoryBadge, EventShareButtons, EventInterestButton } from "@/components/events-manager";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, isFuture } from "date-fns";
import { it as itLocale } from "date-fns/locale";
import { getMapNavigationUrl } from "@/lib/utils";
import { usePubLiveUpdates } from "@/hooks/usePubLiveUpdates";
import { NextTapVoting } from "@/components/NextTapVoting";

const CheckinModal = lazy(() => import("@/components/checkin-modal"));

type OpenStatus = 'open' | 'closing_soon' | 'opening_soon' | 'closed';

function computeOpenStatus(hours: { open?: string; close?: string; isClosed?: boolean } | null | undefined, currentTime: number): { status: OpenStatus; borderColor: string; bgColor: string } {
  if (!hours || hours.isClosed) return { status: 'closed', borderColor: 'ring-red-500', bgColor: 'bg-red-500' };
  if (hours.open && hours.close) {
    const [openHour, openMin] = hours.open.split(':').map(Number);
    const [closeHour, closeMin] = hours.close.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    const isOpen = closeTime < openTime
      ? (currentTime >= openTime || currentTime <= closeTime)
      : (currentTime >= openTime && currentTime <= closeTime);
    if (isOpen) {
      const minutesToClose = closeTime < openTime
        ? (currentTime >= openTime ? (24 * 60 - currentTime + closeTime) : (closeTime - currentTime))
        : (closeTime - currentTime);
      if (minutesToClose <= 30) return { status: 'closing_soon', borderColor: 'ring-orange-500', bgColor: 'bg-orange-500' };
      return { status: 'open', borderColor: 'ring-green-500', bgColor: 'bg-green-500' };
    } else {
      const minutesToOpen = openTime - currentTime;
      if (minutesToOpen > 0 && minutesToOpen <= 60) return { status: 'opening_soon', borderColor: 'ring-primary', bgColor: 'bg-primary' };
      return { status: 'closed', borderColor: 'ring-red-500', bgColor: 'bg-red-500' };
    }
  }
  return { status: 'open', borderColor: 'ring-green-500', bgColor: 'bg-green-500' };
}

function getOpenStatus(openingHours: any): { status: OpenStatus; borderColor: string; bgColor: string } {
  if (!openingHours) return { status: 'closed', borderColor: 'ring-stone-400', bgColor: 'bg-stone-400' };
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  // Check special days first
  const todayDate = now.toISOString().slice(0, 10);
  const specialDays: any[] = openingHours.specialDays ?? [];
  const specialToday = specialDays.find((s: any) => s.date === todayDate);
  if (specialToday) return computeOpenStatus(specialToday, currentTime);

  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  return computeOpenStatus(openingHours[currentDay], currentTime);
}

function isOpenNow(openingHours: any) {
  const status = getOpenStatus(openingHours);
  return status.status === 'open' || status.status === 'closing_soon';
}

// Beer style → color mapping (more variety, less monochromatic orange)
function getBeerStyleColor(style: string): { bg: string; text: string } {
  const s = style?.toLowerCase() || '';
  if (s.includes('stout') || s.includes('porter')) return { bg: 'rgba(92,61,30,0.14)', text: '#7B4A1E' };
  if (s.includes('sour') || s.includes('gose') || s.includes('lambic') || s.includes('berliner')) return { bg: 'rgba(212,168,56,0.15)', text: '#A8840A' };
  if (s.includes('saison') || s.includes('farmhouse') || s.includes('bière de garde')) return { bg: 'rgba(100,160,70,0.15)', text: '#4E8A28' };
  if (s.includes('wit') || s.includes('weiss') || s.includes('weizen') || s.includes('wheat') || s.includes('farro')) return { bg: 'rgba(212,168,67,0.15)', text: '#9A7820' };
  if (s.includes('lager') || s.includes('pilsner') || s.includes('pils') || s.includes('märzen') || s.includes('marzen') || s.includes('bock')) return { bg: 'rgba(207,168,101,0.15)', text: '#8A6A10' };
  if (s.includes('red') || s.includes('amber') || s.includes('rossa') || s.includes('ambrata')) return { bg: 'rgba(185,60,30,0.14)', text: '#B04020' };
  if (s.includes('barley wine') || s.includes('barleywine') || s.includes('imperial') || s.includes('wee heavy')) return { bg: 'rgba(130,30,80,0.13)', text: '#8A1E55' };
  if (s.includes('apa') || s.includes('pale ale') || s.includes('session')) return { bg: 'rgba(232,140,30,0.14)', text: '#C07010' };
  // IPA and default orange
  return { bg: 'rgba(247,113,4,0.13)', text: '#F77104' };
}

// Modern Beer Card Component
const ModernBeerCard = ({ beer, prices, className = "", onCheckin }: { 
  beer: any; 
  prices?: any[];
  className?: string;
  onCheckin?: () => void;
}) => {
  const { isAuthenticated } = useAuth();
  return (
  <div className={`bg-white dark:bg-card rounded-2xl border border-stone-100 dark:border-border shadow-[0_4px_20px_rgba(247,113,4,0.06)] hover:shadow-[0_6px_24px_rgba(247,113,4,0.12)] hover:border-stone-300 dark:hover:border-orange-800/40 transition-all duration-300 cursor-pointer ${className}`}>
    <div className="flex gap-3 p-4">
      <Link href={`/beer/${beer?.id}`} className="flex-shrink-0 self-center">
        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-stone-50 dark:bg-stone-900/40 flex items-center justify-center border border-stone-200 dark:border-stone-700/30">
          <ImageWithFallback
            src={beer?.imageUrl || beer?.logoUrl || beer?.brewery?.logoUrl}
            alt={beer?.name || 'Beer'}
            imageType="beer"
            containerClassName="w-full h-full"
            className="w-full h-full object-cover"
            iconSize="md"
          />
        </div>
      </Link>

      <div className="flex-1 min-w-0 flex gap-2 justify-between">
        <div className="flex-1 min-w-0">
          <Link href={`/beer/${beer?.id}`}>
            <h3 className="font-bold text-base leading-snug line-clamp-1 hover:text-primary dark:hover:text-orange-400 cursor-pointer transition-colors text-foreground">
              {beer?.name || 'Nome non disponibile'}
            </h3>
          </Link>

          {beer?.brewery?.id ? (
            <Link href={`/brewery/${beer.brewery.id}`}>
              <p className="text-xs font-semibold text-primary dark:text-orange-400 hover:opacity-80 cursor-pointer transition-opacity truncate leading-snug mt-0.5">
                {beer.brewery.name || beer?.breweryName || 'Birrificio'}
              </p>
            </Link>
          ) : beer?.breweryName ? (
            <p className="text-xs text-muted-foreground truncate leading-snug mt-0.5">{beer.breweryName}</p>
          ) : null}

          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {beer?.style && (() => {
              const styleColor = getBeerStyleColor(beer.style);
              return (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: styleColor.bg, color: styleColor.text }}>
                  {beer.style}
                </span>
              );
            })()}
            <span className="text-[10px] font-medium text-muted-foreground">
              {beer?.isAlcoholFree ? '0.0% ABV' : `${beer?.abv || '0'}% ABV`}
            </span>
            {beer?.isGlutenFree && <GlutenFreeSmallBadge size={11} />}
            {beer?.isAlcoholFree && <AlcoholFreeBadge size={10} />}
          </div>
        </div>

        <div className="flex flex-col items-end justify-between gap-1 flex-shrink-0">
          {prices && prices.length > 0 && (
            <div className="text-right">
              <div className="space-y-1">
                {prices.map((price: any, index: number) => (
                  <div key={index}>
                    <div className="text-[10px] text-muted-foreground">
                      {typeof price === 'object' ? (price as any).size : price}
                    </div>
                    <div className="text-base font-black text-foreground">
                      €{typeof price === 'object' ? parseFloat((price as any).price).toFixed(2) : parseFloat(price).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {isAuthenticated && onCheckin && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCheckin(); }}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:text-primary hover:bg-stone-200 dark:hover:bg-stone-700 active:scale-95 transition-all"
              aria-label="Check-in"
              title="Sto bevendo questa"
            >
              <BeerIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
  );
};

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
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-gray-600 dark:text-stone-400 font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground dark:text-stone-400 mt-1">{description}</p>
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
  const [checkinBottle, setCheckinBottle] = useState<any>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [styleFilter, setStyleFilter] = useState('Tutti');
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  // Collapsing header: track scroll position
  useEffect(() => {
    const handler = () => setHeaderCollapsed(window.scrollY > 220);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Fire-and-forget: track pub page view for analytics
  useEffect(() => {
    if (!id) return;
    fetch("/api/analytics/pub-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pubId: id }),
    }).catch(() => {});
  }, [id]);

  // Real-time updates: refresh taplist/menu/bottles when the owner makes changes
  usePubLiveUpdates(id);
  
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
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Single query for full menu (categories + all items) — eliminates N+1
  // staleTime basso per mostrare sempre i dati aggiornati (es. descrizioni prodotti)
  const { data: menuFull = [], isLoading: menuLoading } = useQuery({
    queryKey: ["/api/pubs", id, "menu", "full"],
    queryFn: () => apiRequest(`/api/pubs/${id}/menu/full`),
    enabled: !!id,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const menu = useMemo(() => Array.isArray(menuFull) ? menuFull : [], [menuFull]);

  const { data: bottles, isLoading: bottlesLoading } = useQuery({
    queryKey: ["/api/pubs", id, "bottles"],
    enabled: !!id,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Filtered bottles for cantina tab (depends on `bottles` above)
  const filteredBottles = useMemo(() => {
    if (!Array.isArray(bottles)) return [];
    if (styleFilter === 'Tutti') return bottles;
    const styleMap: Record<string, string[]> = {
      IPA: ['ipa', 'india pale'],
      Stout: ['stout', 'porter'],
      Sour: ['sour', 'gose', 'lambic', 'berliner'],
    };
    if (styleFilter === 'Altro') {
      const mainKeys = ['ipa', 'india pale', 'stout', 'porter', 'sour', 'gose', 'lambic', 'berliner'];
      return (bottles as any[]).filter((b: any) => !mainKeys.some(k => (b.beer?.style || '').toLowerCase().includes(k)));
    }
    const keys = styleMap[styleFilter] || [];
    return (bottles as any[]).filter((b: any) => keys.some(k => (b.beer?.style || '').toLowerCase().includes(k)));
  }, [bottles, styleFilter]);

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

  const isFavorite = (isFavoriteData as any)?.isFavorite || false;

  // Toggle favorite mutation with optimistic UI + undo toast
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
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/favorites", "pub", pubNumericId, "check"] });
      const prev = queryClient.getQueryData(["/api/favorites", "pub", pubNumericId, "check"]);
      queryClient.setQueryData(["/api/favorites", "pub", pubNumericId, "check"], !isFavorite);
      return { prev };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", "pub", pubNumericId, "check"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", "pub", pubNumericId, "count"] });
      if (!isFavorite) {
        toast({
          title: "Pub aggiunto ai preferiti",
          description: "Puoi annullare entro 5 secondi",
          action: (
            <button
              className="text-xs font-semibold text-primary hover:text-primary underline underline-offset-2"
              onClick={() => toggleFavoriteMutation.mutate()}
            >
              Annulla
            </button>
          ) as any,
        });
      }
    },
    onError: (err: any, _v, ctx) => {
      if (ctx?.prev !== undefined) queryClient.setQueryData(["/api/favorites", "pub", pubNumericId, "check"], ctx.prev);
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
      <div className="min-h-screen bg-background">
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
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 mx-auto flex items-center justify-center">
            <XCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Pub non trovato</h2>
          <p className="text-gray-600 dark:text-stone-400">
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
    <div className="min-h-screen bg-background dark:bg-background slide-up">
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
        <link rel="canonical" href={seoUrl} />
        <script type="application/ld+json">{JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://fermenta.to/" },
              { "@type": "ListItem", "position": 2, "name": "Pub", "item": "https://fermenta.to/explore/pubs" },
              ...(pubData?.city ? [{ "@type": "ListItem", "position": 3, "name": pubData.city, "item": `https://fermenta.to/explore/pubs?city=${encodeURIComponent(pubData.city)}` }] : []),
              { "@type": "ListItem", "position": pubData?.city ? 4 : 3, "name": pubData?.name, "item": seoUrl },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "BarOrPub",
            "@id": seoUrl,
            "name": pubData?.name,
            "description": pubData?.description || `${pubData?.name} è un pub con birre artigianali${pubData?.city ? ` a ${pubData.city}` : ""}. Scopri taplist, orari e info su Fermenta.to.`,
            "url": seoUrl,
            "image": seoImage,
            "telephone": pubData?.phone,
            "priceRange": "€€",
            "servesCuisine": "Craft Beer",
            "address": pubData?.address ? {
              "@type": "PostalAddress",
              "streetAddress": pubData.address,
              "addressLocality": pubData.city,
              "addressCountry": "IT",
            } : undefined,
            ...(pubData?.latitude && pubData?.longitude ? {
              "geo": {
                "@type": "GeoCoordinates",
                "latitude": pubData.latitude,
                "longitude": pubData.longitude,
              }
            } : {}),
            ...(pubData?.website ? { "sameAs": [pubData.website] } : {}),
            "openingHoursSpecification": (() => {
              const days: Record<string, string> = { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };
              const hours = pubData?.openingHours;
              if (!hours) return undefined;
              return Object.entries(days).filter(([k]) => hours[k] && !hours[k].isClosed && hours[k].open && hours[k].close).map(([k, dayName]) => ({
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": `https://schema.org/${dayName}`,
                "opens": hours[k].open,
                "closes": hours[k].close,
              }));
            })(),
          }
        ])}</script>
      </Helmet>
      
      {/* ── Compact sticky header (appears when scrolled past hero) ── */}
      {headerCollapsed && (
        <div className="fixed top-14 left-0 right-0 z-30 lg:hidden bg-white/95 dark:bg-[#0F0F10]/95 backdrop-blur-xl border-b border-stone-100 dark:border-white/[0.05] compact-header-enter">
          <div className="flex items-center gap-3 px-4 h-12">
            <Link href="/explore/pubs">
              <button className="p-1.5 -ml-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-white/5 tap-scale">
                <ChevronLeft className="h-5 w-5 text-foreground" />
              </button>
            </Link>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Avatar className="h-7 w-7 rounded-xl flex-shrink-0">
                <AvatarImage src={(pub as any)?.logoUrl} alt={(pub as any)?.name} className="object-cover" />
                <AvatarFallback className="bg-stone-100 dark:bg-stone-800 text-stone-600 text-xs font-bold">
                  {(pub as any)?.name?.[0] || 'P'}
                </AvatarFallback>
              </Avatar>
              <span className="font-bold text-sm text-foreground truncate">{(pub as any)?.name}</span>
              {openStatus.status === 'open' && (
                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500" />
              )}
            </div>
            <button onClick={handleSave} className={`h-8 w-8 rounded-full flex items-center justify-center tap-scale ${isFavorite ? 'text-red-500' : 'text-stone-400'}`}>
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* ── HERO — full-width cover ── */}
      <div className="relative h-72 overflow-hidden bg-stone-900">
        {(pub as any)?.coverImageUrl ? (
          <img src={(pub as any).coverImageUrl} alt="" className="w-full h-full object-cover" />
        ) : (pub as any)?.logoUrl ? (
          <img src={(pub as any).logoUrl} alt="" className="w-full h-full object-cover blur-2xl scale-110 opacity-50" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-stone-800 via-stone-700 to-stone-900" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/35" />

        {/* Back button */}
        <Link href="/explore/pubs" className="absolute top-3 left-4 w-9 h-9 rounded-full bg-black/35 backdrop-blur-md flex items-center justify-center tap-scale">
          <ChevronLeft className="h-5 w-5 text-white" />
        </Link>

        {/* Share + Bookmark + Manage */}
        <div className="absolute top-3 right-4 flex gap-2">
          <button onClick={handleSave} disabled={toggleFavoriteMutation.isPending} data-testid="button-save"
            className="w-9 h-9 rounded-full bg-black/35 backdrop-blur-md flex items-center justify-center tap-scale">
            <Heart className={`h-[18px] w-[18px] ${isFavorite ? 'fill-white text-white' : 'text-white'}`} />
          </button>
          <button onClick={handleShare} data-testid="button-share"
            className="w-9 h-9 rounded-full bg-black/35 backdrop-blur-md flex items-center justify-center tap-scale">
            <Share2 className="h-[18px] w-[18px] text-white" />
          </button>
          {canManage && (
            <Link href={isAdmin ? `/admin/edit-pub/${id}` : "/dashboard"}>
              <button data-testid="button-manage"
                className="w-9 h-9 rounded-full bg-primary/80 backdrop-blur-md flex items-center justify-center tap-scale">
                <Settings className="h-[18px] w-[18px] text-white" />
              </button>
            </Link>
          )}
        </div>

        {/* Bottom info overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          <div className="flex items-end gap-3">
            <button
              className="flex-shrink-0 tap-scale"
              onClick={() => { const s = (pub as any)?.logoUrl; if (s) (window as any).__lightboxOpen?.(s); }}
            >
              <Avatar className="h-[72px] w-[72px] rounded-2xl border-2 border-white/25 shadow-xl bg-stone-800">
                <AvatarImage src={(pub as any)?.logoUrl} alt={(pub as any)?.name} className="object-cover" />
                <AvatarFallback className="bg-stone-700 text-white text-3xl font-bold">
                  {(pub as any)?.name?.[0] || 'P'}
                </AvatarFallback>
              </Avatar>
            </button>
            <div className="flex-1 min-w-0 pb-0.5">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-white leading-tight tracking-tight drop-shadow-sm">
                  {(pub as any)?.name}
                </h1>
                {(pub as any)?.isVerified && (
                  <div title="Pub Verificato" className="flex items-center justify-center bg-emerald-500 rounded-full w-5 h-5 flex-shrink-0">
                    <ShieldCheck className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
              {(pub as any)?.city && (
                <p className="text-sm text-white/70 font-medium mt-0.5">{(pub as any).city}{(pub as any)?.address ? `, ${(pub as any).address.split(',')[0]}` : ''}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Info bar + Actions ── */}
      <div className="bg-white dark:bg-card border-b border-stone-100 dark:border-stone-800 px-4 py-3">
        {/* Status chips row */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleShowOpeningHours} data-testid="button-show-hours"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors tap-scale ${
              openStatus.status === 'open'
                ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                : openStatus.status === 'closing_soon' || openStatus.status === 'opening_soon'
                ? 'bg-primary/8 text-primary border-primary/20'
                : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              openStatus.status === 'open' ? 'bg-green-500' :
              openStatus.status === 'closing_soon' || openStatus.status === 'opening_soon' ? 'bg-primary' : 'bg-red-500'
            }`} />
            {openStatus.status === 'open' && 'Aperto ora'}
            {openStatus.status === 'closing_soon' && 'Sta chiudendo'}
            {openStatus.status === 'opening_soon' && 'Sta per aprire'}
            {openStatus.status === 'closed' && 'Chiuso'}
          </button>

          {Array.isArray(tapList) && tapList.length > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
              <BeerIcon className="h-3.5 w-3.5 text-primary" />
              {tapList.length} spine
            </div>
          )}

          {((favoritesCountData as any)?.count ?? 0) > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700">
              <Heart className="h-3 w-3 text-red-400" />
              {(favoritesCountData as any).count}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3">
          <button onClick={handleSave} disabled={toggleFavoriteMutation.isPending}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-all tap-scale flex-shrink-0 ${
              isFavorite
                ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-500'
                : 'bg-white dark:bg-card border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
            }`}>
            <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
            {isFavorite ? 'Salvato' : 'Salva'}
          </button>

          {(((pub as any)?.latitude && (pub as any)?.longitude) || (pub as any)?.address) && (
            <a href={getMapNavigationUrl((pub as any).name, (pub as any).address)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-card text-stone-600 dark:text-stone-300 text-sm font-semibold tap-scale flex-shrink-0">
              <Navigation className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              Indicazioni
            </a>
          )}

          <button onClick={() => setActiveTab('taplist')}
            className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-xl py-2 text-sm font-bold transition-all tap-scale btn-orange-glow shadow-sm">
            Vedi birre
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto pb-24">
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* ── TABS ── */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="sticky top-14 lg:top-16 z-20 bg-white dark:bg-card border-b border-stone-100 dark:border-stone-700/30">
                  <div className="flex justify-center overflow-x-auto scrollbar-hide px-1">
                    {[
                      { id: 'taplist', label: 'Spina', icon: <Wine className="h-4 w-4 flex-shrink-0" /> },
                      { id: 'bottles', label: 'Cantina', icon: <Sparkles className="h-4 w-4 flex-shrink-0" /> },
                      { id: 'menu', label: 'Menù', icon: <span className="flex-shrink-0 leading-none text-[15px]">🍽️</span> },
                      ...(Array.isArray(pubEvents) && pubEvents.length > 0 ? [{ id: 'events', label: 'Serate', icon: <Calendar className="h-4 w-4 flex-shrink-0" /> }] : []),
                      { id: 'info', label: 'Info', icon: <Info className="h-4 w-4 flex-shrink-0" />, mobileOnly: true },
                    ].map((tab) => {
                      const isTab = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          data-testid={`tab-${tab.id}`}
                          onClick={() => setActiveTab(tab.id)}
                          className={`${tab.mobileOnly ? 'lg:hidden' : ''} flex items-center gap-1.5 px-4 py-3.5 text-sm font-semibold whitespace-nowrap transition-all relative flex-shrink-0 ${
                            isTab
                              ? 'text-primary dark:text-orange-400'
                              : 'text-stone-500 dark:text-stone-400'
                          }`}
                        >
                          {isTab && <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-primary rounded-t-full" />}
                          {tab.icon}
                          {tab.label}
                          {tab.badge && tab.badge > 0 ? (
                            <span className={`text-[10px] font-black min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-[3px] ${isTab ? 'bg-primary/10 text-primary dark:text-orange-400' : 'bg-stone-100 dark:bg-stone-700 text-stone-400'}`}>
                              {tab.badge}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
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
                      pub={pub && (pub as any).id ? { id: (pub as any).id, name: (pub as any).name } : null}
                    />
                  )}
                  {pub && (pub as any).id && (
                    <NextTapVoting pubId={(pub as any).id} isOwner={canManage} />
                  )}
                </TabsContent>

                {/* Bottles Tab */}
                <TabsContent value="bottles" className="pt-0">
                  {/* Filter chips */}
                  <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-stone-100 dark:border-stone-800">
                    {['Tutti', 'IPA', 'Stout', 'Sour', 'Altro'].map(f => (
                      <button key={f} onClick={() => setStyleFilter(f)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all tap-scale ${
                          styleFilter === f
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                        }`}>
                        {f}
                      </button>
                    ))}
                  </div>

                  <div className="px-4 pt-3 pb-1">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {filteredBottles.length} birre disponibili
                    </p>
                  </div>

                  {bottlesLoading ? (
                    <div className="divide-y divide-stone-100 dark:divide-stone-800">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3">
                          <div className="skeleton w-12 h-12 rounded-xl flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="skeleton h-4 w-3/4 rounded" />
                            <div className="skeleton h-3 w-1/2 rounded" />
                          </div>
                          <div className="skeleton w-14 h-8 rounded" />
                          <div className="skeleton w-8 h-8 rounded-full" />
                        </div>
                      ))}
                    </div>
                  ) : filteredBottles.length > 0 ? (
                    <div className="divide-y divide-stone-100 dark:divide-stone-800 tab-enter">
                      {filteredBottles.map((bottle: any) => (
                        <div key={bottle.id} className="flex items-center gap-3 px-4 py-3 tap-scale active:bg-stone-50 dark:active:bg-white/[0.03]">
                          <Link href={`/beer/${bottle.beer?.id}`} className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-50 dark:bg-stone-900 border border-stone-100 dark:border-stone-800">
                              <ImageWithFallback
                                src={bottle.beer?.imageUrl || bottle.beer?.logoUrl}
                                alt={bottle.beer?.name || 'Beer'}
                                imageType="beer"
                                containerClassName="w-full h-full"
                                className="w-full h-full object-cover"
                                iconSize="sm"
                              />
                            </div>
                          </Link>
                          <div className="flex-1 min-w-0">
                            <Link href={`/beer/${bottle.beer?.id}`}>
                              <div className="font-semibold text-sm text-foreground leading-snug line-clamp-1 hover:text-primary transition-colors">{bottle.beer?.name}</div>
                            </Link>
                            <div className="text-xs text-muted-foreground mt-0.5 truncate">
                              {bottle.beer?.brewery?.name || bottle.beer?.breweryName}
                              {bottle.beer?.style && ` · ${bottle.beer.style}`}
                            </div>
                            {bottle.beer?.abv && (
                              <div className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">{bottle.beer.abv}% ABV</div>
                            )}
                          </div>
                          {bottle.prices && bottle.prices.length > 0 && (
                            <div className="flex-shrink-0 text-right space-y-0.5">
                              {bottle.prices.slice(0, 2).map((price: any, i: number) => (
                                <div key={i} className="flex items-center gap-1 justify-end">
                                  <span className="text-[10px] text-muted-foreground">{typeof price === 'object' ? price.size : price}</span>
                                  <span className="text-sm font-black text-foreground">€{typeof price === 'object' ? parseFloat(price.price).toFixed(2) : parseFloat(price).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); if (isAuthenticated) setCheckinBottle(bottle.beer); }}
                            className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/15 text-primary flex items-center justify-center tap-scale">
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 px-4">
                      <Sparkles className="h-12 w-12 text-stone-300 dark:text-stone-600 mx-auto mb-3" />
                      <h4 className="text-base font-semibold text-foreground mb-1">Cantina vuota</h4>
                      <p className="text-sm text-muted-foreground">Nessuna birra disponibile in cantina al momento.</p>
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
                                <h4 className="text-lg font-bold text-foreground">{event.title}</h4>
                              </div>
                              <div className="flex items-center text-sm text-pink-600 dark:text-pink-400 gap-2 mb-2">
                                <Calendar className="h-4 w-4" />
                                <span>{format(new Date(event.eventDate), "EEEE d MMMM yyyy 'alle' HH:mm", { locale: itLocale })}</span>
                              </div>
                              {event.endDate && (
                                <div className="flex items-center text-xs text-muted-foreground gap-2 mb-3">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>fino alle {format(new Date(event.endDate), "HH:mm", { locale: itLocale })}</span>
                                </div>
                              )}
                              {event.description && (
                                <p className="text-gray-600 dark:text-stone-400 text-sm mb-3">{event.description}</p>
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
                <TabsContent value="info" className="lg:hidden pb-8 tab-enter">
                  {/* Map — OpenStreetMap iframe */}
                  {(pub as any)?.latitude && (pub as any)?.longitude ? (
                    <div className="overflow-hidden bg-stone-100 dark:bg-stone-900">
                      <iframe
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${(pub as any).longitude - 0.006},${(pub as any).latitude - 0.004},${(pub as any).longitude + 0.006},${(pub as any).latitude + 0.004}&layer=mapnik&marker=${(pub as any).latitude},${(pub as any).longitude}`}
                        className="w-full border-0"
                        style={{ height: '176px' }}
                        loading="lazy"
                        title="Mappa"
                      />
                    </div>
                  ) : (pub as any)?.address ? (
                    <div className="h-32 bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                      <MapPin className="h-8 w-8 text-stone-400" />
                    </div>
                  ) : null}

                  <div className="px-4 pt-4 space-y-3">
                    {/* Address + Navigation */}
                    {(pub as any)?.address && (
                      <div className="bg-white dark:bg-card rounded-2xl border border-stone-100 dark:border-stone-800 overflow-hidden shadow-sm">
                        <div className="flex items-start gap-3 p-4">
                          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex-shrink-0 mt-0.5">
                            <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground leading-snug">{(pub as any).address}</p>
                            {(pub as any)?.city && <p className="text-xs text-muted-foreground mt-0.5">{(pub as any).city}, Italia</p>}
                          </div>
                        </div>
                        <div className="px-4 pb-4">
                          <a href={getMapNavigationUrl((pub as any).name, (pub as any).address)} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors tap-scale shadow-sm">
                            <Navigation className="h-4 w-4" />
                            Avvia navigazione
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Hours */}
                    <button onClick={handleShowOpeningHours}
                      className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-card border border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-white/5 transition-colors text-left shadow-sm tap-scale">
                      <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex-shrink-0">
                        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">Orari di apertura</p>
                        <p className={`text-xs mt-0.5 font-medium ${openStatus.status === 'open' ? 'text-emerald-600 dark:text-emerald-400' : openStatus.status === 'closing_soon' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                          {openStatus.status === 'open' ? 'Aperto adesso' : openStatus.status === 'closing_soon' ? 'Sta chiudendo' : openStatus.status === 'opening_soon' ? 'Sta per aprire' : 'Chiuso'}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-stone-300 dark:text-stone-600 flex-shrink-0" />
                    </button>

                    {/* Phone */}
                    {(pub as any)?.phone && (
                      <a href={`tel:${(pub as any).phone}`}
                        className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-card border border-stone-100 dark:border-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/10 transition-colors shadow-sm tap-scale">
                        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex-shrink-0">
                          <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-sm font-semibold text-foreground">{(pub as any).phone}</span>
                        <ChevronRight className="h-4 w-4 text-stone-300 dark:text-stone-600 ml-auto flex-shrink-0" />
                      </a>
                    )}

                    {/* Website */}
                    {(pub as any)?.websiteUrl && (
                      <a href={(pub as any).websiteUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-card border border-stone-100 dark:border-stone-800 hover:bg-violet-50 dark:hover:bg-violet-950/10 transition-colors shadow-sm tap-scale">
                        <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/30 flex-shrink-0">
                          <Globe className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <span className="text-sm font-semibold text-foreground">Sito Web</span>
                        <ChevronRight className="h-4 w-4 text-stone-300 dark:text-stone-600 ml-auto flex-shrink-0" />
                      </a>
                    )}

                    {/* Email */}
                    {(pub as any)?.email && (
                      <a href={`mailto:${(pub as any).email}`}
                        className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-card border border-stone-100 dark:border-stone-800 hover:bg-blue-50 dark:hover:bg-blue-950/10 transition-colors shadow-sm tap-scale">
                        <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex-shrink-0">
                          <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-sm font-semibold text-foreground truncate">{(pub as any).email}</span>
                        <ChevronRight className="h-4 w-4 text-stone-300 dark:text-stone-600 ml-auto flex-shrink-0 min-w-[16px]" />
                      </a>
                    )}

                    {/* Social */}
                    {((pub as any)?.instagramUrl || (pub as any)?.facebookUrl) && (
                      <div className="flex gap-3">
                        {(pub as any)?.instagramUrl && (
                          <a href={(pub as any).instagramUrl} target="_blank" rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-sm font-bold transition-all shadow-sm tap-scale">
                            <Instagram size={16} /> Instagram
                          </a>
                        )}
                        {(pub as any)?.facebookUrl && (
                          <a href={(pub as any).facebookUrl} target="_blank" rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors shadow-sm tap-scale">
                            <Facebook size={16} /> Facebook
                          </a>
                        )}
                      </div>
                    )}

                    {/* Description */}
                    {(pub as any)?.description && (
                      <div className="p-4 rounded-2xl bg-white dark:bg-card border border-stone-100 dark:border-stone-800 shadow-sm">
                        <p className="text-sm text-muted-foreground leading-relaxed">{(pub as any).description}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
          </div>

          {/* Sidebar – desktop only */}
          <div className="hidden lg:block space-y-4 pt-4 pl-6 pr-4 sticky top-20 self-start">

            {/* Description */}
            {(pub as any)?.description && (
              <div className="bg-white dark:bg-card rounded-2xl border border-stone-100 dark:border-border shadow-sm p-4">
                <p className="text-sm text-gray-600 dark:text-stone-400 leading-relaxed">{(pub as any).description}</p>
              </div>
            )}

            {/* Orari */}
            <button
              onClick={handleShowOpeningHours}
              data-testid="button-show-hours"
              className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-card rounded-2xl border border-stone-100 dark:border-border shadow-sm hover:border-primary/40 transition-colors text-left"
            >
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex-shrink-0">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Orari di apertura</p>
                <p className={`text-xs mt-0.5 font-medium ${openStatus.status === 'open' ? 'text-emerald-600 dark:text-emerald-400' : openStatus.status === 'closing_soon' ? 'text-amber-600 dark:text-amber-400' : openStatus.status === 'opening_soon' ? 'text-primary dark:text-orange-400' : 'text-red-600 dark:text-red-400'}`}>
                  {openStatus.status === 'open' ? 'Aperto adesso' : openStatus.status === 'closing_soon' ? 'Sta chiudendo' : openStatus.status === 'opening_soon' ? 'Sta per aprire' : 'Chiuso adesso'}
                </p>
              </div>
              <Info className="h-4 w-4 text-stone-400 flex-shrink-0" />
            </button>

            {/* Contatti + Social */}
            <div className="bg-white dark:bg-card rounded-2xl border border-stone-100 dark:border-border shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-700/30">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Contatti</h3>
              </div>
              <div className="p-4 space-y-3">
                {(pub as any)?.address && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex-shrink-0 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">{(pub as any).address}</p>
                      <a
                        href={getMapNavigationUrl((pub as any).name, (pub as any).address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center mt-1.5 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold transition-colors gap-1"
                      >
                        <Navigation className="h-2.5 w-2.5" />
                        Indicazioni
                      </a>
                    </div>
                  </div>
                )}
                {(pub as any)?.phone && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex-shrink-0">
                      <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <a href={`tel:${(pub as any).phone}`} className="text-sm text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                      {(pub as any).phone}
                    </a>
                  </div>
                )}
                {(pub as any)?.websiteUrl && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/30 flex-shrink-0">
                      <Globe className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <a href={(pub as any).websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-foreground hover:text-violet-600 dark:hover:text-violet-400 transition-colors truncate">
                      Sito Web
                    </a>
                  </div>
                )}
                {(pub as any)?.email && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex-shrink-0">
                      <Mail className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <a href={`mailto:${(pub as any).email}`} className="text-sm text-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors break-all">
                      {(pub as any).email}
                    </a>
                  </div>
                )}
                {((pub as any)?.facebookUrl || (pub as any)?.instagramUrl) && (
                  <div className="flex gap-2 pt-1 border-t border-stone-100 dark:border-stone-700/30 mt-1">
                    {(pub as any)?.facebookUrl && (
                      <a href={(pub as any).facebookUrl} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors">
                        <Facebook size={13} /> Facebook
                      </a>
                    )}
                    {(pub as any)?.instagramUrl && (
                      <a href={(pub as any).instagramUrl} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-semibold transition-all">
                        <Instagram size={13} /> Instagram
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* ── FAB: floating action button (mobile only) ── */}
      {isAuthenticated && (
        <div className="fixed bottom-24 right-4 z-40 lg:hidden flex flex-col items-end gap-3">
          {/* Expanded items */}
          {fabOpen && (
            <>
              <div className="flex items-center gap-3 fab-item-enter" style={{ animationDelay: '40ms' }}>
                <span className="bg-black/75 dark:bg-white/15 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-md whitespace-nowrap">
                  Segna bevuta
                </span>
                <button
                  onClick={() => { setFabOpen(false); setCheckinBottle(null); }}
                  className="w-12 h-12 rounded-full bg-white dark:bg-[#1A1A1C] border border-stone-200 dark:border-white/10 shadow-xl flex items-center justify-center tap-scale"
                >
                  <BeerIcon className="h-5 w-5 text-primary" />
                </button>
              </div>
              <div className="flex items-center gap-3 fab-item-enter" style={{ animationDelay: '0ms' }}>
                <span className="bg-black/75 dark:bg-white/15 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-md whitespace-nowrap">
                  Recensisci
                </span>
                <button
                  onClick={() => { setFabOpen(false); setActiveTab('reviews'); }}
                  className="w-12 h-12 rounded-full bg-white dark:bg-[#1A1A1C] border border-stone-200 dark:border-white/10 shadow-xl flex items-center justify-center tap-scale"
                >
                  <Star className="h-5 w-5 text-amber-500" />
                </button>
              </div>
            </>
          )}
          {/* Main + button */}
          <button
            onClick={() => setFabOpen(v => !v)}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 tap-scale btn-orange-glow ${
              fabOpen ? 'bg-stone-800 dark:bg-stone-700 rotate-45' : 'bg-primary'
            }`}
            aria-label={fabOpen ? 'Chiudi' : 'Azioni rapide'}
          >
            {fabOpen
              ? <XIcon className="h-6 w-6 text-white" />
              : <Plus className="h-6 w-6 text-white" />
            }
          </button>
        </div>
      )}

      {/* Cantina Check-in Modal */}
      {checkinBottle && (
        <Suspense fallback={null}>
          <CheckinModal
            open={!!checkinBottle}
            onClose={() => setCheckinBottle(null)}
            beer={{
              id: checkinBottle.id,
              name: checkinBottle.name,
              style: checkinBottle.style,
              breweryName: checkinBottle.brewery?.name || checkinBottle.breweryName,
              imageUrl: checkinBottle.imageUrl,
            }}
            pub={pub ?? null}
            tapType="bottiglia"
          />
        </Suspense>
      )}

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
                    className="w-full h-full object-cover lightbox-img"
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
                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <Clock className="h-4 w-4" />
                    <span>fino alle {format(new Date(selectedEvent.endDate), "HH:mm", { locale: itLocale })}</span>
                  </div>
                )}
                {selectedEvent.description && (
                  <p className="text-foreground whitespace-pre-wrap">{selectedEvent.description}</p>
                )}
                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Condividi questo evento</p>
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