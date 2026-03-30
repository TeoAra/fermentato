import { Helmet } from "react-helmet-async";
import RichTextEditor, { RichTextDisplay } from "@/components/rich-text-editor";
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
  Mail,
  Phone,
  Settings,
} from "lucide-react";
import { SiInstagram, SiFacebook, SiTiktok } from "react-icons/si";
import { EventCategoryBadge, EventInterestButton } from "@/components/events-manager";
import { format, isFuture } from "date-fns";
import { it as itLocale } from "date-fns/locale";
import Footer from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect, useCallback, useMemo } from "react";
import ImageWithFallback from "@/components/image-with-fallback";
import { ImageUpload } from "@/components/image-upload";
import SuggestChangeDialog from "@/components/SuggestChangeDialog";
import AddressAutocomplete from "@/components/address-autocomplete";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function getBeerStyleColor(style: string): { bg: string; text: string } {
  const s = style?.toLowerCase() || '';
  if (s.includes('stout') || s.includes('porter')) return { bg: 'rgba(92,61,30,0.12)', text: '#7B4A1E' };
  if (s.includes('sour') || s.includes('gose') || s.includes('lambic') || s.includes('berliner')) return { bg: 'rgba(212,168,56,0.14)', text: '#A8840A' };
  if (s.includes('saison') || s.includes('farmhouse') || s.includes('bière de garde')) return { bg: 'rgba(100,160,70,0.12)', text: '#4E8A28' };
  if (s.includes('wit') || s.includes('weiss') || s.includes('weizen') || s.includes('wheat') || s.includes('farro')) return { bg: 'rgba(210,165,65,0.13)', text: '#9A7820' };
  if (s.includes('lager') || s.includes('pilsner') || s.includes('pils') || s.includes('märzen') || s.includes('marzen') || s.includes('bock')) return { bg: 'rgba(205,165,100,0.13)', text: '#8A6A10' };
  if (s.includes('red') || s.includes('amber') || s.includes('rossa') || s.includes('ambrata')) return { bg: 'rgba(185,60,30,0.12)', text: '#B04020' };
  if (s.includes('barley wine') || s.includes('barleywine') || s.includes('rye wine') || s.includes('imperial') || s.includes('wee heavy')) return { bg: 'rgba(130,30,80,0.11)', text: '#8A1E55' };
  if (s.includes('bitter') || s.includes('apa') || s.includes('pale ale') || s.includes('session')) return { bg: 'rgba(232,140,30,0.12)', text: '#C07010' };
  return { bg: 'rgba(247,113,4,0.11)', text: '#F77104' };
}

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
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
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
  const [activeStyleFilter, setActiveStyleFilter] = useState<string>("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSuggestDialogOpen, setIsSuggestDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    location: '',
    region: '',
    description: '',
    descriptionHtml: '',
    logoUrl: '',
    coverImageUrl: '',
    websiteUrl: '',
    email: '',
    phone: '',
    vatNumber: '',
    instagramUrl: '',
    facebookUrl: '',
    tiktokUrl: '',
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
        descriptionHtml: (brewery as any).descriptionHtml || '',
        logoUrl: brewery.logoUrl || '',
        coverImageUrl: brewery.coverImageUrl || '',
        websiteUrl: brewery.websiteUrl || '',
        email: (brewery as any).email || '',
        phone: (brewery as any).phone || '',
        vatNumber: (brewery as any).vatNumber || '',
        instagramUrl: (brewery as any).instagramUrl || '',
        facebookUrl: (brewery as any).facebookUrl || '',
        tiktokUrl: (brewery as any).tiktokUrl || '',
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
      descriptionHtml: editForm.descriptionHtml || null,
      logoUrl: editForm.logoUrl || null,
      coverImageUrl: editForm.coverImageUrl || null,
      websiteUrl: editForm.websiteUrl || null,
      email: editForm.email || null,
      phone: editForm.phone || null,
      vatNumber: editForm.vatNumber || null,
      instagramUrl: editForm.instagramUrl || null,
      facebookUrl: editForm.facebookUrl || null,
      tiktokUrl: editForm.tiktokUrl || null,
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
              className="text-xs font-semibold text-primary dark:text-orange-400 hover:text-primary dark:text-orange-400 underline underline-offset-2"
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
        <div className="min-h-screen bg-background">
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 mx-auto flex items-center justify-center">
            <Building className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Birrificio non trovato</h2>
          <p className="text-muted-foreground">
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
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Brewery",
          "name": brewery?.name,
          "description": (brewery as any)?.description,
          "url": seoUrl,
          "image": seoImage,
        })}</script>
      </Helmet>
      
      {/* ── HERO — iOS Settings style ── */}
        <div className="bg-white dark:bg-[hsl(25,14%,10%)] border-b border-stone-100 dark:border-stone-700/30 px-4 py-4">
          <div className="max-w-7xl mx-auto flex items-start gap-4">

            {/* Logo — tap to expand */}
            <button
              className="flex-shrink-0 active:scale-95 transition-transform"
              onClick={() => {
                const src = brewery?.logoUrl;
                if (src) { (window as any).__lightboxOpen?.(src); }
              }}
              aria-label="Espandi logo"
            >
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm bg-stone-50 dark:bg-stone-800 overflow-hidden">
                <AvatarImage src={brewery?.logoUrl} alt={brewery?.name} className="object-contain p-1" />
                <AvatarFallback className="bg-stone-100 dark:bg-stone-700 text-stone-500 text-3xl font-bold rounded-2xl">
                  {brewery?.name?.[0] || 'B'}
                </AvatarFallback>
              </Avatar>
            </button>

            {/* Info */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white leading-tight">
                      {brewery?.name}
                    </h1>
                    {(brewery as any)?.hasOwner && (
                      <div title="Birrificio Verificato" className="flex items-center justify-center bg-emerald-600 rounded-full w-5 h-5 flex-shrink-0">
                        <ShieldCheck className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  {brewery?.location && (
                    <p className="text-sm text-stone-500 dark:text-stone-400">
                      {brewery.location}{brewery.region ? ` · ${brewery.region}` : ''}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {beers.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 px-2 py-0.5 rounded-full">
                        <Beer className="h-3 w-3" />
                        {beers.length} {beers.length === 1 ? 'Birra' : 'Birre'}
                      </span>
                    )}
                    {breweryRating?.avgRating && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">
                        <Star className="h-3 w-3 fill-current" />
                        {breweryRating.avgRating.toFixed(1)}
                        <span className="font-normal opacity-70">({breweryRating.reviewCount})</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={handleFavoriteToggle}
                    disabled={favoriteMutation.isPending}
                    className={`h-9 w-9 flex items-center justify-center rounded-full transition-all ${
                      isBreweryFavorited
                        ? 'bg-red-50 dark:bg-red-950/40 text-red-500'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-red-500'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${isBreweryFavorited ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={handleShare}
                    className="h-9 w-9 flex items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  {isAdmin && (
                    <Link href={`/admin/edit-brewery/${id}`}>
                      <button className="h-9 w-9 flex items-center justify-center rounded-full text-white bg-primary hover:bg-primary/90 transition-all shadow-sm">
                        <Settings className="h-4 w-4" />
                      </button>
                    </Link>
                  )}
                  {isAuthenticated && !isAdmin && (
                    <button
                      onClick={() => setIsSuggestDialogOpen(true)}
                      className="h-9 w-9 flex items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 transition-colors"
                    >
                      <Lightbulb className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <main className="max-w-7xl mx-auto pb-20">
          <div className="bg-white dark:bg-[hsl(25,14%,10%)]">

            {/* Description preview */}
            {(brewery as any)?.description && (
              <div className="px-4 pt-3 pb-2 border-b border-stone-100 dark:border-stone-700/30">
                <p className="text-sm text-muted-foreground dark:text-stone-400 leading-relaxed line-clamp-3">
                  {(brewery as any).description}
                </p>
              </div>
            )}

            {/* Tabs Section */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="pb-4 overflow-x-auto px-4 md:px-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <TabsList className="bg-background dark:bg-[hsl(25,14%,12%)] rounded-2xl p-1 flex gap-1 w-max min-w-full h-auto">
                  <TabsTrigger
                    value="birre"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-[hsl(25,14%,10%)] data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-xl font-bold px-4 py-2 text-sm transition-all text-muted-foreground hover:text-foreground whitespace-nowrap flex-1"
                  >
                    Catalogo
                  </TabsTrigger>
                  <TabsTrigger
                    value="info"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-[hsl(25,14%,10%)] data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-xl font-bold px-4 py-2 text-sm transition-all text-muted-foreground hover:text-foreground whitespace-nowrap flex-1"
                  >
                    Info
                  </TabsTrigger>
                  {(breweryEvents.length > 0 || announcements.length > 0) && (
                    <TabsTrigger
                      value="serate"
                      className="data-[state=active]:bg-white dark:data-[state=active]:bg-[hsl(25,14%,10%)] data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-xl font-bold px-4 py-2 text-sm transition-all text-muted-foreground hover:text-foreground whitespace-nowrap flex-1"
                    >
                      Eventi
                    </TabsTrigger>
                  )}
                  {distribution.length > 0 && (
                    <TabsTrigger
                      value="distribuzione"
                      className="data-[state=active]:bg-white dark:data-[state=active]:bg-[hsl(25,14%,10%)] data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-xl font-bold px-4 py-2 text-sm transition-all text-muted-foreground hover:text-foreground whitespace-nowrap flex-1"
                    >
                      Dove trovarci
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              <div className="px-6 md:px-8 pb-8">
                {/* ── TAB: BIRRE ── */}
                <TabsContent value="birre" className="m-0 focus-visible:outline-none">
                  <div className="space-y-6">
                    {beerStyles.length > 1 && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => { setActiveStyleFilter(""); setVisibleCount(9); }}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${activeStyleFilter === "" ? "bg-foreground text-background shadow-md" : "bg-stone-100 dark:bg-stone-800 text-muted-foreground hover:bg-stone-200 dark:hover:bg-gray-700"}`}
                        >
                          Tutte le birre
                        </button>
                        {beerStyles.map(style => {
                          const sc = getBeerStyleColor(style || '');
                          const isActive = activeStyleFilter === style;
                          return (
                            <button
                              key={style}
                              onClick={() => { setActiveStyleFilter(style!); setVisibleCount(9); }}
                              className="px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm"
                              style={isActive
                                ? { background: sc.text, color: '#fff', boxShadow: `0 2px 8px ${sc.text}50` }
                                : { background: sc.bg, color: sc.text }}
                            >
                              {style}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {beersLoading ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="skeleton h-24 rounded-2xl"></div>
                        ))}
                      </div>
                    ) : beers.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-stone-200 dark:border-stone-700/30 rounded-3xl">
                        <div className="w-16 h-16 bg-stone-50 dark:bg-stone-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Beer className="h-8 w-8 text-primary/40" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">Nessuna birra ancora</h3>
                        <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1">
                          Il birrificio non ha ancora caricato le sue birre nel catalogo.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {displayedBeers.map((beer: Beer) => (
                            <Link key={beer.id} href={`/beer/${beer.id}`}>
                              <div className={`bg-white dark:bg-[hsl(25,14%,10%)] rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-stone-100 dark:border-[hsl(25,12%,16%)] hover:border-primary/20 dark:hover:border-primary/25 cursor-pointer transition-all group relative ${(beer as any).isHidden ? 'opacity-50 grayscale' : ''}`}>
                                <div className="relative">
                                  {beer.imageUrl ? (
                                    <img 
                                      src={beer.imageUrl} 
                                      alt={beer.name} 
                                      className="w-14 h-14 rounded-2xl object-contain p-0.5 lightbox-img bg-stone-50 dark:bg-stone-900/30"
                                    />
                                  ) : (
                                    <div className="w-14 h-14 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                                      <Beer className="h-6 w-6 text-stone-400 dark:text-stone-500" />
                                    </div>
                                  )}
                                  {isBeerTasted(beer.id) && (
                                    <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-0.5 border-2 border-white shadow-sm">
                                      <CheckCircle className="h-2.5 w-2.5 text-white" />
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <h3 className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                      {beer.name}
                                    </h3>
                                    {beer.avgRating != null && (
                                      <div className="flex items-center gap-0.5 text-amber-500">
                                        <Star className="h-3 w-3 fill-current" />
                                        <span className="text-[10px] font-bold">{beer.avgRating.toFixed(1)}</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    {(() => {
                                      const sc = getBeerStyleColor(beer.style);
                                      return (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase truncate max-w-[120px]" style={{ background: sc.bg, color: sc.text }}>
                                          {beer.style}
                                        </span>
                                      );
                                    })()}
                                    {beer.abv && (
                                      <span className="bg-stone-50 dark:bg-stone-900/20 text-stone-600 dark:text-stone-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        {beer.abv}%
                                      </span>
                                    )}
                                    {beer.isCollaboration && (
                                      <div className="flex items-center gap-1 text-[10px] font-bold text-violet-700 dark:text-violet-400 px-2 py-0.5 bg-violet-50 dark:bg-violet-900/20 rounded-full">
                                        <Users className="h-2.5 w-2.5" />
                                        COLLAB
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <button
                                  onClick={e => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!isAuthenticated) return;
                                    favoriteMutation.mutate({ itemType: 'beer', itemId: beer.id, action: isBeerFavorited(beer.id) ? 'remove' : 'add' });
                                  }}
                                  className="h-8 w-8 flex items-center justify-center rounded-xl transition-all opacity-0 group-hover:opacity-100 hover:bg-stone-50 dark:hover:bg-stone-900/30"
                                >
                                  <Heart className={`h-4 w-4 ${isBeerFavorited(beer.id) ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                                </button>
                              </div>
                            </Link>
                          ))}
                        </div>
                        
                        {visibleCount < filteredBeers.length && (
                          <div className="flex justify-center pt-6">
                            <Button 
                              variant="ghost" 
                              className="text-primary font-bold rounded-xl hover:bg-stone-50"
                              onClick={() => setVisibleCount(filteredBeers.length)}
                            >
                              Mostra tutte le {filteredBeers.length} birre
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </TabsContent>

                {/* ── TAB: INFO ── */}
                <TabsContent value="info" className="m-0 focus-visible:outline-none space-y-6 pt-4">
                  {((brewery as any)?.descriptionHtml || brewery?.description) && (
                    <div className="space-y-4">
                      <h2 className="text-xl font-bold text-foreground">Il Birrificio</h2>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {(brewery as any)?.descriptionHtml ? (
                          <RichTextDisplay html={(brewery as any).descriptionHtml} />
                        ) : (
                          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                            {brewery.description}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <h3 className="font-bold text-foreground">Contatti e Social</h3>
                      <div className="flex flex-col gap-2">
                        {brewery?.websiteUrl && (
                          <a href={brewery.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50/50 dark:bg-stone-900/10 border border-stone-100 dark:border-stone-700/20 hover:border-primary/30 transition-all group">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-[hsl(25,14%,12%)] flex items-center justify-center text-primary shadow-sm">
                              <Globe className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Sito Web</p>
                              <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{brewery.websiteUrl.replace(/^https?:\/\//, '')}</p>
                            </div>
                          </a>
                        )}
                        {(brewery as any)?.email && (
                          <a href={`mailto:${(brewery as any).email}`} className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50/50 dark:bg-stone-900/10 border border-stone-100 dark:border-stone-700/20 hover:border-primary/30 transition-all group">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-[hsl(25,14%,12%)] flex items-center justify-center text-primary shadow-sm">
                              <Mail className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Email</p>
                              <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{(brewery as any).email}</p>
                            </div>
                          </a>
                        )}
                        <div className="flex gap-2">
                          {(brewery as any)?.instagramUrl && (
                            <a href={(brewery as any).instagramUrl} target="_blank" rel="noopener noreferrer" className="h-12 w-12 rounded-2xl bg-stone-50/50 dark:bg-stone-900/10 border border-stone-100 dark:border-stone-700/20 flex items-center justify-center text-primary hover:border-primary/30 transition-all">
                              <SiInstagram className="h-5 w-5" />
                            </a>
                          )}
                          {(brewery as any)?.facebookUrl && (
                            <a href={(brewery as any).facebookUrl} target="_blank" rel="noopener noreferrer" className="h-12 w-12 rounded-2xl bg-stone-50/50 dark:bg-stone-900/10 border border-stone-100 dark:border-stone-700/20 flex items-center justify-center text-primary hover:border-primary/30 transition-all">
                              <SiFacebook className="h-5 w-5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-bold text-foreground">Posizione</h3>
                      {brewery?.location && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(brewery.name + ' ' + brewery.location)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-3 rounded-2xl bg-stone-50/50 dark:bg-stone-900/10 border border-stone-100 dark:border-stone-700/20 hover:border-primary/30 transition-all group"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-[hsl(25,14%,12%)] flex items-center justify-center text-primary shadow-sm">
                              <MapPin className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Indirizzo</p>
                              <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{brewery.location}</p>
                            </div>
                          </div>
                          <div className="h-32 rounded-xl bg-stone-100/50 dark:bg-orange-900/20 flex items-center justify-center text-primary/50 text-xs font-bold uppercase tracking-widest border border-stone-300/50 dark:border-stone-700/30">
                            Vedi sulla mappa
                          </div>
                        </a>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* ── TAB: SERATE ── */}
                <TabsContent value="serate" className="m-0 focus-visible:outline-none space-y-8 pt-4">
                  {announcements.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Megaphone className="h-5 w-5 text-primary" />
                        Annunci
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {announcements.map((announcement: any) => (
                          <div key={announcement.id} className="bg-white dark:bg-[hsl(25,14%,10%)] rounded-2xl border border-stone-100 dark:border-stone-700/20 p-5 shadow-sm">
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-xl bg-stone-50 dark:bg-stone-900/30 flex items-center justify-center text-primary shrink-0">
                                <Newspaper className="h-5 w-5" />
                              </div>
                              <div className="space-y-1">
                                <h4 className="font-bold text-foreground">{announcement.title}</h4>
                                <p className="text-sm text-muted-foreground leading-relaxed">{announcement.content}</p>
                                <p className="text-[10px] font-bold text-primary pt-2 uppercase tracking-wider">
                                  {format(new Date(announcement.createdAt), "d MMMM yyyy", { locale: itLocale })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {breweryEvents.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        Prossimi Eventi
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {breweryEvents.filter(e => isFuture(new Date(e.eventDate))).slice(0, 4).map((event: any) => (
                          <div key={event.id} className="bg-white dark:bg-[hsl(25,14%,10%)] rounded-3xl overflow-hidden border border-stone-100 dark:border-stone-700/20 shadow-sm group">
                            {event.imageUrl && (
                              <div className="h-40 bg-cover bg-center transition-transform group-hover:scale-105 duration-500" style={{ backgroundImage: `url(${event.imageUrl})` }} />
                            )}
                            <div className="p-5">
                              <div className="flex items-center gap-2 mb-2">
                                <EventCategoryBadge category={event.category} />
                                <div className="text-[10px] font-bold text-primary uppercase">
                                  {format(new Date(event.eventDate), "d MMM", { locale: itLocale })}
                                </div>
                              </div>
                              <h4 className="font-bold text-foreground text-lg mb-2">{event.title}</h4>
                              <div className="flex items-center text-xs text-muted-foreground gap-1.5 mb-4">
                                <Clock className="h-3.5 w-3.5 text-primary" />
                                <span>{format(new Date(event.eventDate), "HH:mm", { locale: itLocale })}</span>
                              </div>
                              <EventInterestButton eventId={event.id} type="brewery" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* ── TAB: DISTRIBUZIONE ── */}
                <TabsContent value="distribuzione" className="m-0 focus-visible:outline-none space-y-6 pt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-foreground">Dove trovarci</h2>
                      <span className="bg-stone-50 text-primary text-[10px] font-bold px-3 py-1 rounded-full">
                        ${distribution.length} LOCALI
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {distribution.map((pub: any) => (
                        <Link key={pub.id} href={`/pub/${pub.slug || pub.id}`}>
                          <div className="bg-white dark:bg-[hsl(25,14%,10%)] rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-stone-100 dark:border-stone-200 hover:border-primary/20 transition-all cursor-pointer group">
                            {pub.logo_url ? (
                              <img src={pub.logo_url} alt={pub.name} className="w-12 h-12 rounded-2xl object-cover flex-shrink-0 lightbox-img" />
                            ) : (
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-primary flex items-center justify-center flex-shrink-0">
                                <Store className="w-6 h-6 text-white" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-foreground truncate group-hover:text-primary transition-colors">{pub.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate uppercase font-bold tracking-tight">
                                {[pub.city, pub.region].filter(Boolean).join(", ")}
                              </p>
                              <p className="text-[10px] text-primary font-bold mt-1 uppercase">
                                {pub.beer_count} {Number(pub.beer_count) === 1 ? "birra" : "birre"} ON TAP
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
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
              <Label>
                Descrizione
                <span className="ml-2 text-xs text-muted-foreground font-normal">Editor avanzato — testo, grassetto, elenchi, link e molto altro</span>
              </Label>
              <RichTextEditor
                content={editForm.descriptionHtml}
                onChange={(html) => setEditForm({ ...editForm, descriptionHtml: html })}
                placeholder="Racconta la storia del birrificio, la filosofia, i premi, le collaborazioni…"
                maxChars={5000}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sito Web</Label>
                <Input value={editForm.websiteUrl} onChange={(e) => setEditForm({ ...editForm, websiteUrl: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Telefono</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="+39..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email pubblica</Label>
                <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="info@birrificio.it" type="email" />
              </div>
              <div className="space-y-2">
                <Label>Partita IVA</Label>
                <Input value={editForm.vatNumber} onChange={(e) => setEditForm({ ...editForm, vatNumber: e.target.value })} placeholder="IT..." />
              </div>
            </div>
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <SiInstagram className="h-3.5 w-3.5 text-pink-500" />
                Social Media
              </Label>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2">
                  <SiInstagram className="h-4 w-4 text-pink-500 flex-shrink-0" />
                  <Input value={editForm.instagramUrl} onChange={(e) => setEditForm({ ...editForm, instagramUrl: e.target.value })} placeholder="https://instagram.com/..." />
                </div>
                <div className="flex items-center gap-2">
                  <SiFacebook className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <Input value={editForm.facebookUrl} onChange={(e) => setEditForm({ ...editForm, facebookUrl: e.target.value })} placeholder="https://facebook.com/..." />
                </div>
                <div className="flex items-center gap-2">
                  <SiTiktok className="h-4 w-4 dark:text-white flex-shrink-0" />
                  <Input value={editForm.tiktokUrl} onChange={(e) => setEditForm({ ...editForm, tiktokUrl: e.target.value })} placeholder="https://tiktok.com/@..." />
                </div>
              </div>
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
                    className="bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold"
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
