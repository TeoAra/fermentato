import { motion } from "framer-motion";
import { Link } from "wouter";
import { Heart, Beer as BeerIcon } from "lucide-react";
import ImageWithFallback from "@/components/image-with-fallback";
import type { BottleItem } from "./types";

interface BottlesSectionProps {
  bottles: BottleItem[];
  onCheckin?: (bottle: BottleItem) => void;
  currentUserCanCheckin?: boolean;
  onToggleFavorite?: (beerId: number) => void;
  favoriteBeerIds?: Set<number>;
}

export default function BottlesSection({
  bottles,
  onCheckin,
  currentUserCanCheckin,
  onToggleFavorite,
  favoriteBeerIds,
}: BottlesSectionProps) {
  if (!bottles || bottles.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3 pt-4"
      data-testid="bottles-section"
    >
      <div>
        <h2 className="text-xl font-black text-[#151515] dark:text-[#F5F5F5]">Bottiglie & Lattine</h2>
        <p className="text-xs text-[#6B6357] dark:text-[#B7BDC7] mt-0.5">
          {bottles.length} {bottles.length === 1 ? "referenza" : "referenze"} in cantina
        </p>
      </div>

      <div className="space-y-2.5">
        {bottles.map((b) => {
          const isFav = favoriteBeerIds?.has(b.beer.id) ?? false;
          const formatLabel = b.size || b.format || (b.beer as any)?.format;
          return (
            <div
              key={b.id}
              className="relative bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-3 flex items-center gap-3"
              data-testid={`bottle-${b.id}`}
            >
              <Link href={`/beer/${b.beer.id}`} className="flex-shrink-0">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#FAF7F1] dark:bg-[#12151A] border border-[#E8DED1] dark:border-white/[0.06]">
                  <ImageWithFallback
                    src={b.imageUrl || b.beer.imageUrl || b.beer.logoUrl}
                    alt={b.beer.name}
                    imageType="bottle"
                    containerClassName="w-full h-full"
                    className="w-full h-full object-cover"
                    iconSize="sm"
                  />
                </div>
              </Link>

              <div className="flex-1 min-w-0">
                <Link href={`/beer/${b.beer.id}`}>
                  <p className="font-bold text-sm text-[#151515] dark:text-[#F5F5F5] truncate hover:text-[#F59E0B] transition-colors">
                    {b.beer.name}
                  </p>
                </Link>
                {b.beer.brewery?.name && (
                  <p className="text-[11px] font-semibold text-[#F59E0B] truncate">
                    {b.beer.brewery.name}
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {b.beer.style && (
                    <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FFF7EA] dark:bg-[#F59E0B]/15 text-[#C77800] dark:text-[#FFB74D]">
                      {b.beer.style}
                    </span>
                  )}
                  {formatLabel && (
                    <span className="text-[10px] text-[#6B6357] dark:text-[#B7BDC7] font-medium">{formatLabel}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                <span className="text-base font-black text-[#151515] dark:text-[#F5F5F5] tabular-nums">
                  {b.price ? `€ ${parseFloat(b.price).toFixed(2).replace(".", ",")}` : "—"}
                </span>
              </div>

              {onToggleFavorite && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleFavorite(b.beer.id);
                  }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 dark:bg-[#1A1D24]/80 backdrop-blur-sm flex items-center justify-center hover:bg-[#FFF7EA] dark:bg-[#F59E0B]/15 active:scale-95 transition-all"
                  aria-label={isFav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${isFav ? "text-[#F59E0B]" : "text-[#6B6357] dark:text-[#B7BDC7]"}`}
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
                    onCheckin(b);
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
    </motion.section>
  );
}
