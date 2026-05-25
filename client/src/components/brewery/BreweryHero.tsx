import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  Share2,
  Settings,
  Lightbulb,
  Star,
  MapPin,
  Beer,
  ShieldCheck,
  Heart,
  Navigation,
  Globe,
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { RichTextDisplay, isRichContentEmpty } from "@/components/rich-text-editor";

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
 * Hero per /brewery/:id — mobile (full-bleed cover + identity card) e
 * desktop (cover compatta). Coerente con pattern pub-detail:
 * crema #FAF7F1 light / true-black dark, amber #F59E0B.
 *
 * Lo stato `descExpanded` è locale: usato solo qui.
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
  const [descExpanded, setDescExpanded] = useState(false);

  return (
    <>
      {/* ── MOBILE — full-bleed cover with rounded-card transition ── */}
      <div className="relative lg:hidden">
        <div className="relative h-72 overflow-hidden">
          {brewery?.coverImageUrl ? (
            <img src={brewery.coverImageUrl} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
          ) : brewery?.logoUrl ? (
            <img src={brewery.logoUrl} alt="" className="w-full h-full object-cover blur-2xl scale-110 opacity-40" loading="lazy" decoding="async" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-stone-800 via-stone-700 to-stone-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/40" />

          <Link
            href="/explore/breweries"
            className="absolute top-3 left-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center tap-scale"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Link>
          <div className="absolute top-3 right-4 flex items-center gap-2">
            <button
              onClick={onShare}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center tap-scale"
              aria-label="Condividi"
            >
              <Share2 className="h-[18px] w-[18px] text-white" />
            </button>
            {isAdmin ? (
              <Link href={`/admin/edit-brewery/${breweryId}`}>
                <button
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center tap-scale"
                  aria-label="Modifica birrificio"
                >
                  <Settings className="h-[18px] w-[18px] text-white" />
                </button>
              </Link>
            ) : isAuthenticated ? (
              <button
                onClick={onOpenSuggest}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center tap-scale"
                aria-label="Suggerisci modifica"
              >
                <Lightbulb className="h-[18px] w-[18px] text-white" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Identity block — white card with rounded top corners */}
        <div className="bg-background dark:bg-background relative px-4 pb-2 rounded-t-[32px] -mt-8 z-10">
          <div className="flex items-end gap-3 -mt-12 relative z-10">
            <button
              onClick={() => {
                const s = brewery?.logoUrl;
                if (s) (window as any).__lightboxOpen?.(s);
              }}
              className="flex-shrink-0 tap-scale"
              aria-label="Apri logo"
            >
              <Avatar className="h-24 w-24 rounded-full border-4 border-background dark:border-background shadow-lg bg-stone-800">
                <AvatarImage src={brewery?.logoUrl} alt={brewery?.name} className="object-cover" />
                <AvatarFallback className="bg-stone-700 text-white text-3xl font-bold">
                  {brewery?.name?.[0] || "B"}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-foreground leading-tight tracking-tight">{brewery?.name}</h1>
              {brewery?.hasOwner && (
                <div
                  title="Birrificio Verificato"
                  className="flex items-center justify-center bg-primary rounded-full w-5 h-5 flex-shrink-0 shadow-sm"
                >
                  <ShieldCheck className="h-3 w-3 text-white" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-[#6B6357] dark:text-[#B7BDC7] flex-wrap">
              {breweryRating?.avgRating ? (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-foreground">
                    {breweryRating.avgRating.toFixed(1).replace(".", ",")}
                  </span>
                  <span className="text-[#6B6357] dark:text-[#B7BDC7]">({breweryRating.reviewCount})</span>
                </div>
              ) : null}
              {breweryRating?.avgRating && brewery?.location && (
                <span className="text-[#7E8795] dark:text-[#7E8795]">·</span>
              )}
              {brewery?.location && (
                <div className="flex items-center gap-1 min-w-0">
                  <MapPin className="h-3.5 w-3.5 text-[#6B6357] dark:text-[#B7BDC7] flex-shrink-0" />
                  <span className="truncate">
                    {brewery.location}
                    {brewery.region ? ` (${brewery.region})` : ""}
                    {brewery?.country ? `, ${brewery.country}` : ""}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-1">
              {beersCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-orange-50 dark:bg-orange-950/30 text-primary border border-orange-100 dark:border-orange-900/40">
                  <Beer className="h-3.5 w-3.5" />
                  {beersCount} {beersCount === 1 ? "birra" : "birre"}
                </span>
              )}
              {!brewery?.parentCompany && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Birrificio indipendente
                </span>
              )}
            </div>

            {!isRichContentEmpty(brewery?.description) && (
              <div className="pt-2">
                <div className={`text-sm ${descExpanded ? "" : "line-clamp-3"}`}>
                  <RichTextDisplay html={brewery.description} />
                </div>
                {(brewery.description as string).length > 140 && (
                  <button
                    onClick={() => setDescExpanded((v) => !v)}
                    className="mt-1 text-sm font-bold text-primary inline-flex items-center gap-0.5 tap-scale"
                  >
                    {descExpanded ? "Mostra meno" : "Leggi di più"}
                    <ChevronRight
                      className={`h-4 w-4 transition-transform ${descExpanded ? "-rotate-90" : "rotate-90"}`}
                    />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 4 action cards row */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            <button
              onClick={onToggleFavorite}
              disabled={favoritePending}
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-3 px-1 transition-all tap-scale border ${
                isBreweryFavorited
                  ? "bg-primary/5 border-primary/30"
                  : "bg-[#FAF7F1] dark:bg-[#1A1D24] border-[#E8DED1] dark:border-white/[0.06] hover:border-primary/30"
              }`}
              data-testid="button-follow-brewery"
            >
              <Heart className={`h-5 w-5 ${isBreweryFavorited ? "fill-primary text-primary" : "text-foreground"}`} />
              <span className="text-[11px] font-bold text-foreground leading-tight">
                {isBreweryFavorited ? "Seguendo" : "Segui"}
              </span>
              <span className="text-[10px] text-[#6B6357] dark:text-[#B7BDC7] leading-tight">
                {favCount > 0 ? `${favCount} follower` : "Aggiungi"}
              </span>
            </button>

            {brewery?.location ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  (brewery.name || "") + " " + brewery.location
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-1 rounded-2xl py-3 px-1 bg-[#FAF7F1] dark:bg-[#1A1D24] border border-[#E8DED1] dark:border-white/[0.06] hover:border-primary/30 transition-all tap-scale"
                data-testid="link-directions"
              >
                <Navigation className="h-5 w-5 text-foreground" />
                <span className="text-[11px] font-bold text-foreground leading-tight">Indicazioni</span>
                <span className="text-[10px] text-[#6B6357] dark:text-[#B7BDC7] leading-tight">Maps</span>
              </a>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 rounded-2xl py-3 px-1 bg-stone-50/40 dark:bg-[#0B0D10]/20 border border-[#E8DED1] dark:border-white/[0.06] opacity-50">
                <Navigation className="h-5 w-5 text-stone-400" />
                <span className="text-[11px] font-bold text-stone-400 leading-tight">Indicazioni</span>
                <span className="text-[10px] text-stone-400 leading-tight">N/D</span>
              </div>
            )}

            {brewery?.websiteUrl ? (
              <a
                href={brewery.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-1 rounded-2xl py-3 px-1 bg-[#FAF7F1] dark:bg-[#1A1D24] border border-[#E8DED1] dark:border-white/[0.06] hover:border-primary/30 transition-all tap-scale"
                data-testid="link-website"
              >
                <Globe className="h-5 w-5 text-foreground" />
                <span className="text-[11px] font-bold text-foreground leading-tight">Sito web</span>
                <span className="text-[10px] text-[#6B6357] dark:text-[#B7BDC7] leading-tight truncate max-w-full px-1">
                  {brewery.websiteUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]}
                </span>
              </a>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 rounded-2xl py-3 px-1 bg-stone-50/40 dark:bg-[#0B0D10]/20 border border-[#E8DED1] dark:border-white/[0.06] opacity-50">
                <Globe className="h-5 w-5 text-stone-400" />
                <span className="text-[11px] font-bold text-stone-400 leading-tight">Sito web</span>
                <span className="text-[10px] text-stone-400 leading-tight">N/D</span>
              </div>
            )}

            <button
              onClick={onShare}
              className="flex flex-col items-center justify-center gap-1 rounded-2xl py-3 px-1 bg-[#FAF7F1] dark:bg-[#1A1D24] border border-[#E8DED1] dark:border-white/[0.06] hover:border-primary/30 transition-all tap-scale"
              data-testid="button-share-brewery"
            >
              <Share2 className="h-5 w-5 text-foreground" />
              <span className="text-[11px] font-bold text-foreground leading-tight">Condividi</span>
              <span className="text-[10px] text-[#6B6357] dark:text-[#B7BDC7] leading-tight">Con amici</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── DESKTOP — cover compatta, identity gestita da sidebar ── */}
      <div className="relative h-80 overflow-hidden bg-stone-900 hidden lg:block">
        {brewery?.coverImageUrl ? (
          <img src={brewery.coverImageUrl} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
        ) : brewery?.logoUrl ? (
          <img src={brewery.logoUrl} alt="" className="w-full h-full object-cover blur-2xl scale-110 opacity-40" loading="lazy" decoding="async" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-stone-800 via-stone-700 to-stone-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />
        <Link
          href="/explore/breweries"
          className="absolute top-4 left-6 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center tap-scale"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </Link>
        <button
          onClick={onShare}
          className="absolute top-4 right-6 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center tap-scale"
          aria-label="Condividi"
        >
          <Share2 className="h-[18px] w-[18px] text-white" />
        </button>
      </div>
    </>
  );
}
