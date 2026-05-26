import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Beer as BeerIcon, EyeOff, Eye, Pencil } from "lucide-react";
import ImageWithFallback from "@/components/image-with-fallback";
import { Button } from "@/components/ui/button";

interface BreweryBeersSectionProps {
  beers: any[];
  isAdmin?: boolean;
  canEditBeers?: boolean;
  onEditBeer?: (beer: any) => void;
  onToggleBeerVisibility?: (beerId: number, currentlyHidden: boolean) => void;
}

export default function BreweryBeersSection({
  beers,
  isAdmin,
  canEditBeers,
  onEditBeer,
  onToggleBeerVisibility,
}: BreweryBeersSectionProps) {
  const [activeStyle, setActiveStyle] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(12);

  const list = useMemo(
    () =>
      Array.isArray(beers)
        ? beers.filter((b) => isAdmin || b.isVisible !== false)
        : [],
    [beers, isAdmin],
  );

  const styles = useMemo(() => {
    const set = new Set<string>();
    list.forEach((b) => {
      if (b.style) set.add(String(b.style).split(/\s*[-–\/]\s*/)[0]);
    });
    return Array.from(set).slice(0, 20);
  }, [list]);

  const filtered = useMemo(() => {
    if (!activeStyle) return list;
    return list.filter((b) =>
      String(b.style || "").toLowerCase().startsWith(activeStyle.toLowerCase()),
    );
  }, [list, activeStyle]);

  const visible = filtered.slice(0, visibleCount);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 pt-4"
      data-testid="brewery-beers-section"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#151515] dark:text-[#F5F5F5]">
            Birre
          </h2>
          <p className="text-xs text-[#6B6357] dark:text-[#B7BDC7] mt-0.5">
            {list.length} {list.length === 1 ? "birra" : "birre"} nel catalogo
          </p>
        </div>
      </div>

      {/* Filtro stili */}
      {styles.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
          <button
            onClick={() => setActiveStyle(null)}
            className={`flex-shrink-0 inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
              !activeStyle
                ? "bg-[#F59E0B] text-white"
                : "bg-white dark:bg-[#1A1D24] border border-[#E8DED1] dark:border-white/[0.06] text-[#151515] dark:text-[#F5F5F5]"
            }`}
          >
            Tutte
          </button>
          {styles.map((s) => (
            <button
              key={s}
              onClick={() => setActiveStyle(s)}
              className={`flex-shrink-0 inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                activeStyle === s
                  ? "bg-[#F59E0B] text-white"
                  : "bg-white dark:bg-[#1A1D24] border border-[#E8DED1] dark:border-white/[0.06] text-[#151515] dark:text-[#F5F5F5]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FAF7F1] dark:bg-[#12151A] mx-auto mb-4 flex items-center justify-center">
            <BeerIcon className="w-8 h-8 text-[#F59E0B]" />
          </div>
          <p className="text-sm font-semibold text-[#151515] dark:text-[#F5F5F5]">
            Nessuna birra trovata
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            {visible.map((beer) => {
              const hidden = beer.isVisible === false;
              return (
                <div
                  key={beer.id}
                  className={`relative bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-3 flex flex-col ${
                    hidden ? "opacity-60" : ""
                  }`}
                  data-testid={`brewery-beer-${beer.id}`}
                >
                  <Link href={`/beer/${beer.id}`} className="block">
                    <div className="w-full aspect-square rounded-2xl overflow-hidden bg-[#FAF7F1] dark:bg-[#12151A] mb-2 flex items-center justify-center">
                      <ImageWithFallback
                        src={beer.imageUrl || beer.logoUrl}
                        alt={beer.name}
                        imageType="beer"
                        containerClassName="w-full h-full"
                        className="w-full h-full object-contain p-2"
                        iconSize="md"
                      />
                    </div>
                    <p className="font-bold text-sm text-[#151515] dark:text-[#F5F5F5] leading-tight line-clamp-2">
                      {beer.name}
                    </p>
                    {beer.style && (
                      <p className="text-[10px] font-semibold text-[#F59E0B] mt-0.5 line-clamp-1 uppercase tracking-wide">
                        {beer.style}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-[#6B6357] dark:text-[#B7BDC7] font-medium">
                      {beer.abv && parseFloat(String(beer.abv)) > 0 && (
                        <span>{beer.abv}%</span>
                      )}
                      {beer.ibu && <span>IBU {beer.ibu}</span>}
                    </div>
                  </Link>

                  {canEditBeers && (
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      {onEditBeer && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onEditBeer(beer);
                          }}
                          className="w-7 h-7 rounded-full bg-white/95 dark:bg-[#12151A]/95 border border-[#E8DED1] dark:border-white/[0.06] backdrop-blur-sm flex items-center justify-center shadow-sm"
                          aria-label="Modifica"
                        >
                          <Pencil className="w-3 h-3 text-[#151515] dark:text-[#F5F5F5]" />
                        </button>
                      )}
                      {onToggleBeerVisibility && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onToggleBeerVisibility(beer.id, hidden);
                          }}
                          className="w-7 h-7 rounded-full bg-white/95 dark:bg-[#12151A]/95 border border-[#E8DED1] dark:border-white/[0.06] backdrop-blur-sm flex items-center justify-center shadow-sm"
                          aria-label={hidden ? "Mostra" : "Nascondi"}
                        >
                          {hidden ? (
                            <Eye className="w-3 h-3 text-[#151515] dark:text-[#F5F5F5]" />
                          ) : (
                            <EyeOff className="w-3 h-3 text-[#151515] dark:text-[#F5F5F5]" />
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filtered.length > visibleCount && (
            <div className="pt-2">
              <Button
                onClick={() => setVisibleCount((c) => c + 12)}
                variant="outline"
                className="w-full rounded-full border-[#F59E0B] text-[#F59E0B] hover:bg-[#FFF7EA]"
                data-testid="brewery-beers-load-more"
              >
                Carica altre ({filtered.length - visibleCount})
              </Button>
            </div>
          )}
        </>
      )}
    </motion.section>
  );
}
