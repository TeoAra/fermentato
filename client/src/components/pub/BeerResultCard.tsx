import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Beer as BeerIcon, Heart } from "lucide-react";
import { Link } from "wouter";
import ImageWithFallback from "@/components/image-with-fallback";
import { AlcoholFreeBadge, GlutenFreeSmallBadge } from "@/components/beer-badges";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { descriptionToText } from "@shared/description-text";
import type { PubBeer } from "./types";

interface BeerResultCardProps<T> {
  beer: PubBeer;
  imageSrc?: string | null;
  imageType?: "beer" | "bottle";
  priceContent: ReactNode;
  detailLabel?: string | null;
  variant?: "taplist" | "cantina";
  item: T;
  testId: string;
  isFavorite: boolean;
  onToggleFavorite?: (beerId: number) => void;
  onCheckin?: (item: T) => void;
  currentUserCanCheckin?: boolean;
  itemDescription?: string | null;
}

export default function BeerResultCard<T>({
  beer, imageSrc, imageType = "beer", priceContent, detailLabel,
  variant = "taplist", item, testId, isFavorite, onToggleFavorite, onCheckin, currentUserCanCheckin,
  itemDescription,
}: BeerResultCardProps<T>) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const brewery = beer.brewery?.name || beer.breweryName;
  const abv = beer.isAlcoholFree ? "0,0%" : beer.abv != null && String(beer.abv).trim() !== "" ? `${beer.abv}%` : null;
  const hasActions = Boolean(onToggleFavorite || (currentUserCanCheckin && onCheckin));
  const isCantina = variant === "cantina";
  const metadata = [beer.style, detailLabel].filter(Boolean) as string[];
  const embeddedDescription = descriptionToText(beer.description || "").trim();
  const beerDetails = useQuery<PubBeer>({
    queryKey: ["/api/beers", beer.id],
    enabled: detailsOpen && !embeddedDescription,
    staleTime: 5 * 60_000,
  });
  const description = embeddedDescription || beerDetails.data?.description?.trim() || "";
  const fullBrewery = beerDetails.data?.brewery?.name || beerDetails.data?.breweryName || brewery;
  const fullStyle = beerDetails.data?.style || beer.style;
  const fullAbv = beerDetails.data?.isAlcoholFree
    ? "0,0%"
    : beerDetails.data?.abv != null
      ? `${beerDetails.data.abv}%`
      : abv;
  const fullIbu = beerDetails.data?.ibu ?? beer.ibu;
  const fullCountry = beerDetails.data?.country || beer.country;
  const fullDescription = description ? descriptionToText(description).trim() : "";
  const servingDescription = descriptionToText(itemDescription || "").trim();

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
      <div className="flex min-w-0 flex-col items-center justify-center gap-1 self-center">
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className={`${isCantina ? "h-14 w-14 sm:h-[60px] sm:w-[60px]" : "h-11 w-11 sm:h-[52px] sm:w-[52px]"} flex min-w-0 items-center justify-center overflow-hidden rounded-full border border-[#E8DED1] bg-[#FCFAF6] shadow-sm transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D08409] dark:border-white/[0.08] dark:bg-[#12151A]`}
          aria-label={`Apri i dettagli di ${beer.name}`}
          data-testid={`beer-detail-trigger-${beer.id}`}
        >
            <ImageWithFallback src={imageSrc || beer.imageUrl || beer.logoUrl || beer.brewery?.logoUrl} alt={beer.name}
              imageType={imageType} containerClassName="h-full w-full" className="h-full w-full object-contain p-1" iconSize="sm" />
        </button>
        {abv && (
          <span className="text-[13px] font-extrabold leading-none tabular-nums text-[#3D362F] dark:text-[#F5F5F5]">
            {abv}
          </span>
        )}
      </div>

      <div className="min-w-0 self-center" data-testid="beer-card-content">
        <Link href={`/beer/${beer.id}`} className="block min-w-0">
          <p className="break-words text-[15px] font-extrabold leading-[1.12] tracking-[-0.01em] text-[#151515] transition-colors group-hover:text-[#C77800] dark:text-[#F5F5F5]">{beer.name}</p>
        </Link>
        {brewery && <p className="mt-0.5 break-words text-[11px] font-bold leading-[1.15] text-[#D08409] dark:text-[#FFB74D]">{brewery}</p>}
        <div className="mt-1 flex min-w-0 items-start gap-1.5">
          {metadata.length > 0 && (
            <p className="min-w-0 break-words text-[11px] font-medium leading-tight text-[#5D554C] dark:text-[#B7BDC7]">
              {metadata.map((value, index) => (
                <span key={`${value}-${index}`}>
                  {index > 0 && <span className="px-1 text-[#A9A095] dark:text-[#737B86]">·</span>}
                  <span>{value}</span>
                </span>
              ))}
            </p>
          )}
          {beer.isGlutenFree && <GlutenFreeSmallBadge size={11} />}
          {beer.isAlcoholFree && <AlcoholFreeBadge size={10} />}
        </div>
      </div>

      {isCantina ? (
        <div className="flex min-w-[55px] flex-col items-end justify-center gap-1 self-stretch text-right">
          <div data-testid="beer-card-prices">{priceContent}</div>
          {hasActions && <div className="flex flex-col items-end gap-1" data-testid="beer-card-actions">{favoriteButton}{checkinButton}</div>}
        </div>
      ) : (
        <>
          <div
            className="flex min-w-[52px] flex-col items-end justify-center border-l border-[#E8DED1] pl-2 text-right dark:border-white/[0.1] sm:min-w-[62px] sm:pl-3"
            data-testid="beer-card-prices"
          >
            {priceContent}
          </div>
          {hasActions && <div className="flex flex-col items-center justify-end gap-1 sm:flex-row" data-testid="beer-card-actions">{favoriteButton}{checkinButton}</div>}
        </>
      )}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent
          className="flex max-h-full min-h-0 flex-col gap-0 overflow-hidden overscroll-none rounded-2xl border-[#E8DED1] bg-[#FCFAF6] p-0 shadow-[0_24px_80px_rgba(35,25,15,0.24)] dark:border-white/[0.08] dark:bg-[#1A1D24] dark:shadow-[0_24px_80px_rgba(0,0,0,0.5)] sm:max-w-lg"
          data-testid="beer-detail-dialog"
          aria-describedby={undefined}
        >
          <DialogHeader
            className="shrink-0 border-b border-[#E8DED1] bg-[#FCFAF6] px-5 pb-4 pt-5 pr-16 text-left dark:border-white/[0.08] dark:bg-[#1A1D24] sm:px-6 sm:pr-16"
            data-testid="menu-detail-header"
          >
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#C77800]">Birra disponibile qui</p>
              <DialogTitle className="text-xl font-black leading-tight tracking-[-0.025em] text-[#302820] dark:text-[#F5F5F5]">{beer.name}</DialogTitle>
              {fullBrewery && <p className="text-sm font-semibold text-[#746A5E] dark:text-[#B7BDC7]">{fullBrewery}</p>}
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-testid="menu-detail-scroll">
          <div className="space-y-5 p-5 sm:p-6">
            <div className="mx-auto h-32 w-32 overflow-hidden rounded-xl bg-[#F1ECE3] dark:bg-[#12151A] sm:h-36 sm:w-36">
              <ImageWithFallback src={imageSrc || beerDetails.data?.imageUrl || beer.imageUrl || beer.logoUrl || beer.brewery?.logoUrl}
                alt={beer.name} imageType={imageType} containerClassName="h-full w-full"
                className="h-full w-full object-contain p-2" />
            </div>
            <div className="flex flex-wrap gap-2">
              {fullStyle && <DetailPill label="Stile" value={fullStyle} />}
              {fullAbv && <DetailPill label="Alcol" value={fullAbv} />}
              {fullIbu != null && <DetailPill label="IBU" value={String(fullIbu)} />}
              {fullCountry && <DetailPill label="Paese" value={fullCountry} />}
              {(beerDetails.data?.isGlutenFree || beer.isGlutenFree) && <DetailPill label="Caratteristica" value="Senza glutine" />}
              {(beerDetails.data?.isAlcoholFree || beer.isAlcoholFree) && <DetailPill label="Caratteristica" value="Analcolica" />}
              {detailLabel && <DetailPill label={isCantina ? "Formato" : "Dettaglio"} value={detailLabel} />}
            </div>
            <div className="rounded-xl border border-[#E8DED1] bg-[#FAF7F1] px-4 py-3 dark:border-white/[0.08] dark:bg-[#12151A]">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#6B6357] dark:text-[#B7BDC7]">
                {isCantina ? "Prezzo in cantina" : "Prezzi alla spina"}
              </p>
              <div className="mt-1 space-y-1">{priceContent}</div>
            </div>
            {beerDetails.isFetching && !embeddedDescription && (
              <div className="space-y-2" role="status" aria-label="Caricamento dettagli birra">
                <div className="h-3 w-full animate-pulse rounded bg-[#E8DED1] dark:bg-white/10" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-[#E8DED1] dark:bg-white/10" />
              </div>
            )}
            {fullDescription ? (
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-[#3D362F] dark:text-[#E3E6EA]" data-testid="beer-detail-description">
                {fullDescription}
              </p>
            ) : beerDetails.isError ? (
              <p className="rounded-xl bg-[#FAF7F1] px-4 py-3 text-sm text-[#6B6357] dark:bg-[#12151A] dark:text-[#B7BDC7]" role="status">
                Non è stato possibile caricare la descrizione completa. Riprova più tardi.
              </p>
            ) : !beerDetails.isFetching ? (
              <p className="rounded-xl bg-[#FAF7F1] px-4 py-3 text-sm text-[#6B6357] dark:bg-[#12151A] dark:text-[#B7BDC7]">
                Non è disponibile una descrizione per questa birra.
              </p>
            ) : null}
            {servingDescription && servingDescription !== fullDescription && (
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground">Note del locale</p>
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-[#3D362F] dark:text-[#E3E6EA]">{servingDescription}</p>
              </div>
            )}
          </div>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
}

function DetailPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-[#E8DED1] bg-[#FAF7F1] px-3 py-1.5 text-xs text-[#3D362F] dark:border-white/[0.08] dark:bg-[#12151A] dark:text-[#E3E6EA]">
      <span className="font-bold">{label}:</span> {value}
    </span>
  );
}
