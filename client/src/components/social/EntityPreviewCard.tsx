import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ExternalLink, Loader2, MapPin, Building2, Beer as BeerIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export type EntityType = "brewery" | "pub" | "beer";

interface EntityPreviewCardProps {
  type: EntityType;
  id: number;
  anchorRect: DOMRect;
  onClose: () => void;
}

function Stars({ rating }: { rating: number | string }) {
  const r = Math.round(parseFloat(String(rating)));
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i < r ? "text-amber-400 fill-amber-400" : "text-stone-300 dark:text-stone-600"}`}
        />
      ))}
      <span className="text-xs font-bold text-stone-500 dark:text-stone-400 ml-1">
        {parseFloat(String(rating)).toFixed(1)}
      </span>
    </span>
  );
}

export function EntityPreviewCard({ type, id, anchorRect, onClose }: EntityPreviewCardProps) {
  const [, setLocation] = useLocation();
  const cardRef = useRef<HTMLDivElement>(null);

  const endpoint =
    type === "brewery" ? `/api/breweries/${id}` :
    type === "pub"     ? `/api/pubs/${id}` :
                         `/api/beers/${id}`;

  const { data, isLoading } = useQuery<any>({
    queryKey: [endpoint],
    staleTime: 5 * 60_000,
    retry: false,
  });

  // Position the card near the anchor, keeping it inside the viewport
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (!cardRef.current) return;
    const card = cardRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const GAP = 8;

    let top = anchorRect.bottom + GAP;
    let left = anchorRect.left;

    if (top + card.height > vh - 16) top = anchorRect.top - card.height - GAP;
    if (left + card.width > vw - 16) left = vw - card.width - 16;
    if (left < 8) left = 8;

    setPos({ top, left });
  }, [anchorRect, isLoading]);

  // Close on outside click or Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [onClose]);

  const goToPage = () => {
    setLocation(
      type === "brewery" ? `/brewery/${id}` :
      type === "pub"     ? `/pub/${id}` :
                           `/beer/${id}`
    );
    onClose();
  };

  // ── Beer-specific rendering ───────────────────────────────────────────────
  if (type === "beer") {
    const imageUrl = data?.imageUrl ?? data?.image_url ?? null;
    const name = data?.name ?? "";
    const breweryName = data?.breweryName ?? data?.brewery_name ?? "";
    const style = data?.style ?? "";
    const abv = data?.abv != null ? parseFloat(String(data.abv)) : null;
    const rating = data?.avgRating ?? data?.rating ?? null;

    return createPortal(
      <AnimatePresence>
        <motion.div
          key={`entity-card-beer-${id}`}
          ref={cardRef}
          initial={{ opacity: 0, y: -6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 150 }}
          className="w-64 bg-white dark:bg-[#1A1D24] rounded-2xl border border-stone-200 dark:border-white/[0.08] shadow-xl overflow-hidden"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
            </div>
          ) : !data ? (
            <div className="p-4 text-center text-sm text-stone-400">Birra non trovata</div>
          ) : (
            <>
              {/* Image header */}
              <div className="relative h-24 bg-[#FAF7F1] dark:bg-[#12151A] overflow-hidden flex items-center justify-center">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={name}
                    className="h-full w-auto max-w-full object-contain p-2"
                  />
                ) : (
                  <BeerIcon className="w-10 h-10 text-amber-300/60" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>

              {/* Body */}
              <div className="p-3.5 pt-3">
                <p className="font-bold text-sm text-stone-900 dark:text-white leading-tight truncate">
                  {name}
                </p>
                {breweryName && (
                  <p className="text-xs text-stone-400 mt-0.5 truncate flex items-center gap-1">
                    <Building2 className="w-3 h-3 flex-shrink-0" />
                    {breweryName}
                  </p>
                )}
                {(style || abv !== null) && (
                  <p className="text-[11px] text-stone-400 mt-0.5 truncate">
                    {[style, abv !== null ? `${abv.toFixed(1)}% ABV` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {rating !== null && parseFloat(String(rating)) > 0 && (
                  <div className="mt-1.5">
                    <Stars rating={rating} />
                  </div>
                )}
                {data.description && (
                  <p className="mt-2 text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed line-clamp-2">
                    {data.description}
                  </p>
                )}
              </div>

              {/* Action */}
              <div className="px-3.5 pb-3.5">
                <Button
                  size="sm"
                  className="w-full rounded-xl h-8 text-xs gap-1.5"
                  onClick={goToPage}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Vedi scheda
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>,
      document.body,
    );
  }

  // ── Brewery / Pub rendering (unchanged) ──────────────────────────────────
  const logoUrl = data?.logoUrl ?? data?.imageUrl ?? null;
  const name = data?.name ?? "";
  const subtitle = type === "pub"
    ? [data?.city, data?.region].filter(Boolean).join(", ")
    : [data?.location, data?.country].filter(Boolean).join(" · ");
  const rating = data?.rating ? parseFloat(data.rating) : null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key={`entity-card-${type}-${id}`}
        ref={cardRef}
        initial={{ opacity: 0, y: -6, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
        style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 150 }}
        className="w-64 bg-white dark:bg-[#1A1D24] rounded-2xl border border-stone-200 dark:border-white/[0.08] shadow-xl overflow-hidden"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
          </div>
        ) : !data ? (
          <div className="p-4 text-center text-sm text-stone-400">
            {type === "brewery" ? "Birrificio non trovato" : "Locale non trovato"}
          </div>
        ) : (
          <>
            {/* Cover / logo header */}
            {(data.coverImageUrl || logoUrl) ? (
              <div className="relative h-24 bg-stone-100 dark:bg-[#12151A] overflow-hidden">
                {data.coverImageUrl ? (
                  <img
                    src={data.coverImageUrl}
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                    <Building2 className="w-8 h-8 text-primary/30" />
                  </div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                {/* Logo badge */}
                {logoUrl && (
                  <div className="absolute bottom-2 left-3">
                    <img
                      src={logoUrl}
                      alt={name}
                      className="w-10 h-10 rounded-xl object-contain bg-white dark:bg-[#1A1D24] p-1 ring-2 ring-white dark:ring-[#1A1D24]"
                    />
                  </div>
                )}
              </div>
            ) : (
              /* No images — minimal color bar */
              <div className={`h-2 ${type === "brewery" ? "bg-amber-400" : "bg-primary"}`} />
            )}

            {/* Body */}
            <div className="p-3.5 pt-3">
              <p className="font-bold text-sm text-stone-900 dark:text-white leading-tight truncate">
                {name}
              </p>
              {subtitle && (
                <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  {subtitle}
                </p>
              )}
              {rating !== null && rating > 0 && (
                <div className="mt-1.5">
                  <Stars rating={rating} />
                </div>
              )}
              {data.description && (
                <p className="mt-2 text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed line-clamp-2">
                  {data.description}
                </p>
              )}
            </div>

            {/* Action */}
            <div className="px-3.5 pb-3.5">
              <Button
                size="sm"
                className="w-full rounded-xl h-8 text-xs gap-1.5"
                onClick={goToPage}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Vedi scheda
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
