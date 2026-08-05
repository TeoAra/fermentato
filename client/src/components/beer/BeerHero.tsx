import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Share2,
  MoreHorizontal,
  Heart,
  Star,
  ChevronRight,
  Beer as BeerIcon,
  Loader2,
} from "lucide-react";
function getBeerStyleColor(style: string): { bg: string; text: string } {
  const s = (style || "").toLowerCase();
  if (s.includes("ipa") || s.includes("pale ale")) return { bg: "#FEF3C7", text: "#B45309" };
  if (s.includes("stout") || s.includes("porter")) return { bg: "#E7E5E4", text: "#1C1917" };
  if (s.includes("lager") || s.includes("pils")) return { bg: "#FEF9C3", text: "#A16207" };
  if (s.includes("weizen") || s.includes("wheat") || s.includes("blanche")) return { bg: "#FEF3C7", text: "#CA8A04" };
  if (s.includes("sour") || s.includes("gose")) return { bg: "#FCE7F3", text: "#BE185D" };
  if (s.includes("saison") || s.includes("farmhouse")) return { bg: "#FEF3C7", text: "#92400E" };
  if (s.includes("bock") || s.includes("dunkel") || s.includes("brown")) return { bg: "#FED7AA", text: "#9A3412" };
  return { bg: "#FEF3C7", text: "#B45309" };
}

interface BeerHeroProps {
  beer: any;
  beerCollabs?: Array<{ id: number | string; name: string }>;
  reviewsData?: { avgRating?: number; reviewCount?: number } | null;
  totalLocations?: number;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isSearchingImage?: boolean;
  isBeerFavorited: boolean;
  favoritePending: boolean;
  checkinPending?: boolean;
  onShare: () => void;
  onOpenEditDialog: () => void;
  onToggleFavorite: () => void;
  onCheckin: () => void;
  onReview: () => void;
}

/**
 * Hero per /beer/:id — visivamente IDENTICO a PubHero:
 * cover con rounded-b, card bianca overlappante, logo top-left,
 * 3 action pills rounded-full bordo amber.
 */
