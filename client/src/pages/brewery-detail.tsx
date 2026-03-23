import { Helmet } from "react-helmet-async";
import { RichTextDisplay } from "@/components/rich-text-editor";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Star, 
  MapPin, 
  Beer, 
  Globe, 
  ArrowLeft, 
  Heart, 
  Share2, 
  Building,
  Award,
  Sparkles,
  Factory,
  Target,
  Pencil,
  Save,
  X,
  CalendarDays,
  Calendar,
  Clock,
  Lightbulb,
  ShieldCheck,
  Megaphone,
  Newspaper,
  Rocket,
  Users,
  Store,
  Building2,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { EventCategoryBadge, EventInterestButton } from "@/components/events-manager";
import { format, isFuture } from "date-fns";
import { it as itLocale } from "date-fns/locale";
import Footer from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import ImageWithFallback from "@/components/image-with-fallback";
import { ImageUpload } from "@/components/image-upload";
import SuggestChangeDialog from "@/components/SuggestChangeDialog";
import AddressAutocomplete from "@/components/address-autocomplete";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Brewery {
  id: number;
  name: string;
  location: string;
  region?: string;
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  websiteUrl?: string;
}

interface Beer {
  id: number;
  name: string;
  style: string;
  abv?: string;
  ibu?: number;
  description?: string;
  imageUrl?: string;
  avgRating?: number | null;
  reviewCount?: number;
  favoriteCount?: number;
  isCollaboration?: boolean;
  isCollabBeer?: boolean;
  breweryId?: number;
  collaboratingBreweries?: { id: number; name: string; logoUrl: string | null }[];
}

