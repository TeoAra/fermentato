import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
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

/**
 * Hero per /brewery/:id — visivamente IDENTICO a PubHero:
 * cover con rounded-b, card bianca overlappante, logo top-left,
 * 3 action pills rounded-full bordo amber.
 */
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
  const cover = brewery?.coverImageUrl || brewery?.logoUrl || "";
  const hasRating = !!(breweryRating?.avgRating && breweryRating?.reviewCount);
  const hasWebsite = !!brewery?.websiteUrl;
  const hasLocation = !!brewery?.location;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative max-w-[720px] mx-auto"
      data-testid="brewery-hero"
    >
      {/* Cover */}
      <div className="relative h-[260px] sm:h-[300px] overflow-hidden rounded-b-[28px] bg-stone-200 dark:bg-stone-900">
        {brewery?.coverImageUrl ? (
          <img src={brewery.coverImageUrl} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
        ) : brewery?.logoUrl ? (
          <img
            src={brewery.logoUrl}
            alt=""
            className="w-full h-full object-cover blur-2xl scale-110 opacity-40"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-stone-800 via-stone-700 to-stone-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/30 pointer-events-none" />

        {/* Top bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
              else setLocation("/explore/breweries");
            }}
            aria-label="Indietro"
            className="w-10 h-10 rounded-full bg-white/90 dark:bg-[#1A1D24]/90 backdrop-blur-sm flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.08)] active:scale-95 transition-transform"
            data-testid="brewery-hero-back"
          >
            <ArrowLeft className="w-5 h-5 text-[#151515] dark:text-[#F5F5F5]" />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onShare}
              aria-label="Condividi"
              className="w-10 h-10 rounded-full bg-white/90 dark:bg-[#1A1D24]/90 backdrop-blur-sm flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.08)] active:scale-95 transition-transform"
              data-testid="brewery-hero-share"
            >
              <Share2 className="w-4 h-4 text-[#151515] dark:text-[#F5F5F5]" />
            </button>
            {isAdmin ? (
              <Link href={`/admin/edit-brewery/${breweryId}`}>
                <button
                  type="button"
                  aria-label="Modifica birrificio"
                  className="w-10 h-10 rounded-full bg-white/90 dark:bg-[#1A1D24]/90 backdrop-blur-sm flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.08)] active:scale-95 transition-transform"
                >
                  <Settings className="w-4 h-4 text-[#151515] dark:text-[#F5F5F5]" />
                </button>
              </Link>
            ) : isAuthenticated ? (
              <button
                type="button"
                onClick={onOpenSuggest}
                aria-label="Suggerisci modifica"
                className="w-10 h-10 rounded-full bg-white/90 dark:bg-[#1A1D24]/90 backdrop-blur-sm flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.08)] active:scale-95 transition-transform"
              >
                <Lightbulb className="w-4 h-4 text-[#151515] dark:text-[#F5F5F5]" />
              </button>
            ) : null}
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
                if (brewery?.logoUrl) (window as any).__lightboxOpen?.(brewery.logoUrl);
              }}
              className="w-16 h-16 rounded-full bg-white dark:bg-[#1A1D24] border-2 border-white shadow-[0_4px_16px_rgba(0,0,0,0.12)] overflow-hidden tap-scale flex items-center justify-center"
              aria-label="Apri logo"
            >
              {brewery?.logoUrl ? (
                <ImageWithFallback
                  src={brewery.logoUrl}
                  alt={brewery?.name || "Logo"}
                  imageType="brewery"
                  containerClassName="w-full h-full"
                  className="w-full h-full object-cover"
                  iconSize="md"
                />
              ) : (
                <span className="text-2xl font-black text-[#6B6357]">
                  {brewery?.name?.[0] || "B"}
                </span>
              )}
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1
                className="text-2xl font-black text-[#151515] dark:text-[#F5F5F5] leading-tight"
                data-testid="brewery-hero-name"
              >
                {brewery?.name || "Birrificio"}
              </h1>
              {brewery?.hasOwner && (
                <div
                  title="Birrificio Verificato"
                  className="flex items-center justify-center bg-[#F59E0B] rounded-full w-5 h-5 flex-shrink-0 shadow-sm"
                >
                  <ShieldCheck className="h-3 w-3 text-white" />
                </div>
              )}
            </div>

            {hasLocation && (
              <div className="flex items-center gap-1.5 text-[#6B6357] dark:text-[#B7BDC7] text-sm">
                <MapPin className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span className="truncate">
                  {brewery.location}
                  {brewery.region ? ` (${brewery.region})` : ""}
                  {brewery?.country ? `, ${brewery.country}` : ""}
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm pt-0.5 flex-wrap">
              {hasRating && (
                <span className="inline-flex items-center gap-1">
                  <Star className="w-4 h-4 text-[#F59E0B]" fill="#F59E0B" />
                  <span className="font-bold text-[#151515] dark:text-[#F5F5F5]">
                    {breweryRating!.avgRating!.toFixed(1).replace(".", ",")}
                  </span>
                  <span className="text-[#6B6357] dark:text-[#B7BDC7] text-xs">({breweryRating!.reviewCount})</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-[#6B6357] dark:text-[#B7BDC7]">
                <Heart className="w-3.5 h-3.5 text-[#F59E0B]" fill="#F59E0B" />
                <span className="font-bold text-[#151515] dark:text-[#F5F5F5]">{favCount}</span>
                <span>{favCount === 1 ? "follower" : "follower"}</span>
              </span>
              {beersCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-[#6B6357] dark:text-[#B7BDC7]">
                  <BeerIcon className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span className="font-bold text-[#151515] dark:text-[#F5F5F5]">{beersCount}</span>
                  <span>{beersCount === 1 ? "birra" : "birre"}</span>
                </span>
              )}
            </div>

            {!brewery?.parentCompany && (
              <div className="pt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
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
              className={`flex items-center justify-center gap-1.5 px-3 h-11 rounded-full border font-semibold text-sm active:scale-95 transition-all disabled:opacity-60 disabled:active:scale-100 ${
                isBreweryFavorited
                  ? "bg-[#F59E0B] border-[#F59E0B] text-white"
                  : "border-[#F59E0B] bg-white dark:bg-[#1A1D24] text-[#F59E0B]"
              }`}
              data-testid="button-follow-brewery"
              aria-label={isBreweryFavorited ? "Smetti di seguire" : "Segui birrificio"}
            >
              <Heart className="w-4 h-4" fill={isBreweryFavorited ? "currentColor" : "none"} />
              <span>{isBreweryFavorited ? "Seguendo" : "Segui"}</span>
            </button>

            {hasLocation ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  (brewery.name || "") + " " + brewery.location
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 h-11 rounded-full border border-[#F59E0B] bg-white dark:bg-[#1A1D24] text-[#F59E0B] font-semibold text-sm active:scale-95 transition-all"
                data-testid="link-directions"
                aria-label="Indicazioni"
              >
                <Navigation className="w-4 h-4" />
                <span>Indicazioni</span>
              </a>
            ) : hasWebsite ? (
              <a
                href={brewery.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 h-11 rounded-full border border-[#F59E0B] bg-white dark:bg-[#1A1D24] text-[#F59E0B] font-semibold text-sm active:scale-95 transition-all"
                data-testid="link-website"
                aria-label="Sito web"
              >
                <Globe className="w-4 h-4" />
                <span>Sito</span>
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex items-center justify-center gap-1.5 px-3 h-11 rounded-full border border-[#F59E0B] bg-white dark:bg-[#1A1D24] text-[#F59E0B] font-semibold text-sm opacity-40"
                aria-label="Indicazioni non disponibili"
              >
                <Navigation className="w-4 h-4" />
                <span>Indicazioni</span>
              </button>
            )}

            <button
              type="button"
              onClick={onShare}
              className="flex items-center justify-center gap-1.5 px-3 h-11 rounded-full border border-[#F59E0B] bg-white dark:bg-[#1A1D24] text-[#F59E0B] font-semibold text-sm active:scale-95 transition-all"
              data-testid="button-share-brewery"
              aria-label="Condividi"
            >
              <Share2 className="w-4 h-4" />
              <span>Condividi</span>
            </button>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
