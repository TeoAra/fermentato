import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Beer as BeerIcon, Heart } from "lucide-react";
import ImageWithFallback from "@/components/image-with-fallback";
import { GlutenFreeSmallBadge, AlcoholFreeBadge } from "@/components/beer-badges";
import type { TapItem } from "./types";

interface TaplistSectionProps {
  taps: TapItem[];
  onCheckin?: (tap: TapItem) => void;
  currentUserCanCheckin?: boolean;
  onToggleFavorite?: (beerId: number) => void;
  favoriteBeerIds?: Set<number>;
}

function getAllPrices(tap: TapItem): { size: string; price: string }[] {
  if (tap.prices && tap.prices.length > 0) {
    return tap.prices
      .filter((p) => parseFloat(p.price) > 0)
      .map((p) => ({ size: p.size, price: parseFloat(p.price).toFixed(2) }));
  }
  const pairs: Array<{ size: string; price?: string | null }> = [
    { size: "0,30L", price: tap.priceSmall },
    { size: "0,50L", price: tap.priceMedium },
    { size: "1L", price: tap.priceLarge },
  ];
  return pairs
    .filter((p) => p.price && parseFloat(p.price) > 0)
    .map((p) => ({ size: p.size, price: parseFloat(p.price as string).toFixed(2) }));
}

export default function TaplistSection({
  taps,
  onCheckin,
  currentUserCanCheckin,
  onToggleFavorite,
  favoriteBeerIds,
}: TaplistSectionProps) {
  const sorted = useMemo(() => {
    if (!Array.isArray(taps)) return [];
    return [...taps].sort((a, b) => (a.tapNumber ?? 999) - (b.tapNumber ?? 999));
  }, [taps]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 pt-4"
      data-testid="taplist-section"
    >
      <div>
        <h2 className="text-xl font-black text-[#151515]">Taplist</h2>
        <p className="text-xs text-[#6B6357] mt-0.5">
          {sorted.length} {sorted.length === 1 ? "spina disponibile" : "spine disponibili"}
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white rounded-[20px] border border-[#E8DED1] py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FAF7F1] mx-auto mb-4 flex items-center justify-center">
            <BeerIcon className="w-8 h-8 text-[#F59E0B]" />
          </div>
          <p className="text-sm font-semibold text-[#151515]">
            Nessuna birra alla spina al momento
          </p>
          <p className="text-xs text-[#6B6357] mt-1">Torna presto per le novità</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((tap) => {
            const prices = getAllPrices(tap);
            const isFav = favoriteBeerIds?.has(tap.beer.id) ?? false;
            return (
              <div
                key={tap.id}
                className="relative bg-white rounded-[20px] border border-[#E8DED1] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-3 flex items-center gap-3"
                data-testid={`taplist-tap-${tap.id}`}
              >
                {/* Logo */}
                <Link href={`/beer/${tap.beer.id}`} className="flex-shrink-0">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#FAF7F1] border border-[#E8DED1]">
                    <ImageWithFallback
                      src={tap.beer.imageUrl || tap.beer.logoUrl || tap.beer.brewery?.logoUrl}
                      alt={tap.beer.name}
                      imageType="beer"
                      containerClassName="w-full h-full"
                      className="w-full h-full object-cover"
                      iconSize="sm"
                    />
                  </div>
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link href={`/beer/${tap.beer.id}`}>
                    <p className="font-bold text-sm text-[#151515] truncate hover:text-[#F59E0B] transition-colors">
                      {tap.beer.name}
                    </p>
                  </Link>
                  {tap.beer.brewery?.name && (
                    <p className="text-[11px] font-semibold text-[#F59E0B] truncate">
                      {tap.beer.brewery.name}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {tap.beer.style && (
                      <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FFF7EA] text-[#C77800]">
                        {tap.beer.style}
                      </span>
                    )}
                    {tap.beer.abv && parseFloat(String(tap.beer.abv)) > 0 && (
                      <span className="text-[10px] text-[#6B6357] font-medium">
                        {tap.beer.isAlcoholFree ? "0,0%" : `${tap.beer.abv}%`}
                      </span>
                    )}
                    {tap.beer.countryEmoji && (
                      <span className="text-[11px]">{tap.beer.countryEmoji}</span>
                    )}
                    {tap.beer.isGlutenFree && <GlutenFreeSmallBadge size={10} />}
                    {tap.beer.isAlcoholFree && <AlcoholFreeBadge size={9} />}
                  </div>
                </div>

                {/* Prices */}
                {prices.length > 0 && (
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    {prices.map((p, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="text-[10px] text-[#6B6357] tabular-nums">{p.size}</span>
                        <span className="text-xs font-black text-[#151515] tabular-nums">
                          € {p.price.replace(".", ",")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Favorite heart top-right */}
                {onToggleFavorite && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onToggleFavorite(tap.beer.id);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-[#FFF7EA] active:scale-95 transition-all"
                    aria-label={isFav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${isFav ? "text-[#F59E0B]" : "text-[#6B6357]"}`}
                      fill={isFav ? "currentColor" : "none"}
                    />
                  </button>
                )}

                {currentUserCanCheckin && onCheckin && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onCheckin(tap);
                    }}
                    className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-[#F59E0B] text-white flex items-center justify-center shadow-sm active:scale-95 transition-all"
                    aria-label="Check-in"
                    title="Sto bevendo questa"
                  >
                    <BeerIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}
