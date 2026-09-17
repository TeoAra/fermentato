import type { ReactNode } from "react";
import { Beer as BeerIcon, Heart } from "lucide-react";
import { Link } from "wouter";
import ImageWithFallback from "@/components/image-with-fallback";
import { AlcoholFreeBadge, GlutenFreeSmallBadge } from "@/components/beer-badges";
import type { PubBeer } from "./types";

interface BeerResultCardProps<T> {
  beer: PubBeer;
  imageSrc?: string | null;
  imageType?: "beer" | "bottle";
  priceContent: ReactNode;
  detailLabel?: string | null;
  description?: string | null;
  variant?: "taplist" | "cantina";
  item: T;
  testId: string;
  isFavorite: boolean;
  onToggleFavorite?: (beerId: number) => void;
  onCheckin?: (item: T) => void;
  currentUserCanCheckin?: boolean;
}

export default function BeerResultCard<T>({
  beer, imageSrc, imageType = "beer", priceContent, detailLabel, description,
  variant = "taplist", item, testId, isFavorite, onToggleFavorite, onCheckin, currentUserCanCheckin,
}: BeerResultCardProps<T>) {
  const brewery = beer.brewery?.name || beer.breweryName;
  const abv = beer.isAlcoholFree ? "0,0%" : beer.abv != null && String(beer.abv).trim() !== "" ? `${beer.abv}%` : null;
  const hasActions = Boolean(onToggleFavorite || (currentUserCanCheckin && onCheckin));
  const isCantina = variant === "cantina";
  const metadata = [beer.style, detailLabel, !isCantina ? abv : null].filter(Boolean) as string[];

  const favoriteButton = onToggleFavorite && (
    <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); onToggleFavorite(beer.id); }}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E8DED1] bg-[#FAF7F1] transition-transform active:scale-95 dark:border-white/[0.08] dark:bg-[#12151A]"
      aria-label={isFavorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}>
      <Heart className={`h-4 w-4 ${isFavorite ? "text-[#F59E0B]" : "text-[#6B6357] dark:text-[#B7BDC7]"}`} fill={isFavorite ? "currentColor" : "none"} />
    </button>
  );
  const checkinButton = currentUserCanCheckin && onCheckin && (
    <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); onCheckin(item); }}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F59E0B] text-white shadow-[0_5px_14px_rgba(245,158,11,0.28)] transition-transform active:scale-95"
      aria-label="Check-in" title="Sto bevendo questa">
      <BeerIcon className="h-4 w-4" />
    </button>
  );

  return (
    <article data-testid={testId}
      className={`group grid min-w-0 items-center rounded-[18px] border border-[#E8DED1] bg-white shadow-[0_4px_20px_rgba(45,30,10,0.045)] transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-[#DCC9B2] dark:border-white/[0.06] dark:bg-[#1A1D24] dark:hover:border-white/[0.12] ${
        isCantina
          ? "grid-cols-[58px_minmax(0,1fr)_auto] gap-2.5 px-2.5 py-2.5 sm:grid-cols-[68px_minmax(0,1fr)_auto] sm:gap-3 sm:px-3"
          : "grid-cols-[44px_minmax(0,1fr)_auto_auto] gap-2 px-2.5 py-2 sm:grid-cols-[52px_minmax(0,1fr)_auto_auto] sm:gap-3 sm:px-3 sm:py-2.5"
      }`}>
      <Link href={`/beer/${beer.id}`} className="flex min-w-0 items-center justify-center">
        <div className={`${isCantina ? "h-14 w-14 sm:h-[60px] sm:w-[60px]" : "h-11 w-11 sm:h-[52px] sm:w-[52px]"} overflow-hidden rounded-full border border-[#E8DED1] bg-[#FCFAF6] shadow-sm dark:border-white/[0.08] dark:bg-[#12151A]`}>
          <ImageWithFallback src={imageSrc || beer.imageUrl || beer.logoUrl || beer.brewery?.logoUrl} alt={beer.name}
            imageType={imageType} containerClassName="h-full w-full" className="h-full w-full object-contain p-1" iconSize="sm" />
        </div>
      </Link>

      <div className="min-w-0 self-center">
        <Link href={`/beer/${beer.id}`} className="block min-w-0">
          <p className="line-clamp-2 break-words text-[15px] font-extrabold leading-[1.12] tracking-[-0.01em] text-[#151515] transition-colors group-hover:text-[#C77800] dark:text-[#F5F5F5]">{beer.name}</p>
        </Link>
        {brewery && <p className="mt-0.5 line-clamp-1 truncate text-[11px] font-bold leading-[1.15] text-[#D08409] dark:text-[#FFB74D]">{brewery}</p>}
        <div className="mt-1 flex min-w-0 items-center gap-1.5">
          {metadata.length > 0 && (
            <p className="min-w-0 truncate text-[11px] font-medium leading-tight text-[#5D554C] dark:text-[#B7BDC7]">
              {metadata.map((value, index) => (
                <span key={`${value}-${index}`}>
                  {index > 0 && <span className="px-1 text-[#A9A095] dark:text-[#737B86]">·</span>}
                  <span className={index === metadata.length - 1 && !isCantina && abv ? "font-bold tabular-nums text-[#3D362F] dark:text-[#F5F5F5]" : ""}>
                    {value}
                  </span>
                </span>
              ))}
            </p>
          )}
          {beer.isGlutenFree && <GlutenFreeSmallBadge size={11} />}
          {beer.isAlcoholFree && <AlcoholFreeBadge size={10} />}
        </div>
        {description && <p className="mt-1 line-clamp-1 truncate text-[10px] leading-tight text-[#82796D] dark:text-[#8F98A5]">{description}</p>}
      </div>

      {isCantina ? (
        <div className="flex min-w-[55px] flex-col items-end justify-center gap-1 self-stretch text-right">
          {abv && <span className="text-[13px] font-medium tabular-nums text-[#5D554C] dark:text-[#B7BDC7]">{abv}</span>}
          <div>{priceContent}</div>
          {hasActions && <div className="flex flex-col items-end gap-1">{favoriteButton}{checkinButton}</div>}
        </div>
      ) : (
        <>
          <div className="flex min-w-[52px] flex-col items-end justify-center border-l border-[#E8DED1] pl-2 text-right dark:border-white/[0.1] sm:min-w-[62px] sm:pl-3">{priceContent}</div>
          {hasActions && <div className="flex flex-col items-center justify-end gap-1 sm:flex-row">{favoriteButton}{checkinButton}</div>}
        </>
      )}
    </article>
  );
}