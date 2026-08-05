import { lazy, Suspense, useState, useMemo, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { it as itLocale } from "date-fns/locale";
import {
  Home as HomeIcon,
  Beer as BeerIcon,
  Wine,
  GlassWater,
  Utensils,
  XCircle,
  Calendar,
  Clock,
  ChevronDown,
  MapPin,
  Phone,
  Star,
  Navigation,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { usePubLiveUpdates } from "@/hooks/usePubLiveUpdates";
import { getMapNavigationUrl } from "@/lib/utils";
import { RichTextDisplay, isRichContentEmpty } from "@/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import OpeningHoursDialog from "@/components/OpeningHoursDialog";
import { EventCategoryBadge, EventShareButtons } from "@/components/events-manager";

import {
  PubHero,
  StickyPubTabs,
  OverviewSection,
  TaplistSection,
  BottlesSection,
  FoodMenuSection,
  type StickyTabDef,
  type OpenStatusInfo,
  type PubLike,
  type TapItem,
  type BottleItem,
  type FoodMenu,
} from "@/components/pub";

const CheckinModal = lazy(() => import("@/components/checkin-modal"));

// ── Drinks public display ───────────────────────────────────────────────────

function DrinkItemRow({ item, emoji }: { item: any; emoji: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-[#1A1D24] border border-[#E8DED1] dark:border-white/[0.06]">
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-[#252830] flex items-center justify-center text-lg flex-shrink-0">
          {emoji}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-[#151515] dark:text-[#F5F5F5] leading-snug">{item.name}</p>
        {(item.vintage || item.distillery || item.producer) && (
          <p className="text-xs text-[#6B6357] dark:text-[#B7BDC7] mt-0.5">
            {[item.producer, item.vintage, item.distillery].filter(Boolean).join(" · ")}
          </p>
        )}
        {item.description && (
          <p className="text-xs text-[#6B6357] dark:text-[#B7BDC7] mt-0.5 line-clamp-2">{item.description}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {item.priceByGlass && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-medium text-[#6B6357] dark:text-[#B7BDC7] uppercase tracking-wide leading-none">Calice</span>
            <span className="text-base font-bold text-[#F59E0B] leading-tight">€{parseFloat(item.priceByGlass).toFixed(2)}</span>
          </div>
        )}
        {item.priceByBottle && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-medium text-[#6B6357] dark:text-[#B7BDC7] uppercase tracking-wide leading-none">Bottiglia</span>
            <span className="text-base font-semibold text-[#151515] dark:text-[#F5F5F5] leading-tight">€{parseFloat(item.priceByBottle).toFixed(2)}</span>
          </div>
        )}
        {item.price && !item.priceByGlass && !item.priceByBottle && (
          <span className="text-base font-bold text-[#F59E0B]">€{parseFloat(item.price).toFixed(2)}</span>
        )}
        <div className="flex items-center gap-1.5">
          {item.volumeCl && (
            <span className="text-xs text-[#6B6357] dark:text-[#B7BDC7]">{item.volumeCl}cl</span>
          )}
          {item.alcoholDegree && (
            <span className="text-xs text-[#6B6357] dark:text-[#B7BDC7]">{item.alcoholDegree}%</span>
          )}
        </div>
      </div>
    </div>
  );
}

function DrinksPublicSection({ categories, legacyItems }: { categories: any[]; legacyItems: any[] }) {
  // New system: collapsible categories with description + info box
  const visibleCats = categories.filter(c => c.isVisible !== false && Array.isArray(c.items) && c.items.length > 0);

  const [expanded, setExpanded] = useState<Set<number>>(
    () => new Set(visibleCats.length > 0 ? [visibleCats[0].id] : [])
  );
  const toggleCat = (id: number) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (visibleCats.length > 0) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-3 pt-4"
      >
        <h2 className="text-xl font-black text-[#151515] dark:text-[#F5F5F5]">Bevande</h2>
        <div className="space-y-3">
          {visibleCats.map((cat: any) => {
            const emoji = cat.type === "vino" ? "🍷" : cat.type === "birra" ? "🍺" : "🥤";
            const visibleItems = (cat.items as any[]).filter((i: any) => i.isVisible !== false);
            if (visibleItems.length === 0) return null;
            const isOpen = expanded.has(cat.id);
            return (
              <section
                key={cat.id}
                className="bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleCat(cat.id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-[#FAF7F1] dark:active:bg-white/[0.03] transition-colors"
                >
                  <span className="text-xl flex-shrink-0">{emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <h3 className="text-base font-black text-[#151515] dark:text-[#F5F5F5]">{cat.name}</h3>
                      <span className="text-[10px] font-bold text-[#F59E0B] tabular-nums">
                        {visibleItems.length} {visibleItems.length === 1 ? "prodotto" : "prodotti"}
                      </span>
                    </div>
                    {cat.description && (
                      <p className="text-xs text-[#6B6357] dark:text-[#B7BDC7] leading-relaxed mt-1">{cat.description}</p>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-[#6B6357] dark:text-[#B7BDC7] flex-shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-[#E8DED1] dark:border-white/[0.06]">
                        {cat.infoBox && (
                          <div className="px-4 py-3 bg-[#FFF7EA] dark:bg-[#F59E0B]/10 flex items-start gap-2">
                            <span className="text-base flex-shrink-0 mt-0.5">📌</span>
                            <p className="text-xs text-[#6B6357] dark:text-[#B7BDC7] leading-relaxed">{cat.infoBox}</p>
                          </div>
                        )}
                        <div className="p-3 space-y-2">
                          {visibleItems.map((item: any) => (
                            <DrinkItemRow key={item.id} item={item} emoji={emoji} />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            );
          })}
        </div>
      </motion.section>
    );
  }

  // Legacy system fallback: flat items with string category field
  const LEGACY_META: Record<string, { label: string; emoji: string }> = {
    vino:       { label: "Vini",       emoji: "🍷" },
    distillati: { label: "Distillati", emoji: "🥃" },
    spirits:    { label: "Distillati", emoji: "🥃" },
    cocktail:   { label: "Cocktails",  emoji: "🍹" },
    bibita:     { label: "Bevande",    emoji: "🥤" },
    altro:      { label: "Altro",      emoji: "🍾" },
  };
  const LEGACY_ORDER = ["vino", "distillati", "bibita", "altro"];
  const visible = legacyItems.filter(i => i.isVisible !== false);
  if (visible.length === 0) return null;
  const allCats = [...new Set(visible.map((i: any) => i.category ?? "vino"))];
  const ordered = [
    ...LEGACY_ORDER.filter(c => allCats.includes(c)),
    ...allCats.filter(c => !LEGACY_ORDER.includes(c)).sort(),
  ];

  return (
    <section className="pt-6 space-y-6">
      <h2 className="text-xl font-bold text-[#151515] dark:text-[#F5F5F5]">Bevande</h2>
      {ordered.map(cat => {
        const meta = LEGACY_META[cat] ?? { label: cat, emoji: "🏷️" };
        const catItems = visible.filter((i: any) => (i.category ?? "vino") === cat);
        return (
          <div key={cat}>
            <h3 className="text-sm font-semibold text-[#6B6357] dark:text-[#B7BDC7] uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <span>{meta.emoji}</span>
              <span>{meta.label}</span>
            </h3>
            <div className="space-y-2">
              {catItems.map((item: any) => (
                <DrinkItemRow key={item.id} item={item} emoji={meta.emoji} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────
function computeOpenStatus(
  hours: { open?: string; close?: string; isClosed?: boolean } | null | undefined,
  currentTime: number,
): OpenStatusInfo {
  if (!hours || hours.isClosed) {
    return { status: "closed", label: "Chiuso", detail: "Apre più tardi" };
  }
  if (hours.open && hours.close) {
    const [oh, om] = hours.open.split(":").map(Number);
    const [ch, cm] = hours.close.split(":").map(Number);
    const openTime = oh * 60 + om;
    const closeTime = ch * 60 + cm;
    const isOpen =
      closeTime < openTime
        ? currentTime >= openTime || currentTime <= closeTime
        : currentTime >= openTime && currentTime <= closeTime;
    if (isOpen) {
      const minToClose =
        closeTime < openTime
          ? currentTime >= openTime
            ? 24 * 60 - currentTime + closeTime
            : closeTime - currentTime
          : closeTime - currentTime;
      if (minToClose <= 30) {
        return { status: "closing_soon", label: "Chiude tra poco", detail: `Chiude alle ${hours.close}` };
      }
      return { status: "open", label: "Aperto ora", detail: `Aperto fino alle ${hours.close}` };
    }
    const minToOpen = openTime - currentTime;
    if (minToOpen > 0 && minToOpen <= 60) {
      return { status: "opening_soon", label: "Apre tra poco", detail: `Apre alle ${hours.open}` };
    }
    return { status: "closed", label: "Chiuso", detail: `Apre alle ${hours.open}` };
  }
  return { status: "open", label: "Aperto" };
}

function getOpenStatusInfo(openingHours: any): OpenStatusInfo | null {
  if (!openingHours) return null;
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const todayDate = now.toISOString().slice(0, 10);
  const specialDays: any[] = openingHours.specialDays ?? [];
  const specialToday = specialDays.find((s: any) => s.date === todayDate);
  if (specialToday) return computeOpenStatus(specialToday, currentTime);
  const currentDay = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][
    now.getDay()
  ];
  return computeOpenStatus(openingHours[currentDay], currentTime);
}

// ── Tabs definition ────────────────────────────────────────────────────────
const TABS: StickyTabDef[] = [
  { value: "overview", label: "Panoramica", icon: <HomeIcon className="w-4 h-4" /> },
  { value: "taplist", label: "Spine", icon: <BeerIcon className="w-4 h-4" /> },
  { value: "bottles", label: "Cantina", icon: <Wine className="w-4 h-4" /> },
  { value: "drinks", label: "Bevande", icon: <GlassWater className="w-4 h-4" /> },
  { value: "menu", label: "Menù", icon: <Utensils className="w-4 h-4" /> },
];

// ── Page ───────────────────────────────────────────────────────────────────
export default function PubDetail() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview");
  const [showOpeningHours, setShowOpeningHours] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [checkinTarget, setCheckinTarget] = useState<{
    beer: { id: number; name: string; style?: string | null; breweryName?: string | null };
    tapType?: string | null;
  } | null>(null);

  // Analytics fire-and-forget
  useEffect(() => {
    if (!id) return;
    fetch("/api/analytics/pub-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pubId: id }),
    }).catch(() => {});
  }, [id]);

  usePubLiveUpdates(id);

  // Queries
  const { data: pub, isLoading: pubLoading } = useQuery<PubLike>({
    queryKey: ["/api/pubs", id],
    enabled: !!id,
    staleTime: 3 * 60_000,
  });

  const { data: tapList } = useQuery<TapItem[]>({
    queryKey: ["/api/pubs", id, "taplist"],
    enabled: !!id,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: menuFull } = useQuery<any[]>({
    queryKey: ["/api/pubs", id, "menu", "full"],
    queryFn: () => apiRequest(`/api/pubs/${id}/menu/full`),
    enabled: !!id,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: bottles } = useQuery<BottleItem[]>({
    queryKey: ["/api/pubs", id, "bottles"],
    enabled: !!id,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: drinkItems = [] } = useQuery<any[]>({
    queryKey: ["/api/pubs", id, "drinks"],
    queryFn: () => apiRequest(`/api/pubs/${id}/drinks`),
    enabled: !!id,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: drinkCategories = [] } = useQuery<any[]>({
    queryKey: ["/api/pubs", id, "drink-categories"],
    queryFn: () => apiRequest(`/api/pubs/${id}/drink-categories`),
    enabled: !!id,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: pubEvents = [] } = useQuery<any[]>({
    queryKey: [`/api/pubs/${id}/events`],
    enabled: !!id,
    staleTime: 2 * 60_000,
  });

  const { data: allergens = [] } = useQuery<any[]>({
    queryKey: ["/api/allergens"],
  });

  // Auto-open event from shared link (?event=N)
  useEffect(() => {
    if (!Array.isArray(pubEvents) || pubEvents.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("event");
    if (eventId) {
      const found = pubEvents.find((e: any) => String(e.id) === eventId);
      if (found) setSelectedEvent(found);
    }
  }, [pubEvents]);

  const pubNumericId = (pub as any)?.id;

  const { data: favoritesCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/favorites", "pub", pubNumericId, "count"],
    enabled: !!pubNumericId,
    staleTime: 60_000,
  });

  const { data: isFavoriteData } = useQuery<any>({
    queryKey: ["/api/favorites", "pub", pubNumericId, "check"],
    enabled: !!pubNumericId && isAuthenticated,
    staleTime: 60_000,
  });

  const isFavorite = (isFavoriteData as any)?.isFavorite || false;

  // Memos — devono stare PRIMA di qualsiasi early return (Rules of Hooks)
  const foodMenu: FoodMenu | null = useMemo(() => {
    if (!Array.isArray(menuFull) || menuFull.length === 0) return null;
    return {
      categories: menuFull
        .filter((c: any) => c.isVisible !== false)
        .map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        infoBox: c.infoBox ?? null,
        items: (c.items || [])
          .filter((i: any) => !i.isInfoBox && i.isVisible !== false)
          .map((i: any) => ({
            id: i.id,
            name: i.name,
            description: i.description,
            price: i.price,
            imageUrl: i.imageUrl,
            allergens: i.allergens,
            isVegetarian: i.isVegetarian,
            isSpicy: i.isSpicy,
            isAvailable: i.isAvailable !== false,
            pairingBeer: i.pairingBeerName ? (() => {
              const parts = String(i.pairingBeerName).split('||');
              return { name: parts[0].trim(), breweryName: parts[1]?.trim() || null };
            })() : null,
          })),
      })),
    };
  }, [menuFull]);

  const allergensIndex = useMemo(() => {
    const idx: Record<string, { emoji?: string; name?: string }> = {};
    if (Array.isArray(allergens)) {
      for (const a of allergens) {
        idx[String(a.id)] = { emoji: a.emoji, name: a.name };
      }
    }
    return idx;
  }, [allergens]);

  // Owner / admin
  const isOwner = isAuthenticated && user && pub && (user as any).id === (pub as any).ownerId;
  const isAdmin =
    isAuthenticated &&
    user &&
    ((user as any).activeRole === "admin" ||
      (!((user as any).activeRole) && (user as any).userType === "admin"));
  const canManage = isOwner || isAdmin;

  // Favorites toggle
  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!pubNumericId) return null;
      if (isFavorite) {
        return apiRequest(`/api/favorites/pub/${pubNumericId}`, { method: "DELETE" });
      }
      return apiRequest(
        "/api/favorites",
        { method: "POST" },
        { itemType: "pub", itemId: pubNumericId },
      );
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/favorites", "pub", pubNumericId, "check"] });
      const prev = queryClient.getQueryData(["/api/favorites", "pub", pubNumericId, "check"]);
      queryClient.setQueryData(["/api/favorites", "pub", pubNumericId, "check"], {
        isFavorite: !isFavorite,
      });
      return { prev };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/favorites", "pub", pubNumericId, "check"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/favorites", "pub", pubNumericId, "count"],
      });
    },
    onError: (_e: any, _v, ctx: any) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(["/api/favorites", "pub", pubNumericId, "check"], ctx.prev);
      }
      toast({
        title: "Errore",
        description: "Impossibile aggiornare i preferiti",
        variant: "destructive",
      });
    },
  });

  const handleToggleFavorite = () => {
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

  // Share
  const handleShare = async () => {
    const pubName = (pub as any)?.name || "Pub";
    const currentUrl = window.location.href;
    const shareData = {
      title: `${pubName} - Fermenta.to`,
      text: `Scopri ${pubName} su Fermenta.to`,
      url: currentUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentUrl);
        toast({ title: "Link copiato", description: "Il link è stato copiato negli appunti" });
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
    }
  };

  const handleCall = () => {
    if ((pub as any)?.phone) window.location.href = `tel:${(pub as any).phone}`;
  };

  const handleDirections = () => {
    const p = pub as any;
    if (!p) return;
    const url = getMapNavigationUrl(p.name, p.address);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  // Loading / 404
  if (pubLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F1] dark:bg-[#12151A] dark:bg-[#0B0D10]">
        <div className="max-w-[720px] mx-auto px-4 py-8 space-y-4">
          <div className="h-[260px] rounded-2xl bg-stone-200 animate-pulse" />
          <div className="h-32 rounded-2xl bg-stone-200 animate-pulse" />
          <div className="h-64 rounded-2xl bg-stone-200 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!pub) {
    return (
      <div className="min-h-screen bg-[#FAF7F1] dark:bg-[#12151A] dark:bg-[#0B0D10] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500 mx-auto flex items-center justify-center">
            <XCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[#151515] dark:text-[#F5F5F5]">Pub non trovato</h2>
          <p className="text-[#6B6357] dark:text-[#B7BDC7]">Il pub che stai cercando non esiste o è stato rimosso.</p>
          <Button asChild>
            <Link href="/">Torna alla Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const pubData = pub as any;
  const openStatus = getOpenStatusInfo(pubData?.openingHours);

  // SEO
  const seoTitle = pubData?.name
    ? `${pubData.name} — Taplist & Birre Artigianali | Fermenta.to`
    : "Fermenta.to";
  const seoDesc = pubData?.description
    ? String(pubData.description).slice(0, 155)
    : pubData?.name
    ? `Scopri la taplist aggiornata di ${pubData.name}, le birre artigianali alla spina, il menù e gli orari di apertura su Fermenta.to.`
    : "Fermenta.to — La piattaforma per gli amanti della birra artigianale.";
  const seoImage = pubData?.coverImageUrl || pubData?.logoUrl;
  const seoUrl = `https://fermenta.to/pub/${id}`;

  // Onsite check-in opener
  const openTapCheckin = (tap: TapItem) => {
    setCheckinTarget({
      beer: {
        id: tap.beer.id,
        name: tap.beer.name,
        style: tap.beer.style ?? null,
        breweryName: tap.beer.brewery?.name ?? tap.beer.breweryName ?? null,
      },
      tapType: tap.tapType ?? "spina",
    });
  };

  const openBottleCheckin = (b: BottleItem) => {
    setCheckinTarget({
      beer: {
        id: b.beer.id,
        name: b.beer.name,
        style: b.beer.style ?? null,
        breweryName: b.beer.brewery?.name ?? b.beer.breweryName ?? null,
      },
      tapType: "bottiglia",
    });
  };

  return (
    <div className="min-h-screen bg-[#FAF7F1] dark:bg-[#12151A] dark:bg-[#0B0D10]">
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
                  name: "Pub",
                  item: "https://fermenta.to/explore/pubs",
                },
                ...(pubData?.city
                  ? [
                      {
                        "@type": "ListItem",
                        position: 3,
                        name: pubData.city,
                        item: `https://fermenta.to/explore/pubs?city=${encodeURIComponent(pubData.city)}`,
                      },
                    ]
                  : []),
                {
                  "@type": "ListItem",
                  position: pubData?.city ? 4 : 3,
                  name: pubData?.name,
                  item: seoUrl,
                },
              ],
            },
            {
              "@context": "https://schema.org",
              "@type": "BarOrPub",
              "@id": seoUrl,
              name: pubData?.name,
              description:
                pubData?.description ||
                `${pubData?.name} è un pub con birre artigianali${
                  pubData?.city ? ` a ${pubData.city}` : ""
                }. Scopri taplist, orari e info su Fermenta.to.`,
              url: seoUrl,
              image: seoImage,
              telephone: pubData?.phone,
              priceRange: "€€",
              servesCuisine: "Craft Beer",
              address: pubData?.address
                ? {
                    "@type": "PostalAddress",
                    streetAddress: pubData.address,
                    addressLocality: pubData.city,
                    addressCountry: "IT",
                  }
                : undefined,
              ...(pubData?.latitude && pubData?.longitude
                ? {
                    geo: {
                      "@type": "GeoCoordinates",
                      latitude: pubData.latitude,
                      longitude: pubData.longitude,
                    },
                  }
                : {}),
            },
          ])}
        </script>
      </Helmet>

      <PubHero
        pub={pubData}
        openStatus={openStatus}
        beerRatingAvg={pubData?.beerRatingAvg ?? null}
        beerRatingCount={pubData?.beerRatingCount ?? null}
        favoritesCount={favoritesCountData?.count ?? null}
        isFavorite={isFavorite}
        onToggleFavorite={handleToggleFavorite}
        onCall={handleCall}
        onDirections={handleDirections}
        onShare={handleShare}
      />

      <StickyPubTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      <main
        className="max-w-[720px] lg:max-w-7xl mx-auto px-4 lg:px-8"
        style={{ paddingBottom: "calc(80px + var(--frozen-sab))" }}
      >
        <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-10 lg:items-start">

          {/* ── LEFT: tab sections ─────────────────────────────────────── */}
          <div>
            {canManage && (
              <div className="pt-3">
                <Link
                  href={isAdmin ? `/admin/edit-pub/${id}` : "/dashboard"}
                  className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-white dark:bg-[#1A1D24] border border-[#E8DED1] dark:border-white/[0.06] text-xs font-bold text-[#151515] dark:text-[#F5F5F5] hover:border-[#F59E0B] transition-colors"
                  data-testid="button-manage"
                >
                  Gestisci pub
                </Link>
              </div>
            )}

            <div className={`${activeTab === "overview" ? "" : "hidden"} lg:!block`}>
              <OverviewSection
                pub={pubData}
                events={Array.isArray(pubEvents) ? pubEvents : []}
                onShowHours={() => setShowOpeningHours(true)}
                onCall={handleCall}
                onDirections={handleDirections}
              />
            </div>

            <div className={`${activeTab === "taplist" ? "" : "hidden"} lg:!block`}>
              <TaplistSection
                taps={Array.isArray(tapList) ? tapList : []}
                currentUserCanCheckin={isAuthenticated}
                onCheckin={openTapCheckin}
              />
            </div>

            <div className={`${activeTab === "bottles" ? "" : "hidden"} lg:!block`}>
              <BottlesSection
                bottles={Array.isArray(bottles) ? bottles : []}
                currentUserCanCheckin={isAuthenticated}
                onCheckin={openBottleCheckin}
              />
            </div>

            <div className={`${activeTab === "drinks" ? "" : "hidden"} lg:!block`}>
              <DrinksPublicSection
                categories={Array.isArray(drinkCategories) ? drinkCategories : []}
                legacyItems={Array.isArray(drinkItems) ? drinkItems : []}
              />
            </div>

            <div className={`${activeTab === "menu" ? "" : "hidden"} lg:!block`}>
              <FoodMenuSection
                menu={foodMenu}
                isOwner={!!canManage}
                onAddMenu={() => {
                  if (canManage) window.location.href = isAdmin ? `/admin/edit-pub/${id}` : "/dashboard";
                }}
                allergensIndex={allergensIndex}
                menuInfoBox={(pub as any)?.menuInfoBox ?? null}
              />
            </div>
          </div>

          {/* ── RIGHT: Desktop sticky sidebar ──────────────────────────── */}
          <aside className="hidden lg:flex flex-col gap-4 sticky top-[116px] pt-3">

            {/* Status + quick info card */}
            <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.05)] p-4 space-y-3">

              {/* Open/closed badge */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                  openStatus?.status === 'open' || openStatus?.status === 'closing_soon'
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${openStatus?.status === 'open' || openStatus?.status === 'closing_soon' ? "bg-emerald-500" : "bg-red-500"}`} />
                  {openStatus?.label ?? (openStatus?.status === 'open' ? "Aperto" : "Chiuso")}
                </span>
                {pubData?.beerRatingAvg && pubData?.beerRatingCount > 0 && (
                  <span className="flex items-center gap-1 text-sm font-bold text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {Number(pubData.beerRatingAvg).toFixed(1)}
                    <span className="text-xs font-normal text-stone-400">({pubData.beerRatingCount})</span>
                  </span>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-[#E8DED1] dark:border-white/[0.06]" />

              {/* Address */}
              {pubData?.address && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm text-stone-700 dark:text-stone-300 leading-snug">{pubData.address}</p>
                    {pubData.city && (
                      <p className="text-xs text-stone-400 mt-0.5">{pubData.city}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Phone */}
              {pubData?.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                  <a href={`tel:${pubData.phone}`} className="text-sm text-stone-700 dark:text-stone-300 hover:text-primary transition-colors">
                    {pubData.phone}
                  </a>
                </div>
              )}

              {/* Favorites */}
              {(favoritesCountData?.count ?? 0) > 0 && (
                <p className="text-xs text-stone-400 flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  {favoritesCountData!.count} persone hanno salvato questo pub
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleDirections}
                className="flex items-center justify-center gap-1.5 h-10 rounded-xl bg-primary/10 hover:bg-primary/15 text-primary text-sm font-semibold transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Indicazioni
              </button>
              <button
                onClick={handleCall}
                disabled={!pubData?.phone}
                className="flex items-center justify-center gap-1.5 h-10 rounded-xl bg-stone-100 dark:bg-white/[0.05] hover:bg-stone-200 dark:hover:bg-white/[0.08] text-stone-700 dark:text-stone-300 text-sm font-semibold transition-colors disabled:opacity-40"
              >
                <Phone className="w-4 h-4" />
                Chiama
              </button>
            </div>

          </aside>
        </div>
      </main>

      {/* Check-in modal */}
      {checkinTarget && (
        <Suspense fallback={null}>
          <CheckinModal
            open={!!checkinTarget}
            onClose={() => setCheckinTarget(null)}
            beer={checkinTarget.beer}
            pub={pubData ?? null}
            tapType={checkinTarget.tapType ?? null}
          />
        </Suspense>
      )}

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
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
                    {!selectedEvent.imageUrl && (
                      <EventCategoryBadge category={selectedEvent.category} />
                    )}
                    <DialogTitle className="text-xl">{selectedEvent.title}</DialogTitle>
                  </div>
                </DialogHeader>
                <div className="flex items-center text-sm text-[#F59E0B] gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(selectedEvent.eventDate), "EEEE d MMMM yyyy 'alle' HH:mm", {
                      locale: itLocale,
                    })}
                  </span>
                </div>
                {selectedEvent.endDate && (() => {
                  const start = new Date(selectedEvent.eventDate);
                  const end = new Date(selectedEvent.endDate);
                  const sameDay = start.toDateString() === end.toDateString();
                  return (
                    <div className="flex items-center text-sm text-muted-foreground gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {sameDay
                          ? `fino alle ${format(end, "HH:mm", { locale: itLocale })}`
                          : `fino a ${format(end, "EEEE d MMMM 'alle' HH:mm", { locale: itLocale })}`}
                      </span>
                    </div>
                  );
                })()}
                {selectedEvent.description?.trim() && (
                  <RichTextDisplay html={selectedEvent.description} />
                )}
                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Condividi questo evento</p>
                  <EventShareButtons
                    event={selectedEvent}
                    pubId={pubNumericId}
                    size="default"
                  />
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
        pubName={pubData?.name || ""}
        openingHours={pubData?.openingHours}
      />
    </div>
  );
}
