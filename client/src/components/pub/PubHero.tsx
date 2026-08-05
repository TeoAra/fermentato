import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
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
  const cover = pub?.coverImageUrl || pub?.imageUrl || pub?.logoUrl || "";
  const colors = statusColors(openStatus);
  const hasPhone = !!pub?.phone;
  const hasRating =
    typeof beerRatingCount === "number" && beerRatingCount > 0 && typeof beerRatingAvg === "number";

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative max-w-[720px] lg:max-w-7xl mx-auto"
      data-testid="pub-hero"
    >
      {/* Cover — on lg+ inset to match the card's horizontal padding */}
      <div className="lg:px-8">
      <div className="relative h-[260px] sm:h-[300px] overflow-hidden rounded-b-[28px] bg-stone-200">
        <ImageWithFallback
          src={cover}
          alt={pub?.name || "Pub"}
          imageType="pub"
          containerClassName="absolute inset-0"
          className="w-full h-full object-cover"
          iconSize="xl"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/30 pointer-events-none" />

        {/* Top bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
              else setLocation("/");
            }}
            aria-label="Indietro"
            className="w-10 h-10 rounded-full bg-white/90 dark:bg-[#1A1D24]/90 backdrop-blur-sm flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.08)] active:scale-95 transition-transform"
            data-testid="pub-hero-back"
          >
            <ArrowLeft className="w-5 h-5 text-[#151515] dark:text-[#F5F5F5]" />
          </button>
          <div className="flex items-center gap-2">
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                aria-label="Condividi"
                className="w-10 h-10 rounded-full bg-white/90 dark:bg-[#1A1D24]/90 backdrop-blur-sm flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.08)] active:scale-95 transition-transform"
                data-testid="pub-hero-share"
              >
                <Share2 className="w-4.5 h-4.5 text-[#151515] dark:text-[#F5F5F5]" />
              </button>
            )}
          </div>
        </div>

        {/* Status badge */}
        {openStatus && (
          <div className="absolute top-16 left-3 z-10">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-[0_4px_12px_rgba(0,0,0,0.18)] ${colors.bg} ${colors.text}`}
              data-testid="pub-hero-status"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-90" />
              {openStatus.label}
            </span>
          </div>
        )}
      </div>
      </div>

      {/* Overlapping card */}
      <div className="relative px-4 lg:px-8 -mt-10 pb-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          className="relative bg-white dark:bg-[#1A1D24] rounded-[24px] border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.06)] px-5 pt-10 pb-5"
        >
          {/* Logo */}
          <div className="absolute -top-8 left-5">
            <div className="w-16 h-16 rounded-full bg-white dark:bg-[#1A1D24] border-2 border-white shadow-[0_4px_16px_rgba(0,0,0,0.12)] overflow-hidden">
              <ImageWithFallback
                src={pub?.logoUrl || cover}
                alt={pub?.name || "Logo"}
                imageType="pub"
                containerClassName="w-full h-full"
                className="w-full h-full object-cover"
                iconSize="md"
              />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-[#151515] dark:text-[#F5F5F5] leading-tight" data-testid="pub-hero-name">
              {pub?.name || "Pub"}
            </h1>

            <div className="flex items-center gap-1.5 text-[#6B6357] dark:text-[#B7BDC7] text-sm">
              <MapPin className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span className="truncate">
                {[pub?.address, pub?.city].filter(Boolean).join(", ") || pub?.city || "Località non disponibile"}
              </span>
            </div>

            {openStatus?.detail && (
              <div className="flex items-center gap-1.5 text-[#6B6357] dark:text-[#B7BDC7] text-xs">
                <Clock className="w-3.5 h-3.5" />
                <span>{openStatus.detail}</span>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm pt-0.5 flex-wrap">
              {hasRating && (
                <span className="inline-flex items-center gap-1">
                  <Star className="w-4 h-4 text-[#F59E0B]" fill="#F59E0B" />
                  <span className="font-bold text-[#151515] dark:text-[#F5F5F5]">{beerRatingAvg!.toFixed(1)}</span>
                  <span className="text-[#6B6357] dark:text-[#B7BDC7] text-xs">({beerRatingCount})</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-[#6B6357] dark:text-[#B7BDC7]">
                <Heart className="w-3.5 h-3.5 text-[#F59E0B]" fill="#F59E0B" />
                <span className="font-bold text-[#151515] dark:text-[#F5F5F5]">{favoritesCount ?? 0}</span>
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
              className="flex items-center justify-center gap-1.5 px-3 h-11 rounded-full border border-[#F59E0B] bg-white dark:bg-[#1A1D24] text-[#F59E0B] font-semibold text-sm active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100"
              data-testid="pub-hero-call"
              aria-label="Chiama"
            >
              <Phone className="w-4 h-4" />
              <span>Chiama</span>
            </button>
            <button
              type="button"
              onClick={onDirections}
              className="flex items-center justify-center gap-1.5 px-3 h-11 rounded-full border border-[#F59E0B] bg-white dark:bg-[#1A1D24] text-[#F59E0B] font-semibold text-sm active:scale-95 transition-all"
              data-testid="pub-hero-directions"
              aria-label="Indicazioni"
            >
              <Navigation className="w-4 h-4" />
              <span>Indicazioni</span>
            </button>
            <button
              type="button"
              onClick={onToggleFavorite}
              className={`flex items-center justify-center gap-1.5 px-3 h-11 rounded-full border font-semibold text-sm active:scale-95 transition-all ${
                isFavorite
                  ? "bg-[#F59E0B] border-[#F59E0B] text-white"
                  : "border-[#F59E0B] bg-white dark:bg-[#1A1D24] text-[#F59E0B]"
              }`}
              data-testid="pub-hero-favorite"
              aria-label={isFavorite ? "Rimuovi dai preferiti" : "Salva nei preferiti"}
            >
              <Heart className="w-4 h-4" fill={isFavorite ? "currentColor" : "none"} />
              <span>{isFavorite ? "Salvato" : "Salva"}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
