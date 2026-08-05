import { useState, useMemo, useRef, useCallback, useEffect, lazy, Suspense } from "react";
import { RichTextDisplay } from "@/components/rich-text-editor";

const CheckinModal = lazy(() => import("@/components/checkin-modal"));
import { Helmet } from "react-helmet-async";
import { useParams, Link, useLocation } from "wouter";
import { GlutenFreeIcon } from "@/components/beer-badges";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Star, 
  MapPin, 
  Beer as BeerIcon, 
  ArrowLeft,
  Heart,
  Share2,
  Wine,
  Sparkles,
  Pencil,
  Save,
  X,
  ChevronRight,
  Flag,
  Lightbulb,
  Building2,
  Users,
  Loader2,
  Trophy,
  Trash2,
  AlertTriangle,
  MoreHorizontal,
  Home as HomeIcon,
  Info as InfoIcon,
} from "lucide-react";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { WishlistButton } from "@/components/WishlistButton";
import ImageWithFallback from "@/components/image-with-fallback";
import { ImageUpload } from "@/components/image-upload";
import { WebImageSearchButton } from "@/components/web-image-search-button";
import SuggestChangeDialog from "@/components/SuggestChangeDialog";
import StickyPubTabs, { type StickyTabDef } from "@/components/pub/StickyPubTabs";
import BeerHero from "@/components/beer/BeerHero";
import BeerStatsStrip from "@/components/beer/BeerStatsStrip";
import BeerAvailabilitySection from "@/components/beer/BeerAvailabilitySection";
import BeerInfoSection from "@/components/beer/BeerInfoSection";
import BeerReviewsSection from "@/components/beer/BeerReviewsSection";

const BEER_TABS: StickyTabDef[] = [
  { value: "overview", label: "Panoramica", icon: <HomeIcon className="w-4 h-4" /> },
  { value: "disponibilita", label: "Disponibilità", icon: <MapPin className="w-4 h-4" /> },
  { value: "recensioni", label: "Recensioni", icon: <Star className="w-4 h-4" /> },
  { value: "info", label: "Info", icon: <InfoIcon className="w-4 h-4" /> },
];

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

  color?: string;
  isBottled?: boolean;
  isGlutenFree?: boolean | null;
  isAlcoholFree?: boolean | null;
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


interface ScanRedirectContext {
  beerId: number;
  beerName: string;
  breweryName: string;
  query: string;
  ocrText: string;
  memoryMatch: boolean;
  memorySimilarity?: number;
}

