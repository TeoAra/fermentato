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
  Trash2,
  AlertTriangle,
  Bookmark,
  MoreHorizontal,
  ChevronRight,
  Navigation,
  SlidersHorizontal,
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
import { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy } from "react";
const CheckinModal = lazy(() => import("@/components/checkin-modal"));
import ImageWithFallback from "@/components/image-with-fallback";
import { ImageUpload } from "@/components/image-upload";
import SuggestChangeDialog from "@/components/SuggestChangeDialog";
import AddressAutocomplete from "@/components/address-autocomplete";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

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
  locationCount?: number;
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
  const [descExpanded, setDescExpanded] = useState(false);
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

  // ── Beer edit state ──────────────────────────────────────────────────────
  const [isBeerEditOpen, setIsBeerEditOpen] = useState(false);
  const [editingBeerId, setEditingBeerId] = useState<number | null>(null);
  const [isSavingBeer, setIsSavingBeer] = useState(false);
  const [isDeleteBeerOpen, setIsDeleteBeerOpen] = useState(false);
  const [isDeletingBeer, setIsDeletingBeer] = useState(false);
  const [beerEditForm, setBeerEditForm] = useState({
    name: '', style: '', abv: '', ibu: '', color: '', description: '',
    imageUrl: '', bottleImageUrl: '', logoUrl: '',
    isGlutenFree: false, isAlcoholFree: false, isCollaboration: false,
  });
  const [beerEditCollabBreweries, setBeerEditCollabBreweries] = useState<{ id: number; name: string }[]>([]);
  const [beerCollabQuery, setBeerCollabQuery] = useState('');
  const [beerCollabResults, setBeerCollabResults] = useState<any[]>([]);
  const [showBeerCollabResults, setShowBeerCollabResults] = useState(false);
  const beerCollabDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchBeerCollabBreweries = useCallback((q: string, excludeId: number | undefined, selected: { id: number; name: string }[]) => {
    if (beerCollabDebounceRef.current) clearTimeout(beerCollabDebounceRef.current);
    if (!q.trim()) { setBeerCollabResults([]); setShowBeerCollabResults(false); return; }
    beerCollabDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/breweries/search?q=${encodeURIComponent(q)}&limit=8`);
        const data = await res.json();
        const filtered = (Array.isArray(data) ? data : []).filter(
          (b: any) => b.id !== excludeId && !selected.some((s) => s.id === b.id)
        );
        setBeerCollabResults(filtered);
        setShowBeerCollabResults(filtered.length > 0);
      } catch { setBeerCollabResults([]); }
    }, 250);
  }, []);

  const openBeerEditDialog = useCallback(async (beer: Beer) => {
    setEditingBeerId(beer.id);
    setBeerEditForm({
      name: beer.name || '',
      style: beer.style || '',
      abv: (beer as any).abv || '',
      ibu: (beer as any).ibu ? String((beer as any).ibu) : '',
      color: (beer as any).color || '',
      description: (beer as any).description || '',
      imageUrl: (beer as any).imageUrl || '',
      bottleImageUrl: (beer as any).bottleImageUrl || '',
      logoUrl: (beer as any).logoUrl || '',
      isGlutenFree: !!(beer as any).isGlutenFree,
      isAlcoholFree: !!(beer as any).isAlcoholFree,
      isCollaboration: !!(beer as any).isCollaboration,
    });
    // Fetch collaboration breweries
    try {
      const res = await fetch(`/api/beers/${beer.id}/collaborations`);
      const collabs = await res.json();
      setBeerEditCollabBreweries(Array.isArray(collabs) ? collabs.map((b: any) => ({ id: b.id, name: b.name })) : []);
    } catch { setBeerEditCollabBreweries([]); }
    setBeerCollabQuery('');
    setBeerCollabResults([]);
    setIsBeerEditOpen(true);
  }, []);

  const handleSaveBeerEdit = async () => {
    if (!editingBeerId) return;
    const collabIds = beerEditForm.isCollaboration ? beerEditCollabBreweries.map(b => b.id) : [];
    const updates: Record<string, any> = {
      name: beerEditForm.name,
      style: beerEditForm.style,
      abv: beerEditForm.abv,
      description: beerEditForm.description || null,
      color: beerEditForm.color || null,
      logoUrl: beerEditForm.logoUrl || null,
      imageUrl: beerEditForm.imageUrl || null,
      bottleImageUrl: beerEditForm.bottleImageUrl || null,
      isGlutenFree: beerEditForm.isGlutenFree,
      isAlcoholFree: beerEditForm.isAlcoholFree,
      collaborationBreweryIds: collabIds,
      isCollaboration: beerEditForm.isCollaboration,
    };
    if (beerEditForm.ibu) updates.ibu = parseInt(beerEditForm.ibu);
    setIsSavingBeer(true);
    try {
      const endpoint = isAdmin ? `/api/admin/beers/${editingBeerId}` : `/api/brewery/beers/${editingBeerId}`;
      await apiRequest(endpoint, { method: 'PATCH' }, updates);
      queryClient.invalidateQueries({ queryKey: ["/api/breweries", id, "beers"] });
      setIsBeerEditOpen(false);
      toast({ title: "Birra aggiornata" });
    } catch (err: any) {
      toast({ title: "Errore nell'aggiornamento", description: err?.message, variant: "destructive" });
    } finally {
      setIsSavingBeer(false);
    }
  };

  const handleDeleteBeer = async () => {
    if (!editingBeerId) return;
    setIsDeletingBeer(true);
    try {
      const endpoint = isAdmin ? `/api/admin/beers/${editingBeerId}` : `/api/brewery/beers/${editingBeerId}`;
      await apiRequest(endpoint, { method: 'DELETE' });
      queryClient.invalidateQueries({ queryKey: ["/api/breweries", id, "beers"] });
      setIsDeleteBeerOpen(false);
      setIsBeerEditOpen(false);
      toast({ title: "Birra eliminata" });
    } catch (err: any) {
      toast({ title: "Errore nell'eliminazione", description: err?.message, variant: "destructive" });
    } finally {
      setIsDeletingBeer(false);
    }
  };

  const canEditBeers = isAdmin || !!(user as any)?.breweryId;
  const [checkinBeer, setCheckinBeer] = useState<any>(null);

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
        <link rel="canonical" href={seoUrl} />
        <script type="application/ld+json">{JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://fermenta.to/" },
              { "@type": "ListItem", "position": 2, "name": "Birrifici", "item": "https://fermenta.to/explore/breweries" },
              { "@type": "ListItem", "position": 3, "name": brewery?.name, "item": seoUrl },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "Brewery",
            "@id": seoUrl,
            "name": brewery?.name,
            "description": (brewery as any)?.description || `${brewery?.name} è un birrificio artigianale${brewery?.location ? ` con sede a ${brewery.location}` : ""} che produce birre di qualità.`,
            "url": seoUrl,
            "image": seoImage,
            ...(brewery?.logoUrl ? { "logo": { "@type": "ImageObject", "url": brewery.logoUrl } } : {}),
            ...(brewery?.location ? {
              "address": {
                "@type": "PostalAddress",
                "addressLocality": brewery.location,
                "addressCountry": "IT",
              }
            } : {}),
            ...((brewery as any)?.foundingYear ? { "foundingDate": String((brewery as any).foundingYear) } : {}),
            ...(brewery?.website ? { "sameAs": [brewery.website] } : {}),
            "additionalProperty": [
              ...((brewery as any)?.country ? [{ "@type": "PropertyValue", "name": "Paese", "value": (brewery as any).country }] : []),
            ].filter(p => p),
            ...(breweryRating?.avgRating && breweryRating.reviewCount > 0 ? {
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": Number(breweryRating.avgRating).toFixed(1),
                "bestRating": "5",
                "worstRating": "1",
                "ratingCount": breweryRating.reviewCount,
              }
            } : {}),
          }
        ])}</script>
      </Helmet>
      
      {/* ── HERO — full-bleed cover with curved bottom edge ── */}
      <div className="relative bg-stone-900 lg:hidden">
        <div className="relative h-72 overflow-hidden">
          {brewery?.coverImageUrl ? (
            <img src={brewery.coverImageUrl} alt="" className="w-full h-full object-cover" />
          ) : brewery?.logoUrl ? (
            <img src={brewery.logoUrl} alt="" className="w-full h-full object-cover blur-2xl scale-110 opacity-40" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-stone-800 via-stone-700 to-stone-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/40" />

          {/* Top bar: back / share / more */}
          <Link href="/explore/breweries"
            className="absolute top-3 left-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center tap-scale">
            <ArrowLeft className="h-5 w-5 text-white" />
          </Link>
          <div className="absolute top-3 right-4 flex items-center gap-2">
            <button onClick={handleShare}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center tap-scale">
              <Share2 className="h-[18px] w-[18px] text-white" />
            </button>
            {isAdmin ? (
              <Link href={`/admin/edit-brewery/${id}`}>
                <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center tap-scale">
                  <Settings className="h-[18px] w-[18px] text-white" />
                </button>
              </Link>
            ) : isAuthenticated ? (
              <button onClick={() => setIsSuggestDialogOpen(true)}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center tap-scale">
                <Lightbulb className="h-[18px] w-[18px] text-white" />
              </button>
            ) : null}
          </div>

          {/* Curved white bottom edge */}
          <svg className="absolute bottom-0 left-0 w-full text-background dark:text-background pointer-events-none" viewBox="0 0 375 50" preserveAspectRatio="none" style={{ height: '50px' }}>
            <path d="M0,50 L0,28 Q187.5,-22 375,28 L375,50 Z" fill="currentColor" />
          </svg>
        </div>

        {/* Identity block — mobile (logo overlaps curve) */}
        <div className="bg-background dark:bg-background relative px-4 pb-2">
          <div className="flex items-end gap-3 -mt-12 relative z-10">
            <button onClick={() => { const s = brewery?.logoUrl; if (s) (window as any).__lightboxOpen?.(s); }} className="flex-shrink-0 tap-scale">
              <Avatar className="h-24 w-24 rounded-full border-4 border-background dark:border-background shadow-lg bg-stone-800">
                <AvatarImage src={brewery?.logoUrl} alt={brewery?.name} className="object-cover" />
                <AvatarFallback className="bg-stone-700 text-white text-3xl font-bold">{brewery?.name?.[0] || 'B'}</AvatarFallback>
              </Avatar>
            </button>
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-foreground leading-tight tracking-tight">{brewery?.name}</h1>
              {(brewery as any)?.hasOwner && (
                <div title="Birrificio Verificato" className="flex items-center justify-center bg-primary rounded-full w-5 h-5 flex-shrink-0 shadow-sm">
                  <ShieldCheck className="h-3 w-3 text-white" />
                </div>
              )}
            </div>

            {/* Rating + location row */}
            <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300 flex-wrap">
              {breweryRating?.avgRating ? (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-foreground">{breweryRating.avgRating.toFixed(1).replace('.', ',')}</span>
                  <span className="text-stone-500 dark:text-stone-400">({breweryRating.reviewCount})</span>
                </div>
              ) : null}
              {(breweryRating?.avgRating && brewery?.location) && (
                <span className="text-stone-400 dark:text-stone-500">·</span>
              )}
              {brewery?.location && (
                <div className="flex items-center gap-1 min-w-0">
                  <MapPin className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400 flex-shrink-0" />
                  <span className="truncate">
                    {brewery.location}{brewery.region ? ` (${brewery.region})` : ''}{(brewery as any)?.country ? `, ${(brewery as any).country}` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Badges row: birre count + indipendente */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {beers.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-orange-50 dark:bg-orange-950/30 text-primary border border-orange-100 dark:border-orange-900/40">
                  <Beer className="h-3.5 w-3.5" />
                  {beers.length} {beers.length === 1 ? 'birra' : 'birre'}
                </span>
              )}
              {!(brewery as any)?.parentCompany && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Birrificio indipendente
                </span>
              )}
            </div>

            {/* Description with read-more toggle */}
            {(brewery as any)?.description && (
              <div className="pt-2">
                <p className={`text-sm text-stone-600 dark:text-stone-400 leading-relaxed whitespace-pre-line ${descExpanded ? '' : 'line-clamp-3'}`}>
                  {(brewery as any).description}
                </p>
                {((brewery as any).description as string).length > 140 && (
                  <button
                    onClick={() => setDescExpanded(v => !v)}
                    className="mt-1 text-sm font-bold text-primary inline-flex items-center gap-0.5 tap-scale"
                  >
                    {descExpanded ? 'Mostra meno' : 'Leggi di più'}
                    <ChevronRight className={`h-4 w-4 transition-transform ${descExpanded ? '-rotate-90' : 'rotate-90'}`} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 4 action cards row */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            <button
              onClick={handleFavoriteToggle}
              disabled={favoriteMutation.isPending}
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-3 px-1 transition-all tap-scale border ${
                isBreweryFavorited
                  ? 'bg-primary/5 border-primary/30'
                  : 'bg-stone-50 dark:bg-stone-900/40 border-stone-100 dark:border-stone-800 hover:border-primary/30'
              }`}
              data-testid="button-follow-brewery"
            >
              <Heart className={`h-5 w-5 ${isBreweryFavorited ? 'fill-primary text-primary' : 'text-foreground'}`} />
              <span className="text-[11px] font-bold text-foreground leading-tight">{isBreweryFavorited ? 'Seguendo' : 'Segui'}</span>
              <span className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight">
                {favCount > 0 ? `${favCount} follower` : 'Aggiungi'}
              </span>
            </button>

            {brewery?.location ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((brewery.name || '') + ' ' + brewery.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-1 rounded-2xl py-3 px-1 bg-stone-50 dark:bg-stone-900/40 border border-stone-100 dark:border-stone-800 hover:border-primary/30 transition-all tap-scale"
                data-testid="link-directions"
              >
                <Navigation className="h-5 w-5 text-foreground" />
                <span className="text-[11px] font-bold text-foreground leading-tight">Indicazioni</span>
                <span className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight">Maps</span>
              </a>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 rounded-2xl py-3 px-1 bg-stone-50/40 dark:bg-stone-900/20 border border-stone-100 dark:border-stone-800 opacity-50">
                <Navigation className="h-5 w-5 text-stone-400" />
                <span className="text-[11px] font-bold text-stone-400 leading-tight">Indicazioni</span>
                <span className="text-[10px] text-stone-400 leading-tight">N/D</span>
              </div>
            )}

            {brewery?.websiteUrl ? (
              <a
                href={brewery.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-1 rounded-2xl py-3 px-1 bg-stone-50 dark:bg-stone-900/40 border border-stone-100 dark:border-stone-800 hover:border-primary/30 transition-all tap-scale"
                data-testid="link-website"
              >
                <Globe className="h-5 w-5 text-foreground" />
                <span className="text-[11px] font-bold text-foreground leading-tight">Sito web</span>
                <span className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight truncate max-w-full px-1">
                  {brewery.websiteUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]}
                </span>
              </a>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 rounded-2xl py-3 px-1 bg-stone-50/40 dark:bg-stone-900/20 border border-stone-100 dark:border-stone-800 opacity-50">
                <Globe className="h-5 w-5 text-stone-400" />
                <span className="text-[11px] font-bold text-stone-400 leading-tight">Sito web</span>
                <span className="text-[10px] text-stone-400 leading-tight">N/D</span>
              </div>
            )}

            <button
              onClick={handleShare}
              className="flex flex-col items-center justify-center gap-1 rounded-2xl py-3 px-1 bg-stone-50 dark:bg-stone-900/40 border border-stone-100 dark:border-stone-800 hover:border-primary/30 transition-all tap-scale"
              data-testid="button-share-brewery"
            >
              <Share2 className="h-5 w-5 text-foreground" />
              <span className="text-[11px] font-bold text-foreground leading-tight">Condividi</span>
              <span className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight">Con amici</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── HERO — desktop (kept compact, sidebar handles identity) ── */}
      <div className="relative h-80 overflow-hidden bg-stone-900 hidden lg:block">
        {brewery?.coverImageUrl ? (
          <img src={brewery.coverImageUrl} alt="" className="w-full h-full object-cover" />
        ) : brewery?.logoUrl ? (
          <img src={brewery.logoUrl} alt="" className="w-full h-full object-cover blur-2xl scale-110 opacity-40" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-stone-800 via-stone-700 to-stone-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />
        <Link href="/explore/breweries"
          className="absolute top-4 left-6 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center tap-scale">
          <ArrowLeft className="h-5 w-5 text-white" />
        </Link>
        <button onClick={handleShare}
          className="absolute top-4 right-6 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center tap-scale">
          <Share2 className="h-[18px] w-[18px] text-white" />
        </button>
        {/* Curved white bottom edge — matches mobile hero */}
        <svg className="absolute bottom-0 left-0 w-full text-background dark:text-background pointer-events-none" viewBox="0 0 375 50" preserveAspectRatio="none" style={{ height: '50px' }}>
          <path d="M0,50 L0,28 Q187.5,-22 375,28 L375,50 Z" fill="currentColor" />
        </svg>
      </div>

        {/* ── MAIN CONTENT ── */}
        <main className="max-w-7xl mx-auto pb-20 lg:grid lg:grid-cols-3 lg:gap-8 lg:px-8 lg:pt-8 lg:items-start">
          <div className="bg-white dark:bg-card lg:col-span-2 lg:rounded-2xl lg:shadow-sm lg:border lg:border-stone-100 dark:lg:border-stone-800 lg:overflow-hidden">


            {/* Tabs Section — underline style per mockup */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b border-stone-200 dark:border-stone-800 px-4 md:px-8">
                <TabsList className="bg-transparent dark:bg-transparent rounded-none p-0 h-auto gap-6 w-full justify-start">
                  <TabsTrigger
                    value="birre"
                    className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent text-stone-500 dark:text-stone-400 font-bold px-0 py-3 text-sm transition-colors hover:text-foreground"
                  >
                    Birre
                  </TabsTrigger>
                  <TabsTrigger
                    value="info"
                    className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent text-stone-500 dark:text-stone-400 font-bold px-0 py-3 text-sm transition-colors hover:text-foreground"
                  >
                    Info
                  </TabsTrigger>
                  {(breweryEvents.length > 0 || announcements.length > 0) && (
                    <TabsTrigger
                      value="serate"
                      className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent text-stone-500 dark:text-stone-400 font-bold px-0 py-3 text-sm transition-colors hover:text-foreground"
                    >
                      Eventi
                    </TabsTrigger>
                  )}
                  {distribution.length > 0 && (
                    <TabsTrigger
                      value="distribuzione"
                      className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent text-stone-500 dark:text-stone-400 font-bold px-0 py-3 text-sm transition-colors hover:text-foreground whitespace-nowrap"
                    >
                      Dove trovarci
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              <div className="px-4 md:px-8 pt-4 pb-8">
                {/* ── TAB: BIRRE ── */}
                <TabsContent value="birre" className="m-0 focus-visible:outline-none">
                  <div className="space-y-4">
                    {beerStyles.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <button
                          onClick={() => { setActiveStyleFilter(""); setVisibleCount(9); }}
                          className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${activeStyleFilter === "" ? "bg-primary text-white shadow-sm" : "bg-white dark:bg-stone-900/40 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-primary/40"}`}
                          data-testid="filter-all"
                        >
                          Tutte
                        </button>
                        {beerStyles.map(style => {
                          const isActive = activeStyleFilter === style;
                          const shortStyle = (style || '').replace(/\s*[-–/]\s*.+$/, '').trim() || style;
                          return (
                            <button
                              key={style}
                              onClick={() => { setActiveStyleFilter(style!); setVisibleCount(9); }}
                              className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all max-w-[160px] truncate ${
                                isActive
                                  ? "bg-primary text-white shadow-sm"
                                  : "bg-white dark:bg-stone-900/40 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-primary/40"
                              }`}
                              title={style || ''}
                            >
                              {shortStyle}
                            </button>
                          );
                        })}
                        <button
                          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-white dark:bg-stone-900/40 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700"
                          onClick={() => setActiveStyleFilter("")}
                          data-testid="filter-more"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                          Filtri
                        </button>
                      </div>
                    )}

                    {beersLoading ? (
                      <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
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
                        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
                          {displayedBeers.map((beer: Beer) => {
                            const sc = getBeerStyleColor(beer.style);
                            const locCount = (beer as any).locationCount || 0;
                            return (
                              <Link key={beer.id} href={`/beer/${beer.id}`}>
                                <div
                                  className={`bg-white dark:bg-card rounded-2xl p-3 flex items-center gap-3 shadow-sm border border-stone-100 dark:border-border hover:border-primary/30 hover:shadow-[0_4px_20px_rgba(247,113,4,0.08)] dark:hover:border-primary/25 cursor-pointer transition-all duration-200 ease-out active:scale-[0.98] group relative ${(beer as any).isHidden ? 'opacity-50 grayscale' : ''}`}
                                  data-testid={`beer-card-${beer.id}`}
                                >
                                  <div className="relative flex-shrink-0">
                                    {beer.imageUrl ? (
                                      <img
                                        src={beer.imageUrl}
                                        alt={beer.name}
                                        className="w-16 h-16 rounded-2xl object-cover lightbox-img bg-stone-50 dark:bg-stone-900/30"
                                      />
                                    ) : (
                                      <div className="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                                        <Beer className="h-7 w-7 text-stone-400 dark:text-stone-500" />
                                      </div>
                                    )}
                                    {isBeerTasted(beer.id) && (
                                      <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-0.5 border-2 border-white shadow-sm">
                                        <CheckCircle className="h-2.5 w-2.5 text-white" />
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-extrabold text-foreground truncate group-hover:text-primary transition-colors text-[15px] leading-tight">
                                      {beer.name}
                                    </h3>
                                    <p className="text-xs font-bold mt-0.5 truncate" style={{ color: sc.text }}>
                                      {beer.style}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                                      {beer.abv && <span className="font-semibold">{beer.abv}% ABV</span>}
                                      {beer.avgRating != null && (
                                        <>
                                          <span>·</span>
                                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                          <span className="font-semibold">{beer.avgRating.toFixed(1)}</span>
                                        </>
                                      )}
                                      {beer.isCollaboration && (
                                        <>
                                          <span>·</span>
                                          <span className="inline-flex items-center gap-0.5 text-violet-600 dark:text-violet-400 font-bold">
                                            <Users className="h-2.5 w-2.5" />
                                            COLLAB
                                          </span>
                                        </>
                                      )}
                                    </div>
                                    {locCount > 0 && (
                                      <p className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Disponibile in {locCount} {locCount === 1 ? 'locale' : 'locali'}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-0.5 flex-shrink-0">
                                    {canEditBeers && (
                                      <button
                                        onClick={e => { e.preventDefault(); e.stopPropagation(); openBeerEditDialog(beer); }}
                                        className="h-8 w-8 flex items-center justify-center rounded-xl transition-all hover:bg-primary/10"
                                        title="Modifica birra"
                                        data-testid={`button-edit-beer-${beer.id}`}
                                      >
                                        <Pencil className="h-3.5 w-3.5 text-primary" />
                                      </button>
                                    )}
                                    {isAuthenticated && (
                                      <button
                                        onClick={e => { e.preventDefault(); e.stopPropagation(); setCheckinBeer(beer); }}
                                        className="h-8 w-8 flex items-center justify-center rounded-xl transition-all hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                        title="Check-in"
                                        data-testid={`button-checkin-beer-${beer.id}`}
                                      >
                                        <Beer className="h-4 w-4 text-amber-500" />
                                      </button>
                                    )}
                                    <button
                                      onClick={e => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (!isAuthenticated) return;
                                        favoriteMutation.mutate({ itemType: 'beer', itemId: beer.id, action: isBeerFavorited(beer.id) ? 'remove' : 'add' });
                                      }}
                                      className="h-8 w-8 flex items-center justify-center rounded-xl transition-all hover:bg-stone-50 dark:hover:bg-stone-900/30"
                                      data-testid={`button-bookmark-beer-${beer.id}`}
                                    >
                                      <Bookmark className={`h-4 w-4 ${isBeerFavorited(beer.id) ? 'fill-primary text-primary' : 'text-stone-400 dark:text-stone-500'}`} />
                                    </button>
                                    <ChevronRight className="h-4 w-4 text-stone-300 dark:text-stone-600 ml-0.5" />
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>

                        {visibleCount < filteredBeers.length && (
                          <button
                            onClick={() => setVisibleCount(filteredBeers.length)}
                            className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white dark:bg-card border-2 border-primary/40 text-primary font-bold text-sm hover:bg-primary/5 transition-all tap-scale"
                            data-testid="button-see-all-beers"
                          >
                            Vedi tutte le {filteredBeers.length} birre
                            <ChevronRight className="h-4 w-4" />
                          </button>
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
                          <div key={announcement.id} className="bg-white dark:bg-card rounded-2xl border border-stone-100 dark:border-stone-700/20 p-5 shadow-sm">
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
                          <div key={event.id} className="bg-white dark:bg-card rounded-3xl overflow-hidden border border-stone-100 dark:border-stone-700/20 shadow-sm group">
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
                      <span className="bg-stone-50 dark:bg-stone-800/40 text-primary text-[10px] font-bold px-3 py-1 rounded-full">
                        {distribution.length} {distribution.length === 1 ? 'LOCALE' : 'LOCALI'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {distribution.map((pub: any) => (
                        <Link key={pub.id} href={`/pub/${pub.slug || pub.id}`}>
                          <div className="bg-white dark:bg-card rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-stone-100 dark:border-stone-200 hover:border-primary/20 transition-all cursor-pointer group">
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

          {/* ── DESKTOP SIDEBAR ── */}
          <aside className="hidden lg:flex lg:flex-col lg:col-span-1 gap-4 sticky top-20">
            {/* Brewery identity card */}
            <div className="bg-white dark:bg-card rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm overflow-hidden">
              <div className="p-5 space-y-4">
                {/* Logo + name on desktop */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14 rounded-2xl border border-stone-100 dark:border-stone-700 shadow-sm bg-stone-800 flex-shrink-0">
                    <AvatarImage src={brewery?.logoUrl} alt={brewery?.name} className="object-cover" />
                    <AvatarFallback className="bg-stone-700 text-white text-xl font-bold">{brewery?.name?.[0] || 'B'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-extrabold text-base text-foreground leading-tight truncate">{brewery?.name}</h2>
                    {brewery?.location && (
                      <p className="text-xs text-stone-400 mt-0.5 truncate">{brewery.location}{brewery.region ? ` · ${brewery.region}` : ''}</p>
                    )}
                    {brewery?.country && (
                      <p className="text-xs text-stone-400 truncate">{brewery.country}</p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3">
                  {beers.length > 0 && (
                    <div className="flex-1 text-center py-2 bg-stone-50 dark:bg-stone-800/40 rounded-xl">
                      <p className="text-lg font-extrabold text-primary">{beers.length}</p>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">Birre</p>
                    </div>
                  )}
                  {breweryRating?.avgRating && (
                    <div className="flex-1 text-center py-2 bg-stone-50 dark:bg-stone-800/40 rounded-xl">
                      <p className="text-lg font-extrabold text-amber-500">{breweryRating.avgRating.toFixed(1)}</p>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">{breweryRating.reviewCount} voti</p>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button onClick={handleFavoriteToggle} disabled={favoriteMutation.isPending}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition-all tap-scale ${
                      isBreweryFavorited
                        ? 'bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600'
                        : 'bg-primary text-white btn-orange-glow'
                    }`}>
                    <Heart className={`h-4 w-4 ${isBreweryFavorited ? 'fill-current text-red-500' : ''}`} />
                    {isBreweryFavorited ? 'Seguendo' : 'Segui'}
                  </button>
                  <button onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold bg-white dark:bg-card border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 tap-scale">
                    <Share2 className="h-4 w-4" />
                    Condividi
                  </button>
                </div>

                {/* Description */}
                {((brewery as any)?.description) && (
                  <div className="border-t border-stone-100 dark:border-stone-800 pt-4">
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-6">
                      {(brewery as any).description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Contacts & Location */}
            <div className="bg-white dark:bg-card rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm p-5 space-y-3">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Informazioni</h3>
              {brewery?.websiteUrl && (
                <a href={brewery.websiteUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center flex-shrink-0">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {brewery.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </span>
                </a>
              )}
              {brewery?.location && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((brewery.name || '') + ' ' + brewery.location)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {brewery.location}
                  </span>
                </a>
              )}
              {(brewery as any)?.email && (
                <a href={`mailto:${(brewery as any).email}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {(brewery as any).email}
                  </span>
                </a>
              )}
              {/* Social */}
              {((brewery as any)?.instagramUrl || (brewery as any)?.facebookUrl) && (
                <div className="flex gap-2 pt-1">
                  {(brewery as any)?.instagramUrl && (
                    <a href={(brewery as any).instagramUrl} target="_blank" rel="noopener noreferrer"
                      className="w-9 h-9 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors">
                      <SiInstagram className="h-4 w-4" />
                    </a>
                  )}
                  {(brewery as any)?.facebookUrl && (
                    <a href={(brewery as any).facebookUrl} target="_blank" rel="noopener noreferrer"
                      className="w-9 h-9 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors">
                      <SiFacebook className="h-4 w-4" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Admin quick-edit */}
            {isAdmin && (
              <Link href={`/admin/edit-brewery/${id}`}>
                <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-sm font-bold tap-scale hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">
                  <Settings className="h-4 w-4" />
                  Modifica birrificio
                </button>
              </Link>
            )}
          </aside>

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

      {/* Beer Edit Dialog */}
      <Dialog open={isBeerEditOpen} onOpenChange={setIsBeerEditOpen}>
        <DialogContent className="w-[calc(100%-24px)] sm:w-full sm:max-w-2xl max-h-[85dvh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                Modifica Birra
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl"
                onClick={() => setIsDeleteBeerOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Elimina
              </Button>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bedit-name">Nome</Label>
                <Input
                  id="bedit-name"
                  value={beerEditForm.name}
                  onChange={e => setBeerEditForm({ ...beerEditForm, name: e.target.value })}
                  placeholder="Nome della birra"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bedit-style">Stile</Label>
                <Input
                  id="bedit-style"
                  value={beerEditForm.style}
                  onChange={e => setBeerEditForm({ ...beerEditForm, style: e.target.value })}
                  placeholder="Es. IPA, Lager, Stout..."
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="bedit-abv">ABV (%)</Label>
                <Input
                  id="bedit-abv"
                  value={beerEditForm.abv}
                  onChange={e => setBeerEditForm({ ...beerEditForm, abv: e.target.value })}
                  placeholder="5.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bedit-ibu">IBU</Label>
                <Input
                  id="bedit-ibu"
                  type="number"
                  value={beerEditForm.ibu}
                  onChange={e => setBeerEditForm({ ...beerEditForm, ibu: e.target.value })}
                  placeholder="40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bedit-color">Colore</Label>
                <Input
                  id="bedit-color"
                  value={beerEditForm.color}
                  onChange={e => setBeerEditForm({ ...beerEditForm, color: e.target.value })}
                  placeholder="Ambrato, Scuro..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bedit-desc">Descrizione</Label>
              <Textarea
                id="bedit-desc"
                value={beerEditForm.description}
                onChange={e => setBeerEditForm({ ...beerEditForm, description: e.target.value })}
                placeholder="Descrizione della birra..."
                rows={4}
              />
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={beerEditForm.isGlutenFree}
                  onChange={e => setBeerEditForm({ ...beerEditForm, isGlutenFree: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">Gluten Free</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={beerEditForm.isAlcoholFree}
                  onChange={e => setBeerEditForm({ ...beerEditForm, isAlcoholFree: e.target.checked })}
                  className="w-4 h-4 rounded border-stone-100 text-primary focus:ring-primary"
                />
                <span className="text-sm font-bold text-primary">0.0% Analcolica</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={beerEditForm.isCollaboration}
                  onChange={e => { setBeerEditForm({ ...beerEditForm, isCollaboration: e.target.checked }); if (!e.target.checked) setBeerEditCollabBreweries([]); }}
                  className="w-4 h-4 rounded border-stone-100 text-primary focus:ring-primary"
                />
                <span className="text-sm font-bold text-primary flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />Birra in Collaborazione
                </span>
              </label>
            </div>
            {beerEditForm.isCollaboration && (
              <div className="space-y-2 p-3 rounded-lg border border-stone-200 bg-stone-50 dark:bg-[hsl(24,93%,15%)]">
                <Label className="text-primary font-bold flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />Birrifici Partner
                </Label>
                {beerEditCollabBreweries.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {beerEditCollabBreweries.map(b => (
                      <span key={b.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold bg-white dark:bg-card border border-stone-100 dark:border-stone-700/30 text-primary">
                        <Building2 className="w-3 h-3" />{b.name}
                        <button type="button" onClick={() => setBeerEditCollabBreweries(beerEditCollabBreweries.filter(x => x.id !== b.id))} className="ml-0.5 hover:text-primary/80">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <Input
                    value={beerCollabQuery}
                    onChange={e => { setBeerCollabQuery(e.target.value); searchBeerCollabBreweries(e.target.value, brewery?.id, beerEditCollabBreweries); }}
                    onBlur={() => setTimeout(() => setShowBeerCollabResults(false), 200)}
                    placeholder="Cerca birrificio partner..."
                    autoComplete="off"
                  />
                  {showBeerCollabResults && beerCollabResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-card border border-stone-100 rounded-md shadow-xl max-h-40 overflow-y-auto">
                      {beerCollabResults.map((b: any) => (
                        <button key={b.id} type="button"
                          onMouseDown={e => { e.preventDefault(); setBeerEditCollabBreweries([...beerEditCollabBreweries, { id: b.id, name: b.name }]); setBeerCollabQuery(''); setBeerCollabResults([]); setShowBeerCollabResults(false); }}
                          className="w-full px-3 py-2 text-left hover:bg-stone-50 dark:hover:bg-stone-900/20 border-b last:border-b-0 flex items-center gap-2 text-sm text-foreground">
                          {b.logoUrl ? <img src={b.logoUrl} alt="" className="w-5 h-5 rounded-full object-cover" /> : <Building2 className="w-4 h-4 text-primary" />}
                          <span>{b.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{b.location}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Images */}
            <div className="space-y-3 border-t border-stone-100 dark:border-stone-700/20 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ImageUpload
                  label="Immagine Birra"
                  description="Immagine principale (etichetta)"
                  currentImageUrl={beerEditForm.imageUrl || undefined}
                  onImageChange={url => setBeerEditForm(f => ({ ...f, imageUrl: url ?? '' }))}
                  folder="beer-images"
                  aspectRatio="square"
                  maxSize={5}
                  recommendedDimensions="400x400px"
                />
                <ImageUpload
                  label="Immagine Bottiglia"
                  description="Foto della bottiglia"
                  currentImageUrl={beerEditForm.bottleImageUrl || undefined}
                  onImageChange={url => setBeerEditForm(f => ({ ...f, bottleImageUrl: url ?? '' }))}
                  folder="beer-bottles"
                  aspectRatio="portrait"
                  maxSize={5}
                  recommendedDimensions="300x450px"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">URL Logo birra (opzionale)</Label>
                <Input
                  value={beerEditForm.logoUrl}
                  onChange={e => setBeerEditForm(f => ({ ...f, logoUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-700/20">
              <Button variant="outline" className="rounded-xl" onClick={() => setIsBeerEditOpen(false)}>
                <X className="h-4 w-4 mr-1.5" />Annulla
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold"
                onClick={handleSaveBeerEdit}
                disabled={isSavingBeer}
              >
                <Save className="h-4 w-4 mr-1.5" />
                {isSavingBeer ? 'Salvataggio...' : 'Salva'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Beer Dialog */}
      <Dialog open={isDeleteBeerOpen} onOpenChange={setIsDeleteBeerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Elimina Birra
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Sei sicuro di voler eliminare questa birra? L'operazione non può essere annullata.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setIsDeleteBeerOpen(false)}>
              Annulla
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
              onClick={handleDeleteBeer}
              disabled={isDeletingBeer}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              {isDeletingBeer ? 'Eliminazione...' : 'Elimina'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {checkinBeer && (
        <Suspense fallback={null}>
          <CheckinModal
            open={!!checkinBeer}
            onClose={() => setCheckinBeer(null)}
            beer={{
              id: checkinBeer.id,
              name: checkinBeer.name,
              style: checkinBeer.style ?? null,
              breweryName: brewery?.name ?? null,
            }}
            pub={null}
            tapType="bottiglia"
          />
        </Suspense>
      )}

      <Footer />
    </div>
  );
}
