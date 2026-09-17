import { Beer as BeerIcon, Heart, MapPin } from "lucide-react";
import { Link } from "wouter";
import type { ReactNode } from "react";
import ImageWithFallback from "@/components/image-with-fallback";
import { AlcoholFreeBadge, GlutenFreeSmallBadge } from "@/components/beer-badges";
import type { PubBeer } from "./types";

interface BeerResultCardProps<T> {
  beer: PubBeer;
  imageSrc?: string | null;
  imageType?: "beer" | "bottle";
  priceContent: ReactNode;
  detailLabel?: string | null;
  item: T;
  testId: string;
  isFavorite: boolean;
  onToggleFavorite?: (beerId: number) => void;
  onCheckin?: (item: T) => void;
  currentUserCanCheckin?: boolean;
}

export default function BeerResultCard<T>({
  beer,
  imageSrc,
  imageType = "beer",
  priceContent,
  detailLabel,
  item,
  testId,
  isFavorite,
  onToggleFavorite,
  onCheckin,
  currentUserCanCheckin,
}: BeerResultCardProps<T>) {
  const brewery = beer.brewery?.name || beer.breweryName;
  const abv = beer.isAlcoholFree ? "0,0%" : beer.abv != null && String(beer.abv).trim() !== "" ? `${beer.abv}%` : null;
  const hasActions = Boolean(onToggleFavorite || (currentUserCanCheckin && onCheckin));

  return (
    <article
      className="group grid min-w-0 grid-cols-[44px_minmax(0,1fr)_auto_auto] items-center gap-1 rounded-[18px] border border-[#E8DED1] bg-white px-2 py-2 shadow-[0_4px_20px_rgba(45,30,10,0.045)] transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-[#DCC9B2] hover:shadow-[0_10px_28px_rgba(45,30,10,0.09)] dark:border-white/[0.06] dark:bg-[#1A1D24] dark:hover:border-white/[0.12] min-[341px]:gap-2 min-[341px]:px-2.5 sm:grid-cols-[52px_minmax(0,1fr)_auto_auto] sm:gap-3 sm:px-3 sm:py-2.5"
      data-testid={testId}
    >
      <Link href={`/beer/${beer.id}`} className="flex min-h-11 min-w-0 items-center justify-center self-center sm:min-h-[52px]">
        <div className="h-10 w-10 overflow-hidden rounded-full border border-[#E8DED1] bg-[#FCFAF6] shadow-sm dark:border-white/[0.08] dark:bg-[#12151A] min-[341px]:h-11 min-[341px]:w-11 sm:h-[52px] sm:w-[52px]">
          <ImageWithFallback
            src={imageSrc || beer.imageUrl || beer.logoUrl || beer.brewery?.logoUrl}
            alt={beer.name}
            imageType={imageType}
            containerClassName="h-full w-full"
            className="h-full w-full object-contain p-1"
            iconSize="sm"
          />
        </div>
      </Link>

      <div className="min-w-0 self-center">
        <Link href={`/beer/${beer.id}`} className="block min-w-0">
          <p className="line-clamp-2 break-words text-[15px] font-extrabold leading-[1.12] tracking-[-0.01em] text-[#151515] transition-colors group-hover:text-[#C77800] dark:text-[#F5F5F5] dark:group-hover:text-[#FFB74D]">
            {beer.name}
          </p>
        </Link>
        {brewery && (
          <p className="mt-0.5 line-clamp-1 break-words text-[11px] font-bold leading-[1.15] text-[#D08409] dark:text-[#FFB74D]">
            {brewery}
          </p>
        )}
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1">
          {beer.style && (
            <span className="line-clamp-1 max-w-[18ch] truncate rounded-md bg-[#FFF7EA] px-1.5 py-1 text-[10px] font-bold leading-[1.05] text-[#A86600] dark:bg-[#F59E0B]/15 dark:text-[#FFB74D] sm:max-w-[22ch]">
              {beer.style}
            </span>
          )}
          {detailLabel && (
            <span className="text-[11px] font-semibold leading-tight text-[#6B6357] dark:text-[#B7BDC7]">{detailLabel}</span>
          )}
          {beer.country && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[#6B6357] dark:text-[#B7BDC7]">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="max-w-[11ch] truncate">{beer.country}</span>
            </span>
          )}
          {abv && (
            <span className="text-[13px] font-extrabold tabular-nums text-[#3D362F] dark:text-[#F5F5F5]">{abv}</span>
          )}
          {beer.isGlutenFree && <GlutenFreeSmallBadge size={11} />}
          {beer.isAlcoholFree && <AlcoholFreeBadge size={10} />}
        </div>
      </div>

      <div className="flex min-w-[52px] flex-col items-end justify-center gap-0.5 text-right sm:min-w-[62px]">
        {priceContent}
      </div>

      {hasActions && (
        <div className="flex flex-col items-center justify-end gap-1 sm:flex-row">
          {onToggleFavorite && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onToggleFavorite(beer.id);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E8DED1] bg-[#FAF7F1] transition-[background-color,transform] hover:bg-[#FFF7EA] active:scale-95 dark:border-white/[0.08] dark:bg-[#12151A] dark:hover:bg-[#F59E0B]/15"
              aria-label={isFavorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? "text-[#F59E0B]" : "text-[#6B6357] dark:text-[#B7BDC7]"}`} fill={isFavorite ? "currentColor" : "none"} />
            </button>
          )}
          {currentUserCanCheckin && onCheckin && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onCheckin(item);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F59E0B] text-white shadow-[0_5px_14px_rgba(245,158,11,0.28)] transition-[transform,box-shadow] hover:shadow-[0_7px_18px_rgba(245,158,11,0.38)] active:scale-95"
              aria-label="Check-in"
              title="Sto bevendo questa"
            >
              <BeerIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </article>
  );
}