export default function BeerDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("overview");

  // ── Scan redirect banner ─────────────────────────────────────────────────
  const [scanCtx, setScanCtx] = useState<ScanRedirectContext | null>(null);
  const [isSearchingImage, setIsSearchingImage] = useState(false);
  const [scanBannerDismissed, setScanBannerDismissed] = useState(false);
  useEffect(() => {
    const fromScan = new URLSearchParams(window.location.search).get("from") === "scan";
    if (!fromScan) return;
    try {
      const raw = sessionStorage.getItem("scan_redirect");
      if (raw) {
        const ctx = JSON.parse(raw) as ScanRedirectContext;
        if (ctx.beerId === parseInt(id as string)) setScanCtx(ctx);
      }
    } catch { /* ignore */ }
  }, [id]);
  const [showTastingForm, setShowTastingForm] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSuggestDialogOpen, setIsSuggestDialogOpen] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [reviewFilterRating, setReviewFilterRating] = useState<number | null>(null);
  const [reviewSortBy, setReviewSortBy] = useState<'recent' | 'highest' | 'lowest'>('recent');
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [reportDialogReviewId, setReportDialogReviewId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState("inappropriato");
  const [reportDescription, setReportDescription] = useState("");
  const [isSavingBeer, setIsSavingBeer] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingBeer, setIsDeletingBeer] = useState(false);
  const [showAllPubs, setShowAllPubs] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    style: '',
    abv: '',
    ibu: '',
    description: '',
    color: '',
    logoUrl: '',
    imageUrl: '',

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
  
  const isAdmin = (user as any)?.activeRole === 'admin' || (!((user as any)?.activeRole) && (user as any)?.userType === 'admin');
  const isPubOwner = (user as any)?.activeRole === 'pub_owner' || (!((user as any)?.activeRole) && (user as any)?.userType === 'pub_owner');
  
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
    const updates: Record<string, any> = {
      name: editForm.name,
      style: editForm.style,
      abv: editForm.abv,
      description: editForm.description || null,
      color: editForm.color || null,
      logoUrl: editForm.logoUrl || null,
      imageUrl: editForm.imageUrl || null,

      isGlutenFree: editForm.isGlutenFree,
      isAlcoholFree: editForm.isAlcoholFree,
    };
    console.log('[BeerEdit] saving updates — imageUrl:', JSON.stringify(updates.imageUrl));
    if (editForm.ibu) {
      updates.ibu = parseInt(editForm.ibu);
    }
    setIsSavingBeer(true);
    try {
      await Promise.all([
        apiRequest(`/api/admin/beers/${id}`, { method: 'PATCH' }, updates),
        apiRequest(`/api/beers/${id}/collaborations`, { method: 'PUT' }, { breweryIds: collabIds }),
      ]);
      // Forziamo un refetch immediato (refetchQueries, non invalidateQueries che
      // è asincrono e "stale-then-refresh"). Così quando chiudiamo il dialog
      // l'immagine nuova è già nello store di React Query e l'utente la vede.
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["/api/beers", id], type: "active" }),
        queryClient.refetchQueries({ queryKey: ["/api/beers", id, "collaborations"], type: "active" }),
      ]);
      collabIds.forEach((bid: number) => {
        queryClient.invalidateQueries({ queryKey: ["/api/breweries", String(bid)] });
      });
      setIsEditDialogOpen(false);
      toast({ title: "Birra aggiornata con successo" });
    } catch (err: any) {
      toast({ title: "Errore nell'aggiornamento", description: err?.message, variant: "destructive" });
    } finally {
      setIsSavingBeer(false);
    }
  };

  const handleDeleteBeer = async () => {
    if (!beer) return;
    setIsDeletingBeer(true);
    try {
      await apiRequest(`/api/admin/beers/${id}`, { method: 'DELETE' });
      toast({ title: `Birra "${beer.name}" eliminata` });
      const breweryId = (beer as any)?.brewery?.id ?? (beer as any)?.breweryId;
      if (breweryId) {
        navigate(`/brewery/${breweryId}`);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      toast({ title: "Errore nell'eliminazione", description: err?.message, variant: "destructive" });
      setIsDeletingBeer(false);
      setIsDeleteDialogOpen(false);
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

  // Cellar check
  const { data: cellarItem, refetch: refetchCellar } = useQuery<any>({
    queryKey: ["/api/user/cellar", id],
    queryFn: () => fetch(`/api/user/cellar/${id}`).then(r => r.json()),
    enabled: isAuthenticated && !!id,
  });
  const inCellar = !!cellarItem;
  const cellarMutation = useMutation({
    mutationFn: () => inCellar
      ? apiRequest("DELETE", `/api/user/cellar/${id}`)
      : apiRequest("POST", "/api/user/cellar", { beerId: parseInt(id!), quantity: 1 }),
    onSuccess: () => {
      refetchCellar();
      queryClient.invalidateQueries({ queryKey: ["/api/user/cellar"] });
      toast({ title: inCellar ? "Rimossa dalla cantina" : "Aggiunta alla cantina 🍷" });
    },
  });

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
    if (reviewFilterRating !== null) list = list.filter(r => Math.round(r.rating || 0) === reviewFilterRating);
    if (reviewSortBy === 'highest') list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (reviewSortBy === 'lowest') list.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    else list.sort((a, b) => new Date(b.tastedAt).getTime() - new Date(a.tastedAt).getTime());
    return list;
  }, [reviewsData, reviewFilterRating, reviewSortBy]);

  const reportMutation = useMutation({
    mutationFn: async ({ tastingId, reason, description }: { tastingId: number; reason: string; description: string }) =>
      apiRequest(`/api/reports`, { method: "POST" }, {
        targetType: "review", targetId: tastingId, reason, description: description || undefined,
      }),
    onSuccess: (data: any) => {
      toast({
        title: data?.duplicate ? "Già segnalata" : "Segnalazione inviata",
        description: data?.duplicate ? "Avevi già segnalato questa recensione" : "Grazie, la segnalazione è stata ricevuta.",
      });
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

  const handleFindWebImage = async () => {
    if (!id || isSearchingImage) return;
    setIsSearchingImage(true);
    const currentImage = beer?.logoUrl || beer?.imageUrl || null;
    try {
      await apiRequest("POST", `/api/beers/${id}/find-web-image`, { force: true });
      // Fire-and-forget: polling fino a 60s usando refetchQueries (aspetta il
      // dato fresco prima di leggere) invece di invalidateQueries + getQueryData.
      const delays = [4000, 4000, 5000, 7000, 10000, 15000, 15000];
      for (const wait of delays) {
        await new Promise(r => setTimeout(r, wait));
        // refetchQueries attende il completamento del fetch — getQueryData legge dati aggiornati
        await queryClient.refetchQueries({ queryKey: ["/api/beers", id] });
        const fresh = queryClient.getQueryData<any>(["/api/beers", id]);
        const next = fresh?.logoUrl || fresh?.imageUrl || null;
        if (next && next !== currentImage) {
          toast({ title: "✓ Immagine aggiornata" });
          break;
        }
      }
    } catch (err: any) {
      if (err?.status === 403) {
        toast({ title: "Non autorizzato", description: "Solo admin e titolari possono cercare immagini.", variant: "destructive" });
      }
    } finally {
      // Refetch finale per aggiornare la UI anche se il polling non ha rilevato la modifica
      await queryClient.refetchQueries({ queryKey: ["/api/beers", id] });
      setIsSearchingImage(false);
    }
  };

  if (beerLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F1] dark:bg-[#0B0D10]">
        <div className="max-w-[720px] mx-auto px-4 py-8 space-y-4">
          <div className="h-[260px] rounded-b-[28px] bg-stone-200 dark:bg-stone-900 animate-pulse" />
          <div className="h-36 rounded-[24px] bg-stone-200 dark:bg-stone-900 animate-pulse -mt-10 mx-0" />
          <div className="grid grid-cols-4 gap-2 mt-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-stone-200 dark:bg-stone-900 animate-pulse" />
            ))}
          </div>
          <div className="h-32 rounded-[20px] bg-stone-200 dark:bg-stone-900 animate-pulse" />
          <div className="h-48 rounded-[20px] bg-stone-200 dark:bg-stone-900 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!beer) {
    return (
      <div className="min-h-screen bg-[#FAF7F1] dark:bg-[#0B0D10] flex items-center justify-center">
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
  const seoImage = beer?.logoUrl || beer?.imageUrl;
  const seoUrl = `https://fermenta.to/beer/${id}`;

  return (
    <div className="min-h-screen bg-[#FAF7F1] dark:bg-[#0B0D10]">
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
              { "@type": "ListItem", "position": 2, "name": "Birre", "item": "https://fermenta.to/explore/beers" },
              ...(beer as any)?.brewery?.name ? [{ "@type": "ListItem", "position": 3, "name": (beer as any).brewery.name, "item": `https://fermenta.to/brewery/${(beer as any).brewery.id}` }] : [],
              { "@type": "ListItem", "position": (beer as any)?.brewery?.name ? 4 : 3, "name": beer?.name, "item": seoUrl },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "Product",
            "@id": seoUrl,
            "name": beer?.name,
            "description": (beer as any)?.description || `${beer?.name} è una ${beer?.style ?? "birra artigianale"} prodotta da ${(beer as any)?.brewery?.name ?? "un birrificio artigianale"}.${beer?.abv ? ` Gradazione alcolica: ${beer.abv}% ABV.` : ""}${(beer as any)?.ibu ? ` Amaro: ${(beer as any).ibu} IBU.` : ""}`,
            "url": seoUrl,
            "image": seoImage,
            "brand": { "@type": "Brand", "name": (beer as any)?.brewery?.name },
            "category": beer?.style,
            "additionalProperty": [
              ...(beer?.abv ? [{ "@type": "PropertyValue", "name": "Gradazione alcolica (ABV)", "value": `${beer.abv}%` }] : []),
              ...((beer as any)?.ibu ? [{ "@type": "PropertyValue", "name": "Amaro (IBU)", "value": String((beer as any).ibu) }] : []),
              ...((beer as any)?.ebc ? [{ "@type": "PropertyValue", "name": "Colore (EBC)", "value": String((beer as any).ebc) }] : []),
              ...((beer as any)?.style ? [{ "@type": "PropertyValue", "name": "Stile", "value": (beer as any).style }] : []),
              ...((beer as any)?.country ? [{ "@type": "PropertyValue", "name": "Paese di produzione", "value": (beer as any).country }] : []),
            ].filter(p => p),
            ...(reviewsData?.avgRating && reviewsData.reviewCount > 0 ? {
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": Number(reviewsData.avgRating).toFixed(1),
                "bestRating": "5",
                "worstRating": "1",
                "ratingCount": reviewsData.reviewCount,
              }
            } : {}),
          }
        ])}</script>
      </Helmet>
      
      {/* ── Scan redirect banner ── */}
      {scanCtx && !scanBannerDismissed && (
        <div className="fixed bottom-20 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
          <div className="bg-gray-900 dark:bg-[#1A1D24] text-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 max-w-sm w-full pointer-events-auto border border-white/10">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-300 leading-tight">Trovata via scansione</p>
              <p className="text-sm font-semibold truncate leading-tight mt-0.5">
                {scanCtx.memoryMatch ? "📌 " : "🔍 "}{scanCtx.beerName}
              </p>
            </div>
            <button
              onClick={() => {
                if (scanCtx) {
                  sessionStorage.setItem("scan_retry", JSON.stringify({
                    query: scanCtx.query,
                    ocrText: scanCtx.ocrText,
                  }));
                }
                sessionStorage.removeItem("scan_redirect");
                navigate("/scan");
              }}
              className="shrink-0 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
            >
              Non è questa?
            </button>
            <button
              onClick={() => {
                setScanBannerDismissed(true);
                sessionStorage.removeItem("scan_redirect");
              }}
              className="shrink-0 p-1 text-gray-400 hover:text-white transition-colors rounded-lg"
              aria-label="Chiudi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <BeerHero
        beer={beer}
        beerCollabs={beerCollabs}
        reviewsData={reviewsData ? { avgRating: reviewsData.avgRating ?? undefined, reviewCount: reviewsData.reviewCount } : null}
        totalLocations={totalLocations}
        isAdmin={isAdmin}
        isAuthenticated={isAuthenticated}
        isSearchingImage={isSearchingImage}
        isBeerFavorited={isBeerFavorited}
        favoritePending={favoriteMutation.isPending}
        onShare={handleShare}
        onOpenEditDialog={openEditDialog}
        onToggleFavorite={handleFavoriteToggle}
        onCheckin={() => isAuthenticated ? setCheckinOpen(true) : toast({ title: 'Accedi per registrare il check-in', variant: 'destructive' })}
        onReview={() => {
          if (!isAuthenticated) { toast({ title: 'Accedi per recensire', variant: 'destructive' }); return; }
          setShowTastingForm(true);
          setTimeout(() => document.getElementById('beer-reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
        }}
      />

      <StickyPubTabs
        tabs={BEER_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main
        className="max-w-[720px] lg:max-w-5xl mx-auto px-4"
        style={{
          paddingBottom: 'calc(80px + var(--frozen-sab))',
        }}
      >
        <div className="lg:grid lg:grid-cols-[1fr_288px] lg:gap-8 lg:items-start">
        {/* ── LEFT: tab sections ─────────────────────────────────────── */}
        <div>
        <div className={`${activeTab === 'overview' ? '' : 'hidden'} lg:!block`}>
          <div className="mt-3">
            <BeerStatsStrip beer={beer} />
          </div>

          {/* Descrizione birra */}
          {beer?.description && (
            <div className="mt-5 bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-5">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-base font-black text-[#151515] dark:text-[#F5F5F5]">Descrizione</h3>
                {translating && (
                  <span className="text-xs text-[#6B6357] dark:text-[#B7BDC7] flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Traduzione…
                  </span>
                )}
                {translatedDesc && !translating && (
                  <span className="text-[10px] font-bold bg-[#FFF7EA] dark:bg-[#F59E0B]/10 text-[#F59E0B] px-2 py-0.5 rounded-full">
                    Tradotto
                  </span>
                )}
              </div>
              <div className={`text-sm text-[#6B6357] dark:text-[#B7BDC7] leading-relaxed ${descExpanded ? "" : "line-clamp-4"}`}>
                <RichTextDisplay html={String(translatedDesc || beer.description || "")} />
              </div>
              {String(translatedDesc || beer.description || "").length > 200 && (
                <button
                  onClick={() => setDescExpanded(!descExpanded)}
                  className="text-sm font-bold text-[#F59E0B] mt-2 tap-scale"
                >
                  {descExpanded ? "Mostra meno" : "Leggi di più"}
                </button>
              )}
              {translatedDesc && beer.description && (
                <details className="mt-3">
                  <summary className="text-xs text-[#6B6357] dark:text-[#B7BDC7] cursor-pointer hover:text-[#151515] dark:hover:text-[#F5F5F5] select-none transition-colors">
                    Testo originale
                  </summary>
                  <div className="mt-2 border-t border-[#E8DED1] dark:border-white/[0.06] pt-2">
                    <RichTextDisplay html={String(beer.description)} className="text-sm text-[#6B6357] dark:text-[#B7BDC7]" />
                  </div>
                </details>
              )}
            </div>
          )}

          {/* Flags row */}
          {(beer?.isGlutenFree || beer?.isAlcoholFree) && (
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              {beer?.isGlutenFree && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded-full">
                  <GlutenFreeIcon size={10} className="text-green-600" /> Gluten Free
                </span>
              )}
              {beer?.isAlcoholFree && (
                <span className="text-[10px] font-bold text-[#6B6357] dark:text-[#B7BDC7] bg-[#FAF7F1] dark:bg-[#23262E] px-2 py-1 rounded-full">0.0% Analcolica</span>
              )}
            </div>
          )}

          {/* ═══════════ Secondary actions (Wishlist · Cantina · Suggerisci) ═══════════ */}
          {(isAuthenticated || isAdmin) && (
            <div className="mt-3 space-y-2">
              {/* Riga 1: Wishlist + Cantina + Suggerisci — sempre sulla stessa riga */}
              {isAuthenticated && (
                <div className="flex items-center gap-1.5">
                  {id && <WishlistButton beerId={parseInt(id)} variant="pill" />}
                  <button
                    onClick={() => cellarMutation.mutate()}
                    disabled={cellarMutation.isPending}
                    data-testid="button-cellar"
                    className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-bold border tap-scale transition-all whitespace-nowrap ${
                      inCellar
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-card border-[#E8DED1] dark:border-white/[0.06] text-[#6B6357] dark:text-[#B7BDC7] hover:border-primary/30'
                    }`}
                    title={inCellar ? 'Rimuovi dalla cantina' : 'Aggiungi alla cantina'}
                  >
                    <Wine className={`h-4 w-4 ${inCellar ? 'fill-current' : ''}`} />
                    <span>{inCellar ? 'In cantina' : 'Cantina'}</span>
                  </button>
                  {!isAdmin && (
                    <button
                      onClick={() => setIsSuggestDialogOpen(true)}
                      data-testid="button-suggest-change"
                      className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-bold border bg-card border-[#E8DED1] dark:border-white/[0.06] text-[#6B6357] dark:text-[#B7BDC7] hover:border-primary/30 tap-scale transition-all whitespace-nowrap"
                      title="Suggerisci una modifica a questa scheda"
                    >
                      <Lightbulb className="h-4 w-4" />
                      <span>Suggerisci</span>
                    </button>
                  )}
                  {/* Cerca img solo per titolari pub (admin ce l'ha già nella riga sotto) */}
                  {isPubOwner && (
                    <button
                      onClick={handleFindWebImage}
                      disabled={isSearchingImage}
                      className="ml-auto text-[11px] text-primary font-bold disabled:opacity-50 px-2 h-9 tap-scale whitespace-nowrap"
                    >
                      {isSearchingImage ? 'Cerco…' : (beer?.logoUrl || beer?.imageUrl) ? 'Re-cerca img' : 'Cerca img'}
                    </button>
                  )}
                </div>
              )}

              {/* Riga 2: bottoni admin modifica/elimina */}
              {isAdmin && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={openEditDialog}
                    data-testid="button-admin-edit-beer"
                    title="Modifica"
                    className="h-9 w-9 flex items-center justify-center rounded-full bg-primary text-white shadow-sm tap-scale"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setIsDeleteDialogOpen(true)}
                    title="Elimina"
                    className="h-9 w-9 flex items-center justify-center rounded-full bg-red-500 text-white shadow-sm tap-scale hover:bg-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {/* Cerca img anche per admin */}
                  <button
                    onClick={handleFindWebImage}
                    disabled={isSearchingImage}
                    className="text-[11px] text-primary font-bold disabled:opacity-50 px-2 h-9 tap-scale whitespace-nowrap"
                  >
                    {isSearchingImage ? 'Cerco…' : (beer?.logoUrl || beer?.imageUrl) ? 'Re-cerca img' : 'Cerca img'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`${activeTab === 'disponibilita' ? '' : 'hidden'} lg:!block`}>
          <BeerAvailabilitySection
            isLoading={availabilityLoading}
            totalLocations={totalLocations}
            tapLocations={tapLocations}
            bottleLocations={bottleLocations}
            showAllPubs={showAllPubs}
            onToggleShowAll={() => setShowAllPubs(!showAllPubs)}
          />
        </div>

        <div className={`${activeTab === 'info' ? '' : 'hidden'} lg:!block`}>
          <BeerInfoSection
            beer={beer}
            translatedDesc={translatedDesc}
            translating={translating}
            descExpanded={descExpanded}
            onToggleExpand={() => setDescExpanded(!descExpanded)}
          />
        </div>

        <div className={`${activeTab === 'overview' ? '' : 'hidden'} lg:!block`}>
          {/* ═══════════ Brewery card ═══════════ */}
          {beer?.brewery && (
            <div className="mt-4">
              <Link href={`/brewery/${beer.brewery.id}`}>
                <div className="bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-4 flex items-center gap-3 active:scale-[0.99] transition-all hover:border-[#F59E0B]/40">
                  <div className="w-12 h-12 rounded-2xl bg-[#FAF7F1] dark:bg-[#12151A] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {(beer.brewery as any).logoUrl ? (
                      <img src={(beer.brewery as any).logoUrl} alt={beer.brewery.name} className="w-full h-full object-contain p-1" />
                    ) : (
                      <Building2 className="h-6 w-6 text-[#F59E0B]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase font-bold text-[#6B6357] dark:text-[#B7BDC7] tracking-wider">Birrificio</p>
                    <p className="text-sm font-bold text-[#151515] dark:text-[#F5F5F5] line-clamp-1">{beer.brewery.name}</p>
                    {beer.brewery.location && (
                      <p className="text-xs text-[#6B6357] dark:text-[#B7BDC7] mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-[#F59E0B]" />{beer.brewery.location}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-[#6B6357] dark:text-[#B7BDC7]" />
                </div>
              </Link>
            </div>
          )}
        </div>

        <div className={`${activeTab === 'overview' ? '' : 'hidden'} lg:!block`}>
          {/* ═══════════ Potrebbe piacerti anche ═══════════ */}
          {suggestedBeers.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-foreground">Potrebbe piacerti anche</p>
                {beer?.brewery?.id && (
                  <Link href={`/brewery/${beer.brewery.id}`}>
                    <span className="text-xs font-bold text-primary tap-scale">Vedi tutto</span>
                  </Link>
                )}
              </div>
              <div className="flex gap-3 overflow-x-auto -mx-4 px-4 lg:-mx-0 lg:px-0 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {suggestedBeers.filter((sb: any) => sb && sb.id != null).map((sb: any) => (
                  <Link key={sb.id} href={`/beer/${sb.id}`}>
                    <div className="flex-shrink-0 w-[130px] active:scale-[0.97] transition-transform">
                      <div className="relative w-full h-[140px] rounded-2xl overflow-hidden bg-[#FAF7F1] dark:bg-[#23262E] mb-2">
                        {sb.imageUrl ? (
                          <img src={sb.imageUrl} alt={sb.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BeerIcon className="h-10 w-10 text-primary/30" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-bold text-foreground line-clamp-1">{sb.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{sb.style || '—'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {sb.abv && <span className="text-[11px] text-muted-foreground">{sb.abv}%</span>}
                        {sb.avgRating != null && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-amber-600">
                            <Star className="h-2.5 w-2.5 fill-current" />{Number(sb.avgRating).toFixed(1).replace('.', ',')}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={`${activeTab === 'recensioni' ? '' : 'hidden'} lg:!block`}>
          <BeerReviewsSection
            beerId={parseInt(id || '0')}
            beerName={beer?.name}
            isAuthenticated={isAuthenticated}
            hasTasted={hasTasted}
            existingTasting={existingTasting}
            showTastingForm={showTastingForm}
            setShowTastingForm={setShowTastingForm}
            onTastingSuccess={() => {
              setShowTastingForm(false);
              queryClient.invalidateQueries({ queryKey: ["/api/user/beer-tastings"] });
            }}
            reviewsData={reviewsData}
            filteredReviews={filteredReviews}
            reviewFilterRating={reviewFilterRating}
            setReviewFilterRating={setReviewFilterRating}
            reviewSortBy={reviewSortBy}
            setReviewSortBy={setReviewSortBy}
            showAllReviews={showAllReviews}
            setShowAllReviews={setShowAllReviews}
            onReport={(reviewId) => setReportDialogReviewId(reviewId)}
          />
        </div>
        </div>{/* end left column */}

        {/* ── RIGHT: Desktop sticky sidebar ──────────────────────────── */}
        <aside className="hidden lg:flex flex-col gap-4 sticky top-[116px]">

          {/* Stats card */}
          <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.05)] p-4 space-y-3">

            {/* Rating */}
            {reviewsData?.avgRating && reviewsData.reviewCount > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(Number(reviewsData.avgRating)) ? "fill-current" : "opacity-20"}`} />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-stone-800 dark:text-stone-100">
                    {Number(reviewsData.avgRating).toFixed(1)}
                  </span>
                  <span className="text-xs text-stone-400">({reviewsData.reviewCount})</span>
                </div>
                <div className="border-t border-[#E8DED1] dark:border-white/[0.06]" />
              </>
            )}

            {/* ABV / IBU / EBC grid */}
            <div className="grid grid-cols-3 gap-2">
              {beer?.abv && (
                <div className="flex flex-col items-center p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20">
                  <span className="text-lg font-black text-amber-600 dark:text-amber-400 leading-none">{beer.abv}%</span>
                  <span className="text-[10px] font-bold text-amber-500/70 uppercase tracking-wide mt-0.5">ABV</span>
                </div>
              )}
              {(beer as any)?.ibu && (
                <div className="flex flex-col items-center p-2.5 rounded-xl bg-lime-50 dark:bg-lime-950/20">
                  <span className="text-lg font-black text-lime-700 dark:text-lime-400 leading-none">{(beer as any).ibu}</span>
                  <span className="text-[10px] font-bold text-lime-600/70 uppercase tracking-wide mt-0.5">IBU</span>
                </div>
              )}
              {(beer as any)?.ebc && (
                <div className="flex flex-col items-center p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/20">
                  <span className="text-lg font-black text-orange-700 dark:text-orange-400 leading-none">{(beer as any).ebc}</span>
                  <span className="text-[10px] font-bold text-orange-600/70 uppercase tracking-wide mt-0.5">EBC</span>
                </div>
              )}
            </div>

            {/* Style */}
            {beer?.style && (
              <div>
                <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider mb-1">Stile</p>
                <span className="inline-block text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{beer.style}</span>
              </div>
            )}

            {/* Country */}
            {(beer as any)?.country && (
              <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                {(beer as any).country}
              </div>
            )}

            {/* Availability */}
            {totalLocations > 0 && (
              <>
                <div className="border-t border-[#E8DED1] dark:border-white/[0.06]" />
                <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  Disponibile in <strong className="text-stone-800 dark:text-stone-200">{totalLocations}</strong> {totalLocations === 1 ? "locale" : "locali"}
                </div>
              </>
            )}
          </div>

          {/* Brewery card */}
          {beer?.brewery && (
            <Link href={`/brewery/${beer.brewery.id}`}>
              <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-3.5 flex items-center gap-3 hover:border-primary/30 transition-colors cursor-pointer group">
                <div className="w-11 h-11 rounded-xl bg-[#FAF7F1] dark:bg-[#12151A] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {(beer.brewery as any).logoUrl ? (
                    <img src={(beer.brewery as any).logoUrl} alt={beer.brewery.name} className="w-full h-full object-contain p-1" />
                  ) : (
                    <Building2 className="h-5 w-5 text-[#F59E0B]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Birrificio</p>
                  <p className="text-sm font-bold text-stone-900 dark:text-stone-100 group-hover:text-primary transition-colors truncate">{beer.brewery.name}</p>
                  {beer.brewery.location && (
                    <p className="text-xs text-stone-400 truncate">{beer.brewery.location}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-primary transition-colors flex-shrink-0" />
              </div>
            </Link>
          )}

        </aside>

        </div>{/* end desktop grid */}
        </main>

      {/* Admin Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[calc(100%-24px)] sm:w-full sm:max-w-2xl max-h-[85dvh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Modifica Birra
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <span key={b.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold bg-white dark:bg-card border border-[#E8DED1] dark:border-white/[0.06]/30 text-primary">
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
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-card border border-stone-100 rounded-md shadow-xl max-h-40 overflow-y-auto">
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
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Trova automaticamente l'immagine</span>
                  <WebImageSearchButton
                    endpoint={`/api/beers/${id}/find-image-preview`}
                    responseKey="imageUrl"
                    onFound={(url) => setEditForm(prev => ({ ...prev, imageUrl: url, logoUrl: '' }))}
                  />
                </div>
                <ImageUpload
                  label="Immagine Birra"
                  description="Immagine principale della birra"
                  currentImageUrl={editForm.imageUrl || editForm.logoUrl || undefined}
                  onImageChange={(url) => setEditForm(prev => ({
                    ...prev,
                    imageUrl: url ?? '',
                    // Azzera logoUrl così BeerHero mostra imageUrl (evita che logoUrl vecchio abbia priorità)
                    logoUrl: url ? '' : prev.logoUrl,
                  }))}
                  folder="beer-images"
                  aspectRatio="square"
                  maxSize={5}
                  recommendedDimensions="400x400px"
                />
              </div>
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


      {/* Delete Beer Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Elimina birra
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-foreground">
              Sei sicuro di voler eliminare <span className="font-bold">{beer?.name}</span>?
            </p>
            <p className="text-xs text-muted-foreground">
              Questa azione è irreversibile. La birra verrà rimossa anche da tutte le tap list e bottle list dei pub.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeletingBeer}>
              Annulla
            </Button>
            <Button
              onClick={handleDeleteBeer}
              disabled={isDeletingBeer}
              className="bg-red-500 hover:bg-red-600 text-white border-none"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeletingBeer ? 'Eliminazione...' : 'Elimina'}
            </Button>
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
                className="w-full border border-stone-100 dark:border-border rounded-md px-3 py-2 text-sm bg-white dark:bg-card text-foreground"
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

            isGlutenFree: beer.isGlutenFree ?? false,
            isAlcoholFree: beer.isAlcoholFree ?? false,
          }}
        />
      )}

      {/* Potrebbero piacerti — same style, other breweries */}
      {similarBeers.length > 0 && (
        <div className="bg-[#FAF7F1] dark:bg-[#0B0D10] border-t border-[#E8DED1] dark:border-white/[0.06] py-8">
          <div className="max-w-[720px] mx-auto px-4">
            <h3 className="text-base font-black text-[#151515] dark:text-[#F5F5F5] mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#F59E0B]" />
              Potrebbero piacerti
              <span className="text-xs font-normal text-[#6B6357] dark:text-[#B7BDC7] ml-1">· stile {beer?.style}</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {similarBeers.map((b: any) => (
                <Link key={b.id} href={`/beer/${b.id}`}>
                  <div className="group bg-white dark:bg-[#1A1D24] border border-[#E8DED1] dark:border-white/[0.06] rounded-[16px] p-3 hover:shadow-md hover:border-[#F59E0B]/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer h-full flex flex-col">
                    <div className="w-10 h-10 rounded-xl flex-shrink-0 bg-[#FAF7F1] dark:bg-[#12151A] flex items-center justify-center overflow-hidden mb-2 mx-auto">
                      {b.imageUrl ? (
                        <img src={b.imageUrl} alt={b.name} className="w-10 h-10 object-contain p-0.5" />
                      ) : b.breweryLogoUrl ? (
                        <img src={b.breweryLogoUrl} alt={b.breweryName} className="w-8 h-8 object-contain" />
                      ) : (
                        <BeerIcon className="w-5 h-5 text-[#F59E0B]" />
                      )}
                    </div>
                    <p className="font-bold text-xs text-[#151515] dark:text-[#F5F5F5] line-clamp-2 group-hover:text-[#F59E0B] text-center leading-tight transition-colors">
                      {b.name}
                    </p>
                    <p className="text-[10px] text-[#6B6357] dark:text-[#B7BDC7] line-clamp-1 text-center mt-0.5">
                      {b.breweryName}
                    </p>
                    {b.abv && (
                      <p className="text-[10px] font-bold text-[#F59E0B] text-center mt-1">{b.abv}% ABV</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <Footer />

      {isAuthenticated && beer && checkinOpen && (
        <Suspense fallback={null}>
          <CheckinModal
            open={checkinOpen}
            onClose={() => setCheckinOpen(false)}
            beer={{
              id: beer.id,
              name: beer.name,
              style: beer.style ?? null,
              breweryName: (beer as any)?.brewery?.name ?? null,
            }}
            pub={null}
          />
        </Suspense>
      )}

      {/* ── STICKY BOTTOM TAB BAR — portal-based, escapes will-change trap ── */}
      <div className="lg:hidden">
        <StickyPubTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={[
            { value: 'overview',      label: 'Panoramica',   icon: <HomeIcon /> },
            { value: 'disponibilita', label: 'Disponibilità', icon: <MapPin /> },
            { value: 'recensioni',    label: 'Recensioni',   icon: <Star /> },
            { value: 'info',          label: 'Info',         icon: <InfoIcon /> },
          ]}
        />
      </div>
    </div>
  );
}
