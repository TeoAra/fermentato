import { useMemo } from "react";
import { motion } from "framer-motion";
import { Beer as BeerIcon } from "lucide-react";
import BeerResultCard from "./BeerResultCard";
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
    return [...taps]
      .filter((t) => t.isVisible !== false && t.isActive !== false)
      .sort((a, b) => (a.tapNumber ?? 999) - (b.tapNumber ?? 999));
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
        <h2 className="text-xl font-black text-[#151515] dark:text-[#F5F5F5]">Taplist</h2>
        <p className="text-xs text-[#6B6357] dark:text-[#B7BDC7] mt-0.5">
          {sorted.length} {sorted.length === 1 ? "spina disponibile" : "spine disponibili"}
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FAF7F1] dark:bg-[#12151A] mx-auto mb-4 flex items-center justify-center">
            <BeerIcon className="w-8 h-8 text-[#F59E0B]" />
          </div>
          <p className="text-sm font-semibold text-[#151515] dark:text-[#F5F5F5]">
            Nessuna birra alla spina al momento
          </p>
          <p className="text-xs text-[#6B6357] dark:text-[#B7BDC7] mt-1">Torna presto per le novità</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((tap) => {
            const prices = getAllPrices(tap);
            const isFav = favoriteBeerIds?.has(tap.beer.id) ?? false;
            return (
              <BeerResultCard
                key={tap.id}
                beer={tap.beer}
                item={tap}
                variant="taplist"
                testId={`taplist-tap-${tap.id}`}
                isFavorite={isFav}
                onToggleFavorite={onToggleFavorite}
                onCheckin={onCheckin}
                currentUserCanCheckin={currentUserCanCheckin}
                priceContent={
                  prices.length > 0 ? (
                    prices.map((p, i) => (
                      <div key={i} className="flex items-baseline gap-1.5 whitespace-nowrap">
                        <span className="text-[11px] font-medium tabular-nums text-[#6B6357] dark:text-[#B7BDC7]">{p.size}</span>
                        <span className="text-[15px] font-extrabold tabular-nums text-[#151515] dark:text-[#F5F5F5]">€ {p.price.replace(".", ",")}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm font-bold text-[#9B9384]">—</span>
                  )
                }
              />
            );
          })}
        </div>
      )}
    </motion.section>
  );
}