export default function BeerHero({
  beer,
  beerCollabs = [],
  reviewsData,
  totalLocations = 0,
  isAdmin,
  isAuthenticated,
  isSearchingImage,
  isBeerFavorited,
  favoritePending,
  checkinPending,
  onShare,
  onOpenEditDialog,
  onToggleFavorite,
  onCheckin,
  onReview,
}: BeerHeroProps) {
  const [, setLocation] = useLocation();
  const heroImg = beer?.logoUrl || beer?.imageUrl;
  const hasRating = !!(reviewsData?.avgRating != null && reviewsData?.reviewCount && reviewsData.reviewCount > 0);
  const styleColor = beer?.style ? getBeerStyleColor(beer.style) : null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative max-w-[720px] lg:max-w-7xl mx-auto"
      data-testid="beer-hero"
    >
      {/* Cover artwork */}
      <div className="relative h-[260px] sm:h-[300px] overflow-hidden rounded-b-[28px] bg-stone-900">
        {heroImg ? (
          <>
            <img
              src={heroImg}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-50"
              loading="lazy"
              decoding="async"
            />
            <button
              type="button"
              onClick={() => {
                if (heroImg) (window as any).__lightboxOpen?.(heroImg);
              }}
              className="absolute inset-0 w-full h-full"
              aria-label="Espandi immagine"
            >
              <img loading="lazy" src={heroImg} alt={beer?.name} className="w-full h-full object-contain" />
            </button>
          </>
        ) : isSearchingImage ? (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "linear-gradient(145deg, #1a0e05 0%, #4a2810 50%, #c95000 100%)" }}
          >
            <Loader2 className="h-10 w-10 text-amber-300/70 animate-spin" />
          </div>
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "linear-gradient(145deg, #1a0e05 0%, #4a2810 50%, #c95000 100%)" }}
          >
            <BeerIcon className="h-24 w-24 text-amber-300/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/30 pointer-events-none" />

        {/* Top bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
              else setLocation("/explore/beers");
            }}
            aria-label="Indietro"
            className="w-10 h-10 rounded-full bg-white/90 dark:bg-[#1A1D24]/90 backdrop-blur-sm flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.08)] active:scale-95 transition-transform"
            data-testid="beer-hero-back"
          >
            <ArrowLeft className="w-5 h-5 text-[#151515] dark:text-[#F5F5F5]" />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onShare}
              data-testid="button-share"
              aria-label="Condividi"
              className="w-10 h-10 rounded-full bg-white/90 dark:bg-[#1A1D24]/90 backdrop-blur-sm flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.08)] active:scale-95 transition-transform"
            >
              <Share2 className="w-4 h-4 text-[#151515] dark:text-[#F5F5F5]" />
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={onOpenEditDialog}
                data-testid="button-admin-edit-hero"
                aria-label="Altro"
                className="w-10 h-10 rounded-full bg-white/90 dark:bg-[#1A1D24]/90 backdrop-blur-sm flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.08)] active:scale-95 transition-transform"
              >
                <MoreHorizontal className="w-4 h-4 text-[#151515] dark:text-[#F5F5F5]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Overlapping card */}
      <div className="relative px-4 -mt-10 pb-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          className="relative bg-white dark:bg-[#1A1D24] rounded-[24px] border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.06)] px-5 pt-10 pb-5"
        >
          {/* Logo */}
          <div className="absolute -top-8 left-5">
            <button
              type="button"
              onClick={() => {
                if (heroImg) (window as any).__lightboxOpen?.(heroImg);
              }}
              className="w-16 h-16 rounded-full bg-white dark:bg-[#1A1D24] border-2 border-white shadow-[0_4px_16px_rgba(0,0,0,0.12)] overflow-hidden tap-scale flex items-center justify-center"
              aria-label="Logo birra"
            >
              {heroImg ? (
                <img loading="lazy" src={heroImg} alt={beer?.name} className="w-full h-full object-cover" />
              ) : (
                <BeerIcon className="h-7 w-7 text-[#F59E0B]" />
              )}
            </button>
          </div>

          <div className="space-y-2">
            <h1
              className="text-2xl font-black text-[#151515] dark:text-[#F5F5F5] leading-tight"
              data-testid="text-beer-name"
            >
              {beer?.name || "Birra"}
            </h1>

            {beer?.style && styleColor && (
              <Link href={`/search?q=${encodeURIComponent(beer.style)}`}>
                <span
                  className="inline-block text-sm font-bold tap-scale"
                  style={{ color: styleColor.text }}
                >
                  {beer.style}
                </span>
              </Link>
            )}

            {beer?.brewery && (
              <div className="flex items-center gap-1.5 flex-wrap text-sm">
                <Link href={`/brewery/${beer.brewery.id}`}>
                  <span className="inline-flex items-center gap-0.5 font-semibold text-[#6B6357] dark:text-[#B7BDC7] hover:text-[#F59E0B] transition-colors tap-scale">
                    {beer.brewery.name}
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </Link>
                {beerCollabs.map((b) => (
                  <span key={b.id} className="inline-flex items-center gap-0.5">
                    <span className="text-[#7E8795] text-xs">×</span>
                    <Link href={`/brewery/${b.id}`}>
                      <span className="font-semibold text-[#6B6357] dark:text-[#B7BDC7] hover:text-[#F59E0B]">
                        {b.name}
                      </span>
                    </Link>
                  </span>
                ))}
                {beerCollabs.length > 0 && (
                  <span className="text-[10px] font-bold text-[#F59E0B] bg-[#F59E0B]/10 px-1.5 py-0.5 rounded-full">
                    collab
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 text-sm pt-0.5 flex-wrap">
              {hasRating && (
                <span className="inline-flex items-center gap-1">
                  <Star className="w-4 h-4 text-[#F59E0B]" fill="#F59E0B" />
                  <span className="font-bold text-[#151515] dark:text-[#F5F5F5]">
                    {Number(reviewsData!.avgRating).toFixed(1).replace(".", ",")}
                  </span>
                  <span className="text-[#6B6357] dark:text-[#B7BDC7] text-xs">({reviewsData!.reviewCount})</span>
                </span>
              )}
              {totalLocations > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-700/40 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {totalLocations} {totalLocations === 1 ? "locale" : "locali"}
                </span>
              )}
            </div>
          </div>

          {/* Action pills */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              type="button"
              onClick={onCheckin}
              disabled={checkinPending}
              className="flex items-center justify-center gap-1.5 px-3 h-11 rounded-full border border-[#F59E0B] bg-white dark:bg-[#1A1D24] text-[#F59E0B] font-semibold text-sm active:scale-95 transition-all disabled:opacity-60 disabled:active:scale-100"
              data-testid="button-checkin"
              aria-label="Check-in"
            >
              <BeerIcon className="w-4 h-4" />
              <span>Check-in</span>
            </button>

            <button
              type="button"
              onClick={onToggleFavorite}
              disabled={favoritePending}
              className={`flex items-center justify-center gap-1.5 px-3 h-11 rounded-full border font-semibold text-sm active:scale-95 transition-all disabled:opacity-60 disabled:active:scale-100 ${
                isBeerFavorited
                  ? "bg-[#F59E0B] border-[#F59E0B] text-white"
                  : "border-[#F59E0B] bg-white dark:bg-[#1A1D24] text-[#F59E0B]"
              }`}
              data-testid="button-favorite"
              aria-label={isBeerFavorited ? "Rimuovi dai preferiti" : "Salva nei preferiti"}
            >
              <Heart className="w-4 h-4" fill={isBeerFavorited ? "currentColor" : "none"} />
              <span>{isBeerFavorited ? "Salvata" : "Salva"}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