// Stats Card Component
const BreweryStatsCard = ({ icon: Icon, value, label, gradient }: any) => (
  <div className="glass-card rounded-xl p-4 hover:scale-105 transition-all duration-300 group">
    <div className="flex items-center space-x-3">
      <div className={`p-3 rounded-lg bg-gradient-to-br ${gradient} group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{label}</p>
      </div>
    </div>
  </div>
);

export default function BreweryDetail() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("birre");
  const [visibleCount, setVisibleCount] = useState(9);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    if (!node) return;
    observerRef.current = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) setVisibleCount(c => c + 9); },
      { rootMargin: '200px' }
    );
    observerRef.current.observe(node);
  }, []);
  const [activeStyleFilter, setActiveStyleFilter] = useState<string>("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSuggestDialogOpen, setIsSuggestDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    location: '',
    region: '',
    description: '',
    logoUrl: '',
    coverImageUrl: '',
    websiteUrl: '',
  });
  
  const isAdmin = (user as any)?.activeRole === 'admin' || (!((user as any)?.activeRole) && user?.userType === 'admin');

  
  const { data: brewery, isLoading: breweryLoading } = useQuery<Brewery>({
    queryKey: ["/api/breweries", id],
    enabled: !!id,
  });
  
  const updateBreweryMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      return apiRequest(`/api/admin/breweries/${id}`, { method: 'PATCH' }, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/breweries", id] });
      setIsEditDialogOpen(false);
      toast({ title: "Birrificio aggiornato con successo" });
    },
    onError: () => {
      toast({ title: "Errore nell'aggiornamento", variant: "destructive" });
    },
  });
  
  const openEditDialog = () => {
    if (brewery) {
      setEditForm({
        name: brewery.name || '',
        location: brewery.location || '',
        region: brewery.region || '',
        description: brewery.description || '',
        logoUrl: brewery.logoUrl || '',
        coverImageUrl: brewery.coverImageUrl || '',
        websiteUrl: brewery.websiteUrl || '',
      });
      setIsEditDialogOpen(true);
    }
  };
  
  const handleSaveEdit = () => {
    const updates: Record<string, any> = {
      name: editForm.name,
      location: editForm.location,
      region: editForm.region || null,
      description: editForm.description || null,
      logoUrl: editForm.logoUrl || null,
      coverImageUrl: editForm.coverImageUrl || null,
      websiteUrl: editForm.websiteUrl || null,
    };
    updateBreweryMutation.mutate(updates);
  };

  const { data: beers = [], isLoading: beersLoading } = useQuery<Beer[]>({
    queryKey: ["/api/breweries", id, "beers"],
    enabled: !!id,
  });

  const { data: userTastings = [] } = useQuery<any[]>({
    queryKey: ["/api/user/beer-tastings"],
    enabled: isAuthenticated,
  });

  const isBeerTasted = useCallback((beerId: number) =>
    Array.isArray(userTastings) && userTastings.some((t: any) => t.beerId === beerId),
  [userTastings]);

  const beerStyles = useMemo(() => {
    const styles = Array.from(new Set((beers as any[]).map((b: any) => b.style).filter(Boolean))) as string[];
    return styles.slice(0, 10);
  }, [beers]);

  const { data: breweryEvents = [] } = useQuery<any[]>({
    queryKey: ["/api/breweries", id, "events"],
    enabled: !!id,
  });

  const { data: announcements = [] } = useQuery<any[]>({
    queryKey: ["/api/breweries", id, "announcements"],
    enabled: !!id,
    staleTime: 3 * 60_000,
  });

  const { data: distribution = [] } = useQuery<any[]>({
    queryKey: ["/api/breweries", id, "distribution"],
    enabled: !!id,
    staleTime: 5 * 60_000,
  });

  const { data: breweryRating } = useQuery<{ avgRating: number | null; reviewCount: number }>({
    queryKey: ["/api/breweries", id, "rating"],
    enabled: !!id,
  });

  // Brewery favorites count (public)
  const { data: breweryFavoritesCount } = useQuery<{ count: string }>({
    queryKey: ["/api/favorites", "brewery", id, "count"],
    queryFn: () => fetch(`/api/favorites/brewery/${id}/count`).then(r => r.json()),
    enabled: !!id,
  });
  const favCount = breweryFavoritesCount ? parseInt(String(breweryFavoritesCount.count)) : 0;

  // Check if brewery is favorited
  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  const isBreweryFavorited = Array.isArray(favorites) && favorites.some((fav: any) => 
    fav.itemType === 'brewery' && fav.itemId === parseInt(id || '0')
  );

  const isBeerFavorited = useCallback((beerId: number) =>
    Array.isArray(favorites) && favorites.some((f: any) => f.itemType === 'beer' && f.itemId === beerId),
  [favorites]);

  // Favorite mutation with optimistic UI + undo toast
  const favoriteMutation = useMutation({
    mutationFn: async ({ itemType, itemId, action }: { itemType: string, itemId: number, action: 'add' | 'remove' }) => {
      if (action === 'add') {
        return apiRequest('/api/favorites', { method: 'POST' }, { itemType, itemId });
      } else {
        return apiRequest(`/api/favorites/${itemType}/${itemId}`, { method: 'DELETE' });
      }
    },
    onMutate: async ({ itemType, itemId, action }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/favorites"] });
      const prev = queryClient.getQueryData(["/api/favorites"]);
      queryClient.setQueryData(["/api/favorites"], (old: any[]) => {
        if (action === 'add') return [...(old || []), { itemType, itemId }];
        return (old || []).filter((f: any) => !(f.itemType === itemType && f.itemId === itemId));
      });
      return { prev };
    },
    onSuccess: (_, { itemType, itemId, action }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      if (action === 'add') {
        toast({
          title: "Aggiunto ai preferiti",
          description: "Puoi annullare entro 5 secondi",
          action: (
            <button
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 underline underline-offset-2"
              onClick={() => favoriteMutation.mutate({ itemType, itemId, action: 'remove' })}
            >
              Annulla
            </button>
          ) as any,
        });
      }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["/api/favorites"], ctx.prev);
      toast({ title: "Errore", description: "Non è stato possibile aggiornare i favoriti", variant: "destructive" });
    },
  });

  const hideBeerMutation = useMutation({
    mutationFn: async (beerId: number) =>
      apiRequest(`/api/admin/beers/${beerId}/toggle-visibility`, { method: 'PATCH' }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/breweries/${id}/beers`] });
      toast({
        title: data.isHidden ? "Birra nascosta" : "Birra visibile",
        description: data.isHidden
          ? "La birra non è più visibile al pubblico"
          : "La birra è ora visibile al pubblico",
      });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile cambiare la visibilità", variant: "destructive" });
    },
  });

  const handleFavoriteToggle = () => {
    if (!isAuthenticated) {
      toast({
        title: "⚠️ Accesso richiesto",
        description: "Effettua l'accesso per aggiungere ai favoriti",
        variant: "destructive",
      });
      return;
    }

    favoriteMutation.mutate({
      itemType: 'brewery',
      itemId: parseInt(id || '0'),
      action: isBreweryFavorited ? 'remove' : 'add'
    });
  };

  const handleShare = async () => {
    const breweryName = brewery?.name || 'Birrificio';
    const currentUrl = window.location.href;
    
    const shareData = {
      title: `${breweryName} - Fermenta.to`,
      text: `Scopri ${breweryName} su Fermenta.to`,
      url: currentUrl,
    };

    try {
      if (navigator.share && typeof navigator.share === 'function') {
        let canShare = true;
        try {
          if (navigator.canShare && typeof navigator.canShare === 'function') {
            canShare = navigator.canShare(shareData);
          }
        } catch (e) {
          canShare = true;
        }

        if (canShare) {
          await navigator.share(shareData);
          toast({ title: "🎉 Condiviso con successo!" });
          return;
        }
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl);
        toast({ title: "📋 Link copiato negli appunti!" });
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.warn('Share failed:', error);
    }
  };

  if (breweryLoading) {
    return (
      <div className="min-h-screen bg-[hsl(38,14%,97%)] dark:bg-[hsl(25,14%,7%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            <div className="skeleton rounded-2xl h-80 md:h-96"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton rounded-xl h-20"></div>
              ))}
            </div>
            <div className="skeleton rounded-2xl h-96"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!brewery) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 mx-auto flex items-center justify-center">
            <Building className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Birrificio non trovato</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Il birrificio che stai cercando non esiste o è stato rimosso.
          </p>
          <Button asChild>
            <Link href="/">Torna alla Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const filteredBeers = activeStyleFilter ? (beers as any[]).filter((b: any) => b.style === activeStyleFilter) : (beers as any[]);
  const displayedBeers = filteredBeers.slice(0, visibleCount);

  const seoTitle = brewery?.name ? `${brewery.name} — Birrificio Artigianale | Fermenta.to` : "Fermenta.to";
  const seoDesc = (brewery as any)?.description
    ? (brewery as any).description.slice(0, 155)
    : brewery?.name
    ? `Scopri tutte le birre artigianali di ${brewery.name} su Fermenta.to: stili, ABV, dove trovarle.`
    : "Fermenta.to — La piattaforma per gli amanti della birra artigianale.";
  const seoImage = brewery?.coverImageUrl || brewery?.logoUrl;
  const seoUrl = `https://fermenta.to/brewery/${id}`;

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
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Brewery",
          "name": brewery?.name,
          "description": (brewery as any)?.description,
          "url": seoUrl,
          "image": seoImage,
        })}</script>
      </Helmet>
      
      {/* ── HERO ── compact, image-first */}
      <div className="relative h-[220px] sm:h-[280px] md:h-[340px] overflow-hidden">
        {brewery?.coverImageUrl ? (
          <img
            src={brewery.coverImageUrl}
            alt={`${brewery?.name} - Copertina`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-700 via-amber-600 to-orange-500 dark:from-amber-900 dark:via-amber-800 dark:to-orange-700" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 flex items-end gap-3">
          <Avatar className="h-14 w-14 sm:h-16 sm:w-16 ring-2 ring-white/40 flex-shrink-0 bg-white shadow-lg">
            <AvatarImage src={brewery?.logoUrl} alt={brewery?.name} className="object-contain p-1" />
            <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-xl font-bold">
              {brewery?.name?.[0] || 'B'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl md:text-3xl text-white font-bold leading-tight drop-shadow-md">
                {brewery?.name}
              </h1>
              {(brewery as any)?.hasOwner && (
                <div title="Birrificio Verificato" className="flex items-center justify-center bg-emerald-600 border border-emerald-500 rounded-full w-6 h-6 shadow-sm flex-shrink-0">
                  <ShieldCheck className="h-3.5 w-3.5 text-white" />
                </div>
              )}
              {favCount > 0 && (
                <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-2 py-0.5 flex-shrink-0">
                  <Heart className="h-3 w-3 text-red-300 fill-current" />
                  <span className="text-white text-xs font-semibold leading-none">{favCount}</span>
                </div>
              )}
            </div>
            {(brewery?.location) && (
              <p className="text-white/80 text-sm mt-0.5 flex items-center gap-1">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                {brewery.location}{brewery.region ? ` (${brewery.region})` : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── INFO BAR ── */}
      <div className="bg-white dark:bg-[hsl(25,14%,10%)] border-b border-gray-100 dark:border-gray-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-3">
          {/* Info pills */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {beers.length > 0 && (
              <button
                onClick={() => setActiveTab('birre')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"
              >
                <Beer className="h-3.5 w-3.5" />
                {beers.length} birre
              </button>
            )}
            {breweryRating?.avgRating && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
                <Star className="h-3.5 w-3.5 fill-current" />
                {breweryRating.avgRating.toFixed(1)}
                <span className="font-normal opacity-70 text-xs">({breweryRating.reviewCount})</span>
              </span>
            )}
            {brewery?.location && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(brewery.name + ' ' + brewery.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
              >
                <MapPin className="h-3.5 w-3.5" />
                {brewery.location}
              </a>
            )}
          </div>
          {/* Action buttons – centered */}
          <div className="flex items-center gap-2 justify-center">
            <button
              onClick={handleFavoriteToggle}
              disabled={favoriteMutation.isPending}
              title={isBreweryFavorited ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
              data-testid="button-favorite"
              className={`h-9 w-9 flex items-center justify-center rounded-full border transition-all ${
                isBreweryFavorited
                  ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-500'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-red-200 hover:text-red-400'
              }`}
            >
              <Heart className={`h-4 w-4 ${isBreweryFavorited ? 'fill-current' : ''}`} />
            </button>
            {brewery?.websiteUrl && (
              <a
                href={brewery.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Sito web"
                className="h-9 w-9 flex items-center justify-center rounded-full border bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
              >
                <Globe className="h-4 w-4" />
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
            {isAdmin && (
              <button
                onClick={openEditDialog}
                title="Modifica birrificio"
                data-testid="button-admin-edit-brewery"
                className="h-9 w-9 flex items-center justify-center rounded-full border bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {isAuthenticated && !isAdmin && (
              <button
                onClick={() => setIsSuggestDialogOpen(true)}
                title="Suggerisci modifica"
                data-testid="button-suggest-change"
                className="h-9 w-9 flex items-center justify-center rounded-full border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 transition-colors"
              >
                <Lightbulb className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto pb-12">
        {/* ── TABS ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="z-10 bg-[hsl(38,14%,97%)] dark:bg-[hsl(25,14%,7%)] border-b border-gray-200 dark:border-gray-800">
            <TabsList className="flex w-full h-auto bg-transparent p-0 rounded-none shadow-none border-none overflow-x-auto scrollbar-hide">
              <TabsTrigger
                value="birre"
                className="relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap rounded-none bg-transparent border-none shadow-none transition-colors text-gray-400 dark:text-gray-500 data-[state=active]:text-[hsl(35,90%,40%)] dark:data-[state=active]:text-[hsl(38,88%,56%)] data-[state=active]:shadow-none data-[state=active]:bg-transparent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-[hsl(35,90%,42%)] after:opacity-0 data-[state=active]:after:opacity-100 after:transition-opacity"
              >
                <Beer className="h-3.5 w-3.5 flex-shrink-0" />
                Birre
                {beers.length > 0 && <span className="text-[10px] font-bold opacity-60">{beers.length}</span>}
              </TabsTrigger>
              <TabsTrigger
                value="info"
                className="relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap rounded-none bg-transparent border-none shadow-none transition-colors text-gray-400 dark:text-gray-500 data-[state=active]:text-[hsl(35,90%,40%)] dark:data-[state=active]:text-[hsl(38,88%,56%)] data-[state=active]:shadow-none data-[state=active]:bg-transparent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-[hsl(35,90%,42%)] after:opacity-0 data-[state=active]:after:opacity-100 after:transition-opacity"
              >
                <Building className="h-3.5 w-3.5 flex-shrink-0" />
                Info
              </TabsTrigger>
              {(breweryEvents.length > 0 || announcements.length > 0) && (
                <TabsTrigger
                  value="serate"
                  className="relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap rounded-none bg-transparent border-none shadow-none transition-colors text-gray-400 dark:text-gray-500 data-[state=active]:text-[hsl(35,90%,40%)] dark:data-[state=active]:text-[hsl(38,88%,56%)] data-[state=active]:shadow-none data-[state=active]:bg-transparent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-[hsl(35,90%,42%)] after:opacity-0 data-[state=active]:after:opacity-100 after:transition-opacity"
                >
                  <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
                  Serate
                  {breweryEvents.length > 0 && <span className="text-[10px] font-bold opacity-60">{breweryEvents.length}</span>}
                </TabsTrigger>
              )}
              {distribution.length > 0 && (
                <TabsTrigger
                  value="distribuzione"
                  className="relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap rounded-none bg-transparent border-none shadow-none transition-colors text-gray-400 dark:text-gray-500 data-[state=active]:text-[hsl(35,90%,40%)] dark:data-[state=active]:text-[hsl(38,88%,56%)] data-[state=active]:shadow-none data-[state=active]:bg-transparent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-[hsl(35,90%,42%)] after:opacity-0 data-[state=active]:after:opacity-100 after:transition-opacity"
                >
                  <Store className="h-3.5 w-3.5 flex-shrink-0" />
                  Dove trovarci
                  <span className="text-[10px] font-bold opacity-60">{distribution.length}</span>
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* ── TAB: BIRRE ── */}
          <TabsContent value="birre" className="px-4 lg:px-6 pt-6 pb-8">
        {/* Beers Section */}
        <div className="">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl mr-3">
                <Beer className="h-6 w-6 text-white" />
              </div>
              Birre ({beers.length})
            </h2>
          </div>
          
          {beersLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton h-48 rounded-xl"></div>
              ))}
            </div>
          ) : beers.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Beer className="h-10 w-10 text-gray-400 dark:text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Nessuna birra disponibile
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Questo birrificio non ha ancora birre nel catalogo.
              </p>
            </div>
          ) : (
            <>
              {beerStyles.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  <button
                    onClick={() => { setActiveStyleFilter(""); setVisibleCount(9); }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${activeStyleFilter === "" ? "bg-amber-500 text-white shadow" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"}`}
                  >
                    Tutte
                  </button>
                  {beerStyles.map(style => (
                    <button
                      key={style}
                      onClick={() => { setActiveStyleFilter(style!); setVisibleCount(9); }}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${activeStyleFilter === style ? "bg-amber-500 text-white shadow" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"}`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedBeers.map((beer: Beer) => (
                  <Link key={beer.id} href={`/beer/${beer.id}`}>
                    <Card className={`glass-card border-0 h-full hover:scale-105 transition-all duration-300 group cursor-pointer relative ${beer.isCollaboration ? 'ring-1 ring-purple-300 dark:ring-purple-700' : ''} ${(beer as any).isHidden ? 'opacity-50 grayscale' : ''}`}>
                      {/* Admin: nascondi/mostra birra */}
                      {isAdmin && (
                        <button
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            hideBeerMutation.mutate(beer.id);
                          }}
                          disabled={hideBeerMutation.isPending}
                          title={(beer as any).isHidden ? "Rendi visibile" : "Nascondi birra"}
                          className={`absolute top-3 left-3 z-20 h-7 w-7 flex items-center justify-center rounded-full shadow border transition-all hover:scale-110 ${(beer as any).isHidden ? 'bg-gray-800 border-gray-600 text-gray-300' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'}`}
                        >
                          {(beer as any).isHidden
                            ? <Eye className="h-3.5 w-3.5" />
                            : <EyeOff className="h-3.5 w-3.5" />
                          }
                        </button>
                      )}
                      {/* Admin hidden label */}
                      {isAdmin && (beer as any).isHidden && (
                        <div className="absolute top-3 left-12 z-20 flex items-center gap-1 bg-gray-800/90 text-gray-300 text-xs font-semibold px-2 py-0.5 rounded-full shadow">
                          <EyeOff className="h-3 w-3" />
                          Nascosta
                        </div>
                      )}
                      {/* Collaboration badge top-left — includes partner name */}
                      {beer.isCollaboration && (
                        <div className={`absolute top-3 z-10 flex items-center gap-1 bg-purple-100 dark:bg-purple-900/70 text-purple-700 dark:text-purple-300 text-xs font-semibold px-2 py-0.5 rounded-full shadow ${isAdmin ? 'left-12' : 'left-3'}`} onClick={e => e.preventDefault()}>
                          <Users className="h-3 w-3 flex-shrink-0" />
                          <span>Collab</span>
                          {beer.collaboratingBreweries && beer.collaboratingBreweries.length > 0 && (
                            <>
                              <span className="opacity-50 mx-0.5">·</span>
                              {beer.collaboratingBreweries.map((b, i) => (
                                <span key={b.id} className="inline-flex items-center gap-0.5">
                                  {i > 0 && <span className="opacity-50 mx-0.5">×</span>}
                                  <Link href={`/brewery/${b.id}`}>
                                    <span className="hover:underline cursor-pointer">{b.name}</span>
                                  </Link>
                                </span>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                      {/* "Già assaggiata" badge — bottom-left to avoid collab overlap */}
                      {isBeerTasted(beer.id) && (
                        <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1 bg-emerald-500/90 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow">
                          <CheckCircle className="h-3 w-3" />
                          Assaggiata
                        </div>
                      )}
                      {/* Rating badge top-right */}
                      {beer.avgRating != null && (
                        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-yellow-400/95 dark:bg-yellow-500/95 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full shadow">
                          <Star className="h-3 w-3 fill-yellow-900" />
                          {beer.avgRating.toFixed(2)}
                          {beer.reviewCount && beer.reviewCount > 0 && (
                            <span className="ml-0.5 opacity-70 font-normal">({beer.reviewCount})</span>
                          )}
                        </div>
                      )}
                      {/* Quick favorite button */}
                      <button
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!isAuthenticated) {
                            toast({ title: "Accesso richiesto", description: "Effettua l'accesso per aggiungere ai preferiti", variant: "destructive" });
                            return;
                          }
                          favoriteMutation.mutate({ itemType: 'beer', itemId: beer.id, action: isBeerFavorited(beer.id) ? 'remove' : 'add' });
                        }}
                        className={`absolute bottom-3 right-3 z-10 h-8 w-8 flex items-center justify-center rounded-full shadow border transition-all hover:scale-110 ${isBeerFavorited(beer.id) ? 'bg-red-50 border-red-200 dark:bg-red-900/40 dark:border-red-800' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}
                      >
                        <Heart className={`h-4 w-4 transition-colors ${isBeerFavorited(beer.id) ? 'fill-red-500 text-red-500' : 'text-gray-300 dark:text-gray-600'}`} />
                      </button>
                      <CardContent className="p-6">
                        <div className={`flex items-start space-x-4 mb-4 ${beer.isCollaboration ? 'mt-4' : ''}`}>
                          <ImageWithFallback
                            src={beer?.imageUrl}
                            alt={beer?.name}
                            imageType="beer"
                            containerClassName="w-16 h-16 rounded-xl"
                            className="w-16 h-16 object-cover rounded-xl"
                            iconSize="lg"
                          />
                          <div className="flex-1 min-w-0 pr-8">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-1 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-amber-500 group-hover:to-orange-600 group-hover:bg-clip-text transition-all">
                              {beer.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {beer.style}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          {beer.abv && (
                            <Badge variant="outline" className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 border-orange-200 text-orange-800 dark:text-orange-200">
                              <Target className="h-3 w-3 mr-1" />
                              {beer.abv}% ABV
                            </Badge>
                          )}
                          {beer.ibu && (
                            <Badge variant="outline" className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 text-blue-800 dark:text-blue-200">
                              <Sparkles className="h-3 w-3 mr-1" />
                              {beer.ibu} IBU
                            </Badge>
                          )}
                        </div>
                        
                        
                        {beer.description && (
                          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                            {beer.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
              
              {visibleCount < filteredBeers.length && (
                <div ref={sentinelRef} className="flex justify-center items-center py-8 mt-2">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full bg-amber-300 dark:bg-amber-700 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
          </TabsContent>

          {/* ── TAB: INFO ── */}
          <TabsContent value="info" className="px-4 lg:px-6 pt-6 pb-8 space-y-6">
            {((brewery as any)?.descriptionHtml || brewery?.description) && (
              <div className="bg-white dark:bg-[hsl(25,14%,10%)] rounded-xl p-5 border border-gray-100 dark:border-gray-800">
                <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Building className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Il Birrificio
                </h2>
                {(brewery as any)?.descriptionHtml ? (
                  <RichTextDisplay html={(brewery as any).descriptionHtml} />
                ) : (
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line text-sm">
                    {brewery.description}
                  </p>
                )}
              </div>
            )}
            {breweryRating?.avgRating && (
              <div className="bg-white dark:bg-[hsl(25,14%,10%)] rounded-xl p-5 border border-gray-100 dark:border-gray-800 flex items-center gap-3">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{breweryRating.avgRating.toFixed(1)} <span className="text-yellow-500">★</span></p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{breweryRating.reviewCount} {breweryRating.reviewCount === 1 ? 'recensione' : 'recensioni'}</p>
                </div>
              </div>
            )}
            {brewery?.websiteUrl && (
              <a
                href={brewery.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-4 bg-white dark:bg-[hsl(25,14%,10%)] rounded-xl border border-gray-100 dark:border-gray-800 text-indigo-600 dark:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors group"
              >
                <Globe className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium truncate group-hover:underline">{brewery.websiteUrl}</span>
              </a>
            )}
            {brewery?.location && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(brewery.name + ' ' + brewery.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-4 bg-white dark:bg-[hsl(25,14%,10%)] rounded-xl border border-gray-100 dark:border-gray-800 text-blue-600 dark:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-colors"
              >
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium">{brewery.location}{brewery.region ? ` (${brewery.region})` : ''} — Cerca su Maps</span>
              </a>
            )}
          </TabsContent>

          {/* ── TAB: SERATE ── */}
          {(breweryEvents.length > 0 || announcements.length > 0) && (
            <TabsContent value="serate" className="px-4 lg:px-6 pt-6 pb-8 space-y-6">
              {breweryEvents.length > 0 && (
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    Prossimi eventi
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {breweryEvents.filter(e => isFuture(new Date(e.eventDate))).slice(0, 4).map((event: any) => (
                      <Card key={event.id} className="overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-[hsl(25,14%,10%)] shadow-none">
                        {event.imageUrl && (
                          <div className="h-36 bg-cover bg-center" style={{ backgroundImage: `url(${event.imageUrl})` }} />
                        )}
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <EventCategoryBadge category={event.category} />
                            <h4 className="font-semibold text-gray-900 dark:text-white">{event.title}</h4>
                          </div>
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 gap-1 mb-1">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>{format(new Date(event.eventDate), "d MMMM yyyy 'alle' HH:mm", { locale: itLocale })}</span>
                          </div>
                          {event.endDate && (
                            <div className="flex items-center text-xs text-gray-500 gap-1 mb-1">
                              <Clock className="h-3 w-3 shrink-0" />
                              <span>fino alle {format(new Date(event.endDate), "HH:mm", { locale: itLocale })}</span>
                            </div>
                          )}
                          {event.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1 mb-2">{event.description}</p>
                          )}
                          <EventInterestButton eventId={event.id} type="brewery" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              {announcements.length > 0 && (
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    Annunci & Uscite
                  </h2>
                  <div className="space-y-3">
                    {announcements.slice(0, 5).map((ann: any) => {
                      const typeMap: Record<string, { label: string; color: string; Icon: any }> = {
                        news: { label: "Novità", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", Icon: Newspaper },
                        release: { label: "Nuova Birra", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", Icon: Rocket },
                        collab: { label: "Collaborazione", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", Icon: Users },
                      };
                      const t = typeMap[ann.type] ?? typeMap.news;
                      return (
                        <div key={ann.id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[hsl(25,14%,10%)]">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${t.color}`}>
                              <t.Icon className="w-3 h-3" />{t.label}
                            </span>
                            {ann.releaseDate && (
                              <span className="text-xs text-gray-500">Uscita: {new Date(ann.releaseDate).toLocaleDateString("it-IT")}</span>
                            )}
                            <span className="text-xs text-gray-400 ml-auto">{new Date(ann.createdAt).toLocaleDateString("it-IT")}</span>
                          </div>
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">{ann.title}</p>
                          {ann.content && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{ann.content}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>
          )}

          {/* ── TAB: DISTRIBUZIONE ── */}
          {distribution.length > 0 && (
            <TabsContent value="distribuzione" className="px-4 lg:px-6 pt-6 pb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {distribution.map((pub: any) => (
                  <Link key={pub.id} href={`/pub/${pub.id}`}>
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[hsl(25,14%,10%)] hover:border-amber-300 dark:hover:border-amber-700 transition-colors cursor-pointer group">
                      {pub.logo_url ? (
                        <img src={pub.logo_url} alt={pub.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                          <Store className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400">{pub.name}</p>
                        {(pub.city || pub.region) && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            <MapPin className="w-3 h-3 inline mr-0.5" />
                            {[pub.city, pub.region].filter(Boolean).join(", ")}
                          </p>
                        )}
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                          {pub.beer_count} {Number(pub.beer_count) === 1 ? "birra" : "birre"} in spina
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </TabsContent>
          )}

        </Tabs>
      </main>

      {/* Admin Edit Dialog - modal={false} allows Google Maps dropdown to receive clicks */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} modal={false}>
        <DialogContent 
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('.pac-container')) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('.pac-container')) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Modifica Birrificio
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Nome del birrificio"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location">Località</Label>
                <AddressAutocomplete
                  value={editForm.location}
                  onChange={(address, city, region) => {
                    setEditForm({ 
                      ...editForm, 
                      location: address,
                      region: region || editForm.region
                    });
                  }}
                  placeholder="Cerca via, luogo, attività..."
                  searchType="all"
                  countryRestriction={null}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrizione</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Descrizione del birrificio..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ImageUpload
                label="Logo Birrificio"
                description="Logo del birrificio"
                currentImageUrl={editForm.logoUrl || undefined}
                onImageChange={(url) => setEditForm({ ...editForm, logoUrl: url || '' })}
                folder="brewery-logos"
                aspectRatio="square"
                maxSize={5}
                recommendedDimensions="300x300px"
              />
              <ImageUpload
                label="Immagine di Copertina"
                description="Immagine principale del birrificio"
                currentImageUrl={editForm.coverImageUrl || undefined}
                onImageChange={(url) => setEditForm({ ...editForm, coverImageUrl: url || '' })}
                folder="brewery-covers"
                aspectRatio="landscape"
                maxSize={5}
                recommendedDimensions="1200x600px"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Annulla
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateBreweryMutation.isPending}
                className="bg-gradient-to-r from-amber-500 to-orange-600 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateBreweryMutation.isPending ? 'Salvataggio...' : 'Salva'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suggest Change Dialog */}
      {brewery && (
        <SuggestChangeDialog
          open={isSuggestDialogOpen}
          onOpenChange={setIsSuggestDialogOpen}
          type="brewery"
          itemId={brewery.id}
          currentData={{
            name: brewery.name,
            location: brewery.location,
            region: brewery.region ?? null,
            description: brewery.description ?? null,
            websiteUrl: brewery.websiteUrl ?? null,
            logoUrl: brewery.logoUrl ?? null,
            coverImageUrl: brewery.coverImageUrl ?? null,
          }}
        />
      )}

      <Footer />
    </div>
  );
}
