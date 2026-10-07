import { MapPin, Beer, ChevronRight, Star } from "lucide-react";
import { Link } from "wouter";
import ImageWithFallback from "@/components/image-with-fallback";

interface BreweryCardProps {
  brewery: {
    id: number;
    name: string | any;
    location?: string | any;
    region?: string | any;
    rating?: string | number | null;
    logoUrl?: string | null;
    coverImageUrl?: string | null;
    country?: string | null;
    slug?: string | null;
  };
  beerCount?: number;
  distance?: number | null;
  isLast?: boolean;
}

export default function BreweryCard({ brewery, beerCount = 0, distance, isLast }: BreweryCardProps) {
  const formatDist = (d: number) =>
    d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`;

  const subtitle = [
    brewery.location || brewery.region,
    brewery.country && brewery.country !== 'Italy' && brewery.country !== 'Italia' ? brewery.country : null,
  ].filter(Boolean).join(', ');

  return (
    <div>
      <Link href={`/brewery/${brewery.slug || brewery.id}`}>
        <div className="group flex min-h-[104px] items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/35 active:bg-muted/50">
          <div className="h-[72px] w-[76px] shrink-0 overflow-hidden rounded-xl bg-muted/70">
            <ImageWithFallback
              src={brewery.coverImageUrl || brewery.logoUrl}
              alt={`Immagine di ${brewery.name}`}
              imageType="brewery"
              containerClassName="h-full w-full"
              className="h-full w-full object-contain"
              iconSize="sm"
            />
          </div>
          {brewery.coverImageUrl && brewery.logoUrl && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-card p-1">
              <ImageWithFallback src={brewery.logoUrl} alt={`Logo ${brewery.name}`} imageType="brewery" containerClassName="h-full w-full" className="h-full w-full object-contain" iconSize="sm" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold leading-snug text-foreground transition-colors group-hover:text-primary">{brewery.name}</p>
            {subtitle && (
              <p className="mt-1 flex items-center gap-1 text-xs leading-snug text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{subtitle}</span>
              </p>
            )}
            <div className="mt-2 flex min-h-5 flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
              {beerCount > 0 && <span className="inline-flex items-center gap-1 text-muted-foreground"><Beer className="h-3 w-3" />{beerCount} birre</span>}
              {brewery.rating != null && Number(brewery.rating) > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-foreground"><Star className="h-3 w-3 fill-current text-primary" />{Number(brewery.rating).toFixed(1)}</span>
              )}
              {distance != null && <span className="text-muted-foreground">{formatDist(distance)}</span>}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" />
        </div>
      </Link>
      {!isLast && (
        <div className="mx-3 h-px bg-border/70" />
      )}
    </div>
  );
}
