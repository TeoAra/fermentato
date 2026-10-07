import { motion, useReducedMotion } from "framer-motion";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Share2,
  MapPin,
  Phone,
  Navigation,
  Heart,
  Clock,
  Star,
} from "lucide-react";
import ImageWithFallback from "@/components/image-with-fallback";
import { PageContainer, PageContainerInset } from "@/components/layout/page-container";
import type { PubLike, OpenStatusInfo } from "./types";

interface PubHeroProps {
  pub: PubLike;
  openStatus?: OpenStatusInfo | null;
  beerRatingAvg?: number | null;
  beerRatingCount?: number | null;
  favoritesCount?: number | null;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onCall?: () => void;
  onDirections?: () => void;
  onShare?: () => void;
}

function statusColors(status: OpenStatusInfo | null | undefined) {
  if (!status) return { bg: "bg-stone-500", text: "text-white" };
  switch (status.status) {
    case "open":
      return { bg: "bg-emerald-500", text: "text-white" };
    case "closing_soon":
      return { bg: "bg-amber-500", text: "text-white" };
    case "opening_soon":
      return { bg: "bg-amber-400", text: "text-stone-900" };
    case "closed":
    default:
      return { bg: "bg-red-500", text: "text-white" };
  }
}

export default function PubHero({
  pub,
  openStatus,
  beerRatingAvg,
  beerRatingCount,
  favoritesCount,
  isFavorite,
  onToggleFavorite,
  onCall,
  onDirections,
  onShare,
}: PubHeroProps) {
  const [, setLocation] = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const cover = pub?.coverImageUrl || pub?.imageUrl || pub?.logoUrl || "";
  const colors = statusColors(openStatus);
  const hasPhone = !!pub?.phone;
  const hasRating =
    typeof beerRatingCount === "number" && beerRatingCount > 0 && typeof beerRatingAvg === "number";

  return (
    <motion.section
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: "easeOut" }}
      className="relative"
      data-testid="pub-hero"
    >
      <PageContainer variant="hero" noPadding>
      <PageContainerInset bleedOnMobile>
      <div
        className="relative mx-auto aspect-[1.85/1] sm:aspect-[2.7/1] max-h-[260px] w-full overflow-hidden rounded-b-[20px] sm:rounded-[20px] bg-muted"
        data-testid="pub-hero-cover"
      >
        <ImageWithFallback
          src={cover}
          alt={pub?.name || "Pub"}
          imageType="pub"
          containerClassName="absolute inset-0"
          className="h-full w-full object-contain"
          iconSize="xl"
          width={1600}
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 92vw, 1200px"
          srcSetWidths={[480, 768, 1200, 1600, 2000]}
          loading="eager"
          fetchPriority="high"
        />
        {/* Top bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
              else setLocation("/");
            }}
            aria-label="Indietro"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/95 text-foreground active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="pub-hero-back"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                aria-label="Condividi"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/95 text-foreground active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="pub-hero-share"
              >
                <Share2 className="w-4.5 h-4.5 text-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Status badge */}
        {openStatus && (
          <div className="absolute top-16 left-3 z-10">
            <span
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${colors.bg} ${colors.text}`}
              data-testid="pub-hero-status"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-90" />
              {openStatus.label}
            </span>
          </div>
        )}
      </div>
      </PageContainerInset>

        <PageContainerInset className="relative pb-2 pt-3 sm:pt-4">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.4, delay: prefersReducedMotion ? 0 : 0.1, ease: "easeOut" }}
          className="relative rounded-2xl border border-border/70 bg-card px-4 py-4 text-card-foreground"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {pub?.logoUrl && <ImageWithFallback src={pub.logoUrl} alt={`Logo ${pub.name}`} imageType="pub" containerClassName="h-11 w-11 shrink-0 rounded-xl bg-muted" className="object-contain" width={144} noSrcSet />}
            <h1 className="min-w-0 break-words text-[22px] sm:text-2xl font-bold text-foreground leading-tight tracking-tight" data-testid="pub-hero-name">
              {pub?.name || "Pub"}
            </h1>
            </div>

            <div className="flex items-start gap-1.5 text-muted-foreground text-sm leading-snug">
              <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <span className="min-w-0">
                {[pub?.address, pub?.city].filter(Boolean).join(", ") || pub?.city || "Località non disponibile"}
              </span>
            </div>

            {openStatus?.detail && (
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Clock className="w-3.5 h-3.5" />
                <span>{openStatus.detail}</span>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm pt-0.5 flex-wrap">
              {hasRating && (
                <span className="inline-flex items-center gap-1">
                  <Star className="w-4 h-4 text-primary" fill="currentColor" />
                  <span className="font-bold text-foreground">{beerRatingAvg!.toFixed(1)}</span>
                  <span className="text-muted-foreground text-xs">({beerRatingCount})</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Heart className="w-3.5 h-3.5 text-primary" fill="currentColor" />
                <span className="font-bold text-foreground">{favoritesCount ?? 0}</span>
                <span>{(favoritesCount ?? 0) === 1 ? "persona l'ha salvato" : "persone l'hanno salvato"}</span>
              </span>
            </div>
          </div>

          {/* Action pills */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <button
              type="button"
              onClick={onCall}
              disabled={!hasPhone}
              className="flex min-w-0 items-center justify-center gap-1.5 px-2 sm:px-3 min-h-11 rounded-xl border border-border bg-card text-foreground font-semibold text-sm active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
              data-testid="pub-hero-call"
              aria-label="Chiama"
            >
              <Phone className="w-4 h-4" />
              <span className="truncate">Chiama</span>
            </button>
            <button
              type="button"
              onClick={onDirections}
              className="flex min-w-0 items-center justify-center gap-1.5 px-2 sm:px-3 min-h-11 rounded-xl border border-border bg-card text-foreground font-semibold text-sm active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
              data-testid="pub-hero-directions"
              aria-label="Indicazioni"
            >
              <Navigation className="w-4 h-4" />
              <span className="truncate">Mappa</span>
            </button>
            <button
              type="button"
              onClick={onToggleFavorite}
              className={`flex min-w-0 items-center justify-center gap-1.5 px-2 sm:px-3 min-h-11 rounded-xl border font-semibold text-sm active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${
                isFavorite
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-border bg-card text-foreground"
              }`}
              data-testid="pub-hero-favorite"
              aria-label={isFavorite ? "Rimuovi dai preferiti" : "Salva nei preferiti"}
            >
              <Heart className="w-4 h-4" fill={isFavorite ? "currentColor" : "none"} />
              <span className="truncate">{isFavorite ? "Salvato" : "Salva"}</span>
            </button>
          </div>
        </motion.div>
      </PageContainerInset>
      </PageContainer>
    </motion.section>
  );
}
