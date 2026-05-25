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
        <h2 className="text-xl font-black text-[#151515]">Bottiglie & Lattine</h2>
        <p className="text-xs text-[#6B6357] mt-0.5">
          {bottles.length} {bottles.length === 1 ? "referenza" : "referenze"} in cantina
        </p>
      </div>

      <div className="-mx-4 px-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-3 snap-x snap-mandatory pb-1">
          {bottles.map((b) => {
            const isFav = favoriteBeerIds?.has(b.beer.id) ?? false;
            const formatLabel = b.size || b.format || (b.beer as any)?.format;
            return (
              <div
                key={b.id}
                className="relative flex-shrink-0 w-[160px] snap-start bg-white rounded-[20px] border border-[#E8DED1] shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden"
                data-testid={`bottle-${b.id}`}
              >
                <Link href={`/beer/${b.beer.id}`}>
                  <div className="relative w-full h-[120px] bg-[#FAF7F1]">
                    <ImageWithFallback
                      src={b.imageUrl || b.beer.imageUrl || b.beer.logoUrl}
                      alt={b.beer.name}
                      imageType="bottle"
                      containerClassName="absolute inset-0"
                      className="w-full h-full object-cover"
                      iconSize="lg"
                    />
                  </div>
                </Link>

                {onToggleFavorite && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onToggleFavorite(b.beer.id);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white active:scale-95 transition-all"
                    aria-label={isFav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${isFav ? "text-[#F59E0B]" : "text-[#6B6357]"}`}
                      fill={isFav ? "currentColor" : "none"}
                    />
                  </button>
                )}

                <div className="p-3 space-y-1.5">
                  <Link href={`/beer/${b.beer.id}`}>
                    <p className="font-semibold text-sm text-[#151515] line-clamp-2 leading-tight">
                      {b.beer.name}
                    </p>
                  </Link>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {b.beer.style && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-[#FFF7EA] text-[#C77800]">
                        {b.beer.style}
                      </span>
                    )}
                    {formatLabel && (
                      <span className="text-[10px] text-[#6B6357] font-medium">{formatLabel}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-base font-black text-[#151515] tabular-nums">
                      {b.price ? `€ ${parseFloat(b.price).toFixed(2).replace(".", ",")}` : "—"}
                    </span>
                    {currentUserCanCheckin && onCheckin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onCheckin(b);
                        }}
                        className="w-7 h-7 rounded-full bg-[#F59E0B] text-white flex items-center justify-center active:scale-95 transition-transform"
                        aria-label="Check-in"
                        title="Sto bevendo questa"
                      >
                        <BeerIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
