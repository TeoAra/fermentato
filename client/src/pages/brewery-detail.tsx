import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Beer as BeerIcon,
  Building,
  Building2,
  Calendar,
  Globe,
  Home as HomeIcon,
  MapPin,
  Pencil,
  Save,
  Settings,
  Star,
  Store,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { SiFacebook, SiInstagram, SiTiktok } from "react-icons/si";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getMapNavigationUrl } from "@/lib/utils";
import RichTextEditor from "@/components/rich-text-editor";
import AddressAutocomplete from "@/components/address-autocomplete";
import { ImageUpload } from "@/components/image-upload";
import SuggestChangeDialog from "@/components/SuggestChangeDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import {
  BreweryHero,
  BreweryOverviewSection,
  BreweryBeersSection,
  BreweryEventsSection,
  BreweryDistributionSection,
  StickyPubTabs,
  type StickyTabDef,
} from "@/components/brewery";
import DesktopAnchorNav from "@/components/DesktopAnchorNav";
import { CommunityPostsSection } from "@/components/social/CommunityPostsSection";

const CheckinModal = lazy(() => import("@/components/checkin-modal"));

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
  imageUrl?: string;
  logoUrl?: string;
  isVisible?: boolean;
}

const TABS: StickyTabDef[] = [
  { value: "overview", label: "Panoramica", icon: <HomeIcon className="w-4 h-4" /> },
  { value: "birre", label: "Birre", icon: <BeerIcon className="w-4 h-4" /> },
  { value: "serate", label: "Eventi", icon: <Calendar className="w-4 h-4" /> },
  { value: "distribuzione", label: "Distribuzione", icon: <Store className="w-4 h-4" /> },
];

