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
  checkinCount?: number;
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
  checkinCount = 0,
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
  const heroImg = beer?.imageUrl || beer?.logoUrl;
  const beerMark = beer?.logoUrl || beer?.imageUrl;
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
      {/* Artwork stays clear and uncropped; no enlarged duplicate backdrop. */}
      <div className="lg:px-8">
      <div className="relative h-[clamp(156px,45vw,210px)] sm:h-[250px] overflow-hidden rounded-b-[22px] sm:rounded-[22px] bg-muted">
        {heroImg ? (
          <button
            type="button"
            onClick={() => {
              if (heroImg) (window as any).__lightboxOpen?.(heroImg);
            }}
            className="absolute inset-0 flex h-full w-full items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            aria-label="Espandi immagine"
          >
            <img loading="lazy" src={heroImg} alt={beer?.name} className="h-full w-full object-contain" />
          </button>
        ) : isSearchingImage ? (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BeerIcon className="h-14 w-14 text-muted-foreground/45" />
          </div>
        )}

        {/* Top bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
              else setLocation("/explore/beers");
            }}
            aria-label="Indietro"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/95 text-foreground active:scale-95 transition-transform"
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
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/95 text-foreground active:scale-95 transition-transform"
            >
              <Share2 className="w-4 h-4 text-[#151515] dark:text-[#F5F5F5]" />
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={onOpenEditDialog}
                data-testid="button-admin-edit-hero"
                aria-label="Altro"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/95 text-foreground active:scale-95 transition-transform"
              >
                <MoreHorizontal className="w-4 h-4 text-[#151515] dark:text-[#F5F5F5]" />
              </button>
            )}
          </div>
        </div>
      </div>
      </div>

      <div className="relative mt-3 px-4 lg:px-8 pb-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          className="relative rounded-2xl border border-border/70 bg-card p-4"
        >
          <div className="flex items-start gap-3">
          {/* Show a distinct mark only: never repeat the cover or overlap it. */}
          {beerMark && beerMark !== heroImg && (
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => {
              if (beerMark) (window as any).__lightboxOpen?.(beerMark);
              }}
               className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-border bg-card tap-scale"
              aria-label="Logo birra"
            >
              {beerMark ? (
                <img loading="lazy" src={beerMark} alt={beer?.name} className="h-full w-full object-contain p-1" />
              ) : (
                <BeerIcon className="h-7 w-7 text-[#F59E0B]" />
              )}
            </button>
          </div>
          )}

          <div className="min-w-0 flex-1 space-y-2">
            <h1
              className="text-[22px] font-bold text-foreground leading-tight"
              data-testid="text-beer-name"
            >
              {beer?.name || "Birra"}
            </h1>

            {beer?.style && styleColor && (
              <Link href={`/search?q=${encodeURIComponent(beer.style)}`}>
                <span
                  className="inline-block text-sm font-semibold tap-scale dark:!text-amber-400"
                  style={{ color: styleColor.text }}
                >
                  {beer.style}
                </span>
              </Link>
            )}

            {beer?.brewery && (
              <div className="flex items-center gap-1.5 flex-wrap text-sm">
                <Link href={`/brewery/${beer.brewery.id}`}>
                  <span className="inline-flex items-center gap-0.5 font-semibold text-muted-foreground hover:text-primary transition-colors tap-scale">
                    {beer.brewery.name}
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </Link>
                {beerCollabs.map((b) => (
                  <span key={b.id} className="inline-flex items-center gap-0.5">
                    <span className="text-[#7E8795] text-xs">×</span>
                    <Link href={`/brewery/${b.id}`}>
                      <span className="font-semibold text-muted-foreground hover:text-primary">
                        {b.name}
                      </span>
                    </Link>
                  </span>
                ))}
                {beerCollabs.length > 0 && (
                  <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                    collab
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 text-sm pt-0.5 flex-wrap">
              {hasRating && (
                <span className="inline-flex items-center gap-1">
                  <Star className="w-4 h-4 text-primary" fill="currentColor" />
                  <span className="font-bold text-foreground">
                    {Number(reviewsData!.avgRating).toFixed(1).replace(".", ",")}
                  </span>
                  <span className="text-muted-foreground text-xs">({reviewsData!.reviewCount})</span>
                </span>
              )}
              {totalLocations > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {totalLocations} {totalLocations === 1 ? "locale" : "locali"}
                </span>
              )}
              {checkinCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-muted text-foreground px-2.5 py-1 rounded-full">
                  <BeerIcon className="w-3 h-3" />
                  {checkinCount === 1 ? "Già bevuta" : `Bevuta ${checkinCount} volt${checkinCount === 1 ? "a" : "e"}`}
                </span>
              )}
            </div>
          </div>

          </div>
          {/* Action pills */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <button
              type="button"
              onClick={onCheckin}
              disabled={checkinPending}
              className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-card px-1 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-60"
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
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-60 ${
                isBeerFavorited
                  ? "bg-primary border-primary text-primary-foreground"
                   : "border-border bg-card text-foreground"
              }`}
              data-testid="button-favorite"
              aria-label={isBeerFavorited ? "Rimuovi dai preferiti" : "Salva nei preferiti"}
            >
              <Heart className="w-4 h-4" fill={isBeerFavorited ? "currentColor" : "none"} />
              <span>{isBeerFavorited ? "Salvata" : "Salva"}</span>
            </button>
            <button
              type="button"
              onClick={onReview}
              className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-card px-1 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              data-testid="button-review"
              aria-label="Recensisci questa birra"
            >
              <Star className="h-4 w-4" />
              <span>Recensisci</span>
            </button>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
