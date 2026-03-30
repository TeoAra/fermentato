import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { getBadgeForCount } from "@/lib/badges";
import { useParams, Link } from "wouter";
import { GlutenFreeIcon } from "@/components/beer-badges";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Star, 
  MapPin, 
  Beer as BeerIcon, 
  Thermometer, 
  Eye, 
  Droplets, 
  Wheat, 
  Building,
  ArrowLeft,
  Heart,
  Share2,
  Wine,
  Store,
  Sparkles,
  Target,
  Factory,
  Pencil,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  Filter,
  ArrowUpDown,
  Flag,
  Lightbulb,
  Building2,
  Users,
  Loader2,
  Trophy,
  MessageSquare
} from "lucide-react";
import Footer from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import BeerTastingForm from "@/components/BeerTastingForm";
import ImageWithFallback from "@/components/image-with-fallback";
import { ImageUpload } from "@/components/image-upload";
import SuggestChangeDialog from "@/components/SuggestChangeDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function getBeerStyleColor(style: string): { bg: string; text: string } {
  const s = style?.toLowerCase() || '';
  if (s.includes('stout') || s.includes('porter')) return { bg: 'rgba(92,61,30,0.12)', text: '#7B4A1E' };
  if (s.includes('sour') || s.includes('gose') || s.includes('lambic') || s.includes('berliner')) return { bg: 'rgba(212,168,56,0.13)', text: '#A8840A' };
  if (s.includes('saison') || s.includes('farmhouse') || s.includes('bière de garde')) return { bg: 'rgba(100,160,70,0.12)', text: '#4E8A28' };
  if (s.includes('wit') || s.includes('weiss') || s.includes('weizen') || s.includes('wheat') || s.includes('farro')) return { bg: 'rgba(212,168,67,0.13)', text: '#9A7820' };
  if (s.includes('lager') || s.includes('pilsner') || s.includes('pils') || s.includes('märzen') || s.includes('marzen') || s.includes('bock')) return { bg: 'rgba(207,168,101,0.13)', text: '#8A6A10' };
  if (s.includes('red') || s.includes('amber') || s.includes('rossa') || s.includes('ambrata')) return { bg: 'rgba(185,60,30,0.12)', text: '#B04020' };
  if (s.includes('barley wine') || s.includes('barleywine') || s.includes('imperial') || s.includes('wee heavy')) return { bg: 'rgba(130,30,80,0.11)', text: '#8A1E55' };
  if (s.includes('apa') || s.includes('pale ale') || s.includes('session')) return { bg: 'rgba(232,140,30,0.12)', text: '#C07010' };
  return { bg: 'rgba(247,113,4,0.11)', text: '#F77104' };
}

interface Beer {
  id: number;
  name: string;
  style: string;
  abv: string;
  ibu?: number;
  description?: string;
  logoUrl?: string;
  imageUrl?: string;
  bottleImageUrl?: string;
  color?: string;
  isBottled?: boolean;
  breweryId: number;
  brewery?: {
    id: number;
    name: string;
    location: string;
    region: string;
    logoUrl?: string;
  };
}

interface BeerAvailability {
  tapLocations: Array<{
    pub: {
      id: number;
      name: string;
      city: string;
      address: string;
    };
    tapItem: {
      id: number;
      price?: string;
      isActive: boolean;
    };
  }>;
  bottleLocations: Array<{
    pub: {
      id: number;
      name: string;
      city: string;
      address: string;
    };
    bottleItem: {
      id: number;
      price?: string;
      isActive: boolean;
    };
  }>;
}

// Stats Card Component
const BeerStatsCard = ({ icon: Icon, value, label, gradient }: any) => (
  <div className="glass-card rounded-xl p-3 sm:p-4 group flex-shrink-0">
    <div className="flex items-center gap-2 sm:gap-3">
      <div className={`p-2 sm:p-2.5 rounded-lg bg-gradient-to-br ${gradient} flex-shrink-0`}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm sm:text-base font-bold text-foreground truncate">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  </div>
);