export default function BreweryDetail() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSuggestDialogOpen, setIsSuggestDialogOpen] = useState(false);
  const [checkinBeer, setCheckinBeer] = useState<any>(null);

  // Link legacy condivisi (?event=N) → redirect alla pagina evento canonica
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("event");
    if (eventId && /^\d+$/.test(eventId)) {
      window.location.replace(`/eventi/brewery/${eventId}`);
    }
  }, []);

  const isAdmin =
    (user as any)?.activeRole === "admin" ||
    (!((user as any)?.activeRole) && (user as any)?.userType === "admin");
  const canEditBeers = isAdmin || !!(user as any)?.breweryId;

  // ── Queries ──────────────────────────────────────────────────────────
  const { data: brewery, isLoading: breweryLoading } = useQuery<Brewery>({
    queryKey: ["/api/breweries", id],
    enabled: !!id,
  });

  const { data: beers = [] } = useQuery<Beer[]>({
    queryKey: ["/api/breweries", id, "beers"],
    enabled: !!id,
  });

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

  const { data: breweryFavoritesCount } = useQuery<{ count: string }>({
    queryKey: ["/api/favorites", "brewery", id, "count"],
    queryFn: () => fetch(`/api/favorites/brewery/${id}/count`).then((r) => r.json()),
    enabled: !!id,
  });
  const favCount = breweryFavoritesCount ? parseInt(String(breweryFavoritesCount.count)) || 0 : 0;

  const { data: favorites = [] } = useQuery<any[]>({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  const isBreweryFavorited =
    Array.isArray(favorites) &&
    favorites.some((fav: any) => fav.itemType === "brewery" && fav.itemId === parseInt(id || "0"));

  // ── Mutations ────────────────────────────────────────────────────────
  const updateBreweryMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) =>
      apiRequest(`/api/admin/breweries/${id}`, { method: "PATCH" }, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/breweries", id] });
      setIsEditDialogOpen(false);
      toast({ title: "Birrificio aggiornato con successo" });
    },
    onError: () => toast({ title: "Errore nell'aggiornamento", variant: "destructive" }),
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({ action }: { action: "add" | "remove" }) => {
      if (action === "add") {
        return apiRequest("/api/favorites", { method: "POST" }, {
          itemType: "brewery",
          itemId: parseInt(id || "0"),
        });
      }
      return apiRequest(`/api/favorites/brewery/${id}`, { method: "DELETE" });
    },
    onMutate: async ({ action }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/favorites"] });
      const prev = queryClient.getQueryData(["/api/favorites"]);
      queryClient.setQueryData(["/api/favorites"], (old: any[]) => {
        if (action === "add")
          return [...(old || []), { itemType: "brewery", itemId: parseInt(id || "0") }];
        return (old || []).filter(
          (f: any) => !(f.itemType === "brewery" && f.itemId === parseInt(id || "0")),
        );
      });
      return { prev };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", "brewery", id, "count"] });
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) queryClient.setQueryData(["/api/favorites"], ctx.prev);
      toast({ title: "Errore", variant: "destructive" });
    },
  });

  const hideBeerMutation = useMutation({
    mutationFn: async (beerId: number) =>
      apiRequest(`/api/admin/beers/${beerId}/toggle-visibility`, { method: "PATCH" }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/breweries", id, "beers"] });
      toast({
        title: data?.isHidden ? "Birra nascosta" : "Birra visibile",
      });
    },
    onError: () => toast({ title: "Errore", variant: "destructive" }),
  });

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleToggleFavorite = () => {
    if (!isAuthenticated) {
      toast({
        title: "Accesso richiesto",
        description: "Effettua l'accesso per seguire il birrificio",
        variant: "destructive",
      });
      return;
    }
    favoriteMutation.mutate({ action: isBreweryFavorited ? "remove" : "add" });
  };

  const handleShare = async () => {
    const name = brewery?.name || "Birrificio";
    const url = window.location.href;
    const data = { title: `${name} — Fermenta.to`, text: `Scopri ${name}`, url };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copiato negli appunti" });
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
    }
  };

  const handleDirections = () => {
    if (!brewery) return;
    const url = getMapNavigationUrl(brewery.name, (brewery as any).address || brewery.location);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  // ── Admin/Owner edit brewery dialog ──────────────────────────────────
  const [editForm, setEditForm] = useState({
    name: "",
    location: "",
    region: "",
    description: "",
    descriptionHtml: "",
    logoUrl: "",
    coverImageUrl: "",
    websiteUrl: "",
    email: "",
    phone: "",
    vatNumber: "",
    instagramUrl: "",
    facebookUrl: "",
    tiktokUrl: "",
  });

  const openEditDialog = () => {
    if (!brewery) return;
    setEditForm({
      name: brewery.name || "",
      location: brewery.location || "",
      region: brewery.region || "",
      description: brewery.description || "",
      descriptionHtml: (brewery as any).descriptionHtml || "",
      logoUrl: brewery.logoUrl || "",
      coverImageUrl: brewery.coverImageUrl || "",
      websiteUrl: brewery.websiteUrl || "",
      email: (brewery as any).email || "",
      phone: (brewery as any).phone || "",
      vatNumber: (brewery as any).vatNumber || "",
      instagramUrl: (brewery as any).instagramUrl || "",
      facebookUrl: (brewery as any).facebookUrl || "",
      tiktokUrl: (brewery as any).tiktokUrl || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    updateBreweryMutation.mutate({
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
    });
  };

  // ── Beer edit dialog ─────────────────────────────────────────────────
  const [isBeerEditOpen, setIsBeerEditOpen] = useState(false);
  const [editingBeerId, setEditingBeerId] = useState<number | null>(null);
  const [isSavingBeer, setIsSavingBeer] = useState(false);
  const [isDeleteBeerOpen, setIsDeleteBeerOpen] = useState(false);
  const [isDeletingBeer, setIsDeletingBeer] = useState(false);
  const [beerEditForm, setBeerEditForm] = useState({
    name: "",
    style: "",
    abv: "",
    ibu: "",
    color: "",
    description: "",
    imageUrl: "",
    logoUrl: "",
    isGlutenFree: false,
    isAlcoholFree: false,
    isCollaboration: false,
  });
  const [beerEditCollabBreweries, setBeerEditCollabBreweries] = useState<
    { id: number; name: string }[]
  >([]);
  const [beerCollabQuery, setBeerCollabQuery] = useState("");
  const [beerCollabResults, setBeerCollabResults] = useState<any[]>([]);
  const [showBeerCollabResults, setShowBeerCollabResults] = useState(false);
  const beerCollabDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchBeerCollabBreweries = useCallback(
    (q: string, excludeId: number | undefined, selected: { id: number; name: string }[]) => {
      if (beerCollabDebounceRef.current) clearTimeout(beerCollabDebounceRef.current);
      if (!q.trim()) {
        setBeerCollabResults([]);
        setShowBeerCollabResults(false);
        return;
      }
      beerCollabDebounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/breweries/search?q=${encodeURIComponent(q)}&limit=8`);
          const data = await res.json();
          const filtered = (Array.isArray(data) ? data : []).filter(
            (b: any) => b.id !== excludeId && !selected.some((s) => s.id === b.id),
          );
          setBeerCollabResults(filtered);
          setShowBeerCollabResults(filtered.length > 0);
        } catch {
          setBeerCollabResults([]);
        }
      }, 250);
    },
    [],
  );

  const openBeerEditDialog = useCallback(async (beer: any) => {
    setEditingBeerId(beer.id);
    setBeerEditForm({
      name: beer.name || "",
      style: beer.style || "",
      abv: beer.abv || "",
      ibu: beer.ibu ? String(beer.ibu) : "",
      color: beer.color || "",
      description: beer.description || "",
      imageUrl: beer.imageUrl || "",
      logoUrl: beer.logoUrl || "",
      isGlutenFree: !!beer.isGlutenFree,
      isAlcoholFree: !!beer.isAlcoholFree,
      isCollaboration: !!beer.isCollaboration,
    });
    try {
      const res = await fetch(`/api/beers/${beer.id}/collaborations`);
      const collabs = await res.json();
      setBeerEditCollabBreweries(
        Array.isArray(collabs) ? collabs.map((b: any) => ({ id: b.id, name: b.name })) : [],
      );
    } catch {
      setBeerEditCollabBreweries([]);
    }
    setBeerCollabQuery("");
    setBeerCollabResults([]);
    setIsBeerEditOpen(true);
  }, []);

  const handleSaveBeerEdit = async () => {
    if (!editingBeerId) return;
    const collabIds = beerEditForm.isCollaboration
      ? beerEditCollabBreweries.map((b) => b.id)
      : [];
    const updates: Record<string, any> = {
      name: beerEditForm.name,
      style: beerEditForm.style,
      abv: beerEditForm.abv,
      description: beerEditForm.description || null,
      color: beerEditForm.color || null,
      logoUrl: beerEditForm.logoUrl || null,
      imageUrl: beerEditForm.imageUrl || null,
      isGlutenFree: beerEditForm.isGlutenFree,
      isAlcoholFree: beerEditForm.isAlcoholFree,
      collaborationBreweryIds: collabIds,
      isCollaboration: beerEditForm.isCollaboration,
    };
    if (beerEditForm.ibu) updates.ibu = parseInt(beerEditForm.ibu);
    setIsSavingBeer(true);
    try {
      const endpoint = isAdmin
        ? `/api/admin/beers/${editingBeerId}`
        : `/api/brewery/beers/${editingBeerId}`;
      await apiRequest(endpoint, { method: "PATCH" }, updates);
      queryClient.invalidateQueries({ queryKey: ["/api/breweries", id, "beers"] });
      setIsBeerEditOpen(false);
      toast({ title: "Birra aggiornata" });
    } catch (err: any) {
      toast({
        title: "Errore nell'aggiornamento",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setIsSavingBeer(false);
    }
  };

  const handleDeleteBeer = async () => {
    if (!editingBeerId) return;
    setIsDeletingBeer(true);
    try {
      const endpoint = isAdmin
        ? `/api/admin/beers/${editingBeerId}`
        : `/api/brewery/beers/${editingBeerId}`;
      await apiRequest(endpoint, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["/api/breweries", id, "beers"] });
      setIsDeleteBeerOpen(false);
      setIsBeerEditOpen(false);
      toast({ title: "Birra eliminata" });
    } catch (err: any) {
      toast({
        title: "Errore nell'eliminazione",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setIsDeletingBeer(false);
    }
  };

  // ── Loading / 404 ────────────────────────────────────────────────────
  if (breweryLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F1] dark:bg-[#0B0D10]">
        <div className="max-w-[720px] mx-auto px-4 py-8 space-y-4">
          <div className="h-[260px] rounded-2xl bg-stone-200 dark:bg-stone-900 animate-pulse" />
          <div className="h-32 rounded-2xl bg-stone-200 dark:bg-stone-900 animate-pulse" />
          <div className="h-64 rounded-2xl bg-stone-200 dark:bg-stone-900 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!brewery) {
    return (
      <div className="min-h-screen bg-[#FAF7F1] dark:bg-[#0B0D10] flex items-center justify-center px-4">
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

  // ── SEO ──────────────────────────────────────────────────────────────
  const seoTitle = brewery?.name
    ? `${brewery.name} — Birrificio Artigianale | Fermenta.to`
    : "Fermenta.to";
  const seoDesc = (brewery as any)?.description
    ? String((brewery as any).description).slice(0, 155)
    : brewery?.name
      ? `Scopri tutte le birre artigianali di ${brewery.name} su Fermenta.to: stili, ABV, dove trovarle.`
      : "Fermenta.to — La piattaforma per gli amanti della birra artigianale.";
  const seoImage = brewery?.coverImageUrl || brewery?.logoUrl;
  const seoUrl = `https://fermenta.to/brewery/${id}`;

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
        <script type="application/ld+json">
          {JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://fermenta.to/" },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Birrifici",
                  item: "https://fermenta.to/explore/breweries",
                },
                { "@type": "ListItem", position: 3, name: brewery?.name, item: seoUrl },
              ],
            },
            {
              "@context": "https://schema.org",
              "@type": "Brewery",
              "@id": seoUrl,
              name: brewery?.name,
              description:
                (brewery as any)?.description ||
                `${brewery?.name} è un birrificio artigianale${
                  brewery?.location ? ` con sede a ${brewery.location}` : ""
                } che produce birre di qualità.`,
              url: seoUrl,
              image: seoImage,
              ...(brewery?.logoUrl
                ? { logo: { "@type": "ImageObject", url: brewery.logoUrl } }
                : {}),
              ...(brewery?.location
                ? {
                    address: {
                      "@type": "PostalAddress",
                      addressLocality: brewery.location,
                      addressCountry: "IT",
                    },
                  }
                : {}),
              ...((brewery as any)?.websiteUrl
                ? { sameAs: [(brewery as any).websiteUrl] }
                : {}),
              ...(breweryRating?.avgRating && breweryRating.reviewCount > 0
                ? {
                    aggregateRating: {
                      "@type": "AggregateRating",
                      ratingValue: Number(breweryRating.avgRating).toFixed(1),
                      bestRating: "5",
                      worstRating: "1",
                      ratingCount: breweryRating.reviewCount,
                    },
                  }
                : {}),
            },
          ])}
        </script>
      </Helmet>

      <BreweryHero
        brewery={brewery}
        breweryRating={breweryRating ? { avgRating: breweryRating.avgRating ?? undefined, reviewCount: breweryRating.reviewCount } : undefined}
        beersCount={beers.length}
        isAdmin={isAdmin}
        isAuthenticated={isAuthenticated}
        isBreweryFavorited={isBreweryFavorited}
        favCount={favCount}
        favoritePending={favoriteMutation.isPending}
        breweryId={id!}
        onShare={handleShare}
        onToggleFavorite={handleToggleFavorite}
        onOpenSuggest={() => setIsSuggestDialogOpen(true)}
      />

      <div className="lg:hidden"><StickyPubTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} /></div>

      <DesktopAnchorNav tabs={TABS} />

      <main
        className="max-w-[720px] lg:max-w-7xl mx-auto px-4 lg:px-8"
        style={{ paddingBottom: "calc(80px + var(--frozen-sab))" }}
      >
          {isAdmin && (
              <div className="pt-3">
                <button
                  type="button"
                  onClick={openEditDialog}
                  className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-white dark:bg-[#1A1D24] border border-[#E8DED1] dark:border-white/[0.06] text-xs font-bold text-[#151515] dark:text-[#F5F5F5] hover:border-[#F59E0B] transition-colors"
                  data-testid="button-manage-brewery"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Modifica birrificio
                </button>
              </div>
            )}

            <div id="section-overview" className={`${activeTab === "overview" ? "" : "hidden"} lg:!block`}>
              <h2 className="hidden lg:block text-xl font-black text-[#151515] dark:text-[#F5F5F5] pt-4 mb-0">Panoramica</h2>
              <BreweryOverviewSection brewery={brewery} onDirections={handleDirections} />
              {brewery?.id && brewery?.name && (
                <CommunityPostsSection
                  entity={{ kind: "brewery", id: brewery.id, name: brewery.name }}
                  title="Post della community su questo birrificio"
                />
              )}
            </div>

            <div id="section-birre" className={`${activeTab === "birre" ? "" : "hidden"} lg:!block`}>
              <BreweryBeersSection
                beers={beers as any[]}
                isAdmin={isAdmin}
                canEditBeers={canEditBeers}
                onEditBeer={canEditBeers ? openBeerEditDialog : undefined}
                onToggleBeerVisibility={
                  isAdmin ? (beerId) => hideBeerMutation.mutate(beerId) : undefined
                }
              />
            </div>

            <div id="section-serate" className={`${activeTab === "serate" ? "" : "hidden"} lg:!block pt-4`}>
              <h2 className="hidden lg:block text-xl font-black text-[#151515] dark:text-[#F5F5F5] mb-0">Serate & Annunci</h2>
              {announcements.length === 0 && breweryEvents.length === 0 ? (
                <div className="bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#FAF7F1] dark:bg-[#12151A] mx-auto mb-4 flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-[#F59E0B]" />
                  </div>
                  <p className="text-sm font-semibold text-[#151515] dark:text-[#F5F5F5]">
                    Nessun evento in programma
                  </p>
                </div>
              ) : (
                <BreweryEventsSection
                  announcements={announcements as any[]}
                  breweryEvents={breweryEvents as any[]}
                />
              )}
            </div>

            <div id="section-distribuzione" className={`${activeTab === "distribuzione" ? "" : "hidden"} lg:!block pt-4`}>
              {distribution.length === 0 ? (
                <div className="bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#FAF7F1] dark:bg-[#12151A] mx-auto mb-4 flex items-center justify-center">
                    <Store className="w-8 h-8 text-[#F59E0B]" />
                  </div>
                  <p className="text-sm font-semibold text-[#151515] dark:text-[#F5F5F5]">
                    Distribuzione non ancora disponibile
                  </p>
                </div>
              ) : (
                <BreweryDistributionSection distribution={distribution as any[]} />
              )}
            </div>
      </main>

      {/* ── Admin Edit Dialog (modal={false} per Google Maps autocomplete) ── */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} modal={false}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => {
            const t = e.target as HTMLElement;
            if (t.closest(".pac-container")) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            const t = e.target as HTMLElement;
            if (t.closest(".pac-container")) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" /> Modifica Birrificio
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location">Località</Label>
                <AddressAutocomplete
                  value={editForm.location}
                  onChange={(address, _city, region) =>
                    setEditForm({
                      ...editForm,
                      location: address,
                      region: region || editForm.region,
                    })
                  }
                  placeholder="Cerca via, luogo, attività..."
                  searchType="all"
                  countryRestriction={null}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrizione</Label>
              <RichTextEditor
                content={editForm.descriptionHtml}
                onChange={(html) => setEditForm({ ...editForm, descriptionHtml: html })}
                placeholder="Racconta la storia del birrificio…"
                maxChars={5000}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sito Web</Label>
                <Input
                  value={editForm.websiteUrl}
                  onChange={(e) => setEditForm({ ...editForm, websiteUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Telefono</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="+39..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email pubblica</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Partita IVA</Label>
                <Input
                  value={editForm.vatNumber}
                  onChange={(e) => setEditForm({ ...editForm, vatNumber: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-semibold">Social Media</Label>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2">
                  <SiInstagram className="h-4 w-4 text-pink-500 flex-shrink-0" />
                  <Input
                    value={editForm.instagramUrl}
                    onChange={(e) => setEditForm({ ...editForm, instagramUrl: e.target.value })}
                    placeholder="https://instagram.com/..."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <SiFacebook className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <Input
                    value={editForm.facebookUrl}
                    onChange={(e) => setEditForm({ ...editForm, facebookUrl: e.target.value })}
                    placeholder="https://facebook.com/..."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <SiTiktok className="h-4 w-4 flex-shrink-0" />
                  <Input
                    value={editForm.tiktokUrl}
                    onChange={(e) => setEditForm({ ...editForm, tiktokUrl: e.target.value })}
                    placeholder="https://tiktok.com/@..."
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ImageUpload
                label="Logo Birrificio"
                description="Logo del birrificio"
                currentImageUrl={editForm.logoUrl || undefined}
                onImageChange={(url) => setEditForm({ ...editForm, logoUrl: url || "" })}
                folder="brewery-logos"
                aspectRatio="square"
                maxSize={5}
                recommendedDimensions="300x300px"
              />
              <ImageUpload
                label="Immagine di Copertina"
                description="Immagine principale del birrificio"
                currentImageUrl={editForm.coverImageUrl || undefined}
                onImageChange={(url) => setEditForm({ ...editForm, coverImageUrl: url || "" })}
                folder="brewery-covers"
                aspectRatio="landscape"
                maxSize={5}
                recommendedDimensions="1200x600px"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                <X className="h-4 w-4 mr-2" /> Annulla
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateBreweryMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateBreweryMutation.isPending ? "Salvataggio..." : "Salva"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Suggest Change Dialog ── */}
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

      {/* ── Beer Edit Dialog ── */}
      <Dialog open={isBeerEditOpen} onOpenChange={setIsBeerEditOpen}>
        <DialogContent className="w-[calc(100%-24px)] sm:w-full sm:max-w-2xl max-h-[85dvh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5" /> Modifica Birra
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl"
                onClick={() => setIsDeleteBeerOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" /> Elimina
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
                  onChange={(e) => setBeerEditForm({ ...beerEditForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bedit-style">Stile</Label>
                <Input
                  id="bedit-style"
                  value={beerEditForm.style}
                  onChange={(e) => setBeerEditForm({ ...beerEditForm, style: e.target.value })}
                  placeholder="Es. IPA, Lager…"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="bedit-abv">ABV (%)</Label>
                <Input
                  id="bedit-abv"
                  value={beerEditForm.abv}
                  onChange={(e) => setBeerEditForm({ ...beerEditForm, abv: e.target.value })}
                  placeholder="5.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bedit-ibu">IBU</Label>
                <Input
                  id="bedit-ibu"
                  type="number"
                  value={beerEditForm.ibu}
                  onChange={(e) => setBeerEditForm({ ...beerEditForm, ibu: e.target.value })}
                  placeholder="40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bedit-color">Colore</Label>
                <Input
                  id="bedit-color"
                  value={beerEditForm.color}
                  onChange={(e) => setBeerEditForm({ ...beerEditForm, color: e.target.value })}
                  placeholder="Ambrato…"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bedit-desc">Descrizione</Label>
              <RichTextEditor
                content={beerEditForm.description}
                onChange={(html) => setBeerEditForm({ ...beerEditForm, description: html })}
                placeholder="Descrizione della birra..."
                maxChars={2000}
              />
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={beerEditForm.isGlutenFree}
                  onChange={(e) =>
                    setBeerEditForm({ ...beerEditForm, isGlutenFree: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  Gluten Free
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={beerEditForm.isAlcoholFree}
                  onChange={(e) =>
                    setBeerEditForm({ ...beerEditForm, isAlcoholFree: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-stone-100 text-primary focus:ring-primary"
                />
                <span className="text-sm font-bold text-primary">0.0% Analcolica</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={beerEditForm.isCollaboration}
                  onChange={(e) => {
                    setBeerEditForm({ ...beerEditForm, isCollaboration: e.target.checked });
                    if (!e.target.checked) setBeerEditCollabBreweries([]);
                  }}
                  className="w-4 h-4 rounded border-stone-100 text-primary focus:ring-primary"
                />
                <span className="text-sm font-bold text-primary flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Collaborazione
                </span>
              </label>
            </div>
            {beerEditForm.isCollaboration && (
              <div className="space-y-2 p-3 rounded-lg border border-stone-200 dark:border-white/[0.06] bg-stone-50 dark:bg-[#12151A]">
                <Label className="text-primary font-bold flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" /> Birrifici Partner
                </Label>
                {beerEditCollabBreweries.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {beerEditCollabBreweries.map((b) => (
                      <span
                        key={b.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold bg-white dark:bg-card border border-[#E8DED1] dark:border-white/[0.06] text-primary"
                      >
                        <Building2 className="w-3 h-3" /> {b.name}
                        <button
                          type="button"
                          onClick={() =>
                            setBeerEditCollabBreweries(
                              beerEditCollabBreweries.filter((x) => x.id !== b.id),
                            )
                          }
                          className="ml-0.5 hover:text-primary/80"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <Input
                    value={beerCollabQuery}
                    onChange={(e) => {
                      setBeerCollabQuery(e.target.value);
                      searchBeerCollabBreweries(
                        e.target.value,
                        brewery?.id,
                        beerEditCollabBreweries,
                      );
                    }}
                    onBlur={() => setTimeout(() => setShowBeerCollabResults(false), 200)}
                    placeholder="Cerca birrificio partner…"
                    autoComplete="off"
                  />
                  {showBeerCollabResults && beerCollabResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-card border border-stone-100 dark:border-white/[0.06] rounded-md shadow-xl max-h-40 overflow-y-auto">
                      {beerCollabResults.map((b: any) => (
                        <button
                          key={b.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setBeerEditCollabBreweries([
                              ...beerEditCollabBreweries,
                              { id: b.id, name: b.name },
                            ]);
                            setBeerCollabQuery("");
                            setBeerCollabResults([]);
                            setShowBeerCollabResults(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-stone-50 dark:hover:bg-stone-900/20 border-b last:border-b-0 flex items-center gap-2 text-sm text-foreground"
                        >
                          {b.logoUrl ? (
                            <img
                              src={b.logoUrl}
                              alt=""
                              className="w-5 h-5 rounded-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <Building2 className="w-4 h-4 text-primary" />
                          )}
                          <span>{b.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {b.location}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-3 border-t border-[#E8DED1] dark:border-white/[0.06] pt-4">
              <ImageUpload
                label="Immagine Birra"
                description="Immagine principale (etichetta)"
                currentImageUrl={beerEditForm.imageUrl || undefined}
                onImageChange={(url) =>
                  setBeerEditForm((f) => ({ ...f, imageUrl: url ?? "" }))
                }
                folder="beer-images"
                aspectRatio="square"
                maxSize={5}
                recommendedDimensions="400x400px"
              />
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">URL Logo birra (opzionale)</Label>
                <Input
                  value={beerEditForm.logoUrl}
                  onChange={(e) => setBeerEditForm((f) => ({ ...f, logoUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E8DED1] dark:border-white/[0.06]">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setIsBeerEditOpen(false)}
              >
                <X className="h-4 w-4 mr-1.5" /> Annulla
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold"
                onClick={handleSaveBeerEdit}
                disabled={isSavingBeer}
              >
                <Save className="h-4 w-4 mr-1.5" />
                {isSavingBeer ? "Salvataggio..." : "Salva"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Delete Beer ── */}
      <Dialog open={isDeleteBeerOpen} onOpenChange={setIsDeleteBeerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Elimina Birra
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Sei sicuro di voler eliminare questa birra? L'operazione non può essere annullata.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setIsDeleteBeerOpen(false)}
            >
              Annulla
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
              onClick={handleDeleteBeer}
              disabled={isDeletingBeer}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              {isDeletingBeer ? "Eliminazione..." : "Elimina"}
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
    </div>
  );
}
