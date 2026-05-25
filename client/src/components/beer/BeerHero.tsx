import {
  ArrowLeft,
  Share2,
  MoreHorizontal,
  Bookmark,
  Beer as BeerIcon,
  Loader2,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";

interface BeerHeroProps {
  beer: any;
  isAdmin: boolean;
  isSearchingImage?: boolean;
  isBeerFavorited: boolean;
  favoritePending: boolean;
  onShare: () => void;
  onOpenEditDialog: () => void;
  onToggleFavorite: () => void;
}

/**
 * Hero per /beer/:id — full-bleed artwork (logo o cover) con blur background,
 * curved white edge, logo+bookmark sovrapposti. Pattern coerente con pub/brewery.
 */
export default function BeerHero({
  beer,
  isAdmin,
  isSearchingImage,
  isBeerFavorited,
  favoritePending,
  onShare,
  onOpenEditDialog,
  onToggleFavorite,
}: BeerHeroProps) {
  const heroImg = beer?.logoUrl || beer?.imageUrl;

  return (
    <>
      {/* HERO — full-bleed artwork con sfondo blur */}
      <div className="relative">
        <div className="relative w-full h-72 lg:h-80 bg-stone-900 overflow-hidden">
          {heroImg ? (
            <>
              <img
                src={heroImg}
                alt=""
                className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-50"
              />
              <button
                onClick={() => {
                  if (heroImg) (window as any).__lightboxOpen?.(heroImg);
                }}
                className="absolute inset-0 w-full h-full"
                aria-label="Espandi immagine"
              >
                <img src={heroImg} alt={beer?.name} className="w-full h-full object-contain" />
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
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/30" />

          {/* Top action bar */}
          <button
            onClick={() => window.history.back()}
            className="absolute top-3 left-4 w-10 h-10 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center tap-scale z-10"
            aria-label="Indietro"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <div className="absolute top-3 right-4 flex items-center gap-2 z-10">
            <button
              onClick={onShare}
              data-testid="button-share"
              className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center tap-scale"
              aria-label="Condividi"
            >
              <Share2 className="h-5 w-5 text-white" />
            </button>
            {isAdmin && (
              <button
                onClick={onOpenEditDialog}
                data-testid="button-admin-edit-hero"
                className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center tap-scale"
                aria-label="Altro"
              >
                <MoreHorizontal className="h-5 w-5 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* White card with rounded top — hero transitions cleanly into content */}
      <div className="bg-background rounded-t-[32px] -mt-8 relative z-10">
        <PageContainer variant="wide">
          <div className="flex items-end justify-between -mt-4 relative z-10">
            <button
              onClick={() => {
                if (heroImg) (window as any).__lightboxOpen?.(heroImg);
              }}
              className="h-[88px] w-[88px] rounded-full overflow-hidden border-4 border-background bg-white shadow-xl flex-shrink-0 tap-scale"
              aria-label="Logo birra"
            >
              {heroImg ? (
                <img src={heroImg} alt={beer?.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-stone-100">
                  <BeerIcon className="h-9 w-9 text-primary/60" />
                </div>
              )}
            </button>
            <button
              onClick={onToggleFavorite}
              disabled={favoritePending}
              data-testid="button-bookmark"
              className={`mb-3 w-10 h-10 rounded-full bg-card border border-[#E8DED1] dark:border-white/[0.06] shadow-md flex items-center justify-center tap-scale transition-colors ${
                isBeerFavorited ? "text-primary" : "text-[#6B6357] dark:text-[#B7BDC7]"
              }`}
              aria-label="Salva"
            >
              <Bookmark className={`h-5 w-5 ${isBeerFavorited ? "fill-current" : ""}`} />
            </button>
          </div>
        </PageContainer>
      </div>
    </>
  );
}
