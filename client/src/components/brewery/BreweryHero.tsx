import { Link, useLocation } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Share2,
  Settings,
  Lightbulb,
  Star,
  MapPin,
  Beer as BeerIcon,
  ShieldCheck,
  Heart,
  Navigation,
  Globe,
} from "lucide-react";
import ImageWithFallback from "@/components/image-with-fallback";

interface BreweryHeroProps {
  brewery: any;
  breweryRating?: { avgRating?: number; reviewCount?: number } | null;
  beersCount: number;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isBreweryFavorited: boolean;
  favCount: number;
  favoritePending: boolean;
  breweryId: string | number;
  onShare: () => void;
  onToggleFavorite: () => void;
  onOpenSuggest: () => void;
}

export default function BreweryHero({
  brewery,
  breweryRating,
  beersCount,
  isAdmin,
  isAuthenticated,
  isBreweryFavorited,
  favCount,
  favoritePending,
  breweryId,
  onShare,
  onToggleFavorite,
  onOpenSuggest,
}: BreweryHeroProps) {
  const [, setLocation] = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const cover = brewery?.coverImageUrl || brewery?.logoUrl || "";
  const hasRating = !!(breweryRating?.avgRating && breweryRating?.reviewCount);
  const hasWebsite = !!brewery?.websiteUrl;
  const hasLocation = !!brewery?.location;

  return (
    <motion.section
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: "easeOut" }}
      className="relative max-w-[720px] lg:max-w-7xl mx-auto"
      data-testid="brewery-hero"
    >
      <div className="px-0 lg:px-8">
      <div
        className="relative mx-auto aspect-[1.85/1] sm:aspect-[2.7/1] max-h-[260px] w-full overflow-hidden rounded-b-[20px] sm:rounded-[20px] bg-muted"
        data-testid="brewery-hero-cover"
      >
        {cover ? (
          <ImageWithFallback
            src={cover}
            alt={brewery?.name ? `Copertina di ${brewery.name}` : "Copertina del birrificio"}
            imageType="brewery"
            containerClassName="absolute inset-0"
            className="h-full w-full object-contain"
            iconSize="xl"
            width={1600}
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 92vw, 1200px"
            srcSetWidths={[480, 768, 1200, 1600, 2000]}
            loading="eager"
            fetchPriority="high"
          />
        ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <BeerIcon className="h-12 w-12 text-stone-400 dark:text-stone-500" aria-hidden="true" />
          </div>
        )}
        {/* Top bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
              else setLocation("/explore/breweries");
            }}
            aria-label="Indietro"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/95 text-foreground active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
            data-testid="brewery-hero-back"
          >
            <ArrowLeft className="w-5 h-5 text-[#151515] dark:text-[#F5F5F5]" />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onShare}
              aria-label="Condividi"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/95 text-foreground active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
              data-testid="brewery-hero-share"
            >
              <Share2 className="w-4 h-4 text-[#151515] dark:text-[#F5F5F5]" />
            </button>
            {isAdmin ? (
              <Link
                href={`/admin/edit-brewery/${breweryId}`}
                aria-label="Modifica birrificio"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/95 text-foreground active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
              >
                <Settings className="w-4 h-4 text-[#151515] dark:text-[#F5F5F5]" />
              </Link>
            ) : isAuthenticated ? (
              <button
                type="button"
                onClick={onOpenSuggest}
                aria-label="Suggerisci modifica"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/95 text-foreground active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
              >
                <Lightbulb className="w-4 h-4 text-[#151515] dark:text-[#F5F5F5]" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
      </div>

      <div className="relative px-4 lg:px-8 pt-3 sm:pt-4 pb-2">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.4, delay: prefersReducedMotion ? 0 : 0.1, ease: "easeOut" }}
          className="relative rounded-2xl border border-border/70 bg-card px-4 py-4"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {brewery?.logoUrl && <ImageWithFallback src={brewery.logoUrl} alt={`Logo ${brewery.name}`} imageType="brewery" containerClassName="h-11 w-11 shrink-0 rounded-xl bg-muted" className="object-contain" width={144} noSrcSet />}
              <h1
                className="min-w-0 break-words text-[22px] font-bold tracking-tight text-foreground leading-tight"
                data-testid="brewery-hero-name"
              >
                {brewery?.name || "Birrificio"}
              </h1>
              {brewery?.hasOwner && (
                <div
                  title="Birrificio Verificato"
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary"
                >
                  <ShieldCheck className="h-3 w-3 text-white" />
                </div>
              )}
            </div>

            {hasLocation && (
              <div className="flex items-center gap-1.5 text-[#6B6357] dark:text-[#B7BDC7] text-sm">
                <MapPin className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span className="min-w-0">
                  {brewery.location}
                  {brewery.region ? ` (${brewery.region})` : ""}
                  {brewery?.country ? `, ${brewery.country}` : ""}
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm pt-0.5 flex-wrap">
              {hasRating && (
                <span className="inline-flex items-center gap-1">
                <Star className="w-4 h-4 text-primary" fill="currentColor" />
                  <span className="font-bold text-foreground">
                    {breweryRating!.avgRating!.toFixed(1).replace(".", ",")}
                  </span>
                  <span className="text-muted-foreground text-xs">({breweryRating!.reviewCount})</span>
                </span>
              )}
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Heart className="w-3.5 h-3.5 text-primary" fill="currentColor" />
                <span className="font-bold text-foreground">{favCount}</span>
                <span>{favCount === 1 ? "follower" : "follower"}</span>
              </span>
              {beersCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-[#6B6357] dark:text-[#B7BDC7]">
                  <BeerIcon className="w-3.5 h-3.5 text-primary" />
                  <span className="font-bold text-foreground">{beersCount}</span>
                  <span>{beersCount === 1 ? "birra" : "birre"}</span>
                </span>
              )}
            </div>

            {!brewery?.parentCompany && (
              <div className="pt-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Birrificio indipendente
                </span>
              </div>
            )}

          </div>

          {/* Action pills — IDENTICO a PubHero */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <button
              type="button"
              onClick={onToggleFavorite}
              disabled={favoritePending}
              className={`flex min-w-0 items-center justify-center gap-1.5 px-2 sm:px-3 min-h-11 rounded-xl border font-semibold text-sm active:scale-95 transition-all disabled:opacity-60 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none ${
                isBreweryFavorited
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-border bg-card text-foreground"
              }`}
              data-testid="button-follow-brewery"
              aria-label={isBreweryFavorited ? "Smetti di seguire" : "Segui birrificio"}
            >
              <Heart className="w-4 h-4" fill={isBreweryFavorited ? "currentColor" : "none"} />
              <span className="truncate">{isBreweryFavorited ? "Seguendo" : "Segui"}</span>
            </button>

            {hasLocation ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  (brewery.name || "") + " " + brewery.location
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-center justify-center gap-1.5 px-2 sm:px-3 min-h-11 rounded-xl border border-border bg-card text-foreground font-semibold text-sm active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
                data-testid="link-directions"
                aria-label="Indicazioni"
              >
                <Navigation className="w-4 h-4" />
              <span className="truncate">Mappa</span>
              </a>
            ) : hasWebsite ? (
              <a
                href={brewery.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-center justify-center gap-1.5 px-2 sm:px-3 min-h-11 rounded-xl border border-border bg-card text-foreground font-semibold text-sm active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
                data-testid="link-website"
                aria-label="Sito web"
              >
                <Globe className="w-4 h-4" />
                <span className="truncate">Sito</span>
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex min-w-0 items-center justify-center gap-1.5 px-2 sm:px-3 min-h-11 rounded-xl border border-border bg-card text-foreground font-semibold text-sm opacity-40"
                aria-label="Indicazioni non disponibili"
              >
                <Navigation className="w-4 h-4" />
                <span className="truncate">Indicazioni</span>
              </button>
            )}

            <button
              type="button"
              onClick={onShare}
              className="flex min-w-0 items-center justify-center gap-1.5 px-2 sm:px-3 min-h-11 rounded-xl border border-border bg-card text-foreground font-semibold text-sm active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
              data-testid="button-share-brewery"
              aria-label="Condividi"
            >
              <Share2 className="w-4 h-4" />
              <span className="truncate">Condividi</span>
            </button>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