export default function BeerDetail() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("scheda");
  const [showTastingForm, setShowTastingForm] = useState(false);
  const [quickRating, setQuickRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const tastingRef = useRef<HTMLDivElement>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSuggestDialogOpen, setIsSuggestDialogOpen] = useState(false);
  const [reviewFilterRating, setReviewFilterRating] = useState<number | null>(null);
  const [reviewSortBy, setReviewSortBy] = useState<'recent' | 'highest' | 'lowest'>('recent');
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [reportDialogReviewId, setReportDialogReviewId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState("inappropriato");
  const [reportDescription, setReportDescription] = useState("");
  const [isSavingBeer, setIsSavingBeer] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    style: '',
    abv: '',
    ibu: '',
    description: '',
    color: '',
    logoUrl: '',
    imageUrl: '',
    bottleImageUrl: '',
    isGlutenFree: false,
    isAlcoholFree: false,
    isCollaboration: false,
  });
  const [editCollabBreweries, setEditCollabBreweries] = useState<{ id: number; name: string }[]>([]);
  const [collabQuery, setCollabQuery] = useState("");
  const [collabResults, setCollabResults] = useState<any[]>([]);
  const [showCollabResults, setShowCollabResults] = useState(false);
  const collabDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-translate description for non-Italian users
  const [translatedDesc, setTranslatedDesc] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const userLang = (typeof navigator !== 'undefined' ? navigator.language?.slice(0, 2)?.toLowerCase() : null) ?? "it";

  const searchCollabBreweries = useCallback((q: string, excludeBrewId: number, currentSelected: { id: number; name: string }[]) => {
    if (collabDebounceRef.current) clearTimeout(collabDebounceRef.current);
    if (q.length < 2) { setCollabResults([]); return; }
    collabDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/breweries/search?q=${encodeURIComponent(q)}&limit=10`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        setCollabResults(Array.isArray(data) ? data.filter((b: any) => b.id !== excludeBrewId && !currentSelected.some((s: any) => s.id === b.id)) : []);
        setShowCollabResults(true);
      } catch { setCollabResults([]); }
    }, 250);
  }, []);
  
  const isAdmin = (user as any)?.activeRole === 'admin' || (!((user as any)?.activeRole) && user?.userType === 'admin');
  
  const { data: beer, isLoading: beerLoading } = useQuery<Beer>({
    queryKey: ["/api/beers", id],
    enabled: !!id,
  });

  // Auto-translate: placed here (AFTER beer declaration) to avoid TDZ error
  useEffect(() => {
    const desc = beer?.description;
    if (!desc || typeof desc !== 'string') return;
    if (userLang === "it") return;
    let cancelled = false;
    setTranslating(true);
    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: desc, targetLang: userLang }),
      credentials: "include",
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelled && data && typeof data.translated === 'string' && data.translated.length > 0) {
          setTranslatedDesc(data.translated);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setTranslating(false); });
    return () => { cancelled = true; };
  }, [beer?.description, userLang]);

  const openEditDialog = async () => {
    if (beer) {
      setEditForm({
        name: beer.name || '',
        style: beer.style || '',
        abv: beer.abv || '',
        ibu: beer.ibu?.toString() || '',
        description: beer.description || '',
        color: beer.color || '',
        logoUrl: beer.logoUrl || '',
        imageUrl: beer.imageUrl || '',
        bottleImageUrl: beer.bottleImageUrl || '',
        isGlutenFree: beer.isGlutenFree || false,
        isAlcoholFree: beer.isAlcoholFree || false,
        isCollaboration: (beer as any).isCollaboration || false,
      });
      // Fetch existing collaborations
      try {
        const res = await fetch(`/api/beers/${beer.id}/collaborations`, { credentials: 'include' });
        if (res.ok) {
          const collabs = await res.json();
          setEditCollabBreweries(collabs.map((b: any) => ({ id: b.id, name: b.name })));
          if (collabs.length > 0) {
            setEditForm(prev => ({ ...prev, isCollaboration: true }));
          }
        }
      } catch { setEditCollabBreweries([]); }
      setIsEditDialogOpen(true);
    }
  };
  

  const handleSaveEdit = async () => {
    const collabIds = editForm.isCollaboration ? editCollabBreweries.map(b => b.id) : [];
    console.log('[BeerEdit] isCollaboration:', editForm.isCollaboration, 'collabBreweries:', editCollabBreweries, 'ids:', collabIds);
    const updates: Record<string, any> = {
      name: editForm.name,
      style: editForm.style,
      abv: editForm.abv,
      description: editForm.description || null,
      color: editForm.color || null,
      logoUrl: editForm.logoUrl || null,
      imageUrl: editForm.imageUrl || null,
      bottleImageUrl: editForm.bottleImageUrl || null,
      isGlutenFree: editForm.isGlutenFree,
      isAlcoholFree: editForm.isAlcoholFree,
    };
    if (editForm.ibu) {
      updates.ibu = parseInt(editForm.ibu);
    }
    setIsSavingBeer(true);
    try {
      await Promise.all([
        apiRequest(`/api/admin/beers/${id}`, { method: 'PATCH' }, updates),
        apiRequest(`/api/beers/${id}/collaborations`, { method: 'PUT' }, { breweryIds: collabIds }),
      ]);
      queryClient.invalidateQueries({ queryKey: ["/api/beers", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/beers", id, "collaborations"] });
      collabIds.forEach((bid: number) => {
        queryClient.invalidateQueries({ queryKey: ["/api/breweries", String(bid)] });
        queryClient.invalidateQueries({ queryKey: ["/api/breweries", bid] });
      });
      setIsEditDialogOpen(false);
      toast({ title: "Birra aggiornata con successo" });
    } catch (err: any) {
      toast({ title: "Errore nell'aggiornamento", description: err?.message, variant: "destructive" });
    } finally {
      setIsSavingBeer(false);
    }
  };

  const { data: availability, isLoading: availabilityLoading } = useQuery<BeerAvailability>({
    queryKey: ["/api/beers", id, "availability"],
    enabled: !!id,
  });

  // Check if beer is favorited
  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  const isBeerFavorited = Array.isArray(favorites) && favorites.some((fav: any) => 
    fav.itemType === 'beer' && fav.itemId === parseInt(id || '0')
  );

  // Beer favorites count (public, no auth needed)
  const { data: beerFavoritesCount } = useQuery<{ count: string }>({
    queryKey: ["/api/favorites", "beer", id, "count"],
    queryFn: () => fetch(`/api/favorites/beer/${id}/count`).then(r => r.json()),
    enabled: !!id,
  });
  const beerFavCount = beerFavoritesCount ? parseInt(String(beerFavoritesCount.count)) : 0;

  // Beer collaborations (partner breweries)
  const { data: beerCollabs = [] } = useQuery<{ id: number; name: string; location: string | null; logoUrl: string | null }[]>({
    queryKey: ["/api/beers", id, "collaborations"],
    queryFn: () => fetch(`/api/beers/${id}/collaborations`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .catch(() => []),
    enabled: !!id,
  });

  // Check if user has already tasted this beer
  const { data: userTastings = [] } = useQuery<any[]>({
    queryKey: ["/api/user/beer-tastings"],
    enabled: isAuthenticated,
  });

  const existingTasting = userTastings.find((tasting: any) => tasting.beerId === parseInt(id || '0'));
  const hasTasted = !!existingTasting;

  // Beers from the same brewery (for "Potrebbe piacerti")
  const { data: breweryBeers = [] } = useQuery<any[]>({
    queryKey: ["/api/breweries", beer?.brewery?.id, "beers"],
    enabled: !!beer?.brewery?.id,
    staleTime: 5 * 60_000,
  });

  const suggestedBeers = useMemo(() => {
    const currentId = parseInt(id || '0');
    const sameStyle = breweryBeers.filter((b: any) => b.id !== currentId && b.style && b.style === beer?.style);
    const otherBrewery = breweryBeers.filter((b: any) => b.id !== currentId && b.style !== beer?.style);
    return [...sameStyle, ...otherBrewery].slice(0, 4);
  }, [breweryBeers, id, beer?.style]);

  // Similar beers by style from other breweries
  const { data: similarBeers = [] } = useQuery<any[]>({
    queryKey: ["/api/beers", id, "similar"],
    queryFn: () => fetch(`/api/beers/${id}/similar`).then(r => r.ok ? r.json() : []),
    enabled: !!id && !!beer,
    staleTime: 10 * 60_000,
  });

  // Log page view (fire-and-forget)
  useEffect(() => {
    if (!id) return;
    fetch(`/api/beers/${id}/view`, { method: "POST", credentials: "include" }).catch(() => {});
  }, [id]);

  // Community reviews (public)
  const { data: reviewsData } = useQuery<{ reviews: any[]; avgRating: number | null; reviewCount: number; distribution: Record<number,number> }>({
    queryKey: ["/api/beers", id, "reviews"],
    enabled: !!id,
  });

  const filteredReviews = useMemo(() => {
    if (!reviewsData?.reviews) return [];
    let list = [...reviewsData.reviews];
    if (reviewFilterRating !== null) list = list.filter(r => r.rating === reviewFilterRating);
    if (reviewSortBy === 'highest') list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (reviewSortBy === 'lowest') list.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    else list.sort((a, b) => new Date(b.tastedAt).getTime() - new Date(a.tastedAt).getTime());
    return list;
  }, [reviewsData, reviewFilterRating, reviewSortBy]);

  const reportMutation = useMutation({
    mutationFn: async ({ tastingId, reason, description }: { tastingId: number; reason: string; description: string }) =>
      apiRequest(`/api/reviews/${tastingId}/report`, { method: "POST" }, { reason, description }),
    onSuccess: () => {
      toast({ title: "Segnalazione inviata", description: "Grazie, la segnalazione è stata ricevuta." });
      setReportDialogReviewId(null);
      setReportReason("inappropriato");
      setReportDescription("");
    },
    onError: (err: any) => {
      const msg = err?.message || "Errore nell'invio della segnalazione";
      toast({ title: "Errore", description: msg, variant: "destructive" });
    },
  });

  // Favorite mutation
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
          title: "Aggiunta ai preferiti",
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
      itemType: 'beer',
      itemId: parseInt(id || '0'),
      action: isBeerFavorited ? 'remove' : 'add'
    });
  };

  const handleShare = async () => {
    const beerName = beer?.name || 'Birra';
    const currentUrl = window.location.href;
    
    const shareData = {
      title: `${beerName} - Fermenta.to`,
      text: `Scopri ${beerName} su Fermenta.to`,
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

  if (beerLoading) {
    return (
      <div className="min-h-screen bg-[#FFF8F2] dark:bg-background ">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            <div className="skeleton rounded-2xl h-80 md:h-96"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton rounded-xl h-20"></div>
              ))}
            </div>
            <div className="skeleton rounded-2xl h-96"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!beer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 mx-auto flex items-center justify-center">
            <BeerIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Birra non trovata</h2>
          <p className="text-muted-foreground">
            La birra che stai cercando non esiste o è stata rimossa.
          </p>
          <Button asChild>
            <Link href="/">Torna alla Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const tapLocations = availability?.tapLocations || [];
  const bottleLocations = availability?.bottleLocations || [];
  const totalLocations = tapLocations.length + bottleLocations.length;

  const seoTitle = beer?.name ? `${beer.name} — ${beer.style ?? "Birra Artigianale"} | Fermenta.to` : "Fermenta.to";
  const seoDesc = (beer as any)?.description
    ? (beer as any).description.slice(0, 155)
    : beer?.name
    ? `Scopri ${beer.name}${beer.style ? `, una ${beer.style}` : ""} di ${(beer as any)?.brewery?.name ?? "birrificio artigianale"} su Fermenta.to.`
    : "Fermenta.to — La piattaforma per gli amanti della birra artigianale.";
  const seoImage = beer?.imageUrl || (beer as any)?.bottleImageUrl;
  const seoUrl = `https://fermenta.to/beer/${id}`;

  return (
    <div className="min-h-screen bg-[#FFF8F2] dark:bg-background ">
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
          "@type": "Product",
          "name": beer?.name,
          "description": (beer as any)?.description,
          "url": seoUrl,
          "image": seoImage,
          "brand": { "@type": "Brand", "name": (beer as any)?.brewery?.name },
        })}</script>
      </Helmet>
      
      {/* ── HERO ── orange gradient base, image as overlay (like mockup) */}
      <div className="relative h-[220px] sm:h-[280px] md:h-[340px] overflow-hidden" style={{ background: 'linear-gradient(135deg, #F77104 0%, #f98a0e 50%, #f5a623 100%)' }}>
        {/* Radial light glow */}
        <div className="absolute inset-0 opacity-40 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.9) 0%, transparent 60%)' }} />
        {(beer?.imageUrl || beer?.bottleImageUrl) && (
          <img
            src={beer.imageUrl || beer.bottleImageUrl}
            alt={`${beer?.name} - Immagine`}
            className="w-full h-full object-cover mix-blend-overlay opacity-50"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 flex items-end gap-3">
          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl ring-2 ring-white/40 bg-white/10 backdrop-blur-sm flex-shrink-0 overflow-hidden shadow-lg">
            <ImageWithFallback
              src={beer?.imageUrl || beer?.bottleImageUrl}
              alt={beer?.name}
              imageType="beer"
              containerClassName="w-full h-full"
              className="w-full h-full object-cover"
              iconSize="lg"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl md:text-3xl text-white font-bold leading-tight drop-shadow-md">
                {beer?.name}
              </h1>
              {beerFavCount > 0 && (
                <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-2 py-0.5 flex-shrink-0">
                  <Heart className="h-3 w-3 text-red-300 fill-current" />
                  <span className="text-white text-xs font-semibold leading-none">{beerFavCount}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {beer?.brewery && (
                <Link href={`/brewery/${beer.brewery.id}`}>
                  <span className="text-white/80 text-sm hover:text-primary transition-colors font-medium">{beer.brewery.name}</span>
                </Link>
              )}
              {beerCollabs.length > 0 && (
                <>
                  <span className="text-white/40 text-xs">×</span>
                  {beerCollabs.map((b, i) => (
                    <span key={b.id} className="inline-flex items-center gap-1">
                      {i > 0 && <span className="text-white/40 text-xs">×</span>}
                      <Link href={`/brewery/${b.id}`}>
                        <span className="text-primary hover:text-primary/80 text-sm font-medium">{b.name}</span>
                      </Link>
                    </span>
                  ))}
                  <span className="text-primary/80 text-[10px] font-bold bg-primary/15 px-1.5 py-0.5 rounded-full border border-primary/25">collab</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── INFO BAR ── */}
      <div className="bg-white dark:bg-[hsl(25,14%,10%)] rounded-2xl border border-stone-100 shadow-sm border-b  px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-3">
          {/* Info pills */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {beer?.abv && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/30 text-primary border border-stone-200 dark:border-stone-700/30">
                <Target className="h-3.5 w-3.5" />
                {beer.abv}% ABV
              </span>
            )}
            {beer?.style && (() => {
              const sc = getBeerStyleColor(beer.style);
              return (
                <Link href={`/search?q=${encodeURIComponent(beer.style)}`} className="max-w-full">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold cursor-pointer whitespace-normal text-center border transition-colors" style={{ background: sc.bg, color: sc.text, borderColor: `${sc.text}30` }}>
                    <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
                    {beer.style}
                  </span>
                </Link>
              );
            })()}
            {reviewsData?.avgRating != null && (
              <button onClick={() => setActiveTab('recensioni')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900 transition-colors">
                <Star className="h-3.5 w-3.5 fill-current" />
                {Number(reviewsData.avgRating).toFixed(1)}
                <span className="font-normal opacity-70 text-xs">({reviewsData.reviewCount})</span>
              </button>
            )}
            {totalLocations > 0 && (
              <button onClick={() => setActiveTab('dove')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900 transition-colors">
                <MapPin className="h-3.5 w-3.5" />
                {totalLocations} {totalLocations === 1 ? 'locale' : 'locali'}
              </button>
            )}
            {beer?.isGlutenFree && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                <GlutenFreeIcon size={14} className="text-green-600" />
                Gluten Free
              </span>
            )}
            {beer?.isAlcoholFree && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-stone-50 text-primary">
                0.0% Analcolica
              </span>
            )}
          </div>
          {/* Quick star rating */}
          {isAuthenticated && (
            <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  {hasTasted ? "Il tuo voto" : "Dai un voto rapido"}
                </span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button
                      key={s}
                      onMouseEnter={() => !hasTasted && setHoverRating(s)}
                      onMouseLeave={() => !hasTasted && setHoverRating(0)}
                      onClick={() => {
                        setActiveTab('recensioni');
                        if (!hasTasted) setQuickRating(s);
                        setTimeout(() => tastingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
                      }}
                      className="p-0.5 transition-transform hover:scale-110"
                    >
                      <Star className={`h-5 w-5 transition-colors ${
                        s <= (hasTasted ? existingTasting?.rating || 0 : (hoverRating || quickRating))
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-gray-300 dark:text-gray-600'
                      }`} />
                    </button>
                  ))}
                </div>
            </div>
          )}

          {/* Action buttons – centered */}
          <div className="flex items-center gap-2 justify-center">
            <button
              onClick={handleFavoriteToggle}
              disabled={favoriteMutation.isPending}
              title={isBeerFavorited ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
              data-testid="button-favorite"
              className={`h-9 w-9 flex items-center justify-center rounded-full border transition-all ${
                isBeerFavorited
                  ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-500'
                  : 'bg-white dark:bg-[hsl(25,14%,10%)] border-stone-100 dark:border-[hsl(25,12%,16%)] text-muted-foreground hover:border-primary/20'
              }`}
            >
              <Heart className={`h-4 w-4 ${isBeerFavorited ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={handleShare}
              title="Condividi"
              data-testid="button-share"
              className="h-9 w-9 flex items-center justify-center rounded-full border bg-white dark:bg-[hsl(25,14%,10%)] border-stone-100 dark:border-[hsl(25,12%,16%)] text-muted-foreground hover:border-primary/20 transition-colors"
            >
              <Share2 className="h-4 w-4" />
            </button>
            {isAdmin && (
              <button
                onClick={openEditDialog}
                title="Modifica birra"
                data-testid="button-admin-edit-beer"
                className="h-9 w-9 flex items-center justify-center rounded-full border bg-stone-50 dark:bg-stone-900/20 dark:bg-stone-900/30 border-stone-200 dark:border-stone-700/30 dark:border-stone-700/30 text-primary dark:text-orange-400 dark:text-orange-400 hover:bg-stone-50 dark:bg-stone-900/20 dark:hover:bg-stone-900/10 transition-colors"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {isAuthenticated && !isAdmin && (
              <button
                onClick={() => setIsSuggestDialogOpen(true)}
                title="Suggerisci modifica"
                data-testid="button-suggest-change"
                className="h-9 w-9 flex items-center justify-center rounded-full border bg-white dark:bg-[hsl(25,14%,10%)] border-stone-100 dark:border-[hsl(25,12%,16%)] text-muted-foreground hover:border-primary/20 transition-colors"
              >
                <Lightbulb className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto pb-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="z-10 bg-[#FFF8F2] dark:bg-background border-b border-gray-200 dark:border-gray-800">
            <TabsList className="flex w-full h-auto bg-transparent p-0 rounded-none shadow-none border-none overflow-x-auto scrollbar-hide">
              <TabsTrigger
                value="scheda"
                className="relative flex items-center gap-1.5 px-4 py-3 text-sm font-bold whitespace-nowrap rounded-none bg-transparent border-none shadow-none transition-colors text-muted-foreground data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-primary after:opacity-0 data-[state=active]:after:opacity-100 after:transition-opacity"
              >
                <BeerIcon className="h-3.5 w-3.5 flex-shrink-0" />
                Scheda
              </TabsTrigger>
              <TabsTrigger
                value="dove"
                className="relative flex items-center gap-1.5 px-4 py-3 text-sm font-bold whitespace-nowrap rounded-none bg-transparent border-none shadow-none transition-colors text-muted-foreground data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-primary after:opacity-0 data-[state=active]:after:opacity-100 after:transition-opacity"
              >
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                Dove trovarla
                {totalLocations > 0 && <span className="text-[10px] font-bold opacity-60">{totalLocations}</span>}
              </TabsTrigger>
              <TabsTrigger
                value="recensioni"
                className="relative flex items-center gap-1.5 px-4 py-3 text-sm font-bold whitespace-nowrap rounded-none bg-transparent border-none shadow-none transition-colors text-muted-foreground data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-primary after:opacity-0 data-[state=active]:after:opacity-100 after:transition-opacity"
              >
                <Star className="h-3.5 w-3.5 flex-shrink-0" />
                Recensioni
                {(reviewsData?.reviewCount ?? 0) > 0 && <span className="text-[10px] font-bold opacity-60">{reviewsData?.reviewCount}</span>}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── TAB: SCHEDA ── */}
          <TabsContent value="scheda" className="px-4 lg:px-6 pt-5 pb-10 space-y-6">

            {/* Specs grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="rounded-2xl p-3 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/30 border border-stone-200 dark:border-stone-700/40 flex items-center gap-2.5">
                <Target className="h-4 w-4 text-primary flex-shrink-0" />
                <div><p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">ABV</p><p className="text-sm font-bold text-foreground">{beer?.abv ? `${beer.abv}%` : '—'}</p></div>
              </div>
              <div className="rounded-2xl p-3 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/30 border border-stone-200 dark:border-stone-700/40 flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="min-w-0"><p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Stile</p><p className="text-sm font-bold text-foreground leading-tight line-clamp-2">{beer?.style || '—'}</p></div>
              </div>
              {beer?.color && (
                <div className="rounded-2xl p-3 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/30 border border-stone-200 dark:border-stone-700/40 flex items-center gap-2.5">
                  <Droplets className="h-4 w-4 text-primary flex-shrink-0" />
                  <div><p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Colore</p><p className="text-sm font-bold text-foreground truncate">{beer.color}</p></div>
                </div>
              )}
              {beer?.ibu && (
                <div className="rounded-2xl p-3 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/30 border border-stone-200 dark:border-stone-700/40 flex items-center gap-2.5">
                  <Wheat className="h-4 w-4 text-primary flex-shrink-0" />
                  <div><p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">IBU</p><p className="text-sm font-bold text-foreground">{beer.ibu}</p></div>
                </div>
              )}
            </div>

            {/* Description */}
            {beer?.description && (
              <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrizione</p>
              {translating && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />Traduzione…
                </span>
              )}
                  {translatedDesc && !translating && (
                    <span className="text-[10px] font-semibold bg-stone-50 text-primary px-2 py-0.5 rounded-full">
                      Tradotto
                    </span>
                  )}
                </div>
                <p className="text-foreground leading-relaxed whitespace-pre-line text-sm">
                  {String(translatedDesc || beer.description || '')}
                </p>
                {translatedDesc && beer.description && (
                  <details className="mt-3">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none transition-colors">
                      Testo originale
                    </summary>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-line border-t border-stone-100 pt-2">
                      {String(beer.description)}
                    </p>
                  </details>
                )}
              </div>
            )}

            {/* Brewery info */}
            {beer?.brewery && (
              <>
                <div className="border-t " />
                <Link href={`/brewery/${beer.brewery.id}`}>
                  <div className="bg-white dark:bg-[hsl(25,14%,10%)] rounded-2xl border border-stone-100 dark:border-[hsl(25,12%,16%)] shadow-sm p-4 flex items-center gap-4 group cursor-pointer transition-all hover:border-primary/20 hover:-translate-y-0.5 active:scale-[0.98]">
                    <div className="w-14 h-14 rounded-2xl bg-stone-50 dark:bg-[hsl(24,93%,15%)] border border-stone-200 dark:border-stone-700/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {(beer.brewery as any).logoUrl
                        ? <img src={(beer.brewery as any).logoUrl} alt={beer.brewery.name} className="w-full h-full object-contain p-1 lightbox-img" />
                        : <Building2 className="h-6 w-6 text-primary" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-0.5">Birrificio</p>
                      <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">{beer.brewery.name}</p>
                      {beer.brewery.location && <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><MapPin className="h-3 w-3" />{beer.brewery.location}</p>}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>
                </Link>
              </>
            )}

            {/* Awards / Premi */}
            {(beer as any)?.awards && (beer as any).awards.length > 0 && (
              <>
                <div className="border-t " />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Premi e Riconoscimenti</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(beer as any).awards.map((award: any, i: number) => (
                      <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-100 dark:border-stone-700/50 shadow-sm text-sm">
                        <Trophy className={`h-3.5 w-3.5 flex-shrink-0 ${award.type === 'gold' ? 'text-yellow-500' : award.type === 'silver' ? 'text-muted-foreground' : award.type === 'bronze' ? 'text-primary' : 'text-primary'}`} />
                        <span className="font-semibold text-foreground">{award.name}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground text-xs">{award.competition}</span>
                        <span className="text-muted-foreground text-xs">({award.year})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Potrebbe piacerti */}
            {suggestedBeers.length > 0 && (
              <>
                <div className="border-t " />
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Potrebbe piacerti</h3>
                  </div>
                  <div className="space-y-1">
                    {suggestedBeers.map((sb: any) => (
                      <Link key={sb.id} href={`/beer/${sb.id}`}>
                        <div className="flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-900/20 transition-colors group">
                          <div className="w-10 h-10 rounded-xl bg-stone-50 dark:bg-[hsl(24,93%,15%)] flex items-center justify-center flex-shrink-0 overflow-hidden border border-stone-200 dark:border-stone-700/30">
                            {sb.imageUrl
                              ? <img src={sb.imageUrl} alt={sb.name} className="w-full h-full object-cover lightbox-img" />
                              : <BeerIcon className="h-4 w-4 text-primary" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">{sb.name}</p>
                            {sb.style && <p className="text-xs text-muted-foreground truncate mt-0.5">{sb.style}{sb.abv ? ` · ${sb.abv}%` : ''}</p>}
                          </div>
                          {sb.avgRating != null && (
                            <div className="flex items-center gap-0.5 text-xs font-bold text-primary flex-shrink-0 bg-stone-50 px-2 py-0.5 rounded-full">
                              <Star className="h-3 w-3 fill-current" />
                              {sb.avgRating.toFixed(1)}
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* ── TAB: DOVE TROVARLA ── */}
          <TabsContent value="dove" className="px-4 lg:px-6 pt-6 pb-8">
            {availabilityLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
              </div>
            ) : totalLocations === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 bg-stone-50 dark:bg-[hsl(24,93%,15%)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-7 w-7 text-primary" />
                </div>
                <p className="text-muted-foreground text-sm">Questa birra non è disponibile in nessun locale al momento.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {tapLocations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
                      <Wine className="h-4 w-4 text-primary" />
                      Alla Spina ({tapLocations.length})
                    </h3>
                    <div className="space-y-2">
                      {tapLocations.map((location: any, idx: number) => (
                        <Link key={idx} href={`/pub/${location.pub.id}`}>
                          <div className="bg-white dark:bg-[hsl(25,14%,10%)] rounded-2xl border border-stone-100 dark:border-[hsl(25,12%,16%)] shadow-sm p-4 border  hover:border-primary/20 transition-colors flex items-center justify-between group">
                            <div>
                              <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{location.pub.name}</h4>
                              <p className="text-xs text-muted-foreground">{location.pub.address}, {location.pub.city}</p>
                            </div>
                            {location.tapItem.price && (
                              <Badge className="bg-stone-50 text-primary border-stone-200 border text-xs font-bold">€{location.tapItem.price}</Badge>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {bottleLocations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
                      <BeerIcon className="h-4 w-4 text-primary" />
                      In Bottiglia ({bottleLocations.length})
                    </h3>
                    <div className="space-y-2">
                      {bottleLocations.map((location: any, idx: number) => (
                        <Link key={idx} href={`/pub/${location.pub.id}`}>
                          <div className="bg-white dark:bg-[hsl(25,14%,10%)] rounded-2xl border border-stone-100 dark:border-[hsl(25,12%,16%)] shadow-sm p-4 border  hover:border-primary/20 transition-colors flex items-center justify-between group">
                            <div>
                              <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{location.pub.name}</h4>
                              <p className="text-xs text-muted-foreground">{location.pub.address}, {location.pub.city}</p>
                            </div>
                            {location.bottleItem.price && (
                              <Badge className="bg-stone-50 text-primary border-stone-200 border text-xs font-bold">€{location.bottleItem.price}</Badge>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── TAB: RECENSIONI ── */}
          <TabsContent value="recensioni" className="px-4 lg:px-6 pt-6 pb-8 space-y-6">
            {/* My tasting note */}
            {isAuthenticated && (
              <div className="bg-white dark:bg-[hsl(25,14%,10%)] rounded-2xl border border-stone-100 dark:border-[hsl(25,12%,16%)] shadow-sm p-5 border ">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" />
                    La mia nota
                  </h2>
                  {hasTasted && !showTastingForm && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTastingForm(true)}
                      className="bg-white/60 dark:bg-[hsl(25,14%,12%)]/60 h-8 text-xs"
                      data-testid="button-edit-tasting"
                    >
                      Modifica
                    </Button>
                  )}
                </div>

              <div ref={tastingRef} />
              {showTastingForm || !hasTasted ? (
                <BeerTastingForm
                  beerId={parseInt(id || '0')}
                  existingTasting={existingTasting}
                  initialRating={quickRating || undefined}
                  autoOpen={quickRating > 0}
                  onSuccess={() => {
                    setShowTastingForm(false);
                    setQuickRating(0);
                    queryClient.invalidateQueries({ queryKey: ["/api/user/beer-tastings"] });
                  }}
                  onCancel={() => { setShowTastingForm(false); setQuickRating(0); }}
                />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {[1,2,3,4,5].map(s => <Star key={s} className={`h-4 w-4 ${s <= existingTasting.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`} />)}
                    <span className="text-sm font-bold text-foreground">{existingTasting.rating}/5</span>
                  </div>
                  {(existingTasting.personalNotes || existingTasting.notes) && (
                    <p className="text-muted-foreground italic text-sm">"{existingTasting.personalNotes || existingTasting.notes}"</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Degustata il {new Date(existingTasting.tastedAt).toLocaleDateString('it-IT')}
                    {existingTasting.format ? ` in ${existingTasting.format}` : ''}
                    {existingTasting.pubName ? ` presso ${existingTasting.pubName}` : ''}
                  </p>
                </div>
              )}
              </div>
            )}

            {/* Community Reviews */}
            {reviewsData && reviewsData.reviewCount > 0 && (
              <div className="bg-white dark:bg-[hsl(25,14%,10%)] rounded-2xl border border-stone-100 dark:border-[hsl(25,12%,16%)] shadow-sm p-4 border-b">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    Recensioni Community
                    <span className="text-sm font-normal text-muted-foreground">({reviewsData.reviewCount})</span>
                  </h2>
                  {reviewsData.avgRating && (
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(reviewsData.avgRating || 0) ? 'text-amber-500 fill-amber-500' : 'text-gray-300 dark:text-gray-400'}`} />
                      ))}
                      <span className="ml-1 text-sm font-bold text-foreground">{reviewsData.avgRating?.toFixed(1)}</span>
                    </div>
                  )}
                </div>

              {/* Rating Distribution Histogram */}
              {reviewsData.distribution && (
                <div className="mb-4 space-y-1.5 bg-stone-50/50 dark:bg-stone-900/20 rounded-xl p-3">
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = reviewsData.distribution?.[star] || 0;
                    const pct = reviewsData.reviewCount > 0 ? (count / reviewsData.reviewCount) * 100 : 0;
                    const isActive = reviewFilterRating === star;
                    return (
                      <button
                        key={star}
                        onClick={() => { setReviewFilterRating(isActive ? null : star); setShowAllReviews(false); }}
                        className={`flex items-center gap-3 w-full rounded-lg px-1 py-0.5 transition-colors ${isActive ? 'bg-stone-100 dark:bg-stone-900/30' : 'hover:bg-stone-50 dark:hover:bg-stone-900/20'}`}
                      >
                        <div className="flex items-center gap-1 w-12 flex-shrink-0">
                          <span className="text-xs font-bold text-muted-foreground w-3">{star}</span>
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        </div>
                        <div className="flex-1 h-2 bg-stone-100 dark:bg-orange-900/30 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${isActive ? 'bg-gradient-to-r from-[#F77104] to-[#f5a623]' : 'bg-gradient-to-r from-yellow-400 to-orange-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-6 text-right">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Filters */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Filter className="h-3.5 w-3.5" />
                  <span className="font-medium">Filtra:</span>
                </div>
                {reviewFilterRating !== null && (
                  <button
                    onClick={() => setReviewFilterRating(null)}
                    className="flex items-center gap-1 text-xs bg-stone-50 dark:bg-stone-900/20 dark:bg-stone-900/30 text-primary dark:text-orange-400 dark:text-primary px-2.5 py-1 rounded-full font-medium border border-stone-200 dark:border-stone-700/30 dark:border-stone-700/30 hover:bg-stone-50 dark:hover:bg-stone-900/10 transition-colors"
                  >
                    {reviewFilterRating}★ <X className="h-3 w-3" />
                  </button>
                )}
                <div className="flex items-center gap-1.5 ml-auto">
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                  {(['recent', 'highest', 'lowest'] as const).map(opt => (
                    <button
                      key={opt}
                      onClick={() => { setReviewSortBy(opt); setShowAllReviews(false); }}
                      className={`text-xs px-2.5 py-1 rounded-full border font-bold transition-all ${
                        reviewSortBy === opt
                          ? 'text-white border-transparent'
                          : 'text-muted-foreground border-stone-100 hover:border-primary/20'
                      }`}
                      style={reviewSortBy === opt ? { background: 'linear-gradient(135deg, #F77104 0%, #f98a0e 50%, #f5a623 100%)' } : {}}
                    >
                      {opt === 'recent' ? 'Recenti' : opt === 'highest' ? '↑ Voto' : '↓ Voto'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Review cards */}
              <div className="space-y-3">
                {(showAllReviews ? filteredReviews : filteredReviews.slice(0, 5)).map((review: any) => {
                  const displayName = review.nickname || review.firstName || 'Utente';
                  const initials = displayName[0]?.toUpperCase() || 'U';
                  const userBadge = getBadgeForCount(Number(review.userReviewCount || 0));
                  const isPublicReviewer = review.isPublic !== false;
                  return (
                    <div key={review.id} className="flex gap-3 p-3 bg-stone-50/30 dark:bg-stone-900/10 rounded-xl group">
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        {review.profileImageUrl && <AvatarImage src={review.profileImageUrl} />}
                        <AvatarFallback className="bg-gradient-to-br from-[hsl(24,93%,49%)] to-[hsl(20,95%,42%)] text-white font-bold text-sm">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isPublicReviewer ? (
                              <Link href={`/user/${review.nickname || review.userId}`}>
                                <span className="font-bold text-sm text-foreground hover:text-primary cursor-pointer transition-colors truncate">{displayName}</span>
                              </Link>
                            ) : (
                              <span className="font-bold text-sm text-foreground truncate">{displayName}</span>
                            )}
                            <span className="text-sm flex-shrink-0" title={userBadge.name}>{userBadge.emoji}</span>
                          </div>
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`h-3 w-3 ${s <= (review.rating || 0) ? 'text-amber-500 fill-amber-500' : 'text-gray-300 dark:text-gray-400'}`} />
                            ))}
                          </div>
                        </div>
                        {review.personalNotes && (
                          <p className="text-sm text-foreground italic mb-1">"{review.personalNotes}"</p>
                        )}
                        {review.ownerReply && (
                          <div className="mt-2 ml-1 pl-3 border-l-2 border-stone-100 dark:border-stone-700/30 rounded-sm">
                            <div className="flex items-center gap-1 mb-0.5">
                              <MessageSquare className="h-3 w-3 text-primary" />
                              <span className="text-xs font-bold text-primary">Risposta del birrificio</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{review.ownerReply}</p>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span>Degustata il {new Date(review.tastedAt).toLocaleDateString('it-IT')}</span>
                            {review.format && <span>in {review.format}</span>}
                            {review.pubId && review.pubName && (
                              <>
                                <span>presso</span>
                                <a
                                  href={`/pub/${review.pubId}`}
                                  className="text-primary hover:text-primary/80 hover:underline font-bold"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {review.pubName}
                                </a>
                              </>
                            )}
                          </div>
                          {isAuthenticated && (
                            <button
                              onClick={() => { setReportDialogReviewId(review.id); }}
                              className="flex items-center gap-1 text-muted-foreground hover:text-destructive transition-colors"
                              title="Segnala recensione"
                            >
                              <Flag className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Show more / less */}
              {filteredReviews.length > 5 && (
                <button
                  onClick={() => setShowAllReviews(!showAllReviews)}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-primary hover:text-primary/80 border border-dashed border-stone-200 dark:border-stone-700/30 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-900/10 transition-colors"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAllReviews ? 'rotate-180' : ''}`} />
                  {showAllReviews
                    ? 'Mostra meno'
                    : `Mostra altre ${filteredReviews.length - 5} recensioni`}
                </button>
              )}

              {filteredReviews.length === 0 && reviewFilterRating !== null && (
                <div className="text-center py-6 text-muted-foreground">
                  <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nessuna recensione con {reviewFilterRating} stelle</p>
                  <button onClick={() => setReviewFilterRating(null)} className="text-xs text-primary mt-1 hover:underline">Rimuovi filtro</button>
                </div>
              )}
              </div>
            )}
          </TabsContent>

        </Tabs>
      </main>

      {/* Admin Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Modifica Birra
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
                  placeholder="Nome della birra"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-style">Stile</Label>
                <Input
                  id="edit-style"
                  value={editForm.style}
                  onChange={(e) => setEditForm({ ...editForm, style: e.target.value })}
                  placeholder="Es. IPA, Lager, Stout..."
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-abv">ABV (%)</Label>
                <Input
                  id="edit-abv"
                  value={editForm.abv}
                  onChange={(e) => setEditForm({ ...editForm, abv: e.target.value })}
                  placeholder="5.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ibu">IBU</Label>
                <Input
                  id="edit-ibu"
                  type="number"
                  value={editForm.ibu}
                  onChange={(e) => setEditForm({ ...editForm, ibu: e.target.value })}
                  placeholder="40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-color">Colore</Label>
                <Input
                  id="edit-color"
                  value={editForm.color}
                  onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                  placeholder="Ambrato, Scuro..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrizione</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Descrizione della birra..."
                rows={4}
              />
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.isGlutenFree}
                  onChange={(e) => setEditForm({ ...editForm, isGlutenFree: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700 dark:text-green-400">
                  <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zM5.5 7.5h5v1.5h-5z"/></svg>
                  Gluten Free
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.isAlcoholFree}
                  onChange={(e) => setEditForm({ ...editForm, isAlcoholFree: e.target.checked })}
                  className="w-4 h-4 rounded border-stone-100 text-primary focus:ring-primary"
                />
                <span className="text-sm font-bold text-primary">0.0% Analcolica</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.isCollaboration}
                  onChange={(e) => { setEditForm({ ...editForm, isCollaboration: e.target.checked }); if (!e.target.checked) setEditCollabBreweries([]); }}
                  className="w-4 h-4 rounded border-stone-100 text-primary focus:ring-primary"
                />
                <span className="text-sm font-bold text-primary flex items-center gap-1"><Users className="w-3.5 h-3.5" />Birra in Collaborazione</span>
              </label>
            </div>
            {editForm.isCollaboration && (
              <div className="space-y-2 p-3 rounded-lg border border-stone-200 bg-stone-50 dark:bg-[hsl(24,93%,15%)]">
                <Label className="text-primary font-bold flex items-center gap-1.5"><Building2 className="w-4 h-4" />Birrifici Partner</Label>
                {editCollabBreweries.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {editCollabBreweries.map(b => (
                      <span key={b.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-100 dark:border-stone-700/30 text-primary">
                        <Building2 className="w-3 h-3" />{b.name}
                        <button type="button" onClick={() => setEditCollabBreweries(editCollabBreweries.filter(x => x.id !== b.id))} className="ml-0.5 hover:text-primary/80 transition-colors">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <Input
                    value={collabQuery}
                    onChange={e => { setCollabQuery(e.target.value); searchCollabBreweries(e.target.value, (beer as any)?.breweryId, editCollabBreweries); }}
                    onBlur={() => setTimeout(() => setShowCollabResults(false), 200)}
                    placeholder="Cerca birrificio partner..."
                    autoComplete="off"
                  />
                  {showCollabResults && collabResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-100 rounded-md shadow-xl max-h-40 overflow-y-auto">
                      {collabResults.map((b: any) => (
                        <button key={b.id} type="button"
                          onMouseDown={e => { e.preventDefault(); setEditCollabBreweries([...editCollabBreweries, { id: b.id, name: b.name }]); setCollabQuery(""); setCollabResults([]); setShowCollabResults(false); }}
                          className="w-full px-3 py-2 text-left hover:bg-stone-50 dark:hover:bg-stone-900/20 border-b last:border-b-0 flex items-center gap-2 text-sm text-foreground">
                          {b.logoUrl ? <img src={b.logoUrl} alt="" className="w-5 h-5 rounded-full object-cover" /> : <Building2 className="w-4 h-4 text-primary" />}
                          <span>{b.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{b.location}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-primary font-bold">La birra apparirà nelle pagine di tutti i birrifici partner.</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ImageUpload
                label="Immagine Birra"
                description="Immagine principale della birra"
                currentImageUrl={editForm.imageUrl || undefined}
                onImageChange={(url) => setEditForm({ ...editForm, imageUrl: url || '' })}
                folder="beer-images"
                aspectRatio="square"
                maxSize={5}
                recommendedDimensions="400x400px"
              />
              <ImageUpload
                label="Immagine Bottiglia"
                description="Foto della bottiglia"
                currentImageUrl={editForm.bottleImageUrl || undefined}
                onImageChange={(url) => setEditForm({ ...editForm, bottleImageUrl: url || '' })}
                folder="beer-bottles"
                aspectRatio="portrait"
                maxSize={5}
                recommendedDimensions="300x450px"
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
                disabled={isSavingBeer}
                className="text-white hover:opacity-90 border-none"
                style={{ background: 'linear-gradient(135deg, #F77104 0%, #f98a0e 50%, #f5a623 100%)' }}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSavingBeer ? 'Salvataggio...' : 'Salva'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Report Review Dialog */}
      <Dialog open={reportDialogReviewId !== null} onOpenChange={(open) => { if (!open) setReportDialogReviewId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-primary" />
              Segnala recensione
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-bold text-foreground block mb-2">Motivo della segnalazione</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full border border-stone-100 dark:border-[hsl(25,12%,16%)] rounded-md px-3 py-2 text-sm bg-white dark:bg-[hsl(25,14%,10%)] text-foreground"
              >
                <option value="inappropriato">Contenuto inappropriato</option>
                <option value="spam">Spam o pubblicità</option>
                <option value="falso">Recensione falsa</option>
                <option value="offensivo">Linguaggio offensivo</option>
                <option value="altro">Altro</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-foreground block mb-2">Descrizione (opzionale)</label>
              <Textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Spiega brevemente il problema..."
                rows={3}
                className="text-sm"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setReportDialogReviewId(null)}>
                Annulla
              </Button>
              <Button
                className="flex-1 text-white font-bold hover:opacity-90 border-none"
                style={{ background: 'linear-gradient(135deg, #F77104 0%, #f98a0e 50%, #f5a623 100%)' }}
                disabled={reportMutation.isPending}
                onClick={() => {
                  if (reportDialogReviewId) {
                    reportMutation.mutate({ tastingId: reportDialogReviewId, reason: reportReason, description: reportDescription });
                  }
                }}
              >
                {reportMutation.isPending ? "Invio..." : "Segnala"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Suggest Change Dialog */}
      {beer && (
        <SuggestChangeDialog
          open={isSuggestDialogOpen}
          onOpenChange={setIsSuggestDialogOpen}
          type="beer"
          itemId={beer.id}
          currentData={{
            name: beer.name,
            style: beer.style,
            abv: beer.abv,
            ibu: beer.ibu ?? null,
            description: beer.description ?? null,
            color: beer.color ?? null,
            logoUrl: beer.logoUrl ?? null,
            imageUrl: beer.imageUrl ?? null,
            bottleImageUrl: beer.bottleImageUrl ?? null,
            isGlutenFree: beer.isGlutenFree ?? false,
            isAlcoholFree: beer.isAlcoholFree ?? false,
          }}
        />
      )}

      {/* Potrebbero piacerti — same style, other breweries */}
      {similarBeers.length > 0 && (
        <div className="bg-background dark:bg-[hsl(25,14%,8%)] border-t  py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Potrebbero piacerti
              <span className="text-xs font-normal text-muted-foreground ml-1">· stile {beer?.style}</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {similarBeers.map((b: any) => (
                <Link key={b.id} href={`/beer/${b.id}`}>
                  <div className="group bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-100 dark:border-[hsl(25,12%,16%)] rounded-xl p-3 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer h-full flex flex-col">
                    <div className="w-10 h-10 rounded-lg flex-shrink-0 bg-stone-50 dark:bg-[hsl(24,93%,15%)] flex items-center justify-center overflow-hidden mb-2 mx-auto">
                      {b.imageUrl ? (
                        <img src={b.imageUrl} alt={b.name} className="w-10 h-10 object-contain p-0.5 lightbox-img" />
                      ) : b.breweryLogoUrl ? (
                        <img src={b.breweryLogoUrl} alt={b.breweryName} className="w-8 h-8 object-contain lightbox-img" />
                      ) : (
                        <BeerIcon className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <p className="font-bold text-xs text-foreground line-clamp-2 group-hover:text-primary text-center leading-tight">
                      {b.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1 text-center mt-0.5">
                      {b.breweryName}
                    </p>
                    {b.abv && (
                      <p className="text-[10px] font-bold text-primary text-center mt-1">{b.abv}% ABV</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
